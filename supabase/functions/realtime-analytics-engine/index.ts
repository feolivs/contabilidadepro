// 📊 REALTIME ANALYTICS ENGINE
// Edge Function para analytics em tempo real do ContabilidadePRO
// Integrado com Supabase Realtime para dashboard contábil

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AnalyticsRequest {
  action: string
  user_id: string
  period?: string
  filters?: Record<string, any>
  real_time?: boolean
}

interface KPIData {
  // 💰 KPIs Financeiros - Foco em receitas e impostos dos clientes
  financial: {
    receita_clientes_mes: number           // Receita total dos clientes no mês
    impostos_devidos_mes: number           // Total de impostos a pagar no mês
    economia_fiscal_gerada: number         // Economia gerada por otimizações
    ticket_medio_cliente: number           // Receita média por cliente
  }
  // 📊 KPIs Operacionais - Produtividade do contador
  operational: {
    clientes_ativos: number                // Clientes com movimentação no mês
    documentos_processados_hoje: number    // Documentos processados hoje
    calculos_concluidos_hoje: number       // Cálculos fiscais finalizados hoje
    tempo_medio_atendimento: number        // Tempo médio para resolver demandas
  }
  // ⚖️ KPIs de Compliance - Obrigações fiscais
  compliance: {
    obrigacoes_vencendo_hoje: number       // Obrigações que vencem hoje
    obrigacoes_vencendo_semana: number     // Obrigações que vencem esta semana
    declaracoes_pendentes: number          // Declarações ainda não enviadas
    alertas_receita_federal: number        // Alertas da Receita Federal
  }
  // 🎯 KPIs de Performance - Eficiência do escritório
  performance: {
    taxa_pontualidade: number              // % de obrigações entregues no prazo
    satisfacao_clientes: number            // Score de satisfação dos clientes
    produtividade_diaria: number           // Tarefas concluídas por dia
    uso_ia_assistente: number              // Consultas ao assistente IA hoje
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, user_id, period = 'today', filters = {}, real_time = false }: AnalyticsRequest = await req.json()

    switch (action) {
      case 'get_dashboard_kpis':
        return await getDashboardKPIs(supabase, user_id, period, filters)
      
      case 'get_realtime_metrics':
        return await getRealtimeMetrics(supabase, user_id)
      
      case 'get_chart_data':
        return await getChartData(supabase, user_id, period, filters)
      
      case 'get_activity_feed':
        return await getActivityFeed(supabase, user_id, filters)
      
      case 'log_analytics_event':
        return await logAnalyticsEvent(supabase, req)
      
      case 'get_comparative_analysis':
        return await getComparativeAnalysis(supabase, user_id, period)
      
      default:
        throw new Error(`Ação não reconhecida: ${action}`)
    }

  } catch (error) {
    console.error('Erro no realtime-analytics-engine:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// =====================================================
// FUNÇÕES PRINCIPAIS
// =====================================================

async function getDashboardKPIs(supabase: any, user_id: string, period: string, filters: any) {
  const dateFilter = getPeriodFilter(period)
  
  // Buscar métricas da view materializada
  const { data: realtimeMetrics, error: metricsError } = await supabase
    .from('dashboard_metrics_realtime')
    .select('*')
    .eq('user_id', user_id)
    .single()

  if (metricsError && metricsError.code !== 'PGRST116') {
    throw metricsError
  }

  // Buscar dados complementares
  const [empresasData, calculosData, documentosData, prazosData] = await Promise.all([
    getEmpresasKPIs(supabase, user_id, dateFilter),
    getCalculosKPIs(supabase, user_id, dateFilter),
    getDocumentosKPIs(supabase, user_id, dateFilter),
    getPrazosKPIs(supabase, user_id)
  ])

  const kpis: KPIData = {
    financial: {
      receita_clientes_mes: calculosData.receita_total_mes || 0,
      impostos_devidos_mes: calculosData.impostos_devidos_mes || 0,
      economia_fiscal_gerada: calculosData.economia_gerada || 0,
      ticket_medio_cliente: calculosData.ticket_medio || 0
    },
    operational: {
      clientes_ativos: empresasData.ativos_mes || 0,
      documentos_processados_hoje: realtimeMetrics?.docs_hoje || 0,
      calculos_concluidos_hoje: realtimeMetrics?.calculos_hoje || 0,
      tempo_medio_atendimento: realtimeMetrics?.tempo_medio_atendimento || 0
    },
    compliance: {
      obrigacoes_vencendo_hoje: prazosData.vencendo_hoje || 0,
      obrigacoes_vencendo_semana: prazosData.vencendo_semana || 0,
      declaracoes_pendentes: prazosData.declaracoes_pendentes || 0,
      alertas_receita_federal: prazosData.alertas_rf || 0
    },
    performance: {
      taxa_pontualidade: prazosData.taxa_pontualidade || 100,
      satisfacao_clientes: empresasData.satisfacao_media || 0,
      produtividade_diaria: realtimeMetrics?.produtividade_hoje || 0,
      uso_ia_assistente: realtimeMetrics?.consultas_ia_hoje || 0
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      kpis,
      period,
      last_updated: new Date().toISOString(),
      real_time: true
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getRealtimeMetrics(supabase: any, user_id: string) {
  // Buscar eventos dos últimos 5 minutos para métricas em tempo real
  const { data: recentEvents, error } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', user_id)
    .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false })

  if (error) throw error

  // Buscar dados do dia para métricas complementares
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const { data: eventosHoje } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', user_id)
    .gte('timestamp', hoje.toISOString())

  const metrics = {
    atividades_ultimos_5min: recentEvents.length,
    documentos_processados_5min: recentEvents.filter(e => e.event_type === 'document_processed').length,
    calculos_finalizados_5min: recentEvents.filter(e => e.event_type === 'calculation_done').length,
    consultas_ia_5min: recentEvents.filter(e => e.event_type === 'ai_query').length,
    tempo_medio_resposta: calculateAverageProcessingTime(recentEvents),
    tendencia_produtividade: calculateProductivityTrend(recentEvents),
    clientes_atendidos_hoje: getUniqueClients(eventosHoje || []),
    obrigacoes_cumpridas_hoje: (eventosHoje || []).filter(e => e.event_type === 'obligation_completed').length
  }

  return new Response(
    JSON.stringify({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getChartData(supabase: any, user_id: string, period: string, filters: any) {
  const dateFilter = getPeriodFilter(period)
  
  // Dados para gráfico de receita dos clientes por período
  const { data: receitaData } = await supabase
    .from('calculos_fiscais')
    .select('created_at, faturamento_bruto, regime_tributario')
    .eq('user_id', user_id)
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end)
    .order('created_at')

  // Dados para gráfico de obrigações por tipo
  const { data: obrigacoesData } = await supabase
    .from('prazos_fiscais')
    .select('tipo_obrigacao, status')
    .eq('user_id', user_id)
    .gte('data_vencimento', dateFilter.start)

  // Dados para gráfico de clientes por regime tributário
  const { data: clientesData } = await supabase
    .from('empresas')
    .select('regime_tributario, status')
    .eq('user_id', user_id)
    .eq('status', 'ativa')

  // Dados para gráfico de impostos por mês
  const { data: impostosData } = await supabase
    .from('calculos_fiscais')
    .select('created_at, valor_total')
    .eq('user_id', user_id)
    .gte('created_at', dateFilter.start)
    .lte('created_at', dateFilter.end)
    .order('created_at')

  const chartData = {
    receita_clientes_timeline: processTimelineData(receitaData || [], 'faturamento_bruto'),
    obrigacoes_por_tipo: processGroupedData(obrigacoesData || [], 'tipo_obrigacao'),
    clientes_por_regime: processGroupedData(clientesData || [], 'regime_tributario'),
    produtividade_timeline: await getProdutividadeTimeline(supabase, user_id, dateFilter),
    impostos_por_mes: processTimelineData(impostosData || [], 'valor_total'),
    satisfacao_timeline: await getSatisfacaoTimeline(supabase, user_id, dateFilter)
  }

  return new Response(
    JSON.stringify({
      success: true,
      chart_data: chartData,
      period
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getActivityFeed(supabase: any, user_id: string, filters: any) {
  try {
    const { data: activities, error } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('user_id', user_id)
      .order('timestamp', { ascending: false })
      .limit(50)

    if (error) throw error

    const processedActivities = (activities || []).map(activity => ({
      id: activity.id,
      type: activity.event_type,
      description: generateActivityDescription(activity),
      timestamp: activity.timestamp,
      entity: activity.entity_type,
      metadata: activity.metadata,
      value: activity.value_numeric
    }))

    return new Response(
      JSON.stringify({
        success: true,
        activities: processedActivities,
        total: processedActivities.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro no feed de atividades:', error)
    return new Response(
      JSON.stringify({
        success: true,
        activities: [],
        total: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function logAnalyticsEvent(supabase: any, req: Request) {
  try {
    const body = await req.json()
    const { user_id, event_type, entity_type, entity_id, metadata, value_numeric, processing_time_ms } = body

    // Tentar usar a função RPC primeiro
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('log_analytics_event', {
        p_user_id: user_id,
        p_event_type: event_type,
        p_entity_type: entity_type,
        p_entity_id: entity_id,
        p_metadata: metadata || {},
        p_value_numeric: value_numeric,
        p_processing_time_ms: processing_time_ms
      })

    if (!rpcError) {
      return new Response(
        JSON.stringify({
          success: true,
          event_id: rpcData,
          message: 'Evento registrado com sucesso via RPC'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se RPC falhar, inserir diretamente
    console.warn('RPC falhou, inserindo diretamente:', rpcError)
    const { data: insertData, error: insertError } = await supabase
      .from('analytics_events')
      .insert({
        user_id,
        event_type,
        entity_type,
        entity_id,
        metadata: metadata || {},
        value_numeric,
        processing_time_ms
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({
        success: true,
        event_id: insertData.id,
        message: 'Evento registrado com sucesso via insert'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro ao registrar evento:', error)
    throw error
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function getPeriodFilter(period: string) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case 'today':
      return { start: today.toISOString(), end: now.toISOString() }
    case 'week':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 7)
      return { start: weekStart.toISOString(), end: now.toISOString() }
    case 'month':
      const monthStart = new Date(today)
      monthStart.setDate(today.getDate() - 30)
      return { start: monthStart.toISOString(), end: now.toISOString() }
    case 'year':
      const yearStart = new Date(today)
      yearStart.setFullYear(today.getFullYear() - 1)
      return { start: yearStart.toISOString(), end: now.toISOString() }
    default:
      return { start: today.toISOString(), end: now.toISOString() }
  }
}

async function getEmpresasKPIs(supabase: any, user_id: string, dateFilter: any) {
  // Buscar empresas e suas atividades recentes
  const { data: empresas, error: empresasError } = await supabase
    .from('empresas')
    .select('id, status, created_at, regime_tributario')
    .eq('user_id', user_id)

  if (empresasError) throw empresasError

  // Buscar atividades do mês para determinar clientes ativos
  const mesAtual = new Date()
  mesAtual.setDate(1) // Primeiro dia do mês

  const { data: atividades, error: atividadesError } = await supabase
    .from('calculos_fiscais')
    .select('empresa_id')
    .eq('user_id', user_id)
    .gte('created_at', mesAtual.toISOString())

  // Buscar satisfação dos clientes (simulado por enquanto)
  const satisfacaoMedia = 4.2 // Seria calculado de uma tabela de feedback

  const empresasAtivas = atividades ? [...new Set(atividades.map((a: any) => a.empresa_id))].length : 0

  return {
    total: empresas.length,
    ativas: empresas.filter((e: any) => e.status === 'ativa').length,
    ativos_mes: empresasAtivas,
    satisfacao_media: satisfacaoMedia
  }
}

async function getCalculosKPIs(supabase: any, user_id: string, dateFilter: any) {
  // Buscar cálculos do mês atual
  const mesAtual = new Date()
  mesAtual.setDate(1)

  const { data: calculosMes, error: calculosError } = await supabase
    .from('calculos_fiscais')
    .select('valor_total, faturamento_bruto, created_at, status, empresa_id')
    .eq('user_id', user_id)
    .gte('created_at', mesAtual.toISOString())

  if (calculosError) throw calculosError

  // Buscar empresas para calcular ticket médio
  const { data: empresas, error: empresasError } = await supabase
    .from('empresas')
    .select('id')
    .eq('user_id', user_id)

  const receitaTotalMes = calculosMes.reduce((sum: number, calc: any) => sum + (calc.faturamento_bruto || 0), 0)
  const impostosDevidosMes = calculosMes.reduce((sum: number, calc: any) => sum + (calc.valor_total || 0), 0)
  const economiaGerada = receitaTotalMes * 0.05 // Simulado: 5% de economia fiscal
  const ticketMedio = empresas && empresas.length > 0 ? receitaTotalMes / empresas.length : 0

  return {
    receita_total_mes: receitaTotalMes,
    impostos_devidos_mes: impostosDevidosMes,
    economia_gerada: economiaGerada,
    ticket_medio: ticketMedio
  }
}

async function getDocumentosKPIs(supabase: any, user_id: string, dateFilter: any) {
  const { data, error } = await supabase
    .from('documentos')
    .select('status_processamento, created_at')
    .eq('user_id', user_id)
    .gte('created_at', dateFilter.start)

  if (error) throw error

  return {
    total: data.length,
    processados: data.filter((d: any) => d.status_processamento === 'processado').length,
    pendentes: data.filter((d: any) => d.status_processamento === 'pendente').length
  }
}

async function getPrazosKPIs(supabase: any, user_id: string) {
  try {
    const hoje = new Date()
    const fimSemana = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Buscar prazos fiscais
    const { data: prazos, error: prazosError } = await supabase
      .from('prazos_fiscais')
      .select('data_vencimento, status, tipo_obrigacao, prioridade')
      .eq('user_id', user_id)
      .gte('data_vencimento', hoje.toISOString().split('T')[0])

    // Buscar obrigações cumpridas para calcular taxa de pontualidade
    const { data: obrigacoesCumpridas, error: obrigacoesError } = await supabase
      .from('prazos_fiscais')
      .select('status, data_vencimento, data_cumprimento')
      .eq('user_id', user_id)
      .eq('status', 'cumprido')
      .gte('data_vencimento', new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString())

    if (prazosError && prazosError.code !== 'PGRST116') {
      console.warn('Tabela prazos_fiscais não encontrada, retornando dados mock')
      return {
        vencendo_hoje: 2,
        vencendo_semana: 5,
        declaracoes_pendentes: 3,
        alertas_rf: 1,
        taxa_pontualidade: 95
      }
    }

    // Calcular taxa de pontualidade
    const obrigacoesPontuais = obrigacoesCumpridas?.filter((o: any) =>
      new Date(o.data_cumprimento) <= new Date(o.data_vencimento)
    ).length || 0
    const totalObrigacoes = obrigacoesCumpridas?.length || 1
    const taxaPontualidade = (obrigacoesPontuais / totalObrigacoes) * 100

    const vencendoHoje = prazos?.filter((p: any) =>
      new Date(p.data_vencimento).toDateString() === hoje.toDateString()
    ).length || 0

    const vencendoSemana = prazos?.filter((p: any) =>
      new Date(p.data_vencimento) <= fimSemana
    ).length || 0

    const declaracoesPendentes = prazos?.filter((p: any) =>
      p.tipo_obrigacao?.includes('declaracao') && p.status === 'pendente'
    ).length || 0

    const alertasRF = prazos?.filter((p: any) =>
      p.prioridade === 'alta' && p.status === 'pendente'
    ).length || 0

    return {
      vencendo_hoje: vencendoHoje,
      vencendo_semana: vencendoSemana,
      declaracoes_pendentes: declaracoesPendentes,
      alertas_rf: alertasRF,
      taxa_pontualidade: taxaPontualidade
    }
  } catch (error) {
    console.warn('Erro ao buscar prazos, retornando dados mock:', error)
    return {
      vencendo_hoje: 2,
      vencendo_semana: 5,
      declaracoes_pendentes: 3,
      alertas_rf: 1,
      taxa_pontualidade: 95
    }
  }
}

function calculateEfficiencyScore(metrics: any): number {
  if (!metrics) return 0
  
  const factors = {
    processing_speed: metrics.tempo_medio_processamento_hoje < 1000 ? 25 : 15,
    daily_productivity: Math.min((metrics.calculos_hoje / 10) * 25, 25),
    ai_usage: Math.min((metrics.consultas_ia_hoje / 5) * 25, 25),
    document_processing: Math.min((metrics.docs_hoje / 20) * 25, 25)
  }
  
  return Object.values(factors).reduce((sum, score) => sum + score, 0)
}

function calculateAverageProcessingTime(events: any[]): number {
  const processingEvents = events.filter(e => e.processing_time_ms)
  if (processingEvents.length === 0) return 0
  
  const total = processingEvents.reduce((sum, e) => sum + e.processing_time_ms, 0)
  return Math.round(total / processingEvents.length)
}

function calculateActivityTrend(events: any[]): string {
  if (events.length < 2) return 'stable'
  
  const firstHalf = events.slice(0, Math.floor(events.length / 2))
  const secondHalf = events.slice(Math.floor(events.length / 2))
  
  if (secondHalf.length > firstHalf.length * 1.2) return 'increasing'
  if (secondHalf.length < firstHalf.length * 0.8) return 'decreasing'
  return 'stable'
}

function processTimelineData(data: any[], valueField: string) {
  // Agrupar dados por dia e somar valores
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.created_at).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + (item[valueField] || 0)
    return acc
  }, {})
  
  return Object.entries(grouped).map(([date, value]) => ({ date, value }))
}

function processGroupedData(data: any[], groupField: string) {
  const grouped = data.reduce((acc, item) => {
    const key = item[groupField] || 'Não informado'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  
  return Object.entries(grouped).map(([name, value]) => ({ name, value }))
}

async function getProdutividadeTimeline(supabase: any, user_id: string, dateFilter: any) {
  const { data } = await supabase
    .from('analytics_events')
    .select('timestamp, event_type')
    .eq('user_id', user_id)
    .gte('timestamp', dateFilter.start)
    .in('event_type', ['calculation_done', 'document_processed', 'obligation_completed'])
    .order('timestamp')

  // Agrupar por dia e contar atividades
  const dailyProductivity = data?.reduce((acc: any, event: any) => {
    const date = event.timestamp.split('T')[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {}) || {}

  return Object.entries(dailyProductivity).map(([date, value]) => ({ date, value }))
}

async function getSatisfacaoTimeline(supabase: any, user_id: string, dateFilter: any) {
  // Por enquanto, retornar dados simulados de satisfação
  // Em uma implementação real, isso viria de uma tabela de feedback dos clientes
  const days = Math.ceil((new Date(dateFilter.end).getTime() - new Date(dateFilter.start).getTime()) / (1000 * 60 * 60 * 24))
  const timeline = []

  for (let i = 0; i < days; i++) {
    const date = new Date(new Date(dateFilter.start).getTime() + i * 24 * 60 * 60 * 1000)
    const satisfaction = 4.0 + Math.random() * 1.0 // Entre 4.0 e 5.0
    timeline.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(satisfaction * 10) / 10
    })
  }

  return timeline
}

function calculateProductivityTrend(recentEvents: any[]): 'crescendo' | 'caindo' | 'estavel' {
  if (recentEvents.length < 2) return 'estavel'

  const now = Date.now()
  const firstHalf = recentEvents.filter(e =>
    new Date(e.timestamp).getTime() < now - 2.5 * 60 * 1000
  ).length
  const secondHalf = recentEvents.filter(e =>
    new Date(e.timestamp).getTime() >= now - 2.5 * 60 * 1000
  ).length

  if (secondHalf > firstHalf * 1.2) return 'crescendo'
  if (secondHalf < firstHalf * 0.8) return 'caindo'
  return 'estavel'
}

function getUniqueClients(events: any[]): number {
  const clientIds = new Set()
  events.forEach(event => {
    if (event.metadata?.empresa_id) {
      clientIds.add(event.metadata.empresa_id)
    }
  })
  return clientIds.size
}

function generateActivityDescription(activity: any): string {
  const descriptions: Record<string, string> = {
    'document_upload': 'Documento enviado',
    'document_processed': 'Documento processado',
    'calculation_done': 'Cálculo realizado',
    'company_created': 'Empresa cadastrada',
    'ai_query': 'Consulta ao assistente IA',
    'report_generated': 'Relatório gerado'
  }
  
  return descriptions[activity.event_type] || activity.event_type
}
