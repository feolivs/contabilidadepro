'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
  Settings
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    dismissNotification
  } = useRealtimeNotifications()

  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all')
  const [isOpen, setIsOpen] = useState(false)

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      switch (filter) {
        case 'unread':
          return notification.status === 'unread'
        case 'critical':
          return notification.priority === 'CRITICAL' || notification.priority === 'HIGH'
        default:
          return true
      }
    })
  }, [notifications, filter])

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'CRITICAL') {
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
    
    switch (type) {
      case 'fiscal_alert':
      case 'compliance_alert':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

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

  const handleMarkAsRead = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    await markAsRead(id)
  }

  const handleDismiss = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    await dismissNotification(id)
  }

  const handleNotificationClick = (notification: any) => {
    if (notification.status === 'unread') {
      markAsRead(notification.id)
    }

    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {isConnected ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5 opacity-50" />
          )}
          
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs animate-pulse bg-red-500 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notificações</h3>
            {!isConnected && (
              <Badge variant="outline" className="text-xs">
                Desconectado
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(value: 'all' | 'unread' | 'critical') => setFilter(value)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Não lidas</SelectItem>
                <SelectItem value="critical">Críticas</SelectItem>
              </SelectContent>
            </Select>
            
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {filter === 'all' 
                  ? 'Nenhuma notificação' 
                  : filter === 'unread'
                  ? 'Nenhuma notificação não lida'
                  : 'Nenhuma notificação crítica'
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
                    notification.status === 'unread' && "bg-blue-50/50 dark:bg-blue-950/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type, notification.priority)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {notification.message}
                          </p>
                        </div>

                        <Badge className={cn("text-xs", getPriorityColor(notification.priority))}>
                          {notification.priority}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </div>

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
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDismiss(notification.id, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
              )} />
              <span>
                {isConnected ? 'Conectado' : 'Desconectado'} • {notifications.length} total
              </span>
            </div>

            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Settings className="h-3 w-3 mr-1" />
              Configurar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
