'use client'

import { useMutation } from '@tanstack/react-query'
import { useSupabase } from './use-supabase'
import { AIContextService, type EnhancedAIContext, type ContextualData } from '@/services/ai-context-service'
import { aiCacheService, cacheUtils } from '@/services/ai-cache-service'
import { toast } from 'sonner'

// Tipos para o hook
export interface EnhancedAIQueryInput {
  question: string;
  context?: string;
  enhancedContext?: EnhancedAIContext;
  useCache?: boolean;
}

export interface EnhancedAIQueryResponse {
  success: boolean;
  resposta: string;
  tipo_consulta: string;
  tempo_resposta: number;
  tokens_usados: number;
  modelo: string;
  contexto_usado: ContextualData;
  insights_gerados?: string[];
}

// Usar o serviço de cache inteligente

/**
 * Hook aprimorado para consultas de IA com contexto rico
 */
export function useEnhancedAIQuery() {
  const supabase = useSupabase()

  return useMutation<EnhancedAIQueryResponse, Error, EnhancedAIQueryInput>({
    mutationFn: async ({ 
      question, 
      context = 'assistente-contabil',
      enhancedContext,
      useCache = true
    }) => {
      const startTime = Date.now()

      try {
        // 1. Validar entrada
        if (!question?.trim()) {
          throw new Error('Pergunta é obrigatória')
        }

        if (!enhancedContext?.userId) {
          throw new Error('ID do usuário é obrigatório')
        }

        // 2. Coletar dados contextuais
        let contextualData: ContextualData = {}

        if (enhancedContext) {
          const cacheKey = aiCacheService.generateCacheKey(enhancedContext)

          // Verificar cache inteligente
          if (useCache) {
            const cachedData = aiCacheService.get(cacheKey)
            if (cachedData) {
              contextualData = cachedData
            }
          }

          // Se não tem cache válido, buscar dados
          if (Object.keys(contextualData).length === 0) {

            const contextService = AIContextService.getInstance()
            const result = await contextService.collectContextualData(enhancedContext)

            if (result.success) {
              contextualData = result.data

              // Salvar no cache inteligente
              if (useCache) {
                aiCacheService.set(cacheKey, contextualData)
              }
            } else {
              // Log do erro mas continua com dados vazios
              console.warn('Failed to collect contextual data:', result.error.message)
              contextualData = {}
            }
          }
        }

        // 3. Chamar Edge Function aprimorada

        const { data, error } = await supabase.functions.invoke('assistente-contabil-ia-enhanced', {
          body: {
            pergunta: question,
            contexto: context,
            dados_contextuais: contextualData,
            enhanced_context: enhancedContext,
            timestamp: new Date().toISOString()
          },
        })

        if (error) {
          console.error('Erro detalhado da Edge Function:', error)

          // Verificar se é erro de função não encontrada
          if (error.message.includes('NOT_FOUND') || error.message.includes('Function not found')) {
            throw new Error('Função de IA Enhanced não está disponível. Tentando modo básico...')
          }

          // Verificar se é erro de conectividade
          if (error.message.includes('Failed to send') || error.message.includes('fetch')) {
            throw new Error('Erro de conectividade com o servidor. Verificando alternativas...')
          }

          throw new Error(`Erro na consulta: ${error.message}`)
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Resposta inválida da IA')
        }

        const responseTime = Date.now() - startTime

        // 4. Log de sucesso

        // 5. Mostrar toast de sucesso
        toast.success('Consulta processada com sucesso', {
          description: `Resposta gerada em ${(responseTime / 1000).toFixed(1)}s`
        })

        return {
          success: true,
          resposta: data.resposta,
          tipo_consulta: data.tipo_consulta,
          tempo_resposta: responseTime,
          tokens_usados: data.tokens_usados || 0,
          modelo: data.modelo || 'gpt-4o',
          contexto_usado: contextualData,
          insights_gerados: data.insights_gerados
        }

      } catch (error) {
        const responseTime = Date.now() - startTime
        console.error('Erro na consulta enhanced:', error)

        // Toast de erro inicial
        toast.error('Erro na consulta enhanced', {
          description: error instanceof Error ? error.message : 'Erro desconhecido'
        })

        // Tentar fallback para função original apenas se não for erro de autenticação
        if (error instanceof Error && !error.message.includes('não autenticado')) {
          try {
            console.log('Tentando fallback para função básica...')

            const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke('assistente-contabil-ia', {
              body: {
                pergunta: question,
                contexto: context,
                user_id: enhancedContext?.userId,
                empresa_id: enhancedContext?.empresaId
              },
            })

            if (!fallbackError && fallbackData?.success) {
              toast.success('Consulta processada (modo compatibilidade)', {
                description: 'Sistema básico utilizado como fallback'
              })

              return {
                success: true,
                resposta: fallbackData.resposta,
                tipo_consulta: fallbackData.tipo_consulta || 'consulta_geral',
                tempo_resposta: responseTime,
                tokens_usados: fallbackData.tokens_usados || 0,
                modelo: `${fallbackData.modelo || 'gpt-4o'}-fallback`,
                contexto_usado: {},
                insights_gerados: []
              }
            } else {
              console.error('Fallback também falhou:', fallbackError)

              // Se o fallback também falhar, tentar resposta offline
              if (fallbackError?.message?.includes('NOT_FOUND')) {
                toast.warning('Serviços de IA temporariamente indisponíveis', {
                  description: 'As funções ainda não foram deployadas no servidor'
                })

                return {
                  success: true,
                  resposta: 'Desculpe, os serviços de IA estão temporariamente indisponíveis. As Edge Functions precisam ser deployadas no servidor Supabase. Por favor, execute o deploy das funções ou configure o ambiente local.',
                  tipo_consulta: 'erro_sistema',
                  tempo_resposta: responseTime,
                  tokens_usados: 0,
                  modelo: 'offline-fallback',
                  contexto_usado: {},
                  insights_gerados: ['Configurar Edge Functions no servidor']
                }
              }
            }
          } catch (fallbackError) {
            console.error('Erro no fallback:', fallbackError)
          }
        }

        throw error
      }
    },

    onError: (error) => {

      toast.error('Falha na consulta', {
        description: 'Tente novamente em alguns instantes'
      })
    },

    onSuccess: (data) => {

      // Log de métricas para analytics
      if (typeof window !== 'undefined') {
        // @ts-expect-error - Fallback para função original
        window.gtag?.('event', 'ai_query_success', {
          'custom_tipo_consulta': data.tipo_consulta,
          'custom_tempo_resposta': data.tempo_resposta,
          'custom_tokens_usados': data.tokens_usados
        })
      }
    }
  })
}

/**
 * Hook simplificado para consultas rápidas sem contexto rico
 */
export function useSimpleAIQuery() {
  const enhancedQuery = useEnhancedAIQuery()

  return useMutation<EnhancedAIQueryResponse, Error, { question: string; userId: string }>({
    mutationFn: async ({ question, userId }) => {
      return enhancedQuery.mutateAsync({
        question,
        enhancedContext: {
          userId,
          includeFinancialData: false,
          includeObligations: false,
          includeDocuments: false
        },
        useCache: false
      })
    }
  })
}

/**
 * Hook para consultas específicas de empresa
 */
export function useEmpresaAIQuery() {
  const enhancedQuery = useEnhancedAIQuery()

  return useMutation<EnhancedAIQueryResponse, Error, { 
    question: string; 
    userId: string; 
    empresaId: string;
    includeFullContext?: boolean;
  }>({
    mutationFn: async ({ question, userId, empresaId, includeFullContext = true }) => {
      return enhancedQuery.mutateAsync({
        question,
        enhancedContext: {
          userId,
          empresaId,
          includeFinancialData: includeFullContext,
          includeObligations: includeFullContext,
          includeDocuments: includeFullContext,
          timeRange: 'last_3_months'
        },
        useCache: true
      })
    }
  })
}

/**
 * Utilitários
 */

/**
 * Limpa cache de contexto
 */
export function clearContextCache(): void {
  aiCacheService.clear()
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: aiCacheService.getStats().size,
    keys: aiCacheService.getKeys()
  }
}

/**
 * Hook para estatísticas de uso
 */
export function useAIQueryStats() {
  return {
    clearCache: clearContextCache,
    getCacheStats,
    cacheSize: aiCacheService.getStats().size,
    getDetailedStats: () => cacheUtils.getFormattedStats(),
    invalidateUser: aiCacheService.invalidateUser.bind(aiCacheService),
    invalidateEmpresa: aiCacheService.invalidateEmpresa.bind(aiCacheService)
  }
}
