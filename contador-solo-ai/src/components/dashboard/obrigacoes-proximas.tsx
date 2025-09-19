/**
 * Componente de Obrigações Próximas
 * Lista obrigações fiscais com vencimentos próximos
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  AlertTriangle,
  Clock,
  Building2,
  DollarSign,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'
import { ObrigacaoFiscal } from '@/types/dashboard-contadora.types'

interface ObrigacoesProximasProps {
  obrigacoes: ObrigacaoFiscal[]
}

export function ObrigacoesProximas({ obrigacoes }: ObrigacoesProximasProps) {
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todos')
  const [obrigacaoSelecionada, setObrigacaoSelecionada] = useState<ObrigacaoFiscal | null>(null)

  const hoje = new Date()

  // Filtrar obrigações
  const obrigacoesFiltradas = obrigacoes.filter(obrigacao => {
    const matchTexto = !filtroTexto || 
      obrigacao.tipo_obrigacao.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      obrigacao.empresa_nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
      obrigacao.nome.toLowerCase().includes(filtroTexto.toLowerCase())

    const matchStatus = filtroStatus === 'todos' || obrigacao.status === filtroStatus
    const matchPrioridade = filtroPrioridade === 'todos' || obrigacao.prioridade === filtroPrioridade

    return matchTexto && matchStatus && matchPrioridade
  })

  // Agrupar por situação
  const obrigacoesVencidas = obrigacoesFiltradas.filter(o => o.situacao === 'vencida')
  const obrigacoesProximas = obrigacoesFiltradas.filter(o => o.situacao === 'proxima')
  const obrigacoesFuturas = obrigacoesFiltradas.filter(o => o.situacao === 'futura')

  const calcularDiasParaVencimento = (dataVencimento: string) => {
    const vencimento = new Date(dataVencimento)
    const diffTime = vencimento.getTime() - hoje.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const obterCorStatus = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-100 text-yellow-800'
      case 'entregue': return 'bg-green-100 text-green-800'
      case 'vencida': return 'bg-red-100 text-red-800'
      case 'nao_se_aplica': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const obterCorPrioridade = (prioridade: string) => {
    switch (prioridade) {
      case 'critica': return 'border-l-red-500'
      case 'alta': return 'border-l-orange-500'
      case 'media': return 'border-l-yellow-500'
      case 'baixa': return 'border-l-blue-500'
      default: return 'border-l-gray-500'
    }
  }

  const ObrigacaoCard = ({ obrigacao }: { obrigacao: ObrigacaoFiscal }) => {
    const diasParaVencimento = calcularDiasParaVencimento(obrigacao.data_vencimento)

    return (
      <Card className={`border-l-4 ${obterCorPrioridade(obrigacao.prioridade)} hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{obrigacao.tipo_obrigacao}</h4>
                <Badge className={obterCorStatus(obrigacao.status)}>
                  {obrigacao.status}
                </Badge>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{obrigacao.nome}</p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  <span>{obrigacao.empresa_nome}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(obrigacao.data_vencimento).toLocaleDateString('pt-BR')}</span>
                </div>

                {obrigacao.valor && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span>R$ {obrigacao.valor.toLocaleString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className={`text-xs px-2 py-1 rounded-full ${
                diasParaVencimento < 0 ? 'bg-red-100 text-red-800' :
                diasParaVencimento === 0 ? 'bg-orange-100 text-orange-800' :
                diasParaVencimento <= 7 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {diasParaVencimento < 0 ? `${Math.abs(diasParaVencimento)} dias atrás` :
                 diasParaVencimento === 0 ? 'Vence hoje' :
                 `${diasParaVencimento} dias`}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setObrigacaoSelecionada(obrigacao)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar obrigação ou empresa..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="nao_se_aplica">Não se aplica</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as prioridades</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">{obrigacoesVencidas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Próximas (7 dias)</p>
                <p className="text-2xl font-bold text-yellow-600">{obrigacoesProximas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Futuras</p>
                <p className="text-2xl font-bold text-green-600">{obrigacoesFuturas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Obrigações */}
      <div className="space-y-6">
        {/* Vencidas */}
        {obrigacoesVencidas.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Obrigações Vencidas ({obrigacoesVencidas.length})
            </h3>
            <div className="space-y-3">
              {obrigacoesVencidas.map(obrigacao => (
                <ObrigacaoCard key={obrigacao.id} obrigacao={obrigacao} />
              ))}
            </div>
          </div>
        )}

        {/* Próximas */}
        {obrigacoesProximas.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-yellow-600 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Vencimentos Próximos ({obrigacoesProximas.length})
            </h3>
            <div className="space-y-3">
              {obrigacoesProximas.map(obrigacao => (
                <ObrigacaoCard key={obrigacao.id} obrigacao={obrigacao} />
              ))}
            </div>
          </div>
        )}

        {/* Futuras */}
        {obrigacoesFuturas.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-600 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Próximas Obrigações ({obrigacoesFuturas.length})
            </h3>
            <div className="space-y-3">
              {obrigacoesFuturas.slice(0, 10).map(obrigacao => (
                <ObrigacaoCard key={obrigacao.id} obrigacao={obrigacao} />
              ))}
              {obrigacoesFuturas.length > 10 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  E mais {obrigacoesFuturas.length - 10} obrigações...
                </p>
              )}
            </div>
          </div>
        )}

        {obrigacoesFiltradas.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma obrigação encontrada
              </h3>
              <p className="text-gray-600">
                Não há obrigações que correspondam aos filtros selecionados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Detalhes (simplificado) */}
      {obrigacaoSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{obrigacaoSelecionada.tipo_obrigacao}</CardTitle>
              <CardDescription>{obrigacaoSelecionada.empresa_nome}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Descrição</h4>
                <p className="text-sm text-gray-600">{obrigacaoSelecionada.descricao || obrigacaoSelecionada.nome}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-1">Vencimento</h4>
                  <p className="text-sm">{new Date(obrigacaoSelecionada.data_vencimento).toLocaleDateString('pt-BR')}</p>
                </div>
                
                {obrigacaoSelecionada.valor && (
                  <div>
                    <h4 className="font-medium mb-1">Valor</h4>
                    <p className="text-sm">R$ {obrigacaoSelecionada.valor.toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <Badge className={obterCorStatus(obrigacaoSelecionada.status)}>
                  {obrigacaoSelecionada.status}
                </Badge>
                <Badge variant="outline">
                  {obrigacaoSelecionada.prioridade}
                </Badge>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => setObrigacaoSelecionada(null)}
              >
                Fechar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
