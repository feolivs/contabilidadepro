'use client'

import { useState, Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Brain,
  Shield,
  Zap,
  Clock
} from 'lucide-react'

// Hooks integrados com Edge Functions
import { useEmpresaInsightsComplete } from '@/hooks/use-empresa-insights'
import { useMetricasFinanceiras } from '@/hooks/use-metricas-financeiras'
import { useComplianceAnalysis } from '@/hooks/use-compliance-analysis'
import { useAIInsights } from '@/hooks/use-ai-insights'
import { useDadosEstruturadosEdge } from '@/hooks/use-dados-estruturados'

// Componentes especializados
import { AIInsightsPanel } from './ai-insights-panel'
import { MetricasFinanceirasPanel } from './metricas-financeiras-panel'
import { ComplianceAnalysisPanel } from './compliance-analysis-panel'

/**
 * Props do componente DashboardOptimized
 */
export interface DashboardOptimizedProps {
  empresaId: string
  className?: string
}

/**
 * Dashboard otimizado usando Edge Functions
 */
export function DashboardOptimized({ empresaId, className }: DashboardOptimizedProps) {
  const [periodMonths, setPeriodMonths] = useState(6)
  const [forceRefresh, setForceRefresh] = useState(false)

  // Hooks principais com Edge Functions
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights
  } = useEmpresaInsightsComplete(empresaId, {
    force_refresh: forceRefresh
  })

  const {
    data: metricas,
    isLoading: metricasLoading,
    error: metricasError,
    refetch: refetchMetricas
  } = useMetricasFinanceiras(empresaId, {
    period_months: periodMonths,
    force_refresh: forceRefresh
  })

  const {
    data: compliance,
    isLoading: complianceLoading,
    error: complianceError,
    refetch: refetchCompliance
  } = useComplianceAnalysis(empresaId, {
    force_refresh: forceRefresh
  })

  const {
    data: aiInsights,
    isLoading: aiInsightsLoading,
    error: aiInsightsError,
    refetch: refetchAIInsights
  } = useAIInsights(empresaId, {
    insight_type: 'completo',
    force_refresh: forceRefresh
  })

  // Estados consolidados
  const isLoading = insightsLoading || metricasLoading || complianceLoading || aiInsightsLoading
  const hasError = insightsError || metricasError || complianceError || aiInsightsError
  const hasData = insights || metricas || compliance || aiInsights

  // Handlers
  const handleRefreshAll = async () => {
    setForceRefresh(true)
    await Promise.all([
      refetchInsights(),
      refetchMetricas(),
      refetchCompliance(),
      refetchAIInsights()
    ])
    setForceRefresh(false)
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
      </div>
    )
  }

  // Error state
  if (hasError && !hasData) {
    return (
      <div className={className}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar dados do dashboard. 
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefreshAll}
              className="ml-2"
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Otimizado</h1>
          <p className="text-muted-foreground">
            {insights?.empresa?.nome || 'Carregando...'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Indicadores de Cache */}
          <div className="flex items-center gap-2">
            {insights?.cached && (
              <Badge variant="secondary" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Insights
              </Badge>
            )}
            {metricas?.cached && (
              <Badge variant="secondary" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                Métricas
              </Badge>
            )}
            {compliance?.cached && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Compliance
              </Badge>
            )}
          </div>

          {/* Período */}
          <Select value={periodMonths.toString()} onValueChange={(value) => setPeriodMonths(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Receita Total */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    insights?.financial_summary?.faturamento_total ||
                    metricas?.resumo_executivo?.receita_total || 0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(
                    insights?.financial_summary?.crescimento_mensal ||
                    metricas?.resumo_executivo?.crescimento_medio || 0
                  )} vs período anterior
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Documentos</p>
                <p className="text-2xl font-bold">
                  {insights?.documents_summary?.total ||
                   metricas?.resumo_executivo?.total_documentos || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {insights?.documents_summary?.processados || 0} processados
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Score de Compliance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance</p>
                <p className="text-2xl font-bold">
                  {(insights?.compliance_summary?.score_geral ||
                    compliance?.score_geral || 0).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Nível: {insights?.compliance_summary?.nivel ||
                          compliance?.nivel || 'N/A'}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Confiança IA */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confiança IA</p>
                <p className="text-2xl font-bold">
                  {aiInsights?.confianca_analise || 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Análise {aiInsights?.tipo_insight || 'completa'}
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painéis Principais */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <AIInsightsPanel 
              empresaId={empresaId}
              variant="full"
              showRefresh={false}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="metricas">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <MetricasFinanceirasPanel 
              empresaId={empresaId}
              periodMonths={periodMonths}
              showRefresh={false}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="compliance">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ComplianceAnalysisPanel 
              empresaId={empresaId}
              showRefresh={false}
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Performance Info */}
      {(metricas?.processing_time || compliance?.processing_time) && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Dados processados em {Math.max(
              metricas?.processing_time || 0,
              compliance?.processing_time || 0
            )}ms via Edge Functions
          </p>
        </div>
      )}
    </div>
  )
}
