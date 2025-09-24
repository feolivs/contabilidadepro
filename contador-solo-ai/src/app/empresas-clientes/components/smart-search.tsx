'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Search,
  X,
  Building2,
  Hash,
  MapPin,
  Phone,
  Mail,
  Clock,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmpresaUnified } from '@/types/empresa-unified.types'

interface SmartSearchProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  empresas: EmpresaUnified[]
  onSelectEmpresa?: (empresa: EmpresaUnified) => void
  placeholder?: string
  className?: string
}

interface SearchSuggestion {
  type: 'empresa' | 'cnpj' | 'cidade' | 'regime' | 'recent'
  value: string
  label: string
  empresa?: EmpresaUnified
  icon: React.ReactNode
}

export function SmartSearch({
  searchTerm,
  onSearchChange,
  empresas,
  onSelectEmpresa,
  placeholder = "Buscar empresas...",
  className
}: SmartSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Carregar buscas recentes do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('empresas-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Erro ao carregar buscas recentes:', error)
      }
    }
  }, [])

  // Salvar busca recente
  const saveRecentSearch = (term: string) => {
    if (!term.trim() || term.length < 2) return
    
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('empresas-recent-searches', JSON.stringify(updated))
  }

  // Gerar sugestões baseadas no termo de busca
  const generateSuggestions = (term: string): SearchSuggestion[] => {
    if (!term.trim()) {
      // Mostrar buscas recentes quando não há termo
      return recentSearches.map(search => ({
        type: 'recent',
        value: search,
        label: search,
        icon: <Clock className="h-4 w-4 text-muted-foreground" />
      }))
    }

    const suggestions: SearchSuggestion[] = []
    const lowerTerm = term.toLowerCase()

    // Buscar empresas por nome
    const matchingEmpresas = empresas
      .filter(empresa => 
        empresa.nome?.toLowerCase().includes(lowerTerm) ||
        empresa.nome_fantasia?.toLowerCase().includes(lowerTerm)
      )
      .slice(0, 5)

    matchingEmpresas.forEach(empresa => {
      suggestions.push({
        type: 'empresa',
        value: empresa.nome || '',
        label: empresa.nome || '',
        empresa,
        icon: <Building2 className="h-4 w-4 text-blue-600" />
      })
    })

    // Buscar por CNPJ
    const cnpjMatches = empresas
      .filter(empresa => empresa.cnpj?.includes(term.replace(/\D/g, '')))
      .slice(0, 3)

    cnpjMatches.forEach(empresa => {
      if (!suggestions.find(s => s.empresa?.id === empresa.id)) {
        suggestions.push({
          type: 'cnpj',
          value: empresa.cnpj || '',
          label: `${empresa.nome} - ${formatCNPJ(empresa.cnpj || '')}`,
          empresa,
          icon: <Hash className="h-4 w-4 text-green-600" />
        })
      }
    })

    // Buscar por cidade
    const uniqueCities = [...new Set(
      empresas
        .map(e => e.endereco_completo?.cidade)
        .filter(cidade => cidade && cidade.toLowerCase().includes(lowerTerm))
    )].slice(0, 3)

    uniqueCities.forEach(cidade => {
      if (cidade) {
        suggestions.push({
          type: 'cidade',
          value: cidade,
          label: `Empresas em ${cidade}`,
          icon: <MapPin className="h-4 w-4 text-purple-600" />
        })
      }
    })

    // Buscar por regime tributário
    const regimes = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']
    const matchingRegimes = regimes.filter(regime => 
      regime.toLowerCase().includes(lowerTerm)
    )

    matchingRegimes.forEach(regime => {
      const count = empresas.filter(e => e.regime_tributario === regime).length
      if (count > 0) {
        suggestions.push({
          type: 'regime',
          value: regime,
          label: `${regime} (${count} empresas)`,
          icon: <Badge className="h-4 w-4 text-orange-600" />
        })
      }
    })

    return suggestions.slice(0, 10)
  }

  const formatCNPJ = (cnpj: string) => {
    const numbers = cnpj.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const handleInputChange = (value: string) => {
    onSearchChange(value)
    setSuggestions(generateSuggestions(value))
    setIsOpen(true)
  }

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'empresa' && suggestion.empresa && onSelectEmpresa) {
      onSelectEmpresa(suggestion.empresa)
      setIsOpen(false)
    } else {
      onSearchChange(suggestion.value)
      saveRecentSearch(suggestion.value)
      setIsOpen(false)
    }
  }

  const clearSearch = () => {
    onSearchChange('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      saveRecentSearch(searchTerm)
      setIsOpen(false)
    }
  }

  useEffect(() => {
    setSuggestions(generateSuggestions(searchTerm))
  }, [searchTerm, empresas, recentSearches])

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {suggestions.length === 0 ? (
                <CommandEmpty>
                  {searchTerm ? 'Nenhum resultado encontrado' : 'Digite para buscar...'}
                </CommandEmpty>
              ) : (
                <>
                  {/* Buscas recentes */}
                  {!searchTerm && recentSearches.length > 0 && (
                    <CommandGroup heading="Buscas Recentes">
                      {suggestions
                        .filter(s => s.type === 'recent')
                        .map((suggestion, index) => (
                          <CommandItem
                            key={`recent-${index}`}
                            onSelect={() => handleSelectSuggestion(suggestion)}
                            className="flex items-center gap-2"
                          >
                            {suggestion.icon}
                            <span>{suggestion.label}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}

                  {/* Empresas */}
                  {suggestions.some(s => s.type === 'empresa') && (
                    <CommandGroup heading="Empresas">
                      {suggestions
                        .filter(s => s.type === 'empresa')
                        .map((suggestion, index) => (
                          <CommandItem
                            key={`empresa-${index}`}
                            onSelect={() => handleSelectSuggestion(suggestion)}
                            className="flex items-center gap-2"
                          >
                            {suggestion.icon}
                            <div className="flex flex-col">
                              <span>{suggestion.label}</span>
                              {suggestion.empresa?.nome_fantasia && (
                                <span className="text-xs text-muted-foreground">
                                  {suggestion.empresa.nome_fantasia}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}

                  {/* CNPJ */}
                  {suggestions.some(s => s.type === 'cnpj') && (
                    <CommandGroup heading="Por CNPJ">
                      {suggestions
                        .filter(s => s.type === 'cnpj')
                        .map((suggestion, index) => (
                          <CommandItem
                            key={`cnpj-${index}`}
                            onSelect={() => handleSelectSuggestion(suggestion)}
                            className="flex items-center gap-2"
                          >
                            {suggestion.icon}
                            <span>{suggestion.label}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}

                  {/* Localização */}
                  {suggestions.some(s => s.type === 'cidade') && (
                    <CommandGroup heading="Por Localização">
                      {suggestions
                        .filter(s => s.type === 'cidade')
                        .map((suggestion, index) => (
                          <CommandItem
                            key={`cidade-${index}`}
                            onSelect={() => handleSelectSuggestion(suggestion)}
                            className="flex items-center gap-2"
                          >
                            {suggestion.icon}
                            <span>{suggestion.label}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}

                  {/* Regime Tributário */}
                  {suggestions.some(s => s.type === 'regime') && (
                    <CommandGroup heading="Por Regime">
                      {suggestions
                        .filter(s => s.type === 'regime')
                        .map((suggestion, index) => (
                          <CommandItem
                            key={`regime-${index}`}
                            onSelect={() => handleSelectSuggestion(suggestion)}
                            className="flex items-center gap-2"
                          >
                            {suggestion.icon}
                            <span>{suggestion.label}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Indicador de busca inteligente */}
      {searchTerm && (
        <div className="absolute -bottom-6 left-0 flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Busca inteligente ativa</span>
        </div>
      )}
    </div>
  )
}
