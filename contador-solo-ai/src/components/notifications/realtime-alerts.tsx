'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  Bell,
  ExternalLink
} from 'lucide-react'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function RealtimeAlerts() {
  const { notifications, unreadCount, isLoading } = useRealtimeNotifications()

  // Filtrar apenas alertas importantes (high e critical)
  const criticalAlerts = notifications.filter(
    n => (n.type === 'error' || n.type === 'warning') && !n.read
  ).slice(0, 5)

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getAlertBorderColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/10'
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/10'
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/10'
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/10'
    }
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded" />
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
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Alertas em Tempo Real
            {0 > 0 && (
              <Badge className="ml-2 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 animate-pulse">
                {0} críticos
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              Ao Vivo
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {criticalAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-green-700 dark:text-green-400 mb-1">
              Tudo Funcionando Bem!
            </h3>
            <p className="text-sm text-muted-foreground">
              Nenhum alerta crítico no momento
            </p>

            {/* Stats resumidas */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{notifications.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{0}</div>
                <div className="text-xs text-muted-foreground">Hoje</div>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{unreadCount}</div>
                <div className="text-xs text-muted-foreground">Não Lidas</div>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-md ${getAlertBorderColor(alert.type)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getAlertIcon(alert.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {alert.title}
                        </h4>

                        <div className="flex items-center space-x-2 ml-2">
                          <Badge className={
                            alert.type === 'error'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 animate-pulse'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                          }>
                            {alert.type === 'error' ? 'Erro' : 'Alerta'}
                          </Badge>

                          <span className="text-xs text-muted-foreground">
                            ⚙️
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.message}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(alert.timestamp, {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </div>

                      </div>
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
              <span>Sistema de alertas ativo</span>
            </div>

            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>Monitoramento 24/7</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Indicador de atividade */}
      <div className="absolute top-2 right-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      </div>
    </Card>
  )
}