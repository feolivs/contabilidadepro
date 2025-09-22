'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'
import { 
  FileText, 
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  TrendingUp,
  Award,
  AlertCircle
} from 'lucide-react'
import type { TipoDocumento } from '@/types/documento'

/**
 * Interface para dados dos tipos de documentos
 */
export interface TiposDocumentosData {
  tipo: TipoDocumento | string
  quantidade: number
  percentual: number
  processados?: number
  taxa_sucesso_tipo?: number
  valor_medio?: number
  ultimo_upload?: string
}

/**
 * Props do componente TiposDocumentosChart
 */
export interface TiposDocumentosChartProps {
  data: TiposDocumentosData[]
  loading?: boolean
  height?: number
  className?: string
  title?: string
  description?: string
  chartType?: 'pie' | 'donut' | 'bar'
  showPercentages?: boolean
  showSuccessRate?: boolean
}

/**
 * Cores para diferentes tipos de documentos
 */
const DOCUMENT_COLORS = {
  'NFE': '#10b981',      // Verde
  'NFSE': '#3b82f6',     // Azul
  'RECIBO': '#f59e0b',   // Amarelo
  'BOLETO': '#ef4444',   // Vermelho
  'EXTRATO': '#8b5cf6',  // Roxo
  'COMPROVANTE': '#06b6d4', // Ciano
  'CONTRATO': '#84cc16', // Lima
  'OUTROS': '#6b7280'    // Cinza
}

/**
 * Componente de gráfico de tipos de documentos
 */
export function TiposDocumentosChart({ 
  data = [],
  loading = false,
  height = 300,
  className = '',
  title = 'Distribuição por Tipo',
  description = 'Tipos de documentos mais processados',
  chartType = 'donut',
  showPercentages = true,
  showSuccessRate = false
}: TiposDocumentosChartProps) {

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className={`h-${height / 4} w-full`} />
        </CardContent>
      </Card>
    )
  }

  // Se não há dados
  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado disponível</p>
            <p className="text-sm">Distribuição aparecerá após o processamento de documentos</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Processar dados para o gráfico
  const chartData = data.map((item, index) => ({
    ...item,
    name: getTipoDisplayName(item.tipo),
    fill: DOCUMENT_COLORS[item.tipo as keyof typeof DOCUMENT_COLORS] || DOCUMENT_COLORS.OUTROS,
    id: `tipo-${index}`
  }))

  // Calcular métricas
  const totalDocumentos = data.reduce((sum, item) => sum + item.quantidade, 0)
  const tipoMaisComum = data.reduce((max, item) => 
    item.quantidade > max.quantidade ? item : max, data[0]
  )
  const diversidade = data.length
  const taxaMediaSucesso = showSuccessRate && data.some(item => item.taxa_sucesso_tipo !== undefined)
    ? data.reduce((sum, item) => sum + (item.taxa_sucesso_tipo || 0), 0) / data.length
    : null

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          {/* Métricas Resumo */}
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-bold text-blue-600">
                {totalDocumentos}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipos</p>
              <p className="font-bold">
                {diversidade}
              </p>
            </div>
          </div>
        </div>

        {/* Badges de Insights */}
        <div className="flex gap-2">
          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
            <Award className="h-3 w-3 mr-1" />
            Mais comum: {getTipoDisplayName(tipoMaisComum.tipo)} ({tipoMaisComum.percentual.toFixed(1)}%)
          </Badge>

          <Badge variant="outline" className="text-blue-700 border-blue-200 bg-blue-50">
            <BarChart3 className="h-3 w-3 mr-1" />
            {diversidade} tipos diferentes
          </Badge>

          {taxaMediaSucesso !== null && (
            <Badge 
              variant="outline" 
              className={`${taxaMediaSucesso >= 90 ? 'text-green-700 border-green-200 bg-green-50' : 
                          taxaMediaSucesso >= 70 ? 'text-yellow-700 border-yellow-200 bg-yellow-50' : 
                          'text-red-700 border-red-200 bg-red-50'}`}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Taxa média: {taxaMediaSucesso.toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico */}
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              {(chartType === 'pie' || chartType === 'donut') && (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={showPercentages ? renderCustomizedLabel : false}
                    outerRadius={chartType === 'donut' ? 80 : 100}
                    innerRadius={chartType === 'donut' ? 40 : 0}
                    fill="#8884d8"
                    dataKey="quantidade"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              )}

              {chartType === 'bar' && (
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  <Bar 
                    dataKey="quantidade" 
                    name="Quantidade"
                    radius={[2, 2, 0, 0]}
                    opacity={0.8}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Lista Detalhada */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Detalhamento por Tipo</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chartData
                .sort((a, b) => b.quantidade - a.quantidade)
                .map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.fill }}
                    />
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantidade} documentos
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      {item.percentual.toFixed(1)}%
                    </p>
                    {showSuccessRate && item.taxa_sucesso_tipo !== undefined && (
                      <p className={`text-xs ${
                        item.taxa_sucesso_tipo >= 90 ? 'text-green-600' :
                        item.taxa_sucesso_tipo >= 70 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {item.taxa_sucesso_tipo.toFixed(1)}% sucesso
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Estatísticas Adicionais */}
            {showSuccessRate && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h5 className="font-medium text-sm mb-2">Taxa de Sucesso por Tipo</h5>
                <div className="space-y-2">
                  {chartData
                    .filter(item => item.taxa_sucesso_tipo !== undefined)
                    .sort((a, b) => (b.taxa_sucesso_tipo || 0) - (a.taxa_sucesso_tipo || 0))
                    .slice(0, 3)
                    .map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{item.name}</span>
                        <span>{item.taxa_sucesso_tipo?.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={item.taxa_sucesso_tipo || 0} 
                        className="h-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Label customizado para o gráfico de pizza
 */
function renderCustomizedLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null // Não mostrar labels para fatias muito pequenas
  
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize={12}
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

/**
 * Tooltip customizado para o gráfico
 */
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium mb-2">{data.name}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span>Quantidade:</span>
            <span className="font-bold">{data.quantidade}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Percentual:</span>
            <span className="font-bold">{data.percentual.toFixed(1)}%</span>
          </div>
          {data.taxa_sucesso_tipo !== undefined && (
            <div className="flex justify-between gap-4">
              <span>Taxa de Sucesso:</span>
              <span className="font-bold">{data.taxa_sucesso_tipo.toFixed(1)}%</span>
            </div>
          )}
          {data.valor_medio !== undefined && data.valor_medio > 0 && (
            <div className="flex justify-between gap-4">
              <span>Valor Médio:</span>
              <span className="font-bold">{formatCurrency(data.valor_medio)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }
  return null
}

/**
 * Utilitários
 */
function getTipoDisplayName(tipo: string): string {
  const displayNames: Record<string, string> = {
    'NFE': 'Nota Fiscal Eletrônica',
    'NFSE': 'Nota Fiscal de Serviço',
    'RECIBO': 'Recibo',
    'BOLETO': 'Boleto',
    'EXTRATO': 'Extrato Bancário',
    'COMPROVANTE': 'Comprovante',
    'CONTRATO': 'Contrato',
    'OUTROS': 'Outros'
  }
  
  return displayNames[tipo] || tipo
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}
