'use client'

import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA INTEGRAÇÃO COM APIS GOVERNAMENTAIS
// =====================================================

export interface GovernmentAPIConfig {
  id: string
  name: string
  baseUrl: string
  version: string
  authentication: {
    type: 'certificate' | 'token' | 'oauth' | 'basic'
    credentials: Record<string, any>
  }
  rateLimit: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  timeout: number
  retryConfig: {
    maxRetries: number
    backoffMs: number
    retryableErrors: string[]
  }
  endpoints: Record<string, APIEndpoint>
  enabled: boolean
}

export interface APIEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  description: string
  parameters: APIParameter[]
  responseSchema: any
  requiresAuth: boolean
  rateLimit?: {
    requestsPerMinute: number
  }
}

export interface APIParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  description: string
  validation?: {
    pattern?: string
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }
}

export interface APIRequest {
  id: string
  apiId: string
  endpoint: string
  method: string
  parameters: Record<string, any>
  headers: Record<string, string>
  timestamp: Date
  userId: string
  empresaId: string
}

export interface APIResponse {
  requestId: string
  status: number
  statusText: string
  data: any
  headers: Record<string, string>
  duration: number
  timestamp: Date
  cached: boolean
}

export interface APIError {
  requestId: string
  code: string
  message: string
  details: any
  timestamp: Date
  recoverable: boolean
}

export interface IntegrationStatus {
  apiId: string
  status: 'active' | 'inactive' | 'error' | 'maintenance'
  lastCheck: Date
  responseTime: number
  successRate: number
  errorCount: number
  lastError?: string
}

// =====================================================
// GOVERNMENT APIS INTEGRATION SERVICE
// =====================================================

export class GovernmentAPIsIntegrationService {
  private apis = new Map<string, GovernmentAPIConfig>()
  private rateLimiters = new Map<string, RateLimiter>()
  private requestHistory = new Map<string, APIRequest[]>()
  private integrationStatus = new Map<string, IntegrationStatus>()

  constructor() {
    this.initializeGovernmentAPIs()
  }

  /**
   * Registra uma nova API governamental
   */
  async registerAPI(config: GovernmentAPIConfig): Promise<Result<void, ContextError>> {
    const operationContext = createOperationContext('register_api', 'system', {
      apiId: config.id
    })

    return await measureOperation('registerAPI', async () => {
      try {
        // Validar configuração
        const validationResult = this.validateAPIConfig(config)
        if (!validationResult.isValid) {
          return {
            success: false,
            error: new ContextErrorClass(
              `Configuração de API inválida: ${validationResult.errors.join(', ')}`,
              ERROR_CODES.VALIDATION_FAILED,
              { apiId: config.id, errors: validationResult.errors }
            )
          }
        }

        // Registrar API
        this.apis.set(config.id, config)

        // Configurar rate limiter
        this.rateLimiters.set(config.id, new RateLimiter(config.rateLimit))

        // Inicializar status
        this.integrationStatus.set(config.id, {
          apiId: config.id,
          status: config.enabled ? 'active' : 'inactive',
          lastCheck: new Date(),
          responseTime: 0,
          successRate: 1,
          errorCount: 0
        })

        // Salvar configuração
        await unifiedCacheService.set(`api-config:${config.id}`, config, 'api-configs')

        logger.info('Government API registered successfully', {
          apiId: config.id,
          name: config.name,
          enabled: config.enabled,
          traceId: operationContext.traceId
        })

        return { success: true, data: undefined }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to register government API',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { apiId: config.id },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Executa uma chamada para API governamental
   */
  async callAPI(
    apiId: string,
    endpoint: string,
    parameters: Record<string, any>,
    context: {
      userId: string
      empresaId: string
    }
  ): Promise<Result<APIResponse, ContextError>> {
    const operationContext = createOperationContext('call_api', context.userId, {
      apiId,
      endpoint,
      empresaId: context.empresaId
    })

    return await measureOperation('callAPI', async () => {
      try {
        // Verificar se API existe e está ativa
        const apiConfig = this.apis.get(apiId)
        if (!apiConfig) {
          return {
            success: false,
            error: new ContextErrorClass(
              `API não encontrada: ${apiId}`,
              ERROR_CODES.VALIDATION_FAILED,
              { apiId }
            )
          }
        }

        if (!apiConfig.enabled) {
          return {
            success: false,
            error: new ContextErrorClass(
              `API desabilitada: ${apiId}`,
              ERROR_CODES.EXTERNAL_SERVICE_ERROR,
              { apiId }
            )
          }
        }

        // Verificar se endpoint existe
        const endpointConfig = apiConfig.endpoints[endpoint]
        if (!endpointConfig) {
          return {
            success: false,
            error: new ContextErrorClass(
              `Endpoint não encontrado: ${endpoint}`,
              ERROR_CODES.VALIDATION_FAILED,
              { apiId, endpoint }
            )
          }
        }

        // Verificar rate limit
        const rateLimiter = this.rateLimiters.get(apiId)
        if (rateLimiter && !rateLimiter.canMakeRequest()) {
          return {
            success: false,
            error: new ContextErrorClass(
              'Rate limit excedido',
              ERROR_CODES.EXTERNAL_SERVICE_ERROR,
              { apiId, endpoint }
            )
          }
        }

        // Validar parâmetros
        const paramValidation = this.validateParameters(parameters, endpointConfig.parameters)
        if (!paramValidation.isValid) {
          return {
            success: false,
            error: new ContextErrorClass(
              `Parâmetros inválidos: ${paramValidation.errors.join(', ')}`,
              ERROR_CODES.VALIDATION_FAILED,
              { apiId, endpoint, errors: paramValidation.errors }
            )
          }
        }

        // Criar request
        const request: APIRequest = {
          id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          apiId,
          endpoint,
          method: endpointConfig.method,
          parameters,
          headers: {},
          timestamp: new Date(),
          userId: context.userId,
          empresaId: context.empresaId
        }

        // Verificar cache
        const cacheKey = this.generateCacheKey(apiId, endpoint, parameters)
        const cachedResponse = await unifiedCacheService.get<APIResponse>(
          cacheKey,
          'api-responses'
        )

        if (cachedResponse && this.isCacheValid(cachedResponse)) {
          logger.info('API response served from cache', {
            requestId: request.id,
            apiId,
            endpoint,
            traceId: operationContext.traceId
          })

          return { success: true, data: { ...cachedResponse, cached: true } }
        }

        // Executar chamada
        const response = await this.executeAPICall(request, apiConfig, endpointConfig)

        // Registrar request no histórico
        this.addToHistory(apiId, request)

        // Atualizar status da integração
        this.updateIntegrationStatus(apiId, response)

        // Cache da resposta se for bem-sucedida
        if (response.status >= 200 && response.status < 300) {
          await unifiedCacheService.set(cacheKey, response, 'api-responses')
        }

        logger.info('API call completed successfully', {
          requestId: request.id,
          apiId,
          endpoint,
          status: response.status,
          duration: response.duration,
          traceId: operationContext.traceId
        })

        return { success: true, data: response }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to call government API',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { apiId, endpoint, context },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        // Atualizar status com erro
        this.updateIntegrationStatusWithError(apiId, contextError.message)

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Consulta CNPJ na Receita Federal
   */
  async consultarCNPJ(cnpj: string, userId: string): Promise<Result<any, ContextError>> {
    return await this.callAPI(
      'receita-federal',
      'consultar-cnpj',
      { cnpj },
      { userId, empresaId: cnpj }
    )
  }

  /**
   * Consulta situação fiscal no SEFAZ
   */
  async consultarSituacaoFiscal(
    cnpj: string,
    estado: string,
    userId: string
  ): Promise<Result<any, ContextError>> {
    return await this.callAPI(
      'sefaz',
      'situacao-fiscal',
      { cnpj, estado },
      { userId, empresaId: cnpj }
    )
  }

  /**
   * Enviar evento para eSocial
   */
  async enviarEventoESocial(
    evento: any,
    empresaId: string,
    userId: string
  ): Promise<Result<any, ContextError>> {
    return await this.callAPI(
      'esocial',
      'enviar-evento',
      { evento },
      { userId, empresaId }
    )
  }

  /**
   * Obtém status das integrações
   */
  async getIntegrationStatus(): Promise<Result<IntegrationStatus[], ContextError>> {
    const operationContext = createOperationContext('get_integration_status', 'system')

    return await measureOperation('getIntegrationStatus', async () => {
      try {
        const statuses = Array.from(this.integrationStatus.values())
        return { success: true, data: statuses }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to get integration status',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          {},
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Métodos privados
   */
  private validateAPIConfig(config: GovernmentAPIConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!config.id) errors.push('ID é obrigatório')
    if (!config.name) errors.push('Nome é obrigatório')
    if (!config.baseUrl) errors.push('Base URL é obrigatória')
    if (!config.authentication) errors.push('Configuração de autenticação é obrigatória')
    if (!config.rateLimit) errors.push('Configuração de rate limit é obrigatória')

    // Validar endpoints
    if (!config.endpoints || Object.keys(config.endpoints).length === 0) {
      errors.push('Pelo menos um endpoint é obrigatório')
    } else {
      Object.entries(config.endpoints).forEach(([key, endpoint]) => {
        if (!endpoint.path) errors.push(`Endpoint ${key}: path é obrigatório`)
        if (!endpoint.method) errors.push(`Endpoint ${key}: method é obrigatório`)
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private validateParameters(
    parameters: Record<string, any>,
    parameterDefs: APIParameter[]
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Verificar parâmetros obrigatórios
    parameterDefs.forEach(paramDef => {
      if (paramDef.required && !parameters.hasOwnProperty(paramDef.name)) {
        errors.push(`Parâmetro obrigatório ausente: ${paramDef.name}`)
      }

      const value = parameters[paramDef.name]
      if (value !== undefined) {
        // Validar tipo
        if (!this.validateParameterType(value, paramDef.type)) {
          errors.push(`Parâmetro ${paramDef.name}: tipo inválido, esperado ${paramDef.type}`)
        }

        // Validar regras específicas
        if (paramDef.validation) {
          const validation = paramDef.validation
          
          if (typeof value === 'string') {
            if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
              errors.push(`Parâmetro ${paramDef.name}: não atende ao padrão ${validation.pattern}`)
            }
            if (validation.minLength && value.length < validation.minLength) {
              errors.push(`Parâmetro ${paramDef.name}: comprimento mínimo ${validation.minLength}`)
            }
            if (validation.maxLength && value.length > validation.maxLength) {
              errors.push(`Parâmetro ${paramDef.name}: comprimento máximo ${validation.maxLength}`)
            }
          }

          if (typeof value === 'number') {
            if (validation.min !== undefined && value < validation.min) {
              errors.push(`Parâmetro ${paramDef.name}: valor mínimo ${validation.min}`)
            }
            if (validation.max !== undefined && value > validation.max) {
              errors.push(`Parâmetro ${paramDef.name}: valor máximo ${validation.max}`)
            }
          }
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private validateParameterType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number'
      case 'boolean':
        return typeof value === 'boolean'
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'array':
        return Array.isArray(value)
      default:
        return true
    }
  }

  private generateCacheKey(apiId: string, endpoint: string, parameters: Record<string, any>): string {
    const paramString = JSON.stringify(parameters, Object.keys(parameters).sort())
    return `api-response:${apiId}:${endpoint}:${Buffer.from(paramString).toString('base64').slice(0, 32)}`
  }

  private isCacheValid(response: APIResponse): boolean {
    // Cache válido por 1 hora para a maioria das consultas
    const cacheValidityMs = 60 * 60 * 1000
    return (Date.now() - response.timestamp.getTime()) < cacheValidityMs
  }

  private async executeAPICall(
    request: APIRequest,
    apiConfig: GovernmentAPIConfig,
    endpointConfig: APIEndpoint
  ): Promise<APIResponse> {
    const startTime = Date.now()

    try {
      // Preparar URL
      const url = `${apiConfig.baseUrl}${endpointConfig.path}`

      // Preparar headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'ContabilidadePRO/1.0'
      }

      // Adicionar autenticação
      if (endpointConfig.requiresAuth) {
        this.addAuthenticationHeaders(headers, apiConfig.authentication)
      }

      // Simular chamada HTTP (em produção, usar fetch ou axios)
      const response = await this.simulateHTTPCall(url, {
        method: endpointConfig.method,
        headers,
        body: endpointConfig.method !== 'GET' ? JSON.stringify(request.parameters) : undefined,
        timeout: apiConfig.timeout
      })

      const duration = Date.now() - startTime

      return {
        requestId: request.id,
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
        duration,
        timestamp: new Date(),
        cached: false
      }

    } catch (error) {
      const duration = Date.now() - startTime
      
      throw new Error(`API call failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private addAuthenticationHeaders(headers: Record<string, string>, auth: GovernmentAPIConfig['authentication']): void {
    switch (auth.type) {
      case 'token':
        headers['Authorization'] = `Bearer ${auth.credentials.token}`
        break
      case 'basic':
        const credentials = Buffer.from(`${auth.credentials.username}:${auth.credentials.password}`).toString('base64')
        headers['Authorization'] = `Basic ${credentials}`
        break
      case 'certificate':
        // Certificado digital seria configurado no cliente HTTP
        headers['X-Certificate'] = auth.credentials.certificateId
        break
      default:
        break
    }
  }

  private async simulateHTTPCall(url: string, options: any): Promise<any> {
    // Simulação de chamada HTTP - em produção, usar fetch ou axios real
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500)) // 500-1500ms

    // Simular diferentes tipos de resposta baseado na URL
    if (url.includes('consultar-cnpj')) {
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: {
          cnpj: options.body ? JSON.parse(options.body).cnpj : '12345678000195',
          razaoSocial: 'Empresa Exemplo LTDA',
          situacao: 'ATIVA',
          dataAbertura: '2020-01-15',
          naturezaJuridica: '206-2',
          endereco: {
            logradouro: 'Rua Exemplo, 123',
            bairro: 'Centro',
            municipio: 'São Paulo',
            uf: 'SP',
            cep: '01000-000'
          }
        }
      }
    }

    if (url.includes('situacao-fiscal')) {
      return {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: {
          cnpj: options.body ? JSON.parse(options.body).cnpj : '12345678000195',
          situacao: 'REGULAR',
          inscricaoEstadual: '123456789',
          regime: 'SIMPLES_NACIONAL',
          ultimaConsulta: new Date().toISOString()
        }
      }
    }

    if (url.includes('enviar-evento')) {
      return {
        status: 201,
        statusText: 'Created',
        headers: { 'content-type': 'application/json' },
        data: {
          protocolo: `PROT${Date.now()}`,
          status: 'PROCESSADO',
          dataProcessamento: new Date().toISOString(),
          recibo: `REC${Date.now()}`
        }
      }
    }

    // Resposta padrão
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: { message: 'Success', timestamp: new Date().toISOString() }
    }
  }

  private addToHistory(apiId: string, request: APIRequest): void {
    if (!this.requestHistory.has(apiId)) {
      this.requestHistory.set(apiId, [])
    }

    const history = this.requestHistory.get(apiId)!
    history.push(request)

    // Manter apenas os últimos 100 requests
    if (history.length > 100) {
      history.shift()
    }
  }

  private updateIntegrationStatus(apiId: string, response: APIResponse): void {
    const status = this.integrationStatus.get(apiId)
    if (!status) return

    status.lastCheck = new Date()
    status.responseTime = response.duration

    // Atualizar success rate
    const isSuccess = response.status >= 200 && response.status < 300
    const history = this.requestHistory.get(apiId) || []
    const recentRequests = history.slice(-10) // Últimos 10 requests
    
    if (recentRequests.length > 0) {
      // Calcular success rate baseado nos últimos requests (simplificado)
      status.successRate = isSuccess ? 
        Math.min(status.successRate + 0.1, 1) : 
        Math.max(status.successRate - 0.1, 0)
    }

    if (!isSuccess) {
      status.errorCount++
      status.status = 'error'
      status.lastError = `HTTP ${response.status}: ${response.statusText}`
    } else if (status.status === 'error' && status.successRate > 0.8) {
      status.status = 'active'
      status.lastError = undefined
    }
  }

  private updateIntegrationStatusWithError(apiId: string, error: string): void {
    const status = this.integrationStatus.get(apiId)
    if (!status) return

    status.lastCheck = new Date()
    status.status = 'error'
    status.errorCount++
    status.lastError = error
    status.successRate = Math.max(status.successRate - 0.2, 0)
  }

  private initializeGovernmentAPIs(): void {
    // Configuração da Receita Federal
    const receitaFederalConfig: GovernmentAPIConfig = {
      id: 'receita-federal',
      name: 'Receita Federal do Brasil',
      baseUrl: 'https://www.receitaws.com.br/v1',
      version: '1.0',
      authentication: {
        type: 'token',
        credentials: {
          token: 'RF_API_TOKEN' // Seria carregado de variáveis de ambiente
        }
      },
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
        requestsPerDay: 5000
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        backoffMs: 1000,
        retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR', '503', '502']
      },
      endpoints: {
        'consultar-cnpj': {
          path: '/cnpj/{cnpj}',
          method: 'GET',
          description: 'Consultar dados de CNPJ',
          parameters: [
            {
              name: 'cnpj',
              type: 'string',
              required: true,
              description: 'CNPJ da empresa',
              validation: {
                pattern: '^\\d{14}$',
                minLength: 14,
                maxLength: 14
              }
            }
          ],
          responseSchema: {},
          requiresAuth: true
        }
      },
      enabled: true
    }

    // Configuração do SEFAZ
    const sefazConfig: GovernmentAPIConfig = {
      id: 'sefaz',
      name: 'SEFAZ - Secretaria da Fazenda',
      baseUrl: 'https://nfe.sefaz.rs.gov.br/ws',
      version: '4.0',
      authentication: {
        type: 'certificate',
        credentials: {
          certificateId: 'SEFAZ_CERT_ID'
        }
      },
      rateLimit: {
        requestsPerMinute: 20,
        requestsPerHour: 300,
        requestsPerDay: 2000
      },
      timeout: 45000,
      retryConfig: {
        maxRetries: 2,
        backoffMs: 2000,
        retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR']
      },
      endpoints: {
        'situacao-fiscal': {
          path: '/situacao-fiscal',
          method: 'POST',
          description: 'Consultar situação fiscal',
          parameters: [
            {
              name: 'cnpj',
              type: 'string',
              required: true,
              description: 'CNPJ da empresa'
            },
            {
              name: 'estado',
              type: 'string',
              required: true,
              description: 'Estado da consulta'
            }
          ],
          responseSchema: {},
          requiresAuth: true
        }
      },
      enabled: true
    }

    // Configuração do eSocial
    const esocialConfig: GovernmentAPIConfig = {
      id: 'esocial',
      name: 'eSocial',
      baseUrl: 'https://webservices.producaorestrita.esocial.gov.br',
      version: '1.5',
      authentication: {
        type: 'certificate',
        credentials: {
          certificateId: 'ESOCIAL_CERT_ID'
        }
      },
      rateLimit: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 1000
      },
      timeout: 60000,
      retryConfig: {
        maxRetries: 2,
        backoffMs: 3000,
        retryableErrors: ['TIMEOUT', 'CONNECTION_ERROR']
      },
      endpoints: {
        'enviar-evento': {
          path: '/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
          method: 'POST',
          description: 'Enviar evento para eSocial',
          parameters: [
            {
              name: 'evento',
              type: 'object',
              required: true,
              description: 'Dados do evento eSocial'
            }
          ],
          responseSchema: {},
          requiresAuth: true
        }
      },
      enabled: true
    }

    // Registrar APIs
    this.apis.set(receitaFederalConfig.id, receitaFederalConfig)
    this.apis.set(sefazConfig.id, sefazConfig)
    this.apis.set(esocialConfig.id, esocialConfig)

    // Configurar rate limiters
    this.rateLimiters.set(receitaFederalConfig.id, new RateLimiter(receitaFederalConfig.rateLimit))
    this.rateLimiters.set(sefazConfig.id, new RateLimiter(sefazConfig.rateLimit))
    this.rateLimiters.set(esocialConfig.id, new RateLimiter(esocialConfig.rateLimit))

    // Inicializar status
    const configs = [receitaFederalConfig, sefazConfig, esocialConfig]
    configs.forEach((config: GovernmentAPIConfig) => {
      this.integrationStatus.set(config.id, {
        apiId: config.id,
        status: config.enabled ? 'active' : 'inactive',
        lastCheck: new Date(),
        responseTime: 0,
        successRate: 1,
        errorCount: 0
      })
    })
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStatistics() {
    const totalAPIs = this.apis.size
    const activeAPIs = Array.from(this.integrationStatus.values())
      .filter(status => status.status === 'active').length
    const totalRequests = Array.from(this.requestHistory.values())
      .reduce((sum, history) => sum + history.length, 0)

    return {
      totalAPIs,
      activeAPIs,
      totalRequests,
      averageResponseTime: this.calculateAverageResponseTime(),
      overallSuccessRate: this.calculateOverallSuccessRate()
    }
  }

  private calculateAverageResponseTime(): number {
    const statuses = Array.from(this.integrationStatus.values())
    if (statuses.length === 0) return 0
    
    const totalResponseTime = statuses.reduce((sum, status) => sum + status.responseTime, 0)
    return totalResponseTime / statuses.length
  }

  private calculateOverallSuccessRate(): number {
    const statuses = Array.from(this.integrationStatus.values())
    if (statuses.length === 0) return 0
    
    const totalSuccessRate = statuses.reduce((sum, status) => sum + status.successRate, 0)
    return totalSuccessRate / statuses.length
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    this.apis.clear()
    this.rateLimiters.clear()
    this.requestHistory.clear()
    this.integrationStatus.clear()

    logger.info('GovernmentAPIsIntegrationService destroyed successfully')
  }
}

// =====================================================
// RATE LIMITER HELPER CLASS
// =====================================================

class RateLimiter {
  private requests: Date[] = []
  private config: GovernmentAPIConfig['rateLimit']

  constructor(config: GovernmentAPIConfig['rateLimit']) {
    this.config = config
  }

  canMakeRequest(): boolean {
    const now = new Date()
    
    // Limpar requests antigos
    this.requests = this.requests.filter(requestTime => {
      const diffMs = now.getTime() - requestTime.getTime()
      return diffMs < 60 * 60 * 1000 // Manter últimas 1 hora
    })

    // Verificar limites
    const lastMinute = this.requests.filter(requestTime => {
      const diffMs = now.getTime() - requestTime.getTime()
      return diffMs < 60 * 1000
    }).length

    const lastHour = this.requests.length

    if (lastMinute >= this.config.requestsPerMinute) return false
    if (lastHour >= this.config.requestsPerHour) return false

    // Adicionar request atual
    this.requests.push(now)
    return true
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const governmentAPIsIntegrationService = new GovernmentAPIsIntegrationService()
