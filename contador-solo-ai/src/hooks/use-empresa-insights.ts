import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { useCachedQuery } from './use-cached-query'
import { CACHE_STRATEGIES } from '@/lib/cache/cache-manager'

/**
 * Interface para insights da empresa - ATUALIZADA PARA EDGE FUNCTIONS
 */
export interface EmpresaInsights {
  // Informações básicas
  empresa: {
    id: string
    nome: string
    cnpj: string
    regime_tributario: string
    atividade_principal: string
    created_at: string
  }

  // Resumo financeiro
  financial_summary: {
    faturamento_total: number
    faturamento_mes_atual: number
    faturamento_mes_anterior: number
    crescimento_mensal: number
    ticket_medio: number
    maior_documento: number
    documentos_por_mes: Array<{
      mes: string
      quantidade: number
      valor_total: number
    }>
  }

  // Resumo de documentos
  documents_summary: {
    total: number
    processados: number
    pendentes: number
    com_erro: number
    taxa_sucesso: number
    ultimo_processamento: string | null
    tipos_mais_comuns: Array<{
      tipo: string
      quantidade: number
      percentual: number
    }>
  }

  // Resumo de obrigações
  obligations_summary: {
    proximas: Array<{
      tipo: string
      vencimento: string
      dias_restantes: number
      status: 'ok' | 'atencao' | 'vencido'
    }>
    vencidas: number
    em_dia: number
  }

  // Insights de IA (NOVO)
  insights_summary?: {
    resumo_executivo: {
      pontos_principais: string[]
      recomendacoes_prioritarias: string[]
      score_geral: number
    }
    analise_financeira: {
      tendencia: 'positiva' | 'neutra' | 'negativa'
      pontos_atencao: string[]
      oportunidades: string[]
    }
    alertas_prioritarios: Array<{
      tipo: 'critico' | 'importante' | 'informativo'
      mensagem: string
      acao_recomendada: string
    }>
  }

  // Análise de compliance (NOVO)
  compliance_summary?: {
    score_geral: number
    nivel: 'critico' | 'baixo' | 'medio' | 'alto' | 'excelente'
    consistencia_dados: {
      score: number
      inconsistencias: string[]
    }
    prazos_fiscais: {
      das_proximo_vencimento: string
      dias_para_das: number
      alertas_prazo: string[]
    }
    riscos_identificados: string[]
    alertas_urgentes: string[]
  }

  // Métricas financeiras avançadas (NOVO)
  metrics_summary?: {
    metricas_mensais: Array<{
      mes: string
      receita_total: number
      despesa_total: number
      quantidade_documentos: number
      confianca_media: number
    }>
    projecoes: {
      proximo_mes: number
      proximo_trimestre: number
      anual: number
      tendencia: 'crescimento' | 'declinio' | 'estavel'
    }
    indicadores_performance: {
      ticket_medio: number
      frequencia_documentos: number
      crescimento_percentual: number
      eficiencia_processamento: number
    }
  }

  // Recomendações
  recommendations: string[]

  // Metadados
  cached: boolean
  generated_at: string
}

/**
 * Hook para buscar insights completos de uma empresa - USANDO EDGE FUNCTIONS
 */
export function useEmpresaInsights(empresaId: string, options?: {
  enabled?: boolean
  refetchInterval?: number
  staleTime?: number
  include_insights?: boolean
  include_compliance?: boolean
  include_metrics?: boolean
  insight_type?: 'financeiro' | 'compliance' | 'operacional' | 'estrategico' | 'completo'
  force_refresh?: boolean
}) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [
      'empresa-insights',
      empresaId,
      options?.include_insights,
      options?.include_compliance,
      options?.include_metrics,
      options?.insight_type,
      options?.force_refresh
    ],
    queryFn: async (): Promise<EmpresaInsights> => {
      if (!user) throw new Error('Usuário não autenticado')
      if (!empresaId) throw new Error('ID da empresa é obrigatório')

      console.log(`[useEmpresaInsights] Buscando insights para empresa ${empresaId}`)

      // Chamar Edge Function empresa-context-service estendida
      const { data, error } = await supabase.functions.invoke('empresa-context-service', {
        body: {
          empresa_id: empresaId,
          user_id: user.id,
          include_insights: options?.include_insights ?? true,
          include_compliance: options?.include_compliance ?? true,
          include_metrics: options?.include_metrics ?? true,
          insight_type: options?.insight_type ?? 'completo',
          force_refresh: options?.force_refresh ?? false,
          periodo_meses: 6
        }
      })

      if (error) {
        console.error('[useEmpresaInsights] Erro na Edge Function:', error)
        throw new Error(`Erro ao buscar insights: ${error.message}`)
      }

      if (!data?.success) {
        console.error('[useEmpresaInsights] Edge Function retornou erro:', data?.error)
        throw new Error(data?.error || 'Erro desconhecido ao buscar insights')
      }

      console.log(`[useEmpresaInsights] Insights obtidos com sucesso (cached: ${data.cached})`)

      // Transformar resposta da Edge Function para interface do hook
      const result: EmpresaInsights = {
        empresa: data.empresa,
        financial_summary: data.financial_summary,
        documents_summary: data.documents_summary,
        obligations_summary: data.obligations_summary,
        insights_summary: data.insights_summary,
        compliance_summary: data.compliance_summary,
        metrics_summary: data.metrics_summary,
        recommendations: data.recommendations || [],
        cached: data.cached,
        generated_at: data.generated_at
      }

      return result
    },
    enabled: !!user && !!empresaId && (options?.enabled !== false),
    staleTime: options?.staleTime || 3 * 60 * 1000, // 3 minutos (Edge Function tem cache)
    refetchInterval: options?.refetchInterval || 5 * 60 * 1000, // 5 minutos (mais frequente)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Erro ao carregar insights da empresa'
    }
  })
}

/**
 * Hook simplificado para insights básicos (sem IA)
 */
export function useEmpresaInsightsBasic(empresaId: string, options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useEmpresaInsights(empresaId, {
    ...options,
    include_insights: false,
    include_compliance: false,
    include_metrics: false,
    staleTime: 10 * 60 * 1000, // 10 minutos para dados básicos
    refetchInterval: options?.refetchInterval || 15 * 60 * 1000 // 15 minutos
  })
}

/**
 * Hook para insights completos com IA
 */
export function useEmpresaInsightsComplete(empresaId: string, options?: {
  enabled?: boolean
  insight_type?: 'financeiro' | 'compliance' | 'operacional' | 'estrategico' | 'completo'
  force_refresh?: boolean
}) {
  return useEmpresaInsights(empresaId, {
    ...options,
    include_insights: true,
    include_compliance: true,
    include_metrics: true,
    insight_type: options?.insight_type || 'completo',
    staleTime: 2 * 60 * 1000, // 2 minutos para dados com IA
    refetchInterval: 10 * 60 * 1000 // 10 minutos
  })
}

// ============================================
// HOOKS COM CACHE INTELIGENTE
// ============================================

/**
 * Hook com cache inteligente para insights completos
 */
export function useEmpresaInsightsCached(empresaId: string, options?: {
  insight_type?: 'financeiro' | 'compliance' | 'operacional' | 'estrategico' | 'completo'
  force_refresh?: boolean
  enabled?: boolean
}) {
  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()

  return useCachedQuery(
    'empresa-insights-cached',
    async (): Promise<EmpresaInsights> => {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      console.log(`[useEmpresaInsightsCached] Buscando insights para empresa: ${empresaId}`)

      const { data, error } = await supabase.functions.invoke('empresa-context-service', {
        body: {
          empresa_id: empresaId,
          include_insights: true,
          include_compliance: true,
          include_metrics: true,
          insight_type: options?.insight_type || 'completo',
          force_refresh: options?.force_refresh || false
        }
      })

      if (error) {
        console.error('[useEmpresaInsightsCached] Erro na Edge Function:', error)
        throw new Error(`Erro na Edge Function: ${error.message}`)
      }

      if (!data?.success) {
        console.error('[useEmpresaInsightsCached] Edge Function retornou erro:', data?.error)
        throw new Error(data?.error || 'Erro desconhecido ao buscar insights')
      }

      console.log(`[useEmpresaInsightsCached] Insights obtidos com sucesso (cached: ${data.cached})`)

      // Transformar resposta da Edge Function para interface do hook
      const result: EmpresaInsights = {
        empresa: data.empresa,
        financial_summary: data.financial_summary,
        documents_summary: data.documents_summary,
        obligations_summary: data.obligations_summary,
        insights_summary: data.insights_summary,
        compliance_summary: data.compliance_summary,
        metrics_summary: data.metrics_summary,
        recommendations: data.recommendations || [],
        cached: data.cached,
        generated_at: data.generated_at
      }

      return result
    },
    {
      cacheStrategy: CACHE_STRATEGIES.EMPRESA_INSIGHTS,
      cacheParams: {
        empresaId,
        insight_type: options?.insight_type || 'completo',
        force_refresh: options?.force_refresh || false
      },
      enabled: !!user && !!empresaId && (options?.enabled !== false),
      backgroundRefetch: true,
      invalidateOnWindowFocus: false
    }
  )
}
