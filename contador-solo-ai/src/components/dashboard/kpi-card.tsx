// 📊 KPI CARD COMPONENT
// Componente para exibir KPIs com formatação e trends
// Integrado ao sistema de analytics em tempo real

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: number
  format: 'currency' | 'number' | 'percentage' | 'time'
  icon: LucideIcon
  trend?: number
  subtitle?: string
  loading?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function KPICard({
  title,
  value,
  format,
  icon: Icon,
  trend,
  subtitle,
  loading = false,
  className,
  size = 'md'
}: KPICardProps) {
  
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(val)
      
      case 'percentage':
        return `${val.toFixed(1)}%`
      
      case 'time':
        if (val < 1000) return `${Math.round(val)}ms`
        if (val < 60000) return `${(val / 1000).toFixed(1)}s`
        return `${(val / 60000).toFixed(1)}min`
      
      case 'number':
      default:
        return new Intl.NumberFormat('pt-BR').format(val)
    }
  }

  const getTrendIcon = (trendValue?: number) => {
    if (!trendValue || trendValue === 0) return <Minus className="h-3 w-3" />
    if (trendValue > 0) return <TrendingUp className="h-3 w-3" />
    return <TrendingDown className="h-3 w-3" />
  }

  const getTrendColor = (trendValue?: number) => {
    if (!trendValue || trendValue === 0) return 'text-gray-500'
    if (trendValue > 0) return 'text-green-600'
    return 'text-red-600'
  }

  const getTrendBadgeVariant = (trendValue?: number) => {
    if (!trendValue || trendValue === 0) return 'secondary'
    if (trendValue > 0) return 'default'
    return 'destructive'
  }

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const valueSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  }

  if (loading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className={cn('rounded', iconSizes[size])} />
        </CardHeader>
        <CardContent className={sizeClasses[size]}>
          <Skeleton className={cn('mb-2', valueSizes[size] === 'text-xl' ? 'h-6' : valueSizes[size] === 'text-2xl' ? 'h-8' : 'h-10')} />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('relative overflow-hidden transition-all hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn('text-muted-foreground', iconSizes[size])} />
      </CardHeader>
      
      <CardContent className={sizeClasses[size]}>
        <div className="space-y-2">
          {/* Valor Principal */}
          <div className={cn('font-bold tracking-tight', valueSizes[size])}>
            {formatValue(value, format)}
          </div>

          {/* Subtitle e Trend */}
          <div className="flex items-center justify-between">
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            
            {trend !== undefined && (
              <Badge 
                variant={getTrendBadgeVariant(trend)}
                className="flex items-center gap-1 text-xs"
              >
                {getTrendIcon(trend)}
                {trend !== 0 && (
                  <span>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                  </span>
                )}
                {trend === 0 && <span>Estável</span>}
              </Badge>
            )}
          </div>
        </div>

        {/* Indicador de Realtime */}
        <div className="absolute top-2 right-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

// Variante compacta para dashboards densos
export function CompactKPICard({
  title,
  value,
  format,
  icon: Icon,
  trend,
  loading = false,
  className
}: Omit<KPICardProps, 'size' | 'subtitle'>) {
  
  const formatValue = (val: number, fmt: string) => {
    switch (fmt) {
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(val)
      
      case 'percentage':
        return `${val.toFixed(1)}%`
      
      case 'time':
        if (val < 1000) return `${Math.round(val)}ms`
        return `${(val / 1000).toFixed(1)}s`
      
      case 'number':
      default:
        return new Intl.NumberFormat('pt-BR', {
          notation: 'compact',
          maximumFractionDigits: 1
        }).format(val)
    }
  }

  if (loading) {
    return (
      <div className={cn('flex items-center space-x-3 p-3 rounded-lg border bg-card', className)}>
        <Skeleton className="h-8 w-8 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center space-x-3 p-3 rounded-lg border bg-card transition-all hover:shadow-sm',
      className
    )}>
      <div className="flex-shrink-0">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">
          {title}
        </p>
        <div className="flex items-center space-x-2">
          <p className="text-lg font-bold">
            {formatValue(value, format)}
          </p>
          
          {trend !== undefined && trend !== 0 && (
            <div className={cn(
              'flex items-center text-xs',
              trend > 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Grid de KPIs para layouts responsivos
export function KPIGrid({ 
  kpis, 
  loading = false,
  compact = false 
}: { 
  kpis: Array<Omit<KPICardProps, 'loading'>>
  loading?: boolean
  compact?: boolean 
}) {
  const CardComponent = compact ? CompactKPICard : KPICard

  return (
    <div className={cn(
      'grid gap-4',
      compact 
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    )}>
      {kpis.map((kpi, index) => (
        <CardComponent
          key={`${kpi.title}-${index}`}
          {...kpi}
          loading={loading}
        />
      ))}
    </div>
  )
}
