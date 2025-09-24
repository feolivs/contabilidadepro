'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

// ✅ Interface para métricas de produção
interface ProductionMetrics {
  performance: {
    pageLoadTime: number
    apiResponseTime: number
    cacheHitRate: number
    errorRate: number
    memoryUsage: number
  }
  user: {
    activeUsers: number
    totalSessions: number
    avgSessionDuration: number
    bounceRate: number
  }
  system: {
    uptime: number
    databaseConnections: number
    edgeFunctionInvocations: number
    storageUsage: number
  }
  alerts: {
    critical: number
    warning: number
    info: number
  }
}

// ✅ Hook principal para monitoramento de produção
export function useProductionMonitoring() {
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null)
  const [isHealthy, setIsHealthy] = useState(true)
  const [alerts, setAlerts] = useState<Array<{
    id: string
    level: 'critical' | 'warning' | 'info'
    message: string
    timestamp: Date
  }>>([])

  const queryClient = useQueryClient()

  // Coletar métricas de performance
  const collectPerformanceMetrics = useCallback(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const memory = (performance as any).memory

    const pageLoadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0
    const apiResponseTime = getAverageApiResponseTime()
    const cacheHitRate = getCacheHitRate()
    const memoryUsage = memory ? memory.usedJSHeapSize / 1024 / 1024 : 0

    return {
      pageLoadTime: Math.round(pageLoadTime),
      apiResponseTime: Math.round(apiResponseTime),
      cacheHitRate: Math.round(cacheHitRate),
      errorRate: getErrorRate(),
      memoryUsage: Math.round(memoryUsage)
    }
  }, [])

  // Coletar métricas do sistema
  const collectSystemMetrics = useCallback(async () => {
    // Em produção, essas métricas viriam de APIs do backend
    return {
      uptime: Math.floor(Date.now() / 1000 - performance.timeOrigin / 1000),
      databaseConnections: Math.floor(Math.random() * 20) + 5, // Mock
      edgeFunctionInvocations: Math.floor(Math.random() * 1000) + 100, // Mock
      storageUsage: Math.floor(Math.random() * 80) + 10 // Mock
    }
  }, [])

  // Verificar saúde do sistema
  const checkSystemHealth = useCallback((metrics: ProductionMetrics) => {
    const criticalAlerts: Array<any> = []
    const warningAlerts: Array<any> = []

    // Verificações críticas
    if (metrics.performance.pageLoadTime > 5000) {
      criticalAlerts.push({
        id: `load-time-${Date.now()}`,
        level: 'critical' as const,
        message: `Page load time crítico: ${metrics.performance.pageLoadTime}ms`,
        timestamp: new Date()
      })
    }

    if (metrics.performance.errorRate > 5) {
      criticalAlerts.push({
        id: `error-rate-${Date.now()}`,
        level: 'critical' as const,
        message: `Taxa de erro alta: ${metrics.performance.errorRate}%`,
        timestamp: new Date()
      })
    }

    if (metrics.performance.memoryUsage > 100) {
      criticalAlerts.push({
        id: `memory-${Date.now()}`,
        level: 'critical' as const,
        message: `Alto uso de memória: ${metrics.performance.memoryUsage}MB`,
        timestamp: new Date()
      })
    }

    // Verificações de warning
    if (metrics.performance.cacheHitRate < 70) {
      warningAlerts.push({
        id: `cache-${Date.now()}`,
        level: 'warning' as const,
        message: `Cache hit rate baixo: ${metrics.performance.cacheHitRate}%`,
        timestamp: new Date()
      })
    }

    if (metrics.performance.apiResponseTime > 2000) {
      warningAlerts.push({
        id: `api-${Date.now()}`,
        level: 'warning' as const,
        message: `API response time alto: ${metrics.performance.apiResponseTime}ms`,
        timestamp: new Date()
      })
    }

    const newAlerts = [...criticalAlerts, ...warningAlerts]
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)) // Manter últimos 50 alerts
    }

    return criticalAlerts.length === 0
  }, [])

  // Coletar todas as métricas
  const collectMetrics = useCallback(async () => {
    const performance = collectPerformanceMetrics()
    const system = await collectSystemMetrics()

    const newMetrics: ProductionMetrics = {
      performance,
      system,
      user: {
        activeUsers: Math.floor(Math.random() * 50) + 10, // Mock
        totalSessions: Math.floor(Math.random() * 200) + 50, // Mock
        avgSessionDuration: Math.floor(Math.random() * 300) + 120, // Mock
        bounceRate: Math.floor(Math.random() * 40) + 10 // Mock
      },
      alerts: {
        critical: alerts.filter(a => a.level === 'critical').length,
        warning: alerts.filter(a => a.level === 'warning').length,
        info: alerts.filter(a => a.level === 'info').length
      }
    }

    setMetrics(newMetrics)
    const healthy = checkSystemHealth(newMetrics)
    setIsHealthy(healthy)

    return newMetrics
  }, [collectPerformanceMetrics, collectSystemMetrics, alerts, checkSystemHealth])

  // Configurar monitoramento periódico
  useEffect(() => {
    // Coletar métricas iniciais
    collectMetrics()

    // Configurar intervalos
    const metricsInterval = setInterval(collectMetrics, 30000) // A cada 30 segundos
    const healthInterval = setInterval(() => {
      if (metrics) {
        checkSystemHealth(metrics)
      }
    }, 10000) // A cada 10 segundos

    return () => {
      clearInterval(metricsInterval)
      clearInterval(healthInterval)
    }
  }, [collectMetrics, checkSystemHealth, metrics])

  // Helpers para calcular métricas
  function getAverageApiResponseTime(): number {
    const resourceEntries = performance.getEntriesByType('resource')
    const apiCalls = resourceEntries.filter(entry =>
      entry.name.includes('/api/') || entry.name.includes('supabase.co')
    )

    if (apiCalls.length === 0) return 0

    const totalTime = apiCalls.reduce((sum, entry) => sum + entry.duration, 0)
    return totalTime / apiCalls.length
  }

  function getCacheHitRate(): number {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()

    if (queries.length === 0) return 100

    const hits = queries.filter(query =>
      query.state.dataUpdatedAt > 0 &&
      !query.state.isInvalidated &&
      !query.state.isFetching
    ).length

    return (hits / queries.length) * 100
  }

  function getErrorRate(): number {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()

    if (queries.length === 0) return 0

    const errors = queries.filter(query => query.state.status === 'error').length
    return (errors / queries.length) * 100
  }

  // Enviar métricas para serviços externos (Sentry, DataDog, etc.)
  const sendMetricsToMonitoring = useCallback(async (metrics: ProductionMetrics) => {
    try {
      // Em produção, enviar para serviços de monitoramento
      if (process.env.NODE_ENV === 'production') {
        // Exemplo: Sentry, DataDog, New Relic, etc.
        await fetch('/api/monitoring/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metrics,
            timestamp: Date.now(),
            environment: process.env.NODE_ENV
          })
        })
      }
    } catch (error) {
      console.warn('Falha ao enviar métricas:', error)
    }
  }, [])

  // Disparar alertas críticos
  const triggerAlert = useCallback(async (alert: any) => {
    try {
      if (process.env.NODE_ENV === 'production' && alert.level === 'critical') {
        // Enviar notificações (Slack, email, SMS, etc.)
        await fetch('/api/monitoring/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        })
      }
    } catch (error) {
      console.warn('Falha ao enviar alerta:', error)
    }
  }, [])

  // Limpar alertas antigos
  const clearOldAlerts = useCallback(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    setAlerts(prev => prev.filter(alert => alert.timestamp > oneHourAgo))
  }, [])

  // Limpar alertos periodicamente
  useEffect(() => {
    const cleanupInterval = setInterval(clearOldAlerts, 5 * 60 * 1000) // A cada 5 minutos
    return () => clearInterval(cleanupInterval)
  }, [clearOldAlerts])

  return {
    metrics,
    isHealthy,
    alerts,
    collectMetrics,
    sendMetricsToMonitoring,
    triggerAlert,
    clearOldAlerts
  }
}

// ✅ Hook para deployment automation
export function useDeploymentMonitoring() {
  const [deploymentStatus, setDeploymentStatus] = useState<{
    status: 'idle' | 'deploying' | 'success' | 'failed'
    progress: number
    message: string
    startTime?: Date
    endTime?: Date
  }>({
    status: 'idle',
    progress: 0,
    message: 'Pronto para deploy'
  })

  const simulateDeployment = useCallback(async () => {
    setDeploymentStatus({
      status: 'deploying',
      progress: 0,
      message: 'Iniciando deployment...',
      startTime: new Date()
    })

    const steps = [
      'Verificando dependências...',
      'Executando testes...',
      'Construindo aplicação...',
      'Otimizando assets...',
      'Fazendo deploy...',
      'Verificando saúde...',
      'Deployment concluído!'
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000))

      setDeploymentStatus(prev => ({
        ...prev,
        progress: ((i + 1) / steps.length) * 100,
        message: steps[i]
      }))
    }

    setDeploymentStatus(prev => ({
      ...prev,
      status: 'success',
      endTime: new Date()
    }))
  }, [])

  const checkDeploymentHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health')
      return response.ok
    } catch {
      return false
    }
  }, [])

  return {
    deploymentStatus,
    simulateDeployment,
    checkDeploymentHealth
  }
}