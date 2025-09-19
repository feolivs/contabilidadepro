'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Trash2,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  ExternalLink,
  Filter,
  Clock
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useRealtimeNotifications, type NotificationData } from '@/hooks/use-realtime-notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead
  } = useRealtimeNotifications()

  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all')
  const [isOpen, setIsOpen] = useState(false)

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read
      case 'critical':
        return notification.type === 'error' || notification.type === 'warning'
      default:
        return true
    }
  })

  const getNotificationIcon = (notification: NotificationData) => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getPriorityColor = (type: NotificationData['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'warning':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getSourceIcon = () => {
    return '⚙️'
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Bell className="h-4 w-4 animate-pulse" />
      </Button>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <BellRing className="h-5 w-5 mr-2" />
                Notificações
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    {unreadCount} novas
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center space-x-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {}}
                  title="Limpar todas"
                  disabled={notifications.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stats rápidas */}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                <div className="text-lg font-bold text-blue-600">{notifications.length}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                <div className="text-lg font-bold text-red-600">{0}</div>
                <div className="text-xs text-muted-foreground">Críticas</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                <div className="text-lg font-bold text-green-600">{0}</div>
                <div className="text-xs text-muted-foreground">Hoje</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex space-x-1 mt-3">
              {[
                { key: 'all', label: 'Todas', count: notifications.length },
                { key: 'unread', label: 'Não lidas', count: unreadCount },
                { key: 'critical', label: 'Importantes', count: 0 }
              ].map(filterOption => (
                <Button
                  key={filterOption.key}
                  variant={filter === filterOption.key ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(filterOption.key as any)}
                  className="text-xs"
                >
                  <Filter className="h-3 w-3 mr-1" />
                  {filterOption.label}
                  {filterOption.count > 0 && (
                    <Badge className="ml-1 h-4 text-xs">
                      {filterOption.count}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {filteredNotifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {filter === 'all'
                      ? 'Nenhuma notificação ainda'
                      : filter === 'unread'
                      ? 'Todas as notificações foram lidas'
                      : 'Nenhuma notificação importante'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">{getSourceIcon()}</span>
                              <h4 className="text-sm font-medium truncate">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>

                            <div className="flex items-center space-x-1 ml-2">
                              <Badge className={`text-xs ${getPriorityColor(notification.type)}`}>
                                {notification.type === 'error' ? 'Erro' :
                                 notification.type === 'warning' ? 'Alerta' :
                                 notification.type === 'success' ? 'Sucesso' : 'Info'}
                              </Badge>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => () => {}}
                                title="Remover notificação"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(notification.timestamp, {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Marcar como lida
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
      </PopoverContent>
    </Popover>
  )
}