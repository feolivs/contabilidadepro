'use client'

import { FileQuestion, Home, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <FileQuestion className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Página Não Encontrada
          </CardTitle>
          <CardDescription className="text-gray-600">
            A página que você está procurando não existe ou foi movida.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Sugestões */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Você pode estar procurando por:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Dashboard principal
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Lista de clientes
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Cálculos fiscais
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                Documentos contábeis
              </li>
            </ul>
          </div>
          
          {/* Ações */}
          <div className="flex flex-col space-y-3">
            <Button asChild className="w-full">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Ir para Dashboard
              </Link>
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" asChild>
                <Link href="/clientes">
                  <Search className="h-4 w-4 mr-2" />
                  Clientes
                </Link>
              </Button>
              
              <Button variant="outline" asChild>
                <Link href="/calculos">
                  <Search className="h-4 w-4 mr-2" />
                  Cálculos
                </Link>
              </Button>
            </div>
            
            <Button variant="ghost" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar à página anterior
            </Button>
          </div>
          
          {/* Código de erro */}
          <div className="text-center text-sm text-gray-400 pt-4 border-t">
            <p>Erro 404 - Página não encontrada</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
