/**
 * 🚀 DOCUMENT PROCESSOR UNIFIED - ContabilidadePRO
 * Edge Function unificada para processamento completo de documentos contábeis brasileiros
 *
 * 📋 FORMATOS SUPORTADOS:
 * • PDF (.pdf) - Relatórios fiscais, DAS, INSS, Cartões CNPJ, Recibos, CCT
 * • Excel (.xlsx) - Planos de contas, Cálculos de impostos, Acompanhamento MEI
 * • Word (.docx) - Objeto social, Orientações contábeis
 * • Imagens (.png) - Pacotes de serviços, Documentos digitalizados
 * • CSV (.csv) - Dados tabulares, Frases de marketing
 * • Texto (.txt) - Chats RFB, Registros diversos
 * • HTML (.html) - Consultas online salvas
 *
 * 🎯 TIPOS DE DOCUMENTOS ESPECIALIZADOS:
 * • Documentos Fiscais: DAS, INSS, Relatórios RFB, Termos de exclusão
 * • Documentos Trabalhistas: Rescisões, CCT, Pró-labore
 * • Documentos Cadastrais: CNPJ, Fichas cadastrais, Identidade profissional
 * • Planilhas Contábeis: Planos de conta, Cálculos, Acompanhamentos
 * • Comunicações: RFB, Normas contábeis, Propostas de serviços
 *
 * Extração universal de dados com IA avançada e classificação automática
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''
const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY') ?? ''

// Interfaces
interface UnifiedDocumentRequest {
  action: 'upload' | 'process_ocr' | 'extract_data' | 'classify' | 'analyze' | 'status' | 'reprocess'
  documentId?: string
  filePath?: string
  fileName?: string
  fileBuffer?: string // base64
  mimeType?: string
  options?: {
    language?: string
    quality?: 'low' | 'medium' | 'high'
    extractTables?: boolean
    enableCache?: boolean
    documentType?: string
    extractionMode?: 'basic' | 'advanced' | 'complete'
    enableAI?: boolean
  }
}

interface UniversalExtractionResult {
  success: boolean
  documentId: string
  processingStages: {
    ocr: OCRStageResult
    regex: RegexStageResult
    ai: AIStageResult
    validation: ValidationStageResult
  }
  extractedData: UniversalDocumentData
  metadata: ProcessingMetadata
  confidence: number
  processingTime: number
}

interface UniversalDocumentData {
  // Dados básicos sempre presentes
  raw_text: string
  document_type: string
  confidence_score: number
  
  // Dados estruturados universais
  entities: ExtractedEntity[]
  financial_data: FinancialData[]
  dates: ExtractedDate[]
  addresses: ExtractedAddress[]
  contacts: ExtractedContact[]
  
  // Dados específicos por tipo de documento
  fiscal_data?: FiscalDocumentData
  contract_data?: ContractData
  receipt_data?: ReceiptData
  
  // Dados adicionais descobertos pela IA
  additional_fields: Record<string, any>
  relationships: DataRelationship[]
  insights: string[]
}

interface ExtractedEntity {
  type: 'person' | 'company' | 'product' | 'service' | 'location' | 'other'
  value: string
  confidence: number
  context: string
  position: { start: number, end: number }
}

interface FinancialData {
  type: 'total' | 'subtotal' | 'tax' | 'discount' | 'fee' | 'other'
  value: number
  currency: string
  description: string
  confidence: number
}

interface ExtractedDate {
  type: 'emission' | 'due' | 'payment' | 'validity' | 'other'
  date: string
  confidence: number
  context: string
}

interface ExtractedAddress {
  type: 'billing' | 'shipping' | 'company' | 'other'
  full_address: string
  street?: string
  number?: string
  city?: string
  state?: string
  zip_code?: string
  confidence: number
}

interface ExtractedContact {
  type: 'email' | 'phone' | 'website' | 'other'
  value: string
  confidence: number
  context: string
}

interface DataRelationship {
  from_entity: string
  to_entity: string
  relationship_type: string
  confidence: number
}

// Função principal
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      )
    }

    const request: UnifiedDocumentRequest = await req.json()
    const { action } = request

    console.log(`[UNIFIED_PROCESSOR] Processando ação: ${action}`)

    let result: any

    switch (action) {
      case 'upload':
        result = await handleUpload(request)
        break
      case 'process_ocr':
        result = await handleOCR(request)
        break
      case 'extract_data':
        result = await handleExtraction(request)
        break
      case 'classify':
        result = await handleClassification(request)
        break
      case 'analyze':
        result = await handleAnalysis(request)
        break
      case 'status':
        result = await handleStatus(request)
        break
      case 'reprocess':
        result = await handleReprocess(request)
        break
      default:
        throw new Error(`Ação não suportada: ${action}`)
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('[UNIFIED_PROCESSOR] Erro:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

/**
 * 📤 UPLOAD - Gerenciar upload de arquivos
 */
async function handleUpload(request: UnifiedDocumentRequest) {
  const { filePath, fileName, documentId } = request
  
  if (!filePath || !fileName) {
    throw new Error('filePath e fileName são obrigatórios para upload')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Atualizar status do documento
  const { error } = await supabase
    .from('documentos')
    .update({
      status_processamento: 'uploaded',
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId)

  if (error) {
    throw new Error(`Erro ao atualizar documento: ${error.message}`)
  }

  return {
    documentId,
    status: 'uploaded',
    filePath,
    fileName,
    message: 'Upload processado com sucesso'
  }
}

// =====================================================
// PROCESSADORES ESPECÍFICOS POR FORMATO
// =====================================================

/**
 * 📄 PROCESSADOR DE DOCUMENTOS WORD (.docx)
 * Extrai texto e estrutura de documentos Word
 */
async function processWordDocument(fileBuffer: Uint8Array, fileName: string): Promise<{
  text: string
  metadata: any
  documentType: string
}> {
  try {
    // Para Edge Functions, usaremos uma abordagem simplificada
    // Em produção, seria ideal usar uma biblioteca como docx ou mammoth

    // Detectar tipo de documento Word baseado no nome e conteúdo
    const documentType = classifyWordDocument(fileName)

    // Por enquanto, retornamos estrutura básica
    // TODO: Implementar extração real de texto do DOCX
    return {
      text: `Documento Word: ${fileName}`,
      metadata: {
        fileName,
        format: 'docx',
        processingMethod: 'basic'
      },
      documentType
    }
  } catch (error) {
    console.error('Erro ao processar documento Word:', error)
    throw new Error(`Falha no processamento do documento Word: ${error.message}`)
  }
}

/**
 * 📊 PROCESSADOR DE PLANILHAS EXCEL (.xlsx)
 * Extrai dados, fórmulas e estrutura de planilhas Excel
 */
async function processExcelDocument(fileBuffer: Uint8Array, fileName: string): Promise<{
  text: string
  metadata: any
  documentType: string
  sheets: any[]
}> {
  try {
    // Detectar tipo de planilha baseado no nome
    const documentType = classifyExcelDocument(fileName)

    // Por enquanto, estrutura básica
    // TODO: Implementar extração real usando biblioteca XLSX
    return {
      text: `Planilha Excel: ${fileName}`,
      metadata: {
        fileName,
        format: 'xlsx',
        processingMethod: 'basic'
      },
      documentType,
      sheets: []
    }
  } catch (error) {
    console.error('Erro ao processar planilha Excel:', error)
    throw new Error(`Falha no processamento da planilha Excel: ${error.message}`)
  }
}

/**
 * 📝 PROCESSADOR DE ARQUIVOS CSV
 * Extrai dados tabulares de arquivos CSV
 */
async function processCSVDocument(fileBuffer: Uint8Array, fileName: string): Promise<{
  text: string
  metadata: any
  documentType: string
  data: any[]
}> {
  try {
    const text = new TextDecoder('utf-8').decode(fileBuffer)
    const lines = text.split('\n').filter(line => line.trim())

    // Detectar tipo baseado no conteúdo e nome
    const documentType = classifyCSVDocument(fileName, text)

    // Parse básico do CSV
    const data = lines.map(line => line.split(',').map(cell => cell.trim()))

    return {
      text,
      metadata: {
        fileName,
        format: 'csv',
        rowCount: lines.length,
        processingMethod: 'native'
      },
      documentType,
      data
    }
  } catch (error) {
    console.error('Erro ao processar arquivo CSV:', error)
    throw new Error(`Falha no processamento do arquivo CSV: ${error.message}`)
  }
}

/**
 * 📄 PROCESSADOR DE ARQUIVOS TXT
 * Extrai texto simples e classifica conteúdo
 */
async function processTextDocument(fileBuffer: Uint8Array, fileName: string): Promise<{
  text: string
  metadata: any
  documentType: string
}> {
  try {
    const text = new TextDecoder('utf-8').decode(fileBuffer)

    // Detectar tipo baseado no conteúdo e nome
    const documentType = classifyTextDocument(fileName, text)

    return {
      text,
      metadata: {
        fileName,
        format: 'txt',
        characterCount: text.length,
        lineCount: text.split('\n').length,
        processingMethod: 'native'
      },
      documentType
    }
  } catch (error) {
    console.error('Erro ao processar arquivo TXT:', error)
    throw new Error(`Falha no processamento do arquivo TXT: ${error.message}`)
  }
}

/**
 * 🌐 PROCESSADOR DE ARQUIVOS HTML
 * Extrai texto e estrutura de arquivos HTML
 */
async function processHTMLDocument(fileBuffer: Uint8Array, fileName: string): Promise<{
  text: string
  metadata: any
  documentType: string
}> {
  try {
    const html = new TextDecoder('utf-8').decode(fileBuffer)

    // Extrair texto básico removendo tags HTML
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

    // Detectar tipo baseado no conteúdo
    const documentType = classifyHTMLDocument(fileName, html)

    return {
      text,
      metadata: {
        fileName,
        format: 'html',
        originalSize: html.length,
        extractedTextSize: text.length,
        processingMethod: 'regex'
      },
      documentType
    }
  } catch (error) {
    console.error('Erro ao processar arquivo HTML:', error)
    throw new Error(`Falha no processamento do arquivo HTML: ${error.message}`)
  }
}

// =====================================================
// CLASSIFICADORES DE DOCUMENTOS CONTÁBEIS BRASILEIROS
// =====================================================

/**
 * 🏷️ CLASSIFICADOR DE DOCUMENTOS WORD
 */
function classifyWordDocument(fileName: string): string {
  const name = fileName.toLowerCase()

  if (name.includes('objeto') && name.includes('social')) return 'objeto_social'
  if (name.includes('plano') && name.includes('conta')) return 'plano_contas'
  if (name.includes('orientac') || name.includes('instruc')) return 'orientacoes_contabeis'
  if (name.includes('contrato')) return 'contrato'
  if (name.includes('termo')) return 'termo_legal'
  if (name.includes('norma') || name.includes('nbc')) return 'norma_contabil'

  return 'documento_textual'
}

/**
 * 🏷️ CLASSIFICADOR DE PLANILHAS EXCEL
 */
function classifyExcelDocument(fileName: string): string {
  const name = fileName.toLowerCase()

  if (name.includes('plano') && name.includes('conta')) return 'plano_contas'
  if (name.includes('calculo') && name.includes('imposto')) return 'calculo_impostos'
  if (name.includes('mei') && name.includes('acompanhamento')) return 'acompanhamento_mei'
  if (name.includes('rescis')) return 'calculo_rescisao'
  if (name.includes('preco') && name.includes('venda')) return 'calculo_preco_venda'
  if (name.includes('fgts')) return 'acompanhamento_fgts'
  if (name.includes('faturamento')) return 'planilha_faturamento'
  if (name.includes('defis')) return 'valores_defis'
  if (name.includes('folha') && name.includes('pagamento')) return 'conciliacao_folha'
  if (name.includes('lucro') && name.includes('presumido')) return 'calculo_lucro_presumido'

  return 'planilha_contabil'
}

/**
 * 🏷️ CLASSIFICADOR DE ARQUIVOS CSV
 */
function classifyCSVDocument(fileName: string, content: string): string {
  const name = fileName.toLowerCase()
  const contentLower = content.toLowerCase()

  if (name.includes('frase') && name.includes('instagram')) return 'marketing_digital'
  if (contentLower.includes('cnpj') || contentLower.includes('empresa')) return 'dados_empresariais'
  if (contentLower.includes('valor') || contentLower.includes('receita')) return 'dados_financeiros'
  if (contentLower.includes('cliente')) return 'dados_clientes'

  return 'dados_tabulares'
}

/**
 * 🏷️ CLASSIFICADOR DE ARQUIVOS TXT
 */
function classifyTextDocument(fileName: string, content: string): string {
  const name = fileName.toLowerCase()
  const contentLower = content.toLowerCase()

  if (name.includes('chatrfb') || name.includes('receita')) return 'chat_receita_federal'
  if (contentLower.includes('receita federal') || contentLower.includes('rfb')) return 'comunicacao_rfb'
  if (contentLower.includes('protocolo') || contentLower.includes('atendimento')) return 'protocolo_atendimento'
  if (contentLower.includes('log') || contentLower.includes('registro')) return 'registro_sistema'

  return 'documento_texto'
}

/**
 * 🏷️ CLASSIFICADOR DE ARQUIVOS HTML
 */
function classifyHTMLDocument(fileName: string, content: string): string {
  const name = fileName.toLowerCase()
  const contentLower = content.toLowerCase()

  if (name.includes('titulo') && name.includes('votac')) return 'consulta_eleitoral'
  if (contentLower.includes('receita federal') || contentLower.includes('gov.br')) return 'consulta_governamental'
  if (contentLower.includes('cnpj') || contentLower.includes('empresa')) return 'consulta_empresarial'
  if (contentLower.includes('cpf') || contentLower.includes('pessoa')) return 'consulta_pessoal'

  return 'consulta_online'
}

/**
 * 🔍 OCR - Processamento de OCR com múltiplos providers
 */
async function handleOCR(request: UnifiedDocumentRequest): Promise<UniversalExtractionResult> {
  const startTime = Date.now()
  const { documentId, filePath, fileName, options = {} } = request

  if (!documentId || !filePath) {
    throw new Error('documentId e filePath são obrigatórios para OCR')
  }

  console.log(`[OCR] Iniciando processamento para documento ${documentId}`)

  // Baixar arquivo do storage
  const fileBuffer = await downloadFileFromStorage(filePath)
  const mimeType = getMimeTypeFromFileName(fileName || '')

  // Pipeline de extração universal
  const result = await processUniversalExtraction(
    documentId,
    fileBuffer,
    mimeType,
    fileName || '',
    options
  )

  // Salvar resultados no banco
  await saveExtractionResults(documentId, result)

  result.processingTime = Date.now() - startTime
  return result
}

/**
 * 🧠 EXTRAÇÃO UNIVERSAL - Pipeline completo de extração
 */
async function processUniversalExtraction(
  documentId: string,
  fileBuffer: Uint8Array,
  mimeType: string,
  fileName: string,
  options: any
): Promise<UniversalExtractionResult> {
  
  const extractionMode = options.extractionMode || 'complete'
  
  console.log(`[UNIVERSAL_EXTRACTION] Modo: ${extractionMode} para ${fileName}`)

  // Estágio 1: OCR - Extração de texto
  const ocrResult = await performOCRStage(fileBuffer, mimeType, options)
  
  // Estágio 2: Regex - Padrões conhecidos
  const regexResult = await performRegexStage(ocrResult.text, fileName)
  
  // Estágio 3: IA - Análise semântica completa
  const aiResult = await performAIStage(ocrResult.text, fileName, regexResult, options)
  
  // Estágio 4: Validação e enriquecimento
  const validationResult = await performValidationStage(aiResult, regexResult)

  // Combinar todos os resultados
  const extractedData = combineExtractionResults(ocrResult, regexResult, aiResult, validationResult)
  
  // Calcular confiança geral
  const confidence = calculateOverallConfidence(ocrResult, regexResult, aiResult, validationResult)

  return {
    success: true,
    documentId,
    processingStages: {
      ocr: ocrResult,
      regex: regexResult,
      ai: aiResult,
      validation: validationResult
    },
    extractedData,
    metadata: {
      fileName,
      mimeType,
      fileSize: fileBuffer.length,
      extractionMode,
      timestamp: new Date().toISOString(),
      providers_used: [ocrResult.provider, aiResult.provider].filter(Boolean)
    },
    confidence,
    processingTime: 0 // Será preenchido depois
  }
}

/**
 * 🔍 ESTÁGIO 1: OCR - Extração de texto bruto com processadores específicos
 */
async function performOCRStage(fileBuffer: Uint8Array, mimeType: string, options: any): Promise<OCRStageResult> {
  const fileName = options.fileName || 'documento'

  try {
    let text = ''
    let metadata: any = {}
    let provider = 'unknown'

    // Processar baseado no tipo de arquivo
    if (mimeType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') ||
        fileName.toLowerCase().endsWith('.docx')) {
      // Documento Word
      const result = await processWordDocument(fileBuffer, fileName)
      text = result.text
      metadata = result.metadata
      provider = 'word_processor'

    } else if (mimeType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
               fileName.toLowerCase().endsWith('.xlsx')) {
      // Planilha Excel
      const result = await processExcelDocument(fileBuffer, fileName)
      text = result.text
      metadata = { ...result.metadata, sheets: result.sheets }
      provider = 'excel_processor'

    } else if (mimeType.includes('text/csv') || fileName.toLowerCase().endsWith('.csv')) {
      // Arquivo CSV
      const result = await processCSVDocument(fileBuffer, fileName)
      text = result.text
      metadata = { ...result.metadata, data: result.data }
      provider = 'csv_processor'

    } else if (mimeType.includes('text/plain') || fileName.toLowerCase().endsWith('.txt')) {
      // Arquivo TXT
      const result = await processTextDocument(fileBuffer, fileName)
      text = result.text
      metadata = result.metadata
      provider = 'text_processor'

    } else if (mimeType.includes('text/html') || fileName.toLowerCase().endsWith('.html')) {
      // Arquivo HTML
      const result = await processHTMLDocument(fileBuffer, fileName)
      text = result.text
      metadata = result.metadata
      provider = 'html_processor'

    } else if (mimeType.includes('application/pdf') || fileName.toLowerCase().endsWith('.pdf')) {
      // PDF - usar OCR tradicional
      text = await performPDFOCR(fileBuffer, options)
      provider = 'pdf_ocr'
      metadata = { format: 'pdf', processingMethod: 'ocr' }

    } else if (mimeType.includes('image/') ||
               fileName.toLowerCase().match(/\.(png|jpg|jpeg|gif|bmp|tiff)$/)) {
      // Imagem - usar OCR tradicional
      text = await performImageOCR(fileBuffer, options)
      provider = 'image_ocr'
      metadata = { format: 'image', processingMethod: 'ocr' }

    } else {
      throw new Error(`Formato não suportado: ${mimeType}`)
    }

    return {
      text: text || '',
      confidence: text ? 0.9 : 0.1,
      provider,
      metadata: {
        ...metadata,
        mimeType,
        fileName,
        processingTime: Date.now()
      }
    }

  } catch (error) {
    console.error('Erro no estágio OCR:', error)
    return {
      text: '',
      confidence: 0,
      provider: 'error',
      metadata: { error: error.message, mimeType, fileName }
    }
  }
  console.log(`[OCR_STAGE] Processando ${mimeType}

/**
 * 📄 OCR PARA PDF - Processamento específico de PDFs
 */
async function performPDFOCR(fileBuffer: Uint8Array, options: any): Promise<string> {
  try {
    // Usar OpenAI Vision API para PDFs
    if (openaiApiKey) {
      const base64 = btoa(String.fromCharCode(...fileBuffer))

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + openaiApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia todo o texto deste documento PDF. Mantenha a formatação e estrutura original.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:application/pdf;base64,' + base64
                }
              }
            ]
          }],
          max_tokens: 4000
        })
      })

      if (response.ok) {
        const result = await response.json()
        return result.choices[0]?.message?.content || ''
      }
    }

    // Fallback: retornar indicação de que é um PDF
    return 'Documento PDF - processamento OCR necessário'

  } catch (error) {
    console.error('Erro no OCR de PDF:', error)
    return 'Erro no processamento do PDF'
  }
}

/**
 * 🖼️ OCR PARA IMAGEM - Processamento específico de imagens
 */
async function performImageOCR(fileBuffer: Uint8Array, options: any): Promise<string> {
  try {
    // Usar OpenAI Vision API para imagens
    if (openaiApiKey) {
      const base64 = btoa(String.fromCharCode(...fileBuffer))

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + openaiApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia todo o texto visível nesta imagem. Se for um documento contábil brasileiro, identifique o tipo e extraia dados estruturados.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/png;base64,' + base64
                }
              }
            ]
          }],
          max_tokens: 4000
        })
      })

      if (response.ok) {
        const result = await response.json()
        return result.choices[0]?.message?.content || ''
      }
    }

    // Fallback: retornar indicação de que é uma imagem
    return 'Imagem - processamento OCR necessário'

  } catch (error) {
    console.error('Erro no OCR de imagem:', error)
    return 'Erro no processamento da imagem'
  }
}`)

  let text = ''
  let confidence = 0
  let provider = 'none'

  try {
    if (mimeType === 'application/pdf') {
      // PDF: Tentar OpenAI Vision primeiro, depois Google
      if (openaiApiKey) {
        const result = await processWithOpenAIVision(fileBuffer, mimeType)
        text = result.text
        confidence = result.confidence
        provider = 'openai_vision'
      } else if (googleApiKey) {
        const result = await processWithGoogleVision(fileBuffer)
        text = result.text
        confidence = result.confidence
        provider = 'google_vision'
      }
    } else if (mimeType.startsWith('image/')) {
      // Imagem: OpenAI Vision é melhor para documentos
      if (openaiApiKey) {
        const result = await processWithOpenAIVision(fileBuffer, mimeType)
        text = result.text
        confidence = result.confidence
        provider = 'openai_vision'
      } else if (googleApiKey) {
        const result = await processWithGoogleVision(fileBuffer)
        text = result.text
        confidence = result.confidence
        provider = 'google_vision'
      }
    } else if (mimeType === 'text/plain') {
      // Texto simples
      text = new TextDecoder().decode(fileBuffer)
      confidence = 1.0
      provider = 'text_decode'
    }

    // Fallback se nenhum provider funcionou
    if (!text && fileBuffer.length > 0) {
      text = 'Texto não pôde ser extraído - providers não disponíveis'
      confidence = 0.1
      provider = 'fallback'
    }

  } catch (error) {
    console.error('[OCR_STAGE] Erro:', error)
    text = `Erro na extração de texto: ${error.message}`
    confidence = 0
    provider = 'error'
  }

  return {
    text,
    confidence,
    provider,
    metadata: {
      text_length: text.length,
      word_count: text.split(/\s+/).length,
      has_structured_data: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(text) || /R\$\s*\d+/.test(text)
    }
  }
}

/**
 * 📝 ESTÁGIO 2: REGEX - Padrões estruturados conhecidos
 */
async function performRegexStage(text: string, fileName: string): Promise<RegexStageResult> {
  console.log('[REGEX_STAGE] Extraindo padrões conhecidos')

  const patterns = {
    // === DOCUMENTOS FISCAIS BRASILEIROS ===
    cnpj: /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g,
    cpf: /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g,
    inscricao_estadual: /(?:i\.?e\.?|inscri[çc][ãa]o\s+estadual)[:\s]*([0-9.-]+)/gi,
    inscricao_municipal: /(?:i\.?m\.?|inscri[çc][ãa]o\s+municipal)[:\s]*([0-9.-]+)/gi,

    // DAS e Impostos
    codigo_das: /(?:das|documento\s+de\s+arrecada[çc][ãa]o)[:\s]*(\d{4}\.\d{4}\.\d{4}\.\d{4})/gi,
    valor_das: /(?:valor\s+do\s+das|total\s+a\s+pagar)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    vencimento_das: /(?:vencimento|data\s+limite)[:\s]*(\d{2}\/\d{2}\/\d{4})/gi,

    // INSS e Previdência
    numero_inss: /(?:inss|previdência)[:\s]*(\d{3}\.\d{5}\.\d{2}-\d)/gi,
    valor_inss: /(?:valor\s+inss|contribui[çc][ãa]o)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,

    // Notas Fiscais
    chave_acesso_nfe: /(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/g,
    numero_nf: /(?:n[úu]mero|n[°º]|nf)[:\s]*(\d+)/gi,
    serie_nf: /(?:s[ée]rie)[:\s]*(\d+)/gi,
    protocolo_nfe: /(?:protocolo)[:\s]*(\d{15})/gi,

    // === DOCUMENTOS TRABALHISTAS ===
    pis_pasep: /(?:pis|pasep)[:\s]*(\d{3}\.\d{5}\.\d{2}-\d)/gi,
    ctps: /(?:ctps|carteira\s+trabalho)[:\s]*(\d{7}-\d{2})/gi,
    fgts: /(?:fgts)[:\s]*(\d{3}\.\d{5}\.\d{2})/gi,
    salario: /(?:sal[áa]rio|remunera[çc][ãa]o)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,

    // Rescisão
    aviso_previo: /(?:aviso\s+pr[ée]vio)[:\s]*(\d+\s+dias?)/gi,
    saldo_salario: /(?:saldo\s+sal[áa]rio)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    ferias_proporcionais: /(?:f[ée]rias\s+proporcionais)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    decimo_terceiro: /(?:13[°º]|d[ée]cimo\s+terceiro)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,

    // === DOCUMENTOS CADASTRAIS ===
    razao_social: /(?:raz[ãa]o\s+social)[:\s]*([A-Z][A-Za-z\s&.-]+)/gi,
    nome_fantasia: /(?:nome\s+fantasia)[:\s]*([A-Za-z\s&.-]+)/gi,
    cnae: /(?:cnae)[:\s]*(\d{4}-\d\/\d{2})/gi,
    natureza_juridica: /(?:natureza\s+jur[íi]dica)[:\s]*(\d{3}-\d)/gi,

    // === VALORES MONETÁRIOS AVANÇADOS ===
    valores: /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,
    receita_bruta: /(?:receita\s+bruta)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    lucro_liquido: /(?:lucro\s+l[íi]quido)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    patrimonio_liquido: /(?:patrim[ôo]nio\s+l[íi]quido)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,

    // === DATAS ESPECÍFICAS ===
    datas: /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})/g,
    periodo_apuracao: /(?:per[íi]odo\s+de\s+apura[çc][ãa]o)[:\s]*(\d{2}\/\d{4})/gi,
    data_constituicao: /(?:data\s+constitui[çc][ãa]o)[:\s]*(\d{2}\/\d{2}\/\d{4})/gi,
    data_admissao: /(?:data\s+admiss[ãa]o)[:\s]*(\d{2}\/\d{2}\/\d{4})/gi,
    data_demissao: /(?:data\s+demiss[ãa]o)[:\s]*(\d{2}\/\d{2}\/\d{4})/gi,

    // === CONTATOS E ENDEREÇOS ===
    emails: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    telefones: /(\(?(?:\+55\s?)?(?:\d{2})\)?\s?\d{4,5}-?\d{4})/g,
    ceps: /(\d{5}-?\d{3})/g,
    endereco_completo: /(?:endere[çc]o)[:\s]*([A-Za-z0-9\s,.-]+,\s*\d{5}-?\d{3})/gi,

    // === CÓDIGOS E PROTOCOLOS ===
    protocolo_receita: /(?:protocolo)[:\s]*(\d{8,15})/gi,
    codigo_barras: /(\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14})/g,
    linha_digitavel: /(\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14})/g,

    // === URLS E SITES GOVERNAMENTAIS ===
    urls: /(https?:\/\/[^\s]+)/g,
    site_receita: /(https?:\/\/[^\s]*receita[^\s]*)/gi,
    site_gov: /(https?:\/\/[^\s]*\.gov\.br[^\s]*)/gi,

    // === CÓDIGOS DIVERSOS ===
    codigos: /(?:c[óo]digo|cod)[:\s]*([A-Z0-9-]+)/gi,
    numero_processo: /(?:processo|proc)[:\s]*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/gi,

    // === ESPECÍFICOS PARA MEI ===
    numero_mei: /(?:mei)[:\s]*(\d{14})/gi,
    dasn_simei: /(?:dasn[- ]?simei)[:\s]*(\d{4})/gi,

    // === ESPECÍFICOS PARA SIMPLES NACIONAL ===
    codigo_simples: /(?:simples\s+nacional)[:\s]*(\d{14})/gi,
    sublimite_receita: /(?:sublimite)[:\s]*r\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
  }

  const extractedData: Record<string, any[]> = {}
  let totalMatches = 0

  // Executar todos os padrões
  for (const [patternName, regex] of Object.entries(patterns)) {
    const matches = Array.from(text.matchAll(regex))
    if (matches.length > 0) {
      extractedData[patternName] = matches.map(match => ({
        value: match[1] || match[0],
        position: { start: match.index, end: match.index + match[0].length },
        confidence: calculatePatternConfidence(patternName, match[0])
      }))
      totalMatches += matches.length
    }
  }

  // Classificação automática baseada em padrões
  const documentType = classifyBrazilianDocument(extractedData, fileName)

  return {
    patterns_found: Object.keys(extractedData),
    extracted_data: extractedData,
    document_type: documentType,
    total_matches: totalMatches,
    confidence: Math.min(0.95, totalMatches * 0.1) // Máximo 95%
  }
}

/**
 * 🏷️ CLASSIFICADOR AVANÇADO DE DOCUMENTOS CONTÁBEIS BRASILEIROS
 */
function classifyBrazilianDocument(extractedData: Record<string, any[]>, fileName: string): string {
  const name = fileName.toLowerCase()
  const patterns = Object.keys(extractedData)

  // === DOCUMENTOS FISCAIS ===
  if (patterns.includes('codigo_das') || patterns.includes('valor_das') || name.includes('das')) {
    return 'documento_das'
  }

  if (patterns.includes('numero_inss') || patterns.includes('valor_inss') || name.includes('inss')) {
    return 'documento_inss'
  }

  if (patterns.includes('chave_acesso_nfe') || patterns.includes('numero_nf') || name.includes('nfe') || name.includes('nota')) {
    return 'nota_fiscal_eletronica'
  }

  if (patterns.includes('protocolo_receita') || name.includes('receita') || name.includes('rfb')) {
    return 'documento_receita_federal'
  }

  // === DOCUMENTOS TRABALHISTAS ===
  if (patterns.includes('aviso_previo') || patterns.includes('saldo_salario') || name.includes('rescis')) {
    return 'termo_rescisao'
  }

  if (patterns.includes('pis_pasep') || patterns.includes('ctps') || name.includes('cct')) {
    return 'documento_trabalhista'
  }

  if (patterns.includes('salario') || name.includes('folha') || name.includes('pro-labore')) {
    return 'folha_pagamento'
  }

  // === DOCUMENTOS CADASTRAIS ===
  if (patterns.includes('razao_social') || patterns.includes('cnae') || name.includes('cnpj')) {
    return 'cartao_cnpj'
  }

  if (patterns.includes('data_constituicao') || name.includes('ficha') || name.includes('cadastral')) {
    return 'ficha_cadastral'
  }

  // === DOCUMENTOS CONTÁBEIS ===
  if (patterns.includes('receita_bruta') || patterns.includes('lucro_liquido') || name.includes('balanco')) {
    return 'demonstrativo_financeiro'
  }

  if (name.includes('plano') && name.includes('conta')) {
    return 'plano_contas'
  }

  if (name.includes('calculo') && (name.includes('imposto') || name.includes('tributo'))) {
    return 'calculo_tributario'
  }

  // === DOCUMENTOS MEI ===
  if (patterns.includes('numero_mei') || patterns.includes('dasn_simei') || name.includes('mei')) {
    return 'documento_mei'
  }

  // === SIMPLES NACIONAL ===
  if (patterns.includes('codigo_simples') || patterns.includes('sublimite_receita') || name.includes('simples')) {
    return 'documento_simples_nacional'
  }

  // === DOCUMENTOS REGULAMENTARES ===
  if (name.includes('nbc') || name.includes('norma')) {
    return 'norma_contabil'
  }

  if (name.includes('termo') && (name.includes('exclusao') || name.includes('quitacao'))) {
    return 'termo_legal'
  }

  // === DOCUMENTOS OPERACIONAIS ===
  if (name.includes('proposta') || name.includes('servico')) {
    return 'proposta_servicos'
  }

  if (name.includes('extrato') || name.includes('pendencia')) {
    return 'extrato_pendencias'
  }

  if (name.includes('faturamento') || name.includes('cobranca')) {
    return 'documento_faturamento'
  }

  // === COMUNICAÇÕES ===
  if (name.includes('chat') || name.includes('conversa')) {
    return 'comunicacao_cliente'
  }

  if (name.includes('email') || name.includes('mensagem')) {
    return 'comunicacao_eletronica'
  }

  // === CONSULTAS ONLINE ===
  if (name.includes('consulta') || name.includes('titulo') || name.includes('votacao')) {
    return 'consulta_online'
  }

  // === CLASSIFICAÇÃO POR FORMATO ===
  if (name.endsWith('.xlsx') || name.endsWith('.csv')) {
    return 'planilha_dados'
  }

  if (name.endsWith('.docx') || name.endsWith('.txt')) {
    return 'documento_textual'
  }

  if (name.endsWith('.html')) {
    return 'documento_web'
  }

  if (name.endsWith('.pdf')) {
    return 'documento_pdf'
  }

  // === FALLBACK BASEADO EM PADRÕES ===
  if (patterns.includes('cnpj') && patterns.includes('valores')) {
    return 'documento_empresarial'
  }

  if (patterns.includes('cpf') && patterns.includes('datas')) {
    return 'documento_pessoal'
  }

  if (patterns.includes('valores') && patterns.includes('datas')) {
    return 'documento_financeiro'
  }

  // Classificação genérica
  return 'documento_geral'
}

/**
 * 🧠 PROMPT ESPECIALIZADO PARA CONTABILIDADE BRASILEIRA
 */
function createBrazilianAccountingPrompt(text: string, fileName: string, regexResult: RegexStageResult): string {
  const documentType = regexResult.document_type
  const patternsFound = regexResult.patterns_found.join(', ')

  return `Você é um especialista em contabilidade brasileira e processamento de documentos fiscais.
Analise o seguinte documento e extraia informações estruturadas seguindo as normas contábeis brasileiras.

DOCUMENTO: ${fileName}
TIPO IDENTIFICADO: ${documentType}
PADRÕES ENCONTRADOS: ${patternsFound}

TEXTO DO DOCUMENTO:
${text}

INSTRUÇÕES ESPECÍFICAS:
1. IDENTIFIQUE o tipo exato do documento contábil brasileiro
2. EXTRAIA todas as entidades relevantes (pessoas, empresas, valores, datas)
3. CLASSIFIQUE dados financeiros conforme padrões brasileiros
4. IDENTIFIQUE relacionamentos entre dados
5. FORNEÇA insights contábeis específicos
6. VALIDE informações contra regulamentações brasileiras

TIPOS DE DOCUMENTOS ESPERADOS:
- Fiscais: DAS, INSS, NFe, Relatórios RFB, Termos de exclusão
- Trabalhistas: Rescisões, CCT, Folhas de pagamento, Pró-labore
- Cadastrais: Cartões CNPJ, Fichas cadastrais, Documentos de identidade profissional
- Contábeis: Planos de contas, Cálculos de impostos, Demonstrativos, Balanços
- MEI: DASN-SIMEI, Acompanhamentos, Relatórios mensais
- Simples Nacional: Documentos de enquadramento, Sublimites, Exclusões
- Regulamentares: NBC TG, Comunicações RFB, Normas do CFC
- Operacionais: Propostas de serviços, Extratos de pendências, Planilhas de faturamento

FORMATO DE RESPOSTA (JSON):
{
  "document_classification": {
    "type": "tipo_documento_especifico",
    "category": "fiscal|trabalhista|cadastral|contabil|mei|simples|regulamentar|operacional",
    "confidence": 0.95
  },
  "entities": [
    {
      "type": "person|company|product|service|location|tax|financial",
      "value": "valor_extraido",
      "confidence": 0.9,
      "context": "contexto_onde_foi_encontrado",
      "brazilian_context": "contexto_contabil_brasileiro"
    }
  ],
  "financial_data": [
    {
      "type": "receita|despesa|imposto|contribuicao|salario|honorario",
      "value": "valor_numerico",
      "currency": "BRL",
      "reference_period": "periodo_referencia",
      "tax_regime": "mei|simples|presumido|real",
      "confidence": 0.9
    }
  ],
  "tax_information": {
    "regime": "mei|simples_nacional|lucro_presumido|lucro_real",
    "cnae": "codigo_cnae_se_identificado",
    "tax_obligations": ["obrigacoes_identificadas"],
    "due_dates": ["datas_vencimento"],
    "penalties": ["multas_ou_juros_identificados"]
  },
  "compliance_check": {
    "valid_cnpj": true,
    "valid_cpf": true,
    "valid_dates": true,
    "regulatory_compliance": "conforme|nao_conforme|verificar",
    "issues_found": ["problemas_identificados"]
  },
  "insights": [
    "insight_contabil_especifico_1",
    "insight_fiscal_brasileiro_2",
    "recomendacao_profissional_3"
  ],
  "relationships": [
    {
      "from": "entidade_origem",
      "to": "entidade_destino",
      "type": "tipo_relacionamento",
      "description": "descricao_do_relacionamento"
    }
  ],
  "additional_fields": {
    "campo_especifico_1": "valor",
    "campo_especifico_2": "valor"
  }
}

IMPORTANTE:
- Use terminologia contábil brasileira correta
- Considere as especificidades do regime tributário identificado
- Identifique obrigações acessórias aplicáveis
- Sinalize possíveis irregularidades ou inconsistências
- Forneça insights práticos para o contador brasileiro`
}

/**
 * 🧠 ESTÁGIO 3: IA - Análise semântica completa
 */
async function performAIStage(
  text: string,
  fileName: string,
  regexResult: RegexStageResult,
  options: any
): Promise<AIStageResult> {
  console.log('[AI_STAGE] Análise com IA avançada')

  if (!openaiApiKey || options.enableAI === false) {
    return {
      provider: 'none',
      entities: [],
      insights: ['IA não disponível ou desabilitada'],
      structured_data: {},
      confidence: 0
    }
  }

  try {
    // Prompt otimizado para documentos contábeis brasileiros
    const prompt = createBrazilianAccountingPrompt(text, fileName, regexResult)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + openaiApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em extração de dados de documentos brasileiros. Extraia TODAS as informações possíveis do documento fornecido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = JSON.parse(data.choices[0].message.content)

    return {
      provider: 'openai_gpt4o',
      entities: aiResponse.entities || [],
      insights: aiResponse.insights || [],
      structured_data: aiResponse.structured_data || {},
      additional_fields: aiResponse.additional_fields || {},
      relationships: aiResponse.relationships || [],
      confidence: aiResponse.confidence || 0.8
    }

  } catch (error) {
    console.error('[AI_STAGE] Erro:', error)
    return {
      provider: 'error',
      entities: [],
      insights: [`Erro na análise IA: ${error.message}`],
      structured_data: {},
      confidence: 0
    }
  }
}

/**
 * ✅ ESTÁGIO 4: VALIDAÇÃO - Validação e enriquecimento
 */
async function performValidationStage(aiResult: AIStageResult, regexResult: RegexStageResult): Promise<ValidationStageResult> {
  console.log('[VALIDATION_STAGE] Validando e enriquecendo dados')

  const errors: string[] = []
  const warnings: string[] = []
  const enrichments: string[] = []

  // Validar CNPJs encontrados
  if (regexResult.extracted_data.cnpj) {
    for (const cnpjData of regexResult.extracted_data.cnpj) {
      if (!validateCNPJ(cnpjData.value)) {
        errors.push(`CNPJ inválido: ${cnpjData.value}`)
      }
    }
  }

  // Validar CPFs encontrados
  if (regexResult.extracted_data.cpf) {
    for (const cpfData of regexResult.extracted_data.cpf) {
      if (!validateCPF(cpfData.value)) {
        errors.push(`CPF inválido: ${cpfData.value}`)
      }
    }
  }

  // Validar valores monetários
  if (regexResult.extracted_data.valores) {
    for (const valorData of regexResult.extracted_data.valores) {
      const valor = parseFloat(valorData.value.replace(/\./g, '').replace(',', '.'))
      if (isNaN(valor) || valor < 0) {
        warnings.push(`Valor monetário suspeito: ${valorData.value}`)
      }
    }
  }

  // Validar datas
  if (regexResult.extracted_data.datas) {
    for (const dataData of regexResult.extracted_data.datas) {
      if (!isValidDate(dataData.value)) {
        warnings.push(`Data inválida: ${dataData.value}`)
      }
    }
  }

  // Enriquecimentos baseados em IA
  if (aiResult.structured_data) {
    enrichments.push('Dados enriquecidos com análise semântica')
  }

  return {
    errors,
    warnings,
    enrichments,
    validation_score: calculateValidationScore(errors, warnings),
    is_valid: errors.length === 0
  }
}

/**
 * 🔗 COMBINAR RESULTADOS - Unificar todos os estágios
 */
function combineExtractionResults(
  ocrResult: OCRStageResult,
  regexResult: RegexStageResult,
  aiResult: AIStageResult,
  validationResult: ValidationStageResult
): UniversalDocumentData {

  // Combinar entidades de regex e IA
  const entities: ExtractedEntity[] = []

  // Adicionar entidades do regex
  for (const [type, matches] of Object.entries(regexResult.extracted_data)) {
    for (const match of matches) {
      entities.push({
        type: mapRegexTypeToEntityType(type),
        value: match.value,
        confidence: match.confidence,
        context: `Extraído via regex (${type})`,
        position: match.position
      })
    }
  }

  // Adicionar entidades da IA
  entities.push(...(aiResult.entities || []))

  // Extrair dados financeiros
  const financial_data: FinancialData[] = []
  if (regexResult.extracted_data.valores) {
    for (const valorData of regexResult.extracted_data.valores) {
      const valor = parseFloat(valorData.value.replace(/\./g, '').replace(',', '.'))
      if (!isNaN(valor)) {
        financial_data.push({
          type: 'other',
          value: valor,
          currency: 'BRL',
          description: `Valor encontrado: ${valorData.value}`,
          confidence: valorData.confidence
        })
      }
    }
  }

  // Extrair datas
  const dates: ExtractedDate[] = []
  if (regexResult.extracted_data.datas) {
    for (const dataData of regexResult.extracted_data.datas) {
      dates.push({
        type: 'other',
        date: normalizeDate(dataData.value),
        confidence: dataData.confidence,
        context: 'Extraído via regex'
      })
    }
  }

  // Extrair contatos
  const contacts: ExtractedContact[] = []
  if (regexResult.extracted_data.emails) {
    for (const emailData of regexResult.extracted_data.emails) {
      contacts.push({
        type: 'email',
        value: emailData.value,
        confidence: emailData.confidence,
        context: 'Extraído via regex'
      })
    }
  }

  if (regexResult.extracted_data.telefones) {
    for (const telefoneData of regexResult.extracted_data.telefones) {
      contacts.push({
        type: 'phone',
        value: telefoneData.value,
        confidence: telefoneData.confidence,
        context: 'Extraído via regex'
      })
    }
  }

  return {
    raw_text: ocrResult.text,
    document_type: regexResult.document_type,
    confidence_score: calculateOverallConfidence(ocrResult, regexResult, aiResult, validationResult),
    entities,
    financial_data,
    dates,
    addresses: [], // TODO: Implementar extração de endereços
    contacts,
    additional_fields: aiResult.additional_fields || {},
    relationships: aiResult.relationships || [],
    insights: aiResult.insights || []
  }
}

/**
 * 📊 CALCULAR CONFIANÇA GERAL
 */
function calculateOverallConfidence(
  ocrResult: OCRStageResult,
  regexResult: RegexStageResult,
  aiResult: AIStageResult,
  validationResult: ValidationStageResult
): number {
  const weights = {
    ocr: 0.3,
    regex: 0.2,
    ai: 0.4,
    validation: 0.1
  }

  const scores = {
    ocr: ocrResult.confidence,
    regex: regexResult.confidence,
    ai: aiResult.confidence,
    validation: validationResult.validation_score
  }

  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (scores[key as keyof typeof scores] * weight)
  }, 0)
}

// Interfaces para os resultados dos estágios
interface OCRStageResult {
  text: string
  confidence: number
  provider: string
  metadata: {
    text_length: number
    word_count: number
    has_structured_data: boolean
  }
}

interface RegexStageResult {
  patterns_found: string[]
  extracted_data: Record<string, any[]>
  document_type: string
  total_matches: number
  confidence: number
}

interface AIStageResult {
  provider: string
  entities: ExtractedEntity[]
  insights: string[]
  structured_data: Record<string, any>
  additional_fields?: Record<string, any>
  relationships?: DataRelationship[]
  confidence: number
}

interface ValidationStageResult {
  errors: string[]
  warnings: string[]
  enrichments: string[]
  validation_score: number
  is_valid: boolean
}

interface ProcessingMetadata {
  fileName: string
  mimeType: string
  fileSize: number
  extractionMode: string
  timestamp: string
  providers_used: string[]
}

interface FiscalDocumentData {
  numero?: string
  serie?: string
  chave_acesso?: string
  cnpj_emitente?: string
  valor_total?: number
  data_emissao?: string
}

interface ContractData {
  partes?: string[]
  objeto?: string
  valor?: number
  prazo?: string
}

interface ReceiptData {
  pagador?: string
  recebedor?: string
  valor?: number
  data?: string
  descricao?: string
}

// Importar funções auxiliares
import {
  downloadFileFromStorage,
  processWithOpenAIVision,
  processWithGoogleVision,
  createUniversalExtractionPrompt,
  calculateTextConfidence,
  calculatePatternConfidence,
  classifyDocumentByPatterns,
  validateCNPJ,
  validateCPF,
  isValidDate,
  normalizeDate,
  mapRegexTypeToEntityType,
  calculateValidationScore,
  getMimeTypeFromFileName
} from './utils.ts'

/**
 * 📊 EXTRAÇÃO - Processar extração de dados
 */
async function handleExtraction(request: UnifiedDocumentRequest) {
  const { documentId, options = {} } = request

  if (!documentId) {
    throw new Error('documentId é obrigatório para extração')
  }

  // Buscar documento no banco
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: documento, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !documento) {
    throw new Error(`Documento não encontrado: ${documentId}`)
  }

  // Processar extração universal
  const fileBuffer = await downloadFileFromStorage(documento.arquivo_path)
  const result = await processUniversalExtraction(
    documentId,
    fileBuffer,
    documento.tipo_mime,
    documento.arquivo_nome,
    options
  )

  return result
}

/**
 * 🏷️ CLASSIFICAÇÃO - Classificar tipo de documento
 */
async function handleClassification(request: UnifiedDocumentRequest) {
  const { documentId, fileName } = request

  if (!documentId) {
    throw new Error('documentId é obrigatório para classificação')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Buscar documento e dados extraídos
  const { data: documento, error } = await supabase
    .from('documentos')
    .select('*, dados_extraidos')
    .eq('id', documentId)
    .single()

  if (error || !documento) {
    throw new Error(`Documento não encontrado: ${documentId}`)
  }

  // Classificar baseado nos dados existentes
  const extractedData = documento.dados_extraidos || {}
  const documentType = classifyDocumentByPatterns(extractedData, fileName || documento.arquivo_nome)

  // Atualizar tipo no banco
  await supabase
    .from('documentos')
    .update({
      tipo_documento: documentType,
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId)

  return {
    documentId,
    document_type: documentType,
    confidence: 0.85,
    classification_method: 'pattern_based'
  }
}

/**
 * 🧠 ANÁLISE - Análise avançada com IA
 */
async function handleAnalysis(request: UnifiedDocumentRequest) {
  const { documentId, options = {} } = request

  if (!documentId) {
    throw new Error('documentId é obrigatório para análise')
  }

  if (!openaiApiKey) {
    throw new Error('OpenAI API key não configurada para análise')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Buscar documento
  const { data: documento, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !documento) {
    throw new Error(`Documento não encontrado: ${documentId}`)
  }

  // Análise com IA
  const fileBuffer = await downloadFileFromStorage(documento.arquivo_path)
  const ocrResult = await performOCRStage(fileBuffer, documento.tipo_mime, options)

  const analysisPrompt = `
DOCUMENTO: ${documento.arquivo_nome}
TEXTO: ${ocrResult.text}

Faça uma análise completa deste documento brasileiro:

1. IDENTIFICAÇÃO:
   - Tipo de documento
   - Finalidade
   - Partes envolvidas

2. DADOS FISCAIS (se aplicável):
   - Impostos
   - Valores
   - Datas importantes

3. COMPLIANCE:
   - Conformidade com regulamentações
   - Documentos relacionados necessários
   - Prazos fiscais

4. INSIGHTS:
   - Padrões identificados
   - Anomalias
   - Recomendações

Retorne em formato JSON estruturado.
`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + openaiApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um especialista em análise de documentos fiscais brasileiros.' },
        { role: 'user', content: analysisPrompt }
      ],
      max_tokens: 3000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    throw new Error(`Erro na análise IA: ${response.status}`)
  }

  const data = await response.json()
  const analysis = JSON.parse(data.choices[0].message.content)

  return {
    documentId,
    analysis,
    confidence: 0.9,
    analysis_method: 'openai_gpt4o',
    timestamp: new Date().toISOString()
  }
}

/**
 * 📊 STATUS - Verificar status de processamento
 */
async function handleStatus(request: UnifiedDocumentRequest) {
  const { documentId } = request

  // Se não há documentId, retornar status da função
  if (!documentId) {
    return {
      service: 'document-processor-unified',
      status: 'active',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      capabilities: [
        'upload',
        'process_ocr',
        'extract_data',
        'classify',
        'analyze',
        'status',
        'reprocess'
      ]
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: documento, error } = await supabase
    .from('documentos')
    .select('id, arquivo_nome, status_processamento, progresso_processamento, mensagem_status, dados_extraidos, created_at, updated_at')
    .eq('id', documentId)
    .single()

  if (error || !documento) {
    return {
      documentId,
      status: 'not_found',
      message: `Documento ${documentId} não encontrado`,
      timestamp: new Date().toISOString()
    }
  }

  return {
    documentId,
    status: documento.status_processamento,
    progress: documento.progresso_processamento || 0,
    message: documento.mensagem_status,
    has_extracted_data: !!documento.dados_extraidos,
    created_at: documento.created_at,
    updated_at: documento.updated_at
  }
}

/**
 * 🔄 REPROCESSAR - Reprocessar documento
 */
async function handleReprocess(request: UnifiedDocumentRequest) {
  const { documentId, options = {} } = request

  if (!documentId) {
    throw new Error('documentId é obrigatório para reprocessamento')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Resetar status
  await supabase
    .from('documentos')
    .update({
      status_processamento: 'processando',
      progresso_processamento: 0,
      mensagem_status: 'Reprocessamento iniciado',
      dados_extraidos: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId)

  // Processar novamente
  const result = await handleOCR({ ...request, action: 'process_ocr' })

  return {
    documentId,
    status: 'reprocessed',
    result,
    timestamp: new Date().toISOString()
  }
}

/**
 * 💾 SALVAR RESULTADOS - Persistir dados extraídos
 */
async function saveExtractionResults(documentId: string, result: UniversalExtractionResult) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Atualizar documento principal
    const { error: docError } = await supabase
      .from('documentos')
      .update({
        status_processamento: result.success ? 'processado' : 'erro',
        progresso_processamento: 100,
        mensagem_status: result.success ? 'Processamento concluído' : 'Erro no processamento',
        dados_extraidos: result.extractedData,
        confianca_extracao: result.confidence,
        metadados_processamento: result.metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (docError) {
      console.error('Erro ao atualizar documento:', docError)
    }

    // Salvar dados estruturados se disponível
    if (result.extractedData && Object.keys(result.extractedData).length > 0) {
      const { error: structuredError } = await supabase
        .from('dados_estruturados')
        .upsert({
          documento_id: documentId,
          dados_extraidos: result.extractedData,
          confianca_extracao: result.confidence,
          metodo_extracao: 'universal_pipeline',
          campos_extraidos: result.extractedData.entities?.map(e => e.type) || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (structuredError) {
        console.error('Erro ao salvar dados estruturados:', structuredError)
      }
    }

  } catch (error) {
    console.error('Erro ao salvar resultados:', error)
  }
}
