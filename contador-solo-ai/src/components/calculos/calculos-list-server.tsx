'use client'

import { useState, useTransition } from 'react'
import { marcarComoPagoAction, excluirCalculoAction, recalcularAction } from '@/lib/actions/calculo-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  MoreHorizontal, 
  CheckCircle, 
  Trash2, 
  RefreshCw, 
  Calendar,
  TrendingUp,
  Building2,
  Calculator,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { CalculoFiscal } from '@/types/calculo'

interface CalculosListServerProps {
  calculos: CalculoFiscal[]
  onUpdate?: () => void
}

export function CalculosListServer({ calculos, onUpdate }: CalculosListServerProps) {
  const [isPending, startTransition] = useTransition()
  const [showPagoDialog, setShowPagoDialog] = useState<string | null>(null)
  const [showExcluirDialog, setShowExcluirDialog] = useState<string | null>(null)
  const [dataPagamento, setDataPagamento] = useState('')
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({})

  const handleMarcarComoPago = async (calculoId: string) => {
    if (!dataPagamento) {
      toast.error('Selecione a data de pagamento')
      return
    }

    setLoadingActions(prev => ({ ...prev, [calculoId]: true }))

    startTransition(async () => {
      try {
        const result = await marcarComoPagoAction(calculoId, dataPagamento)
        
        if (result.success) {
          toast.success('Cálculo marcado como pago!')
          setShowPagoDialog(null)
          setDataPagamento('')
          onUpdate?.()
        } else {
          toast.error(result.error || 'Erro ao marcar como pago')
        }
      } catch (error) {
        toast.error('Erro inesperado ao marcar como pago')
      } finally {
        setLoadingActions(prev => ({ ...prev, [calculoId]: false }))
      }
    })
  }

  const handleExcluir = async (calculoId: string) => {
    setLoadingActions(prev => ({ ...prev, [calculoId]: true }))

    startTransition(async () => {
      try {
        const result = await excluirCalculoAction(calculoId)
        
        if (result.success) {
          toast.success('Cálculo excluído com sucesso!')
          setShowExcluirDialog(null)
          onUpdate?.()
        } else {
          toast.error(result.error || 'Erro ao excluir cálculo')
        }
      } catch (error) {
        toast.error('Erro inesperado ao excluir cálculo')
      } finally {
        setLoadingActions(prev => ({ ...prev, [calculoId]: false }))
      }
    })
  }

  const handleRecalcular = async (calculoId: string) => {
    setLoadingActions(prev => ({ ...prev, [calculoId]: true }))

    startTransition(async () => {
      try {
        const result = await recalcularAction(calculoId)
        
        if (result.success) {
          toast.success('Cálculo recalculado com sucesso!')
          onUpdate?.()
        } else {
          toast.error(result.error || 'Erro ao recalcular')
        }
      } catch (error) {
        toast.error('Erro inesperado ao recalcular')
      } finally {
        setLoadingActions(prev => ({ ...prev, [calculoId]: false }))
      }
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'calculado':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Calculado</Badge>
      case 'pago':
        return <Badge variant="outline" className="text-green-600 border-green-600">Pago</Badge>
      case 'vencido':
        return <Badge variant="destructive">Vencido</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'DAS':
        return <Calculator className="h-4 w-4" />
      case 'IRPJ':
        return <Building2 className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  if (calculos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum cálculo encontrado</h3>
          <p className="text-muted-foreground text-center">
            Comece criando um novo cálculo fiscal para sua empresa.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {calculos.map((calculo) => (
        <Card key={calculo.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {getTipoIcon(calculo.tipo_calculo)}
                {calculo.tipo_calculo} - {calculo.competencia}
              </CardTitle>
              <div className="flex items-center gap-2">
                {getStatusBadge(calculo.status)}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={loadingActions[calculo.id] || isPending}
                    >
                      {loadingActions[calculo.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {calculo.status !== 'pago' && (
                      <DropdownMenuItem 
                        onClick={() => setShowPagoDialog(calculo.id)}
                        className="text-green-600"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marcar como Pago
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => handleRecalcular(calculo.id)}
                      disabled={loadingActions[calculo.id]}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Recalcular
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowExcluirDialog(calculo.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Valores Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-xl font-bold">{formatCurrency(calculo.valor_total)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alíquota Efetiva</p>
                <p className="font-semibold">{calculo.aliquota_efetiva.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencimento</p>
                <p className="font-semibold flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(calculo.data_vencimento).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Regime</p>
                <p className="font-semibold">{calculo.regime_tributario}</p>
              </div>
            </div>

            <Separator />

            {/* Detalhamento dos Impostos */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Detalhamento dos Impostos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(calculo.irpj ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IRPJ:</span>
                    <span className="font-medium">{formatCurrency(calculo.irpj ?? 0)}</span>
                  </div>
                )}
                {(calculo.csll ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CSLL:</span>
                    <span className="font-medium">{formatCurrency(calculo.csll ?? 0)}</span>
                  </div>
                )}
                {(calculo.pis ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PIS:</span>
                    <span className="font-medium">{formatCurrency(calculo.pis ?? 0)}</span>
                  </div>
                )}
                {(calculo.cofins ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">COFINS:</span>
                    <span className="font-medium">{formatCurrency(calculo.cofins ?? 0)}</span>
                  </div>
                )}
                {(calculo.cpp ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPP:</span>
                    <span className="font-medium">{formatCurrency(calculo.cpp ?? 0)}</span>
                  </div>
                )}
                {(calculo.icms ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ICMS:</span>
                    <span className="font-medium">{formatCurrency(calculo.icms ?? 0)}</span>
                  </div>
                )}
                {(calculo.iss ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ISS:</span>
                    <span className="font-medium">{formatCurrency(calculo.iss ?? 0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Data de Pagamento */}
            {calculo.data_pagamento && (
              <div className="text-sm text-green-600">
                <strong>Pago em:</strong> {new Date(calculo.data_pagamento).toLocaleDateString('pt-BR')}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Dialog para marcar como pago */}
      <AlertDialog open={!!showPagoDialog} onOpenChange={() => setShowPagoDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Pago</AlertDialogTitle>
            <AlertDialogDescription>
              Informe a data em que o pagamento foi realizado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="data_pagamento">Data do Pagamento</Label>
            <Input
              id="data_pagamento"
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => showPagoDialog && handleMarcarComoPago(showPagoDialog)}
              disabled={!dataPagamento || loadingActions[showPagoDialog || '']}
            >
              {loadingActions[showPagoDialog || ''] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para confirmar exclusão */}
      <AlertDialog open={!!showExcluirDialog} onOpenChange={() => setShowExcluirDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cálculo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cálculo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => showExcluirDialog && handleExcluir(showExcluirDialog)}
              disabled={loadingActions[showExcluirDialog || '']}
              className="bg-red-600 hover:bg-red-700"
            >
              {loadingActions[showExcluirDialog || ''] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
