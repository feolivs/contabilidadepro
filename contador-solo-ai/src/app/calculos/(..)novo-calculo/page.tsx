'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calculator, 
  Building2, 
  FileText, 
  TrendingUp,
  ExternalLink,
  X,
  Zap
} from 'lucide-react'
import { CalculoDASForm } from '@/components/calculos/calculo-das-form'
import { CalculoIRPJForm } from '@/components/calculos/calculo-irpj-form'

// Modal interceptado para novo cálculo
export default function NovoCalculoModalIntercepted() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('das')

  const handleClose = () => {
    setIsOpen(false)
    router.back()
  }

  const handleViewFullPage = () => {
    router.push('/novo-calculo')
  }

  const calculoTypes = [
    {
      id: 'das',
      name: 'DAS - Simples Nacional',
      description: 'Documento de Arrecadação do Simples Nacional',
      icon: FileText,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      popular: true
    },
    {
      id: 'irpj',
      name: 'IRPJ - Lucro Presumido',
      description: 'Imposto de Renda Pessoa Jurídica',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      popular: false
    },
    {
      id: 'icms',
      name: 'ICMS',
      description: 'Imposto sobre Circulação de Mercadorias',
      icon: Building2,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      popular: false
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Novo Cálculo Fiscal
              <Badge className="ml-2 bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                <Zap className="h-3 w-3 mr-1" />
                Modal
              </Badge>
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleViewFullPage}
                className="flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Página completa
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Tipo de Cálculo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Selecione o Tipo de Cálculo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {calculoTypes.map((tipo) => {
                  const Icon = tipo.icon
                  return (
                    <div
                      key={tipo.id}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        activeTab === tipo.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setActiveTab(tipo.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-sm">{tipo.name}</h3>
                            {tipo.popular && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {tipo.description}
                          </p>
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
              <TabsTrigger value="icms" className="flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                ICMS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="das" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Cálculo DAS - Simples Nacional
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CalculoDASForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="irpj" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Cálculo IRPJ - Lucro Presumido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CalculoIRPJForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="icms" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Cálculo ICMS
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <Building2 className="h-12 w-12 text-gray-400 mx-auto" />
                      <p className="text-muted-foreground">
                        Cálculo ICMS em desenvolvimento
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Esta funcionalidade estará disponível em breve.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer com informações do modal */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">
              Modal interceptado - URL: /calculos/novo-calculo
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                Intercepting Route
              </Badge>
              <Badge variant="outline" className="text-xs">
                Next.js 15
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
