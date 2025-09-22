'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  BellRing,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle,
  ExternalLink,
  Settings,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { useFiscalAlerts } from '@/hooks/use-fiscal-alerts'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AlertasIntegrationProps {
  showOnlyFiscal?: boolean
  maxItems?: number
  showSettings?: boolean
}

export function AlertasIntegration({ 
  showOnlyFiscal = true, 
  maxItems = 10,
  showSettings = true 
}: AlertasIntegrationProps) {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    dismissNotification
  } = useRealtimeNotifications()

  const { useActiveAlerts } = useFiscalAlerts()
  const { data: fiscalAlerts, isLoading: alertsLoading } = useActiveAlerts()

  const [filter, setFilter] = useState<'all' | 'critical' | 'fiscal' | 'unread'>('all')
  const [showDismissed, setShowDismissed] = useState(false)

  // Filtrar notificações baseado no filtro selecionado
  const filteredNotifications = useMemo(() => {
    let filtered = notifications

    // Filtrar apenas notificações fiscais se solicitado
    if (showOnlyFiscal) {
      filtered = filtered.filter(n => 
        n.type === 'fiscal_alert' || 
        n.category === 'compliance' ||
        n.source === 'fiscal_system'
      )
    }

    // Aplicar filtros adicionais
    switch (filter) {
      case 'critical':
        filtered = filtered.filter(n => n.priority === 'CRITICAL' || n.priority === 'HIGH')
        break
      case 'fiscal':
        filtered = filtered.filter(n => 
          n.type === 'fiscal_alert' || 
          n.category === 'compliance'
        )
        break
      case 'unread':
        filtered = filtered.filter(n => n.status === 'unread')
        break
    }

    // Filtrar dispensadas se não deve mostrar
    if (!showDismissed) {
      filtered = filtered.filter(n => n.status !== 'dismissed')
    }

    // Limitar quantidade
    return filtered.slice(0, maxItems)
  }, [notifications, filter, showOnlyFiscal, showDismissed, maxItems])

  // Combinar alertas fiscais com notificações para estatísticas
  const alertStats = useMemo(() => {
    const fiscalNotifications = notifications.filter(n => 
      n.type === 'fiscal_alert' || n.category === 'compliance'
    )

    const critical = fiscalNotifications.filter(n => n.priority === 'CRITICAL').length
    const high = fiscalNotifications.filter(n => n.priority === 'HIGH').length
    const medium = fiscalNotifications.filter(n => n.priority === 'MEDIUM').length
    const total = fiscalNotifications.length

    const activeFiscalAlerts = fiscalAlerts?.filter(a => a.status === 'ACTIVE').length || 0

    return {
      total,
      critical,
      high,
      medium,
      unread: fiscalNotifications.filter(n => n.status === 'unread').length,
      activeFiscalAlerts
    }
  }, [notifications, fiscalAlerts])

  // Ícone baseado no tipo e prioridade
  const getNotificationIcon = (notification: any) => {
    if (notification.priority === 'CRITICAL') {
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
    
    switch (notification.type) {
      case 'fiscal_alert':
        return <Calendar className="h-4 w-4 text-orange-600" />
      case 'compliance_alert':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Bell className="h-4 w-4 text-blue-600" />
    }
  }

  // Cor do badge baseado na prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    }
  }

  // Handler para marcar como lida
  const handleMarkAsRead = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    await markAsRead(id)
    toast.success('Notificação marcada como lida')
  }

  // Handler para dispensar
  const handleDismiss = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    await dismissNotification(id)
    toast.success('Notificação dispensada')
  }

  // Handler para clicar na notificação
  const handleNotificationClick = (notification: any) => {
    // Marcar como lida se não estiver
    if (notification.status === 'unread') {
      markAsRead(notification.id)
    }

    // Navegar para URL se disponível
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  return (
    <div className="space-y-4">
      {/* Estatísticas de Alertas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{alertStats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold text-red-600">{alertStats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Altos</p>
                <p className="text-2xl font-bold text-orange-600">{alertStats.high}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Não Lidos</p>
                <p className="text-2xl font-bold text-blue-600">{alertStats.unread}</p>
              </div>
              <BellRing className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertas Ativos</p>
                <p className="text-2xl font-bold text-green-600">{alertStats.activeFiscalAlerts}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel de Alertas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Alertas Fiscais
              {!isConnected && (
                <Badge variant="outline" className="text-xs">
                  Desconectado
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Filtros */}
              <Select value={filter} onValueChange={(value: 'all' | 'critical' | 'fiscal' | 'unread') => setFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="critical">Críticos</SelectItem>
                  <SelectItem value="fiscal">Fiscais</SelectItem>
                  <SelectItem value="unread">Não lidos</SelectItem>
                </SelectContent>
              </Select>

              {/* Toggle para mostrar dispensados */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDismissed(!showDismissed)}
              >
                {showDismissed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>

              {/* Configurações */}
              {showSettings && (
                <Button variant="outline" size="sm" asChild>
                  <a href="/test-notifications">
                    <Settings className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {filter === 'all' 
                    ? 'Nenhum alerta fiscal' 
                    : filter === 'unread'
                    ? 'Nenhum alerta não lido'
                    : filter === 'critical'
                    ? 'Nenhum alerta crítico'
                    : 'Nenhum alerta fiscal'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      notification.status === 'unread' && "bg-blue-50/50 dark:bg-blue-950/20",
                      notification.priority === 'CRITICAL' && "border-l-4 border-red-500"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification)}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground line-clamp-1">
                              {notification.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {notification.message}
                            </p>
                            
                            {/* Metadados específicos de alertas fiscais */}
                            {notification.metadata?.due_date && (
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Vence: {new Date(notification.metadata.due_date).toLocaleDateString('pt-BR')}
                                </span>
                                {notification.metadata.days_until_due !== undefined && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {notification.metadata.days_until_due <= 0 
                                        ? 'VENCIDO' 
                                        : `${notification.metadata.days_until_due} dias`
                                      }
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Badge de prioridade */}
                          <Badge className={cn("text-xs", getPriorityColor(notification.priority))}>
                            {notification.priority}
                          </Badge>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1">
                            {notification.action_url && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            )}
                            
                            {notification.status === 'unread' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={(e) => handleMarkAsRead(notification.id, e)}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Status da Conexão */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-400"
          )} />
          <span>
            {isConnected ? 'Conectado ao sistema de alertas' : 'Desconectado do sistema de alertas'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>{filteredNotifications.length} alertas exibidos</span>
          <span>•</span>
          <span>{unreadCount} não lidos</span>
        </div>
      </div>
    </div>
  )
}
