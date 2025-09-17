'use client'


import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle } from 'lucide-react'
import { useDeleteEmpresa } from '@/hooks/use-empresas'

interface Empresa {
  id: string
  nome: string
  nome_fantasia?: string
  cnpj?: string
}

interface DeleteEmpresaModalProps {
  empresa: Empresa | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteEmpresaModal({
  empresa,
  open,
  onOpenChange,
  onSuccess
}: DeleteEmpresaModalProps) {
  const deleteEmpresa = useDeleteEmpresa()

  const handleDelete = async () => {
    if (!empresa) return

    try {
      await deleteEmpresa.mutateAsync(empresa.id)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      // Erro já tratado pelo hook
    }
  }

  if (!empresa) return null

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <ModalTitle>Remover Empresa</ModalTitle>
              <ModalDescription>
                A empresa será removida da lista.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Você tem certeza que deseja remover a empresa da lista:
          </p>
          
          <div className="bg-muted p-4 rounded-lg">
            <div className="font-medium">{empresa.nome}</div>
            {empresa.nome_fantasia && (
              <div className="text-sm text-muted-foreground">
                {empresa.nome_fantasia}
              </div>
            )}
            {empresa.cnpj && (
              <div className="text-sm text-muted-foreground font-mono">
                CNPJ: {empresa.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')}
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Informação:</strong> A empresa será removida da lista atual.
                Esta é uma demonstração da funcionalidade.
              </div>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteEmpresa.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteEmpresa.isPending}
          >
            {deleteEmpresa.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removendo...
              </>
            ) : (
              'Remover da Lista'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
