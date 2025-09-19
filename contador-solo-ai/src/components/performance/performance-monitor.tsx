'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  Zap,
  Database,
  Image,
  Wifi,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { performanceCache } from '@/lib/performance-cache'
import { apiOptimizer } from '@/lib/api-optimizer'
import { resourcePreloader } from '@/lib/preloader'

interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  cls?: number // Cumulative Layout Shift
  fid?: number // First Input Delay

  // Custom metrics
  bundleSize?: number
  cacheHitRate?: number
  apiRequestCount?: number
  memoryUsage?: number
  connectionType?: string
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    collectMetrics()

    // Atualizar métricas a cada 30 segundos
    const interval = setInterval(collectMetrics, 30000)

    return () => clearInterval(interval)
  }, [])

  const collectMetrics = async () => {
    const newMetrics: PerformanceMetrics = {}

    // Core Web Vitals
    if ('performance' in window) {
      // First Contentful Paint
      const fcpEntry = performance.getEntriesByType('paint').find(
        entry => entry.name === 'first-contentful-paint'
      )
      if (fcpEntry) {
        newMetrics.fcp = fcpEntry.startTime
      }

      // Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1] as any
            if (lastEntry) {
              newMetrics.lcp = lastEntry.startTime
            }
          })
          observer.observe({ entryTypes: ['largest-contentful-paint'] })
        } catch (error) {
          // Ignorar se não suportado
        }
      }

      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        newMetrics.fcp = navigation.domContentLoadedEventEnd - navigation.fetchStart
      }
    }

    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory
      newMetrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100
    }

    // Connection info
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      newMetrics.connectionType = connection.effectiveType
    }

    // Cache stats
    const cacheStats = performanceCache.getStats()
    newMetrics.cacheHitRate = cacheStats.validItems / Math.max(cacheStats.size, 1) * 100

    // API stats
    const apiStats = apiOptimizer.getStats()
    newMetrics.apiRequestCount = apiStats.pendingRequests + apiStats.queuedRequests

    setMetrics(newMetrics)
  }

  const getPerformanceScore = () => {
    let score = 100

    // Penalizar por FCP alto
    if (metrics.fcp && metrics.fcp > 2000) {
      score -= Math.min((metrics.fcp - 2000) / 100, 30)
    }

    // Penalizar por LCP alto
    if (metrics.lcp && metrics.lcp > 2500) {
      score -= Math.min((metrics.lcp - 2500) / 100, 30)
    }

    // Penalizar por uso de memória alto
    if (metrics.memoryUsage && metrics.memoryUsage > 80) {
      score -= (metrics.memoryUsage - 80) * 2
    }

    // Bonificar por cache hit rate alto
    if (metrics.cacheHitRate && metrics.cacheHitRate > 80) {
      score += 5
    }

    return Math.max(Math.round(score), 0)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (score >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  const formatTime = (time?: number) => {
    if (!time) return 'N/A'
    if (time < 1000) return `${Math.round(time)}ms`
    return `${(time / 1000).toFixed(1)}s`
  }

  const clearCaches = () => {
    performanceCache.clear()
    apiOptimizer.clear()
    window.location.reload()
  }

  const score = getPerformanceScore()

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Performance Monitor
          </CardTitle>
          <div className="flex items-center gap-2">
            {getScoreIcon(score)}
            <span className={`text-lg font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Performance Score */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Score Geral</span>
            <span className={getScoreColor(score)}>{score}/100</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        {/* Core Web Vitals */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Core Web Vitals
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>FCP:</span>
              <Badge variant={metrics.fcp && metrics.fcp < 1800 ? 'default' : 'destructive'}>
                {formatTime(metrics.fcp)}
              </Badge>
            </div>

            <div className="flex justify-between">
              <span>LCP:</span>
              <Badge variant={metrics.lcp && metrics.lcp < 2500 ? 'default' : 'destructive'}>
                {formatTime(metrics.lcp)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Resource Stats */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Recursos
          </h4>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Cache Hit Rate:</span>
              <Badge variant={metrics.cacheHitRate && metrics.cacheHitRate > 80 ? 'default' : 'secondary'}>
                {metrics.cacheHitRate?.toFixed(1) || 0}%
              </Badge>
            </div>

            <div className="flex justify-between">
              <span>API Requests:</span>
              <Badge variant="outline">
                {metrics.apiRequestCount || 0}
              </Badge>
            </div>

            {metrics.memoryUsage && (
              <div className="flex justify-between">
                <span>Memória:</span>
                <Badge variant={metrics.memoryUsage < 80 ? 'default' : 'destructive'}>
                  {metrics.memoryUsage.toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Connection Info */}
        {metrics.connectionType && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Conexão
            </h4>

            <div className="text-xs">
              <Badge variant="outline">
                {metrics.connectionType.toUpperCase()}
              </Badge>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={collectMetrics}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearCaches}
            className="flex-1"
          >
            <Database className="h-3 w-3 mr-1" />
            Limpar Cache
          </Button>
        </div>

        {/* Tips */}
        {score < 70 && (
          <div className="text-xs p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
            <strong>Dicas para melhorar:</strong>
            <ul className="mt-1 space-y-1">
              {metrics.fcp && metrics.fcp > 2000 && (
                <li>• Otimizar carregamento inicial</li>
              )}
              {metrics.memoryUsage && metrics.memoryUsage > 80 && (
                <li>• Reduzir uso de memória</li>
              )}
              {metrics.cacheHitRate && metrics.cacheHitRate < 50 && (
                <li>• Melhorar estratégia de cache</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}