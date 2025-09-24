/**
 * Sistema de Analytics Simplificado
 * Substitui o sistema complexo por uma solução pragmática
 */

'use client'

import { useEffect, useCallback } from 'react'

// =====================================================
// TIPOS ESSENCIAIS
// =====================================================

export interface SimpleEvent {
  name: string
  properties?: Record<string, any>
  timestamp?: Date
}

export interface UserProperties {
  userId?: string
  sessionId: string
  page: string
  userAgent: string
  screenSize: string
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useSimpleAnalytics() {
  const sessionId = typeof window !== 'undefined' 
    ? sessionStorage.getItem('session-id') || generateSessionId()
    : 'server'

  // Gerar session ID se não existir
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('session-id')) {
      sessionStorage.setItem('session-id', sessionId)
    }
  }, [sessionId])

  // Função para trackear eventos
  const track = useCallback((event: SimpleEvent) => {
    if (typeof window === 'undefined') return

    const eventData = {
      ...event,
      timestamp: event.timestamp || new Date(),
      sessionId,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`
    }

    // Log no console para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', eventData)
    }

    // Enviar para analytics (Vercel Analytics, Google Analytics, etc.)
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', event.name, event.properties)
    }

    // Armazenar localmente para debug
    const events = JSON.parse(localStorage.getItem('analytics-events') || '[]')
    events.push(eventData)
    
    // Manter apenas os últimos 100 eventos
    if (events.length > 100) {
      events.splice(0, events.length - 100)
    }
    
    localStorage.setItem('analytics-events', JSON.stringify(events))
  }, [sessionId])

  // Eventos específicos mais usados
  const trackClick = useCallback((element: string, data?: Record<string, any>) => {
    track({
      name: 'click',
      properties: { element, ...data }
    })
  }, [track])

  const trackPageView = useCallback((page?: string) => {
    track({
      name: 'page_view',
      properties: { page: page || window.location.pathname }
    })
  }, [track])

  const trackError = useCallback((error: string, context?: Record<string, any>) => {
    track({
      name: 'error',
      properties: { error, ...context }
    })
  }, [track])

  return {
    track,
    trackClick,
    trackPageView,
    trackError,
    sessionId
  }
}

// =====================================================
// COMPONENTE PROVIDER SIMPLES
// =====================================================

export function SimpleAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { trackPageView } = useSimpleAnalytics()

  // Track page views automaticamente
  useEffect(() => {
    trackPageView()
  }, [trackPageView])

  return React.createElement(React.Fragment, null, children)
}

// =====================================================
// UTILITÁRIOS
// =====================================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Função para obter eventos armazenados (para debug)
export function getStoredEvents(): SimpleEvent[] {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem('analytics-events') || '[]')
}

// Função para limpar eventos armazenados
export function clearStoredEvents(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('analytics-events')
}

// Hook para Web Vitals (usando a API nativa)
export function useWebVitals() {
  const { track } = useSimpleAnalytics()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Performance Observer para Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            track({
              name: 'web_vital_lcp',
              properties: { value: entry.startTime }
            })
          }
          
          if (entry.entryType === 'first-input') {
            track({
              name: 'web_vital_fid',
              properties: { value: (entry as any).processingStart - entry.startTime }
            })
          }
        }
      })

      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] })

      return () => observer.disconnect()
    }
  }, [track])
}

// =====================================================
// INTEGRAÇÃO COM VERCEL ANALYTICS
// =====================================================

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    va?: (...args: any[]) => void // Vercel Analytics
  }
}

export function trackVercelEvent(name: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.va) {
    window.va('track', name, properties)
  }
}

// Hook para integração com Vercel Analytics
export function useVercelAnalytics() {
  const track = useCallback((name: string, properties?: Record<string, any>) => {
    trackVercelEvent(name, properties)
  }, [])

  return { track }
}
