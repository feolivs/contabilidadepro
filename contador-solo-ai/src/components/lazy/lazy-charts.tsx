'use client'

import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, BarChart3 } from 'lucide-react'

// Lazy load chart components
const RealtimeChart = lazy(() => import('@/components/dashboard/realtime-chart').then(module => ({
  default: module.RealtimeChart
})))

const RealtimeDashboard = lazy(() => import('@/components/dashboard/realtime-dashboard').then(module => ({
  default: module.RealtimeDashboard
})))

// Tipos específicos para cada componente lazy
interface LazyRealtimeChartProps {
  data: Array<{ date?: string; name?: string; value: number; [key: string]: unknown }>
  type: 'line' | 'area' | 'bar' | 'pie'
  loading?: boolean
  height?: number
  className?: string
  title?: string
}

interface LazyRealtimeDashboardProps {
  className?: string
  title?: string
}

function ChartSkeleton({ title }: { title?: string }) {
  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-4 w-4" />
          <CardTitle className="text-base">
            {title || 'Carregando gráfico...'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

export function LazyRealtimeChart(props: LazyRealtimeChartProps) {
  return (
    <Suspense fallback={<ChartSkeleton title="Gráfico em tempo real" />}>
      <RealtimeChart {...props} />
    </Suspense>
  )
}

export function LazyRealtimeDashboard(_props: LazyRealtimeDashboardProps) {
  return (
    <Suspense fallback={
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartSkeleton key={i} title={`Dashboard ${i + 1}`} />
        ))}
      </div>
    }>
      <RealtimeDashboard />
    </Suspense>
  )
}