/**
 * Serviço de Filas PGMQ - ContabilidadePRO
 * Gerencia processamento assíncrono usando PostgreSQL Message Queue
 */

import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/simple-logger'

export interface QueueMessage<T = any> {
  msg_id: number
  read_ct: number
  enqueued_at: string
  vt: string
  message: T
}

export interface QueueJob {
  id: string
  type: string
  payload: any
  priority?: number
  delay?: number
  maxRetries?: number
}

export type QueueName = 
  | 'calculo_fiscal'
  | 'processamento_documentos'
  | 'notificacoes'
  | 'integracoes_externas'
  | 'geracao_relatorios'

export class QueueService {
  private supabase = createClient()

  /**
   * Adiciona job na fila
   */
  async enqueue<T>(
    queueName: QueueName,
    payload: T,
    delay: number = 0
  ): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('pgmq_send', {
        queue_name: queueName,
        msg: payload,
        delay_seconds: delay
      })

      if (error) throw error

      logger.info('Job adicionado à fila', { queueName, msgId: data })
      return data
    } catch (error) {
      logger.error('Erro ao adicionar job à fila', { queueName, payload, error })
      throw new Error(`Falha ao enfileirar job: ${error}`)
    }
  }

  /**
   * Processa próximo job da fila
   */
  async dequeue<T>(
    queueName: QueueName,
    visibilityTimeout: number = 30
  ): Promise<QueueMessage<T> | null> {
    try {
      const { data, error } = await this.supabase.rpc('pgmq_read', {
        queue_name: queueName,
        vt: visibilityTimeout
      })

      if (error) throw error

      return data?.[0] || null
    } catch (error) {
      logger.error('Erro ao processar fila', { queueName, error })
      throw new Error(`Falha ao processar fila: ${error}`)
    }
  }

  /**
   * Marca job como processado
   */
  async ack(queueName: QueueName, msgId: number): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('pgmq_delete', {
        queue_name: queueName,
        msg_id: msgId
      })

      if (error) throw error

      logger.info('Job processado com sucesso', { queueName, msgId })
      return data
    } catch (error) {
      logger.error('Erro ao confirmar processamento', { queueName, msgId, error })
      return false
    }
  }

  /**
   * Rejeita job e o recoloca na fila
   */
  async nack(queueName: QueueName, msgId: number, delay: number = 60): Promise<boolean> {
    try {
      // Primeiro, obtém a mensagem
      const { data: messages, error: readError } = await this.supabase.rpc('pgmq_read', {
        queue_name: queueName,
        vt: 1
      })

      if (readError) throw readError

      const message = messages?.find((m: any) => m.msg_id === msgId)
      if (!message) return false

      // Recoloca na fila com delay
      await this.enqueue(queueName, message.message, delay)

      // Remove a mensagem original
      await this.ack(queueName, msgId)

      logger.info('Job rejeitado e reenfileirado', { queueName, msgId, delay })
      return true
    } catch (error) {
      logger.error('Erro ao rejeitar job', { queueName, msgId, error })
      return false
    }
  }

  /**
   * Obtém estatísticas da fila
   */
  async getQueueStats(queueName: QueueName) {
    try {
      const { data, error } = await this.supabase.rpc('pgmq_metrics', {
        queue_name: queueName
      })

      if (error) throw error

      return data
    } catch (error) {
      logger.error('Erro ao obter estatísticas da fila', { queueName, error })
      return null
    }
  }

  /**
   * Purga fila (remove todas as mensagens)
   */
  async purgeQueue(queueName: QueueName): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('pgmq_purge_queue', {
        queue_name: queueName
      })

      if (error) throw error

      logger.warn('Fila purgada', { queueName, deletedCount: data })
      return data
    } catch (error) {
      logger.error('Erro ao purgar fila', { queueName, error })
      throw new Error(`Falha ao purgar fila: ${error}`)
    }
  }

  // Métodos específicos para cada tipo de job

  /**
   * Enfileira cálculo fiscal
   */
  async enqueueCalculoFiscal(job: {
    empresaId: string
    tipoCalculo: string
    periodoApuracao: string
    dadosEntrada: any
  }) {
    return this.enqueue('calculo_fiscal', {
      type: 'calculo_fiscal',
      ...job,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Enfileira processamento de documento
   */
  async enqueueProcessamentoDocumento(job: {
    documentoId: string
    tipoDocumento: string
    urlArquivo: string
    ocrProvider?: string
  }) {
    return this.enqueue('processamento_documentos', {
      type: 'processamento_documento',
      ...job,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Enfileira notificação
   */
  async enqueueNotificacao(job: {
    tipo: 'email' | 'sms' | 'push'
    destinatario: string
    template: string
    dados: any
  }) {
    return this.enqueue('notificacoes', {
      type: 'notificacao',
      ...job,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Enfileira integração externa
   */
  async enqueueIntegracaoExterna(job: {
    servico: string
    acao: string
    parametros: any
    webhook?: string
  }) {
    return this.enqueue('integracoes_externas', {
      type: 'integracao_externa',
      ...job,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Enfileira geração de relatório
   */
  async enqueueGeracaoRelatorio(job: {
    tipoRelatorio: string
    parametros: any
    formato: 'pdf' | 'excel' | 'csv'
    destinatario?: string
  }) {
    return this.enqueue('geracao_relatorios', {
      type: 'geracao_relatorio',
      ...job,
      timestamp: new Date().toISOString()
    })
  }
}

export const queueService = new QueueService()
