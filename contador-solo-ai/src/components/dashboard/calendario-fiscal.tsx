/**
 * Componente de Calendário Fiscal
 * Mostra obrigações e vencimentos em formato de calendário
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle,
  DollarSign
} from 'lucide-react'
import { EventoCalendario } from '@/types/dashboard-contadora.types'

interface CalendarioFiscalProps {
  eventos: EventoCalendario[]
}

export function CalendarioFiscal({ eventos }: CalendarioFiscalProps) {
  const [mesAtual, setMesAtual] = useState(new Date())
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoCalendario | null>(null)

  const hoje = new Date()
  const primeiroDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
  const ultimoDiaMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0)
  const primeiroDiaCalendario = new Date(primeiroDiaMes)
  primeiroDiaCalendario.setDate(primeiroDiaCalendario.getDate() - primeiroDiaMes.getDay())

  const diasCalendario = []
  const dataAtual = new Date(primeiroDiaCalendario)

  // Gerar 42 dias (6 semanas) para o calendário
  for (let i = 0; i < 42; i++) {
    diasCalendario.push(new Date(dataAtual))
    dataAtual.setDate(dataAtual.getDate() + 1)
  }

  const navegarMes = (direcao: 'anterior' | 'proximo') => {
    const novoMes = new Date(mesAtual)
    if (direcao === 'anterior') {
      novoMes.setMonth(novoMes.getMonth() - 1)
    } else {
      novoMes.setMonth(novoMes.getMonth() + 1)
    }
    setMesAtual(novoMes)
  }

  const obterEventosDoDia = (data: Date) => {
    return eventos.filter(evento => {
      const dataEvento = new Date(evento.data)
      return dataEvento.toDateString() === data.toDateString()
    })
  }

  const obterCorPrioridade = (prioridade: string) => {
    switch (prioridade) {
      case 'critica': return 'bg-red-500'
      case 'alta': return 'bg-orange-500'
      case 'media': return 'bg-yellow-500'
      case 'baixa': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const obterIconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'obrigacao': return AlertTriangle
      case 'vencimento': return Clock
      case 'feriado': return Calendar
      default: return Calendar
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendário Principal */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendário Fiscal
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navegarMes('anterior')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold min-w-[200px] text-center">
                  {mesAtual.toLocaleDateString('pt-BR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navegarMes('proximo')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Clique em um dia para ver os detalhes das obrigações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
                <div key={dia} className="p-2 text-center text-sm font-medium text-gray-500">
                  {dia}
                </div>
              ))}
            </div>

            {/* Dias do calendário */}
            <div className="grid grid-cols-7 gap-1">
              {diasCalendario.map((data, index) => {
                const eventosDoDia = obterEventosDoDia(data)
                const ehMesAtual = data.getMonth() === mesAtual.getMonth()
                const ehHoje = data.toDateString() === hoje.toDateString()
                const temEventos = eventosDoDia.length > 0

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (temEventos && eventosDoDia[0]) {
                        setEventoSelecionado(eventosDoDia[0])
                      }
                    }}
                    className={`
                      relative p-2 h-20 text-left border rounded-lg transition-colors
                      ${ehMesAtual ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-gray-800'}
                      ${ehHoje ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/50' : ''}
                      ${temEventos ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <span className={`text-sm ${ehHoje ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {data.getDate()}
                    </span>
                    
                    {/* Indicadores de eventos */}
                    {eventosDoDia.length > 0 && (
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="flex flex-wrap gap-1">
                          {eventosDoDia.slice(0, 3).map((evento, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${obterCorPrioridade(evento.prioridade)}`}
                              title={evento.titulo}
                            />
                          ))}
                          {eventosDoDia.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{eventosDoDia.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Painel de Detalhes */}
      <div className="space-y-4">
        {/* Legenda */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">Crítica</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm">Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm">Média</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm">Baixa</span>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do Evento Selecionado */}
        {eventoSelecionado && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Detalhes do Evento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">{eventoSelecionado.titulo}</h4>
                <p className="text-sm text-gray-600">{eventoSelecionado.descricao}</p>
              </div>

              {eventoSelecionado.empresa_nome && (
                <div>
                  <span className="text-sm font-medium">Empresa:</span>
                  <p className="text-sm text-gray-600">{eventoSelecionado.empresa_nome}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Badge variant={
                  eventoSelecionado.prioridade === 'critica' ? 'destructive' :
                  eventoSelecionado.prioridade === 'alta' ? 'default' :
                  'secondary'
                }>
                  {eventoSelecionado.prioridade}
                </Badge>

                {eventoSelecionado.valor && (
                  <span className="text-sm font-medium">
                    R$ {eventoSelecionado.valor.toLocaleString('pt-BR')}
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500">
                {new Date(eventoSelecionado.data).toLocaleDateString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Próximos Eventos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Próximos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eventos
                .filter(evento => {
                  const dataEvento = new Date(evento.data)
                  const seteDias = new Date()
                  seteDias.setDate(seteDias.getDate() + 7)
                  return dataEvento >= hoje && dataEvento <= seteDias
                })
                .slice(0, 5)
                .map(evento => {
                  const IconeEvento = obterIconeTipo(evento.tipo)
                  return (
                    <div
                      key={evento.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setEventoSelecionado(evento)}
                    >
                      <IconeEvento className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{evento.titulo}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(evento.data).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${obterCorPrioridade(evento.prioridade)}`} />
                    </div>
                  )
                })}
              
              {eventos.filter(evento => {
                const dataEvento = new Date(evento.data)
                const seteDias = new Date()
                seteDias.setDate(seteDias.getDate() + 7)
                return dataEvento >= hoje && dataEvento <= seteDias
              }).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum evento nos próximos 7 dias
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
