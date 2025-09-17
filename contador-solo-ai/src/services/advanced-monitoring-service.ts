'use client'

import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import { parallelQueryEngine } from './parallel-query-engine'
import { predictiveCacheService } from './predictive-cache-service'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA MONITORING AVANÇADO
// =====================================================

export interface SystemMetrics {
  timestamp: Date
  performance: {
    avgResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    throughput: number
    errorRate: number
  }
  resources: {
    memoryUsage: number
    cpuUsage: number
    cacheSize: number
    activeConnections: number
  }
  cache: {
    hitRate: number
    missRate: number
    evictionRate: number
    predictiveAccuracy: number
  }
  queries: {
    totalQueries: number
    successfulQueries: number
    failedQueries: number
    avgQueryTime: number
  }
}

export interface Alert {
  id: string
  type: 'performance' | 'error' | 'resource' | 'cache' | 'prediction'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  timestamp: Date
  metrics: Record<string, any>
  resolved: boolean
  resolvedAt?: Date
  actions: AlertAction[]
}

export interface AlertAction {
  type: 'auto' | 'manual'
  description: string
  executed: boolean
  executedAt?: Date
  result?: string
}

export interface MonitoringRule {
  id: string
  name: string
  type: Alert['type']
  condition: (metrics: SystemMetrics) => boolean
  severity: Alert['severity']
  cooldown: number // ms
  autoResolve: boolean
  actions: AlertAction[]
}

export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'down'
  components: {
    aiContextService: ComponentHealth
    cacheService: ComponentHealth
    queryEngine: ComponentHealth
    predictiveCache: ComponentHealth
  }
  uptime: number
  lastCheck: Date
}

export interface ComponentHealth {
  status: 'healthy' | 'warning' | 'critical' | 'down'
  responseTime: number
  errorRate: number
  lastError?: string
  metrics: Record<string, any>
}

// =====================================================
// ADVANCED MONITORING SERVICE
// =====================================================

export class AdvancedMonitoringService {
  private metrics: SystemMetrics[] = []
  private alerts: Alert[] = []
  private monitoringRules: MonitoringRule[] = []
  private lastAlertTimes = new Map<string, number>()
  
  private monitoringInterval?: NodeJS.Timeout
  private alertProcessingInterval?: NodeJS.Timeout
  private readonly METRICS_RETENTION_HOURS = 24
  private readonly MAX_METRICS_COUNT = 1440 // 24h com coleta a cada minuto

  constructor() {
    this.initializeDefaultRules()
    this.startMonitoring()
  }

  /**
   * Coleta métricas do sistema
   */
  async collectMetrics(): Promise<Result<SystemMetrics, ContextError>> {
    const operationContext = createOperationContext('collect_metrics', 'system')

    return await measureOperation('collectMetrics', async () => {
      try {
        const timestamp = new Date()

        // Coletar métricas de performance
        const performanceMetrics = this.collectPerformanceMetrics()
        
        // Coletar métricas de recursos
        const resourceMetrics = await this.collectResourceMetrics()
        
        // Coletar métricas de cache
        const cacheMetrics = this.collectCacheMetrics()
        
        // Coletar métricas de queries
        const queryMetrics = this.collectQueryMetrics()

        const systemMetrics: SystemMetrics = {
          timestamp,
          performance: performanceMetrics,
          resources: resourceMetrics,
          cache: cacheMetrics,
          queries: queryMetrics
        }

        // Armazenar métricas
        this.metrics.push(systemMetrics)
        
        // Manter apenas métricas recentes
        if (this.metrics.length > this.MAX_METRICS_COUNT) {
          this.metrics = this.metrics.slice(-this.MAX_METRICS_COUNT)
        }

        // Verificar regras de alerta
        this.checkAlertRules(systemMetrics)

        return { success: true, data: systemMetrics }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to collect system metrics',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          {},
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        logger.error('Metrics collection failed', {
          error: contextError.toJSON(),
          traceId: operationContext.traceId
        })

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Verifica o status de saúde do sistema
   */
  async checkHealth(): Promise<Result<HealthStatus, ContextError>> {
    const operationContext = createOperationContext('check_health', 'system')

    return await measureOperation('checkHealth', async () => {
      try {
        const lastCheck = new Date()
        
        // Verificar componentes individuais
        const components = {
          aiContextService: await this.checkComponentHealth('aiContextService'),
          cacheService: await this.checkComponentHealth('cacheService'),
          queryEngine: await this.checkComponentHealth('queryEngine'),
          predictiveCache: await this.checkComponentHealth('predictiveCache')
        }

        // Determinar status geral
        const componentStatuses = Object.values(components).map(c => c.status)
        const overall = this.determineOverallHealth(componentStatuses)

        // Calcular uptime
        const uptime = this.calculateUptime()

        const healthStatus: HealthStatus = {
          overall,
          components,
          uptime,
          lastCheck
        }

        logger.info('Health check completed', {
          overall,
          componentCount: Object.keys(components).length,
          uptime,
          traceId: operationContext.traceId
        })

        return { success: true, data: healthStatus }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to check system health',
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
   * Cria um alerta
   */
  createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    title: string,
    description: string,
    metrics: Record<string, any>,
    actions: AlertAction[] = []
  ): Alert {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      description,
      timestamp: new Date(),
      metrics,
      resolved: false,
      actions
    }

    this.alerts.push(alert)

    // Executar ações automáticas
    this.executeAutoActions(alert)

    logger.warn('Alert created', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title
    })

    return alert
  }

  /**
   * Resolve um alerta
   */
  resolveAlert(alertId: string, reason?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert || alert.resolved) {
      return false
    }

    alert.resolved = true
    alert.resolvedAt = new Date()

    logger.info('Alert resolved', {
      alertId,
      reason,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    })

    return true
  }

  /**
   * Obtém alertas ativos
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved)
  }

  /**
   * Obtém métricas históricas
   */
  getHistoricalMetrics(hours: number = 1): SystemMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.metrics.filter(m => m.timestamp >= cutoff)
  }

  /**
   * Obtém estatísticas de performance
   */
  getPerformanceStats(hours: number = 1): {
    avgResponseTime: number
    maxResponseTime: number
    minResponseTime: number
    errorRate: number
    throughput: number
  } {
    const recentMetrics = this.getHistoricalMetrics(hours)
    
    if (recentMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        errorRate: 0,
        throughput: 0
      }
    }

    const responseTimes = recentMetrics.map(m => m.performance.avgResponseTime)
    const errorRates = recentMetrics.map(m => m.performance.errorRate)
    const throughputs = recentMetrics.map(m => m.performance.throughput)

    return {
      avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      errorRate: errorRates.reduce((a, b) => a + b, 0) / errorRates.length,
      throughput: throughputs.reduce((a, b) => a + b, 0) / throughputs.length
    }
  }

  /**
   * Métodos privados
   */
  private initializeDefaultRules(): void {
    this.monitoringRules = [
      {
        id: 'high-response-time',
        name: 'High Response Time',
        type: 'performance',
        condition: (metrics) => metrics.performance.avgResponseTime > 5000,
        severity: 'high',
        cooldown: 5 * 60 * 1000, // 5 min
        autoResolve: true,
        actions: [
          {
            type: 'auto',
            description: 'Clear cache to improve performance',
            executed: false
          }
        ]
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        type: 'error',
        condition: (metrics) => metrics.performance.errorRate > 0.05, // 5%
        severity: 'critical',
        cooldown: 2 * 60 * 1000, // 2 min
        autoResolve: false,
        actions: [
          {
            type: 'manual',
            description: 'Investigate error patterns and fix root cause',
            executed: false
          }
        ]
      },
      {
        id: 'low-cache-hit-rate',
        name: 'Low Cache Hit Rate',
        type: 'cache',
        condition: (metrics) => metrics.cache.hitRate < 0.6, // 60%
        severity: 'medium',
        cooldown: 10 * 60 * 1000, // 10 min
        autoResolve: true,
        actions: [
          {
            type: 'auto',
            description: 'Optimize cache strategies',
            executed: false
          }
        ]
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        type: 'resource',
        condition: (metrics) => metrics.resources.memoryUsage > 500 * 1024 * 1024, // 500MB
        severity: 'high',
        cooldown: 5 * 60 * 1000, // 5 min
        autoResolve: true,
        actions: [
          {
            type: 'auto',
            description: 'Trigger garbage collection and cache cleanup',
            executed: false
          }
        ]
      }
    ]
  }

  private startMonitoring(): void {
    // Coleta de métricas a cada minuto
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, 60 * 1000)

    // Processamento de alertas a cada 30 segundos
    this.alertProcessingInterval = setInterval(() => {
      this.processAlerts()
    }, 30 * 1000)
  }

  private collectPerformanceMetrics() {
    // Implementação simplificada - em produção, coletaria métricas reais
    const recentLogs = logger.getLogs({ since: new Date(Date.now() - 60000) })
    const errorLogs = recentLogs.filter(log => log.level === 'error')
    
    return {
      avgResponseTime: 1500, // ms
      p95ResponseTime: 3000,
      p99ResponseTime: 5000,
      throughput: recentLogs.length,
      errorRate: errorLogs.length / Math.max(recentLogs.length, 1)
    }
  }

  private async collectResourceMetrics() {
    // Simular coleta de métricas de recursos
    const memoryUsage = process.memoryUsage?.()?.heapUsed || 0
    
    return {
      memoryUsage,
      cpuUsage: 0.3, // 30%
      cacheSize: unifiedCacheService.getMetrics().cacheSize,
      activeConnections: 5
    }
  }

  private collectCacheMetrics() {
    const cacheMetrics = unifiedCacheService.getMetrics()
    const predictiveStats = predictiveCacheService.getStatistics()
    
    return {
      hitRate: cacheMetrics.hitRate,
      missRate: 1 - cacheMetrics.hitRate,
      evictionRate: cacheMetrics.evictions / Math.max(cacheMetrics.totalRequests, 1),
      predictiveAccuracy: predictiveStats.averageAccuracy
    }
  }

  private collectQueryMetrics() {
    const queryMetrics = parallelQueryEngine.getQueryMetrics()
    const totalQueries = Array.from(queryMetrics.values()).reduce((sum, m) => sum + m.totalExecutions, 0)
    const successfulQueries = Array.from(queryMetrics.values()).reduce((sum, m) => sum + m.successCount, 0)
    const avgQueryTime = Array.from(queryMetrics.values()).reduce((sum, m) => sum + m.averageDuration, 0) / queryMetrics.size || 0
    
    return {
      totalQueries,
      successfulQueries,
      failedQueries: totalQueries - successfulQueries,
      avgQueryTime
    }
  }

  private checkAlertRules(metrics: SystemMetrics): void {
    const now = Date.now()
    
    for (const rule of this.monitoringRules) {
      const lastAlert = this.lastAlertTimes.get(rule.id) || 0
      
      // Verificar cooldown
      if (now - lastAlert < rule.cooldown) {
        continue
      }

      // Verificar condição
      if (rule.condition(metrics)) {
        this.createAlert(
          rule.type,
          rule.severity,
          rule.name,
          `Alert triggered: ${rule.name}`,
          { rule: rule.id, metrics },
          [...rule.actions]
        )
        
        this.lastAlertTimes.set(rule.id, now)
      }
    }
  }

  private async checkComponentHealth(component: string): Promise<ComponentHealth> {
    try {
      const startTime = Date.now()
      
      // Simular verificação de saúde do componente
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const responseTime = Date.now() - startTime
      
      return {
        status: 'healthy',
        responseTime,
        errorRate: 0,
        metrics: {}
      }
    } catch (error) {
      return {
        status: 'critical',
        responseTime: 0,
        errorRate: 1,
        lastError: error instanceof Error ? error.message : String(error),
        metrics: {}
      }
    }
  }

  private determineOverallHealth(statuses: ComponentHealth['status'][]): HealthStatus['overall'] {
    if (statuses.some(s => s === 'down')) return 'down'
    if (statuses.some(s => s === 'critical')) return 'critical'
    if (statuses.some(s => s === 'warning')) return 'warning'
    return 'healthy'
  }

  private calculateUptime(): number {
    // Simular cálculo de uptime
    return 99.9 // 99.9%
  }

  private executeAutoActions(alert: Alert): void {
    alert.actions
      .filter(action => action.type === 'auto' && !action.executed)
      .forEach(action => {
        try {
          // Executar ação automática baseada no tipo
          this.executeAction(action, alert)
          
          action.executed = true
          action.executedAt = new Date()
          action.result = 'success'
          
          logger.info('Auto action executed', {
            alertId: alert.id,
            action: action.description
          })
        } catch (error) {
          action.result = error instanceof Error ? error.message : String(error)
          
          logger.error('Auto action failed', {
            alertId: alert.id,
            action: action.description,
            error: action.result
          })
        }
      })
  }

  private executeAction(action: AlertAction, alert: Alert): void {
    // Implementar ações automáticas baseadas na descrição
    if (action.description.includes('Clear cache')) {
      unifiedCacheService.clear()
    } else if (action.description.includes('garbage collection')) {
      // Trigger GC se disponível
      if (global.gc) {
        global.gc()
      }
    }
  }

  private processAlerts(): void {
    // Processar alertas pendentes, auto-resolver, etc.
    const activeAlerts = this.getActiveAlerts()
    
    activeAlerts.forEach(alert => {
      // Auto-resolver alertas se a condição não existe mais
      const rule = this.monitoringRules.find(r => r.id === alert.metrics?.rule)
      if (rule?.autoResolve && this.metrics.length > 0) {
        const latestMetrics = this.metrics[this.metrics.length - 1]
        if (latestMetrics && !rule.condition(latestMetrics)) {
          this.resolveAlert(alert.id, 'Auto-resolved: condition no longer met')
        }
      }
    })
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    if (this.alertProcessingInterval) {
      clearInterval(this.alertProcessingInterval)
    }
    this.metrics = []
    this.alerts = []
    this.lastAlertTimes.clear()
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const advancedMonitoringService = new AdvancedMonitoringService()
