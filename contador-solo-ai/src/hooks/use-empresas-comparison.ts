'use client'

/**
 * 📊 USE EMPRESAS COMPARISON - ContabilidadePRO
 * Hook para buscar e processar dados de comparação entre empresas
 * Integrado com cache inteligente e Edge Functions
 */

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueries } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { useCachedQuery } from '@/hooks/use-cached-query'
import { logger } from '@/lib/simple-logger'

// Interfaces
interface EmpresaComparison {
  id: string
  nome: string
  cnpj: string
  regime_tributario: string
  metricas: {
    faturamento_anual: number
    faturamento_mes_atual: number
    crescimento_percentual: number
    total_documentos: number
    documentos_processados: number
    compliance_score: number
    margem_limite_simples: number
    projecao_anual: number
  }
  insights: {
    pontos_fortes: string[]
    areas_melhoria: string[]
    alertas_criticos: string[]
    recomendacoes: string[]
  }
  dados_mensais: Array<{
    mes: string
    faturamento: number
    documentos: number
    compliance: number
  }>
}

interface ComparisonFilters {
  periodo: '3m' | '6m' | '12m' | '24m'
  metricas: string[]
  incluir_projecoes: boolean
  incluir_benchmarks: boolean
}

interface ComparisonStats {
  total_empresas: number
  empresas_ativas: number
  faturamento_total: number
  crescimento_medio: number
  compliance_medio: number
  melhor_performance: {
    faturamento: string
    crescimento: string
    compliance: string
  }
}

/**
 * Hook principal para comparação de empresas
 */
export function useEmpresasComparison(filtros?: ComparisonFilters) {
  const { user } = useAuth()
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([])

  // Buscar lista de empresas do usuário
  const { data: empresas, isLoading: loadingEmpresas } = useCachedQuery(
    ['empresas-lista', user?.id],
    async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, cnpj, regime_tributario, ativa')
        .eq('user_id', user.id)
        .eq('ativa', true)
        .order('nome')

      if (error) {
        logger.error('Erro ao buscar empresas:', error)
        throw error
      }

      return data || []
    },
    'EMPRESAS_LIST',
    { enabled: !!user?.id }
  )

  // Buscar dados detalhados das empresas selecionadas
  const empresasQueries = useQueries({
    queries: empresasSelecionadas.map(empresaId => ({
      queryKey: ['empresa-comparison', empresaId, filtros?.periodo],
      queryFn: () => fetchEmpresaComparisonData(empresaId, filtros),
      enabled: !!empresaId && !!user?.id,
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 15 * 60 * 1000, // 15 minutos
    }))
  })

  // Processar dados de comparação
  const dadosComparacao = useMemo(() => {
    const dados = empresasQueries
      .filter(query => query.data)
      .map(query => query.data as EmpresaComparison)

    return dados
  }, [empresasQueries])

  // Calcular estatísticas de comparação
  const stats = useMemo((): ComparisonStats => {
    if (dadosComparacao.length === 0) {
      return {
        total_empresas: 0,
        empresas_ativas: 0,
        faturamento_total: 0,
        crescimento_medio: 0,
        compliance_medio: 0,
        melhor_performance: {
          faturamento: '',
          crescimento: '',
          compliance: ''
        }
      }
    }

    const faturamentoTotal = dadosComparacao.reduce(
      (sum, emp) => sum + emp.metricas.faturamento_anual, 0
    )
    
    const crescimentoMedio = dadosComparacao.reduce(
      (sum, emp) => sum + emp.metricas.crescimento_percentual, 0
    ) / dadosComparacao.length

    const complianceMedio = dadosComparacao.reduce(
      (sum, emp) => sum + emp.metricas.compliance_score, 0
    ) / dadosComparacao.length

    // Encontrar melhores performances
    const melhorFaturamento = dadosComparacao.reduce(
      (max, emp) => emp.metricas.faturamento_anual > max.metricas.faturamento_anual ? emp : max
    )

    const melhorCrescimento = dadosComparacao.reduce(
      (max, emp) => emp.metricas.crescimento_percentual > max.metricas.crescimento_percentual ? emp : max
    )

    const melhorCompliance = dadosComparacao.reduce(
      (max, emp) => emp.metricas.compliance_score > max.metricas.compliance_score ? emp : max
    )

    return {
      total_empresas: dadosComparacao.length,
      empresas_ativas: dadosComparacao.length,
      faturamento_total: faturamentoTotal,
      crescimento_medio: crescimentoMedio,
      compliance_medio: complianceMedio,
      melhor_performance: {
        faturamento: melhorFaturamento.nome,
        crescimento: melhorCrescimento.nome,
        compliance: melhorCompliance.nome
      }
    }
  }, [dadosComparacao])

  // Estados de loading
  const isLoading = loadingEmpresas || empresasQueries.some(query => query.isLoading)
  const hasError = empresasQueries.some(query => query.error)

  return {
    // Dados
    empresas: empresas || [],
    dadosComparacao,
    stats,
    
    // Estados
    isLoading,
    hasError,
    empresasSelecionadas,
    
    // Ações
    setEmpresasSelecionadas,
    
    // Funções utilitárias
    adicionarEmpresa: (empresaId: string) => {
      if (!empresasSelecionadas.includes(empresaId)) {
        setEmpresasSelecionadas(prev => [...prev, empresaId])
      }
    },
    
    removerEmpresa: (empresaId: string) => {
      setEmpresasSelecionadas(prev => prev.filter(id => id !== empresaId))
    },
    
    limparSelecao: () => {
      setEmpresasSelecionadas([])
    },
    
    selecionarTodas: () => {
      if (empresas) {
        setEmpresasSelecionadas(empresas.map(emp => emp.id))
      }
    }
  }
}

/**
 * Buscar dados detalhados de uma empresa para comparação
 */
async function fetchEmpresaComparisonData(
  empresaId: string, 
  filtros?: ComparisonFilters
): Promise<EmpresaComparison> {
  try {
    // Buscar dados básicos da empresa
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome, cnpj, regime_tributario')
      .eq('id', empresaId)
      .single()

    if (empresaError) throw empresaError

    // Buscar métricas financeiras via Edge Function
    const { data: metricas, error: metricasError } = await supabase.functions
      .invoke('documentos-analytics-service', {
        body: {
          empresa_id: empresaId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          operation: 'calculate_metrics',
          period_months: getPeriodMonths(filtros?.periodo || '12m'),
          options: {
            include_projections: filtros?.incluir_projecoes ?? true,
            include_benchmarking: filtros?.incluir_benchmarks ?? false
          }
        }
      })

    if (metricasError) {
      logger.warn('Erro ao buscar métricas:', metricasError)
    }

    // Buscar análise de compliance
    const { data: compliance, error: complianceError } = await supabase.functions
      .invoke('documentos-analytics-service', {
        body: {
          empresa_id: empresaId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          operation: 'analyze_compliance'
        }
      })

    if (complianceError) {
      logger.warn('Erro ao buscar compliance:', complianceError)
    }

    // Buscar insights de IA
    const { data: insights, error: insightsError } = await supabase.functions
      .invoke('documentos-analytics-service', {
        body: {
          empresa_id: empresaId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          operation: 'generate_insights',
          options: {
            insight_type: 'completo'
          }
        }
      })

    if (insightsError) {
      logger.warn('Erro ao buscar insights:', insightsError)
    }

    // Processar dados mensais
    const dadosMensais = processarDadosMensais(metricas?.result?.metricas_mensais || [])

    // Montar objeto de comparação
    const empresaComparison: EmpresaComparison = {
      id: empresa.id,
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      regime_tributario: empresa.regime_tributario || 'Não definido',
      metricas: {
        faturamento_anual: metricas?.result?.faturamento_total || 0,
        faturamento_mes_atual: metricas?.result?.faturamento_mes_atual || 0,
        crescimento_percentual: metricas?.result?.crescimento_percentual || 0,
        total_documentos: metricas?.result?.total_documentos || 0,
        documentos_processados: metricas?.result?.documentos_processados || 0,
        compliance_score: compliance?.result?.score_geral || 0,
        margem_limite_simples: metricas?.result?.margem_limite_simples || 0,
        projecao_anual: metricas?.result?.projecao_anual || 0
      },
      insights: {
        pontos_fortes: insights?.result?.pontos_fortes || [],
        areas_melhoria: insights?.result?.areas_melhoria || [],
        alertas_criticos: insights?.result?.alertas_criticos || [],
        recomendacoes: insights?.result?.recomendacoes || []
      },
      dados_mensais: dadosMensais
    }

    return empresaComparison

  } catch (error) {
    logger.error('Erro ao buscar dados de comparação:', error)
    throw error
  }
}

/**
 * Converter período em número de meses
 */
function getPeriodMonths(periodo: string): number {
  switch (periodo) {
    case '3m': return 3
    case '6m': return 6
    case '12m': return 12
    case '24m': return 24
    default: return 12
  }
}

/**
 * Processar dados mensais para gráficos
 */
function processarDadosMensais(metricasMensais: any[]): Array<{
  mes: string
  faturamento: number
  documentos: number
  compliance: number
}> {
  return metricasMensais.map(metrica => ({
    mes: metrica.mes || '',
    faturamento: metrica.receita_total || 0,
    documentos: metrica.documentos_processados || 0,
    compliance: metrica.compliance_score || 0
  }))
}

/**
 * Hook para exportar dados de comparação
 */
export function useComparisonExport() {
  const exportToExcel = async (dadosComparacao: EmpresaComparison[]) => {
    // Implementar exportação para Excel
    logger.info('Exportando dados para Excel', { empresas: dadosComparacao.length })
    
    // TODO: Implementar exportação real
    const csvData = dadosComparacao.map(empresa => ({
      Nome: empresa.nome,
      CNPJ: empresa.cnpj,
      Regime: empresa.regime_tributario,
      'Faturamento Anual': empresa.metricas.faturamento_anual,
      'Crescimento %': empresa.metricas.crescimento_percentual,
      'Total Documentos': empresa.metricas.total_documentos,
      'Compliance Score': empresa.metricas.compliance_score
    }))

    // Simular download
    const csvContent = convertToCSV(csvData)
    downloadCSV(csvContent, 'comparacao-empresas.csv')
  }

  const exportToPDF = async (dadosComparacao: EmpresaComparison[]) => {
    // Implementar exportação para PDF
    logger.info('Exportando dados para PDF', { empresas: dadosComparacao.length })
    // TODO: Implementar exportação real
  }

  return {
    exportToExcel,
    exportToPDF
  }
}

// Utilitários para exportação
function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row => Object.values(row).join(','))
  
  return [headers, ...rows].join('\n')
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
