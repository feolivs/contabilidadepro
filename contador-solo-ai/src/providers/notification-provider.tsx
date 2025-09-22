'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { RealtimeChannel } from '@supabase/supabase-js'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface NotificationData {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  category: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'unread' | 'read' | 'dismissed'
  source: string
  related_entity_type?: string
  related_entity_id?: string
  action_url?: string
  action_label?: string
  scheduled_for?: string
  expires_at?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  read: boolean // Add missing property
  timestamp: string // Add missing property
}

export interface FiscalAlert {
  id: string
  user_id: string
  alert_type: string
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
  due_date?: string
  alert_date: string
  suggested_actions?: string[]
  context_data: Record<string, any>
  created_at: string
  updated_at: string
}

interface NotificationContextType {
  notifications: NotificationData[]
  unreadCount: number
  isConnected: boolean
  subscribe: (userId: string) => void
  unsubscribe: () => void
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  dismissNotification: (id: string) => Promise<void>
  showAlert: (alert: FiscalAlert) => void
  playNotificationSound: (type: 'critical' | 'warning' | 'info') => void
}

// =====================================================
// CONTEXT
// =====================================================

const NotificationContext = createContext<NotificationContextType | null>(null)

// =====================================================
// PROVIDER COMPONENT
// =====================================================

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  
  const supabase = createBrowserSupabaseClient()

  // =====================================================
  // SUBSCRIPTION MANAGEMENT
  // =====================================================

  const subscribe = useCallback((userId: string) => {
    if (channel) {
      supabase.removeChannel(channel)
    }

    console.log('🔔 Iniciando subscription de notificações para usuário:', userId)

    const newChannel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Nova notificação recebida:', payload)
          handleNewNotification(payload.new as NotificationData)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔄 Notificação atualizada:', payload)
          handleNotificationUpdate(payload.new as NotificationData)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fiscal_alerts',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🚨 Novo alerta fiscal recebido:', payload)
          handleNewFiscalAlert(payload.new as FiscalAlert)
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscription:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    setChannel(newChannel)

    // Carregar notificações existentes
    loadExistingNotifications(userId)
  }, [supabase])

  const unsubscribe = useCallback(() => {
    if (channel) {
      console.log('🔌 Desconectando subscription de notificações')
      supabase.removeChannel(channel)
      setChannel(null)
      setIsConnected(false)
    }
  }, [channel, supabase])

  // =====================================================
  // EVENT HANDLERS
  // =====================================================

  const handleNewNotification = useCallback((notification: NotificationData) => {
    setNotifications(prev => [notification, ...prev])
    
    if (notification.status === 'unread') {
      setUnreadCount(prev => prev + 1)
    }

    // Mostrar toast para notificações importantes
    if (notification.priority === 'CRITICAL' || notification.priority === 'HIGH') {
      showNotificationToast(notification)
    }

    // Reproduzir som baseado na prioridade
    if (notification.priority === 'CRITICAL') {
      playNotificationSound('critical')
    } else if (notification.priority === 'HIGH') {
      playNotificationSound('warning')
    }
  }, [])

  const handleNotificationUpdate = useCallback((notification: NotificationData) => {
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? notification : n)
    )

    // Atualizar contador se status mudou
    if (notification.status === 'read') {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [])

  const handleNewFiscalAlert = useCallback((alert: FiscalAlert) => {
    // Converter alerta fiscal para notificação
    const notification: NotificationData = {
      id: `fiscal-alert-${alert.id}`,
      user_id: alert.user_id,
      title: alert.title,
      message: alert.description,
      type: 'fiscal_alert',
      category: 'compliance',
      priority: alert.priority,
      status: 'unread',
      source: 'fiscal_system',
      related_entity_type: 'fiscal_alert',
      related_entity_id: alert.id,
      action_url: alert.context_data?.action_url,
      action_label: alert.suggested_actions?.[0] || 'Ver Detalhes',
      metadata: {
        alert_type: alert.alert_type,
        due_date: alert.due_date,
        suggested_actions: alert.suggested_actions,
        context_data: alert.context_data
      },
      created_at: alert.created_at,
      updated_at: alert.updated_at
    }

    handleNewNotification(notification)
    showAlert(alert)
  }, [])

  // =====================================================
  // NOTIFICATION ACTIONS
  // =====================================================

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'read',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error)
        return
      }

      // Atualizar estado local
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }, [supabase])

  const markAllAsRead = useCallback(async () => {
    try {
      const { user } = useAuthStore.getState()
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'read',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('status', 'unread')

      if (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error)
        return
      }

      // Atualizar estado local
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })))
      setUnreadCount(0)

      toast.success('Todas as notificações foram marcadas como lidas')
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
    }
  }, [supabase])

  const dismissNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'dismissed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        console.error('Erro ao dispensar notificação:', error)
        return
      }

      // Remover do estado local
      setNotifications(prev => prev.filter(n => n.id !== id))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Erro ao dispensar notificação:', error)
    }
  }, [supabase])

  // =====================================================
  // ALERT DISPLAY
  // =====================================================

  const showAlert = useCallback((alert: FiscalAlert) => {
    if (alert.priority === 'CRITICAL') {
      toast.error(alert.title, {
        description: alert.description,
        duration: 10000, // 10 segundos para críticos
        action: {
          label: alert.suggested_actions?.[0] || 'Ver Detalhes',
          onClick: () => {
            if (alert.context_data?.action_url) {
              window.location.href = alert.context_data.action_url
            }
          }
        }
      })
    } else if (alert.priority === 'HIGH') {
      toast.warning(alert.title, {
        description: alert.description,
        duration: 7000,
        action: {
          label: alert.suggested_actions?.[0] || 'Ver Detalhes',
          onClick: () => {
            if (alert.context_data?.action_url) {
              window.location.href = alert.context_data.action_url
            }
          }
        }
      })
    } else {
      toast.info(alert.title, {
        description: alert.description,
        duration: 5000
      })
    }
  }, [])

  const showNotificationToast = useCallback((notification: NotificationData) => {
    const toastOptions = {
      description: notification.message,
      action: notification.action_url ? {
        label: notification.action_label || 'Ver',
        onClick: () => {
          if (notification.action_url) {
            window.location.href = notification.action_url
          }
        }
      } : undefined
    }

    if (notification.priority === 'CRITICAL') {
      toast.error(notification.title, { ...toastOptions, duration: 10000 })
    } else if (notification.priority === 'HIGH') {
      toast.warning(notification.title, { ...toastOptions, duration: 7000 })
    } else {
      toast.info(notification.title, { ...toastOptions, duration: 5000 })
    }
  }, [])

  // =====================================================
  // SOUND SYSTEM
  // =====================================================

  const playNotificationSound = useCallback((type: 'critical' | 'warning' | 'info') => {
    try {
      // Criar contexto de áudio se não existir
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Frequências diferentes para cada tipo
      const frequencies = {
        critical: [800, 600, 800], // Tom mais agudo e urgente
        warning: [600, 400, 600],  // Tom médio
        info: [400, 300, 400]      // Tom mais suave
      }

      const freq = frequencies[type]
      
      freq.forEach((frequency, index) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          oscillator.type = 'sine'
          
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
        }, index * 250)
      })
    } catch (error) {
      console.warn('Não foi possível reproduzir som de notificação:', error)
    }
  }, [])

  // =====================================================
  // LOAD EXISTING NOTIFICATIONS
  // =====================================================

  const loadExistingNotifications = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Erro ao carregar notificações existentes:', error)
        return
      }

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => n.status === 'unread').length)
    } catch (error) {
      console.error('Erro ao carregar notificações existentes:', error)
    }
  }, [supabase])

  // =====================================================
  // CONTEXT VALUE
  // =====================================================

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    subscribe,
    unsubscribe,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    showAlert,
    playNotificationSound
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

// =====================================================
// HOOK
// =====================================================

export function useNotifications() {
  const context = useContext(NotificationContext)

  if (!context) {
    throw new Error('useNotifications deve ser usado dentro do NotificationProvider')
  }

  return context
}
