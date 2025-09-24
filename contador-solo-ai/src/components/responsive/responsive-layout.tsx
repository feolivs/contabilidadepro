/**
 * Layout Responsivo Avançado
 * Sistema de layout adaptativo com mobile-first approach
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useAccessibility } from '@/lib/accessibility/accessibility-manager'
import { MobileNavigation, BottomNavigation } from './mobile-navigation'
import { SkipLinks, MainContent, MainNavigation } from '@/components/accessibility/skip-links'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface ResponsiveLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  variant?: 'default' | 'mobile-first' | 'desktop-first'
  navigationStyle?: 'sidebar' | 'bottom' | 'hybrid'
}

interface BreakpointConfig {
  mobile: number
  tablet: number
  desktop: number
  wide: number
}

// =====================================================
// CONFIGURAÇÕES DE BREAKPOINTS
// =====================================================

const BREAKPOINTS: BreakpointConfig = {
  mobile: 640,   // sm
  tablet: 768,   // md
  desktop: 1024, // lg
  wide: 1280     // xl
}

// =====================================================
// HOOK PARA DETECTAR BREAKPOINTS
// =====================================================

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<keyof BreakpointConfig>('mobile')
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 })

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setDimensions({ width, height })

      if (width >= BREAKPOINTS.wide) {
        setBreakpoint('wide')
      } else if (width >= BREAKPOINTS.desktop) {
        setBreakpoint('desktop')
      } else if (width >= BREAKPOINTS.tablet) {
        setBreakpoint('tablet')
      } else {
        setBreakpoint('mobile')
      }
    }

    updateBreakpoint()
    window.addEventListener('resize', updateBreakpoint)
    return () => window.removeEventListener('resize', updateBreakpoint)
  }, [])

  const isMobile = breakpoint === 'mobile'
  const isTablet = breakpoint === 'tablet'
  const isDesktop = breakpoint === 'desktop' || breakpoint === 'wide'
  const isWide = breakpoint === 'wide'

  return {
    breakpoint,
    dimensions,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isTouch: isMobile || isTablet
  }
}

// =====================================================
// HOOK PARA ORIENTAÇÃO
// =====================================================

export function useOrientation() {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('portrait')

  React.useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    return () => window.removeEventListener('resize', updateOrientation)
  }, [])

  return orientation
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
  footer,
  className,
  variant = 'mobile-first',
  navigationStyle = 'hybrid'
}) => {
  const { settings } = useAccessibility()
  const { isMobile, isTablet, isDesktop, isTouch } = useBreakpoint()
  const orientation = useOrientation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  // Determinar estilo de navegação baseado no dispositivo
  const effectiveNavigationStyle = React.useMemo(() => {
    if (navigationStyle === 'hybrid') {
      return isMobile ? 'bottom' : 'sidebar'
    }
    return navigationStyle
  }, [navigationStyle, isMobile])

  // Classes CSS baseadas no breakpoint
  const layoutClasses = React.useMemo(() => {
    const base = "min-h-screen bg-background"
    
    const variantClasses = {
      'mobile-first': cn(
        "flex flex-col",
        isDesktop && "lg:flex-row"
      ),
      'desktop-first': cn(
        "flex",
        isMobile && "flex-col"
      ),
      'default': "flex flex-col lg:flex-row"
    }

    const orientationClasses = {
      portrait: "",
      landscape: isMobile ? "landscape:flex-row" : ""
    }

    const accessibilityClasses = cn(
      settings.reducedMotion && "reduced-motion",
      settings.highContrast && "high-contrast",
      settings.largeText && "large-text",
      settings.focusVisible && "focus-visible"
    )

    return cn(
      base,
      variantClasses[variant],
      orientationClasses[orientation],
      accessibilityClasses,
      className
    )
  }, [variant, isMobile, isDesktop, orientation, settings, className])

  // Configurações de padding baseadas na navegação
  const contentPadding = React.useMemo(() => {
    if (effectiveNavigationStyle === 'bottom' && isMobile) {
      return "pb-16" // Espaço para bottom navigation
    }
    return ""
  }, [effectiveNavigationStyle, isMobile])

  return (
    <div className={layoutClasses}>
      {/* Skip Links para acessibilidade */}
      <SkipLinks />

      {/* Sidebar para desktop */}
      {effectiveNavigationStyle === 'sidebar' && isDesktop && sidebar && (
        <MainNavigation className="w-64 flex-shrink-0 border-r border-border">
          {sidebar}
        </MainNavigation>
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {header && (
          <header className={cn(
            "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            "border-b border-border",
            isTouch && "touch-manipulation"
          )}>
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              {/* Mobile Navigation */}
              {(isMobile || isTablet) && (
                <MobileNavigation />
              )}
              
              {/* Header Content */}
              <div className="flex-1 min-w-0">
                {header}
              </div>
            </div>
          </header>
        )}

        {/* Conteúdo da página */}
        <MainContent className={cn(
          "flex-1 overflow-auto",
          contentPadding,
          isTouch && "touch-manipulation overscroll-behavior-y-contain"
        )}>
          <div className={cn(
            "container mx-auto px-4 py-6",
            isMobile && "px-4 py-4",
            isTablet && "px-6 py-5",
            isDesktop && "px-8 py-6"
          )}>
            {children}
          </div>
        </MainContent>

        {/* Footer */}
        {footer && (
          <footer className="border-t border-border bg-background">
            {footer}
          </footer>
        )}
      </div>

      {/* Bottom Navigation para mobile */}
      {effectiveNavigationStyle === 'bottom' && isMobile && (
        <BottomNavigation />
      )}
    </div>
  )
}

// =====================================================
// COMPONENTES RESPONSIVOS AUXILIARES
// =====================================================

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = 'xl',
  padding = 'md'
}) => {
  const { isMobile, isTablet } = useBreakpoint()

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }

  const paddingClasses = {
    none: '',
    sm: cn('px-2 py-2', isTablet && 'px-4 py-3', !isMobile && !isTablet && 'px-6 py-4'),
    md: cn('px-4 py-4', isTablet && 'px-6 py-5', !isMobile && !isTablet && 'px-8 py-6'),
    lg: cn('px-6 py-6', isTablet && 'px-8 py-7', !isMobile && !isTablet && 'px-12 py-8')
  }

  return (
    <div className={cn(
      'mx-auto w-full',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  )
}

// =====================================================
// GRID RESPONSIVO
// =====================================================

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: 'sm' | 'md' | 'lg'
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md'
}) => {
  const gapClasses = {
    sm: 'gap-2 sm:gap-3 lg:gap-4',
    md: 'gap-4 sm:gap-5 lg:gap-6',
    lg: 'gap-6 sm:gap-7 lg:gap-8'
  }

  const colClasses = cn(
    'grid',
    cols.mobile && `grid-cols-${cols.mobile}`,
    cols.tablet && `md:grid-cols-${cols.tablet}`,
    cols.desktop && `lg:grid-cols-${cols.desktop}`
  )

  return (
    <div className={cn(
      colClasses,
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}

// =====================================================
// COMPONENTE DE STACK RESPONSIVO
// =====================================================

interface ResponsiveStackProps {
  children: React.ReactNode
  className?: string
  direction?: {
    mobile?: 'row' | 'col'
    tablet?: 'row' | 'col'
    desktop?: 'row' | 'col'
  }
  gap?: 'sm' | 'md' | 'lg'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  className,
  direction = { mobile: 'col', tablet: 'col', desktop: 'row' },
  gap = 'md',
  align = 'start',
  justify = 'start'
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  }

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  }

  const directionClasses = cn(
    'flex',
    direction.mobile === 'row' ? 'flex-row' : 'flex-col',
    direction.tablet && (direction.tablet === 'row' ? 'md:flex-row' : 'md:flex-col'),
    direction.desktop && (direction.desktop === 'row' ? 'lg:flex-row' : 'lg:flex-col')
  )

  return (
    <div className={cn(
      directionClasses,
      gapClasses[gap],
      alignClasses[align],
      justifyClasses[justify],
      className
    )}>
      {children}
    </div>
  )
}
