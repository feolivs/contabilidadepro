/**
 * Sistema de UX Analytics
 * Coleta e análise de dados de experiência do usuário
 */

'use client'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface UXEvent {
  id: string
  type: 'click' | 'scroll' | 'focus' | 'blur' | 'resize' | 'navigation' | 'error' | 'performance'
  timestamp: Date
  element?: string
  page: string
  userId?: string
  sessionId: string
  data: Record<string, any>
}

export interface UserSession {
  id: string
  userId?: string
  startTime: Date
  endTime?: Date
  duration?: number
  pageViews: number
  interactions: number
  errors: number
  device: DeviceInfo
  accessibility: AccessibilityInfo
}

export interface DeviceInfo {
  userAgent: string
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  touchSupport: boolean
}

export interface AccessibilityInfo {
  screenReader: boolean
  highContrast: boolean
  reducedMotion: boolean
  largeText: boolean
  keyboardNavigation: boolean
  colorBlindness?: string
}

export interface PerformanceMetrics {
  fcp: number // First Contentful Paint
  lcp: number // Largest Contentful Paint
  fid: number // First Input Delay
  cls: number // Cumulative Layout Shift
  ttfb: number // Time to First Byte
  loadTime: number
  domContentLoaded: number
}

export interface UXAnalyticsConfig {
  enabled: boolean
  sampleRate: number
  trackClicks: boolean
  trackScrolling: boolean
  trackPerformance: boolean
  trackErrors: boolean
  trackAccessibility: boolean
  endpoint?: string
  batchSize: number
  flushInterval: number
}

// =====================================================
// CLASSE PRINCIPAL DE ANALYTICS
// =====================================================

export class UXAnalytics {
  private config: UXAnalyticsConfig
  private sessionId: string
  private events: UXEvent[] = []
  private session: UserSession
  private flushTimer?: NodeJS.Timeout
  private observers: Map<string, any> = new Map()

  constructor(config: Partial<UXAnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      trackClicks: true,
      trackScrolling: true,
      trackPerformance: true,
      trackErrors: true,
      trackAccessibility: true,
      batchSize: 50,
      flushInterval: 30000, // 30 segundos
      ...config
    }

    this.sessionId = this.generateSessionId()
    this.session = this.initializeSession()

    if (this.config.enabled && this.shouldTrack()) {
      this.initialize()
    }
  }

  // =====================================================
  // INICIALIZAÇÃO
  // =====================================================

  private initialize(): void {
    if (typeof window === 'undefined') return

    this.setupEventListeners()
    this.trackPerformanceMetrics()
    this.startFlushTimer()

    // Rastrear saída da página
    window.addEventListener('beforeunload', () => {
      this.endSession()
      this.flush(true)
    })

    // Rastrear visibilidade da página
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush()
      }
    })
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private shouldTrack(): boolean {
    return Math.random() < this.config.sampleRate
  }

  private initializeSession(): UserSession {
    const deviceInfo = this.getDeviceInfo()
    const accessibilityInfo = this.getAccessibilityInfo()

    return {
      id: this.sessionId,
      startTime: new Date(),
      pageViews: 1,
      interactions: 0,
      errors: 0,
      device: deviceInfo,
      accessibility: accessibilityInfo
    }
  }

  // =====================================================
  // COLETA DE INFORMAÇÕES
  // =====================================================

  private getDeviceInfo(): DeviceInfo {
    const screen = window.screen
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    return {
      userAgent: navigator.userAgent,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      isMobile: viewport.width < 768,
      isTablet: viewport.width >= 768 && viewport.width < 1024,
      isDesktop: viewport.width >= 1024,
      touchSupport: 'ontouchstart' in window
    }
  }

  private getAccessibilityInfo(): AccessibilityInfo {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
    const screenReader = this.detectScreenReader()

    return {
      screenReader,
      highContrast: prefersHighContrast,
      reducedMotion: prefersReducedMotion,
      largeText: false, // Será atualizado via configurações
      keyboardNavigation: true // Assumir true por padrão
    }
  }

  private detectScreenReader(): boolean {
    // Detectar screen readers comuns
    const userAgent = navigator.userAgent.toLowerCase()
    return userAgent.includes('nvda') || 
           userAgent.includes('jaws') || 
           userAgent.includes('voiceover') ||
           userAgent.includes('talkback')
  }

  // =====================================================
  // EVENT LISTENERS
  // =====================================================

  private setupEventListeners(): void {
    if (this.config.trackClicks) {
      this.setupClickTracking()
    }

    if (this.config.trackScrolling) {
      this.setupScrollTracking()
    }

    if (this.config.trackErrors) {
      this.setupErrorTracking()
    }

    this.setupNavigationTracking()
    this.setupFocusTracking()
    this.setupResizeTracking()
  }

  private setupClickTracking(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const elementInfo = this.getElementInfo(target)

      this.trackEvent({
        type: 'click',
        element: elementInfo.selector,
        data: {
          ...elementInfo,
          x: event.clientX,
          y: event.clientY,
          button: event.button,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey
        }
      })

      this.session.interactions++
    })
  }

  private setupScrollTracking(): void {
    let scrollTimeout: NodeJS.Timeout
    let lastScrollY = 0

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      
      scrollTimeout = setTimeout(() => {
        const scrollY = window.scrollY
        const scrollDirection = scrollY > lastScrollY ? 'down' : 'up'
        const scrollPercent = Math.round(
          (scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        )

        this.trackEvent({
          type: 'scroll',
          data: {
            scrollY,
            scrollDirection,
            scrollPercent,
            viewportHeight: window.innerHeight,
            documentHeight: document.documentElement.scrollHeight
          }
        })

        lastScrollY = scrollY
      }, 150)
    })
  }

  private setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.trackEvent({
        type: 'error',
        data: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      })

      this.session.errors++
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent({
        type: 'error',
        data: {
          type: 'unhandledrejection',
          reason: event.reason?.toString(),
          stack: event.reason?.stack
        }
      })

      this.session.errors++
    })
  }

  private setupNavigationTracking(): void {
    // Rastrear mudanças de página (SPA)
    let currentPath = window.location.pathname

    const trackNavigation = () => {
      const newPath = window.location.pathname
      if (newPath !== currentPath) {
        this.trackEvent({
          type: 'navigation',
          data: {
            from: currentPath,
            to: newPath,
            referrer: document.referrer
          }
        })

        currentPath = newPath
        this.session.pageViews++
      }
    }

    // Interceptar pushState e replaceState
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      setTimeout(trackNavigation, 0)
    }

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args)
      setTimeout(trackNavigation, 0)
    }

    window.addEventListener('popstate', trackNavigation)
  }

  private setupFocusTracking(): void {
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      const elementInfo = this.getElementInfo(target)

      this.trackEvent({
        type: 'focus',
        element: elementInfo.selector,
        data: elementInfo
      })
    })
  }

  private setupResizeTracking(): void {
    let resizeTimeout: NodeJS.Timeout

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout)
      
      resizeTimeout = setTimeout(() => {
        this.trackEvent({
          type: 'resize',
          data: {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height
          }
        })
      }, 250)
    })
  }

  // =====================================================
  // MÉTRICAS DE PERFORMANCE
  // =====================================================

  private trackPerformanceMetrics(): void {
    if (!this.config.trackPerformance) return

    // Web Vitals
    this.trackWebVitals()

    // Navigation Timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        
        if (navigation) {
          this.trackEvent({
            type: 'performance',
            data: {
              loadTime: navigation.loadEventEnd - navigation.loadEventStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              ttfb: navigation.responseStart - navigation.requestStart,
              domInteractive: navigation.domInteractive - navigation.navigationStart,
              domComplete: navigation.domComplete - navigation.navigationStart
            }
          })
        }
      }, 0)
    })
  }

  private trackWebVitals(): void {
    // FCP - First Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const fcp = entries.find(entry => entry.name === 'first-contentful-paint')
      
      if (fcp) {
        this.trackEvent({
          type: 'performance',
          data: {
            metric: 'fcp',
            value: fcp.startTime,
            rating: fcp.startTime < 1800 ? 'good' : fcp.startTime < 3000 ? 'needs-improvement' : 'poor'
          }
        })
      }
    }).observe({ entryTypes: ['paint'] })

    // LCP - Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      
      if (lastEntry) {
        this.trackEvent({
          type: 'performance',
          data: {
            metric: 'lcp',
            value: lastEntry.startTime,
            rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor'
          }
        })
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // CLS - Cumulative Layout Shift
    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      }
      
      this.trackEvent({
        type: 'performance',
        data: {
          metric: 'cls',
          value: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
        }
      })
    }).observe({ entryTypes: ['layout-shift'] })
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  private getElementInfo(element: HTMLElement) {
    const rect = element.getBoundingClientRect()
    
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      textContent: element.textContent?.trim().substring(0, 100) || undefined,
      selector: this.getElementSelector(element),
      position: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      },
      attributes: {
        role: element.getAttribute('role'),
        ariaLabel: element.getAttribute('aria-label'),
        type: element.getAttribute('type')
      }
    }
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`
    }

    const path = []
    let current = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()
      
      if (current.className) {
        selector += `.${current.className.split(' ').join('.')}`
      }

      path.unshift(selector)
      current = current.parentElement!
    }

    return path.join(' > ')
  }

  // =====================================================
  // API PÚBLICA
  // =====================================================

  public trackEvent(event: Partial<UXEvent>): void {
    if (!this.config.enabled) return

    const fullEvent: UXEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      page: window.location.pathname,
      sessionId: this.sessionId,
      ...event
    } as UXEvent

    this.events.push(fullEvent)

    if (this.events.length >= this.config.batchSize) {
      this.flush()
    }
  }

  public updateAccessibilitySettings(settings: Partial<AccessibilityInfo>): void {
    this.session.accessibility = { ...this.session.accessibility, ...settings }
  }

  public setUserId(userId: string): void {
    this.session.userId = userId
  }

  public flush(immediate = false): void {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    if (this.config.endpoint) {
      this.sendEvents(eventsToSend, immediate)
    } else {
      // Fallback: log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('UX Analytics Events:', eventsToSend)
      }
    }
  }

  private async sendEvents(events: UXEvent[], immediate = false): Promise<void> {
    try {
      const payload = {
        session: this.session,
        events
      }

      if (immediate && navigator.sendBeacon) {
        navigator.sendBeacon(this.config.endpoint!, JSON.stringify(payload))
      } else {
        await fetch(this.config.endpoint!, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
      }
    } catch (error) {
      console.warn('Failed to send UX analytics:', error)
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  private endSession(): void {
    this.session.endTime = new Date()
    this.session.duration = this.session.endTime.getTime() - this.session.startTime.getTime()
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flush(true)
    this.observers.clear()
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const uxAnalytics = new UXAnalytics()

// =====================================================
// HOOK REACT
// =====================================================

export function useUXAnalytics() {
  const trackEvent = React.useCallback((event: Partial<UXEvent>) => {
    uxAnalytics.trackEvent(event)
  }, [])

  const trackClick = React.useCallback((elementName: string, data?: Record<string, any>) => {
    trackEvent({
      type: 'click',
      element: elementName,
      data
    })
  }, [trackEvent])

  const trackNavigation = React.useCallback((from: string, to: string) => {
    trackEvent({
      type: 'navigation',
      data: { from, to }
    })
  }, [trackEvent])

  return {
    trackEvent,
    trackClick,
    trackNavigation,
    setUserId: uxAnalytics.setUserId.bind(uxAnalytics),
    updateAccessibilitySettings: uxAnalytics.updateAccessibilitySettings.bind(uxAnalytics)
  }
}
