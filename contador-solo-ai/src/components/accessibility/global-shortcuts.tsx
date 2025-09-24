/**
 * Atalhos Globais da Aplicação
 * Sistema de atalhos de teclado para toda a aplicação ContabilidadePRO
 */

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAccessibility, type KeyboardShortcut } from '@/lib/accessibility/accessibility-manager'
import { APP_ROUTES } from '@/lib/routes'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface GlobalShortcutsProviderProps {
  children: React.ReactNode
}

// =====================================================
// ATALHOS GLOBAIS DA APLICAÇÃO
// =====================================================

export const GlobalShortcutsProvider: React.FC<GlobalShortcutsProviderProps> = ({
  children
}) => {
  const router = useRouter()
  const { registerShortcut, unregisterShortcut, settings, announce } = useAccessibility()

  React.useEffect(() => {
    if (!settings.keyboardNavigation) return

    // =====================================================
    // ATALHOS DE NAVEGAÇÃO
    // =====================================================

    const navigationShortcuts: KeyboardShortcut[] = [
      {
        key: 'h',
        modifiers: ['alt'],
        action: () => {
          const main = document.querySelector('#main-content') as HTMLElement
          if (main) {
            main.focus()
            announce('Navegou para conteúdo principal')
          }
        },
        description: 'Ir para conteúdo principal',
        category: 'Navegação'
      },
      {
        key: 'n',
        modifiers: ['alt'],
        action: () => {
          const nav = document.querySelector('#main-navigation') as HTMLElement
          if (nav) {
            nav.focus()
            announce('Navegou para menu principal')
          }
        },
        description: 'Ir para navegação principal',
        category: 'Navegação'
      },
      {
        key: 's',
        modifiers: ['alt'],
        action: () => {
          const search = document.querySelector('#search-input') as HTMLElement
          if (search) {
            search.focus()
            announce('Focou na busca')
          }
        },
        description: 'Focar na busca',
        category: 'Navegação'
      },
      {
        key: 'd',
        modifiers: ['alt'],
        action: () => {
          router.push(APP_ROUTES.DASHBOARD)
          announce('Navegando para dashboard')
        },
        description: 'Ir para dashboard',
        category: 'Navegação'
      },
      {
        key: 'c',
        modifiers: ['alt'],
        action: () => {
          router.push(APP_ROUTES.CLIENTES)
          announce('Navegando para clientes')
        },
        description: 'Ir para clientes',
        category: 'Navegação'
      },
      {
        key: 'o',
        modifiers: ['alt'],
        action: () => {
          router.push(APP_ROUTES.DOCUMENTOS)
          announce('Navegando para documentos')
        },
        description: 'Ir para documentos',
        category: 'Navegação'
      },
      {
        key: 'l',
        modifiers: ['alt'],
        action: () => {
          router.push(APP_ROUTES.CALCULOS)
          announce('Navegando para cálculos fiscais')
        },
        description: 'Ir para cálculos fiscais',
        category: 'Navegação'
      },
      {
        key: 'r',
        modifiers: ['alt'],
        action: () => {
          router.push(APP_ROUTES.RELATORIOS)
          announce('Navegando para relatórios')
        },
        description: 'Ir para relatórios',
        category: 'Navegação'
      },
      {
        key: 'i',
        modifiers: ['alt'],
        action: () => {
          router.push(APP_ROUTES.ASSISTENTE)
          announce('Navegando para assistente IA')
        },
        description: 'Ir para assistente IA',
        category: 'Navegação'
      }
    ]

    // =====================================================
    // ATALHOS DE AÇÕES
    // =====================================================

    const actionShortcuts: KeyboardShortcut[] = [
      {
        key: 'n',
        modifiers: ['ctrl'],
        action: () => {
          // Detectar página atual e criar novo item apropriado
          const currentPath = window.location.pathname
          
          if (currentPath.includes('/clientes')) {
            router.push('/clientes/novo')
            announce('Criando novo cliente')
          } else if (currentPath.includes('/calculos')) {
            router.push('/calculos')
            announce('Abrindo cálculos fiscais')
          } else if (currentPath.includes('/documentos')) {
            // Trigger upload modal
            const uploadButton = document.querySelector('[data-upload-trigger]') as HTMLElement
            if (uploadButton) {
              uploadButton.click()
              announce('Abrindo upload de documento')
            }
          } else {
            announce('Novo item não disponível nesta página')
          }
        },
        description: 'Criar novo item',
        category: 'Ações'
      },
      {
        key: 's',
        modifiers: ['ctrl'],
        action: () => {
          // Procurar por formulário ativo e salvar
          const saveButton = document.querySelector('[data-save-button]') as HTMLElement
          const form = document.querySelector('form') as HTMLFormElement
          
          if (saveButton) {
            saveButton.click()
            announce('Salvando')
          } else if (form) {
            form.requestSubmit()
            announce('Salvando formulário')
          } else {
            announce('Nada para salvar')
          }
        },
        description: 'Salvar',
        category: 'Ações'
      },
      {
        key: 'f',
        modifiers: ['ctrl'],
        action: () => {
          const search = document.querySelector('#search-input') as HTMLElement
          if (search) {
            search.focus()
            announce('Focou na busca')
          }
        },
        description: 'Buscar',
        category: 'Ações'
      },
      {
        key: 'p',
        modifiers: ['ctrl'],
        action: () => {
          window.print()
          announce('Abrindo impressão')
        },
        description: 'Imprimir página',
        category: 'Ações'
      },
      {
        key: 'e',
        modifiers: ['ctrl'],
        action: () => {
          // Procurar por botão de editar
          const editButton = document.querySelector('[data-edit-button]') as HTMLElement
          if (editButton) {
            editButton.click()
            announce('Modo de edição ativado')
          } else {
            announce('Edição não disponível')
          }
        },
        description: 'Editar item atual',
        category: 'Ações'
      }
    ]

    // =====================================================
    // ATALHOS DE ACESSIBILIDADE
    // =====================================================

    const accessibilityShortcuts: KeyboardShortcut[] = [
      {
        key: '?',
        modifiers: ['shift'],
        action: () => {
          const event = new CustomEvent('show-keyboard-shortcuts')
          window.dispatchEvent(event)
        },
        description: 'Mostrar atalhos de teclado',
        category: 'Acessibilidade'
      },
      {
        key: 'a',
        modifiers: ['alt'],
        action: () => {
          const event = new CustomEvent('show-accessibility-panel')
          window.dispatchEvent(event)
          announce('Abrindo painel de acessibilidade')
        },
        description: 'Configurações de acessibilidade',
        category: 'Acessibilidade'
      },
      {
        key: 't',
        modifiers: ['alt'],
        action: () => {
          const themeToggle = document.querySelector('[data-theme-toggle]') as HTMLElement
          if (themeToggle) {
            themeToggle.click()
            announce('Alternando tema')
          }
        },
        description: 'Alternar tema claro/escuro',
        category: 'Acessibilidade'
      },
      {
        key: 'k',
        modifiers: ['alt'],
        action: () => {
          const event = new CustomEvent('toggle-high-contrast')
          window.dispatchEvent(event)
          announce('Alternando alto contraste')
        },
        description: 'Alternar alto contraste',
        category: 'Acessibilidade'
      },
      {
        key: 'm',
        modifiers: ['alt'],
        action: () => {
          const event = new CustomEvent('toggle-reduced-motion')
          window.dispatchEvent(event)
          announce('Alternando movimento reduzido')
        },
        description: 'Alternar movimento reduzido',
        category: 'Acessibilidade'
      }
    ]

    // =====================================================
    // ATALHOS DO SISTEMA
    // =====================================================

    const systemShortcuts: KeyboardShortcut[] = [
      {
        key: 'Escape',
        modifiers: [],
        action: () => {
          // Fechar modais, menus, etc.
          const closeButtons = document.querySelectorAll('[data-close-modal], [data-close-menu]')
          const lastCloseButton = closeButtons[closeButtons.length - 1] as HTMLElement
          
          if (lastCloseButton) {
            lastCloseButton.click()
            announce('Fechando')
          }
        },
        description: 'Fechar modal/menu ativo',
        category: 'Sistema'
      },
      {
        key: 'F1',
        modifiers: [],
        action: () => {
          const event = new CustomEvent('show-help')
          window.dispatchEvent(event)
          announce('Abrindo ajuda')
        },
        description: 'Mostrar ajuda',
        category: 'Sistema'
      },
      {
        key: 'F11',
        modifiers: [],
        action: () => {
          if (document.fullscreenElement) {
            document.exitFullscreen()
            announce('Saindo do modo tela cheia')
          } else {
            document.documentElement.requestFullscreen()
            announce('Entrando no modo tela cheia')
          }
        },
        description: 'Alternar tela cheia',
        category: 'Sistema'
      }
    ]

    // Registrar todos os atalhos
    const allShortcuts = [
      ...navigationShortcuts,
      ...actionShortcuts,
      ...accessibilityShortcuts,
      ...systemShortcuts
    ]

    allShortcuts.forEach(shortcut => {
      registerShortcut(shortcut)
    })

    // Cleanup
    return () => {
      allShortcuts.forEach(shortcut => {
        unregisterShortcut(shortcut.key, shortcut.modifiers)
      })
    }
  }, [registerShortcut, unregisterShortcut, settings.keyboardNavigation, router, announce])

  return <>{children}</>
}

// =====================================================
// HOOK PARA ATALHOS CONTEXTUAIS
// =====================================================

export function useContextualShortcuts(context: string) {
  const { registerShortcut, unregisterShortcut, settings, announce } = useAccessibility()

  React.useEffect(() => {
    if (!settings.keyboardNavigation) return

    const shortcuts: KeyboardShortcut[] = []

    // Atalhos específicos por contexto
    switch (context) {
      case 'dashboard':
        shortcuts.push(
          {
            key: '1',
            modifiers: ['alt'],
            action: () => {
              const firstCard = document.querySelector('[data-dashboard-card]') as HTMLElement
              if (firstCard) {
                firstCard.focus()
                announce('Focou no primeiro card do dashboard')
              }
            },
            description: 'Focar no primeiro card',
            category: 'Dashboard'
          },
          {
            key: 'r',
            modifiers: ['ctrl'],
            action: () => {
              window.location.reload()
              announce('Recarregando dashboard')
            },
            description: 'Recarregar dados',
            category: 'Dashboard'
          }
        )
        break

      case 'clientes':
        shortcuts.push(
          {
            key: 'f',
            modifiers: ['alt'],
            action: () => {
              const filterButton = document.querySelector('[data-filter-button]') as HTMLElement
              if (filterButton) {
                filterButton.click()
                announce('Abrindo filtros')
              }
            },
            description: 'Abrir filtros',
            category: 'Clientes'
          },
          {
            key: 'e',
            modifiers: ['alt'],
            action: () => {
              const exportButton = document.querySelector('[data-export-button]') as HTMLElement
              if (exportButton) {
                exportButton.click()
                announce('Exportando clientes')
              }
            },
            description: 'Exportar lista',
            category: 'Clientes'
          }
        )
        break

      case 'calculos':
        shortcuts.push(
          {
            key: 'c',
            modifiers: ['ctrl', 'shift'],
            action: () => {
              const calculateButton = document.querySelector('[data-calculate-button]') as HTMLElement
              if (calculateButton) {
                calculateButton.click()
                announce('Executando cálculo')
              }
            },
            description: 'Executar cálculo',
            category: 'Cálculos'
          },
          {
            key: 'v',
            modifiers: ['alt'],
            action: () => {
              const validateButton = document.querySelector('[data-validate-button]') as HTMLElement
              if (validateButton) {
                validateButton.click()
                announce('Validando dados')
              }
            },
            description: 'Validar dados',
            category: 'Cálculos'
          }
        )
        break
    }

    // Registrar atalhos do contexto
    shortcuts.forEach(shortcut => {
      registerShortcut(shortcut)
    })

    // Cleanup
    return () => {
      shortcuts.forEach(shortcut => {
        unregisterShortcut(shortcut.key, shortcut.modifiers)
      })
    }
  }, [context, registerShortcut, unregisterShortcut, settings.keyboardNavigation, announce])
}

// =====================================================
// HOOK PARA ATALHOS TEMPORÁRIOS
// =====================================================

export function useTemporaryShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const { registerShortcut, unregisterShortcut, settings } = useAccessibility()

  React.useEffect(() => {
    if (!settings.keyboardNavigation || !enabled) return

    shortcuts.forEach(shortcut => {
      registerShortcut(shortcut)
    })

    return () => {
      shortcuts.forEach(shortcut => {
        unregisterShortcut(shortcut.key, shortcut.modifiers)
      })
    }
  }, [shortcuts, enabled, registerShortcut, unregisterShortcut, settings.keyboardNavigation])
}
