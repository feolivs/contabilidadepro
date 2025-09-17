'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Upload,
  Download,
  Trash2,
  File,
  FileSpreadsheet,
  Image,
  Plus,
  Calendar,
  FileText,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { useDocumentos, useDownloadDocumento, useDeleteDocumento } from '@/hooks/use-documentos'
import { UploadDocumentoModal } from '@/components/documentos/upload-documento-modal'
import {
  Documento,
  StatusProcessamento,
  TIPOS_DOCUMENTO_LABELS,
  STATUS_PROCESSAMENTO_LABELS,
  STATUS_PROCESSAMENTO_COLORS,
  TIPOS_DOCUMENTO_COLORS
} from '@/types/documento'

interface Empresa {
  id: string
  nome: string
  nome_fantasia?: string
  cnpj?: string
  regime_tributario?: string
  atividade_principal?: string
  status?: string
  email?: string
  telefone?: string
  endereco?: string
  created_at: string
  updated_at: string
}

interface EmpresaDocumentsModalProps {
  empresa: Empresa | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getFileIcon = (tipo: string) => {
  const lowerTipo = tipo.toLowerCase()
  if (lowerTipo.includes('image') || lowerTipo.includes('png') || lowerTipo.includes('jpg') || lowerTipo.includes('jpeg')) {
    return <Image className="h-4 w-4" />
  }
  if (lowerTipo.includes('spreadsheet') || lowerTipo.includes('excel') || lowerTipo.includes('csv')) {
    return <FileSpreadsheet className="h-4 w-4" />
  }
  return <File className="h-4 w-4" />
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusIcon = (status: StatusProcessamento) => {
  switch (status) {
    case 'processado':
      return <CheckCircle2 className="h-4 w-4" />
    case 'processando':
      return <RefreshCw className="h-4 w-4 animate-spin" />
    case 'erro':
      return <XCircle className="h-4 w-4" />
    case 'rejeitado':
      return <AlertCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export function EmpresaDocumentsModal({
  empresa,
  open,
  onOpenChange
}: EmpresaDocumentsModalProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const router = useRouter()

  const { data: documentos = [], isLoading } = useDocumentos(
    empresa ? { empresaId: empresa.id } : undefined
  )
  const downloadMutation = useDownloadDocumento()
  const deleteMutation = useDeleteDocumento()

  if (!empresa) return null

  const handleDownload = (documento: Documento) => {
    downloadMutation.mutate(documento)
  }

  const handleDelete = (documento: Documento) => {
    if (confirm(`Tem certeza que deseja excluir o documento "${documento.arquivo_nome}"?`)) {
      deleteMutation.mutate(documento.id)
    }
  }

  const handleViewAllDocuments = () => {
    onOpenChange(false)
    router.push(`/documentos?empresa=${empresa.id}`)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos - {empresa.nome}
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Gerencie os documentos da empresa
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button onClick={() => setUploadModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documento
                </Button>
                <Button variant="outline" onClick={handleViewAllDocuments}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Todos
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                {documentos.length} documento(s) encontrado(s)
              </p>
            </div>

            {/* Documents List */}
            <div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : documentos.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 mb-4">
                    Nenhum documento encontrado para esta empresa
                  </p>
                  <Button onClick={() => setUploadModalOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Fazer primeiro upload
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentos.slice(0, 5).map((documento) => (
                    <div
                      key={documento.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(documento.arquivo_tipo)}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{documento.arquivo_nome}</p>
                            <Badge className={`text-xs ${TIPOS_DOCUMENTO_COLORS[documento.tipo_documento]}`}>
                              {TIPOS_DOCUMENTO_LABELS[documento.tipo_documento]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{formatFileSize(documento.arquivo_tamanho)}</span>
                            <span>•</span>
                            <span>{formatDate(documento.created_at)}</span>
                            <span>•</span>
                            <Badge
                              className={`text-xs ${STATUS_PROCESSAMENTO_COLORS[documento.status_processamento]}`}
                            >
                              <div className="flex items-center gap-1">
                                {getStatusIcon(documento.status_processamento)}
                                {STATUS_PROCESSAMENTO_LABELS[documento.status_processamento]}
                              </div>
                            </Badge>
                          </div>
                          {documento.numero_documento && (
                            <p className="text-xs text-gray-500">
                              Nº {documento.numero_documento}
                              {documento.serie && ` - Série ${documento.serie}`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(documento)}
                          disabled={downloadMutation.isPending}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(documento)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {documentos.length > 5 && (
                    <div className="text-center pt-4">
                      <Button variant="outline" onClick={handleViewAllDocuments}>
                        Ver mais {documentos.length - 5} documento(s)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload */}
      <UploadDocumentoModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        empresaIdPadrao={empresa?.id}
      />
    </>
  )
}
