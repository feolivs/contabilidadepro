'use client'

import { useState, useEffect, useMemo } from 'react'
import { useDebounce } from 'use-debounce'
import { Empresa } from './use-empresas'

interface UseEmpresasSearchProps {
  empresas: Empresa[]
  searchTerm: string
  filterRegime: string
  filterStatus: string
}

export function useEmpresasSearch({
  empresas,
  searchTerm,
  filterRegime,
  filterStatus
}: UseEmpresasSearchProps) {
  // Debounce do termo de busca para evitar muitas re-renderizações
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)

  // Filtrar empresas com base nos critérios
  const filteredEmpresas = useMemo(() => {
    return empresas.filter(empresa => {
      // Filtro de busca textual
      const matchSearch = !debouncedSearchTerm || 
        empresa.nome.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        empresa.nome_fantasia?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        empresa.cnpj?.includes(debouncedSearchTerm.replace(/[^\d]/g, ''))

      // Filtro por regime tributário
      const matchRegime = !filterRegime || empresa.regime_tributario === filterRegime

      // Filtro por status
      const matchStatus = !filterStatus || empresa.status === filterStatus

      return matchSearch && matchRegime && matchStatus
    })
  }, [empresas, debouncedSearchTerm, filterRegime, filterStatus])

  return {
    filteredEmpresas,
    isSearching: searchTerm !== debouncedSearchTerm,
    hasFilters: !!(debouncedSearchTerm || filterRegime || filterStatus),
    resultCount: filteredEmpresas.length
  }
}

// Hook para ordenação das empresas
export function useEmpresasSort(empresas: Empresa[]) {
  const [sortField, setSortField] = useState<keyof Empresa>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const sortedEmpresas = useMemo(() => {
    return [...empresas].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'pt-BR', { 
          numeric: true, 
          sensitivity: 'base' 
        })
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if ((aValue as any) instanceof Date && (bValue as any) instanceof Date) {
        comparison = ((aValue as unknown) as Date).getTime() - ((bValue as unknown) as Date).getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [empresas, sortField, sortDirection])

  const handleSort = (field: keyof Empresa) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return {
    sortedEmpresas,
    sortField,
    sortDirection,
    handleSort
  }
}

// Hook para paginação
export function useEmpresasPagination(empresas: Empresa[], pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(empresas.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedEmpresas = empresas.slice(startIndex, endIndex)

  // Reset para primeira página quando os dados mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [empresas.length])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToNextPage = () => {
    goToPage(currentPage + 1)
  }

  const goToPreviousPage = () => {
    goToPage(currentPage - 1)
  }

  return {
    paginatedEmpresas,
    currentPage,
    totalPages,
    pageSize,
    totalItems: empresas.length,
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, empresas.length),
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    setCurrentPage
  }
}
