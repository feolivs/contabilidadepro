'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Zap,
  Brain,
  FileText,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar
} from 'lucide-react'
import { useDocumentOCR } from '@/hooks/use-document-ocr'
import { useFiscalAlerts } from '@/hooks/use-fiscal-alerts'

interface PerformanceDashboardProps {
  timeRange?: '7d' | '30d' | '90d' | '1y'
}

export function PerformanceDashboard({ timeRange = '30d' }: PerformanceDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  
  const { useProcessedDocuments, useDocumentStats } = useDocumentOCR()
  const { useActiveAlerts } = useFiscalAlerts()
  
  const { data: documents = [] } = useProcessedDocuments()
  const { data: documentStats = [] } = useDocumentStats()
  const { data: alerts = [] } = useActiveAlerts()

  // Filtrar dados por período
  const filteredData = useMemo(() => {
    const now = new Date()
    const daysAgo = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }[selectedTimeRange]

    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    return {
      documents: documents.filter(doc => new Date(doc.created_at) >= cutoffDate),
      alerts: alerts.filter(alert => new Date(alert.created_at) >= cutoffDate)
    }
  }, [documents, alerts, selectedTimeRange])

  // Métricas de performance
  const performanceMetrics = useMemo(() => {
    const { documents: filteredDocs } = filteredData
    
    const totalDocs = filteredDocs.length
    const completedDocs = filteredDocs.filter(d => d.status === 'completed').length
    const failedDocs = filteredDocs.filter(d => d.status === 'failed').length
    const validatedDocs = filteredDocs.filter(d => d.manually_validated).length
    
    const avgConfidence = completedDocs > 0 
      ? filteredDocs
          .filter(d => d.status === 'completed' && d.confidence_score)
          .reduce((sum, d) => sum + (d.confidence_score || 0), 0) / completedDocs
      : 0

    const totalValue = filteredDocs
      .filter(d => d.total_value)
      .reduce((sum, d) => sum + (d.total_value || 0), 0)

    const successRate = totalDocs > 0 ? (completedDocs / totalDocs) * 100 : 0
    const validationRate = completedDocs > 0 ? (validatedDocs / completedDocs) * 100 : 0

    return {
      totalDocs,
      completedDocs,
      failedDocs,
      validatedDocs,
      avgConfidence: Math.round(avgConfidence * 100),
      totalValue,
      successRate: Math.round(successRate),
      validationRate: Math.round(validationRate)
    }
  }, [filteredData])

  // Métricas de alertas
  const alertMetrics = useMemo(() => {
    const { alerts: filteredAlerts } = filteredData
    
    const totalAlerts = filteredAlerts.length
    const criticalAlerts = filteredAlerts.filter(a => a.priority === 'CRITICAL').length
    const highAlerts = filteredAlerts.filter(a => a.priority === 'HIGH').length
    const resolvedAlerts = filteredAlerts.filter(a => a.status === 'RESOLVED').length
    const acknowledgedAlerts = filteredAlerts.filter(a => a.status === 'ACKNOWLEDGED').length

    const resolutionRate = totalAlerts > 0 ? (resolvedAlerts / totalAlerts) * 100 : 0

    return {
      totalAlerts,
      criticalAlerts,
      highAlerts,
      resolvedAlerts,
      acknowledgedAlerts,
      resolutionRate: Math.round(resolutionRate)
    }
  }, [filteredData])

  // Dados por tipo de documento
  const documentTypeStats = useMemo(() => {
    const { documents: filteredDocs } = filteredData
    const stats: Record<string, { count: number; avgConfidence: number; totalValue: number }> = {}

    filteredDocs.forEach(doc => {
      if (!stats[doc.document_type]) {
        stats[doc.document_type] = { count: 0, avgConfidence: 0, totalValue: 0 }
      }

      const docStats = stats[doc.document_type]
      if (docStats) {
        docStats.count++
        if (doc.confidence_score) {
          docStats.avgConfidence += doc.confidence_score
        }
        if (doc.total_value) {
          docStats.totalValue += doc.total_value
        }
      }
    })

    // Calcular médias
    Object.keys(stats).forEach(type => {
      const typeStats = stats[type]
      if (typeStats) {
        typeStats.avgConfidence = typeStats.count > 0
          ? Math.round((typeStats.avgConfidence / typeStats.count) * 100)
          : 0
      }
    })

    return stats
  }, [filteredData])

  // Tendência temporal (últimos 7 dias)
  const temporalTrend = useMemo(() => {
    const { documents: filteredDocs } = filteredData
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return date.toISOString().split('T')[0]
    }).reverse()

    return last7Days.map(date => {
      const dayDocs = filteredDocs.filter(doc => 
        doc.created_at.split('T')[0] === date
      )
      
      return {
        date,
        count: dayDocs.length,
        completed: dayDocs.filter(d => d.status === 'completed').length,
        failed: dayDocs.filter(d => d.status === 'failed').length
      }
    })
  }, [filteredData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const timeRangeLabels = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    '90d': 'Últimos 90 dias',
    '1y': 'Último ano'
  }

  return (
    <div className="space-y-6">
      {/* Header com seletor de período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Performance</h2>
          <p className="text-gray-600">Análise detalhada do sistema de IA</p>
        </div>
        
        <Select value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as "7d" | "30d" | "90d" | "1y")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(timeRangeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {performanceMetrics.totalDocs}
            </div>
            <div className="text-sm text-gray-500">Documentos Processados</div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {performanceMetrics.successRate}% sucesso
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {performanceMetrics.avgConfidence}%
            </div>
            <div className="text-sm text-gray-500">Confiança Média</div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {performanceMetrics.validationRate}% validados
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(performanceMetrics.totalValue)}
            </div>
            <div className="text-sm text-gray-500">Valor Total Processado</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {alertMetrics.totalAlerts}
            </div>
            <div className="text-sm text-gray-500">Alertas Gerados</div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {alertMetrics.resolutionRate}% resolvidos
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance por tipo de documento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(documentTypeStats).map(([type, stats]) => (
                <div key={type} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{type}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {stats.count} docs
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {stats.avgConfidence}% confiança
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(stats.avgConfidence, 100)}%` }}
                    ></div>
                  </div>
                  
                  {stats.totalValue > 0 && (
                    <div className="text-sm text-gray-600">
                      Valor: {formatCurrency(stats.totalValue)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tendência temporal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência (Últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {temporalTrend.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="text-sm">
                    {day.date ? new Date(day.date).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit'
                    }) : 'Data inválida'}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-sm">{day.completed}</span>
                    </div>
                    
                    {day.failed > 0 && (
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                        <span className="text-sm">{day.failed}</span>
                      </div>
                    )}
                    
                    <Badge variant="outline" className="text-xs">
                      {day.count} total
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Resumo de Alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {alertMetrics.criticalAlerts}
              </div>
              <div className="text-sm text-gray-600">Críticos</div>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {alertMetrics.highAlerts}
              </div>
              <div className="text-sm text-gray-600">Alta Prioridade</div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {alertMetrics.acknowledgedAlerts}
              </div>
              <div className="text-sm text-gray-600">Reconhecidos</div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {alertMetrics.resolvedAlerts}
              </div>
              <div className="text-sm text-gray-600">Resolvidos</div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {alertMetrics.resolutionRate}%
              </div>
              <div className="text-sm text-gray-600">Taxa Resolução</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
