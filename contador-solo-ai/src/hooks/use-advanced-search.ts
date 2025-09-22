/**
 * Hook para Busca Avançada - ContabilidadePRO
 * Utiliza extensões PostgreSQL para busca inteligente
 */

import { useState, useCallback, useEffect } from 'react'
import { useDebounce } from 'use-debounce'
import { advancedSearchService, SearchResult, SearchOptions } from '@/services/advanced-search-service'
import { logger } from '@/lib/simple-logger'

export interface UseAdvancedSearchOptions extends SearchOptions {
  debounceMs?: number
  minQueryLength?: number
  autoSearch?: boolean
}

export interface SearchState<T = any> {
  results: SearchResult<T>[]
  isLoading: boolean
  error: string | null
  hasSearched: boolean
  totalResults: number
}

export function useAdvancedSearch<T = any>(
  searchType: 'empresas' | 'clientes' | 'documentos' | 'global',
  options: UseAdvancedSearchOptions = {}
) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    autoSearch = true,
    ...searchOptions
  } = options

  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState<T>>({
    results: [],
    isLoading: false,
    error: null,
    hasSearched: false,
    totalResults: 0
  })
  const [suggestions, setSuggestions] = useState<string[]>([])

  const debouncedQuery = useDebounce(query, debounceMs)

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setState(prev => ({
        ...prev,
        results: [],
        error: null,
        hasSearched: false,
        totalResults: 0
      }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      let results: SearchResult<T>[] = []

      switch (searchType) {
        case 'empresas':
          results = await advancedSearchService.searchEmpresas(searchQuery, searchOptions)
          break
        case 'clientes':
          results = await advancedSearchService.searchClientes(searchQuery, searchOptions)
          break
        case 'documentos':
          results = await advancedSearchService.searchDocumentos(searchQuery, searchOptions)
          break
        case 'global':
          const globalResults = await advancedSearchService.searchGlobal(searchQuery, searchOptions)
          results = [
            ...globalResults.empresas,
            ...globalResults.clientes,
            ...globalResults.documentos
          ]
          break
      }

      setState({
        results,
        isLoading: false,
        error: null,
        hasSearched: true,
        totalResults: results.length
      })

      logger.info('Busca avançada realizada', {
        searchType,
        query: searchQuery,
        resultCount: results.length
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na busca'
      setState({
        results: [],
        isLoading: false,
        error: errorMessage,
        hasSearched: true,
        totalResults: 0
      })

      logger.error('Erro na busca avançada', { searchType, query: searchQuery, error })
    }
  }, [searchType, searchOptions, minQueryLength])

  const getSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setSuggestions([])
      return
    }

    try {
      const suggestionResults = await advancedSearchService.getSuggestions(
        searchQuery,
        searchType === 'global' ? 'empresas' : searchType,
        5
      )
      setSuggestions(suggestionResults)
    } catch (error) {
      logger.error('Erro ao obter sugestões', { searchType, query: searchQuery, error })
      setSuggestions([])
    }
  }, [searchType, minQueryLength])

  const searchByCNPJ = useCallback(async (cnpj: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const results = await advancedSearchService.searchByCNPJ(cnpj)
      setState({
        results: results as SearchResult<T>[],
        isLoading: false,
        error: null,
        hasSearched: true,
        totalResults: results.length
      })

      logger.info('Busca por CNPJ realizada', { cnpj, resultCount: results.length })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na busca por CNPJ'
      setState({
        results: [],
        isLoading: false,
        error: errorMessage,
        hasSearched: true,
        totalResults: 0
      })

      logger.error('Erro na busca por CNPJ', { cnpj, error })
    }
  }, [])

  const searchWithMetadata = useCallback(async (
    searchQuery: string,
    metadata: Record<string, string>,
    table: string
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const results = await advancedSearchService.searchWithMetadata(
        searchQuery,
        metadata,
        table
      )
      setState({
        results: results as SearchResult<T>[],
        isLoading: false,
        error: null,
        hasSearched: true,
        totalResults: results.length
      })

      logger.info('Busca com metadados realizada', {
        query: searchQuery,
        metadata,
        table,
        resultCount: results.length
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na busca com metadados'
      setState({
        results: [],
        isLoading: false,
        error: errorMessage,
        hasSearched: true,
        totalResults: 0
      })

      logger.error('Erro na busca com metadados', { query: searchQuery, metadata, table, error })
    }
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setState({
      results: [],
      isLoading: false,
      error: null,
      hasSearched: false,
      totalResults: 0
    })
    setSuggestions([])
  }, [])

  const retrySearch = useCallback(() => {
    if (query) {
      search(query)
    }
  }, [query, search])

  // Auto-search quando a query muda
  useEffect(() => {
    if (autoSearch && debouncedQuery) {
      search(debouncedQuery)
    }
  }, [debouncedQuery, autoSearch, search])

  // Obter sugestões quando a query muda
  useEffect(() => {
    if (query && query.length >= minQueryLength) {
      getSuggestions(query)
    } else {
      setSuggestions([])
    }
  }, [query, getSuggestions, minQueryLength])

  return {
    // Estado
    query,
    setQuery,
    results: state.results,
    isLoading: state.isLoading,
    error: state.error,
    hasSearched: state.hasSearched,
    totalResults: state.totalResults,
    suggestions,

    // Ações
    search: (searchQuery?: string) => search(searchQuery || query),
    searchByCNPJ,
    searchWithMetadata,
    clearSearch,
    retrySearch,

    // Utilitários
    isEmpty: state.results.length === 0 && state.hasSearched,
    hasResults: state.results.length > 0,
    canSearch: query.length >= minQueryLength
  }
}

// Hook especializado para busca de empresas
export function useEmpresaSearch(options?: UseAdvancedSearchOptions) {
  return useAdvancedSearch('empresas', options)
}

// Hook especializado para busca de clientes
export function useClienteSearch(options?: UseAdvancedSearchOptions) {
  return useAdvancedSearch('clientes', options)
}

// Hook especializado para busca de documentos
export function useDocumentoSearch(options?: UseAdvancedSearchOptions) {
  return useAdvancedSearch('documentos', options)
}

// Hook para busca global
export function useGlobalSearch(options?: UseAdvancedSearchOptions) {
  return useAdvancedSearch('global', options)
}
