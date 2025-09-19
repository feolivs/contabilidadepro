// 🔔 ACTIVITY FEED COMPONENT
// Feed de atividades em tempo real
// Integrado ao sistema de analytics

'use client'

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  FileText, 
  Calculator, 
  Building2, 
  Bot, 
  Upload, 
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ActivityItem } from '@/hooks/use-realtime-analytics'

interface ActivityFeedProps {
  activities: ActivityItem[]
  loading?: boolean
  maxItems?: number
  showTimestamp?: boolean
  compact?: boolean
  className?: string
}

export function ActivityFeed({
  activities,
  loading = false,
  maxItems = 20,
  showTimestamp = true,
  compact = false,
  className
}: ActivityFeedProps) {
  const [showAll, setShowAll] = useState(false)

  const getActivityIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      'document_upload': Upload,
      'document_processed': FileText,
      'calculation_done': Calculator,
      'company_created': Building2,
      'company_updated': Building2,
      'ai_query': Bot,
      'report_generated': FileText,
      'user_login': User,
      'system_alert': AlertCircle,
      'payment_generated': CheckCircle
    }
    
    const IconComponent = iconMap[type] || FileText
    return <IconComponent className="h-4 w-4" />
  }

  const getActivityColor = (type: string) => {
    const colorMap: Record<string, string> = {
      'document_upload': 'text-blue-600',
      'document_processed': 'text-green-600',
      'calculation_done': 'text-purple-600',
      'company_created': 'text-emerald-600',
      'company_updated': 'text-yellow-600',
      'ai_query': 'text-indigo-600',
      'report_generated': 'text-orange-600',
      'user_login': 'text-gray-600',
      'system_alert': 'text-red-600',
      'payment_generated': 'text-green-600'
    }
    
    return colorMap[type] || 'text-gray-600'
  }

  const getActivityBadge = (type: string) => {
    const badgeMap: Record<string, { variant: any; label: string }> = {
      'document_upload': { variant: 'secondary', label: 'Upload' },
      'document_processed': { variant: 'default', label: 'Processado' },
      'calculation_done': { variant: 'default', label: 'Calculado' },
      'company_created': { variant: 'default', label: 'Criado' },
      'company_updated': { variant: 'secondary', label: 'Atualizado' },
      'ai_query': { variant: 'secondary', label: 'IA' },
      'report_generated': { variant: 'default', label: 'Relatório' },
      'user_login': { variant: 'outline', label: 'Login' },
      'system_alert': { variant: 'destructive', label: 'Alerta' },
      'payment_generated': { variant: 'default', label: 'Pagamento' }
    }
    
    const badge = badgeMap[type] || { variant: 'outline', label: 'Evento' }
    return <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
  }

  const formatValue = (value?: number, type?: string) => {
    if (!value) return null
    
    if (type?.includes('calculation') || type?.includes('payment')) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }
    
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  const displayedActivities = showAll ? activities : activities.slice(0, maxItems)

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Nenhuma atividade recente</p>
        <p className="text-gray-500 text-sm">As atividades aparecerão aqui em tempo real</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      <ScrollArea className={compact ? 'h-64' : 'h-96'}>
        <div className="space-y-3">
          {displayedActivities.map((activity, index) => (
            <div
              key={activity.id}
              className={cn(
                'flex items-start space-x-3 p-3 rounded-lg transition-colors',
                'hover:bg-gray-50 border border-transparent hover:border-gray-200',
                index === 0 && 'bg-blue-50/50 border-blue-200' // Destacar atividade mais recente
              )}
            >
              {/* Ícone */}
              <div className={cn(
                'flex-shrink-0 p-2 rounded-full bg-white border',
                getActivityColor(activity.type)
              )}>
                {getActivityIcon(activity.type)}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.description}
                    </p>
                    
                    {/* Metadados */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(() => {
                          const tipoCalculo = activity.metadata.tipo_calculo
                          return tipoCalculo && typeof tipoCalculo === 'string' ? (
                            <Badge variant="outline" className="text-xs">
                              {tipoCalculo}
                            </Badge>
                          ) : null
                        })()}
                        {(() => {
                          const regime = activity.metadata.regime
                          return regime && typeof regime === 'string' ? (
                            <Badge variant="outline" className="text-xs">
                              {regime}
                            </Badge>
                          ) : null
                        })()}
                      </div>
                    )}

                    {/* Valor */}
                    {activity.value && (
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        {formatValue(activity.value, activity.type)}
                      </p>
                    )}

                    {/* Timestamp */}
                    {showTimestamp && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    )}
                  </div>

                  {/* Badge do tipo */}
                  <div className="flex-shrink-0 ml-2">
                    {getActivityBadge(activity.type)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Botão para mostrar mais */}
      {activities.length > maxItems && (
        <div className="pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full"
          >
            <MoreHorizontal className="h-4 w-4 mr-2" />
            {showAll ? 'Mostrar menos' : `Ver mais ${activities.length - maxItems} atividades`}
          </Button>
        </div>
      )}

      {/* Indicador de tempo real */}
      <div className="flex items-center justify-center pt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <span>Atualizando em tempo real</span>
        </div>
      </div>
    </div>
  )
}

// Versão compacta para sidebars
export function CompactActivityFeed({
  activities,
  loading = false,
  maxItems = 5
}: Pick<ActivityFeedProps, 'activities' | 'loading' | 'maxItems'>) {
  return (
    <ActivityFeed
      activities={activities}
      loading={loading}
      maxItems={maxItems}
      compact={true}
      showTimestamp={false}
      className="space-y-2"
    />
  )
}

// Widget de atividade única para notificações
export function ActivityNotification({ 
  activity,
  onDismiss 
}: { 
  activity: ActivityItem
  onDismiss?: () => void 
}) {
  return (
    <div className="flex items-start space-x-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex-shrink-0 p-2 rounded-full bg-blue-50 text-blue-600">
        {getActivityIcon(activity.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {activity.description}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {format(new Date(activity.timestamp), 'HH:mm', { locale: ptBR })}
        </p>
      </div>

      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="flex-shrink-0"
        >
          ×
        </Button>
      )}
    </div>
  )
}

// Função auxiliar para ícones (reutilizada)
function getActivityIcon(type: string) {
  const iconMap: Record<string, any> = {
    'document_upload': Upload,
    'document_processed': FileText,
    'calculation_done': Calculator,
    'company_created': Building2,
    'company_updated': Building2,
    'ai_query': Bot,
    'report_generated': FileText,
    'user_login': User,
    'system_alert': AlertCircle,
    'payment_generated': CheckCircle
  }
  
  const IconComponent = iconMap[type] || FileText
  return <IconComponent className="h-4 w-4" />
}
