'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Download,
  Filter,
  Search,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  Eye,
  Brain,
  Lightbulb,
  AlertTriangle,
  Target
} from 'lucide-react'
import { useGerarRelatorioConsolidado, useDownloadPDF } from '@/hooks/use-relatorios'
import {
  useDashboardStatsInteligentes,
  useRelatorioInteligente,
  useAnaliseAnomalias
} from '@/hooks/use-relatorios-inteligentes'
import { useAuth } from '@/providers/auth-provider'
import { toast } from 'sonner'

interface RelatorioData {
  id: string
  tipo_calculo: string
  competencia: string
  valor_total: number
  status: string
  data_vencimento: string
  created_at: string
  empresa: {
    nome: string
    cnpj: string
    regime_tributario: string
  }
}

interface RelatoriosContentProps {
  relatoriosIniciais: RelatorioData[]
}

export function RelatoriosContent({ relatoriosIniciais }: RelatoriosContentProps) {
  const { user } = useAuth()
  const [relatorios] = useState<RelatorioData[]>(relatoriosIniciais)
  const [filtros, setFiltros] = useState({
    busca: '',
    tipo_calculo: 'todos',
    status: 'todos',
    periodo: '30'
  })

  // Hooks para dados inteligentes
  const { data: statsInteligentes, isLoading: loadingStats } = useDashboardStatsInteligentes(30)
  const { data: alertasCompliance } = useAnaliseAnomalias()
  const gerarRelatorioInteligente = useRelatorioInteligente()

  const gerarRelatorio = useGerarRelatorioConsolidado()
  const { downloadPDF } = useDownloadPDF()

  // Filtrar relatórios
  const relatoriosFiltrados = useMemo(() => {
    return relatorios.filter(relatorio => {
      const matchBusca = !filtros.busca || 
        relatorio.empresa.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
        relatorio.empresa.cnpj.includes(filtros.busca) ||
        relatorio.tipo_calculo.toLowerCase().includes(filtros.busca.toLowerCase())

      const matchTipo = filtros.tipo_calculo === 'todos' || 
        relatorio.tipo_calculo === filtros.tipo_calculo

      const matchStatus = filtros.status === 'todos' || 
        relatorio.status === filtros.status

      const matchPeriodo = (() => {
        if (filtros.periodo === 'todos') return true
        const dias = parseInt(filtros.periodo)
        const dataLimite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
        return new Date(relatorio.created_at) >= dataLimite
      })()

      return matchBusca && matchTipo && matchStatus && matchPeriodo
    })
  }, [relatorios, filtros])

  const handleGerarRelatorio = async (formato: 'PDF' | 'EXCEL') => {
    try {
      const dataInicio = new Date(Date.now() - parseInt(filtros.periodo) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]
      const dataFim = new Date().toISOString().split('T')[0]

      await gerarRelatorio.mutateAsync({
        data_inicio: dataInicio || '',
        data_fim: dataFim || '',
        tipos_calculo: filtros.tipo_calculo !== 'todos' ? [filtros.tipo_calculo] : undefined,
        formato,
        user_id: user?.id || ''
      })
    } catch (error) {
      toast.error('Erro ao gerar relatório', {
        description: 'Não foi possível gerar o relatório consolidado'
      })
    }
  }

  const handleGerarRelatorioInteligente = async () => {
    try {
      await gerarRelatorioInteligente.mutateAsync({
        tipo: 'inteligente',
        periodo: 'last_3_months'
      })
    } catch (error) {
      console.error('Erro ao gerar relatório inteligente:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      'concluido': 'default',
      'pendente': 'secondary',
      'erro': 'destructive',
      'processando': 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Insights Inteligentes */}
      {statsInteligentes?.insights_ia && statsInteligentes.insights_ia.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Insights Inteligentes
            </CardTitle>
            <CardDescription>
              Análises automáticas baseadas em IA dos seus dados fiscais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {statsInteligentes.insights_ia.slice(0, 6).map((insight) => (
                <Card key={insight.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {insight.tipo === 'otimizacao' && <Target className="h-4 w-4 text-green-600" />}
                        {insight.tipo === 'risco' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                        {insight.tipo === 'oportunidade' && <Lightbulb className="h-4 w-4 text-yellow-600" />}
                        {insight.tipo === 'alerta' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                        <Badge variant={
                          insight.prioridade === 'critica' ? 'destructive' :
                          insight.prioridade === 'alta' ? 'default' :
                          insight.prioridade === 'media' ? 'secondary' : 'outline'
                        }>
                          {insight.prioridade}
                        </Badge>
                      </div>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{insight.titulo}</h4>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {insight.descricao}
                    </p>
                    {insight.impacto_financeiro && (
                      <p className="text-xs font-medium text-green-600">
                        Impacto: {formatCurrency(insight.impacto_financeiro)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {statsInteligentes.insights_ia.length > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm">
                  Ver todos os insights ({statsInteligentes.insights_ia.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alertas de Compliance */}
      {alertasCompliance && alertasCompliance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas de Compliance
            </CardTitle>
            <CardDescription>
              Alertas importantes que requerem sua atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertasCompliance.slice(0, 5).map((alerta) => (
                <div key={alerta.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    alerta.severidade === 'critical' ? 'bg-red-500' :
                    alerta.severidade === 'error' ? 'bg-red-400' :
                    alerta.severidade === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{alerta.titulo}</h4>
                    <p className="text-xs text-muted-foreground">{alerta.descricao}</p>
                    <p className="text-xs text-orange-600 mt-1">
                      Status: {alerta.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Exportação
          </CardTitle>
          <CardDescription>
            Filtre os dados e gere relatórios consolidados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa, CNPJ ou tipo..."
                value={filtros.busca}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                className="pl-10"
              />
            </div>

            <Select
              value={filtros.tipo_calculo}
              onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo_calculo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de cálculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="DAS">DAS</SelectItem>
                <SelectItem value="IRPJ">IRPJ</SelectItem>
                <SelectItem value="CSLL">CSLL</SelectItem>
                <SelectItem value="PIS/COFINS">PIS/COFINS</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filtros.status}
              onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filtros.periodo}
              onValueChange={(value) => setFiltros(prev => ({ ...prev, periodo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleGerarRelatorio('PDF')}
              disabled={gerarRelatorio.isPending}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGerarRelatorio('EXCEL')}
              disabled={gerarRelatorio.isPending}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button
              variant="secondary"
              onClick={handleGerarRelatorioInteligente}
              disabled={gerarRelatorioInteligente.isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              <Brain className="h-4 w-4" />
              {gerarRelatorioInteligente.isPending ? 'Gerando...' : 'Relatório IA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Cálculos Fiscais ({relatoriosFiltrados.length})</span>
            <Badge variant="outline">
              {relatoriosFiltrados.length} de {relatorios.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatoriosFiltrados.map((relatorio) => (
                  <TableRow key={relatorio.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{relatorio.empresa.nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {relatorio.empresa.cnpj}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {relatorio.tipo_calculo}
                      </Badge>
                    </TableCell>
                    <TableCell>{relatorio.competencia}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(relatorio.valor_total)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(relatorio.status)}
                    </TableCell>
                    <TableCell>
                      {formatDate(relatorio.data_vencimento)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
