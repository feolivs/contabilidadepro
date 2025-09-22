import type { StatusProcessamento } from '@/types/documento'

/**
 * Configuração das etapas de processamento de documentos
 */
export const PROCESSING_STAGES = {
  uploading: {
    label: 'Fazendo upload',
    progress: 20,
    description: 'Enviando arquivo para o servidor'
  },
  ocr_processing: {
    label: 'Processando OCR',
    progress: 60,
    description: 'Extraindo texto do documento'
  },
  data_extraction: {
    label: 'Extraindo dados',
    progress: 80,
    description: 'Analisando conteúdo com IA'
  },
  validation: {
    label: 'Validando',
    progress: 90,
    description: 'Verificando dados extraídos'
  },
  finalizing: {
    label: 'Finalizando',
    progress: 95,
    description: 'Salvando resultados'
  }
} as const

export type ProcessingStage = keyof typeof PROCESSING_STAGES

/**
 * Interface para dados de progresso
 */
export interface DocumentProgress {
  progress: number
  stage?: ProcessingStage
  stageLabel?: string
  description?: string
  estimatedTimeRemaining?: number
}

/**
 * Calcula o progresso de processamento de um documento baseado no status e dados extraídos
 */
export function calculateDocumentProgress(
  status: StatusProcessamento,
  dadosExtraidos?: any,
  customProgress?: number
): DocumentProgress {
  // Se há progresso customizado, usar ele
  if (customProgress !== undefined && customProgress >= 0 && customProgress <= 100) {
    return {
      progress: customProgress,
      stage: getStageFromProgress(customProgress),
      stageLabel: getStageFromProgress(customProgress) ? PROCESSING_STAGES[getStageFromProgress(customProgress)!].label : undefined,
      description: getStageFromProgress(customProgress) ? PROCESSING_STAGES[getStageFromProgress(customProgress)!].description : undefined
    }
  }

  switch (status) {
    case 'pendente':
      return {
        progress: 0,
        description: 'Aguardando processamento'
      }

    case 'processando':
      // Se temos dados extraídos com stage específico
      if (dadosExtraidos?.processing_stage && dadosExtraidos.processing_stage in PROCESSING_STAGES) {
        const stage = dadosExtraidos.processing_stage as ProcessingStage
        return {
          progress: PROCESSING_STAGES[stage].progress,
          stage,
          stageLabel: PROCESSING_STAGES[stage].label,
          description: PROCESSING_STAGES[stage].description,
          estimatedTimeRemaining: dadosExtraidos.estimated_time_remaining
        }
      }

      // Se temos progresso específico nos dados extraídos
      if (dadosExtraidos?.progress_percent && typeof dadosExtraidos.progress_percent === 'number') {
        const progress = Math.min(Math.max(dadosExtraidos.progress_percent, 0), 100)
        return {
          progress,
          stage: getStageFromProgress(progress),
          stageLabel: getStageFromProgress(progress) ? PROCESSING_STAGES[getStageFromProgress(progress)!].label : 'Processando',
          description: dadosExtraidos.current_operation || 'Processando documento',
          estimatedTimeRemaining: dadosExtraidos.estimated_time_remaining
        }
      }

      // Progresso genérico para processando (meio do caminho)
      return {
        progress: 50,
        stage: 'ocr_processing',
        stageLabel: PROCESSING_STAGES.ocr_processing.label,
        description: PROCESSING_STAGES.ocr_processing.description
      }

    case 'processado':
      return {
        progress: 100,
        description: 'Processamento concluído'
      }

    case 'erro':
    case 'rejeitado':
      return {
        progress: 0,
        description: status === 'erro' ? 'Erro no processamento' : 'Documento rejeitado'
      }

    case 'requer_verificacao':
      return {
        progress: 95,
        description: 'Processado - requer verificação manual'
      }

    default:
      return {
        progress: 0,
        description: 'Status desconhecido'
      }
  }
}

/**
 * Determina a etapa baseada no progresso percentual
 */
function getStageFromProgress(progress: number): ProcessingStage | undefined {
  if (progress >= 95) return 'finalizing'
  if (progress >= 90) return 'validation'
  if (progress >= 80) return 'data_extraction'
  if (progress >= 60) return 'ocr_processing'
  if (progress >= 20) return 'uploading'
  return undefined
}

/**
 * Formata o tempo estimado restante
 */
export function formatEstimatedTime(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  
  if (seconds < 60) {
    return `~${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.round(seconds / 60)
    return `~${minutes}min`
  } else {
    const hours = Math.round(seconds / 3600)
    return `~${hours}h`
  }
}

/**
 * Gera uma mensagem de status amigável
 */
export function getProgressMessage(progressData: DocumentProgress): string {
  if (progressData.progress === 0) {
    return progressData.description || 'Aguardando'
  }
  
  if (progressData.progress === 100) {
    return 'Concluído'
  }
  
  if (progressData.stageLabel) {
    return `${progressData.stageLabel}... ${Math.round(progressData.progress)}%`
  }
  
  return `Processando... ${Math.round(progressData.progress)}%`
}

/**
 * Determina se deve mostrar a barra de progresso
 */
export function shouldShowProgress(status: StatusProcessamento): boolean {
  return status === 'processando'
}

/**
 * Determina se deve mostrar animação de loading
 */
export function shouldShowLoadingAnimation(status: StatusProcessamento): boolean {
  return status === 'processando'
}

/**
 * Hook para usar progresso de documento de forma reativa
 */
export function useDocumentProgress(
  status: StatusProcessamento,
  dadosExtraidos?: any,
  customProgress?: number
) {
  const progressData = calculateDocumentProgress(status, dadosExtraidos, customProgress)
  
  return {
    ...progressData,
    message: getProgressMessage(progressData),
    shouldShowProgress: shouldShowProgress(status),
    shouldShowAnimation: shouldShowLoadingAnimation(status),
    formattedTimeRemaining: formatEstimatedTime(progressData.estimatedTimeRemaining)
  }
}
