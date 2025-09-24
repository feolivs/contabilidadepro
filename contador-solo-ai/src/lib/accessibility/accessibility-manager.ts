/**
 * Sistema de Acessibilidade Avançado - Fase 3
 * Gerenciamento completo de acessibilidade WCAG 2.1 AA
 */

'use client'

import React from 'react'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AccessibilitySettings {
  highContrast: boolean
  reducedMotion: boolean
  largeText: boolean
  screenReader: boolean
  keyboardNavigation: boolean
  focusVisible: boolean
  announcements: boolean
  skipLinks: boolean
}

export interface FocusManagementOptions {
  trapFocus?: boolean
  restoreFocus?: boolean
  initialFocus?: string | HTMLElement
  skipLinks?: string[]
}

export interface AnnouncementOptions {
  priority: 'polite' | 'assertive'
  delay?: number
  clear?: boolean
}

export interface KeyboardShortcut {
  key: string
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[]
  action: () => void
  description: string
  category: string
}

// =====================================================
// GERENCIADOR DE ACESSIBILIDADE
// =====================================================

class AccessibilityManager {
  private settings: AccessibilitySettings
  private announcer: HTMLElement | null = null
  private focusHistory: HTMLElement[] = []
  private shortcuts: Map<string, KeyboardShortcut> = new Map()
  private observers: Set<(settings: AccessibilitySettings) => void> = new Set()

  constructor() {
    this.settings = this.loadSettings()
    this.initializeAnnouncer()
    this.setupEventListeners()
    this.applySettings()
  }

  // =====================================================
  // CONFIGURAÇÕES
  // =====================================================

  private loadSettings(): AccessibilitySettings {
    if (typeof window === 'undefined') {
      return this.getDefaultSettings()
    }

    try {
      const saved = localStorage.getItem('accessibility-settings')
      if (saved) {
        return { ...this.getDefaultSettings(), ...JSON.parse(saved) }
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações de acessibilidade:', error)
    }

    return this.getDefaultSettings()
  }

  private getDefaultSettings(): AccessibilitySettings {
    return {
      highContrast: false,
      reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: true,
      focusVisible: true,
      announcements: true,
      skipLinks: true
    }
  }

  public updateSettings(updates: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...updates }
    this.saveSettings()
    this.applySettings()
    this.notifyObservers()
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('accessibility-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.warn('Erro ao salvar configurações de acessibilidade:', error)
    }
  }

  private applySettings(): void {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    // Alto contraste
    root.classList.toggle('high-contrast', this.settings.highContrast)
    
    // Movimento reduzido
    root.classList.toggle('reduced-motion', this.settings.reducedMotion)
    
    // Texto grande
    root.classList.toggle('large-text', this.settings.largeText)
    
    // Foco visível
    root.classList.toggle('focus-visible', this.settings.focusVisible)

    // Aplicar CSS customizado
    this.updateCustomCSS()
  }

  private updateCustomCSS(): void {
    let existingStyle = document.getElementById('accessibility-styles')
    if (existingStyle) {
      existingStyle.remove()
    }

    const style = document.createElement('style')
    style.id = 'accessibility-styles'
    
    let css = ''

    if (this.settings.highContrast) {
      css += `
        .high-contrast {
          --background: 0 0% 0%;
          --foreground: 0 0% 100%;
          --muted: 0 0% 20%;
          --muted-foreground: 0 0% 80%;
          --border: 0 0% 40%;
          --input: 0 0% 10%;
          --primary: 0 0% 100%;
          --primary-foreground: 0 0% 0%;
          --secondary: 0 0% 20%;
          --secondary-foreground: 0 0% 100%;
        }
      `
    }

    if (this.settings.reducedMotion) {
      css += `
        .reduced-motion *,
        .reduced-motion *::before,
        .reduced-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `
    }

    if (this.settings.largeText) {
      css += `
        .large-text {
          font-size: 120% !important;
        }
        .large-text h1 { font-size: 2.5rem !important; }
        .large-text h2 { font-size: 2rem !important; }
        .large-text h3 { font-size: 1.75rem !important; }
        .large-text p, .large-text span { font-size: 1.125rem !important; }
        .large-text button { font-size: 1.125rem !important; padding: 0.75rem 1.5rem !important; }
      `
    }

    if (this.settings.focusVisible) {
      css += `
        .focus-visible *:focus-visible {
          outline: 3px solid hsl(var(--primary)) !important;
          outline-offset: 2px !important;
          border-radius: 4px !important;
        }
      `
    }

    style.textContent = css
    document.head.appendChild(style)
  }

  // =====================================================
  // ANÚNCIOS PARA SCREEN READERS
  // =====================================================

  private initializeAnnouncer(): void {
    if (typeof document === 'undefined') return

    this.announcer = document.createElement('div')
    this.announcer.setAttribute('aria-live', 'polite')
    this.announcer.setAttribute('aria-atomic', 'true')
    this.announcer.setAttribute('aria-relevant', 'text')
    this.announcer.className = 'sr-only'
    this.announcer.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `
    
    document.body.appendChild(this.announcer)
  }

  public announce(message: string, options: AnnouncementOptions = { priority: 'polite' }): void {
    if (!this.settings.announcements || !this.announcer) return

    // Limpar anúncio anterior se solicitado
    if (options.clear) {
      this.announcer.textContent = ''
    }

    // Definir prioridade
    this.announcer.setAttribute('aria-live', options.priority)

    // Anunciar com delay opcional
    const announce = () => {
      if (this.announcer) {
        this.announcer.textContent = message
      }
    }

    if (options.delay) {
      setTimeout(announce, options.delay)
    } else {
      announce()
    }
  }

  // =====================================================
  // GERENCIAMENTO DE FOCO
  // =====================================================

  public manageFocus(element: HTMLElement, options: FocusManagementOptions = {}): void {
    if (!this.settings.keyboardNavigation) return

    // Salvar foco atual
    if (options.restoreFocus && document.activeElement instanceof HTMLElement) {
      this.focusHistory.push(document.activeElement)
    }

    // Focar elemento inicial
    if (options.initialFocus) {
      const target = typeof options.initialFocus === 'string' 
        ? document.querySelector(options.initialFocus) as HTMLElement
        : options.initialFocus

      if (target) {
        target.focus()
      }
    } else {
      element.focus()
    }

    // Configurar trap de foco se necessário
    if (options.trapFocus) {
      this.trapFocus(element)
    }
  }

  private trapFocus(container: HTMLElement): void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    // Retornar função de cleanup
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }

  public restoreFocus(): void {
    const lastFocused = this.focusHistory.pop()
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus()
    }
  }

  // =====================================================
  // ATALHOS DE TECLADO
  // =====================================================

  public registerShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut)
    this.shortcuts.set(key, shortcut)
  }

  public unregisterShortcut(key: string, modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[]): void {
    const shortcutKey = `${modifiers.sort().join('+')}+${key.toLowerCase()}`
    this.shortcuts.delete(shortcutKey)
  }

  private getShortcutKey(shortcut: KeyboardShortcut): string {
    return `${shortcut.modifiers.sort().join('+')}+${shortcut.key.toLowerCase()}`
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return

    // Atalhos de teclado
    window.addEventListener('keydown', this.handleKeyDown.bind(this))

    // Detectar mudanças nas preferências do sistema
    const mediaQueries = [
      { query: '(prefers-reduced-motion: reduce)', setting: 'reducedMotion' as keyof AccessibilitySettings },
      { query: '(prefers-contrast: high)', setting: 'highContrast' as keyof AccessibilitySettings }
    ]

    mediaQueries.forEach(({ query, setting }) => {
      const mediaQuery = window.matchMedia(query)
      const handler = (e: MediaQueryListEvent) => {
        this.updateSettings({ [setting]: e.matches })
      }
      
      mediaQuery.addEventListener('change', handler)
    })
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.settings.keyboardNavigation) return

    const modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[] = []
    if (event.ctrlKey) modifiers.push('ctrl')
    if (event.altKey) modifiers.push('alt')
    if (event.shiftKey) modifiers.push('shift')
    if (event.metaKey) modifiers.push('meta')

    const key = `${modifiers.sort().join('+')}+${event.key.toLowerCase()}`
    const shortcut = this.shortcuts.get(key)

    if (shortcut) {
      event.preventDefault()
      shortcut.action()
      this.announce(`Atalho ativado: ${shortcut.description}`)
    }
  }

  // =====================================================
  // OBSERVADORES
  // =====================================================

  public subscribe(callback: (settings: AccessibilitySettings) => void): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback(this.settings))
  }

  // =====================================================
  // GETTERS
  // =====================================================

  public getSettings(): AccessibilitySettings {
    return { ...this.settings }
  }

  public getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values())
  }

  public isScreenReaderActive(): boolean {
    return this.settings.screenReader || 
           navigator.userAgent.includes('NVDA') ||
           navigator.userAgent.includes('JAWS') ||
           navigator.userAgent.includes('VoiceOver')
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

export const accessibilityManager = new AccessibilityManager()

// =====================================================
// HOOKS REACT
// =====================================================

export function useAccessibility() {
  const [settings, setSettings] = React.useState(accessibilityManager.getSettings())

  React.useEffect(() => {
    return accessibilityManager.subscribe(setSettings)
  }, [])

  const updateSettings = React.useCallback((updates: Partial<AccessibilitySettings>) => {
    accessibilityManager.updateSettings(updates)
  }, [])

  const announce = React.useCallback((message: string, options?: AnnouncementOptions) => {
    accessibilityManager.announce(message, options)
  }, [])

  const manageFocus = React.useCallback((element: HTMLElement, options?: FocusManagementOptions) => {
    accessibilityManager.manageFocus(element, options)
  }, [])

  return {
    settings,
    updateSettings,
    announce,
    manageFocus,
    restoreFocus: accessibilityManager.restoreFocus.bind(accessibilityManager),
    registerShortcut: accessibilityManager.registerShortcut.bind(accessibilityManager),
    unregisterShortcut: accessibilityManager.unregisterShortcut.bind(accessibilityManager),
    isScreenReaderActive: accessibilityManager.isScreenReaderActive()
  }
}
