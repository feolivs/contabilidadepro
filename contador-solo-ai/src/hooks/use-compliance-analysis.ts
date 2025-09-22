/**
 * Hook para análise de compliance fiscal - USANDO EDGE FUNCTIONS
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import {
  ComplianceAnalyzer,
  type ComplianceAnalysis,
  type ComplianceConfig,
  COMPLIANCE_CONFIG_DEFAULT,
  criarAnaliseCompliance
} from '@/lib/compliance-analyzer'

/**
 * Interface para filtros de compliance
 */
export interface FiltrosCompliance {
  empresaId?: string
  dataInicio?: Date
  dataFim?: Date
  tiposDocumento?: string[]
  confiancaMinima?: number
}

/**
 * Interface para resultado da análise de compliance - ATUALIZADA PARA EDGE FUNCTIONS
 */
export interface ComplianceAnalysisResult {
  score_geral: number
  nivel: 'critico' | 'baixo' | 'medio' | 'alto' | 'excelente'
  consistencia_dados: {
    score: number
    inconsistencias: string[]
    campos_faltantes: string[]
    duplicatas_potenciais: string[]
  }
  prazos_fiscais: {
    das_proximo_vencimento: string
    dias_para_das: number
    regime_tributario: string
    alertas_prazo: string[]
  }
  obrigacoes_fiscais: {
    obrigacoes_ativas: Array<{
      tipo: string
      periodicidade: string
      vencimento: string
      status: string
    }>
    regime_tributario: string
    recomendacoes: string[]
  }
  qualidade_documentacao: {
    taxa_estruturacao: number
    confianca_media: number
    total_documentos: number
    documentos_estruturados: number
    qualidade_geral: 'alta' | 'media' | 'baixa'
    areas_criticas: string[]
  }
  riscos_identificados: string[]
  alertas_urgentes: string[]
  historico_compliance: any
  configuracao_analise: {
    periodo_meses: number
    documentos_analisados: number
    versao_analyzer: string
  }
  // Metadados da Edge Function
  processing_time?: number
  cached?: boolean
  generated_at?: string
}

/**
 * Hook principal para análise de compliance - USANDO EDGE FUNCTIONS
 */
export function useComplianceAnalysis(
  empresaId: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
    force_refresh?: boolean
  }
) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [
      'compliance-analysis',
      empresaId,
      options?.force_refresh
    ],
    queryFn: async (): Promise<ComplianceAnalysisResult> => {
      if (!user) throw new Error('Usuário não autenticado')
      if (!empresaId) throw new Error('ID da empresa é obrigatório')

      console.log(`[useComplianceAnalysis] Analisando compliance para empresa ${empresaId}`)

      // Chamar Edge Function documentos-analytics-service
      const { data, error } = await supabase.functions.invoke('documentos-analytics-service', {
        body: {
          empresa_id: empresaId,
          user_id: user.id,
          operation: 'analyze_compliance',
          force_refresh: options?.force_refresh || false
        }
      })

      if (error) {
        console.error('[useComplianceAnalysis] Erro na Edge Function:', error)
        throw new Error(`Erro ao analisar compliance: ${error.message}`)
      }

      if (!data?.success) {
        console.error('[useComplianceAnalysis] Edge Function retornou erro:', data?.error)
        throw new Error(data?.error || 'Erro desconhecido ao analisar compliance')
      }

      console.log(`[useComplianceAnalysis] Compliance analisado com sucesso (${data.processing_time}ms, cached: ${data.cached})`)

      return {
        ...data.result,
        processing_time: data.processing_time,
        cached: data.cached,
        generated_at: data.generated_at
      }
    },
    enabled: !!user && !!empresaId && (options?.enabled !== false),
    staleTime: options?.staleTime || 10 * 60 * 1000, // 10 minutos (compliance muda menos)
    refetchInterval: options?.refetchInterval || 30 * 60 * 1000, // 30 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Erro ao analisar compliance fiscal'
    }
  })
}

/**
 * Hook legado para análise de compliance (processamento local)
 */
export function useComplianceAnalysisLocal(
  filtros: FiltrosCompliance = {},
  configuracao: any = {}
) {

  // Filtrar dados baseado nos filtros
  const dadosFiltrados = useMemo(() => {
    let dados = documentos.filter(doc => doc.dados_estruturados)

    // Filtrar por data
    if (filtros.dataInicio || filtros.dataFim) {
      dados = dados.filter(doc => {
        const dataDoc = new Date(doc.data_estruturacao || doc.dados_estruturados!.data_processamento)
        
        if (filtros.dataInicio && dataDoc < filtros.dataInicio) return false
        if (filtros.dataFim && dataDoc > filtros.dataFim) return false
        
        return true
      })
    }

    // Filtrar por tipos de documento
    if (filtros.tiposDocumento && filtros.tiposDocumento.length > 0) {
      dados = dados.filter(doc => 
        filtros.tiposDocumento!.includes(doc.dados_estruturados!.tipo_documento)
      )
    }

    // Filtrar por confiança mínima
    if (filtros.confiancaMinima !== undefined) {
      dados = dados.filter(doc => 
        (doc.confianca_estruturacao || 0) >= filtros.confiancaMinima!
      )
    }

    return dados.map(doc => doc.dados_estruturados!).filter(Boolean)
  }, [documentos, filtros])

  // Configuração de compliance
  const configCompliance = useMemo((): ComplianceConfig => {
    return {
      ...COMPLIANCE_CONFIG_DEFAULT,
      ...configuracao
    }
  }, [configuracao])

  // Query para análise de compliance
  const {
    data: compliance,
    isLoading: complianceLoading,
    error: complianceError,
    refetch
  } = useQuery({
    queryKey: ['compliance-analysis', filtros, configuracao, dadosFiltrados.length],
    queryFn: async (): Promise<ComplianceAnalysis> => {
      if (dadosFiltrados.length === 0) {
        return criarComplianceVazio()
      }

      return await criarAnaliseCompliance(dadosFiltrados, configCompliance)
    },
    enabled: !dadosLoading && dadosFiltrados.length >= 0,
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: 30 * 60 * 1000 // 30 minutos
  })

  // Funções utilitárias
  const obterAlertasCriticos = () => {
    if (!compliance) return []
    
    return compliance.alertas_urgentes.filter(alerta => 
      alerta.tipo === 'Atraso Crítico' || alerta.prazo_limite === 'Urgente'
    )
  }

  const obterVencimentosProximos = (dias: number = 7) => {
    if (!compliance) return []
    
    return compliance.prazos_fiscais.vencimentos_proximos.filter(vencimento =>
      vencimento.dias_restantes <= dias
    )
  }

  const obterRiscosAltos = () => {
    if (!compliance) return []
    
    return compliance.riscos_identificados.filter(risco =>
      risco.impacto === 'alto' || risco.probabilidade === 'alta'
    )
  }

  const calcularTendenciaScore = () => {
    if (!compliance || compliance.historico_compliance.evolucao_score.length < 2) {
      return { tendencia: 'estavel', variacao: 0 }
    }

    const scores = compliance.historico_compliance.evolucao_score
    const ultimoScore = scores[scores.length - 1].score
    const penultimoScore = scores[scores.length - 2].score
    const variacao = ultimoScore - penultimoScore

    let tendencia: 'melhorando' | 'piorando' | 'estavel' = 'estavel'
    if (variacao > 5) tendencia = 'melhorando'
    else if (variacao < -5) tendencia = 'piorando'

    return { tendencia, variacao }
  }

  const obterRecomendacoesPrioritarias = () => {
    if (!compliance) return []

    const recomendacoes: Array<{
      categoria: string
      recomendacao: string
      prioridade: 'alta' | 'media' | 'baixa'
    }> = []

    // Recomendações de consistência
    if (compliance.consistencia_dados.score < 70) {
      compliance.consistencia_dados.recomendacoes.forEach(rec => {
        recomendacoes.push({
          categoria: 'Consistência de Dados',
          recomendacao: rec,
          prioridade: 'alta'
        })
      })
    }

    // Recomendações de prazos
    if (compliance.prazos_fiscais.atrasos.length > 0) {
      recomendacoes.push({
        categoria: 'Prazos Fiscais',
        recomendacao: 'Regularizar pendências em atraso para evitar multas',
        prioridade: 'alta'
      })
    }

    // Recomendações de qualidade
    if (compliance.qualidade_documentacao.confianca_media < 0.8) {
      recomendacoes.push({
        categoria: 'Qualidade dos Dados',
        recomendacao: 'Melhorar qualidade dos documentos digitalizados',
        prioridade: 'media'
      })
    }

    // Recomendações de riscos
    compliance.riscos_identificados.forEach(risco => {
      if (risco.impacto === 'alto') {
        recomendacoes.push({
          categoria: 'Gestão de Riscos',
          recomendacao: risco.recomendacao,
          prioridade: 'alta'
        })
      }
    })

    return recomendacoes.sort((a, b) => {
      const prioridadeOrder = { 'alta': 3, 'media': 2, 'baixa': 1 }
      return prioridadeOrder[b.prioridade] - prioridadeOrder[a.prioridade]
    })
  }

  const obterStatusGeral = () => {
    if (!compliance) return null

    const { score_geral, nivel } = compliance
    
    let cor: 'green' | 'yellow' | 'orange' | 'red' = 'green'
    let mensagem = ''

    switch (nivel) {
      case 'excelente':
        cor = 'green'
        mensagem = 'Compliance excelente! Continue mantendo os padrões.'
        break
      case 'alto':
        cor = 'green'
        mensagem = 'Bom nível de compliance. Pequenos ajustes podem melhorar ainda mais.'
        break
      case 'medio':
        cor = 'yellow'
        mensagem = 'Compliance adequado, mas há pontos importantes para melhorar.'
        break
      case 'baixo':
        cor = 'orange'
        mensagem = 'Atenção! Nível de compliance baixo requer ação imediata.'
        break
      case 'critico':
        cor = 'red'
        mensagem = 'CRÍTICO! Compliance muito baixo - risco alto de penalidades.'
        break
    }

    return {
      score: score_geral,
      nivel,
      cor,
      mensagem,
      alertas_criticos: obterAlertasCriticos().length,
      vencimentos_proximos: obterVencimentosProximos().length,
      riscos_altos: obterRiscosAltos().length
    }
  }

  const gerarRelatorioCompliance = () => {
    if (!compliance) return null

    return {
      resumo_executivo: {
        score_geral: compliance.score_geral,
        nivel: compliance.nivel,
        data_analise: new Date().toISOString(),
        documentos_analisados: dadosFiltrados.length
      },
      areas_criticas: {
        consistencia: compliance.consistencia_dados.score < 70,
        prazos: compliance.prazos_fiscais.atrasos.length > 0,
        obrigacoes: compliance.obrigacoes_fiscais.pendentes.length > 0,
        qualidade: compliance.qualidade_documentacao.confianca_media < 0.8
      },
      acoes_recomendadas: obterRecomendacoesPrioritarias(),
      alertas_urgentes: compliance.alertas_urgentes,
      proximo_vencimento: compliance.prazos_fiscais.vencimentos_proximos[0] || null,
      tendencia: calcularTendenciaScore()
    }
  }

  return {
    // Dados
    compliance,
    dadosFiltrados,
    configCompliance,
    
    // Estados
    isLoading: dadosLoading || complianceLoading,
    error: dadosError || complianceError,
    
    // Ações
    refetch,
    
    // Utilitários
    obterAlertasCriticos,
    obterVencimentosProximos,
    obterRiscosAltos,
    calcularTendenciaScore,
    obterRecomendacoesPrioritarias,
    obterStatusGeral,
    gerarRelatorioCompliance
  }
}

/**
 * Hook específico para alertas de compliance
 */
export function useComplianceAlertas(empresaId: string) {
  const { compliance, isLoading } = useComplianceAnalysis({ empresaId })

  const alertas = useMemo(() => {
    if (!compliance) return []

    const alertasFormatados = []

    // Alertas urgentes
    compliance.alertas_urgentes.forEach(alerta => {
      alertasFormatados.push({
        id: `urgente-${alertasFormatados.length}`,
        tipo: 'urgente',
        titulo: alerta.tipo,
        mensagem: alerta.mensagem,
        acao: alerta.acao_requerida,
        prazo: alerta.prazo_limite
      })
    })

    // Vencimentos próximos
    compliance.prazos_fiscais.vencimentos_proximos
      .filter(v => v.criticidade === 'alta')
      .forEach(vencimento => {
        alertasFormatados.push({
          id: `vencimento-${alertasFormatados.length}`,
          tipo: 'vencimento',
          titulo: 'Vencimento Próximo',
          mensagem: `${vencimento.descricao} vence em ${vencimento.dias_restantes} dias`,
          acao: 'Providenciar pagamento',
          prazo: vencimento.data_vencimento
        })
      })

    // Riscos altos
    compliance.riscos_identificados
      .filter(r => r.impacto === 'alto')
      .forEach(risco => {
        alertasFormatados.push({
          id: `risco-${alertasFormatados.length}`,
          tipo: 'risco',
          titulo: 'Risco Alto Identificado',
          mensagem: risco.descricao,
          acao: risco.recomendacao,
          prazo: null
        })
      })

    return alertasFormatados
  }, [compliance])

  return {
    alertas,
    isLoading,
    totalAlertas: alertas.length,
    alertasUrgentes: alertas.filter(a => a.tipo === 'urgente').length,
    vencimentosProximos: alertas.filter(a => a.tipo === 'vencimento').length,
    riscosAltos: alertas.filter(a => a.tipo === 'risco').length
  }
}

/**
 * Hook para monitoramento contínuo de compliance
 */
export function useComplianceMonitoramento(empresaId: string) {
  const { compliance, refetch } = useComplianceAnalysis({ empresaId })

  // Verificar se precisa de atenção imediata
  const precisaAtencao = useMemo(() => {
    if (!compliance) return false
    
    return (
      compliance.score_geral < 60 ||
      compliance.alertas_urgentes.length > 0 ||
      compliance.prazos_fiscais.atrasos.length > 0
    )
  }, [compliance])

  // Status do monitoramento
  const statusMonitoramento = useMemo(() => {
    if (!compliance) return 'carregando'
    
    if (compliance.score_geral >= 90) return 'excelente'
    if (compliance.score_geral >= 75) return 'bom'
    if (compliance.score_geral >= 60) return 'atencao'
    return 'critico'
  }, [compliance])

  return {
    compliance,
    precisaAtencao,
    statusMonitoramento,
    refetch,
    ultimaAtualizacao: new Date()
  }
}

/**
 * Função utilitária para criar compliance vazio
 */
function criarComplianceVazio(): ComplianceAnalysis {
  return {
    score_geral: 0,
    nivel: 'critico',
    consistencia_dados: {
      score: 0,
      problemas: [],
      recomendacoes: []
    },
    prazos_fiscais: {
      score: 0,
      vencimentos_proximos: [],
      atrasos: []
    },
    obrigacoes_fiscais: {
      score: 0,
      pendentes: [],
      cumpridas: []
    },
    qualidade_documentacao: {
      score: 0,
      documentos_incompletos: 0,
      campos_faltantes: [],
      confianca_media: 0
    },
    riscos_identificados: [],
    alertas_urgentes: [],
    historico_compliance: {
      evolucao_score: [],
      melhorias: [],
      deterioracoes: []
    }
  }
}
