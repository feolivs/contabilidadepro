'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Activity } from 'lucide-react'
import { useEffect } from 'react'

interface RecentErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RecentError({ error, reset }: RecentErrorProps) {
  useEffect(() => {

  }, [error])

  return (
    <div className="space-y-6">
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Erro ao carregar atividades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <Activity className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar as atividades recentes e prazos fiscais.
              </p>
              <p className="text-xs text-muted-foreground">
                As estatísticas e gráficos continuam funcionando normalmente.
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-2">
            <Button 
              onClick={reset}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            
            <Button 
              onClick={() => window.location.reload()}
              variant="ghost"
              size="sm"
            >
              Recarregar página
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Detalhes do erro (desenvolvimento)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
