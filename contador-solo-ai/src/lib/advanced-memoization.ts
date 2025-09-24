/**
 * Sistema de Memoização Avançada - Fase 2
 * Memoização inteligente com análise de dependências e otimizações automáticas
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react'
import { isEqual } from 'lodash-es'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface MemoizationConfig {
  deepCompare: boolean
  maxCacheSize: number
  ttl: number
  analytics: boolean
  autoOptimize: boolean
}

export interface MemoStats {
  hits: number
  misses: number
  hitRate: number
  avgComputeTime: number
  cacheSize: number
  optimizations: number
}

export interface DependencyAnalysis {
  key: string
  changeFrequency: number
  lastChanged: number
  impact: 'low' | 'medium' | 'high'
  suggestions: string[]
}

// =====================================================
// MEMOIZAÇÃO INTELIGENTE
// =====================================================

class IntelligentMemoization {
  private cache = new Map<string, any>()
  private stats: MemoStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    avgComputeTime: 0,
    cacheSize: 0,
    optimizations: 0
  }
  private dependencyTracker = new Map<string, DependencyAnalysis>()
  private config: MemoizationConfig

  constructor(config: Partial<MemoizationConfig> = {}) {
    this.config = {
      deepCompare: true,
      maxCacheSize: 1000,
      ttl: 5 * 60 * 1000, // 5 minutos
      analytics: true,
      autoOptimize: true,
      ...config
    }
  }

  // Memoização com análise inteligente
  memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    options: {
      ttl?: number
      deepCompare?: boolean
      priority?: 'low' | 'medium' | 'high'
    } = {}
  ): T {
    const memoizedFn = ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
      const startTime = performance.now()

      // Verificar cache
      if (this.cache.has(key)) {
        const cached = this.cache.get(key)
        if (Date.now() - cached.timestamp < (options.ttl || this.config.ttl)) {
          this.stats.hits++
          this.updateHitRate()
          return cached.value
        } else {
          this.cache.delete(key)
        }
      }

      // Executar função
      const result = fn(...args)
      const computeTime = performance.now() - startTime

      // Armazenar no cache
      this.cache.set(key, {
        value: result,
        timestamp: Date.now(),
        computeTime,
        args: this.config.deepCompare ? structuredClone(args) : args
      })

      // Atualizar estatísticas
      this.stats.misses++
      this.stats.avgComputeTime = (this.stats.avgComputeTime + computeTime) / 2
      this.stats.cacheSize = this.cache.size
      this.updateHitRate()

      // Limpar cache se necessário
      if (this.cache.size > this.config.maxCacheSize) {
        this.evictOldest()
      }

      return result
    }) as T

    return memoizedFn
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
  }

  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value
    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  getStats(): MemoStats {
    return { ...this.stats }
  }

  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgComputeTime: 0,
      cacheSize: 0,
      optimizations: 0
    }
  }
}

// Instância singleton
const intelligentMemo = new IntelligentMemoization()

// =====================================================
// HOOKS AVANÇADOS DE MEMOIZAÇÃO
// =====================================================

/**
 * useMemo inteligente com análise de dependências
 */
export function useIntelligentMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  options: {
    deepCompare?: boolean
    analytics?: boolean
    key?: string
  } = {}
): T {
  const { deepCompare = false, analytics = true, key } = options
  const previousDeps = useRef<React.DependencyList>()
  const computeTimeRef = useRef<number>(0)
  const memoKey = key || `memo-${Math.random().toString(36).substr(2, 9)}`

  // Comparação inteligente de dependências
  const depsChanged = useMemo(() => {
    if (!previousDeps.current) return true
    
    if (deepCompare) {
      return !isEqual(previousDeps.current, deps)
    }
    
    return deps.some((dep, index) => dep !== previousDeps.current![index])
  }, [deps, deepCompare])

  const result = useMemo(() => {
    const startTime = performance.now()
    const value = factory()
    computeTimeRef.current = performance.now() - startTime

    if (analytics) {
      // Registrar métricas de performance
      console.debug(`Memo compute time for ${memoKey}:`, computeTimeRef.current)
    }

    return value
  }, depsChanged ? deps : previousDeps.current || deps)

  useEffect(() => {
    previousDeps.current = deps
  })

  return result
}

/**
 * useCallback inteligente com otimizações automáticas
 */
export function useIntelligentCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  options: {
    debounce?: number
    throttle?: number
    analytics?: boolean
    key?: string
  } = {}
): T {
  const { debounce, throttle, analytics = true, key } = options
  const callbackRef = useRef<T>(callback)
  const lastCallTime = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callCount = useRef<number>(0)

  // Atualizar referência do callback
  useEffect(() => {
    callbackRef.current = callback
  })

  return useCallback(
    ((...args: Parameters<T>) => {
      callCount.current++
      
      if (analytics && key) {
        console.debug(`Callback ${key} called ${callCount.current} times`)
      }

      const now = Date.now()

      // Implementar debounce se especificado
      if (debounce) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          callbackRef.current(...args)
        }, debounce)
        
        return
      }

      // Implementar throttle se especificado
      if (throttle) {
        if (now - lastCallTime.current < throttle) {
          return
        }
        lastCallTime.current = now
      }

      return callbackRef.current(...args)
    }) as T,
    deps
  )
}

// =====================================================
// HOCs DE MEMOIZAÇÃO AVANÇADA
// =====================================================

/**
 * HOC para memoização inteligente de componentes
 */
export function withIntelligentMemo<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    deepCompare?: boolean
    analytics?: boolean
    displayName?: string
  } = {}
): React.ComponentType<P> {
  const { deepCompare = false, analytics = true, displayName } = options

  const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
    if (analytics) {
      const startTime = performance.now()
      const areEqual = deepCompare ? isEqual(prevProps, nextProps) : Object.is(prevProps, nextProps)
      const compareTime = performance.now() - startTime
      
      console.debug(`Props comparison for ${displayName || Component.displayName || Component.name}:`, {
        areEqual,
        compareTime,
        propsCount: Object.keys(nextProps).length
      })
      
      return areEqual
    }

    return deepCompare ? isEqual(prevProps, nextProps) : Object.is(prevProps, nextProps)
  })

  MemoizedComponent.displayName = displayName || `IntelligentMemo(${Component.displayName || Component.name})`

  return MemoizedComponent
}

/**
 * Hook para análise de re-renders
 */
export function useRenderAnalytics(componentName: string, props?: Record<string, any>) {
  const renderCount = useRef(0)
  const previousProps = useRef<Record<string, any>>()

  useEffect(() => {
    renderCount.current++
    
    if (props && previousProps.current) {
      const changedProps = Object.keys(props).filter(
        key => props[key] !== previousProps.current![key]
      )
      
      if (changedProps.length > 0) {
        console.debug(`${componentName} re-rendered (${renderCount.current}):`, {
          changedProps,
          totalRenders: renderCount.current
        })
      }
    }

    previousProps.current = props
  })

  return {
    renderCount: renderCount.current,
    logRender: (reason?: string) => {
      console.debug(`${componentName} rendered:`, {
        count: renderCount.current,
        reason,
        timestamp: new Date().toISOString()
      })
    }
  }
}

// =====================================================
// UTILITÁRIOS DE PERFORMANCE
// =====================================================

/**
 * Decorator para memoização automática de métodos
 */
export function memoizeMethod(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value
  const memoized = intelligentMemo.memoize(originalMethod)
  
  descriptor.value = function (...args: any[]) {
    return memoized.apply(this, args)
  }
  
  return descriptor
}

/**
 * Função para análise de performance de componentes
 */
export function analyzeComponentPerformance<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return (props: P) => {
    const startTime = useRef<number>()
    const renderTime = useRef<number>(0)

    useEffect(() => {
      startTime.current = performance.now()
    })

    useEffect(() => {
      if (startTime.current) {
        renderTime.current = performance.now() - startTime.current
        console.debug(`${Component.displayName || Component.name} render time:`, renderTime.current)
      }
    })

    return React.createElement(Component, props)
  }
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

export { intelligentMemo }

export const memoizationUtils = {
  getGlobalStats: () => intelligentMemo.getStats(),
  clearGlobalCache: () => intelligentMemo.clear(),
  memoize: intelligentMemo.memoize.bind(intelligentMemo)
}
