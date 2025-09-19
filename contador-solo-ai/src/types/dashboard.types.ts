/**
 * Tipos específicos para dashboard e analytics
 * Substitui 'any' por tipos estruturados e seguros
 */

// =====================================================
// TIPOS PARA KPIs DO DASHBOARD
// =====================================================

export interface KPIData {
  // 💰 KPIs Financeiros - Foco em receitas e impostos dos clientes
  financial: {
    receita_clientes_mes: number           // Receita total dos clientes no mês
    impostos_devidos_mes: number           // Total de impostos a pagar no mês
    economia_fiscal_gerada: number         // Economia gerada por otimizações
    ticket_medio_cliente: number           // Receita média por cliente
    // Propriedades adicionais que estão sendo usadas no código
    margem_lucro_media: number             // Margem de lucro média
    crescimento_mensal: number             // Crescimento mensal em percentual
  }
  
  // 📊 KPIs Operacionais - Produtividade do contador
  operational: {
    clientes_ativos: number                // Clientes com movimentação no mês
    documentos_processados_hoje: number    // Documentos processados hoje
    calculos_concluidos_hoje: number       // Cálculos fiscais finalizados hoje
    tempo_medio_atendimento: number        // Tempo médio para resolver demandas
    // Propriedades adicionais que estão sendo usadas no código
    calculos_realizados: number            // Total de cálculos realizados
    tempo_medio_processamento: number      // Tempo médio de processamento
  }

  // 🎯 KPIs de Produtividade - Eficiência e qualidade
  productivity: {
    eficiencia_score: number               // Score de eficiência geral
    consultas_ia: number                   // Número de consultas à IA
    taxa_sucesso_calculos: number          // Taxa de sucesso dos cálculos
    automacao_rate: number                 // Taxa de automação
    qualidade_score: number                // Score de qualidade
  }

  // 🎯 KPIs de Performance - Eficiência do escritório (compatibilidade)
  performance: {
    taxa_pontualidade: number              // % de obrigações entregues no prazo
    satisfacao_clientes: number            // Score de satisfação dos clientes
    produtividade_diaria: number           // Tarefas concluídas por dia
    uso_ia_assistente: number              // Consultas ao assistente IA hoje
  }

  // ⚖️ KPIs de Compliance - Conformidade fiscal
  compliance: {
    obrigacoes_vencendo_hoje: number       // Obrigações vencendo hoje
    obrigacoes_vencendo_semana: number     // Obrigações vencendo na semana
    declaracoes_pendentes: number          // Declarações pendentes
    alertas_receita_federal: number        // Alertas da Receita Federal
    // Propriedades adicionais que estão sendo usadas no código
    prazos_vencendo_7d: number             // Prazos vencendo em 7 dias
    prazos_vencendo_15d: number            // Prazos vencendo em 15 dias
    obrigacoes_pendentes: number           // Obrigações pendentes
    alertas_criticos: number               // Alertas críticos
  }
}

// =====================================================
// TIPOS PARA DADOS DE GRÁFICOS
// =====================================================

export interface ChartDataPoint {
  date?: string
  name?: string
  value: number
  [key: string]: unknown
}

export interface ChartData {
  receita_clientes_timeline: ChartDataPoint[]     // Evolução da receita dos clientes
  obrigacoes_por_tipo: ChartDataPoint[]           // Distribuição de obrigações fiscais
  clientes_por_regime: ChartDataPoint[]           // Clientes por regime tributário
  produtividade_timeline: ChartDataPoint[]        // Evolução da produtividade diária
  impostos_por_mes: ChartDataPoint[]              // Impostos calculados por mês
  satisfacao_timeline: ChartDataPoint[]           // Evolução da satisfação dos clientes
  // Propriedades adicionais que estão sendo usadas no código
  empresas_por_regime: ChartDataPoint[]           // Empresas por regime tributário
  documentos_por_tipo: ChartDataPoint[]           // Documentos por tipo
}

// =====================================================
// TIPOS PARA MÉTRICAS EM TEMPO REAL
// =====================================================

export interface RealtimeMetrics {
  docs_hoje: number                        // Documentos processados hoje
  calculos_hoje: number                   // Cálculos realizados hoje
  tempo_medio_atendimento: number         // Tempo médio de atendimento
  usuarios_online: number                 // Usuários online agora
  cpu_usage: number                       // Uso de CPU
  memory_usage: number                    // Uso de memória
  active_connections: number              // Conexões ativas
  queue_size: number                      // Tamanho da fila
  error_rate: number                      // Taxa de erro
  response_time: number                   // Tempo de resposta médio

  // Propriedades específicas para compatibilidade com o hook existente
  atividades_ultimos_5min: number                    // Atividades realizadas nos últimos 5 min
  documentos_processados_5min: number                // Documentos processados nos últimos 5 min
  calculos_finalizados_5min: number                  // Cálculos concluídos nos últimos 5 min
  consultas_ia_5min: number                          // Consultas ao assistente IA nos últimos 5 min
  tempo_medio_resposta: number                       // Tempo médio de resposta em segundos
  tendencia_produtividade: 'crescendo' | 'caindo' | 'estavel'  // Tendência da produtividade
  clientes_atendidos_hoje: number                    // Clientes atendidos hoje
  obrigacoes_cumpridas_hoje: number                  // Obrigações cumpridas hoje
}

// =====================================================
// TIPOS PARA FILTROS DE ANALYTICS
// =====================================================

export interface AnalyticsFilters {
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  startDate?: Date
  endDate?: Date
  empresaId?: string
  regimeTributario?: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  tipoCalculo?: string[]
  statusFilter?: string[]
  includeInactive?: boolean
}

// =====================================================
// TIPOS PARA ATIVIDADES DO FEED
// =====================================================

export interface ActivityItem {
  id: string
  type: string
  title?: string
  description: string
  timestamp: Date | string
  userId?: string
  empresaId?: string
  entity?: string
  metadata: Record<string, unknown>
  severity?: 'low' | 'medium' | 'high' | 'critical'
  status?: 'pending' | 'completed' | 'failed' | 'cancelled'
  value?: number
}

// =====================================================
// TIPOS PARA ALERTAS
// =====================================================

export interface AlertItem {
  id: string
  type: 'deadline' | 'compliance' | 'system' | 'financial' | 'performance'
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  timestamp: Date
  isRead: boolean
  actionRequired: boolean
  actionUrl?: string
  empresaId?: string
  metadata: Record<string, unknown>
}

// =====================================================
// TIPOS PARA CONFIGURAÇÃO DE DASHBOARD
// =====================================================

export interface DashboardConfig {
  layout: 'default' | 'compact' | 'detailed'
  refreshInterval: number
  enableRealtime: boolean
  visibleWidgets: string[]
  kpiPreferences: {
    showTrends: boolean
    showComparisons: boolean
    defaultPeriod: string
  }
  chartPreferences: {
    defaultType: 'line' | 'bar' | 'area' | 'pie'
    showAnimations: boolean
    colorScheme: 'default' | 'colorful' | 'monochrome'
  }
}

// =====================================================
// TIPOS PARA ESTATÍSTICAS GERAIS
// =====================================================

export interface DashboardStats {
  total_calculos: number
  calculos_pendentes: number
  empresas_ativas: number
  valor_total_periodo: number
  documentos_processados: number
  alertas_ativos: number
  taxa_sucesso: number
  tempo_medio_resposta: number
}

// =====================================================
// TIPOS PARA PERFORMANCE
// =====================================================

export interface PerformanceMetrics {
  totalDocs: number
  completedDocs: number
  failedDocs: number
  validatedDocs: number
  avgConfidence: number
  totalValue: number
  processingTime: number
  errorRate: number
}

// =====================================================
// TIPOS PARA COMPARAÇÕES E TENDÊNCIAS
// =====================================================

export interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

export interface ComparisonData {
  label: string
  current: TrendData
  target?: number
  benchmark?: number
}

// =====================================================
// TIPOS PARA EXPORTAÇÃO DE DADOS
// =====================================================

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'json'
  dateRange: {
    start: Date
    end: Date
  }
  includeCharts: boolean
  includeRawData: boolean
  filters: AnalyticsFilters
}

// =====================================================
// UNION TYPES E HELPERS
// =====================================================

export type DashboardDataType = 
  | KPIData
  | ChartData
  | RealtimeMetrics
  | ActivityItem[]
  | AlertItem[]
  | DashboardStats;

export type ChartType = 'line' | 'area' | 'bar' | 'pie' | 'doughnut' | 'radar';

export type MetricPeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export type KPICategory = 'financial' | 'operational' | 'productivity' | 'compliance';
