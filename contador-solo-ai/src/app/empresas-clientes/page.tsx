'use client'

import { useState, useCallback, Suspense } from 'react'
import { CleanLayout } from '@/components/layout/clean-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, RefreshCw, Building2 } from 'lucide-react'
import { EmpresasOverview } from './components/empresas-overview'
import { EmpresasList } from './components/empresas-list'
import { EmpresasSearch } from './components/empresas-search'
import { ViewToggle } from './components/view-toggle'
import { BulkActions } from './components/bulk-actions'
import { AdvancedFilters } from './components/advanced-filters'
import { SmartSearch } from './components/smart-search'
import { ExportModal } from './components/export-modal'
import { ExportProgressModal } from './components/export-progress'
import { CreateEmpresaModal } from './components/modals/create-empresa'
import { EditEmpresaModal } from './components/modals/edit-empresa'
import { EmpresaDetailsModal } from './components/modals/empresa-details'
import { EmpresaDocumentsModal } from './components/modals/empresa-documents'
import {
  useEmpresasUnified,
  useCreateEmpresaUnified,
  useUpdateEmpresaUnified,
  useDeleteEmpresaUnified
} from '@/hooks/use-empresas-unified'
import { useExport } from '@/hooks/use-export'
import { toast } from 'sonner'
import {
  EmpresaFilters,
  ViewMode,
  SortField,
  SortDirection,
  EmpresaUnified
} from '@/types/empresa-unified.types'

// Loading components
function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ContentLoading() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
          </div>

          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function EmpresasClientesPage() {
  // Estados da página
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortField, setSortField] = useState<SortField>('nome')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filters, setFilters] = useState<EmpresaFilters>({
    regime: 'all',
    status: 'all',
    atividade: 'all'
  })

  // Estados dos modais
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false)
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaUnified | null>(null)

  // Estados para seleção múltipla
  const [selectedEmpresas, setSelectedEmpresas] = useState<EmpresaUnified[]>([])
  const [bulkEditModalOpen, setBulkEditModalOpen] = useState(false)

  // Estados para exportação
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportProgressModalOpen, setExportProgressModalOpen] = useState(false)

  // Hook para exportação
  const { exportData, isExporting, progress, cancelExport } = useExport()

  // Hook para dados das empresas
  const {
    data: empresas,
    stats,
    isLoading,
    isError,
    error,
    refetch
  } = useEmpresasUnified({
    search: searchTerm,
    filters,
    sort: { field: sortField, direction: sortDirection },
    viewMode,
    enabled: true
  })

  // Hooks para operações CRUD
  const createEmpresa = useCreateEmpresaUnified()
  const updateEmpresa = useUpdateEmpresaUnified()
  const deleteEmpresa = useDeleteEmpresaUnified()

  // Handlers
  const handleRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleSearchChange = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const handleFiltersChange = useCallback((newFilters: EmpresaFilters) => {
    setFilters(newFilters)
  }, [])

  const handleSortChange = useCallback((field: SortField, direction: SortDirection) => {
    setSortField(field)
    setSortDirection(direction)
  }, [])

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
  }, [])

  // Handlers para seleção múltipla
  const handleSelectionChange = useCallback((empresas: EmpresaUnified[]) => {
    setSelectedEmpresas(empresas)
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectedEmpresas([])
  }, [])

  // Handlers para bulk operations
  const handleBulkEdit = useCallback((empresas: EmpresaUnified[]) => {
    setBulkEditModalOpen(true)
  }, [])

  const handleBulkDelete = useCallback(async (empresas: EmpresaUnified[]) => {
    try {
      for (const empresa of empresas) {
        await deleteEmpresa.mutateAsync(empresa.id)
      }
      toast.success(`${empresas.length} empresas excluídas com sucesso`)
    } catch (error) {
      console.error('Erro ao excluir empresas:', error)
      toast.error('Erro ao excluir empresas')
    }
  }, [deleteEmpresa.mutateAsync])

  const handleBulkExport = useCallback((empresas: EmpresaUnified[]) => {
    // Fallback para exportação rápida (será substituído pelo modal)
    exportData(empresas, {
      format: 'excel',
      fields: ['nome', 'cnpj', 'regime_tributario', 'ativa'],
      dateFormat: 'br',
      currencyFormat: 'br'
    })
  }, [exportData])

  const handleOpenExportModal = useCallback(() => {
    setExportModalOpen(true)
  }, [])

  const handleBulkEmail = useCallback((empresas: EmpresaUnified[]) => {
    // Implementar envio de email em lote
    toast.info('Envio de email em desenvolvimento')
  }, [])

  const handleBulkCalculations = useCallback((empresas: EmpresaUnified[]) => {
    // Implementar cálculos em lote
    toast.info('Cálculos em lote em desenvolvimento')
  }, [])

  const handleBulkDocuments = useCallback((empresas: EmpresaUnified[]) => {
    // Implementar documentos em lote
    toast.info('Documentos em lote em desenvolvimento')
  }, [])

  const handleBulkActivate = useCallback(async (empresas: EmpresaUnified[]) => {
    try {
      for (const empresa of empresas) {
        await updateEmpresa.mutateAsync({ id: empresa.id, ativa: true })
      }
      toast.success(`${empresas.length} empresas ativadas com sucesso`)
    } catch (error) {
      console.error('Erro ao ativar empresas:', error)
      toast.error('Erro ao ativar empresas')
    }
  }, [updateEmpresa.mutateAsync])

  const handleBulkDeactivate = useCallback(async (empresas: EmpresaUnified[]) => {
    try {
      for (const empresa of empresas) {
        await updateEmpresa.mutateAsync({ id: empresa.id, ativa: false })
      }
      toast.success(`${empresas.length} empresas desativadas com sucesso`)
    } catch (error) {
      console.error('Erro ao desativar empresas:', error)
      toast.error('Erro ao desativar empresas')
    }
  }, [updateEmpresa.mutateAsync])

  // Handlers para ações das empresas
  const handleEditEmpresa = useCallback((empresa: EmpresaUnified) => {
    setSelectedEmpresa(empresa)
    setEditModalOpen(true)
  }, [])

  const handleDeleteEmpresa = useCallback(async (empresa: EmpresaUnified) => {
    try {
      await deleteEmpresa.mutateAsync(empresa.id)
    } catch (error) {
      console.error('Erro ao excluir empresa:', error)
    }
  }, [deleteEmpresa.mutateAsync])

  const handleViewEmpresa = useCallback((empresa: EmpresaUnified) => {
    setSelectedEmpresa(empresa)
    setDetailsModalOpen(true)
  }, [])

  const handleDocumentosEmpresa = useCallback((empresa: EmpresaUnified) => {
    setSelectedEmpresa(empresa)
    setDocumentsModalOpen(true)
  }, [])

  const handleCalculosEmpresa = useCallback((empresa: EmpresaUnified) => {
    console.log('Cálculos empresa:', empresa.id)
    // TODO: Navegar para página de cálculos
  }, [])

  // Handlers dos modais
  const handleCreateSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  const handleEditSuccess = useCallback(() => {
    refetch()
  }, [refetch])

  const handleModalEdit = useCallback(() => {
    setDetailsModalOpen(false)
    setEditModalOpen(true)
  }, [])

  const handleModalDelete = useCallback(() => {
    if (selectedEmpresa) {
      handleDeleteEmpresa(selectedEmpresa)
    }
  }, [selectedEmpresa, handleDeleteEmpresa])

  const handleModalCalculos = useCallback(() => {
    if (selectedEmpresa) {
      handleCalculosEmpresa(selectedEmpresa)
    }
  }, [selectedEmpresa, handleCalculosEmpresa])

  const handleModalDocumentos = useCallback(() => {
    setDetailsModalOpen(false)
    setDocumentsModalOpen(true)
  }, [])

  const handleViewDocuments = useCallback((empresa: EmpresaUnified) => {
    setSelectedEmpresa(empresa)
    setDocumentsModalOpen(true)
  }, [])

  const handleViewCalculations = useCallback((empresa: EmpresaUnified) => {
    setSelectedEmpresa(empresa)
    handleCalculosEmpresa(empresa)
  }, [handleCalculosEmpresa])

  const handleCreateEmpresa = useCallback(() => {
    setCreateModalOpen(true)
  }, [])

  if (isError) {
    return (
      <CleanLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Erro ao carregar empresas
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error?.message || 'Ocorreu um erro inesperado'}
            </p>
            <Button onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </CleanLayout>
    )
  }

  return (
    <CleanLayout>
      <div className="space-y-6">
        {/* Header da página */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Empresas & Clientes
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie todas as empresas do seu portfólio em um só lugar
            </p>
          </div>

          <div className="flex items-center gap-3">
            <AdvancedFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={() => setFilters({ regime: 'all', status: 'all', atividade: 'all' })}
            />

            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />

            <Button onClick={handleCreateEmpresa} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </div>
        </div>

        {/* Visão geral */}
        <Suspense fallback={<StatsLoading />}>
          <EmpresasOverview
            onRefresh={handleRefresh}
            isRefreshing={isLoading}
          />
        </Suspense>

        {/* Busca inteligente */}
        <div className="space-y-4">
          <SmartSearch
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            empresas={empresas}
            onSelectEmpresa={handleViewEmpresa}
            placeholder="Buscar por nome, CNPJ, cidade, regime..."
            className="max-w-2xl"
          />

          {/* Ações em lote */}
          <BulkActions
            selectedEmpresas={selectedEmpresas}
            onClearSelection={handleClearSelection}
            onBulkEdit={handleBulkEdit}
            onBulkDelete={handleBulkDelete}
            onBulkExport={handleBulkExport}
            onBulkEmail={handleBulkEmail}
            onBulkCalculations={handleBulkCalculations}
            onBulkDocuments={handleBulkDocuments}
            onBulkActivate={handleBulkActivate}
            onBulkDeactivate={handleBulkDeactivate}
            onOpenExportModal={handleOpenExportModal}
          />
        </div>

        {/* Lista de empresas */}
        <Suspense fallback={<ContentLoading />}>
          <EmpresasList
            empresas={empresas}
            viewMode={viewMode}
            isLoading={isLoading}
            selectedEmpresas={selectedEmpresas}
            onSelectionChange={handleSelectionChange}
            onEdit={handleEditEmpresa}
            onDelete={handleDeleteEmpresa}
            onView={handleViewEmpresa}
            onViewDocuments={handleViewDocuments}
            onViewCalculations={handleViewCalculations}
          />
        </Suspense>
      </div>

      {/* Modais */}
      <CreateEmpresaModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
      />

      <EditEmpresaModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        empresa={selectedEmpresa}
        onSuccess={handleEditSuccess}
      />

      <EmpresaDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        empresa={selectedEmpresa}
        onEdit={handleModalEdit}
        onDelete={handleModalDelete}
        onCalculos={handleModalCalculos}
        onDocumentos={handleModalDocumentos}
      />

      <EmpresaDocumentsModal
        open={documentsModalOpen}
        onOpenChange={setDocumentsModalOpen}
        empresa={selectedEmpresa}
      />

      {/* Modais de Exportação */}
      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        empresas={empresas}
        selectedEmpresas={selectedEmpresas}
      />

      <ExportProgressModal
        open={exportProgressModalOpen || isExporting}
        onOpenChange={setExportProgressModalOpen}
        progress={progress}
        onCancel={cancelExport}
      />
    </CleanLayout>
  )
}
