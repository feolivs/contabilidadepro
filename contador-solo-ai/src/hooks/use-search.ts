/**
 * Hook de Busca Global - ContabilidadePRO
 * Hook otimizado para busca com debounce, cache e estados de loading
 */

'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { useSupabase } from '@/hooks/use-supabase'
import { 
  getSearchService, 
  type SearchOptions, 
  type SearchResponse, 
  type SearchResult,
  type SearchType 
} from '@/services/search-service'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface UseSearchOptions {
  enabled?: boolean
  debounceMs?: number
  minQueryLength?: number
  defaultTypes?: SearchType[]
  limit?: number
}

export interface UseSearchReturn {
  // Estado da busca
  query: string
  results: SearchResult[]
  isLoading: boolean
  isSearching: boolean
  error: Error | null
  hasMore: boolean
  total: number
  executionTime: number
  
  // Funções de controle
  setQuery: (query: string) => void
  search: (options?: Partial<SearchOptions>) => Promise<void>
  clearResults: () => void
  loadMore: () => Promise<void>
  
  // Filtros
  selectedTypes: SearchType[]
  setSelectedTypes: (types: SearchType[]) => void
  
  // Utilitários
  isEmpty: boolean
  hasQuery: boolean
  hasResults: boolean
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export const useSearch = (options: UseSearchOptions = {}): UseSearchReturn => {
  const {
    enabled = true,
    debounceMs = 300,
    minQueryLength = 2,
    defaultTypes = ['all'],
    limit = 10
  } = options

  const { user } = useAuthStore()
  const supabase = useSupabase()
  const searchService = useMemo(() => getSearchService(supabase), [supabase])

  // Estados locais
  const [query, setQueryState] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<SearchType[]>(defaultTypes)
  const [isSearching, setIsSearching] = useState(false)
  const [offset, setOffset] = useState(0)

  // Refs para controle
  const debounceRef = useRef<NodeJS.Timeout>()
  const lastQueryRef = useRef('')

  // Query key para React Query
  const queryKey = useMemo(() => [
    'search',
    query.trim(),
    selectedTypes,
    user?.id,
    offset
  ], [query, selectedTypes, user?.id, offset])

  // Query principal com React Query
  const {
    data: searchResponse,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<SearchResponse> => {
      if (!query.trim() || query.trim().length < minQueryLength) {
        return {
          results: [],
          total: 0,
          hasMore: false,
          query: query.trim(),
          executionTime: 0
        }
      }

      setIsSearching(true)
      
      try {
        const response = await searchService.search({
          query: query.trim(),
          types: selectedTypes,
          limit,
          offset,
          userId: user?.id
        })
        
        return response
      } finally {
        setIsSearching(false)
      }
    },
    enabled: enabled && !!user?.id,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
    refetchOnWindowFocus: false
  })

  // Função para definir query com debounce
  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery)
    setOffset(0) // Reset offset quando query muda
    
    // Limpar debounce anterior
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Aplicar debounce apenas se a query mudou
    if (newQuery.trim() !== lastQueryRef.current) {
      debounceRef.current = setTimeout(() => {
        lastQueryRef.current = newQuery.trim()
        if (newQuery.trim().length >= minQueryLength) {
          refetch()
        }
      }, debounceMs)
    }
  }, [debounceMs, minQueryLength, refetch])

  // Função de busca manual
  const search = useCallback(async (searchOptions?: Partial<SearchOptions>) => {
    if (!query.trim() || query.trim().length < minQueryLength) {
      return
    }

    setIsSearching(true)
    setOffset(0)

    try {
      await refetch()
    } finally {
      setIsSearching(false)
    }
  }, [query, minQueryLength, refetch])

  // Função para carregar mais resultados
  const loadMore = useCallback(async () => {
    if (!searchResponse?.hasMore || isLoading || isSearching) {
      return
    }

    const newOffset = offset + limit
    setOffset(newOffset)
    
    // A query será automaticamente re-executada devido à mudança no offset
  }, [searchResponse?.hasMore, isLoading, isSearching, offset, limit])

  // Função para limpar resultados
  const clearResults = useCallback(() => {
    setQueryState('')
    setOffset(0)
    lastQueryRef.current = ''
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }, [])

  // Limpar debounce no unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Valores computados
  const results = useMemo(() => {
    if (offset === 0) {
      return searchResponse?.results || []
    }
    
    // Para paginação, combinar resultados anteriores com novos
    // Nota: Esta implementação simples assume que os resultados são sempre os mesmos
    // Para uma implementação mais robusta, seria necessário gerenciar um estado acumulativo
    return searchResponse?.results || []
  }, [searchResponse?.results, offset])

  const isEmpty = !query.trim() || query.trim().length < minQueryLength
  const hasQuery = query.trim().length >= minQueryLength
  const hasResults = results.length > 0

  return {
    // Estado da busca
    query,
    results,
    isLoading,
    isSearching,
    error: error as Error | null,
    hasMore: searchResponse?.hasMore || false,
    total: searchResponse?.total || 0,
    executionTime: searchResponse?.executionTime || 0,
    
    // Funções de controle
    setQuery,
    search,
    clearResults,
    loadMore,
    
    // Filtros
    selectedTypes,
    setSelectedTypes,
    
    // Utilitários
    isEmpty,
    hasQuery,
    hasResults
  }
}

// =====================================================
// HOOKS AUXILIARES
// =====================================================

/**
 * Hook para busca rápida (sem debounce)
 */
export const useQuickSearch = () => {
  const supabase = useSupabase()
  const { user } = useAuthStore()
  const searchService = useMemo(() => getSearchService(supabase), [supabase])

  const quickSearch = useCallback(async (
    query: string, 
    types: SearchType[] = ['all'],
    limit: number = 5
  ): Promise<SearchResult[]> => {
    if (!query.trim() || !user?.id) {
      return []
    }

    try {
      const response = await searchService.search({
        query: query.trim(),
        types,
        limit,
        userId: user.id
      })
      
      return response.results
    } catch (error) {
      console.error('Erro na busca rápida:', error)
      return []
    }
  }, [searchService, user?.id])

  return { quickSearch }
}

/**
 * Hook para sugestões de busca
 */
export const useSearchSuggestions = (query: string, limit: number = 5) => {
  const { quickSearch } = useQuickSearch()
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await quickSearch(query, ['all'], limit)
        setSuggestions(results)
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, limit, quickSearch])

  return {
    suggestions,
    isLoading
  }
}
