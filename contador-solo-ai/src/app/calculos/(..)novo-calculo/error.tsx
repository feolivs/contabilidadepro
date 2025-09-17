'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Calculator } from 'lucide-react'

interface NovoCalculoModalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function NovoCalculoModalError({ error, reset }: NovoCalculoModalErrorProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {

  }, [error])

  const handleClose = () => {
    setIsOpen(false)
    router.back()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Erro ao carregar formulário
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-3">
              <Calculator className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Não foi possível carregar o formulário de cálculo.
              </p>
              <p className="text-xs text-muted-foreground">
                Você pode tentar novamente ou acessar a página completa.
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
              onClick={() => router.push('/novo-calculo')}
              size="sm"
            >
              Página completa
            </Button>
            
            <Button 
              onClick={handleClose}
              variant="ghost"
              size="sm"
            >
              Fechar
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
