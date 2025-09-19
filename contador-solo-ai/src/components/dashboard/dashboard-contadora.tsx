/**
 * Dashboard principal para contadora
 * Focado em informações práticas e acionáveis
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar,
  AlertTriangle,
  FileText,
  Building2,
  Calculator,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bell,
  TrendingUp,
  Users
} from 'lucide-react'
import { useDashboardContadora } from '@/hooks/use-dashboard-contadora'
import { FiltrosDashboard } from '@/types/dashboard-contadora.types'
import { CalendarioFiscal } from './calendario-fiscal'
import { ObrigacoesProximas } from './obrigacoes-proximas'
import { AtividadesRecentes } from './atividades-recentes'
import { AlertasFiscais } from './alertas-fiscais'
import { ResumoEmpresas } from './resumo-empresas'

export function DashboardContadora() {
  const [filtros, setFiltros] = useState<FiltrosDashboard>({ periodo: 'mes' })
  
  const { dados, isLoading, error, refetch } = useDashboardContadora(filtros)

  const handlePeriodoChange = (periodo: string) => {
    setFiltros(prev => ({
      ...prev,
      periodo: periodo as 'hoje' | 'semana' | 'mes' | 'trimestre'
    }))
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Erro ao carregar dashboard
          </h3>
          <p className="text-gray-600 mb-4">
            Não foi possível carregar os dados da dashboard
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (!dados) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard Contábil</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Visão geral das suas obrigações, prazos e atividades
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Seletor de Período */}
          <Select value={filtros.periodo} onValueChange={handlePeriodoChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">7 dias</SelectItem>
              <SelectItem value="mes">30 dias</SelectItem>
              <SelectItem value="trimestre">3 meses</SelectItem>
            </SelectContent>
          </Select>

          {/* Botão Refresh */}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Obrigações Pendentes */}
        <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Obrigações Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {dados.resumo_obrigacoes.vencendo_hoje + dados.resumo_obrigacoes.vencidas}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>{dados.resumo_obrigacoes.vencendo_hoje} hoje</span>
              <span>•</span>
              <span>{dados.resumo_obrigacoes.vencidas} vencidas</span>
            </div>
          </CardContent>
        </Card>

        {/* Empresas Ativas */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Empresas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {dados.resumo_empresas.total_ativas}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>{dados.resumo_empresas.em_dia} em dia</span>
              <span>•</span>
              <span>{dados.resumo_empresas.com_pendencias} com pendências</span>
            </div>
          </CardContent>
        </Card>

        {/* Documentos Processados */}
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Documentos Este Mês</CardTitle>
            <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {dados.resumo_documentos.total_mes}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>{dados.resumo_documentos.processados_hoje} hoje</span>
              <span>•</span>
              <span>{dados.resumo_documentos.pendentes} pendentes</span>
            </div>
          </CardContent>
        </Card>

        {/* Cálculos Realizados */}
        <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900 dark:text-gray-100">Cálculos Este Mês</CardTitle>
            <Calculator className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {dados.resumo_calculos.realizados_mes}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>R$ {dados.resumo_calculos.valor_total_mes.toLocaleString('pt-BR')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Importantes */}
      {dados.alertas_ativos.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Bell className="h-5 w-5" />
              Alertas Importantes ({dados.alertas_ativos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AlertasFiscais alertas={dados.alertas_ativos} />
          </CardContent>
        </Card>
      )}

      {/* Tabs com Conteúdo Detalhado */}
      <Tabs defaultValue="calendario" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendário
          </TabsTrigger>
          <TabsTrigger value="obrigacoes" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Obrigações
          </TabsTrigger>
          <TabsTrigger value="empresas" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="atividades" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Atividades
          </TabsTrigger>
          <TabsTrigger value="metricas" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Métricas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Calendário Fiscal */}
        <TabsContent value="calendario" className="space-y-6">
          <CalendarioFiscal eventos={dados.eventos_calendario} />
        </TabsContent>

        {/* Tab: Obrigações Próximas */}
        <TabsContent value="obrigacoes" className="space-y-6">
          <ObrigacoesProximas obrigacoes={dados.obrigacoes_proximas} />
        </TabsContent>

        {/* Tab: Resumo de Empresas */}
        <TabsContent value="empresas" className="space-y-6">
          <ResumoEmpresas resumo={dados.resumo_empresas} />
        </TabsContent>

        {/* Tab: Atividades Recentes */}
        <TabsContent value="atividades" className="space-y-6">
          <AtividadesRecentes atividades={dados.atividades_recentes} />
        </TabsContent>

        {/* Tab: Métricas Práticas */}
        <TabsContent value="metricas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Taxa de Pontualidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dados.metricas_praticas.taxa_pontualidade.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Obrigações entregues no prazo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Impostos Calculados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {dados.metricas_praticas.impostos_calculados_mes.toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Este mês
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Empresas em Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dados.metricas_praticas.empresas_em_dia}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sem pendências
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Skeleton para loading
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-4 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="h-96 bg-gray-200 rounded animate-pulse" />
    </div>
  )
}
