import { CachePerformanceMonitor } from '@/components/dashboard/cache-performance-monitor'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, PieChart } from 'lucide-react'

export default function ChartsSlot() {
  console.log('[DASHBOARD_CHARTS] Renderizando slot de performance com tempo real')

  // Mock data para gráficos
  const chartData = {
    monthlyRevenue: [
      { month: 'Jan', value: 12500 },
      { month: 'Fev', value: 15200 },
      { month: 'Mar', value: 18900 },
      { month: 'Abr', value: 16700 },
      { month: 'Mai', value: 21300 },
      { month: 'Jun', value: 19800 }
    ],
    taxTypes: [
      { type: 'DAS', count: 45, percentage: 60 },
      { type: 'IRPJ', count: 20, percentage: 27 },
      { type: 'ICMS', count: 10, percentage: 13 }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Monitor de Performance do Cache */}
      <CachePerformanceMonitor />

      {/* Gráficos de Performance */}
      <Card className="relative">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Análise de Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gráfico de Receita Mensal (Simulado) */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
              Receita Mensal (Últimos 6 meses)
            </h4>
            <div className="space-y-2">
              {chartData.monthlyRevenue.map((item, index) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground w-12">{item.month}</span>
                  <div className="flex-1 mx-3">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-1000"
                        style={{
                          width: `${(item.value / Math.max(...chartData.monthlyRevenue.map(d => d.value))) * 100}%`,
                          animationDelay: `${index * 100}ms`
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-20 text-right">
                    R$ {item.value.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Distribuição por Tipo de Cálculo */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center">
              <PieChart className="h-4 w-4 mr-2 text-blue-600" />
              Distribuição por Tipo de Cálculo
            </h4>
            <div className="space-y-3">
              {chartData.taxTypes.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                    />
                    <span className="text-sm font-medium">{item.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{item.count} cálculos</span>
                    <span className="text-sm font-medium">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicador de performance */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Dados atualizados em tempo real</span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Online</span>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Indicador visual de carregamento paralelo */}
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      </Card>
    </div>
  )
}
