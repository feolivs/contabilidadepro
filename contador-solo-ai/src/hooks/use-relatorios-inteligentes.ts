import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/providers/auth-provider'
import { supabase } from '@/lib/supabase'

// Tipos simplificados para os hooks
export interface DashboardStats {
  total_calculos: number
  valor_total_periodo: number
  calculos_pendentes: number
  empresas_ativas: number
  crescimento_mensal: number
  vencimentos_proximos: number
  distribuicao_por_tipo: Record<string, number>
  insights_ia?: RelatorioInsight[]
  alertas_compliance?: AlertaCompliance[]
}

export interface RelatorioInsight {
  id: string
  tipo: 'oportunidade' | 'risco' | 'alerta' | 'otimizacao'
  titulo: string
  descricao: string
  impacto_financeiro?: number
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  categoria: 'fiscal' | 'compliance' | 'financeiro' | 'operacional'
  recomendacoes: string[]
  created_at: string
}

export interface ProjecaoFiscal {
  periodo: string
  tipo_imposto: string
  valor_projetado: number
  confianca: number
  tendencia: 'crescimento' | 'estabilidade' | 'reducao'
  fatores_influencia: string[]
}

export interface AlertaCompliance {
  id: string
  severidade: 'info' | 'warning' | 'error' | 'critical'
  titulo: string
  descricao: string
  categoria: 'compliance' | 'fiscal' | 'prazo'
  data_deteccao: string
  status: 'ativo' | 'resolvido' | 'ignorado'
  recomendacoes: string[]
}

/**
 * Hook para estatísticas inteligentes do dashboard
 */
export function useDashboardStatsInteligentes(periodo_dias = 30) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['dashboard-stats-inteligentes', user?.id, periodo_dias],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      try {
        // Buscar dados básicos dos últimos X dias
        const dataInicio = new Date(Date.now() - periodo_dias * 24 * 60 * 60 * 1000)

        const { data: calculos, error } = await supabase
          .from('calculos_fiscais')
          .select(`
            id,
            tipo_calculo,
            valor_total,
            status,
            data_vencimento,
            created_at,
            empresa_id,
            empresas!empresa_id(id, nome, cnpj, regime_tributario, user_id)
          `)
          .eq('empresas.user_id', user.id)
          .gte('created_at', dataInicio.toISOString())
          .order('created_at', { ascending: false })

        if (error) {
          throw new Error(`Erro ao buscar dados: ${error.message}`)
        }

        const dados = calculos || []

        // Calcular estatísticas básicas
        const total_calculos = dados.length
        const valor_total_periodo = dados.reduce((sum, calc) => sum + (calc.valor_total || 0), 0)
        const calculos_pendentes = dados.filter(calc => calc.status === 'pendente').length
        const empresas_ativas = new Set(dados.map(calc => calc.empresa_id).filter(Boolean)).size

        // Calcular vencimentos próximos (próximos 7 dias)
        const hoje = new Date()
        const seteDiasFrente = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
        const vencimentos_proximos = dados.filter(calc => {
          const vencimento = new Date(calc.data_vencimento)
          return vencimento >= hoje && vencimento <= seteDiasFrente && calc.status === 'pendente'
        }).length

        // Distribuição por tipo
        const distribuicao_por_tipo = dados.reduce((acc, calc) => {
          const tipo = calc.tipo_calculo || 'outros'
          acc[tipo] = (acc[tipo] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        // Calcular crescimento mensal (comparar com período anterior)
        const periodoAnterior = new Date(dataInicio.getTime() - periodo_dias * 24 * 60 * 60 * 1000)

        const { data: calculosAnteriores } = await supabase
          .from('calculos_fiscais')
          .select('id, empresa_id, empresas!empresa_id(id, user_id)')
          .eq('empresas.user_id', user.id)
          .gte('created_at', periodoAnterior.toISOString())
          .lt('created_at', dataInicio.toISOString())

        const totalAnterior = calculosAnteriores?.length || 0
        const crescimento_mensal = totalAnterior > 0
          ? ((total_calculos - totalAnterior) / totalAnterior) * 100
          : 0

        return {
          total_calculos,
          valor_total_periodo,
          calculos_pendentes,
          empresas_ativas,
          crescimento_mensal,
          vencimentos_proximos,
          distribuicao_por_tipo
        }

      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
        throw error
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Atualizar a cada 10 minutos
  })
}

/**
 * Hook simplificado para análise de anomalias e compliance
 */
export function useAnaliseAnomalias(empresa_id?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['analise-anomalias', empresa_id, user?.id],
    queryFn: async (): Promise<AlertaCompliance[]> => {
      if (!user?.id) {
        return []
      }

      try {
        // Buscar dados para análise básica de anomalias
        let query = supabase
          .from('calculos_fiscais')
          .select(`
            id,
            tipo_calculo,
            valor_total,
            status,
            data_vencimento,
            created_at,
            empresa_id,
            empresas!empresa_id(id, nome, cnpj, regime_tributario, user_id)
          `)
          .eq('empresas.user_id', user.id)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

        if (empresa_id) {
          query = query.eq('empresa_id', empresa_id)
        }

        const { data: calculos, error } = await query.order('created_at', { ascending: false })

        if (error) {
          throw new Error(`Erro ao buscar dados: ${error.message}`)
        }

        const dados = calculos || []
        const alertas: AlertaCompliance[] = []

        // Análise básica de anomalias
        if (dados.length > 0) {
          // Verificar vencimentos em atraso
          const hoje = new Date()
          const atrasados = dados.filter(calc => {
            const vencimento = new Date(calc.data_vencimento)
            return vencimento < hoje && calc.status === 'pendente'
          })

          if (atrasados.length > 0) {
            alertas.push({
              id: `alerta-atraso-${empresa_id || 'geral'}`,
              severidade: 'critical',
              titulo: `${atrasados.length} impostos em atraso`,
              descricao: `Há ${atrasados.length} impostos vencidos que precisam ser pagos urgentemente`,
              categoria: 'compliance',
              data_deteccao: new Date().toISOString(),
              status: 'ativo',
              recomendacoes: [
                'Efetuar pagamentos em atraso imediatamente',
                'Calcular juros e multas',
                'Verificar possibilidade de parcelamento'
              ]
            })
          }

          // Verificar valores anômalos
          const valores = dados.map(calc => calc.valor_total || 0).filter(v => v > 0)
          if (valores.length > 3) {
            const media = valores.reduce((sum, val) => sum + val, 0) / valores.length
            const desvio = Math.sqrt(valores.reduce((sum, val) => sum + Math.pow(val - media, 2), 0) / valores.length)
            const limite = media + (2 * desvio)

            const valoresAnômalos = dados.filter(calc => (calc.valor_total || 0) > limite)

            if (valoresAnômalos.length > 0) {
              alertas.push({
                id: `alerta-valores-${empresa_id || 'geral'}`,
                severidade: 'warning',
                titulo: `${valoresAnômalos.length} valores anômalos`,
                descricao: `Detectados valores significativamente acima da média`,
                categoria: 'compliance',
                data_deteccao: new Date().toISOString(),
                status: 'ativo',
                recomendacoes: [
                  'Revisar cálculos com valores elevados',
                  'Verificar dados de entrada',
                  'Consultar contador para validação'
                ]
              })
            }
          }
        }

        return alertas

      } catch (error) {
        console.error('Erro ao analisar anomalias:', error)
        return []
      }
    },
    enabled: !!user?.id,
    staleTime: 30 * 60 * 1000, // 30 minutos
  })
}

/**
 * Hook simplificado para relatório inteligente
 */
export function useRelatorioInteligente() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      tipo: string
      periodo: string
      empresa_id?: string
    }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      try {
        // Buscar dados básicos para o relatório
        const { data: calculos, error } = await supabase
          .from('calculos_fiscais')
          .select(`
            id,
            tipo_calculo,
            valor_total,
            status,
            data_vencimento,
            created_at,
            empresa_id,
            empresas!empresa_id(id, nome, cnpj, regime_tributario, user_id)
          `)
          .eq('empresas.user_id', user.id)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })

        if (error) {
          throw new Error(`Erro ao buscar dados: ${error.message}`)
        }

        const dados = calculos || []

        // Gerar relatório básico com insights
        const relatorio = {
          id: `relatorio-${Date.now()}`,
          tipo: params.tipo,
          periodo: params.periodo,
          data_geracao: new Date().toISOString(),
          total_calculos: dados.length,
          valor_total: dados.reduce((sum, calc) => sum + (calc.valor_total || 0), 0),
          empresas_analisadas: new Set(dados.map(calc => calc.empresa_id).filter(Boolean)).size,
          insights: [
            {
              titulo: 'Resumo do Período',
              descricao: `Foram processados ${dados.length} cálculos fiscais no período analisado`,
              tipo: 'informativo'
            }
          ],
          dados_detalhados: dados.slice(0, 20) // Limitar para performance
        }

        return relatorio

      } catch (error) {
        console.error('Erro ao gerar relatório inteligente:', error)
        throw error
      }
    },
    onSuccess: () => {
      toast.success('Relatório inteligente gerado com sucesso!')
      // Invalidar cache relacionado
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats-inteligentes'] })
    },
    onError: (error) => {
      console.error('Erro ao gerar relatório:', error)
      toast.error('Erro ao gerar relatório inteligente')
    }
  })
}
