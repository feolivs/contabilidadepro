'use client'

import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import { parallelQueryEngine } from './parallel-query-engine'
import { predictiveCacheService } from './predictive-cache-service'
import { advancedMonitoringService } from './advanced-monitoring-service'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA AUTO-SCALING
// =====================================================

export interface ScalingMetrics {
  timestamp: Date
  load: {
    requestsPerMinute: number
    avgResponseTime: number
    errorRate: number
    queueLength: number
  }
  resources: {
    memoryUsage: number
    cpuUsage: number
    cacheUtilization: number
    connectionCount: number
  }
  performance: {
    throughput: number
    latency: number
    cacheHitRate: number
    querySuccessRate: number
  }
}

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'optimize' | 'maintain'
  reason: string
  confidence: number
  parameters: {
    cacheSize?: number
    queryTimeout?: number
    maxConcurrency?: number
    prefetchAggressiveness?: number
  }
  estimatedImpact: {
    performanceImprovement: number
    resourceUsage: number
    cost: number
  }
}

export interface OptimizationRule {
  id: string
  name: string
  condition: (metrics: ScalingMetrics) => boolean
  action: (metrics: ScalingMetrics) => ScalingDecision
  priority: number
  cooldown: number
  enabled: boolean
}

export interface ResourceLimits {
  maxMemoryUsage: number
  maxCacheSize: number
  maxConcurrentQueries: number
  maxConnectionCount: number
  emergencyThresholds: {
    memoryUsage: number
    errorRate: number
    responseTime: number
  }
}

// =====================================================
// AUTO-SCALING SERVICE
// =====================================================

export class AutoScalingService {
  private scalingHistory: ScalingDecision[] = []
  private optimizationRules: OptimizationRule[] = []
  private resourceLimits: ResourceLimits
  private lastScalingActions = new Map<string, number>()
  
  private scalingInterval?: NodeJS.Timeout
  private optimizationInterval?: NodeJS.Timeout
  private emergencyCheckInterval?: NodeJS.Timeout

  constructor() {
    this.resourceLimits = this.getDefaultResourceLimits()
    this.initializeOptimizationRules()
    this.startAutoScaling()
  }

  /**
   * Analisa métricas e toma decisões de scaling
   */
  async analyzeAndScale(): Promise<Result<ScalingDecision, ContextError>> {
    const operationContext = createOperationContext('analyze_and_scale', 'system')

    return await measureOperation('analyzeAndScale', async () => {
      try {
        // Coletar métricas atuais
        const metrics = await this.collectScalingMetrics()
        
        // Verificar condições de emergência primeiro
        const emergencyDecision = this.checkEmergencyConditions(metrics)
        if (emergencyDecision) {
          await this.executeScalingDecision(emergencyDecision)
          return { success: true, data: emergencyDecision }
        }

        // Analisar regras de otimização
        const decision = this.analyzeOptimizationRules(metrics)
        
        if (decision.action !== 'maintain') {
          await this.executeScalingDecision(decision)
          this.scalingHistory.push(decision)
          
          // Manter histórico limitado
          if (this.scalingHistory.length > 100) {
            this.scalingHistory = this.scalingHistory.slice(-100)
          }
        }

        logger.info('Scaling analysis completed', {
          action: decision.action,
          reason: decision.reason,
          confidence: decision.confidence,
          traceId: operationContext.traceId
        })

        return { success: true, data: decision }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to analyze and scale system',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          {},
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        logger.error('Scaling analysis failed', {
          error: contextError.toJSON(),
          traceId: operationContext.traceId
        })

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Otimiza configurações baseado no histórico
   */
  async optimizeConfiguration(): Promise<Result<void, ContextError>> {
    const operationContext = createOperationContext('optimize_configuration', 'system')

    return await measureOperation('optimizeConfiguration', async () => {
      try {
        const recentDecisions = this.scalingHistory.slice(-20)
        
        if (recentDecisions.length < 5) {
          return { success: true, data: undefined }
        }

        // Analisar padrões de scaling
        const patterns = this.analyzeScalingPatterns(recentDecisions)
        
        // Ajustar regras baseado nos padrões
        this.adjustOptimizationRules(patterns)
        
        // Otimizar cache strategies
        await this.optimizeCacheStrategies(patterns)
        
        // Ajustar limites de recursos
        this.adjustResourceLimits(patterns)

        logger.info('Configuration optimization completed', {
          patternsFound: patterns.length,
          rulesAdjusted: this.optimizationRules.filter(r => r.enabled).length,
          traceId: operationContext.traceId
        })

        return { success: true, data: undefined }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to optimize configuration',
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
   * Obtém recomendações de otimização
   */
  getOptimizationRecommendations(): {
    immediate: string[]
    shortTerm: string[]
    longTerm: string[]
  } {
    const recommendations = {
      immediate: [] as string[],
      shortTerm: [] as string[],
      longTerm: [] as string[]
    }

    // Analisar métricas recentes
    const recentMetrics = this.getRecentMetrics()
    
    if (recentMetrics.performance.cacheHitRate < 0.7) {
      recommendations.immediate.push('Otimizar estratégias de cache para melhorar hit rate')
    }

    if (recentMetrics.load.avgResponseTime > 3000) {
      recommendations.immediate.push('Implementar cache preditivo mais agressivo')
    }

    if (recentMetrics.resources.memoryUsage > this.resourceLimits.maxMemoryUsage * 0.8) {
      recommendations.shortTerm.push('Considerar aumentar limites de memória ou otimizar uso')
    }

    if (recentMetrics.load.errorRate > 0.02) {
      recommendations.immediate.push('Investigar e corrigir causas de erros')
    }

    // Recomendações baseadas em padrões históricos
    const patterns = this.analyzeScalingPatterns(this.scalingHistory.slice(-50))
    
    if (patterns.some(p => p.type === 'frequent_scaling')) {
      recommendations.shortTerm.push('Ajustar thresholds de scaling para reduzir oscilações')
    }

    if (patterns.some(p => p.type === 'resource_pressure')) {
      recommendations.longTerm.push('Planejar upgrade de infraestrutura')
    }

    return recommendations
  }

  /**
   * Métodos privados
   */
  private async collectScalingMetrics(): Promise<ScalingMetrics> {
    const healthResult = await advancedMonitoringService.checkHealth()
    const performanceStats = advancedMonitoringService.getPerformanceStats()
    const cacheMetrics = unifiedCacheService.getMetrics()
    const queryMetrics = parallelQueryEngine.getQueryMetrics()

    const totalQueries = Array.from(queryMetrics.values()).reduce((sum, m) => sum + m.totalExecutions, 0)
    const successfulQueries = Array.from(queryMetrics.values()).reduce((sum, m) => sum + m.successCount, 0)

    return {
      timestamp: new Date(),
      load: {
        requestsPerMinute: performanceStats.throughput,
        avgResponseTime: performanceStats.avgResponseTime,
        errorRate: performanceStats.errorRate,
        queueLength: 0 // Implementar se necessário
      },
      resources: {
        memoryUsage: process.memoryUsage?.()?.heapUsed || 0,
        cpuUsage: 0.3, // Simulated
        cacheUtilization: cacheMetrics.cacheSize / (cacheMetrics.cacheSize + 1000),
        connectionCount: 5 // Simulated
      },
      performance: {
        throughput: performanceStats.throughput,
        latency: performanceStats.avgResponseTime,
        cacheHitRate: cacheMetrics.hitRate,
        querySuccessRate: totalQueries > 0 ? successfulQueries / totalQueries : 1
      }
    }
  }

  private checkEmergencyConditions(metrics: ScalingMetrics): ScalingDecision | null {
    const { emergencyThresholds } = this.resourceLimits

    // Verificar uso crítico de memória
    if (metrics.resources.memoryUsage > emergencyThresholds.memoryUsage) {
      return {
        action: 'optimize',
        reason: 'Emergency: Critical memory usage detected',
        confidence: 1.0,
        parameters: {
          cacheSize: Math.floor(unifiedCacheService.getMetrics().cacheSize * 0.5)
        },
        estimatedImpact: {
          performanceImprovement: -0.2,
          resourceUsage: -0.4,
          cost: 0
        }
      }
    }

    // Verificar taxa de erro crítica
    if (metrics.load.errorRate > emergencyThresholds.errorRate) {
      return {
        action: 'optimize',
        reason: 'Emergency: High error rate detected',
        confidence: 0.9,
        parameters: {
          queryTimeout: 10000,
          maxConcurrency: 3
        },
        estimatedImpact: {
          performanceImprovement: 0.3,
          resourceUsage: -0.1,
          cost: 0
        }
      }
    }

    // Verificar tempo de resposta crítico
    if (metrics.load.avgResponseTime > emergencyThresholds.responseTime) {
      return {
        action: 'scale_up',
        reason: 'Emergency: Critical response time detected',
        confidence: 0.8,
        parameters: {
          cacheSize: Math.floor(unifiedCacheService.getMetrics().cacheSize * 1.5),
          prefetchAggressiveness: 0.8
        },
        estimatedImpact: {
          performanceImprovement: 0.4,
          resourceUsage: 0.2,
          cost: 0.1
        }
      }
    }

    return null
  }

  private analyzeOptimizationRules(metrics: ScalingMetrics): ScalingDecision {
    const now = Date.now()
    
    // Verificar regras por prioridade
    const sortedRules = [...this.optimizationRules]
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority)

    for (const rule of sortedRules) {
      const lastAction = this.lastScalingActions.get(rule.id) || 0
      
      // Verificar cooldown
      if (now - lastAction < rule.cooldown) {
        continue
      }

      // Verificar condição
      if (rule.condition(metrics)) {
        const decision = rule.action(metrics)
        this.lastScalingActions.set(rule.id, now)
        return decision
      }
    }

    return {
      action: 'maintain',
      reason: 'System operating within normal parameters',
      confidence: 0.7,
      parameters: {},
      estimatedImpact: {
        performanceImprovement: 0,
        resourceUsage: 0,
        cost: 0
      }
    }
  }

  private async executeScalingDecision(decision: ScalingDecision): Promise<void> {
    logger.info('Executing scaling decision', {
      action: decision.action,
      reason: decision.reason,
      parameters: decision.parameters
    })

    try {
      switch (decision.action) {
        case 'scale_up':
          await this.scaleUp(decision.parameters)
          break
        case 'scale_down':
          await this.scaleDown(decision.parameters)
          break
        case 'optimize':
          await this.optimize(decision.parameters)
          break
        case 'maintain':
          // Nenhuma ação necessária
          break
      }
    } catch (error) {
      logger.error('Failed to execute scaling decision', {
        action: decision.action,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async scaleUp(parameters: ScalingDecision['parameters']): Promise<void> {
    if (parameters.cacheSize) {
      // Aumentar tamanho do cache
      // Note: UnifiedCacheService doesn't have updateConfiguration method
      // This would need to be implemented or handled differently
      logger.info('Cache size scaling requested', {
        newSize: parameters.cacheSize
      })
    }

    if (parameters.prefetchAggressiveness) {
      // Aumentar agressividade do prefetch
      // Implementar se necessário
    }

    if (parameters.maxConcurrency) {
      // Aumentar concorrência máxima
      // Implementar se necessário
    }
  }

  private async scaleDown(parameters: ScalingDecision['parameters']): Promise<void> {
    if (parameters.cacheSize) {
      // Reduzir tamanho do cache
      // Note: UnifiedCacheService doesn't have updateConfiguration method
      // This would need to be implemented or handled differently
      logger.info('Cache size scaling down requested', {
        newSize: parameters.cacheSize
      })
    }

    if (parameters.maxConcurrency) {
      // Reduzir concorrência máxima
      // Implementar se necessário
    }
  }

  private async optimize(parameters: ScalingDecision['parameters']): Promise<void> {
    if (parameters.cacheSize !== undefined) {
      // Otimizar cache
      if (parameters.cacheSize < unifiedCacheService.getMetrics().cacheSize) {
        unifiedCacheService.clear()
      }
    }

    if (parameters.queryTimeout) {
      // Ajustar timeouts
      // Implementar se necessário
    }

    // Trigger garbage collection se disponível
    if (global.gc) {
      global.gc()
    }
  }

  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      {
        id: 'high-load-scale-up',
        name: 'Scale up on high load',
        condition: (metrics) => 
          metrics.load.requestsPerMinute > 100 && 
          metrics.load.avgResponseTime > 2000,
        action: (metrics) => ({
          action: 'scale_up',
          reason: 'High load detected, scaling up cache and concurrency',
          confidence: 0.8,
          parameters: {
            cacheSize: Math.floor(unifiedCacheService.getMetrics().cacheSize * 1.3),
            maxConcurrency: 8
          },
          estimatedImpact: {
            performanceImprovement: 0.3,
            resourceUsage: 0.2,
            cost: 0.1
          }
        }),
        priority: 9,
        cooldown: 5 * 60 * 1000, // 5 min
        enabled: true
      },
      {
        id: 'low-cache-hit-optimize',
        name: 'Optimize on low cache hit rate',
        condition: (metrics) => metrics.performance.cacheHitRate < 0.6,
        action: (metrics) => ({
          action: 'optimize',
          reason: 'Low cache hit rate, optimizing cache strategies',
          confidence: 0.7,
          parameters: {
            prefetchAggressiveness: 0.8
          },
          estimatedImpact: {
            performanceImprovement: 0.2,
            resourceUsage: 0.1,
            cost: 0
          }
        }),
        priority: 7,
        cooldown: 10 * 60 * 1000, // 10 min
        enabled: true
      },
      {
        id: 'low-load-scale-down',
        name: 'Scale down on low load',
        condition: (metrics) => 
          metrics.load.requestsPerMinute < 20 && 
          metrics.load.avgResponseTime < 1000 &&
          metrics.resources.memoryUsage < this.resourceLimits.maxMemoryUsage * 0.3,
        action: (metrics) => ({
          action: 'scale_down',
          reason: 'Low load detected, scaling down to save resources',
          confidence: 0.6,
          parameters: {
            cacheSize: Math.floor(unifiedCacheService.getMetrics().cacheSize * 0.8),
            maxConcurrency: 4
          },
          estimatedImpact: {
            performanceImprovement: -0.1,
            resourceUsage: -0.2,
            cost: -0.1
          }
        }),
        priority: 5,
        cooldown: 15 * 60 * 1000, // 15 min
        enabled: true
      }
    ]
  }

  private getDefaultResourceLimits(): ResourceLimits {
    return {
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB
      maxCacheSize: 1000,
      maxConcurrentQueries: 10,
      maxConnectionCount: 20,
      emergencyThresholds: {
        memoryUsage: 800 * 1024 * 1024, // 800MB
        errorRate: 0.1, // 10%
        responseTime: 10000 // 10s
      }
    }
  }

  private startAutoScaling(): void {
    // Análise de scaling a cada 2 minutos
    this.scalingInterval = setInterval(() => {
      this.analyzeAndScale()
    }, 2 * 60 * 1000)

    // Otimização de configuração a cada 30 minutos
    this.optimizationInterval = setInterval(() => {
      this.optimizeConfiguration()
    }, 30 * 60 * 1000)

    // Verificação de emergência a cada 30 segundos
    this.emergencyCheckInterval = setInterval(async () => {
      const metrics = await this.collectScalingMetrics()
      const emergency = this.checkEmergencyConditions(metrics)
      if (emergency) {
        await this.executeScalingDecision(emergency)
      }
    }, 30 * 1000)
  }

  private analyzeScalingPatterns(decisions: ScalingDecision[]): Array<{
    type: string
    frequency: number
    impact: number
  }> {
    // Implementação simplificada de análise de padrões
    const patterns = []
    
    const scaleUpCount = decisions.filter(d => d.action === 'scale_up').length
    const scaleDownCount = decisions.filter(d => d.action === 'scale_down').length
    
    if (scaleUpCount > decisions.length * 0.3) {
      patterns.push({
        type: 'frequent_scaling_up',
        frequency: scaleUpCount / decisions.length,
        impact: 0.2
      })
    }

    if (scaleUpCount + scaleDownCount > decisions.length * 0.5) {
      patterns.push({
        type: 'frequent_scaling',
        frequency: (scaleUpCount + scaleDownCount) / decisions.length,
        impact: 0.1
      })
    }

    return patterns
  }

  private adjustOptimizationRules(patterns: Array<{ type: string; frequency: number; impact: number }>): void {
    // Ajustar regras baseado nos padrões identificados
    patterns.forEach(pattern => {
      if (pattern.type === 'frequent_scaling' && pattern.frequency > 0.5) {
        // Aumentar cooldowns para reduzir oscilações
        this.optimizationRules.forEach(rule => {
          rule.cooldown = Math.min(rule.cooldown * 1.5, 30 * 60 * 1000)
        })
      }
    })
  }

  private async optimizeCacheStrategies(patterns: Array<{ type: string; frequency: number; impact: number }>): Promise<void> {
    // Otimizar estratégias de cache baseado nos padrões
    // Implementação específica seria adicionada aqui
  }

  private adjustResourceLimits(patterns: Array<{ type: string; frequency: number; impact: number }>): void {
    // Ajustar limites de recursos baseado nos padrões
    patterns.forEach(pattern => {
      if (pattern.type === 'resource_pressure') {
        this.resourceLimits.maxMemoryUsage *= 1.1
        this.resourceLimits.maxCacheSize = Math.floor(this.resourceLimits.maxCacheSize * 1.1)
      }
    })
  }

  private getRecentMetrics(): ScalingMetrics {
    // Retornar métricas simuladas para exemplo
    return {
      timestamp: new Date(),
      load: {
        requestsPerMinute: 50,
        avgResponseTime: 1500,
        errorRate: 0.01,
        queueLength: 0
      },
      resources: {
        memoryUsage: 200 * 1024 * 1024,
        cpuUsage: 0.3,
        cacheUtilization: 0.7,
        connectionCount: 5
      },
      performance: {
        throughput: 50,
        latency: 1500,
        cacheHitRate: 0.75,
        querySuccessRate: 0.99
      }
    }
  }

  /**
   * Obtém histórico de decisões de scaling
   */
  getScalingHistory(): ScalingDecision[] {
    return [...this.scalingHistory]
  }

  /**
   * Obtém configuração atual de limites
   */
  getResourceLimits(): ResourceLimits {
    return { ...this.resourceLimits }
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval)
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval)
    }
    if (this.emergencyCheckInterval) {
      clearInterval(this.emergencyCheckInterval)
    }
    this.scalingHistory = []
    this.lastScalingActions.clear()
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const autoScalingService = new AutoScalingService()
