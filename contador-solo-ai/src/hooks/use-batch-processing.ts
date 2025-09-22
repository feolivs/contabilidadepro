import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { useDocumentRetry } from './use-document-retry'
import { analyzeDocumentError } from '@/lib/document-error-handling'
import type { TipoDocumento } from '@/types/documento'

/**
 * Interface para arquivo em processamento batch
 */
export interface BatchFile {
  id: string
  file: File
  status: 'waiting' | 'uploading' | 'processing' | 'success' | 'error' | 'paused'
  progress: number
  error?: string
  tipoDocumento: TipoDocumento
  empresaId: string
  priority: number
  startTime?: string
  endTime?: string
  retryCount: number
  documentId?: string
  estimatedDuration?: number
}

/**
 * Configuração do processamento batch
 */
export interface BatchConfig {
  maxConcurrent?: number
  retryAttempts?: number
  pauseOnError?: boolean
  priorityProcessing?: boolean
  estimateTime?: boolean
}

/**
 * Estatísticas do processamento batch
 */
export interface BatchStats {
  total: number
  waiting: number
  processing: number
  completed: number
  failed: number
  paused: number
  averageTime: number
  estimatedRemaining: number
  throughput: number // arquivos por minuto
}

/**
 * Resultado do processamento batch
 */
export interface BatchResult {
  success: boolean
  totalFiles: number
  successCount: number
  failureCount: number
  duration: number
  errors: Array<{
    fileId: string
    fileName: string
    error: string
  }>
}

/**
 * Hook para gerenciar processamento em lote de documentos
 */
export function useBatchProcessing(config: BatchConfig = {}) {
  const [files, setFiles] = useState<BatchFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentBatch, setCurrentBatch] = useState<string[]>([])
  const [batchStartTime, setBatchStartTime] = useState<Date | null>(null)
  const [stats, setStats] = useState<BatchStats>({
    total: 0,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    paused: 0,
    averageTime: 0,
    estimatedRemaining: 0,
    throughput: 0
  })

  const processingQueue = useRef<string[]>([])
  const completedTimes = useRef<number[]>([])
  const supabase = createBrowserSupabaseClient()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const {
    maxConcurrent = 3,
    retryAttempts = 2,
    pauseOnError = false,
    priorityProcessing = true,
    estimateTime = true
  } = config

  const {
    executeWithRetry,
    handleDocumentError
  } = useDocumentRetry({
    maxRetries: retryAttempts,
    onRetryAttempt: (attempt, error) => {
      console.log(`Batch retry attempt ${attempt}:`, error.message)
    }
  })

  /**
   * Adicionar arquivos à fila de processamento
   */
  const addFiles = useCallback((newFiles: File[], empresaId: string, tipoDocumento?: TipoDocumento) => {
    const batchFiles: BatchFile[] = newFiles.map((file, index) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      file,
      status: 'waiting',
      progress: 0,
      tipoDocumento: tipoDocumento || detectDocumentType(file.name),
      empresaId,
      priority: files.length + index + 1,
      retryCount: 0,
      estimatedDuration: estimateTime ? estimateProcessingTime(file) : undefined
    }))

    setFiles(prev => [...prev, ...batchFiles])
    return batchFiles.map(f => f.id)
  }, [files.length, estimateTime])

  /**
   * Detectar tipo de documento baseado no nome do arquivo
   */
  const detectDocumentType = useCallback((fileName: string): TipoDocumento => {
    const name = fileName.toLowerCase()
    if (name.includes('nfe') || name.includes('nota fiscal')) return 'NFE'
    if (name.includes('recibo')) return 'RECIBO'
    if (name.includes('boleto')) return 'BOLETO'
    if (name.includes('contrato')) return 'CONTRATO'
    if (name.includes('comprovante')) return 'COMPROVANTE'
    return 'OUTROS'
  }, [])

  /**
   * Estimar tempo de processamento baseado no tamanho do arquivo
   */
  const estimateProcessingTime = useCallback((file: File): number => {
    // Estimativa baseada no tamanho: ~2s por MB + overhead
    const sizeInMB = file.size / (1024 * 1024)
    const baseTime = Math.max(5000, sizeInMB * 2000) // mínimo 5s, 2s por MB
    
    // Ajustar baseado no tipo de arquivo
    const isPDF = file.type === 'application/pdf'
    const multiplier = isPDF ? 1.5 : 1.0 // PDFs demoram mais
    
    return Math.round(baseTime * multiplier)
  }, [])

  /**
   * Processar um arquivo individual
   */
  const processFile = useCallback(async (fileData: BatchFile): Promise<void> => {
    if (!user) throw new Error('Usuário não autenticado')

    // Atualizar status para uploading
    setFiles(prev => prev.map(f =>
      f.id === fileData.id ? {
        ...f,
        status: 'uploading',
        progress: 10,
        startTime: new Date().toISOString()
      } : f
    ))

    return executeWithRetry(async () => {
      // Fase 1: Upload para Storage
      const fileExt = fileData.file.name.split('.').pop()
      const fileName = `batch/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, fileData.file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }

      // Atualizar progresso
      setFiles(prev => prev.map(f =>
        f.id === fileData.id ? { ...f, progress: 40 } : f
      ))

      // Fase 2: Criar registro no banco
      const { data: documento, error: dbError } = await supabase
        .from('documentos')
        .insert({
          arquivo_nome: fileData.file.name,
          arquivo_path: uploadData.path,
          arquivo_tamanho: fileData.file.size,
          tipo_mime: fileData.file.type,
          tipo_documento: fileData.tipoDocumento,
          empresa_id: fileData.empresaId,
          status_processamento: 'pendente',
          user_id: user.id,
          created_at: new Date().toISOString(),
          metadata: {
            batch_processing: true,
            batch_id: batchStartTime?.toISOString(),
            priority: fileData.priority
          }
        })
        .select()
        .single()

      if (dbError) {
        throw new Error(`Erro ao salvar documento: ${dbError.message}`)
      }

      // Atualizar progresso
      setFiles(prev => prev.map(f =>
        f.id === fileData.id ? { 
          ...f, 
          progress: 60, 
          status: 'processing',
          documentId: documento.id 
        } : f
      ))

      // Fase 3: Processar com OCR
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('pdf-ocr-service', {
        body: {
          action: 'process_ocr',
          documentId: documento.id,
          filePath: uploadData.path,
          fileName: fileData.file.name,
          options: {
            documentType: fileData.tipoDocumento,
            userId: user.id,
            batchProcessing: true
          }
        }
      })

      if (ocrError) {
        console.warn('OCR processing failed, but document was saved:', ocrError)
        // Não falhar completamente - documento foi salvo
      }

      // Atualizar progresso final
      setFiles(prev => prev.map(f =>
        f.id === fileData.id ? {
          ...f,
          status: 'success',
          progress: 100,
          endTime: new Date().toISOString()
        } : f
      ))

      // Registrar tempo de processamento
      if (fileData.startTime) {
        const processingTime = Date.now() - new Date(fileData.startTime).getTime()
        completedTimes.current.push(processingTime)
        
        // Manter apenas os últimos 50 tempos para cálculo de média
        if (completedTimes.current.length > 50) {
          completedTimes.current = completedTimes.current.slice(-50)
        }
      }

    }, {
      documentId: fileData.id,
      fileName: fileData.file.name,
      operationType: 'batch_processing'
    })
  }, [user, executeWithRetry, supabase, batchStartTime])

  /**
   * Iniciar processamento em lote
   */
  const startBatchProcessing = useCallback(async (): Promise<BatchResult> => {
    const waitingFiles = files.filter(f => f.status === 'waiting')
    
    if (waitingFiles.length === 0) {
      throw new Error('Nenhum arquivo aguardando processamento')
    }

    setIsProcessing(true)
    setIsPaused(false)
    setBatchStartTime(new Date())
    
    const startTime = Date.now()
    let successCount = 0
    let failureCount = 0
    const errors: BatchResult['errors'] = []

    // Ordenar por prioridade se habilitado
    const sortedFiles = priorityProcessing 
      ? [...waitingFiles].sort((a, b) => a.priority - b.priority)
      : waitingFiles

    // Processar em lotes concorrentes
    const batches: BatchFile[][] = []
    for (let i = 0; i < sortedFiles.length; i += maxConcurrent) {
      batches.push(sortedFiles.slice(i, i + maxConcurrent))
    }

    for (const batch of batches) {
      if (isPaused) break

      setCurrentBatch(batch.map(f => f.id))

      // Processar arquivos do lote em paralelo
      const batchPromises = batch.map(async (file) => {
        try {
          await processFile(file)
          successCount++
        } catch (error) {
          failureCount++
          
          // Marcar arquivo como erro
          setFiles(prev => prev.map(f =>
            f.id === file.id ? {
              ...f,
              status: 'error',
              error: error instanceof Error ? error.message : 'Erro desconhecido',
              endTime: new Date().toISOString()
            } : f
          ))

          errors.push({
            fileId: file.id,
            fileName: file.file.name,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          })

          // Tratar erro
          await handleDocumentError(error as Error, {
            documentId: file.id,
            fileName: file.file.name,
            updateStatus: false
          })

          // Pausar em erro se configurado
          if (pauseOnError) {
            setIsPaused(true)
            toast.warning('Processamento pausado devido a erro')
          }
        }
      })

      await Promise.all(batchPromises)
    }

    const duration = Date.now() - startTime
    setIsProcessing(false)
    setCurrentBatch([])

    // Invalidar queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['documentos'] })
    queryClient.invalidateQueries({ queryKey: ['processed-documents'] })

    const result: BatchResult = {
      success: failureCount === 0,
      totalFiles: waitingFiles.length,
      successCount,
      failureCount,
      duration,
      errors
    }

    return result
  }, [
    files, 
    maxConcurrent, 
    priorityProcessing, 
    isPaused, 
    pauseOnError,
    processFile, 
    handleDocumentError, 
    queryClient
  ])

  /**
   * Pausar/retomar processamento
   */
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev)
  }, [])

  /**
   * Cancelar processamento
   */
  const cancelProcessing = useCallback(() => {
    setIsProcessing(false)
    setIsPaused(false)
    setCurrentBatch([])
    
    // Marcar arquivos em processamento como pausados
    setFiles(prev => prev.map(f =>
      f.status === 'uploading' || f.status === 'processing' 
        ? { ...f, status: 'paused' } 
        : f
    ))
  }, [])

  /**
   * Remover arquivo da fila
   */
  const removeFile = useCallback((fileId: string) => {
    if (isProcessing && currentBatch.includes(fileId)) {
      toast.error('Não é possível remover arquivo em processamento')
      return false
    }
    
    setFiles(prev => prev.filter(f => f.id !== fileId))
    return true
  }, [isProcessing, currentBatch])

  /**
   * Alterar prioridade de arquivo
   */
  const changePriority = useCallback((fileId: string, newPriority: number) => {
    if (isProcessing) {
      toast.error('Não é possível alterar prioridade durante processamento')
      return false
    }

    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, priority: newPriority } : f
    ))
    return true
  }, [isProcessing])

  /**
   * Retry arquivo específico
   */
  const retryFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (!file || file.status !== 'error') return false

    setFiles(prev => prev.map(f =>
      f.id === fileId ? {
        ...f,
        status: 'waiting',
        progress: 0,
        error: undefined,
        retryCount: f.retryCount + 1
      } : f
    ))

    return true
  }, [files])

  /**
   * Limpar fila
   */
  const clearQueue = useCallback(() => {
    if (isProcessing) {
      toast.error('Não é possível limpar fila durante processamento')
      return false
    }
    
    setFiles([])
    setCurrentBatch([])
    setBatchStartTime(null)
    completedTimes.current = []
    return true
  }, [isProcessing])

  /**
   * Calcular estatísticas em tempo real
   */
  const calculateStats = useCallback((): BatchStats => {
    const total = files.length
    const waiting = files.filter(f => f.status === 'waiting').length
    const processing = files.filter(f => f.status === 'processing' || f.status === 'uploading').length
    const completed = files.filter(f => f.status === 'success').length
    const failed = files.filter(f => f.status === 'error').length
    const paused = files.filter(f => f.status === 'paused').length

    // Calcular tempo médio
    const averageTime = completedTimes.current.length > 0
      ? completedTimes.current.reduce((a, b) => a + b, 0) / completedTimes.current.length
      : 0

    // Estimar tempo restante
    const estimatedRemaining = averageTime > 0 && waiting > 0
      ? (averageTime * waiting) / maxConcurrent
      : 0

    // Calcular throughput (arquivos por minuto)
    const throughput = batchStartTime && completed > 0
      ? (completed / ((Date.now() - batchStartTime.getTime()) / 60000))
      : 0

    return {
      total,
      waiting,
      processing,
      completed,
      failed,
      paused,
      averageTime,
      estimatedRemaining,
      throughput
    }
  }, [files, maxConcurrent, batchStartTime])

  // Atualizar estatísticas quando files mudam
  useState(() => {
    setStats(calculateStats())
  })

  return {
    // Estado
    files,
    isProcessing,
    isPaused,
    currentBatch,
    stats: calculateStats(),
    batchStartTime,

    // Ações
    addFiles,
    startBatchProcessing,
    togglePause,
    cancelProcessing,
    removeFile,
    changePriority,
    retryFile,
    clearQueue,

    // Utilitários
    detectDocumentType,
    estimateProcessingTime
  }
}
