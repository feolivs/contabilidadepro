/**
 * Formulário Acessível - Design System
 * Componentes de formulário com acessibilidade completa WCAG 2.1 AA
 */

'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccessibility } from '@/lib/accessibility/accessibility-manager'

// =====================================================
// VARIANTES DOS COMPONENTES
// =====================================================

const inputVariants = cva(
  [
    "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "transition-colors duration-200",
    
    // High contrast support
    "high-contrast:border-2 high-contrast:border-foreground",
    "high-contrast:focus-visible:ring-4 high-contrast:focus-visible:ring-primary",
    
    // Large text support
    "large-text:text-base large-text:py-3 large-text:px-4"
  ],
  {
    variants: {
      variant: {
        default: "border-input",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:ring-green-500"
      },
      size: {
        default: "h-10",
        sm: "h-8 px-2 text-xs",
        lg: "h-12 px-4 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AccessibleInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  description?: string
  error?: string
  success?: string
  required?: boolean
  showPasswordToggle?: boolean
}

export interface AccessibleTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof inputVariants> {
  label?: string
  description?: string
  error?: string
  success?: string
  required?: boolean
  resize?: boolean
}

export interface AccessibleSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  description?: string
  error?: string
  success?: string
  required?: boolean
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
}

// =====================================================
// COMPONENTE DE INPUT
// =====================================================

export const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({
    className,
    variant,
    size,
    type = 'text',
    label,
    description,
    error,
    success,
    required,
    showPasswordToggle = false,
    id,
    ...props
  }, ref) => {
    const { settings, announce } = useAccessibility()
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const inputId = id || React.useId()
    const descriptionId = `${inputId}-description`
    const errorId = `${inputId}-error`
    const successId = `${inputId}-success`

    // Determinar variante baseada no estado
    const currentVariant = error ? 'error' : success ? 'success' : variant

    // Determinar tipo do input
    const inputType = showPasswordToggle && type === 'password' 
      ? (showPassword ? 'text' : 'password')
      : type

    // Lidar com mudanças de foco
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      if (settings.announcements && label) {
        announce(`Campo focado: ${label}${required ? ', obrigatório' : ''}`)
      }
      props.onFocus?.(e)
    }, [settings.announcements, label, required, announce, props])

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      props.onBlur?.(e)
    }, [props])

    // Toggle de senha
    const togglePasswordVisibility = React.useCallback(() => {
      setShowPassword(prev => {
        const newState = !prev
        announce(newState ? 'Senha visível' : 'Senha oculta')
        return newState
      })
    }, [announce])

    // Props de acessibilidade
    const accessibilityProps = {
      id: inputId,
      'aria-label': props['aria-label'] || label,
      'aria-describedby': [
        description && descriptionId,
        error && errorId,
        success && successId
      ].filter(Boolean).join(' ') || undefined,
      'aria-invalid': error ? 'true' : undefined,
      'aria-required': required,
      required
    }

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error && "text-destructive",
              success && "text-green-600",
              isFocused && "text-primary"
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="obrigatório">
                *
              </span>
            )}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            className={cn(
              inputVariants({ variant: currentVariant, size }),
              showPasswordToggle && "pr-10",
              className
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...accessibilityProps}
            {...props}
          />

          {/* Password Toggle */}
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Status Icons */}
          {error && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
          )}
          {success && !error && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
          )}
        </div>

        {/* Description */}
        {description && (
          <p
            id={descriptionId}
            className="text-xs text-muted-foreground"
          >
            {description}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={errorId}
            className="text-xs text-destructive flex items-center gap-1"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && !error && (
          <p
            id={successId}
            className="text-xs text-green-600 flex items-center gap-1"
            role="status"
            aria-live="polite"
          >
            <Check className="h-3 w-3 flex-shrink-0" />
            {success}
          </p>
        )}
      </div>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

// =====================================================
// COMPONENTE DE TEXTAREA
// =====================================================

export const AccessibleTextarea = React.forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({
    className,
    variant,
    size,
    label,
    description,
    error,
    success,
    required,
    resize = true,
    id,
    ...props
  }, ref) => {
    const { settings, announce } = useAccessibility()
    const [isFocused, setIsFocused] = React.useState(false)
    const textareaId = id || React.useId()
    const descriptionId = `${textareaId}-description`
    const errorId = `${textareaId}-error`
    const successId = `${textareaId}-success`

    // Determinar variante baseada no estado
    const currentVariant = error ? 'error' : success ? 'success' : variant

    // Lidar com mudanças de foco
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true)
      if (settings.announcements && label) {
        announce(`Campo de texto focado: ${label}${required ? ', obrigatório' : ''}`)
      }
      props.onFocus?.(e)
    }, [settings.announcements, label, required, announce, props])

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      props.onBlur?.(e)
    }, [props])

    // Props de acessibilidade
    const accessibilityProps = {
      id: textareaId,
      'aria-label': props['aria-label'] || label,
      'aria-describedby': [
        description && descriptionId,
        error && errorId,
        success && successId
      ].filter(Boolean).join(' ') || undefined,
      'aria-invalid': error ? 'true' : undefined,
      'aria-required': required,
      required
    }

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              error && "text-destructive",
              success && "text-green-600",
              isFocused && "text-primary"
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="obrigatório">
                *
              </span>
            )}
          </label>
        )}

        {/* Textarea */}
        <div className="relative">
          <textarea
            ref={ref}
            className={cn(
              inputVariants({ variant: currentVariant, size }),
              "min-h-[80px]",
              !resize && "resize-none",
              className
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...accessibilityProps}
            {...props}
          />

          {/* Status Icons */}
          {error && (
            <AlertCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
          )}
          {success && !error && (
            <Check className="absolute right-3 top-3 h-4 w-4 text-green-600" />
          )}
        </div>

        {/* Description */}
        {description && (
          <p
            id={descriptionId}
            className="text-xs text-muted-foreground"
          >
            {description}
          </p>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={errorId}
            className="text-xs text-destructive flex items-center gap-1"
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && !error && (
          <p
            id={successId}
            className="text-xs text-green-600 flex items-center gap-1"
            role="status"
            aria-live="polite"
          >
            <Check className="h-3 w-3 flex-shrink-0" />
            {success}
          </p>
        )}
      </div>
    )
  }
)

AccessibleTextarea.displayName = 'AccessibleTextarea'

// =====================================================
// HOOK PARA FORMULÁRIOS ACESSÍVEIS
// =====================================================

export function useAccessibleForm() {
  const { settings, announce } = useAccessibility()

  const announceError = React.useCallback((fieldName: string, error: string) => {
    if (settings.announcements) {
      announce(`Erro no campo ${fieldName}: ${error}`, { priority: 'assertive' })
    }
  }, [settings.announcements, announce])

  const announceSuccess = React.useCallback((message: string) => {
    if (settings.announcements) {
      announce(message, { priority: 'polite' })
    }
  }, [settings.announcements, announce])

  const validateField = React.useCallback((
    value: string,
    rules: {
      required?: boolean
      minLength?: number
      maxLength?: number
      pattern?: RegExp
      custom?: (value: string) => string | null
    }
  ): string | null => {
    if (rules.required && !value.trim()) {
      return 'Este campo é obrigatório'
    }

    if (rules.minLength && value.length < rules.minLength) {
      return `Mínimo de ${rules.minLength} caracteres`
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Máximo de ${rules.maxLength} caracteres`
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Formato inválido'
    }

    if (rules.custom) {
      return rules.custom(value)
    }

    return null
  }, [])

  return {
    announceError,
    announceSuccess,
    validateField,
    isScreenReaderActive: settings.screenReader,
    isHighContrast: settings.highContrast
  }
}
