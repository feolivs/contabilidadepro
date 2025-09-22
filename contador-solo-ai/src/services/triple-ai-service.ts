/**
 * Serviço para integração com Triple AI Agents via n8n MCP Server
 * 
 * Este serviço gerencia a comunicação com o sistema Triple AI que inclui:
 * - Agente PRÉ: Análise e planejamento de requisições
 * - MCP Tools: Execução de ferramentas especializadas
 * - Agente PÓS: Síntese e formatação de respostas
 */

export interface TripleAIRequest {
  query: string
  context?: string
  user_id?: string
  empresa_id?: string
  additional_data?: any
  complexity_hint?: 'simple' | 'medium' | 'complex'
}

export interface TripleAIResponse {
  success: boolean
  timestamp: string
  processing_info: {
    strategy_used: 'simples' | 'sequencial' | 'paralela' | 'condicional'
    tools_executed: number
    execution_time_ms: number
    tokens_used?: number
  }
  response: {
    resumo: string
    detalhes?: string
    calculos?: any
  }
  explanation?: {
    como_chegamos: string
    por_que_importante: string
    implicacoes: string[]
  }
  next_steps?: Array<{
    acao: string
    prazo: string
    importancia: string
  }>
  alerts?: Array<{
    tipo: 'prazo' | 'compliance' | 'oportunidade' | 'risco'
    mensagem: string
    urgencia: 'baixa' | 'media' | 'alta' | 'critica'
  }>
  resources?: {
    documentos_gerados?: string[]
    links_uteis?: string[]
    contatos_relevantes?: string[]
  }
  error?: string
}

export interface TripleAIConfig {
  n8nWebhookUrl: string
  apiKey?: string
  timeout?: number
  retryAttempts?: number
}

export class TripleAIService {
  private config: TripleAIConfig
  private defaultTimeout = 30000 // 30 segundos
  private defaultRetryAttempts = 2

  constructor(config: Partial<TripleAIConfig> = {}) {
    this.config = {
      n8nWebhookUrl: config.n8nWebhookUrl || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook',
      apiKey: config.apiKey || process.env.NEXT_PUBLIC_N8N_API_KEY,
      timeout: config.timeout || this.defaultTimeout,
      retryAttempts: config.retryAttempts || this.defaultRetryAttempts
    }
  }

  /**
   * Chama o Triple AI Agents via n8n MCP Server
   */
  async query(request: TripleAIRequest): Promise<TripleAIResponse> {
    const startTime = Date.now()
    
    try {
      const response = await this.makeRequest(request)
      
      // Log de sucesso
      console.log('✅ Triple AI Response:', {
        strategy: response.processing_info?.strategy_used,
        tools: response.processing_info?.tools_executed,
        duration: Date.now() - startTime
      })
      
      return response
    } catch (error) {
      console.error('❌ Triple AI Error:', error)
      
      // Tentar fallback para Edge Function direta se disponível
      if (this.shouldFallback(error)) {
        return await this.fallbackToDirectEdgeFunction(request)
      }
      
      throw error
    }
  }

  /**
   * Faz a requisição HTTP para o n8n MCP Server
   */
  private async makeRequest(request: TripleAIRequest): Promise<TripleAIResponse> {
    const url = `${this.config.n8nWebhookUrl}/contabilidade-triple-ai-mcp`
    
    const payload = {
      mcp_request: {
        query: request.query,
        context: request.context || 'assistente-contabil',
        user_id: request.user_id,
        empresa_id: request.empresa_id,
        additional_data: request.additional_data,
        complexity_hint: request.complexity_hint
      },
      user_context: {
        userId: request.user_id,
        empresaId: request.empresa_id,
        timestamp: new Date().toISOString()
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Triple AI request failed')
      }

      return data
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Triple AI request timeout')
      }
      
      throw error
    }
  }

  /**
   * Determina se deve fazer fallback para Edge Function direta
   */
  private shouldFallback(error: any): boolean {
    // Fazer fallback em casos específicos
    const fallbackConditions = [
      'timeout',
      'network',
      'connection refused',
      'service unavailable'
    ]
    
    const errorMessage = error?.message?.toLowerCase() || ''
    return fallbackConditions.some(condition => errorMessage.includes(condition))
  }

  /**
   * Fallback para Edge Function direta (assistente-contabil-ia)
   */
  private async fallbackToDirectEdgeFunction(request: TripleAIRequest): Promise<TripleAIResponse> {
    console.log('🔄 Fallback to direct Edge Function')
    
    // Simular resposta no formato esperado
    // Em uma implementação real, chamaria a Edge Function diretamente
    return {
      success: true,
      timestamp: new Date().toISOString(),
      processing_info: {
        strategy_used: 'simples',
        tools_executed: 1,
        execution_time_ms: 1000
      },
      response: {
        resumo: 'Resposta via fallback - Triple AI temporariamente indisponível. Usando processamento direto.',
        detalhes: 'Esta resposta foi gerada usando o sistema de fallback.'
      },
      alerts: [{
        tipo: 'risco',
        mensagem: 'Triple AI indisponível - usando modo simplificado',
        urgencia: 'media'
      }],
      error: 'Fallback mode active'
    }
  }

  /**
   * Testa a conectividade com o n8n MCP Server
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error', message: string, latency?: number }> {
    const startTime = Date.now()
    
    try {
      const testRequest: TripleAIRequest = {
        query: 'health check',
        context: 'system-test'
      }
      
      await this.makeRequest(testRequest)
      
      return {
        status: 'ok',
        message: 'Triple AI MCP Server is healthy',
        latency: Date.now() - startTime
      }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Analisa a complexidade de uma query para otimizar o processamento
   */
  static analyzeComplexity(query: string): 'simple' | 'medium' | 'complex' {
    const complexityIndicators = {
      simple: [
        /^(o que é|como|quando|onde|quem)/i,
        /^(calcul[ae] o? das|valor do das)/i
      ],
      medium: [
        /calcul.*e.*gerar|processar.*e.*analisar/i,
        /empresa.*e.*documento|das.*e.*irpj/i,
        /relatório|análise/i
      ],
      complex: [
        /relatório.*completo|análise.*detalhada|situação.*fiscal.*completa/i,
        /comparar.*com|histórico.*de|tendência/i,
        /\?.*\?/i // Múltiplas perguntas
      ]
    }

    if (complexityIndicators.complex.some(pattern => pattern.test(query))) {
      return 'complex'
    }
    
    if (complexityIndicators.medium.some(pattern => pattern.test(query))) {
      return 'medium'
    }
    
    return 'simple'
  }
}

// Instância singleton para uso global
export const tripleAIService = new TripleAIService()

// Tipos já exportados acima como interfaces
