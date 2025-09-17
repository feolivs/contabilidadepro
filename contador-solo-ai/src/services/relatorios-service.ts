import { supabase } from '@/lib/supabase'
import { logger } from './structured-logger'
import { AIContextService } from './ai-context-service'
import { contextAwareInsightsService } from './context-aware-insights'
import { predictiveAnalyticsFiscalService } from './predictive-analytics-fiscal'

export interface RelatorioTemplate {
  id: string
  nome: string
  descricao: string
  tipo: 'DAS' | 'IRPJ' | 'CONSOLIDADO' | 'ALERTAS' | 'PERFORMANCE'
  campos: string[]
  categoria: 'fiscal' | 'gerencial' | 'compliance'
  formato_padrao: 'PDF' | 'EXCEL' | 'CSV'
}

export interface RelatorioFiltros {
  empresa_id?: string
  data_inicio?: string
  data_fim?: string
  tipos_calculo?: string[]
  status?: string[]
  regime_tributario?: string[]
}

export interface RelatorioOpcoes {
  formato: 'PDF' | 'EXCEL' | 'CSV'
  incluir_graficos?: boolean
  incluir_detalhamento?: boolean
  agrupar_por?: 'empresa' | 'tipo' | 'periodo'
  ordenar_por?: 'data' | 'valor' | 'empresa'
  ordem?: 'asc' | 'desc'
}

export interface RelatorioResultado {
  id: string
  template_id: string
  user_id: string
  dados: any
  arquivo_url?: string
  formato: string
  status: 'processando' | 'concluido' | 'erro'
  created_at: string
  metadata: {
    total_registros: number
    periodo: string
    filtros_aplicados: RelatorioFiltros
  }
}

export interface RelatorioHistorico {
  id: string
  titulo: string
  tipo: string
  periodo: string
  valor_total: number
  status: string
  created_at: string
  empresa: string
}

export interface DashboardStats {
  total_calculos: number
  valor_total_periodo: number
  calculos_pendentes: number
  empresas_ativas: number
  crescimento_mensal: number
  distribuicao_por_tipo: Record<string, number>
  vencimentos_proximos: number
  insights_ia?: RelatorioInsight[]
  projecoes_fiscais?: ProjecaoFiscal[]
  alertas_compliance?: AlertaCompliance[]
}

export interface RelatorioInsight {
  id: string
  tipo: 'economia' | 'risco' | 'oportunidade' | 'alerta'
  titulo: string
  descricao: string
  impacto_financeiro?: number
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  categoria: 'fiscal' | 'compliance' | 'operacional'
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
  tipo: 'vencimento' | 'irregularidade' | 'oportunidade'
  severidade: 'info' | 'warning' | 'error' | 'critical'
  titulo: string
  descricao: string
  prazo_acao?: string
  empresa_id?: string
}

export class RelatoriosService {
  private static instance: RelatoriosService
  private aiContextService: AIContextService

  private constructor() {
    this.aiContextService = AIContextService.getInstance()
  }

  public static getInstance(): RelatoriosService {
    if (!RelatoriosService.instance) {
      RelatoriosService.instance = new RelatoriosService()
    }
    return RelatoriosService.instance
  }

  /**
   * Buscar templates de relatórios disponíveis
   */
  async getTemplatesRelatorio(): Promise<RelatorioTemplate[]> {
    try {
      logger.info('Buscando templates de relatórios')

      // Por enquanto retornamos templates estáticos
      // Em produção, buscar do banco de dados
      const templates: RelatorioTemplate[] = [
        {
          id: 'das-mensal',
          nome: 'DAS Mensal',
          descricao: 'Relatório mensal de DAS por empresa',
          tipo: 'DAS',
          campos: ['empresa', 'competencia', 'valor', 'status', 'vencimento'],
          categoria: 'fiscal',
          formato_padrao: 'PDF'
        },
        {
          id: 'consolidado-trimestral',
          nome: 'Consolidado Trimestral',
          descricao: 'Relatório consolidado de todos os impostos por trimestre',
          tipo: 'CONSOLIDADO',
          campos: ['empresa', 'periodo', 'das', 'irpj', 'csll', 'total'],
          categoria: 'fiscal',
          formato_padrao: 'EXCEL'
        },
        {
          id: 'vencimentos-proximos',
          nome: 'Vencimentos Próximos',
          descricao: 'Relatório de impostos com vencimento nos próximos 30 dias',
          tipo: 'ALERTAS',
          campos: ['empresa', 'tipo', 'valor', 'vencimento', 'dias_restantes'],
          categoria: 'gerencial',
          formato_padrao: 'PDF'
        },
        {
          id: 'performance-mensal',
          nome: 'Performance Mensal',
          descricao: 'Análise de performance e eficiência fiscal mensal',
          tipo: 'PERFORMANCE',
          campos: ['empresa', 'eficiencia', 'economia', 'alertas', 'recomendacoes'],
          categoria: 'gerencial',
          formato_padrao: 'EXCEL'
        }
      ]

      logger.info('Templates carregados com sucesso', { count: templates.length })
      return templates

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Erro ao buscar templates', { error: errorMessage })
      throw new Error(`Erro ao buscar templates: ${errorMessage}`)
    }
  }

  /**
   * Buscar histórico de relatórios gerados
   */
  async getHistoricoRelatorios(user_id: string, limit = 50): Promise<RelatorioHistorico[]> {
    try {
      logger.info('Buscando histórico de relatórios', { user_id, limit })

      // Como a tabela relatorios_gerados não existe, vamos buscar dos calculos_fiscais
      const { data, error } = await supabase
        .from('calculos_fiscais')
        .select(`
          id,
          tipo_calculo,
          competencia,
          valor_total,
          status,
          created_at,
          empresas!empresa_id(nome, cnpj)
        `)
        .eq('empresas.user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Erro na consulta: ${error.message}`)
      }

      // Transformar dados para o formato esperado
      const relatorios = (data || []).map(calc => ({
        id: calc.id,
        titulo: `${calc.tipo_calculo} - ${calc.competencia}`,
        tipo: calc.tipo_calculo,
        periodo: calc.competencia,
        valor_total: calc.valor_total,
        status: calc.status,
        created_at: calc.created_at,
        empresa: (calc.empresas as any)?.nome || 'N/A'
      }))

      logger.info('Histórico carregado com sucesso', { count: relatorios.length })
      return relatorios

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Erro ao buscar histórico', { error: errorMessage, user_id })
      throw new Error(`Erro ao buscar histórico: ${errorMessage}`)
    }
  }

  /**
   * Buscar dados para relatório consolidado
   */
  async getDadosRelatorioConsolidado(filtros: RelatorioFiltros): Promise<any> {
    try {
      logger.info('Buscando dados para relatório consolidado', { filtros })

      let query = supabase
        .from('calculos_fiscais')
        .select(`
          id,
          tipo_calculo,
          competencia,
          valor_total,
          status,
          data_vencimento,
          codigo_barras,
          linha_digitavel,
          created_at,
          empresas!inner(
            id,
            nome,
            cnpj,
            regime_tributario
          )
        `)
        .gte('competencia', filtros.data_inicio)
        .lte('competencia', filtros.data_fim)
        .order('created_at', { ascending: false })

      // Aplicar filtros opcionais
      if (filtros.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id)
      }

      if (filtros.tipos_calculo && filtros.tipos_calculo.length > 0) {
        query = query.in('tipo_calculo', filtros.tipos_calculo)
      }

      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status)
      }

      if (filtros.regime_tributario && filtros.regime_tributario.length > 0) {
        query = query.in('empresas.regime_tributario', filtros.regime_tributario)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Erro na consulta: ${error.message}`)
      }

      logger.info('Dados carregados com sucesso', { count: data?.length || 0 })
      return data || []

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Erro ao buscar dados consolidados', { error: errorMessage, filtros })
      throw new Error(`Erro ao buscar dados: ${errorMessage}`)
    }
  }

  /**
   * Gerar estatísticas do dashboard com inteligência artificial
   */
  async getDashboardStats(user_id: string, periodo_dias = 30): Promise<DashboardStats> {
    try {
      logger.info('Gerando estatísticas do dashboard com IA', { user_id, periodo_dias })

      const dataInicio = new Date()
      dataInicio.setDate(dataInicio.getDate() - periodo_dias)
      const dataFim = new Date()

      // Buscar cálculos do período com mais detalhes
      const { data: calculos, error } = await supabase
        .from('calculos_fiscais')
        .select(`
          id,
          empresa_id,
          tipo_calculo,
          valor_total,
          aliquota_efetiva,
          status,
          data_vencimento,
          competencia,
          created_at,
          empresas!inner(
            id,
            nome,
            cnpj,
            regime_tributario,
            atividade_principal
          )
        `)
        .gte('created_at', dataInicio.toISOString())
        .lte('created_at', dataFim.toISOString())
        .eq('empresas.user_id', user_id)

      if (error) {
        throw new Error(`Erro na consulta: ${error.message}`)
      }

      const dados = calculos || []

      // Calcular estatísticas básicas
      const statsBasicas = {
        total_calculos: dados.length,
        valor_total_periodo: dados.reduce((sum, calc) => sum + (calc.valor_total || 0), 0),
        calculos_pendentes: dados.filter(calc => calc.status === 'pendente').length,
        empresas_ativas: new Set(dados.map(calc => calc.empresas?.[0]?.id).filter(Boolean)).size,
        crescimento_mensal: await this.calcularCrescimentoMensal(user_id, periodo_dias),
        distribuicao_por_tipo: dados.reduce((acc, calc) => {
          acc[calc.tipo_calculo] = (acc[calc.tipo_calculo] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        vencimentos_proximos: dados.filter(calc => {
          const vencimento = new Date(calc.data_vencimento)
          const hoje = new Date()
          const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
          return diasRestantes <= 7 && diasRestantes >= 0
        }).length
      }

      // Gerar insights inteligentes em paralelo
      const [insights, projecoes, alertas] = await Promise.allSettled([
        this.gerarInsightsIA(user_id, dados),
        this.gerarProjecoesFiscais(user_id, dados),
        this.gerarAlertasCompliance(user_id, dados)
      ])

      const stats: DashboardStats = {
        ...statsBasicas,
        insights_ia: insights.status === 'fulfilled' ? insights.value : [],
        projecoes_fiscais: projecoes.status === 'fulfilled' ? projecoes.value : [],
        alertas_compliance: alertas.status === 'fulfilled' ? alertas.value : []
      }

      logger.info('Estatísticas com IA geradas com sucesso', {
        stats: {
          ...statsBasicas,
          insights_count: stats.insights_ia?.length || 0,
          projecoes_count: stats.projecoes_fiscais?.length || 0,
          alertas_count: stats.alertas_compliance?.length || 0
        }
      })

      return stats

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Erro ao gerar estatísticas', { error: errorMessage, user_id })
      throw new Error(`Erro ao gerar estatísticas: ${errorMessage}`)
    }
  }

  /**
   * Gerar relatório em PDF via Edge Function
   */
  async gerarRelatorioPDF(
    template_id: string,
    filtros: RelatorioFiltros,
    opcoes: RelatorioOpcoes,
    user_id: string
  ): Promise<{ pdf_url: string; relatorio_id: string }> {
    try {
      logger.info('Iniciando geração de relatório PDF', { template_id, filtros, opcoes, user_id })

      const { data, error } = await supabase.functions.invoke('gerar-relatorio-pdf', {
        body: {
          template_id,
          filtros,
          opcoes,
          user_id
        }
      })

      if (error) {
        throw new Error(`Erro na Edge Function: ${error.message}`)
      }

      logger.info('Relatório PDF gerado com sucesso', { pdf_url: data.pdf_url })
      return data

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Erro ao gerar relatório PDF', { error: errorMessage, template_id, user_id })
      throw new Error(`Erro ao gerar relatório: ${errorMessage}`)
    }
  }

  /**
   * Exportar dados em formato Excel/CSV
   */
  async exportarDados(
    dados: any[],
    formato: 'EXCEL' | 'CSV',
    nome_arquivo: string
  ): Promise<{ download_url: string }> {
    try {
      logger.info('Iniciando exportação de dados', { formato, nome_arquivo, count: dados.length })

      // Implementar lógica de exportação
      // Por enquanto, simular URL de download
      const download_url = `https://storage.supabase.co/exports/${nome_arquivo}-${Date.now()}.${formato.toLowerCase()}`

      logger.info('Exportação concluída', { download_url })
      return { download_url }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.error('Erro ao exportar dados', { error: errorMessage, formato })
      throw new Error(`Erro na exportação: ${errorMessage}`)
    }
  }

  /**
   * Calcular crescimento mensal comparando períodos
   */
  private async calcularCrescimentoMensal(user_id: string, periodo_dias: number): Promise<number> {
    try {
      const dataAtual = new Date()
      const dataInicioAtual = new Date()
      dataInicioAtual.setDate(dataAtual.getDate() - periodo_dias)

      const dataInicioAnterior = new Date()
      dataInicioAnterior.setDate(dataInicioAtual.getDate() - periodo_dias)

      // Buscar dados do período atual
      const { data: calculosAtuais } = await supabase
        .from('calculos_fiscais')
        .select('valor_total, empresas!empresa_id(user_id)')
        .gte('created_at', dataInicioAtual.toISOString())
        .lte('created_at', dataAtual.toISOString())
        .eq('empresas.user_id', user_id)

      // Buscar dados do período anterior
      const { data: calculosAnteriores } = await supabase
        .from('calculos_fiscais')
        .select('valor_total, empresas!empresa_id(user_id)')
        .gte('created_at', dataInicioAnterior.toISOString())
        .lt('created_at', dataInicioAtual.toISOString())
        .eq('empresas.user_id', user_id)

      const valorAtual = calculosAtuais?.reduce((sum, calc) => sum + (calc.valor_total || 0), 0) || 0
      const valorAnterior = calculosAnteriores?.reduce((sum, calc) => sum + (calc.valor_total || 0), 0) || 0

      if (valorAnterior === 0) return 0

      return ((valorAtual - valorAnterior) / valorAnterior) * 100

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      logger.warn('Erro ao calcular crescimento mensal', { error: errorMessage })
      return 0
    }
  }

  /**
   * Gerar insights inteligentes usando IA
   */
  private async gerarInsightsIA(user_id: string, dados: any[]): Promise<RelatorioInsight[]> {
    try {
      if (dados.length === 0) return []

      // Preparar dados contextuais para IA
      const empresasUnicas = Array.from(new Set(dados.map(d => d.empresa_id)))
      const contextData = {
        total_calculos: dados.length,
        valor_total: dados.reduce((sum, calc) => sum + (calc.valor_total || 0), 0),
        empresas_count: empresasUnicas.length,
        tipos_calculo: Array.from(new Set(dados.map(d => d.tipo_calculo))),
        regimes_tributarios: Array.from(new Set(dados.map(d => d.empresas.regime_tributario)))
      }

      // Usar o serviço de insights contextuais
      const insightsResult = await contextAwareInsightsService.generateContextualInsights({
        userId: user_id,
        empresaId: empresasUnicas[0], // Usar primeira empresa como referência
        analysisType: 'comprehensive',
        contextData: {
          empresa: { id: empresasUnicas[0] },
          calculos: dados || [],
          obrigacoes: [],
          documentos: [],
          historico: []
        },
        focusAreas: ['tax_optimization', 'compliance', 'cash_flow']
      })

      if (!insightsResult.success) {
        logger.warn('Falha ao gerar insights IA', { error: insightsResult.error })
        return []
      }

      // Converter insights da IA para formato do relatório
      return insightsResult.data.map((insight, index) => ({
        id: `insight-${Date.now()}-${index}`,
        tipo: this.mapearTipoInsight(insight.type),
        titulo: insight.title || 'Insight Fiscal',
        descricao: insight.description || '',
        impacto_financeiro: insight.impact?.financial || 0,
        prioridade: this.mapearPrioridade(insight.priority),
        categoria: 'fiscal',
        recomendacoes: insight.actions?.map(action => action.description) || [],
        created_at: new Date().toISOString()
      }))

    } catch (error) {
      logger.error('Erro ao gerar insights IA', {
        error: error instanceof Error ? error.message : String(error),
        user_id
      })
      return []
    }
  }

  /**
   * Gerar projeções fiscais usando IA
   */
  private async gerarProjecoesFiscais(user_id: string, dados: any[]): Promise<ProjecaoFiscal[]> {
    try {
      if (dados.length === 0) return []

      const empresasUnicas = Array.from(new Set(dados.map(d => d.empresa_id)))

      // Usar primeira empresa como referência para projeções
      const empresaId = empresasUnicas[0]
      const regimeTributario = dados.find(d => d.empresa_id === empresaId)?.empresas.regime_tributario || 'Simples Nacional'

      // Preparar dados históricos
      const historicalData = dados
        .filter(d => d.empresa_id === empresaId)
        .map(calc => ({
          periodo: calc.competencia,
          valor: calc.valor_total,
          tipo: calc.tipo_calculo,
          aliquota: calc.aliquota_efetiva
        }))

      // Gerar projeções usando IA
      const projecoesResult = await predictiveAnalyticsFiscalService.generateTaxProjections(
        empresaId,
        regimeTributario,
        historicalData,
        'next_quarter'
      )

      if (!projecoesResult.success) {
        logger.warn('Falha ao gerar projeções fiscais', { error: projecoesResult.error })
        return []
      }

      return projecoesResult.data.map(projecao => ({
        periodo: projecao.periodo,
        tipo_imposto: 'DAS', // Tipo principal para Simples Nacional
        valor_projetado: projecao.impostos.total,
        confianca: 0.8, // Confiança padrão
        tendencia: projecao.aliquotaEfetiva > 0.1 ? 'crescimento' : 'estabilidade' as 'crescimento' | 'estabilidade' | 'reducao',
        fatores_influencia: projecao.riscosIdentificados || []
      }))

    } catch (error) {
      logger.error('Erro ao gerar projeções fiscais', {
        error: error instanceof Error ? error.message : String(error),
        user_id
      })
      return []
    }
  }

  /**
   * Gerar alertas de compliance
   */
  private async gerarAlertasCompliance(user_id: string, dados: any[]): Promise<AlertaCompliance[]> {
    try {
      const alertas: AlertaCompliance[] = []
      const hoje = new Date()

      // Alertas de vencimento próximo
      dados.forEach(calc => {
        if (calc.status === 'pendente' && calc.data_vencimento) {
          const vencimento = new Date(calc.data_vencimento)
          const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

          if (diasRestantes <= 7 && diasRestantes >= 0) {
            alertas.push({
              id: `vencimento-${calc.id}`,
              tipo: 'vencimento',
              severidade: diasRestantes <= 2 ? 'critical' : diasRestantes <= 5 ? 'error' : 'warning',
              titulo: `${calc.tipo_calculo} vence em ${diasRestantes} dias`,
              descricao: `${calc.empresas.nome} - ${calc.tipo_calculo} no valor de R$ ${calc.valor_total?.toFixed(2)}`,
              prazo_acao: calc.data_vencimento,
              empresa_id: calc.empresa_id
            })
          }
        }
      })

      // Alertas de irregularidades (valores muito altos ou baixos)
      const valorMedio = dados.reduce((sum, calc) => sum + (calc.valor_total || 0), 0) / dados.length
      const desvio = valorMedio * 0.5 // 50% de desvio

      dados.forEach(calc => {
        if (calc.valor_total > valorMedio + desvio) {
          alertas.push({
            id: `alto-valor-${calc.id}`,
            tipo: 'irregularidade',
            severidade: 'warning',
            titulo: 'Valor de imposto acima da média',
            descricao: `${calc.empresas.nome} - ${calc.tipo_calculo}: R$ ${calc.valor_total?.toFixed(2)} (média: R$ ${valorMedio.toFixed(2)})`,
            empresa_id: calc.empresa_id
          })
        }
      })

      return alertas

    } catch (error) {
      logger.error('Erro ao gerar alertas compliance', {
        error: error instanceof Error ? error.message : String(error),
        user_id
      })
      return []
    }
  }

  /**
   * Mapear tipo de insight da IA para formato do relatório
   */
  private mapearTipoInsight(type: 'financial' | 'compliance' | 'optimization' | 'alert' | 'recommendation'): 'economia' | 'risco' | 'oportunidade' | 'alerta' {
    switch (type) {
      case 'financial':
      case 'optimization':
        return 'economia'
      case 'compliance':
        return 'risco'
      case 'recommendation':
        return 'oportunidade'
      case 'alert':
        return 'alerta'
      default:
        return 'oportunidade'
    }
  }

  /**
   * Mapear prioridade da IA para formato do relatório
   */
  private mapearPrioridade(priority: string): 'baixa' | 'media' | 'alta' | 'critica' {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'critica'
      case 'high':
        return 'alta'
      case 'medium':
        return 'media'
      case 'low':
      default:
        return 'baixa'
    }
  }
}

// Instância singleton
export const relatoriosService = RelatoriosService.getInstance()
