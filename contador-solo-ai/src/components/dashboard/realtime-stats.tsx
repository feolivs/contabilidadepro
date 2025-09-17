'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Activity
} from 'lucide-react'
import { useRealtimeStats } from '@/hooks/use-realtime-stats'

export function RealtimeStats() {
  const { stats, refresh } = useRealtimeStats()

  const metrics = [
    {
      title: 'Total de Cálculos',
      value: stats.totalCalculos,
      icon: Users,
      trend: '+12%',
      trendUp: true,
      description: 'Cálculos realizados',
      color: 'blue'
    },
    {
      title: 'Cálculos Pendentes',
      value: stats.calculosPendentes,
      icon: Calendar,
      trend: stats.calculosPendentes > 0 ? '+3' : '0',
      trendUp: false,
      description: 'Aguardando processamento',
      color: 'orange'
    },
    {
      title: 'Documentos Hoje',
      value: stats.documentosHoje,
      icon: FileText,
      trend: `+${stats.documentosHoje}`,
      trendUp: true,
      description: 'Processados hoje',
      color: 'green'
    },
    {
      title: 'Valor Total',
      value: `R$ ${stats.valorTotal.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      trend: '+15%',
      trendUp: true,
      description: 'Valor total processado',
      color: 'purple'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/10',
      orange: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/10',
      green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/10',
      purple: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/10'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  if (stats.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-4 bg-gray-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
              <div className="flex items-center space-x-2">
                <div className="h-3 w-12 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-200 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com indicador de tempo real */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold">Estatísticas em Tempo Real</h2>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            <Activity className="h-3 w-3 mr-1 animate-pulse" />
            Ao Vivo
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground">
            Última atualização: {stats.lastUpdate.toLocaleTimeString('pt-BR')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            className="h-8 w-8 p-0"
            title="Atualizar dados"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <Card key={index} className={`relative transition-all duration-300 hover:shadow-md ${getColorClasses(metric.color)}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
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

              {/* Indicador de tempo real */}
              <div className="absolute top-2 right-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  metric.color === 'blue' ? 'bg-blue-500' :
                  metric.color === 'orange' ? 'bg-orange-500' :
                  metric.color === 'green' ? 'bg-green-500' :
                  'bg-purple-500'
                }`} />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Próximos prazos */}
      {stats.prazosProximos > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/10">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {stats.prazosProximos} prazo(s) fiscal(is) próximo(s)
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Vencimento nos próximos 7 dias
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}