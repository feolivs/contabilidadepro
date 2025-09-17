'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Activity,
  Calculator,
  FileText,
  Calendar,
  User,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  TrendingUp
} from 'lucide-react'
import { useRealtimeActivities } from '@/hooks/use-realtime-activities'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function RealtimeRecentActivities() {
  const { activities, stats, isLoading, refresh } = useRealtimeActivities()

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'calculation':
        return <Calculator className="h-4 w-4 text-blue-600" />
      case 'document':
        return <FileText className="h-4 w-4 text-green-600" />
      case 'deadline':
        return <Calendar className="h-4 w-4 text-orange-600" />
      case 'user':
        return <User className="h-4 w-4 text-purple-600" />
      case 'system':
        return <Settings className="h-4 w-4 text-gray-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'processing':
        return <Clock className="h-3 w-3 text-blue-600 animate-spin" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-600" />
      case 'pending':
        return <AlertCircle className="h-3 w-3 text-yellow-600" />
      default:
        return <Clock className="h-3 w-3 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído'
      case 'processing':
        return 'Processando'
      case 'failed':
        return 'Erro'
      case 'pending':
        return 'Pendente'
      default:
        return 'Desconhecido'
    }
  }

  const getActivityUrl = (activity: any) => {
    switch (activity.entityType) {
      case 'calculo':
        return '/calculos'
      case 'documento':
        return '/documentos'
      case 'prazo':
        return '/prazos'
      default:
        return '/dashboard'
    }
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded" />
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
            <Activity className="h-5 w-5 mr-2" />
            Atividades Recentes
            <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              <TrendingUp className="h-3 w-3 mr-1 animate-pulse" />
              Tempo Real
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              className="h-8 w-8 p-0"
              title="Atualizar atividades"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Stats rápidas */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
            <div className="text-lg font-bold text-blue-600">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
            <div className="text-lg font-bold text-green-600">{stats.today}</div>
            <div className="text-xs text-muted-foreground">Hoje</div>
          </div>
          <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
            <div className="text-lg font-bold text-purple-600">{stats.thisWeek}</div>
            <div className="text-xs text-muted-foreground">Esta Semana</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
            <div className="text-lg font-bold text-yellow-600">{stats.processing}</div>
            <div className="text-xs text-muted-foreground">Processando</div>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
            <div className="text-lg font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Erros</div>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-1">
              Nenhuma Atividade Recente
            </h3>
            <p className="text-sm text-muted-foreground">
              Suas atividades aparecerão aqui em tempo real
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {activity.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {activity.description}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 ml-2">
                        <Badge className={`text-xs ${getStatusBadge(activity.status)}`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(activity.status)}
                            <span>{getStatusText(activity.status)}</span>
                          </div>
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(activity.timestamp, {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </div>

                      {activity.entityId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => window.open(getActivityUrl(activity), '_blank')}
                        >
                          Ver Detalhes
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Sistema de status em tempo real */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Monitoramento em tempo real ativo</span>
            </div>

            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
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