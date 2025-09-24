'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, ArrowRight, Users } from 'lucide-react'

export default function ClientesRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect automático após 3 segundos
    const timer = setTimeout(() => {
      router.push('/empresas-clientes')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])
  const handleRedirect = () => {
    router.push('/empresas-clientes')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center items-center space-x-2 text-blue-600">
            <Users className="h-8 w-8" />
            <ArrowRight className="h-6 w-6" />
            <Building2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Página Atualizada!
            </h1>
            <p className="text-gray-600">
              A gestão de clientes foi unificada com empresas em uma nova página mais completa.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">✨ Novidades:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Busca inteligente com sugestões</li>
              <li>• Filtros avançados por localização</li>
              <li>• Seleção múltipla e ações em lote</li>
              <li>• Exportação em Excel, CSV e PDF</li>
              <li>• Interface moderna e responsiva</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRedirect}
              className="w-full flex items-center justify-center gap-2"
            >
              <Building2 className="h-4 w-4" />
              Ir para Empresas & Clientes
            </Button>

            <p className="text-xs text-gray-500">
              Redirecionamento automático em 3 segundos...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
