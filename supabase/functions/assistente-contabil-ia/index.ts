/**
 * 🤖 ASSISTENTE CONTÁBIL IA - Versão Simplificada e Otimizada
 * ContabilidadePRO - Chat IA especializado em contabilidade brasileira
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { intelligentCache } from '../_shared/unified-cache-adapter.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuração OpenAI
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// Configuração Supabase para Cache
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Configurações de Performance
const PERFORMANCE_CONFIG = {
  OPENAI_TIMEOUT: 25000, // 25 segundos
  CACHE_TIMEOUT: 5000,   // 5 segundos
  MAX_RETRIES: 2,        // Máximo de tentativas
  RETRY_DELAY: 1000,     // Delay entre tentativas (ms)
  MAX_TOKENS: 2000,      // Limite de tokens
  TEMPERATURE: 0.7       // Temperatura OpenAI
}

// Usar cache unificado (compatibilidade mantida)
const cache = intelligentCache

// Inicializar cliente Supabase para métricas
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/**
 * 🔄 RETRY: Função com retry automático
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = PERFORMANCE_CONFIG.MAX_RETRIES,
  delay: number = PERFORMANCE_CONFIG.RETRY_DELAY
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      console.warn(`Tentativa ${attempt + 1}/${maxRetries + 1} falhou:`, error.message)

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
      }
    }
  }

  throw lastError!
}

/**
 * ⏱️ TIMEOUT: Função com timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operação expirou'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

/**
 * 📊 PERFORMANCE: Logger de performance com métricas
 */
class PerformanceLogger {
  private startTime: number
  private operation: string
  private metrics: any = {}

  constructor(operation: string) {
    this.operation = operation
    this.startTime = performance.now()
    this.metrics.startTime = new Date().toISOString()
    console.log(`🚀 Iniciando: ${operation}`)
  }

  log(step: string, data?: any) {
    const elapsed = Math.round(performance.now() - this.startTime)
    console.log(`⏱️ ${this.operation} - ${step} (${elapsed}ms)`, data ? JSON.stringify(data) : '')

    // Armazenar métricas específicas
    if (step === 'Cache verificado') {
      this.metrics.cacheHit = data?.hit || false
      this.metrics.cacheLookupTime = elapsed
    } else if (step === 'OpenAI resposta recebida') {
      this.metrics.openaiTime = elapsed - (this.metrics.cacheLookupTime || 0)
    }
  }

  finish(success: boolean = true, data?: any) {
    const elapsed = Math.round(performance.now() - this.startTime)
    const status = success ? '✅' : '❌'
    console.log(`${status} ${this.operation} finalizado (${elapsed}ms)`, data ? JSON.stringify(data) : '')

    this.metrics.totalTime = elapsed
    this.metrics.success = success
    this.metrics.cached = data?.cached || false
    this.metrics.streaming = data?.streaming || false
    this.metrics.responseLength = data?.responseLength || 0

    return { elapsed, metrics: this.metrics }
  }
}

/**
 * 📈 METRICS: Função para salvar métricas
 */
async function saveMetrics(
  userId: string,
  sessionId: string,
  queryText: string,
  queryType: string,
  performanceData: any,
  req: Request,
  error?: Error
) {
  try {
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || '0.0.0.0'

    await supabase.rpc('log_ai_metric', {
      p_user_id: userId,
      p_session_id: sessionId,
      p_query_text: queryText.substring(0, 500), // Limitar tamanho
      p_query_type: queryType,
      p_total_time_ms: performanceData.totalTime,
      p_cache_hit: performanceData.cached,
      p_cache_lookup_time_ms: performanceData.cacheLookupTime || null,
      p_openai_time_ms: performanceData.openaiTime || null,
      p_streaming: performanceData.streaming,
      p_response_length: performanceData.responseLength || null,
      p_response_cached: performanceData.cached,
      p_error_occurred: !!error,
      p_error_type: error?.name || null,
      p_error_message: error?.message?.substring(0, 500) || null,
      p_user_agent: userAgent.substring(0, 500),
      p_ip_address: ipAddress
    })

    console.log('📊 Métricas salvas com sucesso')
  } catch (metricsError) {
    console.warn('Erro ao salvar métricas:', metricsError)
    // Não falhar a requisição por erro de métricas
  }
}

/**
 * 🌊 STREAMING: Resposta em cache via Server-Sent Events
 */
function streamCachedResponse(resposta: string): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Enviar resposta em chunks para simular streaming
      const words = resposta.split(' ')
      let currentChunk = ''

      const sendChunk = (index: number) => {
        if (index >= words.length) {
          // Finalizar stream
          controller.enqueue(encoder.encode(`data: {"type":"done","cached":true}\n\n`))
          controller.close()
          return
        }

        currentChunk += (currentChunk ? ' ' : '') + words[index]

        // Enviar chunk a cada 3-5 palavras
        if ((index + 1) % 4 === 0 || index === words.length - 1) {
          const chunk = {
            type: 'chunk',
            content: currentChunk,
            cached: true
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          currentChunk = ''
        }

        // Próximo chunk com delay mínimo (cache é rápido)
        setTimeout(() => sendChunk(index + 1), 50)
      }

      // Iniciar streaming
      controller.enqueue(encoder.encode(`data: {"type":"start","cached":true}\n\n`))
      sendChunk(0)
    }
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

/**
 * 🌊 STREAMING: Resposta OpenAI via Server-Sent Events
 */
async function streamOpenAIResponse(pergunta: string, userId: string): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Preparar mensagens
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: pergunta }
        ]

        // Fazer chamada streaming para OpenAI
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: true
          })
        })

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`)
        }

        // Iniciar streaming
        controller.enqueue(encoder.encode(`data: {"type":"start","cached":false}\n\n`))

        let fullResponse = ''
        const reader = response.body?.getReader()

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content

                  if (content) {
                    fullResponse += content
                    const streamChunk = {
                      type: 'chunk',
                      content: content,
                      cached: false
                    }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(streamChunk)}\n\n`))
                  }
                } catch (e) {
                  // Ignorar chunks malformados
                }
              }
            }
          }
        }

        // Salvar no cache
        if (fullResponse) {
          const responseData = {
            success: true,
            resposta: fullResponse,
            cached: false,
            timestamp: new Date().toISOString()
          }

          cache.set(pergunta, userId, responseData).catch(err =>
            console.warn('Erro ao salvar no cache:', err)
          )
        }

        // Finalizar stream
        controller.enqueue(encoder.encode(`data: {"type":"done","cached":false}\n\n`))
        controller.close()

      } catch (error) {
        console.error('Erro no streaming:', error)
        const errorChunk = {
          type: 'error',
          message: 'Erro ao processar resposta'
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

// Validar chave OpenAI
function validateOpenAIKey(): boolean {
  if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não configurada')
    return false
  }

  if (!OPENAI_API_KEY.startsWith('sk-')) {
    console.error('❌ OPENAI_API_KEY inválida - deve começar com "sk-"')
    return false
  }

  console.log('✅ OpenAI configurado e validado')
  return true
}

const OPENAI_CONFIGURED = validateOpenAIKey()

// Sistema de prompts contextuais será criado dinamicamente
let SYSTEM_PROMPT = `Você é um assistente contábil especializado em contabilidade brasileira.

CONHECIMENTOS BASE:
- Simples Nacional, Lucro Presumido, Lucro Real, MEI
- DAS, DARF, GPS, obrigações fiscais
- Prazos, alíquotas, cálculos tributários
- Legislação brasileira atual

INSTRUÇÕES:
- Seja preciso e objetivo
- Use linguagem técnica mas acessível
- Cite sempre a base legal quando relevante
- Se não souber algo, seja honesto
- Mantenha respostas concisas mas informativas

Responda sempre em português brasileiro.`

// =====================================================
// SISTEMA DE CONTEXTO INTELIGENTE
// =====================================================

/**
 * 🔍 Analisar pergunta para determinar contexto necessário
 */
function analyzeQuestionContext(pergunta: string, empresa_id?: string): {
  needsEmpresaContext: boolean
  needsDocumentosContext: boolean
  needsFiscalCalculation: boolean
  contextLevel: 'basic' | 'medium' | 'detailed'
  suggestedActions: string[]
} {
  const question = pergunta.toLowerCase()

  // Detectar necessidade de contexto de empresa (MELHORADO)
  const empresaIndicators = [
    /minha empresa/i, /esta empresa/i, /essa empresa/i, /empresa.*atual/i,
    /regime.*tributario/i, /das.*empresa/i, /faturamento/i,
    /situação.*fiscal/i, /obrigações.*empresa/i,
    /como.*est[aá].*empresa/i, /status.*empresa/i, /dados.*empresa/i,
    /informaç[oõ]es.*empresa/i, /da.*empresa/i, /desta.*empresa/i,
    /dessa.*empresa/i, /na.*empresa/i
  ]
  const needsEmpresaContext = empresaIndicators.some(pattern => pattern.test(question)) || !!empresa_id

  // Detectar necessidade de contexto de documentos (MELHORADO)
  const documentosIndicators = [
    /documentos/i, /nfe/i, /nota.*fiscal/i, /recibos/i,
    /upload/i, /processamento/i, /ocr/i, /extrair/i,
    /último.*documento/i, /últimos.*documentos/i, /documento.*recente/i,
    /pendentes/i, /processados/i, /documento.*empresa/i,
    /anexos/i, /arquivos/i, /da.*empresa/i
  ]
  const needsDocumentosContext = documentosIndicators.some(pattern => pattern.test(question)) ||
    (!!empresa_id && (/documento/i.test(question) || /arquivo/i.test(question)))

  // Detectar necessidade de cálculos fiscais
  const calculoIndicators = [
    /calcul/i, /das/i, /imposto/i, /aliquota/i,
    /simular/i, /quanto.*pagar/i, /valor.*das/i
  ]
  const needsFiscalCalculation = calculoIndicators.some(pattern => pattern.test(question))

  // Determinar nível de contexto
  let contextLevel: 'basic' | 'medium' | 'detailed' = 'basic'
  if (needsEmpresaContext || needsDocumentosContext) contextLevel = 'medium'
  if (needsEmpresaContext && needsDocumentosContext) contextLevel = 'detailed'

  // Sugerir ações
  const suggestedActions = []
  if (needsEmpresaContext) suggestedActions.push('empresa_context')
  if (needsDocumentosContext) suggestedActions.push('documentos_context')
  if (needsFiscalCalculation) suggestedActions.push('fiscal_calculation')

  return {
    needsEmpresaContext,
    needsDocumentosContext,
    needsFiscalCalculation,
    contextLevel,
    suggestedActions
  }
}

/**
 * 🏢 Buscar contexto da empresa
 */
async function fetchEmpresaContext(empresaId: string, userId: string): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/empresa-context-service`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        empresa_id: empresaId,
        user_id: userId,
        include_financial: true,
        include_documents: false, // Separado para otimizar
        include_obligations: true,
        period_months: 12
      })
    })

    if (!response.ok) {
      console.warn('Erro ao buscar contexto da empresa:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.warn('Erro ao conectar com empresa-context-service:', error)
    return null
  }
}

/**
 * 📄 Buscar contexto de documentos
 */
async function fetchDocumentosContext(empresaId: string | undefined, userId: string): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/documentos-context-service`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        empresa_id: empresaId,
        user_id: userId,
        period_days: 30,
        include_analysis: true,
        include_patterns: false, // Para velocidade
        limit: 5
      })
    })

    if (!response.ok) {
      console.warn('Erro ao buscar contexto de documentos:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.warn('Erro ao conectar com documentos-context-service:', error)
    return null
  }
}

/**
 * 🎯 Criar prompt contextual baseado nos dados obtidos
 */
function buildContextualPrompt(
  basePrompt: string,
  pergunta: string,
  empresaContext?: any,
  documentosContext?: any
): string {
  let contextualPrompt = basePrompt

  // Adicionar contexto da empresa se disponível
  if (empresaContext?.success && empresaContext.empresa) {
    const empresa = empresaContext.empresa
    const financial = empresaContext.financial_summary
    const obligations = empresaContext.obligations_summary

    contextualPrompt += `\n\nCONTEXTO DA EMPRESA ATUAL:
- Nome: ${empresa.nome}
- CNPJ: ${empresa.cnpj}
- Regime: ${empresa.regime_tributario}
- Situação: ${empresa.situacao_fiscal}`

    if (financial) {
      contextualPrompt += `\n- Faturamento 12 meses: R$ ${financial.faturamento_12_meses.toLocaleString('pt-BR')}
- Faturamento mês atual: R$ ${financial.faturamento_atual_mes.toLocaleString('pt-BR')}
- Crescimento: ${financial.crescimento_percentual.toFixed(1)}%`
    }

    if (obligations?.das_pendente) {
      contextualPrompt += `\n- DAS pendente: R$ ${obligations.das_valor_estimado?.toFixed(2)} (vence ${obligations.das_vencimento})`
    }

    if (empresaContext.recommendations?.length > 0) {
      contextualPrompt += `\n- Alertas: ${empresaContext.recommendations.slice(0, 2).join('; ')}`
    }
  }

  // Adicionar contexto de documentos se disponível
  if (documentosContext?.success && documentosContext.summary) {
    const summary = documentosContext.summary
    const status = documentosContext.processing_status

    contextualPrompt += `\n\nCONTEXTO DE DOCUMENTOS:
- Total documentos: ${summary.total_documents}
- Taxa sucesso: ${summary.success_rate.toFixed(1)}%
- Pendentes: ${status.pending_count}`

    if (documentosContext.recent_documents?.length > 0) {
      const recent = documentosContext.recent_documents[0]
      contextualPrompt += `\n- Último documento: ${recent.tipo_documento} (${recent.status_processamento})`
    }
  }

  contextualPrompt += `\n\nIMPORTANTE:
- USE SEMPRE ESTES DADOS CONTEXTUAIS para responder
- Quando o usuário perguntar sobre "empresa", "essa empresa", "minha empresa", refira-se aos dados específicos fornecidos acima
- Para documentos, use os dados reais do sistema em vez de respostas genéricas
- Seja específico com números, valores e datas dos dados contextuais
- Identifique-se como tendo acesso aos dados do sistema quando responder`

  return contextualPrompt
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar se OpenAI está configurada
    if (!OPENAI_CONFIGURED) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Assistente de IA não disponível. OpenAI não configurada corretamente.'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Método não permitido' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse da requisição
    const requestData = await req.json()
    const {
      action = 'chat',
      pergunta,
      user_id,
      // Analytics parameters
      period = 'month',
      empresa_id,
      report_type,
      format = 'json',
      start_date,
      end_date
    } = requestData

    // Validação de user_id (sempre obrigatório)
    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Roteamento por ação
    let result
    switch (action) {
      case 'chat':
        // Validação específica para chat
        if (!pergunta?.trim()) {
          return new Response(
            JSON.stringify({ success: false, error: 'Pergunta é obrigatória' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        result = await processChat(requestData, req)
        break

      case 'dashboard':
        result = await getDashboardMetrics(period, empresa_id, user_id)
        break

      case 'health':
        result = await getSystemHealth()
        break

      case 'metrics':
        result = await getDetailedMetrics(start_date, end_date, user_id)
        break

      case 'report':
        result = await generateAnalyticsReport(report_type, format, empresa_id, user_id)
        break

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Ação não suportada: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[ASSISTENTE_ERROR]', error)

    // Tratamento de diferentes tipos de erro
    if (error.message.includes('timeout')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Timeout - tente novamente'
        }),
        {
          status: 408,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (error.message.includes('OpenAI')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erro no serviço de IA'
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// =====================================================
// FUNÇÃO DE PROCESSAMENTO DO CHAT
// =====================================================
async function processChat(requestData: any, req: Request) {
  const { pergunta, user_id, empresa_id } = requestData

  console.log('🔍 DEBUG processChat:', {
    pergunta,
    user_id,
    empresa_id,
    hasEmpresaId: !!empresa_id,
    requestData: JSON.stringify(requestData)
  })

  console.log(`🤖 Processando pergunta com contexto: ${pergunta.substring(0, 50)}...`)

  // 🎯 VERIFICAR CACHE PRIMEIRO (considerando empresa_id no cache)
  const perfLogger = new PerformanceLogger(`Consulta IA Contextual: ${pergunta.substring(0, 30)}...`)
  const cacheKey = empresa_id ? `${pergunta}_${empresa_id}` : pergunta

  let cachedResponse
  try {
    cachedResponse = await withTimeout(
      cache.get(cacheKey, user_id),
      PERFORMANCE_CONFIG.CACHE_TIMEOUT,
      'Cache timeout'
    )
    perfLogger.log('Cache verificado', { hit: !!cachedResponse, withContext: !!empresa_id })
  } catch (error) {
    perfLogger.log('Cache falhou', { error: error.message })
  }

  if (cachedResponse) {
    perfLogger.log('Cache HIT - retornando resposta contextual')
    const response = {
      success: true,
      resposta: cachedResponse.resposta,
      cached: true,
      timestamp: new Date().toISOString(),
      context_used: cachedResponse.context_used || false
    }
    perfLogger.finish(true, { cached: true, streaming: false })
    return response
  }

  perfLogger.log('Cache MISS - analisando contexto necessário')

  // 🔍 ANÁLISE INTELIGENTE DE CONTEXTO
  let contextAnalysis
  try {
    contextAnalysis = analyzeQuestionContext(pergunta, empresa_id)
    console.log('🔍 DEBUG contextAnalysis:', contextAnalysis)
    perfLogger.log('Contexto analisado', {
      level: contextAnalysis.contextLevel,
      actions: contextAnalysis.suggestedActions
    })
  } catch (error) {
    console.error('❌ Erro na análise de contexto:', error)
    contextAnalysis = {
      needsEmpresaContext: false,
      needsDocumentosContext: false,
      needsFiscalCalculation: false,
      contextLevel: 'basic' as const,
      suggestedActions: []
    }
  }

  // 📊 BUSCAR CONTEXTOS EM PARALELO (se necessário)
  const contextPromises = []

  console.log('🔍 DEBUG contexto necessário:', {
    needsEmpresaContext: contextAnalysis.needsEmpresaContext,
    needsDocumentosContext: contextAnalysis.needsDocumentosContext,
    empresa_id,
    willFetchEmpresa: contextAnalysis.needsEmpresaContext && empresa_id,
    willFetchDocumentos: contextAnalysis.needsDocumentosContext
  })

  let empresaPromiseAttempted = false
  let documentosPromiseAttempted = false

  if (contextAnalysis.needsEmpresaContext && empresa_id) {
    console.log('📊 Buscando contexto de empresa...', { empresa_id, user_id })
    empresaPromiseAttempted = true
    contextPromises.push(fetchEmpresaContext(empresa_id, user_id))
  } else {
    console.log('📊 Não buscando contexto de empresa - needsContext:', contextAnalysis.needsEmpresaContext, 'empresa_id:', !!empresa_id)
    contextPromises.push(Promise.resolve(null))
  }

  if (contextAnalysis.needsDocumentosContext) {
    console.log('📄 Buscando contexto de documentos...', { empresa_id, user_id })
    documentosPromiseAttempted = true
    contextPromises.push(fetchDocumentosContext(empresa_id, user_id))
  } else {
    console.log('📄 Não buscando contexto de documentos - needsContext:', contextAnalysis.needsDocumentosContext)
    contextPromises.push(Promise.resolve(null))
  }

  const [empresaContext, documentosContext] = await Promise.allSettled(contextPromises)

  const empresaData = empresaContext.status === 'fulfilled' ? empresaContext.value : { error: 'Promise rejected', rejection: empresaContext.reason }
  const documentosData = documentosContext.status === 'fulfilled' ? documentosContext.value : { error: 'Promise rejected', rejection: documentosContext.reason }

  perfLogger.log('Contextos obtidos', {
    empresa: !!empresaData?.success,
    documentos: !!documentosData?.success,
    empresaData: empresaData ? JSON.stringify(empresaData).substring(0, 200) : 'null',
    documentosData: documentosData ? JSON.stringify(documentosData).substring(0, 200) : 'null',
    totalTime: Date.now() - perfLogger.startTime
  })

  // 🎯 CRIAR PROMPT CONTEXTUAL
  const contextualPrompt = buildContextualPrompt(
    SYSTEM_PROMPT,
    pergunta,
    empresaData,
    documentosData
  )

  // Preparar mensagens para OpenAI
  const messages = [
    { role: 'system', content: contextualPrompt },
    { role: 'user', content: pergunta }
  ]

  perfLogger.log('Mensagens contextuais preparadas', {
    messageCount: messages.length,
    promptLength: contextualPrompt.length,
    hasContext: contextualPrompt.length > SYSTEM_PROMPT.length
  })

  // Fazer chamada para OpenAI com retry e timeout otimizado
  const response = await withRetry(async () => {
    perfLogger.log('Chamando OpenAI API')

    return await withTimeout(
      fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: PERFORMANCE_CONFIG.TEMPERATURE,
          max_tokens: PERFORMANCE_CONFIG.MAX_TOKENS
        })
      }),
      PERFORMANCE_CONFIG.OPENAI_TIMEOUT,
      'OpenAI API timeout'
    )
  }) as Response

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenAI API Error:', response.status, errorText)
    throw new Error('Erro no serviço de IA')
  }

  const data = await response.json()
  const resposta = data.choices[0]?.message?.content

  if (!resposta) {
    throw new Error('Resposta vazia da IA')
  }

  perfLogger.log('Resposta processada', { length: resposta.length })

  // 💾 SALVAR NO CACHE (assíncrono) com contexto usado
  const responseData = {
    success: true,
    resposta,
    cached: false,
    timestamp: new Date().toISOString(),
    context_used: !!(empresaData?.success || documentosData?.success),
    context_attempted: !!(contextAnalysis.needsEmpresaContext || contextAnalysis.needsDocumentosContext),
    context_level: contextAnalysis.contextLevel,
    context_debug: {
      empresa_attempted: empresaPromiseAttempted,
      empresa_fetched: !!empresaData,
      empresa_success: !!empresaData?.success,
      documentos_attempted: documentosPromiseAttempted,
      documentos_fetched: !!documentosData,
      documentos_success: !!documentosData?.success,
      empresa_error: empresaData?.error || null,
      documentos_error: documentosData?.error || null
    }
  }

  // Salvar no cache com chave que inclui empresa_id se aplicável
  cache.set(cacheKey, user_id, responseData).catch(err =>
    perfLogger.log('Erro ao salvar no cache', { error: err.message })
  )

  const { elapsed: totalTime, metrics } = perfLogger.finish(true, {
    cached: false,
    streaming: false,
    responseLength: resposta.length
  })

  // Salvar métricas de forma assíncrona
  const sessionId = `session-${Date.now()}`
  const queryType = cache.classifyQuery ? cache.classifyQuery(pergunta) : 'general'

  saveMetrics(user_id, sessionId, pergunta, queryType, metrics, req).catch(err =>
    console.warn('Erro ao salvar métricas:', err)
  )

  return {
    ...responseData,
    performance: { totalTime }
  }
}

// =====================================================
// FUNÇÕES DE ANALYTICS (consolidadas do analytics-service)
// =====================================================

// 🚀 CACHE: Métricas em memória (5 minutos TTL)
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
const metricsCache = new Map<string, { data: any; timestamp: number }>()

async function getDashboardMetrics(period: string, empresa_id?: string, user_id?: string) {
  if (!user_id) {
    throw new Error('User ID é obrigatório')
  }

  // 🚀 CACHE: Verificar cache primeiro
  const cacheKey = `dashboard_${user_id}_${period}_${empresa_id || 'all'}`
  const cached = metricsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.data, cached: true }
  }

  try {
    const dateFilter = getDateFilter(period)

    // 🔒 SEGURANÇA: Filtrar por user_id
    let query = supabase
      .from('empresas')
      .select('id, nome, regime_tributario, created_at')
      .eq('user_id', user_id)
      .eq('ativa', true)

    if (empresa_id) {
      query = query.eq('id', empresa_id)
    }

    const { data: empresas } = await query

    // Métricas de documentos
    let docQuery = supabase
      .from('documentos_fiscais')
      .select('id, tipo_documento, status, created_at')

    if (dateFilter) {
      docQuery = docQuery.gte('created_at', dateFilter)
    }
    if (empresa_id) {
      docQuery = docQuery.eq('empresa_id', empresa_id)
    }

    const { data: documentos } = await docQuery

    const result = {
      empresas: {
        total: empresas?.length || 0,
        por_regime: groupBy(empresas || [], 'regime_tributario')
      },
      documentos: {
        total: documentos?.length || 0,
        por_tipo: groupBy(documentos || [], 'tipo_documento'),
        por_status: groupBy(documentos || [], 'status')
      },
      period,
      generated_at: new Date().toISOString(),
      cached: false
    }

    // 🚀 CACHE: Salvar no cache
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return result
  } catch (error) {
    console.error('Erro ao buscar métricas dashboard:', error)
    throw new Error('Erro ao buscar métricas dashboard')
  }
}

async function getSystemHealth() {
  // 🚀 CACHE: Health check (1 minuto TTL)
  const cacheKey = 'system_health'
  const cached = metricsCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < 60000) { // 1 minuto
    return { ...cached.data, cached: true }
  }

  try {
    // Teste simples de conectividade
    const { data, error } = await supabase
      .from('empresas')
      .select('count')
      .limit(1)

    const result = {
      status: error ? 'unhealthy' : 'healthy',
      database: error ? 'error' : 'connected',
      timestamp: new Date().toISOString(),
      cached: false
    }

    // 🚀 CACHE: Salvar no cache
    metricsCache.set(cacheKey, { data: result, timestamp: Date.now() })

    return result
  } catch (error) {
    console.error('Erro ao verificar saúde do sistema:', error)
    return {
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      cached: false
    }
  }
}

async function getDetailedMetrics(start_date?: string, end_date?: string, user_id?: string) {
  if (!user_id) {
    throw new Error('User ID é obrigatório')
  }

  try {
    // Métricas de IA
    let iaQuery = supabase
      .from('ai_metrics')
      .select('*')
      .eq('user_id', user_id)

    if (start_date) {
      iaQuery = iaQuery.gte('created_at', start_date)
    }
    if (end_date) {
      iaQuery = iaQuery.lte('created_at', end_date)
    }

    const { data: iaMetrics } = await iaQuery

    return {
      ai_metrics: {
        total_queries: iaMetrics?.length || 0,
        avg_response_time: iaMetrics?.reduce((acc, m) => acc + (m.total_time_ms || 0), 0) / (iaMetrics?.length || 1),
        cache_hit_rate: (iaMetrics?.filter(m => m.cache_hit).length || 0) / (iaMetrics?.length || 1) * 100
      },
      period: { start_date, end_date },
      generated_at: new Date().toISOString()
    }
  } catch (error) {
    console.error('Erro ao buscar métricas detalhadas:', error)
    throw new Error('Erro ao buscar métricas detalhadas')
  }
}

async function generateAnalyticsReport(report_type?: string, format = 'json', empresa_id?: string, user_id?: string) {
  if (!user_id) {
    throw new Error('User ID é obrigatório')
  }

  try {
    const dashboardData = await getDashboardMetrics('month', empresa_id, user_id)
    const healthData = await getSystemHealth()

    const report = {
      type: report_type || 'summary',
      format,
      data: {
        dashboard: dashboardData,
        health: healthData
      },
      generated_at: new Date().toISOString(),
      user_id,
      empresa_id
    }

    return report
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    throw new Error('Erro ao gerar relatório')
  }
}

// Função auxiliar para filtros de data
function getDateFilter(period: string): string | null {
  const now = new Date()
  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    case 'year':
      return new Date(now.getFullYear(), 0, 1).toISOString()
    default:
      return null
  }
}

// Função auxiliar para agrupar dados
function groupBy(array: any[], key: string) {
  return array.reduce((groups, item) => {
    const group = item[key] || 'undefined'
    groups[group] = (groups[group] || 0) + 1
    return groups
  }, {})
}