'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  FileText,
  Settings,
  X,
  Eye,
  AlertCircle
} from 'lucide-react'
import { useFiscalAlerts, FiscalAlert, AlertPriority } from '@/hooks/use-fiscal-alerts'
import { cn } from '@/lib/utils'

interface FiscalAlertsPanelProps {
  showOnlyHighPriority?: boolean
  maxAlerts?: number
  onAlertClick?: (alert: FiscalAlert) => void
}

export function FiscalAlertsPanel({ 
  showOnlyHighPriority = false,
  maxAlerts = 10,
  onAlertClick
}: FiscalAlertsPanelProps) {
  const [selectedPriority, setSelectedPriority] = useState<AlertPriority | undefined>(
    showOnlyHighPriority ? 'HIGH' : undefined
  )
  
  const {
    useActiveAlerts,
    acknowledgeAlert,
    resolveAlert,
    ALERT_TYPE_LABELS,
    PRIORITY_COLORS,
    isAcknowledging,
    isResolving
  } = useFiscalAlerts()

  const { data: alerts = [], isLoading, error } = useActiveAlerts(selectedPriority)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPriorityIcon = (priority: AlertPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'MEDIUM':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'LOW':
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const handleAcknowledge = async (alertId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await acknowledgeAlert(alertId)
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error)
    }
  }

  const handleResolve = async (alertId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await resolveAlert(alertId)
    } catch (error) {
      console.error('Erro ao resolver alerta:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas Fiscais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas Fiscais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm">Erro ao carregar alertas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayAlerts = alerts.slice(0, maxAlerts)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas Fiscais
            {alerts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {!showOnlyHighPriority && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPriority(
                  selectedPriority ? undefined : 'HIGH'
                )}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {displayAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">
              {selectedPriority 
                ? `Nenhum alerta de prioridade ${selectedPriority.toLowerCase()}`
                : 'Nenhum alerta ativo'
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {displayAlerts.map((alert) => {
                const daysUntilDue = getDaysUntilDue(alert.due_date)
                const isOverdue = daysUntilDue < 0
                const isUrgent = daysUntilDue <= 3 && daysUntilDue >= 0
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "border rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50",
                      isOverdue && "border-red-200 bg-red-50",
                      isUrgent && "border-orange-200 bg-orange-50"
                    )}
                    onClick={() => onAlertClick?.(alert)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getPriorityIcon(alert.priority)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {alert.title}
                            </h4>
                            <Badge className={cn("text-xs", PRIORITY_COLORS[alert.priority])}>
                              {alert.priority}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {alert.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(alert.due_date)}
                            </span>
                            
                            <span className={cn(
                              "font-medium",
                              isOverdue && "text-red-600",
                              isUrgent && "text-orange-600"
                            )}>
                              {isOverdue 
                                ? `${Math.abs(daysUntilDue)} dias em atraso`
                                : daysUntilDue === 0
                                ? 'Vence hoje'
                                : `${daysUntilDue} dias restantes`
                              }
                            </span>
                          </div>
                          
                          {alert.suggested_actions && alert.suggested_actions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Ações sugeridas:</p>
                              <div className="flex flex-wrap gap-1">
                                {alert.suggested_actions.slice(0, 2).map((action, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {action}
                                  </Badge>
                                ))}
                                {alert.suggested_actions.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{alert.suggested_actions.length - 2} mais
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleAcknowledge(alert.id, e)}
                          disabled={isAcknowledging}
                          title="Reconhecer alerta"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleResolve(alert.id, e)}
                          disabled={isResolving}
                          title="Resolver alerta"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        {alerts.length > maxAlerts && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-center text-sm text-gray-500">
              Mostrando {maxAlerts} de {alerts.length} alertas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
