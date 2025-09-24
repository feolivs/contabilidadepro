/**
 * Botão Acessível - Design System
 * Componente de botão com acessibilidade completa WCAG 2.1 AA
 */

'use client'

import React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccessibility } from '@/lib/accessibility/accessibility-manager'

// =====================================================
// VARIANTES DO BOTÃO
// =====================================================

const buttonVariants = cva(
  [
    // Base styles
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    
    // Accessibility enhancements
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "active:scale-[0.98] hover:scale-[1.02]",
    
    // High contrast support
    "high-contrast:border-2 high-contrast:border-current",
    
    // Reduced motion support
    "reduced-motion:transition-none reduced-motion:hover:scale-100 reduced-motion:active:scale-100"
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
          "high-contrast:bg-foreground high-contrast:text-background"
        ],
        destructive: [
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
          "high-contrast:bg-red-600 high-contrast:text-white"
        ],
        outline: [
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
          "high-contrast:border-2 high-contrast:border-foreground"
        ],
        secondary: [
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
          "high-contrast:bg-muted high-contrast:text-foreground"
        ],
        ghost: [
          "hover:bg-accent hover:text-accent-foreground",
          "high-contrast:hover:bg-foreground high-contrast:hover:text-background"
        ],
        link: [
          "text-primary underline-offset-4 hover:underline",
          "high-contrast:text-foreground high-contrast:underline"
        ]
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-9 w-9"
      },
      fullWidth: {
        true: "w-full",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      fullWidth: false
    }
  }
)

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  tooltip?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  confirmAction?: boolean
  confirmMessage?: string
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    className,
    variant,
    size,
    fullWidth,
    asChild = false,
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    tooltip,
    ariaLabel,
    ariaDescribedBy,
    confirmAction = false,
    confirmMessage = 'Tem certeza que deseja continuar?',
    disabled,
    onClick,
    children,
    ...props
  }, ref) => {
    const { settings, announce } = useAccessibility()
    const [isConfirming, setIsConfirming] = React.useState(false)
    const [isPressed, setIsPressed] = React.useState(false)
    const buttonRef = React.useRef<HTMLButtonElement>(null)

    // Combinar refs
    React.useImperativeHandle(ref, () => buttonRef.current!)

    // Estado final de disabled
    const isDisabled = disabled || loading

    // Lidar com clique
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) return

      // Anunciar ação para screen readers
      if (settings.announcements) {
        const actionText = loadingText || children?.toString() || ariaLabel || 'Botão ativado'
        announce(loading ? `Carregando: ${actionText}` : `Ação: ${actionText}`)
      }

      // Confirmação se necessária
      if (confirmAction && !isConfirming) {
        setIsConfirming(true)
        const confirmed = window.confirm(confirmMessage)
        setIsConfirming(false)
        
        if (!confirmed) {
          announce('Ação cancelada')
          return
        }
      }

      onClick?.(event)
    }, [
      isDisabled,
      settings.announcements,
      loadingText,
      children,
      ariaLabel,
      announce,
      loading,
      confirmAction,
      isConfirming,
      confirmMessage,
      onClick
    ])

    // Lidar com teclado
    const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === ' ' || event.key === 'Enter') {
        setIsPressed(true)
      }
      props.onKeyDown?.(event)
    }, [props])

    const handleKeyUp = React.useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === ' ' || event.key === 'Enter') {
        setIsPressed(false)
      }
      props.onKeyUp?.(event)
    }, [props])

    // Renderizar conteúdo do botão
    const renderContent = () => {
      if (loading) {
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {loadingText || children}
          </>
        )
      }

      if (icon && iconPosition === 'left') {
        return (
          <>
            <span className="flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
            {children}
          </>
        )
      }

      if (icon && iconPosition === 'right') {
        return (
          <>
            {children}
            <span className="flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
          </>
        )
      }

      return children
    }

    // Props de acessibilidade
    const accessibilityProps = {
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-pressed': variant === 'ghost' ? isPressed : undefined,
      'aria-busy': loading,
      'aria-disabled': isDisabled,
      title: tooltip,
      disabled: isDisabled
    }

    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={buttonRef}
        className={cn(
          buttonVariants({ variant, size, fullWidth }),
          loading && "cursor-wait",
          isPressed && "scale-[0.98]",
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        {...accessibilityProps}
        {...props}
      >
        {renderContent()}
      </Comp>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

// =====================================================
// VARIAÇÕES ESPECIALIZADAS
// =====================================================

export const PrimaryButton = React.forwardRef<HTMLButtonElement, Omit<AccessibleButtonProps, 'variant'>>(
  (props, ref) => (
    <AccessibleButton ref={ref} variant="default" {...props} />
  )
)
PrimaryButton.displayName = 'PrimaryButton'

export const SecondaryButton = React.forwardRef<HTMLButtonElement, Omit<AccessibleButtonProps, 'variant'>>(
  (props, ref) => (
    <AccessibleButton ref={ref} variant="secondary" {...props} />
  )
)
SecondaryButton.displayName = 'SecondaryButton'

export const DestructiveButton = React.forwardRef<HTMLButtonElement, Omit<AccessibleButtonProps, 'variant'>>(
  (props, ref) => (
    <AccessibleButton 
      ref={ref} 
      variant="destructive" 
      confirmAction={true}
      confirmMessage="Esta ação não pode ser desfeita. Deseja continuar?"
      {...props} 
    />
  )
)
DestructiveButton.displayName = 'DestructiveButton'

export const IconButton = React.forwardRef<HTMLButtonElement, Omit<AccessibleButtonProps, 'size'>>(
  ({ ariaLabel, children, ...props }, ref) => (
    <AccessibleButton 
      ref={ref} 
      size="icon" 
      ariaLabel={ariaLabel || 'Botão de ação'}
      {...props}
    >
      {children}
    </AccessibleButton>
  )
)
IconButton.displayName = 'IconButton'

export const LoadingButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ loading, loadingText = 'Carregando...', children, ...props }, ref) => (
    <AccessibleButton 
      ref={ref} 
      loading={loading}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </AccessibleButton>
  )
)
LoadingButton.displayName = 'LoadingButton'

// =====================================================
// HOOK PARA BOTÕES ACESSÍVEIS
// =====================================================

export function useAccessibleButton() {
  const { settings, announce } = useAccessibility()

  const announceAction = React.useCallback((action: string) => {
    if (settings.announcements) {
      announce(action, { priority: 'polite' })
    }
  }, [settings.announcements, announce])

  const confirmAction = React.useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const confirmed = window.confirm(message)
      announceAction(confirmed ? 'Ação confirmada' : 'Ação cancelada')
      resolve(confirmed)
    })
  }, [announceAction])

  return {
    announceAction,
    confirmAction,
    isScreenReaderActive: settings.screenReader,
    isHighContrast: settings.highContrast,
    isReducedMotion: settings.reducedMotion
  }
}

// =====================================================
// ESTILOS CSS ADICIONAIS
// =====================================================

export const buttonAccessibilityStyles = `
  /* Estilos para alto contraste */
  .high-contrast button {
    border: 2px solid currentColor !important;
  }

  /* Estilos para movimento reduzido */
  .reduced-motion button {
    transition: none !important;
    transform: none !important;
  }

  .reduced-motion button:hover,
  .reduced-motion button:active {
    transform: none !important;
  }

  /* Estilos para foco visível */
  .focus-visible button:focus-visible {
    outline: 3px solid hsl(var(--ring)) !important;
    outline-offset: 2px !important;
  }

  /* Estilos para texto grande */
  .large-text button {
    font-size: 1.125rem !important;
    padding: 0.75rem 1.5rem !important;
    min-height: 2.75rem !important;
  }

  .large-text button.size-sm {
    font-size: 1rem !important;
    padding: 0.625rem 1.25rem !important;
    min-height: 2.5rem !important;
  }

  .large-text button.size-lg {
    font-size: 1.25rem !important;
    padding: 1rem 2rem !important;
    min-height: 3rem !important;
  }
`
