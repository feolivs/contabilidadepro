'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, ArrowLeft, Home, LogIn } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const handleGoBack = () => {
    router.back()
  }

  const handleGoHome = () => {
    router.push('/')
  }

  const handleLogin = () => {
    router.push('/login')
  }

  const handleDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Acesso Negado
          </CardTitle>
          <CardDescription className="text-gray-600">
            {user ? (
              'Você não tem permissão para acessar esta página ou recurso.'
            ) : (
              'Você precisa estar logado para acessar esta página.'
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-500 text-center">
            {user ? (
              <>
                <p>Usuário: <span className="font-medium">{user.email}</span></p>
                <p className="mt-2">
                  Se você acredita que deveria ter acesso a esta página, 
                  entre em contato com o administrador do sistema.
                </p>
              </>
            ) : (
              <p>
                Faça login com suas credenciais para acessar o sistema.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {user ? (
              <>
                <Button 
                  onClick={handleDashboard}
                  className="w-full"
                  variant="default"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Ir para Dashboard
                </Button>
                <Button 
                  onClick={handleGoBack}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={handleLogin}
                  className="w-full"
                  variant="default"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Fazer Login
                </Button>
                <Button 
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Página Inicial
                </Button>
              </>
            )}
          </div>

          {/* Informações de debugging em desenvolvimento */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-gray-100 rounded-lg text-xs text-gray-600">
              <p className="font-medium mb-1">Debug Info (Development):</p>
              <p>User: {user ? 'Authenticated' : 'Not authenticated'}</p>
              <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
              <p>Current URL: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
