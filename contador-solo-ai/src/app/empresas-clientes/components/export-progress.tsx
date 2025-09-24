'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Download,
  CheckCircle,
  AlertCircle,
  X,
  FileSpreadsheet,
  FileText,
  File,
  Clock,
  Zap,
} from 'lucide-react'
import { ExportProgress } from '@/hooks/use-export'

interface ExportProgressModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  progress: ExportProgress | null
  onCancel?: () => void
}

export function ExportProgressModal({
  open,
  onOpenChange,
  progress,
  onCancel
}: ExportProgressModalProps) {
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)

  useEffect(() => {
    if (progress?.status === 'preparing' && !startTime) {
      setStartTime(Date.now())
      setTimeElapsed(0)
    }
  }, [progress?.status, startTime])

  useEffect(() => {
    if (!startTime || progress?.status === 'complete' || progress?.status === 'error') {
      return
    }

    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, progress?.status])

  const getProgressPercentage = () => {
    if (!progress) return 0
    
    switch (progress.status) {
      case 'preparing':
        return 10
      case 'processing':
        return 20 + (progress.current / progress.total) * 60
      case 'generating':
        return 85
      case 'complete':
        return 100
      case 'error':
        return 0
      default:
        return 0
    }
  }

  const getStatusIcon = () => {
    if (!progress) return <Download className="h-5 w-5" />
    
    switch (progress.status) {
      case 'preparing':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'processing':
        return <Zap className="h-5 w-5 text-yellow-600" />
      case 'generating':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Download className="h-5 w-5" />
    }
  }

  const getStatusColor = () => {
    if (!progress) return 'default'
    
    switch (progress.status) {
      case 'preparing':
        return 'blue'
      case 'processing':
        return 'yellow'
      case 'generating':
        return 'green'
      case 'complete':
        return 'green'
      case 'error':
        return 'red'
      default:
        return 'default'
    }
  }

  const getStatusText = () => {
    if (!progress) return 'Preparando...'
    
    switch (progress.status) {
      case 'preparing':
        return 'Preparando exportação'
      case 'processing':
        return 'Processando dados'
      case 'generating':
        return 'Gerando arquivo'
      case 'complete':
        return 'Exportação concluída'
      case 'error':
        return 'Erro na exportação'
      default:
        return progress.message
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getEstimatedTimeRemaining = () => {
    if (!progress || progress.current === 0 || timeElapsed === 0) return null
    
    const itemsPerSecond = progress.current / timeElapsed
    const remainingItems = progress.total - progress.current
    const estimatedSeconds = Math.ceil(remainingItems / itemsPerSecond)
    
    return estimatedSeconds
  }

  const progressPercentage = getProgressPercentage()
  const statusColor = getStatusColor()
  const estimatedTimeRemaining = getEstimatedTimeRemaining()

  if (!progress) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Exportando Dados
          </DialogTitle>
          <DialogDescription>
            {progress.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso</span>
              <span className="text-muted-foreground">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <Badge 
              variant={statusColor === 'default' ? 'secondary' : 'default'}
              className={`
                ${statusColor === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}
                ${statusColor === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : ''}
                ${statusColor === 'green' ? 'bg-green-100 text-green-800 border-green-300' : ''}
                ${statusColor === 'red' ? 'bg-red-100 text-red-800 border-red-300' : ''}
              `}
            >
              {getStatusText()}
            </Badge>
          </div>

          {/* Detalhes do Progresso */}
          {progress.status === 'processing' && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Itens processados:</span>
                <span className="font-mono">
                  {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span>Tempo decorrido:</span>
                <span className="font-mono">{formatTime(timeElapsed)}</span>
              </div>
              
              {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Tempo estimado restante:</span>
                  <span className="font-mono">{formatTime(estimatedTimeRemaining)}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span>Velocidade:</span>
                <span className="font-mono">
                  {timeElapsed > 0 ? Math.round(progress.current / timeElapsed) : 0} itens/s
                </span>
              </div>
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {progress.status === 'complete' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Exportação concluída com sucesso!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                {progress.total} empresas foram exportadas em {formatTime(timeElapsed)}.
              </p>
            </div>
          )}

          {/* Mensagem de Erro */}
          {progress.status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Erro na exportação</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                {progress.message}
              </p>
            </div>
          )}

          {/* Dicas durante o processamento */}
          {(progress.status === 'processing' || progress.status === 'generating') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Dica:</p>
                  <p>
                    {progress.status === 'processing' 
                      ? 'Os dados estão sendo formatados e validados. Isso pode levar alguns minutos para grandes volumes.'
                      : 'O arquivo está sendo gerado. Não feche esta janela até a conclusão.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {progress.status === 'complete' || progress.status === 'error' ? (
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => {
                onCancel?.()
                onOpenChange(false)
              }}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
