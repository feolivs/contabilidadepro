import { RealtimeStats } from '@/components/dashboard/realtime-stats'

export default function StatsSlot() {
  console.log('[DASHBOARD_STATS] Renderizando slot de stats com tempo real')

  return <RealtimeStats />
}
