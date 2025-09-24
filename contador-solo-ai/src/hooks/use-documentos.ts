'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import {
  Documento,
  DocumentoUpload,
  DocumentoStats,
  DocumentoFilter,
  TipoDocumento,
  StatusProcessamento
} from '@/types/documento'

// Função para mapear tipos do OCR para tipos da tabela
function mapOCRTypeToDocumentType(ocrType: string): TipoDocumento | null {
  const mapping: Record<string, TipoDocumento> = {
    'nota_fiscal': 'NFE',
    'nota_fiscal_entrada': 'NFE',
    'nota_fiscal_saida': 'NFE',
    'nfe': 'NFE',
    'nfce': 'NFCE',
    'nfse': 'NFSE',
    'cte': 'CTE',
    'das': 'OUTROS', // DAS não está na enum, usar 'OUTROS'
    'boleto': 'BOLETO',
    'boleto_bancario': 'BOLETO',
    'recibo': 'RECIBO',
    'recibo_pagamento': 'RECIBO',
    'contrato': 'CONTRATO',
    'extrato': 'EXTRATO',
    'extrato_bancario': 'EXTRATO'
  }

  return mapping[ocrType.toLowerCase()] || null
}

// Hook para buscar documentos com filtros
export function useDocumentos(filter?: DocumentoFilter) {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['documentos', filter],
    queryFn: async (): Promise<Documento[]> => {
      let query = supabase
        .from('documentos')
        .select(`
          *,
          empresa:empresas(id, nome, cnpj)
        `)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filter?.empresaId) {
        query = query.eq('empresa_id', filter.empresaId)
      }

      if (filter?.tipoDocumento) {
        query = query.eq('tipo_documento', filter.tipoDocumento)
      }

      if (filter?.statusProcessamento) {
        query = query.eq('status_processamento', filter.statusProcessamento)
      }

      if (filter?.searchTerm) {
        query = query.or(`arquivo_nome.ilike.%${filter.searchTerm}%,numero_documento.ilike.%${filter.searchTerm}%`)
      }

      if (filter?.dataInicio) {
        query = query.gte('created_at', filter.dataInicio)
      }

      if (filter?.dataFim) {
        query = query.lte('created_at', filter.dataFim)
      }

      const { data, error } = await query

      if (error) {

        throw new Error('Erro ao carregar documentos')
      }

      return data || []
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  })
}

// Hook para estatísticas de documentos
export function useDocumentosStats() {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['documentos-stats'],
    queryFn: async (): Promise<DocumentoStats> => {
      const { data, error } = await supabase
        .from('documentos')
        .select('status_processamento')

      if (error) {

        throw new Error('Erro ao carregar estatísticas')
      }

      const stats = {
        total: data?.length || 0,
        processados: data?.filter(d => d.status_processamento === 'processado').length || 0,
        pendentes: data?.filter(d => d.status_processamento === 'pendente').length || 0,
        processando: data?.filter(d => d.status_processamento === 'processando').length || 0,
        erros: data?.filter(d => d.status_processamento === 'erro').length || 0,
        rejeitados: data?.filter(d => d.status_processamento === 'rejeitado').length || 0,
      }

      return stats
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
  })
}

// Hook para upload de documento
export function useUploadDocumento() {
  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()

  return useMutation({
    mutationFn: async (data: DocumentoUpload): Promise<Documento> => {
      const { arquivo, ...documentoData } = data

      // 1. Upload do arquivo para o Storage
      const fileExt = arquivo.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = fileName // Não incluir 'documentos/' pois já estamos no bucket 'documentos'

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, arquivo, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`)
      }

      // 2. Salvar metadados no banco (sem URL pública, será gerada dinamicamente)
      const insertData = {
        empresa_id: documentoData.empresa_id,
        tipo_documento: documentoData.tipo_documento,
        arquivo_nome: arquivo.name,
        arquivo_tipo: arquivo.type,
        arquivo_tamanho: arquivo.size,
        arquivo_url: '', // Será gerada dinamicamente quando necessário
        arquivo_path: filePath,
        status_processamento: 'processando' as StatusProcessamento,
        numero_documento: documentoData.numero_documento || null,
        serie: documentoData.serie || null,
        data_emissao: documentoData.data_emissao ? new Date(documentoData.data_emissao).toISOString().split('T')[0] : null,
        valor_total: documentoData.valor_total || null,
        observacoes: documentoData.observacoes || null
      }

      console.log('Inserting document data:', insertData)

      const { data: documento, error: dbError } = await supabase
        .from('documentos')
        .insert(insertData)
        .select('*')
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        console.error('Insert data was:', insertData)
        // Tentar limpar o arquivo do storage em caso de erro
        await supabase.storage.from('documentos').remove([filePath])
        throw new Error(`Erro ao salvar documento no banco de dados: ${dbError.message}`)
      }

      // Buscar dados da empresa separadamente
      const { data: empresa } = await supabase
        .from('empresas')
        .select('id, nome, cnpj')
        .eq('id', documento.empresa_id)
        .single()

      // Adicionar dados da empresa ao documento
      const documentoCompleto = {
        ...documento,
        empresa: empresa
      }

      // 4. Processar documento com IA (assíncrono)
      try {
        console.log('Chamando intelligent-document-processor com:', {
          documentId: documento.id,
          filePath: filePath,
          fileName: arquivo.name,
          fileType: arquivo.type,
          empresaId: data.empresa_id
        })

        // Processar documento com OCR real usando pdf-ocr-service
        const { data: processData, error: processError } = await supabase.functions.invoke('pdf-ocr-service', {
          body: {
            documentId: documento.id,
            filePath: filePath,
            fileName: arquivo.name,
            options: {
              language: 'por',
              quality: 'high',
              forceOCR: true,
              enableCache: false
            }
          }
        })

        console.log('Resposta do processamento OCR:', { processData, processError })

        if (processError) {
          console.error('Erro no processamento OCR:', processError)
          // Atualizar status para erro
          await supabase
            .from('documentos')
            .update({
              status_processamento: 'erro',
              observacoes: `Erro no OCR: ${processError.message}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', documento.id)
        } else if (processData && processData.success) {
          // Processar resultado do OCR
          const ocrResult = processData

          // Atualizar documento com dados extraídos
          const updateData: any = {
            status_processamento: 'processado',
            dados_extraidos: ocrResult.structuredData || {},
            data_processamento: new Date().toISOString(),
            observacoes: `OCR processado com ${ocrResult.method} - Confiança: ${Math.round(ocrResult.confidence * 100)}%`,
            updated_at: new Date().toISOString()
          }

          // Adicionar dados estruturados se disponíveis
          if (ocrResult.structuredData) {
            updateData.dados_extraidos = ocrResult.structuredData
            updateData.data_processamento = new Date().toISOString()

            // Atualizar campos específicos se detectados nos dados estruturados
            if (ocrResult.structuredData.cnpj) {
              // Não temos campo cnpj_emitente na tabela, vamos manter nos dados_extraidos
              console.log('CNPJ detectado:', ocrResult.structuredData.cnpj)
            }

            if (ocrResult.structuredData.valores && ocrResult.structuredData.valores.length > 0) {
              // Pegar o maior valor como valor total (heurística)
              const maiorValor = Math.max(...ocrResult.structuredData.valores.map((v: any) => v.valor))
              updateData.valor_total = maiorValor
              console.log('Valor total detectado:', maiorValor)
            }

            if (ocrResult.structuredData.numeroDocumento) {
              updateData.numero_documento = ocrResult.structuredData.numeroDocumento
              console.log('Número do documento detectado:', ocrResult.structuredData.numeroDocumento)
            }

            // Atualizar tipo de documento se detectado e for válido
            if (ocrResult.structuredData.documentType && ocrResult.structuredData.documentType !== 'unknown') {
              // Mapear tipos do OCR para tipos da tabela
              const tipoMapeado = mapOCRTypeToDocumentType(ocrResult.structuredData.documentType)
              if (tipoMapeado) {
                updateData.tipo_documento = tipoMapeado
                console.log('Tipo de documento detectado:', tipoMapeado)
              }
            }
          }

          await supabase
            .from('documentos')
            .update(updateData)
            .eq('id', documento.id)

          console.log('Documento atualizado com dados do OCR:', updateData)
        } else {
          // OCR falhou mas não deu erro
          await supabase
            .from('documentos')
            .update({
              status_processamento: 'erro',
              observacoes: 'Falha no processamento OCR - nenhum dado extraído',
              updated_at: new Date().toISOString()
            })
            .eq('id', documento.id)
        }
      } catch (processError) {
        console.error('Processing error:', processError)
        // Não falhar o upload, apenas logar o erro
      }

      return documentoCompleto
    },
    onSuccess: (documento) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })
      
      toast.success(`Documento "${documento.arquivo_nome}" enviado com sucesso!`)
    },
    onError: (error) => {

      toast.error(error.message || 'Erro ao fazer upload do documento')
    }
  })
}

// Hook para download de documento
export function useDownloadDocumento() {
  const supabase = createBrowserSupabaseClient()

  return useMutation({
    mutationFn: async (documento: Documento): Promise<void> => {
      if (!documento.arquivo_path) {
        throw new Error('Caminho do arquivo não encontrado')
      }

      const { data, error } = await supabase.storage
        .from('documentos')
        .download(documento.arquivo_path)

      if (error) {

        throw new Error('Erro ao fazer download do arquivo')
      }

      // Criar URL temporária e iniciar download
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = documento.arquivo_nome
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    onSuccess: (_, documento) => {
      toast.success(`Download de "${documento.arquivo_nome}" iniciado`)
    },
    onError: (error) => {

      toast.error(error.message || 'Erro ao fazer download')
    }
  })
}

// Hook para excluir documento
export function useDeleteDocumento() {
  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()

  return useMutation({
    mutationFn: async (documentoId: string): Promise<void> => {
      // Primeiro, buscar o documento para obter o caminho do arquivo
      const { data: documento, error: fetchError } = await supabase
        .from('documentos')
        .select('arquivo_path, arquivo_nome')
        .eq('id', documentoId)
        .single()

      if (fetchError) {

        throw new Error('Documento não encontrado')
      }

      // Excluir do banco de dados
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', documentoId)

      if (dbError) {

        throw new Error('Erro ao excluir documento')
      }

      // Excluir arquivo do storage (se existir)
      if (documento.arquivo_path) {
        const { error: storageError } = await supabase.storage
          .from('documentos')
          .remove([documento.arquivo_path])

        if (storageError) {

          // Não falhar a operação se apenas o storage falhar
        }
      }
    },
    onSuccess: (_, documentoId) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })
      
      toast.success('Documento excluído com sucesso!')
    },
    onError: (error) => {

      toast.error(error.message || 'Erro ao excluir documento')
    }
  })
}

// Hook para buscar documento por ID
export function useDocumento(id: string) {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['documento', id],
    queryFn: async (): Promise<Documento> => {
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          empresa:empresas(id, nome, cnpj)
        `)
        .eq('id', id)
        .single()

      if (error) {

        throw new Error('Documento não encontrado')
      }

      return data
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

// Hook para atualizar status de processamento
export function useUpdateDocumentoStatus() {
  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      dadosExtraidos 
    }: { 
      id: string
      status: StatusProcessamento
      dadosExtraidos?: any 
    }): Promise<Documento> => {
      const updateData: any = {
        status_processamento: status,
        updated_at: new Date().toISOString()
      }

      if (dadosExtraidos) {
        updateData.dados_extraidos = dadosExtraidos
        updateData.data_processamento = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('documentos')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          empresa:empresas(id, nome, cnpj)
        `)
        .single()

      if (error) {

        throw new Error('Erro ao atualizar status do documento')
      }

      return data
    },
    onSuccess: (documento) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      queryClient.invalidateQueries({ queryKey: ['documento', documento.id] })
      queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })
      
      toast.success('Status do documento atualizado!')
    },
    onError: (error) => {

      toast.error(error.message || 'Erro ao atualizar status')
    }
  })
}
