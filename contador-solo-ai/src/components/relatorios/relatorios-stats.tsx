import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, FileText, Building2, ArrowUpIcon, ArrowDownIcon, Brain, AlertTriangle } from 'lucide-react'

interface RelatorioStats {
  total_calculos: number
  valor_total_periodo: number
  calculos_pendentes: number
  empresas_ativas: number
  crescimento_mensal: number
  insights_ia?: Array<{
    id: string
    tipo: string
    titulo: string
    prioridade: string
  }>
  alertas_compliance?: Array<{
    id: string
    severidade: string
    titulo: string
  }>
}

interface RelatoriosStatsProps {
  stats: RelatorioStats
}

export function RelatoriosStats({ stats }: RelatoriosStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const statsData = [
    {
      title: 'Total de Cálculos',
      value: stats.total_calculos.toLocaleString('pt-BR'),
      description: 'Últimos 30 dias',
      icon: Calculator,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: stats.crescimento_mensal
    },
    {
      title: 'Valor Total',
      value: formatCurrency(stats.valor_total_periodo),
      description: 'Impostos calculados',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      trend: stats.crescimento_mensal
    },
    {
      title: 'Pendentes',
      value: stats.calculos_pendentes.toLocaleString('pt-BR'),
      description: 'Aguardando processamento',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      trend: null
    },
    {
      title: 'Empresas Ativas',
      value: stats.empresas_ativas.toLocaleString('pt-BR'),
      description: 'Clientes ativos',
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      trend: null
    }
  ]

  // Adicionar cards de IA se disponíveis
  if (stats.insights_ia && stats.insights_ia.length > 0) {
    statsData.push({
      title: 'Insights IA',
      value: stats.insights_ia.length.toString(),
      description: 'Análises inteligentes',
      icon: Brain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      trend: null
    })
  }

  if (stats.alertas_compliance && stats.alertas_compliance.length > 0) {
    const alertasCriticos = stats.alertas_compliance.filter(a => a.severidade === 'critical' || a.severidade === 'error').length
    statsData.push({
      title: 'Alertas Críticos',
      value: alertasCriticos.toString(),
      description: 'Requerem atenção',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      trend: null
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-md ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </div>
              
              {stat.trend !== null && (
                <div className="flex items-center space-x-1">
                  {stat.trend >= 0 ? (
                    <ArrowUpIcon className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 text-red-600" />
                  )}
                  <Badge 
                    variant={stat.trend >= 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {formatPercentage(stat.trend)}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
          
          {/* Subtle gradient overlay for visual appeal */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 pointer-events-none" />
        </Card>
      ))}
    </div>
  )
}

// Componente para estatísticas detalhadas
export function RelatoriosStatsDetailed({ stats }: RelatoriosStatsProps) {
  const efficiency = stats.total_calculos > 0 
    ? ((stats.total_calculos - stats.calculos_pendentes) / stats.total_calculos) * 100 
    : 0

  const avgValuePerCalculation = stats.total_calculos > 0 
    ? stats.valor_total_periodo / stats.total_calculos 
    : 0

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Eficiência Operacional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxa de Conclusão</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {efficiency.toFixed(1)}%
              </Badge>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${efficiency}%` }}
              />
            </div>
            
            <p className="text-xs text-muted-foreground">
              {stats.total_calculos - stats.calculos_pendentes} de {stats.total_calculos} cálculos concluídos
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Valor Médio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(avgValuePerCalculation)}
            </div>
            <p className="text-sm text-muted-foreground">
              Por cálculo fiscal
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600">
                Valor médio estável
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Concluídos</span>
              <span className="text-sm font-medium">
                {((stats.total_calculos - stats.calculos_pendentes) / stats.total_calculos * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pendentes</span>
              <span className="text-sm font-medium">
                {(stats.calculos_pendentes / stats.total_calculos * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Empresas/Cálculo</span>
              <span className="text-sm font-medium">
                {(stats.total_calculos / Math.max(stats.empresas_ativas, 1)).toFixed(1)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
