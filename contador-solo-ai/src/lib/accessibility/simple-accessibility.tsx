/**
 * Sistema de Acessibilidade Simplificado
 * Substitui o AccessibilityManager complexo por Context + hooks simples
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

// =====================================================
// TIPOS ESSENCIAIS
// =====================================================

export interface AccessibilitySettings {
  highContrast: boolean
  reducedMotion: boolean
  largeText: boolean
  screenReader: boolean
  keyboardNavigation: boolean
}

interface AccessibilityContextType {
  settings: AccessibilitySettings
  updateSettings: (updates: Partial<AccessibilitySettings>) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  resetSettings: () => void
}

// =====================================================
// CONFIGURAÇÕES PADRÃO
// =====================================================

const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  screenReader: false,
  keyboardNavigation: true
}

const STORAGE_KEY = 'accessibility-settings'

// =====================================================
// CONTEXT
// =====================================================

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

// =====================================================
// PROVIDER
// =====================================================

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS)

  // Carregar configurações do localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsedSettings = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
      } catch (error) {
        console.warn('Erro ao carregar configurações de acessibilidade:', error)
      }
    }

    // Detectar preferências do sistema
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches

    if (prefersReducedMotion || prefersHighContrast) {
      setSettings(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion,
        highContrast: prefersHighContrast
      }))
    }
  }, [])

  // Aplicar configurações ao DOM
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Aplicar classes CSS
    root.classList.toggle('high-contrast', settings.highContrast)
    root.classList.toggle('reduced-motion', settings.reducedMotion)
    root.classList.toggle('large-text', settings.largeText)
    root.classList.toggle('keyboard-navigation', settings.keyboardNavigation)

    // Salvar no localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // Função para atualizar configurações
  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }, [])

  // Função para anúncios (screen readers)
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (typeof document === 'undefined') return

    // Criar ou encontrar elemento de anúncio
    let announcer = document.getElementById('accessibility-announcer')
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = 'accessibility-announcer'
      announcer.setAttribute('aria-live', priority)
      announcer.setAttribute('aria-atomic', 'true')
      announcer.style.position = 'absolute'
      announcer.style.left = '-10000px'
      announcer.style.width = '1px'
      announcer.style.height = '1px'
      announcer.style.overflow = 'hidden'
      document.body.appendChild(announcer)
    }

    // Atualizar prioridade se necessário
    announcer.setAttribute('aria-live', priority)

    // Anunciar mensagem
    announcer.textContent = message

    // Limpar após 1 segundo
    setTimeout(() => {
      if (announcer) announcer.textContent = ''
    }, 1000)
  }, [])

  // Função para resetar configurações
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value: AccessibilityContextType = {
    settings,
    updateSettings,
    announce,
    resetSettings
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility deve ser usado dentro de AccessibilityProvider')
  }
  return context
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

// Hook para atalhos de teclado globais
export function useGlobalShortcuts() {
  const { announce } = useAccessibility()

  // Atalhos essenciais
  useHotkeys('alt+h', () => {
    const main = document.getElementById('main-content')
    if (main) {
      main.focus()
      announce('Navegando para conteúdo principal')
    }
  }, { description: 'Ir para conteúdo principal' })

  useHotkeys('alt+n', () => {
    const nav = document.getElementById('main-navigation')
    if (nav) {
      nav.focus()
      announce('Navegando para menu principal')
    }
  }, { description: 'Ir para navegação' })

  useHotkeys('alt+s', () => {
    const search = document.getElementById('search-input')
    if (search) {
      search.focus()
      announce('Focando na busca')
    }
  }, { description: 'Focar na busca' })

  useHotkeys('shift+?', () => {
    // Mostrar modal de atalhos
    const event = new CustomEvent('show-keyboard-shortcuts')
    window.dispatchEvent(event)
    announce('Abrindo lista de atalhos')
  }, { description: 'Mostrar atalhos de teclado' })

  useHotkeys('escape', () => {
    // Fechar modais/menus
    const closeButtons = document.querySelectorAll('[data-close]')
    const lastButton = closeButtons[closeButtons.length - 1] as HTMLElement
    if (lastButton) {
      lastButton.click()
      announce('Fechando')
    }
  }, { description: 'Fechar modal/menu' })
}

// Hook para navegação por teclado em listas
export function useKeyboardNavigation(containerRef: React.RefObject<HTMLElement>) {
  const { settings } = useAccessibility()

  useEffect(() => {
    if (!settings.keyboardNavigation || !containerRef.current) return

    const container = containerRef.current
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      const elements = Array.from(focusableElements) as HTMLElement[]
      const currentIndex = elements.indexOf(document.activeElement as HTMLElement)

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          const nextIndex = (currentIndex + 1) % elements.length
          elements[nextIndex]?.focus()
          break
          
        case 'ArrowUp':
          e.preventDefault()
          const prevIndex = currentIndex <= 0 ? elements.length - 1 : currentIndex - 1
          elements[prevIndex]?.focus()
          break
          
        case 'Home':
          e.preventDefault()
          elements[0]?.focus()
          break
          
        case 'End':
          e.preventDefault()
          elements[elements.length - 1]?.focus()
          break
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [settings.keyboardNavigation, containerRef])
}

// Hook para detectar screen reader
export function useScreenReaderDetection() {
  const [isScreenReader, setIsScreenReader] = useState(false)

  useEffect(() => {
    // Detectar screen readers comuns
    const userAgent = navigator.userAgent.toLowerCase()
    const hasScreenReader = userAgent.includes('nvda') || 
                           userAgent.includes('jaws') || 
                           userAgent.includes('voiceover') ||
                           userAgent.includes('talkback')

    setIsScreenReader(hasScreenReader)
  }, [])

  return isScreenReader
}
