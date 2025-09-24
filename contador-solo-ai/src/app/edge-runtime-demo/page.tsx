'use client'

import { useState } from 'react'
import { CleanLayout } from '@/components/layout/clean-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Zap, 
  Globe, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calculator,
  Building2,
  FileText,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'

export default function EdgeRuntimeDemo() {
  const [cnpjInput, setCnpjInput] = useState('')
  const [cnpjResult, setCnpjResult] = useState<any>(null)
  const [cnpjLoading, setCnpjLoading] = useState(false)

  const [dasInput, setDasInput] = useState({
    receita: '',
    anexo: '',
    competencia: '2024-01',
    fatorR: ''
  })
  const [dasResult, setDasResult] = useState<any>(null)
  const [dasLoading, setDasLoading] = useState(false)

  const [irpjAtividade, setIrpjAtividade] = useState('')
  const [irpjResult, setIrpjResult] = useState<any>(null)
  const [irpjLoading, setIrpjLoading] = useState(false)

  const [performanceMetrics, setPerformanceMetrics] = useState<{
    [key: string]: { duration: number; timestamp: number }
  }>({})

  const measurePerformance = async (operation: string, fn: () => Promise<any>) => {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      setPerformanceMetrics(prev => ({
        ...prev,
        [operation]: { duration, timestamp: Date.now() }
      }))
      return result
    } catch (error) {
      const duration = performance.now() - start
      setPerformanceMetrics(prev => ({
        ...prev,
        [operation]: { duration, timestamp: Date.now() }
      }))
      throw error
    }
  }

  const validateCNPJ = async () => {
    if (!cnpjInput.trim()) {
      toast.error('Digite um CNPJ para validar')
      return
    }

    setCnpjLoading(true)
    try {
      const result = await measurePerformance('cnpj-validation', async () => {
        const response = await fetch('/api/edge/cnpj-validation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnpj: cnpjInput })
        })
        return response.json()
      })

      setCnpjResult(result)
      if (result.valid) {
        toast.success('CNPJ válido!')
      } else {
        toast.error(result.error || 'CNPJ inválido')
      }
    } catch (error) {
      toast.error('Erro ao validar CNPJ')
      setCnpjResult({ valid: false, error: 'Erro de conexão' })
    } finally {
      setCnpjLoading(false)
    }
  }

  const calculateDAS = async () => {
    if (!dasInput.receita || !dasInput.anexo || !dasInput.competencia) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setDasLoading(true)
    try {
      const result = await measurePerformance('das-calculation', async () => {
        const payload = {
          receita: parseFloat(dasInput.receita),
          anexo: dasInput.anexo,
          competencia: dasInput.competencia,
          ...(dasInput.fatorR && { fatorR: parseFloat(dasInput.fatorR) })
        }

        const response = await fetch('/api/edge/das-calculation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        return response.json()
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        setDasResult(result)
        toast.success('Cálculo DAS realizado com sucesso!')
      }
    } catch (error) {
      toast.error('Erro ao calcular DAS')
    } finally {
      setDasLoading(false)
    }
  }

  const getIRPJRates = async () => {
    setIrpjLoading(true)
    try {
      const result = await measurePerformance('irpj-rates', async () => {
        const url = irpjAtividade 
          ? `/api/edge/irpj-rates?atividade=${encodeURIComponent(irpjAtividade)}`
          : '/api/edge/irpj-rates'
        
        const response = await fetch(url)
        return response.json()
      })

      setIrpjResult(result)
      toast.success('Alíquotas IRPJ carregadas!')
    } catch (error) {
      toast.error('Erro ao carregar alíquotas IRPJ')
    } finally {
      setIrpjLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  return (
    <CleanLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Zap className="h-8 w-8 mr-3 text-yellow-500" />
              Edge Runtime Demo
            </h1>
            <p className="text-muted-foreground">
              Demonstração de cálculos fiscais executados no Edge Runtime do Next.js 15
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
              <Globe className="h-3 w-3 mr-1" />
              Global Edge
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              <Clock className="h-3 w-3 mr-1" />
              Ultra Rápido
            </Badge>
          </div>
        </div>

        {/* Performance Metrics */}
        {Object.keys(performanceMetrics).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Métricas de Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(performanceMetrics).map(([operation, metrics]) => (
                  <div key={operation} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{operation.replace('-', ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(metrics.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {metrics.duration.toFixed(0)}ms
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edge Functions Demo */}
        <Tabs defaultValue="cnpj" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cnpj" className="flex items-center">
              <Building2 className="h-4 w-4 mr-2" />
              Validação CNPJ
            </TabsTrigger>
            <TabsTrigger value="das" className="flex items-center">
              <Calculator className="h-4 w-4 mr-2" />
              Cálculo DAS
            </TabsTrigger>
            <TabsTrigger value="irpj" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Alíquotas IRPJ
            </TabsTrigger>
          </TabsList>

          {/* CNPJ Validation */}
          <TabsContent value="cnpj">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Validação de CNPJ no Edge Runtime
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0000-00"
                        value={cnpjInput}
                        onChange={(e) => setCnpjInput(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={validateCNPJ} 
                      disabled={cnpjLoading}
                      className="w-full"
                    >
                      {cnpjLoading ? 'Validando...' : 'Validar CNPJ'}
                    </Button>
                  </div>

                  {cnpjResult && (
                    <div className="space-y-3">
                      <Alert>
                        <div className="flex items-center">
                          {cnpjResult.valid ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                          )}
                          <AlertDescription>
                            {cnpjResult.valid ? 'CNPJ Válido' : cnpjResult.error}
                          </AlertDescription>
                        </div>
                      </Alert>
                      
                      {cnpjResult.valid && cnpjResult.formatted && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="font-medium">CNPJ Formatado:</p>
                          <p className="text-lg font-mono">{cnpjResult.formatted}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DAS Calculation */}
          <TabsContent value="das">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Cálculo DAS no Edge Runtime
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="receita">Receita Bruta (R$)</Label>
                      <Input
                        id="receita"
                        type="number"
                        placeholder="10000.00"
                        value={dasInput.receita}
                        onChange={(e) => setDasInput(prev => ({ ...prev, receita: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="anexo">Anexo do Simples Nacional</Label>
                      <Select value={dasInput.anexo} onValueChange={(value) => setDasInput(prev => ({ ...prev, anexo: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o anexo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="I">Anexo I - Comércio</SelectItem>
                          <SelectItem value="II">Anexo II - Indústria</SelectItem>
                          <SelectItem value="III">Anexo III - Serviços</SelectItem>
                          <SelectItem value="IV">Anexo IV - Serviços</SelectItem>
                          <SelectItem value="V">Anexo V - Serviços</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="competencia">Competência</Label>
                      <Input
                        id="competencia"
                        type="month"
                        value={dasInput.competencia}
                        onChange={(e) => setDasInput(prev => ({ ...prev, competencia: e.target.value }))}
                      />
                    </div>

                    {['III', 'IV', 'V'].includes(dasInput.anexo) && (
                      <div>
                        <Label htmlFor="fatorR">Fator R (opcional)</Label>
                        <Input
                          id="fatorR"
                          type="number"
                          step="0.01"
                          placeholder="0.28"
                          value={dasInput.fatorR}
                          onChange={(e) => setDasInput(prev => ({ ...prev, fatorR: e.target.value }))}
                        />
                      </div>
                    )}

                    <Button 
                      onClick={calculateDAS} 
                      disabled={dasLoading}
                      className="w-full"
                    >
                      {dasLoading ? 'Calculando...' : 'Calcular DAS'}
                    </Button>
                  </div>

                  {dasResult && (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h3 className="font-semibold mb-3">Resultado do Cálculo</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Valor DAS:</span>
                            <span className="font-bold text-lg">{formatCurrency(dasResult.valorDAS)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Alíquota Efetiva:</span>
                            <span>{formatPercentage(dasResult.aliquotaEfetiva)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Data Vencimento:</span>
                            <span>{new Date(dasResult.dataVencimento).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      {dasResult.detalhes && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <h4 className="font-medium mb-2">Detalhes</h4>
                          <div className="text-sm space-y-1">
                            <div>Receita Bruta: {formatCurrency(dasResult.detalhes.receitaBruta)}</div>
                            <div>Alíquota Nominal: {formatPercentage(dasResult.detalhes.aliquotaNominal)}</div>
                            {dasResult.detalhes.fatorR && (
                              <div>Fator R: {dasResult.detalhes.fatorR.toFixed(4)}</div>
                            )}
                            {dasResult.detalhes.reducaoFatorR && (
                              <div>Redução Fator R: {formatPercentage(dasResult.detalhes.reducaoFatorR)}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IRPJ Rates */}
          <TabsContent value="irpj">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Consulta de Alíquotas IRPJ no Edge Runtime
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="atividade">Atividade (opcional)</Label>
                    <Input
                      id="atividade"
                      placeholder="Ex: comercio, servicos, consultoria"
                      value={irpjAtividade}
                      onChange={(e) => setIrpjAtividade(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={getIRPJRates} 
                    disabled={irpjLoading}
                  >
                    {irpjLoading ? 'Carregando...' : 'Consultar'}
                  </Button>
                </div>

                {irpjResult && irpjResult.data && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Alíquotas IRPJ - {irpjResult.metadata?.ano}</h3>
                      <Badge>{irpjResult.metadata?.total} atividades</Badge>
                    </div>
                    
                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {irpjResult.data.map((item: any, index: number) => (
                        <div key={index} className="p-3 border border-border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{item.atividade}</h4>
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                              {formatPercentage(item.percentualPresuncao)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{item.descricao}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>IRPJ Normal: {formatPercentage(item.aliquotaIRPJ)}</div>
                            <div>IRPJ Adicional: {formatPercentage(item.aliquotaAdicional)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Edge Runtime - Cálculos executados globalmente com latência ultra-baixa
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  Next.js 15
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Edge Runtime
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Global CDN
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CleanLayout>
  )
}
