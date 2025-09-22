'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  FolderOpen
} from 'lucide-react'
import { useEmpresas } from '@/hooks/use-empresas'
import { useUploadDocumento } from '@/hooks/use-documentos'
import {
  TipoDocumento,
  validarArquivo,
  detectarTipoDocumento,
  TIPOS_DOCUMENTO_LABELS,
  EXTENSOES_ACEITAS
} from '@/types/documento'
import { toast } from 'sonner'

interface BatchUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresaIdPadrao?: string
}

interface FileWithMetadata extends File {
  id: string
  status: 'waiting' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  tipoDetectado: TipoDocumento
  empresaId?: string
}

export function BatchUploadModal({
  open,
  onOpenChange,
  empresaIdPadrao
}: BatchUploadModalProps) {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [globalEmpresaId, setGlobalEmpresaId] = useState<string>(empresaIdPadrao || '')
  const [isUploading, setIsUploading] = useState(false)
  const [completedUploads, setCompletedUploads] = useState(0)

  const { data: empresas = [] } = useEmpresas()
  const uploadMutation = useUploadDocumento()

  // Configuração do dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithMetadata[] = acceptedFiles.map(file => {
      const validation = validarArquivo(file)

      return {
        ...file,
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        status: validation.valido ? 'waiting' : 'error',
        progress: 0,
        error: validation.erro,
        tipoDetectado: detectarTipoDocumento(file.name),
        empresaId: globalEmpresaId
      }
    })

    setFiles(prev => [...prev, ...newFiles])

    // Mostrar toast com resumo
    const validFiles = newFiles.filter(f => f.status === 'waiting').length
    const invalidFiles = newFiles.filter(f => f.status === 'error').length

    if (validFiles > 0) {
      toast.success(`${validFiles} arquivo(s) adicionado(s) para upload`)
    }
    if (invalidFiles > 0) {
      toast.error(`${invalidFiles} arquivo(s) rejeitado(s) por não atenderem aos critérios`)
    }
  }, [globalEmpresaId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  })

  // Remover arquivo da lista
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  // Atualizar empresa de um arquivo específico
  const updateFileEmpresa = (fileId: string, empresaId: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, empresaId } : f
    ))
  }

  // Atualizar tipo de documento de um arquivo específico
  const updateFileTipo = (fileId: string, tipo: TipoDocumento) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, tipoDetectado: tipo } : f
    ))
  }

  // Aplicar empresa global a todos os arquivos
  const applyGlobalEmpresa = () => {
    if (!globalEmpresaId) {
      toast.error('Selecione uma empresa primeiro')
      return
    }

    setFiles(prev => prev.map(f => ({ ...f, empresaId: globalEmpresaId })))
    toast.success('Empresa aplicada a todos os arquivos')
  }

  // Iniciar upload em lote
  const startBatchUpload = async () => {
    const validFiles = files.filter(f =>
      f.status === 'waiting' && f.empresaId && f.tipoDetectado
    )

    if (validFiles.length === 0) {
      toast.error('Nenhum arquivo válido para upload. Verifique se todos têm empresa e tipo definidos.')
      return
    }

    setIsUploading(true)
    setCompletedUploads(0)

    // Upload sequencial para evitar sobrecarga
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]

      try {
        // Atualizar status para uploading
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
        ))

        // Simular progresso (em um cenário real, isso viria do hook de upload)
        const progressInterval = setInterval(() => {
          setFiles(prev => prev.map(f => {
            if (f.id === file.id && f.progress < 90) {
              return { ...f, progress: f.progress + 10 }
            }
            return f
          }))
        }, 200)

        // Fazer upload
        await uploadMutation.mutateAsync({
          arquivo: file,
          empresa_id: file.empresaId!,
          tipo_documento: file.tipoDetectado
        })

        clearInterval(progressInterval)

        // Marcar como sucesso
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'success', progress: 100 } : f
        ))

        setCompletedUploads(prev => prev + 1)

      } catch (error) {
        // Marcar como erro
        setFiles(prev => prev.map(f =>
          f.id === file.id ? {
            ...f,
            status: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          } : f
        ))
      }
    }

    setIsUploading(false)
    toast.success(`Upload em lote concluído: ${completedUploads} arquivo(s) enviado(s)`)
  }

  // Limpar lista
  const clearFiles = () => {
    setFiles([])
    setCompletedUploads(0)
  }

  // Estatísticas
  const stats = {
    total: files.length,
    waiting: files.filter(f => f.status === 'waiting').length,
    uploading: files.filter(f => f.status === 'uploading').length,
    success: files.filter(f => f.status === 'success').length,
    error: files.filter(f => f.status === 'error').length
  }

  const overallProgress = files.length > 0
    ? Math.round((stats.success + stats.error) / files.length * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Upload em Lote de Documentos
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-hidden">
          {/* Área de Drop */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg">Solte os arquivos aqui...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Arraste arquivos aqui ou clique para selecionar</p>
                <p className="text-sm text-muted-foreground">
                  Tipos aceitos: {EXTENSOES_ACEITAS.join(', ')} (máx. 10MB cada)
                </p>
              </div>
            )}
          </div>

          {/* Configurações Globais */}
          {files.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-3">Configurações Globais</h3>
              <div className="flex items-center gap-3">
                <Select value={globalEmpresaId} onValueChange={setGlobalEmpresaId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Selecionar empresa para todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={applyGlobalEmpresa}>
                  Aplicar a Todos
                </Button>
              </div>
            </div>
          )}

          {/* Estatísticas */}
          {files.length > 0 && (
            <div className="grid grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
                <div className="text-sm text-muted-foreground">Aguardando</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.uploading}</div>
                <div className="text-sm text-muted-foreground">Enviando</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                <div className="text-sm text-muted-foreground">Sucesso</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.error}</div>
                <div className="text-sm text-muted-foreground">Erro</div>
              </div>
            </div>
          )}

          {/* Progresso Geral */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso Geral</span>
                <span>{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          )}

          {/* Lista de Arquivos */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Arquivos ({files.length})</h3>
                <Button variant="outline" size="sm" onClick={clearFiles}>
                  Limpar Todos
                </Button>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-3">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {file.status === 'waiting' && <Clock className="h-4 w-4 text-yellow-500" />}
                        {file.status === 'uploading' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                        {file.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {file.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">{file.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {(file.size / 1024).toFixed(1)} KB
                          </Badge>
                        </div>

                        {file.status === 'uploading' && (
                          <Progress value={file.progress} className="h-1 mt-1" />
                        )}

                        {file.error && (
                          <p className="text-xs text-red-600 mt-1">{file.error}</p>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        <Select
                          value={file.empresaId || ''}
                          onValueChange={(value) => updateFileEmpresa(file.id, value)}
                          disabled={file.status === 'uploading' || file.status === 'success'}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Empresa" />
                          </SelectTrigger>
                          <SelectContent>
                            {empresas.map((empresa) => (
                              <SelectItem key={empresa.id} value={empresa.id}>
                                {empresa.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={file.tipoDetectado}
                          onValueChange={(value) => updateFileTipo(file.id, value as TipoDocumento)}
                          disabled={file.status === 'uploading' || file.status === 'success'}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TIPOS_DOCUMENTO_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          disabled={file.status === 'uploading'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {files.length > 0 && `${files.length} arquivo(s) selecionado(s)`}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={startBatchUpload}
              disabled={isUploading || stats.waiting === 0}
              className="min-w-32"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Todos ({stats.waiting})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}