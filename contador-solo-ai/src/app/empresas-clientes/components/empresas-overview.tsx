'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Users,
  TrendingUp,
  AlertTriangle,
  FileText,
  Calculator,
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import { useEmpresasStatsUnified } from '@/hooks/use-empresas-unified'

interface EmpresasOverviewProps {
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function EmpresasOverview({ onRefresh, isRefreshing = false }: EmpresasOverviewProps) {
  const stats = useEmpresasStatsUnified()

  const statCards = [
    {
      title: 'Total de Empresas',
      value: stats.total,
      icon: Building2,
      description: `${stats.ativas} ativas, ${stats.inativas} inativas`,
      trend: stats.crescimentoMensal > 0 ? 'up' : stats.crescimentoMensal < 0 ? 'down' : 'stable',
      trendValue: Math.abs(stats.crescimentoMensal),
      color: 'blue'
    },
    {
      title: 'Simples Nacional',
      value: stats.simplesNacional,
      icon: Users,
      description: `${stats.percentualSimplesNacional}% do total`,
      badge: 'Regime mais comum',
      color: 'green'
    },
    {
      title: 'Lucro Presumido',
      value: stats.lucroPresumido,
      icon: TrendingUp,
      description: `${stats.percentualLucroPresumido}% do total`,
      color: 'purple'
    },
    {
      title: 'MEI',
      value: stats.mei,
      icon: Users,
      description: `${stats.percentualMEI}% do total`,
      color: 'orange'
    },
    {
      title: 'Novas Este Mês',
      value: stats.novasEsteMes,
      icon: TrendingUp,
      description: `${stats.novasEsteAno} no ano`,
      trend: 'up',
      color: 'emerald'
    },
    {
      title: 'Documentos Pendentes',
      value: stats.documentosPendentes,
      icon: FileText,
      description: `${stats.empresasComDocumentosRecentes} empresas com docs`,
      alert: stats.documentosPendentes > 50,
      color: stats.documentosPendentes > 50 ? 'red' : 'blue'
    },
    {
      title: 'Cálculos Pendentes',
      value: stats.calculosPendentes,
      icon: Calculator,
      description: `${stats.empresasComCalculosRecentes} empresas com cálculos`,
      alert: stats.calculosPendentes > 20,
      color: stats.calculosPendentes > 20 ? 'red' : 'blue'
    },
    {
      title: 'Prazos Pendentes',
      value: stats.prazosPendentes,
      icon: Clock,
      description: 'Próximos vencimentos',
      alert: stats.prazosPendentes > 10,
      color: stats.prazosPendentes > 10 ? 'red' : 'yellow'
    }
  ]

  const getColorClasses = (color: string, isAlert = false) => {
    if (isAlert) {
      return {
        card: 'border-red-200 bg-red-50',
        icon: 'text-red-600 bg-red-100',
        value: 'text-red-900',
        title: 'text-red-800'
      }
    }

    const colorMap = {
      blue: {
        card: 'border-blue-200 bg-blue-50',
        icon: 'text-blue-600 bg-blue-100',
        value: 'text-blue-900',
        title: 'text-blue-800'
      },
      green: {
        card: 'border-green-200 bg-green-50',
        icon: 'text-green-600 bg-green-100',
        value: 'text-green-900',
        title: 'text-green-800'
      },
      purple: {
        card: 'border-purple-200 bg-purple-50',
        icon: 'text-purple-600 bg-purple-100',
        value: 'text-purple-900',
        title: 'text-purple-800'
      },
      orange: {
        card: 'border-orange-200 bg-orange-50',
        icon: 'text-orange-600 bg-orange-100',
        value: 'text-orange-900',
        title: 'text-orange-800'
      },
      emerald: {
        card: 'border-emerald-200 bg-emerald-50',
        icon: 'text-emerald-600 bg-emerald-100',
        value: 'text-emerald-900',
        title: 'text-emerald-800'
      },
      red: {
        card: 'border-red-200 bg-red-50',
        icon: 'text-red-600 bg-red-100',
        value: 'text-red-900',
        title: 'text-red-800'
      },
      yellow: {
        card: 'border-yellow-200 bg-yellow-50',
        icon: 'text-yellow-600 bg-yellow-100',
        value: 'text-yellow-900',
        title: 'text-yellow-800'
      }
    }

    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Visão Geral</h2>
          <p className="text-sm text-gray-600 mt-1">
            Última atualização: {new Date(stats.ultimaAtualizacao).toLocaleString('pt-BR')}
          </p>
        </div>

        {onRefresh && (
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        )}
      </div>

      {/* Grid de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const colors = getColorClasses(stat.color, stat.alert)
          const Icon = stat.icon

          return (
            <Card key={index} className={`${colors.card} transition-all duration-200 hover:shadow-md`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-sm font-medium ${colors.title}`}>
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${colors.icon}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className={`text-2xl font-bold ${colors.value}`}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString('pt-BR') : stat.value}
                  </div>

                  {stat.trend && (
                    <div className={`flex items-center text-xs ${
                      stat.trend === 'up' ? 'text-green-600' :
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : stat.trend === 'down' ? (
                        <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                      ) : null}
                      {stat.trendValue && `${stat.trendValue}%`}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-600 mt-1">
                  {stat.description}
                </p>

                {stat.badge && (
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {stat.badge}
                  </Badge>
                )}

                {stat.alert && (
                  <div className="flex items-center mt-2 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atenção necessária
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
