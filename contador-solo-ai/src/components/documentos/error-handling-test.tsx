'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { EnhancedErrorRecoveryPanel } from './enhanced-error-recovery-panel'
import { useDocumentRetry } from '@/hooks/use-document-retry'
import { 
  analyzeDocumentError, 
  showErrorNotification,
  DocumentErrorType, 
  ErrorSeverity 
} from '@/lib/document-error-handling'
import type { Documento } from '@/types/documento'
import { 
  TestTube, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

/**
 * Componente de teste para Error Handling Robusto
 */
export function ErrorHandlingTest() {
  const [selectedErrorType, setSelectedErrorType] = useState<DocumentErrorType>(DocumentErrorType.OCR_FAILED)
  const [isTestingRetry, setIsTestingRetry] = useState(false)
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false)
  const [testResults, setTestResults] = useState<Array<{
    type: string
    success: boolean
    message: string
    timestamp: string
  }>>([])

  const {
    retryState,
    isRetrying,
    executeWithRetry,
    handleDocumentError,
    cancelRetry
  } = useDocumentRetry({
    maxRetries: 3,
    onRetryAttempt: (attempt, error) => {
      console.log(`Tentativa ${attempt}:`, error.message)
    },
    onMaxRetriesReached: (error) => {
      console.log('Máximo de tentativas atingido:', error.message)
    }
  })

  // Mock de documento com erro
  const mockErrorDocument: Documento = {
    id: 'test-doc-123',
    empresa_id: 'test-empresa-123',
    tipo_documento: 'NFe',
    arquivo_nome: 'teste-documento-erro.pdf',
    arquivo_tipo: 'application/pdf',
    arquivo_tamanho: 2048576, // 2MB
    arquivo_url: 'https://example.com/test.pdf',
    arquivo_path: 'documentos/test.pdf',
    status_processamento: 'erro',
    observacoes: getErrorMessage(selectedErrorType),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  function getErrorMessage(errorType: DocumentErrorType): string {
    switch (errorType) {
      case DocumentErrorType.OCR_FAILED:
        return 'Erro no OCR: Não foi possível extrair texto do documento'
      case DocumentErrorType.AI_ANALYSIS_FAILED:
        return 'Falha na análise IA: Timeout na API do OpenAI'
      case DocumentErrorType.FILE_TOO_LARGE:
        return 'Arquivo muito grande: Tamanho excede 10MB'
      case DocumentErrorType.INVALID_FILE_TYPE:
        return 'Tipo de arquivo inválido: Apenas PDF, PNG, JPG são aceitos'
      case DocumentErrorType.NETWORK_ERROR:
        return 'Erro de rede: Falha na conexão com o servidor'
      case DocumentErrorType.TIMEOUT:
        return 'Timeout: Processamento demorou mais que 5 minutos'
      case DocumentErrorType.API_RATE_LIMIT:
        return 'Rate limit: Muitas solicitações em pouco tempo'
      case DocumentErrorType.INSUFFICIENT_CREDITS:
        return 'Créditos insuficientes: Plano atual não permite mais processamentos'
      default:
        return 'Erro desconhecido no processamento'
    }
  }

  const testErrorAnalysis = () => {
    const errorMessage = getErrorMessage(selectedErrorType)
    const analysis = analyzeDocumentError(errorMessage, {
      documentId: 'test-doc-123',
      fileName: 'teste-documento.pdf',
      fileSize: 2048576
    })

    setTestResults(prev => [...prev, {
      type: 'Error Analysis',
      success: true,
      message: `Tipo: ${analysis.type}, Severidade: ${analysis.severity}, Pode retry: ${analysis.canRetry}`,
      timestamp: new Date().toISOString()
    }])

    console.log('Análise do erro:', analysis)
    return analysis
  }

  const testErrorNotification = () => {
    const analysis = testErrorAnalysis()
    showErrorNotification(analysis)
    
    setTestResults(prev => [...prev, {
      type: 'Error Notification',
      success: true,
      message: `Notificação exibida: ${analysis.userMessage}`,
      timestamp: new Date().toISOString()
    }])
  }

  const testRetryMechanism = async () => {
    setIsTestingRetry(true)
    
    try {
      let attemptCount = 0
      
      const result = await executeWithRetry(async () => {
        attemptCount++
        console.log(`Tentativa ${attemptCount}`)
        
        // Simular falha nas primeiras tentativas
        if (attemptCount < 3) {
          throw new Error(`Simulação de falha - tentativa ${attemptCount}`)
        }
        
        return { success: true, attempt: attemptCount }
      }, {
        documentId: 'test-doc-123',
        fileName: 'teste-retry.pdf',
        operationType: 'test_retry'
      })

      setTestResults(prev => [...prev, {
        type: 'Retry Success',
        success: true,
        message: `Sucesso após ${result.attempt} tentativas`,
        timestamp: new Date().toISOString()
      }])

    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'Retry Failed',
        success: false,
        message: `Falha após todas as tentativas: ${error}`,
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsTestingRetry(false)
    }
  }

  const testErrorHandling = async () => {
    const errorMessage = getErrorMessage(selectedErrorType)
    
    try {
      await handleDocumentError(errorMessage, {
        documentId: 'test-doc-123',
        fileName: 'teste-handling.pdf',
        autoRetry: false,
        updateStatus: false
      })

      setTestResults(prev => [...prev, {
        type: 'Error Handling',
        success: true,
        message: `Erro tratado com sucesso: ${selectedErrorType}`,
        timestamp: new Date().toISOString()
      }])

    } catch (error) {
      setTestResults(prev => [...prev, {
        type: 'Error Handling',
        success: false,
        message: `Falha no tratamento: ${error}`,
        timestamp: new Date().toISOString()
      }])
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Error Handling Test
            <Badge variant="outline" className="ml-2">
              Task 1.3 - Implementar Error Handling Robusto
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Controles de Teste */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Erro</label>
              <Select 
                value={selectedErrorType} 
                onValueChange={(value) => setSelectedErrorType(value as DocumentErrorType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DocumentErrorType.OCR_FAILED}>OCR Failed</SelectItem>
                  <SelectItem value={DocumentErrorType.AI_ANALYSIS_FAILED}>AI Analysis Failed</SelectItem>
                  <SelectItem value={DocumentErrorType.FILE_TOO_LARGE}>File Too Large</SelectItem>
                  <SelectItem value={DocumentErrorType.INVALID_FILE_TYPE}>Invalid File Type</SelectItem>
                  <SelectItem value={DocumentErrorType.NETWORK_ERROR}>Network Error</SelectItem>
                  <SelectItem value={DocumentErrorType.TIMEOUT}>Timeout</SelectItem>
                  <SelectItem value={DocumentErrorType.API_RATE_LIMIT}>API Rate Limit</SelectItem>
                  <SelectItem value={DocumentErrorType.INSUFFICIENT_CREDITS}>Insufficient Credits</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="text-sm">
                <div className="font-medium">Mensagem de Erro:</div>
                <div className="text-muted-foreground">{getErrorMessage(selectedErrorType)}</div>
              </div>
            </div>
          </div>

          {/* Estado do Retry */}
          {(isRetrying || isTestingRetry) && (
            <Alert>
              <Activity className="h-4 w-4 animate-pulse" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>
                      {isRetrying 
                        ? `Tentativa ${retryState.currentAttempt} de ${retryState.maxAttempts}`
                        : 'Testando mecanismo de retry...'
                      }
                    </span>
                    <Button variant="outline" size="sm" onClick={cancelRetry}>
                      Cancelar
                    </Button>
                  </div>
                  {isRetrying && (
                    <Progress 
                      value={(retryState.currentAttempt / retryState.maxAttempts) * 100} 
                      className="h-2" 
                    />
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Botões de Teste */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              onClick={testErrorAnalysis}
              variant="outline"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Analisar Erro
            </Button>

            <Button 
              onClick={testErrorNotification}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Testar Notificação
            </Button>

            <Button 
              onClick={testRetryMechanism}
              disabled={isTestingRetry || isRetrying}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isTestingRetry ? 'animate-spin' : ''}`} />
              Testar Retry
            </Button>

            <Button 
              onClick={testErrorHandling}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Testar Handling
            </Button>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => setShowRecoveryPanel(true)}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Abrir Recovery Panel
            </Button>

            <Button 
              onClick={clearResults}
              variant="outline"
            >
              Limpar Resultados
            </Button>
          </div>

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
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
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
              <li>• <strong>Analisar Erro:</strong> Testa a análise automática de diferentes tipos de erro</li>
              <li>• <strong>Testar Notificação:</strong> Verifica se as notificações são exibidas corretamente</li>
              <li>• <strong>Testar Retry:</strong> Simula falhas e recuperação automática</li>
              <li>• <strong>Testar Handling:</strong> Testa o tratamento completo de erros</li>
              <li>• <strong>Recovery Panel:</strong> Abre o painel de recuperação de erro</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Panel */}
      <EnhancedErrorRecoveryPanel
        documento={mockErrorDocument}
        isOpen={showRecoveryPanel}
        onClose={() => setShowRecoveryPanel(false)}
        onSuccess={() => {
          setTestResults(prev => [...prev, {
            type: 'Recovery Success',
            success: true,
            message: 'Documento recuperado com sucesso',
            timestamp: new Date().toISOString()
          }])
        }}
      />
    </div>
  )
}
