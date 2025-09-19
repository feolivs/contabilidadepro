'use client'

// Sistema de cache otimizado para performance
class PerformanceCache {
  private cache = new Map<string, { data: any; expires: number; priority: 'low' | 'medium' | 'high' }>()
  private maxSize = 100
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)

    // Limpar ao fechar a página
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.clear()
      })
    }
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000, priority: 'low' | 'medium' | 'high' = 'medium') {
    const expires = Date.now() + ttl

    // Se exceder o tamanho máximo, remover itens antigos de baixa prioridade
    if (this.cache.size >= this.maxSize) {
      this.evictLowPriority()
    }

    this.cache.set(key, { data, expires, priority })
  }

  get(key: string) {
    const item = this.cache.get(key)

    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }

  private evictLowPriority() {
    // Remover itens de baixa prioridade primeiro
    for (const [key, item] of this.cache.entries()) {
      if (item.priority === 'low') {
        this.cache.delete(key)
        return
      }
    }

    // Se não há itens de baixa prioridade, remover itens antigos
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => a[1].expires - b[1].expires)

    if (entries.length > 0) {
      this.cache.delete(entries[0]![0])
    }
  }

  getStats() {
    const now = Date.now()
    const validItems = Array.from(this.cache.values()).filter(item => now <= item.expires)

    return {
      size: this.cache.size,
      validItems: validItems.length,
      lowPriority: validItems.filter(item => item.priority === 'low').length,
      mediumPriority: validItems.filter(item => item.priority === 'medium').length,
      highPriority: validItems.filter(item => item.priority === 'high').length,
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Instância global do cache
export const performanceCache = new PerformanceCache()

// Hook para usar cache com React Query
export function useCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: {
    ttl?: number
    priority?: 'low' | 'medium' | 'high'
    enabled?: boolean
  } = {}
) {
  const { ttl = 5 * 60 * 1000, priority = 'medium', enabled = true } = options

  // Verificar cache primeiro
  const cachedData = performanceCache.get(key)
  if (cachedData && enabled) {
    return {
      data: cachedData,
      isLoading: false,
      error: null,
      isSuccess: true
    }
  }

  // Se não está no cache e está habilitado, fazer a query
  if (enabled) {
    return {
      data: null,
      isLoading: true,
      error: null,
      isSuccess: false,
      refetch: async () => {
        try {
          const data = await queryFn()
          performanceCache.set(key, data, ttl, priority)
          return { data, isLoading: false, error: null, isSuccess: true }
        } catch (error) {
          return { data: null, isLoading: false, error, isSuccess: false }
        }
      }
    }
  }

  return {
    data: null,
    isLoading: false,
    error: null,
    isSuccess: false
  }
}

// Utilitários para cache específico
export const cacheUtils = {
  // Cache para dados do usuário (prioridade alta, TTL longo)
  setUserData: (userId: string, data: any) => {
    performanceCache.set(`user:${userId}`, data, 30 * 60 * 1000, 'high')
  },

  getUserData: (userId: string) => {
    return performanceCache.get(`user:${userId}`)
  },

  // Cache para dados de dashboard (prioridade média)
  setDashboardData: (key: string, data: any) => {
    performanceCache.set(`dashboard:${key}`, data, 2 * 60 * 1000, 'medium')
  },

  getDashboardData: (key: string) => {
    return performanceCache.get(`dashboard:${key}`)
  },

  // Cache para dados temporários (prioridade baixa, TTL curto)
  setTempData: (key: string, data: any) => {
    performanceCache.set(`temp:${key}`, data, 30 * 1000, 'low')
  },

  getTempData: (key: string) => {
    return performanceCache.get(`temp:${key}`)
  },

  // Invalidar cache por prefixo
  invalidatePrefix: (prefix: string) => {
    for (const key of performanceCache['cache'].keys()) {
      if (key.startsWith(prefix)) {
        performanceCache.delete(key)
      }
    }
  }
}