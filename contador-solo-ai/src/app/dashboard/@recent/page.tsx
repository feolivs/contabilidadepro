import { RealtimeRecentActivities } from '@/components/dashboard/realtime-recent-activities'
import { RealtimeDocumentStatus } from '@/components/dashboard/realtime-document-status'

export default function RecentSlot() {
  console.log('[DASHBOARD_RECENT] Renderizando slot de atividades com tempo real')

  return (
    <div className="space-y-6">
      {/* Atividades Recentes em Tempo Real */}
      <RealtimeRecentActivities />

      {/* Status dos Documentos em Tempo Real */}
      <RealtimeDocumentStatus />
    </div>
  )
}
