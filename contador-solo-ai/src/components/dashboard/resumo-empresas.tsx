/**
 * Componente de Resumo de Empresas
 * Mostra informações consolidadas sobre as empresas clientes
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react'
import { ResumoEmpresas as ResumoEmpresasType } from '@/types/dashboard-contadora.types'

interface ResumoEmpresasProps {
  resumo: ResumoEmpresasType
}

export function ResumoEmpresas({ resumo }: ResumoEmpresasProps) {
  const percentualEmDia = resumo.total_ativas > 0 
    ? (resumo.em_dia / resumo.total_ativas) * 100 
    : 0

  const percentualComPendencias = resumo.total_ativas > 0 
    ? (resumo.com_pendencias / resumo.total_ativas) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Ativas</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{resumo.total_ativas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Em Dia</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resumo.em_dia}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Com Pendências</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{resumo.com_pendencias}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Inativas</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{resumo.inativas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Status das Empresas
          </CardTitle>
          <CardDescription>
            Distribuição do status de compliance das empresas ativas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Empresas em Dia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Empresas em Dia</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{resumo.em_dia}</span>
                <Badge className="bg-green-100 text-green-800">
                  {percentualEmDia.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <Progress value={percentualEmDia} className="h-2" />
            <p className="text-xs text-gray-500">
              Empresas sem obrigações pendentes ou vencidas
            </p>
          </div>

          {/* Empresas com Pendências */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Empresas com Pendências</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{resumo.com_pendencias}</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {percentualComPendencias.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <Progress value={percentualComPendencias} className="h-2" />
            <p className="text-xs text-gray-500">
              Empresas com obrigações próximas ao vencimento ou vencidas
            </p>
          </div>

          {/* Resumo Geral */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {percentualEmDia.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">Taxa de Compliance</p>
              </div>
              
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {resumo.total_ativas}
                </p>
                <p className="text-sm text-gray-600">Empresas Ativas</p>
              </div>
              
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {resumo.com_pendencias}
                </p>
                <p className="text-sm text-gray-600">Requerem Atenção</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Insights e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Insights baseados nos dados */}
          {percentualEmDia >= 90 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Excelente Compliance!</h4>
                  <p className="text-sm text-green-700">
                    {percentualEmDia.toFixed(1)}% das suas empresas estão em dia com as obrigações. 
                    Continue o ótimo trabalho!
                  </p>
                </div>
              </div>
            </div>
          )}

          {percentualComPendencias > 30 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Atenção Necessária</h4>
                  <p className="text-sm text-yellow-700">
                    {resumo.com_pendencias} empresas ({percentualComPendencias.toFixed(1)}%) 
                    possuem pendências. Considere priorizar o atendimento dessas empresas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {resumo.total_ativas === 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Comece Cadastrando Empresas</h4>
                  <p className="text-sm text-blue-700">
                    Você ainda não possui empresas cadastradas. 
                    Comece adicionando suas primeiras empresas clientes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recomendações gerais */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Próximas Ações Recomendadas:</h4>
            
            <div className="space-y-2">
              {resumo.com_pendencias > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>Revisar obrigações das {resumo.com_pendencias} empresas com pendências</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>Verificar documentos pendentes de processamento</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-gray-500" />
                <span>Acompanhar métricas de performance mensal</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
