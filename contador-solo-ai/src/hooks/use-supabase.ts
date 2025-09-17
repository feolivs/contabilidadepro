'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { useEffect, useState } from 'react'

export function useSupabase() {
  const [supabase] = useState(() => createBrowserSupabaseClient())
  const { setUser, setLoading } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_OUT') {
        queryClient.clear()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, setUser, setLoading, queryClient])

  return supabase
}

// Hook para dashboard
export function useDashboard(userId: string, startDate: string, endDate: string) {
  const supabase = useSupabase()

  return useQuery({
    queryKey: ['dashboard', userId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-dashboard-complete', {
        body: {
          p_user_id: userId,
          p_start_date: startDate,
          p_end_date: endDate,
        },
      })

      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// Hook para consulta IA
export function useAIQuery() {
  const supabase = useSupabase()

  return useMutation({
    mutationFn: async ({ question, context }: { question: string; context?: string }) => {
      const { data, error } = await supabase.functions.invoke('assistente-contabil-ia', {
        body: {
          pergunta: question,
          contexto: context || 'contador-solo',
        },
      })

      if (error) throw error
      return data
    },
  })
}

// Hook para assistente contábil IA (GPT-4o)
export function useAssistenteContabilIA() {
  const supabase = useSupabase()

  return useMutation({
    mutationFn: async ({
      question,
      context,
      empresaId,
      userId
    }: {
      question: string;
      context?: string;
      empresaId?: string;
      userId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('assistente-contabil-ia', {
        body: {
          pergunta: question,
          contexto: context || 'assistente-contabil',
          empresa_id: empresaId,
          user_id: userId,
        },
      })

      if (error) throw error
      return data
    },
  })
}

// Hook para assistente contábil IA Enhanced (com contexto rico)
export function useAssistenteContabilIAEnhanced() {
  const supabase = useSupabase()

  return useMutation({
    mutationFn: async ({
      question,
      context,
      empresaId,
      userId,
      dadosContextuais
    }: {
      question: string;
      context?: string;
      empresaId?: string;
      userId?: string;
      dadosContextuais?: any;
    }) => {
      const { data, error } = await supabase.functions.invoke('assistente-contabil-ia-enhanced', {
        body: {
          pergunta: question,
          contexto: context || 'assistente-contabil',
          dados_contextuais: dadosContextuais,
          enhanced_context: {
            userId,
            empresaId,
            includeFinancialData: true,
            includeObligations: true,
            includeDocuments: true,
            timeRange: 'last_3_months'
          },
          timestamp: new Date().toISOString()
        },
      })

      if (error) throw error
      return data
    },
  })
}

// Hook para processamento de documentos
export function useDocumentProcessor() {
  const supabase = useSupabase()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)

      const { data, error } = await supabase.functions.invoke('process-document', {
        body: formData,
      })

      if (error) throw error
      return data
    },
  })
}
