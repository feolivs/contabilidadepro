'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Building2, ArrowLeft } from 'lucide-react'

interface EmpresaFullPageErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function EmpresaFullPageError({ error, reset }: EmpresaFullPageErrorProps) {
  const router = useRouter()

  useEffect(() => {

  }, [error])

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-4">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Erro ao carregar empresa
              </h2>
              <p className="text-muted-foreground">
                Não foi possível carregar os dados da empresa. 
                Isso pode ser um problema temporário.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-3">
            <Button 
              onClick={reset}
              variant="outline"
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            
            <Button 
              onClick={() => router.push('/clientes')}
              variant="ghost"
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos clientes
            </Button>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Página completa de empresa</span>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="text-sm text-muted-foreground cursor-pointer">
                Detalhes do erro (desenvolvimento)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto">
                {error.message}
                {error.stack && (
                  <>
                    {'\n\nStack trace:\n'}
                    {error.stack}
                  </>
                )}
              </pre>
            </details>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
