'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calculator, 
  Building2, 
  FileText, 
  TrendingUp,
  ArrowLeft,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { CalculoDASForm } from '@/components/calculos/calculo-das-form'
import { CalculoIRPJForm } from '@/components/calculos/calculo-irpj-form'

// Página completa para novo cálculo
export default function NovoCalculoFullPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('das')

  const calculoTypes = [
    {
      id: 'das',
      name: 'DAS - Simples Nacional',
      description: 'Documento de Arrecadação do Simples Nacional para empresas optantes pelo regime tributário simplificado',
      icon: FileText,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      popular: true,
      status: 'available',
      features: ['Cálculo automático', 'Geração de boleto', 'Histórico completo']
    },
    {
      id: 'irpj',
      name: 'IRPJ - Lucro Presumido',
      description: 'Imposto de Renda Pessoa Jurídica para empresas tributadas pelo Lucro Presumido',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      popular: false,
      status: 'available',
      features: ['Cálculo trimestral', 'Múltiplas atividades', 'Relatórios detalhados']
    },
    {
      id: 'icms',
      name: 'ICMS',
      description: 'Imposto sobre Circulação de Mercadorias e Serviços',
      icon: Building2,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      popular: false,
      status: 'coming-soon',
      features: ['Em desenvolvimento', 'Disponível em breve', 'Notificação de lançamento']
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'coming-soon':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">
            Disponível
          </Badge>
        )
      case 'coming-soon':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs">
            Em breve
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/calculos')}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Calculator className="h-8 w-8 mr-3" />
                Novo Cálculo Fiscal
              </h1>
              <p className="text-muted-foreground">
                Página completa - Acesso direto via URL
              </p>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
            <Zap className="h-3 w-3 mr-1" />
            Página Completa
          </Badge>
        </div>

        {/* Tipos de Cálculo Disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Tipos de Cálculo Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {calculoTypes.map((tipo) => {
                const Icon = tipo.icon
                return (
                  <div
                    key={tipo.id}
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all hover:shadow-lg ${
                      activeTab === tipo.id 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-border hover:border-primary/50'
                    } ${tipo.status !== 'available' ? 'opacity-75' : ''}`}
                    onClick={() => tipo.status === 'available' && setActiveTab(tipo.id)}
                  >
                    <div className="space-y-4">
                      {/* Header do card */}
                      <div className="flex items-start justify-between">
                        <Icon className="h-8 w-8 text-muted-foreground" />
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(tipo.status)}
                          {getStatusBadge(tipo.status)}
                          {tipo.popular && (
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
                              Popular
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo do card */}
                      <div>
                        <h3 className="font-semibold text-lg mb-2">{tipo.name}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {tipo.description}
                        </p>

                        {/* Features */}
                        <div className="space-y-2">
                          {tipo.features.map((feature, index) => (
                            <div key={index} className="flex items-center text-xs text-muted-foreground">
                              <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Botão de ação */}
                      <div className="pt-2">
                        {tipo.status === 'available' ? (
                          <Button 
                            size="sm" 
                            className="w-full"
                            variant={activeTab === tipo.id ? 'default' : 'outline'}
                            onClick={() => setActiveTab(tipo.id)}
                          >
                            {activeTab === tipo.id ? 'Selecionado' : 'Selecionar'}
                          </Button>
                        ) : (
                          <Button size="sm" className="w-full" disabled>
                            Em desenvolvimento
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Formulários de Cálculo */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="das" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              DAS
            </TabsTrigger>
            <TabsTrigger value="irpj" className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              IRPJ
            </TabsTrigger>
            <TabsTrigger value="icms" className="flex items-center" disabled>
              <Building2 className="h-4 w-4 mr-2" />
              ICMS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="das" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-6 w-6 mr-3" />
                  Cálculo DAS - Simples Nacional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalculoDASForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="irpj" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-6 w-6 mr-3" />
                  Cálculo IRPJ - Lucro Presumido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CalculoIRPJForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="icms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-6 w-6 mr-3" />
                  Cálculo ICMS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-16">
                  <div className="text-center space-y-4">
                    <Building2 className="h-16 w-16 text-gray-400 mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Cálculo ICMS em Desenvolvimento</h3>
                      <p className="text-muted-foreground max-w-md">
                        Estamos trabalhando para disponibilizar o cálculo de ICMS em breve. 
                        Você será notificado quando esta funcionalidade estiver disponível.
                      </p>
                    </div>
                    <Button variant="outline">
                      Notificar quando disponível
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer informativo */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Página completa de novo cálculo - Intercepting Routes implementado
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  Next.js 15
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Full Page
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
