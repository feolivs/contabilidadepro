/**
 * 📝 STRUCTURED LOGGER
 * Sistema de logging estruturado para Edge Functions
 * - Logs em formato JSON consistente
 * - Diferentes níveis de log
 * - Context tracking automático
 * - Performance metrics integrados
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'

export interface LogContext {
  userId?: string
  sessionId?: string
  requestId?: string
  operation?: string
  empresaId?: string
  ipAddress?: string
  userAgent?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  context?: LogContext
  metadata?: Record<string, any>
  performance?: {
    duration?: number
    memoryUsage?: number
    cacheHit?: boolean
  }
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  traceId?: string
}

export interface PerformanceMetrics {
  startTime: number
  endTime?: number
  duration?: number
  memoryStart?: number
  memoryEnd?: number
  cacheHits?: number
  cacheMisses?: number
  dbQueries?: number
  apiCalls?: number
}

export class StructuredLogger {
  private service: string
  private context: LogContext = {}
  private performance: PerformanceMetrics = { startTime: performance.now() }
  private requestId: string

  constructor(service: string, initialContext?: LogContext) {
    this.service = service
    this.requestId = this.generateRequestId()

    if (initialContext) {
      this.context = { ...initialContext }
    }

    // Auto-detect common context from environment
    this.detectEnvironmentContext()
  }

  /**
   * 🎯 Métodos de Log por Nível
   */

  debug(message: string, metadata?: Record<string, any>): void {
    if (this.shouldLog('DEBUG')) {
      this.log('DEBUG', message, metadata)
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata)
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('WARN', message, metadata)
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    } : undefined

    this.log('ERROR', message, metadata, errorInfo)
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    } : undefined

    this.log('FATAL', message, metadata, errorInfo)
  }

  /**
   * 🔧 Context Management
   */

  setContext(key: string, value: any): void {
    this.context[key] = value
  }

  setUserContext(userId: string, sessionId?: string): void {
    this.context.userId = userId
    if (sessionId) this.context.sessionId = sessionId
  }

  setRequestContext(req: Request): void {
    this.context.ipAddress = this.extractIPAddress(req)
    this.context.userAgent = req.headers.get('user-agent') || 'unknown'
    this.context.method = req.method
    this.context.url = req.url
  }

  /**
   * ⏱️ Performance Tracking
   */

  startPerformanceTracking(operation: string): void {
    this.context.operation = operation
    this.performance = {
      startTime: performance.now(),
      memoryStart: this.getMemoryUsage()
    }

    this.info(`Starting operation: ${operation}`, {
      memoryStart: this.performance.memoryStart
    })
  }

  trackCacheHit(): void {
    this.performance.cacheHits = (this.performance.cacheHits || 0) + 1
  }

  trackCacheMiss(): void {
    this.performance.cacheMisses = (this.performance.cacheMisses || 0) + 1
  }

  trackDBQuery(): void {
    this.performance.dbQueries = (this.performance.dbQueries || 0) + 1
  }

  trackAPICall(): void {
    this.performance.apiCalls = (this.performance.apiCalls || 0) + 1
  }

  finishPerformanceTracking(success: boolean = true): PerformanceMetrics {
    this.performance.endTime = performance.now()
    this.performance.duration = this.performance.endTime - this.performance.startTime
    this.performance.memoryEnd = this.getMemoryUsage()

    const level = success ? 'INFO' : 'ERROR'
    const status = success ? 'completed' : 'failed'

    this.log(level, `Operation ${status}: ${this.context.operation}`, {
      duration: Math.round(this.performance.duration),
      memoryUsage: this.performance.memoryEnd,
      cacheHitRate: this.getCacheHitRate(),
      dbQueries: this.performance.dbQueries || 0,
      apiCalls: this.performance.apiCalls || 0
    })

    return { ...this.performance }
  }

  /**
   * 📊 Specialized Logging Methods
   */

  logAPICall(endpoint: string, method: string, duration: number, status: number): void {
    this.trackAPICall()
    this.info('API call completed', {
      endpoint,
      method,
      duration: Math.round(duration),
      status,
      success: status < 400
    })
  }

  logCacheOperation(operation: 'hit' | 'miss' | 'set' | 'invalidate', key: string, duration?: number): void {
    if (operation === 'hit') this.trackCacheHit()
    if (operation === 'miss') this.trackCacheMiss()

    this.debug(`Cache ${operation}`, {
      key: key.substring(0, 50), // Truncar para segurança
      duration: duration ? Math.round(duration) : undefined
    })
  }

  logBusinessEvent(event: string, data?: Record<string, any>): void {
    this.info(`Business event: ${event}`, {
      ...data,
      businessEvent: true
    })
  }

  logSecurityEvent(event: string, data?: Record<string, any>): void {
    this.warn(`Security event: ${event}`, {
      ...data,
      securityEvent: true,
      requiresAttention: true
    })
  }

  /**
   * 🔧 Private Methods
   */

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      context: { ...this.context },
      traceId: this.requestId
    }

    if (metadata) {
      entry.metadata = metadata
    }

    if (error) {
      entry.error = error
    }

    // Adicionar métricas de performance se disponíveis
    if (this.performance.duration !== undefined) {
      entry.performance = {
        duration: Math.round(this.performance.duration),
        memoryUsage: this.getMemoryUsage(),
        cacheHit: (this.performance.cacheHits || 0) > 0
      }
    }

    // Output como JSON estruturado
    console.log(JSON.stringify(entry))

    // Para erros fatais, também log normal para visibilidade
    if (level === 'FATAL' || level === 'ERROR') {
      console.error(`[${level}] ${this.service}: ${message}`, metadata)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const logLevel = Deno.env.get('LOG_LEVEL') || 'INFO'
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
    const currentLevelIndex = levels.indexOf(logLevel)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex >= currentLevelIndex
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private detectEnvironmentContext(): void {
    // Auto-detect common context
    const environment = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development'
    this.context.environment = environment
    this.context.version = Deno.env.get('APP_VERSION') || '1.0.0'
  }

  private extractIPAddress(req: Request): string {
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const cfConnectingIp = req.headers.get('cf-connecting-ip')

    return forwardedFor?.split(',')[0]?.trim() ||
           realIp ||
           cfConnectingIp ||
           'unknown'
  }

  private getMemoryUsage(): number {
    try {
      // Estimar uso de memória (limitado no Deno)
      return Math.round((performance as any).memory?.usedJSHeapSize || 0)
    } catch {
      return 0
    }
  }

  private getCacheHitRate(): number {
    const hits = this.performance.cacheHits || 0
    const misses = this.performance.cacheMisses || 0
    const total = hits + misses

    return total > 0 ? Math.round((hits / total) * 100) : 0
  }
}

/**
 * 🏭 Factory Functions
 */

export function createLogger(service: string, context?: LogContext): StructuredLogger {
  return new StructuredLogger(service, context)
}

export function createRequestLogger(service: string, req: Request): StructuredLogger {
  const logger = new StructuredLogger(service)
  logger.setRequestContext(req)
  return logger
}

/**
 * 🛠️ Utility Functions
 */

export function logMiddleware(service: string) {
  return (req: Request, handler: (req: Request, logger: StructuredLogger) => Promise<Response>) => {
    const logger = createRequestLogger(service, req)
    logger.startPerformanceTracking(`${req.method} ${new URL(req.url).pathname}`)

    return handler(req, logger)
      .then(response => {
        logger.finishPerformanceTracking(response.ok)
        return response
      })
      .catch(error => {
        logger.error('Request failed', error)
        logger.finishPerformanceTracking(false)
        throw error
      })
  }
}

/**
 * 📊 Log Analysis Helpers
 */

export const logAnalytics = {
  // Helper para extrair métricas dos logs
  parseLogEntry(jsonLine: string): LogEntry | null {
    try {
      return JSON.parse(jsonLine) as LogEntry
    } catch {
      return null
    }
  },

  // Filtrar logs por critérios
  filterLogs(logs: LogEntry[], criteria: {
    level?: LogLevel
    service?: string
    userId?: string
    timeRange?: { start: string; end: string }
  }): LogEntry[] {
    return logs.filter(log => {
      if (criteria.level && log.level !== criteria.level) return false
      if (criteria.service && log.service !== criteria.service) return false
      if (criteria.userId && log.context?.userId !== criteria.userId) return false

      if (criteria.timeRange) {
        const logTime = new Date(log.timestamp).getTime()
        const start = new Date(criteria.timeRange.start).getTime()
        const end = new Date(criteria.timeRange.end).getTime()
        if (logTime < start || logTime > end) return false
      }

      return true
    })
  },

  // Calcular métricas agregadas
  calculateMetrics(logs: LogEntry[]): {
    totalRequests: number
    errorRate: number
    avgDuration: number
    cacheHitRate: number
  } {
    const totalRequests = logs.length
    const errors = logs.filter(log => log.level === 'ERROR' || log.level === 'FATAL').length
    const durationsArray = logs
      .map(log => log.performance?.duration)
      .filter((d): d is number => d !== undefined)

    const avgDuration = durationsArray.length > 0
      ? durationsArray.reduce((sum, d) => sum + d, 0) / durationsArray.length
      : 0

    const cacheOperations = logs.filter(log => log.performance?.cacheHit !== undefined)
    const cacheHits = cacheOperations.filter(log => log.performance?.cacheHit).length
    const cacheHitRate = cacheOperations.length > 0
      ? (cacheHits / cacheOperations.length) * 100
      : 0

    return {
      totalRequests,
      errorRate: totalRequests > 0 ? (errors / totalRequests) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      cacheHitRate: Math.round(cacheHitRate)
    }
  }
}