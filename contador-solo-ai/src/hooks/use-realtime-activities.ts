import { useState, useEffect } from 'react'

export interface ActivityData {
  id: string
  description: string
  timestamp: string
  type: 'calculation' | 'payment' | 'document' | 'system'
  userId: string
  metadata?: any
}

export function useRealtimeActivities(userId?: string) {
  const [activities, setActivities] = useState<ActivityData[]>([])

  useEffect(() => {
    if (!userId) return

    // Placeholder for realtime activities subscription
    const mockActivities: ActivityData[] = []

    setActivities(mockActivities)
  }, [userId])

  return {
    activities,
    isLoading: false,
    error: null
  }
}