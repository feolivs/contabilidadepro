/**
 * ⚡ CIRCUIT BREAKER
 * Implementação robusta de circuit breaker para proteger APIs externas
 * - Estados: CLOSED, OPEN, HALF_OPEN
 * - Timeout automático
 * - Métricas de falhas
 * - Recovery automático
 */

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerConfig {
  failureThreshold: number      // Falhas consecutivas antes de abrir
  recoveryTimeout: number       // Tempo antes de tentar recovery (ms)
  monitoringPeriod: number      // Período de monitoramento (ms)
  halfOpenMaxCalls: number      // Max calls em HALF_OPEN
  successThreshold: number      // Sucessos necessários para fechar
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failures: number
  successes: number
  totalCalls: number
  lastFailureTime: number
  lastSuccessTime: number
  stateChanges: number
  currentPeriodCalls: number
  currentPeriodFailures: number
}

export interface CircuitBreakerEvents {
  onStateChange?: (from: CircuitBreakerState, to: CircuitBreakerState) => void
  onFailure?: (error: Error) => void
  onSuccess?: () => void
  onCircuitOpen?: () => void
  onCircuitClosed?: () => void
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public state: CircuitBreakerState) {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

export class CircuitBreaker<T> {
  private state: CircuitBreakerState = 'CLOSED'
  private metrics: CircuitBreakerMetrics = {
    state: 'CLOSED',
    failures: 0,
    successes: 0,
    totalCalls: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
    stateChanges: 0,
    currentPeriodCalls: 0,
    currentPeriodFailures: 0
  }

  private config: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minuto
    monitoringPeriod: 10000, // 10 segundos
    halfOpenMaxCalls: 3,
    successThreshold: 2
  }

  private events: CircuitBreakerEvents = {}
  private halfOpenCallsCount = 0
  private halfOpenSuccesses = 0
  private monitoringTimer?: number
  private name: string

  constructor(name: string, config?: Partial<CircuitBreakerConfig>, events?: CircuitBreakerEvents) {
    this.name = name
    this.config = { ...this.config, ...config }
    this.events = events || {}

    this.startMonitoring()

    console.log(`⚡ Circuit Breaker '${name}' initialized:`, {
      failureThreshold: this.config.failureThreshold,
      recoveryTimeout: this.config.recoveryTimeout,
      state: this.state
    })
  }

  /**
   * 🎯 Executar função protegida pelo circuit breaker
   */
  async execute<R>(fn: () => Promise<R>): Promise<R> {
    return this.call(fn)
  }

  /**
   * 📞 Chamada principal (alias para execute)
   */
  async call<R>(fn: () => Promise<R>): Promise<R> {
    this.metrics.totalCalls++
    this.metrics.currentPeriodCalls++

    // Verificar estado atual
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN')
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker '${this.name}' is OPEN. Next attempt in ${this.getTimeUntilRetry()}ms`,
          'OPEN'
        )
      }
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenCallsCount >= this.config.halfOpenMaxCalls) {
        throw new CircuitBreakerError(
          `Circuit breaker '${this.name}' is HALF_OPEN with max calls reached`,
          'HALF_OPEN'
        )
      }
      this.halfOpenCallsCount++
    }

    try {
      const result = await fn()
      this.onCallSuccess()
      return result
    } catch (error) {
      this.onCallFailure(error as Error)
      throw error
    }
  }

  /**
   * 📊 Obter métricas atuais
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics }
  }

  /**
   * 🔧 Obter configuração atual
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config }
  }

  /**
   * 🔄 Reset manual do circuit breaker
   */
  reset(): void {
    console.log(`🔄 Circuit Breaker '${this.name}' manually reset`)
    this.transitionTo('CLOSED')
    this.resetCounters()
  }

  /**
   * 🛑 Forçar abertura do circuit breaker
   */
  forceOpen(): void {
    console.log(`🛑 Circuit Breaker '${this.name}' manually opened`)
    this.transitionTo('OPEN')
  }

  /**
   * 🧹 Cleanup resources
   */
  destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
      this.monitoringTimer = undefined
    }
    console.log(`🧹 Circuit Breaker '${this.name}' destroyed`)
  }

  /**
   * 🎯 MÉTODOS PRIVADOS
   */

  private onCallSuccess(): void {
    this.metrics.successes++
    this.metrics.lastSuccessTime = Date.now()

    this.events.onSuccess?.()

    if (this.state === 'HALF_OPEN') {
      this.halfOpenSuccesses++

      if (this.halfOpenSuccesses >= this.config.successThreshold) {
        this.transitionTo('CLOSED')
        this.resetCounters()
      }
    }
  }

  private onCallFailure(error: Error): void {
    this.metrics.failures++
    this.metrics.currentPeriodFailures++
    this.metrics.lastFailureTime = Date.now()

    this.events.onFailure?.(error)

    if (this.state === 'CLOSED') {
      if (this.metrics.failures >= this.config.failureThreshold) {
        this.transitionTo('OPEN')
      }
    } else if (this.state === 'HALF_OPEN') {
      // Qualquer falha em HALF_OPEN volta para OPEN
      this.transitionTo('OPEN')
    }
  }

  private shouldAttemptReset(): boolean {
    const timeSinceLastFailure = Date.now() - this.metrics.lastFailureTime
    return timeSinceLastFailure >= this.config.recoveryTimeout
  }

  private getTimeUntilRetry(): number {
    const timeSinceLastFailure = Date.now() - this.metrics.lastFailureTime
    return Math.max(0, this.config.recoveryTimeout - timeSinceLastFailure)
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state

    if (oldState === newState) return

    this.state = newState
    this.metrics.state = newState
    this.metrics.stateChanges++

    console.log(`⚡ Circuit Breaker '${this.name}': ${oldState} → ${newState}`)

    // Reset counters específicos do estado
    if (newState === 'HALF_OPEN') {
      this.halfOpenCallsCount = 0
      this.halfOpenSuccesses = 0
    } else if (newState === 'CLOSED') {
      this.metrics.failures = 0
      this.halfOpenCallsCount = 0
      this.halfOpenSuccesses = 0
    }

    // Eventos
    this.events.onStateChange?.(oldState, newState)

    if (newState === 'OPEN') {
      this.events.onCircuitOpen?.()
    } else if (newState === 'CLOSED') {
      this.events.onCircuitClosed?.()
    }
  }

  private resetCounters(): void {
    this.metrics.failures = 0
    this.halfOpenCallsCount = 0
    this.halfOpenSuccesses = 0
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      // Reset counters do período atual
      this.metrics.currentPeriodCalls = 0
      this.metrics.currentPeriodFailures = 0

      // Log périódico de métricas
      if (this.metrics.totalCalls > 0) {
        const failureRate = (this.metrics.failures / this.metrics.totalCalls) * 100
        console.log(`📊 Circuit Breaker '${this.name}' metrics:`, {
          state: this.state,
          totalCalls: this.metrics.totalCalls,
          failures: this.metrics.failures,
          failureRate: `${Math.round(failureRate)}%`,
          stateChanges: this.metrics.stateChanges
        })
      }
    }, this.config.monitoringPeriod)
  }
}

/**
 * 🏭 Factory Functions
 */

export function createCircuitBreaker<T>(
  name: string,
  config?: Partial<CircuitBreakerConfig>,
  events?: CircuitBreakerEvents
): CircuitBreaker<T> {
  return new CircuitBreaker<T>(name, config, events)
}

/**
 * 🎯 Circuit Breaker específico para OpenAI
 */
export function createOpenAICircuitBreaker(): CircuitBreaker<any> {
  return createCircuitBreaker('OpenAI', {
    failureThreshold: 3,        // 3 falhas consecutivas
    recoveryTimeout: 30000,     // 30 segundos
    monitoringPeriod: 15000,    // 15 segundos
    halfOpenMaxCalls: 2,        // Máximo 2 calls em HALF_OPEN
    successThreshold: 2         // 2 sucessos para fechar
  }, {
    onStateChange: (from, to) => {
      console.log(`🤖 OpenAI Circuit Breaker: ${from} → ${to}`)
    },
    onFailure: (error) => {
      console.warn('🚨 OpenAI call failed:', error.message)
    },
    onCircuitOpen: () => {
      console.error('🛑 OpenAI Circuit Breaker OPENED - API calls blocked')
    },
    onCircuitClosed: () => {
      console.log('✅ OpenAI Circuit Breaker CLOSED - API calls restored')
    }
  })
}

/**
 * 🛠️ Utilities
 */

export const circuitBreakerUtils = {
  // Helper para criar múltiplos circuit breakers
  createMultiple: (configs: Array<{ name: string; config?: Partial<CircuitBreakerConfig> }>) => {
    const breakers = new Map<string, CircuitBreaker<any>>()

    configs.forEach(({ name, config }) => {
      breakers.set(name, createCircuitBreaker(name, config))
    })

    return breakers
  },

  // Agregador de métricas
  aggregateMetrics: (breakers: CircuitBreaker<any>[]): {
    totalCalls: number
    totalFailures: number
    averageFailureRate: number
    openCircuits: number
  } => {
    const metrics = breakers.map(cb => cb.getMetrics())

    const totalCalls = metrics.reduce((sum, m) => sum + m.totalCalls, 0)
    const totalFailures = metrics.reduce((sum, m) => sum + m.failures, 0)
    const openCircuits = metrics.filter(m => m.state === 'OPEN').length

    return {
      totalCalls,
      totalFailures,
      averageFailureRate: totalCalls > 0 ? (totalFailures / totalCalls) * 100 : 0,
      openCircuits
    }
  },

  // Health check de circuit breakers
  healthCheck: (breakers: CircuitBreaker<any>[]): {
    healthy: boolean
    issues: string[]
    metrics: any
  } => {
    const metrics = circuitBreakerUtils.aggregateMetrics(breakers)
    const issues: string[] = []

    if (metrics.openCircuits > 0) {
      issues.push(`${metrics.openCircuits} circuit breaker(s) open`)
    }

    if (metrics.averageFailureRate > 50) {
      issues.push(`High failure rate: ${Math.round(metrics.averageFailureRate)}%`)
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics
    }
  }
}