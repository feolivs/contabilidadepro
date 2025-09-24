'use client'

import { useEffect, useState } from 'react'
import { logger } from '@/lib/simple-logger'

interface StartupMetrics {
  // Core Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  cls?: number // Cumulative Layout Shift
  fid?: number // First Input Delay
  
  // Custom metrics
  authInitTime?: number
  cacheInitTime?: number
  providersInitTime?: number
  totalStartupTime?: number
  
  // Bundle metrics
  jsHeapSize?: number
  bundleLoadTime?: number
  
  // Status
  isComplete: boolean
  hasErrors: boolean
  errors: string[]
}

export function useStartupPerformance() {
  const [metrics, setMetrics] = useState<StartupMetrics>({
    isComplete: false,
    hasErrors: false,
    errors: []
  })

  useEffect(() => {
    const startTime = performance.now()
    let authStartTime: number | undefined
    let cacheStartTime: number | undefined
    
    // Monitorar Web Vitals
    const observeWebVitals = () => {
      // First Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const fcp = entries.find(entry => entry.name === 'first-contentful-paint')
        if (fcp) {
          setMetrics(prev => ({ ...prev, fcp: fcp.startTime }))
        }
      }).observe({ entryTypes: ['paint'] })

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        setMetrics(prev => ({ ...prev, cls: clsValue }))
      }).observe({ entryTypes: ['layout-shift'] })
    }

    // Monitorar carregamento de recursos
    const observeResourceTiming = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        let totalBundleTime = 0
        
        entries.forEach(entry => {
          if (entry.name.includes('/_next/static/chunks/')) {
            totalBundleTime += entry.duration
          }
        })
        
        if (totalBundleTime > 0) {
          setMetrics(prev => ({ ...prev, bundleLoadTime: totalBundleTime }))
        }
      })
      
      observer.observe({ entryTypes: ['resource'] })
    }

    // Monitorar memória
    const observeMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({ 
          ...prev, 
          jsHeapSize: memory.usedJSHeapSize / 1024 / 1024 // MB
        }))
      }
    }

    // Monitorar eventos customizados de inicialização
    const observeCustomEvents = () => {
      // Auth initialization
      const authObserver = new MutationObserver(() => {
        const authElement = document.querySelector('[data-auth-initialized]')
        if (authElement && !authStartTime) {
          authStartTime = performance.now()
          setMetrics(prev => ({ 
            ...prev, 
            authInitTime: authStartTime! - startTime 
          }))
        }
      })
      
      authObserver.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true 
      })

      // Cache initialization
      const cacheObserver = new MutationObserver(() => {
        const cacheElement = document.querySelector('[data-cache-initialized]')
        if (cacheElement && !cacheStartTime) {
          cacheStartTime = performance.now()
          setMetrics(prev => ({ 
            ...prev, 
            cacheInitTime: cacheStartTime! - startTime 
          }))
        }
      })
      
      cacheObserver.observe(document.body, { 
        childList: true, 
        subtree: true, 
        attributes: true 
      })
    }

    // Inicializar observadores
    try {
      observeWebVitals()
      observeResourceTiming()
      observeMemory()
      observeCustomEvents()
    } catch (error) {
      setMetrics(prev => ({
        ...prev,
        hasErrors: true,
        errors: [...prev.errors, `Observer error: ${error}`]
      }))
    }

    // Finalizar métricas após 10 segundos
    const finalizationTimer = setTimeout(() => {
      const totalTime = performance.now() - startTime
      
      setMetrics(prev => ({
        ...prev,
        totalStartupTime: totalTime,
        providersInitTime: Math.max(prev.authInitTime || 0, prev.cacheInitTime || 0),
        isComplete: true
      }))

      // Log das métricas finais
      logger.info('🚀 Startup Performance Metrics', {
        totalStartupTime: totalTime,
        fcp: metrics.fcp,
        lcp: metrics.lcp,
        cls: metrics.cls,
        authInitTime: metrics.authInitTime,
        cacheInitTime: metrics.cacheInitTime,
        jsHeapSize: metrics.jsHeapSize,
        bundleLoadTime: metrics.bundleLoadTime
      })
    }, 10000)

    return () => {
      clearTimeout(finalizationTimer)
    }
  }, [])

  // Função para forçar coleta de métricas
  const collectMetrics = () => {
    const totalTime = performance.now()
    
    setMetrics(prev => ({
      ...prev,
      totalStartupTime: totalTime,
      isComplete: true
    }))

    return metrics
  }

  // Função para resetar métricas
  const resetMetrics = () => {
    setMetrics({
      isComplete: false,
      hasErrors: false,
      errors: []
    })
  }

  return {
    metrics,
    collectMetrics,
    resetMetrics,
    isMonitoring: !metrics.isComplete
  }
}

// Hook para detectar quando a aplicação está "pronta"
export function useAppReady() {
  const [isReady, setIsReady] = useState(false)
  const { metrics } = useStartupPerformance()

  useEffect(() => {
    // Considerar app pronta quando:
    // 1. FCP aconteceu (conteúdo visível)
    // 2. Auth foi inicializada
    // 3. Não há erros críticos
    const checkReadiness = () => {
      const hasContent = metrics.fcp && metrics.fcp > 0
      const hasAuth = metrics.authInitTime && metrics.authInitTime > 0
      const noErrors = !metrics.hasErrors
      
      if (hasContent && hasAuth && noErrors && !isReady) {
        setIsReady(true)
        logger.info('✅ App is ready for user interaction')
      }
    }

    checkReadiness()
  }, [metrics, isReady])

  return isReady
}
