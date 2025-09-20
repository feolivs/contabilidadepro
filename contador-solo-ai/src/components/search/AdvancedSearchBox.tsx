'use client'

/**
 * Componente de Busca Avançada - ContabilidadePRO
 * Interface para busca inteligente com extensões PostgreSQL
 */

import React, { useState, useRef, useEffect } from 'react'
import { Search, X, Filter, Loader2, AlertCircle } from 'lucide-react'
import { useAdvancedSearch } from '@/hooks/use-advanced-search'
import { cn } from '@/lib/utils'

export interface AdvancedSearchBoxProps {
  searchType: 'empresas' | 'clientes' | 'documentos' | 'global'
  placeholder?: string
  className?: string
  onResultSelect?: (result: any) => void
  showFilters?: boolean
  autoFocus?: boolean
}

export function AdvancedSearchBox({
  searchType,
  placeholder = 'Buscar...',
  className,
  onResultSelect,
  showFilters = false,
  autoFocus = false
}: AdvancedSearchBoxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    suggestions,
    hasResults,
    isEmpty,
    clearSearch,
    searchByCNPJ
  } = useAdvancedSearch(searchType, {
    limit: 10,
    threshold: 0.3,
    autoSearch: true
  })

  // Auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(value.length > 0)
    setSelectedIndex(-1)
  }

  const handleResultSelect = (result: any) => {
    setIsOpen(false)
    setSelectedIndex(-1)
    onResultSelect?.(result)
  }

  const handleClear = () => {
    clearSearch()
    setIsOpen(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleCNPJSearch = () => {
    if (query.match(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/)) {
      searchByCNPJ(query)
    }
  }

  const getResultIcon = (result: any) => {
    switch (result.match_type) {
      case 'exact':
        return '🎯'
      case 'fuzzy':
        return '🔍'
      case 'trigram':
        return '📝'
      case 'unaccent':
        return '🔤'
      default:
        return '📄'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className={cn('relative w-full', className)} ref={resultsRef}>
      {/* Input de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'placeholder-gray-400 text-sm',
            error && 'border-red-300 focus:ring-red-500'
          )}
        />
        
        {/* Botões de Ação */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          )}
          
          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              title="Limpar busca"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          )}
          
          {showFilters && (
            <button
              className="p-1 hover:bg-gray-100 rounded"
              title="Filtros avançados"
            >
              <Filter className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown de Resultados */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Erro */}
          {error && (
            <div className="p-3 text-red-600 text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}

          {/* Sugestão de busca por CNPJ */}
          {query.match(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/) && (
            <div className="p-2 border-b border-gray-100">
              <button
                onClick={handleCNPJSearch}
                className="w-full text-left p-2 hover:bg-blue-50 rounded text-sm text-blue-600"
              >
                🏢 Buscar por CNPJ: {query}
              </button>
            </div>
          )}

          {/* Sugestões */}
          {suggestions.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Sugestões:</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(suggestion)}
                  className="block w-full text-left p-1 hover:bg-gray-50 rounded text-sm text-gray-600"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Resultados */}
          {hasResults && (
            <div className="max-h-64 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleResultSelect(result)}
                  className={cn(
                    'w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0',
                    selectedIndex === index && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getResultIcon(result)}</span>
                        <div className="font-medium text-gray-900 truncate">
                          {result.data.nome || result.data.title || 'Sem nome'}
                        </div>
                      </div>
                      
                      {result.data.cnpj && (
                        <div className="text-sm text-gray-500 mt-1">
                          CNPJ: {result.data.cnpj}
                        </div>
                      )}
                      
                      {result.data.descricao && (
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {result.data.descricao}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-2 flex flex-col items-end">
                      <span className={cn('text-xs font-medium', getScoreColor(result.score))}>
                        {Math.round(result.score * 100)}%
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {result.match_type}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Estado vazio */}
          {isEmpty && !isLoading && !error && (
            <div className="p-4 text-center text-gray-500 text-sm">
              Nenhum resultado encontrado para "{query}"
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="p-4 text-center text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Buscando...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
