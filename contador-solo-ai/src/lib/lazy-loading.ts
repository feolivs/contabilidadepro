/**
 * Sistema de Lazy Loading Inteligente - Fase 2
 * Lazy loading com predição, preloading e otimizações automáticas
 */

import React, { lazy, Suspense, ComponentType, useEffect, useRef, useState } from 'react'
import { advancedCache } from './advanced-cache'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface LazyLoadConfig {
  preload?: boolean
  priority?: 'low' | 'medium' | 'high' | 'critical'
  threshold?: number
  rootMargin?: string
  fallback?: React.ComponentType
  retryCount?: number
  timeout?: number
  analytics?: boolean
}

export interface LazyComponentMetrics {
  loadTime: number
  retryCount: number
  cacheHit: boolean
  visibilityTime: number
  interactionTime?: number
}

export interface PreloadStrategy {
  onHover: boolean
  onVisible: boolean
  onIdle: boolean
  onInteraction: boolean
  immediate: boolean
}

// =====================================================
// SISTEMA DE LAZY LOADING INTELIGENTE
// =====================================================

class IntelligentLazyLoader {
  private loadingCache = new Map<string, Promise<any>>()
  private metricsCache = new Map<string, LazyComponentMetrics>()
  private preloadQueue: Array<{ loader: () => Promise<any>; priority: number }> = []
  private isProcessingQueue = false

  // Criar componente lazy com configurações avançadas
  createLazyComponent<T extends ComponentType<any>>(
    loader: () => Promise<{ default: T }>,
    config: LazyLoadConfig = {}
  ): ComponentType<React.ComponentProps<T>> {
    const {
      preload = false,
      priority = 'medium',
      threshold = 0.1,
      rootMargin = '50px',
      fallback,
      retryCount = 3,
      timeout = 10000,
      analytics = true
    } = config

    const componentId = this.generateComponentId(loader)

    // Criar componente lazy com retry logic
    const LazyComponent = lazy(() => this.loadWithRetry(loader, componentId, retryCount, timeout))

    // Wrapper com funcionalidades avançadas
    const IntelligentLazyComponent: ComponentType<React.ComponentProps<T>> = (props) => {
      const [isVisible, setIsVisible] = useState(false)
      const [hasInteracted, setHasInteracted] = useState(false)
      const elementRef = useRef<HTMLDivElement>(null)
      const startTime = useRef<number>(Date.now())

      // Intersection Observer para visibilidade
      useEffect(() => {
        if (!elementRef.current) return

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setIsVisible(true)
              if (analytics) {
                this.recordMetric(componentId, 'visibilityTime', Date.now() - startTime.current)
              }
            }
          },
          { threshold, rootMargin }
        )

        observer.observe(elementRef.current)
        return () => observer.disconnect()
      }, [])

      // Preload baseado em estratégias
      useEffect(() => {
        if (preload) {
          this.addToPreloadQueue(loader, this.getPriorityScore(priority))
        }
      }, [])

      // Handlers para interações
      const handleMouseEnter = () => {
        if (!hasInteracted) {
          setHasInteracted(true)
          this.preloadComponent(loader, componentId)
        }
      }

      const handleClick = () => {
        if (analytics) {
          this.recordMetric(componentId, 'interactionTime', Date.now() - startTime.current)
        }
      }

      return React.createElement(
        'div',
        {
          ref: elementRef,
          onMouseEnter: handleMouseEnter,
          onClick: handleClick,
          className: 'lazy-component-wrapper'
        },
        React.createElement(
          Suspense,
          {
            fallback: fallback ? React.createElement(fallback) : React.createElement('div', null, 'Carregando...')
          },
          React.createElement(LazyComponent, props)
        )
      )
    }

    IntelligentLazyComponent.displayName = `IntelligentLazy(${componentId})`
    return IntelligentLazyComponent
  }

  // Carregar com retry automático
  private async loadWithRetry<T>(
    loader: () => Promise<{ default: T }>,
    componentId: string,
    maxRetries: number,
    timeout: number
  ): Promise<{ default: T }> {
    const startTime = Date.now()

    // Verificar cache primeiro
    const cacheKey = `lazy-component-${componentId}`
    const cached = advancedCache.get(cacheKey)
    if (cached) {
      this.recordMetric(componentId, 'loadTime', Date.now() - startTime, true)
      return cached
    }

    // Verificar se já está carregando
    if (this.loadingCache.has(componentId)) {
      return this.loadingCache.get(componentId)!
    }

    let lastError: Error | null = null
    let retryCount = 0

    const loadPromise = async (): Promise<{ default: T }> => {
      while (retryCount <= maxRetries) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Component load timeout')), timeout)
          })

          const result = await Promise.race([loader(), timeoutPromise])
          
          // Armazenar no cache
          advancedCache.set(cacheKey, result, {
            ttl: 30 * 60 * 1000, // 30 minutos
            tags: ['lazy-components'],
            priority: 'medium'
          })

          this.recordMetric(componentId, 'loadTime', Date.now() - startTime, false, retryCount)
          this.loadingCache.delete(componentId)
          
          return result
        } catch (error) {
          lastError = error as Error
          retryCount++
          
          if (retryCount <= maxRetries) {
            // Backoff exponencial
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
          }
        }
      }

      this.loadingCache.delete(componentId)
      throw lastError || new Error('Failed to load component after retries')
    }

    const promise = loadPromise()
    this.loadingCache.set(componentId, promise)
    
    return promise
  }

  // Preload de componente
  private async preloadComponent(loader: () => Promise<any>, componentId: string): Promise<void> {
    try {
      await this.loadWithRetry(loader, componentId, 1, 5000)
    } catch (error) {
      console.warn(`Failed to preload component ${componentId}:`, error)
    }
  }

  // Adicionar à fila de preload
  private addToPreloadQueue(loader: () => Promise<any>, priority: number): void {
    this.preloadQueue.push({ loader, priority })
    this.preloadQueue.sort((a, b) => b.priority - a.priority)
    
    if (!this.isProcessingQueue) {
      this.processPreloadQueue()
    }
  }

  // Processar fila de preload
  private async processPreloadQueue(): Promise<void> {
    if (this.isProcessingQueue || this.preloadQueue.length === 0) return

    this.isProcessingQueue = true

    // Aguardar idle time
    if ('requestIdleCallback' in window) {
      await new Promise(resolve => {
        (window as any).requestIdleCallback(resolve, { timeout: 5000 })
      })
    }

    while (this.preloadQueue.length > 0) {
      const { loader } = this.preloadQueue.shift()!
      
      try {
        await loader()
        // Pequena pausa entre preloads
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.warn('Preload failed:', error)
      }
    }

    this.isProcessingQueue = false
  }

  // Utilitários
  private generateComponentId(loader: () => Promise<any>): string {
    return `component-${loader.toString().slice(0, 50).replace(/\W/g, '')}-${Date.now()}`
  }

  private getPriorityScore(priority: string): number {
    const scores = { critical: 4, high: 3, medium: 2, low: 1 }
    return scores[priority as keyof typeof scores] || 2
  }

  private recordMetric(
    componentId: string, 
    type: string, 
    value: number, 
    cacheHit: boolean = false, 
    retryCount: number = 0
  ): void {
    const existing = this.metricsCache.get(componentId) || {
      loadTime: 0,
      retryCount: 0,
      cacheHit: false,
      visibilityTime: 0
    }

    const updated = {
      ...existing,
      [type]: value,
      cacheHit: cacheHit || existing.cacheHit,
      retryCount: Math.max(retryCount, existing.retryCount)
    }

    this.metricsCache.set(componentId, updated)
  }

  // Métodos públicos
  getMetrics(): Map<string, LazyComponentMetrics> {
    return new Map(this.metricsCache)
  }

  clearCache(): void {
    this.loadingCache.clear()
    this.metricsCache.clear()
    this.preloadQueue = []
  }

  preloadAll(strategy: PreloadStrategy = { onIdle: true, immediate: false }): void {
    if (strategy.immediate) {
      this.processPreloadQueue()
    } else if (strategy.onIdle && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => this.processPreloadQueue())
    }
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const intelligentLazyLoader = new IntelligentLazyLoader()

// =====================================================
// HOOKS E UTILITÁRIOS
// =====================================================

/**
 * Hook para criar componente lazy com configurações otimizadas
 */
export function useLazyComponent<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  config: LazyLoadConfig = {}
): ComponentType<React.ComponentProps<T>> {
  return React.useMemo(() => {
    return intelligentLazyLoader.createLazyComponent(loader, config)
  }, [loader, config])
}

/**
 * HOC para lazy loading automático
 */
export function withLazyLoading<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  config: LazyLoadConfig = {}
) {
  return intelligentLazyLoader.createLazyComponent(loader, config)
}

/**
 * Componente para lazy loading com Intersection Observer
 */
export const LazySection: React.FC<{
  children: React.ReactNode
  threshold?: number
  rootMargin?: string
  fallback?: React.ReactNode
  onVisible?: () => void
}> = ({
  children,
  threshold = 0.1,
  rootMargin = '50px',
  fallback = React.createElement('div', null, 'Carregando seção...'),
  onVisible
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!elementRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
          onVisible?.()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(elementRef.current)
    return () => observer.disconnect()
  }, [threshold, rootMargin, isVisible, onVisible])

  return React.createElement(
    'div',
    { ref: elementRef },
    isVisible ? children : fallback
  )
}

// =====================================================
// COMPONENTES PRÉ-CONFIGURADOS
// =====================================================

// Lazy loading para componentes críticos
export const createCriticalLazy = <T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
) => withLazyLoading(loader, {
  priority: 'critical',
  preload: true,
  retryCount: 5,
  analytics: true
})

// Lazy loading para componentes de baixa prioridade
export const createLowPriorityLazy = <T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
) => withLazyLoading(loader, {
  priority: 'low',
  preload: false,
  threshold: 0.5,
  analytics: false
})

// =====================================================
// UTILITÁRIOS DE ANÁLISE
// =====================================================

export const lazyLoadingAnalytics = {
  getMetrics: () => intelligentLazyLoader.getMetrics(),
  clearCache: () => intelligentLazyLoader.clearCache(),
  preloadAll: (strategy?: PreloadStrategy) => intelligentLazyLoader.preloadAll(strategy),
  
  // Relatório de performance
  getPerformanceReport: () => {
    const metrics = intelligentLazyLoader.getMetrics()
    const report = {
      totalComponents: metrics.size,
      avgLoadTime: 0,
      cacheHitRate: 0,
      totalRetries: 0
    }

    if (metrics.size > 0) {
      let totalLoadTime = 0
      let cacheHits = 0
      let totalRetries = 0

      metrics.forEach(metric => {
        totalLoadTime += metric.loadTime
        if (metric.cacheHit) cacheHits++
        totalRetries += metric.retryCount
      })

      report.avgLoadTime = totalLoadTime / metrics.size
      report.cacheHitRate = cacheHits / metrics.size
      report.totalRetries = totalRetries
    }

    return report
  }
}
