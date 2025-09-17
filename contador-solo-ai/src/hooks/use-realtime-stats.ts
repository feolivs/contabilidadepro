'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'

export interface RealtimeStats {
  totalCalculos: number
  calculosPendentes: number
  valorTotal: number
  documentosHoje: number
  prazosProximos: number
  isLoading: boolean
  lastUpdate: Date
}

export function useRealtimeStats() {
  const [stats, setStats] = useState<RealtimeStats>({
    totalCalculos: 0,
    calculosPendentes: 0,
    valorTotal: 0,
    documentosHoje: 0,
    prazosProximos: 0,
    isLoading: true,
    lastUpdate: new Date()
  })

  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()

  const fetchStats = async () => {
    if (!user) return

    try {
      const [
        { count: totalCalculos },
        { count: calculosPendentes },
        { data: valorData },
        { count: documentosHoje },
        { count: prazosProximos }
      ] = await Promise.all([
        // Total de cálculos
        supabase
          .from('calculos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),

        // Cálculos pendentes
        supabase
          .from('calculos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'pendente'),

        // Valor total processado
        supabase
          .from('calculos')
          .select('valor')
          .eq('user_id', user.id)
          .eq('status', 'concluido'),

        // Documentos processados hoje
        supabase
          .from('documentos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', new Date().toISOString().split('T')[0]),

        // Prazos nos próximos 7 dias
        supabase
          .from('prazos_fiscais')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('data_vencimento', new Date().toISOString().split('T')[0])
          .lte('data_vencimento', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ])

      const valorTotal = valorData?.reduce((acc, item) => acc + (item.valor || 0), 0) || 0

      setStats({
        totalCalculos: totalCalculos || 0,
        calculosPendentes: calculosPendentes || 0,
        valorTotal,
        documentosHoje: documentosHoje || 0,
        prazosProximos: prazosProximos || 0,
        isLoading: false,
        lastUpdate: new Date()
      })
    } catch (error) {
      console.error('Erro ao buscar stats:', error)
      setStats(prev => ({ ...prev, isLoading: false }))
    }
  }

  useEffect(() => {
    if (!user) return

    // Buscar dados iniciais
    fetchStats()

    // Subscription para cálculos
    const calculosSubscription = supabase
      .channel('calculos_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calculos',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('📊 Stats atualizadas - cálculos')
          fetchStats()
        }
      )
      .subscribe()

    // Subscription para documentos
    const documentosSubscription = supabase
      .channel('documentos_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('📊 Stats atualizadas - documentos')
          fetchStats()
        }
      )
      .subscribe()

    // Subscription para prazos fiscais
    const prazosSubscription = supabase
      .channel('prazos_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prazos_fiscais',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('📊 Stats atualizadas - prazos')
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      calculosSubscription.unsubscribe()
      documentosSubscription.unsubscribe()
      prazosSubscription.unsubscribe()
    }
  }, [user])

  return { stats, refresh: fetchStats }
}