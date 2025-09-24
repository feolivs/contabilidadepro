'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { useEffect, useState, useCallback } from 'react'

export function useSupabase() {
  const [supabase] = useState(() => createBrowserSupabaseClient())
  const queryClient = useQueryClient()

  useEffect(() => {

    try {
      // ETAPA 4: Listener com fallback para erros
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {

        if (event === 'SIGNED_OUT') {
          queryClient.clear()
        }
      })

      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      // Fallback: retornar função de cleanup vazia
      return () => {}
    }
  }, [supabase, queryClient])

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
      userId,
      empresaId
    }: {
      question: string;
      context?: string;
      userId?: string;
      empresaId?: string;
    }) => {
      // ✅ VALIDAÇÃO: user_id é obrigatório
      if (!userId) {
        throw new Error('Usuário não identificado')
      }

      const { data, error } = await supabase.functions.invoke('assistente-contabil-ia', {
        body: {
          pergunta: question,
          user_id: userId,
          empresa_id: empresaId, // 🏢 Contexto da empresa
          timestamp: new Date().toISOString()
        },
      })

      if (error) throw error

      if (!data?.success) {
        throw new Error(data?.error || 'Resposta inválida do assistente')
      }

      // 🔧 CORREÇÃO: Extrair resposta do data.data aninhado
      if (data.data && data.data.resposta) {
        return {
          resposta: data.data.resposta,
          cached: data.data.cached,
          timestamp: data.data.timestamp,
          performance: data.data.performance,
          success: true
        }
      }

      // Fallback para formato direto
      return data.data || data
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
