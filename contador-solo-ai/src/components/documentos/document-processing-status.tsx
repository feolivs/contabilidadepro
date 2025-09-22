'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle, AlertCircle, Clock, Brain, AlertTriangle } from 'lucide-react'
import { StatusProcessamento } from '@/types/documento'
import { useDocumentProgress } from '@/lib/document-progress'

interface DocumentProcessingStatusProps {
  status: StatusProcessamento
  confidence?: number
  progress?: number
  estimatedTime?: number
  dadosExtraidos?: any
  className?: string
}

const statusConfig = {
  pendente: {
    icon: Clock,
    label: 'Pendente',
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/30',
    description: 'Aguardando processamento'
  },
  processando: {
    icon: Loader2,
    label: 'Processando',
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30',
    description: 'IA analisando documento...'
  },
  processado: {
    icon: CheckCircle,
    label: 'Processado',
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30',
    description: 'Análise concluída'
  },
  erro: {
    icon: AlertCircle,
    label: 'Erro',
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
    description: 'Erro no processamento'
  },
  rejeitado: {
    icon: AlertCircle,
    label: 'Rejeitado',
    color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30',
    description: 'Documento rejeitado'
  },
  requer_verificacao: {
    icon: AlertTriangle,
    label: 'Requer Verificação',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30',
    description: 'Documento processado mas requer verificação manual'
  }
}

export function DocumentProcessingStatus({
  status,
  confidence,
  progress,
  estimatedTime,
  dadosExtraidos,
  className = ''
}: DocumentProcessingStatusProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente
  const Icon = config.icon

  // Usar o hook de progresso para cálculo inteligente
  const progressData = useDocumentProgress(status, dadosExtraidos, progress)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge
        variant="outline"
        className={`${config.color} flex items-center gap-1.5 px-2 py-1`}
      >
        <Icon
          className={`h-3 w-3 ${progressData.shouldShowAnimation ? 'animate-spin' : ''}`}
        />
        {config.label}
      </Badge>

      {status === 'processado' && confidence && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Brain className="h-3 w-3" />
          <span>{Math.round(confidence * 100)}% confiança</span>
        </div>
      )}

      {progressData.shouldShowProgress && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Progress value={progressData.progress} className="w-20 h-2" />
          <span>
            {progressData.stageLabel ? (
              <>
                {progressData.stageLabel}... {Math.round(progressData.progress)}%
              </>
            ) : (
              progressData.message
            )}
            {(progressData.formattedTimeRemaining || (estimatedTime && estimatedTime > 0)) && (
              <span className="ml-2 text-xs opacity-75">
                {progressData.formattedTimeRemaining || `~${Math.round(estimatedTime!)}s`}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  )
}

export function DocumentProcessingDetails({
  status,
  confidence,
  dadosExtraidos
}: {
  status: StatusProcessamento
  confidence?: number
  dadosExtraidos?: any
}) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente
  const progressData = useDocumentProgress(status, dadosExtraidos)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DocumentProcessingStatus
          status={status}
          confidence={confidence}
          dadosExtraidos={dadosExtraidos}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {progressData.description || config.description}
      </p>

      {/* Mostrar detalhes do progresso se estiver processando */}
      {progressData.shouldShowProgress && progressData.stage && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {progressData.stageLabel}
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {Math.round(progressData.progress)}%
            </span>
          </div>
          <Progress value={progressData.progress} className="h-2 mb-2" />
          {progressData.description && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {progressData.description}
            </p>
          )}
          {progressData.formattedTimeRemaining && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Tempo estimado: {progressData.formattedTimeRemaining}
            </p>
          )}
        </div>
      )}
      
      {status === 'processado' && dadosExtraidos && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Dados Extraídos pela IA:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {dadosExtraidos.numero_documento && (
              <div>
                <span className="font-medium">Número:</span> {dadosExtraidos.numero_documento}
              </div>
            )}
            {dadosExtraidos.valor_total && (
              <div>
                <span className="font-medium">Valor:</span> R$ {dadosExtraidos.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            )}
            {dadosExtraidos.data_emissao && (
              <div>
                <span className="font-medium">Data:</span> {new Date(dadosExtraidos.data_emissao).toLocaleDateString('pt-BR')}
              </div>
            )}
            {dadosExtraidos.empresa_emitente && (
              <div className="col-span-2">
                <span className="font-medium">Emitente:</span> {dadosExtraidos.empresa_emitente}
              </div>
            )}
            {dadosExtraidos.descricao && (
              <div className="col-span-2">
                <span className="font-medium">Descrição:</span> {dadosExtraidos.descricao}
              </div>
            )}
          </div>
        </div>
      )}
      
      {status === 'erro' && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">
            Ocorreu um erro durante o processamento. Tente fazer upload novamente ou entre em contato com o suporte.
          </p>
        </div>
      )}
    </div>
  )
}
