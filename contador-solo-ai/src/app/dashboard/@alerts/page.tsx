import { RealtimeAlerts } from '@/components/notifications/realtime-alerts'
import { AIAssistantWidget } from '@/components/dashboard/ai-assistant-widget'

export default function AlertsSlot() {
  console.log('[DASHBOARD_ALERTS] Renderizando slot de alertas com tempo real')

  return (
    <div className="space-y-6">
      {/* Sistema de Alertas em Tempo Real */}
      <RealtimeAlerts />

      {/* Assistente IA Widget */}
      <AIAssistantWidget />
    </div>
  )
}
