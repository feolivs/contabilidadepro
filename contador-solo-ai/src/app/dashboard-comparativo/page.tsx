'use client'

/**
 * 📊 PÁGINA DASHBOARD COMPARATIVO - ContabilidadePRO
 * Página dedicada para análise comparativa avançada entre empresas
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardComparativo } from '@/components/dashboard/dashboard-comparativo'
import { useAuth } from '@/hooks/use-auth'
import { useEmpresasComparison } from '@/hooks/use-empresas-comparison'
import { 
  ArrowLeft, BarChart3, RefreshCw, Download, Settings, 
  AlertCircle, TrendingUp, Building2, Target, Zap
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Dados mock expandidos para demonstração
const EMPRESAS_MOCK = [
  {
    id: '1',
    nome: 'Tech Solutions Ltda',
    cnpj: '12.345.678/0001-90',
    regime_tributario: 'Simples Nacional',
    metricas: {
      faturamento_anual: 2400000,
      faturamento_mes_atual: 200000,
      crescimento_percentual: 15.5,
      total_documentos: 450,
      documentos_processados: 425,
      compliance_score: 85,
      margem_limite_simples: 45.2,
      projecao_anual: 2760000,
      eficiencia_processamento: 94.4,
      tempo_medio_processamento: 2.3
    },
    dados_mensais: [
      { mes: '2024-01', faturamento: 180000, documentos: 35, compliance: 82, eficiencia: 92 },
      { mes: '2024-02', faturamento: 195000, documentos: 38, compliance: 84, eficiencia: 93 },
      { mes: '2024-03', faturamento: 210000, documentos: 42, compliance: 85, eficiencia: 95 },
      { mes: '2024-04', faturamento: 205000, documentos: 40, compliance: 86, eficiencia: 94 },
      { mes: '2024-05', faturamento: 220000, documentos: 45, compliance: 87, eficiencia: 96 },
      { mes: '2024-06', faturamento: 200000, documentos: 38, compliance: 85, eficiencia: 94 }
    ],
    benchmarks: {
      posicao_faturamento: 2,
      posicao_crescimento: 1,
      posicao_compliance: 2,
      percentil_setor: 78
    }
  },
  {
    id: '2',
    nome: 'Comércio Brasil S.A.',
    cnpj: '98.765.432/0001-10',
    regime_tributario: 'Lucro Presumido',
    metricas: {
      faturamento_anual: 8500000,
      faturamento_mes_atual: 750000,
      crescimento_percentual: 8.2,
      total_documentos: 1200,
      documentos_processados: 1150,
      compliance_score: 92,
      margem_limite_simples: 0, // Não se aplica
      projecao_anual: 9200000,
      eficiencia_processamento: 95.8,
      tempo_medio_processamento: 1.8
    },
    dados_mensais: [
      { mes: '2024-01', faturamento: 680000, documentos: 95, compliance: 90, eficiencia: 94 },
      { mes: '2024-02', faturamento: 720000, documentos: 102, compliance: 91, eficiencia: 95 },
      { mes: '2024-03', faturamento: 780000, documentos: 108, compliance: 92, eficiencia: 96 },
      { mes: '2024-04', faturamento: 740000, documentos: 98, compliance: 93, eficiencia: 97 },
      { mes: '2024-05', faturamento: 810000, documentos: 115, compliance: 94, eficiencia: 96 },
      { mes: '2024-06', faturamento: 750000, documentos: 105, compliance: 92, eficiencia: 95 }
    ],
    benchmarks: {
      posicao_faturamento: 1,
      posicao_crescimento: 3,
      posicao_compliance: 1,
      percentil_setor: 92
    }
  },
  {
    id: '3',
    nome: 'Startup Inovação ME',
    cnpj: '11.222.333/0001-44',
    regime_tributario: 'MEI',
    metricas: {
      faturamento_anual: 75000,
      faturamento_mes_atual: 6800,
      crescimento_percentual: 22.1,
      total_documentos: 85,
      documentos_processados: 80,
      compliance_score: 78,
      margem_limite_simples: 92.6, // Muito abaixo do limite MEI
      projecao_anual: 91500,
      eficiencia_processamento: 94.1,
      tempo_medio_processamento: 3.1
    },
    dados_mensais: [
      { mes: '2024-01', faturamento: 5200, documentos: 6, compliance: 75, eficiencia: 90 },
      { mes: '2024-02', faturamento: 5800, documentos: 7, compliance: 76, eficiencia: 92 },
      { mes: '2024-03', faturamento: 6500, documentos: 8, compliance: 78, eficiencia: 94 },
      { mes: '2024-04', faturamento: 6200, documentos: 7, compliance: 79, eficiencia: 95 },
      { mes: '2024-05', faturamento: 7100, documentos: 9, compliance: 80, eficiencia: 96 },
      { mes: '2024-06', faturamento: 6800, documentos: 8, compliance: 78, eficiencia: 94 }
    ],
    benchmarks: {
      posicao_faturamento: 4,
      posicao_crescimento: 1,
      posicao_compliance: 4,
      percentil_setor: 45
    }
  },
  {
    id: '4',
    nome: 'Indústria Metalúrgica Ltda',
    cnpj: '55.666.777/0001-88',
    regime_tributario: 'Lucro Real',
    metricas: {
      faturamento_anual: 15200000,
      faturamento_mes_atual: 1350000,
      crescimento_percentual: 5.8,
      total_documentos: 2800,
      documentos_processados: 2650,
      compliance_score: 88,
      margem_limite_simples: 0, // Não se aplica
      projecao_anual: 16100000,
      eficiencia_processamento: 94.6,
      tempo_medio_processamento: 2.1
    },
    dados_mensais: [
      { mes: '2024-01', faturamento: 1200000, documentos: 220, compliance: 86, eficiencia: 93 },
      { mes: '2024-02', faturamento: 1280000, documentos: 235, compliance: 87, eficiencia: 94 },
      { mes: '2024-03', faturamento: 1400000, documentos: 250, compliance: 88, eficiencia: 95 },
      { mes: '2024-04', faturamento: 1320000, documentos: 240, compliance: 89, eficiencia: 96 },
      { mes: '2024-05', faturamento: 1450000, documentos: 265, compliance: 90, eficiencia: 95 },
      { mes: '2024-06', faturamento: 1350000, documentos: 245, compliance: 88, eficiencia: 94 }
    ],
    benchmarks: {
      posicao_faturamento: 1,
      posicao_crescimento: 4,
      posicao_compliance: 3,
      percentil_setor: 85
    }
  },
  {
    id: '5',
    nome: 'Consultoria Estratégica Ltda',
    cnpj: '33.444.555/0001-66',
    regime_tributario: 'Simples Nacional',
    metricas: {
      faturamento_anual: 1800000,
      faturamento_mes_atual: 165000,
      crescimento_percentual: 12.3,
      total_documentos: 320,
      documentos_processados: 305,
      compliance_score: 90,
      margem_limite_simples: 62.5,
      projecao_anual: 2020000,
      eficiencia_processamento: 95.3,
      tempo_medio_processamento: 1.9
    },
    dados_mensais: [
      { mes: '2024-01', faturamento: 145000, documentos: 25, compliance: 88, eficiencia: 94 },
      { mes: '2024-02', faturamento: 155000, documentos: 28, compliance: 89, eficiencia: 95 },
      { mes: '2024-03', faturamento: 170000, documentos: 30, compliance: 90, eficiencia: 96 },
      { mes: '2024-04', faturamento: 160000, documentos: 27, compliance: 91, eficiencia: 95 },
      { mes: '2024-05', faturamento: 180000, documentos: 32, compliance: 92, eficiencia: 96 },
      { mes: '2024-06', faturamento: 165000, documentos: 29, compliance: 90, eficiencia: 95 }
    ],
    benchmarks: {
      posicao_faturamento: 3,
      posicao_crescimento: 2,
      posicao_compliance: 1,
      percentil_setor: 82
    }
  }
]

export default function DashboardComparativoPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [empresas, setEmpresas] = useState(EMPRESAS_MOCK)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Simular carregamento inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const handleEmpresaToggle = (empresaId: string) => {
    console.log('Empresa toggled:', empresaId)
  }

  const handleMetricaToggle = (metricaId: string) => {
    console.log('Métrica toggled:', metricaId)
  }

  const handleExportData = async (formato: 'pdf' | 'excel' | 'png') => {
    toast.success(`Exportando dashboard em formato ${formato.toUpperCase()}...`)
    
    // Simular exportação
    setTimeout(() => {
      toast.success(`Dashboard exportado com sucesso em ${formato.toUpperCase()}!`)
    }, 2000)
  }

  const handleRefreshData = async () => {
    setLoading(true)
    
    // Simular atualização de dados
    setTimeout(() => {
      setLastUpdate(new Date())
      setLoading(false)
      toast.success('Dados atualizados com sucesso!')
    }, 1000)
  }

  // Calcular estatísticas gerais
  const estatisticasGerais = {
    total_empresas: empresas.length,
    faturamento_total: empresas.reduce((sum, emp) => sum + emp.metricas.faturamento_anual, 0),
    crescimento_medio: empresas.reduce((sum, emp) => sum + emp.metricas.crescimento_percentual, 0) / empresas.length,
    compliance_medio: empresas.reduce((sum, emp) => sum + emp.metricas.compliance_score, 0) / empresas.length,
    total_documentos: empresas.reduce((sum, emp) => sum + emp.metricas.total_documentos, 0),
    eficiencia_media: empresas.reduce((sum, emp) => sum + emp.metricas.eficiencia_processamento, 0) / empresas.length
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
              Dashboard Comparativo
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise comparativa avançada entre empresas com métricas customizáveis
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportData('pdf')}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Empresas
                </p>
                <p className="text-2xl font-bold">{estatisticasGerais.total_empresas}</p>
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
                  Faturamento Total
                </p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact'
                  }).format(estatisticasGerais.faturamento_total)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Crescimento Médio
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {estatisticasGerais.crescimento_medio.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
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
                <p className="text-2xl font-bold text-blue-600">
                  {estatisticasGerais.compliance_medio.toFixed(0)}
                </p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Documentos
                </p>
                <p className="text-2xl font-bold">{estatisticasGerais.total_documentos.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Eficiência Média
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {estatisticasGerais.eficiencia_media.toFixed(1)}%
                </p>
              </div>
              <Settings className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações da Última Atualização */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              Última atualização: {lastUpdate.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {empresas.length} empresas ativas
              </Badge>
              <Badge variant="outline">
                Dados em tempo real
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Comparativo Principal */}
      <DashboardComparativo
        empresas={empresas}
        loading={loading}
        onEmpresaToggle={handleEmpresaToggle}
        onMetricaToggle={handleMetricaToggle}
        onExportData={handleExportData}
      />

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sobre o Dashboard Comparativo</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Análise Multi-dimensional:</strong> Compare múltiplas empresas em diferentes métricas simultaneamente
          </p>
          <p>
            • <strong>Visualizações Interativas:</strong> Gráficos de barras, linhas, radar e dispersão para diferentes perspectivas
          </p>
          <p>
            • <strong>Benchmarking:</strong> Posicionamento relativo e percentis do setor para contexto competitivo
          </p>
          <p>
            • <strong>Métricas Customizáveis:</strong> Configure quais métricas visualizar e seus pesos relativos
          </p>
          <p>
            • <strong>Análise Temporal:</strong> Evolução das métricas ao longo do tempo para identificar tendências
          </p>
          <p>
            • <strong>Exportação Avançada:</strong> Relatórios em PDF, planilhas Excel e imagens PNG para apresentações
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
