'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Target,
  Activity,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Info
} from 'lucide-react'

// Hooks
import { useComplianceAnalysis } from '@/hooks/use-compliance-analysis'

/**
 * Props do componente ComplianceAnalysisPanel
 */
export interface ComplianceAnalysisPanelProps {
  empresaId: string
  className?: string
  showRefresh?: boolean
}

/**
 * Componente para exibir análise de compliance
 */
export function ComplianceAnalysisPanel({ 
  empresaId, 
  className = '',
  showRefresh = true
}: ComplianceAnalysisPanelProps) {
  const [forceRefresh, setForceRefresh] = useState(false)

  const {
    data: compliance,
    isLoading,
    error,
    refetch
  } = useComplianceAnalysis(empresaId, {
    force_refresh: forceRefresh,
    enabled: !!empresaId
  })

  const handleRefresh = async () => {
    setForceRefresh(true)
    await refetch()
    setForceRefresh(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (nivel: string) => {
    switch (nivel) {
      case 'excelente': return 'default'
      case 'alto': return 'secondary'
      case 'medio': return 'outline'
      case 'baixo': return 'destructive'
      case 'critico': return 'destructive'
      default: return 'outline'
    }
  }

  const getNivelIcon = (nivel: string) => {
    switch (nivel) {
      case 'excelente':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'alto':
        return <TrendingUp className="h-4 w-4 text-blue-600" />
      case 'medio':
        return <Minus className="h-4 w-4 text-yellow-600" />
      case 'baixo':
        return <TrendingDown className="h-4 w-4 text-orange-600" />
      case 'critico':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  // Loading state
  if (isLoading && !compliance) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle>Análise de Compliance</CardTitle>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle>Análise de Compliance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar análise de compliance: {error.message}
              {showRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  className="ml-2"
                >
                  Tentar novamente
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!compliance) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle>Análise de Compliance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhuma análise de compliance disponível</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle>Análise de Compliance</CardTitle>
            {compliance.cached && (
              <Badge variant="secondary" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Cache
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getScoreBadgeVariant(compliance.nivel)} className="flex items-center gap-1">
              {getNivelIcon(compliance.nivel)}
              {compliance.nivel}
            </Badge>
            {showRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Score geral: {compliance.score_geral.toFixed(1)}/100 • 
          {compliance.configuracao_analise?.documentos_analisados || 0} documentos analisados
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="score" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="score">Score</TabsTrigger>
            <TabsTrigger value="prazos">Prazos</TabsTrigger>
            <TabsTrigger value="riscos">Riscos</TabsTrigger>
            <TabsTrigger value="qualidade">Qualidade</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="space-y-4">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <div className={`text-4xl font-bold ${getScoreColor(compliance.score_geral)}`}>
                  {compliance.score_geral.toFixed(1)}
                </div>
                <Progress value={compliance.score_geral} className="h-3" />
                <p className="text-sm text-muted-foreground">Score de Compliance</p>
              </div>
            </div>

            {/* Consistência de Dados */}
            {compliance.consistencia_dados && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Consistência de Dados
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Score de Consistência</span>
                    <span className={`font-bold ${getScoreColor(compliance.consistencia_dados.score)}`}>
                      {compliance.consistencia_dados.score.toFixed(1)}/100
                    </span>
                  </div>
                  <Progress value={compliance.consistencia_dados.score} className="h-2" />
                </div>

                {compliance.consistencia_dados.inconsistencias?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Inconsistências Encontradas</h5>
                    <ul className="space-y-1">
                      {compliance.consistencia_dados.inconsistencias.map((inconsistencia, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          {inconsistencia}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {compliance.consistencia_dados.campos_faltantes?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Campos Faltantes</h5>
                    <ul className="space-y-1">
                      {compliance.consistencia_dados.campos_faltantes.map((campo, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          {campo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prazos" className="space-y-4">
            {compliance.prazos_fiscais && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Próximo DAS</span>
                    </div>
                    <p className="text-lg font-bold">
                      {new Date(compliance.prazos_fiscais.das_proximo_vencimento).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {compliance.prazos_fiscais.dias_para_das} dias restantes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Regime Tributário</span>
                    </div>
                    <p className="text-lg font-bold">
                      {compliance.prazos_fiscais.regime_tributario || 'Não definido'}
                    </p>
                  </div>
                </div>

                {compliance.prazos_fiscais.alertas_prazo?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Alertas de Prazo</h4>
                    {compliance.prazos_fiscais.alertas_prazo.map((alerta, index) => (
                      <Alert key={index} className="mb-2">
                        <Clock className="h-4 w-4" />
                        <AlertDescription>{alerta}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            )}

            {compliance.obrigacoes_fiscais && (
              <div className="space-y-3">
                <h4 className="font-semibold">Obrigações Fiscais</h4>
                {compliance.obrigacoes_fiscais.obrigacoes_ativas?.length > 0 ? (
                  <div className="space-y-2">
                    {compliance.obrigacoes_fiscais.obrigacoes_ativas.map((obrigacao, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{obrigacao.tipo}</span>
                          <Badge variant={obrigacao.status === 'ativa' ? 'default' : 'secondary'}>
                            {obrigacao.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {obrigacao.periodicidade} • Vencimento: {obrigacao.vencimento}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma obrigação fiscal ativa encontrada</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="riscos" className="space-y-4">
            {compliance.alertas_urgentes && compliance.alertas_urgentes.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-red-600">Alertas Urgentes</h4>
                {compliance.alertas_urgentes.map((alerta, index) => (
                  <Alert key={index} className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {alerta}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {compliance.riscos_identificados && compliance.riscos_identificados.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Riscos Identificados</h4>
                <ul className="space-y-2">
                  {compliance.riscos_identificados.map((risco, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      {risco}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(!compliance.alertas_urgentes || compliance.alertas_urgentes.length === 0) &&
             (!compliance.riscos_identificados || compliance.riscos_identificados.length === 0) && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum risco crítico identificado</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="qualidade" className="space-y-4">
            {compliance.qualidade_documentacao && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Taxa de Estruturação</span>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">
                          {(compliance.qualidade_documentacao.taxa_estruturacao * 100).toFixed(1)}%
                        </span>
                        <Badge variant={
                          compliance.qualidade_documentacao.qualidade_geral === 'alta' ? 'default' :
                          compliance.qualidade_documentacao.qualidade_geral === 'media' ? 'secondary' : 'destructive'
                        }>
                          {compliance.qualidade_documentacao.qualidade_geral}
                        </Badge>
                      </div>
                      <Progress value={compliance.qualidade_documentacao.taxa_estruturacao * 100} className="h-2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-medium">Confiança Média</span>
                    <div className="space-y-1">
                      <span className="text-lg font-bold">
                        {(compliance.qualidade_documentacao.confianca_media * 100).toFixed(1)}%
                      </span>
                      <Progress value={compliance.qualidade_documentacao.confianca_media * 100} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total de Documentos</p>
                    <p className="text-xl font-bold">{compliance.qualidade_documentacao.total_documentos}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Documentos Estruturados</p>
                    <p className="text-xl font-bold">{compliance.qualidade_documentacao.documentos_estruturados}</p>
                  </div>
                </div>

                {compliance.qualidade_documentacao.areas_criticas?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Áreas Críticas</h4>
                    <ul className="space-y-1">
                      {compliance.qualidade_documentacao.areas_criticas.map((area, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          {area}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {compliance.processing_time && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Processado em {compliance.processing_time}ms • 
              Gerado em {new Date(compliance.generated_at || '').toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
