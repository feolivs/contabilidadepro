'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { 
  Calendar as CalendarIcon, 
  Bell, 
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { FiscalCalendar } from '@/components/calendar/fiscal-calendar'
import { FiscalAlertsPanel } from '@/components/alerts/fiscal-alerts-panel'
import { useFiscalAlerts, FiscalAlert } from '@/hooks/use-fiscal-alerts'

export default function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateAlerts, setSelectedDateAlerts] = useState<FiscalAlert[]>([])
  const [showDateDetails, setShowDateDetails] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [createEventDate, setCreateEventDate] = useState<Date | null>(null)

  const { useActiveAlerts } = useFiscalAlerts()
  const { data: alerts = [] } = useActiveAlerts()

  const handleDateClick = (date: Date, dayAlerts: FiscalAlert[]) => {
    setSelectedDate(date)
    setSelectedDateAlerts(dayAlerts)
    setShowDateDetails(true)
  }

  const handleCreateEvent = (date: Date) => {
    setCreateEventDate(date)
    setShowCreateEvent(true)
  }

  const handleAlertClick = (alert: FiscalAlert) => {
    // TODO: Implementar visualização detalhada do alerta
    console.log('Alerta clicado:', alert)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Estatísticas rápidas
  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.priority === 'CRITICAL').length,
    high: alerts.filter(a => a.priority === 'HIGH').length,
    thisWeek: alerts.filter(a => {
      const alertDate = new Date(a.due_date)
      const today = new Date()
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      return alertDate >= today && alertDate <= weekFromNow
    }).length
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendário Fiscal</h1>
          <p className="text-gray-600 mt-2">
            Gerencie prazos e obrigações fiscais em um só lugar
          </p>
        </div>
        
        <Button 
          onClick={() => setShowCreateEvent(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <Bell className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-500">Total de Alertas</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-gray-500">Críticos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <div className="text-sm text-gray-500">Alta Prioridade</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <CalendarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{stats.thisWeek}</div>
            <div className="text-sm text-gray-500">Esta Semana</div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <FiscalCalendar
            onDateClick={handleDateClick}
            onCreateEvent={handleCreateEvent}
          />
        </div>

        {/* Painel de Alertas */}
        <div>
          <FiscalAlertsPanel
            maxAlerts={8}
            onAlertClick={handleAlertClick}
          />
        </div>
      </div>

      {/* Modal de Detalhes da Data */}
      <Dialog open={showDateDetails} onOpenChange={setShowDateDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && formatDate(selectedDate)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedDateAlerts.length > 0 ? (
              <div>
                <h3 className="font-semibold mb-3">Alertas para este dia:</h3>
                <div className="space-y-3">
                  {selectedDateAlerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge className={cn("text-xs", 
                          alert.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          alert.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          alert.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        )}>
                          {alert.priority}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {alert.description}
                      </p>
                      
                      {alert.suggested_actions && alert.suggested_actions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Ações sugeridas:</p>
                          <div className="flex flex-wrap gap-2">
                            {alert.suggested_actions.map((action, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum alerta para este dia</p>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowDateDetails(false)}
              >
                Fechar
              </Button>
              
              {selectedDate && (
                <Button
                  onClick={() => {
                    setCreateEventDate(selectedDate)
                    setShowDateDetails(false)
                    setShowCreateEvent(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Evento
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar Evento */}
      <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Evento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data</label>
              <p className="text-sm text-gray-600">
                {createEventDate && formatDate(createEventDate)}
              </p>
            </div>
            
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                Funcionalidade de criação de eventos será implementada em breve
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateEvent(false)}
              >
                Cancelar
              </Button>
              <Button disabled>
                Criar Evento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
