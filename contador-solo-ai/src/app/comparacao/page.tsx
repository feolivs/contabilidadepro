'use client'

/**
 * 📊 PÁGINA DE COMPARAÇÃO DE EMPRESAS - ContabilidadePRO
 * Página dedicada para análise comparativa entre múltiplas empresas
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmpresasComparison } from '@/components/empresas/empresas-comparison'
import { EmpresasComparisonDemo } from '@/components/empresas/empresas-comparison-demo'
import { useEmpresasComparison, useComparisonExport } from '@/hooks/use-empresas-comparison'
import { useAuth } from '@/hooks/use-auth'
import { 
  BarChart3, Building2, TrendingUp, Users, Download, 
  RefreshCw, AlertCircle, CheckCircle, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ComparacaoPage() {
  const { user } = useAuth()
  const [filtros, setFiltros] = useState({
    periodo: '12m' as const,
    metricas: ['faturamento', 'crescimento', 'compliance'],
    incluir_projecoes: true,
    incluir_benchmarks: false
  })

  const {
    empresas,
    dadosComparacao,
    stats,
    isLoading,
    hasError,
    empresasSelecionadas,
    setEmpresasSelecionadas
  } = useEmpresasComparison(filtros)

  const { exportToExcel, exportToPDF } = useComparisonExport()

  const handleEmpresaSelect = (empresaIds: string[]) => {
    setEmpresasSelecionadas(empresaIds)
  }

  const handleExportData = async (format: 'pdf' | 'excel' | 'csv') => {
    if (dadosComparacao.length === 0) {
      toast.error('Selecione pelo menos uma empresa para exportar')
      return
    }

    try {
      switch (format) {
        case 'excel':
        case 'csv':
          await exportToExcel(dadosComparacao)
          toast.success(`Dados exportados para ${format.toUpperCase()}`)
          break
        case 'pdf':
          await exportToPDF(dadosComparacao)
          toast.success('Relatório PDF gerado com sucesso')
          break
      }
    } catch (error) {
      toast.error('Erro ao exportar dados')
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(1)}%`
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Comparação de Empresas
            </h1>
            <p className="text-muted-foreground mt-1">
              Analise e compare performance entre suas empresas
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total de Empresas
                </p>
                <p className="text-2xl font-bold">{empresas.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Empresas Selecionadas
                </p>
                <p className="text-2xl font-bold">{stats.empresas_ativas}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Faturamento Total
                </p>
                <p className="text-2xl font-bold">
                  {formatarMoeda(stats.faturamento_total)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Compliance Médio
                </p>
                <p className="text-2xl font-bold">
                  {formatarPercentual(stats.compliance_medio)}
                </p>
              </div>
              <CheckCircle className={`h-8 w-8 ${
                stats.compliance_medio >= 80 
                  ? 'text-green-600' 
                  : stats.compliance_medio >= 60 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Melhores Performances */}
      {stats.total_empresas > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Melhores Performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Maior Faturamento</div>
                <div className="font-semibold text-blue-600">
                  {stats.melhor_performance.faturamento || 'N/A'}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Maior Crescimento</div>
                <div className="font-semibold text-green-600">
                  {stats.melhor_performance.crescimento || 'N/A'}
                </div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Melhor Compliance</div>
                <div className="font-semibold text-purple-600">
                  {stats.melhor_performance.compliance || 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Componente Principal de Comparação */}
      <EmpresasComparisonDemo
        onEmpresaSelect={handleEmpresaSelect}
        onExportData={handleExportData}
      />

      {/* Estado de Erro */}
      {hasError && (
        <Card>
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">
              Erro ao Carregar Dados
            </h3>
            <p className="text-red-600 mb-4">
              Ocorreu um erro ao buscar os dados de comparação. Tente novamente.
            </p>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Estado Vazio */}
      {!isLoading && !hasError && empresas.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma Empresa Encontrada
            </h3>
            <p className="text-gray-500 mb-4">
              Você ainda não possui empresas cadastradas para comparar.
            </p>
            <Link href="/empresas/nova">
              <Button>
                <Building2 className="h-4 w-4 mr-2" />
                Cadastrar Primeira Empresa
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informações sobre a Comparação</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Os dados são atualizados em tempo real conforme novos documentos são processados
          </p>
          <p>
            • As projeções são baseadas em análise de tendências dos últimos meses
          </p>
          <p>
            • O score de compliance considera documentação, prazos e obrigações fiscais
          </p>
          <p>
            • Use os filtros para personalizar a análise conforme suas necessidades
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
