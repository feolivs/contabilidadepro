'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log simples do erro
    console.error('Error boundary caught:', error)
  }, [error])

  // Detectar tipos específicos de erro contábil
  const getErrorType = (error: Error) => {
    const message = error.message.toLowerCase()
    
    if (message.includes('cálculo') || message.includes('calculo')) {
      return {
        type: 'calculation',
        title: 'Erro no Cálculo Fiscal',
        description: 'Ocorreu um erro durante o processamento do cálculo. Verifique os dados informados.',
        icon: AlertTriangle,
        color: 'text-orange-600'
      }
    }
    
    if (message.includes('supabase') || message.includes('database')) {
      return {
        type: 'database',
        title: 'Erro de Conexão',
        description: 'Problema na conexão com o banco de dados. Tente novamente em alguns instantes.',
        icon: AlertTriangle,
        color: 'text-red-600'
      }
    }
    
    if (message.includes('auth') || message.includes('unauthorized')) {
      return {
        type: 'auth',
        title: 'Erro de Autenticação',
        description: 'Sua sessão expirou. Faça login novamente para continuar.',
        icon: AlertTriangle,
        color: 'text-yellow-600'
      }
    }
    
    return {
      type: 'generic',
      title: 'Erro Inesperado',
      description: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
      icon: Bug,
      color: 'text-red-600'
    }
  }

  const errorInfo = getErrorType(error)
  const Icon = errorInfo.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4`}>
            <Icon className={`h-6 w-6 ${errorInfo.color}`} />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            {errorInfo.title}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {errorInfo.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Detalhes técnicos (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="bg-gray-50 p-3 rounded-md">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                Detalhes técnicos
              </summary>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
          
          {/* Ações */}
          <div className="flex flex-col space-y-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
          
          {/* Informações de suporte */}
          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>Precisa de ajuda?</p>
            <p>Entre em contato com o suporte técnico</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
