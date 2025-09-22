'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Settings, 
  Bell, 
  BellRing, 
  Volume2, 
  VolumeX, 
  Mail, 
  Smartphone,
  AlertTriangle,
  Info,
  CheckCircle,
  Save,
  RotateCcw
} from 'lucide-react'
import { useFiscalAlerts, type AlertType, type AlertPriority, type NotificationFrequency } from '@/hooks/use-fiscal-alerts'
import { FiscalAlertsService, FISCAL_RULES } from '@/services/fiscal-alerts-service'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'

interface NotificationPreferences {
  sounds_enabled: boolean
  desktop_notifications: boolean
  email_notifications: boolean
  push_notifications: boolean
  notification_volume: number
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
}

interface AlertConfiguration {
  alert_type: AlertType
  enabled: boolean
  days_before: number
  priority: AlertPriority
  notification_frequency: NotificationFrequency
  channels: string[]
}

export function NotificationSettings() {
  const { user } = useAuthStore()
  const { useAlertConfigurations, updateAlertConfigurationMutation } = useFiscalAlerts()
  const fiscalService = new FiscalAlertsService()

  // Estados
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    sounds_enabled: true,
    desktop_notifications: true,
    email_notifications: false,
    push_notifications: true,
    notification_volume: 70,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  })

  const [alertConfigs, setAlertConfigs] = useState<Record<AlertType, AlertConfiguration>>({} as any)
  const [isLoading, setIsLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Buscar configurações existentes
  const { data: existingConfigs, isLoading: configsLoading } = useAlertConfigurations()

  // Inicializar configurações
  useEffect(() => {
    if (existingConfigs && !configsLoading) {
      const configsMap: Record<AlertType, AlertConfiguration> = {} as any

      // Inicializar com configurações padrão
      fiscalService.getAvailableAlertTypes().forEach(alertType => {
        const rule = fiscalService.getFiscalRule(alertType)
        const existingConfig = existingConfigs.find(c => c.alert_type === alertType)

        configsMap[alertType] = {
          alert_type: alertType,
          enabled: existingConfig?.enabled ?? true,
          days_before: existingConfig?.days_before ?? rule.default_days_before,
          priority: (existingConfig?.configuration?.priority as AlertPriority) ?? rule.default_priority,
          notification_frequency: existingConfig?.notification_frequency ?? 'ONCE',
          channels: existingConfig?.configuration?.channels ?? ['dashboard', 'push']
        }
      })

      setAlertConfigs(configsMap)
    }
  }, [existingConfigs, configsLoading])

  // Atualizar configuração de alerta
  const updateAlertConfig = (alertType: AlertType, updates: Partial<AlertConfiguration>) => {
    setAlertConfigs(prev => ({
      ...prev,
      [alertType]: { ...prev[alertType], ...updates }
    }))
    setHasChanges(true)
  }

  // Atualizar preferências
  const updatePreferences = (updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  // Salvar configurações
  const saveSettings = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Salvar configurações de alerta
      for (const [alertType, config] of Object.entries(alertConfigs)) {
        await updateAlertConfigurationMutation.mutateAsync({
          alertType: alertType as AlertType,
          enabled: config.enabled,
          daysBefore: config.days_before,
          notificationFrequency: config.notification_frequency,
          configuration: {
            priority: config.priority,
            channels: config.channels
          }
        })
      }

      // Salvar preferências gerais (implementar endpoint se necessário)
      // await saveUserPreferences(preferences)

      setHasChanges(false)
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  // Resetar para padrões
  const resetToDefaults = () => {
    const defaultConfigs: Record<AlertType, AlertConfiguration> = {} as any

    fiscalService.getAvailableAlertTypes().forEach(alertType => {
      const rule = fiscalService.getFiscalRule(alertType)
      defaultConfigs[alertType] = {
        alert_type: alertType,
        enabled: true,
        days_before: rule.default_days_before,
        priority: rule.default_priority,
        notification_frequency: 'ONCE',
        channels: ['dashboard', 'push']
      }
    })

    setAlertConfigs(defaultConfigs)
    setPreferences({
      sounds_enabled: true,
      desktop_notifications: true,
      email_notifications: false,
      push_notifications: true,
      notification_volume: 70,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00'
    })
    setHasChanges(true)
  }

  // Obter ícone por prioridade
  const getPriorityIcon = (priority: AlertPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      case 'MEDIUM':
        return <Info className="h-4 w-4 text-blue-600" />
      case 'LOW':
        return <CheckCircle className="h-4 w-4 text-green-600" />
    }
  }

  // Obter cor por prioridade
  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    }
  }

  if (configsLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Carregando configurações...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações de Notificações</h2>
          <p className="text-muted-foreground">
            Configure como e quando receber alertas fiscais
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrões
          </Button>
          
          <Button 
            onClick={saveSettings} 
            disabled={!hasChanges || isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preferências Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferências Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {preferences.sounds_enabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <Label>Sons de notificação</Label>
              </div>
              <Switch
                checked={preferences.sounds_enabled}
                onCheckedChange={(checked) => updatePreferences({ sounds_enabled: checked })}
              />
            </div>

            {/* Volume */}
            {preferences.sounds_enabled && (
              <div className="space-y-2">
                <Label>Volume: {preferences.notification_volume}%</Label>
                <Slider
                  value={[preferences.notification_volume]}
                  onValueChange={([value]: number[]) => updatePreferences({ notification_volume: value })}
                  max={100}
                  step={10}
                />
              </div>
            )}

            <Separator />

            {/* Notificações Desktop */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <Label>Notificações desktop</Label>
              </div>
              <Switch
                checked={preferences.desktop_notifications}
                onCheckedChange={(checked) => updatePreferences({ desktop_notifications: checked })}
              />
            </div>

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label>Push notifications</Label>
              </div>
              <Switch
                checked={preferences.push_notifications}
                onCheckedChange={(checked) => updatePreferences({ push_notifications: checked })}
              />
            </div>

            {/* Email */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label>Notificações por email</Label>
              </div>
              <Switch
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => updatePreferences({ email_notifications: checked })}
              />
            </div>

            <Separator />

            {/* Horário Silencioso */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Horário silencioso</Label>
                <Switch
                  checked={preferences.quiet_hours_enabled}
                  onCheckedChange={(checked) => updatePreferences({ quiet_hours_enabled: checked })}
                />
              </div>

              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Início</Label>
                    <Select
                      value={preferences.quiet_hours_start}
                      onValueChange={(value) => updatePreferences({ quiet_hours_start: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = String(i).padStart(2, '0')
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Fim</Label>
                    <Select
                      value={preferences.quiet_hours_end}
                      onValueChange={(value) => updatePreferences({ quiet_hours_end: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = String(i).padStart(2, '0')
                          return (
                            <SelectItem key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Alertas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Configurações por Tipo de Alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {Object.entries(alertConfigs).map(([alertType, config]) => {
                  const rule = fiscalService.getFiscalRule(alertType as AlertType)
                  
                  return (
                    <Card key={alertType} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge className={getPriorityColor(config.priority)}>
                              {config.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                        
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) => 
                            updateAlertConfig(alertType as AlertType, { enabled: checked })
                          }
                        />
                      </div>

                      {config.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          {/* Dias de Antecedência */}
                          <div>
                            <Label className="text-xs">Alertar com antecedência</Label>
                            <Select
                              value={String(config.days_before)}
                              onValueChange={(value) => 
                                updateAlertConfig(alertType as AlertType, { days_before: parseInt(value) })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">1 dia</SelectItem>
                                <SelectItem value="3">3 dias</SelectItem>
                                <SelectItem value="7">7 dias</SelectItem>
                                <SelectItem value="15">15 dias</SelectItem>
                                <SelectItem value="30">30 dias</SelectItem>
                                <SelectItem value="45">45 dias</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Prioridade */}
                          <div>
                            <Label className="text-xs">Prioridade</Label>
                            <Select
                              value={config.priority}
                              onValueChange={(value) => 
                                updateAlertConfig(alertType as AlertType, { priority: value as AlertPriority })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LOW">Baixa</SelectItem>
                                <SelectItem value="MEDIUM">Média</SelectItem>
                                <SelectItem value="HIGH">Alta</SelectItem>
                                <SelectItem value="CRITICAL">Crítica</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Frequência */}
                          <div>
                            <Label className="text-xs">Frequência</Label>
                            <Select
                              value={config.notification_frequency}
                              onValueChange={(value) => 
                                updateAlertConfig(alertType as AlertType, { notification_frequency: value as NotificationFrequency })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ONCE">Uma vez</SelectItem>
                                <SelectItem value="DAILY">Diariamente</SelectItem>
                                <SelectItem value="WEEKLY">Semanalmente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
