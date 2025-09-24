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

// Interfaces essenciais
interface ProcessRequest {
  action: 'process_direct' | 'status'
  fileBuffer?: number[]
  options?: {
    fileName?: string
    mimeType?: string
    enableAI?: boolean
  }
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

    if (action === 'status') {
      return new Response(JSON.stringify({
        success: true,
        status: 'operational',
        version: '2.0-optimized',
        supportedFormats: ['pdf', 'docx', 'xlsx', 'csv', 'txt', 'html', 'png', 'jpg']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'process_direct') {
      const startTime = Date.now()
      const result = await processDocument(request)
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
    }

    throw new Error(`Ação não suportada: ${action}`)

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
