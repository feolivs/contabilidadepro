/**
 * Worker para Processamento de Filas PGMQ - ContabilidadePRO
 * Processa jobs assíncronos em background
 */

import { queueService, QueueName } from '@/services/queue-service'
import { logger } from '@/lib/simple-logger'

export interface WorkerConfig {
  queueName: QueueName
  concurrency: number
  pollInterval: number
  maxRetries: number
  visibilityTimeout: number
}

export interface JobProcessor<T = any> {
  process(data: T): Promise<any>
  validate?(data: T): boolean
  onSuccess?(result: any, data: T): Promise<void>
  onError?(error: Error, data: T): Promise<void>
}

export class QueueWorker {
  private isRunning = false
  private processors = new Map<string, JobProcessor>()
  private config: WorkerConfig
  private pollTimer?: NodeJS.Timeout

  constructor(config: WorkerConfig) {
    this.config = config
  }

  /**
   * Registra um processador para um tipo de job
   */
  registerProcessor(jobType: string, processor: JobProcessor) {
    this.processors.set(jobType, processor)
    logger.info('Processador registrado', { queueName: this.config.queueName, jobType })
  }

  /**
   * Inicia o worker
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Worker já está rodando', { queueName: this.config.queueName })
      return
    }

    this.isRunning = true
    logger.info('Worker iniciado', { 
      queueName: this.config.queueName,
      concurrency: this.config.concurrency,
      pollInterval: this.config.pollInterval
    })

    // Iniciar polling
    this.startPolling()
  }

  /**
   * Para o worker
   */
  async stop() {
    if (!this.isRunning) return

    this.isRunning = false
    
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = undefined
    }

    logger.info('Worker parado', { queueName: this.config.queueName })
  }

  /**
   * Inicia o polling da fila
   */
  private startPolling() {
    if (!this.isRunning) return

    this.pollTimer = setTimeout(async () => {
      try {
        await this.processJobs()
      } catch (error) {
        logger.error('Erro no polling', { 
          queueName: this.config.queueName, 
          error 
        })
      } finally {
        // Reagendar próximo poll
        this.startPolling()
      }
    }, this.config.pollInterval)
  }

  /**
   * Processa jobs da fila
   */
  private async processJobs() {
    const promises: Promise<void>[] = []

    // Processar até o limite de concorrência
    for (let i = 0; i < this.config.concurrency; i++) {
      promises.push(this.processNextJob())
    }

    await Promise.allSettled(promises)
  }

  /**
   * Processa o próximo job da fila
   */
  private async processNextJob() {
    try {
      const job = await queueService.dequeue(
        this.config.queueName,
        this.config.visibilityTimeout
      )

      if (!job) return // Nenhum job disponível

      logger.info('Processando job', {
        queueName: this.config.queueName,
        jobId: job.msg_id,
        jobType: job.message.type
      })

      const processor = this.processors.get(job.message.type)
      if (!processor) {
        logger.error('Processador não encontrado', {
          queueName: this.config.queueName,
          jobId: job.msg_id,
          jobType: job.message.type
        })
        await queueService.ack(this.config.queueName, job.msg_id)
        return
      }

      // Validar dados se necessário
      if (processor.validate && !processor.validate(job.message)) {
        logger.error('Dados do job inválidos', {
          queueName: this.config.queueName,
          jobId: job.msg_id,
          jobType: job.message.type
        })
        await queueService.ack(this.config.queueName, job.msg_id)
        return
      }

      try {
        // Processar job
        const result = await processor.process(job.message)

        // Callback de sucesso
        if (processor.onSuccess) {
          await processor.onSuccess(result, job.message)
        }

        // Confirmar processamento
        await queueService.ack(this.config.queueName, job.msg_id)

        logger.info('Job processado com sucesso', {
          queueName: this.config.queueName,
          jobId: job.msg_id,
          jobType: job.message.type
        })

      } catch (error) {
        logger.error('Erro no processamento do job', {
          queueName: this.config.queueName,
          jobId: job.msg_id,
          jobType: job.message.type,
          error
        })

        // Callback de erro
        if (processor.onError) {
          await processor.onError(error as Error, job.message)
        }

        // Decidir se deve rejeitar ou confirmar
        if (job.read_ct >= this.config.maxRetries) {
          // Máximo de tentativas atingido, confirmar para remover da fila
          await queueService.ack(this.config.queueName, job.msg_id)
          logger.error('Job descartado após máximo de tentativas', {
            queueName: this.config.queueName,
            jobId: job.msg_id,
            attempts: job.read_ct
          })
        } else {
          // Rejeitar para tentar novamente
          await queueService.nack(this.config.queueName, job.msg_id, 60)
          logger.info('Job rejeitado para nova tentativa', {
            queueName: this.config.queueName,
            jobId: job.msg_id,
            attempts: job.read_ct
          })
        }
      }

    } catch (error) {
      logger.error('Erro ao processar próximo job', {
        queueName: this.config.queueName,
        error
      })
    }
  }

  /**
   * Obtém estatísticas do worker
   */
  getStats() {
    return {
      queueName: this.config.queueName,
      isRunning: this.isRunning,
      registeredProcessors: Array.from(this.processors.keys()),
      config: this.config
    }
  }
}

// Factory para criar workers pré-configurados
export class WorkerFactory {
  static createCalculoFiscalWorker(): QueueWorker {
    return new QueueWorker({
      queueName: 'calculo_fiscal',
      concurrency: 2,
      pollInterval: 5000,
      maxRetries: 3,
      visibilityTimeout: 300
    })
  }

  static createProcessamentoDocumentosWorker(): QueueWorker {
    return new QueueWorker({
      queueName: 'processamento_documentos',
      concurrency: 1,
      pollInterval: 10000,
      maxRetries: 2,
      visibilityTimeout: 600
    })
  }

  static createNotificacoesWorker(): QueueWorker {
    return new QueueWorker({
      queueName: 'notificacoes',
      concurrency: 5,
      pollInterval: 2000,
      maxRetries: 5,
      visibilityTimeout: 60
    })
  }

  static createIntegracoesExternasWorker(): QueueWorker {
    return new QueueWorker({
      queueName: 'integracoes_externas',
      concurrency: 3,
      pollInterval: 5000,
      maxRetries: 3,
      visibilityTimeout: 180
    })
  }

  static createGeracaoRelatoriosWorker(): QueueWorker {
    return new QueueWorker({
      queueName: 'geracao_relatorios',
      concurrency: 1,
      pollInterval: 15000,
      maxRetries: 2,
      visibilityTimeout: 900
    })
  }
}
