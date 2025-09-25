// 📊 REALTIME CHART COMPONENT
// Componente para gráficos que se atualizam em tempo real
// Integrado com Recharts e sistema de analytics

'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Import dos componentes Recharts
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(mod => ({ default: mod.AreaChart })), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => ({ default: mod.Area })), { ssr: false })

interface ChartDataPoint {
  date?: string
  name?: string
  value: number
  [key: string]: any
}

interface RealtimeChartProps {
  data: ChartDataPoint[]
  type: 'line' | 'area' | 'bar' | 'pie'
  loading?: boolean
  height?: number
  className?: string
  colors?: string[]
  showGrid?: boolean
  showLegend?: boolean
  animate?: boolean
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
]

export function RealtimeChart({
  data,
  type,
  loading = false,
  height = 300,
  className,
  colors = DEFAULT_COLORS,
  showGrid = true,
  showLegend = false,
  animate = true
}: RealtimeChartProps) {
  
  // Processar dados para diferentes tipos de gráfico
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    switch (type) {
      case 'line':
      case 'area':
      case 'bar':
        return data.map(item => ({
          ...item,
          date: item.date ? new Date(item.date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit'
          }) : item.name,
          value: Number(item.value) || 0
        }))
      
      case 'pie':
        return data.map(item => ({
          name: item.name || 'Sem nome',
          value: Number(item.value) || 0
        }))
      
      default:
        return data
    }
  }, [data, type])

  // Formatador para tooltip
  const formatTooltipValue = (value: number, name: string) => {
    if (name.toLowerCase().includes('valor') || name.toLowerCase().includes('faturamento')) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }
    
    if (name.toLowerCase().includes('tempo')) {
      if (value < 1000) return `${Math.round(value)}ms`
      return `${(value / 1000).toFixed(1)}s`
    }
    
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  // Formatador para labels do eixo Y
  const formatYAxisLabel = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  if (loading) {
    return (
      <div className={cn('w-full', className)} style={{ height }}>
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    )
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div 
        className={cn('flex items-center justify-center text-muted-foreground', className)}
        style={{ height }}
      >
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Sem dados disponíveis</div>
          <div className="text-sm">Os dados aparecerão aqui quando disponíveis</div>
        </div>
      </div>
    )
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={processedData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxisLabel}
            />
            <Tooltip
              formatter={(value: any, name: string) => [
                typeof value === 'number' ? formatTooltipValue(value) : value,
                name
              ]}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            {showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors[0]}
              strokeWidth={2}
              dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2 }}
              animationDuration={animate ? 1000 : 0}
            />
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart data={processedData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxisLabel}
            />
            <Tooltip
              formatter={(value: any, name: string) => [
                typeof value === 'number' ? formatTooltipValue(value) : value,
                name
              ]}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            {showLegend && <Legend />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={colors[0]}
              fill={colors[0]}
              fillOpacity={0.3}
              strokeWidth={2}
              animationDuration={animate ? 1000 : 0}
            />
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart data={processedData}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxisLabel}
            />
            <Tooltip
              formatter={(value: any, name: string) => [
                typeof value === 'number' ? formatTooltipValue(value) : value,
                name
              ]}
              labelStyle={{ color: '#374151' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            {showLegend && <Legend />}
            <Bar
              dataKey="value"
              fill={colors[0]}
              radius={[4, 4, 0, 0]}
              animationDuration={animate ? 1000 : 0}
            />
          </BarChart>
        )

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              outerRadius={Math.min(height * 0.35, 120)}
              fill={colors[0]}
              dataKey="value"
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              animationDuration={animate ? 1000 : 0}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={colors[index % colors.length]} 
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                new Intl.NumberFormat('pt-BR').format(value),
                'Quantidade'
              ]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            {showLegend && <Legend />}
          </PieChart>
        )

      default:
        return <div>Tipo de gráfico não suportado</div>
    }
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
      
      {/* Indicador de dados em tempo real */}
      <div className="flex items-center justify-end mt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span>Dados em tempo real</span>
        </div>
      </div>
    </div>
  )
}
