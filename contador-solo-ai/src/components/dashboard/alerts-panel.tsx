// 🚨 ALERTS PANEL COMPONENT
// Painel de alertas e notificações em tempo real
// Integrado ao sistema de compliance e prazos

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  AlertTriangle, 
  Clock, 
  FileText, 
  Calendar,
  CheckCircle,
  XCircle,
  Bell,
  BellOff,
  Filter
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

interface Alert {
  id: string
  type: 'deadline' | 'compliance' | 'system' | 'calculation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  due_date?: string
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, any>
  resolved?: boolean
  created_at: string
}

interface AlertsPanelProps {
  maxAlerts?: number
  showResolved?: boolean
  autoRefresh?: boolean
  className?: string
}

export function AlertsPanel({
  maxAlerts = 10,
  showResolved = false,
  autoRefresh = true,
  className
}: AlertsPanelProps) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<'all' | 'high' | 'critical'>('all')
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Query para buscar alertas
  const {
    data: alerts,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['alerts', user?.id, filter, showResolved],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      // Buscar prazos fiscais próximos
      const { data: deadlines, error: deadlinesError } = await supabase
        .from('fiscal_obligations')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', new Date().toISOString())
        .lte('due_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('due_date', { ascending: true })

      if (deadlinesError) throw deadlinesError

      // Buscar alertas do sistema
      const { data: systemAlerts, error: systemError } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('resolved', false)
        .order('created_at', { ascending: false })

      if (systemError && systemError.code !== 'PGRST116') {
        console.warn('Tabela system_alerts não encontrada, usando dados mock')
      }

      // Converter prazos em alertas
      const deadlineAlerts: Alert[] = (deadlines || []).map(deadline => {
        const daysUntilDue = differenceInDays(new Date(deadline.due_date), new Date())
        let priority: Alert['priority'] = 'low'
        
        if (daysUntilDue <= 3) priority = 'critical'
        else if (daysUntilDue <= 7) priority = 'high'
        else if (daysUntilDue <= 15) priority = 'medium'

        return {
          id: `deadline-${deadline.id}`,
          type: 'deadline',
          priority,
          title: `${deadline.obligation_type} - ${deadline.company_name}`,
          description: `Vencimento em ${daysUntilDue} dia(s)`,
          due_date: deadline.due_date,
          entity_type: 'fiscal_obligation',
          entity_id: deadline.id,
          metadata: {
            company_id: deadline.company_id,
            obligation_type: deadline.obligation_type
          },
          resolved: false,
          created_at: deadline.created_at
        }
      })

      // Converter alertas do sistema
      const systemAlertsFormatted: Alert[] = (systemAlerts || []).map(alert => ({
        id: alert.id,
        type: alert.alert_type || 'system',
        priority: alert.priority || 'medium',
        title: alert.title,
        description: alert.description,
        entity_type: alert.entity_type,
        entity_id: alert.entity_id,
        metadata: alert.metadata,
        resolved: alert.resolved,
        created_at: alert.created_at
      }))

      // Combinar e filtrar alertas
      let allAlerts = [...deadlineAlerts, ...systemAlertsFormatted]

      if (filter !== 'all') {
        allAlerts = allAlerts.filter(alert => alert.priority === filter)
      }

      if (!showResolved) {
        allAlerts = allAlerts.filter(alert => !alert.resolved)
      }

      // Ordenar por prioridade e data
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      allAlerts.sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      return allAlerts.slice(0, maxAlerts)
    },
    enabled: !!user?.id,
    refetchInterval: autoRefresh ? 30000 : false, // Atualizar a cada 30s
    staleTime: 25000
  })

  // Efeito sonoro para novos alertas críticos
  useEffect(() => {
    if (!soundEnabled || !alerts) return

    const criticalAlerts = alerts.filter(alert => 
      alert.priority === 'critical' && !alert.resolved
    )

    if (criticalAlerts.length > 0) {
      // Aqui você pode adicionar um som de notificação
      console.log('🚨 Alertas críticos detectados:', criticalAlerts.length)
    }
  }, [alerts, soundEnabled])

  const getPriorityIcon = (priority: Alert['priority']) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'low':
        return <FileText className="h-4 w-4 text-blue-600" />
    }
  }

  const getPriorityBadge = (priority: Alert['priority']) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const

    const labels = {
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Médio',
      low: 'Baixo'
    }

    return (
      <Badge variant={variants[priority]} className="text-xs">
        {labels[priority]}
      </Badge>
    )
  }

  const getTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'deadline':
        return <Calendar className="h-4 w-4" />
      case 'compliance':
        return <FileText className="h-4 w-4" />
      case 'calculation':
        return <CheckCircle className="h-4 w-4" />
      case 'system':
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const resolveAlert = async (alertId: string) => {
    // Implementar resolução de alerta
    console.log('Resolvendo alerta:', alertId)
    refetch()
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas e Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const criticalCount = alerts?.filter(a => a.priority === 'critical').length || 0
  const highCount = alerts?.filter(a => a.priority === 'high').length || 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas e Notificações
            {(criticalCount > 0 || highCount > 0) && (
              <Badge variant="destructive" className="ml-2">
                {criticalCount + highCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextFilter = filter === 'all' ? 'high' : filter === 'high' ? 'critical' : 'all'
                setFilter(nextFilter)
              }}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <CardDescription>
          {filter === 'all' ? 'Todos os alertas' : `Alertas de prioridade ${filter}`}
          {autoRefresh && ' • Atualizando automaticamente'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Nenhum alerta ativo</p>
            <p className="text-gray-500 text-sm">Tudo está em ordem!</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start space-x-3 p-3 rounded-lg border transition-colors',
                    alert.priority === 'critical' && 'bg-red-50 border-red-200',
                    alert.priority === 'high' && 'bg-orange-50 border-orange-200',
                    alert.priority === 'medium' && 'bg-yellow-50 border-yellow-200',
                    alert.priority === 'low' && 'bg-blue-50 border-blue-200'
                  )}
                >
                  {/* Ícone */}
                  <div className="flex-shrink-0 p-1">
                    {getPriorityIcon(alert.priority)}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {alert.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {alert.description}
                        </p>
                        
                        {alert.due_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Vencimento: {format(new Date(alert.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-2">
                        {getPriorityBadge(alert.priority)}
                        
                        {!alert.resolved && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                            className="text-xs h-6 px-2"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Resumo */}
        {alerts && alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total: {alerts.length} alertas</span>
              <div className="flex gap-4">
                {criticalCount > 0 && (
                  <span className="text-red-600">Críticos: {criticalCount}</span>
                )}
                {highCount > 0 && (
                  <span className="text-orange-600">Altos: {highCount}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
