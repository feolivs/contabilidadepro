/**
 * Processador de Documentos - ContabilidadePRO
 * Processa OCR, classificação e validação de documentos fiscais
 */

import { JobProcessor } from '../queue-worker'
import { logger } from '@/lib/simple-logger'
import { createClient } from '@/lib/supabase'
import { jsonValidationService } from '@/services/json-validation-service'

export interface DocumentoJob {
  type: 'processamento_documento'
  documentoId: string
  empresaId: string
  tipoDocumento: 'NFe' | 'NFCe' | 'CTe' | 'MDFe' | 'Recibo' | 'Contrato' | 'Outro'
  arquivoUrl: string
  processarOCR: boolean
  validarSchema: boolean
  extrairDados: boolean
  timestamp: string
}

export interface DocumentoResult {
  ocrTexto?: string
  dadosExtraidos?: Record<string, any>
  validacaoSchema?: {
    valido: boolean
    erros: string[]
  }
  classificacao?: {
    tipo: string
    confianca: number
  }
  metadados: {
    paginas: number
    tamanhoArquivo: number
    formatoOriginal: string
    processadoEm: string
  }
}

export class DocumentoProcessor implements JobProcessor<DocumentoJob> {
  private supabase = createClient()

  validate(data: DocumentoJob): boolean {
    return !!(
      data.documentoId &&
      data.empresaId &&
      data.arquivoUrl &&
      data.tipoDocumento
    )
  }

  async process(data: DocumentoJob): Promise<DocumentoResult> {
    logger.info('Processando documento', {
      documentoId: data.documentoId,
      empresaId: data.empresaId,
      tipoDocumento: data.tipoDocumento,
      processarOCR: data.processarOCR,
      validarSchema: data.validarSchema
    })

    const resultado: DocumentoResult = {
      metadados: {
        paginas: 0,
        tamanhoArquivo: 0,
        formatoOriginal: '',
        processadoEm: new Date().toISOString()
      }
    }

    try {
      // 1. Baixar arquivo
      const arquivoBuffer = await this.baixarArquivo(data.arquivoUrl)
      resultado.metadados.tamanhoArquivo = arquivoBuffer.length
      resultado.metadados.formatoOriginal = this.detectarFormato(data.arquivoUrl)

      // 2. Processar OCR se solicitado
      if (data.processarOCR) {
        resultado.ocrTexto = await this.processarOCR(arquivoBuffer, resultado.metadados.formatoOriginal)
        resultado.metadados.paginas = this.contarPaginas(resultado.ocrTexto)
      }

      // 3. Extrair dados estruturados
      if (data.extrairDados) {
        resultado.dadosExtraidos = await this.extrairDados(
          data.tipoDocumento,
          resultado.ocrTexto || '',
          arquivoBuffer
        )
      }

      // 4. Validar schema se solicitado
      if (data.validarSchema && resultado.dadosExtraidos) {
        resultado.validacaoSchema = await this.validarSchema(
          data.tipoDocumento,
          resultado.dadosExtraidos
        )
      }

      // 5. Classificar documento
      resultado.classificacao = await this.classificarDocumento(
        data.tipoDocumento,
        resultado.ocrTexto || '',
        resultado.dadosExtraidos
      )

      return resultado

    } catch (error) {
      logger.error('Erro no processamento do documento', {
        documentoId: data.documentoId,
        error
      })
      throw error
    }
  }

  async onSuccess(result: DocumentoResult, data: DocumentoJob): Promise<void> {
    // Atualizar documento no banco
    try {
      const { error } = await this.supabase
        .from('documentos')
        .update({
          status: 'processado',
          ocr_texto: result.ocrTexto,
          dados_extraidos: result.dadosExtraidos,
          validacao_schema: result.validacaoSchema,
          classificacao: result.classificacao,
          metadados: result.metadados,
          processado_em: new Date().toISOString()
        })
        .eq('id', data.documentoId)

      if (error) throw error

      logger.info('Documento processado com sucesso', {
        documentoId: data.documentoId,
        classificacao: result.classificacao?.tipo,
        confianca: result.classificacao?.confianca
      })

      // Enfileirar notificação se necessário
      if (result.validacaoSchema && !result.validacaoSchema.valido) {
        await this.notificarErroValidacao(data, result.validacaoSchema.erros)
      }

    } catch (error) {
      logger.error('Erro ao atualizar documento processado', {
        documentoId: data.documentoId,
        error
      })
    }
  }

  async onError(error: Error, data: DocumentoJob): Promise<void> {
    // Marcar documento como erro
    try {
      const { error: dbError } = await this.supabase
        .from('documentos')
        .update({
          status: 'erro',
          erro_detalhes: error.message,
          processado_em: new Date().toISOString()
        })
        .eq('id', data.documentoId)

      if (dbError) throw dbError
    } catch (dbError) {
      logger.error('Erro ao marcar documento com erro', {
        documentoId: data.documentoId,
        error: dbError
      })
    }
  }

  private async baixarArquivo(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Erro ao baixar arquivo: ${response.statusText}`)
    }
    return Buffer.from(await response.arrayBuffer())
  }

  private detectarFormato(url: string): string {
    const extensao = url.split('.').pop()?.toLowerCase()
    return extensao || 'unknown'
  }

  private async processarOCR(buffer: Buffer, formato: string): Promise<string> {
    // Usar Supabase Edge Function para OCR
    const { data, error } = await this.supabase.functions.invoke('pdf-ocr-service', {
      body: {
        file: buffer.toString('base64'),
        format: formato,
        options: {
          language: 'por',
          extractTables: true,
          extractImages: false
        }
      }
    })

    if (error) throw error
    return data.text || ''
  }

  private contarPaginas(texto: string): number {
    // Contar quebras de página no texto OCR
    const quebras = (texto.match(/\f/g) || []).length
    return Math.max(1, quebras + 1)
  }

  private async extrairDados(
    tipoDocumento: string,
    ocrTexto: string,
    buffer: Buffer
  ): Promise<Record<string, any>> {
    switch (tipoDocumento) {
      case 'NFe':
        return await this.extrairDadosNFe(ocrTexto)
      case 'NFCe':
        return await this.extrairDadosNFCe(ocrTexto)
      case 'Recibo':
        return await this.extrairDadosRecibo(ocrTexto)
      default:
        return await this.extrairDadosGenericos(ocrTexto)
    }
  }

  private async extrairDadosNFe(texto: string): Promise<Record<string, any>> {
    // Regex patterns para NFe
    const patterns = {
      numero: /N[úu]mero:\s*(\d+)/i,
      serie: /S[ée]rie:\s*(\d+)/i,
      chaveAcesso: /(\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4})/,
      cnpjEmitente: /CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i,
      valorTotal: /Valor\s+Total[:\s]*R?\$?\s*([\d.,]+)/i,
      dataEmissao: /Data\s+de\s+Emiss[ãa]o[:\s]*(\d{2}\/\d{2}\/\d{4})/i
    }

    const dados: Record<string, any> = {}

    for (const [campo, pattern] of Object.entries(patterns)) {
      const match = texto.match(pattern)
      if (match) {
        dados[campo] = match[1]?.trim()
      }
    }

    // Limpar e formatar valores
    if (dados.valorTotal) {
      dados.valorTotal = parseFloat(dados.valorTotal.replace(/[^\d,]/g, '').replace(',', '.'))
    }

    if (dados.chaveAcesso) {
      dados.chaveAcesso = dados.chaveAcesso.replace(/\s/g, '')
    }

    return dados
  }

  private async extrairDadosNFCe(texto: string): Promise<Record<string, any>> {
    // Similar à NFe, mas com padrões específicos da NFCe
    return await this.extrairDadosNFe(texto) // Simplificado
  }

  private async extrairDadosRecibo(texto: string): Promise<Record<string, any>> {
    const patterns = {
      valor: /Valor[:\s]*R?\$?\s*([\d.,]+)/i,
      data: /Data[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
      pagador: /Pagador[:\s]*([^\n]+)/i,
      recebedor: /Recebedor[:\s]*([^\n]+)/i,
      descricao: /Descri[çc][ãa]o[:\s]*([^\n]+)/i
    }

    const dados: Record<string, any> = {}

    for (const [campo, pattern] of Object.entries(patterns)) {
      const match = texto.match(pattern)
      if (match) {
        dados[campo] = match[1]?.trim()
      }
    }

    if (dados.valor) {
      dados.valor = parseFloat(dados.valor.replace(/[^\d,]/g, '').replace(',', '.'))
    }

    return dados
  }

  private async extrairDadosGenericos(texto: string): Promise<Record<string, any>> {
    // Extração genérica de dados comuns
    const patterns = {
      cnpj: /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g,
      cpf: /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g,
      valores: /R?\$?\s*([\d.,]+)/g,
      datas: /(\d{2}\/\d{2}\/\d{4})/g,
      emails: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    }

    const dados: Record<string, any> = {}

    for (const [campo, pattern] of Object.entries(patterns)) {
      const matches = Array.from(texto.matchAll(pattern))
      if (matches.length > 0) {
        dados[campo] = matches.map(m => m[1])
      }
    }

    return dados
  }

  private async validarSchema(
    tipoDocumento: string,
    dados: Record<string, any>
  ): Promise<{ valido: boolean; erros: string[] }> {
    try {
      switch (tipoDocumento) {
        case 'NFe':
          const nfeResult = await jsonValidationService.validateNFe(dados)
          return { valido: nfeResult.isValid, erros: nfeResult.errors }
        case 'DAS':
          const dasResult = await jsonValidationService.validateDAS(dados)
          return { valido: dasResult.isValid, erros: dasResult.errors }
        default:
          return { valido: true, erros: [] }
      }
    } catch (error) {
      return {
        valido: false,
        erros: [`Erro na validação: ${error}`]
      }
    }
  }

  private async classificarDocumento(
    tipoDeclarado: string,
    ocrTexto: string,
    dadosExtraidos?: Record<string, any>
  ): Promise<{ tipo: string; confianca: number }> {
    // Classificação baseada em palavras-chave e padrões
    const classificadores = [
      {
        tipo: 'NFe',
        keywords: ['nota fiscal eletrônica', 'nfe', 'chave de acesso', 'danfe'],
        patterns: [/\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\s+\d{4}/]
      },
      {
        tipo: 'NFCe',
        keywords: ['nota fiscal de consumidor', 'nfce', 'cupom fiscal'],
        patterns: [/cupom\s+fiscal/i]
      },
      {
        tipo: 'Recibo',
        keywords: ['recibo', 'recebemos', 'valor recebido'],
        patterns: [/recibo/i]
      }
    ]

    let melhorMatch = { tipo: tipoDeclarado, confianca: 0.5 }

    for (const classificador of classificadores) {
      let score = 0

      // Verificar palavras-chave
      for (const keyword of classificador.keywords) {
        if (ocrTexto.toLowerCase().includes(keyword)) {
          score += 0.2
        }
      }

      // Verificar padrões
      for (const pattern of classificador.patterns) {
        if (pattern.test(ocrTexto)) {
          score += 0.3
        }
      }

      // Verificar dados extraídos
      if (dadosExtraidos) {
        if (classificador.tipo === 'NFe' && dadosExtraidos.chaveAcesso) {
          score += 0.4
        }
        if (classificador.tipo === 'Recibo' && dadosExtraidos.valor) {
          score += 0.3
        }
      }

      if (score > melhorMatch.confianca) {
        melhorMatch = { tipo: classificador.tipo, confianca: Math.min(score, 1.0) }
      }
    }

    return melhorMatch
  }

  private async notificarErroValidacao(data: DocumentoJob, erros: string[]) {
    // Enfileirar notificação sobre erro de validação
    const { error } = await this.supabase.functions.invoke('enqueue-notification', {
      body: {
        tipo: 'email',
        destinatario: 'contador@empresa.com', // Buscar do perfil da empresa
        template: 'erro_validacao_documento',
        dados: {
          documento_id: data.documentoId,
          tipo_documento: data.tipoDocumento,
          erros: erros.join(', ')
        }
      }
    })

    if (error) {
      logger.error('Erro ao enfileirar notificação de erro', { error })
    }
  }
}
