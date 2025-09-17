'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// =====================================================
// ERROR BOUNDARY PARA SLOT DE ESTATÍSTICAS
// =====================================================

interface StatsErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function StatsError({ error, reset }: StatsErrorProps) {
  useEffect(() => {
    // Log do erro para monitoramento

  }, [error])

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Erro ao Carregar Estatísticas
            </h3>
            <p className="text-sm text-red-700 mb-4">
              Não foi possível carregar as estatísticas dos prazos fiscais.
            </p>
          </div>

          <Button 
            onClick={reset}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-xs text-red-600">
              <summary className="cursor-pointer">Detalhes do erro (dev)</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-left overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
