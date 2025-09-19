/**
 * 🔍 OCR SERVICE - ContabilidadePRO
 *
 * Serviço para análise de conteúdo de documentos PDF/imagens
 * Integração real com OpenAI Vision API para OCR inteligente
 */

import { openAIConfig } from '@/lib/openai';

export interface OCRResult {
  texto_extraido: string;
  confianca: number;
  dados_estruturados?: DocumentoEstruturado;
  metadados: {
    paginas: number;
    tamanho_arquivo: number;
    tipo_documento: string;
    data_processamento: string;
    provider: 'openai-vision' | 'mock' | 'fallback';
    processing_time_ms: number;
    tokens_used?: number;
  };
}

// Tipos de documentos suportados - Sistema completo brasileiro
export type TipoDocumentoFiscal =
  // Notas Fiscais Eletrônicas
  | 'NFe' | 'NFCe' | 'NFSe' | 'DANFE' | 'DANFSE'
  // Transporte
  | 'CTe' | 'MDFe' | 'DACTE' | 'DAMDFE'
  // Tributos Federais
  | 'DAS' | 'DARF_IRPJ_CSLL' | 'DARF_PIS_COFINS' | 'DARF_IRRF' | 'DARF_GENERICO'
  // Tributos Estaduais
  | 'GARE_ICMS' | 'DAE_ESTADUAL' | 'GNRE'
  // Obrigações Digitais
  | 'ESOCIAL' | 'EFD_REINF' | 'SPED_FISCAL' | 'SPED_CONTRIBUICOES' | 'SPED_ECD' | 'SPED_ECF'
  | 'ECF' | 'DIRF' | 'DEFIS' | 'DASN_SIMEI' | 'RAIS' | 'CAGED'
  // Documentos Contábeis
  | 'EXTRATO_BANCARIO' | 'RECIBO_DESPESA' | 'CONTRATO_EMPRESTIMO' | 'APOLICE_SEGURO'
  | 'BALANCO_PATRIMONIAL' | 'DRE' | 'BALANCETE' | 'RAZAO_GERAL' | 'RAZAO_AUXILIAR'
  | 'LIVRO_DIARIO' | 'LIVRO_CAIXA' | 'DEMONSTRACAO_FLUXO_CAIXA'
  // Documentos Societários
  | 'CONTRATO_SOCIAL' | 'FICHA_CADASTRAL_CNPJ' | 'ALVARA_FUNCIONAMENTO'
  | 'ATA_ASSEMBLEIA' | 'PROCURACAO' | 'CERTIDAO_NEGATIVA'
  // Vendas e Cartões
  | 'EXTRATO_VENDAS_CARTAO_CREDITO' | 'EXTRATO_VENDAS_CARTAO_DEBITO'
  | 'RESUMO_VENDAS_TEF' | 'COMPROVANTE_PIX';

export interface DocumentoEstruturado {
  tipo_fiscal?: TipoDocumentoFiscal;
  categoria?: 'fiscal' | 'contabil' | 'societario' | 'bancario';
  campos_identificados: Array<{
    campo: string;
    valor: string;
    confianca: number;
  }>;
  valores_monetarios?: Array<{
    descricao: string;
    valor: number;
  }>;
  datas_importantes?: Array<{
    tipo: 'emissao' | 'vencimento' | 'competencia' | 'pagamento' | 'registro';
    data: string;
  }>;
  informacoes_empresa?: {
    cnpj?: string;
    razao_social?: string;
    inscricao_estadual?: string;
  };
  tributos_identificados?: Array<{
    tipo: string;
    valor: number;
    competencia?: string;
  }>;
}

export interface OpenAIVisionResponse {
  success: boolean;
  text: string;
  confidence: number;
  structured_data?: DocumentoEstruturado;
  tokens_used: number;
  processing_time_ms: number;
  error?: string;
}

export class OCRService {
  private readonly SUPPORTED_FORMATS = ['pdf', 'png', 'jpg', 'jpeg', 'tiff'];
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private readonly MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos
  private cache: Map<string, { result: OCRResult; timestamp: number }> = new Map();

  /**
   * Verifica se o formato do arquivo é suportado
   */
  public isFormatSupported(filename: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? this.SUPPORTED_FORMATS.includes(extension) : false;
  }

  /**
   * Verifica se o OpenAI está configurado
   */
  public isOpenAIConfigured(): boolean {
    return openAIConfig.isConfigured;
  }

  /**
   * Processa documento e extrai texto/dados usando OpenAI Vision
   */
  public async processDocument(
    fileBuffer: Buffer,
    filename: string,
    documentType?: string
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Verificar cache primeiro
      const cacheKey = this.generateCacheKey(fileBuffer, filename, documentType);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('📋 OCR: Resultado obtido do cache');
        return cached;
      }

      // Verificar se OpenAI está configurado
      if (!this.isOpenAIConfigured()) {
        console.warn('⚠️ OpenAI não configurado, usando mock');
        return this.createMockResult(fileBuffer, filename, startTime, documentType || 'unknown');
      }

      // Verificar tamanho do arquivo
      if (fileBuffer.length > this.MAX_IMAGE_SIZE) {
        throw new Error(`Arquivo muito grande: ${fileBuffer.length} bytes. Máximo: ${this.MAX_IMAGE_SIZE} bytes`);
      }

      // Processar com OpenAI Vision
      const visionResult = await this.processWithOpenAIVision(fileBuffer, filename, documentType);

      if (!visionResult.success) {
        console.warn('⚠️ OpenAI Vision falhou, usando fallback');
        return this.createMockResult(fileBuffer, filename, startTime, documentType || 'unknown');
      }

      // Criar resultado final
      const result: OCRResult = {
        texto_extraido: visionResult.text,
        confianca: visionResult.confidence,
        dados_estruturados: visionResult.structured_data,
        metadados: {
          paginas: 1, // Para imagens, sempre 1 página
          tamanho_arquivo: fileBuffer.length,
          tipo_documento: documentType || await this.classifyDocument(visionResult.text),
          data_processamento: new Date().toISOString(),
          provider: 'openai-vision',
          processing_time_ms: Date.now() - startTime,
          tokens_used: visionResult.tokens_used
        }
      };

      // Armazenar no cache
      this.setCache(cacheKey, result);

      console.log(`✅ OCR concluído: ${visionResult.text.length} caracteres extraídos em ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('❌ Erro no processamento OCR:', error);

      // Retornar erro real em vez de mock
      throw new Error(`Falha no processamento OCR: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Processa imagem com OpenAI Vision API
   */
  private async processWithOpenAIVision(
    fileBuffer: Buffer,
    filename: string,
    documentType?: string
  ): Promise<OpenAIVisionResponse> {
    const startTime = Date.now();

    try {
      // Converter para base64
      const base64Image = fileBuffer.toString('base64');
      const mimeType = this.getMimeType(filename);

      // Construir prompt especializado para documentos fiscais brasileiros
      const prompt = this.buildFiscalDocumentPrompt(documentType);

      // Fazer chamada para OpenAI Vision
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIConfig.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Modelo mais recente com visão
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'high' // Alta qualidade para documentos
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0, // Determinístico para extração de dados
          top_p: 1,
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const extractedText = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || 0;

      if (!extractedText.trim()) {
        throw new Error('Nenhum texto extraído da imagem');
      }

      // Tentar extrair dados estruturados do texto
      const structuredData = await this.extractStructuredDataFromText(extractedText, documentType);

      return {
        success: true,
        text: extractedText.trim(),
        confidence: 0.92, // Alta confiança para OpenAI Vision
        structured_data: structuredData,
        tokens_used: tokensUsed,
        processing_time_ms: Date.now() - startTime
      };

    } catch (error) {
      console.error('[OpenAI Vision] Erro:', error);
      return {
        success: false,
        text: '',
        confidence: 0,
        structured_data: undefined,
        tokens_used: 0,
        processing_time_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Extrai dados estruturados baseado no tipo de documento
   * Versão real usando análise de texto
   */
  private extractRealStructuredData(text: string, documentType?: string): DocumentoEstruturado | undefined {
    if (!text || text.length < 10) return undefined;

    const estruturado: DocumentoEstruturado = {
      tipo_fiscal: (documentType || 'Documento') as TipoDocumentoFiscal,
      campos_identificados: [],
      valores_monetarios: [],
      datas_importantes: []
    };

    // Extrair CNPJ
    const cnpjMatch = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    if (cnpjMatch) {
      estruturado.campos_identificados.push({
        campo: 'cnpj',
        valor: cnpjMatch[0],
        confianca: 0.95
      });
    }

    // Extrair CPF
    const cpfMatch = text.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    if (cpfMatch) {
      estruturado.campos_identificados.push({
        campo: 'cpf',
        valor: cpfMatch[0],
        confianca: 0.95
      });
    }

    // Extrair valores monetários
    const valorRegex = /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g;
    let match;
    while ((match = valorRegex.exec(text)) !== null) {
      const valorStr = match[1]?.replace(/\./g, '').replace(',', '.') || '0';
      const valor = parseFloat(valorStr);
      if (!isNaN(valor)) {
        estruturado.valores_monetarios?.push({
          descricao: 'valor_detectado',
          valor
        });
      }
    }

    // Extrair datas
    const dataRegex = /(\d{2}\/\d{2}\/\d{4})/g;
    while ((match = dataRegex.exec(text)) !== null) {
      estruturado.datas_importantes?.push({
        tipo: 'emissao',
        data: match[1] || ''
      });
    }

    // Extrair razão social (heurística simples)
    const linhas = text.split('\n');
    for (const linha of linhas) {
      if (linha.includes('LTDA') || linha.includes('S.A.') || linha.includes('ME') || linha.includes('EPP')) {
        estruturado.campos_identificados.push({
          campo: 'razao_social',
          valor: linha.trim(),
          confianca: 0.80
        });
        break;
      }
    }

    return estruturado;
  }

  /**
   * Constrói prompt especializado para documentos fiscais brasileiros
   */
  private buildFiscalDocumentPrompt(documentType?: string): string {
    const basePrompt = `Você é um especialista em documentos fiscais brasileiros. Analise esta imagem e extraia TODO o texto visível com máxima precisão.

INSTRUÇÕES ESPECÍFICAS:
- Extraia TODO o texto, incluindo números, datas, valores, CNPJs, razões sociais
- Mantenha a formatação e estrutura original
- Identifique campos importantes como: número do documento, CNPJ, valores, datas
- Para valores monetários, use formato brasileiro (vírgula para decimais)
- Para datas, identifique o formato usado (DD/MM/AAAA ou similar)

TIPOS DE DOCUMENTO ESPERADOS:

🏢 ÁREA FISCAL/TRIBUTÁRIA:
- NFe, NFCe, NFSe (Notas Fiscais Eletrônicas e DANFE/DANFSE)
- CTe, MDFe (Documentos de Transporte e DACTE/DAMDFE)
- DAS (Simples Nacional)
- DARF (IRPJ/CSLL, PIS/COFINS, IRRF, outros tributos federais)
- GARE/DAE (ICMS e tributos estaduais)
- Extratos de vendas com cartões (crédito/débito/PIX)

📊 OBRIGAÇÕES DIGITAIS:
- eSocial, EFD-Reinf
- SPED (Fiscal, Contribuições, ECD, ECF)
- ECF, DIRF, DEFIS
- DASN-SIMEI, RAIS, CAGED

💰 ÁREA CONTÁBIL:
- Extratos bancários, recibos de despesas
- Contratos de empréstimo, apólices de seguro
- Balanço Patrimonial, DRE, Balancete
- Livros Razão (Geral/Auxiliar), Diário, Caixa
- Demonstração de Fluxo de Caixa

🏛️ ÁREA SOCIETÁRIA/LEGAL:
- Contratos sociais, fichas cadastrais CNPJ
- Alvarás de funcionamento, atas de assembleia
- Procurações, certidões negativas

FORMATO DE SAÍDA: Texto puro extraído, preservando quebras de linha e estrutura.`;

    if (documentType) {
      return `${basePrompt}\n\nTIPO ESPECÍFICO: Este documento é um ${documentType}. Foque especialmente nos campos típicos deste tipo de documento.`;
    }

    return basePrompt;
  }

  /**
   * Extrai dados estruturados do texto usando IA
   */
  private async extractStructuredDataFromText(
    texto: string,
    documentType?: string
  ): Promise<DocumentoEstruturado | undefined> {
    try {
      // Se OpenAI não estiver configurado, usar extração básica
      if (!this.isOpenAIConfigured()) {
        return this.extractBasicStructuredData(texto, documentType);
      }

      // Usar OpenAI para extração estruturada inteligente
      const structuredPrompt = this.buildStructuredExtractionPrompt(texto, documentType);

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIConfig.getApiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: structuredPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        console.warn('Falha na extração estruturada, usando método básico');
        return this.extractBasicStructuredData(texto, documentType);
      }

      const data = await response.json();
      const jsonResult = JSON.parse(data.choices?.[0]?.message?.content || '{}');

      return this.parseStructuredResponse(jsonResult);

    } catch (error) {
      console.warn('Erro na extração estruturada:', error);
      return this.extractBasicStructuredData(texto, documentType);
    }
  }

  /**
   * Analisa e classifica automaticamente o tipo de documento
   * Sistema completo para documentos contábeis brasileiros
   */
  public async classifyDocument(texto: string): Promise<TipoDocumentoFiscal> {
    const textoLower = texto.toLowerCase();

    // 🏢 ÁREA FISCAL/TRIBUTÁRIA

    // NFe - Nota Fiscal Eletrônica
    if (this.matchesPatterns(textoLower, ['nota fiscal eletrônica', 'nfe', 'danfe', /nf-e\s*\d+/])) {
      return 'NFe';
    }

    // NFCe - Nota Fiscal de Consumidor
    if (this.matchesPatterns(textoLower, ['nota fiscal de consumidor', 'nfce', 'nfc-e'])) {
      return 'NFCe';
    }

    // NFSe - Nota Fiscal de Serviços
    if (this.matchesPatterns(textoLower, ['nota fiscal de serviços', 'nfse', 'nfs-e', 'danfse'])) {
      return 'NFSe';
    }

    // CTe - Conhecimento de Transporte
    if (this.matchesPatterns(textoLower, ['conhecimento de transporte', 'cte', 'ct-e', 'dacte'])) {
      return 'CTe';
    }

    // MDFe - Manifesto de Documentos Fiscais
    if (this.matchesPatterns(textoLower, ['manifesto', 'mdfe', 'mdf-e', 'damdfe'])) {
      return 'MDFe';
    }

    // DAS - Simples Nacional
    if (this.matchesPatterns(textoLower, ['das', 'simples nacional', 'documento de arrecadação do simples'])) {
      return 'DAS';
    }

    // DARF - Documentos de Arrecadação
    if (this.matchesPatterns(textoLower, ['darf', 'documento de arrecadação de receitas federais', 'receita federal'])) {
      if (this.matchesPatterns(textoLower, ['irpj', 'csll', 'imposto de renda', 'contribuição social'])) {
        return 'DARF_IRPJ_CSLL';
      }
      if (this.matchesPatterns(textoLower, ['pis', 'cofins'])) {
        return 'DARF_PIS_COFINS';
      }
      if (this.matchesPatterns(textoLower, ['irrf', 'imposto de renda retido'])) {
        return 'DARF_IRRF';
      }
      return 'DARF_GENERICO';
    }

    // GARE/DAE - Tributos Estaduais
    if (this.matchesPatterns(textoLower, ['gare', 'guia de arrecadação', 'icms'])) {
      return 'GARE_ICMS';
    }
    if (this.matchesPatterns(textoLower, ['dae', 'documento de arrecadação estadual'])) {
      return 'DAE_ESTADUAL';
    }
    if (this.matchesPatterns(textoLower, ['gnre', 'guia nacional de recolhimento'])) {
      return 'GNRE';
    }

    // Vendas com cartões
    if (this.matchesPatterns(textoLower, ['extrato', 'vendas', 'cartão', 'crédito'])) {
      return 'EXTRATO_VENDAS_CARTAO_CREDITO';
    }
    if (this.matchesPatterns(textoLower, ['extrato', 'vendas', 'cartão', 'débito'])) {
      return 'EXTRATO_VENDAS_CARTAO_DEBITO';
    }
    if (this.matchesPatterns(textoLower, ['pix', 'transferência', 'comprovante'])) {
      return 'COMPROVANTE_PIX';
    }
    if (this.matchesPatterns(textoLower, ['tef', 'resumo', 'vendas'])) {
      return 'RESUMO_VENDAS_TEF';
    }

    // 📊 OBRIGAÇÕES DIGITAIS

    if (this.matchesPatterns(textoLower, ['esocial', 'e-social'])) {
      return 'ESOCIAL';
    }
    if (this.matchesPatterns(textoLower, ['efd-reinf', 'reinf', 'escrituração fiscal digital'])) {
      return 'EFD_REINF';
    }
    if (this.matchesPatterns(textoLower, ['sped', 'fiscal']) && !this.matchesPatterns(textoLower, ['contribuições', 'ecd', 'ecf'])) {
      return 'SPED_FISCAL';
    }
    if (this.matchesPatterns(textoLower, ['sped', 'contribuições'])) {
      return 'SPED_CONTRIBUICOES';
    }
    if (this.matchesPatterns(textoLower, ['sped', 'ecd', 'escrituração contábil digital'])) {
      return 'SPED_ECD';
    }
    if (this.matchesPatterns(textoLower, ['sped', 'ecf', 'escrituração contábil fiscal'])) {
      return 'SPED_ECF';
    }
    if (this.matchesPatterns(textoLower, ['ecf', 'escrituração contábil fiscal']) && !this.matchesPatterns(textoLower, ['sped'])) {
      return 'ECF';
    }
    if (this.matchesPatterns(textoLower, ['dirf', 'declaração do imposto de renda retido'])) {
      return 'DIRF';
    }
    if (this.matchesPatterns(textoLower, ['defis', 'demonstrativo de apuração de contribuições sociais'])) {
      return 'DEFIS';
    }
    if (this.matchesPatterns(textoLower, ['dasn', 'simei', 'mei'])) {
      return 'DASN_SIMEI';
    }
    if (this.matchesPatterns(textoLower, ['rais', 'relação anual de informações sociais'])) {
      return 'RAIS';
    }
    if (this.matchesPatterns(textoLower, ['caged', 'cadastro geral de empregados'])) {
      return 'CAGED';
    }

    // 💰 ÁREA CONTÁBIL

    if (this.matchesPatterns(textoLower, ['extrato', 'bancário', 'banco', 'conta corrente'])) {
      return 'EXTRATO_BANCARIO';
    }
    if (this.matchesPatterns(textoLower, ['recibo', 'despesa', 'comprovante', 'pagamento']) &&
        !this.matchesPatterns(textoLower, ['pix', 'transferência'])) {
      return 'RECIBO_DESPESA';
    }
    if (this.matchesPatterns(textoLower, ['contrato', 'empréstimo', 'financiamento'])) {
      return 'CONTRATO_EMPRESTIMO';
    }
    if (this.matchesPatterns(textoLower, ['apólice', 'seguro', 'seguradora'])) {
      return 'APOLICE_SEGURO';
    }
    if (this.matchesPatterns(textoLower, ['balanço', 'patrimonial', 'ativo', 'passivo'])) {
      return 'BALANCO_PATRIMONIAL';
    }
    if (this.matchesPatterns(textoLower, ['dre', 'demonstração', 'resultado', 'exercício'])) {
      return 'DRE';
    }
    if (this.matchesPatterns(textoLower, ['balancete', 'verificação'])) {
      return 'BALANCETE';
    }
    if (this.matchesPatterns(textoLower, ['razão', 'geral', 'livro']) && !this.matchesPatterns(textoLower, ['auxiliar'])) {
      return 'RAZAO_GERAL';
    }
    if (this.matchesPatterns(textoLower, ['razão', 'auxiliar'])) {
      return 'RAZAO_AUXILIAR';
    }
    if (this.matchesPatterns(textoLower, ['diário', 'livro'])) {
      return 'LIVRO_DIARIO';
    }
    if (this.matchesPatterns(textoLower, ['caixa', 'livro'])) {
      return 'LIVRO_CAIXA';
    }
    if (this.matchesPatterns(textoLower, ['fluxo', 'caixa', 'demonstração'])) {
      return 'DEMONSTRACAO_FLUXO_CAIXA';
    }

    // 🏛️ ÁREA SOCIETÁRIA/LEGAL

    if (this.matchesPatterns(textoLower, ['contrato', 'social', 'constituição'])) {
      return 'CONTRATO_SOCIAL';
    }
    if (this.matchesPatterns(textoLower, ['ficha', 'cadastral', 'cnpj', 'receita federal'])) {
      return 'FICHA_CADASTRAL_CNPJ';
    }
    if (this.matchesPatterns(textoLower, ['alvará', 'funcionamento', 'licença'])) {
      return 'ALVARA_FUNCIONAMENTO';
    }
    if (this.matchesPatterns(textoLower, ['ata', 'assembleia', 'reunião'])) {
      return 'ATA_ASSEMBLEIA';
    }
    if (this.matchesPatterns(textoLower, ['procuração', 'mandato', 'representação'])) {
      return 'PROCURACAO';
    }
    if (this.matchesPatterns(textoLower, ['certidão', 'negativa', 'débitos'])) {
      return 'CERTIDAO_NEGATIVA';
    }

    // Fallback para NFe se não conseguiu classificar mas tem padrões fiscais
    if (this.matchesPatterns(textoLower, ['fiscal', 'nota', 'emissão']) || /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(texto)) {
      return 'NFe';
    }

    return 'NFe'; // Fallback padrão
  }

  /**
   * Verifica se o texto contém algum dos padrões especificados
   */
  private matchesPatterns(text: string, patterns: (string | RegExp)[]): boolean {
    return patterns.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(text);
      }
      return text.includes(pattern);
    });
  }

  /**
   * Valida dados extraídos do documento
   */
  public validateExtractedData(data: DocumentoEstruturado): {
    valido: boolean;
    erros: string[];
    avisos: string[];
  } {
    const erros: string[] = [];
    const avisos: string[] = [];

    // Validar CNPJ se presente
    const cnpjField = data.campos_identificados.find(c => c.campo.includes('cnpj'));
    if (cnpjField && !this.validarCNPJ(cnpjField.valor)) {
      erros.push('CNPJ inválido detectado');
    }

    // Validar valores monetários
    data.valores_monetarios?.forEach(valor => {
      if (valor.valor <= 0) {
        avisos.push(`Valor zerado ou negativo: ${valor.descricao}`);
      }
    });

    // Verificar confiança dos campos
    const camposBaixaConfianca = data.campos_identificados.filter(c => c.confianca < 0.8);
    if (camposBaixaConfianca.length > 0) {
      avisos.push(`${camposBaixaConfianca.length} campo(s) com baixa confiança de extração`);
    }

    return {
      valido: erros.length === 0,
      erros,
      avisos
    };
  }

  /**
   * Validação básica de CNPJ
   */
  private validarCNPJ(cnpj: string): boolean {
    // Remove caracteres especiais
    const numeros = cnpj.replace(/[^\d]/g, '');

    // Verificar se tem 14 dígitos
    if (numeros.length !== 14) return false;

    // Verificar se não são todos iguais
    if (/^(\d)\1+$/.test(numeros)) return false;

    // TODO: Implementar validação completa de CNPJ
    return true; // Simplificado para desenvolvimento
  }

  /**
   * Métodos auxiliares para cache
   */
  private generateCacheKey(fileBuffer: Buffer, filename: string, documentType?: string): string {
    // Usar hash simples baseado no tamanho e nome do arquivo para evitar dependência do crypto
    const simpleHash = `${fileBuffer.length}-${filename.length}-${Date.now().toString(36)}`;
    return `ocr:${simpleHash}:${filename}:${documentType || 'auto'}`;
  }

  private getFromCache(key: string): OCRResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Verificar se expirou
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: OCRResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Limpar cache antigo se necessário
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Determina o MIME type baseado na extensão do arquivo
   */
  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'tiff':
      case 'tif': return 'image/tiff';
      case 'pdf': return 'application/pdf';
      default: return 'image/jpeg';
    }
  }

  /**
   * Cria resultado de erro quando OCR falha completamente
   */
  private createErrorResult(
    fileBuffer: Buffer,
    filename: string,
    startTime: number,
    error: string
  ): OCRResult {
    return {
      texto_extraido: `[ERRO OCR] ${error}. Configure GOOGLE_API_KEY para OCR real.`,
      confianca: 0,
      dados_estruturados: undefined,
      metadados: {
        paginas: 0,
        tamanho_arquivo: fileBuffer.length,
        tipo_documento: 'erro',
        data_processamento: new Date().toISOString(),
        provider: 'fallback',
        processing_time_ms: Date.now() - startTime
      }
    };
  }

  /**
   * Gera estatísticas de processamento de documentos
   */
  public generateProcessingStats(results: OCRResult[]): {
    total_processados: number;
    confianca_media: number;
    tipos_identificados: Record<string, number>;
    documentos_com_erro: number;
    providers_utilizados: Record<string, number>;
    tempo_medio_processamento: number;
  } {
    const totalProcessados = results.length;
    const confiancaMedia = results.reduce((sum, r) => sum + r.confianca, 0) / totalProcessados;

    const tiposIdentificados = results.reduce((acc, r) => {
      const tipo = r.metadados.tipo_documento;
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const providersUtilizados = results.reduce((acc, r) => {
      const provider = r.metadados.provider;
      acc[provider] = (acc[provider] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const documentosComErro = results.filter(r => r.confianca < 0.7).length;
    const tempoMedioProcessamento = results.reduce((sum, r) => sum + r.metadados.processing_time_ms, 0) / totalProcessados;

    return {
      total_processados: totalProcessados,
      confianca_media: Number(confiancaMedia.toFixed(2)),
      tipos_identificados: tiposIdentificados,
      documentos_com_erro: documentosComErro,
      providers_utilizados: providersUtilizados,
      tempo_medio_processamento: Number(tempoMedioProcessamento.toFixed(0))
    };
  }

  /**
   * Constrói prompt para extração estruturada
   */
  private buildStructuredExtractionPrompt(texto: string, documentType?: string): string {
    const prompt = [
      'Analise este texto extraído de um documento fiscal brasileiro e extraia dados estruturados em formato JSON.',
      '',
      'TEXTO DO DOCUMENTO:',
      texto,
      '',
      'EXTRAIA OS SEGUINTES DADOS (quando disponíveis):',
      '- tipo_fiscal: Tipo do documento (NFe, NFCe, DAS, DARF, CTe, etc.)',
      '- campos_identificados: Array com campos importantes encontrados',
      '- valores_monetarios: Array com valores financeiros identificados',
      '- datas_importantes: Array com datas relevantes (emissão, vencimento, competência)',
      '',
      'FORMATO JSON ESPERADO:',
      '{',
      '  "tipo_fiscal": "NFe",',
      '  "campos_identificados": [',
      '    {"campo": "numero_nota", "valor": "12345", "confianca": 0.95},',
      '    {"campo": "cnpj_emitente", "valor": "12.345.678/0001-90", "confianca": 0.98}',
      '  ],',
      '  "valores_monetarios": [',
      '    {"descricao": "valor_total", "valor": 1250.50},',
      '    {"descricao": "icms", "valor": 125.00}',
      '  ],',
      '  "datas_importantes": [',
      '    {"tipo": "emissao", "data": "2024-01-15"},',
      '    {"tipo": "vencimento", "data": "2024-02-15"}',
      '  ]',
      '}',
      '',
      'INSTRUÇÕES:',
      '- Use confiança entre 0.0 e 1.0 baseada na clareza do campo',
      '- Para valores, use números (não strings)',
      '- Para datas, use formato YYYY-MM-DD',
      '- Se não encontrar dados, retorne arrays vazios',
      '- Seja preciso e conservador na extração'
    ];

    return prompt.join('\n');
  }

  /**
   * Converte resposta estruturada do OpenAI para interface interna
   */
  private parseStructuredResponse(jsonResult: any): DocumentoEstruturado | undefined {
    try {
      if (!jsonResult || typeof jsonResult !== 'object') {
        return undefined;
      }

      return {
        tipo_fiscal: jsonResult.tipo_fiscal,
        campos_identificados: Array.isArray(jsonResult.campos_identificados)
          ? jsonResult.campos_identificados
          : [],
        valores_monetarios: Array.isArray(jsonResult.valores_monetarios)
          ? jsonResult.valores_monetarios
          : undefined,
        datas_importantes: Array.isArray(jsonResult.datas_importantes)
          ? jsonResult.datas_importantes
          : undefined
      };
    } catch (error) {
      console.warn('Erro ao parsear resposta estruturada:', error);
      return undefined;
    }
  }

  /**
   * Extração básica de dados estruturados (fallback)
   */
  private extractBasicStructuredData(texto: string, documentType?: string): DocumentoEstruturado | undefined {
    const textoLower = texto.toLowerCase();
    const campos: Array<{campo: string; valor: string; confianca: number}> = [];

    // Extrair CNPJs
    const cnpjRegex = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;
    const cnpjs = texto.match(cnpjRegex);
    if (cnpjs) {
      cnpjs.forEach((cnpj, index) => {
        campos.push({
          campo: index === 0 ? 'cnpj_principal' : `cnpj_${index + 1}`,
          valor: cnpj,
          confianca: 0.9
        });
      });
    }

    // Extrair valores monetários
    const valorRegex = /R\$\s*[\d.,]+/g;
    const valores = texto.match(valorRegex);
    const valoresMonetarios: Array<{descricao: string; valor: number}> = [];

    if (valores) {
      valores.forEach((valor, index) => {
        const numeroStr = valor.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
        const numero = parseFloat(numeroStr);
        if (!isNaN(numero)) {
          valoresMonetarios.push({
            descricao: index === 0 ? 'valor_principal' : `valor_${index + 1}`,
            valor: numero
          });
        }
      });
    }

    // Extrair datas
    const dataRegex = /\d{1,2}\/\d{1,2}\/\d{4}/g;
    const datas = texto.match(dataRegex);
    const datasImportantes: Array<{tipo: 'emissao' | 'vencimento' | 'competencia'; data: string}> = [];

    if (datas) {
      datas.forEach((data, index) => {
        const [dia, mes, ano] = data.split('/');
        if (dia && mes && ano) {
          const dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          datasImportantes.push({
            tipo: index === 0 ? 'emissao' : (index === 1 ? 'vencimento' : 'competencia'),
            data: dataFormatada
          });
        }
      });
    }

    if (campos.length === 0 && valoresMonetarios.length === 0 && datasImportantes.length === 0) {
      return undefined;
    }

    return {
      tipo_fiscal: documentType as any,
      campos_identificados: campos,
      valores_monetarios: valoresMonetarios.length > 0 ? valoresMonetarios : undefined,
      datas_importantes: datasImportantes.length > 0 ? datasImportantes : undefined
    };
  }

  private createMockResult(fileBuffer: Buffer, filename: string, startTime: number, documentType: string): OCRResult {
    return {
      texto_extraido: 'Texto extraído via mock para teste - OpenAI não configurado',
      confianca: 0.8,
      metadados: {
        paginas: 1,
        tamanho_arquivo: fileBuffer.length,
        tipo_documento: documentType,
        data_processamento: new Date().toISOString(),
        provider: 'mock',
        processing_time_ms: Date.now() - startTime
      }
    };
  }
}

/**
 * Exporta instância singleton do serviço OCR
 */
export const ocrService = new OCRService();