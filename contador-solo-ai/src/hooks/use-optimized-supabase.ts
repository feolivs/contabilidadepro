'use client'

import { useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { performanceCache } from '@/lib/performance-cache'

interface OptimizedSupabaseOptions {
  cache?: boolean
  cacheTTL?: number
  enabled?: boolean
  refetchInterval?: number | false
  staleTime?: number
}

// Hook para queries otimizadas do Supabase
export function useOptimizedSupabaseQuery<T>(
  queryKey: string[],
  tableName: string,
  columns: string = '*',
  filters?: Record<string, any>,
  options: OptimizedSupabaseOptions = {}
) {
  const queryClient = useQueryClient()
  const abortControllerRef = useRef<AbortController | null>(null)

  const {
    cache = true,
    cacheTTL = 5 * 60 * 1000,
    enabled = true,
    refetchInterval = false,
    staleTime = 2 * 60 * 1000
  } = options

  const queryFn = useCallback(async (): Promise<T> => {
    // Cancelar query anterior se ainda estiver rodando
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    // Verificar cache primeiro
    const cacheKey = `supabase:${tableName}:${JSON.stringify(filters)}`
    if (cache) {
      const cached = performanceCache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    let query = supabase.from(tableName).select(columns)

    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else if (typeof value === 'string' && value.includes('%')) {
            query = query.ilike(key, value)
          } else {
            query = query.eq(key, value)
          }
        }
      })
    }

    // Otimizações de query
    query = query
      .order('created_at', { ascending: false })
      .limit(100) // Limitar resultados para evitar queries muito grandes

    const { data, error } = await query.abortSignal(abortControllerRef.current.signal)

    if (error) throw error

    // Salvar no cache
    if (cache && data) {
      performanceCache.set(cacheKey, data, cacheTTL)
    }

    return data as T
  }, [tableName, columns, filters, cache, cacheTTL])

  return useQuery({
    queryKey,
    queryFn,
    enabled,
    refetchInterval,
    staleTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}

// Hook para mutations otimizadas
export function useOptimizedSupabaseMutation<T>(
  tableName: string,
  onSuccess?: (data: T) => void,
  invalidateQueries?: string[][]
) {
  const queryClient = useQueryClient()

  const mutationFn = useCallback(async (data: Partial<T>) => {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select()
      .single()

    if (error) throw error

    // Invalidar cache relacionado
    const cacheKey = `supabase:${tableName}:`
    performanceCache['cache'].forEach((_, key) => {
      if (key.startsWith(cacheKey)) {
        performanceCache.delete(key)
      }
    })

    return result
  }, [tableName])

  return {
    mutate: async (data: Partial<T>) => {
      try {
        const result = await mutationFn(data)

        if (onSuccess) {
          onSuccess(result)
        }

        // Invalidar queries relacionadas
        if (invalidateQueries) {
          invalidateQueries.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey })
          })
        }

        return result
      } catch (error) {
        console.error(`Mutation error for ${tableName}:`, error)
        throw error
      }
    }
  }
}

// Hook para real-time subscriptions otimizadas
export function useOptimizedSupabaseSubscription(
  tableName: string,
  filters?: Record<string, any>,
  onUpdate?: (payload: any) => void
) {
  const queryClient = useQueryClient()

  const subscribe = useCallback(() => {
    let filterString = ''
    if (filters) {
      filterString = Object.entries(filters)
        .map(([key, value]) => `${key}=eq.${value}`)
        .join(',')
    }

    const channel = supabase
      .channel(`optimized-${tableName}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: filterString
        },
        (payload) => {
          // Invalidar cache relacionado
          const cacheKey = `supabase:${tableName}:`
          performanceCache['cache'].forEach((_, key) => {
            if (key.startsWith(cacheKey)) {
              performanceCache.delete(key)
            }
          })

          // Invalidar queries relacionadas
          queryClient.invalidateQueries({
            queryKey: [tableName]
          })

          if (onUpdate) {
            onUpdate(payload)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableName, filters, onUpdate, queryClient])

  return { subscribe }
}

// Hook para batch operations
export function useSupabaseBatch() {
  const batchInsert = useCallback(async <T>(
    tableName: string,
    data: T[],
    batchSize: number = 100
  ) => {
    const results = []

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      const { data: result, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select()

      if (error) {
        console.error(`Batch insert error for ${tableName}:`, error)
        throw error
      }

      results.push(...(result || []))

      // Pequeno delay entre batches para não sobrecarregar
      if (i + batchSize < data.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }, [])

  const batchUpdate = useCallback(async <T>(
    tableName: string,
    updates: Array<{ id: string; data: Partial<T> }>,
    batchSize: number = 50
  ) => {
    const results: any[] = []

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)

      const promises = batch.map(({ id, data }) =>
        supabase
          .from(tableName)
          .update(data)
          .eq('id', id)
          .select()
          .single()
      )

      const results_batch = await Promise.allSettled(promises)

      results_batch.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value.data)
        } else {
          console.error(`Batch update error for item ${batch[index]?.id}:`, result.reason)
        }
      })

      // Delay entre batches
      if (i + batchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }, [])

  return {
    batchInsert,
    batchUpdate
  }
}

// Hook para estatísticas de performance
export function useSupabasePerformance() {
  const queryClient = useQueryClient()

  const getQueryStats = useCallback(() => {
    const queryCache = queryClient.getQueryCache()
    const queries = queryCache.getAll()

    const supabaseQueries = queries.filter(query =>
      query.queryKey.some(key =>
        typeof key === 'string' &&
        (key.includes('supabase') || key.includes('empresas') || key.includes('documentos'))
      )
    )

    return {
      totalQueries: queries.length,
      supabaseQueries: supabaseQueries.length,
      stalequeries: supabaseQueries.filter(q => q.isStale()).length,
      loadingQueries: supabaseQueries.filter(q => q.state.status === 'pending').length,
      errorQueries: supabaseQueries.filter(q => q.state.status === 'error').length,
      cacheStats: performanceCache.getStats()
    }
  }, [queryClient])

  const clearExpiredQueries = useCallback(() => {
    const queryCache = queryClient.getQueryCache()
    const queries = queryCache.getAll()

    let cleared = 0
    queries.forEach(query => {
      if (query.isStale() && query.state.dataUpdatedAt < Date.now() - 10 * 60 * 1000) {
        queryCache.remove(query)
        cleared++
      }
    })

    return cleared
  }, [queryClient])

  return {
    getQueryStats,
    clearExpiredQueries
  }
}