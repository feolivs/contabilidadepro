'use client'

import { useParams, useRouter } from 'next/navigation'
import { CleanLayout } from '@/components/layout/clean-layout'
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
  ArrowLeft,
  Edit,
  Plus,
  BarChart3
} from 'lucide-react'
import { useEmpresa } from '@/hooks/use-empresas'

// Página completa - acesso direto via URL
export default function EmpresaFullPage() {
  const params = useParams()
  const router = useRouter()
  const empresaId = params.id as string

  const { data: empresa, isLoading: loading, error } = useEmpresa(empresaId)

  if (loading) {
    return (
      <CleanLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="space-y-1">
                        <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </CleanLayout>
    )
  }

  if (error || !empresa) {
    return (
      <CleanLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Empresa não encontrada
              </h2>
              <p className="text-muted-foreground">
                Não foi possível carregar os dados da empresa.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <Button onClick={() => window.location.reload()} variant="outline">
                Tentar novamente
              </Button>
              <Button onClick={() => router.push('/empresas')} variant="ghost">
                Voltar às empresas
              </Button>
            </div>
          </div>
        </div>
      </CleanLayout>
    )
  }

  return (
    <CleanLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/empresas')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Building2 className="h-8 w-8 mr-3" />
                {empresa.nome}
              </h1>
              <p className="text-muted-foreground">
                Página completa - Acesso direto via URL
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cálculo
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações Detalhadas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Informações da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">CNPJ</p>
                      <p className="text-muted-foreground">{empresa.cnpj}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Regime Tributário</p>
                      <Badge variant="outline" className="mt-1">{empresa.regime_tributario}</Badge>
                    </div>
                  </div>

                  {empresa.endereco && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Endereço</p>
                        <p className="text-muted-foreground">{empresa.endereco}</p>
                      </div>
                    </div>
                  )}

                  {empresa.telefone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Telefone</p>
                        <p className="text-muted-foreground">{empresa.telefone}</p>
                      </div>
                    </div>
                  )}

                  {empresa.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">E-mail</p>
                        <p className="text-muted-foreground">{empresa.email}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Cadastrado em</p>
                      <p className="text-muted-foreground">
                        {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Cálculos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Histórico de Cálculos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mock data para histórico */}
                  {[
                    { tipo: 'DAS', valor: 'R$ 1.250,00', data: '2024-01-15', status: 'Pago' },
                    { tipo: 'IRPJ', valor: 'R$ 3.420,00', data: '2024-01-10', status: 'Pendente' },
                    { tipo: 'DAS', valor: 'R$ 1.180,00', data: '2023-12-15', status: 'Pago' }
                  ].map((calculo, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{calculo.tipo}</p>
                          <p className="text-sm text-muted-foreground">{calculo.data}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{calculo.valor}</p>
                        <Badge 
                          variant={calculo.status === 'Pago' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {calculo.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Separator className="my-4" />
                <Button variant="outline" className="w-full">
                  Ver todos os cálculos
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar com Métricas */}
          <div className="space-y-6">
            {/* Métricas Rápidas */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Cálculos</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor Total Processado</p>
                    <p className="text-2xl font-bold">R$ 15.420</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status da Empresa</p>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 mt-1">
                      Ativo
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Calcular DAS
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Calcular IRPJ
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Prazos Fiscais
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CleanLayout>
  )
}
