'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileX,
  Zap,
  AlertCircle,
  Info,
  ExternalLink,
  Download,
  Shield,
  Timer,
  TrendingUp,
  Activity
} from 'lucide-react'
import { Documento } from '@/types/documento'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDocumentRetry } from '@/hooks/use-document-retry'
import { 
  analyzeDocumentError, 
  DocumentErrorType, 
  ErrorSeverity,
  type DocumentError 
} from '@/lib/document-error-handling'

interface EnhancedErrorRecoveryPanelProps {
  documento: Documento
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function EnhancedErrorRecoveryPanel({
  documento,
  isOpen,
  onClose,
  onSuccess
}: EnhancedErrorRecoveryPanelProps) {
  const [errorAnalysis, setErrorAnalysis] = useState<DocumentError | null>(null)
  const [retryHistory, setRetryHistory] = useState<Array<{
    attempt: number
    timestamp: string
    error: string
    success: boolean
  }>>([])

  const {
    retryState,
    isRetrying,
    handleDocumentError,
    manualRetry,
    cancelRetry
  } = useDocumentRetry({
    maxRetries: 3,
    onRetryAttempt: (attempt, error) => {
      setRetryHistory(prev => [...prev, {
        attempt,
        timestamp: new Date().toISOString(),
        error: error.message,
        success: false
      }])
    },
    onMaxRetriesReached: (error) => {
      console.log('Máximo de tentativas atingido:', error)
    }
  })

  // Analisar erro quando o componente abre
  useEffect(() => {
    if (isOpen && documento.status_processamento === 'erro') {
      const errorMessage = documento.observacoes || 'Erro desconhecido no processamento'
      const analysis = analyzeDocumentError(errorMessage, {
        documentId: documento.id,
        fileName: documento.arquivo_nome,
        fileSize: documento.arquivo_tamanho
      })
      setErrorAnalysis(analysis)
    }
  }, [isOpen, documento])

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case ErrorSeverity.MEDIUM:
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case ErrorSeverity.HIGH:
        return 'bg-red-100 text-red-800 border-red-200'
      case ErrorSeverity.CRITICAL:
        return 'bg-red-200 text-red-900 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return <Info className="h-4 w-4" />
      case ErrorSeverity.MEDIUM:
        return <AlertTriangle className="h-4 w-4" />
      case ErrorSeverity.HIGH:
        return <AlertCircle className="h-4 w-4" />
      case ErrorSeverity.CRITICAL:
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const handleRetry = async () => {
    try {
      await manualRetry(documento.id, documento.arquivo_nome)
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Erro no retry manual:', error)
    }
  }

  const handleMarkAsManual = async () => {
    try {
      await handleDocumentError('Marcado para processamento manual', {
        documentId: documento.id,
        fileName: documento.arquivo_nome,
        updateStatus: true
      })
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error('Erro ao marcar como manual:', error)
    }
  }

  if (!errorAnalysis) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-red-600" />
            Recuperação de Erro - {documento.arquivo_nome}
          </DialogTitle>
          <DialogDescription>
            Análise detalhada do erro e opções de recuperação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status do Retry */}
          {isRetrying && (
            <Alert>
              <Activity className="h-4 w-4 animate-pulse" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Tentativa {retryState.currentAttempt} de {retryState.maxAttempts}</span>
                    <Button variant="outline" size="sm" onClick={cancelRetry}>
                      Cancelar
                    </Button>
                  </div>
                  <Progress 
                    value={(retryState.currentAttempt / retryState.maxAttempts) * 100} 
                    className="h-2" 
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Análise do Erro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getSeverityIcon(errorAnalysis.severity)}
                Análise do Erro
                <Badge className={getSeverityColor(errorAnalysis.severity)}>
                  {errorAnalysis.severity.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Tipo de Erro:</h4>
                <Badge variant="outline">{errorAnalysis.type}</Badge>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Descrição:</h4>
                <p className="text-sm text-muted-foreground">{errorAnalysis.userMessage}</p>
              </div>

              {errorAnalysis.technicalDetails && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Detalhes Técnicos:</h4>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
                    {errorAnalysis.technicalDetails}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sugestões de Solução */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Sugestões de Solução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {errorAnalysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Histórico de Tentativas */}
          {retryHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Histórico de Tentativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {retryHistory.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Tentativa {entry.attempt}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.timestamp), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Informações do Documento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Informações do Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Tamanho:</span>
                <div>{(documento.arquivo_tamanho / 1024 / 1024).toFixed(2)} MB</div>
              </div>
              <div>
                <span className="font-medium">Tipo:</span>
                <div>{documento.arquivo_tipo}</div>
              </div>
              <div>
                <span className="font-medium">Criado:</span>
                <div>
                  {formatDistanceToNow(new Date(documento.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </div>
              </div>
              <div>
                <span className="font-medium">Última atualização:</span>
                <div>
                  {formatDistanceToNow(new Date(documento.updated_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Ações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {errorAnalysis.canRetry && (
              <Button 
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Tentando...' : 'Tentar Novamente'}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleMarkAsManual}
              disabled={isRetrying}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Marcar como Manual
            </Button>
          </div>

          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
