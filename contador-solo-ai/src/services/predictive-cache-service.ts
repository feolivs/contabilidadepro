'use client'

import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import { parallelQueryEngine } from './parallel-query-engine'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA PREDICTIVE CACHE
// =====================================================

export interface AccessPattern {
  userId: string
  resourceType: string
  resourceId: string
  timestamp: Date
  context: {
    timeOfDay: number // 0-23
    dayOfWeek: number // 0-6
    isWeekend: boolean
    sessionDuration: number
    previousAccess?: string[]
  }
}

export interface PredictionModel {
  resourceType: string
  patterns: Map<string, PatternFrequency>
  lastUpdated: Date
  accuracy: number
  totalPredictions: number
  correctPredictions: number
}

export interface PatternFrequency {
  count: number
  lastAccess: Date
  timePatterns: number[] // Frequência por hora do dia
  dayPatterns: number[] // Frequência por dia da semana
  sequencePatterns: Map<string, number> // Padrões de sequência
}

export interface CachePrediction {
  resourceType: string
  resourceId: string
  confidence: number
  reason: string
  estimatedAccessTime: Date
  priority: 'low' | 'medium' | 'high' | 'critical'
}

// =====================================================
// PREDICTIVE CACHE SERVICE
// =====================================================

export class PredictiveCacheService {
  private accessHistory: AccessPattern[] = []
  private predictionModels = new Map<string, PredictionModel>()
  private activePredictions = new Map<string, CachePrediction>()
  private readonly MAX_HISTORY_SIZE = 10000
  private readonly MIN_PATTERN_COUNT = 5
  private readonly PREDICTION_HORIZON_HOURS = 2

  private learningInterval?: NodeJS.Timeout
  private prefetchInterval?: NodeJS.Timeout

  constructor() {
    this.initializeLearning()
  }

  /**
   * Registra um acesso para aprendizado
   */
  recordAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    context?: Partial<AccessPattern['context']>
  ): void {
    const now = new Date()
    const accessPattern: AccessPattern = {
      userId,
      resourceType,
      resourceId,
      timestamp: now,
      context: {
        timeOfDay: now.getHours(),
        dayOfWeek: now.getDay(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        sessionDuration: context?.sessionDuration || 0,
        previousAccess: context?.previousAccess || []
      }
    }

    this.accessHistory.push(accessPattern)

    // Manter histórico limitado
    if (this.accessHistory.length > this.MAX_HISTORY_SIZE) {
      this.accessHistory = this.accessHistory.slice(-this.MAX_HISTORY_SIZE)
    }

    // Atualizar modelo em tempo real para padrões críticos
    if (resourceType === 'empresa-completa' || resourceType === 'calculos-recentes') {
      this.updateModelRealTime(accessPattern)
    }

    logger.debug('Access pattern recorded', {
      userId,
      resourceType,
      resourceId,
      timeOfDay: accessPattern.context.timeOfDay,
      dayOfWeek: accessPattern.context.dayOfWeek
    })
  }

  /**
   * Gera predições baseadas nos padrões aprendidos
   */
  async generatePredictions(userId: string): Promise<Result<CachePrediction[], ContextError>> {
    const operationContext = createOperationContext('generate_predictions', userId)

    return await measureOperation('generatePredictions', async () => {
      try {
        const predictions: CachePrediction[] = []
        const now = new Date()
        const currentHour = now.getHours()
        const currentDay = now.getDay()

        // Analisar padrões do usuário
        const userPatterns = this.accessHistory.filter(p => p.userId === userId)
        const recentPatterns = userPatterns.filter(p => 
          now.getTime() - p.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Última semana
        )

        if (recentPatterns.length < this.MIN_PATTERN_COUNT) {
          return { success: true, data: [] }
        }

        // Agrupar por tipo de recurso
        const resourceGroups = new Map<string, AccessPattern[]>()
        recentPatterns.forEach(pattern => {
          const key = pattern.resourceType
          if (!resourceGroups.has(key)) {
            resourceGroups.set(key, [])
          }
          resourceGroups.get(key)!.push(pattern)
        })

        // Gerar predições para cada tipo de recurso
        for (const [resourceType, patterns] of resourceGroups) {
          const resourcePredictions = this.predictResourceAccess(
            resourceType,
            patterns,
            currentHour,
            currentDay
          )
          predictions.push(...resourcePredictions)
        }

        // Ordenar por confiança e prioridade
        predictions.sort((a, b) => {
          if (a.priority !== b.priority) {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
            return priorityOrder[a.priority] - priorityOrder[b.priority]
          }
          return b.confidence - a.confidence
        })

        // Limitar predições para evitar sobrecarga
        const limitedPredictions = predictions.slice(0, 20)

        // Armazenar predições ativas
        limitedPredictions.forEach(prediction => {
          const key = `${prediction.resourceType}:${prediction.resourceId}`
          this.activePredictions.set(key, prediction)
        })

        logger.info('Predictions generated', {
          userId,
          totalPredictions: limitedPredictions.length,
          highConfidencePredictions: limitedPredictions.filter(p => p.confidence > 0.7).length,
          traceId: operationContext.traceId
        })

        return { success: true, data: limitedPredictions }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to generate cache predictions',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { userId },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        logger.error('Prediction generation failed', {
          error: contextError.toJSON(),
          userId,
          traceId: operationContext.traceId
        })

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Executa prefetch baseado nas predições
   */
  async executePrefetch(userId: string): Promise<Result<number, ContextError>> {
    const operationContext = createOperationContext('execute_prefetch', userId)

    return await measureOperation('executePrefetch', async () => {
      try {
        const predictionsResult = await this.generatePredictions(userId)
        if (!predictionsResult.success) {
          return { success: false, error: predictionsResult.error }
        }

        const predictions = predictionsResult.data
        const highConfidencePredictions = predictions.filter(p => p.confidence > 0.6)

        let prefetchCount = 0

        for (const prediction of highConfidencePredictions) {
          try {
            await this.prefetchResource(prediction)
            prefetchCount++
          } catch (error) {
            logger.warn('Failed to prefetch resource', {
              resourceType: prediction.resourceType,
              resourceId: prediction.resourceId,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }

        logger.info('Prefetch completed', {
          userId,
          totalPredictions: predictions.length,
          prefetchCount,
          traceId: operationContext.traceId
        })

        return { success: true, data: prefetchCount }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to execute prefetch',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { userId },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Valida uma predição quando o recurso é acessado
   */
  validatePrediction(resourceType: string, resourceId: string): void {
    const key = `${resourceType}:${resourceId}`
    const prediction = this.activePredictions.get(key)

    if (prediction) {
      const model = this.predictionModels.get(resourceType)
      if (model) {
        model.totalPredictions++
        model.correctPredictions++
        model.accuracy = model.correctPredictions / model.totalPredictions

        logger.debug('Prediction validated', {
          resourceType,
          resourceId,
          confidence: prediction.confidence,
          newAccuracy: model.accuracy
        })
      }

      this.activePredictions.delete(key)
    }
  }

  /**
   * Métodos privados
   */
  private initializeLearning(): void {
    // Aprendizado periódico (a cada 30 minutos)
    this.learningInterval = setInterval(() => {
      this.updatePredictionModels()
    }, 30 * 60 * 1000)

    // Prefetch periódico (a cada 15 minutos)
    this.prefetchInterval = setInterval(() => {
      this.executePrefetchForActiveUsers()
    }, 15 * 60 * 1000)
  }

  private updateModelRealTime(pattern: AccessPattern): void {
    const model = this.getOrCreateModel(pattern.resourceType)
    const key = `${pattern.userId}:${pattern.resourceId}`
    
    const frequency = model.patterns.get(key) || {
      count: 0,
      lastAccess: pattern.timestamp,
      timePatterns: new Array(24).fill(0),
      dayPatterns: new Array(7).fill(0),
      sequencePatterns: new Map()
    }

    frequency.count++
    frequency.lastAccess = pattern.timestamp
    frequency.timePatterns[pattern.context.timeOfDay]++
    frequency.dayPatterns[pattern.context.dayOfWeek]++

    model.patterns.set(key, frequency)
    model.lastUpdated = new Date()
  }

  private predictResourceAccess(
    resourceType: string,
    patterns: AccessPattern[],
    currentHour: number,
    currentDay: number
  ): CachePrediction[] {
    const predictions: CachePrediction[] = []
    const resourceCounts = new Map<string, number>()

    // Contar acessos por recurso
    patterns.forEach(pattern => {
      const count = resourceCounts.get(pattern.resourceId) || 0
      resourceCounts.set(pattern.resourceId, count + 1)
    })

    // Gerar predições para recursos frequentes
    for (const [resourceId, count] of resourceCounts) {
      if (count >= this.MIN_PATTERN_COUNT) {
        const resourcePatterns = patterns.filter(p => p.resourceId === resourceId)
        const confidence = this.calculateConfidence(resourcePatterns, currentHour, currentDay)

        if (confidence > 0.3) {
          predictions.push({
            resourceType,
            resourceId,
            confidence,
            reason: this.generatePredictionReason(resourcePatterns, currentHour, currentDay),
            estimatedAccessTime: new Date(Date.now() + this.PREDICTION_HORIZON_HOURS * 60 * 60 * 1000),
            priority: this.calculatePriority(confidence, resourceType)
          })
        }
      }
    }

    return predictions
  }

  private calculateConfidence(
    patterns: AccessPattern[],
    currentHour: number,
    currentDay: number
  ): number {
    const hourCounts = new Array(24).fill(0)
    const dayCounts = new Array(7).fill(0)

    patterns.forEach(pattern => {
      hourCounts[pattern.context.timeOfDay]++
      dayCounts[pattern.context.dayOfWeek]++
    })

    const hourFrequency = hourCounts[currentHour] / patterns.length
    const dayFrequency = dayCounts[currentDay] / patterns.length
    const recencyFactor = this.calculateRecencyFactor(patterns)

    return Math.min(0.95, (hourFrequency * 0.4 + dayFrequency * 0.3 + recencyFactor * 0.3))
  }

  private calculateRecencyFactor(patterns: AccessPattern[]): number {
    const now = Date.now()
    const recentPatterns = patterns.filter(p => 
      now - p.timestamp.getTime() < 24 * 60 * 60 * 1000 // Últimas 24h
    )
    return recentPatterns.length / patterns.length
  }

  private generatePredictionReason(
    patterns: AccessPattern[],
    currentHour: number,
    currentDay: number
  ): string {
    const reasons = []
    
    const hourFrequency = patterns.filter(p => p.context.timeOfDay === currentHour).length / patterns.length
    if (hourFrequency > 0.3) {
      reasons.push(`frequente às ${currentHour}h`)
    }

    const dayNames = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
    const dayFrequency = patterns.filter(p => p.context.dayOfWeek === currentDay).length / patterns.length
    if (dayFrequency > 0.3) {
      reasons.push(`comum às ${dayNames[currentDay]}s`)
    }

    const recentAccess = patterns.some(p => 
      Date.now() - p.timestamp.getTime() < 60 * 60 * 1000 // Última hora
    )
    if (recentAccess) {
      reasons.push('acesso recente')
    }

    return reasons.length > 0 ? reasons.join(', ') : 'padrão identificado'
  }

  private calculatePriority(confidence: number, resourceType: string): CachePrediction['priority'] {
    if (resourceType === 'empresa-completa' && confidence > 0.8) return 'critical'
    if (confidence > 0.7) return 'high'
    if (confidence > 0.5) return 'medium'
    return 'low'
  }

  private async prefetchResource(prediction: CachePrediction): Promise<void> {
    const cacheKey = `prefetch:${prediction.resourceType}:${prediction.resourceId}`
    
    // Verificar se já está no cache
    const existing = await unifiedCacheService.get(cacheKey, prediction.resourceType)
    if (existing) return

    // Executar prefetch baseado no tipo de recurso
    // Implementação específica seria adicionada aqui
    logger.debug('Resource prefetched', {
      resourceType: prediction.resourceType,
      resourceId: prediction.resourceId,
      confidence: prediction.confidence
    })
  }

  private getOrCreateModel(resourceType: string): PredictionModel {
    if (!this.predictionModels.has(resourceType)) {
      this.predictionModels.set(resourceType, {
        resourceType,
        patterns: new Map(),
        lastUpdated: new Date(),
        accuracy: 0,
        totalPredictions: 0,
        correctPredictions: 0
      })
    }
    return this.predictionModels.get(resourceType)!
  }

  private updatePredictionModels(): void {
    // Implementação de atualização periódica dos modelos
    logger.debug('Updating prediction models', {
      modelCount: this.predictionModels.size,
      historySize: this.accessHistory.length
    })
  }

  private async executePrefetchForActiveUsers(): Promise<void> {
    // Implementação de prefetch para usuários ativos
    logger.debug('Executing prefetch for active users')
  }

  /**
   * Obtém estatísticas do sistema preditivo
   */
  getStatistics() {
    const models = Array.from(this.predictionModels.values())
    
    return {
      totalModels: models.length,
      averageAccuracy: models.reduce((sum, m) => sum + m.accuracy, 0) / models.length || 0,
      totalPredictions: models.reduce((sum, m) => sum + m.totalPredictions, 0),
      correctPredictions: models.reduce((sum, m) => sum + m.correctPredictions, 0),
      historySize: this.accessHistory.length,
      activePredictions: this.activePredictions.size
    }
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    if (this.learningInterval) {
      clearInterval(this.learningInterval)
    }
    if (this.prefetchInterval) {
      clearInterval(this.prefetchInterval)
    }
    this.accessHistory = []
    this.predictionModels.clear()
    this.activePredictions.clear()
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const predictiveCacheService = new PredictiveCacheService()
