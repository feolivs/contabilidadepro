'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'

export interface RealtimeNotification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  action?: string
  actionUrl?: string
  timestamp: Date
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  source: 'sistema' | 'calculo' | 'documento' | 'prazo' | 'ia'
  metadata?: Record<string, any>
}

export interface NotificationStats {
  total: number
  unread: number
  critical: number
  today: number
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    critical: 0,
    today: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()

  const addNotification = (notification: Omit<RealtimeNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: RealtimeNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    }

    setNotifications(prev => [newNotification, ...prev])
    updateStats()

    // Toast baseado na prioridade
    if (notification.priority === 'critical') {
      toast.error(notification.title, {
        description: notification.message,
        duration: 10000,
        action: notification.action ? {
          label: notification.action,
          onClick: () => notification.actionUrl && window.open(notification.actionUrl, '_blank')
        } : undefined
      })
    } else if (notification.priority === 'high') {
      toast.warning(notification.title, {
        description: notification.message,
        duration: 7000
      })
    } else if (notification.type === 'success') {
      toast.success(notification.title, {
        description: notification.message,
        duration: 4000
      })
    } else {
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000
      })
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    )
    updateStats()
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    )
    updateStats()
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
    updateStats()
  }

  const clearAll = () => {
    setNotifications([])
    updateStats()
  }

  const updateStats = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    setStats(prev => {
      const newStats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.read).length,
        critical: notifications.filter(n => n.priority === 'critical').length,
        today: notifications.filter(n => n.timestamp >= today).length
      }
      return newStats
    })
  }

  // Simulador de notificações baseadas em eventos do sistema
  const simulateSystemEvents = () => {
    // Simular notificações baseadas em eventos reais
    const events = [
      {
        trigger: 'new_calculation',
        notification: {
          type: 'success' as const,
          title: 'Cálculo Concluído',
          message: 'DAS calculado com sucesso para Empresa ABC',
          priority: 'medium' as const,
          source: 'calculo' as const,
          action: 'Ver Detalhes',
          actionUrl: '/calculos'
        }
      },
      {
        trigger: 'deadline_warning',
        notification: {
          type: 'warning' as const,
          title: 'Prazo Fiscal Próximo',
          message: 'IRPJ vence em 3 dias - Empresa XYZ',
          priority: 'high' as const,
          source: 'prazo' as const,
          action: 'Ver Prazos',
          actionUrl: '/prazos'
        }
      },
      {
        trigger: 'document_processed',
        notification: {
          type: 'info' as const,
          title: 'Documento Processado',
          message: 'NFe #12345 processada via OCR',
          priority: 'low' as const,
          source: 'documento' as const,
          action: 'Ver Documento',
          actionUrl: '/documentos'
        }
      },
      {
        trigger: 'ai_insight',
        notification: {
          type: 'info' as const,
          title: 'Sugestão da IA',
          message: 'Oportunidade de economia tributária identificada',
          priority: 'medium' as const,
          source: 'ia' as const,
          action: 'Ver Análise',
          actionUrl: '/assistente'
        }
      },
      {
        trigger: 'system_critical',
        notification: {
          type: 'error' as const,
          title: 'Erro Crítico',
          message: 'Falha na conexão com API da Receita Federal',
          priority: 'critical' as const,
          source: 'sistema' as const,
          action: 'Verificar Status',
          actionUrl: '/status'
        }
      }
    ]

    // Simular eventos aleatórios
    if (events.length > 0) {
      const randomEvent = events[Math.floor(Math.random() * events.length)]
      addNotification(randomEvent.notification)
    }
  }

  // Escutar mudanças em tempo real do banco
  useEffect(() => {
    if (!user) return

    setIsLoading(true)

    // Subscription para cálculos
    const calculosSubscription = supabase
      .channel('calculos_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calculos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Novo cálculo:', payload)
          addNotification({
            type: 'success',
            title: 'Novo Cálculo Criado',
            message: `Cálculo ${payload.new.tipo} adicionado`,
            priority: 'medium',
            source: 'calculo',
            action: 'Ver Cálculo',
            actionUrl: '/calculos'
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calculos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.status === 'concluido') {
            addNotification({
              type: 'success',
              title: 'Cálculo Concluído',
              message: `${payload.new.tipo} processado com sucesso`,
              priority: 'medium',
              source: 'calculo',
              action: 'Ver Resultado',
              actionUrl: '/calculos'
            })
          }
        }
      )
      .subscribe()

    // Subscription para documentos
    const documentosSubscription = supabase
      .channel('documentos_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documentos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Novo documento:', payload)
          addNotification({
            type: 'info',
            title: 'Documento Enviado',
            message: `${payload.new.nome} adicionado para processamento`,
            priority: 'low',
            source: 'documento',
            action: 'Ver Documento',
            actionUrl: '/documentos'
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documentos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.status === 'processado') {
            addNotification({
              type: 'success',
              title: 'Documento Processado',
              message: `${payload.new.nome} processado com sucesso`,
              priority: 'medium',
              source: 'documento',
              action: 'Ver Resultado',
              actionUrl: '/documentos'
            })
          } else if (payload.new.status === 'erro') {
            addNotification({
              type: 'error',
              title: 'Erro no Processamento',
              message: `Falha ao processar ${payload.new.nome}`,
              priority: 'high',
              source: 'documento',
              action: 'Ver Detalhes',
              actionUrl: '/documentos'
            })
          }
        }
      )
      .subscribe()

    // Subscription para prazos fiscais
    const prazosSubscription = supabase
      .channel('prazos_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prazos_fiscais',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const dataVencimento = new Date(payload.new.data_vencimento)
          const hoje = new Date()
          const diasRestantes = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

          if (diasRestantes <= 7) {
            addNotification({
              type: 'warning',
              title: 'Prazo Fiscal Próximo',
              message: `${payload.new.descricao} vence em ${diasRestantes} dias`,
              priority: diasRestantes <= 3 ? 'critical' : 'high',
              source: 'prazo',
              action: 'Ver Prazos',
              actionUrl: '/prazos'
            })
          }
        }
      )
      .subscribe()

    setIsLoading(false)

    // Simular eventos periódicos (apenas para demonstração)
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance a cada 30s
        simulateSystemEvents()
      }
    }, 30000)

    return () => {
      calculosSubscription.unsubscribe()
      documentosSubscription.unsubscribe()
      prazosSubscription.unsubscribe()
      clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    updateStats()
  }, [notifications])

  return {
    notifications,
    stats,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  }
}