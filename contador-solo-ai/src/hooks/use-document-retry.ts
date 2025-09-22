import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  analyzeDocumentError, 
  showErrorNotification, 
  shouldUpdateDocumentStatus,
  calculateRetryDelay,
  type DocumentError,
  DocumentErrorType 
} from '@/lib/document-error-handling'
import type { StatusProcessamento } from '@/types/documento'

/**
 * Interface para configuração de retry
 */
interface RetryConfig {
  maxRetries?: number
  baseDelay?: number
  exponentialBackoff?: boolean
  onRetryAttempt?: (attempt: number, error: DocumentError) => void
  onMaxRetriesReached?: (error: DocumentError) => void
}

/**
 * Interface para estado de retry
 */
interface RetryState {
  isRetrying: boolean
  currentAttempt: number
  maxAttempts: number
  nextRetryIn?: number
  lastError?: DocumentError
}

/**
 * Hook para gerenciar retry automático de operações de documento
 */
export function useDocumentRetry(config: RetryConfig = {}) {
  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    currentAttempt: 0,
    maxAttempts: 0
  })
  
  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  
  const {
    maxRetries = 3,
    baseDelay = 2,
    exponentialBackoff = true,
    onRetryAttempt,
    onMaxRetriesReached
  } = config

  /**
   * Executa uma operação com retry automático
   */
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: {
      documentId?: string
      fileName?: string
      operationType?: string
    }
  ): Promise<T> => {
    let lastError: DocumentError | null = null
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        setRetryState(prev => ({
          ...prev,
          isRetrying: attempt > 1,
          currentAttempt: attempt,
          maxAttempts: maxRetries + 1
        }))

        const result = await operation()
        
        // Sucesso - limpar estado de retry
        setRetryState({
          isRetrying: false,
          currentAttempt: 0,
          maxAttempts: 0
        })
        
        return result
        
      } catch (error) {
        const documentError = analyzeDocumentError(error as Error, context)
        lastError = documentError
        
        // Se não pode fazer retry ou é a última tentativa
        if (!documentError.canRetry || attempt > maxRetries) {
          setRetryState({
            isRetrying: false,
            currentAttempt: attempt,
            maxAttempts: maxRetries + 1,
            lastError: documentError
          })
          
          if (onMaxRetriesReached) {
            onMaxRetriesReached(documentError)
          }
          
          throw documentError
        }
        
        // Calcular delay para próxima tentativa
        const delay = exponentialBackoff 
          ? calculateRetryDelay(attempt, documentError.retryDelay || baseDelay)
          : (documentError.retryDelay || baseDelay)
        
        console.warn(`Tentativa ${attempt} falhou, tentando novamente em ${delay}s:`, documentError.message)
        
        // Notificar sobre tentativa de retry
        if (onRetryAttempt) {
          onRetryAttempt(attempt, documentError)
        }
        
        // Mostrar notificação apenas na primeira falha
        if (attempt === 1) {
          toast.warning(`${documentError.userMessage} Tentando novamente...`, {
            duration: delay * 1000
          })
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay * 1000)
        })
      }
    }
    
    // Nunca deveria chegar aqui, mas por segurança
    throw lastError || new Error('Falha desconhecida no retry')
  }, [maxRetries, baseDelay, exponentialBackoff, onRetryAttempt, onMaxRetriesReached])

  /**
   * Mutation para atualizar status de documento com retry
   */
  const updateDocumentStatusMutation = useMutation({
    mutationFn: async ({ 
      documentId, 
      status, 
      errorDetails 
    }: { 
      documentId: string
      status: StatusProcessamento
      errorDetails?: string 
    }) => {
      return executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('documentos')
          .update({
            status_processamento: status,
            observacoes: errorDetails,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)
          .select()
          .single()

        if (error) {
          throw new Error(`Erro ao atualizar documento: ${error.message}`)
        }

        return data
      }, { documentId, operationType: 'update_status' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
    }
  })

  /**
   * Mutation para reprocessar documento com retry
   */
  const reprocessDocumentMutation = useMutation({
    mutationFn: async ({ documentId, fileName }: { documentId: string, fileName?: string }) => {
      return executeWithRetry(async () => {
        // Primeiro, resetar status para pendente
        const { error: updateError } = await supabase
          .from('documentos')
          .update({
            status_processamento: 'pendente',
            observacoes: 'Reprocessamento solicitado',
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)

        if (updateError) {
          throw new Error(`Erro ao resetar documento: ${updateError.message}`)
        }

        // Depois, chamar edge function para reprocessar
        const { data, error } = await supabase.functions.invoke('pdf-ocr-service', {
          body: { 
            documentId,
            action: 'reprocess'
          }
        })

        if (error) {
          throw new Error(`Erro no reprocessamento: ${error.message}`)
        }

        return data
      }, { documentId, fileName, operationType: 'reprocess' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      toast.success('Documento enviado para reprocessamento')
    }
  })

  /**
   * Função para lidar com erro de documento de forma inteligente
   */
  const handleDocumentError = useCallback(async (
    error: Error | string,
    context?: {
      documentId?: string
      fileName?: string
      autoRetry?: boolean
      updateStatus?: boolean
    }
  ) => {
    const documentError = analyzeDocumentError(error, context)
    
    // Mostrar notificação apropriada
    showErrorNotification(documentError)
    
    // Atualizar status do documento se necessário
    if (context?.updateStatus && context.documentId) {
      const newStatus = shouldUpdateDocumentStatus(documentError)
      if (newStatus) {
        try {
          await updateDocumentStatusMutation.mutateAsync({
            documentId: context.documentId,
            status: newStatus,
            errorDetails: `${documentError.type}: ${documentError.message}`
          })
        } catch (updateError) {
          console.error('Erro ao atualizar status do documento:', updateError)
        }
      }
    }
    
    // Retry automático se configurado e possível
    if (context?.autoRetry && documentError.canRetry) {
      if (context.documentId) {
        try {
          await reprocessDocumentMutation.mutateAsync({
            documentId: context.documentId,
            fileName: context.fileName
          })
        } catch (retryError) {
          console.error('Erro no retry automático:', retryError)
        }
      }
    }
    
    return documentError
  }, [updateDocumentStatusMutation, reprocessDocumentMutation])

  /**
   * Cancela retry em andamento
   */
  const cancelRetry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = undefined
    }
    
    setRetryState({
      isRetrying: false,
      currentAttempt: 0,
      maxAttempts: 0
    })
  }, [])

  /**
   * Retry manual de um documento específico
   */
  const manualRetry = useCallback(async (documentId: string, fileName?: string) => {
    try {
      await reprocessDocumentMutation.mutateAsync({ documentId, fileName })
    } catch (error) {
      await handleDocumentError(error as Error, {
        documentId,
        fileName,
        updateStatus: true
      })
    }
  }, [reprocessDocumentMutation, handleDocumentError])

  return {
    // Estado
    retryState,
    isRetrying: retryState.isRetrying,
    
    // Funções principais
    executeWithRetry,
    handleDocumentError,
    manualRetry,
    cancelRetry,
    
    // Mutations
    updateDocumentStatus: updateDocumentStatusMutation.mutateAsync,
    reprocessDocument: reprocessDocumentMutation.mutateAsync,
    
    // Estados das mutations
    isUpdatingStatus: updateDocumentStatusMutation.isPending,
    isReprocessing: reprocessDocumentMutation.isPending
  }
}
