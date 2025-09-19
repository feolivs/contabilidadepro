'use client'

import { Suspense } from 'react'
import { AlertTriangle, Calendar, Clock, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEstatisticasPrazos } from '@/hooks/use-prazos-fiscais'

// =====================================================
// SLOT DE ESTATÍSTICAS - PARALLEL ROUTE
// =====================================================

export default function StatsSlot() {
  return (
    <Suspense fallback={<StatsLoadingSkeleton />}>
      <StatsContent />
    </Suspense>
  )
}

// =====================================================
// COMPONENTE DE ESTATÍSTICAS
// =====================================================

function StatsContent() {
  // Conectar aos hooks reais
  const estatisticasQuery = useEstatisticasPrazos()
  const { data: estatisticas, isLoading, error } = estatisticasQuery

  // Tratamento de erro
  if (error) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="col-span-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Erro ao carregar estatísticas
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-muted rounded"></div>
                  <div className="h-8 w-12 bg-muted rounded"></div>
                </div>
                <div className="h-10 w-10 bg-muted rounded-lg"></div>
              </div>
              <div className="mt-2">
                <div className="h-6 w-16 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Usar dados reais ou fallback
  const stats = estatisticas || {
    total_prazos: 0,
    prazos_vencidos: 0,
    prazos_proximos: 0,
    prazos_futuros: 0,
    valor_total_estimado: 0,
    valor_vencido: 0,
    valor_proximo: 0,
    por_tipo: {}
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total de Prazos */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Prazos
              </p>
              <p className="text-2xl font-bold">
                {stats.total_prazos}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <Badge variant="secondary" className="text-xs">
              Ativos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Prazos Vencidos */}
      <Card className="relative overflow-hidden border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Vencidos
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.prazos_vencidos}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <Badge variant="destructive" className="text-xs">
              R$ {stats.valor_vencido.toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Prazos Próximos */}
      <Card className="relative overflow-hidden border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Próximos (7 dias)
              </p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.prazos_proximos}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700 dark:border-yellow-600 dark:text-yellow-300">
              R$ {stats.valor_proximo.toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Valor Total */}
      <Card className="relative overflow-hidden border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Valor Total
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                R$ {(stats.valor_total_estimado / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-2 flex items-center">
            <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
              Estimado
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =====================================================
// LOADING SKELETON
// =====================================================

function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-muted rounded mb-2 w-20"></div>
                <div className="h-8 bg-muted rounded w-12"></div>
              </div>
              <div className="w-10 h-10 bg-muted rounded-lg"></div>
            </div>
            <div className="mt-2">
              <div className="h-5 bg-muted rounded w-16"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
