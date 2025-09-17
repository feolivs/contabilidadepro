'use client'

import {
  ContextDataIA,
  EmpresaContextData
} from '@/types/structured-data.types'

interface EmpresaInsights {
  carga_tributaria_media: number;
  score_conformidade: number;
  tendencia_faturamento: 'crescimento' | 'declinio' | 'estavel';
  obrigacoes_criticas: number;
  economia_potencial: number;
  alertas_importantes: string[];
}

interface ContextData extends ContextDataIA {
  empresas?: EmpresaContextData[];
  empresa?: EmpresaContextData & {
    insights?: EmpresaInsights;
  };
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2, 
  Calculator, 
  Calendar, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,

  Sparkles,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContextInfoPanelProps {
  isEnhanced: boolean
  selectedEmpresa?: string | null
  contextData?: Record<string, unknown> | null
  onClearCache?: () => void
  cacheStats?: { size: number; keys: string[] }
}

export function ContextInfoPanel({ 
  isEnhanced, 
  selectedEmpresa, 
  contextData,
  onClearCache,
  cacheStats 
}: ContextInfoPanelProps) {
  if (!isEnhanced) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Modo Contexto Rico desativado</p>
            <p className="text-xs">Ative para análises contextuais avançadas</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status do Contexto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Status do Contexto Rico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Modo Ativo</span>
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Empresa Selecionada</span>
            <Badge variant={selectedEmpresa ? "default" : "outline"} className="text-xs">
              {selectedEmpresa ? "Específica" : "Todas"}
            </Badge>
          </div>

          {cacheStats && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cache</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {cacheStats.size} entradas
                </Badge>
                {onClearCache && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClearCache}
                    className="h-6 px-2 text-xs"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dados Contextuais Carregados */}
      {contextData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              Dados Contextuais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Boolean(contextData?.empresa && typeof contextData.empresa === 'object' && contextData.empresa !== null) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">Empresa em Foco</span>
                </div>
                <div className="pl-5 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {(contextData as unknown as ContextDataIA).empresa?.nome}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {(contextData as unknown as ContextDataIA).empresa?.regime_tributario}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {(contextData as unknown as ContextDataIA).empresa?.situacao_fiscal}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {(() => {
              const empresa = (contextData as unknown as ContextDataIA).empresa;
              const calculosRecentes = empresa?.calculos_recentes;
              return calculosRecentes && Array.isArray(calculosRecentes) && calculosRecentes.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-3 w-3 text-green-500" />
                    <span className="text-xs font-medium">Cálculos Recentes</span>
                    <Badge variant="secondary" className="text-xs">
                      {calculosRecentes.length}
                    </Badge>
                  </div>
                  <div className="pl-5">
                    <p className="text-xs text-muted-foreground">
                      Último: {calculosRecentes[0]?.tipo} -
                      R$ {calculosRecentes[0]?.valor?.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ) : null;
            })()}

            {(() => {
              const empresa = (contextData as unknown as ContextDataIA).empresa;
              const prazosProximos = empresa?.prazos_proximos;
              return prazosProximos && Array.isArray(prazosProximos) && prazosProximos.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-orange-500" />
                    <span className="text-xs font-medium">Prazos Próximos</span>
                    <Badge variant="secondary" className="text-xs">
                      {prazosProximos.length}
                    </Badge>
                  </div>
                  <div className="pl-5">
                    {prazosProximos.slice(0, 2).map((prazo, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">
                          {prazo.descricao}
                        </span>
                        <Badge
                          variant={prazo.status === 'vencido' ? 'destructive' : 'outline'}
                          className="text-xs ml-2"
                        >
                          {prazo.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {(() => {
              const empresa = (contextData as unknown as ContextDataIA).empresa;
              const documentosPendentes = empresa?.documentos_pendentes;
              return documentosPendentes && Array.isArray(documentosPendentes) && documentosPendentes.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3 text-purple-500" />
                    <span className="text-xs font-medium">Documentos Pendentes</span>
                    <Badge variant="secondary" className="text-xs">
                      {documentosPendentes.length}
                    </Badge>
                  </div>
                </div>
              ) : null;
            })()}

            {(() => {
              const empresas = contextData?.empresas;
              return empresas && Array.isArray(empresas) ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-blue-500" />
                    <span className="text-xs font-medium">Empresas do Usuário</span>
                    <Badge variant="secondary" className="text-xs">
                      {empresas.length || 0}
                    </Badge>
                  </div>
                  <div className="pl-5">
                    <p className="text-xs text-muted-foreground">
                      Análise contextual de todas as empresas ativas
                    </p>
                  </div>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>
      )}

      {/* Insights Automáticos */}
      {(() => {
        const empresa = (contextData as unknown as ContextDataIA).empresa;
        const insights = (empresa as any)?.insights;
        return insights ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Insights Automáticos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Carga Tributária</p>
                  <p className="text-sm font-medium">
                    {insights.carga_tributaria_media?.toFixed(1) || 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Conformidade</p>
                  <p className="text-sm font-medium">
                    {insights.score_conformidade || 0}/100
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    insights.tendencia_faturamento === 'crescimento' ? 'bg-green-500' :
                    insights.tendencia_faturamento === 'declinio' ? 'bg-red-500' : 'bg-yellow-500'
                  )} />
                  <span className="text-xs">
                    Tendência: {insights.tendencia_faturamento || 'estável'}
                  </span>
                </div>

                {insights.obrigacoes_criticas && insights.obrigacoes_criticas > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">
                      {insights.obrigacoes_criticas} obrigação(ões) crítica(s)
                    </span>
                  </div>
                )}

                {insights.economia_potencial && insights.economia_potencial > 0 && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">
                      Economia potencial: R$ {insights.economia_potencial.toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>

              {insights.alertas_importantes && Array.isArray(insights.alertas_importantes) && insights.alertas_importantes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Alertas Importantes:</p>
                  {insights.alertas_importantes.slice(0, 2).map((alerta: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">{alerta}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Dicas de Uso */}
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium">Dicas de Uso</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 pl-5">
              <li>• Pergunte sobre empresas específicas</li>
              <li>• Solicite análises de tendências</li>
              <li>• Peça sugestões de otimização</li>
              <li>• Consulte sobre obrigações pendentes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
