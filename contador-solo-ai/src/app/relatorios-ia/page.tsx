'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Brain,
  AlertTriangle
} from 'lucide-react'
import { PerformanceDashboard } from '@/components/dashboard/performance-dashboard'

export default function RelatoriosIAPage() {
  const [activeTab, setActiveTab] = useState('performance')

  const handleExportReport = (type: string) => {
    // TODO: Implementar exportação de relatórios
    console.log('Exportar relatório:', type)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de IA</h1>
          <p className="text-gray-600 mt-2">
            Análises detalhadas e insights do sistema de inteligência artificial
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={() => handleExportReport('performance')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => handleExportReport('excel')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">4</div>
            <div className="text-sm text-gray-500">Tipos de Relatórios</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">95%</div>
            <div className="text-sm text-gray-500">Precisão Média</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">1.2K</div>
            <div className="text-sm text-gray-500">Documentos Analisados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">30</div>
            <div className="text-sm text-gray-500">Dias de Dados</div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Uso da IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-8">
          <PerformanceDashboard />
        </TabsContent>

        <TabsContent value="documents" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { type: 'NFE', count: 45, percentage: 35 },
                    { type: 'RECIBO', count: 32, percentage: 25 },
                    { type: 'CONTRATO', count: 28, percentage: 22 },
                    { type: 'COMPROVANTE', count: 23, percentage: 18 }
                  ].map((item) => (
                    <div key={item.type} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.type}</span>
                        <span className="text-sm text-gray-500">{item.count} documentos</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Sucesso por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { month: 'Janeiro', success: 94, total: 120 },
                    { month: 'Dezembro', success: 96, total: 108 },
                    { month: 'Novembro', success: 92, total: 95 },
                    { month: 'Outubro', success: 98, total: 87 }
                  ].map((item) => (
                    <div key={item.month} className="flex items-center justify-between">
                      <span className="font-medium">{item.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {item.success}/{item.total}
                        </span>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${(item.success / item.total) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round((item.success / item.total) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Valor Total Processado por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">R$ 125K</div>
                    <div className="text-sm text-gray-600">NFE</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">R$ 89K</div>
                    <div className="text-sm text-gray-600">RECIBO</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">R$ 67K</div>
                    <div className="text-sm text-gray-600">CONTRATO</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">R$ 43K</div>
                    <div className="text-sm text-gray-600">COMPROVANTE</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Alertas por Prioridade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { priority: 'CRÍTICO', count: 3, color: 'bg-red-500' },
                    { priority: 'ALTO', count: 8, color: 'bg-orange-500' },
                    { priority: 'MÉDIO', count: 15, color: 'bg-blue-500' },
                    { priority: 'BAIXO', count: 7, color: 'bg-gray-500' }
                  ].map((item) => (
                    <div key={item.priority} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                        <span className="font-medium">{item.priority}</span>
                      </div>
                      <span className="text-lg font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Resolução</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">87%</div>
                  <div className="text-gray-600 mb-4">dos alertas foram resolvidos</div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Resolvidos</span>
                      <span>29/33</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Alertas por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { type: 'DAS Vencimento', count: 12, status: 'active' },
                    { type: 'IRPJ Vencimento', count: 8, status: 'resolved' },
                    { type: 'Documento Vencido', count: 6, status: 'active' },
                    { type: 'DEFIS Prazo', count: 4, status: 'acknowledged' },
                    { type: 'Certificado Vencendo', count: 2, status: 'active' },
                    { type: 'Outros', count: 1, status: 'resolved' }
                  ].map((item) => (
                    <div key={item.type} className="p-4 border rounded-lg">
                      <div className="text-lg font-bold">{item.count}</div>
                      <div className="text-sm font-medium">{item.type}</div>
                      <div className={`text-xs mt-1 ${
                        item.status === 'active' ? 'text-red-600' :
                        item.status === 'resolved' ? 'text-green-600' :
                        'text-blue-600'
                      }`}>
                        {item.status === 'active' ? 'Ativo' :
                         item.status === 'resolved' ? 'Resolvido' :
                         'Reconhecido'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Uso da IA por Funcionalidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { feature: 'OCR Documentos', usage: 85, requests: 1240 },
                    { feature: 'Assistente Contábil', usage: 72, requests: 890 },
                    { feature: 'Análise Fiscal', usage: 45, requests: 320 },
                    { feature: 'Geração Relatórios', usage: 28, requests: 180 }
                  ].map((item) => (
                    <div key={item.feature} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.feature}</span>
                        <span className="text-sm text-gray-500">{item.requests} requests</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${item.usage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Economia de Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">156h</div>
                  <div className="text-gray-600 mb-4">economizadas este mês</div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Processamento de documentos</span>
                      <span className="font-medium">89h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Consultas contábeis</span>
                      <span className="font-medium">42h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Análises fiscais</span>
                      <span className="font-medium">25h</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Satisfação do Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-green-600 mb-2">4.8/5</div>
                    <div className="text-gray-600">Avaliação Média</div>
                    <div className="text-sm text-gray-500 mt-1">baseado em 127 avaliações</div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">94%</div>
                    <div className="text-gray-600">Taxa de Satisfação</div>
                    <div className="text-sm text-gray-500 mt-1">usuários satisfeitos</div>
                  </div>
                  
                  <div>
                    <div className="text-3xl font-bold text-purple-600 mb-2">89%</div>
                    <div className="text-gray-600">Recomendação</div>
                    <div className="text-sm text-gray-500 mt-1">recomendariam o sistema</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
