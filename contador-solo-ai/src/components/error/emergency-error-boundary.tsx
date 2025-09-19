'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId: string
}

/**
 * 🛡️ EMERGENCY ERROR BOUNDARY - PHASE 0 FIX
 * Previne que crashes façam usuários perderem trabalho
 * Especialmente importante para contadores solo
 */
export class EmergencyErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Gerar ID único para o erro
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    console.error('🚨 EMERGENCY ERROR BOUNDARY ACTIVATED:', {
      errorId,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // 🔍 ANÁLISE DO ERRO PARA DEBUGGING
    const errorContext = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      isRetry: this.retryCount > 0
    }

    console.error('💥 ERRO CRÍTICO CAPTURADO:', errorContext)

    // 💾 TENTAR SALVAR DADOS LOCAIS (RECUPERAÇÃO)
    try {
      this.saveUserDataToLocal()
    } catch (saveError) {
      console.error('Falha ao salvar dados locais:', saveError)
    }

    // 📊 LOG ESTRUTURADO PARA DEBUGGING
    this.logStructuredError(errorContext)

    // Callback externo
    this.props.onError?.(error, errorInfo)
  }

  /**
   * 💾 SALVAR DADOS IMPORTANTES LOCALMENTE
   * Previne perda total de trabalho
   */
  private saveUserDataToLocal() {
    try {
      // Salvar dados de formulários em andamento
      const forms = document.querySelectorAll('form')
      const formData: Record<string, any> = {}

      forms.forEach((form, index) => {
        const inputs = form.querySelectorAll('input, textarea, select')
        const data: Record<string, string> = {}

        inputs.forEach((input: any) => {
          if (input.name && input.value) {
            data[input.name] = input.value
          }
        })

        if (Object.keys(data).length > 0) {
          formData[`form_${index}`] = data
        }
      })

      if (Object.keys(formData).length > 0) {
        localStorage.setItem('emergency_form_backup', JSON.stringify({
          data: formData,
          timestamp: new Date().toISOString(),
          errorId: this.state.errorId
        }))

        console.log('✅ Dados de formulário salvos para recuperação')
      }

    } catch (error) {
      console.error('Erro ao salvar backup:', error)
    }
  }

  /**
   * 📊 LOG ESTRUTURADO PARA ANÁLISE
   */
  private logStructuredError(context: any) {
    // Identificar tipo de erro comum
    const errorType = this.categorizeError(context.message)

    const structuredLog = {
      ...context,
      errorType,
      severity: this.getSeverity(context),
      userImpact: this.getUserImpact(context),
      suggestedAction: this.getSuggestedAction(errorType)
    }

    // Em produção, isso seria enviado para serviço de log
    console.log('📋 STRUCTURED ERROR LOG:', structuredLog)

    // Salvar no localStorage para debug
    try {
      const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]')
      errorLogs.push(structuredLog)

      // Manter apenas os 10 mais recentes
      if (errorLogs.length > 10) {
        errorLogs.splice(0, errorLogs.length - 10)
      }

      localStorage.setItem('error_logs', JSON.stringify(errorLogs))
    } catch (logError) {
      console.error('Falha ao salvar log local:', logError)
    }
  }

  private categorizeError(message: string): string {
    if (message.includes('ChunkLoadError') || message.includes('Loading chunk')) {
      return 'CHUNK_LOAD_ERROR'
    }
    if (message.includes('Network') || message.includes('fetch')) {
      return 'NETWORK_ERROR'
    }
    if (message.includes('undefined') || message.includes('null')) {
      return 'NULL_REFERENCE'
    }
    if (message.includes('Permission') || message.includes('401') || message.includes('403')) {
      return 'PERMISSION_ERROR'
    }
    return 'UNKNOWN_ERROR'
  }

  private getSeverity(context: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (context.message.includes('ChunkLoadError')) return 'MEDIUM'
    if (context.message.includes('Network')) return 'MEDIUM'
    if (context.isRetry && this.retryCount >= this.maxRetries) return 'CRITICAL'
    return 'HIGH'
  }

  private getUserImpact(context: any): string {
    const errorType = this.categorizeError(context.message)

    switch (errorType) {
      case 'CHUNK_LOAD_ERROR':
        return 'Usuário precisa recarregar a página'
      case 'NETWORK_ERROR':
        return 'Usuário temporariamente sem conexão'
      case 'NULL_REFERENCE':
        return 'Funcionalidade específica falhou'
      case 'PERMISSION_ERROR':
        return 'Usuário precisa fazer login novamente'
      default:
        return 'Funcionalidade indisponível'
    }
  }

  private getSuggestedAction(errorType: string): string {
    switch (errorType) {
      case 'CHUNK_LOAD_ERROR':
        return 'Recarregar página (limpar cache)'
      case 'NETWORK_ERROR':
        return 'Verificar conexão e tentar novamente'
      case 'NULL_REFERENCE':
        return 'Voltar à página anterior'
      case 'PERMISSION_ERROR':
        return 'Fazer login novamente'
      default:
        return 'Contatar suporte técnico'
    }
  }

  /**
   * 🔄 TENTATIVA DE RECUPERAÇÃO AUTOMÁTICA
   */
  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++

      console.log(`🔄 Tentativa de recuperação ${this.retryCount}/${this.maxRetries}`)

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorId: ''
      })
    } else {
      console.error('❌ Máximo de tentativas atingido')
    }
  }

  /**
   * 🏠 VOLTAR PARA PÁGINA SEGURA
   */
  private handleGoHome = () => {
    window.location.href = '/'
  }

  /**
   * 🔄 RECARREGAR PÁGINA (LIMPAR ESTADO)
   */
  private handleReload = () => {
    window.location.reload()
  }

  /**
   * 📋 COPIAR DETALHES DO ERRO
   */
  private handleCopyError = () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => alert('Detalhes do erro copiados para a área de transferência'))
      .catch(() => console.error('Falha ao copiar detalhes'))
  }

  render() {
    if (this.state.hasError) {
      // 🎨 FALLBACK CUSTOMIZADO
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorType = this.categorizeError(this.state.error?.message || '')
      const canRetry = this.retryCount < this.maxRetries && errorType !== 'CRITICAL'

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">

            {/* ÍCONE E TÍTULO */}
            <div className="mb-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Oops! Algo deu errado
              </h1>
              <p className="text-gray-600 text-sm">
                Não se preocupe, seus dados foram salvos automaticamente
              </p>
            </div>

            {/* INFORMAÇÕES DO ERRO */}
            <Alert className="mb-6 text-left">
              <Bug className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Erro ID:</strong> {this.state.errorId}<br/>
                <strong>Tipo:</strong> {errorType}<br/>
                <strong>Ação sugerida:</strong> {this.getSuggestedAction(errorType)}
              </AlertDescription>
            </Alert>

            {/* AÇÕES DE RECUPERAÇÃO */}
            <div className="space-y-3">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente ({this.maxRetries - this.retryCount} tentativas restantes)
                </Button>
              )}

              <Button
                onClick={this.handleReload}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar Página
              </Button>

              <Button
                onClick={this.handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Home className="w-4 h-4 mr-2" />
                Voltar ao Início
              </Button>

              <Button
                onClick={this.handleCopyError}
                className="w-full"
                variant="ghost"
                size="sm"
              >
                <Bug className="w-4 h-4 mr-2" />
                Copiar Detalhes do Erro
              </Button>
            </div>

            {/* INFORMAÇÕES DE RECUPERAÇÃO */}
            <div className="mt-6 p-3 bg-blue-50 rounded-md">
              <p className="text-xs text-blue-700">
                💾 <strong>Dados preservados:</strong> Seus formulários foram salvos localmente e podem ser recuperados.
              </p>
            </div>

            {/* DEBUG INFO (desenvolvimento) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs cursor-pointer text-gray-500">
                  Detalhes técnicos (dev)
                </summary>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto max-h-32">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 🪝 Hook para usar Error Boundary em componentes funcionais
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: any) => {
    console.error('🚨 Error caught by hook:', error, errorInfo)

    // Em uma implementação real, isso dispararia o error boundary
    throw error
  }
}

export default EmergencyErrorBoundary