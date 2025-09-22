'use client'

/**
 * 📊 DASHBOARD COMPARATIVO - ContabilidadePRO
 * Dashboard dedicado para análise comparativa entre empresas
 * Com seleção de empresas e métricas customizáveis
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, AreaChart, Area
} from 'recharts'
import { 
  Building2, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon,
  Target, Zap, Filter, RefreshCw, Download, Settings, Eye, EyeOff,
  CheckCircle, AlertTriangle, DollarSign, FileText, Calendar
} from 'lucide-react'
import { toast } from 'sonner'

// Interfaces
interface EmpresaMetrica {
  id: string
  nome: string
  cnpj: string
  regime_tributario: string
  metricas: {
    faturamento_anual: number
    faturamento_mes_atual: number
    crescimento_percentual: number
    total_documentos: number
    documentos_processados: number
    compliance_score: number
    margem_limite_simples: number
    projecao_anual: number
    eficiencia_processamento: number
    tempo_medio_processamento: number
  }
  dados_mensais: Array<{
    mes: string
    faturamento: number
    documentos: number
    compliance: number
    eficiencia: number
  }>
  benchmarks: {
    posicao_faturamento: number
    posicao_crescimento: number
    posicao_compliance: number
    percentil_setor: number
  }
}

interface MetricaConfig {
  id: string
  nome: string
  campo: string
  tipo: 'valor' | 'percentual' | 'score' | 'tempo'
  formato: 'moeda' | 'numero' | 'percentual' | 'tempo'
  cor: string
  visivel: boolean
  peso: number
}

interface DashboardComparativoProps {
  empresas: EmpresaMetrica[]
  loading?: boolean
  onEmpresaToggle?: (empresaId: string) => void
  onMetricaToggle?: (metricaId: string) => void
  onExportData?: (formato: 'pdf' | 'excel' | 'png') => void
}

const METRICAS_DISPONIVEIS: MetricaConfig[] = [
  {
    id: 'faturamento_anual',
    nome: 'Faturamento Anual',
    campo: 'metricas.faturamento_anual',
    tipo: 'valor',
    formato: 'moeda',
    cor: '#8884d8',
    visivel: true,
    peso: 10
  },
  {
    id: 'crescimento_percentual',
    nome: 'Crescimento %',
    campo: 'metricas.crescimento_percentual',
    tipo: 'percentual',
    formato: 'percentual',
    cor: '#82ca9d',
    visivel: true,
    peso: 8
  },
  {
    id: 'compliance_score',
    nome: 'Score Compliance',
    campo: 'metricas.compliance_score',
    tipo: 'score',
    formato: 'numero',
    cor: '#ffc658',
    visivel: true,
    peso: 7
  },
  {
    id: 'total_documentos',
    nome: 'Total Documentos',
    campo: 'metricas.total_documentos',
    tipo: 'valor',
    formato: 'numero',
    cor: '#ff7c7c',
    visivel: false,
    peso: 5
  },
  {
    id: 'eficiencia_processamento',
    nome: 'Eficiência Processamento',
    campo: 'metricas.eficiencia_processamento',
    tipo: 'percentual',
    formato: 'percentual',
    cor: '#8dd1e1',
    visivel: false,
    peso: 6
  },
  {
    id: 'projecao_anual',
    nome: 'Projeção Anual',
    campo: 'metricas.projecao_anual',
    tipo: 'valor',
    formato: 'moeda',
    cor: '#d084d0',
    visivel: false,
    peso: 4
  }
]

const CORES_GRAFICOS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
]

export function DashboardComparativo({ 
  empresas, 
  loading = false,
  onEmpresaToggle,
  onMetricaToggle,
  onExportData 
}: DashboardComparativoProps) {
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>(
    empresas.slice(0, 3).map(e => e.id) // Selecionar primeiras 3 por padrão
  )
  const [metricasVisiveis, setMetricasVisiveis] = useState<string[]>(
    METRICAS_DISPONIVEIS.filter(m => m.visivel).map(m => m.id)
  )
  const [tipoVisualizacao, setTipoVisualizacao] = useState<'barras' | 'linhas' | 'radar' | 'scatter'>('barras')
  const [periodo, setPeriodo] = useState<'3m' | '6m' | '12m'>('12m')
  const [showBenchmarks, setShowBenchmarks] = useState(true)

  // Dados filtrados
  const dadosFiltrados = useMemo(() => {
    return empresas.filter(empresa => empresasSelecionadas.includes(empresa.id))
  }, [empresas, empresasSelecionadas])

  // Métricas ativas
  const metricasAtivas = useMemo(() => {
    return METRICAS_DISPONIVEIS.filter(metrica => metricasVisiveis.includes(metrica.id))
  }, [metricasVisiveis])

  // Dados para gráficos
  const dadosGraficos = useMemo(() => {
    return dadosFiltrados.map(empresa => {
      const dados: any = {
        nome: empresa.nome,
        empresa_id: empresa.id
      }

      metricasAtivas.forEach(metrica => {
        const valor = getNestedValue(empresa, metrica.campo)
        dados[metrica.id] = valor
      })

      return dados
    })
  }, [dadosFiltrados, metricasAtivas])

  // Dados mensais agregados
  const dadosMensais = useMemo(() => {
    if (dadosFiltrados.length === 0) return []

    const mesesUnicos = Array.from(new Set(
      dadosFiltrados.flatMap(emp => emp.dados_mensais.map(d => d.mes))
    )).sort()

    return mesesUnicos.map(mes => {
      const dadosMes: any = { mes }
      
      dadosFiltrados.forEach((empresa, index) => {
        const dadoMes = empresa.dados_mensais.find(d => d.mes === mes)
        dadosMes[`${empresa.nome}_faturamento`] = dadoMes?.faturamento || 0
        dadosMes[`${empresa.nome}_compliance`] = dadoMes?.compliance || 0
        dadosMes[`${empresa.nome}_eficiencia`] = dadoMes?.eficiencia || 0
      })

      return dadosMes
    })
  }, [dadosFiltrados])

  // Estatísticas comparativas
  const estatisticas = useMemo(() => {
    if (dadosFiltrados.length === 0) return null

    const faturamentoTotal = dadosFiltrados.reduce((sum, emp) => sum + emp.metricas.faturamento_anual, 0)
    const crescimentoMedio = dadosFiltrados.reduce((sum, emp) => sum + emp.metricas.crescimento_percentual, 0) / dadosFiltrados.length
    const complianceMedio = dadosFiltrados.reduce((sum, emp) => sum + emp.metricas.compliance_score, 0) / dadosFiltrados.length

    const melhorFaturamento = dadosFiltrados.reduce((max, emp) => 
      emp.metricas.faturamento_anual > max.metricas.faturamento_anual ? emp : max
    )

    const melhorCrescimento = dadosFiltrados.reduce((max, emp) => 
      emp.metricas.crescimento_percentual > max.metricas.crescimento_percentual ? emp : max
    )

    const melhorCompliance = dadosFiltrados.reduce((max, emp) => 
      emp.metricas.compliance_score > max.metricas.compliance_score ? emp : max
    )

    return {
      faturamento_total: faturamentoTotal,
      crescimento_medio: crescimentoMedio,
      compliance_medio: complianceMedio,
      melhor_faturamento: melhorFaturamento,
      melhor_crescimento: melhorCrescimento,
      melhor_compliance: melhorCompliance
    }
  }, [dadosFiltrados])

  const handleEmpresaToggle = (empresaId: string) => {
    const novaSelecao = empresasSelecionadas.includes(empresaId)
      ? empresasSelecionadas.filter(id => id !== empresaId)
      : [...empresasSelecionadas, empresaId]
    
    setEmpresasSelecionadas(novaSelecao)
    onEmpresaToggle?.(empresaId)
  }

  const handleMetricaToggle = (metricaId: string) => {
    const novaSelecao = metricasVisiveis.includes(metricaId)
      ? metricasVisiveis.filter(id => id !== metricaId)
      : [...metricasVisiveis, metricaId]
    
    setMetricasVisiveis(novaSelecao)
    onMetricaToggle?.(metricaId)
  }

  const formatarValor = (valor: number, formato: string) => {
    switch (formato) {
      case 'moeda':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(valor)
      case 'percentual':
        return `${valor.toFixed(1)}%`
      case 'tempo':
        return `${valor.toFixed(1)}min`
      default:
        return valor.toLocaleString('pt-BR')
    }
  }

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0
  }

  const renderGrafico = () => {
    switch (tipoVisualizacao) {
      case 'barras':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosGraficos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value: any, name: string) => {
                const metrica = metricasAtivas.find(m => m.id === name)
                return metrica ? formatarValor(value, metrica.formato) : value
              }} />
              <Legend />
              {metricasAtivas.map((metrica, index) => (
                <Bar
                  key={metrica.id}
                  dataKey={metrica.id}
                  fill={metrica.cor}
                  name={metrica.nome}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'linhas':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={dadosMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatarValor(value, 'moeda')} />
              <Legend />
              {dadosFiltrados.map((empresa, index) => (
                <Line
                  key={empresa.id}
                  type="monotone"
                  dataKey={`${empresa.nome}_faturamento`}
                  stroke={CORES_GRAFICOS[index % CORES_GRAFICOS.length]}
                  strokeWidth={2}
                  name={empresa.nome}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'radar':
        const dadosRadar = dadosFiltrados.map(empresa => ({
          empresa: empresa.nome,
          faturamento: (empresa.metricas.faturamento_anual / 1000000) * 10, // Normalizar
          crescimento: Math.max(0, empresa.metricas.crescimento_percentual + 50), // Normalizar
          compliance: empresa.metricas.compliance_score,
          eficiencia: empresa.metricas.eficiencia_processamento,
          documentos: (empresa.metricas.total_documentos / 100) * 10 // Normalizar
        }))

        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={dadosRadar}>
              <PolarGrid />
              <PolarAngleAxis dataKey="empresa" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Métricas"
                dataKey="faturamento"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )

      case 'scatter':
        const dadosScatter = dadosFiltrados.map(empresa => ({
          x: empresa.metricas.faturamento_anual / 1000000, // Milhões
          y: empresa.metricas.crescimento_percentual,
          z: empresa.metricas.compliance_score,
          nome: empresa.nome
        }))

        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={dadosScatter}>
              <CartesianGrid />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Faturamento (M)" 
                unit="M"
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Crescimento" 
                unit="%"
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any, name: string) => {
                  if (name === 'x') return [`R$ ${value}M`, 'Faturamento']
                  if (name === 'y') return [`${value}%`, 'Crescimento']
                  return [value, name]
                }}
              />
              <Scatter 
                name="Empresas" 
                data={dadosScatter} 
                fill="#8884d8"
              />
            </ScatterChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Carregando dashboard comparativo...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Dashboard Comparativo
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExportData?.('png')}
                disabled={dadosFiltrados.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Período */}
            <div>
              <Label className="text-sm font-medium">Período</Label>
              <Select value={periodo} onValueChange={(value: any) => setPeriodo(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Visualização */}
            <div>
              <Label className="text-sm font-medium">Visualização</Label>
              <Select value={tipoVisualizacao} onValueChange={(value: any) => setTipoVisualizacao(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barras">Gráfico de Barras</SelectItem>
                  <SelectItem value="linhas">Gráfico de Linhas</SelectItem>
                  <SelectItem value="radar">Gráfico Radar</SelectItem>
                  <SelectItem value="scatter">Gráfico de Dispersão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Empresas Selecionadas */}
            <div>
              <Label className="text-sm font-medium">Empresas Selecionadas</Label>
              <div className="text-sm text-muted-foreground">
                {empresasSelecionadas.length} de {empresas.length} empresas
              </div>
            </div>

            {/* Métricas Visíveis */}
            <div>
              <Label className="text-sm font-medium">Métricas Visíveis</Label>
              <div className="text-sm text-muted-foreground">
                {metricasVisiveis.length} de {METRICAS_DISPONIVEIS.length} métricas
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Comparativas */}
      {estatisticas && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Faturamento Total
                  </p>
                  <p className="text-2xl font-bold">
                    {formatarValor(estatisticas.faturamento_total, 'moeda')}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Crescimento Médio
                  </p>
                  <p className={`text-2xl font-bold ${
                    estatisticas.crescimento_medio >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatarValor(estatisticas.crescimento_medio, 'percentual')}
                  </p>
                </div>
                {estatisticas.crescimento_medio >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Compliance Médio
                  </p>
                  <p className={`text-2xl font-bold ${
                    estatisticas.compliance_medio >= 80
                      ? 'text-green-600'
                      : estatisticas.compliance_medio >= 60
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {formatarValor(estatisticas.compliance_medio, 'numero')}
                  </p>
                </div>
                <CheckCircle className={`h-8 w-8 ${
                  estatisticas.compliance_medio >= 80
                    ? 'text-green-600'
                    : estatisticas.compliance_medio >= 60
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Empresas Comparadas
                  </p>
                  <p className="text-2xl font-bold">{dadosFiltrados.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Melhores Performances */}
      {estatisticas && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-yellow-600" />
              Melhores Performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg bg-green-50">
                <div className="text-sm text-muted-foreground mb-1">Maior Faturamento</div>
                <div className="font-semibold text-green-700">
                  {estatisticas.melhor_faturamento.nome}
                </div>
                <div className="text-sm text-green-600">
                  {formatarValor(estatisticas.melhor_faturamento.metricas.faturamento_anual, 'moeda')}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-blue-50">
                <div className="text-sm text-muted-foreground mb-1">Maior Crescimento</div>
                <div className="font-semibold text-blue-700">
                  {estatisticas.melhor_crescimento.nome}
                </div>
                <div className="text-sm text-blue-600">
                  {formatarValor(estatisticas.melhor_crescimento.metricas.crescimento_percentual, 'percentual')}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg bg-purple-50">
                <div className="text-sm text-muted-foreground mb-1">Melhor Compliance</div>
                <div className="font-semibold text-purple-700">
                  {estatisticas.melhor_compliance.nome}
                </div>
                <div className="text-sm text-purple-600">
                  {formatarValor(estatisticas.melhor_compliance.metricas.compliance_score, 'numero')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Seleção de Empresas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Empresas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {empresas.map((empresa) => (
                <div
                  key={empresa.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    empresasSelecionadas.includes(empresa.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleEmpresaToggle(empresa.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Checkbox
                      checked={empresasSelecionadas.includes(empresa.id)}
                      onChange={() => {}} // Controlado pelo onClick do container
                    />
                    <Badge variant="outline" className="text-xs">
                      {empresa.regime_tributario}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">{empresa.nome}</div>
                  <div className="text-xs text-muted-foreground">{empresa.cnpj}</div>
                  <div className="mt-2 text-xs">
                    <div className="flex justify-between">
                      <span>Faturamento:</span>
                      <span className="font-medium">
                        {formatarValor(empresa.metricas.faturamento_anual, 'moeda')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Compliance:</span>
                      <span className={`font-medium ${
                        empresa.metricas.compliance_score >= 80
                          ? 'text-green-600'
                          : empresa.metricas.compliance_score >= 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {empresa.metricas.compliance_score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmpresasSelecionadas(empresas.map(e => e.id))}
                className="flex-1"
              >
                Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmpresasSelecionadas([])}
                className="flex-1"
              >
                Nenhuma
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Principal */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Análise Comparativa
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBenchmarks(!showBenchmarks)}
                >
                  {showBenchmarks ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showBenchmarks ? 'Ocultar' : 'Mostrar'} Benchmarks
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosFiltrados.length > 0 ? (
              renderGrafico()
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma empresa selecionada
                  </h3>
                  <p className="text-gray-500">
                    Selecione empresas na lateral para visualizar a comparação
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuração de Métricas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            Configurar Métricas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {METRICAS_DISPONIVEIS.map((metrica) => (
              <div
                key={metrica.id}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  metricasVisiveis.includes(metrica.id)
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleMetricaToggle(metrica.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Checkbox
                    checked={metricasVisiveis.includes(metrica.id)}
                    onChange={() => {}} // Controlado pelo onClick do container
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: metrica.cor }}
                  />
                </div>
                <div className="text-sm font-medium">{metrica.nome}</div>
                <div className="text-xs text-muted-foreground">
                  Peso: {metrica.peso}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMetricasVisiveis(METRICAS_DISPONIVEIS.map(m => m.id))}
            >
              Todas as Métricas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMetricasVisiveis(METRICAS_DISPONIVEIS.filter(m => m.visivel).map(m => m.id))}
            >
              Métricas Padrão
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMetricasVisiveis([])}
            >
              Limpar Seleção
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Comparativa Detalhada */}
      {dadosFiltrados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Tabela Comparativa Detalhada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Empresa</th>
                    {metricasAtivas.map((metrica) => (
                      <th key={metrica.id} className="text-right p-2">
                        {metrica.nome}
                      </th>
                    ))}
                    {showBenchmarks && (
                      <th className="text-right p-2">Ranking</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((empresa, index) => (
                    <tr key={empresa.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">{empresa.nome}</div>
                          <div className="text-sm text-muted-foreground">{empresa.regime_tributario}</div>
                        </div>
                      </td>
                      {metricasAtivas.map((metrica) => (
                        <td key={metrica.id} className="text-right p-2 font-medium">
                          {formatarValor(getNestedValue(empresa, metrica.campo), metrica.formato)}
                        </td>
                      ))}
                      {showBenchmarks && (
                        <td className="text-right p-2">
                          <Badge variant="outline">
                            #{empresa.benchmarks.posicao_faturamento}
                          </Badge>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações e Dicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dicas para Análise Comparativa</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Gráfico de Barras:</strong> Ideal para comparar valores absolutos entre empresas
          </p>
          <p>
            • <strong>Gráfico de Linhas:</strong> Mostra evolução temporal das métricas
          </p>
          <p>
            • <strong>Gráfico Radar:</strong> Visualiza múltiplas dimensões simultaneamente
          </p>
          <p>
            • <strong>Gráfico de Dispersão:</strong> Identifica correlações entre métricas
          </p>
          <p>
            • <strong>Benchmarks:</strong> Compare com médias do setor e posicionamento relativo
          </p>
          <p>
            • <strong>Métricas Personalizadas:</strong> Configure pesos e visibilidade conforme sua análise
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
