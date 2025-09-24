/**
 * Hook Otimizado para Dados de Navegação - ContabilidadePRO
 * Substitui dados mockados por dados reais com cache inteligente
 */

'use client'

import { useMemo, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { useSupabase } from '@/hooks/use-supabase'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface NavigationStats {
  totalClientes: number
  documentosPendentes: number
  calculosPendentes: number
  prazosPendentes: number
  alertasCriticos: number
}

export interface NavigationAlerts {
  aiInsights: number
  compliance: number
  documentosProcessamento: number
  prazosVencendo: number
}

export interface NavigationData {
  stats: NavigationStats
  alerts: NavigationAlerts
  permissions: string[]
  lastUpdated: string
}

export interface UseNavigationDataOptions {
  enabled?: boolean
  staleTime?: number
  refetchInterval?: number
}

// =====================================================
// SERVIÇO DE DADOS DE NAVEGAÇÃO
// =====================================================

class NavigationDataService {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  async fetchNavigationStats(userId: string): Promise<NavigationStats> {
    try {
      // Buscar estatísticas em paralelo para melhor performance
      const [clientesResult, documentosResult, calculosResult, prazosResult] = await Promise.all([
        this.supabase
          .from('empresas')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        
        this.supabase
          .from('documentos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('status', ['pendente', 'processando']),
        
        this.supabase
          .from('calculos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'rascunho'),
        
        this.supabase
          .from('prazos_fiscais')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('data_vencimento', new Date().toISOString())
          .lte('data_vencimento', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      ])

      return {
        totalClientes: clientesResult.count || 0,
        documentosPendentes: documentosResult.count || 0,
        calculosPendentes: calculosResult.count || 0,
        prazosPendentes: prazosResult.count || 0,
        alertasCriticos: (documentosResult.count || 0) + (prazosResult.count || 0)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas de navegação:', error)
      
      // Retornar dados padrão em caso de erro
      return {
        totalClientes: 0,
        documentosPendentes: 0,
        calculosPendentes: 0,
        prazosPendentes: 0,
        alertasCriticos: 0
      }
    }
  }

  async fetchNavigationAlerts(userId: string): Promise<NavigationAlerts> {
    try {
      // Buscar alertas específicos
      const [aiInsightsResult, complianceResult, processingResult] = await Promise.all([
        this.supabase
          .from('ai_insights')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'novo'),
        
        this.supabase
          .from('compliance_alerts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'ativo'),
        
        this.supabase
          .from('documentos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'processando')
      ])

      const prazosVencendo = await this.supabase
        .from('prazos_fiscais')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('data_vencimento', new Date().toISOString())
        .lte('data_vencimento', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())

      return {
        aiInsights: aiInsightsResult.count || 0,
        compliance: complianceResult.count || 0,
        documentosProcessamento: processingResult.count || 0,
        prazosVencendo: prazosVencendo.count || 0
      }
    } catch (error) {
      console.error('Erro ao buscar alertas de navegação:', error)
      
      return {
        aiInsights: 0,
        compliance: 0,
        documentosProcessamento: 0,
        prazosVencendo: 0
      }
    }
  }

  async fetchUserPermissions(userId: string): Promise<string[]> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('role, permissions')
        .eq('id', userId)
        .single()

      if (!profile) return []

      // Combinar permissões do role com permissões específicas
      const rolePermissions = this.getRolePermissions(profile.role)
      const customPermissions = profile.permissions || []

      return [...new Set([...rolePermissions, ...customPermissions])]
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
      return ['read:dashboard'] // Permissão mínima
    }
  }

  private getRolePermissions(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'contador': [
        'read:dashboard',
        'read:clientes',
        'write:clientes',
        'read:documentos',
        'write:documentos',
        'read:calculos',
        'write:calculos',
        'read:relatorios',
        'export:relatorios',
        'read:prazos',
        'read:assistente'
      ],
      'assistente': [
        'read:dashboard',
        'read:clientes',
        'read:documentos',
        'read:calculos',
        'read:relatorios',
        'read:prazos'
      ],
      'admin': [
        'read:dashboard',
        'read:clientes',
        'write:clientes',
        'delete:clientes',
        'read:documentos',
        'write:documentos',
        'delete:documentos',
        'read:calculos',
        'write:calculos',
        'approve:calculos',
        'read:relatorios',
        'export:relatorios',
        'read:prazos',
        'write:prazos',
        'read:assistente',
        'admin:users',
        'admin:system'
      ]
    }

    return rolePermissions[role] || ['read:dashboard']
  }

  async fetchNavigationData(userId: string): Promise<NavigationData> {
    const [stats, alerts, permissions] = await Promise.all([
      this.fetchNavigationStats(userId),
      this.fetchNavigationAlerts(userId),
      this.fetchUserPermissions(userId)
    ])

    return {
      stats,
      alerts,
      permissions,
      lastUpdated: new Date().toISOString()
    }
  }
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export const useNavigationData = (options: UseNavigationDataOptions = {}) => {
  const { user } = useAuthStore()
  const supabase = useSupabase()
  const queryClient = useQueryClient()

  const {
    enabled = true,
    staleTime = 2 * 60 * 1000, // 2 minutos
    refetchInterval = 5 * 60 * 1000 // 5 minutos
  } = options

  // Instância do serviço memoizada
  const navigationService = useMemo(() => 
    new NavigationDataService(supabase), 
    [supabase]
  )

  // Query principal com cache otimizado
  const query = useQuery({
    queryKey: ['navigation-data', user?.id],
    queryFn: () => navigationService.fetchNavigationData(user!.id),
    enabled: enabled && !!user?.id,
    staleTime,
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Função para invalidar cache
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['navigation-data', user?.id]
    })
  }, [queryClient, user?.id])

  // Função para atualizar dados específicos
  const updateNavigationData = useCallback((
    updater: (oldData: NavigationData | undefined) => NavigationData | undefined
  ) => {
    queryClient.setQueryData(['navigation-data', user?.id], updater)
  }, [queryClient, user?.id])

  // Função para prefetch (útil para precarregar dados)
  const prefetchNavigationData = useCallback(() => {
    if (user?.id) {
      queryClient.prefetchQuery({
        queryKey: ['navigation-data', user.id],
        queryFn: () => navigationService.fetchNavigationData(user.id),
        staleTime
      })
    }
  }, [queryClient, navigationService, user?.id, staleTime])

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isStale: query.isStale,
    isFetching: query.isFetching,
    lastUpdated: query.data?.lastUpdated,
    
    // Funções utilitárias
    invalidateCache,
    updateNavigationData,
    prefetchNavigationData,
    
    // Dados específicos para facilitar uso
    stats: query.data?.stats,
    alerts: query.data?.alerts,
    permissions: query.data?.permissions || []
  }
}

// =====================================================
// HOOKS AUXILIARES
// =====================================================

/**
 * Hook para verificar permissões específicas
 */
export const useNavigationPermissions = () => {
  const { permissions } = useNavigationData()

  const hasPermission = useCallback((permission: string): boolean => {
    return permissions.includes(permission)
  }, [permissions])

  const hasAnyPermission = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission))
  }, [permissions])

  const hasAllPermissions = useCallback((requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission))
  }, [permissions])

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  }
}

/**
 * Hook para estatísticas específicas
 */
export const useNavigationStats = () => {
  const { stats, isLoading, error } = useNavigationData()

  const getTotalPendentes = useCallback((): number => {
    if (!stats) return 0
    return stats.documentosPendentes + stats.calculosPendentes + stats.prazosPendentes
  }, [stats])

  const hasAlerts = useCallback((): boolean => {
    if (!stats) return false
    return stats.alertasCriticos > 0
  }, [stats])

  return {
    stats,
    isLoading,
    error,
    getTotalPendentes,
    hasAlerts
  }
}
