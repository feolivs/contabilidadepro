/**
 * Hook para queries com cache inteligente
 * Integra React Query com o sistema de cache customizado
 */

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { cacheManager, CacheStrategy, CACHE_STRATEGIES } from '@/lib/cache/cache-manager'
import { logger } from '@/lib/simple-logger'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface CachedQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> {
  cacheStrategy?: CacheStrategy
  enableCustomCache?: boolean
  invalidateOnWindowFocus?: boolean
  backgroundRefetch?: boolean
  cacheParams?: Record<string, any>
}

export interface CachedQueryResult<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
  isCached: boolean
  cacheAge: number | null
  refetch: () => Promise<void>
  invalidateCache: () => void
  getCacheStats: () => any
}

// ============================================
// HOOK PRINCIPAL
// ============================================

/**
 * Hook para queries com cache inteligente
 */
export function useCachedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: CachedQueryOptions<T> = {}
): CachedQueryResult<T> {
  const queryClient = useQueryClient()
  
  const {
    cacheStrategy = CACHE_STRATEGIES.EMPRESA_INSIGHTS,
    enableCustomCache = true,
    invalidateOnWindowFocus = false,
    backgroundRefetch = true,
    cacheParams,
    ...reactQueryOptions
  } = options

  // Gerar chave única para o cache customizado
  const cacheKey = useMemo(() => {
    return cacheParams ? `${queryKey}:${JSON.stringify(cacheParams)}` : queryKey
  }, [queryKey, cacheParams])

  // Query function com cache customizado
  const cachedQueryFn = useCallback(async (): Promise<T> => {
    // Tentar cache customizado primeiro se habilitado
    if (enableCustomCache) {
      const cached = cacheManager.get<T>(cacheKey, cacheParams)
      if (cached) {
        logger.debug('Custom cache hit', { key: cacheKey })
        return cached
      }
    }

    // Executar query original
    logger.debug('Executing query function', { key: cacheKey })
    const result = await queryFn()

    // Salvar no cache customizado
    if (enableCustomCache && result) {
      cacheManager.set(cacheKey, result, cacheStrategy, cacheParams)
      logger.debug('Saved to custom cache', { key: cacheKey })
    }

    return result
  }, [queryFn, cacheKey, cacheParams, enableCustomCache, cacheStrategy])

  // React Query
  const query = useQuery({
    queryKey: [queryKey, cacheParams],
    queryFn: cachedQueryFn,
    staleTime: cacheStrategy.ttl * 0.8, // 80% do TTL do cache customizado
    gcTime: cacheStrategy.ttl * 2, // 2x o TTL para garbage collection
    refetchOnWindowFocus: invalidateOnWindowFocus,
    refetchInterval: backgroundRefetch ? cacheStrategy.ttl : false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...reactQueryOptions
  })

  // Verificar se dados vieram do cache customizado
  const isCached = useMemo(() => {
    if (!enableCustomCache) return false
    const cached = cacheManager.get<T>(cacheKey, cacheParams)
    return !!cached
  }, [enableCustomCache, cacheKey, cacheParams])

  // Calcular idade do cache
  const cacheAge = useMemo(() => {
    if (!enableCustomCache) return null
    const cached = cacheManager.get<T>(cacheKey, cacheParams)
    return cached ? Date.now() - (cached as any).timestamp : null
  }, [enableCustomCache, cacheKey, cacheParams, query.dataUpdatedAt])

  // Função para invalidar cache
  const invalidateCache = useCallback(() => {
    // Invalidar cache customizado
    if (enableCustomCache) {
      cacheManager.invalidate(cacheKey, cacheParams)
    }
    
    // Invalidar React Query
    queryClient.invalidateQueries({ queryKey: [queryKey, cacheParams] })
    
    logger.debug('Cache invalidated', { key: cacheKey })
  }, [queryClient, queryKey, cacheKey, cacheParams, enableCustomCache])

  // Função para refetch
  const refetch = useCallback(async () => {
    // Invalidar cache primeiro
    invalidateCache()
    
    // Refetch React Query
    await query.refetch()
  }, [invalidateCache, query])

  // Função para obter estatísticas do cache
  const getCacheStats = useCallback(() => {
    return cacheManager.getStats()
  }, [])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      // Opcional: limpar cache específico ao desmontar
      // cacheManager.invalidate(cacheKey, cacheParams)
    }
  }, [cacheKey, cacheParams])

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isCached,
    cacheAge,
    refetch,
    invalidateCache,
    getCacheStats
  }
}

// ============================================
// HOOKS ESPECIALIZADOS
// ============================================

/**
 * Hook para insights de empresa com cache otimizado
 */
export function useCachedEmpresaInsights(
  empresaId: string,
  options: Omit<CachedQueryOptions<any>, 'cacheStrategy'> = {}
) {
  return useCachedQuery(
    'empresa-insights',
    async () => {
      // Implementação da query será injetada
      throw new Error('Query function must be provided')
    },
    {
      ...options,
      cacheStrategy: CACHE_STRATEGIES.EMPRESA_INSIGHTS,
      cacheParams: { empresaId },
      enabled: !!empresaId && options.enabled !== false
    }
  )
}

/**
 * Hook para métricas financeiras com cache otimizado
 */
export function useCachedMetricasFinanceiras(
  empresaId: string,
  periodMonths: number = 6,
  options: Omit<CachedQueryOptions<any>, 'cacheStrategy'> = {}
) {
  return useCachedQuery(
    'metricas-financeiras',
    async () => {
      throw new Error('Query function must be provided')
    },
    {
      ...options,
      cacheStrategy: CACHE_STRATEGIES.METRICAS_FINANCEIRAS,
      cacheParams: { empresaId, periodMonths },
      enabled: !!empresaId && options.enabled !== false
    }
  )
}

/**
 * Hook para análise de compliance com cache otimizado
 */
export function useCachedComplianceAnalysis(
  empresaId: string,
  options: Omit<CachedQueryOptions<any>, 'cacheStrategy'> = {}
) {
  return useCachedQuery(
    'compliance-analysis',
    async () => {
      throw new Error('Query function must be provided')
    },
    {
      ...options,
      cacheStrategy: CACHE_STRATEGIES.COMPLIANCE_ANALYSIS,
      cacheParams: { empresaId },
      enabled: !!empresaId && options.enabled !== false
    }
  )
}

/**
 * Hook para insights de IA com cache otimizado
 */
export function useCachedAIInsights(
  empresaId: string,
  insightType: string = 'completo',
  options: Omit<CachedQueryOptions<any>, 'cacheStrategy'> = {}
) {
  return useCachedQuery(
    'ai-insights',
    async () => {
      throw new Error('Query function must be provided')
    },
    {
      ...options,
      cacheStrategy: CACHE_STRATEGIES.AI_INSIGHTS,
      cacheParams: { empresaId, insightType },
      enabled: !!empresaId && options.enabled !== false
    }
  )
}

/**
 * Hook para dados estruturados com cache otimizado
 */
export function useCachedDadosEstruturados(
  empresaId: string,
  options: Omit<CachedQueryOptions<any>, 'cacheStrategy'> = {}
) {
  return useCachedQuery(
    'dados-estruturados',
    async () => {
      throw new Error('Query function must be provided')
    },
    {
      ...options,
      cacheStrategy: CACHE_STRATEGIES.DADOS_ESTRUTURADOS,
      cacheParams: { empresaId },
      enabled: !!empresaId && options.enabled !== false
    }
  )
}

/**
 * Hook para lista de empresas com cache otimizado
 */
export function useCachedEmpresas(
  options: Omit<CachedQueryOptions<any>, 'cacheStrategy'> = {}
) {
  return useCachedQuery(
    'empresas-list',
    async () => {
      throw new Error('Query function must be provided')
    },
    {
      ...options,
      cacheStrategy: CACHE_STRATEGIES.EMPRESAS_LIST
    }
  )
}

/**
 * Hook para documentos recentes com cache otimizado
 */
export function useCachedDocumentosRecentes(
  empresaId: string,
  limit: number = 10,
  options: Omit<CachedQueryOptions<any>, 'cacheStrategy'> = {}
) {
  return useCachedQuery(
    'documentos-recentes',
    async () => {
      throw new Error('Query function must be provided')
    },
    {
      ...options,
      cacheStrategy: CACHE_STRATEGIES.DOCUMENTOS_RECENTES,
      cacheParams: { empresaId, limit },
      enabled: !!empresaId && options.enabled !== false
    }
  )
}

// ============================================
// UTILITIES
// ============================================

/**
 * Hook para gerenciar cache global
 */
export function useCacheManager() {
  const queryClient = useQueryClient()

  const clearAllCache = useCallback(() => {
    cacheManager.clear()
    queryClient.clear()
    logger.info('All cache cleared')
  }, [queryClient])

  const invalidateByTags = useCallback((tags: string[]) => {
    cacheManager.invalidateByTags(tags)
    // Invalidar queries relacionadas no React Query também
    tags.forEach(tag => {
      queryClient.invalidateQueries({ queryKey: [tag] })
    })
    logger.info('Cache invalidated by tags', { tags })
  }, [queryClient])

  const getStats = useCallback(() => {
    return cacheManager.getStats()
  }, [])

  const cleanup = useCallback(() => {
    cacheManager.cleanup()
    logger.info('Cache cleanup completed')
  }, [])

  return {
    clearAllCache,
    invalidateByTags,
    getStats,
    cleanup
  }
}
