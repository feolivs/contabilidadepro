/**
 * 🛠️ UTILS - Funções auxiliares para processamento de documentos
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

/**
 * 📥 Download de arquivo do Supabase Storage
 */
export async function downloadFileFromStorage(filePath: string): Promise<Uint8Array> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const { data, error } = await supabase.storage
    .from('documentos')
    .download(filePath)

  if (error) {
    throw new Error(`Erro ao baixar arquivo: ${error.message}`)
  }

  return new Uint8Array(await data.arrayBuffer())
}

/**
 * 🔍 Processamento com OpenAI Vision
 */
export async function processWithOpenAIVision(
  fileBuffer: Uint8Array, 
  mimeType: string
): Promise<{ text: string, confidence: number }> {
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key não configurada')
  }

  // Converter para base64
  const base64 = btoa(String.fromCharCode(...fileBuffer))

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extraia TODO o texto deste documento brasileiro. Seja extremamente detalhado e preciso. Inclua todos os números, datas, valores, nomes, endereços e qualquer informação visível.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices[0].message.content

  // Calcular confiança baseada no comprimento e estrutura do texto
  const confidence = calculateTextConfidence(text)

  return { text, confidence }
}

/**
 * 🔍 Processamento com Google Vision (fallback)
 */
export async function processWithGoogleVision(
  fileBuffer: Uint8Array
): Promise<{ text: string, confidence: number }> {
  
  const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY')
  
  if (!googleApiKey) {
    throw new Error('Google Vision API key não configurada')
  }

  const base64 = btoa(String.fromCharCode(...fileBuffer))

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 1 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    throw new Error(`Google Vision API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.responses[0]?.fullTextAnnotation?.text || ''
  const confidence = data.responses[0]?.fullTextAnnotation?.pages?.[0]?.confidence || 0.8

  return { text, confidence }
}

/**
 * 📝 Criar prompt universal para extração com IA
 */
export function createUniversalExtractionPrompt(
  text: string, 
  fileName: string, 
  regexResult: any
): string {
  return `
DOCUMENTO: ${fileName}
TEXTO EXTRAÍDO: ${text.substring(0, 3000)}...

PADRÕES JÁ IDENTIFICADOS: ${JSON.stringify(regexResult.patterns_found)}

INSTRUÇÕES:
Analise este documento brasileiro e extraia TODAS as informações possíveis. Retorne um JSON com:

{
  "entities": [
    {
      "type": "person|company|product|service|location|other",
      "value": "valor extraído",
      "confidence": 0.0-1.0,
      "context": "contexto onde foi encontrado",
      "position": {"start": 0, "end": 10}
    }
  ],
  "structured_data": {
    "document_type": "NFe|NFCe|Recibo|Contrato|Boleto|Outros",
    "fiscal_data": {
      "numero": "string",
      "serie": "string", 
      "valor_total": number,
      "data_emissao": "YYYY-MM-DD",
      "cnpj_emitente": "string",
      "razao_social": "string"
    },
    "financial_summary": {
      "total_amount": number,
      "currency": "BRL",
      "payment_terms": "string"
    }
  },
  "additional_fields": {
    "campo_personalizado": "valor"
  },
  "relationships": [
    {
      "from_entity": "entidade origem",
      "to_entity": "entidade destino", 
      "relationship_type": "tipo de relação",
      "confidence": 0.0-1.0
    }
  ],
  "insights": [
    "insight 1",
    "insight 2"
  ],
  "confidence": 0.0-1.0
}

SEJA EXTREMAMENTE DETALHADO. Extraia até mesmo informações que parecem irrelevantes.
`
}

/**
 * 📊 Calcular confiança do texto extraído
 */
export function calculateTextConfidence(text: string): number {
  if (!text || text.length < 10) return 0.1

  let confidence = 0.5 // Base

  // Aumentar confiança baseado em indicadores
  if (text.length > 100) confidence += 0.1
  if (text.length > 500) confidence += 0.1
  if (/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/.test(text)) confidence += 0.1 // CNPJ
  if (/R\$\s*\d+/.test(text)) confidence += 0.1 // Valores
  if (/\d{2}\/\d{2}\/\d{4}/.test(text)) confidence += 0.1 // Datas
  if (/nota fiscal|nfe|recibo|contrato/i.test(text)) confidence += 0.1 // Palavras-chave

  return Math.min(0.95, confidence)
}

/**
 * 🔍 Calcular confiança de padrão regex
 */
export function calculatePatternConfidence(patternName: string, value: string): number {
  const confidenceMap: Record<string, number> = {
    cnpj: 0.95,
    cpf: 0.95,
    chave_acesso_nfe: 0.98,
    emails: 0.90,
    telefones: 0.85,
    ceps: 0.90,
    valores: 0.80,
    datas: 0.85,
    urls: 0.95,
    numero_nf: 0.90,
    serie_nf: 0.90,
    codigos: 0.75
  }

  return confidenceMap[patternName] || 0.70
}

/**
 * 📋 Classificar documento baseado em padrões
 */
export function classifyDocumentByPatterns(extractedData: Record<string, any[]>, fileName: string): string {
  const name = fileName.toLowerCase()

  // Classificação por nome do arquivo
  if (name.includes('nfe') || name.includes('nota fiscal eletronica')) return 'NFE'
  if (name.includes('nfce') || name.includes('cupom fiscal')) return 'NFCE'
  if (name.includes('nfse') || name.includes('nota fiscal servico')) return 'NFSE'
  if (name.includes('recibo')) return 'RECIBO'
  if (name.includes('contrato')) return 'CONTRATO'
  if (name.includes('boleto')) return 'BOLETO'

  // Classificação por padrões encontrados
  if (extractedData.chave_acesso_nfe?.length > 0) return 'NFE'
  if (extractedData.numero_nf?.length > 0 && extractedData.serie_nf?.length > 0) return 'NFE'
  if (extractedData.cnpj?.length > 0 && extractedData.valores?.length > 0) return 'DOCUMENTO_FISCAL'

  return 'OUTROS'
}

/**
 * ✅ Validar CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '')
  
  if (cnpj.length !== 14) return false
  if (/^(\d)\1+$/.test(cnpj)) return false

  // Algoritmo de validação do CNPJ
  let soma = 0
  let peso = 2

  for (let i = 11; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso
    peso = peso === 9 ? 2 : peso + 1
  }

  const digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (parseInt(cnpj.charAt(12)) !== digito1) return false

  soma = 0
  peso = 2

  for (let i = 12; i >= 0; i--) {
    soma += parseInt(cnpj.charAt(i)) * peso
    peso = peso === 9 ? 2 : peso + 1
  }

  const digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  return parseInt(cnpj.charAt(13)) === digito2
}

/**
 * ✅ Validar CPF
 */
export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '')
  
  if (cpf.length !== 11) return false
  if (/^(\d)\1+$/.test(cpf)) return false

  // Algoritmo de validação do CPF
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i)
  }

  const digito1 = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (parseInt(cpf.charAt(9)) !== digito1) return false

  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i)
  }

  const digito2 = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  return parseInt(cpf.charAt(10)) === digito2
}

/**
 * 📅 Validar data
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * 📅 Normalizar data para formato ISO
 */
export function normalizeDate(dateString: string): string {
  // Tentar diferentes formatos
  const formats = [
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ]

  for (const format of formats) {
    const match = dateString.match(format)
    if (match) {
      if (format === formats[0] || format === formats[2]) {
        // DD/MM/YYYY ou DD-MM-YYYY
        return `${match[3]}-${match[2]}-${match[1]}`
      } else {
        // YYYY-MM-DD
        return dateString
      }
    }
  }

  return dateString // Retorna original se não conseguir normalizar
}

/**
 * 🎯 Mapear tipo regex para tipo de entidade
 */
export function mapRegexTypeToEntityType(regexType: string): 'person' | 'company' | 'product' | 'service' | 'location' | 'other' {
  const mapping: Record<string, 'person' | 'company' | 'product' | 'service' | 'location' | 'other'> = {
    cnpj: 'company',
    cpf: 'person',
    emails: 'other',
    telefones: 'other',
    ceps: 'location',
    valores: 'other',
    datas: 'other',
    urls: 'other'
  }

  return mapping[regexType] || 'other'
}

/**
 * 📊 Calcular score de validação
 */
export function calculateValidationScore(errors: string[], warnings: string[]): number {
  const errorPenalty = errors.length * 0.2
  const warningPenalty = warnings.length * 0.1
  
  return Math.max(0, 1 - errorPenalty - warningPenalty)
}

/**
 * 🔍 Obter MIME type do nome do arquivo
 */
export function getMimeTypeFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    txt: 'text/plain',
    csv: 'text/csv',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  return mimeTypes[extension || ''] || 'application/octet-stream'
}
