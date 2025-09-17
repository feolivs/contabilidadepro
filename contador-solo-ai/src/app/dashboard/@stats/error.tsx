'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

interface StatsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function StatsError({ error, reset }: StatsErrorProps) {
  useEffect(() => {
    console.error('[DASHBOARD_STATS_ERROR]:', error)
  }, [error])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="md:col-span-2 lg:col-span-4 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Erro ao carregar estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar as estatísticas do dashboard. 
            Isso não afeta outras seções.
          </p>
          
          <div className="flex items-center space-x-2">
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
