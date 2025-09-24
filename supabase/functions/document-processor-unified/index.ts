/**
 * 🚀 DOCUMENT PROCESSOR UNIFIED - ContabilidadePRO (OTIMIZADO)
 * Edge Function otimizada para processamento essencial de documentos contábeis brasileiros
 *
 * 📋 FORMATOS SUPORTADOS:
 * • PDF (.pdf) - Relatórios fiscais, DAS, INSS, Cartões CNPJ
 * • Excel (.xlsx) - Planos de contas, Cálculos de impostos
 * • Word (.docx) - Objeto social, Orientações contábeis
 * • CSV (.csv) - Dados tabulares
 * • Texto (.txt) - Chats RFB, Registros
 * • HTML (.html) - Consultas online
 * • Imagens (.png, .jpg) - Documentos digitalizados
 *
 * 🎯 FOCO: Extração eficiente de dados contábeis brasileiros
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

// Interfaces essenciais (compatibilidade com frontend)
interface ProcessRequest {
  action: 'process_direct' | 'process_ocr' | 'extract_data' | 'classify' | 'analyze' | 'status' | 'reprocess'
  documentId?: string
  filePath?: string
  fileName?: string
  fileBuffer?: number[]
  mimeType?: string
  options?: {
    fileName?: string
    mimeType?: string
    enableAI?: boolean
    language?: string
    quality?: 'low' | 'medium' | 'high'
    extractTables?: boolean
    enableCache?: boolean
    documentType?: string
    extractionMode?: 'basic' | 'advanced' | 'complete'
  }
}

// Estruturas de dados compatíveis com frontend
interface UniversalExtractionResult {
  success: boolean
  documentId: string
  processingStages: {
    ocr: { method: string, success: boolean }
    regex: { patterns_matched: number }
    ai: { enabled: boolean }
    validation: { is_valid: boolean }
  }
  extractedData: UniversalDocumentData
  metadata: ProcessingMetadata
  confidence: number
  processingTime: number
}

interface UniversalDocumentData {
  raw_text: string
  document_type: string
  confidence_score: number
  entities: ExtractedEntity[]
  financial_data: FinancialData[]
  dates: ExtractedDate[]
  contacts: ExtractedContact[]
  additional_fields: Record<string, any>
  relationships: DataRelationship[]
  insights: string[]
}

interface ExtractedEntity {
  type: 'person' | 'company' | 'product' | 'service' | 'location' | 'other'
  value: string
  confidence: number
  context: string
  position?: { start: number, end: number }
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

interface ExtractedContact {
  type: 'phone' | 'email' | 'website'
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

interface ProcessingMetadata {
  fileName: string
  mimeType?: string
  fileSize?: number
  extractionMode?: string
  timestamp: string
  providers_used: string[]
}

interface ProcessResult {
  success: boolean
  data?: {
    extractedData: {
      raw_text: string
      document_type: string
      entities: Record<string, any[]>
    }
    confidence: number
    processingTime: number
  }
  error?: string
}

// Cliente Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 🚀 HANDLER PRINCIPAL
 */
serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request: ProcessRequest = await req.json()
    const { action } = request

    console.log(`[UNIFIED_PROCESSOR] Processando ação: ${action}`)

    if (action === 'status') {
      return new Response(JSON.stringify({
        success: true,
        status: 'operational',
        version: '2.0-hybrid',
        supportedFormats: ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'html', 'png', 'jpg'],
        supportedActions: ['process_direct', 'process_ocr', 'extract_data', 'classify', 'analyze', 'status', 'reprocess']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const startTime = Date.now()
    let result: any

    // Mapear ações legadas para implementação otimizada
    switch (action) {
      case 'process_direct':
        result = await processDocument(request)
        break

      case 'process_ocr':
      case 'extract_data':
      case 'classify':
      case 'analyze':
        result = await processLegacyAction(request)
        break

      case 'reprocess':
        result = await handleReprocess(request)
        break

      default:
        throw new Error(`Ação não suportada: ${action}`)
    }

    const processingTime = Date.now() - startTime

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...result,
        processingTime
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/**
 * 📄 PROCESSADOR PRINCIPAL DE DOCUMENTOS
 */
async function processDocument(request: ProcessRequest) {
  const { fileBuffer, options } = request
  
  if (!fileBuffer || !options?.fileName) {
    throw new Error('fileBuffer e fileName são obrigatórios')
  }

  const buffer = new Uint8Array(fileBuffer)
  const fileName = options.fileName
  const mimeType = options.mimeType || getMimeType(fileName)

  // Extrair texto baseado no tipo
  let text = ''
  let metadata: any = {}

  if (mimeType.includes('text/csv') || fileName.endsWith('.csv')) {
    text = new TextDecoder().decode(buffer)
    metadata = { format: 'csv', rows: text.split('\n').length }
    
  } else if (mimeType.includes('text/plain') || fileName.endsWith('.txt')) {
    text = new TextDecoder().decode(buffer)
    metadata = { format: 'txt', length: text.length }
    
  } else if (mimeType.includes('text/html') || fileName.endsWith('.html')) {
    const htmlContent = new TextDecoder().decode(buffer)
    text = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    metadata = { format: 'html', originalLength: htmlContent.length }
    
  } else if (mimeType.includes('application/pdf') || fileName.endsWith('.pdf')) {
    text = await extractFromPDF(buffer)
    metadata = { format: 'pdf', method: 'ocr' }
    
  } else if (mimeType.includes('image/') || fileName.match(/\.(png|jpg|jpeg)$/i)) {
    text = await extractFromImage(buffer)
    metadata = { format: 'image', method: 'ocr' }
    
  } else if (fileName.endsWith('.docx')) {
    text = await extractFromDOCX(buffer)
    metadata = { format: 'docx', method: 'xml_parsing' }
    
  } else if (fileName.endsWith('.xlsx')) {
    text = await extractFromXLSX(buffer)
    metadata = { format: 'xlsx', method: 'xml_parsing' }
    
  } else {
    throw new Error(`Formato não suportado: ${mimeType}`)
  }

  // Extrair entidades contábeis brasileiras
  const entities = extractBrazilianAccountingEntities(text)
  
  // Classificar tipo de documento
  const documentType = classifyDocument(fileName, text, entities)
  
  // Calcular confiança
  const confidence = calculateConfidence(text, entities, documentType)

  return {
    extractedData: {
      raw_text: text,
      document_type: documentType,
      entities
    },
    confidence,
    processingStages: {
      ocr: { method: metadata.method || 'direct', success: true },
      regex: { patterns_matched: Object.keys(entities).length },
      ai: { enabled: options?.enableAI || false },
      validation: { is_valid: confidence > 0.5 }
    }
  }
}

/**
 * 🔍 EXTRAÇÃO DE ENTIDADES CONTÁBEIS BRASILEIRAS
 */
function extractBrazilianAccountingEntities(text: string): Record<string, any[]> {
  const patterns = {
    // Documentos fiscais essenciais
    cnpjs: /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g,
    cpfs: /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g,
    valores: /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,
    datas: /(\d{1,2}\/\d{1,2}\/\d{4})/g,
    
    // Códigos específicos
    das_codes: /(DAS[- ]?\d{4,})/gi,
    inss_codes: /(INSS[- ]?\d{4,})/gi,
    mei_codes: /(MEI[- ]?\d{4,})/gi,
    
    // Regimes tributários
    regimes: /(Simples Nacional|Lucro Presumido|Lucro Real|MEI)/gi,
    
    // Períodos de apuração
    periodos: /(Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s*\/?\s*\d{4}/gi
  }

  const entities: Record<string, any[]> = {}

  for (const [key, pattern] of Object.entries(patterns)) {
    const matches = Array.from(text.matchAll(pattern))
    if (matches.length > 0) {
      entities[key] = matches.map(match => ({
        value: match[1] || match[0],
        position: match.index,
        confidence: 0.9
      }))
    }
  }

  return entities
}

/**
 * 📊 CLASSIFICAÇÃO DE DOCUMENTOS
 */
function classifyDocument(fileName: string, text: string, entities: Record<string, any[]>): string {
  const name = fileName.toLowerCase()
  const content = text.toLowerCase()

  // Classificação por nome do arquivo
  if (name.includes('das')) return 'das_simples_nacional'
  if (name.includes('inss')) return 'inss_autonomo'
  if (name.includes('mei')) return 'mei_das'
  if (name.includes('cnpj')) return 'cartao_cnpj'
  if (name.includes('balanco')) return 'balanco_patrimonial'
  if (name.includes('dre')) return 'demonstrativo_resultado'
  if (name.includes('plano')) return 'plano_contas'

  // Classificação por conteúdo
  if (content.includes('simples nacional') && entities.das_codes?.length > 0) return 'das_simples_nacional'
  if (content.includes('inss') && entities.valores?.length > 0) return 'inss_autonomo'
  if (content.includes('mei') && entities.mei_codes?.length > 0) return 'mei_das'
  if (entities.cnpjs?.length > 0 && entities.valores?.length > 0) return 'documento_fiscal'
  if (content.includes('receita') && content.includes('despesa')) return 'demonstrativo_financeiro'

  // Classificação por formato
  if (fileName.endsWith('.xlsx')) return 'planilha_dados'
  if (fileName.endsWith('.pdf')) return 'documento_fiscal'
  
  return 'documento_textual'
}

/**
 * 📈 CÁLCULO DE CONFIANÇA
 */
function calculateConfidence(text: string, entities: Record<string, any[]>, documentType: string): number {
  let confidence = 0.3 // Base

  // Texto extraído
  if (text.length > 50) confidence += 0.2
  if (text.length > 200) confidence += 0.1

  // Entidades encontradas
  const entityCount = Object.values(entities).reduce((sum, arr) => sum + arr.length, 0)
  confidence += Math.min(entityCount * 0.1, 0.3)

  // Tipo de documento identificado
  if (documentType !== 'documento_textual') confidence += 0.1

  return Math.min(confidence, 1.0)
}

/**
 * 🔧 FUNÇÕES AUXILIARES
 */
function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    'txt': 'text/plain',
    'html': 'text/html',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg'
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}

/**
 * 📄 EXTRAÇÃO ESPECÍFICA POR FORMATO
 */
async function extractFromPDF(buffer: Uint8Array): Promise<string> {
  if (!openaiApiKey) return 'PDF: Texto não extraído (OpenAI não configurado)'
  
  try {
    const base64 = btoa(String.fromCharCode(...buffer))
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Extraia todo o texto deste documento PDF brasileiro.' },
            { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` }}
          ]
        }],
        max_tokens: 2000
      })
    })

    const result = await response.json()
    return result.choices?.[0]?.message?.content || 'Erro na extração PDF'
  } catch (error) {
    return `PDF: Erro na extração - ${error.message}`
  }
}

async function extractFromImage(buffer: Uint8Array): Promise<string> {
  if (!openaiApiKey) return 'Imagem: Texto não extraído (OpenAI não configurado)'
  
  try {
    const base64 = btoa(String.fromCharCode(...buffer))
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Extraia todo o texto visível nesta imagem de documento contábil brasileiro.' },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` }}
          ]
        }],
        max_tokens: 2000
      })
    })

    const result = await response.json()
    return result.choices?.[0]?.message?.content || 'Erro na extração de imagem'
  } catch (error) {
    return `Imagem: Erro na extração - ${error.message}`
  }
}

async function extractFromDOCX(buffer: Uint8Array): Promise<string> {
  // Extração básica - assumindo que é XML simples
  const content = new TextDecoder().decode(buffer)
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'DOCX: Conteúdo extraído'
}

async function extractFromXLSX(buffer: Uint8Array): Promise<string> {
  // Extração básica - assumindo que é XML simples
  const content = new TextDecoder().decode(buffer)
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'XLSX: Dados extraídos'
}

/**
 * 🔄 PROCESSAR AÇÕES LEGADAS
 * Mapeia ações antigas para implementação otimizada
 */
async function processLegacyAction(request: ProcessRequest): Promise<UniversalExtractionResult> {
  const { action, documentId, filePath, fileName, options } = request

  console.log(`[LEGACY_ACTION] Processando ${action} para documento ${documentId}`)

  let fileBuffer: number[]
  let actualFileName: string
  let actualMimeType: string

  // Se temos filePath, baixar do storage
  if (filePath && !request.fileBuffer) {
    console.log(`[LEGACY_ACTION] Baixando arquivo do storage: ${filePath}`)
    const downloadedBuffer = await downloadFileFromStorage(filePath)
    fileBuffer = Array.from(downloadedBuffer)
    actualFileName = fileName || filePath.split('/').pop() || 'unknown'
    actualMimeType = getMimeType(actualFileName)
  } else if (request.fileBuffer) {
    fileBuffer = request.fileBuffer
    actualFileName = fileName || options?.fileName || 'unknown'
    actualMimeType = request.mimeType || options?.mimeType || getMimeType(actualFileName)
  } else {
    throw new Error('fileBuffer ou filePath é obrigatório')
  }

  // Processar com implementação otimizada
  const simpleResult = await processDocument({
    action: 'process_direct',
    fileBuffer,
    options: {
      fileName: actualFileName,
      mimeType: actualMimeType,
      enableAI: options?.enableAI !== false
    }
  })

  // Converter para formato universal esperado pelo frontend
  return adaptToUniversalFormat(simpleResult, documentId, actualFileName, actualMimeType)
}

/**
 * 🔄 REPROCESSAR DOCUMENTO
 */
async function handleReprocess(request: ProcessRequest): Promise<UniversalExtractionResult> {
  const { documentId, options } = request

  if (!documentId) {
    throw new Error('documentId é obrigatório para reprocessamento')
  }

  console.log(`[REPROCESS] Reprocessando documento ${documentId}`)

  // Buscar informações do documento no banco
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: documento, error } = await supabase
    .from('documentos')
    .select('arquivo_path, arquivo_nome, arquivo_tipo')
    .eq('id', documentId)
    .single()

  if (error || !documento) {
    throw new Error(`Documento ${documentId} não encontrado`)
  }

  // Processar como ação legada
  return processLegacyAction({
    action: 'process_ocr',
    documentId,
    filePath: documento.arquivo_path,
    fileName: documento.arquivo_nome,
    mimeType: documento.arquivo_tipo,
    options: {
      extractionMode: 'complete',
      enableAI: true,
      ...options
    }
  })
}

/**
 * 📥 BAIXAR ARQUIVO DO STORAGE
 */
async function downloadFileFromStorage(filePath: string): Promise<Uint8Array> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log(`[STORAGE] Baixando arquivo: ${filePath}`)

  const { data, error } = await supabase.storage
    .from('documentos')
    .download(filePath)

  if (error) {
    throw new Error(`Erro ao baixar arquivo: ${error.message}`)
  }

  return new Uint8Array(await data.arrayBuffer())
}

/**
 * 🔄 ADAPTER PARA FORMATO UNIVERSAL
 * Converte estrutura simples para estrutura complexa esperada pelo frontend
 */
function adaptToUniversalFormat(
  simpleResult: any,
  documentId?: string,
  fileName?: string,
  mimeType?: string
): UniversalExtractionResult {
  console.log('[ADAPTER] Convertendo para formato universal')

  const entities: ExtractedEntity[] = []
  const financialData: FinancialData[] = []
  const dates: ExtractedDate[] = []
  const contacts: ExtractedContact[] = []

  // Converter entidades do formato simples para universal
  if (simpleResult.extractedData?.entities) {
    for (const [entityType, entityList] of Object.entries(simpleResult.extractedData.entities)) {
      if (Array.isArray(entityList)) {
        for (const entity of entityList) {
          entities.push({
            type: mapEntityType(entityType),
            value: entity.value || entity,
            confidence: entity.confidence || 0.9,
            context: `Extraído via ${entityType}`,
            position: entity.position
          })

          // Converter valores para dados financeiros
          if (entityType === 'valores' && typeof entity.value === 'number') {
            financialData.push({
              type: 'other',
              value: entity.value,
              currency: 'BRL',
              description: 'Valor detectado',
              confidence: entity.confidence || 0.9
            })
          }

          // Converter datas
          if (entityType === 'datas') {
            dates.push({
              type: 'other',
              date: entity.value || entity,
              confidence: entity.confidence || 0.9,
              context: 'Data detectada'
            })
          }

          // Converter contatos
          if (entityType === 'emails' || entityType === 'telefones') {
            contacts.push({
              type: entityType === 'emails' ? 'email' : 'phone',
              value: entity.value || entity,
              confidence: entity.confidence || 0.9,
              context: 'Contato detectado'
            })
          }
        }
      }
    }
  }

  return {
    success: true,
    documentId: documentId || 'generated-' + Date.now(),
    processingStages: {
      ocr: {
        method: 'hybrid-optimized',
        success: true
      },
      regex: {
        patterns_matched: Object.keys(simpleResult.extractedData?.entities || {}).length
      },
      ai: {
        enabled: true
      },
      validation: {
        is_valid: (simpleResult.confidence || 0) > 0.5
      }
    },
    extractedData: {
      raw_text: simpleResult.extractedData?.raw_text || '',
      document_type: simpleResult.extractedData?.document_type || 'unknown',
      confidence_score: simpleResult.confidence || 0,
      entities,
      financial_data: financialData,
      dates,
      contacts,
      additional_fields: {},
      relationships: [],
      insights: [`Documento processado com confiança de ${Math.round((simpleResult.confidence || 0) * 100)}%`]
    },
    metadata: {
      fileName: fileName || 'unknown',
      mimeType,
      timestamp: new Date().toISOString(),
      providers_used: ['hybrid-processor']
    },
    confidence: simpleResult.confidence || 0,
    processingTime: simpleResult.processingTime || 0
  }
}

/**
 * 🎯 MAPEAR TIPO DE ENTIDADE
 */
function mapEntityType(entityType: string): 'person' | 'company' | 'product' | 'service' | 'location' | 'other' {
  const mapping: Record<string, 'person' | 'company' | 'product' | 'service' | 'location' | 'other'> = {
    cnpjs: 'company',
    cpfs: 'person',
    emails: 'other',
    telefones: 'other',
    ceps: 'location',
    valores: 'other',
    datas: 'other',
    urls: 'other',
    regimes: 'other',
    das_codes: 'other'
  }

  return mapping[entityType] || 'other'
}

// Handler já definido acima com serve()
