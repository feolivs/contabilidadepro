'use client'

import { Suspense, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePrazos } from '@/hooks/use-prazos-fiscais'

// =====================================================
// SLOT DE CALENDÁRIO - PARALLEL ROUTE
// =====================================================

export default function CalendarSlot() {
  return (
    <Suspense fallback={<CalendarLoadingSkeleton />}>
      <CalendarContent />
    </Suspense>
  )
}

// =====================================================
// COMPONENTE DE CALENDÁRIO
// =====================================================

function CalendarContent() {
  const [mesAtual, setMesAtual] = useState(new Date().getMonth())
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear())
  const hoje = new Date()

  // Buscar prazos do mês atual
  const dataInicioMes = new Date(anoAtual, mesAtual, 1).toISOString().split('T')[0]
  const dataFimMes = new Date(anoAtual, mesAtual + 1, 0).toISOString().split('T')[0]

  const {
    prazos,
    isLoading,
    error
  } = usePrazos({
    filtros: {
      data_inicio: dataInicioMes,
      data_fim: dataFimMes
    },
    limite: 100,
    enabled: true
  })

  // Agrupar prazos por data
  const eventosDoMes = useMemo(() => {
    const eventos: Record<string, Array<{
      tipo: string;
      empresa: string;
      valor: number;
      status: 'pendente' | 'vencido' | 'pago' | 'processando';
      prioridade: 'alta' | 'media' | 'baixa';
      descricao: string;
      codigo?: string;
    }>> = {}

    prazos.forEach(prazo => {
      const data = prazo.due_date
      if (!eventos[data]) {
        eventos[data] = []
      }

      eventos[data].push({
        tipo: prazo.obligation_type,
        empresa: prazo.empresa?.nome || 'Empresa não informada',
        valor: prazo.estimated_amount || 0,
        status: prazo.status === 'entregue' ? 'pago' :
                prazo.status === 'vencida' ? 'vencido' : 'pendente',
        prioridade: prazo.priority === 'alta' ? 'alta' :
                    prazo.priority === 'baixa' ? 'baixa' : 'media',
        descricao: prazo.description || prazo.name,
        codigo: prazo.code
      })
    })

    return eventos
  }, [prazos])

  // Funções de navegação
  const navegarMesAnterior = () => {
    if (mesAtual === 0) {
      setMesAtual(11)
      setAnoAtual(anoAtual - 1)
    } else {
      setMesAtual(mesAtual - 1)
    }
  }

  const navegarProximoMes = () => {
    if (mesAtual === 11) {
      setMesAtual(0)
      setAnoAtual(anoAtual + 1)
    } else {
      setMesAtual(mesAtual + 1)
    }
  }

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Calcular dias do mês
  const primeiroDiaDoMes = new Date(anoAtual, mesAtual, 1)
  const ultimoDiaDoMes = new Date(anoAtual, mesAtual + 1, 0)
  const primeiroDiaSemana = primeiroDiaDoMes.getDay()
  const totalDias = ultimoDiaDoMes.getDate()

  const dias = []
  
  // Dias vazios do início
  for (let i = 0; i < primeiroDiaSemana; i++) {
    dias.push(null)
  }
  
  // Dias do mês
  for (let dia = 1; dia <= totalDias; dia++) {
    dias.push(dia)
  }

  // Estatísticas disponíveis para uso futuro
  // const totalEventos = Object.values(eventosDoMes).flat().length
  // const eventosPendentes = Object.values(eventosDoMes).flat().filter(e => e.status === 'pendente').length
  // const eventosVencidos = Object.values(eventosDoMes).flat().filter(e => e.status === 'vencido').length
  // const eventosPagos = Object.values(eventosDoMes).flat().filter(e => e.status === 'pago').length
  // const valorTotal = Object.values(eventosDoMes).flat().reduce((acc, e) => acc + e.valor, 0)
  // const valorPendente = Object.values(eventosDoMes).flat().filter(e => e.status === 'pendente').reduce((acc, e) => acc + e.valor, 0)

  return (
    <div className="p-6">
      {/* Header do Calendário - Clean */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-foreground">
          {nomesMeses[mesAtual]} {anoAtual}
        </h3>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={navegarMesAnterior}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={navegarProximoMes}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cabeçalho dos dias da semana - Clean */}
      <div className="grid grid-cols-7 gap-3 mb-4">
        {diasSemana.map((dia) => (
          <div key={dia} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {dia}
          </div>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="animate-pulse">
          <div className="grid grid-cols-7 gap-3">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Erro ao carregar eventos do calendário
          </p>
        </div>
      )}

      {/* Grid do calendário - Clean e profissional */}
      {!isLoading && !error && (
        <div className="grid grid-cols-7 gap-3">
          {dias.map((dia, index) => {
          if (!dia) {
            return <div key={index} className="h-24"></div>
          }

          const dataFormatada = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
          const eventos = eventosDoMes[dataFormatada] || []
          const isHoje = dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear()
          const temEventos = eventos.length > 0
          const temVencidos = eventos.some(e => e.status === 'vencido')
          const temPendentes = eventos.some(e => e.status === 'pendente')

          return (
            <div
              key={dia}
              className={cn(
                "h-24 flex flex-col items-center justify-start p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors",
                isHoje && "bg-primary text-primary-foreground font-semibold",
                temVencidos && !isHoje && "bg-red-50 border-red-200",
                temPendentes && !temVencidos && !isHoje && "bg-blue-50 border-blue-200",
                !temEventos && !isHoje && "bg-card hover:bg-accent/30"
              )}
            >
              <span className={cn(
                "text-sm font-medium mb-2",
                isHoje && "text-primary-foreground",
                !isHoje && "text-foreground"
              )}>
                {dia}
              </span>

              {temEventos && (
                <div className="flex flex-col items-center space-y-1">
                  {/* Indicadores simples */}
                  <div className="flex space-x-1">
                    {eventos.slice(0, 3).map((evento, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          evento.status === 'vencido' && "bg-red-500",
                          evento.status === 'pendente' && "bg-blue-500",
                          evento.status === 'pago' && "bg-green-500",
                          evento.status === 'processando' && "bg-yellow-500"
                        )}
                      />
                    ))}
                    {eventos.length > 3 && (
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                    )}
                  </div>

                  {/* Contador simples */}
                  <span className="text-xs text-muted-foreground">
                    {eventos.length}
                  </span>
                </div>
              )}
            </div>
          )
          })}
        </div>
      )}

    </div>
  )
}

// =====================================================
// LOADING SKELETON
// =====================================================

function CalendarLoadingSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 bg-muted rounded w-40"></div>
        <div className="flex space-x-2">
          <div className="h-9 w-9 bg-muted rounded"></div>
          <div className="h-9 w-9 bg-muted rounded"></div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-3">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="h-8 bg-muted rounded"></div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-3">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
