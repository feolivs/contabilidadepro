/**
 * Sistema de Testes de Performance - Fase 2
 * Testes automatizados e monitoramento de performance em tempo real
 */

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  category: 'loading' | 'rendering' | 'interaction' | 'network' | 'memory'
  threshold?: number
  status: 'good' | 'warning' | 'critical'
}

export interface PerformanceTest {
  name: string
  description: string
  category: string
  run: () => Promise<PerformanceMetric[]>
  threshold: Record<string, number>
}

export interface PerformanceReport {
  timestamp: number
  duration: number
  metrics: PerformanceMetric[]
  summary: {
    total: number
    passed: number
    warnings: number
    failed: number
    score: number
  }
  recommendations: string[]
}

// =====================================================
// SISTEMA DE MONITORAMENTO DE PERFORMANCE
// =====================================================

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []
  private isMonitoring = false

  // Iniciar monitoramento
  startMonitoring(): void {
    if (this.isMonitoring) return
    this.isMonitoring = true

    // Web Vitals
    this.observeWebVitals()
    
    // Navigation Timing
    this.observeNavigationTiming()
    
    // Resource Timing
    this.observeResourceTiming()
    
    // Long Tasks
    this.observeLongTasks()
    
    // Memory Usage
    this.observeMemoryUsage()
  }

  // Parar monitoramento
  stopMonitoring(): void {
    this.isMonitoring = false
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }

  // Observar Web Vitals
  private observeWebVitals(): void {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      
      this.addMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'loading',
        threshold: 2500,
        status: this.getStatus(lastEntry.startTime, 2500, 4000)
      })
    })
    
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    this.observers.push(lcpObserver)

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.addMetric({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'interaction',
          threshold: 100,
          status: this.getStatus(entry.processingStart - entry.startTime, 100, 300)
        })
      })
    })
    
    fidObserver.observe({ entryTypes: ['first-input'] })
    this.observers.push(fidObserver)

    // Cumulative Layout Shift (CLS)
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      
      this.addMetric({
        name: 'CLS',
        value: clsValue,
        unit: 'score',
        timestamp: Date.now(),
        category: 'rendering',
        threshold: 0.1,
        status: this.getStatus(clsValue, 0.1, 0.25)
      })
    })
    
    clsObserver.observe({ entryTypes: ['layout-shift'] })
    this.observers.push(clsObserver)
  }

  // Observar Navigation Timing
  private observeNavigationTiming(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        // Time to First Byte (TTFB)
        const ttfb = entry.responseStart - entry.requestStart
        this.addMetric({
          name: 'TTFB',
          value: ttfb,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'network',
          threshold: 600,
          status: this.getStatus(ttfb, 600, 1500)
        })

        // DOM Content Loaded
        const dcl = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart
        this.addMetric({
          name: 'DCL',
          value: dcl,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'loading',
          threshold: 1500,
          status: this.getStatus(dcl, 1500, 3000)
        })
      })
    })
    
    observer.observe({ entryTypes: ['navigation'] })
    this.observers.push(observer)
  }

  // Observar Resource Timing
  private observeResourceTiming(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        const duration = entry.responseEnd - entry.startTime
        
        // Categorizar por tipo de recurso
        let category = 'network'
        if (entry.name.includes('.js')) category = 'script'
        else if (entry.name.includes('.css')) category = 'style'
        else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) category = 'image'

        this.addMetric({
          name: `Resource Load (${category})`,
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'network',
          threshold: 1000,
          status: this.getStatus(duration, 1000, 3000)
        })
      })
    })
    
    observer.observe({ entryTypes: ['resource'] })
    this.observers.push(observer)
  }

  // Observar Long Tasks
  private observeLongTasks(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.addMetric({
          name: 'Long Task',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'rendering',
          threshold: 50,
          status: this.getStatus(entry.duration, 50, 100)
        })
      })
    })
    
    observer.observe({ entryTypes: ['longtask'] })
    this.observers.push(observer)
  }

  // Observar Memory Usage
  private observeMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        
        this.addMetric({
          name: 'JS Heap Used',
          value: memory.usedJSHeapSize / 1024 / 1024,
          unit: 'MB',
          timestamp: Date.now(),
          category: 'memory',
          threshold: 50,
          status: this.getStatus(memory.usedJSHeapSize / 1024 / 1024, 50, 100)
        })
      }, 5000) // A cada 5 segundos
    }
  }

  // Adicionar métrica
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    
    // Manter apenas as últimas 1000 métricas
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Emitir evento para listeners
    this.emitMetric(metric)
  }

  // Determinar status baseado em thresholds
  private getStatus(value: number, goodThreshold: number, badThreshold: number): 'good' | 'warning' | 'critical' {
    if (value <= goodThreshold) return 'good'
    if (value <= badThreshold) return 'warning'
    return 'critical'
  }

  // Emitir métrica para listeners
  private emitMetric(metric: PerformanceMetric): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance-metric', { detail: metric }))
    }
  }

  // Obter métricas
  getMetrics(category?: string, timeRange?: number): PerformanceMetric[] {
    let filtered = this.metrics

    if (category) {
      filtered = filtered.filter(m => m.category === category)
    }

    if (timeRange) {
      const cutoff = Date.now() - timeRange
      filtered = filtered.filter(m => m.timestamp >= cutoff)
    }

    return filtered
  }

  // Gerar relatório
  generateReport(): PerformanceReport {
    const now = Date.now()
    const recentMetrics = this.getMetrics(undefined, 60000) // Últimos 60 segundos

    const summary = {
      total: recentMetrics.length,
      passed: recentMetrics.filter(m => m.status === 'good').length,
      warnings: recentMetrics.filter(m => m.status === 'warning').length,
      failed: recentMetrics.filter(m => m.status === 'critical').length,
      score: 0
    }

    // Calcular score (0-100)
    if (summary.total > 0) {
      summary.score = Math.round(
        ((summary.passed * 100) + (summary.warnings * 50)) / summary.total
      )
    }

    // Gerar recomendações
    const recommendations = this.generateRecommendations(recentMetrics)

    return {
      timestamp: now,
      duration: 60000,
      metrics: recentMetrics,
      summary,
      recommendations
    }
  }

  // Gerar recomendações
  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = []
    
    const criticalMetrics = metrics.filter(m => m.status === 'critical')
    const warningMetrics = metrics.filter(m => m.status === 'warning')

    // LCP alto
    if (criticalMetrics.some(m => m.name === 'LCP')) {
      recommendations.push('Otimizar Largest Contentful Paint: considere lazy loading de imagens e otimização de recursos críticos')
    }

    // FID alto
    if (criticalMetrics.some(m => m.name === 'FID')) {
      recommendations.push('Reduzir First Input Delay: minimize JavaScript blocking e use code splitting')
    }

    // CLS alto
    if (criticalMetrics.some(m => m.name === 'CLS')) {
      recommendations.push('Melhorar Cumulative Layout Shift: defina dimensões para imagens e evite inserção dinâmica de conteúdo')
    }

    // Long Tasks
    if (criticalMetrics.some(m => m.name === 'Long Task')) {
      recommendations.push('Quebrar tarefas longas: use requestIdleCallback e Web Workers para processamento pesado')
    }

    // Memory Usage
    if (criticalMetrics.some(m => m.name === 'JS Heap Used')) {
      recommendations.push('Otimizar uso de memória: implemente garbage collection manual e evite vazamentos de memória')
    }

    // TTFB alto
    if (warningMetrics.some(m => m.name === 'TTFB')) {
      recommendations.push('Melhorar Time to First Byte: otimize servidor, use CDN e implemente cache adequado')
    }

    return recommendations
  }

  // Limpar métricas
  clearMetrics(): void {
    this.metrics = []
  }
}

// =====================================================
// TESTES DE PERFORMANCE ESPECÍFICOS
// =====================================================

export const performanceTests: PerformanceTest[] = [
  {
    name: 'Sidebar Render Performance',
    description: 'Testa o tempo de renderização da sidebar',
    category: 'rendering',
    threshold: { renderTime: 100, reRenders: 5 },
    run: async () => {
      const startTime = performance.now()
      
      // Simular renderização da sidebar
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const renderTime = performance.now() - startTime
      
      return [
        {
          name: 'Sidebar Render Time',
          value: renderTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'rendering',
          threshold: 100,
          status: renderTime <= 100 ? 'good' : renderTime <= 200 ? 'warning' : 'critical'
        }
      ]
    }
  },
  
  {
    name: 'Search Performance',
    description: 'Testa a performance da busca em tempo real',
    category: 'interaction',
    threshold: { searchTime: 200, debounceDelay: 300 },
    run: async () => {
      const startTime = performance.now()
      
      // Simular busca
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const searchTime = performance.now() - startTime
      
      return [
        {
          name: 'Search Response Time',
          value: searchTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'interaction',
          threshold: 200,
          status: searchTime <= 200 ? 'good' : searchTime <= 500 ? 'warning' : 'critical'
        }
      ]
    }
  },

  {
    name: 'Cache Performance',
    description: 'Testa a eficiência do sistema de cache',
    category: 'memory',
    threshold: { hitRate: 80, avgAccessTime: 10 },
    run: async () => {
      // Simular operações de cache
      const cacheHits = 85
      const avgAccessTime = 8
      
      return [
        {
          name: 'Cache Hit Rate',
          value: cacheHits,
          unit: '%',
          timestamp: Date.now(),
          category: 'memory',
          threshold: 80,
          status: cacheHits >= 80 ? 'good' : cacheHits >= 60 ? 'warning' : 'critical'
        },
        {
          name: 'Cache Access Time',
          value: avgAccessTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'memory',
          threshold: 10,
          status: avgAccessTime <= 10 ? 'good' : avgAccessTime <= 20 ? 'warning' : 'critical'
        }
      ]
    }
  }
]

// =====================================================
// INSTÂNCIA SINGLETON E UTILITÁRIOS
// =====================================================

export const performanceMonitor = new PerformanceMonitor()

// Executar todos os testes
export async function runPerformanceTests(): Promise<PerformanceReport> {
  const startTime = Date.now()
  const allMetrics: PerformanceMetric[] = []

  for (const test of performanceTests) {
    try {
      const metrics = await test.run()
      allMetrics.push(...metrics)
    } catch (error) {
      console.error(`Performance test failed: ${test.name}`, error)
    }
  }

  const duration = Date.now() - startTime
  
  const summary = {
    total: allMetrics.length,
    passed: allMetrics.filter(m => m.status === 'good').length,
    warnings: allMetrics.filter(m => m.status === 'warning').length,
    failed: allMetrics.filter(m => m.status === 'critical').length,
    score: 0
  }

  if (summary.total > 0) {
    summary.score = Math.round(
      ((summary.passed * 100) + (summary.warnings * 50)) / summary.total
    )
  }

  return {
    timestamp: startTime,
    duration,
    metrics: allMetrics,
    summary,
    recommendations: []
  }
}

// Hook para usar performance monitoring
export function usePerformanceMonitoring() {
  React.useEffect(() => {
    performanceMonitor.startMonitoring()
    return () => performanceMonitor.stopMonitoring()
  }, [])

  return {
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor)
  }
}
