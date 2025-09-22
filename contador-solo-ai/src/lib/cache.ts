/**
 * @deprecated A maior parte deste arquivo foi substituída pelo UnifiedCacheService
 * Use import { unifiedCache, fiscalCache } from '@/lib/unified-cache' em vez disso
 * 
 * Apenas browserCache ainda é usado para compatibilidade.
 */

/**
 * Sistema de Cache Inteligente para ContabilidadePRO
 * 
 * Implementa cache em múltiplas camadas:
 * - Memory Cache: Para dados frequentemente acessados
 * - Browser Cache: Para dados de sessão
 * - Server Cache: Para cálculos fiscais complexos
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number // Time to live em milissegundos
  key: string
  tags?: string[] // Para invalidação por tags
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

class IntelligentCache {
  private memoryCache = new Map<string, CacheItem<any>>()
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 }
  private maxSize = 1000 // Máximo de itens no cache
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Limpeza automática a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)

    // Cleanup quando a página é fechada
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroy()
      })
    }
  }

  /**
   * Armazena um item no cache
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000, tags?: string[]): void {
    // Se o cache está cheio, remove o item mais antigo
    if (this.memoryCache.size >= this.maxSize) {
      this.evictOldest()
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      tags
    }

    this.memoryCache.set(key, item)
    this.updateStats()
  }

  /**
   * Recupera um item do cache
   */
  get<T>(key: string): T | null {
    const item = this.memoryCache.get(key)

    if (!item) {
      this.stats.misses++
      this.updateStats()
      return null
    }

    // Verifica se o item expirou
    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key)
      this.stats.misses++
      this.updateStats()
      return null
    }

    this.stats.hits++
    this.updateStats()
    return item.data as T
  }

  /**
   * Verifica se uma chave existe no cache e não expirou
   */
  has(key: string): boolean {
    const item = this.memoryCache.get(key)
    if (!item) return false

    if (Date.now() - item.timestamp > item.ttl) {
      this.memoryCache.delete(key)
      return false
    }

    return true
  }

  /**
   * Remove um item específico do cache
   */
  delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key)
    this.updateStats()
    return deleted
  }

  /**
   * Invalida cache por tags
   */
  invalidateByTag(tag: string): number {
    let invalidated = 0
    
    for (const [key, item] of this.memoryCache.entries()) {
      if (item.tags && item.tags.includes(tag)) {
        this.memoryCache.delete(key)
        invalidated++
      }
    }

    this.updateStats()
    return invalidated
  }

  /**
   * Limpa itens expirados
   */
  cleanup(): number {
    let cleaned = 0
    const now = Date.now()

    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.memoryCache.delete(key)
        cleaned++
      }
    }

    this.updateStats()
    return cleaned
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.memoryCache.clear()
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 }
  }

  /**
   * Remove o item mais antigo (LRU)
   */
  private evictOldest(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, item] of this.memoryCache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey)
    }
  }

  /**
   * Atualiza estatísticas do cache
   */
  private updateStats(): void {
    this.stats.size = this.memoryCache.size
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
  }

  /**
   * Retorna estatísticas do cache
   */
  getStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * Destrói o cache e limpa recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Instância singleton do cache
const intelligentCache = new IntelligentCache()

/**
 * Hook para cache com React Query
 */
export function useCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: {
    ttl?: number
    tags?: string[]
    staleTime?: number
  } = {}
) {
  const { ttl = 5 * 60 * 1000, tags, staleTime = 30 * 1000 } = options

  return {
    queryKey: [key],
    queryFn: async (): Promise<T> => {
      // Tenta buscar do cache primeiro
      const cached = intelligentCache.get<T>(key)
      if (cached) {
        return cached
      }

      // Se não está no cache, executa a query
      const data = await queryFn()
      
      // Armazena no cache
      intelligentCache.set(key, data, { ttl: ttl || 5000, tags })
      
      return data
    },
    staleTime,
    gcTime: ttl
  }
}

/**
 * Utilitários para cache de cálculos fiscais
 */
export const fiscalCache = {
  // Cache para cálculos DAS
  getDASCalculation: (empresaId: string, competencia: string) => {
    return unifiedCache.get(`das:${empresaId}:${competencia}`, 'fiscal')
  },

  setDASCalculation: (empresaId: string, competencia: string, data: any) => {
    unifiedCache.set(
      `das:${empresaId}:${competencia}`,
      'fiscal',
      data,
      {
        ttl: 24 * 60 * 60 * 1000, // 24 horas
        tags: ['das', `empresa:${empresaId}`, 'calculos']
      }
    )
  },

  // Cache para dados de empresas
  getEmpresa: (empresaId: string) => {
    return unifiedCache.get(`empresa:${empresaId}`, 'fiscal')
  },

  setEmpresa: (empresaId: string, data: any) => {
    unifiedCache.set(
      `empresa:${empresaId}`,
      'fiscal',
      data,
      {
        ttl: 60 * 60 * 1000, // 1 hora
        tags: ['empresas', `empresa:${empresaId}`]
      }
    )
  },

  // Invalidar cache de uma empresa específica
  invalidateEmpresa: (empresaId: string) => {
    unifiedCache.invalidateByTag(`empresa:${empresaId}`)
  },

  // Invalidar todos os cálculos
  invalidateCalculos: () => {
    unifiedCache.invalidateByTag('calculos')
  }
}

/**
 * Cache para browser storage
 */
export const browserCache = {
  set: (key: string, data: any, ttl: number = 24 * 60 * 60 * 1000) => {
    if (typeof window === 'undefined') return

    const item = {
      data,
      timestamp: Date.now(),
      ttl
    }

    try {
      localStorage.setItem(`cache:${key}`, JSON.stringify(item))
    } catch (error) {

    }
  },

  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(`cache:${key}`)
      if (!stored) return null

      const item = JSON.parse(stored)
      
      if (Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(`cache:${key}`)
        return null
      }

      return item.data as T
    } catch (error) {

      return null
    }
  },

  clear: () => {
    if (typeof window === 'undefined') return

    const keys = Object.keys(localStorage).filter(key => key.startsWith('cache:'))
    keys.forEach(key => localStorage.removeItem(key))
  }
}

// Re-exports para compatibilidade (DEPRECATED)
import { unifiedCache, fiscalCache } from './unified-cache'

/** @deprecated Use unifiedCache em vez disso */
export const cache = unifiedCache

// Removido export duplicado

