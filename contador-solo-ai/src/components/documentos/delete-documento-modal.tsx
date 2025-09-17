'use client'

import { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, FileText } from 'lucide-react'
import { useDeleteDocumento } from '@/hooks/use-documentos'
import { Documento } from '@/types/documento'

interface DeleteDocumentoModalProps {
  documento: Documento | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteDocumentoModal({
  documento,
  open,
  onOpenChange,
  onSuccess
}: DeleteDocumentoModalProps) {
  const deleteDocumento = useDeleteDocumento()

  const handleDelete = async () => {
    if (!documento) return

    try {
      await deleteDocumento.mutateAsync(documento.id)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      // Erro já tratado pelo hook
    }
  }

  if (!documento) return null

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <ModalTitle>Excluir Documento</ModalTitle>
              <ModalDescription>
                Esta ação não pode ser desfeita.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Você tem certeza que deseja excluir o documento:
          </p>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{documento.arquivo_nome}</div>
                <div className="text-sm text-muted-foreground">
                  {formatFileSize(documento.arquivo_tamanho)}
                </div>
                {documento.empresa && (
                  <div className="text-sm text-muted-foreground">
                    {documento.empresa.nome}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <strong>Atenção:</strong> O arquivo será removido permanentemente do sistema
                e não poderá ser recuperado. Todos os dados extraídos deste documento também serão perdidos.
              </div>
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteDocumento.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteDocumento.isPending}
          >
            {deleteDocumento.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir Documento'
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}