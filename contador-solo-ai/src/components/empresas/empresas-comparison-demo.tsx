'use client'

/**
 * 📊 EMPRESAS COMPARISON DEMO - ContabilidadePRO
 * Componente de demonstração com dados mock para comparação de empresas
 */

import React from 'react'
import { EmpresasComparison } from './empresas-comparison'

// Dados mock para demonstração
const EMPRESAS_MOCK = [
  {
    id: '1',
    nome: 'Tech Solutions Ltda',
    cnpj: '12.345.678/0001-90',
    regime_tributario: 'Simples Nacional',
    metricas: {
      faturamento_anual: 2400000,
      faturamento_mes_atual: 220000,
      crescimento_percentual: 15.5,
      total_documentos: 156,
      documentos_processados: 142,
      compliance_score: 87,
      margem_limite_simples: 50.0,
      projecao_anual: 2800000
    },
    insights: {
      pontos_fortes: [
        'Crescimento consistente nos últimos 6 meses',
        'Alta taxa de processamento de documentos',
        'Compliance score acima da média do setor'
      ],
      areas_melhoria: [
        'Otimizar gestão de fluxo de caixa',
        'Implementar controles internos mais rigorosos'
      ],
      alertas_criticos: [],
      recomendacoes: [
        'Considerar mudança para Lucro Presumido em 2025',
        'Investir em automação de processos contábeis',
        'Revisar estrutura tributária para otimização'
      ]
    },
    dados_mensais: [
      { mes: '2024-07', faturamento: 180000, documentos: 12, compliance: 85 },
      { mes: '2024-08', faturamento: 195000, documentos: 14, compliance: 86 },
      { mes: '2024-09', faturamento: 210000, documentos: 13, compliance: 87 },
      { mes: '2024-10', faturamento: 225000, documentos: 15, compliance: 88 },
      { mes: '2024-11', faturamento: 240000, documentos: 16, compliance: 87 },
      { mes: '2024-12', faturamento: 220000, documentos: 14, compliance: 87 }
    ]
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
      total_documentos: 324,
      documentos_processados: 298,
      compliance_score: 92,
      margem_limite_simples: 0, // Já ultrapassou o limite
      projecao_anual: 9200000
    },
    insights: {
      pontos_fortes: [
        'Excelente score de compliance',
        'Volume alto de documentos processados',
        'Regime tributário adequado ao porte'
      ],
      areas_melhoria: [
        'Acelerar crescimento para atingir metas',
        'Reduzir documentos pendentes'
      ],
      alertas_criticos: [
        'Meta de crescimento anual pode não ser atingida'
      ],
      recomendacoes: [
        'Revisar estratégias de marketing e vendas',
        'Implementar sistema de gestão mais eficiente',
        'Considerar expansão para novos mercados'
      ]
    },
    dados_mensais: [
      { mes: '2024-07', faturamento: 720000, documentos: 28, compliance: 90 },
      { mes: '2024-08', faturamento: 680000, documentos: 26, compliance: 91 },
      { mes: '2024-09', faturamento: 710000, documentos: 27, compliance: 92 },
      { mes: '2024-10', faturamento: 740000, documentos: 29, compliance: 93 },
      { mes: '2024-11', faturamento: 780000, documentos: 31, compliance: 92 },
      { mes: '2024-12', faturamento: 750000, documentos: 28, compliance: 92 }
    ]
  },
  {
    id: '3',
    nome: 'Startup Inovação ME',
    cnpj: '11.222.333/0001-44',
    regime_tributario: 'MEI',
    metricas: {
      faturamento_anual: 65000,
      faturamento_mes_atual: 6800,
      crescimento_percentual: 45.8,
      total_documentos: 48,
      documentos_processados: 44,
      compliance_score: 78,
      margem_limite_simples: 19.8, // Próximo do limite MEI
      projecao_anual: 95000
    },
    insights: {
      pontos_fortes: [
        'Crescimento acelerado e sustentável',
        'Boa gestão documental para o porte',
        'Potencial de expansão significativo'
      ],
      areas_melhoria: [
        'Melhorar compliance score',
        'Preparar transição para Simples Nacional'
      ],
      alertas_criticos: [
        'Próximo do limite de faturamento MEI',
        'Necessário planejamento para mudança de regime'
      ],
      recomendacoes: [
        'Planejar transição para Simples Nacional em 2025',
        'Implementar controles financeiros mais rigorosos',
        'Buscar consultoria para otimização tributária'
      ]
    },
    dados_mensais: [
      { mes: '2024-07', faturamento: 4200, documentos: 4, compliance: 75 },
      { mes: '2024-08', faturamento: 4800, documentos: 4, compliance: 76 },
      { mes: '2024-09', faturamento: 5500, documentos: 5, compliance: 77 },
      { mes: '2024-10', faturamento: 6200, documentos: 5, compliance: 78 },
      { mes: '2024-11', faturamento: 6900, documentos: 6, compliance: 79 },
      { mes: '2024-12', faturamento: 6800, documentos: 5, compliance: 78 }
    ]
  },
  {
    id: '4',
    nome: 'Indústria Metalúrgica Ltda',
    cnpj: '55.666.777/0001-88',
    regime_tributario: 'Lucro Real',
    metricas: {
      faturamento_anual: 45000000,
      faturamento_mes_atual: 4200000,
      crescimento_percentual: -2.1,
      total_documentos: 892,
      documentos_processados: 856,
      compliance_score: 95,
      margem_limite_simples: 0, // Muito acima do limite
      projecao_anual: 44000000
    },
    insights: {
      pontos_fortes: [
        'Excelente compliance score',
        'Alto volume de documentos processados',
        'Regime tributário adequado ao porte'
      ],
      areas_melhoria: [
        'Reverter tendência de queda no faturamento',
        'Otimizar custos operacionais'
      ],
      alertas_criticos: [
        'Faturamento em declínio nos últimos meses',
        'Necessário revisar estratégia comercial'
      ],
      recomendacoes: [
        'Implementar plano de recuperação de vendas',
        'Revisar estrutura de custos e despesas',
        'Buscar novos mercados e oportunidades',
        'Considerar reestruturação operacional'
      ]
    },
    dados_mensais: [
      { mes: '2024-07', faturamento: 4500000, documentos: 78, compliance: 94 },
      { mes: '2024-08', faturamento: 4300000, documentos: 76, compliance: 95 },
      { mes: '2024-09', faturamento: 4100000, documentos: 74, compliance: 95 },
      { mes: '2024-10', faturamento: 3900000, documentos: 72, compliance: 96 },
      { mes: '2024-11', faturamento: 4000000, documentos: 73, compliance: 95 },
      { mes: '2024-12', faturamento: 4200000, documentos: 75, compliance: 95 }
    ]
  }
]

interface EmpresasComparisonDemoProps {
  onEmpresaSelect?: (empresaIds: string[]) => void
  onExportData?: (format: 'pdf' | 'excel' | 'csv') => void
}

export function EmpresasComparisonDemo({ 
  onEmpresaSelect, 
  onExportData 
}: EmpresasComparisonDemoProps) {
  const handleEmpresaSelect = (empresaIds: string[]) => {
    console.log('Empresas selecionadas:', empresaIds)
    onEmpresaSelect?.(empresaIds)
  }

  const handleExportData = (format: 'pdf' | 'excel' | 'csv') => {
    console.log('Exportando dados em formato:', format)
    onExportData?.(format)
  }

  return (
    <div className="space-y-6">
      {/* Aviso de Demo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-blue-800">
            Modo Demonstração
          </span>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          Esta é uma demonstração com dados fictícios. Em produção, os dados serão carregados das suas empresas reais.
        </p>
      </div>

      {/* Componente de Comparação */}
      <EmpresasComparison
        empresas={EMPRESAS_MOCK}
        loading={false}
        onEmpresaSelect={handleEmpresaSelect}
        onExportData={handleExportData}
      />
    </div>
  )
}

export default EmpresasComparisonDemo
