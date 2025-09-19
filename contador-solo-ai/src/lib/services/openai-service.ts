/**
 * 🤖 SERVIÇO SEGURO OPENAI
 * ContabilidadePRO - Wrapper seguro para chamadas OpenAI
 * 
 * CARACTERÍSTICAS:
 * - Execução apenas server-side
 * - Rate limiting automático
 * - Fallback gracioso
 * - Logs estruturados
 * - Validação de entrada/saída
 */

import { openAIConfig } from '@/lib/openai'

// Tipos para as chamadas OpenAI
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIRequest {
  messages: OpenAIMessage[]
  model?: string
  temperature?: number
  max_tokens?: number
  timeout?: number
}

export interface OpenAIResponse {
  success: boolean
  content?: string
  error?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  model?: string
  processing_time?: number
}

// Configurações padrão
const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini', // Modelo mais econômico
  temperature: 0.3,     // Determinístico para contabilidade
  max_tokens: 800,      // Resposta concisa
  timeout: 25000        // 25 segundos
}

// Rate limiting simples (em memória)
const rateLimiter = {
  requests: new Map<string, number[]>(),
  maxRequests: 50,      // 50 requests por minuto
  windowMs: 60 * 1000   // 1 minuto
}

/**
 * Verifica rate limiting
 */
function checkRateLimit(identifier: string = 'default'): boolean {
  const now = Date.now()
  const requests = rateLimiter.requests.get(identifier) || []
  
  // Remove requests antigas
  const validRequests = requests.filter(time => now - time < rateLimiter.windowMs)
  
  if (validRequests.length >= rateLimiter.maxRequests) {
    return false // Rate limit atingido
  }
  
  // Adiciona request atual
  validRequests.push(now)
  rateLimiter.requests.set(identifier, validRequests)
  
  return true
}

/**
 * Chama OpenAI de forma segura (apenas server-side)
 */
export async function callOpenAI(request: OpenAIRequest, identifier?: string): Promise<OpenAIResponse> {
  const startTime = Date.now()
  
  try {
    // ⚠️ SEGURANÇA: Verificar se está no servidor
    if (typeof window !== 'undefined') {
      throw new Error('🚨 ERRO DE SEGURANÇA: callOpenAI() executado no cliente!')
    }

    // Verificar se OpenAI está configurado
    if (!openAIConfig.isConfigured) {
      return {
        success: false,
        error: 'OpenAI não configurado. Configure OPENAI_API_KEY no .env.local'
      }
    }

    // Verificar rate limiting
    if (!checkRateLimit(identifier)) {
      return {
        success: false,
        error: 'Rate limit atingido. Tente novamente em alguns segundos.'
      }
    }

    // Validar entrada
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages são obrigatórias')
    }

    // Obter chave de forma segura
    const apiKey = openAIConfig.getApiKey()
    if (!apiKey) {
      throw new Error('Chave OpenAI não disponível')
    }

    // Preparar request
    const config = { ...DEFAULT_CONFIG, ...request }
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout na chamada OpenAI')), config.timeout)
    })

    // Fazer chamada para OpenAI
    const openaiPromise = fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: config.messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens
      })
    })

    const response = await Promise.race([openaiPromise, timeoutPromise])

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('Resposta vazia da OpenAI')
    }

    const processingTime = Date.now() - startTime

    // Log de sucesso
    console.log(`✅ OpenAI call successful (${processingTime}ms)`, {
      model: config.model,
      tokens: data.usage?.total_tokens || 0,
      identifier
    })

    return {
      success: true,
      content,
      usage: data.usage,
      model: data.model,
      processing_time: processingTime
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    // Log de erro
    console.error(`❌ OpenAI call failed (${processingTime}ms):`, {
      error: errorMessage,
      identifier,
      request: {
        model: request.model,
        messages_count: request.messages?.length || 0
      }
    })

    return {
      success: false,
      error: errorMessage,
      processing_time: processingTime
    }
  }
}

/**
 * Helper para criar mensagens do sistema para contabilidade
 */
export function createAccountingSystemMessage(context?: string): OpenAIMessage {
  const basePrompt = `Você é um ASSISTENTE CONTÁBIL ESPECIALIZADO EM CONTABILIDADE BRASILEIRA.

SUAS RESPONSABILIDADES:
- Fornecer orientações precisas sobre legislação fiscal brasileira
- Calcular impostos e tributos conforme tabelas vigentes
- Classificar documentos fiscais corretamente
- Sugerir otimizações tributárias legais
- Alertar sobre prazos e obrigações fiscais

DIRETRIZES:
- Sempre cite a base legal das suas orientações
- Use linguagem técnica mas acessível
- Seja preciso com valores e datas
- Indique quando é necessário consultar um contador
- Mantenha-se atualizado com a legislação de 2024/2025`

  const contextPrompt = context ? `\n\nCONTEXTO ADICIONAL:\n${context}` : ''

  return {
    role: 'system',
    content: basePrompt + contextPrompt
  }
}

/**
 * Helper para análise de documentos fiscais
 */
export async function analyzeDocument(
  documentText: string, 
  documentType?: string,
  identifier?: string
): Promise<OpenAIResponse> {
  const systemMessage = createAccountingSystemMessage(
    `Analise o documento fiscal fornecido e extraia informações relevantes como:
    - Tipo de documento
    - Valores e impostos
    - Datas importantes
    - Classificação contábil sugerida
    - Alertas ou observações importantes`
  )

  const userMessage: OpenAIMessage = {
    role: 'user',
    content: `Analise este documento fiscal:\n\n${documentText.substring(0, 3000)}${documentText.length > 3000 ? '...' : ''}`
  }

  return callOpenAI({
    messages: [systemMessage, userMessage],
    model: 'gpt-4o-mini',
    temperature: 0.1, // Mais determinístico para análise
    max_tokens: 1000
  }, identifier)
}

/**
 * Helper para chat contábil
 */
export async function chatContabil(
  question: string,
  context?: string,
  identifier?: string
): Promise<OpenAIResponse> {
  const systemMessage = createAccountingSystemMessage(context)
  
  const userMessage: OpenAIMessage = {
    role: 'user',
    content: question
  }

  return callOpenAI({
    messages: [systemMessage, userMessage]
  }, identifier)
}
