'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useRealtimeDocuments } from '@/hooks/use-realtime-documents'
import { 
  FileText, 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Zap,
  Upload,
  TrendingUp
} from 'lucide-react'

/**
 * Componente de teste para verificar a implementação do Real-time Document Updates
 * Este componente pode ser usado temporariamente para testar a funcionalidade
 */
export function RealtimeDocumentStatusTest() {
  const {
    documents,
    isLoading,
    error,
    isConnected,
    refresh
  } = useRealtimeDocuments()

  const [showDetails, setShowDetails] = useState(false)

  const stats = {
    total: documents.length,
    processing: documents.filter(d => d.status === 'processing').length,
    completed: documents.filter(d => d.status === 'completed').length,
    errors: documents.filter(d => d.status === 'error').length,
    pending: documents.filter(d => d.status === 'pending').length
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processing':
        return <Zap className="h-4 w-4 text-blue-600 animate-pulse" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Real-time Documents Test
            <Badge className={`ml-2 ${
              isConnected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <Activity className={`h-3 w-3 mr-1 ${isConnected ? 'animate-pulse' : ''}`} />
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Ocultar' : 'Mostrar'} Detalhes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Status da conexão */}
        <div className="mb-4 p-3 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium">
                Status da Conexão: {isConnected ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {documents.length} documentos carregados
            </div>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-4">
            <RefreshCw className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-gray-500">Carregando documentos...</p>
          </div>
        )}

        {/* Stats */}
        {!isLoading && (
          <div className="grid grid-cols-5 gap-3 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">{stats.processing}</div>
              <div className="text-xs text-muted-foreground">Processando</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-muted-foreground">Concluídos</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">{stats.errors}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
          </div>
        )}

        {/* Lista de documentos */}
        {showDetails && !isLoading && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Documentos Recentes:</h4>
            {documents.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhum documento encontrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {documents.slice(0, 10).map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-3 p-2 border rounded-lg">
                    {getStatusIcon(doc.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <Badge className={`text-xs ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{doc.type}</span>
                        {doc.confidence && (
                          <>
                            <span>•</span>
                            <span>{Math.round(doc.confidence * 100)}% confiança</span>
                          </>
                        )}
                      </div>
                      {doc.status === 'processing' && (
                        <div className="mt-1">
                          <Progress value={doc.progress} className="h-1" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {doc.progress}% - {doc.processing_stage || 'Processando'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Instruções de teste */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-sm text-blue-900 mb-2">Como testar:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Faça upload de um documento na página de documentos</li>
            <li>• Observe se o documento aparece automaticamente aqui</li>
            <li>• Verifique se o status muda de "pending" para "processing" para "completed"</li>
            <li>• Observe se a barra de progresso funciona durante o processamento</li>
            <li>• Teste a conexão real-time observando o badge de status</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
