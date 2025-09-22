'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { EnhancedBatchProcessor } from './enhanced-batch-processor'
import { useBatchProcessing } from '@/hooks/use-batch-processing'
import type { BatchResult } from '@/hooks/use-batch-processing'
import { 
  TestTube, 
  FolderOpen, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Target,
  Timer
} from 'lucide-react'

/**
 * Componente de teste para Batch Processing UI
 */
export function BatchProcessingTest() {
  const [showBatchProcessor, setShowBatchProcessor] = useState(false)
  const [testResults, setTestResults] = useState<Array<{
    type: string
    success: boolean
    message: string
    timestamp: string
    data?: any
  }>>([])

  const {
    files,
    isProcessing,
    isPaused,
    stats,
    batchStartTime,
    addFiles,
    startBatchProcessing,
    togglePause,
    cancelProcessing,
    removeFile,
    retryFile,
    clearQueue
  } = useBatchProcessing({
    maxConcurrent: 2,
    retryAttempts: 1,
    pauseOnError: false,
    priorityProcessing: true,
    estimateTime: true
  })

  // Simular adição de arquivos de teste
  const addTestFiles = () => {
    // Criar arquivos mock para teste
    const mockFiles: File[] = [
      new File(['mock pdf content'], 'nfe-001.pdf', { type: 'application/pdf' }),
      new File(['mock image content'], 'recibo-002.jpg', { type: 'image/jpeg' }),
      new File(['mock pdf content'], 'boleto-003.pdf', { type: 'application/pdf' }),
      new File(['mock image content'], 'contrato-004.png', { type: 'image/png' }),
      new File(['mock pdf content'], 'comprovante-005.pdf', { type: 'application/pdf' })
    ]

    const fileIds = addFiles(mockFiles, 'test-empresa-123')
    
    setTestResults(prev => [...prev, {
      type: 'Add Files',
      success: true,
      message: `${mockFiles.length} arquivos de teste adicionados à fila`,
      timestamp: new Date().toISOString(),
      data: { fileIds, count: mockFiles.length }
    }])
  }

  // Testar processamento em lote
  const testBatchProcessing = async () => {
    if (files.length === 0) {
      setTestResults(prev => [...prev, {
        type: 'Batch Processing',
        success: false,
        message: 'Nenhum arquivo na fila para processar',
        timestamp: new Date().toISOString()
      }])
      return
    }

    try {
      const result: BatchResult = await startBatchProcessing()
      
      setTestResults(prev => [...prev, {
        type: 'Batch Processing',
        success: result.success,
        message: `Processamento concluído: ${result.successCount}/${result.totalFiles} sucessos em ${Math.round(result.duration / 1000)}s`,
        timestamp: new Date().toISOString(),
        data: result
      }])
    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'Batch Processing',
        success: false,
        message: `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date().toISOString()
      }])
    }
  }

  // Testar controles de fila
  const testQueueControls = () => {
    const actions = [
      { name: 'Pausar/Retomar', action: togglePause },
      { name: 'Cancelar', action: cancelProcessing },
      { name: 'Limpar Fila', action: clearQueue }
    ]

    actions.forEach(({ name, action }) => {
      try {
        action()
        setTestResults(prev => [...prev, {
          type: 'Queue Control',
          success: true,
          message: `${name} executado com sucesso`,
          timestamp: new Date().toISOString()
        }])
      } catch (error) {
        setTestResults(prev => [...prev, {
          type: 'Queue Control',
          success: false,
          message: `Erro em ${name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          timestamp: new Date().toISOString()
        }])
      }
    })
  }

  // Testar retry de arquivo
  const testFileRetry = () => {
    const errorFiles = files.filter(f => f.status === 'error')
    if (errorFiles.length === 0) {
      setTestResults(prev => [...prev, {
        type: 'File Retry',
        success: false,
        message: 'Nenhum arquivo com erro para testar retry',
        timestamp: new Date().toISOString()
      }])
      return
    }

    const fileToRetry = errorFiles[0]
    const success = retryFile(fileToRetry.id)
    
    setTestResults(prev => [...prev, {
      type: 'File Retry',
      success,
      message: success 
        ? `Retry iniciado para ${fileToRetry.file.name}`
        : `Falha no retry para ${fileToRetry.file.name}`,
      timestamp: new Date().toISOString()
    }])
  }

  // Testar remoção de arquivo
  const testFileRemoval = () => {
    const waitingFiles = files.filter(f => f.status === 'waiting')
    if (waitingFiles.length === 0) {
      setTestResults(prev => [...prev, {
        type: 'File Removal',
        success: false,
        message: 'Nenhum arquivo aguardando para remover',
        timestamp: new Date().toISOString()
      }])
      return
    }

    const fileToRemove = waitingFiles[0]
    const success = removeFile(fileToRemove.id)
    
    setTestResults(prev => [...prev, {
      type: 'File Removal',
      success,
      message: success 
        ? `Arquivo ${fileToRemove.file.name} removido da fila`
        : `Falha ao remover ${fileToRemove.file.name}`,
      timestamp: new Date().toISOString()
    }])
  }

  // Limpar resultados de teste
  const clearResults = () => {
    setTestResults([])
  }

  // Callback para quando o batch processor completa
  const handleBatchComplete = (result: BatchResult) => {
    setTestResults(prev => [...prev, {
      type: 'Batch Complete',
      success: result.success,
      message: `Processamento finalizado: ${result.successCount} sucessos, ${result.failureCount} falhas`,
      timestamp: new Date().toISOString(),
      data: result
    }])
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Batch Processing Test
            <Badge variant="outline" className="ml-2">
              Task 1.4 - Adicionar Batch Processing UI
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Estatísticas da Fila */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.processing}</div>
                    <div className="text-sm text-muted-foreground">Processando</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{stats.completed}</div>
                    <div className="text-sm text-muted-foreground">Concluídos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {stats.estimatedRemaining > 0 
                        ? Math.ceil(stats.estimatedRemaining / 1000 / 60)
                        : 0
                      }m
                    </div>
                    <div className="text-sm text-muted-foreground">Tempo Restante</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estado do Processamento */}
          {isProcessing && (
            <Alert>
              <Activity className="h-4 w-4 animate-pulse" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>
                      Processamento em andamento: {stats.completed}/{stats.total} arquivos
                      {isPaused && ' (PAUSADO)'}
                    </span>
                    <Badge variant={isPaused ? 'secondary' : 'default'}>
                      {isPaused ? 'Pausado' : 'Ativo'}
                    </Badge>
                  </div>
                  <Progress 
                    value={(stats.completed / stats.total) * 100} 
                    className="h-2" 
                  />
                  {batchStartTime && (
                    <div className="text-sm text-muted-foreground">
                      Iniciado há {Math.round((Date.now() - batchStartTime.getTime()) / 1000)}s
                      {stats.throughput > 0 && (
                        <span className="ml-2">
                          • {stats.throughput.toFixed(1)} arquivos/min
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Controles de Teste */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              onClick={addTestFiles}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Adicionar Arquivos
            </Button>

            <Button 
              onClick={testBatchProcessing}
              disabled={isProcessing || files.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Iniciar Processamento
            </Button>

            <Button 
              onClick={testQueueControls}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Testar Controles
            </Button>

            <Button 
              onClick={testFileRetry}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Testar Retry
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={testFileRemoval}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Testar Remoção
            </Button>

            <Button 
              onClick={() => setShowBatchProcessor(true)}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Abrir Batch Processor
            </Button>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={clearResults}
              variant="outline"
            >
              Limpar Resultados
            </Button>
          </div>

          {/* Lista de Arquivos na Fila */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Fila de Processamento ({files.length} arquivos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {files.map((file, index) => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">#{file.priority}</span>
                        {file.status === 'waiting' && <Clock className="h-4 w-4 text-gray-500" />}
                        {file.status === 'processing' && <Activity className="h-4 w-4 text-orange-500 animate-pulse" />}
                        {file.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {file.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                        <span className="text-sm font-medium">{file.file.name}</span>
                        <Badge variant="outline">{file.tipoDocumento}</Badge>
                        <Badge className={
                          file.status === 'success' ? 'bg-green-100 text-green-800' :
                          file.status === 'error' ? 'bg-red-100 text-red-800' :
                          file.status === 'processing' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {file.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.progress > 0 && file.progress < 100 && (
                          <div className="w-20">
                            <Progress value={file.progress} className="h-1" />
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {file.retryCount > 0 && `${file.retryCount} tentativas`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados dos Testes */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultados dos Testes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Badge variant="outline">{result.type}</Badge>
                        <span className="text-sm">{result.message}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instruções */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Como testar:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Adicionar Arquivos:</strong> Cria arquivos mock para teste</li>
              <li>• <strong>Iniciar Processamento:</strong> Executa processamento em lote</li>
              <li>• <strong>Testar Controles:</strong> Testa pausar, cancelar e limpar fila</li>
              <li>• <strong>Testar Retry:</strong> Tenta reprocessar arquivos com erro</li>
              <li>• <strong>Testar Remoção:</strong> Remove arquivos da fila</li>
              <li>• <strong>Batch Processor:</strong> Abre interface completa de processamento</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Batch Processor Modal */}
      <EnhancedBatchProcessor
        open={showBatchProcessor}
        onOpenChange={setShowBatchProcessor}
        empresaIdPadrao="test-empresa-123"
        onComplete={handleBatchComplete}
      />
    </div>
  )
}
