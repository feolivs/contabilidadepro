/**
 * Sistema de Cache Avançado - Fase 2
 * Cache inteligente com predição, compressão e otimizações avançadas
 */

import { LRUCache } from 'lru-cache'
import { compress, decompress } from 'lz-string'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AdvancedCacheConfig {
  maxSize: number
  maxAge: number
  updateAgeOnGet: boolean
  allowStale: boolean
  compression: boolean
  prediction: boolean
  analytics: boolean
}

export interface CacheEntry<T> {
  data: T
  compressed: boolean
  timestamp: number
  accessCount: number
  lastAccess: number
  size: number
  tags: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  totalSize: number
  entryCount: number
  compressionRatio: number
  avgAccessTime: number
  predictiveHits: number
}

export interface PredictionPattern {
  key: string
  frequency: number
  lastAccess: number
  nextPredicted: number
  confidence: number
}

// =====================================================
// CACHE AVANÇADO
// =====================================================

export class AdvancedCache<T = any> {
  private cache: LRUCache<string, CacheEntry<T>>
  private config: AdvancedCacheConfig
  private metrics: CacheMetrics
  private predictions: Map<string, PredictionPattern>
  private accessLog: Array<{ key: string; timestamp: number }>
  private compressionThreshold: number = 1024 // 1KB

  constructor(config: Partial<AdvancedCacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      maxAge: 5 * 60 * 1000, // 5 minutos
      updateAgeOnGet: true,
      allowStale: false,
      compression: true,
      prediction: true,
      analytics: true,
      ...config
    }

    this.cache = new LRUCache({
      max: this.config.maxSize,
      ttl: this.config.maxAge,
      updateAgeOnGet: this.config.updateAgeOnGet,
      allowStale: this.config.allowStale
    })

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      compressionRatio: 0,
      avgAccessTime: 0,
      predictiveHits: 0
    }

    this.predictions = new Map()
    this.accessLog = []

    // Iniciar análise preditiva se habilitada
    if (this.config.prediction) {
      this.startPredictiveAnalysis()
    }
  }

  // =====================================================
  // MÉTODOS PRINCIPAIS
  // =====================================================

  set(
    key: string, 
    data: T, 
    options: {
      ttl?: number
      tags?: string[]
      priority?: 'low' | 'medium' | 'high' | 'critical'
      compress?: boolean
    } = {}
  ): void {
    const startTime = performance.now()
    
    const {
      ttl = this.config.maxAge,
      tags = [],
      priority = 'medium',
      compress = this.config.compression
    } = options

    // Calcular tamanho dos dados
    const dataSize = this.calculateSize(data)
    
    // Decidir se comprimir baseado no tamanho
    const shouldCompress = compress && dataSize > this.compressionThreshold
    const processedData = shouldCompress ? this.compressData(data) : data

    const entry: CacheEntry<T> = {
      data: processedData,
      compressed: shouldCompress,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccess: Date.now(),
      size: shouldCompress ? this.calculateSize(processedData) : dataSize,
      tags,
      priority
    }

    // Armazenar no cache
    this.cache.set(key, entry, { ttl })

    // Atualizar métricas
    this.updateMetricsOnSet(entry, performance.now() - startTime)

    // Registrar acesso para análise preditiva
    if (this.config.prediction) {
      this.recordAccess(key)
    }
  }

  get(key: string): T | null {
    const startTime = performance.now()
    
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.metrics.misses++
      this.updateHitRate()
      return null
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++
    entry.lastAccess = Date.now()

    // Descomprimir se necessário
    const data = entry.compressed ? this.decompressData(entry.data) : entry.data

    // Atualizar métricas
    this.metrics.hits++
    this.metrics.avgAccessTime = (this.metrics.avgAccessTime + (performance.now() - startTime)) / 2
    this.updateHitRate()

    // Registrar acesso para análise preditiva
    if (this.config.prediction) {
      this.recordAccess(key)
    }

    return data
  }

  // =====================================================
  // MÉTODOS DE PREDIÇÃO
  // =====================================================

  private startPredictiveAnalysis(): void {
    // Executar análise a cada 30 segundos
    setInterval(() => {
      this.analyzePredictionPatterns()
      this.prefetchPredictedData()
    }, 30000)
  }

  private analyzePredictionPatterns(): void {
    const now = Date.now()
    const recentAccesses = this.accessLog.filter(
      access => now - access.timestamp < 5 * 60 * 1000 // últimos 5 minutos
    )

    // Agrupar acessos por chave
    const accessGroups = new Map<string, number[]>()
    
    recentAccesses.forEach(access => {
      if (!accessGroups.has(access.key)) {
        accessGroups.set(access.key, [])
      }
      accessGroups.get(access.key)!.push(access.timestamp)
    })

    // Analisar padrões para cada chave
    accessGroups.forEach((timestamps, key) => {
      if (timestamps.length < 2) return

      const intervals = []
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1])
      }

      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
      const confidence = Math.min(timestamps.length / 10, 1) // Máximo 100% com 10+ acessos

      const pattern: PredictionPattern = {
        key,
        frequency: 1000 / avgInterval, // acessos por segundo
        lastAccess: Math.max(...timestamps),
        nextPredicted: Math.max(...timestamps) + avgInterval,
        confidence
      }

      this.predictions.set(key, pattern)
    })
  }

  private prefetchPredictedData(): void {
    const now = Date.now()
    
    this.predictions.forEach((pattern, key) => {
      // Se a predição indica que o dado será acessado em breve
      if (
        pattern.nextPredicted <= now + 10000 && // próximos 10 segundos
        pattern.confidence > 0.5 && // confiança > 50%
        !this.cache.has(key) // não está no cache
      ) {
        // Aqui você pode implementar lógica para prefetch
        // Por exemplo, disparar uma query para recarregar o dado
        this.metrics.predictiveHits++
      }
    })
  }

  private recordAccess(key: string): void {
    this.accessLog.push({
      key,
      timestamp: Date.now()
    })

    // Manter apenas os últimos 1000 acessos
    if (this.accessLog.length > 1000) {
      this.accessLog = this.accessLog.slice(-1000)
    }
  }

  // =====================================================
  // MÉTODOS UTILITÁRIOS
  // =====================================================

  private compressData(data: T): string {
    try {
      return compress(JSON.stringify(data))
    } catch {
      return JSON.stringify(data)
    }
  }

  private decompressData(compressedData: any): T {
    try {
      if (typeof compressedData === 'string' && compressedData.includes('ᅟ')) {
        return JSON.parse(decompress(compressedData))
      }
      return compressedData
    } catch {
      return compressedData
    }
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size
  }

  private updateMetricsOnSet(entry: CacheEntry<T>, accessTime: number): void {
    this.metrics.entryCount = this.cache.size
    this.metrics.totalSize += entry.size
    this.metrics.avgAccessTime = (this.metrics.avgAccessTime + accessTime) / 2
    
    if (entry.compressed) {
      // Estimar ratio de compressão
      const originalSize = this.calculateSize(entry.data)
      this.metrics.compressionRatio = (this.metrics.compressionRatio + (entry.size / originalSize)) / 2
    }
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0
  }

  // =====================================================
  // MÉTODOS PÚBLICOS DE ANÁLISE
  // =====================================================

  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  getPredictions(): PredictionPattern[] {
    return Array.from(this.predictions.values())
  }

  clear(): void {
    this.cache.clear()
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSize: 0,
      entryCount: 0,
      compressionRatio: 0,
      avgAccessTime: 0,
      predictiveHits: 0
    }
    this.predictions.clear()
    this.accessLog = []
  }

  // Invalidar por tags
  invalidateByTags(tags: string[]): void {
    const keysToDelete: string[] = []
    
    this.cache.forEach((entry, key) => {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  // Obter estatísticas por prioridade
  getStatsByPriority(): Record<string, { count: number; size: number }> {
    const stats: Record<string, { count: number; size: number }> = {
      low: { count: 0, size: 0 },
      medium: { count: 0, size: 0 },
      high: { count: 0, size: 0 },
      critical: { count: 0, size: 0 }
    }

    this.cache.forEach(entry => {
      stats[entry.priority].count++
      stats[entry.priority].size += entry.size
    })

    return stats
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const advancedCache = new AdvancedCache({
  maxSize: 200,
  maxAge: 10 * 60 * 1000, // 10 minutos
  compression: true,
  prediction: true,
  analytics: true
})

// =====================================================
// HOOKS E UTILITÁRIOS
// =====================================================

export function useAdvancedCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    tags?: string[]
    priority?: 'low' | 'medium' | 'high' | 'critical'
    enabled?: boolean
  } = {}
) {
  const { enabled = true } = options

  if (!enabled) {
    return { data: null, isLoading: false, error: null }
  }

  // Tentar cache primeiro
  const cached = advancedCache.get(key)
  if (cached) {
    return { data: cached, isLoading: false, error: null }
  }

  // Se não está no cache, buscar dados
  // Nota: Em um hook real, isso seria implementado com useState/useEffect
  // Aqui é apenas um exemplo da estrutura
  return { data: null, isLoading: true, error: null }
}
