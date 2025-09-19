import { useState, useEffect } from 'react'

export interface RealtimeStats {
  activeUsers: number
  totalDocuments: number
  processingQueue: number
  systemHealth: 'healthy' | 'warning' | 'error'
  uptime: string
}

export function useRealtimeStats() {
  const [stats, setStats] = useState<RealtimeStats>({
    activeUsers: 0,
    totalDocuments: 0,
    processingQueue: 0,
    systemHealth: 'healthy',
    uptime: '0h 0m'
  })

  useEffect(() => {
    // Placeholder for realtime stats subscription
    const mockStats: RealtimeStats = {
      activeUsers: 1,
      totalDocuments: 0,
      processingQueue: 0,
      systemHealth: 'healthy',
      uptime: '1h 30m'
    }

    setStats(mockStats)
  }, [])

  return {
    stats,
    isLoading: false,
    error: null
  }
}