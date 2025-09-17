'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle, AlertCircle, Clock, Brain, AlertTriangle } from 'lucide-react'
import { StatusProcessamento } from '@/types/documento'

interface DocumentProcessingStatusProps {
  status: StatusProcessamento
  confidence?: number
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
  className = ''
}: DocumentProcessingStatusProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant="outline" 
        className={`${config.color} flex items-center gap-1.5 px-2 py-1`}
      >
        <Icon 
          className={`h-3 w-3 ${status === 'processando' ? 'animate-spin' : ''}`} 
        />
        {config.label}
      </Badge>
      
      {status === 'processado' && confidence && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Brain className="h-3 w-3" />
          <span>{Math.round(confidence * 100)}% confiança</span>
        </div>
      )}
      
      {status === 'processando' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Progress value={65} className="w-16 h-1" />
          <span>Analisando...</span>
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DocumentProcessingStatus status={status} confidence={confidence} />
      </div>
      
      <p className="text-sm text-muted-foreground">
        {config.description}
      </p>
      
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
