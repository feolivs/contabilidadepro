/**
 * 🚀 SISTEMA DE CACHE SIMPLIFICADO
 * ContabilidadePRO - Cache unificado para contador solo
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
}

/**
 * Cache simples e eficiente para dados fiscais
 */
class SimpleFiscalCache {
  private cache = new Map<string, CacheItem<any>>()
  private stats = { hits: 0, misses: 0 }
  private readonly MAX_SIZE = 50 // Suficiente para contador solo
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos

  /**
   * Armazena item no cache
   */
  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    // Remove itens expirados se cache estiver cheio
    if (this.cache.size >= this.MAX_SIZE) {
      this.cleanup()

      // Se ainda estiver cheio, remove o mais antigo
      if (this.cache.size >= this.MAX_SIZE) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Recupera item do cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) {
      this.stats.misses++
      return null
    }

    // Verifica expiração
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return item.data as T
  }

  /**
   * Remove item do cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Invalida cache por padrão
   */
  invalidate(pattern: string): number {
    let count = 0
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  /**
   * Remove itens expirados
   */
  cleanup(): number {
    let count = 0
    const now = Date.now()

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * Estatísticas do cache
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    }
  }
}

// Instância singleton
export const fiscalCache = new SimpleFiscalCache()

/**
 * Utilitários específicos para dados fiscais
 */
export const cacheUtils = {
  // Cache para cálculos DAS
  getDAS: (empresaId: string, competencia: string) =>
    fiscalCache.get(`das:${empresaId}:${competencia}`),

  setDAS: (empresaId: string, competencia: string, data: any) =>
    fiscalCache.set(`das:${empresaId}:${competencia}`, data, 24 * 60 * 60 * 1000), // 24h

  // Cache para empresas
  getEmpresa: (empresaId: string) =>
    fiscalCache.get(`empresa:${empresaId}`),

  setEmpresa: (empresaId: string, data: any) =>
    fiscalCache.set(`empresa:${empresaId}`, data, 60 * 60 * 1000), // 1h

  // Cache para relatórios
  getRelatorio: (userId: string, tipo: string) =>
    fiscalCache.get(`relatorio:${userId}:${tipo}`),

  setRelatorio: (userId: string, tipo: string, data: any) =>
    fiscalCache.set(`relatorio:${userId}:${tipo}`, data, 10 * 60 * 1000), // 10min

  // Invalidações por contexto
  invalidateEmpresa: (empresaId: string) =>
    fiscalCache.invalidate(`empresa:${empresaId}`) + fiscalCache.invalidate(`das:${empresaId}`),

  invalidateUser: (userId: string) =>
    fiscalCache.invalidate(`relatorio:${userId}`)
}

/**
 * Hook para React Query com cache
 */
export function useCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl = 5 * 60 * 1000
) {
  return {
    queryKey: [key],
    queryFn: async (): Promise<T> => {
      // Tenta cache primeiro
      const cached = fiscalCache.get<T>(key)
      if (cached) return cached

      // Executa query e cacheia
      const data = await queryFn()
      fiscalCache.set(key, data, ttl)
      return data
    },
    staleTime: ttl / 2, // React Query stale time
    gcTime: ttl
  }
}