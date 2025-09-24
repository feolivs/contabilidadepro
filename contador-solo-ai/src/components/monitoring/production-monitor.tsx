'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  MemoryStick,
  Network,
  Rocket,
  Shield,
  Users,
  Zap
} from 'lucide-react'
import { useProductionMonitoring, useDeploymentMonitoring } from '@/hooks/use-production-monitoring'

// ✅ Monitor principal de produção
export function ProductionMonitor() {
  const { metrics, isHealthy, alerts } = useProductionMonitoring()
  const { deploymentStatus, simulateDeployment } = useDeploymentMonitoring()

  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com status geral */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Monitor de Produção</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={isHealthy ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {isHealthy ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {isHealthy ? "Sistema Saudável" : "Alertas Ativos"}
            </Badge>
            <Badge variant="outline">
              <Activity className="w-3 h-3 mr-1" />
              Tempo Real
            </Badge>
          </div>
        </div>

        <DeploymentControls
          deploymentStatus={deploymentStatus}
          simulateDeployment={simulateDeployment}
        />
      </div>

      {/* Alertas críticos */}
      {alerts.length > 0 && <AlertsSection alerts={alerts} />}

      {/* Grid de métricas principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <PerformanceCard metrics={metrics.performance} />
        <SystemCard metrics={metrics.system} />
        <UserCard metrics={metrics.user} />
        <AlertsCard alerts={metrics.alerts} />
      </div>

      {/* Gráficos e detalhes */}
      <div className="grid gap-6 md:grid-cols-2">
        <PerformanceDetails metrics={metrics.performance} />
        <SystemDetails metrics={metrics.system} />
      </div>
    </div>
  )
}

// ✅ Controles de deployment
function DeploymentControls({ deploymentStatus, simulateDeployment }: any) {
  const getStatusColor = () => {
    switch (deploymentStatus.status) {
      case 'deploying': return 'bg-blue-500'
      case 'success': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-3">
      {deploymentStatus.status === 'deploying' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">{deploymentStatus.message}</span>
          </div>
          <Progress value={deploymentStatus.progress} className="w-48" />
        </div>
      )}

      <Button
        onClick={simulateDeployment}
        disabled={deploymentStatus.status === 'deploying'}
        className="w-48"
      >
        {deploymentStatus.status === 'deploying' ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Fazendo Deploy...
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4 mr-2" />
            Fazer Deploy
          </>
        )}
      </Button>

      {deploymentStatus.status !== 'idle' && (
        <Badge className={`${getStatusColor()} text-white border-0 w-48 justify-center`}>
          {deploymentStatus.status === 'deploying' && 'Em Progresso'}
          {deploymentStatus.status === 'success' && 'Deploy Concluído'}
          {deploymentStatus.status === 'failed' && 'Deploy Falhou'}
        </Badge>
      )}
    </div>
  )
}

// ✅ Seção de alertas
function AlertsSection({ alerts }: { alerts: Array<any> }) {
  const criticalAlerts = alerts.filter(a => a.level === 'critical').slice(0, 3)
  const warningAlerts = alerts.filter(a => a.level === 'warning').slice(0, 2)

  return (
    <div className="space-y-3">
      {criticalAlerts.map((alert) => (
        <Alert key={alert.id} className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Crítico:</strong> {alert.message}
            <span className="ml-2 text-sm text-red-600">
              {alert.timestamp.toLocaleTimeString()}
            </span>
          </AlertDescription>
        </Alert>
      ))}

      {warningAlerts.map((alert) => (
        <Alert key={alert.id} className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Atenção:</strong> {alert.message}
            <span className="ml-2 text-sm text-yellow-600">
              {alert.timestamp.toLocaleTimeString()}
            </span>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

// ✅ Cards de métricas
function PerformanceCard({ metrics }: { metrics: any }) {
  const getPerformanceStatus = () => {
    if (metrics.pageLoadTime > 5000 || metrics.errorRate > 5) return 'critical'
    if (metrics.pageLoadTime > 3000 || metrics.errorRate > 2) return 'warning'
    return 'good'
  }

  const status = getPerformanceStatus()
  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Performance</CardTitle>
        <Gauge className={`h-4 w-4 ${statusColors[status]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metrics.pageLoadTime}ms</div>
        <p className="text-xs text-muted-foreground">
          Cache: {metrics.cacheHitRate}% • Erros: {metrics.errorRate}%
        </p>
      </CardContent>
    </Card>
  )
}

function SystemCard({ metrics }: { metrics: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Sistema</CardTitle>
        <Database className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{Math.floor(metrics.uptime / 3600)}h</div>
        <p className="text-xs text-muted-foreground">
          DB: {metrics.databaseConnections} • Edge: {metrics.edgeFunctionInvocations}
        </p>
      </CardContent>
    </Card>
  )
}

function UserCard({ metrics }: { metrics: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Usuários</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{metrics.activeUsers}</div>
        <p className="text-xs text-muted-foreground">
          {metrics.totalSessions} sessões • {Math.floor(metrics.avgSessionDuration / 60)}min média
        </p>
      </CardContent>
    </Card>
  )
}

function AlertsCard({ alerts }: { alerts: any }) {
  const total = alerts.critical + alerts.warning + alerts.info

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Alertas</CardTitle>
        <Shield className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{total}</div>
        <div className="flex gap-1 text-xs">
          <span className="text-red-600">{alerts.critical} críticos</span>
          <span className="text-yellow-600">{alerts.warning} avisos</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ✅ Detalhes de performance
function PerformanceDetails({ metrics }: { metrics: any }) {
  const performanceItems = [
    {
      label: 'Page Load Time',
      value: `${metrics.pageLoadTime}ms`,
      status: metrics.pageLoadTime > 3000 ? 'warning' : 'good',
      icon: Clock
    },
    {
      label: 'API Response Time',
      value: `${metrics.apiResponseTime}ms`,
      status: metrics.apiResponseTime > 2000 ? 'warning' : 'good',
      icon: Network
    },
    {
      label: 'Cache Hit Rate',
      value: `${metrics.cacheHitRate}%`,
      status: metrics.cacheHitRate < 70 ? 'warning' : 'good',
      icon: Zap
    },
    {
      label: 'Memory Usage',
      value: `${metrics.memoryUsage}MB`,
      status: metrics.memoryUsage > 100 ? 'warning' : 'good',
      icon: MemoryStick
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhes de Performance</CardTitle>
        <CardDescription>Métricas detalhadas do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {performanceItems.map((item) => {
          const statusColor = item.status === 'good' ? 'text-green-600' : 'text-yellow-600'

          return (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className={`w-4 h-4 ${statusColor}`} />
                <span className="text-sm">{item.label}</span>
              </div>
              <span className={`font-medium ${statusColor}`}>{item.value}</span>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ✅ Detalhes do sistema
function SystemDetails({ metrics }: { metrics: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status do Sistema</CardTitle>
        <CardDescription>Informações de infraestrutura</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">Uptime</span>
          <span className="font-medium text-green-600">
            {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Conexões DB</span>
          <span className="font-medium">{metrics.databaseConnections}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Edge Functions</span>
          <span className="font-medium">{metrics.edgeFunctionInvocations}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Storage Usage</span>
          <span className="font-medium">{metrics.storageUsage}%</span>
        </div>

        <div className="pt-2">
          <div className="flex justify-between text-sm mb-1">
            <span>Storage</span>
            <span>{metrics.storageUsage}%</span>
          </div>
          <Progress value={metrics.storageUsage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}