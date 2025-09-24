/**
 * Skip Links - Navegação rápida para acessibilidade
 * Permite que usuários de teclado/screen reader pulem para conteúdo principal
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useAccessibility } from '@/lib/accessibility/accessibility-manager'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface SkipLink {
  id: string
  label: string
  target: string
  shortcut?: string
}

interface SkipLinksProps {
  links?: SkipLink[]
  className?: string
}

// =====================================================
// LINKS PADRÃO
// =====================================================

const DEFAULT_SKIP_LINKS: SkipLink[] = [
  {
    id: 'skip-to-main',
    label: 'Pular para conteúdo principal',
    target: '#main-content',
    shortcut: 'Alt+1'
  },
  {
    id: 'skip-to-nav',
    label: 'Pular para navegação',
    target: '#main-navigation',
    shortcut: 'Alt+2'
  },
  {
    id: 'skip-to-search',
    label: 'Pular para busca',
    target: '#search-input',
    shortcut: 'Alt+3'
  },
  {
    id: 'skip-to-footer',
    label: 'Pular para rodapé',
    target: '#footer',
    shortcut: 'Alt+4'
  }
]

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const SkipLinks: React.FC<SkipLinksProps> = ({
  links = DEFAULT_SKIP_LINKS,
  className
}) => {
  const { settings, announce } = useAccessibility()
  const [focusedIndex, setFocusedIndex] = React.useState(-1)

  // Não renderizar se skip links estão desabilitados
  if (!settings.skipLinks) {
    return null
  }

  const handleSkipClick = (link: SkipLink, event: React.MouseEvent) => {
    event.preventDefault()
    
    const target = document.querySelector(link.target) as HTMLElement
    if (target) {
      // Tornar o elemento focável temporariamente se necessário
      const originalTabIndex = target.getAttribute('tabindex')
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1')
      }

      // Focar o elemento
      target.focus()
      
      // Anunciar para screen readers
      announce(`Navegou para: ${link.label}`, { priority: 'assertive' })

      // Restaurar tabindex original após um tempo
      setTimeout(() => {
        if (originalTabIndex === null) {
          target.removeAttribute('tabindex')
        } else {
          target.setAttribute('tabindex', originalTabIndex)
        }
      }, 100)
    } else {
      announce(`Seção não encontrada: ${link.label}`, { priority: 'assertive' })
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex(Math.min(index + 1, links.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex(Math.max(index - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusedIndex(links.length - 1)
        break
    }
  }

  return (
    <nav
      className={cn(
        "skip-links fixed top-0 left-0 z-[9999] bg-primary text-primary-foreground",
        className
      )}
      aria-label="Links de navegação rápida"
    >
      <ul className="flex flex-col">
        {links.map((link, index) => (
          <li key={link.id}>
            <a
              href={link.target}
              className={cn(
                "block px-4 py-2 text-sm font-medium transition-all duration-200",
                "transform -translate-y-full opacity-0",
                "focus:translate-y-0 focus:opacity-100",
                "hover:bg-primary/90 focus:bg-primary/90",
                "focus:outline-none focus:ring-2 focus:ring-primary-foreground focus:ring-offset-2",
                focusedIndex === index && "translate-y-0 opacity-100"
              )}
              onClick={(e) => handleSkipClick(link, e)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-describedby={link.shortcut ? `${link.id}-shortcut` : undefined}
            >
              {link.label}
              {link.shortcut && (
                <span
                  id={`${link.id}-shortcut`}
                  className="ml-2 text-xs opacity-75"
                  aria-label={`Atalho: ${link.shortcut}`}
                >
                  ({link.shortcut})
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// =====================================================
// COMPONENTE DE LANDMARKS
// =====================================================

interface LandmarkProps {
  id: string
  role?: string
  label?: string
  children: React.ReactNode
  className?: string
}

export const Landmark: React.FC<LandmarkProps> = ({
  id,
  role = 'region',
  label,
  children,
  className
}) => {
  return (
    <div
      id={id}
      role={role}
      aria-label={label}
      className={className}
      tabIndex={-1}
    >
      {children}
    </div>
  )
}

// =====================================================
// COMPONENTES ESPECÍFICOS
// =====================================================

export const MainContent: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <Landmark
    id="main-content"
    role="main"
    label="Conteúdo principal"
    className={className}
  >
    {children}
  </Landmark>
)

export const MainNavigation: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <Landmark
    id="main-navigation"
    role="navigation"
    label="Navegação principal"
    className={className}
  >
    {children}
  </Landmark>
)

export const SearchRegion: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <Landmark
    id="search-region"
    role="search"
    label="Busca"
    className={className}
  >
    {children}
  </Landmark>
)

export const FooterRegion: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => (
  <Landmark
    id="footer"
    role="contentinfo"
    label="Informações do rodapé"
    className={className}
  >
    {children}
  </Landmark>
)

// =====================================================
// HOOK PARA GERENCIAR SKIP LINKS
// =====================================================

export function useSkipLinks() {
  const { settings, registerShortcut, unregisterShortcut } = useAccessibility()

  React.useEffect(() => {
    if (!settings.skipLinks) return

    // Registrar atalhos para skip links
    const shortcuts = DEFAULT_SKIP_LINKS.filter(link => link.shortcut)

    shortcuts.forEach(link => {
      if (link.shortcut) {
        const [modifiers, key] = link.shortcut.split('+')
        const modifierList = modifiers?.toLowerCase().split('+') as ('ctrl' | 'alt' | 'shift' | 'meta')[] || []
        
        registerShortcut({
          key: key || modifiers || '',
          modifiers: modifierList,
          action: () => {
            const target = document.querySelector(link.target) as HTMLElement
            if (target) {
              target.focus()
            }
          },
          description: link.label,
          category: 'Navegação'
        })
      }
    })

    // Cleanup
    return () => {
      shortcuts.forEach(link => {
        if (link.shortcut) {
          const [modifiers, key] = link.shortcut.split('+')
          const modifierList = modifiers?.toLowerCase().split('+') as ('ctrl' | 'alt' | 'shift' | 'meta')[] || []
          unregisterShortcut(key || modifiers || '', modifierList)
        }
      })
    }
  }, [settings.skipLinks, registerShortcut, unregisterShortcut])

  const addSkipLink = React.useCallback((link: SkipLink) => {
    // Implementar lógica para adicionar skip link dinamicamente
    console.log('Adding skip link:', link)
  }, [])

  const removeSkipLink = React.useCallback((id: string) => {
    // Implementar lógica para remover skip link dinamicamente
    console.log('Removing skip link:', id)
  }, [])

  return {
    addSkipLink,
    removeSkipLink,
    defaultLinks: DEFAULT_SKIP_LINKS
  }
}

// =====================================================
// ESTILOS CSS PARA SKIP LINKS
// =====================================================

export const skipLinksStyles = `
  .skip-links a {
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }

  .skip-links a:focus {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
  }

  @media (prefers-reduced-motion: reduce) {
    .skip-links a {
      transition: none !important;
    }
  }

  @media (prefers-contrast: high) {
    .skip-links a:focus {
      outline: 3px solid currentColor !important;
      outline-offset: 2px !important;
    }
  }
`
