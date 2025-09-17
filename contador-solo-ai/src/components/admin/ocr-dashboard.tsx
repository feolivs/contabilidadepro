'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Brain, 
  FileText, 
  Clock, 
  TrendingUp, 
  Zap,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { 
  useOCRMetrics, 
  useOCRQualityByMethod, 
  useOCRPerformanceStats,
  useOCRCacheManagement,
  ocrUtils 
} from '@/hooks/use-pdf-ocr'

interface OCRDashboardProps {
  className?: string
}

export function OCRDashboard({ className = '' }: OCRDashboardProps) {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    end: new Date()
  })

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useOCRMetrics(dateRange)
  const { data: qualityByMethod, isLoading: qualityLoading } = useOCRQualityByMethod()
  const { data: performanceStats, isLoading: performanceLoading } = useOCRPerformanceStats()
  const { clearExpiredCache, clearAllCache, isClearing } = useOCRCacheManagement()

  const handleRefresh = () => {
    refetchMetrics()
  }

  const handleClearExpiredCache = async () => {
    try {
      await clearExpiredCache()
      refetchMetrics()
    } catch (error) {
      console.error('Erro ao limpar cache:', error)
    }
  }

  const handleClearAllCache = async () => {
    if (confirm('Tem certeza que deseja limpar todo o cache de OCR? Esta ação não pode ser desfeita.')) {
      try {
        await clearAllCache()
        refetchMetrics()
      } catch (error) {
        console.error('Erro ao limpar cache:', error)
      }
    }
  }

  if (metricsLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Carregando métricas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard OCR</h2>
          <p className="text-muted-foreground">
            Monitoramento de performance e qualidade do processamento OCR
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={metricsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearExpiredCache}
            disabled={isClearing}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Cache Expirado
          </Button>
        </div>
      </div>

      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalDocuments || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiança Média</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avgConfidence ? ocrUtils.formatConfidence(metrics.avgConfidence) : '0%'}
            </div>
            <Progress value={(metrics?.avgConfidence || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avgProcessingTime ? ocrUtils.formatProcessingTime(metrics.avgProcessingTime) : '0ms'}
            </div>
            <p className="text-xs text-muted-foreground">Por documento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.successRate ? `${Math.round(metrics.successRate * 100)}%` : '0%'}
            </div>
            <Progress value={(metrics?.successRate || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Método */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribuição por Método de Extração
          </CardTitle>
          <CardDescription>
            Comparação entre extração nativa, OCR e métodos híbridos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Extração Nativa</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {metrics?.nativeExtraction || 0}
                </Badge>
              </div>
              <Progress 
                value={metrics?.totalDocuments ? (metrics.nativeExtraction / metrics.totalDocuments) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">OCR</span>
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  {metrics?.ocrExtraction || 0}
                </Badge>
              </div>
              <Progress 
                value={metrics?.totalDocuments ? (metrics.ocrExtraction / metrics.totalDocuments) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Híbrido</span>
                <Badge variant="outline" className="text-purple-600 border-purple-600">
                  {metrics?.hybridExtraction || 0}
                </Badge>
              </div>
              <Progress 
                value={metrics?.totalDocuments ? (metrics.hybridExtraction / metrics.totalDocuments) * 100 : 0} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Qualidade por Método */}
      {qualityByMethod && qualityByMethod.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Qualidade por Método
            </CardTitle>
            <CardDescription>
              Métricas detalhadas de performance para cada método de extração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {qualityByMethod.map((method) => (
                <div key={method.method} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`${ocrUtils.getMethodColor(method.method)} border-current`}
                      >
                        {ocrUtils.getMethodLabel(method.method)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({method.documentCount} documentos)
                      </span>
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <label className="text-muted-foreground">Confiança Média</label>
                      <div className={`font-medium ${ocrUtils.getConfidenceColor(method.avgConfidence)}`}>
                        {ocrUtils.formatConfidence(method.avgConfidence)}
                      </div>
                    </div>

                    <div>
                      <label className="text-muted-foreground">Legibilidade</label>
                      <div className="font-medium">
                        {ocrUtils.formatConfidence(method.avgReadability)}
                      </div>
                    </div>

                    <div>
                      <label className="text-muted-foreground">Dados Estruturados</label>
                      <div className="font-medium">
                        {ocrUtils.formatConfidence(method.structuredDataRate)}
                      </div>
                    </div>

                    <div>
                      <label className="text-muted-foreground">Tempo Médio</label>
                      <div className="font-medium">
                        {ocrUtils.formatProcessingTime(method.avgProcessingTime)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados Estruturados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Detecção de Dados Estruturados
          </CardTitle>
          <CardDescription>
            Documentos que contêm informações estruturadas (CNPJ, valores, datas, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {metrics?.documentsWithStructuredData || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                de {metrics?.totalDocuments || 0} documentos
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">
                {metrics?.totalDocuments 
                  ? Math.round((metrics.documentsWithStructuredData / metrics.totalDocuments) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Taxa de detecção</p>
            </div>
          </div>
          <Progress 
            value={metrics?.totalDocuments 
              ? (metrics.documentsWithStructuredData / metrics.totalDocuments) * 100 
              : 0
            } 
            className="mt-4"
          />
        </CardContent>
      </Card>

      {/* Ações de Manutenção */}
      <Card>
        <CardHeader>
          <CardTitle>Manutenção do Sistema</CardTitle>
          <CardDescription>
            Ferramentas para otimização e limpeza do sistema OCR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClearAllCache}
              disabled={isClearing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Todo o Cache
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            ⚠️ Limpar o cache forçará o reprocessamento de todos os documentos na próxima visualização.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
