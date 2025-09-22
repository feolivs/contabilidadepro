'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  FileText, 
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  ExternalLink,
  Download,
  Filter
} from 'lucide-react'

// Hooks de dados agregados - ATUALIZADOS PARA EDGE FUNCTIONS
import { useEmpresaInsightsComplete, useEmpresaInsightsBasic } from '@/hooks/use-empresa-insights'
import { useMetricasFinanceiras } from '@/hooks/use-metricas-financeiras'
import { useComplianceAnalysis } from '@/hooks/use-compliance-analysis'
import { useAIInsightsQuick } from '@/hooks/use-ai-insights'
import { useDadosEstruturadosEdge } from '@/hooks/use-dados-estruturados'
import { useDadosFinanceirosExtraidos } from '@/hooks/use-dados-financeiros-extraidos'
import { useDocumentosStats } from '@/hooks/use-documentos-stats'

// Componentes especializados
import { EmpresaHeader } from './empresa-header'
import { ComplianceScoreCard } from './compliance-score-card'
import { FluxoCaixaChart } from './fluxo-caixa-chart'
import { DocumentosTimelineChart } from './documentos-timeline-chart'
import { TiposDocumentosChart } from './tipos-documentos-chart'
import { DocumentosRecentesTable } from './documentos-recentes-table'

// Novos componentes com Edge Functions
import { AIInsightsPanel } from './ai-insights-panel'
import { MetricasFinanceirasPanel } from './metricas-financeiras-panel'
import { ComplianceAnalysisPanel } from './compliance-analysis-panel'

/**
 * Props do componente EmpresaDashboard
 */
export interface EmpresaDashboardProps {
  empresaId: string
  className?: string
}

/**
 * Opções de período para filtros
 */
const PERIODOS = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último ano' }
] as const

/**
 * Dashboard avançado para visualização de dados de uma empresa específica
 */
export function EmpresaDashboard({ empresaId, className }: EmpresaDashboardProps) {
  const [periodoDias, setPeriodoDias] = useState<string>('90')
  const [periodoMeses, setPeriodoMeses] = useState<number>(6)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Hooks de dados agregados - USANDO EDGE FUNCTIONS
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights
  } = useEmpresaInsightsComplete(empresaId, {
    enabled: !!empresaId,
    insight_type: 'completo',
    force_refresh: false
  })

  const {
    data: metricas,
    isLoading: metricasLoading,
    error: metricasError,
    refetch: refetchMetricas
  } = useMetricasFinanceiras(empresaId, {
    period_months: Math.ceil(parseInt(periodoDias) / 30),
    force_refresh: false
  }, {
    enabled: !!empresaId,
    refetchInterval: autoRefresh ? 10 * 60 * 1000 : undefined,
    staleTime: 5 * 60 * 1000
  })

  const {
    data: compliance,
    isLoading: complianceLoading,
    error: complianceError,
    refetch: refetchCompliance
  } = useComplianceAnalysis(empresaId, {
    enabled: !!empresaId,
    force_refresh: false
  })

  const {
    data: aiInsights,
    isLoading: aiInsightsLoading,
    error: aiInsightsError,
    refetch: refetchAIInsights
  } = useAIInsightsQuick(empresaId, 'financeiro')

  const {
    data: dadosEstruturados,
    isLoading: dadosEstruturadosLoading,
    error: dadosEstruturadosError,
    refetch: refetchDadosEstruturados
  } = useDadosEstruturadosEdge(empresaId, {
    period_months: Math.ceil(parseInt(periodoDias) / 30),
    enabled: !!empresaId
  })

  // Hooks legados para compatibilidade (dados específicos)
  const {
    data: dadosFinanceiros,
    isLoading: financeirosLoading,
    error: financeirosError,
    refetch: refetchFinanceiros
  } = useDadosFinanceirosExtraidos(empresaId, {
    periodo_meses: periodoMeses,
    apenas_processados: true,
    valor_minimo: 0
  }, {
    enabled: !!empresaId,
    refetchInterval: autoRefresh ? 10 * 60 * 1000 : undefined,
    staleTime: 5 * 60 * 1000
  })

  const {
    data: documentosStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useDocumentosStats(empresaId, {
    periodo_dias: parseInt(periodoDias),
    incluir_detalhes_erro: true
  }, {
    enabled: !!empresaId,
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : undefined,
    staleTime: 2 * 60 * 1000
  })

  // Estados de loading e erro - ATUALIZADOS
  const isLoading = insightsLoading || metricasLoading || complianceLoading ||
                   aiInsightsLoading || dadosEstruturadosLoading || financeirosLoading || statsLoading
  const hasError = insightsError || metricasError || complianceError ||
                   aiInsightsError || dadosEstruturadosError || financeirosError || statsError
  const hasData = insights || metricas || compliance || aiInsights || dadosEstruturados ||
                  dadosFinanceiros || documentosStats

  // Dados consolidados para facilitar o uso nos componentes
  const dashboardData = {
    empresa: insights?.empresa,
    financial_summary: insights?.financial_summary || metricas?.resumo_executivo,
    documents_summary: insights?.documents_summary,
    obligations_summary: insights?.obligations_summary,
    insights_summary: insights?.insights_summary || aiInsights,
    compliance_summary: insights?.compliance_summary || compliance,
    metrics_summary: insights?.metrics_summary || metricas,
    dados_estruturados: dadosEstruturados,
    recommendations: insights?.recommendations || [],
    cached: insights?.cached || metricas?.cached || compliance?.cached
  }

  // Handlers
  const handlePeriodoChange = (value: string) => {
    setPeriodoDias(value)
    setPeriodoMeses(Math.ceil(parseInt(value) / 30))
  }

  const handleRefreshAll = async () => {
    console.log('[EmpresaDashboard] Atualizando todos os dados...')
    await Promise.all([
      refetchInsights(),
      refetchMetricas(),
      refetchCompliance(),
      refetchAIInsights(),
      refetchDadosEstruturados(),
      refetchFinanceiros(),
      refetchStats()
    ])
    console.log('[EmpresaDashboard] Todos os dados atualizados!')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Loading skeleton
  if (isLoading && !hasData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Error state
  if (hasError && !hasData) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dados da empresa. Tente novamente.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={handleRefreshAll}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header da Empresa */}
      <div className="flex items-center justify-between">
        <EmpresaHeader empresa={dashboardData.empresa} />

        {/* Indicador de Cache */}
        {dashboardData.cached && (
          <Badge variant="secondary" className="mr-2">
            <Activity className="h-3 w-3 mr-1" />
            Cache
          </Badge>
        )}
        
        <div className="flex items-center gap-3">
          {/* Filtro de Período */}
          <Select value={periodoDias} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((periodo) => (
                <SelectItem key={periodo.value} value={periodo.value}>
                  {periodo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botão de Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Documentos */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold">
                  {dashboardData.documents_summary?.total ||
                   dashboardData.dados_estruturados?.total_documentos ||
                   documentosStats?.overview.total_documentos || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.documents_summary?.processados ||
                   documentosStats?.status.processados || 0} processados
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Faturamento Total */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    dashboardData.financial_summary?.receita_total ||
                    dashboardData.metrics_summary?.resumo_executivo?.receita_total ||
                    dadosFinanceiros?.receitas.total || 
                    0
                  )}
                </p>
                <div className="flex items-center text-xs">
                  {insights?.financeiro.crescimento_mensal !== undefined && (
                    <>
                      {insights.financeiro.crescimento_mensal >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                      )}
                      <span className={insights.financeiro.crescimento_mensal >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercentage(Math.abs(insights.financeiro.crescimento_mensal))}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Sucesso */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold">
                  {formatPercentage(
                    insights?.documentos.taxa_sucesso || 
                    documentosStats?.status.taxa_sucesso || 
                    0
                  )}
                </p>
                <Progress 
                  value={insights?.documentos.taxa_sucesso || documentosStats?.status.taxa_sucesso || 0} 
                  className="mt-2 h-2"
                />
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Score de Compliance */}
        <ComplianceScoreCard
          score={dashboardData.compliance_summary?.score_geral ||
                 insights?.compliance?.score || 0}
          nivel={dashboardData.compliance_summary?.nivel ||
                 insights?.compliance?.nivel || 'baixo'}
          loading={insightsLoading || complianceLoading}
        />
      </div>

      {/* Tabs com Visualizações Detalhadas */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fluxo de Caixa */}
            <FluxoCaixaChart 
              data={dadosFinanceiros?.fluxo_caixa.por_mes || []}
              loading={financeirosLoading}
            />

            {/* Timeline de Documentos */}
            <DocumentosTimelineChart
              data={documentosStats?.temporal.por_dia || []}
              loading={statsLoading}
              height={280}
              chartType="composed"
              showValueLine={true}
              showProcessedLine={true}
            />
          </div>

          {/* Documentos Recentes */}
          <DocumentosRecentesTable
            empresaId={empresaId}
            limit={10}
            showSearch={true}
            showFilters={true}
            showActions={true}
          />
        </TabsContent>

        {/* Tab: Financeiro */}
        <TabsContent value="financeiro" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Receitas vs Despesas */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Receitas vs Despesas</CardTitle>
                <CardDescription>Comparação mensal do fluxo financeiro</CardDescription>
              </CardHeader>
              <CardContent>
                <FluxoCaixaChart 
                  data={dadosFinanceiros?.fluxo_caixa.por_mes || []}
                  loading={financeirosLoading}
                  showComparison={true}
                />
              </CardContent>
            </Card>

            {/* Resumo Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Receitas</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(dadosFinanceiros?.receitas.total || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Despesas</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(dadosFinanceiros?.despesas.total || 0)}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Saldo</span>
                    <span className={`font-bold ${
                      (dadosFinanceiros?.fluxo_caixa.saldo_acumulado || 0) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(dadosFinanceiros?.fluxo_caixa.saldo_acumulado || 0)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Margem Média</span>
                  <span className="font-medium">
                    {formatPercentage(dadosFinanceiros?.fluxo_caixa.margem_media || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documentos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por Tipo */}
            <TiposDocumentosChart
              data={insights?.documentos.tipos_mais_comuns || documentosStats?.tipos || []}
              loading={insightsLoading || statsLoading}
              height={280}
              chartType="donut"
              showPercentages={true}
              showSuccessRate={true}
            />

            {/* Estatísticas de Qualidade */}
            <Card>
              <CardHeader>
                <CardTitle>Qualidade dos Dados</CardTitle>
                <CardDescription>Métricas de extração e processamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Confiança Média</span>
                    <span>{formatPercentage((insights?.qualidade_ocr.confianca_media || 0) * 100)}</span>
                  </div>
                  <Progress 
                    value={(insights?.qualidade_ocr.confianca_media || 0) * 100} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Taxa de Extração</span>
                    <span>{formatPercentage(insights?.qualidade_ocr.taxa_extracao_sucesso || 0)}</span>
                  </div>
                  <Progress 
                    value={insights?.qualidade_ocr.taxa_extracao_sucesso || 0} 
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {insights?.qualidade_ocr.documentos_alta_confianca || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Alta Qualidade</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {insights?.qualidade_ocr.documentos_baixa_confianca || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Baixa Qualidade</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Compliance */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Detalhado */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Análise de Compliance</CardTitle>
                <CardDescription>Fatores que compõem o score de compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights?.compliance.fatores.map((fator, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{fator.fator}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{formatPercentage(fator.valor)}</span>
                          <Badge 
                            variant={
                              fator.status === 'ok' ? 'default' :
                              fator.status === 'atencao' ? 'secondary' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {fator.status === 'ok' ? 'OK' :
                             fator.status === 'atencao' ? 'Atenção' : 'Crítico'}
                          </Badge>
                        </div>
                      </div>
                      <Progress value={fator.valor} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recomendações */}
            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights?.compliance.recomendacoes.map((recomendacao, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{recomendacao}</p>
                    </div>
                  ))}
                  
                  {(!insights?.compliance.recomendacoes || insights.compliance.recomendacoes.length === 0) && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <p className="text-sm">Nenhuma recomendação no momento. Excelente trabalho!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Insights IA */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Insights de IA */}
            <AIInsightsPanel
              empresaId={empresaId}
              variant="full"
              showRefresh={true}
            />

            {/* Métricas Financeiras Avançadas */}
            <MetricasFinanceirasPanel
              empresaId={empresaId}
              periodMonths={Math.ceil(parseInt(periodoDias) / 30)}
              showRefresh={true}
            />
          </div>

          {/* Análise de Compliance Completa */}
          <ComplianceAnalysisPanel
            empresaId={empresaId}
            showRefresh={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
