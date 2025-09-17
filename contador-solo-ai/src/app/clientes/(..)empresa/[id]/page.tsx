'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  ExternalLink,
  X
} from 'lucide-react'
import { useEmpresa } from '@/hooks/use-empresas'

// Modal interceptado - renderizado sobre a página de clientes
export default function EmpresaModalIntercepted() {
  const router = useRouter()
  const params = useParams()
  const empresaId = params.id as string

  const [isOpen, setIsOpen] = useState(true)
  const { data: empresa, isLoading: loading, error } = useEmpresa(empresaId)

  const handleClose = () => {
    setIsOpen(false)
    // Navegar de volta para a lista de clientes
    router.back()
  }

  const handleViewFullPage = () => {
    // Navegar para a página completa
    router.push(`/empresa/${empresaId}`)
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Skeleton para informações básicas */}
            <Card>
              <CardHeader>
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Skeleton para métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error || !empresa) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <Building2 className="h-5 w-5 mr-2" />
              Erro ao carregar empresa
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar os dados da empresa.
            </p>
            
            <div className="flex items-center space-x-2">
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Tentar novamente
              </Button>
              <Button onClick={handleClose} variant="ghost" size="sm">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              {empresa.nome}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleViewFullPage}
                className="flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver página completa
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">CNPJ</p>
                    <p className="text-sm text-muted-foreground">{empresa.cnpj}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Regime Tributário</p>
                    <Badge variant="outline">{empresa.regime_tributario}</Badge>
                  </div>
                </div>

                {empresa.endereco && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Endereço</p>
                      <p className="text-sm text-muted-foreground">{empresa.endereco}</p>
                    </div>
                  </div>
                )}

                {empresa.telefone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Telefone</p>
                      <p className="text-sm text-muted-foreground">{empresa.telefone}</p>
                    </div>
                  </div>
                )}

                {empresa.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">E-mail</p>
                      <p className="text-sm text-muted-foreground">{empresa.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cadastrado em</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Cálculos</p>
                    <p className="text-lg font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Valor Total</p>
                    <p className="text-lg font-bold">R$ 15.420</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Ativo
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Ações Rápidas */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Modal interceptado - URL: /clientes/empresa/{empresaId}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Editar Empresa
              </Button>
              <Button size="sm">
                Novo Cálculo
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
