/**
 * Componente de Alertas Fiscais
 * Mostra alertas importantes e notificações
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle,
  Clock,
  FileText,
  Calculator,
  Bell,
  X,
  Eye,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import { AlertaFiscal } from '@/types/dashboard-contadora.types'

interface AlertasFiscaisProps {
  alertas: AlertaFiscal[]
}

export function AlertasFiscais({ alertas }: AlertasFiscaisProps) {
  const [alertasVistos, setAlertasVistos] = useState<Set<string>>(new Set())
  const [alertaExpandido, setAlertaExpandido] = useState<string | null>(null)

  const marcarComoVisto = (alertaId: string) => {
    setAlertasVistos(prev => new Set([...prev, alertaId]))
  }

  const obterIconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'vencimento': return Clock
      case 'atraso': return AlertTriangle
      case 'documento': return FileText
      case 'calculo': return Calculator
      case 'sistema': return Bell
      default: return AlertTriangle
    }
  }

  const obterCorPrioridade = (prioridade: string) => {
    switch (prioridade) {
      case 'critica': return 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
      case 'alta': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
      case 'media': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      case 'baixa': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-800'
    }
  }

  const obterBadgePrioridade = (prioridade: string) => {
    switch (prioridade) {
      case 'critica': return 'bg-red-100 text-red-800'
      case 'alta': return 'bg-orange-100 text-orange-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'baixa': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatarDataVencimento = (data: string) => {
    const vencimento = new Date(data)
    const hoje = new Date()
    const diffTime = vencimento.getTime() - hoje.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return `Venceu há ${Math.abs(diffDays)} dia(s)`
    if (diffDays === 0) return 'Vence hoje'
    if (diffDays === 1) return 'Vence amanhã'
    return `Vence em ${diffDays} dia(s)`
  }

  if (alertas.length === 0) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Nenhum alerta no momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alertas.map((alerta) => {
        const IconeTipo = obterIconeTipo(alerta.tipo)
        const foiVisto = alertasVistos.has(alerta.id) || alerta.lido
        const expandido = alertaExpandido === alerta.id

        return (
          <Card
            key={alerta.id}
            className={`border-l-4 ${obterCorPrioridade(alerta.prioridade)} ${
              !foiVisto ? 'shadow-md' : ''
            } transition-all duration-200 border-gray-200 dark:border-gray-700`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Ícone do tipo de alerta */}
                <div className="flex-shrink-0 mt-1">
                  <IconeTipo className={`h-5 w-5 ${
                    alerta.prioridade === 'critica' ? 'text-red-600' :
                    alerta.prioridade === 'alta' ? 'text-orange-600' :
                    alerta.prioridade === 'media' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                </div>

                {/* Conteúdo principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className={`text-sm font-medium ${!foiVisto ? 'font-semibold' : ''} text-gray-900 dark:text-gray-100`}>
                        {alerta.titulo}
                      </h4>

                      {alerta.empresa_nome && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {alerta.empresa_nome}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <Badge className={obterBadgePrioridade(alerta.prioridade)}>
                        {alerta.prioridade}
                      </Badge>
                      
                      {!foiVisto && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {alerta.mensagem}
                  </p>

                  {/* Informações adicionais */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-4">
                      {alerta.data_vencimento && (
                        <span>{formatarDataVencimento(alerta.data_vencimento)}</span>
                      )}
                      
                      {alerta.valor && (
                        <span>R$ {alerta.valor.toLocaleString('pt-BR')}</span>
                      )}
                      
                      <span>
                        {new Date(alerta.data_criacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Ação sugerida (expandível) */}
                  {alerta.acao_sugerida && (
                    <div className="mb-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAlertaExpandido(expandido ? null : alerta.id)}
                        className="text-xs p-0 h-auto"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {expandido ? 'Ocultar' : 'Ver'} ação sugerida
                      </Button>
                      
                      {expandido && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border">
                          <p className="text-sm text-blue-800">
                            <strong>Ação sugerida:</strong> {alerta.acao_sugerida}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botões de ação */}
                  <div className="flex items-center gap-2">
                    {!foiVisto && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => marcarComoVisto(alerta.id)}
                        className="text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Marcar como visto
                      </Button>
                    )}
                    
                    {alerta.tipo === 'vencimento' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver obrigação
                      </Button>
                    )}
                    
                    {alerta.tipo === 'documento' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Ver documento
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
