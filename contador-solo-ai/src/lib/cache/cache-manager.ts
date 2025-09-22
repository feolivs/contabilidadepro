/**
 * Sistema de Cache Inteligente para ContabilidadePRO
 * Implementa cache multicamadas com invalidação automática
 */

import { logger } from '@/lib/simple-logger'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
  tags: string[]
  hits: number
  size: number
  priority: CachePriority
}

export type CachePriority = 'low' | 'medium' | 'high' | 'critical'

export interface CacheConfig {
  maxSize: number // MB
  defaultTTL: number // milliseconds
  maxEntries: number
  enableCompression: boolean
  enablePersistence: boolean
  storagePrefix: string
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  evictions: number
  lastCleanup: number
}

export interface CacheStrategy {
  name: string
  ttl: number
  priority: CachePriority
  tags: string[]
  compression: boolean
  persistence: boolean
}

// ============================================
// ESTRATÉGIAS DE CACHE ESPECÍFICAS
// ============================================

export const CACHE_STRATEGIES = {
  // Dados críticos - cache longo
  EMPRESA_INSIGHTS: {
    name: 'empresa-insights',
    ttl: 10 * 60 * 1000, // 10 minutos
    priority: 'high' as CachePriority,
    tags: ['empresa', 'insights'],
    compression: true,
    persistence: true
  },

  // Métricas financeiras - cache médio
  METRICAS_FINANCEIRAS: {
    name: 'metricas-financeiras',
    ttl: 5 * 60 * 1000, // 5 minutos
    priority: 'high' as CachePriority,
    tags: ['financeiro', 'metricas'],
    compression: true,
    persistence: true
  },

  // Compliance - cache longo (muda pouco)
  COMPLIANCE_ANALYSIS: {
    name: 'compliance-analysis',
    ttl: 15 * 60 * 1000, // 15 minutos
    priority: 'medium' as CachePriority,
    tags: ['compliance', 'analise'],
    compression: true,
    persistence: true
  },

  // Insights de IA - cache médio
  AI_INSIGHTS: {
    name: 'ai-insights',
    ttl: 8 * 60 * 1000, // 8 minutos
    priority: 'high' as CachePriority,
    tags: ['ia', 'insights'],
    compression: true,
    persistence: false // IA pode ser regenerada
  },

  // Dados estruturados - cache curto
  DADOS_ESTRUTURADOS: {
    name: 'dados-estruturados',
    ttl: 3 * 60 * 1000, // 3 minutos
    priority: 'medium' as CachePriority,
    tags: ['documentos', 'estruturados'],
    compression: false,
    persistence: false
  },

  // Lista de empresas - cache longo
  EMPRESAS_LIST: {
    name: 'empresas-list',
    ttl: 30 * 60 * 1000, // 30 minutos
    priority: 'critical' as CachePriority,
    tags: ['empresas', 'lista'],
    compression: false,
    persistence: true
  },

  // Documentos recentes - cache curto
  DOCUMENTOS_RECENTES: {
    name: 'documentos-recentes',
    ttl: 2 * 60 * 1000, // 2 minutos
    priority: 'low' as CachePriority,
    tags: ['documentos', 'recentes'],
    compression: false,
    persistence: false
  }
} as const

// ============================================
// CACHE MANAGER PRINCIPAL
// ============================================

class CacheManager {
  private cache = new Map<string, CacheEntry>()
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictions: 0,
    lastCleanup: Date.now()
  }
  private hits = 0
  private misses = 0

  private config: CacheConfig = {
    maxSize: 50, // 50MB
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    maxEntries: 1000,
    enableCompression: true,
    enablePersistence: true,
    storagePrefix: 'contabilidade-pro-cache'
  }

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }
    
    // Inicializar cache persistente
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      this.loadFromStorage()
    }

    // Cleanup automático a cada 5 minutos
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Gerar chave de cache determinística
   */
  private generateKey(baseKey: string, params?: Record<string, any>): string {
    if (!params) return baseKey
    
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join('|')
    
    return `${baseKey}:${sortedParams}`
  }

  /**
   * Calcular tamanho aproximado dos dados
   */
  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size / 1024 // KB
  }

  /**
   * Comprimir dados se necessário
   */
  private compress(data: any, shouldCompress: boolean): any {
    if (!shouldCompress || typeof window === 'undefined') return data
    
    try {
      // Implementação simples de compressão via JSON
      return JSON.stringify(data)
    } catch {
      return data
    }
  }

  /**
   * Descomprimir dados
   */
  private decompress(data: any, wasCompressed: boolean): any {
    if (!wasCompressed || typeof data !== 'string') return data
    
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }

  /**
   * Verificar se entrada está expirada
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  /**
   * Obter entrada do cache
   */
  get<T>(key: string, params?: Record<string, any>): T | null {
    const cacheKey = this.generateKey(key, params)
    const entry = this.cache.get(cacheKey)

    if (!entry) {
      this.misses++
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey)
      this.misses++
      return null
    }

    // Incrementar hits
    entry.hits++
    this.hits++

    // Descomprimir se necessário
    const data = this.decompress(entry.data, entry.key.includes('compressed'))

    logger.debug('Cache hit', { key: cacheKey, hits: entry.hits })
    return data
  }

  /**
   * Armazenar no cache
   */
  set<T>(
    key: string, 
    data: T, 
    strategy: CacheStrategy,
    params?: Record<string, any>
  ): void {
    const cacheKey = this.generateKey(key, params)
    const size = this.calculateSize(data)
    const compressedData = this.compress(data, strategy.compression)

    // Verificar limites
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU()
    }

    if (this.stats.totalSize + size > this.config.maxSize * 1024) {
      this.evictBySize(size)
    }

    const entry: CacheEntry<T> = {
      data: compressedData,
      timestamp: Date.now(),
      ttl: strategy.ttl,
      key: strategy.compression ? `${cacheKey}:compressed` : cacheKey,
      tags: strategy.tags,
      hits: 0,
      size,
      priority: strategy.priority
    }

    this.cache.set(cacheKey, entry)
    this.updateStats()

    // Persistir se necessário
    if (strategy.persistence && this.config.enablePersistence) {
      this.saveToStorage(cacheKey, entry)
    }

    logger.debug('Cache set', { key: cacheKey, size, ttl: strategy.ttl })
  }

  /**
   * Invalidar cache por chave
   */
  invalidate(key: string, params?: Record<string, any>): void {
    const cacheKey = this.generateKey(key, params)
    const deleted = this.cache.delete(cacheKey)
    
    if (deleted) {
      this.updateStats()
      this.removeFromStorage(cacheKey)
      logger.debug('Cache invalidated', { key: cacheKey })
    }
  }

  /**
   * Invalidar cache por tags
   */
  invalidateByTags(tags: string[]): void {
    let deletedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key)
        this.removeFromStorage(key)
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      this.updateStats()
      logger.debug('Cache invalidated by tags', { tags, deletedCount })
    }
  }

  /**
   * Limpar cache expirado
   */
  cleanup(): void {
    let cleanedCount = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        this.removeFromStorage(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      this.updateStats()
      this.stats.lastCleanup = Date.now()
      logger.debug('Cache cleanup completed', { cleanedCount })
    }
  }

  /**
   * Eviction LRU (Least Recently Used)
   */
  private evictLRU(): void {
    let lruKey = ''
    let lruHits = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.priority !== 'critical' && entry.hits < lruHits) {
        lruHits = entry.hits
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
      this.removeFromStorage(lruKey)
      this.stats.evictions++
      logger.debug('LRU eviction', { key: lruKey, hits: lruHits })
    }
  }

  /**
   * Eviction por tamanho
   */
  private evictBySize(requiredSize: number): void {
    const entries = Array.from(this.cache.entries())
      .filter(([, entry]) => entry.priority !== 'critical')
      .sort((a, b) => a[1].hits - b[1].hits) // Menos usados primeiro

    let freedSize = 0
    let evictedCount = 0

    for (const [key, entry] of entries) {
      if (freedSize >= requiredSize) break
      
      this.cache.delete(key)
      this.removeFromStorage(key)
      freedSize += entry.size
      evictedCount++
    }

    this.stats.evictions += evictedCount
    logger.debug('Size-based eviction', { evictedCount, freedSize })
  }

  /**
   * Atualizar estatísticas
   */
  private updateStats(): void {
    this.stats.totalEntries = this.cache.size
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0)
    
    const totalRequests = this.hits + this.misses
    this.stats.hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0
    this.stats.missRate = totalRequests > 0 ? (this.misses / totalRequests) * 100 : 0
  }

  /**
   * Obter estatísticas
   */
  getStats(): CacheStats {
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    this.updateStats()
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.config.storagePrefix)
    }
    
    logger.debug('Cache cleared')
  }

  /**
   * Salvar no localStorage
   */
  private saveToStorage(key: string, entry: CacheEntry): void {
    if (typeof window === 'undefined') return
    
    try {
      const storageKey = `${this.config.storagePrefix}:${key}`
      localStorage.setItem(storageKey, JSON.stringify(entry))
    } catch (error) {
      logger.warn('Failed to save to storage', { key, error })
    }
  }

  /**
   * Remover do localStorage
   */
  private removeFromStorage(key: string): void {
    if (typeof window === 'undefined') return
    
    try {
      const storageKey = `${this.config.storagePrefix}:${key}`
      localStorage.removeItem(storageKey)
    } catch (error) {
      logger.warn('Failed to remove from storage', { key, error })
    }
  }

  /**
   * Carregar do localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const prefix = this.config.storagePrefix
      const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix))
      
      for (const storageKey of keys) {
        const cacheKey = storageKey.replace(`${prefix}:`, '')
        const entryData = localStorage.getItem(storageKey)
        
        if (entryData) {
          const entry: CacheEntry = JSON.parse(entryData)
          
          // Verificar se não expirou
          if (!this.isExpired(entry)) {
            this.cache.set(cacheKey, entry)
          } else {
            localStorage.removeItem(storageKey)
          }
        }
      }
      
      logger.debug('Cache loaded from storage', { entries: this.cache.size })
    } catch (error) {
      logger.warn('Failed to load from storage', { error })
    }
  }
}

// ============================================
// INSTÂNCIA SINGLETON
// ============================================

export const cacheManager = new CacheManager()

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Helper para cache com estratégia
 */
export function cacheWithStrategy<T>(
  key: string,
  strategy: CacheStrategy,
  params?: Record<string, any>
): {
  get: () => T | null
  set: (data: T) => void
  invalidate: () => void
} {
  return {
    get: () => cacheManager.get<T>(key, params),
    set: (data: T) => cacheManager.set(key, data, strategy, params),
    invalidate: () => cacheManager.invalidate(key, params)
  }
}

/**
 * Decorator para cache automático
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  strategy: CacheStrategy,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : `${fn.name}:${JSON.stringify(args)}`
    
    // Tentar cache primeiro
    const cached = cacheManager.get(key)
    if (cached) {
      return cached
    }

    // Executar função e cachear resultado
    const result = await fn(...args)
    cacheManager.set(key, result, strategy)
    
    return result
  }) as T
}
