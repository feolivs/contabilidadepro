'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  Activity,
  RefreshCw,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'

// Hooks
import { useMetricasFinanceiras } from '@/hooks/use-metricas-financeiras'

/**
 * Props do componente MetricasFinanceirasPanel
 */
export interface MetricasFinanceirasPanelProps {
  empresaId: string
  className?: string
  periodMonths?: number
  showRefresh?: boolean
}

/**
 * Componente para exibir métricas financeiras avançadas
 */
export function MetricasFinanceirasPanel({ 
  empresaId, 
  className = '',
  periodMonths = 6,
  showRefresh = true
}: MetricasFinanceirasPanelProps) {
  const [forceRefresh, setForceRefresh] = useState(false)

  const {
    data: metricas,
    isLoading,
    error,
    refetch
  } = useMetricasFinanceiras(empresaId, {
    period_months: periodMonths,
    force_refresh: forceRefresh
  }, {
    enabled: !!empresaId
  })

  const handleRefresh = async () => {
    setForceRefresh(true)
    await refetch()
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

  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'crescimento':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declinio':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  // Loading state
  if (isLoading && !metricas) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <CardTitle>Métricas Financeiras</CardTitle>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle>Métricas Financeiras</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Erro ao carregar métricas: {error.message}
              {showRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="ml-2"
                >
                  Tentar novamente
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!metricas) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle>Métricas Financeiras</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma métrica disponível</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <CardTitle>Métricas Financeiras</CardTitle>
            {metricas.cached && (
              <Badge variant="secondary" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Cache
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {metricas.resumo_executivo?.periodo_analise || `${periodMonths} meses`}
            </Badge>
            {showRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Análise financeira detalhada • {metricas.resumo_executivo?.total_documentos || 0} documentos analisados
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="projecoes">Projeções</TabsTrigger>
            <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Receita Total */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Receita Total</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(metricas.resumo_executivo?.receita_total || 0)}
                </p>
                <div className="flex items-center gap-1 text-sm">
                  {getTrendIcon(metricas.projecoes?.tendencia || 'estavel')}
                  <span className={
                    metricas.resumo_executivo?.crescimento_medio > 0 ? 'text-green-600' :
                    metricas.resumo_executivo?.crescimento_medio < 0 ? 'text-red-600' : 'text-gray-600'
                  }>
                    {formatPercentage(metricas.resumo_executivo?.crescimento_medio || 0)} vs período anterior
                  </span>
                </div>
              </div>

              {/* Confiança dos Dados */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Confiança dos Dados</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatPercentage((metricas.resumo_executivo?.confianca_dados || 0) * 100)}
                    </span>
                    <Badge variant={
                      (metricas.resumo_executivo?.confianca_dados || 0) >= 0.8 ? 'default' :
                      (metricas.resumo_executivo?.confianca_dados || 0) >= 0.6 ? 'secondary' : 'destructive'
                    }>
                      {(metricas.resumo_executivo?.confianca_dados || 0) >= 0.8 ? 'Alta' :
                       (metricas.resumo_executivo?.confianca_dados || 0) >= 0.6 ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                  <Progress value={(metricas.resumo_executivo?.confianca_dados || 0) * 100} className="h-2" />
                </div>
              </div>
            </div>

            {/* Métricas Mensais Recentes */}
            {metricas.metricas_mensais && metricas.metricas_mensais.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Últimos Meses
                </h4>
                <div className="space-y-2">
                  {metricas.metricas_mensais.slice(-3).map((mes, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{mes.mes}</p>
                        <p className="text-sm text-muted-foreground">
                          {mes.quantidade_documentos} documentos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(mes.receita_total)}</p>
                        <p className="text-xs text-muted-foreground">
                          Confiança: {formatPercentage(mes.confianca_media * 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="projecoes" className="space-y-4">
            {metricas.projecoes && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Próximo Mês</p>
                    <p className="text-xl font-bold">{formatCurrency(metricas.projecoes.proximo_mes)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Próximo Trimestre</p>
                    <p className="text-xl font-bold">{formatCurrency(metricas.projecoes.proximo_trimestre)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Projeção Anual</p>
                    <p className="text-xl font-bold">{formatCurrency(metricas.projecoes.anual)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 p-4 border rounded-lg">
                  {getTrendIcon(metricas.projecoes.tendencia)}
                  <span className="font-medium">
                    Tendência: {metricas.projecoes.tendencia}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fluxo" className="space-y-4">
            {metricas.fluxo_caixa && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Saldo Acumulado</p>
                  <p className={`text-2xl font-bold ${
                    metricas.fluxo_caixa.saldo_acumulado >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(metricas.fluxo_caixa.saldo_acumulado)}
                  </p>
                </div>

                {metricas.fluxo_caixa.saldos && metricas.fluxo_caixa.saldos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Saldos Mensais</h4>
                    {metricas.fluxo_caixa.saldos.slice(-6).map((saldo, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{saldo.mes}</span>
                        <span className={`font-medium ${
                          saldo.valor >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(saldo.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            {metricas.indicadores_performance && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Ticket Médio</span>
                  <p className="text-xl font-bold">
                    {formatCurrency(metricas.indicadores_performance.ticket_medio)}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Frequência de Documentos</span>
                  <p className="text-xl font-bold">
                    {metricas.indicadores_performance.frequencia_documentos.toFixed(1)}/mês
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Crescimento Percentual</span>
                  <p className={`text-xl font-bold ${
                    metricas.indicadores_performance.crescimento_percentual >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(metricas.indicadores_performance.crescimento_percentual)}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Eficiência de Processamento</span>
                  <div className="space-y-1">
                    <p className="text-xl font-bold">
                      {formatPercentage(metricas.indicadores_performance.eficiencia_processamento * 100)}
                    </p>
                    <Progress value={metricas.indicadores_performance.eficiencia_processamento * 100} className="h-2" />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {metricas.processing_time && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Processado em {metricas.processing_time}ms • 
              Gerado em {new Date(metricas.generated_at || '').toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
