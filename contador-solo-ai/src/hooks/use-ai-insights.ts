/**
 * Hook para geração de insights com IA - USANDO EDGE FUNCTIONS
 */

import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import {
  AIInsightsGenerator,
  type AIInsights,
  type InsightsConfig,
  INSIGHTS_CONFIG_DEFAULT,
  gerarInsightsIA
} from '@/lib/ai-insights-generator'

/**
 * Interface para resultado dos insights de IA - ATUALIZADA PARA EDGE FUNCTIONS
 */
export interface AIInsightsResult {
  tipo_insight: string
  nivel_detalhamento: string
  resumo_executivo: {
    pontos_principais: string[]
    recomendacoes_prioritarias: string[]
    score_geral: number
  }
  analise_financeira: {
    tendencia: 'positiva' | 'neutra' | 'negativa'
    pontos_atencao: string[]
    oportunidades: string[]
    metricas_chave: any
  }
  analise_compliance: {
    score_atual: number
    areas_criticas: string[]
    recomendacoes_urgentes: string[]
    prazo_adequacao: string
  }
  insights_operacionais: {
    eficiencia_processos: any
    gargalos_identificados: string[]
    melhorias_sugeridas: string[]
    automacoes_possiveis: string[]
  }
  projecoes_estrategicas: {
    cenarios: any
    recomendacoes_crescimento: string[]
    investimentos_sugeridos: string[]
    riscos_futuros: string[]
  }
  alertas_prioritarios: Array<{
    tipo: 'critico' | 'importante' | 'informativo'
    mensagem: string
    acao_recomendada: string
    prazo_acao: string
  }>
  benchmarking: {
    posicao_mercado: string
    comparacao_setor: any
    areas_destaque: string[]
    areas_melhoria: string[]
  }
  configuracao_geracao: {
    modelo_usado: string
    versao: string
    timestamp: string
  }
  confianca_analise: number
  limitacoes: string[]
  // Metadados da Edge Function
  processing_time?: number
  cached?: boolean
  generated_at?: string
}

/**
 * Hook principal para insights com IA - USANDO EDGE FUNCTIONS
 */
export function useAIInsights(
  empresaId: string,
  options?: {
    enabled?: boolean
    insight_type?: 'financeiro' | 'compliance' | 'operacional' | 'estrategico' | 'completo'
    include_projections?: boolean
    include_benchmarking?: boolean
    force_refresh?: boolean
    refetchInterval?: number
    staleTime?: number
  }
) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [
      'ai-insights',
      empresaId,
      options?.insight_type || 'completo',
      options?.include_projections,
      options?.include_benchmarking,
      options?.force_refresh
    ],
    queryFn: async (): Promise<AIInsightsResult> => {
      if (!user) throw new Error('Usuário não autenticado')
      if (!empresaId) throw new Error('ID da empresa é obrigatório')

      console.log(`[useAIInsights] Gerando insights para empresa ${empresaId}`)

      // Chamar Edge Function documentos-analytics-service
      const { data, error } = await supabase.functions.invoke('documentos-analytics-service', {
        body: {
          empresa_id: empresaId,
          user_id: user.id,
          operation: 'generate_insights',
          force_refresh: options?.force_refresh || false,
          options: {
            insight_type: options?.insight_type || 'completo',
            include_projections: options?.include_projections ?? true,
            include_benchmarking: options?.include_benchmarking ?? true
          }
        }
      })

      if (error) {
        console.error('[useAIInsights] Erro na Edge Function:', error)
        throw new Error(`Erro ao gerar insights: ${error.message}`)
      }

      if (!data?.success) {
        console.error('[useAIInsights] Edge Function retornou erro:', data?.error)
        throw new Error(data?.error || 'Erro desconhecido ao gerar insights')
      }

      console.log(`[useAIInsights] Insights gerados com sucesso (${data.processing_time}ms, cached: ${data.cached})`)

      return {
        ...data.result,
        processing_time: data.processing_time,
        cached: data.cached,
        generated_at: data.generated_at
      }
    },
    enabled: !!user && !!empresaId && (options?.enabled !== false),
    staleTime: options?.staleTime || 15 * 60 * 1000, // 15 minutos (insights com IA são mais caros)
    refetchInterval: options?.refetchInterval || 60 * 60 * 1000, // 1 hora
    retry: 2, // Menos tentativas para IA (mais caro)
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 60000),
    meta: {
      errorMessage: 'Erro ao gerar insights com IA'
    }
  })
}

/**
 * Hook para insights rápidos (sem IA pesada)
 */
export function useAIInsightsQuick(
  empresaId: string,
  insight_type: 'financeiro' | 'compliance' | 'operacional' = 'financeiro'
) {
  return useAIInsights(empresaId, {
    insight_type,
    include_projections: false,
    include_benchmarking: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 30 * 60 * 1000 // 30 minutos
  })
}

/**
 * Hook legado para insights com IA (processamento local)
 */
export function useAIInsightsLocal(
  empresaConfig: any,
  filtros: any = {}
) {
  const { 
    metricas, 
    isLoading: metricasLoading, 
    error: metricasError 
  } = useMetricasFinanceiras({
    empresaId: filtros.empresaId,
    dataInicio: filtros.dataInicio,
    dataFim: filtros.dataFim
  })

  const { 
    compliance, 
    isLoading: complianceLoading, 
    error: complianceError 
  } = useComplianceAnalysis({
    empresaId: filtros.empresaId,
    dataInicio: filtros.dataInicio,
    dataFim: filtros.dataFim
  })

  const { 
    documentos, 
    isLoading: dadosLoading, 
    error: dadosError 
  } = useDadosEstruturados(filtros.empresaId)

  // Preparar dados estruturados
  const dadosEstruturados = useMemo(() => {
    return documentos
      .filter(doc => doc.dados_estruturados)
      .map(doc => doc.dados_estruturados!)
  }, [documentos])

  // Configuração de insights
  const insightsConfig = useMemo((): InsightsConfig => {
    const dataInicio = filtros.dataInicio || new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // 6 meses atrás
    const dataFim = filtros.dataFim || new Date()
    const meses = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (30 * 24 * 60 * 60 * 1000))

    return {
      empresa: empresaConfig,
      periodo_analise: {
        inicio: dataInicio.toISOString().split('T')[0],
        fim: dataFim.toISOString().split('T')[0],
        meses
      },
      contexto_adicional: filtros.contexto_adicional,
      foco_analise: filtros.foco_analise || 'completo',
      nivel_detalhamento: filtros.nivel_detalhamento || 'gerencial'
    }
  }, [empresaConfig, filtros])

  // Verificar se todos os dados estão disponíveis
  const dadosDisponiveis = useMemo(() => {
    return !!(metricas && compliance && dadosEstruturados.length > 0)
  }, [metricas, compliance, dadosEstruturados])

  // Query para gerar insights
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch
  } = useQuery({
    queryKey: ['ai-insights', insightsConfig, dadosEstruturados.length],
    queryFn: async (): Promise<AIInsights> => {
      if (!dadosDisponiveis || !metricas || !compliance) {
        throw new Error('Dados insuficientes para gerar insights')
      }

      return await gerarInsightsIA(
        dadosEstruturados,
        metricas,
        compliance,
        insightsConfig
      )
    },
    enabled: dadosDisponiveis && !metricasLoading && !complianceLoading && !dadosLoading,
    staleTime: 60 * 60 * 1000, // 1 hora
    retry: 2,
    retryDelay: 5000
  })

  // Mutation para regenerar insights
  const regenerarInsights = useMutation({
    mutationFn: async (novoContexto?: string) => {
      if (!dadosDisponiveis || !metricas || !compliance) {
        throw new Error('Dados insuficientes para gerar insights')
      }

      const configAtualizada = novoContexto 
        ? { ...insightsConfig, contexto_adicional: novoContexto }
        : insightsConfig

      return await gerarInsightsIA(
        dadosEstruturados,
        metricas,
        compliance,
        configAtualizada
      )
    },
    onSuccess: () => {
      refetch()
    }
  })

  // Funções utilitárias
  const obterInsightsPrioritarios = () => {
    if (!insights) return []

    const prioritarios = []

    // Alertas imediatos
    insights.alertas_prioritarios
      .filter(alerta => alerta.urgencia === 'imediata')
      .forEach(alerta => {
        prioritarios.push({
          tipo: 'alerta',
          categoria: alerta.tipo,
          titulo: alerta.titulo,
          descricao: alerta.descricao,
          acao: alerta.acao_recomendada,
          prioridade: 'alta'
        })
      })

    // Recomendações de alta prioridade
    insights.analise_financeira.recomendacoes
      .filter(rec => rec.prioridade === 'alta')
      .forEach(rec => {
        prioritarios.push({
          tipo: 'recomendacao',
          categoria: rec.categoria,
          titulo: rec.acao,
          descricao: rec.impacto_esperado,
          acao: rec.acao,
          prioridade: 'alta'
        })
      })

    // Ações corretivas críticas
    insights.analise_compliance.acoes_corretivas
      .filter(acao => acao.criticidade === 'alta')
      .forEach(acao => {
        prioritarios.push({
          tipo: 'compliance',
          categoria: 'fiscal',
          titulo: acao.problema,
          descricao: acao.solucao,
          acao: acao.solucao,
          prioridade: 'alta'
        })
      })

    return prioritarios.slice(0, 5) // Top 5
  }

  const obterResumoExecutivo = () => {
    if (!insights) return null

    return {
      situacao_geral: insights.resumo_executivo.situacao_geral,
      score_saude: insights.resumo_executivo.score_saude_financeira,
      pontos_fortes: insights.resumo_executivo.pontos_fortes.slice(0, 3),
      areas_atencao: insights.resumo_executivo.areas_atencao.slice(0, 3),
      alertas_criticos: insights.alertas_prioritarios.filter(a => a.urgencia === 'imediata').length,
      confianca_analise: insights.metadata.confianca_analise
    }
  }

  const obterOportunidadesCrescimento = () => {
    if (!insights) return []

    const oportunidades = []

    // Oportunidades financeiras
    insights.analise_financeira.oportunidades.forEach(op => {
      oportunidades.push({
        categoria: 'Financeiro',
        descricao: op,
        tipo: 'oportunidade'
      })
    })

    // Oportunidades de benchmarking
    insights.benchmarking.oportunidades_crescimento.forEach(op => {
      oportunidades.push({
        categoria: 'Crescimento',
        descricao: op,
        tipo: 'benchmarking'
      })
    })

    // Melhorias operacionais
    insights.insights_operacionais.melhorias_sugeridas.forEach(melhoria => {
      oportunidades.push({
        categoria: 'Operacional',
        descricao: melhoria,
        tipo: 'melhoria'
      })
    })

    return oportunidades
  }

  const obterProjecoes = () => {
    if (!insights) return null

    return {
      cenarios: {
        otimista: insights.projecoes_estrategicas.cenario_otimista,
        realista: insights.projecoes_estrategicas.cenario_realista,
        pessimista: insights.projecoes_estrategicas.cenario_pessimista
      },
      fatores_criticos: insights.projecoes_estrategicas.fatores_criticos,
      recomendacoes: insights.projecoes_estrategicas.recomendacoes_estrategicas
    }
  }

  const obterStatusCompliance = () => {
    if (!insights) return null

    return {
      nivel: insights.analise_compliance.nivel_conformidade,
      gaps: insights.analise_compliance.principais_gaps,
      proximo_vencimento: insights.analise_compliance.proximo_vencimento_critico,
      acoes_urgentes: insights.analise_compliance.acoes_corretivas
        .filter(acao => acao.criticidade === 'alta')
        .length
    }
  }

  const gerarRelatorioCompleto = () => {
    if (!insights) return null

    return {
      cabecalho: {
        empresa: empresaConfig.nome,
        periodo: `${insightsConfig.periodo_analise.inicio} a ${insightsConfig.periodo_analise.fim}`,
        data_geracao: insights.metadata.data_geracao,
        confianca: insights.metadata.confianca_analise
      },
      resumo_executivo: obterResumoExecutivo(),
      insights_prioritarios: obterInsightsPrioritarios(),
      analise_financeira: insights.analise_financeira,
      compliance: obterStatusCompliance(),
      oportunidades: obterOportunidadesCrescimento(),
      projecoes: obterProjecoes(),
      alertas: insights.alertas_prioritarios,
      limitacoes: insights.metadata.limitacoes,
      proxima_revisao: insights.metadata.proxima_revisao_sugerida
    }
  }

  return {
    // Dados
    insights,
    dadosEstruturados,
    insightsConfig,
    
    // Estados
    isLoading: metricasLoading || complianceLoading || dadosLoading || insightsLoading,
    error: metricasError || complianceError || dadosError || insightsError,
    dadosDisponiveis,
    
    // Ações
    refetch,
    regenerarInsights: regenerarInsights.mutate,
    isRegenerando: regenerarInsights.isPending,
    
    // Utilitários
    obterInsightsPrioritarios,
    obterResumoExecutivo,
    obterOportunidadesCrescimento,
    obterProjecoes,
    obterStatusCompliance,
    gerarRelatorioCompleto
  }
}

/**
 * Hook específico para insights executivos
 */
export function useInsightsExecutivos(
  empresaConfig: EmpresaInsightsConfig,
  empresaId: string
) {
  return useAIInsights(empresaConfig, {
    empresaId,
    foco_analise: 'estrategico',
    nivel_detalhamento: 'executivo'
  })
}

/**
 * Hook específico para insights financeiros
 */
export function useInsightsFinanceiros(
  empresaConfig: EmpresaInsightsConfig,
  empresaId: string,
  periodo?: { inicio: Date; fim: Date }
) {
  return useAIInsights(empresaConfig, {
    empresaId,
    dataInicio: periodo?.inicio,
    dataFim: periodo?.fim,
    foco_analise: 'financeiro',
    nivel_detalhamento: 'gerencial'
  })
}

/**
 * Hook específico para insights de compliance
 */
export function useInsightsCompliance(
  empresaConfig: EmpresaInsightsConfig,
  empresaId: string
) {
  return useAIInsights(empresaConfig, {
    empresaId,
    foco_analise: 'compliance',
    nivel_detalhamento: 'operacional'
  })
}

/**
 * Hook para monitoramento de insights
 */
export function useInsightsMonitoramento(
  empresaConfig: EmpresaInsightsConfig,
  empresaId: string
) {
  const { insights, isLoading, error } = useAIInsights(empresaConfig, { empresaId })

  const alertasCriticos = useMemo(() => {
    if (!insights) return 0
    return insights.alertas_prioritarios.filter(a => a.urgencia === 'imediata').length
  }, [insights])

  const scoreGeral = useMemo(() => {
    if (!insights) return 0
    return insights.resumo_executivo.score_saude_financeira
  }, [insights])

  const precisaAtencao = useMemo(() => {
    return alertasCriticos > 0 || scoreGeral < 60
  }, [alertasCriticos, scoreGeral])

  return {
    insights,
    isLoading,
    error,
    alertasCriticos,
    scoreGeral,
    precisaAtencao,
    ultimaAtualizacao: insights?.metadata.data_geracao
  }
}
