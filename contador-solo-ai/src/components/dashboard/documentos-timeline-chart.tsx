'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart
} from 'recharts'
import { 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Calendar,
  BarChart3,
  Download,
  Filter
} from 'lucide-react'

/**
 * Interface para dados da timeline de documentos
 */
export interface DocumentosTimelineData {
  data: string
  quantidade: number
  processados: number
  valor_total: number
}

/**
 * Props do componente DocumentosTimelineChart
 */
export interface DocumentosTimelineChartProps {
  data: DocumentosTimelineData[]
  loading?: boolean
  height?: number
  className?: string
  title?: string
  description?: string
  showValueLine?: boolean
  showProcessedLine?: boolean
  chartType?: 'line' | 'area' | 'bar' | 'composed'
}

/**
 * Componente de gráfico de timeline de documentos
 */
export function DocumentosTimelineChart({ 
  data = [],
  loading = false,
  height = 300,
  className = '',
  title = 'Timeline de Documentos',
  description = 'Volume de documentos processados ao longo do tempo',
  showValueLine = true,
  showProcessedLine = true,
  chartType = 'composed'
}: DocumentosTimelineChartProps) {

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
            <Calendar className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado disponível</p>
            <p className="text-sm">Timeline aparecerá após o processamento de documentos</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Processar dados para o gráfico
  const chartData = data.map(item => ({
    ...item,
    dataFormatada: formatDate(item.data),
    dataAbreviada: formatDateShort(item.data),
    valorFormatado: formatCurrency(item.valor_total),
    taxaProcessamento: item.quantidade > 0 ? (item.processados / item.quantidade) * 100 : 0
  }))

  // Calcular métricas
  const totalDocumentos = data.reduce((sum, item) => sum + item.quantidade, 0)
  const totalProcessados = data.reduce((sum, item) => sum + item.processados, 0)
  const valorTotal = data.reduce((sum, item) => sum + item.valor_total, 0)
  const taxaGeralProcessamento = totalDocumentos > 0 ? (totalProcessados / totalDocumentos) * 100 : 0

  // Calcular tendência (comparar primeiros e últimos 3 dias)
  const primeiros3 = data.slice(0, 3).reduce((sum, item) => sum + item.quantidade, 0) / 3
  const ultimos3 = data.slice(-3).reduce((sum, item) => sum + item.quantidade, 0) / 3
  const tendencia = ultimos3 - primeiros3

  // Encontrar pico de atividade
  const picoAtividade = data.reduce((max, item) => 
    item.quantidade > max.quantidade ? item : max, data[0] || { data: '', quantidade: 0 }
  )

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          {/* Métricas Resumo */}
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-bold text-blue-600">
                {totalDocumentos}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa</p>
              <p className="font-bold">
                {taxaGeralProcessamento.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="font-bold text-green-600">
                {formatCurrencyShort(valorTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Badges de Insights */}
        <div className="flex gap-2">
          <Badge 
            variant="outline" 
            className={`${tendencia > 0 ? 'text-green-700 border-green-200 bg-green-50' : 
                        tendencia < 0 ? 'text-red-700 border-red-200 bg-red-50' : 
                        'text-gray-700 border-gray-200 bg-gray-50'}`}
          >
            {tendencia > 0 ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : tendencia < 0 ? (
              <TrendingDown className="h-3 w-3 mr-1" />
            ) : (
              <Activity className="h-3 w-3 mr-1" />
            )}
            {tendencia > 0 ? 'Crescendo' : tendencia < 0 ? 'Decrescendo' : 'Estável'}
          </Badge>

          {picoAtividade.quantidade > 0 && (
            <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
              <BarChart3 className="h-3 w-3 mr-1" />
              Pico: {picoAtividade.quantidade} em {formatDateShort(picoAtividade.data)}
            </Badge>
          )}

          <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
            Média: {(totalDocumentos / data.length).toFixed(1)}/dia
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            {chartType === 'line' && (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="dataAbreviada" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Line 
                  type="monotone" 
                  dataKey="quantidade" 
                  name="Total"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                {showProcessedLine && (
                  <Line 
                    type="monotone" 
                    dataKey="processados" 
                    name="Processados"
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  />
                )}
              </LineChart>
            )}

            {chartType === 'area' && (
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="quantidadeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="dataAbreviada" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="quantidade" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fill="url(#quantidadeGradient)"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </AreaChart>
            )}

            {chartType === 'bar' && (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="dataAbreviada" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Bar 
                  dataKey="quantidade" 
                  name="Total"
                  fill="#3b82f6" 
                  radius={[2, 2, 0, 0]}
                  opacity={0.8}
                />
                {showProcessedLine && (
                  <Bar 
                    dataKey="processados" 
                    name="Processados"
                    fill="#10b981" 
                    radius={[2, 2, 0, 0]}
                    opacity={0.8}
                  />
                )}
              </BarChart>
            )}

            {chartType === 'composed' && (
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="dataAbreviada" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                {showValueLine && (
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(value) => formatCurrencyShort(value)}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                <Bar 
                  yAxisId="left"
                  dataKey="quantidade" 
                  name="Total"
                  fill="#3b82f6" 
                  radius={[2, 2, 0, 0]}
                  opacity={0.6}
                />
                {showProcessedLine && (
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="processados" 
                    name="Processados"
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  />
                )}
                {showValueLine && (
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="valor_total" 
                    name="Valor Total"
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                  />
                )}
              </ComposedChart>
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
    const data = payload[0]?.payload
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium mb-2">{data?.dataFormatada}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span className="font-bold">
              {entry.dataKey === 'valor_total' 
                ? formatCurrency(entry.value)
                : entry.value
              }
            </span>
          </div>
        ))}
        {data && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-muted-foreground">
              Taxa de processamento: {data.taxaProcessamento.toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    )
  }
  return null
}

/**
 * Utilitários de formatação
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  })
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
