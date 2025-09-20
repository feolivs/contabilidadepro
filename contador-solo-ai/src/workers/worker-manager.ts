/**
 * Gerenciador de Workers - ContabilidadePRO
 * Coordena todos os workers de processamento assíncrono
 */

import { QueueWorker, WorkerFactory } from './queue-worker'
import { CalculoFiscalProcessor } from './processors/calculo-fiscal-processor'
import { NotificacaoProcessor } from './processors/notificacao-processor'
import { DocumentoProcessor } from './processors/documento-processor'
import { logger } from '@/lib/simple-logger'

export interface WorkerManagerConfig {
  autoStart: boolean
  healthCheckInterval: number
  restartOnError: boolean
  maxRestartAttempts: number
}

export class WorkerManager {
  private workers = new Map<string, QueueWorker>()
  private processors = new Map<string, any>()
  private config: WorkerManagerConfig
  private healthCheckTimer?: NodeJS.Timeout
  private restartAttempts = new Map<string, number>()

  constructor(config: Partial<WorkerManagerConfig> = {}) {
    this.config = {
      autoStart: true,
      healthCheckInterval: 30000, // 30 segundos
      restartOnError: true,
      maxRestartAttempts: 3,
      ...config
    }

    this.initializeProcessors()
    this.initializeWorkers()

    if (this.config.autoStart) {
      this.startAll()
    }
  }

  /**
   * Inicializa os processadores
   */
  private initializeProcessors() {
    this.processors.set('calculo-fiscal', new CalculoFiscalProcessor())
    this.processors.set('notificacao', new NotificacaoProcessor())
    this.processors.set('documento', new DocumentoProcessor())

    logger.info('Processadores inicializados', {
      count: this.processors.size,
      types: Array.from(this.processors.keys())
    })
  }

  /**
   * Inicializa os workers
   */
  private initializeWorkers() {
    // Worker de Cálculo Fiscal
    const calculoWorker = WorkerFactory.createCalculoFiscalWorker()
    calculoWorker.registerProcessor('calculo_fiscal', this.processors.get('calculo-fiscal'))
    this.workers.set('calculo-fiscal', calculoWorker)

    // Worker de Processamento de Documentos
    const documentoWorker = WorkerFactory.createProcessamentoDocumentosWorker()
    documentoWorker.registerProcessor('processamento_documento', this.processors.get('documento'))
    this.workers.set('processamento-documentos', documentoWorker)

    // Worker de Notificações
    const notificacaoWorker = WorkerFactory.createNotificacoesWorker()
    const notificacaoProcessor = this.processors.get('notificacao')
    notificacaoWorker.registerProcessor('notificacao', notificacaoProcessor)
    this.workers.set('notificacoes', notificacaoWorker)

    // Worker de Integrações Externas
    const integracaoWorker = WorkerFactory.createIntegracoesExternasWorker()
    integracaoWorker.registerProcessor('consulta_cnpj', this.createConsultaCNPJProcessor())
    integracaoWorker.registerProcessor('consulta_cep', this.createConsultaCEPProcessor())
    integracaoWorker.registerProcessor('webhook_receita', this.createWebhookReceitaProcessor())
    this.workers.set('integracoes-externas', integracaoWorker)

    // Worker de Geração de Relatórios
    const relatorioWorker = WorkerFactory.createGeracaoRelatoriosWorker()
    relatorioWorker.registerProcessor('gerar_relatorio', this.createRelatorioProcessor())
    relatorioWorker.registerProcessor('exportar_dados', this.createExportacaoProcessor())
    this.workers.set('geracao-relatorios', relatorioWorker)

    logger.info('Workers inicializados', {
      count: this.workers.size,
      workers: Array.from(this.workers.keys())
    })
  }

  /**
   * Inicia todos os workers
   */
  async startAll() {
    logger.info('Iniciando todos os workers...')

    const startPromises = Array.from(this.workers.entries()).map(async ([name, worker]) => {
      try {
        await worker.start()
        logger.info(`Worker ${name} iniciado com sucesso`)
      } catch (error) {
        logger.error(`Erro ao iniciar worker ${name}`, { error })
        throw error
      }
    })

    await Promise.allSettled(startPromises)

    // Iniciar health check
    this.startHealthCheck()

    logger.info('Todos os workers foram iniciados')
  }

  /**
   * Para todos os workers
   */
  async stopAll() {
    logger.info('Parando todos os workers...')

    // Parar health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }

    const stopPromises = Array.from(this.workers.entries()).map(async ([name, worker]) => {
      try {
        await worker.stop()
        logger.info(`Worker ${name} parado com sucesso`)
      } catch (error) {
        logger.error(`Erro ao parar worker ${name}`, { error })
      }
    })

    await Promise.allSettled(stopPromises)
    logger.info('Todos os workers foram parados')
  }

  /**
   * Reinicia um worker específico
   */
  async restartWorker(workerName: string) {
    const worker = this.workers.get(workerName)
    if (!worker) {
      throw new Error(`Worker ${workerName} não encontrado`)
    }

    logger.info(`Reiniciando worker ${workerName}...`)

    try {
      await worker.stop()
      await new Promise(resolve => setTimeout(resolve, 1000)) // Aguardar 1 segundo
      await worker.start()
      
      // Reset contador de tentativas
      this.restartAttempts.delete(workerName)
      
      logger.info(`Worker ${workerName} reiniciado com sucesso`)
    } catch (error) {
      logger.error(`Erro ao reiniciar worker ${workerName}`, { error })
      throw error
    }
  }

  /**
   * Obtém estatísticas de todos os workers
   */
  getStats() {
    const stats = Array.from(this.workers.entries()).map(([name, worker]) => ({
      name,
      ...worker.getStats()
    }))

    return {
      totalWorkers: this.workers.size,
      runningWorkers: stats.filter(s => s.isRunning).length,
      workers: stats,
      healthCheckActive: !!this.healthCheckTimer,
      config: this.config
    }
  }

  /**
   * Inicia monitoramento de saúde dos workers
   */
  private startHealthCheck() {
    if (this.healthCheckTimer) return

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, this.config.healthCheckInterval)

    logger.info('Health check iniciado', {
      interval: this.config.healthCheckInterval
    })
  }

  /**
   * Executa verificação de saúde dos workers
   */
  private async performHealthCheck() {
    for (const [name, worker] of this.workers.entries()) {
      try {
        const stats = worker.getStats()
        
        if (!stats.isRunning && this.config.restartOnError) {
          const attempts = this.restartAttempts.get(name) || 0
          
          if (attempts < this.config.maxRestartAttempts) {
            logger.warn(`Worker ${name} não está rodando, tentando reiniciar...`, {
              attempt: attempts + 1,
              maxAttempts: this.config.maxRestartAttempts
            })
            
            this.restartAttempts.set(name, attempts + 1)
            await this.restartWorker(name)
          } else {
            logger.error(`Worker ${name} falhou após ${this.config.maxRestartAttempts} tentativas`, {
              attempts
            })
          }
        }
      } catch (error) {
        logger.error(`Erro no health check do worker ${name}`, { error })
      }
    }
  }

  // Processadores simples para integrações externas
  private createConsultaCNPJProcessor() {
    return {
      async process(data: any) {
        // Implementar consulta CNPJ na Receita Federal
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${data.cnpj}`)
        return await response.json()
      }
    }
  }

  private createConsultaCEPProcessor() {
    return {
      async process(data: any) {
        // Implementar consulta CEP
        const response = await fetch(`https://viacep.com.br/ws/${data.cep}/json/`)
        return await response.json()
      }
    }
  }

  private createWebhookReceitaProcessor() {
    return {
      async process(data: any) {
        // Processar webhook da Receita Federal
        logger.info('Processando webhook da Receita Federal', { data })
        return { processed: true }
      }
    }
  }

  private createRelatorioProcessor() {
    return {
      async process(data: any) {
        // Gerar relatório
        logger.info('Gerando relatório', { tipo: data.tipo })
        return { relatorio: 'gerado', url: '/relatorios/exemplo.pdf' }
      }
    }
  }

  private createExportacaoProcessor() {
    return {
      async process(data: any) {
        // Exportar dados
        logger.info('Exportando dados', { formato: data.formato })
        return { exportacao: 'concluida', url: '/exports/dados.xlsx' }
      }
    }
  }
}

// Instância singleton do gerenciador
let workerManagerInstance: WorkerManager | null = null

export function getWorkerManager(config?: Partial<WorkerManagerConfig>): WorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new WorkerManager(config)
  }
  return workerManagerInstance
}

export function stopWorkerManager() {
  if (workerManagerInstance) {
    workerManagerInstance.stopAll()
    workerManagerInstance = null
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    logger.info('Recebido SIGTERM, parando workers...')
    stopWorkerManager()
  })

  process.on('SIGINT', () => {
    logger.info('Recebido SIGINT, parando workers...')
    stopWorkerManager()
  })
}
