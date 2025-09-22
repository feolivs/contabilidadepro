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
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Lightbulb,
  BarChart3,
  RefreshCw,
  Zap,
  Star,
  Clock,
  DollarSign,
  Shield,
  Activity
} from 'lucide-react'

// Hooks
import { useAIInsights, useAIInsightsQuick } from '@/hooks/use-ai-insights'

/**
 * Props do componente AIInsightsPanel
 */
export interface AIInsightsPanelProps {
  empresaId: string
  className?: string
  variant?: 'full' | 'quick' | 'financial' | 'compliance'
  showRefresh?: boolean
}

/**
 * Componente para exibir insights de IA
 */
export function AIInsightsPanel({ 
  empresaId, 
  className = '',
  variant = 'quick',
  showRefresh = true
}: AIInsightsPanelProps) {
  const [forceRefresh, setForceRefresh] = useState(false)

  // Hook baseado na variante
  const useInsightsHook = variant === 'quick' ? useAIInsightsQuick : useAIInsights
  
  const {
    data: insights,
    isLoading,
    error,
    refetch
  } = variant === 'quick' 
    ? useAIInsightsQuick(empresaId, 'financeiro')
    : useAIInsights(empresaId, {
        insight_type: variant === 'financial' ? 'financeiro' : 
                     variant === 'compliance' ? 'compliance' : 'completo',
        force_refresh: forceRefresh,
        enabled: !!empresaId
      })

  const handleRefresh = async () => {
    setForceRefresh(true)
    await refetch()
    setForceRefresh(false)
  }

  // Loading state
  if (isLoading && !insights) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>Insights de IA</CardTitle>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
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
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle>Insights de IA</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar insights: {error.message}
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

  if (!insights) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle>Insights de IA</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum insight disponível</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle>Insights de IA</CardTitle>
            {insights.cached && (
              <Badge variant="secondary" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Cache
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {insights.confianca_analise && (
              <Badge variant="outline" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                {insights.confianca_analise}%
              </Badge>
            )}
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
          Análise inteligente baseada em {insights.tipo_insight} • 
          Gerado em {new Date(insights.generated_at || '').toLocaleString('pt-BR')}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
            <TabsTrigger value="projecoes">Projeções</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            {insights.resumo_executivo && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold">Pontos Principais</h4>
                </div>
                <ul className="space-y-2">
                  {insights.resumo_executivo.pontos_principais?.map((ponto, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      {ponto}
                    </li>
                  ))}
                </ul>

                {insights.resumo_executivo.score_geral && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Score Geral</span>
                      <span className="text-sm font-bold">{insights.resumo_executivo.score_geral}/100</span>
                    </div>
                    <Progress value={insights.resumo_executivo.score_geral} className="h-2" />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="financeiro" className="space-y-4">
            {insights.analise_financeira && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold">Análise Financeira</h4>
                  <Badge variant={
                    insights.analise_financeira.tendencia === 'positiva' ? 'default' :
                    insights.analise_financeira.tendencia === 'negativa' ? 'destructive' : 'secondary'
                  }>
                    {insights.analise_financeira.tendencia === 'positiva' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {insights.analise_financeira.tendencia === 'negativa' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {insights.analise_financeira.tendencia}
                  </Badge>
                </div>

                {insights.analise_financeira.pontos_atencao?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Pontos de Atenção</h5>
                    <ul className="space-y-1">
                      {insights.analise_financeira.pontos_atencao.map((ponto, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          {ponto}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.analise_financeira.oportunidades?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Oportunidades</h5>
                    <ul className="space-y-1">
                      {insights.analise_financeira.oportunidades.map((oportunidade, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          {oportunidade}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="alertas" className="space-y-4">
            {insights.alertas_prioritarios && insights.alertas_prioritarios.length > 0 ? (
              <div className="space-y-3">
                {insights.alertas_prioritarios.map((alerta, index) => (
                  <Alert key={index} className={
                    alerta.tipo === 'critico' ? 'border-red-200 bg-red-50' :
                    alerta.tipo === 'importante' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }>
                    <AlertTriangle className={`h-4 w-4 ${
                      alerta.tipo === 'critico' ? 'text-red-600' :
                      alerta.tipo === 'importante' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">{alerta.mensagem}</p>
                        <p className="text-sm text-muted-foreground">{alerta.acao_recomendada}</p>
                        {alerta.prazo_acao && (
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            Prazo: {alerta.prazo_acao}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta prioritário</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="projecoes" className="space-y-4">
            {insights.projecoes_estrategicas && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <h4 className="font-semibold">Projeções Estratégicas</h4>
                </div>

                {insights.projecoes_estrategicas.recomendacoes_crescimento?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Recomendações de Crescimento</h5>
                    <ul className="space-y-1">
                      {insights.projecoes_estrategicas.recomendacoes_crescimento.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Zap className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insights.projecoes_estrategicas.riscos_futuros?.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Riscos Futuros</h5>
                    <ul className="space-y-1">
                      {insights.projecoes_estrategicas.riscos_futuros.map((risco, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Shield className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          {risco}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {insights.limitacoes && insights.limitacoes.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Limitações:</strong> {insights.limitacoes.join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
