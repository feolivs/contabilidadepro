'use client'

/**
 * Monitor de Filas PGMQ - ContabilidadePRO
 * Dashboard para monitoramento de processamento assíncrono
 */

import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Play,
  Pause
} from 'lucide-react'
import { useQueueProcessing, useJobEnqueue } from '@/hooks/use-queue-processing'
import { QueueName } from '@/services/queue-service'
import { cn } from '@/lib/utils'

export interface QueueMonitorProps {
  className?: string
  refreshInterval?: number
}

const QUEUE_CONFIGS = {
  calculo_fiscal: {
    name: 'Cálculos Fiscais',
    icon: '🧮',
    color: 'blue',
    description: 'DAS, IRPJ, CSLL e outros cálculos'
  },
  processamento_documentos: {
    name: 'Documentos',
    icon: '📄',
    color: 'green',
    description: 'OCR e análise de documentos'
  },
  notificacoes: {
    name: 'Notificações',
    icon: '📧',
    color: 'yellow',
    description: 'Emails e alertas'
  },
  integracoes_externas: {
    name: 'Integrações',
    icon: '🔗',
    color: 'purple',
    description: 'APIs externas e webhooks'
  },
  geracao_relatorios: {
    name: 'Relatórios',
    icon: '📊',
    color: 'indigo',
    description: 'Geração de relatórios'
  }
} as const

export function QueueMonitor({ 
  className,
  refreshInterval = 30000 
}: QueueMonitorProps) {
  const [selectedQueue, setSelectedQueue] = useState<QueueName>('calculo_fiscal')
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  const {
    isProcessing,
    currentJob,
    error,
    processedCount,
    failedCount,
    stats,
    processNextJob,
    acknowledgeJob,
    rejectJob,
    purgeQueue,
    updateStats,
    hasJobs,
    isEmpty
  } = useQueueProcessing(selectedQueue)

  const {
    isEnqueuing,
    error: enqueueError,
    enqueueCalculoFiscal,
    enqueueProcessamentoDocumento,
    enqueueNotificacao,
    clearError
  } = useJobEnqueue()

  // Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return

    const interval = setInterval(() => {
      updateStats()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [isAutoRefresh, refreshInterval, updateStats])

  const handleProcessJob = async () => {
    const job = await processNextJob()
    if (job) {
      // Simular processamento (em produção, isso seria feito por workers)
      setTimeout(() => {
        acknowledgeJob(job.msg_id)
      }, 2000)
    }
  }

  const handleRejectJob = async () => {
    if (currentJob) {
      await rejectJob(currentJob.msg_id, 60)
    }
  }

  const handlePurgeQueue = async () => {
    if (confirm(`Tem certeza que deseja limpar toda a fila "${QUEUE_CONFIGS[selectedQueue].name}"?`)) {
      await purgeQueue()
    }
  }

  const handleTestJob = async () => {
    try {
      switch (selectedQueue) {
        case 'calculo_fiscal':
          await enqueueCalculoFiscal({
            empresaId: 'test-empresa',
            tipoCalculo: 'DAS',
            periodoApuracao: '2025-01',
            dadosEntrada: { receitaBruta: 10000 }
          })
          break
        case 'processamento_documentos':
          await enqueueProcessamentoDocumento({
            documentoId: 'test-doc',
            tipoDocumento: 'NFe',
            urlArquivo: 'https://example.com/test.pdf'
          })
          break
        case 'notificacoes':
          await enqueueNotificacao({
            tipo: 'email',
            destinatario: 'test@example.com',
            template: 'test',
            dados: { message: 'Teste' }
          })
          break
      }
    } catch (error) {
      console.error('Erro ao criar job de teste:', error)
    }
  }

  const getQueueColor = (queueName: QueueName) => {
    const color = QUEUE_CONFIGS[queueName].color
    return {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    }[color]
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monitor de Filas</h2>
          <p className="text-gray-600">Acompanhe o processamento assíncrono em tempo real</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium',
              isAutoRefresh 
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {isAutoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isAutoRefresh ? 'Pausar' : 'Iniciar'} Auto-refresh
          </button>
          
          <button
            onClick={updateStats}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* Seletor de Filas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(QUEUE_CONFIGS).map(([queueName, config]) => (
          <button
            key={queueName}
            onClick={() => setSelectedQueue(queueName as QueueName)}
            className={cn(
              'p-4 rounded-lg border-2 text-left transition-all',
              selectedQueue === queueName
                ? getQueueColor(queueName as QueueName)
                : 'bg-white border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <div className="font-medium">{config.name}</div>
                <div className="text-sm text-gray-500">{config.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Estatísticas da Fila Selecionada */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <span className="text-2xl">{QUEUE_CONFIGS[selectedQueue].icon}</span>
            <span>{QUEUE_CONFIGS[selectedQueue].name}</span>
          </h3>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTestJob}
              disabled={isEnqueuing}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Criar Job Teste
            </button>
            
            <button
              onClick={handlePurgeQueue}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Na Fila</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {stats?.totalMessages || 0}
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Processados</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              {processedCount}
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-600">Falharam</span>
            </div>
            <div className="text-2xl font-bold text-red-900">
              {failedCount}
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-600">Status</span>
            </div>
            <div className="text-sm font-bold text-yellow-900">
              {isProcessing ? 'Processando' : isEmpty ? 'Vazia' : 'Aguardando'}
            </div>
          </div>
        </div>

        {/* Job Atual */}
        {currentJob && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-medium mb-2">Job em Processamento</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>ID: {currentJob.msg_id}</div>
              <div>Tentativas: {currentJob.read_ct}</div>
              <div>Enfileirado: {new Date(currentJob.enqueued_at).toLocaleString()}</div>
            </div>
            <div className="mt-3 space-x-2">
              <button
                onClick={() => acknowledgeJob(currentJob.msg_id)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Confirmar
              </button>
              <button
                onClick={handleRejectJob}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Rejeitar
              </button>
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleProcessJob}
            disabled={isProcessing || isEmpty}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Processar Próximo
          </button>

          {hasJobs && (
            <div className="text-sm text-gray-600">
              {stats?.totalMessages} job(s) na fila
            </div>
          )}
        </div>

        {/* Erros */}
        {(error || enqueueError) && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-600">Erro</span>
            </div>
            <div className="text-sm text-red-700 mt-1">
              {error || enqueueError}
            </div>
            <button
              onClick={clearError}
              className="text-xs text-red-600 hover:text-red-800 mt-2"
            >
              Limpar erro
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
