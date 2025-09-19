'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// Tipos
export type FeedbackType = 
  | 'AI_RESPONSE'
  | 'DOCUMENT_PROCESSING'
  | 'ALERT_SYSTEM'
  | 'GENERAL_SYSTEM'
  | 'FEATURE_REQUEST'
  | 'BUG_REPORT'
  | 'PERFORMANCE'
  | 'UI_UX'

export type SatisfactionRating = 
  | 'VERY_DISSATISFIED'
  | 'DISSATISFIED'
  | 'NEUTRAL'
  | 'SATISFIED'
  | 'VERY_SATISFIED'

export type FeedbackStatus = 'PENDING' | 'REVIEWED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED'

export interface UserFeedback {
  id: string
  user_id: string
  feedback_type: FeedbackType
  rating: SatisfactionRating
  title?: string
  description?: string
  context_data: any
  status: FeedbackStatus
  created_at: string
  updated_at: string
  tags: string[]
}

export interface SatisfactionMetrics {
  feedback_type: FeedbackType
  total_interactions: number
  total_feedback: number
  average_rating: number
  satisfaction_score: number
  feedback_rate: number
}

export interface UserInteraction {
  id: string
  user_id: string
  interaction_type: FeedbackType
  context_data: any
  response_time_ms?: number
  success: boolean
  error_message?: string
  created_at: string
  session_id?: string
  page_url?: string
}

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  AI_RESPONSE: 'Resposta da IA',
  DOCUMENT_PROCESSING: 'Processamento de Documentos',
  ALERT_SYSTEM: 'Sistema de Alertas',
  GENERAL_SYSTEM: 'Sistema Geral',
  FEATURE_REQUEST: 'Solicitação de Funcionalidade',
  BUG_REPORT: 'Relatório de Bug',
  PERFORMANCE: 'Performance',
  UI_UX: 'Interface/Experiência'
}

const RATING_LABELS: Record<SatisfactionRating, string> = {
  VERY_DISSATISFIED: 'Muito Insatisfeito',
  DISSATISFIED: 'Insatisfeito',
  NEUTRAL: 'Neutro',
  SATISFIED: 'Satisfeito',
  VERY_SATISFIED: 'Muito Satisfeito'
}

const RATING_VALUES: Record<SatisfactionRating, number> = {
  VERY_DISSATISFIED: 1,
  DISSATISFIED: 2,
  NEUTRAL: 3,
  SATISFIED: 4,
  VERY_SATISFIED: 5
}

/**
 * 📊 Hook para gerenciamento de feedback e satisfação do usuário
 */
export const useUserFeedback = () => {
  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()
  const queryClient = useQueryClient()

  // Mutation para enviar feedback
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({
      feedbackType,
      rating,
      title,
      description,
      contextData = {},
      tags = []
    }: {
      feedbackType: FeedbackType
      rating: SatisfactionRating
      title?: string
      description?: string
      contextData?: any
      tags?: string[]
    }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          feedback_type: feedbackType,
          rating,
          title,
          description,
          context_data: contextData,
          tags,
          user_agent: navigator.userAgent,
          page_url: window.location.href,
          session_id: sessionStorage.getItem('session_id') || `session-${Date.now()}`
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Erro ao enviar feedback: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-feedback'] })
      queryClient.invalidateQueries({ queryKey: ['satisfaction-stats'] })
    }
  })

  // Mutation para registrar interação
  const logInteractionMutation = useMutation({
    mutationFn: async ({
      interactionType,
      contextData = {},
      responseTimeMs,
      success = true,
      errorMessage
    }: {
      interactionType: FeedbackType
      contextData?: any
      responseTimeMs?: number
      success?: boolean
      errorMessage?: string
    }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase.rpc('log_user_interaction', {
        p_user_id: user.id,
        p_interaction_type: interactionType,
        p_context_data: contextData,
        p_response_time_ms: responseTimeMs,
        p_success: success,
        p_error_message: errorMessage,
        p_session_id: sessionStorage.getItem('session_id') || `session-${Date.now()}`,
        p_page_url: window.location.href
      })

      if (error) {
        throw new Error(`Erro ao registrar interação: ${error.message}`)
      }

      return data
    }
  })

  // Query para buscar feedback do usuário
  const useUserFeedbackHistory = (limit: number = 50) => {
    return useQuery({
      queryKey: ['user-feedback', user?.id, limit],
      queryFn: async () => {
        if (!user?.id) return []

        const { data, error } = await supabase
          .from('user_feedback')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) {
          throw new Error(`Erro ao buscar feedback: ${error.message}`)
        }

        return data as UserFeedback[]
      },
      enabled: !!user?.id
    })
  }

  // Query para estatísticas de satisfação
  const useSatisfactionStats = (
    startDate?: string,
    endDate?: string,
    feedbackType?: FeedbackType
  ) => {
    return useQuery({
      queryKey: ['satisfaction-stats', user?.id, startDate, endDate, feedbackType],
      queryFn: async () => {
        if (!user?.id) return []

        const { data, error } = await supabase.rpc('get_satisfaction_stats', {
          p_user_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_feedback_type: feedbackType
        })

        if (error) {
          throw new Error(`Erro ao buscar estatísticas: ${error.message}`)
        }

        return data as SatisfactionMetrics[]
      },
      enabled: !!user?.id
    })
  }

  // Função para feedback rápido (apenas rating)
  const quickFeedback = useCallback(async (
    feedbackType: FeedbackType,
    rating: SatisfactionRating,
    contextData?: any
  ) => {
    return submitFeedbackMutation.mutateAsync({
      feedbackType,
      rating,
      contextData
    })
  }, [submitFeedbackMutation])

  // Função para registrar interação com timing automático
  const logInteractionWithTiming = useCallback(async (
    interactionType: FeedbackType,
    startTime: number,
    contextData?: any,
    success: boolean = true,
    errorMessage?: string
  ) => {
    const responseTime = Date.now() - startTime
    
    return logInteractionMutation.mutateAsync({
      interactionType,
      contextData,
      responseTimeMs: responseTime,
      success,
      errorMessage
    })
  }, [logInteractionMutation])

  // Função para obter estatísticas resumidas
  const getSummaryStats = useCallback(async (days: number = 30) => {
    if (!user?.id) return null

    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const { data, error } = await supabase.rpc('get_satisfaction_stats', {
      p_user_id: user.id,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`)
    }

    // Calcular estatísticas gerais
    const totalInteractions = data.reduce((sum: number, item: any) => sum + item.total_interactions, 0)
    const totalFeedback = data.reduce((sum: number, item: any) => sum + item.total_feedback, 0)
    const avgRating = data.length > 0 
      ? data.reduce((sum: number, item: any) => sum + item.average_rating, 0) / data.length
      : 0
    const avgSatisfactionScore = data.length > 0
      ? data.reduce((sum: number, item: any) => sum + item.satisfaction_score, 0) / data.length
      : 0

    return {
      totalInteractions,
      totalFeedback,
      averageRating: Math.round(avgRating * 100) / 100,
      satisfactionScore: Math.round(avgSatisfactionScore * 100) / 100,
      feedbackRate: totalInteractions > 0 ? (totalFeedback / totalInteractions) * 100 : 0,
      byType: data
    }
  }, [user?.id, supabase])

  return {
    // Mutations
    submitFeedback: submitFeedbackMutation.mutateAsync,
    logInteraction: logInteractionMutation.mutateAsync,
    quickFeedback,
    logInteractionWithTiming,
    
    // Queries
    useUserFeedbackHistory,
    useSatisfactionStats,
    
    // Functions
    getSummaryStats,
    
    // Utils
    FEEDBACK_TYPE_LABELS,
    RATING_LABELS,
    RATING_VALUES,
    
    // Loading states
    isSubmittingFeedback: submitFeedbackMutation.isPending,
    isLoggingInteraction: logInteractionMutation.isPending,
    
    // Mutation objects
    submitFeedbackMutation,
    logInteractionMutation
  }
}
