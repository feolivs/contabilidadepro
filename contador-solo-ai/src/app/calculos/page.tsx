'use client';

import { useState } from 'react';
import { CleanLayout } from '@/components/layout/clean-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calculator,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Download,
  Eye,
  Trash2,
} from 'lucide-react';
import { useCalculos, useEstatisticasCalculos, useMarcarComoPago, useExcluirCalculo } from '@/hooks/use-calculos';
import { useEmpresas } from '@/hooks/use-empresas';

import { CalculoAutomaticoModal } from '@/components/calculos/calculo-automatico-modal';
import type { FiltroCalculos, TipoCalculo, StatusCalculo } from '@/types/calculo';

export default function CalculosPage() {
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<FiltroCalculos>({});

  const [calculoAutomaticoOpen, setCalculoAutomaticoOpen] = useState(false);
  
  
  const { data: empresas = [] } = useEmpresas();
  const { data: calculos = [], isLoading } = useCalculos(filtros);
  const { data: estatisticas } = useEstatisticasCalculos();
  const marcarComoPago = useMarcarComoPago();
  const excluirCalculo = useExcluirCalculo();

  const handleFiltroChange = (key: keyof FiltroCalculos, value: string) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value || undefined
    }));
  };

  const limparFiltros = () => {
    setFiltros({});
    setBusca('');
  };

  const getStatusBadge = (status: StatusCalculo | string) => {
    const variants = {
      calculado: {
        className: '!bg-blue-100 !text-blue-800 dark:!bg-blue-900 dark:!text-blue-200',
        icon: Clock,
        text: 'Calculado'
      },
      aprovado: {
        className: '!bg-green-100 !text-green-800 dark:!bg-green-900 dark:!text-green-200',
        icon: CheckCircle,
        text: 'Aprovado'
      },
      pago: {
        className: '!bg-emerald-100 !text-emerald-800 dark:!bg-emerald-900 dark:!text-emerald-200',
        icon: CheckCircle,
        text: 'Pago'
      },
      vencido: {
        className: '!bg-red-100 !text-red-800 dark:!bg-red-900 dark:!text-red-200',
        icon: AlertTriangle,
        text: 'Vencido'
      },
      cancelado: {
        className: '!bg-gray-100 !text-gray-800 dark:!bg-gray-900 dark:!text-gray-200',
        icon: Trash2,
        text: 'Cancelado'
      },
      pendente: {
        className: '!bg-yellow-100 !text-yellow-800 dark:!bg-yellow-900 dark:!text-yellow-200',
        icon: Clock,
        text: 'Pendente'
      },
    };

    const config = variants[status as keyof typeof variants] || variants.pendente;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`flex items-center gap-1 !border-0 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const getTipoCalculoBadge = (tipo: TipoCalculo) => {
    const cores = {
      DAS: '!bg-blue-100 !text-blue-800 dark:!bg-blue-900 dark:!text-blue-200',
      MEI: '!bg-orange-100 !text-orange-800 dark:!bg-orange-900 dark:!text-orange-200',
      IRPJ: '!bg-green-100 !text-green-800 dark:!bg-green-900 dark:!text-green-200',
      CSLL: '!bg-emerald-100 !text-emerald-800 dark:!bg-emerald-900 dark:!text-emerald-200',
      PIS: '!bg-purple-100 !text-purple-800 dark:!bg-purple-900 dark:!text-purple-200',
      COFINS: '!bg-violet-100 !text-violet-800 dark:!bg-violet-900 dark:!text-violet-200',
      ICMS: '!bg-amber-100 !text-amber-800 dark:!bg-amber-900 dark:!text-amber-200',
      ISS: '!bg-yellow-100 !text-yellow-800 dark:!bg-yellow-900 dark:!text-yellow-200',
      CPP: '!bg-red-100 !text-red-800 dark:!bg-red-900 dark:!text-red-200',
      IPI: '!bg-gray-100 !text-gray-800 dark:!bg-gray-900 dark:!text-gray-200',
    };

    return (
      <Badge variant="outline" className={`!border-0 ${cores[tipo] || '!bg-gray-100 !text-gray-800 dark:!bg-gray-900 dark:!text-gray-200'}`}>
        {tipo}
      </Badge>
    );
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const handleMarcarComoPago = async (id: string) => {
    const hoje = new Date().toISOString().split('T')[0]!;
    await marcarComoPago.mutateAsync({ id, data_pagamento: hoje });
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cálculo?')) {
      await excluirCalculo.mutateAsync(id);
    }
  };

  return (
    <CleanLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Cálculos Fiscais
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os cálculos fiscais das suas empresas
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setCalculoAutomaticoOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Cálculo Automático
            </Button>

          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Cálculos</p>
                <p className="text-2xl font-bold text-foreground">
                  {estatisticas?.total_calculos || 0}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {estatisticas?.calculos_pendentes || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pagos</p>
                <p className="text-2xl font-bold text-green-600">
                  {estatisticas?.calculos_pagos || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatarMoeda(estatisticas?.valor_total_periodo || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">Filtros e Busca</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cálculos..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select onValueChange={(value) => handleFiltroChange('empresa_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => handleFiltroChange('tipo_calculo', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="DAS">DAS</SelectItem>
                <SelectItem value="MEI">MEI</SelectItem>
                <SelectItem value="IRPJ">IRPJ</SelectItem>
                <SelectItem value="CSLL">CSLL</SelectItem>
                <SelectItem value="PIS">PIS</SelectItem>
                <SelectItem value="COFINS">COFINS</SelectItem>
                <SelectItem value="ICMS">ICMS</SelectItem>
                <SelectItem value="ISS">ISS</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select onValueChange={(value) => handleFiltroChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="calculado">Calculado</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={limparFiltros}>
                <Filter className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabela de Cálculos */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-foreground">Lista de Cálculos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {calculos.length} cálculo(s) encontrado(s)
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : calculos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Calculator className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhum cálculo encontrado</p>
                        <Button
                          onClick={() => setCalculoAutomaticoOpen(true)}
                          variant="outline"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Fazer primeiro cálculo
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  calculos.map((calculo) => (
                    <TableRow key={calculo.id}>
                      <TableCell>
                        {getTipoCalculoBadge(calculo.tipo_calculo)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {empresas.find(e => e.id === calculo.empresa_id)?.nome || 'Empresa não encontrada'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {empresas.find(e => e.id === calculo.empresa_id)?.cnpj || ''}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {calculo.competencia}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatarMoeda(Number(calculo.valor_imposto))}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(calculo.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatarData(calculo.data_vencimento)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              Baixar boleto
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {calculo.status !== 'pago' && (
                              <DropdownMenuItem 
                                onClick={() => handleMarcarComoPago(calculo.id)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Marcar como pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleExcluir(calculo.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Modal Cálculo Automático */}
      <CalculoAutomaticoModal
        open={calculoAutomaticoOpen}
        onOpenChange={setCalculoAutomaticoOpen}
      />


    </CleanLayout>
  );
}
