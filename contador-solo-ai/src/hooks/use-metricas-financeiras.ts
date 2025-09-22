/**
 * Hook para cálculo e gerenciamento de métricas financeiras - USANDO EDGE FUNCTIONS
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import {
  CalculadoraMetricasFinanceiras,
  type MetricasFinanceirasMensais,
  type MetricasPorTipo,
  type ProjecoesFinanceiras,
  type AnaliseFluxoCaixa,
  type IndicadoresPerformance
} from '@/lib/metricas-financeiras'

/**
 * Interface para filtros de métricas
 */
export interface FiltrosMetricas {
  empresaId?: string
  dataInicio?: Date
  dataFim?: Date
  tiposDocumento?: string[]
  confiancaMinima?: number
}

/**
 * Interface para resultado das métricas - ATUALIZADA PARA EDGE FUNCTIONS
 */
export interface ResultadoMetricas {
  metricas_mensais: Array<{
    mes: string
    receita_total: number
    despesa_total: number
    quantidade_documentos: number
    tipos_documento: string[]
    confianca_media: number
  }>
  metricas_por_tipo: Array<{
    tipo_documento: string
    quantidade: number
    valor_total: number
    confianca_media: number
    campos_mais_extraidos: Array<{
      campo: string
      count: number
    }>
  }>
  projecoes: {
    proximo_mes: number
    proximo_trimestre: number
    anual: number
    tendencia: 'crescimento' | 'declinio' | 'estavel'
  }
  fluxo_caixa: {
    entradas: Array<{ mes: string; valor: number }>
    saidas: Array<{ mes: string; valor: number }>
    saldos: Array<{ mes: string; valor: number }>
    saldo_acumulado: number
  }
  indicadores_performance: {
    ticket_medio: number
    frequencia_documentos: number
    crescimento_percentual: number
    margem_bruta: number
    eficiencia_processamento: number
  }
  resumo_executivo: {
    total_documentos: number
    periodo_analise: string
    receita_total: number
    crescimento_medio: number
    confianca_dados: number
  }
  // Metadados da Edge Function
  processing_time?: number
  cached?: boolean
  generated_at?: string
}

/**
 * Hook principal para métricas financeiras - USANDO EDGE FUNCTIONS
 */
export function useMetricasFinanceiras(
  empresaId: string,
  filtros?: FiltrosMetricas & {
    period_months?: number
    force_refresh?: boolean
  },
  options?: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  }
) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [
      'metricas-financeiras',
      empresaId,
      filtros?.period_months || 6,
      filtros?.force_refresh
    ],
    queryFn: async (): Promise<ResultadoMetricas> => {
      if (!user) throw new Error('Usuário não autenticado')
      if (!empresaId) throw new Error('ID da empresa é obrigatório')

      console.log(`[useMetricasFinanceiras] Calculando métricas para empresa ${empresaId}`)

      // Chamar Edge Function documentos-analytics-service
      const { data, error } = await supabase.functions.invoke('documentos-analytics-service', {
        body: {
          empresa_id: empresaId,
          user_id: user.id,
          operation: 'calculate_metrics',
          period_months: filtros?.period_months || 6,
          force_refresh: filtros?.force_refresh || false
        }
      })

      if (error) {
        console.error('[useMetricasFinanceiras] Erro na Edge Function:', error)
        throw new Error(`Erro ao calcular métricas: ${error.message}`)
      }

      if (!data?.success) {
        console.error('[useMetricasFinanceiras] Edge Function retornou erro:', data?.error)
        throw new Error(data?.error || 'Erro desconhecido ao calcular métricas')
      }

      console.log(`[useMetricasFinanceiras] Métricas calculadas com sucesso (${data.processing_time}ms, cached: ${data.cached})`)

      return {
        metricas_mensais: data.result.metricas_mensais || [],
        metricas_por_tipo: data.result.metricas_por_tipo || [],
        projecoes: data.result.projecoes || {
          proximo_mes: 0,
          proximo_trimestre: 0,
          anual: 0,
          tendencia: 'estavel'
        },
        fluxo_caixa: data.result.fluxo_caixa || {
          entradas: [],
          saidas: [],
          saldos: [],
          saldo_acumulado: 0
        },
        indicadores_performance: data.result.indicadores_performance || {
          ticket_medio: 0,
          frequencia_documentos: 0,
          crescimento_percentual: 0,
          margem_bruta: 0,
          eficiencia_processamento: 0
        },
        resumo_executivo: data.result.resumo_executivo || {
          total_documentos: 0,
          periodo_analise: `${filtros?.period_months || 6} meses`,
          receita_total: 0,
          crescimento_medio: 0,
          confianca_dados: 0
        },
        processing_time: data.processing_time,
        cached: data.cached,
        generated_at: data.generated_at
      }
    },
    enabled: !!user && !!empresaId && (options?.enabled !== false),
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutos
    refetchInterval: options?.refetchInterval || 10 * 60 * 1000, // 10 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Erro ao calcular métricas financeiras'
    }
  })
}

/**
 * Hook legado para métricas financeiras (processamento local)
 */
export function useMetricasFinanceirasLocal(filtros: FiltrosMetricas = {}) {

  // Query para calcular métricas
  const {
    data: metricas,
    isLoading: metricasLoading,
    error: metricasError,
    refetch
  } = useQuery({
    queryKey: ['metricas-financeiras', filtros, dadosFiltrados.length],
    queryFn: async (): Promise<ResultadoMetricas> => {
      if (dadosFiltrados.length === 0) {
        return criarMetricasVazias()
      }

      const calculadora = new CalculadoraMetricasFinanceiras(dadosFiltrados)

      // Calcular todas as métricas
      const metricasMensais = calculadora.calcularMetricasMensais()
      const metricasPorTipo = calculadora.calcularMetricasPorTipo()
      const projecoes = calculadora.gerarProjecoes()
      const fluxoCaixa = calculadora.analisarFluxoCaixa()
      const indicadores = calculadora.calcularIndicadoresPerformance()

      // Calcular resumo
      const totalReceitas = metricasMensais.reduce((sum, m) => sum + m.receitas.total, 0)
      const totalDespesas = metricasMensais.reduce((sum, m) => sum + m.despesas.total, 0)
      const saldoLiquido = totalReceitas - totalDespesas
      const margemMedia = metricasMensais.length > 0
        ? metricasMensais.reduce((sum, m) => sum + m.margem_liquida, 0) / metricasMensais.length
        : 0

      // Calcular crescimento geral
      const crescimentoReceita = metricasMensais.length >= 2
        ? calcularCrescimentoGeral(metricasMensais.map(m => m.receitas.total))
        : 0
      const crescimentoDespesa = metricasMensais.length >= 2
        ? calcularCrescimentoGeral(metricasMensais.map(m => m.despesas.total))
        : 0

      // Período de análise
      const periodoAnalise = {
        inicio: metricasMensais.length > 0 ? metricasMensais[0].mes : '',
        fim: metricasMensais.length > 0 ? metricasMensais[metricasMensais.length - 1].mes : '',
        meses: metricasMensais.length
      }

      return {
        metricas_mensais: metricasMensais,
        metricas_por_tipo: metricasPorTipo,
        projecoes,
        fluxo_caixa: fluxoCaixa,
        indicadores,
        resumo: {
          total_receitas: totalReceitas,
          total_despesas: totalDespesas,
          saldo_liquido: saldoLiquido,
          margem_media: margemMedia,
          crescimento_receita: crescimentoReceita,
          crescimento_despesa: crescimentoDespesa,
          documentos_analisados: dadosFiltrados.length,
          periodo_analise: periodoAnalise
        }
      }
    },
    enabled: !dadosLoading && dadosFiltrados.length >= 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 15 * 60 * 1000 // 15 minutos
  })

  // Funções utilitárias
  const obterMetricasMes = (mes: string) => {
    return metricas?.metricas_mensais.find(m => m.mes === mes)
  }

  const obterMetricasTipo = (tipo: string) => {
    return metricas?.metricas_por_tipo.find(m => m.tipo === tipo)
  }

  const compararMeses = (mes1: string, mes2: string) => {
    const metrica1 = obterMetricasMes(mes1)
    const metrica2 = obterMetricasMes(mes2)

    if (!metrica1 || !metrica2) return null

    return {
      receitas: {
        mes1: metrica1.receitas.total,
        mes2: metrica2.receitas.total,
        crescimento: calcularCrescimento(metrica1.receitas.total, metrica2.receitas.total)
      },
      despesas: {
        mes1: metrica1.despesas.total,
        mes2: metrica2.despesas.total,
        crescimento: calcularCrescimento(metrica1.despesas.total, metrica2.despesas.total)
      },
      saldo: {
        mes1: metrica1.saldo_liquido,
        mes2: metrica2.saldo_liquido,
        crescimento: calcularCrescimento(metrica1.saldo_liquido, metrica2.saldo_liquido)
      }
    }
  }

  const obterTendencias = () => {
    if (!metricas || metricas.metricas_mensais.length < 3) return null

    const ultimos3Meses = metricas.metricas_mensais.slice(-3)
    
    return {
      receitas: analisarTendencia(ultimos3Meses.map(m => m.receitas.total)),
      despesas: analisarTendencia(ultimos3Meses.map(m => m.despesas.total)),
      margem: analisarTendencia(ultimos3Meses.map(m => m.margem_liquida))
    }
  }

  const obterInsights = () => {
    if (!metricas) return []

    const insights: string[] = []

    // Insights baseados em crescimento
    if (metricas.resumo.crescimento_receita > 10) {
      insights.push(`Receitas cresceram ${metricas.resumo.crescimento_receita.toFixed(1)}% no período`)
    } else if (metricas.resumo.crescimento_receita < -10) {
      insights.push(`Receitas decresceram ${Math.abs(metricas.resumo.crescimento_receita).toFixed(1)}% no período`)
    }

    // Insights baseados em margem
    if (metricas.resumo.margem_media > 20) {
      insights.push('Margem de lucro saudável acima de 20%')
    } else if (metricas.resumo.margem_media < 5) {
      insights.push('Margem de lucro baixa - atenção aos custos')
    }

    // Insights baseados em projeções
    if (metricas.projecoes.tendencias.receita === 'crescente') {
      insights.push('Tendência de crescimento nas receitas')
    } else if (metricas.projecoes.tendencias.receita === 'decrescente') {
      insights.push('Tendência de queda nas receitas - revisar estratégia')
    }

    // Insights baseados em fluxo de caixa
    if (metricas.fluxo_caixa.dias_caixa < 30) {
      insights.push('Fluxo de caixa apertado - menos de 30 dias de reserva')
    } else if (metricas.fluxo_caixa.dias_caixa > 90) {
      insights.push('Boa reserva de caixa - mais de 90 dias')
    }

    return insights
  }

  return {
    // Dados
    metricas,
    dadosFiltrados,
    
    // Estados
    isLoading: dadosLoading || metricasLoading,
    error: dadosError || metricasError,
    
    // Ações
    refetch,
    
    // Utilitários
    obterMetricasMes,
    obterMetricasTipo,
    compararMeses,
    obterTendencias,
    obterInsights
  }
}

/**
 * Hook específico para métricas de um período
 */
export function useMetricasPeriodo(
  empresaId: string,
  dataInicio: Date,
  dataFim: Date
) {
  return useMetricasFinanceiras({
    empresaId,
    dataInicio,
    dataFim
  })
}

/**
 * Hook específico para comparação de períodos
 */
export function useComparacaoPeriodos(
  empresaId: string,
  periodo1: { inicio: Date; fim: Date },
  periodo2: { inicio: Date; fim: Date }
) {
  const metricas1 = useMetricasFinanceiras({
    empresaId,
    dataInicio: periodo1.inicio,
    dataFim: periodo1.fim
  })

  const metricas2 = useMetricasFinanceiras({
    empresaId,
    dataInicio: periodo2.inicio,
    dataFim: periodo2.fim
  })

  const comparacao = useMemo(() => {
    if (!metricas1.metricas || !metricas2.metricas) return null

    const resumo1 = metricas1.metricas.resumo
    const resumo2 = metricas2.metricas.resumo

    return {
      receitas: {
        periodo1: resumo1.total_receitas,
        periodo2: resumo2.total_receitas,
        crescimento: calcularCrescimento(resumo1.total_receitas, resumo2.total_receitas)
      },
      despesas: {
        periodo1: resumo1.total_despesas,
        periodo2: resumo2.total_despesas,
        crescimento: calcularCrescimento(resumo1.total_despesas, resumo2.total_despesas)
      },
      saldo: {
        periodo1: resumo1.saldo_liquido,
        periodo2: resumo2.saldo_liquido,
        crescimento: calcularCrescimento(resumo1.saldo_liquido, resumo2.saldo_liquido)
      },
      margem: {
        periodo1: resumo1.margem_media,
        periodo2: resumo2.margem_media,
        diferenca: resumo1.margem_media - resumo2.margem_media
      }
    }
  }, [metricas1.metricas, metricas2.metricas])

  return {
    periodo1: metricas1,
    periodo2: metricas2,
    comparacao,
    isLoading: metricas1.isLoading || metricas2.isLoading,
    error: metricas1.error || metricas2.error
  }
}

/**
 * Funções utilitárias
 */
function criarMetricasVazias(): ResultadoMetricas {
  return {
    metricas_mensais: [],
    metricas_por_tipo: [],
    projecoes: {
      proximo_mes: { receita_projetada: 0, despesa_projetada: 0, saldo_projetado: 0, confianca_projecao: 0 },
      proximos_3_meses: { receita_projetada: 0, despesa_projetada: 0, saldo_projetado: 0, confianca_projecao: 0 },
      proximos_6_meses: { receita_projetada: 0, despesa_projetada: 0, saldo_projetado: 0, confianca_projecao: 0 },
      tendencias: { receita: 'estavel', despesa: 'estavel', margem: 'estavel' },
      sazonalidade: { mes_maior_receita: '', mes_menor_receita: '', variacao_sazonal: 0 }
    },
    fluxo_caixa: {
      periodo: { inicio: '', fim: '' },
      entradas: { total: 0, por_fonte: {}, media_mensal: 0 },
      saidas: { total: 0, por_categoria: {}, media_mensal: 0 },
      saldo_periodo: 0,
      dias_caixa: 0,
      ponto_equilibrio: 0,
      liquidez: { corrente: 0, rapida: 0, imediata: 0 }
    },
    indicadores: {
      faturamento: { atual: 0, anterior: 0, crescimento: 0 },
      lucratividade: { margem_bruta: 0, margem_liquida: 0, roi: 0 },
      eficiencia: { ticket_medio: 0, frequencia_vendas: 0, tempo_medio_recebimento: 0, inadimplencia: 0 },
      qualidade_dados: { documentos_processados: 0, confianca_media: 0, erros_estruturacao: 0, completude_dados: 0 }
    },
    resumo: {
      total_receitas: 0,
      total_despesas: 0,
      saldo_liquido: 0,
      margem_media: 0,
      crescimento_receita: 0,
      crescimento_despesa: 0,
      documentos_analisados: 0,
      periodo_analise: { inicio: '', fim: '', meses: 0 }
    }
  }
}

function calcularCrescimento(valorAtual: number, valorAnterior: number): number {
  if (valorAnterior === 0) return valorAtual > 0 ? 100 : 0
  return ((valorAtual - valorAnterior) / valorAnterior) * 100
}

function calcularCrescimentoGeral(valores: number[]): number {
  if (valores.length < 2) return 0
  const primeiro = valores[0]
  const ultimo = valores[valores.length - 1]
  return calcularCrescimento(ultimo, primeiro)
}

function analisarTendencia(valores: number[]): 'crescente' | 'estavel' | 'decrescente' {
  if (valores.length < 2) return 'estavel'
  
  const crescimentos = []
  for (let i = 1; i < valores.length; i++) {
    crescimentos.push(calcularCrescimento(valores[i], valores[i - 1]))
  }
  
  const crescimentoMedio = crescimentos.reduce((sum, c) => sum + c, 0) / crescimentos.length
  
  if (crescimentoMedio > 5) return 'crescente'
  if (crescimentoMedio < -5) return 'decrescente'
  return 'estavel'
}
