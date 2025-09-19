'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { useEffect, useState, useCallback } from 'react'

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

// Hook para consulta IA (CORRIGIDO)
export function useAIQuery() {
  const supabase = useSupabase()

  return useMutation({
    mutationFn: async ({
      question,
      context,
      userId
    }: {
      question: string;
      context?: string;
      userId?: string;
    }) => {
      // ✅ VALIDAÇÃO: user_id é obrigatório
      if (!userId) {
        throw new Error('Usuário não identificado')
      }

      const { data, error } = await supabase.functions.invoke('assistente-contabil-ia', {
        body: {
          pergunta: question,
          user_id: userId,
          timestamp: new Date().toISOString()
        },
      })

      if (error) throw error

      if (!data?.success) {
        throw new Error(data?.error || 'Resposta inválida do assistente')
      }

      return data
    },
  })
}

// Hook para assistente contábil IA (GPT-4o) - SEGURO
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
      // ✅ VALIDAÇÃO NO FRONTEND
      if (!question?.trim()) {
        throw new Error('Pergunta é obrigatória')
      }

      if (!userId) {
        throw new Error('Usuário não identificado')
      }

      // 🔒 CHAMADA SEGURA PARA EDGE FUNCTION
      const { data, error } = await supabase.functions.invoke('assistente-contabil-ia', {
        body: {
          pergunta: question.trim(),
          empresa_id: empresaId,
          user_id: userId,
          conversationHistory: [], // Pode ser expandido futuramente
          timestamp: new Date().toISOString()
        },
      })

      if (error) {
        console.error('Erro na chamada do assistente IA:', error)
        throw new Error(error.message || 'Erro ao processar pergunta')
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Resposta inválida do assistente')
      }

      return data
    },
    onError: (error) => {
      console.error('Erro no assistente contábil:', error)
    },
    onSuccess: (data) => {
      console.log('✅ Resposta do assistente recebida:', {
        hasResponse: !!data?.resposta,
        tokens: data?.usage?.total_tokens || 0
      })
    }
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

/**
 * 🌊 Hook para Streaming do Assistente Contábil IA
 * Usa Server-Sent Events para respostas em tempo real
 */
export const useAssistenteContabilIAStreaming = () => {
  const { user } = useAuthStore()
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedResponse, setStreamedResponse] = useState('')
  const [isCached, setIsCached] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const streamQuery = useCallback(async (pergunta: string, onChunk?: (chunk: string) => void) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado')
    }

    setIsStreaming(true)
    setStreamedResponse('')
    setIsCached(false)
    setError(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/assistente-contabil-ia`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({
            pergunta,
            user_id: user.id
          })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'start') {
                setIsCached(data.cached)
              } else if (data.type === 'chunk') {
                fullResponse += data.content
                setStreamedResponse(fullResponse)
                onChunk?.(data.content)
              } else if (data.type === 'done') {
                setIsStreaming(false)
              } else if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch (e) {
              console.warn('Erro ao parsear chunk SSE:', e)
            }
          }
        }
      }

      return fullResponse
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      setIsStreaming(false)
      throw err
    }
  }, [user?.id])

  return {
    streamQuery,
    isStreaming,
    streamedResponse,
    isCached,
    error,
    reset: () => {
      setStreamedResponse('')
      setError(null)
      setIsCached(false)
      setIsStreaming(false)
    }
  }
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
