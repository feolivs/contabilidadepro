'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  AlertTriangle, 
  Clock, 
  FileText, 
  Calendar,
  X,
  ChevronRight
} from 'lucide-react'
import { useNavigationData } from '@/hooks/use-navigation-data'

interface AlertItem {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  count?: number
  action?: {
    label: string
    href: string
  }
  dismissible?: boolean
}

// Hook para gerar alertas baseados nos dados de navegação
const useSidebarAlerts = (): { alerts: AlertItem[], isLoading: boolean } => {
  const { data: navigationData, isLoading } = useNavigationData()

  const alerts: AlertItem[] = React.useMemo(() => {
    if (!navigationData) return []

    const alertList: AlertItem[] = []

    // Alertas críticos de prazos
    if (navigationData.stats.prazosPendentes >= 5) {
      alertList.push({
        id: 'prazos-criticos',
        type: 'critical',
        title: 'Prazos Críticos',
        description: `${navigationData.stats.prazosPendentes} prazos vencendo em breve`,
        count: navigationData.stats.prazosPendentes,
        action: {
          label: 'Ver Prazos',
          href: '/prazos'
        },
        dismissible: false
      })
    } else if (navigationData.stats.prazosPendentes >= 2) {
      alertList.push({
        id: 'prazos-aviso',
        type: 'warning',
        title: 'Prazos Próximos',
        description: `${navigationData.stats.prazosPendentes} prazos para acompanhar`,
        count: navigationData.stats.prazosPendentes,
        action: {
          label: 'Verificar',
          href: '/prazos'
        },
        dismissible: true
      })
    }

    // Alertas de documentos pendentes
    if (navigationData.stats.documentosPendentes >= 10) {
      alertList.push({
        id: 'documentos-criticos',
        type: 'critical',
        title: 'Muitos Documentos',
        description: `${navigationData.stats.documentosPendentes} documentos aguardando processamento`,
        count: navigationData.stats.documentosPendentes,
        action: {
          label: 'Processar',
          href: '/documentos'
        },
        dismissible: false
      })
    } else if (navigationData.stats.documentosPendentes >= 5) {
      alertList.push({
        id: 'documentos-aviso',
        type: 'warning',
        title: 'Documentos Pendentes',
        description: `${navigationData.stats.documentosPendentes} documentos para revisar`,
        count: navigationData.stats.documentosPendentes,
        action: {
          label: 'Revisar',
          href: '/documentos'
        },
        dismissible: true
      })
    }

    // Alertas de cálculos pendentes
    if (navigationData.stats.calculosPendentes >= 3) {
      alertList.push({
        id: 'calculos-pendentes',
        type: 'warning',
        title: 'Cálculos Pendentes',
        description: `${navigationData.stats.calculosPendentes} cálculos em rascunho`,
        count: navigationData.stats.calculosPendentes,
        action: {
          label: 'Finalizar',
          href: '/calculos'
        },
        dismissible: true
      })
    }

    // Alertas de insights de IA
    if (navigationData.alerts.aiInsights > 0) {
      alertList.push({
        id: 'ai-insights',
        type: 'info',
        title: 'Insights Disponíveis',
        description: `${navigationData.alerts.aiInsights} nova${navigationData.alerts.aiInsights !== 1 ? 's' : ''} análise${navigationData.alerts.aiInsights !== 1 ? 's' : ''} de IA`,
        count: navigationData.alerts.aiInsights,
        action: {
          label: 'Ver Insights',
          href: '/assistente'
        },
        dismissible: true
      })
    }

    return alertList
  }, [navigationData])

  return { alerts, isLoading }
}

// Componente individual de alerta
const SidebarAlert: React.FC<{
  alert: AlertItem
  onDismiss?: (id: string) => void
  compact?: boolean
}> = ({ alert, onDismiss, compact = false }) => {
  const getAlertStyles = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-red-900 dark:text-red-100',
          description: 'text-red-700 dark:text-red-300'
        }
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          title: 'text-yellow-900 dark:text-yellow-100',
          description: 'text-yellow-700 dark:text-yellow-300'
        }
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-blue-900 dark:text-blue-100',
          description: 'text-blue-700 dark:text-blue-300'
        }
    }
  }

  const getIcon = (type: AlertItem['type']) => {
    switch (type) {
      case 'critical':
        return AlertTriangle
      case 'warning':
        return Clock
      case 'info':
        return FileText
    }
  }

  const styles = getAlertStyles(alert.type)
  const IconComponent = getIcon(alert.type)

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 p-2 rounded-md border text-xs',
        styles.container
      )}>
        <IconComponent className={cn('w-3 h-3', styles.icon)} />
        <span className={cn('flex-1 font-medium', styles.title)}>
          {alert.title}
        </span>
        {alert.count && (
          <Badge variant="outline" className="h-4 text-xs">
            {alert.count}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'p-3 rounded-lg border space-y-2',
      styles.container
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <IconComponent className={cn('w-4 h-4', styles.icon)} />
          <h4 className={cn('font-medium text-sm', styles.title)}>
            {alert.title}
          </h4>
          {alert.count && (
            <Badge variant="outline" className="h-5 text-xs">
              {alert.count}
            </Badge>
          )}
        </div>
        
        {alert.dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onDismiss(alert.id)}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      <p className={cn('text-xs', styles.description)}>
        {alert.description}
      </p>
      
      {alert.action && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          asChild
        >
          <a href={alert.action.href} className="flex items-center gap-1">
            {alert.action.label}
            <ChevronRight className="w-3 h-3" />
          </a>
        </Button>
      )}
    </div>
  )
}

// Componente principal de alertas da sidebar
export const SidebarAlerts: React.FC<{
  compact?: boolean
  maxAlerts?: number
  className?: string
}> = ({ compact = false, maxAlerts = 3, className }) => {
  const { alerts, isLoading } = useSidebarAlerts()
  const [dismissedAlerts, setDismissedAlerts] = React.useState<Set<string>>(new Set())

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
  }

  const visibleAlerts = alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .slice(0, maxAlerts)

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (visibleAlerts.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {visibleAlerts.map(alert => (
        <SidebarAlert
          key={alert.id}
          alert={alert}
          onDismiss={handleDismiss}
          compact={compact}
        />
      ))}
    </div>
  )
}

export default SidebarAlerts
