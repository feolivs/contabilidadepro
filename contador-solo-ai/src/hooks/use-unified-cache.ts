/**
 * Hook para usar o cache unificado com React Query
 * Substitui os hooks de cache existentes por uma interface consistente
 */

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unifiedCache, CacheConfig, CacheOptions } from '@/lib/unified-cache'
import { logger } from '@/lib/simple-logger'

export interface UseCacheOptions extends CacheOptions {
  config?: CacheConfig
  staleTime?: number
  enabled?: boolean
  refetchOnWindowFocus?: boolean
}

/**
 * Hook principal para cache unificado
 */
export function useUnifiedCache<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const {
    ttl = 5 * 60 * 1000,
    tags,
    config = { memory: true, browser: true },
    staleTime = 30 * 1000,
    enabled = true,
    refetchOnWindowFocus = false,
    ...cacheOptions
  } = options

  const queryClient = useQueryClient()

  return useQuery({
    queryKey: [key],
    queryFn: async (): Promise<T> => {
      // Tentar buscar do cache primeiro
      const cached = await unifiedCache.get<T>(key, config)
      if (cached !== null) {
        return cached
      }

      // Se não está no cache, executar a query
      const data = await queryFn()
      
      // Armazenar no cache
      await unifiedCache.set(key, userId, data, { ttl, tags, ...cacheOptions })
      
      return data
    },
    staleTime,
    enabled,
    refetchOnWindowFocus,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })
}

/**
 * Hook para cache de dados fiscais
 */
export function useFiscalCache<T>(
  type: 'das' | 'irpj' | 'csll' | 'empresa' | 'cliente',
  id: string,
  queryFn: () => Promise<T>,
  options: Omit<UseCacheOptions, 'tags'> = {}
) {
  const key = `${type}:${id}`
  const ttl = type === 'empresa' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 1h para empresa, 24h para cálculos
  
  return useUnifiedCache(key, queryFn, {
    ...options,
    ttl,
    tags: [type, `${type}:${id}`],
    config: { memory: true, browser: true, database: type !== 'cliente' } // Persistir cálculos no DB
  })
}

/**
 * Hook para cache de IA
 */
export function useAICache<T>(
  pergunta: string,
  userId: string,
  queryFn: () => Promise<T>,
  context?: string,
  options: Omit<UseCacheOptions, 'tags'> = {}
) {
  const key = `ai:${userId}:${Buffer.from(pergunta).toString('base64')}${context ? `:${context}` : ''}`
  
  return useUnifiedCache(key, queryFn, {
    ...options,
    ttl: 24 * 60 * 60 * 1000, // 24 horas
    tags: ['ai', `user:${userId}`],
    config: { memory: true, database: true } // IA sempre persiste no DB
  })
}

/**
 * Hook para cache de OCR
 */
export function useOCRCache<T>(
  filePath: string,
  queryFn: () => Promise<T>,
  options: Omit<UseCacheOptions, 'tags'> = {}
) {
  const key = `ocr:${filePath}`
  
  return useUnifiedCache(key, queryFn, {
    ...options,
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 dias
    tags: ['ocr'],
    config: { memory: true, database: true } // OCR sempre persiste
  })
}

/**
 * Hook para invalidação de cache
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  const invalidateKey = useMutation({
    mutationFn: async ({ key, config }: { key: string; config?: CacheConfig }) => {
      await unifiedCache.invalidate(key, config)
      queryClient.invalidateQueries({ queryKey: [key] })
    },
    onSuccess: (_, { key }) => {
      logger.debug(`Cache invalidated: ${key}`)
    }
  })

  const invalidateTag = useMutation({
    mutationFn: async ({ tag, config }: { tag: string; config?: CacheConfig }) => {
      const count = await unifiedCache.invalidateByTag(tag)
      
      // Invalidar queries relacionadas no React Query
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string
          return key?.includes(tag)
        }
      })
      
      return count
    },
    onSuccess: (count, { tag }) => {
      logger.debug(`Cache invalidated by tag: ${tag}`, { count })
    }
  })

  const clearCache = useMutation({
    mutationFn: async (config?: CacheConfig) => {
      await unifiedCache.clear(config)
      queryClient.clear()
    },
    onSuccess: () => {
      logger.info('All cache cleared')
    }
  })

  return {
    invalidateKey: invalidateKey.mutate,
    invalidateTag: invalidateTag.mutate,
    clearCache: clearCache.mutate,
    isInvalidating: invalidateKey.isPending || invalidateTag.isPending || clearCache.isPending
  }
}

/**
 * Hook para estatísticas do cache
 */
export function useCacheStats() {
  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: () => unifiedCache.getStats(),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 10000
  })
}

/**
 * Utilitários para migração de hooks existentes
 */
export const cacheUtils = {
  // Substituir useCalculos
  useCalculos: (filtros?: any) => 
    useFiscalCache('das', JSON.stringify(filtros), async () => {
      // Implementação da query original
      throw new Error('Implementar query de cálculos')
    }),

  // Substituir useDocumentos  
  useDocumentos: (filter?: any) =>
    useUnifiedCache(`documentos:${JSON.stringify(filter)}`, async () => {
      // Implementação da query original
      throw new Error('Implementar query de documentos')
    }, {
      ttl: 10 * 60 * 1000, // 10 minutos
      tags: ['documentos'],
      config: { memory: true, browser: true }
    }),

  // Substituir useEmpresas
  useEmpresas: (userId?: string) =>
    useFiscalCache('empresa', userId || 'all', async () => {
      // Implementação da query original
      throw new Error('Implementar query de empresas')
    }),

  // Substituir cache de CNPJ
  useCNPJCache: (cnpj: string) =>
    useUnifiedCache(`cnpj:${cnpj}`, async () => {
      // Implementação da consulta CNPJ
      throw new Error('Implementar consulta CNPJ')
    }, {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 dias
      tags: ['cnpj'],
      config: { memory: true, browser: true, database: true }
    })
}

/**
 * Hook para preload de dados críticos
 */
export function usePreloadCache() {
  const queryClient = useQueryClient()

  const preloadFiscalData = async (empresaId: string) => {
    const queries = [
      ['empresa', empresaId],
      ['das', `${empresaId}:current`],
      ['documentos', `empresa:${empresaId}`]
    ]

    await Promise.all(
      queries.map(([type, key]) =>
        queryClient.prefetchQuery({
          queryKey: [key],
          queryFn: () => unifiedCache.get(key, userId),
          staleTime: 5 * 60 * 1000
        })
      )
    )
  }

  return { preloadFiscalData }
}

/**
 * Provider para configuração global do cache
 */
export interface CacheProviderProps {
  children: React.ReactNode
  defaultConfig?: CacheConfig
  defaultTTL?: number
}

export function CacheProvider({ 
  children, 
  defaultConfig = { memory: true, browser: true },
  defaultTTL = 5 * 60 * 1000 
}: CacheProviderProps) {
  // Configurar defaults globais
  React.useEffect(() => {
    // Configuracoes globais podem ser aplicadas aqui
  }, [defaultConfig, defaultTTL])

  return React.createElement(React.Fragment, null, children)
}
