// 📊 REALTIME DASHBOARD
// Dashboard principal com analytics em tempo real
// Integrado ao sistema ContabilidadePRO

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Building2, 
  AlertTriangle,
  Clock,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useRealtimeAnalytics, type AnalyticsFilters } from '@/hooks/use-realtime-analytics'
import { KPICard } from './kpi-card'
import { RealtimeChart } from './realtime-chart'
import { ActivityFeed } from './activity-feed'
import { AlertsPanel } from './alerts-panel'

export function RealtimeDashboard() {
  const [filters, setFilters] = useState<AnalyticsFilters>({ period: 'today' })
  
  const {
    kpis,
    kpisLoading,
    realtimeMetrics,
    metricsLoading,
    chartData,
    chartLoading,
    activities,
    activitiesLoading,
    isConnected,
    isRealtime,
    setIsRealtime,
    refresh
  } = useRealtimeAnalytics(filters)

  const handlePeriodChange = (period: string) => {
    setFilters(prev => ({
      ...prev,
      period: period as 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Analytics</h1>
          <p className="text-muted-foreground">
            Métricas em tempo real do seu escritório contábil
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Status de Conexão */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-600">
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">Conectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">Desconectado</span>
              </div>
            )}
          </div>

          {/* Toggle Realtime */}
          <div className="flex items-center gap-2">
            <Switch
              checked={isRealtime}
              onCheckedChange={setIsRealtime}
              id="realtime-mode"
            />
            <label htmlFor="realtime-mode" className="text-sm font-medium">
              Tempo Real
            </label>
          </div>

          {/* Seletor de Período */}
          <Select value={filters.period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">7 dias</SelectItem>
              <SelectItem value="month">30 dias</SelectItem>
              <SelectItem value="year">1 ano</SelectItem>
            </SelectContent>
          </Select>

          {/* Botão Refresh */}
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Métricas em Tempo Real */}
      {realtimeMetrics && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Zap className="h-5 w-5" />
              Atividade em Tempo Real (últimos 5 min)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {realtimeMetrics.atividades_ultimos_5min}
                </div>
                <div className="text-sm text-muted-foreground">Atividades</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {realtimeMetrics.calculos_finalizados_5min}
                </div>
                <div className="text-sm text-muted-foreground">Cálculos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {realtimeMetrics.consultas_ia_5min}
                </div>
                <div className="text-sm text-muted-foreground">Consultas IA</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold">
                    {Math.round(realtimeMetrics.tempo_medio_resposta)}s
                  </span>
                  {realtimeMetrics.tendencia_produtividade === 'crescendo' && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                  {realtimeMetrics.tendencia_produtividade === 'caindo' && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Tempo Resposta</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs Principais - Focados em Contabilidade */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* KPIs Financeiros */}
          <KPICard
            title="Receita dos Clientes"
            value={kpis.financial.receita_clientes_mes}
            format="currency"
            icon={DollarSign}
            subtitle="Este mês"
            loading={kpisLoading}
            className="border-green-200 bg-green-50/50"
          />

          <KPICard
            title="Impostos Devidos"
            value={kpis.financial.impostos_devidos_mes}
            format="currency"
            icon={FileText}
            subtitle="Este mês"
            loading={kpisLoading}
            className="border-blue-200 bg-blue-50/50"
          />

          {/* KPIs Operacionais */}
          <KPICard
            title="Clientes Ativos"
            value={kpis.operational.clientes_ativos}
            format="number"
            icon={Building2}
            subtitle="Com movimentação"
            loading={kpisLoading}
            className="border-purple-200 bg-purple-50/50"
          />

          <KPICard
            title="Documentos Hoje"
            value={kpis.operational.documentos_processados_hoje}
            format="number"
            icon={FileText}
            subtitle="Processados"
            loading={kpisLoading}
            className="border-orange-200 bg-orange-50/50"
          />
        </div>
      )}

      {/* KPIs Secundários - Compliance e Performance */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Obrigações Hoje"
            value={kpis.compliance.obrigacoes_vencendo_hoje}
            format="number"
            icon={AlertTriangle}
            subtitle="Vencendo"
            loading={kpisLoading}
            className="border-red-200 bg-red-50/50"
          />

          <KPICard
            title="Taxa de Pontualidade"
            value={kpis.performance.taxa_pontualidade}
            format="percentage"
            icon={Clock}
            subtitle="Entregas no prazo"
            loading={kpisLoading}
            className="border-emerald-200 bg-emerald-50/50"
          />

          <KPICard
            title="Satisfação Clientes"
            value={kpis.performance.satisfacao_clientes}
            format="number"
            icon={TrendingUp}
            subtitle="Score médio"
            loading={kpisLoading}
            className="border-cyan-200 bg-cyan-50/50"
          />

          <KPICard
            title="Consultas IA Hoje"
            value={kpis.performance.uso_ia_assistente}
            format="number"
            icon={Zap}
            subtitle="Assistente usado"
            loading={kpisLoading}
            className="border-violet-200 bg-violet-50/50"
          />
        </div>
      )}

      {/* Tabs com Conteúdo Detalhado */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="operational">Operacional</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Receita dos Clientes */}
            <Card>
              <CardHeader>
                <CardTitle>Receita dos Clientes</CardTitle>
                <CardDescription>
                  Evolução da receita dos clientes ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RealtimeChart
                  data={chartData?.receita_clientes_timeline || []}
                  type="line"
                  loading={chartLoading}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Gráfico de Produtividade */}
            <Card>
              <CardHeader>
                <CardTitle>Produtividade Diária</CardTitle>
                <CardDescription>
                  Tarefas concluídas por dia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RealtimeChart
                  data={chartData?.produtividade_timeline || []}
                  type="area"
                  loading={chartLoading}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>

          {/* Feed de Atividades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Atividades Recentes
              </CardTitle>
              <CardDescription>
                Últimas atividades do sistema em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed
                activities={activities}
                loading={activitiesLoading}
                maxItems={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Financeiro */}
        <TabsContent value="financial" className="space-y-6">
          {kpis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard
                title="Margem de Lucro Média"
                value={kpis.financial.margem_lucro_media}
                format="percentage"
                icon={TrendingUp}
                loading={kpisLoading}
              />
              
              <KPICard
                title="Crescimento Mensal"
                value={kpis.financial.crescimento_mensal}
                format="percentage"
                icon={TrendingUp}
                loading={kpisLoading}
              />

              <KPICard
                title="Eficiência Score"
                value={kpis.productivity.eficiencia_score}
                format="number"
                icon={Zap}
                loading={kpisLoading}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Empresas por Regime Tributário</CardTitle>
              </CardHeader>
              <CardContent>
                <RealtimeChart
                  data={chartData?.empresas_por_regime || []}
                  type="pie"
                  loading={chartLoading}
                  height={300}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <RealtimeChart
                  data={chartData?.documentos_por_tipo || []}
                  type="bar"
                  loading={chartLoading}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Operacional */}
        <TabsContent value="operational" className="space-y-6">
          {kpis && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <KPICard
                title="Cálculos Realizados"
                value={kpis.operational.calculos_realizados}
                format="number"
                icon={FileText}
                loading={kpisLoading}
              />
              
              <KPICard
                title="Tempo Médio Processamento"
                value={kpis.operational.tempo_medio_processamento}
                format="time"
                icon={Clock}
                loading={kpisLoading}
              />

              <KPICard
                title="Consultas IA"
                value={kpis.productivity.consultas_ia}
                format="number"
                icon={Zap}
                loading={kpisLoading}
              />

              <KPICard
                title="Taxa de Sucesso"
                value={kpis.productivity.taxa_sucesso_calculos}
                format="percentage"
                icon={TrendingUp}
                loading={kpisLoading}
              />
            </div>
          )}
        </TabsContent>

        {/* Tab: Compliance */}
        <TabsContent value="compliance" className="space-y-6">
          {kpis && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KPICard
                  title="Prazos 7 dias"
                  value={kpis.compliance.prazos_vencendo_7d}
                  format="number"
                  icon={AlertTriangle}
                  loading={kpisLoading}
                  className="border-red-200 bg-red-50/50"
                />
                
                <KPICard
                  title="Prazos 15 dias"
                  value={kpis.compliance.prazos_vencendo_15d}
                  format="number"
                  icon={Clock}
                  loading={kpisLoading}
                  className="border-yellow-200 bg-yellow-50/50"
                />

                <KPICard
                  title="Obrigações Pendentes"
                  value={kpis.compliance.obrigacoes_pendentes}
                  format="number"
                  icon={FileText}
                  loading={kpisLoading}
                />

                <KPICard
                  title="Alertas Críticos"
                  value={kpis.compliance.alertas_criticos}
                  format="number"
                  icon={AlertTriangle}
                  loading={kpisLoading}
                  className="border-red-200 bg-red-50/50"
                />
              </div>

              <AlertsPanel />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
