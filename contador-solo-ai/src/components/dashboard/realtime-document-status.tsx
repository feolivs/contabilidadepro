'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  RefreshCw,
  ExternalLink,
  Activity,
  TrendingUp
} from 'lucide-react'
import { useRealtimeDocuments } from '@/hooks/use-realtime-documents'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function RealtimeDocumentStatus() {
  const {
    documents,
    isLoading,
    error
  } = useRealtimeDocuments()

  const getRecentDocuments = (limit: number) => documents.slice(0, limit)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const stats = {
    total: documents.length,
    processando: documents.filter(d => d.status === 'processing').length,
    processados: documents.filter(d => d.status === 'completed').length,
    erros: documents.filter(d => d.status === 'error').length,
    totalTamanho: 0
  }

  const refresh = () => {
    // Placeholder para refresh
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processado':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processando':
        return <Zap className="h-4 w-4 text-blue-600 animate-pulse" />
      case 'erro':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'pendente':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'processando':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'erro':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processado':
        return 'Processado'
      case 'processando':
        return 'Processando'
      case 'erro':
        return 'Erro'
      case 'pendente':
        return 'Pendente'
      default:
        return 'Desconhecido'
    }
  }

  const recentDocuments = getRecentDocuments(8)

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 bg-gray-100 rounded">
                <div className="h-6 w-8 bg-gray-200 rounded mb-1" />
                <div className="h-3 w-12 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-2 w-full bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Status dos Documentos
            <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              Tempo Real
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              className="h-8 w-8 p-0"
              title="Atualizar status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Stats dos documentos */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.processando}</div>
            <div className="text-xs text-muted-foreground">Processando</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.processados}</div>
            <div className="text-xs text-muted-foreground">Processados</div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.erros}</div>
            <div className="text-xs text-muted-foreground">Erros</div>
          </div>
        </div>

        {/* Info adicional */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Upload className="h-4 w-4 text-gray-600" />
              <span>Tamanho total: {formatFileSize(stats.totalTamanho)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-green-600">
                {stats.total > 0 ? Math.round((stats.processados / stats.total) * 100) : 0}% processados
              </span>
            </div>
          </div>
        </div>

        {recentDocuments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">
              Nenhum Documento
            </h3>
            <p className="text-sm text-muted-foreground">
              Seus documentos aparecerão aqui quando enviados
            </p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {recentDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(document.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 truncate">
                          {document.name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-2">
                          <span>{document.type}</span>
                          <span>•</span>
                          <span>{formatFileSize(0)}</span>
                          <span>•</span>
                          <span>
                            {formatDistanceToNow(new Date(document.lastUpdated), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>
                      </div>

                      <Badge className={`text-xs ml-2 ${getStatusColor(document.status)}`}>
                        {getStatusText(document.status)}
                      </Badge>
                    </div>

                    {/* Barra de progresso para documentos processando */}
                    {document.status === 'processing' && (
                      <div className="mb-2">
                        <Progress
                          value={document.progress}
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Processando... {Math.round(document.progress)}%
                        </div>
                      </div>
                    )}

                    {/* Mensagem de erro */}
                    {document.status === 'error' && (
                      <div className="text-xs text-red-600 mb-2">
                        Erro no processamento
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        ID: {document.id.slice(0, 8)}...
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer com link para página completa */}
        {recentDocuments.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('/documentos', '_blank')}
            >
              Ver Todos os Documentos ({stats.total})
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Sistema de status em tempo real */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>Monitoramento em tempo real</span>
            </div>

            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>Atualizações automáticas</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Indicador de atividade */}
      <div className="absolute top-2 right-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      </div>
    </Card>
  )
}