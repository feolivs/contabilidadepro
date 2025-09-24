/**
 * Sistema de Navegação por Teclado Avançado
 * Implementa navegação completa por teclado para toda a aplicação
 */

'use client'

import React from 'react'
import { useAccessibility } from '@/lib/accessibility/accessibility-manager'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface KeyboardNavigationOptions {
  enableArrowKeys?: boolean
  enableTabTrapping?: boolean
  enableEscapeKey?: boolean
  enableEnterKey?: boolean
  enableSpaceKey?: boolean
  customHandlers?: Record<string, (event: KeyboardEvent) => void>
}

export interface FocusableElement {
  element: HTMLElement
  priority: number
  group?: string
}

// =====================================================
// HOOK PRINCIPAL DE NAVEGAÇÃO
// =====================================================

export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
) {
  const { settings, announce } = useAccessibility()
  const [focusableElements, setFocusableElements] = React.useState<FocusableElement[]>([])
  const [currentFocusIndex, setCurrentFocusIndex] = React.useState(-1)

  const {
    enableArrowKeys = true,
    enableTabTrapping = false,
    enableEscapeKey = true,
    enableEnterKey = true,
    enableSpaceKey = true,
    customHandlers = {}
  } = options

  // Seletor para elementos focáveis
  const focusableSelector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[role="link"]:not([disabled])',
    '[role="menuitem"]:not([disabled])',
    '[role="tab"]:not([disabled])',
    '[role="option"]:not([disabled])'
  ].join(', ')

  // Atualizar lista de elementos focáveis
  const updateFocusableElements = React.useCallback(() => {
    if (!containerRef.current || !settings.keyboardNavigation) return

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelector)
    ) as HTMLElement[]

    const focusableList: FocusableElement[] = elements
      .filter(el => {
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      .map((el, index) => ({
        element: el,
        priority: parseInt(el.getAttribute('data-focus-priority') || '0'),
        group: el.getAttribute('data-focus-group') || undefined
      }))
      .sort((a, b) => b.priority - a.priority)

    setFocusableElements(focusableList)
  }, [containerRef, settings.keyboardNavigation, focusableSelector])

  // Observar mudanças no DOM
  React.useEffect(() => {
    if (!containerRef.current) return

    const observer = new MutationObserver(updateFocusableElements)
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'aria-hidden']
    })

    updateFocusableElements()

    return () => observer.disconnect()
  }, [updateFocusableElements])

  // Navegar para elemento específico
  const focusElement = React.useCallback((index: number) => {
    if (index < 0 || index >= focusableElements.length) return

    const focusableElement = focusableElements[index]
    if (!focusableElement?.element) return

    const { element } = focusableElement
    element.focus()
    setCurrentFocusIndex(index)

    // Anunciar para screen readers
    const label = element.getAttribute('aria-label') || 
                  element.getAttribute('title') || 
                  element.textContent?.trim() || 
                  element.tagName.toLowerCase()
    
    announce(`Focado em: ${label}`)
  }, [focusableElements, announce])

  // Navegar por setas
  const handleArrowNavigation = React.useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!enableArrowKeys || focusableElements.length === 0) return

    let newIndex = currentFocusIndex

    switch (direction) {
      case 'down':
      case 'right':
        newIndex = currentFocusIndex < focusableElements.length - 1 ? currentFocusIndex + 1 : 0
        break
      case 'up':
      case 'left':
        newIndex = currentFocusIndex > 0 ? currentFocusIndex - 1 : focusableElements.length - 1
        break
    }

    focusElement(newIndex)
  }, [enableArrowKeys, focusableElements.length, currentFocusIndex, focusElement])

  // Handler principal de teclado
  const handleKeyDown = React.useCallback((event: KeyboardEvent) => {
    if (!settings.keyboardNavigation) return

    // Verificar handlers customizados primeiro
    const customHandler = customHandlers[event.key]
    if (customHandler) {
      customHandler(event)
      return
    }

    switch (event.key) {
      case 'ArrowUp':
        if (enableArrowKeys) {
          event.preventDefault()
          handleArrowNavigation('up')
        }
        break

      case 'ArrowDown':
        if (enableArrowKeys) {
          event.preventDefault()
          handleArrowNavigation('down')
        }
        break

      case 'ArrowLeft':
        if (enableArrowKeys) {
          event.preventDefault()
          handleArrowNavigation('left')
        }
        break

      case 'ArrowRight':
        if (enableArrowKeys) {
          event.preventDefault()
          handleArrowNavigation('right')
        }
        break

      case 'Home':
        if (enableArrowKeys && focusableElements.length > 0) {
          event.preventDefault()
          focusElement(0)
        }
        break

      case 'End':
        if (enableArrowKeys && focusableElements.length > 0) {
          event.preventDefault()
          focusElement(focusableElements.length - 1)
        }
        break

      case 'Tab':
        if (enableTabTrapping) {
          event.preventDefault()
          const direction = event.shiftKey ? 'up' : 'down'
          handleArrowNavigation(direction)
        }
        break

      case 'Escape':
        if (enableEscapeKey) {
          // Permitir que componentes pai lidem com escape
          const escapeEvent = new CustomEvent('keyboard-escape', {
            bubbles: true,
            cancelable: true
          })
          event.target?.dispatchEvent(escapeEvent)
        }
        break

      case 'Enter':
        if (enableEnterKey && event.target instanceof HTMLElement) {
          // Simular click se não for um elemento naturalmente clicável
          if (!['BUTTON', 'A', 'INPUT'].includes(event.target.tagName)) {
            event.target.click()
          }
        }
        break

      case ' ':
        if (enableSpaceKey && event.target instanceof HTMLElement) {
          // Simular click para elementos com role="button"
          if (event.target.getAttribute('role') === 'button') {
            event.preventDefault()
            event.target.click()
          }
        }
        break
    }
  }, [
    settings.keyboardNavigation,
    customHandlers,
    enableArrowKeys,
    enableTabTrapping,
    enableEscapeKey,
    enableEnterKey,
    enableSpaceKey,
    handleArrowNavigation,
    focusableElements.length,
    focusElement
  ])

  // Configurar event listeners
  React.useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Detectar mudanças de foco
  React.useEffect(() => {
    if (!containerRef.current) return

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      const index = focusableElements.findIndex(({ element }) => element === target)
      if (index !== -1) {
        setCurrentFocusIndex(index)
      }
    }

    const container = containerRef.current
    container.addEventListener('focusin', handleFocusIn)

    return () => {
      container.removeEventListener('focusin', handleFocusIn)
    }
  }, [focusableElements])

  return {
    focusableElements,
    currentFocusIndex,
    focusElement,
    focusFirst: () => focusElement(0),
    focusLast: () => focusElement(focusableElements.length - 1),
    focusNext: () => handleArrowNavigation('down'),
    focusPrevious: () => handleArrowNavigation('up'),
    updateFocusableElements
  }
}

// =====================================================
// COMPONENTE DE NAVEGAÇÃO POR TECLADO
// =====================================================

interface KeyboardNavigationProviderProps {
  children: React.ReactNode
  options?: KeyboardNavigationOptions
  className?: string
}

export const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({
  children,
  options = {},
  className
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const navigation = useKeyboardNavigation(containerRef as React.RefObject<HTMLElement>, options)

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label="Área com navegação por teclado"
    >
      {children}
    </div>
  )
}

// =====================================================
// HOOK PARA ATALHOS GLOBAIS
// =====================================================

export function useGlobalKeyboardShortcuts() {
  const { registerShortcut, unregisterShortcut, settings } = useAccessibility()

  React.useEffect(() => {
    if (!settings.keyboardNavigation) return

    // Atalhos globais da aplicação
    const shortcuts = [
      {
        key: 'h',
        modifiers: ['alt' as const],
        action: () => {
          const main = document.querySelector('#main-content') as HTMLElement
          main?.focus()
        },
        description: 'Ir para conteúdo principal',
        category: 'Navegação'
      },
      {
        key: 'n',
        modifiers: ['alt' as const],
        action: () => {
          const nav = document.querySelector('#main-navigation') as HTMLElement
          nav?.focus()
        },
        description: 'Ir para navegação',
        category: 'Navegação'
      },
      {
        key: 's',
        modifiers: ['alt' as const],
        action: () => {
          const search = document.querySelector('#search-input') as HTMLElement
          search?.focus()
        },
        description: 'Ir para busca',
        category: 'Navegação'
      },
      {
        key: '?',
        modifiers: ['shift' as const],
        action: () => {
          // Abrir modal de ajuda de atalhos
          const event = new CustomEvent('show-keyboard-shortcuts')
          window.dispatchEvent(event)
        },
        description: 'Mostrar atalhos de teclado',
        category: 'Ajuda'
      }
    ]

    shortcuts.forEach(shortcut => {
      registerShortcut(shortcut)
    })

    return () => {
      shortcuts.forEach(shortcut => {
        unregisterShortcut(shortcut.key, shortcut.modifiers)
      })
    }
  }, [registerShortcut, unregisterShortcut, settings.keyboardNavigation])
}

// =====================================================
// COMPONENTE DE INDICADOR DE FOCO
// =====================================================

export const FocusIndicator: React.FC = () => {
  const { settings } = useAccessibility()
  const [focusedElement, setFocusedElement] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!settings.focusVisible) return

    const handleFocusIn = (event: FocusEvent) => {
      setFocusedElement(event.target as HTMLElement)
    }

    const handleFocusOut = () => {
      setFocusedElement(null)
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [settings.focusVisible])

  if (!settings.focusVisible || !focusedElement) {
    return null
  }

  const rect = focusedElement.getBoundingClientRect()

  return (
    <div
      className="fixed pointer-events-none z-[9999] border-2 border-primary rounded"
      style={{
        left: rect.left - 2,
        top: rect.top - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        transition: 'all 0.1s ease-out'
      }}
      aria-hidden="true"
    />
  )
}
