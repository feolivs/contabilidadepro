'use client'

import React, { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Activity, TrendingUp, FileText, Calculator, AlertCircle, Zap } from 'lucide-react'
import { useEdgeFunctionsCache, useCacheMonitoring, useSmartPreload } from '@/hooks/use-edge-functions-cache'
import { useEmpresasUnified } from '@/hooks/use-empresas-unified'
import { getEmpresas, getEmpresasStats } from '@/services/data-services'

// ✅ Componente principal otimizado
export function OptimizedDashboard() {
  return (
    <div className="space-y-6">
      {/* Header com métricas de performance */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Otimizado</h1>
          <p className="text-muted-foreground">Performance em tempo real com cache inteligente</p>
        </div>
        <Suspense fallback={<Skeleton className="w-32 h-10" />}>
          <CacheStatusBadge />
        </Suspense>
      </div>

      {/* Grid de métricas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<MetricCardSkeleton />}>
          <EmpresasMetrics />
        </Suspense>
        <Suspense fallback={<MetricCardSkeleton />}>
          <DocumentosMetrics />
        </Suspense>
        <Suspense fallback={<MetricCardSkeleton />}>
          <CalculosMetrics />
        </Suspense>
        <Suspense fallback={<MetricCardSkeleton />}>
          <PerformanceMetrics />
        </Suspense>
      </div>

      {/* Seção de atividades recentes */}
      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <AtividadesRecentes />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <CacheMonitorCard />
        </Suspense>
      </div>
    </div>
  )
}

// ✅ Badge de status do cache
function CacheStatusBadge() {
  const { getCacheHealth } = useCacheMonitoring()
  const health = getCacheHealth()

  const statusColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500'
  }

  return (
    <Badge
      variant="outline"
      className={`${statusColors[health.status]} text-white border-0`}
    >
      <Zap className="w-3 h-3 mr-1" />
      Cache {health.status === 'healthy' ? 'Saudável' :
             health.status === 'warning' ? 'Atenção' : 'Crítico'}
    </Badge>
  )
}

// ✅ Métricas de empresas com cache
function EmpresasMetrics() {
  const { data: empresas = [], isLoading } = useEmpresasUnified()
  const { preloadEmpresaContext } = useSmartPreload()

  // Pré-carregar contextos das empresas ativas
  React.useEffect(() => {
    empresas
      .filter(e => e.ativa)
      .slice(0, 5) // Primeiras 5 empresas
      .forEach(empresa => {
        preloadEmpresaContext(empresa.id)
      })
  }, [empresas, preloadEmpresaContext])

  if (isLoading) return <MetricCardSkeleton />

  const ativas = empresas.filter(e => e.ativa).length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Empresas</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{empresas.length}</div>
        <p className="text-xs text-muted-foreground">
          {ativas} ativas • Cache otimizado
        </p>
      </CardContent>
    </Card>
  )
}

// ✅ Métricas de documentos
function DocumentosMetrics() {
  const { getCacheStats } = useEdgeFunctionsCache()
  const stats = getCacheStats()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Documentos</CardTitle>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.totalQueries}</div>
        <p className="text-xs text-muted-foreground">
          Queries em cache • {stats.staleQueries} stale
        </p>
      </CardContent>
    </Card>
  )
}

// ✅ Métricas de cálculos fiscais
function CalculosMetrics() {
  const { useCalculoFiscal } = useEdgeFunctionsCache()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cálculos</CardTitle>
        <Calculator className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">Em Cache</div>
        <p className="text-xs text-muted-foreground">
          Cálculos otimizados
        </p>
      </CardContent>
    </Card>
  )
}

// ✅ Métricas de performance
function PerformanceMetrics() {
  const { getPerformanceMetrics } = useCacheMonitoring()
  const metrics = getPerformanceMetrics()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Performance</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{Math.round(metrics.hitRate)}%</div>
        <p className="text-xs text-muted-foreground">
          Hit rate do cache
        </p>
      </CardContent>
    </Card>
  )
}

// ✅ Atividades recentes otimizadas
function AtividadesRecentes() {
  const { data: empresas = [] } = useEmpresasUnified({ pagination: { page: 1, limit: 5 } })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atividades Recentes</CardTitle>
        <CardDescription>Últimas empresas adicionadas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {empresas.slice(0, 5).map((empresa) => (
          <div key={empresa.id} className="flex items-center space-x-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">
                {empresa.nome}
              </p>
              <p className="text-sm text-muted-foreground">
                {empresa.regime_tributario} • {new Date(empresa.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={empresa.ativa ? "default" : "secondary"}>
              {empresa.ativa ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ✅ Monitor de cache avançado
function CacheMonitorCard() {
  const { getPerformanceMetrics, getCacheHealth } = useCacheMonitoring()
  const { clearCache } = useEdgeFunctionsCache()
  const [metrics, setMetrics] = React.useState(() => getPerformanceMetrics())
  const health = getCacheHealth()

  // Atualizar métricas periodicamente
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(getPerformanceMetrics())
    }, 5000)
    return () => clearInterval(interval)
  }, [getPerformanceMetrics])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Monitor de Cache</CardTitle>
          <CardDescription>Performance do sistema em tempo real</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearCache()
            setMetrics(getPerformanceMetrics())
          }}
        >
          Limpar Cache
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Hit Rate:</span>
            <div className="font-medium">{Math.round(metrics.hitRate)}%</div>
          </div>
          <div>
            <span className="text-muted-foreground">Queries:</span>
            <div className="font-medium">{metrics.totalQueries}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Memória:</span>
            <div className="font-medium">{Math.round(metrics.memoryUsage / 1024)} KB</div>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <Badge
              variant={health.status === 'healthy' ? 'default' : 'destructive'}
              className="ml-1"
            >
              {health.status}
            </Badge>
          </div>
        </div>

        {health.recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Recomendações:
            </div>
            {health.recommendations.map((rec, i) => (
              <p key={i} className="text-xs text-muted-foreground pl-6">
                • {rec}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ✅ Skeletons
function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}