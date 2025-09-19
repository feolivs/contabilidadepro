/**
 * Componente de Atividades Recentes
 * Mostra as últimas atividades realizadas no sistema
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator,
  FileText,
  Building2,
  Clock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity
} from 'lucide-react'
import { AtividadeRecente } from '@/types/dashboard-contadora.types'

interface AtividadesRecentesProps {
  atividades: AtividadeRecente[]
}

export function AtividadesRecentes({ atividades }: AtividadesRecentesProps) {
  const obterIcone = (tipo: string) => {
    switch (tipo) {
      case 'calculo': return Calculator
      case 'documento': return FileText
      case 'obrigacao': return Clock
      case 'empresa': return Building2
      default: return Activity
    }
  }

  const obterCorStatus = (status: string) => {
    switch (status) {
      case 'pago':
      case 'processado':
      case 'entregue':
      case 'concluido':
        return 'bg-green-100 text-green-800'
      case 'pendente':
      case 'processando':
        return 'bg-yellow-100 text-yellow-800'
      case 'erro':
      case 'vencida':
      case 'cancelado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const obterIconeStatus = (status: string) => {
    switch (status) {
      case 'pago':
      case 'processado':
      case 'entregue':
      case 'concluido':
        return CheckCircle
      case 'pendente':
      case 'processando':
        return Clock
      case 'erro':
      case 'vencida':
      case 'cancelado':
        return XCircle
      default:
        return AlertTriangle
    }
  }

  const formatarTempo = (data: string) => {
    const agora = new Date()
    const dataAtividade = new Date(data)
    const diffMs = agora.getTime() - dataAtividade.getTime()
    const diffMinutos = Math.floor(diffMs / (1000 * 60))
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutos < 1) return 'Agora'
    if (diffMinutos < 60) return `${diffMinutos}min atrás`
    if (diffHoras < 24) return `${diffHoras}h atrás`
    if (diffDias < 7) return `${diffDias}d atrás`
    return dataAtividade.toLocaleDateString('pt-BR')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Atividades Recentes
        </CardTitle>
        <CardDescription>
          Últimas atividades realizadas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {atividades.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Nenhuma atividade recente
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              As atividades aparecerão aqui conforme você usar o sistema.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {atividades.map((atividade) => {
              const IconeAtividade = obterIcone(atividade.tipo)
              const IconeStatus = obterIconeStatus(atividade.status)
              
              return (
                <div
                  key={atividade.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* Ícone da atividade */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <IconeAtividade className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>

                  {/* Conteúdo principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {atividade.descricao}
                        </h4>

                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <Building2 className="h-3 w-3" />
                          <span>{atividade.empresa_nome}</span>

                          {atividade.valor && (
                            <>
                              <span>•</span>
                              <DollarSign className="h-3 w-3" />
                              <span>R$ {atividade.valor.toLocaleString('pt-BR')}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge className={obterCorStatus(atividade.status)}>
                            <IconeStatus className="h-3 w-3 mr-1" />
                            {atividade.status}
                          </Badge>

                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatarTempo(atividade.data)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
