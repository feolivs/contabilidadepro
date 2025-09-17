'use client'

import type {
  CacheStrategy,
  CacheEntry,
  CacheMetrics,
  Result
} from '@/types/ai-context.types'
import { CACHE_STRATEGIES, ERROR_CODES, ContextError } from '@/types/ai-context.types'
import { logger } from './structured-logger'

// =====================================================
// UNIFIED CACHE SERVICE
// =====================================================

export class UnifiedCacheService {
  private cache = new Map<string, CacheEntry>()
  private metrics: CacheMetrics = {
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    averageResponseTime: 0,
    cacheSize: 0,
    evictions: 0
  }
  
  private cleanupInterval?: NodeJS.Timeout
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 1 minuto
  private readonly MAX_CACHE_SIZE = 1000
  private isDestroyed = false

  constructor() {
    this.initializeCleanup()
  }

  /**
   * Inicializa limpeza automática
   */
  private initializeCleanup(): void {
    if (typeof window === 'undefined') return // Apenas no servidor

    this.cleanupInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.performMaintenance()
      }
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Gera chave de cache única
   */
  generateCacheKey(prefix: string, ...params: any[]): string {
    const keyParts = params.map(p => {
      if (typeof p === 'object' && p !== null) {
        // Ordenar chaves do objeto para consistência
        const sortedObj = Object.keys(p)
          .sort()
          .reduce((result, key) => {
            result[key] = p[key]
            return result
          }, {} as any)
        return JSON.stringify(sortedObj)
      }
      return String(p)
    })
    
    return `${prefix}:${keyParts.join(':')}`
  }

  /**
   * Busca dados do cache
   */
  async get<T>(key: string, strategyName?: string): Promise<T | null> {
    const startTime = Date.now()
    this.metrics.totalRequests++

    try {
      const entry = this.cache.get(key)
      
      if (!entry) {
        this.metrics.totalMisses++
        this.updateMetrics()
        
        logger.debug('Cache miss', { key, strategyName })
        return null
      }

      // Verificar expiração
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key)
        this.metrics.totalMisses++
        this.updateMetrics()
        
        logger.debug('Cache expired', { key, strategyName, expiresAt: entry.expiresAt })
        return null
      }

      // Atualizar estatísticas de acesso
      entry.accessCount++
      entry.lastAccessed = Date.now()
      
      this.metrics.totalHits++
      this.updateMetrics()

      const responseTime = Date.now() - startTime
      logger.debug('Cache hit', { 
        key, 
        strategyName, 
        responseTime,
        accessCount: entry.accessCount 
      })

      return entry.data as T

    } catch (error) {
      logger.error('Cache get operation failed', {
        key,
        strategyName,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  /**
   * Armazena dados no cache
   */
  async set<T>(
    key: string, 
    data: T, 
    strategyName: string = 'default'
  ): Promise<Result<void, ContextError>> {
    try {
      const strategy = CACHE_STRATEGIES[strategyName] || {
        ttl: 5 * 60 * 1000, // 5 min default
        priority: 'medium' as const,
        invalidationRules: []
      }

      // Verificar limite de tamanho
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        await this.evictLRU()
      }

      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + strategy.ttl,
        accessCount: 1,
        lastAccessed: Date.now(),
        strategy: strategyName
      }

      this.cache.set(key, entry)
      this.metrics.cacheSize = this.cache.size

      logger.debug('Cache set', { 
        key, 
        strategyName, 
        ttl: strategy.ttl,
        cacheSize: this.cache.size 
      })

      return { success: true, data: undefined }

    } catch (error) {
      const contextError = new ContextError(
        'Failed to set cache entry',
        ERROR_CODES.CACHE_OPERATION_FAILED,
        { key, strategyName },
        error instanceof Error ? error : new Error(String(error))
      )

      logger.error('Cache set operation failed', {
        key,
        strategyName,
        error: contextError.message
      })

      return { success: false, error: contextError }
    }
  }

  /**
   * Remove entrada específica do cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.metrics.cacheSize = this.cache.size
      logger.debug('Cache entry deleted', { key })
    }
    return deleted
  }

  /**
   * Invalida cache baseado em padrão
   */
  invalidatePattern(pattern: string): number {
    let deletedCount = 0
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      this.metrics.cacheSize = this.cache.size
      logger.info('Cache invalidated by pattern', { pattern, deletedCount })
    }

    return deletedCount
  }

  /**
   * Invalida cache baseado em regras de negócio
   */
  invalidateByRules(rules: string[]): number {
    let deletedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      const strategy = CACHE_STRATEGIES[entry.strategy]
      if (strategy && strategy.invalidationRules.some(rule => rules.includes(rule))) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      this.metrics.cacheSize = this.cache.size
      logger.info('Cache invalidated by rules', { rules, deletedCount })
    }

    return deletedCount
  }

  /**
   * Remove entrada menos recentemente usada (LRU)
   */
  private async evictLRU(): Promise<void> {
    if (this.cache.size === 0) return

    let oldestKey = ''
    let oldestAccess = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.metrics.evictions++
      this.metrics.cacheSize = this.cache.size
      
      logger.debug('LRU eviction', { 
        evictedKey: oldestKey, 
        lastAccessed: new Date(oldestAccess).toISOString() 
      })
    }
  }

  /**
   * Atualiza métricas calculadas
   */
  private updateMetrics(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.totalHits / this.metrics.totalRequests
      this.metrics.missRate = this.metrics.totalMisses / this.metrics.totalRequests
    }
  }

  /**
   * Realiza manutenção do cache
   */
  private performMaintenance(): void {
    const now = Date.now()
    let expiredCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      this.metrics.cacheSize = this.cache.size
      logger.debug('Cache maintenance completed', { expiredCount, currentSize: this.cache.size })
    }
  }

  /**
   * Obtém métricas do cache
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  /**
   * Obtém estatísticas detalhadas
   */
  getDetailedStats(): {
    metrics: CacheMetrics
    entriesByStrategy: Record<string, number>
    oldestEntry?: { key: string; age: number }
    mostAccessedEntry?: { key: string; accessCount: number }
  } {
    const entriesByStrategy: Record<string, number> = {}
    let oldestEntry: { key: string; age: number } | undefined
    let mostAccessedEntry: { key: string; accessCount: number } | undefined

    for (const [key, entry] of this.cache.entries()) {
      // Contar por estratégia
      entriesByStrategy[entry.strategy] = (entriesByStrategy[entry.strategy] || 0) + 1

      // Encontrar entrada mais antiga
      const age = Date.now() - entry.timestamp
      if (!oldestEntry || age > oldestEntry.age) {
        oldestEntry = { key, age }
      }

      // Encontrar entrada mais acessada
      if (!mostAccessedEntry || entry.accessCount > mostAccessedEntry.accessCount) {
        mostAccessedEntry = { key, accessCount: entry.accessCount }
      }
    }

    return {
      metrics: this.getMetrics(),
      entriesByStrategy,
      oldestEntry,
      mostAccessedEntry
    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.metrics.cacheSize = 0
    logger.info('Cache cleared completely')
  }

  /**
   * Destrói o serviço e limpa recursos
   */
  destroy(): void {
    this.isDestroyed = true
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.clear()
    logger.info('UnifiedCacheService destroyed')
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const unifiedCacheService = new UnifiedCacheService()
