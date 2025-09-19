/**
 * 📊 RELATÓRIOS SERVICE - SIMPLIFICADO
 * ContabilidadePRO - Relatórios essenciais para contador solo
 */

import { supabase } from '@/lib/supabase'
import { cacheUtils } from '@/lib/simple-cache'
import { logger } from '@/lib/simple-logger'

export interface RelatorioBasico {
  id: string
  nome: string
  descricao: string
  tipo: 'DAS' | 'CONSOLIDADO' | 'VENCIMENTOS'
}

export interface FiltrosRelatorio {
  empresa_id?: string
  data_inicio?: string
  data_fim?: string
  status?: string[]
}

export interface DashboardStats {
  total_calculos: number
  valor_total_periodo: number
  calculos_pendentes: number
  empresas_ativas: number
  vencimentos_proximos: number
  crescimento_mensal: number
}

/**
 * Serviço de relatórios simplificado
 */
export class SimpleRelatoriosService {
  /**
   * Templates básicos de relatórios
   */
  getTemplates(): RelatorioBasico[] {
    return [
      {
        id: 'das-mensal',
        nome: 'DAS Mensal',
        descricao: 'Relatório mensal de DAS por empresa',
        tipo: 'DAS'
      },
      {
        id: 'consolidado',
        nome: 'Consolidado',
        descricao: 'Relatório consolidado de impostos',
        tipo: 'CONSOLIDADO'
      },
      {
        id: 'vencimentos',
        nome: 'Vencimentos',
        descricao: 'Impostos com vencimento próximo',
        tipo: 'VENCIMENTOS'
      }
    ]
  }

  /**
   * Busca dados para relatório consolidado
   */
  async getDadosConsolidado(filtros: FiltrosRelatorio): Promise<any[]> {
    try {
      // Verificar cache primeiro
      const cacheKey = `consolidado:${JSON.stringify(filtros)}`
      const cached = cacheUtils.getRelatorio('system', cacheKey)
      if (cached && Array.isArray(cached)) return cached

      let query = supabase
        .from('calculos_fiscais')
        .select(`
          id,
          tipo_calculo,
          competencia,
          valor_total,
          status,
          data_vencimento,
          created_at,
          empresas!inner(
            id,
            nome,
            cnpj,
            regime_tributario
          )
        `)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filtros.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id)
      }

      if (filtros.data_inicio && filtros.data_fim) {
        query = query.gte('competencia', filtros.data_inicio)
                     .lte('competencia', filtros.data_fim)
      }

      if (filtros.status?.length) {
        query = query.in('status', filtros.status)
      }

      const { data, error } = await query

      if (error) throw error

      const result = data || []

      // Cachear resultado
      cacheUtils.setRelatorio('system', cacheKey, result)

      return result

    } catch (error) {
      logger.error('Erro ao buscar dados consolidados', { error, filtros })
      throw new Error('Erro ao buscar dados do relatório')
    }
  }

  /**
   * Estatísticas do dashboard (simplificadas)
   */
  async getDashboardStats(user_id: string): Promise<DashboardStats> {
    try {
      // Verificar cache
      const cached = cacheUtils.getRelatorio(user_id, 'dashboard_stats')
      if (cached) return cached as DashboardStats

      const dataInicio = new Date()
      dataInicio.setDate(dataInicio.getDate() - 30) // Últimos 30 dias

      // Buscar cálculos recentes
      const { data: calculos, error } = await supabase
        .from('calculos_fiscais')
        .select(`
          id,
          empresa_id,
          valor_total,
          status,
          data_vencimento,
          created_at,
          empresas!inner(user_id)
        `)
        .gte('created_at', dataInicio.toISOString())
        .eq('empresas.user_id', user_id)

      if (error) throw error

      const dados = calculos || []

      // Calcular estatísticas básicas
      const stats: DashboardStats = {
        total_calculos: dados.length,
        valor_total_periodo: dados.reduce((sum, calc) => sum + (calc.valor_total || 0), 0),
        calculos_pendentes: dados.filter(calc => calc.status === 'pendente').length,
        empresas_ativas: new Set(dados.map(calc => calc.empresa_id)).size,
        vencimentos_proximos: this.calcularVencimentosProximos(dados),
        crescimento_mensal: 0 // Simplificado por enquanto
      }

      // Cachear por 10 minutos
      cacheUtils.setRelatorio(user_id, 'dashboard_stats', stats)

      return stats

    } catch (error) {
      logger.error('Erro ao gerar estatísticas do dashboard', { error, user_id })
      throw new Error('Erro ao gerar estatísticas do dashboard')
    }
  }

  /**
   * Histórico simples de relatórios
   */
  async getHistorico(user_id: string, limit = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('calculos_fiscais')
        .select(`
          id,
          tipo_calculo,
          competencia,
          valor_total,
          status,
          created_at,
          empresas!inner(nome, user_id)
        `)
        .eq('empresas.user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data || []).map(calc => ({
        id: calc.id,
        titulo: `${calc.tipo_calculo} - ${calc.competencia}`,
        tipo: calc.tipo_calculo,
        periodo: calc.competencia,
        valor_total: calc.valor_total,
        status: calc.status,
        created_at: calc.created_at,
        empresa: (calc.empresas as any)?.nome || 'N/A'
      }))

    } catch (error) {
      logger.error('Erro ao buscar histórico de relatórios', { error, user_id, limit })
      throw new Error('Erro ao buscar histórico de relatórios')
    }
  }

  /**
   * Exportar dados em CSV simples
   */
  exportarCSV(dados: any[], titulo: string): { csv: string; filename: string } {
    if (!dados.length) {
      return { csv: '', filename: `${titulo}_vazio.csv` }
    }

    const headers = Object.keys(dados[0])
    const csvHeaders = headers.join(',')

    const csvRows = dados.map(item =>
      headers.map(header => {
        const value = item[header] || ''
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value
      }).join(',')
    )

    const csv = [csvHeaders, ...csvRows].join('\n')
    const filename = `${titulo}_${new Date().toISOString().split('T')[0]}.csv`

    return { csv, filename }
  }

  /**
   * Calcular vencimentos próximos (próximos 7 dias)
   */
  private calcularVencimentosProximos(dados: any[]): number {
    const hoje = new Date()
    const proximosSete = new Date()
    proximosSete.setDate(hoje.getDate() + 7)

    return dados.filter(calc => {
      if (!calc.data_vencimento || calc.status !== 'pendente') return false

      const vencimento = new Date(calc.data_vencimento)
      return vencimento >= hoje && vencimento <= proximosSete
    }).length
  }
}

// Instância singleton
export const relatoriosService = new SimpleRelatoriosService()