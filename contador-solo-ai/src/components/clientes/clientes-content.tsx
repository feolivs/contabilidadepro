'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Search,
  Building2,
  FileText,
  MoreHorizontal,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Plus,
  X
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDebounce } from 'use-debounce'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import { AdvancedSearchBox } from '@/components/search/AdvancedSearchBox'
import { useEmpresaSearch } from '@/hooks/use-advanced-search'
import autoTable from 'jspdf-autotable'
import { CreateEmpresaModal } from '@/components/clientes/create-empresa-modal'
import { EditEmpresaModal } from '@/components/clientes/edit-empresa-modal'
import { DeleteEmpresaModal } from '@/components/clientes/delete-empresa-modal'
import { EmpresaDetailsModal } from '@/components/clientes/empresa-details-modal'
import { EmpresaDocumentsModal } from '@/components/clientes/empresa-documents-modal'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination'
import { useEmpresas } from '@/hooks/use-empresas'
import type { Empresa, EmpresasStats } from '@/app/clientes/page'

interface ClientesContentProps {
  initialEmpresas: Empresa[]
  initialStats: EmpresasStats
}

type SortField = keyof Empresa
type SortDirection = 'asc' | 'desc'

const regimeTributarioLabels = {
  'simples': 'Simples Nacional',
  'lucro_presumido': 'Lucro Presumido',
  'lucro_real': 'Lucro Real',
  'mei': 'MEI'
}

const statusLabels = {
  'ativa': 'Ativa',
  'inativa': 'Inativa',
  'suspensa': 'Suspensa'
}

export function ClientesContent({ initialEmpresas, initialStats }: ClientesContentProps) {
  // Buscar dados dinâmicos via React Query
  const { data: empresas = initialEmpresas, isLoading } = useEmpresas()

  // Estados locais
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRegime, setFilterRegime] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null)
  const [deletingEmpresa, setDeletingEmpresa] = useState<Empresa | null>(null)
  const [viewingEmpresa, setViewingEmpresa] = useState<Empresa | null>(null)
  const [documentsEmpresa, setDocumentsEmpresa] = useState<Empresa | null>(null)
  const [useAdvancedSearch, setUseAdvancedSearch] = useState(false)

  // Debounced search
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)

  // Busca avançada
  const {
    results: searchResults,
    isLoading: isSearching,
    hasResults: hasSearchResults,
    query: advancedQuery,
    setQuery: setAdvancedQuery,
    clearSearch
  } = useEmpresaSearch({
    limit: 50,
    threshold: 0.3,
    autoSearch: useAdvancedSearch
  })

  // Filtrar e ordenar empresas
  const filteredAndSortedEmpresas = useMemo(() => {
    let baseEmpresas = empresas

    // Se estiver usando busca avançada e houver resultados
    if (useAdvancedSearch && hasSearchResults) {
      baseEmpresas = searchResults.map(result => result.data)
    } else if (useAdvancedSearch && advancedQuery && !hasSearchResults) {
      // Se busca avançada ativa mas sem resultados, mostrar lista vazia
      baseEmpresas = []
    }

    const filtered = baseEmpresas.filter(empresa => {
      // Busca simples (quando busca avançada não está ativa)
      const matchSearch = useAdvancedSearch || !debouncedSearchTerm ||
        empresa.nome.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        empresa.nome_fantasia?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        empresa.cnpj?.includes(debouncedSearchTerm)

      const matchRegime = !filterRegime || filterRegime === 'all' || empresa.regime_tributario === filterRegime
      const matchStatus = !filterStatus || filterStatus === 'all' || empresa.status === filterStatus

      return matchSearch && matchRegime && matchStatus
    })

    // Ordenar (preservar ordem de relevância da busca avançada se aplicável)
    if (useAdvancedSearch && hasSearchResults) {
      // Manter ordem de relevância da busca avançada, mas aplicar filtros adicionais
      return filtered
    } else {
      // Ordenação normal
      filtered.sort((a, b) => {
        const aValue = a[sortField] || ''
        const bValue = b[sortField] || ''

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
      return filtered
    }
  }, [empresas, debouncedSearchTerm, filterRegime, filterStatus, sortField, sortDirection, useAdvancedSearch, searchResults, hasSearchResults, advancedQuery])

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedEmpresas.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredAndSortedEmpresas.length)
  const paginatedEmpresas = filteredAndSortedEmpresas.slice(startIndex, endIndex)

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setAdvancedQuery('')
    clearSearch()
    setFilterRegime('all')
    setFilterStatus('all')
    setCurrentPage(1)
    setUseAdvancedSearch(false)
  }

  // Funções de navegação de paginação
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Gerar array de páginas para exibição
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      // Se temos poucas páginas, mostrar todas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Lógica para páginas com ellipsis
      const startPage = Math.max(1, currentPage - 2)
      const endPage = Math.min(totalPages, currentPage + 2)

      if (startPage > 1) {
        pages.push(1)
        if (startPage > 2) {
          pages.push('ellipsis-start')
        }
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('ellipsis-end')
        }
        pages.push(totalPages)
      }
    }

    return pages
  }

  const handleExportExcel = () => {
    const exportData = filteredAndSortedEmpresas.map(empresa => ({
      'Nome': empresa.nome,
      'Nome Fantasia': empresa.nome_fantasia || '',
      'CNPJ': empresa.cnpj || '',
      'Regime Tributário': regimeTributarioLabels[empresa.regime_tributario as keyof typeof regimeTributarioLabels] || '',
      'Status': statusLabels[empresa.status as keyof typeof statusLabels] || '',
      'Atividade Principal': empresa.atividade_principal || '',
      'Email': empresa.email || '',
      'Telefone': empresa.telefone || '',
      'Criado em': new Date(empresa.created_at).toLocaleDateString('pt-BR')
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas')
    XLSX.writeFile(wb, `empresas_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('Arquivo Excel exportado com sucesso!')
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    // Título
    doc.setFontSize(18)
    doc.text('Lista de Empresas Clientes', 14, 22)

    // Subtítulo com data
    doc.setFontSize(12)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32)

    // Estatísticas
    doc.setFontSize(10)
    doc.text(`Total de empresas: ${initialStats.total}`, 14, 42)
    doc.text(`Ativas: ${initialStats.ativas}`, 14, 48)
    doc.text(`Simples Nacional: ${initialStats.simplesNacional} (${initialStats.percentualSimplesNacional}%)`, 14, 54)
    doc.text(`Lucro Presumido: ${initialStats.lucroPresumido} (${initialStats.percentualLucroPresumido}%)`, 14, 60)

    // Preparar dados da tabela
    const tableData = filteredAndSortedEmpresas.map(empresa => [
      empresa.nome,
      empresa.nome_fantasia || '-',
      empresa.cnpj ? empresa.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '-',
      regimeTributarioLabels[empresa.regime_tributario as keyof typeof regimeTributarioLabels] || empresa.regime_tributario || '-',
      statusLabels[empresa.status as keyof typeof statusLabels] || empresa.status || '-',
      new Date(empresa.created_at).toLocaleDateString('pt-BR')
    ])

    // Adicionar tabela
    autoTable(doc, {
      head: [['Empresa', 'Nome Fantasia', 'CNPJ', 'Regime', 'Status', 'Criado em']],
      body: tableData,
      startY: 70,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [23, 23, 23],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { top: 70, right: 14, bottom: 20, left: 14 },
    })

    // Salvar arquivo
    doc.save(`empresas_${new Date().toISOString().split('T')[0]}.pdf`)
    toast.success('Arquivo PDF exportado com sucesso!')
  }

  const hasFilters = searchTerm || advancedQuery || (filterRegime && filterRegime !== 'all') || (filterStatus && filterStatus !== 'all')

  return (
    <div className="space-y-6 relative">
      {/* Indicador de loading quando dados estão sendo atualizados */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
              Atualizando dados...
            </div>
          </div>
        </div>
      )}
      {/* Header com ações */}
      <div className="flex gap-2 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Formato de Exportação</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileText className="mr-2 h-4 w-4" />
              Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToPDF}>
              <FileText className="mr-2 h-4 w-4" />
              PDF (.pdf)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateEmpresaModal
          onSuccess={() => {
            // Os dados serão atualizados automaticamente via React Query
            // Não é necessário reload da página
          }}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar empresas específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Toggle entre busca simples e avançada */}
            <div className="flex items-center gap-4">
              <Button
                variant={!useAdvancedSearch ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUseAdvancedSearch(false)
                  setAdvancedQuery('')
                  clearSearch()
                }}
              >
                Busca Simples
              </Button>
              <Button
                variant={useAdvancedSearch ? "default" : "outline"}
                size="sm"
                onClick={() => setUseAdvancedSearch(true)}
              >
                Busca Avançada
              </Button>
              {isSearching && (
                <div className="text-sm text-muted-foreground">
                  Buscando...
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {useAdvancedSearch ? (
                <div className="flex-1">
                  <AdvancedSearchBox
                    searchType="empresas"
                    placeholder="Busca inteligente: nome, CNPJ, ou termos similares..."
                    onResultSelect={(result) => {
                      // Opcional: focar na empresa selecionada
                      console.log('Empresa selecionada:', result.data)
                    }}
                    showFilters={false}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, nome fantasia ou CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              )}
            </div>

              <Select value={filterRegime} onValueChange={setFilterRegime}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todos os regimes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os regimes</SelectItem>
                <SelectItem value="simples">Simples Nacional</SelectItem>
                <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                <SelectItem value="lucro_real">Lucro Real</SelectItem>
                <SelectItem value="mei">MEI</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
                <SelectItem value="suspensa">Suspensa</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Empresas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Empresas</CardTitle>
          <CardDescription>
            {hasFilters ? (
              <>
                {filteredAndSortedEmpresas.length} de {initialStats.total} empresa(s) encontrada(s)
                {useAdvancedSearch && hasSearchResults && (
                  <span className="ml-2 text-blue-600">
                    (Busca inteligente ativa)
                  </span>
                )}
                {totalPages > 1 && (
                  <span className="ml-2">
                    (Página {currentPage} de {totalPages})
                  </span>
                )}
              </>
            ) : (
              <>
                {initialStats.total} empresa(s) cadastrada(s)
                {totalPages > 1 && (
                  <span className="ml-2">
                    (Página {currentPage} de {totalPages})
                  </span>
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('nome')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Empresa
                      {getSortIcon('nome')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('cnpj')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      CNPJ
                      {getSortIcon('cnpj')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('regime_tributario')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Regime
                      {getSortIcon('regime_tributario')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('status')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Status
                      {getSortIcon('status')}
                    </Button>
                  </TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('created_at')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Criado em
                      {getSortIcon('created_at')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmpresas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {hasFilters
                            ? 'Nenhuma empresa encontrada com os filtros aplicados'
                            : 'Nenhuma empresa cadastrada ainda'
                          }
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmpresas.map((empresa) => (
                    <TableRow key={empresa.id}>
                      <TableCell>
                        <div className="font-medium">{empresa.nome}</div>
                        {empresa.nome_fantasia && (
                          <div className="text-sm text-muted-foreground">
                            {empresa.nome_fantasia}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {empresa.cnpj || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {empresa.regime_tributario && (
                          <Badge variant="secondary">
                            {regimeTributarioLabels[empresa.regime_tributario as keyof typeof regimeTributarioLabels]}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={empresa.ativa ? "default" : "secondary"}
                        >
                          {empresa.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {empresa.atividade_principal || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setViewingEmpresa(empresa)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingEmpresa(empresa)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDocumentsEmpresa(empresa)}>
                              <FileText className="mr-2 h-4 w-4" />
                              Documentos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeletingEmpresa(empresa)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Controles de Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredAndSortedEmpresas.length)} de {filteredAndSortedEmpresas.length} empresa(s)
              </div>

              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={handlePreviousPage}
                      className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {getPageNumbers().map((page, index) => (
                    <PaginationItem key={index}>
                      {page === 'ellipsis-start' || page === 'ellipsis-end' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(page as number)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={handleNextPage}
                      className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <EditEmpresaModal
        empresa={editingEmpresa!}
        open={!!editingEmpresa}
        onOpenChange={(open) => !open && setEditingEmpresa(null)}
        onSuccess={() => {
          // Os dados serão atualizados automaticamente via React Query
          setEditingEmpresa(null)
        }}
      />

      <DeleteEmpresaModal
        empresa={deletingEmpresa}
        open={!!deletingEmpresa}
        onOpenChange={(open) => !open && setDeletingEmpresa(null)}
        onSuccess={() => {
          // Os dados serão atualizados automaticamente via React Query
          setDeletingEmpresa(null)
        }}
      />

      <EmpresaDetailsModal
        empresa={viewingEmpresa}
        open={!!viewingEmpresa}
        onOpenChange={(open) => !open && setViewingEmpresa(null)}
      />

      <EmpresaDocumentsModal
        empresa={documentsEmpresa}
        open={!!documentsEmpresa}
        onOpenChange={(open) => !open && setDocumentsEmpresa(null)}
      />
    </div>
  )
}
