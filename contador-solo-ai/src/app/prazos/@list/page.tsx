'use client'

import { Suspense } from 'react'
import { Calendar, AlertTriangle, CheckCircle, Clock, Filter, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePrazos } from '@/hooks/use-prazos-fiscais'
import { useState } from 'react'

// =====================================================
// SLOT DE LISTA - PARALLEL ROUTE
// =====================================================

export default function ListSlot() {
  return (
    <Suspense fallback={<ListLoadingSkeleton />}>
      <ListContent />
    </Suspense>
  )
}

// =====================================================
// COMPONENTE DE LISTA
// =====================================================

function ListContent() {
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos-tipos')
  const [busca, setBusca] = useState<string>('')

  // Conectar aos hooks reais
  const {
    prazos,
    isLoading,
    error,
    total: _total
  } = usePrazos({
    filtros: {
      status: filtroStatus === 'todos' ? undefined : [filtroStatus as any],
      tipo_obrigacao: filtroTipo === 'todos-tipos' ? undefined : [filtroTipo as any],
      search: busca || undefined
    },
    ordenacao: { campo: 'due_date', direcao: 'asc' },
    limite: 50,
    enabled: true
  })

  // Tratamento de erro
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar prazos</h3>
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar os prazos fiscais. Tente novamente.
          </p>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  // Mapear dados para formato compatível com a interface existente
  const prazosFormatados = prazos.map(prazo => ({
    id: prazo.id,
    nome: prazo.name,
    empresa: prazo.empresa?.nome || 'Empresa não informada',
    tipo: prazo.obligation_type,
    dataVencimento: prazo.due_date,
    valor: prazo.estimated_amount || 0,
    status: prazo.status,
    prioridade: prazo.priority,
    diasRestantes: prazo.dias_para_vencimento || 0
  }))

  return (
    <div className="h-full flex flex-col">
      {/* Filtros */}
      <div className="p-4 border-b bg-background">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar prazos..."
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="completed">Entregues</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos-tipos">Tipos</SelectItem>
                <SelectItem value="DAS">DAS</SelectItem>
                <SelectItem value="GPS">GPS</SelectItem>
                <SelectItem value="FGTS">FGTS</SelectItem>
                <SelectItem value="DCTF">DCTF</SelectItem>
                <SelectItem value="ECF">ECF</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Prazos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <div className="h-6 w-16 bg-muted rounded"></div>
                        <div className="h-6 w-20 bg-muted rounded"></div>
                      </div>
                      <div className="h-5 w-3/4 bg-muted rounded"></div>
                      <div className="h-4 w-1/2 bg-muted rounded"></div>
                    </div>
                    <div className="h-16 w-20 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Lista de Prazos */}
        {!isLoading && prazosFormatados.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum prazo encontrado</h3>
            <p className="text-muted-foreground">
              {busca || filtroStatus !== 'todos' || filtroTipo !== 'todos-tipos'
                ? 'Tente ajustar os filtros para ver mais resultados.'
                : 'Não há prazos fiscais cadastrados no momento.'
              }
            </p>
          </div>
        )}

        {!isLoading && prazosFormatados.map((prazo) => (
          <Card key={prazo.id} className="hover:shadow-md transition-shadow cursor-pointer overflow-visible">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badges em linha separada com mais espaço */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge
                      variant={
                        prazo.tipo === 'DAS' ? 'default' :
                        prazo.tipo === 'GPS' ? 'secondary' :
                        prazo.tipo === 'FGTS' ? 'outline' :
                        'default'
                      }
                      className="text-xs px-3 py-1.5 font-medium"
                    >
                      {prazo.tipo}
                    </Badge>

                    <Badge
                      variant={
                        prazo.status === 'vencida' ? 'destructive' :
                        prazo.status === 'entregue' ? 'default' :
                        'secondary'
                      }
                      className="text-xs px-3 py-1.5 font-medium inline-flex items-center gap-1"
                    >
                      {prazo.status === 'pendente' && <Clock className="h-3 w-3" />}
                      {prazo.status === 'vencida' && <AlertTriangle className="h-3 w-3" />}
                      {prazo.status === 'entregue' && <CheckCircle className="h-3 w-3" />}
                      {prazo.status === 'pendente' ? 'Pendente' :
                       prazo.status === 'vencida' ? 'Vencida' :
                       'Entregue'}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-foreground mb-1 truncate">
                    {prazo.nome}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-2 truncate">
                    {prazo.empresa}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(prazo.dataVencimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {prazo.diasRestantes > 0 && (
                      <span className="text-yellow-600 font-medium">
                        {prazo.diasRestantes} dias restantes
                      </span>
                    )}

                    {prazo.diasRestantes < 0 && (
                      <span className="text-red-600 font-medium">
                        Vencido há {Math.abs(prazo.diasRestantes)} dias
                      </span>
                    )}

                    {prazo.diasRestantes === 0 && (
                      <span className="text-orange-600 font-medium">
                        Vence hoje!
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {prazo.valor > 0 && (
                    <p className="text-lg font-semibold text-foreground mb-2">
                      R$ {prazo.valor.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-1">
                    <Button variant="outline" size="sm" className="text-xs">
                      Ver
                    </Button>
                    {prazo.status === 'pendente' && (
                      <Button size="sm" className="text-xs">
                        Marcar como Pago
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer com resumo */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{prazos.length} prazos encontrados</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>{prazos.filter(p => p.status === 'vencida').length} vencidos</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{prazos.filter(p => p.status === 'pendente').length} pendentes</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{prazos.filter(p => p.status === 'entregue').length} entregues</span>
            </span>
          </div>
        </div>
      </div>

      {/* Indicador de carregamento */}
      <div className="absolute top-2 right-2">
        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
      </div>
    </div>
  )
}

// =====================================================
// LOADING SKELETON
// =====================================================

function ListLoadingSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Filters Skeleton */}
      <div className="p-4 border-b border-border bg-card animate-pulse">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="h-10 bg-muted rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 bg-muted rounded"></div>
            <div className="h-10 w-24 bg-muted rounded"></div>
            <div className="h-10 w-10 bg-muted rounded"></div>
          </div>
        </div>
      </div>

      {/* List Items Skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex space-x-2 mb-2">
                    <div className="h-5 bg-muted rounded w-12"></div>
                    <div className="h-5 bg-muted rounded w-16"></div>
                  </div>
                  <div className="h-5 bg-muted rounded w-48 mb-1"></div>
                  <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-40"></div>
                </div>
                <div className="text-right">
                  <div className="h-6 bg-muted rounded w-20 mb-2"></div>
                  <div className="flex space-x-1">
                    <div className="h-8 bg-muted rounded w-12"></div>
                    <div className="h-8 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="p-4 border-t border-border bg-card animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="flex space-x-4">
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-20"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
