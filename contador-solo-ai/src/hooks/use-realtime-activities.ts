'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'

export interface RealtimeActivity {
  id: string
  type: 'calculation' | 'document' | 'deadline' | 'system' | 'user'
  title: string
  description: string
  timestamp: Date
  status: 'completed' | 'processing' | 'failed' | 'pending'
  entityId?: string
  entityType?: string
  metadata?: Record<string, any>
  userId: string
}

export interface ActivityStats {
  total: number
  today: number
  thisWeek: number
  processing: number
  failed: number
}

export function useRealtimeActivities() {
  const [activities, setActivities] = useState<RealtimeActivity[]>([])
  const [stats, setStats] = useState<ActivityStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    processing: 0,
    failed: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()

  const addActivity = (activity: Omit<RealtimeActivity, 'id' | 'timestamp' | 'userId'>) => {
    if (!user) return

    const newActivity: RealtimeActivity = {
      ...activity,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      userId: user.id
    }

    setActivities(prev => [newActivity, ...prev.slice(0, 49)]) // Manter apenas 50 atividades
    updateStats()
  }

  const updateActivity = (id: string, updates: Partial<RealtimeActivity>) => {
    setActivities(prev =>
      prev.map(activity =>
        activity.id === id ? { ...activity, ...updates } : activity
      )
    )
    updateStats()
  }

  const updateStats = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    setStats({
      total: activities.length,
      today: activities.filter(a => a.timestamp >= today).length,
      thisWeek: activities.filter(a => a.timestamp >= thisWeek).length,
      processing: activities.filter(a => a.status === 'processing').length,
      failed: activities.filter(a => a.status === 'failed').length
    })
  }

  const fetchRecentActivities = async () => {
    if (!user) return

    try {
      // Buscar atividades recentes de diferentes fontes
      const [calculosResult, documentosResult, prazosResult] = await Promise.all([
        // Cálculos recentes
        supabase
          .from('calculos')
          .select('id, tipo, status, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),

        // Documentos recentes
        supabase
          .from('documentos')
          .select('id, nome, status, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),

        // Prazos recentes
        supabase
          .from('prazos_fiscais')
          .select('id, descricao, data_vencimento, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      const recentActivities: RealtimeActivity[] = []

      // Processar cálculos
      if (calculosResult.data) {
        calculosResult.data.forEach(calculo => {
          recentActivities.push({
            id: `calc-${calculo.id}`,
            type: 'calculation',
            title: `Cálculo ${calculo.tipo}`,
            description: `Status: ${calculo.status}`,
            timestamp: new Date(calculo.updated_at || calculo.created_at),
            status: calculo.status === 'concluido' ? 'completed' :
                   calculo.status === 'erro' ? 'failed' : 'processing',
            entityId: calculo.id,
            entityType: 'calculo',
            userId: user.id
          })
        })
      }

      // Processar documentos
      if (documentosResult.data) {
        documentosResult.data.forEach(documento => {
          recentActivities.push({
            id: `doc-${documento.id}`,
            type: 'document',
            title: `Documento: ${documento.nome}`,
            description: `Status: ${documento.status}`,
            timestamp: new Date(documento.updated_at || documento.created_at),
            status: documento.status === 'processado' ? 'completed' :
                   documento.status === 'erro' ? 'failed' : 'processing',
            entityId: documento.id,
            entityType: 'documento',
            userId: user.id
          })
        })
      }

      // Processar prazos
      if (prazosResult.data) {
        prazosResult.data.forEach(prazo => {
          const diasRestantes = Math.ceil(
            (new Date(prazo.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )

          recentActivities.push({
            id: `prazo-${prazo.id}`,
            type: 'deadline',
            title: `Prazo: ${prazo.descricao}`,
            description: diasRestantes > 0 ?
              `Vence em ${diasRestantes} dias` :
              `Vencido há ${Math.abs(diasRestantes)} dias`,
            timestamp: new Date(prazo.created_at),
            status: diasRestantes > 7 ? 'pending' :
                   diasRestantes > 0 ? 'processing' : 'failed',
            entityId: prazo.id,
            entityType: 'prazo',
            userId: user.id
          })
        })
      }

      // Ordenar por timestamp e limitar
      recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setActivities(recentActivities.slice(0, 50))

    } catch (error) {
      console.error('Erro ao buscar atividades:', error)
    }
  }

  useEffect(() => {
    if (!user) return

    setIsLoading(true)
    fetchRecentActivities().finally(() => setIsLoading(false))

    // Subscriptions para atualizações em tempo real
    const calculosSubscription = supabase
      .channel('activities_calculos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'calculos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Nova atividade - cálculo criado:', payload)
          addActivity({
            type: 'calculation',
            title: `Novo Cálculo ${payload.new.tipo}`,
            description: 'Cálculo criado e aguardando processamento',
            status: 'processing',
            entityId: payload.new.id,
            entityType: 'calculo'
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
          console.log('🔄 Atividade atualizada - cálculo:', payload)
          const activityId = `calc-${payload.new.id}`
          const existingActivity = activities.find(a => a.id === activityId)

          if (existingActivity) {
            updateActivity(activityId, {
              status: payload.new.status === 'concluido' ? 'completed' :
                     payload.new.status === 'erro' ? 'failed' : 'processing',
              description: `Status: ${payload.new.status}`,
              timestamp: new Date()
            })
          } else {
            addActivity({
              type: 'calculation',
              title: `Cálculo ${payload.new.tipo} Atualizado`,
              description: `Status: ${payload.new.status}`,
              status: payload.new.status === 'concluido' ? 'completed' :
                     payload.new.status === 'erro' ? 'failed' : 'processing',
              entityId: payload.new.id,
              entityType: 'calculo'
            })
          }
        }
      )
      .subscribe()

    const documentosSubscription = supabase
      .channel('activities_documentos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documentos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Nova atividade - documento enviado:', payload)
          addActivity({
            type: 'document',
            title: `Documento Enviado`,
            description: `${payload.new.nome} foi adicionado para processamento`,
            status: 'processing',
            entityId: payload.new.id,
            entityType: 'documento'
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
          console.log('🔄 Atividade atualizada - documento:', payload)
          const activityId = `doc-${payload.new.id}`
          const existingActivity = activities.find(a => a.id === activityId)

          if (existingActivity) {
            updateActivity(activityId, {
              status: payload.new.status === 'processado' ? 'completed' :
                     payload.new.status === 'erro' ? 'failed' : 'processing',
              description: `${payload.new.nome} - Status: ${payload.new.status}`,
              timestamp: new Date()
            })
          } else {
            addActivity({
              type: 'document',
              title: `Documento Processado`,
              description: `${payload.new.nome} - Status: ${payload.new.status}`,
              status: payload.new.status === 'processado' ? 'completed' :
                     payload.new.status === 'erro' ? 'failed' : 'processing',
              entityId: payload.new.id,
              entityType: 'documento'
            })
          }
        }
      )
      .subscribe()

    const prazosSubscription = supabase
      .channel('activities_prazos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'prazos_fiscais',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Nova atividade - prazo cadastrado:', payload)
          const diasRestantes = Math.ceil(
            (new Date(payload.new.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )

          addActivity({
            type: 'deadline',
            title: `Novo Prazo Fiscal`,
            description: `${payload.new.descricao} - Vence em ${diasRestantes} dias`,
            status: diasRestantes > 7 ? 'pending' : 'processing',
            entityId: payload.new.id,
            entityType: 'prazo'
          })
        }
      )
      .subscribe()

    return () => {
      calculosSubscription.unsubscribe()
      documentosSubscription.unsubscribe()
      prazosSubscription.unsubscribe()
    }
  }, [user])

  useEffect(() => {
    updateStats()
  }, [activities])

  return {
    activities,
    stats,
    isLoading,
    addActivity,
    updateActivity,
    refresh: fetchRecentActivities
  }
}