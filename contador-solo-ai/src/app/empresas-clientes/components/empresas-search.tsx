'use client'

import { useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  X,
  Filter,
  SortAsc,
  SortDesc,
  Building2,
  Hash,
  MapPin,
  Calendar
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmpresaFilters, SortField, SortDirection } from '@/types/empresa-unified.types'

interface EmpresasSearchProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: EmpresaFilters
  onFiltersChange: (filters: EmpresaFilters) => void
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField, direction: SortDirection) => void
  totalResults?: number
  isLoading?: boolean
}

export function EmpresasSearch({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  sortField,
  sortDirection,
  onSortChange,
  totalResults,
  isLoading = false
}: EmpresasSearchProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

  // Debounce da busca
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      onSearchChange(term)
    }, 300),
    [onSearchChange]
  )

  const handleSearchChange = (value: string) => {
    setLocalSearchTerm(value)
    debouncedSearch(value)
  }

  const clearSearch = () => {
    setLocalSearchTerm('')
    onSearchChange('')
  }

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.regime && filters.regime !== 'all') count++
    if (filters.status && filters.status !== 'all') count++
    if (filters.atividade && filters.atividade !== 'all') count++
    if (filters.uf) count++
    if (filters.cidade) count++
    if (filters.dataInicio) count++
    if (filters.dataFim) count++
    return count
  }, [filters])

  // Opções de ordenação
  const sortOptions = [
    { field: 'nome' as SortField, label: 'Nome', icon: Building2 },
    { field: 'cnpj' as SortField, label: 'CNPJ', icon: Hash },
    { field: 'created_at' as SortField, label: 'Data de Criação', icon: Calendar },
    { field: 'regime_tributario' as SortField, label: 'Regime Tributário', icon: Building2 },
    { field: 'endereco' as SortField, label: 'Localização', icon: MapPin }
  ]

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
  }

  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      // Se já está ordenando por este campo, inverte a direção
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Se é um campo novo, começa com ascendente
      onSortChange(field, 'asc')
    }
  }

  const clearFilters = () => {
    onFiltersChange({
      regime: 'all',
      status: 'all',
      atividade: 'all',
      periodo: 'all',
      uf: undefined,
      cidade: undefined,
      dataInicio: undefined,
      dataFim: undefined
    })
  }

  return (
    <div className="space-y-4">
      {/* Barra de busca principal */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CNPJ, nome fantasia..."
            value={localSearchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
            disabled={isLoading}
          />
          {localSearchTerm && (
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

        {/* Botão de filtros */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Filtro por regime */}
            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, regime: 'Simples Nacional' })}>
              <Building2 className="h-4 w-4 mr-2" />
              Simples Nacional
              {filters.regime === 'Simples Nacional' && <Badge variant="secondary" className="ml-auto">✓</Badge>}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, regime: 'Lucro Presumido' })}>
              <Building2 className="h-4 w-4 mr-2" />
              Lucro Presumido
              {filters.regime === 'Lucro Presumido' && <Badge variant="secondary" className="ml-auto">✓</Badge>}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, regime: 'Lucro Real' })}>
              <Building2 className="h-4 w-4 mr-2" />
              Lucro Real
              {filters.regime === 'Lucro Real' && <Badge variant="secondary" className="ml-auto">✓</Badge>}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, regime: 'MEI' })}>
              <Building2 className="h-4 w-4 mr-2" />
              MEI
              {filters.regime === 'MEI' && <Badge variant="secondary" className="ml-auto">✓</Badge>}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Filtro por status */}
            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, status: 'ativa' })}>
              Empresas Ativas
              {filters.status === 'ativa' && <Badge variant="secondary" className="ml-auto">✓</Badge>}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => onFiltersChange({ ...filters, status: 'inativa' })}>
              Empresas Inativas
              {filters.status === 'inativa' && <Badge variant="secondary" className="ml-auto">✓</Badge>}
            </DropdownMenuItem>

            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={clearFilters} className="text-red-600">
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botão de ordenação */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              {getSortIcon(sortField) || <SortAsc className="h-4 w-4" />}
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {sortOptions.map((option) => {
              const Icon = option.icon
              const isActive = sortField === option.field

              return (
                <DropdownMenuItem
                  key={option.field}
                  onClick={() => handleSortClick(option.field)}
                  className={isActive ? 'bg-accent' : ''}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {option.label}
                  <div className="ml-auto flex items-center">
                    {isActive && getSortIcon(option.field)}
                  </div>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// Função utilitária de debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}
