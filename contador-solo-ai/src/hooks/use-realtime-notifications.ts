'use client'

import { useEffect } from 'react'
import { useNotifications, type NotificationData } from '@/providers/notification-provider'
import { useAuthStore } from '@/store/auth-store'

// Re-export types for backward compatibility
export type { NotificationData }

/**
 * Hook para notificações em tempo real
 * Agora conectado ao NotificationProvider global
 */
export function useRealtimeNotifications() {
  const { user } = useAuthStore()
  const {
    notifications,
    unreadCount,
    isConnected,
    subscribe,
    unsubscribe,
    markAsRead,
    markAllAsRead,
    dismissNotification
  } = useNotifications()

  // Auto-subscribe quando usuário está disponível
  useEffect(() => {
    if (user?.id) {
      console.log('🔔 Auto-subscribing para notificações do usuário:', user.id)
      subscribe(user.id)
    } else {
      console.log('🔌 Unsubscribing - usuário não disponível')
      unsubscribe()
    }

    // Cleanup na desmontagem
    return () => {
      unsubscribe()
    }
  }, [user?.id]) // Removidas as dependências subscribe e unsubscribe para evitar loops

  return {
    notifications,
    unreadCount,
    isLoading: false,
    isConnected,
    error: null,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    // Métodos de controle manual (se necessário)
    subscribe: user?.id ? () => subscribe(user.id) : () => {},
    unsubscribe
  }
}