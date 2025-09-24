'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ChevronDown,
  Trash2,
  Edit,
  Download,
  Mail,
  Calculator,
  FolderOpen,
  CheckCircle,
  XCircle,
  Users,
} from 'lucide-react'
import { EmpresaUnified } from '@/types/empresa-unified.types'

interface BulkActionsProps {
  selectedEmpresas: EmpresaUnified[]
  onClearSelection: () => void
  onBulkEdit: (empresas: EmpresaUnified[]) => void
  onBulkDelete: (empresas: EmpresaUnified[]) => void
  onBulkExport: (empresas: EmpresaUnified[]) => void
  onBulkEmail: (empresas: EmpresaUnified[]) => void
  onBulkCalculations: (empresas: EmpresaUnified[]) => void
  onBulkDocuments: (empresas: EmpresaUnified[]) => void
  onBulkActivate: (empresas: EmpresaUnified[]) => void
  onBulkDeactivate: (empresas: EmpresaUnified[]) => void
  onOpenExportModal?: () => void
}

export function BulkActions({
  selectedEmpresas,
  onClearSelection,
  onBulkEdit,
  onBulkDelete,
  onBulkExport,
  onBulkEmail,
  onBulkCalculations,
  onBulkDocuments,
  onBulkActivate,
  onBulkDeactivate,
  onOpenExportModal,
}: BulkActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | null>(null)

  const selectedCount = selectedEmpresas.length
  const activeCount = selectedEmpresas.filter(e => e.ativa).length
  const inactiveCount = selectedCount - activeCount

  if (selectedCount === 0) return null

  const handleBulkAction = (action: string) => {
    switch (action) {
      case 'edit':
        onBulkEdit(selectedEmpresas)
        break
      case 'delete':
        setDeleteDialogOpen(true)
        break
      case 'export':
        onOpenExportModal?.() || onBulkExport(selectedEmpresas)
        break
      case 'email':
        onBulkEmail(selectedEmpresas)
        break
      case 'calculations':
        onBulkCalculations(selectedEmpresas)
        break
      case 'documents':
        onBulkDocuments(selectedEmpresas)
        break
      case 'activate':
        setActionType('activate')
        break
      case 'deactivate':
        setActionType('deactivate')
        break
    }
  }

  const confirmDelete = () => {
    onBulkDelete(selectedEmpresas)
    setDeleteDialogOpen(false)
    onClearSelection()
  }

  const confirmStatusChange = () => {
    if (actionType === 'activate') {
      onBulkActivate(selectedEmpresas.filter(e => !e.ativa))
    } else if (actionType === 'deactivate') {
      onBulkDeactivate(selectedEmpresas.filter(e => e.ativa))
    }
    setActionType(null)
    onClearSelection()
  }

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} empresa{selectedCount !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
          </span>
          {activeCount > 0 && (
            <Badge variant="outline" className="text-green-700 border-green-300">
              {activeCount} ativa{activeCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {inactiveCount > 0 && (
            <Badge variant="outline" className="text-gray-700 border-gray-300">
              {inactiveCount} inativa{inactiveCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
          >
            Limpar Seleção
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                Ações em Lote
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleBulkAction('edit')}>
                <Edit className="mr-2 h-4 w-4" />
                Editar em Lote
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleBulkAction('export')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Selecionadas
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleBulkAction('email')}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleBulkAction('calculations')}>
                <Calculator className="mr-2 h-4 w-4" />
                Cálculos em Lote
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleBulkAction('documents')}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Documentos em Lote
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {inactiveCount > 0 && (
                <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Ativar ({inactiveCount})
                </DropdownMenuItem>
              )}
              
              {activeCount > 0 && (
                <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                  <XCircle className="mr-2 h-4 w-4 text-orange-600" />
                  Desativar ({activeCount})
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => handleBulkAction('delete')}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir Selecionadas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialog de confirmação para exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} empresa{selectedCount !== 1 ? 's' : ''}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação para mudança de status */}
      <AlertDialog open={actionType !== null} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'activate' ? 'Ativar Empresas' : 'Desativar Empresas'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'activate' 
                ? `Tem certeza que deseja ativar ${inactiveCount} empresa${inactiveCount !== 1 ? 's' : ''}?`
                : `Tem certeza que deseja desativar ${activeCount} empresa${activeCount !== 1 ? 's' : ''}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              {actionType === 'activate' ? 'Ativar' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
