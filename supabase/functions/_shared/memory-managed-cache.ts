/**
 * 🧠 MEMORY-MANAGED CACHE
 * Cache híbrido (memória + Supabase) com gestão automática de memória
 * - TTL automático com cleanup
 * - Limite de tamanho (LRU eviction)
 * - Fallback para Supabase
 * - Métricas de performance
 */

interface MemoryCacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
  accessCount: number
  lastAccess: number
  size: number // tamanho estimado em bytes
}

interface CacheStats {
  memoryEntries: number
  memorySize: number
  hitRate: number
  totalHits: number
  totalMisses: number
  evictions: number
  cleanupRuns: number
}

interface CacheConfig {
  maxMemorySize: number // bytes
  maxEntries: number
  defaultTTL: number // ms
  cleanupInterval: number // ms
  evictionThreshold: number // 0-1, quando começar LRU eviction
}

export class MemoryManagedCache {
  private memoryCache = new Map<string, MemoryCacheEntry>()
  private stats: CacheStats = {
    memoryEntries: 0,
    memorySize: 0,
    hitRate: 0,
    totalHits: 0,
    totalMisses: 0,
    evictions: 0,
    cleanupRuns: 0
  }

  private config: CacheConfig = {
    maxMemorySize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
    defaultTTL: 30 * 60 * 1000, // 30 minutos
    cleanupInterval: 5 * 60 * 1000, // 5 minutos
    evictionThreshold: 0.8 // 80% do limite
  }

  private cleanupTimer?: number
  private fallbackCache: any // UnifiedCacheAdapter

  constructor(fallbackCache?: any, config?: Partial<CacheConfig>) {
    this.fallbackCache = fallbackCache
    if (config) {
      this.config = { ...this.config, ...config }
    }

    this.startCleanupTimer()

    console.log('🧠 MemoryManagedCache iniciado:', {
      maxMemorySize: `${Math.round(this.config.maxMemorySize / 1024 / 1024)}MB`,
      maxEntries: this.config.maxEntries,
      defaultTTL: `${Math.round(this.config.defaultTTL / 1000 / 60)}min`,
      cleanupInterval: `${Math.round(this.config.cleanupInterval / 1000 / 60)}min`
    })
  }

  /**
   * 🎯 Buscar do cache (memory-first, fallback para Supabase)
   */
  async get(key: string): Promise<any | null> {
    const startTime = performance.now()

    try {
      // 1. Tentar cache em memória primeiro
      const memoryResult = this.getFromMemory(key)
      if (memoryResult !== null) {
        this.stats.totalHits++
        this.updateHitRate()

        console.log(`🎯 Memory HIT: ${key} (${Math.round(performance.now() - startTime)}ms)`)
        return memoryResult
      }

      // 2. Fallback para Supabase
      if (this.fallbackCache) {
        const fallbackResult = await this.fallbackCache.get(key)
        if (fallbackResult !== null) {
          // Armazenar no cache de memória para próximas consultas
          this.setInMemory(key, fallbackResult)
          this.stats.totalHits++
          this.updateHitRate()

          console.log(`🎯 Fallback HIT: ${key} (${Math.round(performance.now() - startTime)}ms)`)
          return fallbackResult
        }
      }

      // 3. Cache miss completo
      this.stats.totalMisses++
      this.updateHitRate()

      console.log(`❌ Cache MISS: ${key} (${Math.round(performance.now() - startTime)}ms)`)
      return null
    } catch (error) {
      console.warn('Cache get error:', error)
      this.stats.totalMisses++
      this.updateHitRate()
      return null
    }
  }

  /**
   * 💾 Armazenar no cache (memory + fallback)
   */
  async set(key: string, data: any, ttl?: number): Promise<void> {
    const startTime = performance.now()
    const actualTTL = ttl || this.config.defaultTTL

    try {
      // 1. Armazenar em memória
      this.setInMemory(key, data, actualTTL)

      // 2. Armazenar no fallback (assíncrono)
      if (this.fallbackCache) {
        this.fallbackCache.set(key, data, actualTTL).catch((error: any) => {
          console.warn('Fallback cache set error:', error)
        })
      }

      console.log(`💾 Cache SET: ${key} (${Math.round(performance.now() - startTime)}ms)`)
    } catch (error) {
      console.warn('Cache set error:', error)
    }
  }

  /**
   * 🗑️ Invalidar entrada do cache
   */
  async invalidate(key: string): Promise<void> {
    try {
      // Remover da memória
      this.removeFromMemory(key)

      // Remover do fallback
      if (this.fallbackCache) {
        await this.fallbackCache.invalidate(key)
      }

      console.log(`🗑️ Cache INVALIDATE: ${key}`)
    } catch (error) {
      console.warn('Cache invalidate error:', error)
    }
  }

  /**
   * 📊 Obter estatísticas do cache
   */
  getStats(): CacheStats & {
    memoryUsagePercent: number
    entriesUsagePercent: number
    avgEntrySize: number
  } {
    const memoryUsagePercent = (this.stats.memorySize / this.config.maxMemorySize) * 100
    const entriesUsagePercent = (this.stats.memoryEntries / this.config.maxEntries) * 100
    const avgEntrySize = this.stats.memoryEntries > 0 ? this.stats.memorySize / this.stats.memoryEntries : 0

    return {
      ...this.stats,
      memoryUsagePercent,
      entriesUsagePercent,
      avgEntrySize
    }
  }

  /**
   * 🧹 Cleanup manual (também roda automaticamente)
   */
  cleanup(): number {
    const startTime = performance.now()
    const initialEntries = this.memoryCache.size
    const now = Date.now()
    let cleaned = 0

    // Remover entradas expiradas
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.removeFromMemory(key)
        cleaned++
      }
    }

    // Se ainda estamos acima do threshold, fazer LRU eviction
    if (this.isOverThreshold()) {
      cleaned += this.performLRUEviction()
    }

    this.stats.cleanupRuns++

    console.log(`🧹 Cache cleanup: ${cleaned}/${initialEntries} removidas (${Math.round(performance.now() - startTime)}ms)`)

    return cleaned
  }

  /**
   * 🎯 MÉTODOS PRIVADOS
   */

  private getFromMemory(key: string): any | null {
    const entry = this.memoryCache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now > entry.expiresAt) {
      this.removeFromMemory(key)
      return null
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++
    entry.lastAccess = now

    return entry.data
  }

  private setInMemory(key: string, data: any, ttl: number = this.config.defaultTTL): void {
    const now = Date.now()
    const dataSize = this.estimateSize(data)

    // Verificar se precisa fazer eviction antes de adicionar
    if (this.willExceedLimits(dataSize)) {
      this.performLRUEviction()
    }

    const entry: MemoryCacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccess: now,
      size: dataSize
    }

    // Remover entrada antiga se existir
    if (this.memoryCache.has(key)) {
      this.removeFromMemory(key)
    }

    this.memoryCache.set(key, entry)
    this.updateMemoryStats()
  }

  private removeFromMemory(key: string): boolean {
    const entry = this.memoryCache.get(key)
    if (!entry) return false

    this.memoryCache.delete(key)
    this.updateMemoryStats()

    return true
  }

  private willExceedLimits(newEntrySize: number): boolean {
    const newMemorySize = this.stats.memorySize + newEntrySize
    const newEntryCount = this.stats.memoryEntries + 1

    return (
      newMemorySize > this.config.maxMemorySize ||
      newEntryCount > this.config.maxEntries
    )
  }

  private isOverThreshold(): boolean {
    const memoryThreshold = this.config.maxMemorySize * this.config.evictionThreshold
    const entriesThreshold = this.config.maxEntries * this.config.evictionThreshold

    return (
      this.stats.memorySize > memoryThreshold ||
      this.stats.memoryEntries > entriesThreshold
    )
  }

  private performLRUEviction(): number {
    // Ordenar por último acesso (LRU)
    const entries = Array.from(this.memoryCache.entries())
      .sort(([,a], [,b]) => a.lastAccess - b.lastAccess)

    let evicted = 0
    const targetSize = this.config.maxMemorySize * 0.7 // Reduzir para 70%
    const targetEntries = this.config.maxEntries * 0.7

    for (const [key, entry] of entries) {
      if (
        this.stats.memorySize <= targetSize &&
        this.stats.memoryEntries <= targetEntries
      ) {
        break
      }

      this.removeFromMemory(key)
      evicted++
    }

    this.stats.evictions += evicted

    if (evicted > 0) {
      console.log(`♻️ LRU eviction: ${evicted} entradas removidas`)
    }

    return evicted
  }

  private estimateSize(data: any): number {
    try {
      // Estimativa simples baseada no JSON
      const json = JSON.stringify(data)
      return new TextEncoder().encode(json).length
    } catch {
      // Fallback para estimativa aproximada
      return 1024 // 1KB default
    }
  }

  private updateMemoryStats(): void {
    this.stats.memoryEntries = this.memoryCache.size
    this.stats.memorySize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0)
  }

  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses
    this.stats.hitRate = total > 0 ? (this.stats.totalHits / total) * 100 : 0
  }

  private startCleanupTimer(): void {
    if (typeof Deno !== 'undefined') {
      this.cleanupTimer = setInterval(() => {
        this.cleanup()
      }, this.config.cleanupInterval)
    }
  }

  /**
   * 🛑 Parar timer de cleanup (para testes)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.memoryCache.clear()
    console.log('🛑 MemoryManagedCache destroyed')
  }
}

/**
 * 🔧 Factory function para facilitar uso
 */
export function createMemoryManagedCache(
  fallbackCache?: any,
  config?: Partial<CacheConfig>
): MemoryManagedCache {
  return new MemoryManagedCache(fallbackCache, config)
}

/**
 * 📊 Utilitários para debugging
 */
export const debugUtils = {
  logCacheState(cache: MemoryManagedCache): void {
    const stats = cache.getStats()
    console.log('📊 Cache State:', {
      entries: `${stats.memoryEntries}/${stats.memorySize}`,
      memory: `${Math.round(stats.memoryUsagePercent)}%`,
      hitRate: `${Math.round(stats.hitRate)}%`,
      evictions: stats.evictions,
      cleanupRuns: stats.cleanupRuns,
      avgEntrySize: `${Math.round(stats.avgEntrySize)}B`
    })
  },

  simulateMemoryPressure(cache: MemoryManagedCache): void {
    console.log('🔄 Simulating memory pressure...')

    // Adicionar muitas entradas para forçar eviction
    for (let i = 0; i < 100; i++) {
      const key = `pressure-test-${i}`
      const data = { test: 'data'.repeat(1000), index: i }
      cache.set(key, data)
    }

    debugUtils.logCacheState(cache)
  }
}