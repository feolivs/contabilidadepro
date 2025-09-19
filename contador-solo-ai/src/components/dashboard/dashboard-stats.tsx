/**
 * Componente de estatísticas do dashboard simplificado - Fase 2
 * Usando simple-relatorios em vez de server-cache complexo
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'
import { relatoriosService } from '@/services/simple-relatorios'

// ============================================
// SERVER COMPONENTS (simplificado)
// ============================================

/**
 * Estatísticas principais do dashboard
 */
export async function DashboardStats({ userId }: { userId: string }) {
  try {
    const stats = await relatoriosService.getDashboardStats(userId)

    const metrics = [
      {
        title: 'Total de Cálculos',
        value: stats.total_calculos || 0,
        icon: Users,
        trend: '+12%',
        trendUp: true,
        description: 'Cálculos realizados'
      },
      {
        title: 'Cálculos Pendentes',
        value: stats.calculos_pendentes || 0,
        icon: Calendar,
        trend: '-8%',
        trendUp: false,
        description: 'Aguardando processamento'
      },
      {
        title: 'Empresas Ativas',
        value: stats.empresas_ativas || 0,
        icon: FileText,
        trend: '+23%',
        trendUp: true,
        description: 'Este mês'
      },
      {
        title: 'Valor Total',
        value: `R$ ${(stats.valor_total_periodo || 0).toLocaleString('pt-BR')}`,
        icon: DollarSign,
        trend: '+15%',
        trendUp: true,
        description: 'Últimos 30 dias'
      }
    ]

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <div className={`flex items-center ${
                    metric.trendUp ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <TrendingUp className={`h-3 w-3 mr-1 ${
                      !metric.trendUp ? 'rotate-180' : ''
                    }`} />
                    {metric.trend}
                  </div>
                  <span>{metric.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error)
    return <DashboardStatsError />
  }
}

/**
 * Atividades recentes do dashboard
 */
export async function RecentActivities({ userId }: { userId: string }) {
  try {
    const historico = await relatoriosService.getHistorico(userId, 5)

    const activities = historico.map((item, index) => ({
      id: index + 1,
      type: 'calculation',
      title: `${item.tipo} - ${item.empresa}`,
      description: `Valor: R$ ${(item.valor_total || 0).toLocaleString('pt-BR')} - ${item.periodo}`,
      time: new Date(item.created_at).toLocaleDateString('pt-BR'),
      status: item.status === 'pago' ? 'completed' : 'pending'
    }))

    if (activities.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente encontrada.</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`mt-1 h-2 w-2 rounded-full ${
                  activity.status === 'completed' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <Badge variant={
                      activity.status === 'completed' ? 'default' :
                      activity.status === 'warning' ? 'destructive' :
                      'secondary'
                    }>
                      {activity.status === 'completed' ? 'Pago' :
                       activity.status === 'warning' ? 'Atenção' :
                       'Pendente'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('Erro ao carregar atividades:', error)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Erro ao carregar atividades</p>
        </CardContent>
      </Card>
    )
  }
}

/**
 * Alertas e notificações importantes
 */
export async function DashboardAlerts({ userId }: { userId: string }) {
  try {
    const stats = await relatoriosService.getDashboardStats(userId)

    const alerts = []

    if (stats.vencimentos_proximos > 0) {
      alerts.push({
        id: 1,
        type: 'warning',
        title: 'Prazos Fiscais Próximos',
        message: `${stats.vencimentos_proximos} vencimentos nos próximos 7 dias`,
        action: 'Ver detalhes'
      })
    }

    if (stats.calculos_pendentes > 5) {
      alerts.push({
        id: 2,
        type: 'info',
        title: 'Cálculos Pendentes',
        message: `${stats.calculos_pendentes} cálculos aguardando pagamento`,
        action: 'Revisar'
      })
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 3,
        type: 'info',
        title: 'Tudo em dia',
        message: 'Não há alertas no momento',
        action: 'OK'
      })
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            Alertas Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border ${
                alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-medium">{alert.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.message}
                    </p>
                  </div>
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    {alert.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('Erro ao carregar alertas:', error)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Erro ao carregar alertas</p>
        </CardContent>
      </Card>
    )
  }
}

// ============================================
// LOADING SKELETONS
// ============================================

export function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function RecentActivitiesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <Skeleton className="mt-1 h-2 w-2 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardAlertsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-36" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// ERROR COMPONENTS
// ============================================

function DashboardStatsError() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="border-red-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600">Erro ao carregar dados</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}