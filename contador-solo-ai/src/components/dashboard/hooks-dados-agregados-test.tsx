'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEmpresaInsights } from '@/hooks/use-empresa-insights'
import { useDadosFinanceirosExtraidos } from '@/hooks/use-dados-financeiros-extraidos'
import { useDocumentosStats } from '@/hooks/use-documentos-stats'
import { useEmpresas } from '@/hooks/use-empresas'
import { 
  TestTube, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChart,
  Target,
  Zap
} from 'lucide-react'

/**
 * Componente de teste para os hooks de dados agregados
 */
export function HooksDadosAgregadosTest() {
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('')
  const [testResults, setTestResults] = useState<Array<{
    hook: string
    success: boolean
    message: string
    timestamp: string
    data?: any
  }>>([])

  const { data: empresas = [] } = useEmpresas()

  // Hooks de dados agregados
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights
  } = useEmpresaInsights(selectedEmpresaId, {
    enabled: !!selectedEmpresaId
  })

  const {
    data: dadosFinanceiros,
    isLoading: financeirosLoading,
    error: financeirosError,
    refetch: refetchFinanceiros
  } = useDadosFinanceirosExtraidos(selectedEmpresaId, {
    periodo_meses: 6,
    apenas_processados: true
  }, {
    enabled: !!selectedEmpresaId
  })

  const {
    data: documentosStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useDocumentosStats(selectedEmpresaId, {
    periodo_dias: 30,
    incluir_detalhes_erro: true
  }, {
    enabled: !!selectedEmpresaId
  })

  // Testar hook específico
  const testHook = async (hookName: string, refetchFn: () => void, data: any, error: any) => {
    try {
      await refetchFn()
      
      setTestResults(prev => [...prev, {
        hook: hookName,
        success: !error && !!data,
        message: error 
          ? `Erro: ${error.message}` 
          : data 
            ? `Dados carregados com sucesso`
            : 'Nenhum dado retornado',
        timestamp: new Date().toISOString(),
        data: data ? Object.keys(data).length : 0
      }])
    } catch (err) {
      setTestResults(prev => [...prev, {
        hook: hookName,
        success: false,
        message: `Erro na execução: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
        timestamp: new Date().toISOString()
      }])
    }
  }

  // Testar todos os hooks
  const testAllHooks = async () => {
    if (!selectedEmpresaId) {
      setTestResults(prev => [...prev, {
        hook: 'All Hooks',
        success: false,
        message: 'Selecione uma empresa primeiro',
        timestamp: new Date().toISOString()
      }])
      return
    }

    await Promise.all([
      testHook('useEmpresaInsights', refetchInsights, insights, insightsError),
      testHook('useDadosFinanceirosExtraidos', refetchFinanceiros, dadosFinanceiros, financeirosError),
      testHook('useDocumentosStats', refetchStats, documentosStats, statsError)
    ])
  }

  // Limpar resultados
  const clearResults = () => {
    setTestResults([])
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const formatValue = (value: any): string => {
    if (typeof value === 'number') {
      if (value > 1000000) return `${(value / 1000000).toFixed(1)}M`
      if (value > 1000) return `${(value / 1000).toFixed(1)}K`
      return value.toFixed(2)
    }
    return String(value)
  }

  return (
    <div className="w-full max-w-7xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste dos Hooks de Dados Agregados
            <Badge variant="outline" className="ml-2">
              Task 2.1 - Criar Hooks para Dados Agregados
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Seleção de Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Empresa para Teste</label>
              <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome} {empresa.cnpj && `(${empresa.cnpj})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={testAllHooks}
                disabled={!selectedEmpresaId}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Testar Todos os Hooks
              </Button>

              <Button
                onClick={clearResults}
                variant="outline"
              >
                Limpar Resultados
              </Button>
            </div>
          </div>

          {/* Status dos Hooks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium">useEmpresaInsights</div>
                    <div className="text-sm text-muted-foreground">
                      {insightsLoading ? 'Carregando...' : 
                       insightsError ? 'Erro' : 
                       insights ? 'Carregado' : 'Aguardando'}
                    </div>
                  </div>
                  {insightsLoading && <Activity className="h-4 w-4 animate-pulse text-orange-500" />}
                  {insightsError && <XCircle className="h-4 w-4 text-red-500" />}
                  {insights && !insightsLoading && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="font-medium">useDadosFinanceiros</div>
                    <div className="text-sm text-muted-foreground">
                      {financeirosLoading ? 'Carregando...' : 
                       financeirosError ? 'Erro' : 
                       dadosFinanceiros ? 'Carregado' : 'Aguardando'}
                    </div>
                  </div>
                  {financeirosLoading && <Activity className="h-4 w-4 animate-pulse text-orange-500" />}
                  {financeirosError && <XCircle className="h-4 w-4 text-red-500" />}
                  {dadosFinanceiros && !financeirosLoading && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="font-medium">useDocumentosStats</div>
                    <div className="text-sm text-muted-foreground">
                      {statsLoading ? 'Carregando...' : 
                       statsError ? 'Erro' : 
                       documentosStats ? 'Carregado' : 'Aguardando'}
                    </div>
                  </div>
                  {statsLoading && <Activity className="h-4 w-4 animate-pulse text-orange-500" />}
                  {statsError && <XCircle className="h-4 w-4 text-red-500" />}
                  {documentosStats && !statsLoading && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dados Carregados */}
          {selectedEmpresaId && (insights || dadosFinanceiros || documentosStats) && (
            <Tabs defaultValue="insights" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="insights">Insights da Empresa</TabsTrigger>
                <TabsTrigger value="financeiros">Dados Financeiros</TabsTrigger>
                <TabsTrigger value="stats">Estatísticas</TabsTrigger>
              </TabsList>

              <TabsContent value="insights" className="space-y-4">
                {insights ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="text-2xl font-bold">{insights.documentos.total}</div>
                            <div className="text-sm text-muted-foreground">Documentos</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="text-2xl font-bold">
                              R$ {formatValue(insights.financeiro.faturamento_total)}
                            </div>
                            <div className="text-sm text-muted-foreground">Faturamento</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-600" />
                          <div>
                            <div className="text-2xl font-bold">{insights.compliance.score.toFixed(0)}</div>
                            <div className="text-sm text-muted-foreground">Score Compliance</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-orange-600" />
                          <div>
                            <div className="text-2xl font-bold">
                              {insights.documentos.taxa_sucesso.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Taxa Sucesso</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum insight disponível. Selecione uma empresa e teste o hook.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="financeiros" className="space-y-4">
                {dadosFinanceiros ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="text-2xl font-bold">
                              R$ {formatValue(dadosFinanceiros.receitas.total)}
                            </div>
                            <div className="text-sm text-muted-foreground">Receitas</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                          <div>
                            <div className="text-2xl font-bold">
                              R$ {formatValue(dadosFinanceiros.despesas.total)}
                            </div>
                            <div className="text-sm text-muted-foreground">Despesas</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="text-2xl font-bold">
                              R$ {formatValue(dadosFinanceiros.fluxo_caixa.saldo_acumulado)}
                            </div>
                            <div className="text-sm text-muted-foreground">Saldo</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <PieChart className="h-4 w-4 text-purple-600" />
                          <div>
                            <div className="text-2xl font-bold">
                              {dadosFinanceiros.fluxo_caixa.margem_media.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Margem</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum dado financeiro disponível. Selecione uma empresa e teste o hook.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                {documentosStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="text-2xl font-bold">{documentosStats.overview.total_documentos}</div>
                            <div className="text-sm text-muted-foreground">Total</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <div>
                            <div className="text-2xl font-bold">{documentosStats.status.processados}</div>
                            <div className="text-sm text-muted-foreground">Processados</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <div>
                            <div className="text-2xl font-bold">{documentosStats.status.pendentes}</div>
                            <div className="text-sm text-muted-foreground">Pendentes</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-purple-600" />
                          <div>
                            <div className="text-2xl font-bold">
                              {documentosStats.status.taxa_sucesso.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Taxa Sucesso</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhuma estatística disponível. Selecione uma empresa e teste o hook.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Resultados dos Testes */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultados dos Testes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.success)}
                        <Badge variant="outline">{result.hook}</Badge>
                        <span className="text-sm">{result.message}</span>
                        {result.data && (
                          <Badge variant="secondary" className="ml-2">
                            {result.data} propriedades
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instruções */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Como testar:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• <strong>Selecionar Empresa:</strong> Escolha uma empresa com documentos processados</li>
              <li>• <strong>Testar Hooks:</strong> Clique em "Testar Todos os Hooks" para validar funcionamento</li>
              <li>• <strong>Visualizar Dados:</strong> Use as abas para ver os dados retornados por cada hook</li>
              <li>• <strong>Monitorar Status:</strong> Observe os indicadores de loading/erro/sucesso</li>
              <li>• <strong>Verificar Resultados:</strong> Analise os resultados dos testes na seção inferior</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
