'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus
} from 'lucide-react'
import { useFiscalAlerts, FiscalAlert } from '@/hooks/use-fiscal-alerts'
import { cn } from '@/lib/utils'

interface FiscalCalendarProps {
  onDateClick?: (date: Date, alerts: FiscalAlert[]) => void
  onCreateEvent?: (date: Date) => void
  showOnlyAlerts?: boolean
}

export function FiscalCalendar({ 
  onDateClick, 
  onCreateEvent,
  showOnlyAlerts = false 
}: FiscalCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const { useActiveAlerts, PRIORITY_COLORS } = useFiscalAlerts()
  const { data: alerts = [] } = useActiveAlerts()

  // Obrigações fiscais fixas (calendário brasileiro)
  const fixedObligations = useMemo(() => [
    // DAS - todo dia 20
    { day: 20, title: 'Vencimento DAS', type: 'DAS_VENCIMENTO', priority: 'HIGH' as const },
    
    // IRPJ/CSLL - trimestral (último dia útil dos meses 4, 7, 10, 1)
    { month: 4, day: 30, title: 'IRPJ/CSLL 1º Trimestre', type: 'IRPJ_VENCIMENTO', priority: 'HIGH' as const },
    { month: 7, day: 31, title: 'IRPJ/CSLL 2º Trimestre', type: 'IRPJ_VENCIMENTO', priority: 'HIGH' as const },
    { month: 10, day: 31, title: 'IRPJ/CSLL 3º Trimestre', type: 'IRPJ_VENCIMENTO', priority: 'HIGH' as const },
    { month: 1, day: 31, title: 'IRPJ/CSLL 4º Trimestre', type: 'IRPJ_VENCIMENTO', priority: 'HIGH' as const },
    
    // DEFIS - até 31 de maio
    { month: 5, day: 31, title: 'Prazo DEFIS', type: 'DEFIS_PRAZO', priority: 'CRITICAL' as const },
    
    // RAIS - até 31 de março
    { month: 3, day: 31, title: 'Prazo RAIS', type: 'RAIS_PRAZO', priority: 'HIGH' as const },
    
    // DIRF - até último dia de fevereiro
    { month: 2, day: 28, title: 'Prazo DIRF', type: 'DIRF_PRAZO', priority: 'HIGH' as const }
  ], [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Gerar dias do mês
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Agrupar alertas por data
  const alertsByDate = useMemo(() => {
    const grouped: Record<string, FiscalAlert[]> = {}
    
    alerts.forEach(alert => {
      const alertDate = new Date(alert.due_date)
      const key = `${alertDate.getFullYear()}-${alertDate.getMonth()}-${alertDate.getDate()}`
      
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(alert)
    })
    
    return grouped
  }, [alerts])

  // Obter obrigações fixas para o mês atual
  const getFixedObligationsForDate = (day: number) => {
    return fixedObligations.filter(obligation => {
      if (obligation.day && !obligation.month) {
        // Obrigação mensal (como DAS)
        return obligation.day === day
      } else if (obligation.month && obligation.day) {
        // Obrigação anual
        return obligation.month === month + 1 && obligation.day === day
      }
      return false
    })
  }

  // Obter alertas para uma data específica
  const getAlertsForDate = (day: number) => {
    const key = `${year}-${month}-${day}`
    return alertsByDate[key] || []
  }

  // Navegar entre meses
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // Lidar com clique em data
  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day)
    setSelectedDate(clickedDate)
    
    const dayAlerts = getAlertsForDate(day)
    onDateClick?.(clickedDate, dayAlerts)
  }

  // Obter cor do dia baseado nos alertas
  const getDayColor = (day: number) => {
    const dayAlerts = getAlertsForDate(day)
    const fixedObligations = getFixedObligationsForDate(day)
    
    if (dayAlerts.length === 0 && fixedObligations.length === 0) {
      return ''
    }

    // Prioridade: alertas críticos > alertas altos > obrigações fixas
    const hasCritical = dayAlerts.some(a => a.priority === 'CRITICAL') || 
                       fixedObligations.some(o => o.priority === 'CRITICAL')
    const hasHigh = dayAlerts.some(a => a.priority === 'HIGH') || 
                    fixedObligations.some(o => o.priority === 'HIGH')

    if (hasCritical) return 'bg-red-100 text-red-800 border-red-200'
    if (hasHigh) return 'bg-orange-100 text-orange-800 border-orange-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  // Verificar se é hoje
  const isToday = (day: number) => {
    const today = new Date()
    return today.getFullYear() === year && 
           today.getMonth() === month && 
           today.getDate() === day
  }

  // Verificar se está selecionado
  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return selectedDate.getFullYear() === year && 
           selectedDate.getMonth() === month && 
           selectedDate.getDate() === day
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendário Fiscal
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-lg font-semibold min-w-[140px] text-center">
              {monthNames[month]} {year}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Dias do mês */}
        <div className="grid grid-cols-7 gap-1">
          {/* Espaços vazios para o primeiro dia do mês */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} className="p-2 h-20"></div>
          ))}
          
          {/* Dias do mês */}
          {daysArray.map(day => {
            const dayAlerts = getAlertsForDate(day)
            const fixedObligations = getFixedObligationsForDate(day)
            const totalEvents = dayAlerts.length + fixedObligations.length
            
            return (
              <div
                key={day}
                className={cn(
                  "p-2 h-20 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 relative",
                  getDayColor(day),
                  isToday(day) && "ring-2 ring-blue-500",
                  isSelected(day) && "ring-2 ring-purple-500"
                )}
                onClick={() => handleDateClick(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    isToday(day) && "font-bold"
                  )}>
                    {day}
                  </span>
                  
                  {totalEvents > 0 && (
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      {totalEvents}
                    </Badge>
                  )}
                </div>
                
                {/* Indicadores de eventos */}
                <div className="space-y-1">
                  {/* Alertas críticos */}
                  {dayAlerts.filter(a => a.priority === 'CRITICAL').slice(0, 1).map((alert, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <AlertTriangle className="h-2 w-2 text-red-600" />
                      <span className="text-xs truncate">{alert.title}</span>
                    </div>
                  ))}
                  
                  {/* Alertas altos */}
                  {dayAlerts.filter(a => a.priority === 'HIGH').slice(0, 1).map((alert, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Clock className="h-2 w-2 text-orange-600" />
                      <span className="text-xs truncate">{alert.title}</span>
                    </div>
                  ))}
                  
                  {/* Obrigações fixas */}
                  {fixedObligations.slice(0, 1).map((obligation, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <CalendarIcon className="h-2 w-2 text-blue-600" />
                      <span className="text-xs truncate">{obligation.title}</span>
                    </div>
                  ))}
                  
                  {/* Indicador de mais eventos */}
                  {totalEvents > 2 && (
                    <div className="text-xs text-gray-500">
                      +{totalEvents - 2} mais
                    </div>
                  )}
                </div>
                
                {/* Botão de adicionar evento */}
                {onCreateEvent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-4 w-4 p-0 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateEvent(new Date(year, month, day))
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Legenda */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>Crítico</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
              <span>Alto</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>Normal</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
