/**
 * 📊 PROCESSING DASHBOARD - ContabilidadePRO
 * Dashboard em tempo real para acompanhar o processamento de documentos
 */

'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Brain, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  FileText,
  TrendingUp,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProcessingStatus {
  stage: 'upload' | 'ocr' | 'ai_analysis' | 'validation' | 'complete'
  progress: number
  message: string
  estimatedTime?: number
  error?: string
}

interface ProcessingDashboardProps {
  status: ProcessingStatus | null
  className?: string
}

const stageConfig = {
  upload: {
    icon: FileText,
    label: 'Upload',
    description: 'Enviando arquivo para o servidor',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  ocr: {
    icon: Activity,
    label: 'OCR',
    description: 'Extraindo texto do documento',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  ai_analysis: {
    icon: Brain,
    label: 'Análise IA',
    description: 'Processando com inteligência artificial',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  validation: {
    icon: CheckCircle,
    label: 'Validação',
    description: 'Validando dados extraídos',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  complete: {
    icon: CheckCircle,
    label: 'Concluído',
    description: 'Processamento finalizado com sucesso',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  }
}

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

export function ProcessingDashboard({ status, className }: ProcessingDashboardProps) {
  if (!status) {
    return null
  }

  const config = stageConfig[status.stage]
  const Icon = config.icon

  return (
    <Card className={cn("border-2", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Processamento em Andamento
        </CardTitle>
        <CardDescription>
          Acompanhe o progresso da análise do seu documento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status atual */}
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{config.label}</h3>
              <Badge variant="secondary">{status.progress}%</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm text-muted-foreground">
              {status.progress}% concluído
            </span>
          </div>
          <Progress value={status.progress} className="h-2" />
        </div>

        {/* Mensagem de status */}
        {status.message && (
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        {/* Tempo estimado */}
        {status.estimatedTime && status.stage !== 'complete' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Tempo estimado: {formatTime(status.estimatedTime)}</span>
          </div>
        )}

        {/* Erro */}
        {status.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{status.error}</AlertDescription>
          </Alert>
        )}

        {/* Timeline de estágios */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Etapas do Processamento</h4>
          <div className="space-y-2">
            {Object.entries(stageConfig).map(([stage, stageInfo], index) => {
              const isActive = status.stage === stage
              const isCompleted = Object.keys(stageConfig).indexOf(status.stage) > index
              const StageIcon = stageInfo.icon

              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    isActive ? stageInfo.bgColor : isCompleted ? "bg-green-100" : "bg-gray-100"
                  )}>
                    <StageIcon className={cn(
                      "h-3 w-3",
                      isActive ? stageInfo.color : isCompleted ? "text-green-600" : "text-gray-400"
                    )} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        isActive ? "text-foreground" : isCompleted ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {stageInfo.label}
                      </span>
                      {isCompleted && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                      {isActive && (
                        <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stageInfo.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Estatísticas de performance */}
        {status.stage === 'complete' && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <h4 className="text-sm font-medium text-green-600">Processamento Concluído!</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">100%</div>
                <div className="text-xs text-muted-foreground">Precisão</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {status.estimatedTime ? formatTime(status.estimatedTime) : '< 1m'}
                </div>
                <div className="text-xs text-muted-foreground">Tempo Total</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Hook para simular status de processamento (para demonstração)
export function useProcessingDemo() {
  const [status, setStatus] = React.useState<ProcessingStatus | null>(null)

  const startProcessing = () => {
    setStatus({
      stage: 'upload',
      progress: 0,
      message: 'Iniciando upload do arquivo...'
    })

    // Simular progressão
    const stages: Array<{ stage: ProcessingStatus['stage'], duration: number }> = [
      { stage: 'upload', duration: 2000 },
      { stage: 'ocr', duration: 5000 },
      { stage: 'ai_analysis', duration: 8000 },
      { stage: 'validation', duration: 2000 },
      { stage: 'complete', duration: 1000 }
    ]

    let currentStageIndex = 0
    let progress = 0

    const updateProgress = () => {
      if (currentStageIndex >= stages.length) {
        setStatus({
          stage: 'complete',
          progress: 100,
          message: 'Documento processado com sucesso!'
        })
        return
      }

      const currentStage = stages[currentStageIndex]
      progress += 2

      if (progress >= (currentStageIndex + 1) * (100 / stages.length)) {
        currentStageIndex++
        if (currentStageIndex < stages.length) {
          setStatus({
            stage: stages[currentStageIndex].stage,
            progress: Math.min(progress, 100),
            message: `Processando ${stageConfig[stages[currentStageIndex].stage].label.toLowerCase()}...`,
            estimatedTime: Math.max(0, (stages.length - currentStageIndex) * 3)
          })
        }
      } else {
        setStatus(prev => prev ? {
          ...prev,
          progress: Math.min(progress, 100)
        } : null)
      }

      if (progress < 100) {
        setTimeout(updateProgress, 200)
      }
    }

    updateProgress()
  }

  const resetProcessing = () => {
    setStatus(null)
  }

  return {
    status,
    startProcessing,
    resetProcessing,
    isProcessing: status !== null && status.stage !== 'complete'
  }
}
