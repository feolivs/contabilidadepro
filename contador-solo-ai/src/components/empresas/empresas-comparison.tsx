'use client'

/**
 * 📊 EMPRESAS COMPARISON - ContabilidadePRO
 * Componente para comparação lado a lado de múltiplas empresas
 * Especializado em métricas financeiras, compliance e insights
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'
import { 
  Building2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  FileText, DollarSign, Calendar, Users, BarChart3, PieChart as PieChartIcon,
  Download, Filter, RefreshCw, Eye, EyeOff
} from 'lucide-react'

// Interfaces
interface EmpresaComparison {
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
  }
  insights: {
    pontos_fortes: string[]
    areas_melhoria: string[]
    alertas_criticos: string[]
    recomendacoes: string[]
  }
  dados_mensais: Array<{
    mes: string
    faturamento: number
    documentos: number
    compliance: number
  }>
}

interface ComparisonFilters {
  periodo: '3m' | '6m' | '12m' | '24m'
  metricas: string[]
  ordenacao: 'faturamento' | 'crescimento' | 'compliance' | 'documentos'
  mostrar_projecoes: boolean
  incluir_benchmarks: boolean
}

interface EmpresasComparisonProps {
  empresas?: EmpresaComparison[]
  loading?: boolean
  onEmpresaSelect?: (empresaIds: string[]) => void
  onExportData?: (format: 'pdf' | 'excel' | 'csv') => void
}

const CORES_GRAFICOS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', 
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
]

const METRICAS_DISPONIVEIS = [
  { id: 'faturamento', label: 'Faturamento', icon: DollarSign },
  { id: 'crescimento', label: 'Crescimento', icon: TrendingUp },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'compliance', label: 'Compliance', icon: CheckCircle },
  { id: 'projecoes', label: 'Projeções', icon: BarChart3 }
]

export function EmpresasComparison({ 
  empresas = [], 
  loading = false,
  onEmpresaSelect,
  onExportData 
}: EmpresasComparisonProps) {
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<string[]>([])
  const [filtros, setFiltros] = useState<ComparisonFilters>({
    periodo: '12m',
    metricas: ['faturamento', 'crescimento', 'compliance'],
    ordenacao: 'faturamento',
    mostrar_projecoes: true,
    incluir_benchmarks: false
  })
  const [abaSelecionada, setAbaSelecionada] = useState('overview')

  // Dados filtrados e processados
  const dadosComparacao = useMemo(() => {
    const empresasFiltradas = empresas.filter(emp => 
      empresasSelecionadas.includes(emp.id)
    )

    // Ordenar empresas
    return empresasFiltradas.sort((a, b) => {
      switch (filtros.ordenacao) {
        case 'faturamento':
          return b.metricas.faturamento_anual - a.metricas.faturamento_anual
        case 'crescimento':
          return b.metricas.crescimento_percentual - a.metricas.crescimento_percentual
        case 'compliance':
          return b.metricas.compliance_score - a.metricas.compliance_score
        case 'documentos':
          return b.metricas.total_documentos - a.metricas.total_documentos
        default:
          return 0
      }
    })
  }, [empresas, empresasSelecionadas, filtros.ordenacao])

  // Dados para gráficos
  const dadosGraficos = useMemo(() => {
    if (dadosComparacao.length === 0) return []

    // Combinar dados mensais de todas as empresas
    const mesesUnicos = Array.from(new Set(
      dadosComparacao.flatMap(emp => emp.dados_mensais.map(d => d.mes))
    )).sort()

    return mesesUnicos.map(mes => {
      const dadosMes: any = { mes }
      
      dadosComparacao.forEach(empresa => {
        const dadoMes = empresa.dados_mensais.find(d => d.mes === mes)
        dadosMes[`${empresa.nome}_faturamento`] = dadoMes?.faturamento || 0
        dadosMes[`${empresa.nome}_documentos`] = dadoMes?.documentos || 0
        dadosMes[`${empresa.nome}_compliance`] = dadoMes?.compliance || 0
      })

      return dadosMes
    })
  }, [dadosComparacao])

  const handleEmpresaToggle = (empresaId: string) => {
    const novaSelecao = empresasSelecionadas.includes(empresaId)
      ? empresasSelecionadas.filter(id => id !== empresaId)
      : [...empresasSelecionadas, empresaId]
    
    setEmpresasSelecionadas(novaSelecao)
    onEmpresaSelect?.(novaSelecao)
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(1)}%`
  }

  const getStatusColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (score >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Carregando comparação...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                Comparação de Empresas
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Compare métricas e performance entre múltiplas empresas
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExportData?.('excel')}
                disabled={dadosComparacao.length === 0}
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
            {/* Seleção de Período */}
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select
                value={filtros.periodo}
                onValueChange={(value: any) => setFiltros(prev => ({ ...prev, periodo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3m">Últimos 3 meses</SelectItem>
                  <SelectItem value="6m">Últimos 6 meses</SelectItem>
                  <SelectItem value="12m">Últimos 12 meses</SelectItem>
                  <SelectItem value="24m">Últimos 24 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenação */}
            <div>
              <label className="text-sm font-medium mb-2 block">Ordenar por</label>
              <Select
                value={filtros.ordenacao}
                onValueChange={(value: any) => setFiltros(prev => ({ ...prev, ordenacao: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faturamento">Faturamento</SelectItem>
                  <SelectItem value="crescimento">Crescimento</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="documentos">Documentos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opções */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">Opções</label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="projecoes"
                  checked={filtros.mostrar_projecoes}
                  onCheckedChange={(checked) => 
                    setFiltros(prev => ({ ...prev, mostrar_projecoes: !!checked }))
                  }
                />
                <label htmlFor="projecoes" className="text-sm">Mostrar projeções</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="benchmarks"
                  checked={filtros.incluir_benchmarks}
                  onCheckedChange={(checked) => 
                    setFiltros(prev => ({ ...prev, incluir_benchmarks: !!checked }))
                  }
                />
                <label htmlFor="benchmarks" className="text-sm">Incluir benchmarks</label>
              </div>
            </div>

            {/* Empresas Selecionadas */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Empresas Selecionadas ({empresasSelecionadas.length})
              </label>
              <div className="text-sm text-muted-foreground">
                {empresasSelecionadas.length === 0 
                  ? 'Nenhuma empresa selecionada'
                  : `${empresasSelecionadas.length} de ${empresas.length} empresas`
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Empresas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecionar Empresas para Comparação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresas.map((empresa) => (
              <div
                key={empresa.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  empresasSelecionadas.includes(empresa.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleEmpresaToggle(empresa.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={empresasSelecionadas.includes(empresa.id)}
                      onChange={() => {}} // Controlado pelo onClick do container
                    />
                    <h3 className="font-medium">{empresa.nome}</h3>
                  </div>
                  {getStatusIcon(empresa.metricas.compliance_score)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{empresa.cnpj}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Faturamento:</span>
                    <div className="font-medium">
                      {formatarMoeda(empresa.metricas.faturamento_anual)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Crescimento:</span>
                    <div className={`font-medium ${
                      empresa.metricas.crescimento_percentual >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatarPercentual(empresa.metricas.crescimento_percentual)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparação Principal */}
      {dadosComparacao.length > 0 && (
        <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="operacional">Operacional</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Aba: Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* Métricas Principais */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas Principais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Empresa</th>
                        <th className="text-right p-2">Faturamento Anual</th>
                        <th className="text-right p-2">Crescimento</th>
                        <th className="text-right p-2">Documentos</th>
                        <th className="text-right p-2">Compliance</th>
                        <th className="text-right p-2">Regime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosComparacao.map((empresa, index) => (
                        <tr key={empresa.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{empresa.nome}</div>
                              <div className="text-sm text-muted-foreground">{empresa.cnpj}</div>
                            </div>
                          </td>
                          <td className="text-right p-2 font-medium">
                            {formatarMoeda(empresa.metricas.faturamento_anual)}
                          </td>
                          <td className={`text-right p-2 font-medium ${
                            empresa.metricas.crescimento_percentual >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            <div className="flex items-center justify-end gap-1">
                              {empresa.metricas.crescimento_percentual >= 0
                                ? <TrendingUp className="h-4 w-4" />
                                : <TrendingDown className="h-4 w-4" />
                              }
                              {formatarPercentual(empresa.metricas.crescimento_percentual)}
                            </div>
                          </td>
                          <td className="text-right p-2">
                            <div>
                              <div className="font-medium">{empresa.metricas.total_documentos}</div>
                              <div className="text-sm text-muted-foreground">
                                {empresa.metricas.documentos_processados} processados
                              </div>
                            </div>
                          </td>
                          <td className="text-right p-2">
                            <div className="flex items-center justify-end gap-2">
                              {getStatusIcon(empresa.metricas.compliance_score)}
                              <span className={`font-medium ${getStatusColor(empresa.metricas.compliance_score)}`}>
                                {formatarPercentual(empresa.metricas.compliance_score)}
                              </span>
                            </div>
                          </td>
                          <td className="text-right p-2">
                            <Badge variant="outline">
                              {empresa.regime_tributario}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Comparação Geral */}
            <Card>
              <CardHeader>
                <CardTitle>Comparação Visual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosComparacao}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="nome"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any, name: string) => {
                          if (name.includes('faturamento')) {
                            return [formatarMoeda(value), 'Faturamento']
                          }
                          if (name.includes('compliance')) {
                            return [formatarPercentual(value), 'Compliance']
                          }
                          return [value, name]
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="metricas.faturamento_anual"
                        fill={CORES_GRAFICOS[0]}
                        name="Faturamento Anual"
                      />
                      <Bar
                        dataKey="metricas.compliance_score"
                        fill={CORES_GRAFICOS[1]}
                        name="Compliance Score"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Financeiro */}
          <TabsContent value="financeiro" className="space-y-6">
            {/* Evolução Financeira */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução do Faturamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosGraficos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => formatarMoeda(value)} />
                      <Legend />
                      {dadosComparacao.map((empresa, index) => (
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
                </div>
              </CardContent>
            </Card>

            {/* Projeções (se habilitado) */}
            {filtros.mostrar_projecoes && (
              <Card>
                <CardHeader>
                  <CardTitle>Projeções Anuais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dadosComparacao.map((empresa, index) => (
                      <div key={empresa.id} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: CORES_GRAFICOS[index % CORES_GRAFICOS.length] }}
                          />
                          <h3 className="font-medium">{empresa.nome}</h3>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Atual:</span>
                            <div className="font-medium">
                              {formatarMoeda(empresa.metricas.faturamento_anual)}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Projeção:</span>
                            <div className="font-medium text-blue-600">
                              {formatarMoeda(empresa.metricas.projecao_anual)}
                            </div>
                          </div>
                          <div>
                            <span className="text-sm text-muted-foreground">Diferença:</span>
                            <div className={`font-medium ${
                              empresa.metricas.projecao_anual > empresa.metricas.faturamento_anual
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {formatarPercentual(
                                ((empresa.metricas.projecao_anual - empresa.metricas.faturamento_anual) /
                                 empresa.metricas.faturamento_anual) * 100
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Aba: Operacional */}
          <TabsContent value="operacional" className="space-y-6">
            {/* Documentos por Empresa */}
            <Card>
              <CardHeader>
                <CardTitle>Processamento de Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosComparacao}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nome" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="metricas.total_documentos"
                        fill={CORES_GRAFICOS[0]}
                        name="Total de Documentos"
                      />
                      <Bar
                        dataKey="metricas.documentos_processados"
                        fill={CORES_GRAFICOS[1]}
                        name="Documentos Processados"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Score */}
            <Card>
              <CardHeader>
                <CardTitle>Score de Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dadosComparacao.map((empresa, index) => (
                    <div key={empresa.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{empresa.nome}</h3>
                        {getStatusIcon(empresa.metricas.compliance_score)}
                      </div>
                      <div className="text-2xl font-bold mb-2">
                        <span className={getStatusColor(empresa.metricas.compliance_score)}>
                          {formatarPercentual(empresa.metricas.compliance_score)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            empresa.metricas.compliance_score >= 80
                              ? 'bg-green-500'
                              : empresa.metricas.compliance_score >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${empresa.metricas.compliance_score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba: Insights */}
          <TabsContent value="insights" className="space-y-6">
            {dadosComparacao.map((empresa, index) => (
              <Card key={empresa.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: CORES_GRAFICOS[index % CORES_GRAFICOS.length] }}
                    />
                    {empresa.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pontos Fortes */}
                    <div>
                      <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Pontos Fortes
                      </h4>
                      <ul className="space-y-1">
                        {empresa.insights.pontos_fortes.map((ponto, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                            {ponto}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Áreas de Melhoria */}
                    <div>
                      <h4 className="font-medium text-yellow-600 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Áreas de Melhoria
                      </h4>
                      <ul className="space-y-1">
                        {empresa.insights.areas_melhoria.map((area, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Alertas Críticos */}
                    {empresa.insights.alertas_criticos.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Alertas Críticos
                        </h4>
                        <ul className="space-y-1">
                          {empresa.insights.alertas_criticos.map((alerta, idx) => (
                            <li key={idx} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                              {alerta}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recomendações */}
                    <div>
                      <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Recomendações
                      </h4>
                      <ul className="space-y-1">
                        {empresa.insights.recomendacoes.map((recomendacao, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                            {recomendacao}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Estado Vazio */}
      {dadosComparacao.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma empresa selecionada
            </h3>
            <p className="text-gray-500 mb-4">
              Selecione pelo menos uma empresa para começar a comparação
            </p>
            <Button
              variant="outline"
              onClick={() => {
                if (empresas.length > 0) {
                  setEmpresasSelecionadas([empresas[0].id])
                  onEmpresaSelect?.([empresas[0].id])
                }
              }}
              disabled={empresas.length === 0}
            >
              Selecionar Primeira Empresa
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
