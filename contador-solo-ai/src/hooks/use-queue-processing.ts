/**
 * Hook para Processamento de Filas - ContabilidadePRO
 * Gerencia jobs assíncronos usando PGMQ
 */

import { useState, useCallback, useEffect } from 'react'
import { queueService, QueueName, QueueMessage } from '@/services/queue-service'
import { logger } from '@/lib/simple-logger'

export interface QueueStats {
  queueName: QueueName
  totalMessages: number
  oldestMessage?: string
  newestMessage?: string
}

export interface ProcessingState {
  isProcessing: boolean
  currentJob: QueueMessage | null
  error: string | null
  processedCount: number
  failedCount: number
}

export function useQueueProcessing(queueName: QueueName) {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    currentJob: null,
    error: null,
    processedCount: 0,
    failedCount: 0
  })
  const [stats, setStats] = useState<QueueStats | null>(null)

  const updateStats = useCallback(async () => {
    try {
      const queueStats = await queueService.getQueueStats(queueName)
      if (queueStats) {
        setStats({
          queueName,
          totalMessages: queueStats.queue_length || 0,
          oldestMessage: queueStats.oldest_msg_age,
          newestMessage: queueStats.newest_msg_age
        })
      }
    } catch (error) {
      logger.error('Erro ao obter estatísticas da fila', { queueName, error })
    }
  }, [queueName])

  const processNextJob = useCallback(async () => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }))

    try {
      const job = await queueService.dequeue(queueName, 30)
      
      if (!job) {
        setState(prev => ({ 
          ...prev, 
          isProcessing: false, 
          currentJob: null 
        }))
        return null
      }

      setState(prev => ({ 
        ...prev, 
        currentJob: job 
      }))

      logger.info('Job obtido da fila', { queueName, jobId: job.msg_id })
      return job
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar fila'
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage,
        currentJob: null
      }))
      logger.error('Erro ao processar próximo job', { queueName, error })
      return null
    }
  }, [queueName])

  const acknowledgeJob = useCallback(async (msgId: number) => {
    try {
      const success = await queueService.ack(queueName, msgId)
      if (success) {
        setState(prev => ({ 
          ...prev, 
          isProcessing: false,
          currentJob: null,
          processedCount: prev.processedCount + 1
        }))
        await updateStats()
        logger.info('Job processado com sucesso', { queueName, msgId })
      }
      return success
    } catch (error) {
      logger.error('Erro ao confirmar processamento', { queueName, msgId, error })
      return false
    }
  }, [queueName, updateStats])

  const rejectJob = useCallback(async (msgId: number, delay: number = 60) => {
    try {
      const success = await queueService.nack(queueName, msgId, delay)
      if (success) {
        setState(prev => ({ 
          ...prev, 
          isProcessing: false,
          currentJob: null,
          failedCount: prev.failedCount + 1
        }))
        await updateStats()
        logger.info('Job rejeitado e reenfileirado', { queueName, msgId, delay })
      }
      return success
    } catch (error) {
      logger.error('Erro ao rejeitar job', { queueName, msgId, error })
      return false
    }
  }, [queueName, updateStats])

  const purgeQueue = useCallback(async () => {
    try {
      const deletedCount = await queueService.purgeQueue(queueName)
      await updateStats()
      logger.warn('Fila purgada', { queueName, deletedCount })
      return deletedCount
    } catch (error) {
      logger.error('Erro ao purgar fila', { queueName, error })
      throw error
    }
  }, [queueName, updateStats])

  // Atualizar estatísticas periodicamente
  useEffect(() => {
    updateStats()
    const interval = setInterval(updateStats, 30000) // A cada 30 segundos
    return () => clearInterval(interval)
  }, [updateStats])

  return {
    // Estado
    isProcessing: state.isProcessing,
    currentJob: state.currentJob,
    error: state.error,
    processedCount: state.processedCount,
    failedCount: state.failedCount,
    stats,

    // Ações
    processNextJob,
    acknowledgeJob,
    rejectJob,
    purgeQueue,
    updateStats,

    // Utilitários
    hasJobs: stats ? stats.totalMessages > 0 : false,
    isEmpty: stats ? stats.totalMessages === 0 : true
  }
}

// Hook para enfileiramento de jobs
export function useJobEnqueue() {
  const [isEnqueuing, setIsEnqueuing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enqueueCalculoFiscal = useCallback(async (job: {
    empresaId: string
    tipoCalculo: string
    periodoApuracao: string
    dadosEntrada: any
  }) => {
    setIsEnqueuing(true)
    setError(null)

    try {
      const msgId = await queueService.enqueueCalculoFiscal(job)
      logger.info('Cálculo fiscal enfileirado', { msgId, job })
      return msgId
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enfileirar cálculo'
      setError(errorMessage)
      logger.error('Erro ao enfileirar cálculo fiscal', { job, error })
      throw error
    } finally {
      setIsEnqueuing(false)
    }
  }, [])

  const enqueueProcessamentoDocumento = useCallback(async (job: {
    documentoId: string
    tipoDocumento: string
    urlArquivo: string
    ocrProvider?: string
  }) => {
    setIsEnqueuing(true)
    setError(null)

    try {
      const msgId = await queueService.enqueueProcessamentoDocumento(job)
      logger.info('Processamento de documento enfileirado', { msgId, job })
      return msgId
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enfileirar processamento'
      setError(errorMessage)
      logger.error('Erro ao enfileirar processamento de documento', { job, error })
      throw error
    } finally {
      setIsEnqueuing(false)
    }
  }, [])

  const enqueueNotificacao = useCallback(async (job: {
    tipo: 'email' | 'sms' | 'push'
    destinatario: string
    template: string
    dados: any
  }) => {
    setIsEnqueuing(true)
    setError(null)

    try {
      const msgId = await queueService.enqueueNotificacao(job)
      logger.info('Notificação enfileirada', { msgId, job })
      return msgId
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enfileirar notificação'
      setError(errorMessage)
      logger.error('Erro ao enfileirar notificação', { job, error })
      throw error
    } finally {
      setIsEnqueuing(false)
    }
  }, [])

  const enqueueIntegracaoExterna = useCallback(async (job: {
    servico: string
    acao: string
    parametros: any
    webhook?: string
  }) => {
    setIsEnqueuing(true)
    setError(null)

    try {
      const msgId = await queueService.enqueueIntegracaoExterna(job)
      logger.info('Integração externa enfileirada', { msgId, job })
      return msgId
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enfileirar integração'
      setError(errorMessage)
      logger.error('Erro ao enfileirar integração externa', { job, error })
      throw error
    } finally {
      setIsEnqueuing(false)
    }
  }, [])

  const enqueueGeracaoRelatorio = useCallback(async (job: {
    tipoRelatorio: string
    parametros: any
    formato: 'pdf' | 'excel' | 'csv'
    destinatario?: string
  }) => {
    setIsEnqueuing(true)
    setError(null)

    try {
      const msgId = await queueService.enqueueGeracaoRelatorio(job)
      logger.info('Geração de relatório enfileirada', { msgId, job })
      return msgId
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enfileirar relatório'
      setError(errorMessage)
      logger.error('Erro ao enfileirar geração de relatório', { job, error })
      throw error
    } finally {
      setIsEnqueuing(false)
    }
  }, [])

  return {
    // Estado
    isEnqueuing,
    error,

    // Ações
    enqueueCalculoFiscal,
    enqueueProcessamentoDocumento,
    enqueueNotificacao,
    enqueueIntegracaoExterna,
    enqueueGeracaoRelatorio,

    // Utilitários
    clearError: () => setError(null)
  }
}
