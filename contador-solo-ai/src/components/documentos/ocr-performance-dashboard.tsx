'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Brain,
  FileText,
  Zap,
  Target,
  Activity,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface OCRMetrics {
  totalDocuments: number
  successRate: number
  averageConfidence: number
  averageProcessingTime: number
  methodDistribution: Record<string, number>
  dailyProcessing: Array<{
    date: string
    count: number
    successCount: number
    avgTime: number
  }>
  confidenceDistribution: {
    high: number    // > 80%
    medium: number  // 60-80%
    low: number     // < 60%
  }
  documentTypePerformance: Array<{
    type: string
    count: number
    successRate: number
    avgConfidence: number
    avgTime: number
  }>
  recentErrors: Array<{
    id: string
    fileName: string
    error: string
    timestamp: string
  }>
}

interface OCRPerformanceDashboardProps {
  className?: string
}

export function OCRPerformanceDashboard({ className = '' }: OCRPerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<OCRMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const supabase = createBrowserSupabaseClient()

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      // Calcular data de início baseada no range selecionado
      const now = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case '24h':
          startDate.setHours(now.getHours() - 24)
          break
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
      }

      // Buscar documentos processados no período
      const { data: documentos, error } = await supabase
        .from('documentos')
        .select(`
          id,
          arquivo_nome,
          tipo_documento,
          status_processamento,
          dados_extraidos,
          data_processamento,
          observacoes,
          created_at
        `)
        .gte('created_at', startDate.toISOString())
        .not('dados_extraidos', 'is', null)

      if (error) {
        console.error('Erro ao carregar métricas:', error)
        toast.error('Erro ao carregar métricas de performance')
        return
      }

      // Processar métricas
      const totalDocuments = documentos?.length || 0
      const successfulDocs = documentos?.filter(d =>
        d.status_processamento === 'processado' && d.dados_extraidos
      ) || []

      const successRate = totalDocuments > 0 ? (successfulDocs.length / totalDocuments) * 100 : 0

      // Calcular confiança média
      const confidences = successfulDocs
        .map(d => d.dados_extraidos?.confidence)
        .filter(c => typeof c === 'number' && c > 0)

      const averageConfidence = confidences.length > 0
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length * 100
        : 0

      // Calcular tempo médio de processamento
      const processingTimes = successfulDocs
        .map(d => d.dados_extraidos?.processingTime || d.dados_extraidos?.processing_time)
        .filter(t => typeof t === 'number' && t > 0)

      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0

      // Distribuição por método
      const methodDistribution: Record<string, number> = {}
      successfulDocs.forEach(doc => {
        const method = doc.dados_extraidos?.ocr_method || doc.dados_extraidos?.method || 'unknown'
        methodDistribution[method] = (methodDistribution[method] || 0) + 1
      })

      // Distribuição de confiança
      const confidenceDistribution = {
        high: confidences.filter(c => c >= 0.8).length,
        medium: confidences.filter(c => c >= 0.6 && c < 0.8).length,
        low: confidences.filter(c => c < 0.6).length
      }

      // Performance por tipo de documento
      const typeGroups = successfulDocs.reduce((acc, doc) => {
        const type = doc.tipo_documento
        if (!acc[type]) {
          acc[type] = []
        }
        acc[type].push(doc)
        return acc
      }, {} as Record<string, typeof successfulDocs>)

      const documentTypePerformance = Object.entries(typeGroups).map(([type, docs]) => {
        const typeConfidences = docs
          .map(d => d.dados_extraidos?.confidence)
          .filter(c => typeof c === 'number' && c > 0)

        const typeTimes = docs
          .map(d => d.dados_extraidos?.processingTime || d.dados_extraidos?.processing_time)
          .filter(t => typeof t === 'number' && t > 0)

        return {
          type,
          count: docs.length,
          successRate: 100, // Já filtrados por sucesso
          avgConfidence: typeConfidences.length > 0
            ? typeConfidences.reduce((sum, conf) => sum + conf, 0) / typeConfidences.length * 100
            : 0,
          avgTime: typeTimes.length > 0
            ? typeTimes.reduce((sum, time) => sum + time, 0) / typeTimes.length
            : 0
        }
      })

      // Processamento diário (últimos 7 dias)
      const dailyData: Record<string, { count: number; successCount: number; times: number[] }> = {}

      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateKey = date.toISOString().split('T')[0]
        dailyData[dateKey] = { count: 0, successCount: 0, times: [] }
      }

      documentos?.forEach(doc => {
        const dateKey = doc.created_at.split('T')[0]
        if (dailyData[dateKey]) {
          dailyData[dateKey].count++
          if (doc.status_processamento === 'processado') {
            dailyData[dateKey].successCount++
            const time = doc.dados_extraidos?.processingTime || doc.dados_extraidos?.processing_time
            if (typeof time === 'number' && time > 0) {
              dailyData[dateKey].times.push(time)
            }
          }
        }
      })

      const dailyProcessing = Object.entries(dailyData).map(([date, data]) => ({
        date,
        count: data.count,
        successCount: data.successCount,
        avgTime: data.times.length > 0
          ? data.times.reduce((sum, time) => sum + time, 0) / data.times.length
          : 0
      }))

      // Erros recentes
      const recentErrors = documentos
        ?.filter(d => d.status_processamento === 'erro')
        .slice(0, 5)
        .map(d => ({
          id: d.id,
          fileName: d.arquivo_nome,
          error: d.observacoes || 'Erro desconhecido',
          timestamp: d.created_at
        })) || []

      const metricsData: OCRMetrics = {
        totalDocuments,
        successRate,
        averageConfidence,
        averageProcessingTime,
        methodDistribution,
        dailyProcessing,
        confidenceDistribution,
        documentTypePerformance,
        recentErrors
      }

      setMetrics(metricsData)
      setLastUpdated(new Date())

    } catch (error) {
      console.error('Erro ao processar métricas:', error)
      toast.error('Erro ao processar métricas de performance')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [timeRange])

  const getPerformanceColor = (value: number, type: 'rate' | 'confidence' | 'time') => {
    switch (type) {
      case 'rate':
        if (value >= 95) return 'text-green-600 dark:text-green-400'
        if (value >= 85) return 'text-yellow-600 dark:text-yellow-400'
        return 'text-red-600 dark:text-red-400'
      case 'confidence':
        if (value >= 80) return 'text-green-600 dark:text-green-400'
        if (value >= 60) return 'text-yellow-600 dark:text-yellow-400'
        return 'text-red-600 dark:text-red-400'
      case 'time':
        if (value <= 5) return 'text-green-600 dark:text-green-400'
        if (value <= 15) return 'text-yellow-600 dark:text-yellow-400'
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-foreground'
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 animate-pulse" />
            Dashboard de Performance OCR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Dashboard de Performance OCR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p>Erro ao carregar métricas de performance</p>
            <Button onClick={loadMetrics} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com controles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Dashboard de Performance OCR
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadMetrics}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Última atualização: {lastUpdated.toLocaleString('pt-BR')}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Processados</p>
                <p className="text-2xl font-bold">{metrics.totalDocuments}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics.successRate, 'rate')}`}>
                  {metrics.successRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confiança Média</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics.averageConfidence, 'confidence')}`}>
                  {metrics.averageConfidence.toFixed(1)}%
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(metrics.averageProcessingTime, 'time')}`}>
                  {metrics.averageProcessingTime.toFixed(1)}s
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuições e análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Confiança */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Confiança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Alta (≥80%)</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  {metrics.confidenceDistribution.high}
                </Badge>
              </div>
              <Progress
                value={metrics.confidenceDistribution.high / (metrics.confidenceDistribution.high + metrics.confidenceDistribution.medium + metrics.confidenceDistribution.low) * 100}
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm">Média (60-80%)</span>
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                  {metrics.confidenceDistribution.medium}
                </Badge>
              </div>
              <Progress
                value={metrics.confidenceDistribution.medium / (metrics.confidenceDistribution.high + metrics.confidenceDistribution.medium + metrics.confidenceDistribution.low) * 100}
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm">Baixa (&lt;60%)</span>
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {metrics.confidenceDistribution.low}
                </Badge>
              </div>
              <Progress
                value={metrics.confidenceDistribution.low / (metrics.confidenceDistribution.high + metrics.confidenceDistribution.medium + metrics.confidenceDistribution.low) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Métodos de OCR */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Métodos de Processamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.methodDistribution).map(([method, count]) => (
                <div key={method} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{method}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{count}</Badge>
                    <div className="w-20">
                      <Progress
                        value={count / metrics.totalDocuments * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance por tipo de documento */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Tipo de Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-right p-2">Documentos</th>
                  <th className="text-right p-2">Confiança Média</th>
                  <th className="text-right p-2">Tempo Médio</th>
                </tr>
              </thead>
              <tbody>
                {metrics.documentTypePerformance.map((item) => (
                  <tr key={item.type} className="border-b">
                    <td className="p-2 font-medium">{item.type}</td>
                    <td className="p-2 text-right">{item.count}</td>
                    <td className={`p-2 text-right font-medium ${getPerformanceColor(item.avgConfidence, 'confidence')}`}>
                      {item.avgConfidence.toFixed(1)}%
                    </td>
                    <td className={`p-2 text-right font-medium ${getPerformanceColor(item.avgTime, 'time')}`}>
                      {item.avgTime.toFixed(1)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Erros recentes */}
      {metrics.recentErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Erros Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.recentErrors.map((error) => (
                <div key={error.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{error.fileName}</p>
                    <p className="text-xs text-muted-foreground truncate">{error.error}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(error.timestamp).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}