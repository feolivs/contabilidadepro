// 📊 REALTIME ANALYTICS HOOKS
// Custom hooks para analytics em tempo real
// Integrado com Supabase Realtime e TanStack Query

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import {
  KPIData,
  ChartData,
  RealtimeMetrics,
  AnalyticsFilters,
  ActivityItem,
  AlertItem
} from '@/types/dashboard.types'

// Re-exportar tipos para compatibilidade
export type {
  KPIData,
  ChartData,
  RealtimeMetrics,
  AnalyticsFilters,
  ActivityItem,
  AlertItem
}

// =====================================================
// TYPES E INTERFACES
// =====================================================

// KPIData importado de dashboard.types.ts

// RealtimeMetrics importado de dashboard.types.ts

// ChartData importado de dashboard.types.ts

// ActivityItem importado de dashboard.types.ts

// AnalyticsFilters importado de dashboard.types.ts

// =====================================================
// HOOK PRINCIPAL - DASHBOARD KPIs
// =====================================================

export function useRealtimeDashboard(filters: AnalyticsFilters = { period: 'today' }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isRealtime, setIsRealtime] = useState(true)

  // Query principal para KPIs
  const {
    data: kpis,
    isLoading: kpisLoading,
    error: kpisError,
    refetch: refetchKPIs
  } = useQuery({
    queryKey: ['dashboard-kpis', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('realtime-analytics-engine', {
        body: {
          action: 'get_dashboard_kpis',
          user_id: user.id,
          period: filters.period,
          filters,
          real_time: isRealtime
        }
      })

      if (error) throw error
      return data.kpis as KPIData
    },
    enabled: !!user?.id,
    refetchInterval: isRealtime ? 30000 : false, // Refetch a cada 30s se realtime ativo
    staleTime: isRealtime ? 25000 : 5 * 60 * 1000 // 25s para realtime, 5min para normal
  })

  // Subscription para updates em tempo real
  useEffect(() => {
    if (!user?.id || !isRealtime) return

    const channel = supabase
      .channel(`dashboard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analytics_events',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 Analytics event received:', payload)
          // Invalidar queries relacionadas
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
          queryClient.invalidateQueries({ queryKey: ['realtime-metrics'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, isRealtime, queryClient])

  return {
    kpis,
    isLoading: kpisLoading,
    error: kpisError,
    refetch: refetchKPIs,
    isRealtime,
    setIsRealtime,
    filters
  }
}

// =====================================================
// HOOK - MÉTRICAS EM TEMPO REAL
// =====================================================

export function useRealtimeMetrics() {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)

  const {
    data: metrics,
    isLoading,
    error
  } = useQuery({
    queryKey: ['realtime-metrics', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('realtime-analytics-engine', {
        body: {
          action: 'get_realtime_metrics',
          user_id: user.id
        }
      })

      if (error) throw error
      setIsConnected(true)
      return data.metrics as RealtimeMetrics
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Atualizar a cada 5 segundos
    retry: 3
  })

  // Tratar erros
  useEffect(() => {
    if (error) {
      setIsConnected(false)
    } else if (metrics) {
      setIsConnected(true)
    }
  }, [error, metrics])

  return {
    metrics,
    isLoading,
    error,
    isConnected
  }
}

// =====================================================
// HOOK - DADOS PARA GRÁFICOS
// =====================================================

export function useChartData(filters: AnalyticsFilters) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['chart-data', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('realtime-analytics-engine', {
        body: {
          action: 'get_chart_data',
          user_id: user.id,
          period: filters.period,
          filters
        }
      })

      if (error) throw error
      return data.chart_data as ChartData
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 60000 // Atualizar a cada minuto
  })
}

// =====================================================
// HOOK - FEED DE ATIVIDADES
// =====================================================

export function useActivityFeed(filters: Partial<AnalyticsFilters> = {}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const {
    data: activities,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['activity-feed', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('realtime-analytics-engine', {
        body: {
          action: 'get_activity_feed',
          user_id: user.id,
          filters
        }
      })

      if (error) throw error
      return data.activities as ActivityItem[]
    },
    enabled: !!user?.id,
    refetchInterval: 10000 // Atualizar a cada 10 segundos
  })

  // Subscription para novas atividades
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`activities-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analytics_events',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Nova atividade:', payload)
          // Adicionar nova atividade ao topo da lista
          queryClient.setQueryData(
            ['activity-feed', user.id, filters],
            (oldData: ActivityItem[] | undefined) => {
              if (!oldData) return []
              
              const newActivity: ActivityItem = {
                id: payload.new.id,
                type: payload.new.event_type,
                description: generateActivityDescription(payload.new),
                timestamp: payload.new.timestamp,
                entity: payload.new.entity_type,
                metadata: payload.new.metadata,
                value: payload.new.value_numeric
              }
              
              return [newActivity, ...oldData.slice(0, 49)] // Manter apenas 50 itens
            }
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient, filters])

  return {
    activities: activities || [],
    isLoading,
    error,
    refetch
  }
}

// =====================================================
// HOOK - LOG DE EVENTOS
// =====================================================

export function useAnalyticsLogger() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const logEvent = useMutation({
    mutationFn: async (eventData: {
      event_type: string
      entity_type?: string
      entity_id?: string
      metadata?: Record<string, any>
      value_numeric?: number
      processing_time_ms?: number
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('realtime-analytics-engine', {
        body: {
          action: 'log_analytics_event',
          user_id: user.id,
          ...eventData
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidar queries relacionadas para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['realtime-metrics'] })
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] })
    }
  })

  // Função helper para log rápido
  const logQuickEvent = useCallback((
    event_type: string, 
    metadata?: Record<string, any>
  ) => {
    logEvent.mutate({ event_type, metadata })
  }, [logEvent])

  return {
    logEvent: logEvent.mutate,
    logQuickEvent,
    isLogging: logEvent.isPending,
    error: logEvent.error
  }
}

// =====================================================
// HOOK - COMPARAÇÕES E ANÁLISES
// =====================================================

export function useComparativeAnalysis(period: string = 'month') {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['comparative-analysis', user?.id, period],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('realtime-analytics-engine', {
        body: {
          action: 'get_comparative_analysis',
          user_id: user.id,
          period
        }
      })

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 2 * 60 * 1000 // Atualizar a cada 2 minutos
  })
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function generateActivityDescription(event: any): string {
  const descriptions: Record<string, string> = {
    'document_upload': 'Documento enviado',
    'document_processed': 'Documento processado',
    'calculation_done': 'Cálculo realizado',
    'company_created': 'Empresa cadastrada',
    'company_updated': 'Empresa atualizada',
    'payment_generated': 'Guia de pagamento gerada',
    'ai_query': 'Consulta ao assistente IA',
    'report_generated': 'Relatório gerado',
    'user_login': 'Login realizado',
    'system_alert': 'Alerta do sistema'
  }
  
  return descriptions[event.event_type] || event.event_type
}

// =====================================================
// HOOK COMBINADO - DASHBOARD COMPLETO
// =====================================================

export function useRealtimeAnalytics(filters: AnalyticsFilters = { period: 'today' }) {
  const dashboard = useRealtimeDashboard(filters)
  const metrics = useRealtimeMetrics()
  const chartData = useChartData(filters)
  const activities = useActivityFeed(filters)
  const logger = useAnalyticsLogger()

  return {
    // Dashboard KPIs
    kpis: dashboard.kpis,
    kpisLoading: dashboard.isLoading,
    kpisError: dashboard.error,
    
    // Métricas em tempo real
    realtimeMetrics: metrics.metrics,
    metricsLoading: metrics.isLoading,
    isConnected: metrics.isConnected,
    
    // Dados para gráficos
    chartData: chartData.data,
    chartLoading: chartData.isLoading,
    
    // Feed de atividades
    activities: activities.activities,
    activitiesLoading: activities.isLoading,
    
    // Logger
    logEvent: logger.logEvent,
    logQuickEvent: logger.logQuickEvent,
    
    // Controles
    isRealtime: dashboard.isRealtime,
    setIsRealtime: dashboard.setIsRealtime,
    filters,
    
    // Refresh manual
    refresh: () => {
      dashboard.refetch()
      chartData.refetch()
      activities.refetch()
    }
  }
}
