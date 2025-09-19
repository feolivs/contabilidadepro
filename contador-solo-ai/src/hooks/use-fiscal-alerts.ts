'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// Tipos
export type AlertType = 
  | 'DAS_VENCIMENTO'
  | 'IRPJ_VENCIMENTO'
  | 'CSLL_VENCIMENTO'
  | 'DEFIS_PRAZO'
  | 'SPED_PRAZO'
  | 'DCTF_PRAZO'
  | 'GFIP_PRAZO'
  | 'RAIS_PRAZO'
  | 'DIRF_PRAZO'
  | 'DOCUMENTO_VENCIDO'
  | 'RECEITA_LIMITE'
  | 'REGIME_MUDANCA'
  | 'CERTIFICADO_VENCIMENTO'
  | 'CUSTOM'

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
export type NotificationFrequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface AlertConfiguration {
  id: string
  user_id: string
  alert_type: AlertType
  enabled: boolean
  days_before: number
  notification_frequency: NotificationFrequency
  configuration: any
  created_at: string
  updated_at: string
}

export interface FiscalAlert {
  id: string
  user_id: string
  alert_type: AlertType
  title: string
  description: string
  priority: AlertPriority
  status: AlertStatus
  due_date: string
  alert_date: string
  days_until_due: number
  context_data: any
  suggested_actions: string[]
  related_document_id?: string
  related_company_id?: string
  notification_sent: boolean
  created_at: string
  acknowledged_at?: string
  resolved_at?: string
}

export interface AlertNotification {
  id: string
  alert_id: string
  user_id: string
  notification_type: string
  sent_at: string
  delivered: boolean
  delivered_at?: string
  subject?: string
  message?: string
  metadata: any
}

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  DAS_VENCIMENTO: 'Vencimento DAS',
  IRPJ_VENCIMENTO: 'Vencimento IRPJ',
  CSLL_VENCIMENTO: 'Vencimento CSLL',
  DEFIS_PRAZO: 'Prazo DEFIS',
  SPED_PRAZO: 'Prazo SPED',
  DCTF_PRAZO: 'Prazo DCTF',
  GFIP_PRAZO: 'Prazo GFIP',
  RAIS_PRAZO: 'Prazo RAIS',
  DIRF_PRAZO: 'Prazo DIRF',
  DOCUMENTO_VENCIDO: 'Documento Vencendo',
  RECEITA_LIMITE: 'Limite de Receita',
  REGIME_MUDANCA: 'Mudança de Regime',
  CERTIFICADO_VENCIMENTO: 'Certificado Vencendo',
  CUSTOM: 'Personalizado'
}

const PRIORITY_COLORS: Record<AlertPriority, string> = {
  LOW: 'bg-gray-100 text-gray-800 border-gray-200',
  MEDIUM: 'bg-blue-100 text-blue-800 border-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200'
}

/**
 * 🚨 Hook para gerenciamento de alertas fiscais
 */
export const useFiscalAlerts = () => {
  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()
  const queryClient = useQueryClient()

  // Query para buscar alertas ativos
  const useActiveAlerts = (priority?: AlertPriority) => {
    return useQuery({
      queryKey: ['fiscal-alerts', user?.id, priority],
      queryFn: async () => {
        if (!user?.id) return []

        const { data, error } = await supabase.rpc('get_active_alerts', {
          p_user_id: user.id,
          p_priority: priority,
          p_limit: 50
        })

        if (error) {
          throw new Error(`Erro ao buscar alertas: ${error.message}`)
        }

        return data as FiscalAlert[]
      },
      enabled: !!user?.id,
      refetchInterval: 5 * 60 * 1000 // Refetch a cada 5 minutos
    })
  }

  // Query para buscar configurações de alertas
  const useAlertConfigurations = () => {
    return useQuery({
      queryKey: ['alert-configurations', user?.id],
      queryFn: async () => {
        if (!user?.id) return []

        const { data, error } = await supabase
          .from('alert_configurations')
          .select('*')
          .eq('user_id', user.id)
          .order('alert_type')

        if (error) {
          throw new Error(`Erro ao buscar configurações: ${error.message}`)
        }

        return data as AlertConfiguration[]
      },
      enabled: !!user?.id
    })
  }

  // Mutation para reconhecer alerta
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase.rpc('acknowledge_alert', {
        p_alert_id: alertId,
        p_user_id: user.id
      })

      if (error) {
        throw new Error(`Erro ao reconhecer alerta: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-alerts'] })
    }
  })

  // Mutation para resolver alerta
  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase.rpc('resolve_alert', {
        p_alert_id: alertId,
        p_user_id: user.id
      })

      if (error) {
        throw new Error(`Erro ao resolver alerta: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-alerts'] })
    }
  })

  // Mutation para atualizar configuração de alerta
  const updateAlertConfigurationMutation = useMutation({
    mutationFn: async ({
      alertType,
      enabled,
      daysBefore,
      notificationFrequency,
      configuration
    }: {
      alertType: AlertType
      enabled?: boolean
      daysBefore?: number
      notificationFrequency?: NotificationFrequency
      configuration?: any
    }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const updateData: any = {}
      if (enabled !== undefined) updateData.enabled = enabled
      if (daysBefore !== undefined) updateData.days_before = daysBefore
      if (notificationFrequency !== undefined) updateData.notification_frequency = notificationFrequency
      if (configuration !== undefined) updateData.configuration = configuration

      const { data, error } = await supabase
        .from('alert_configurations')
        .upsert({
          user_id: user.id,
          alert_type: alertType,
          ...updateData
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Erro ao atualizar configuração: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configurations'] })
    }
  })

  // Mutation para criar configurações padrão
  const createDefaultConfigurationsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase.rpc('create_default_alert_configurations', {
        p_user_id: user.id
      })

      if (error) {
        throw new Error(`Erro ao criar configurações padrão: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configurations'] })
    }
  })

  // Função para obter estatísticas de alertas
  const getAlertStats = useCallback(async () => {
    if (!user?.id) return null

    const { data, error } = await supabase
      .from('fiscal_alerts')
      .select('priority, status')
      .eq('user_id', user.id)

    if (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`)
    }

    const stats = {
      total: data.length,
      active: data.filter(a => a.status === 'ACTIVE').length,
      critical: data.filter(a => a.priority === 'CRITICAL' && a.status === 'ACTIVE').length,
      high: data.filter(a => a.priority === 'HIGH' && a.status === 'ACTIVE').length,
      acknowledged: data.filter(a => a.status === 'ACKNOWLEDGED').length,
      resolved: data.filter(a => a.status === 'RESOLVED').length
    }

    return stats
  }, [user?.id, supabase])

  // Função para criar alerta personalizado
  const createCustomAlert = useCallback(async ({
    title,
    description,
    dueDate,
    priority = 'MEDIUM',
    suggestedActions = [],
    contextData = {}
  }: {
    title: string
    description: string
    dueDate: string
    priority?: AlertPriority
    suggestedActions?: string[]
    contextData?: any
  }) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado')
    }

    const alertDate = new Date(dueDate)
    alertDate.setDate(alertDate.getDate() - 7) // 7 dias antes por padrão

    const { data, error } = await supabase
      .from('fiscal_alerts')
      .insert({
        user_id: user.id,
        alert_type: 'CUSTOM',
        title,
        description,
        priority,
        due_date: dueDate,
        alert_date: alertDate.toISOString().split('T')[0],
        suggested_actions: suggestedActions,
        context_data: contextData
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar alerta: ${error.message}`)
    }

    queryClient.invalidateQueries({ queryKey: ['fiscal-alerts'] })
    return data
  }, [user?.id, supabase, queryClient])

  return {
    // Queries
    useActiveAlerts,
    useAlertConfigurations,
    
    // Mutations
    acknowledgeAlert: acknowledgeAlertMutation.mutateAsync,
    resolveAlert: resolveAlertMutation.mutateAsync,
    updateAlertConfiguration: updateAlertConfigurationMutation.mutateAsync,
    createDefaultConfigurations: createDefaultConfigurationsMutation.mutateAsync,
    
    // Functions
    getAlertStats,
    createCustomAlert,
    
    // Utils
    ALERT_TYPE_LABELS,
    PRIORITY_COLORS,
    
    // Loading states
    isAcknowledging: acknowledgeAlertMutation.isPending,
    isResolving: resolveAlertMutation.isPending,
    isUpdatingConfiguration: updateAlertConfigurationMutation.isPending,
    
    // Mutation objects
    acknowledgeAlertMutation,
    resolveAlertMutation,
    updateAlertConfigurationMutation,
    createDefaultConfigurationsMutation
  }
}
