'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface SmartBadgeProps {
  count?: number | string
  type?: 'deadline' | 'document' | 'client' | 'calculation' | 'info'
  isLoading?: boolean
  showIcon?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// Função para determinar a variante e ícone baseado no tipo e valor
const getBadgeConfig = (count: number | string, type: SmartBadgeProps['type']) => {
  const numCount = typeof count === 'string' ? parseInt(count) || 0 : count

  if (numCount === 0 && type !== 'info') {
    return null // Não mostrar badge se não há itens
  }

  const configs = {
    deadline: {
      variant: numCount >= 5 ? 'destructive' : numCount >= 2 ? 'default' : 'secondary',
      icon: numCount >= 2 ? AlertTriangle : Clock,
      pulse: numCount >= 5,
      tooltip: `${numCount} prazo${numCount !== 1 ? 's' : ''} vencendo`
    },
    document: {
      variant: numCount >= 10 ? 'destructive' : numCount >= 5 ? 'default' : 'secondary',
      icon: numCount >= 5 ? AlertCircle : CheckCircle,
      pulse: numCount >= 10,
      tooltip: `${numCount} documento${numCount !== 1 ? 's' : ''} pendente${numCount !== 1 ? 's' : ''}`
    },
    calculation: {
      variant: numCount >= 3 ? 'default' : 'secondary',
      icon: Clock,
      pulse: numCount >= 5,
      tooltip: `${numCount} cálculo${numCount !== 1 ? 's' : ''} pendente${numCount !== 1 ? 's' : ''}`
    },
    client: {
      variant: 'secondary' as const,
      icon: CheckCircle,
      pulse: false,
      tooltip: `${numCount} cliente${numCount !== 1 ? 's' : ''}`
    },
    info: {
      variant: 'secondary' as const,
      icon: CheckCircle,
      pulse: false,
      tooltip: count?.toString() || ''
    }
  }

  return configs[type || 'info']
}

export const SmartBadge: React.FC<SmartBadgeProps> = ({
  count,
  type = 'info',
  isLoading = false,
  showIcon = false,
  className,
  size = 'md'
}) => {
  // Loading state
  if (isLoading) {
    const sizeClasses = {
      sm: 'h-4 w-6',
      md: 'h-5 w-8',
      lg: 'h-6 w-10'
    }
    return <Skeleton className={cn('rounded-full', sizeClasses[size])} />
  }

  // Get badge configuration
  const config = getBadgeConfig(count || 0, type)
  if (!config) return null

  const sizeClasses = {
    sm: 'text-xs h-4 px-1.5',
    md: 'text-xs h-5 px-2',
    lg: 'text-sm h-6 px-2.5'
  }

  const IconComponent = config.icon

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'flex items-center gap-1 font-medium transition-all duration-200',
        sizeClasses[size],
        config.pulse && 'animate-pulse',
        className
      )}
      title={config.tooltip}
    >
      {showIcon && <IconComponent className="w-3 h-3" />}
      <span>{count}</span>
    </Badge>
  )
}

// Componente para múltiplos badges com priorização
interface SmartBadgeGroupProps {
  badges: Array<{
    count: number | string
    type: SmartBadgeProps['type']
    label?: string
  }>
  maxVisible?: number
  isLoading?: boolean
  className?: string
}

export const SmartBadgeGroup: React.FC<SmartBadgeGroupProps> = ({
  badges,
  maxVisible = 2,
  isLoading = false,
  className
}) => {
  if (isLoading) {
    return (
      <div className={cn('flex gap-1', className)}>
        {Array.from({ length: maxVisible }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-8 rounded-full" />
        ))}
      </div>
    )
  }

  // Filtrar badges válidos e ordenar por prioridade
  const validBadges = badges
    .map(badge => ({
      ...badge,
      config: getBadgeConfig(badge.count, badge.type)
    }))
    .filter(badge => badge.config)
    .sort((a, b) => {
      // Priorizar badges críticos (destructive)
      if (a.config?.variant === 'destructive' && b.config?.variant !== 'destructive') return -1
      if (b.config?.variant === 'destructive' && a.config?.variant !== 'destructive') return 1
      
      // Depois badges com pulse
      if (a.config?.pulse && !b.config?.pulse) return -1
      if (b.config?.pulse && !a.config?.pulse) return 1
      
      return 0
    })

  const visibleBadges = validBadges.slice(0, maxVisible)
  const hiddenCount = validBadges.length - maxVisible

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {visibleBadges.map((badge, index) => (
        <SmartBadge
          key={`${badge.type}-${index}`}
          count={badge.count}
          type={badge.type}
          size="sm"
        />
      ))}
      
      {hiddenCount > 0 && (
        <Badge variant="outline" className="text-xs h-4 px-1.5">
          +{hiddenCount}
        </Badge>
      )}
    </div>
  )
}

export default SmartBadge
