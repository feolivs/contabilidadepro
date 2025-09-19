'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Enhanced Error Boundary with better UX and error reporting
 * Provides fallback UI and error recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Report to monitoring service (if available)
    this.reportError(error, errorInfo)
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Send error to monitoring service
    try {
      console.group('🚨 Error Boundary Report')
      console.error('Error:', error)
      console.error('Component Stack:', errorInfo.componentStack)
      console.error('Error Boundary Props:', this.props)
      console.groupEnd()
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-900">
                Ops! Algo deu errado
              </CardTitle>
              <CardDescription className="text-gray-600">
                Um erro inesperado ocorreu. Nossa equipe foi notificada e está trabalhando para resolver.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="bg-gray-50 p-4 rounded-md">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    Detalhes técnicos (desenvolvimento)
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <strong>Erro:</strong>
                      <pre className="text-xs text-red-600 whitespace-pre-wrap break-words mt-1">
                        {this.state.error.message}
                      </pre>
                    </div>
                    <div>
                      <strong>Stack:</strong>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words mt-1">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Recovery actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>

                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Voltar ao Dashboard
                </Button>
              </div>

              {/* Support info */}
              <div className="text-center text-sm text-gray-500 pt-4 border-t">
                <p>Se o problema persistir, entre em contato com o suporte</p>
                <p className="text-xs mt-1">ID do erro: {Date.now()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component wrapper for easier usage
 */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * Hook for programmatic error throwing (for testing)
 */
export function useErrorBoundary() {
  return (error: Error) => {
    throw error
  }
}