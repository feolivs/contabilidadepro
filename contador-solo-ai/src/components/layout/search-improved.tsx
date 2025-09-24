/**
 * Componente de Busca Melhorado - ContabilidadePRO
 * Sistema de busca funcional com sugestões e resultados em tempo real
 */

'use client'

import React, { useState, useCallback, useRef, useEffect, memo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  X, 
  Users, 
  FileText, 
  Calculator, 
  Calendar,
  FileBarChart,
  Loader2,
  Clock,
  TrendingUp
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useSearch, useSearchSuggestions } from '@/hooks/use-search'
import { type SearchResult, type SearchType } from '@/services/search-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface SearchImprovedProps {
  placeholder?: string
  className?: string
  showFilters?: boolean
  maxResults?: number
  onResultSelect?: (result: SearchResult) => void
}

// =====================================================
// MAPEAMENTO DE ÍCONES POR TIPO
// =====================================================

const TYPE_ICONS: Record<SearchType, React.ComponentType<{ className?: string }>> = {
  clientes: Users,
  documentos: FileText,
  calculos: Calculator,
  prazos: Calendar,
  relatorios: FileBarChart,
  all: Search
}

const TYPE_LABELS: Record<SearchType, string> = {
  clientes: 'Clientes',
  documentos: 'Documentos',
  calculos: 'Cálculos',
  prazos: 'Prazos',
  relatorios: 'Relatórios',
  all: 'Todos'
}

const TYPE_COLORS: Record<SearchType, string> = {
  clientes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  documentos: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  calculos: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  prazos: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  relatorios: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  all: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

// =====================================================
// COMPONENTES AUXILIARES
// =====================================================

const SearchResultItem = memo(({ 
  result, 
  onSelect,
  isHighlighted = false 
}: {
  result: SearchResult
  onSelect: (result: SearchResult) => void
  isHighlighted?: boolean
}) => {
  const Icon = TYPE_ICONS[result.type]
  
  const handleSelect = useCallback(() => {
    onSelect(result)
  }, [result, onSelect])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSelect()
    }
  }, [handleSelect])

  return (
    <CommandItem
      value={`${result.type}-${result.id}`}
      onSelect={handleSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center gap-3 p-3 cursor-pointer',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        isHighlighted && 'bg-accent text-accent-foreground'
      )}
    >
      <div className="flex-shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.title}</span>
          <Badge 
            variant="outline" 
            className={cn('text-xs', TYPE_COLORS[result.type])}
          >
            {TYPE_LABELS[result.type]}
          </Badge>
        </div>
        
        {result.subtitle && (
          <p className="text-sm text-muted-foreground truncate mt-1">
            {result.subtitle}
          </p>
        )}
        
        {result.description && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            {result.description}
          </p>
        )}
      </div>
      
      {result.relevance > 80 && (
        <div className="flex-shrink-0">
          <TrendingUp className="h-3 w-3 text-green-500" />
        </div>
      )}
    </CommandItem>
  )
})

SearchResultItem.displayName = 'SearchResultItem'

const SearchSuggestions = memo(({ 
  query, 
  onSelect 
}: {
  query: string
  onSelect: (result: SearchResult) => void
}) => {
  const { suggestions, isLoading } = useSearchSuggestions(query, 5)

  if (isLoading) {
    return (
      <CommandGroup heading="Sugestões">
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
        </div>
      </CommandGroup>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <CommandGroup heading="Sugestões">
      {suggestions.map((suggestion) => (
        <SearchResultItem
          key={`${suggestion.type}-${suggestion.id}`}
          result={suggestion}
          onSelect={onSelect}
        />
      ))}
    </CommandGroup>
  )
})

SearchSuggestions.displayName = 'SearchSuggestions'

const RecentSearches = memo(({ 
  onSelect 
}: {
  onSelect: (query: string) => void
}) => {
  // Implementar histórico de buscas recentes
  const recentSearches = ['DAS Janeiro 2024', 'Empresa ABC Ltda', 'Relatório Mensal']

  if (recentSearches.length === 0) {
    return null
  }

  return (
    <CommandGroup heading="Buscas Recentes">
      {recentSearches.map((search, index) => (
        <CommandItem
          key={index}
          value={search}
          onSelect={() => onSelect(search)}
          className="flex items-center gap-3 p-3 cursor-pointer"
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{search}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  )
})

RecentSearches.displayName = 'RecentSearches'

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const SearchImproved = memo(({
  placeholder = 'Buscar clientes, documentos, cálculos...',
  className,
  showFilters = true,
  maxResults = 10,
  onResultSelect
}: SearchImprovedProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    query,
    results,
    isLoading,
    isSearching,
    hasQuery,
    hasResults,
    selectedTypes,
    setQuery,
    setSelectedTypes,
    clearResults
  } = useSearch({
    limit: maxResults,
    debounceMs: 300
  })

  // Sincronizar input com query
  useEffect(() => {
    setInputValue(query)
  }, [query])

  // Handlers
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    setQuery(value)
    
    if (value.trim().length >= 2) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [setQuery])

  const handleResultSelect = useCallback((result: SearchResult) => {
    setOpen(false)
    setInputValue('')
    clearResults()
    
    if (onResultSelect) {
      onResultSelect(result)
    } else {
      router.push(result.url)
    }
  }, [onResultSelect, router, clearResults])

  const handleRecentSearchSelect = useCallback((search: string) => {
    setInputValue(search)
    setQuery(search)
    setOpen(true)
  }, [setQuery])

  const handleClear = useCallback(() => {
    setInputValue('')
    clearResults()
    setOpen(false)
    inputRef.current?.focus()
  }, [clearResults])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }, [])

  // Filtros de tipo
  const handleTypeToggle = useCallback((type: SearchType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type))
    } else {
      setSelectedTypes([...selectedTypes.filter(t => t !== 'all'), type])
    }
  }, [selectedTypes, setSelectedTypes])

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (inputValue.trim().length >= 2 || !hasQuery) {
                  setOpen(true)
                }
              }}
              placeholder={placeholder}
              className="pl-10 pr-10"
              aria-label="Campo de busca global"
              aria-expanded={open}
              aria-haspopup="listbox"
              role="combobox"
            />
            
            {(inputValue || isSearching) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                aria-label="Limpar busca"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {!hasQuery && (
                <RecentSearches onSelect={handleRecentSearchSelect} />
              )}
              
              {hasQuery && !hasResults && !isLoading && (
                <CommandEmpty>
                  <div className="text-center py-6">
                    <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum resultado encontrado para "{query}"
                    </p>
                  </div>
                </CommandEmpty>
              )}
              
              {hasQuery && hasResults && (
                <CommandGroup heading={`Resultados (${results.length})`}>
                  {results.map((result) => (
                    <SearchResultItem
                      key={`${result.type}-${result.id}`}
                      result={result}
                      onSelect={handleResultSelect}
                    />
                  ))}
                </CommandGroup>
              )}
              
              {hasQuery && inputValue.length >= 2 && (
                <>
                  <CommandSeparator />
                  <SearchSuggestions 
                    query={inputValue} 
                    onSelect={handleResultSelect} 
                  />
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Filtros de Tipo (opcional) */}
      {showFilters && hasQuery && (
        <div className="flex flex-wrap gap-2 mt-2">
          {(['clientes', 'documentos', 'calculos', 'prazos', 'relatorios'] as SearchType[]).map((type) => (
            <Button
              key={type}
              variant={selectedTypes.includes(type) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTypeToggle(type)}
              className="text-xs"
            >
              {TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
})

SearchImproved.displayName = 'SearchImproved'
