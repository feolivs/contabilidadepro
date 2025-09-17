'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Settings, 
  RefreshCw,
  Zap,
  Bell,
  Calendar
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface CronJobStatus {
  job_name: string
  schedule: string
  active: boolean
  last_run: string | null
  next_run: string | null
}

interface AlertasSystemStatus {
  cron_jobs: CronJobStatus[]
  total_alerts_today: number
  alerts_sent_today: number
  system_health: 'healthy' | 'warning' | 'error'
  last_check: string
}

export function SistemaAlertasStatus() {
  const [status, setStatus] = useState<AlertasSystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStatus = async () => {
    try {
      setIsRefreshing(true)

      // Buscar status dos cron jobs
      const { data: cronJobs, error: cronError } = await supabase
        .rpc('get_fiscal_alerts_status')

      if (cronError) {
        console.error('Erro ao buscar status dos cron jobs:', cronError)
        toast.error('Erro ao carregar status dos alertas')
        return
      }

      // Buscar estatísticas de alertas do dia
      const today = new Date().toISOString().split('T')[0]
      const { data: alertsData, error: alertsError } = await supabase
        .from('system_alerts')
        .select('id, created_at, resolved')
        .gte('created_at', today)

      if (alertsError) {
        console.error('Erro ao buscar alertas:', alertsError)
      }

      const totalAlertsToday = alertsData?.length || 0
      const alertsSentToday = alertsData?.filter(a => !a.resolved).length || 0

      // Determinar saúde do sistema
      const activeJobs = cronJobs?.filter((job: any) => job.active).length || 0
      const totalJobs = cronJobs?.length || 0
      
      let systemHealth: 'healthy' | 'warning' | 'error' = 'healthy'
      if (activeJobs === 0) {
        systemHealth = 'error'
      } else if (activeJobs < totalJobs) {
        systemHealth = 'warning'
      }

      setStatus({
        cron_jobs: cronJobs || [],
        total_alerts_today: totalAlertsToday,
        alerts_sent_today: alertsSentToday,
        system_health: systemHealth,
        last_check: new Date().toISOString()
      })

    } catch (error) {
      console.error('Erro ao buscar status:', error)
      toast.error('Erro ao carregar status do sistema')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-600" />
      default: return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const formatSchedule = (schedule: string) => {
    const scheduleMap: Record<string, string> = {
      '0 9 * * *': 'Diário às 09:00',
      '0 */4 * * *': 'A cada 4 horas',
      '0 2 * * 0': 'Domingo às 02:00'
    }
    return scheduleMap[schedule] || schedule
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sistema de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sistema de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Erro ao carregar status do sistema
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStatus}
              className="mt-2"
            >
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Sistema de Alertas
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge 
              variant={status.system_health === 'healthy' ? 'default' : 'destructive'}
              className="flex items-center gap-1"
            >
              {getHealthIcon(status.system_health)}
              {status.system_health === 'healthy' ? 'Ativo' : 
               status.system_health === 'warning' ? 'Atenção' : 'Erro'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estatísticas do Dia */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Alertas Hoje</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {status.total_alerts_today}
            </p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Enviados</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {status.alerts_sent_today}
            </p>
          </div>
        </div>

        {/* Status dos Cron Jobs */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Automações Ativas
          </h4>
          <div className="space-y-2">
            {status.cron_jobs.map((job) => (
              <div 
                key={job.job_name}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {job.active ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium text-sm">
                      {job.job_name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatSchedule(job.schedule)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={job.active ? 'default' : 'destructive'} className="text-xs">
                    {job.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {job.next_run && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Próx: {new Date(job.next_run).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Última Verificação */}
        <div className="text-center text-xs text-muted-foreground">
          Última verificação: {new Date(status.last_check).toLocaleString('pt-BR')}
        </div>
      </CardContent>
    </Card>
  )
}
