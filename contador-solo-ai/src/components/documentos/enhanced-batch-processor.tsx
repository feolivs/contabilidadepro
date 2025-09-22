'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  FolderOpen,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Zap,
  Activity,
  Timer,
  Target
} from 'lucide-react'
import { useEmpresas } from '@/hooks/use-empresas'
import { useDocumentRetry } from '@/hooks/use-document-retry'
import { useRealtimeDocuments } from '@/hooks/use-realtime-documents'
import {
  TipoDocumento,
  validarArquivo,
  detectarTipoDocumento,
  TIPOS_DOCUMENTO_LABELS,
  EXTENSOES_ACEITAS
} from '@/types/documento'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EnhancedBatchProcessorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresaIdPadrao?: string
  onComplete?: (results: BatchProcessResult) => void
}

interface BatchFile extends File {
  id: string
  status: 'waiting' | 'uploading' | 'processing' | 'success' | 'error' | 'paused'
  progress: number
  error?: string
  tipoDetectado: TipoDocumento
  empresaId?: string
  priority: number
  startTime?: string
  endTime?: string
  retryCount: number
  documentId?: string
}

interface BatchProcessResult {
  total: number
  success: number
  failed: number
  duration: number
  files: BatchFile[]
}

interface QueueStats {
  total: number
  waiting: number
  processing: number
  completed: number
  failed: number
  paused: number
  estimatedTimeRemaining: number
  averageProcessingTime: number
}

export function EnhancedBatchProcessor({
  open,
  onOpenChange,
  empresaIdPadrao,
  onComplete
}: EnhancedBatchProcessorProps) {
  const [files, setFiles] = useState<BatchFile[]>([])
  const [globalEmpresaId, setGlobalEmpresaId] = useState<string>(empresaIdPadrao || '')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [batchStartTime, setBatchStartTime] = useState<Date | null>(null)
  const [processingStats, setProcessingStats] = useState<QueueStats>({
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    paused: 0,
    estimatedTimeRemaining: 0,
    averageProcessingTime: 0
  })

  const processingIntervalRef = useRef<NodeJS.Timeout>()
  const { data: empresas = [] } = useEmpresas()
  
  const {
    executeWithRetry,
    handleDocumentError,
    isRetrying
  } = useDocumentRetry({
    maxRetries: 2,
    onRetryAttempt: (attempt, error) => {
      console.log(`Retry attempt ${attempt} for batch processing:`, error.message)
    }
  })

  // Configuração do dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: BatchFile[] = acceptedFiles.map((file, index) => {
      const validation = validarArquivo(file)

      return {
        ...file,
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        status: validation.valido ? 'waiting' : 'error',
        progress: 0,
        error: validation.erro,
        tipoDetectado: detectarTipoDocumento(file.name),
        empresaId: globalEmpresaId,
        priority: files.length + index + 1,
        retryCount: 0
      }
    })

    setFiles(prev => [...prev, ...newFiles])

    // Mostrar toast com resumo
    const validFiles = newFiles.filter(f => f.status === 'waiting').length
    const invalidFiles = newFiles.filter(f => f.status === 'error').length

    if (validFiles > 0) {
      toast.success(`${validFiles} arquivo(s) adicionado(s) à fila de processamento`)
    }
    if (invalidFiles > 0) {
      toast.error(`${invalidFiles} arquivo(s) rejeitado(s) por não atenderem aos critérios`)
    }
  }, [globalEmpresaId, files.length])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing
  })

  // Calcular estatísticas da fila
  useEffect(() => {
    const stats: QueueStats = {
      total: files.length,
      waiting: files.filter(f => f.status === 'waiting').length,
      processing: files.filter(f => f.status === 'processing' || f.status === 'uploading').length,
      completed: files.filter(f => f.status === 'success').length,
      failed: files.filter(f => f.status === 'error').length,
      paused: files.filter(f => f.status === 'paused').length,
      estimatedTimeRemaining: 0,
      averageProcessingTime: 0
    }

    // Calcular tempo médio de processamento
    const completedFiles = files.filter(f => f.status === 'success' && f.startTime && f.endTime)
    if (completedFiles.length > 0) {
      const totalTime = completedFiles.reduce((acc, file) => {
        const start = new Date(file.startTime!).getTime()
        const end = new Date(file.endTime!).getTime()
        return acc + (end - start)
      }, 0)
      stats.averageProcessingTime = totalTime / completedFiles.length
    }

    // Estimar tempo restante
    if (stats.averageProcessingTime > 0 && stats.waiting > 0) {
      stats.estimatedTimeRemaining = stats.averageProcessingTime * stats.waiting
    }

    setProcessingStats(stats)
  }, [files])

  // Processar arquivo individual
  const processFile = useCallback(async (file: BatchFile): Promise<void> => {
    if (!file.empresaId) {
      throw new Error('Empresa não definida para o arquivo')
    }

    // Atualizar status para uploading
    setFiles(prev => prev.map(f =>
      f.id === file.id ? { 
        ...f, 
        status: 'uploading', 
        progress: 10,
        startTime: new Date().toISOString()
      } : f
    ))

    return executeWithRetry(async () => {
      // Simular upload e processamento
      // Em implementação real, usar o hook de upload existente
      
      // Fase 1: Upload (10-50%)
      for (let progress = 10; progress <= 50; progress += 10) {
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, progress } : f
        ))
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      // Fase 2: Processamento OCR (50-90%)
      setFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'processing', progress: 60 } : f
      ))

      for (let progress = 60; progress <= 90; progress += 10) {
        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, progress } : f
        ))
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Fase 3: Finalização (90-100%)
      setFiles(prev => prev.map(f =>
        f.id === file.id ? { 
          ...f, 
          status: 'success', 
          progress: 100,
          endTime: new Date().toISOString(),
          documentId: `doc-${Date.now()}`
        } : f
      ))

    }, {
      documentId: file.id,
      fileName: file.name,
      operationType: 'batch_upload'
    })
  }, [executeWithRetry])

  // Iniciar processamento em lote
  const startBatchProcessing = useCallback(async () => {
    const validFiles = files.filter(f => 
      f.status === 'waiting' && f.empresaId && f.tipoDetectado
    )

    if (validFiles.length === 0) {
      toast.error('Nenhum arquivo válido para processamento')
      return
    }

    setIsProcessing(true)
    setIsPaused(false)
    setBatchStartTime(new Date())
    setCurrentFileIndex(0)

    // Ordenar por prioridade
    const sortedFiles = [...validFiles].sort((a, b) => a.priority - b.priority)

    for (let i = 0; i < sortedFiles.length; i++) {
      if (isPaused) {
        // Pausar processamento
        setFiles(prev => prev.map(f =>
          f.status === 'waiting' ? { ...f, status: 'paused' } : f
        ))
        break
      }

      setCurrentFileIndex(i)
      const file = sortedFiles[i]

      try {
        await processFile(file)
      } catch (error) {
        // Marcar como erro e continuar
        setFiles(prev => prev.map(f =>
          f.id === file.id ? {
            ...f,
            status: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            endTime: new Date().toISOString()
          } : f
        ))

        await handleDocumentError(error as Error, {
          documentId: file.id,
          fileName: file.name,
          updateStatus: false
        })
      }
    }

    setIsProcessing(false)
    
    // Calcular resultados finais
    const finalStats = processingStats
    const duration = batchStartTime ? Date.now() - batchStartTime.getTime() : 0
    
    const result: BatchProcessResult = {
      total: finalStats.total,
      success: finalStats.completed,
      failed: finalStats.failed,
      duration,
      files
    }

    onComplete?.(result)
    toast.success(`Processamento concluído: ${result.success}/${result.total} arquivos processados`)
  }, [files, isPaused, processFile, handleDocumentError, processingStats, batchStartTime, onComplete])

  // Pausar/Retomar processamento
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev)
    if (!isPaused) {
      toast.info('Processamento pausado')
    } else {
      toast.info('Processamento retomado')
    }
  }, [isPaused])

  // Remover arquivo da fila
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  // Alterar prioridade
  const changePriority = useCallback((fileId: string, direction: 'up' | 'down') => {
    setFiles(prev => {
      const fileIndex = prev.findIndex(f => f.id === fileId)
      if (fileIndex === -1) return prev

      const newFiles = [...prev]
      const targetIndex = direction === 'up' ? fileIndex - 1 : fileIndex + 1

      if (targetIndex >= 0 && targetIndex < newFiles.length) {
        // Trocar posições
        [newFiles[fileIndex], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[fileIndex]]
        
        // Atualizar prioridades
        newFiles.forEach((file, index) => {
          file.priority = index + 1
        })
      }

      return newFiles
    })
  }, [])

  // Retry arquivo específico
  const retryFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file) return

    setFiles(prev => prev.map(f =>
      f.id === fileId ? { 
        ...f, 
        status: 'waiting', 
        progress: 0, 
        error: undefined,
        retryCount: f.retryCount + 1
      } : f
    ))

    try {
      await processFile(file)
    } catch (error) {
      setFiles(prev => prev.map(f =>
        f.id === fileId ? {
          ...f,
          status: 'error',
          error: error instanceof Error ? error.message : 'Erro no retry'
        } : f
      ))
    }
  }, [files, processFile])

  // Limpar fila
  const clearQueue = useCallback(() => {
    if (isProcessing) {
      toast.error('Não é possível limpar a fila durante o processamento')
      return
    }
    setFiles([])
    setCurrentFileIndex(0)
    setBatchStartTime(null)
  }, [isProcessing])

  const getStatusIcon = (status: BatchFile['status']) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: BatchFile['status']) => {
    switch (status) {
      case 'waiting':
        return 'bg-gray-100 text-gray-800'
      case 'uploading':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-orange-100 text-orange-800'
      case 'success':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Processamento em Lote Avançado
            <Badge variant="outline" className="ml-2">
              Task 1.4 - Batch Processing UI
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-hidden">
          {/* Estatísticas da Fila */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{processingStats.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{processingStats.processing}</div>
                    <div className="text-sm text-muted-foreground">Processando</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{processingStats.completed}</div>
                    <div className="text-sm text-muted-foreground">Concluídos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {processingStats.estimatedTimeRemaining > 0 
                        ? Math.ceil(processingStats.estimatedTimeRemaining / 1000 / 60)
                        : 0
                      }m
                    </div>
                    <div className="text-sm text-muted-foreground">Tempo Restante</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progresso Geral */}
          {isProcessing && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Progresso Geral ({processingStats.completed}/{processingStats.total})
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round((processingStats.completed / processingStats.total) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(processingStats.completed / processingStats.total) * 100} 
                    className="h-2" 
                  />
                  {batchStartTime && (
                    <div className="text-xs text-muted-foreground">
                      Iniciado {formatDistanceToNow(batchStartTime, { addSuffix: true, locale: ptBR })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Configuração Global */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Empresa Padrão</label>
                  <Select value={globalEmpresaId} onValueChange={setGlobalEmpresaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    onClick={startBatchProcessing}
                    disabled={isProcessing || files.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    {isProcessing ? 'Processando...' : 'Iniciar Processamento'}
                  </Button>

                  {isProcessing && (
                    <Button
                      onClick={togglePause}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {isPaused ? 'Retomar' : 'Pausar'}
                    </Button>
                  )}

                  <Button
                    onClick={clearQueue}
                    disabled={isProcessing}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpar Fila
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Área de Drop */}
          <Card>
            <CardContent className="p-6">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                  ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} />
                <Upload className={`h-12 w-12 mx-auto mb-4 ${
                  isDragActive ? 'text-primary' : 'text-gray-400'
                }`} />
                
                {isDragActive ? (
                  <p className="text-primary font-medium">Solte os arquivos aqui...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">
                      Arraste arquivos aqui ou clique para selecionar
                    </p>
                    <p className="text-sm text-gray-500">
                      Suporta PDF, PNG, JPG (máx. 10MB cada)
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fila de Processamento */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Fila de Processamento ({files.length} arquivos)</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{processingStats.waiting} aguardando</Badge>
                    <Badge variant="outline">{processingStats.processing} processando</Badge>
                    <Badge variant="outline">{processingStats.completed} concluídos</Badge>
                    {processingStats.failed > 0 && (
                      <Badge variant="destructive">{processingStats.failed} com erro</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={file.id}
                        className={`p-4 border rounded-lg ${
                          currentFileIndex === index && isProcessing 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-muted-foreground">
                                #{file.priority}
                              </span>
                              {getStatusIcon(file.status)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{file.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {TIPOS_DOCUMENTO_LABELS[file.tipoDetectado]} • {(file.size / 1024 / 1024).toFixed(2)} MB
                                {file.retryCount > 0 && ` • ${file.retryCount} tentativas`}
                              </div>
                            </div>

                            <Badge className={getStatusColor(file.status)}>
                              {file.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {!isProcessing && file.status === 'waiting' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => changePriority(file.id, 'up')}
                                  disabled={index === 0}
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => changePriority(file.id, 'down')}
                                  disabled={index === files.length - 1}
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </>
                            )}

                            {file.status === 'error' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => retryFile(file.id)}
                                className="flex items-center gap-1"
                              >
                                <RotateCcw className="h-3 w-3" />
                                Retry
                              </Button>
                            )}

                            {!isProcessing && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeFile(file.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <div className="mt-3">
                            <Progress value={file.progress} className="h-2" />
                            <div className="text-xs text-muted-foreground mt-1">
                              {file.progress}% - {file.status === 'uploading' ? 'Enviando' : 'Processando'}
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {file.error && (
                          <Alert className="mt-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {file.error}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Timing Info */}
                        {(file.startTime || file.endTime) && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {file.startTime && (
                              <span>
                                Iniciado: {formatDistanceToNow(new Date(file.startTime), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </span>
                            )}
                            {file.endTime && file.startTime && (
                              <span className="ml-4">
                                Duração: {Math.round((new Date(file.endTime).getTime() - new Date(file.startTime).getTime()) / 1000)}s
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator />

        {/* Footer com ações */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {files.length > 0 && (
              <span>
                {processingStats.completed} de {processingStats.total} arquivos processados
                {processingStats.averageProcessingTime > 0 && (
                  <span className="ml-2">
                    • Tempo médio: {Math.round(processingStats.averageProcessingTime / 1000)}s
                  </span>
                )}
              </span>
            )}
          </div>

          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
