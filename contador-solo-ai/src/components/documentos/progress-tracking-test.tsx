'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DocumentProcessingStatus, DocumentProcessingDetails } from './document-processing-status'
import { useDocumentProgress, PROCESSING_STAGES } from '@/lib/document-progress'
import type { StatusProcessamento } from '@/types/documento'
import type { ProcessingStage } from '@/lib/document-progress'
import { Play, RotateCcw, TestTube } from 'lucide-react'

/**
 * Componente de teste para verificar o Progress Tracking corrigido
 */
export function ProgressTrackingTest() {
  const [currentStatus, setCurrentStatus] = useState<StatusProcessamento>('pendente')
  const [currentStage, setCurrentStage] = useState<ProcessingStage | undefined>(undefined)
  const [customProgress, setCustomProgress] = useState<number | undefined>(undefined)
  const [isSimulating, setIsSimulating] = useState(false)

  // Simular dados extraídos baseados no estado atual
  const mockDadosExtraidos = {
    processing_stage: currentStage,
    progress_percent: customProgress,
    estimated_time_remaining: currentStatus === 'processando' ? 45 : undefined,
    current_operation: currentStage ? PROCESSING_STAGES[currentStage].description : undefined,
    confidence: currentStatus === 'processado' ? 0.95 : undefined
  }

  // Usar o hook de progresso para mostrar os dados calculados
  const progressData = useDocumentProgress(currentStatus, mockDadosExtraidos, customProgress)

  // Simular progressão automática
  const simulateProgress = async () => {
    setIsSimulating(true)
    
    const stages: Array<{ status: StatusProcessamento, stage?: ProcessingStage, progress?: number }> = [
      { status: 'pendente' },
      { status: 'processando', stage: 'uploading', progress: 20 },
      { status: 'processando', stage: 'ocr_processing', progress: 60 },
      { status: 'processando', stage: 'data_extraction', progress: 80 },
      { status: 'processando', stage: 'validation', progress: 90 },
      { status: 'processando', stage: 'finalizing', progress: 95 },
      { status: 'processado', progress: 100 }
    ]

    for (const stage of stages) {
      setCurrentStatus(stage.status)
      setCurrentStage(stage.stage)
      setCustomProgress(stage.progress)
      await new Promise(resolve => setTimeout(resolve, 1500))
    }
    
    setIsSimulating(false)
  }

  const resetTest = () => {
    setCurrentStatus('pendente')
    setCurrentStage(undefined)
    setCustomProgress(undefined)
    setIsSimulating(false)
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Progress Tracking Test
          <Badge variant="outline" className="ml-2">
            Task 1.2 - Corrigir Progress Tracking
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Controles de Teste */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select 
              value={currentStatus} 
              onValueChange={(value) => setCurrentStatus(value as StatusProcessamento)}
              disabled={isSimulating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="processando">Processando</SelectItem>
                <SelectItem value="processado">Processado</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
                <SelectItem value="requer_verificacao">Requer Verificação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Etapa (Stage)</label>
            <Select 
              value={currentStage || ''} 
              onValueChange={(value) => setCurrentStage(value as ProcessingStage || undefined)}
              disabled={isSimulating || currentStatus !== 'processando'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                <SelectItem value="uploading">Uploading (20%)</SelectItem>
                <SelectItem value="ocr_processing">OCR Processing (60%)</SelectItem>
                <SelectItem value="data_extraction">Data Extraction (80%)</SelectItem>
                <SelectItem value="validation">Validation (90%)</SelectItem>
                <SelectItem value="finalizing">Finalizing (95%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Progresso Customizado</label>
            <Select 
              value={customProgress?.toString() || ''} 
              onValueChange={(value) => setCustomProgress(value ? parseInt(value) : undefined)}
              disabled={isSimulating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Automático</SelectItem>
                <SelectItem value="0">0%</SelectItem>
                <SelectItem value="25">25%</SelectItem>
                <SelectItem value="50">50%</SelectItem>
                <SelectItem value="75">75%</SelectItem>
                <SelectItem value="100">100%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2">
          <Button 
            onClick={simulateProgress} 
            disabled={isSimulating}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isSimulating ? 'Simulando...' : 'Simular Progressão'}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetTest}
            disabled={isSimulating}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {/* Visualização dos Componentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DocumentProcessingStatus */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">DocumentProcessingStatus</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentProcessingStatus
                status={currentStatus}
                confidence={mockDadosExtraidos.confidence}
                progress={customProgress}
                estimatedTime={mockDadosExtraidos.estimated_time_remaining}
                dadosExtraidos={mockDadosExtraidos}
              />
            </CardContent>
          </Card>

          {/* DocumentProcessingDetails */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">DocumentProcessingDetails</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentProcessingDetails
                status={currentStatus}
                confidence={mockDadosExtraidos.confidence}
                dadosExtraidos={mockDadosExtraidos}
              />
            </CardContent>
          </Card>
        </div>

        {/* Dados Calculados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Calculados (useDocumentProgress)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Progresso:</span>
                <div className="text-lg font-bold text-blue-600">{progressData.progress}%</div>
              </div>
              <div>
                <span className="font-medium">Etapa:</span>
                <div className="text-lg font-bold">{progressData.stage || 'N/A'}</div>
              </div>
              <div>
                <span className="font-medium">Label:</span>
                <div className="text-lg font-bold">{progressData.stageLabel || 'N/A'}</div>
              </div>
              <div>
                <span className="font-medium">Tempo:</span>
                <div className="text-lg font-bold">{progressData.formattedTimeRemaining || 'N/A'}</div>
              </div>
            </div>
            <div className="mt-4">
              <span className="font-medium">Descrição:</span>
              <p className="text-muted-foreground">{progressData.description}</p>
            </div>
            <div className="mt-2">
              <span className="font-medium">Mensagem:</span>
              <p className="text-muted-foreground">{progressData.message}</p>
            </div>
          </CardContent>
        </Card>

        {/* Instruções */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Como testar:</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>Teste Manual:</strong> Use os controles acima para testar diferentes combinações</li>
            <li>• <strong>Simulação:</strong> Clique em "Simular Progressão" para ver a progressão automática</li>
            <li>• <strong>Verificar:</strong> Observe se o progresso não é mais hardcoded (35% ou 65%)</li>
            <li>• <strong>Etapas:</strong> Teste diferentes etapas de processamento</li>
            <li>• <strong>Estados:</strong> Teste todos os status (pendente, processando, processado, erro)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
