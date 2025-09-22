'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  BarChart3,
  Activity
} from 'lucide-react'

/**
 * Interface para dados do fluxo de caixa
 */
export interface FluxoCaixaData {
  mes: string
  receitas: number
  despesas: number
  saldo: number
  margem: number
}

/**
 * Props do componente FluxoCaixaChart
 */
export interface FluxoCaixaChartProps {
  data: FluxoCaixaData[]
  loading?: boolean
  showComparison?: boolean
  height?: number
  className?: string
  title?: string
  description?: string
}

/**
 * Componente de gráfico de fluxo de caixa
 */
export function FluxoCaixaChart({ 
  data = [],
  loading = false,
  showComparison = false,
  height = 300,
  className = '',
  title = 'Fluxo de Caixa',
  description = 'Evolução mensal das receitas, despesas e saldo'
}: FluxoCaixaChartProps) {

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className={`h-${height / 4} w-full`} />
        </CardContent>
      </Card>
    )
  }

  // Se não há dados
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado disponível</p>
            <p className="text-sm">Dados aparecerão após o processamento de documentos</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Processar dados para o gráfico
  const chartData = data.map(item => ({
    ...item,
    mesFormatado: formatMes(item.mes),
    receitasFormatadas: formatCurrency(item.receitas),
    despesasFormatadas: formatCurrency(item.despesas),
    saldoFormatado: formatCurrency(item.saldo),
    margemFormatada: `${item.margem.toFixed(1)}%`
  }))

  // Calcular métricas resumo
  const totalReceitas = data.reduce((sum, item) => sum + item.receitas, 0)
  const totalDespesas = data.reduce((sum, item) => sum + item.despesas, 0)
  const saldoTotal = totalReceitas - totalDespesas
  const margemMedia = data.length > 0 
    ? data.reduce((sum, item) => sum + item.margem, 0) / data.length 
    : 0

  // Tendência do saldo (comparar primeiro e último mês)
  const tendenciaSaldo = data && data.length >= 2
    ? data[data.length - 1]?.saldo - data[0]?.saldo
    : 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          {/* Métricas Resumo */}
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Total</p>
              <p className={`font-bold ${saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(saldoTotal)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margem Média</p>
              <p className="font-bold">
                {margemMedia.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Badges de Tendência */}
        <div className="flex gap-2">
          <Badge 
            variant="outline" 
            className={`${saldoTotal >= 0 ? 'text-green-700 border-green-200 bg-green-50' : 'text-red-700 border-red-200 bg-red-50'}`}
          >
            {saldoTotal >= 0 ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {saldoTotal >= 0 ? 'Positivo' : 'Negativo'}
          </Badge>

          {tendenciaSaldo !== 0 && (
            <Badge 
              variant="outline"
              className={`${tendenciaSaldo > 0 ? 'text-blue-700 border-blue-200 bg-blue-50' : 'text-orange-700 border-orange-200 bg-orange-50'}`}
            >
              {tendenciaSaldo > 0 ? 'Crescendo' : 'Decrescendo'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            {showComparison ? (
              // Gráfico de barras comparativo
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="mesFormatado" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                
                <Bar 
                  dataKey="receitas" 
                  name="Receitas"
                  fill="#10b981" 
                  radius={[2, 2, 0, 0]}
                  opacity={0.8}
                />
                <Bar 
                  dataKey="despesas" 
                  name="Despesas"
                  fill="#ef4444" 
                  radius={[2, 2, 0, 0]}
                  opacity={0.8}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  name="Saldo"
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </ComposedChart>
            ) : (
              // Gráfico de área do saldo
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="mesFormatado" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#saldoGradient)"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Tooltip customizado para o gráfico
 */
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span className="font-bold">
              {entry.name === 'Margem' 
                ? `${entry.value.toFixed(1)}%`
                : formatCurrency(entry.value)
              }
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

/**
 * Utilitários de formatação
 */
function formatMes(mesString: string): string {
  const [ano, mes] = mesString.split('-')
  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ]
  return `${meses[parseInt(mes) - 1]}/${ano?.slice(-2) || ''}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function formatCurrencyShort(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`
  }
  return `R$ ${value.toFixed(0)}`
}
