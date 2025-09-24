/**
 * Estados de Loading Consistentes - Fase 2
 * Sistema unificado de loading states com animações otimizadas
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, FileText, Calculator, Users, BarChart3 } from 'lucide-react'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface LoadingStateProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'spinner' | 'skeleton' | 'pulse' | 'shimmer'
  text?: string
  showIcon?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

export interface LoadingContextProps {
  type: 'sidebar' | 'header' | 'dashboard' | 'form' | 'table' | 'card' | 'page'
  itemCount?: number
  showLabels?: boolean
}

// =====================================================
// COMPONENTES BASE DE LOADING
// =====================================================

/**
 * Spinner animado otimizado
 */
export const LoadingSpinner: React.FC<LoadingStateProps> = ({
  className,
  size = 'md',
  text,
  showIcon = true,
  icon: Icon = Loader2
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }

  return (
    <div className={cn('flex items-center justify-center space-x-2', className)}>
      {showIcon && (
        <Icon className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      )}
      {text && (
        <span className={cn('text-muted-foreground', textSizeClasses[size])}>
          {text}
        </span>
      )}
    </div>
  )
}

/**
 * Loading com shimmer effect
 */
export const LoadingShimmer: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children
}) => (
  <div className={cn('animate-pulse', className)}>
    <div className="shimmer-effect">
      {children}
    </div>
  </div>
)

/**
 * Loading dots animados
 */
export const LoadingDots: React.FC<{ className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  className,
  size = 'md'
}) => {
  const dotSizes = {
    sm: 'h-1 w-1',
    md: 'h-2 w-2',
    lg: 'h-3 w-3'
  }

  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-muted-foreground rounded-full animate-bounce',
            dotSizes[size]
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  )
}

// =====================================================
// LOADING STATES CONTEXTUAIS
// =====================================================

/**
 * Loading para Sidebar
 */
export const SidebarLoading: React.FC<{ itemCount?: number }> = ({ itemCount = 4 }) => (
  <div className="space-y-6 p-4">
    {Array.from({ length: itemCount }).map((_, sectionIndex) => (
      <div key={sectionIndex} className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, itemIndex) => (
            <div key={itemIndex} className="flex items-center space-x-3 px-2 py-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

/**
 * Loading para Header
 */
export const HeaderLoading: React.FC = () => (
  <header className="sticky top-0 z-40 w-full border-b bg-background">
    <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center flex-1">
        <Skeleton className="h-5 w-5 lg:hidden mr-3" />
        <Skeleton className="h-4 w-48" />
      </div>
      
      <div className="hidden md:flex flex-1 max-w-lg mx-4">
        <Skeleton className="h-9 w-full" />
      </div>
      
      <div className="flex items-center space-x-2">
        <Skeleton className="h-9 w-20 hidden md:block" />
        <Skeleton className="h-9 w-20 hidden md:block" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  </header>
)

/**
 * Loading para Dashboard Cards
 */
export const DashboardCardLoading: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    ))}
  </div>
)

/**
 * Loading para Tabelas
 */
export const TableLoading: React.FC<{ 
  rows?: number
  columns?: number
  showHeader?: boolean 
}> = ({ 
  rows = 5, 
  columns = 4, 
  showHeader = true 
}) => (
  <div className="rounded-md border">
    {showHeader && (
      <div className="border-b bg-muted/50 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-20" />
          ))}
        </div>
      </div>
    )}
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

/**
 * Loading para Formulários
 */
export const FormLoading: React.FC<{ fields?: number }> = ({ fields = 6 }) => (
  <div className="space-y-6">
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex justify-end space-x-2">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-20" />
    </div>
  </div>
)

/**
 * Loading para Gráficos
 */
export const ChartLoading: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-20" />
    </div>
    <div 
      className="rounded-lg border bg-muted/20 flex items-center justify-center"
      style={{ height: `${height}px` }}
    >
      <div className="text-center space-y-2">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
        <p className="text-sm text-muted-foreground">Carregando gráfico...</p>
      </div>
    </div>
  </div>
)

// =====================================================
// LOADING STATES ESPECÍFICOS DO DOMÍNIO
// =====================================================

/**
 * Loading para Cálculos Fiscais
 */
export const CalculationLoading: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Calculator className="h-5 w-5 text-muted-foreground animate-pulse" />
      <span className="text-sm text-muted-foreground">Processando cálculo...</span>
    </div>
    <div className="space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  </div>
)

/**
 * Loading para Documentos OCR
 */
export const DocumentProcessingLoading: React.FC = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <FileText className="h-5 w-5 text-muted-foreground animate-pulse" />
      <span className="text-sm text-muted-foreground">Processando documento...</span>
    </div>
    <div className="space-y-2">
      <div className="w-full bg-muted rounded-full h-2">
        <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
      <p className="text-xs text-muted-foreground text-center">Extraindo texto...</p>
    </div>
  </div>
)

/**
 * Loading para Lista de Clientes
 */
export const ClientListLoading: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    ))}
  </div>
)

// =====================================================
// COMPONENTE UNIVERSAL DE LOADING
// =====================================================

/**
 * Componente universal que escolhe o loading apropriado baseado no contexto
 */
export const UniversalLoading: React.FC<LoadingContextProps & {
  className?: string
  text?: string
}> = ({ 
  type, 
  itemCount, 
  showLabels = true, 
  className, 
  text 
}) => {
  const loadingComponents = {
    sidebar: <SidebarLoading itemCount={itemCount} />,
    header: <HeaderLoading />,
    dashboard: <DashboardCardLoading count={itemCount} />,
    form: <FormLoading fields={itemCount} />,
    table: <TableLoading rows={itemCount} />,
    card: <DashboardCardLoading count={1} />,
    page: <LoadingSpinner size="lg" text={text || 'Carregando página...'} />
  }

  return (
    <div className={cn('animate-in fade-in-0 duration-200', className)}>
      {loadingComponents[type] || <LoadingSpinner text={text} />}
    </div>
  )
}

// =====================================================
// HOOK PARA LOADING STATES
// =====================================================

export function useLoadingState(initialState: boolean = false) {
  const [isLoading, setIsLoading] = React.useState(initialState)
  const [loadingText, setLoadingText] = React.useState<string>()

  const startLoading = (text?: string) => {
    setLoadingText(text)
    setIsLoading(true)
  }

  const stopLoading = () => {
    setIsLoading(false)
    setLoadingText(undefined)
  }

  const withLoading = React.useCallback(
    async (asyncFn: () => Promise<any>, text?: string): Promise<any> => {
      startLoading(text)
      try {
        const result = await asyncFn()
        return result
      } finally {
        stopLoading()
      }
    },
    [startLoading, stopLoading]
  )

  return {
    isLoading,
    loadingText,
    startLoading,
    stopLoading,
    withLoading
  }
}
