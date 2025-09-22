/**
 * Mock de dados para cache e testes
 */

export const createMockCacheData = {
  // Insights de IA
  aiInsights: () => ({
    success: true,
    empresa_id: 'test-empresa-001',
    tipo_insight: 'completo',
    resumo_executivo: {
      pontos_principais: [
        'Crescimento consistente de 15.5% nos últimos meses',
        'Compliance em excelente estado com score de 85.5',
        'Oportunidade de otimização fiscal identificada',
        'Qualidade dos dados estruturados acima da média'
      ],
      score_geral: 88
    },
    analise_financeira: {
      tendencia: 'positiva',
      pontos_atencao: [
        'Variação no ticket médio entre os meses',
        'Concentração de receita em poucos clientes'
      ],
      oportunidades: [
        'Diversificação da base de clientes',
        'Otimização do regime tributário',
        'Automação de processos fiscais'
      ]
    },
    alertas_prioritarios: [
      {
        tipo: 'importante',
        mensagem: 'DAS vence em 15 dias',
        acao_recomendada: 'Preparar pagamento do DAS de fevereiro',
        prazo_acao: '20/02/2024'
      }
    ],
    projecoes_estrategicas: {
      recomendacoes_crescimento: [
        'Investir em marketing digital para ampliar base de clientes',
        'Implementar sistema de gestão mais robusto',
        'Considerar expansão para novos mercados'
      ],
      riscos_futuros: [
        'Dependência excessiva de poucos clientes',
        'Possíveis mudanças na legislação tributária'
      ]
    },
    limitacoes: [
      'Análise baseada em dados dos últimos 6 meses',
      'Algumas projeções dependem de fatores externos'
    ],
    confianca_analise: 92,
    cached: true,
    processing_time: 2150,
    generated_at: new Date().toISOString()
  }),

  // Métricas financeiras
  metricasFinanceiras: () => ({
    success: true,
    empresa_id: 'test-empresa-001',
    resumo_executivo: {
      receita_total: 50000.00,
      crescimento_medio: 15.5,
      total_documentos: 25,
      confianca_dados: 0.92,
      periodo_analise: '6 meses'
    },
    metricas_mensais: [
      {
        mes: '2024-01',
        receita_total: 8500.00,
        quantidade_documentos: 4,
        confianca_media: 0.95
      },
      {
        mes: '2024-02',
        receita_total: 9200.00,
        quantidade_documentos: 5,
        confianca_media: 0.88
      },
      {
        mes: '2024-03',
        receita_total: 10100.00,
        quantidade_documentos: 6,
        confianca_media: 0.91
      }
    ],
    projecoes: {
      proximo_mes: 9800.00,
      proximo_trimestre: 28500.00,
      anual: 110000.00,
      tendencia: 'crescimento'
    },
    fluxo_caixa: {
      saldo_acumulado: 15000.00,
      saldos: [
        { mes: '2024-01', valor: 8500.00 },
        { mes: '2024-02', valor: 6500.00 },
        { mes: '2024-03', valor: 7200.00 }
      ]
    },
    indicadores_performance: {
      ticket_medio: 2125.00,
      frequencia_documentos: 4.2,
      crescimento_percentual: 15.5,
      eficiencia_processamento: 0.92
    },
    cached: true,
    processing_time: 850,
    generated_at: new Date().toISOString()
  }),

  // Análise de compliance
  complianceAnalysis: () => ({
    success: true,
    empresa_id: 'test-empresa-001',
    score_geral: 85.5,
    nivel: 'alto',
    consistencia_dados: {
      score: 88.0,
      inconsistencias: [
        'CNPJ não encontrado em 2 documentos',
        'Data de emissão inconsistente em 1 documento'
      ],
      campos_faltantes: [
        'Chave de acesso NFe em 1 documento'
      ]
    },
    prazos_fiscais: {
      das_proximo_vencimento: '2024-02-20',
      dias_para_das: 15,
      regime_tributario: 'Simples Nacional',
      alertas_prazo: [
        'DAS vence em 15 dias'
      ]
    },
    obrigacoes_fiscais: {
      obrigacoes_ativas: [
        {
          tipo: 'DAS',
          status: 'ativa',
          periodicidade: 'mensal',
          vencimento: '20/02/2024'
        },
        {
          tipo: 'DEFIS',
          status: 'ativa',
          periodicidade: 'anual',
          vencimento: '31/03/2024'
        }
      ]
    },
    qualidade_documentacao: {
      taxa_estruturacao: 0.92,
      confianca_media: 0.88,
      qualidade_geral: 'alta',
      total_documentos: 25,
      documentos_estruturados: 23,
      areas_criticas: [
        'Documentos sem chave de acesso'
      ]
    },
    alertas_urgentes: [],
    riscos_identificados: [
      'Alguns documentos com baixa confiança de estruturação'
    ],
    configuracao_analise: {
      documentos_analisados: 25,
      periodo_analise: '6 meses'
    },
    cached: true,
    processing_time: 650,
    generated_at: new Date().toISOString()
  }),

  // Insights de empresa
  empresaInsights: () => ({
    success: true,
    empresa: {
      id: 'test-empresa-001',
      nome: 'Empresa Teste',
      cnpj: '12.345.678/0001-90',
      regime_tributario: 'Simples Nacional',
      atividade_principal: 'Consultoria em TI',
      created_at: '2023-01-15T10:00:00Z'
    },
    financial_summary: {
      faturamento_total: 50000.00,
      faturamento_mes_atual: 8500.00,
      faturamento_mes_anterior: 7200.00,
      crescimento_mensal: 18.1,
      ticket_medio: 2125.00,
      maior_documento: 5500.00,
      receita_total: 50000.00,
      crescimento_medio: 15.5,
      documentos_por_mes: [
        { mes: '2024-01', quantidade: 4, valor_total: 8500.00 },
        { mes: '2024-02', quantidade: 5, valor_total: 9200.00 }
      ]
    },
    documents_summary: {
      total: 25,
      processados: 23,
      pendentes: 2,
      com_erro: 0,
      tipos_mais_comuns: [
        { tipo: 'NFe', quantidade: 15 },
        { tipo: 'NFCe', quantidade: 8 },
        { tipo: 'Recibo', quantidade: 2 }
      ],
      valor_total_documentos: 50000.00
    },
    obligations_summary: {
      proximas_obrigacoes: [
        {
          tipo: 'DAS',
          vencimento: '2024-02-20',
          valor_estimado: 2500.00,
          status: 'pendente'
        }
      ],
      obrigacoes_em_atraso: [],
      total_obrigacoes_mes: 1
    },
    insights_summary: {
      pontos_principais: [
        'Crescimento consistente nos últimos 3 meses',
        'Compliance em dia com todas as obrigações',
        'Oportunidade de otimização fiscal identificada'
      ],
      score_geral: 88,
      areas_atencao: [
        'Diversificação da base de clientes'
      ],
      recomendacoes: [
        'Considerar mudança de regime tributário',
        'Implementar controles financeiros mais rigorosos'
      ]
    },
    compliance_summary: {
      score_geral: 85.5,
      nivel: 'alto',
      prazos_fiscais: {
        das_proximo_vencimento: '2024-02-20',
        dias_para_das: 15,
        regime_tributario: 'Simples Nacional'
      },
      alertas_compliance: [
        'DAS vence em 15 dias'
      ]
    },
    metrics_summary: {
      periodo_analise: '6 meses',
      total_documentos: 25,
      confianca_dados: 0.92,
      ultima_atualizacao: new Date().toISOString()
    },
    recommendations: [
      'Manter regularidade no envio de documentos',
      'Considerar otimização do regime tributário',
      'Implementar controles de qualidade nos dados'
    ],
    cached: true,
    generated_at: new Date().toISOString()
  }),

  // Dados estruturados
  dadosEstruturados: () => ({
    success: true,
    empresa_id: 'test-empresa-001',
    total_documentos: 25,
    documentos_estruturados: 23,
    taxa_estruturacao: 0.92,
    confianca_media: 0.88,
    tipos_documento: [
      {
        tipo: 'NFe',
        quantidade: 15,
        estruturados: 14,
        confianca_media: 0.91
      },
      {
        tipo: 'NFCe',
        quantidade: 8,
        estruturados: 7,
        confianca_media: 0.85
      },
      {
        tipo: 'Recibo',
        quantidade: 2,
        estruturados: 2,
        confianca_media: 0.88
      }
    ],
    qualidade_dados: {
      campos_obrigatorios_preenchidos: 0.95,
      consistencia_dados: 0.88,
      validacao_cnpj: 0.92,
      validacao_valores: 0.96
    },
    areas_melhoria: [
      'Documentos sem chave de acesso NFe',
      'Inconsistências em datas de emissão'
    ],
    cached: true,
    processing_time: 450,
    generated_at: new Date().toISOString()
  }),

  // Lista de empresas
  empresasList: () => ({
    success: true,
    empresas: [
      {
        id: 'test-empresa-001',
        nome: 'Empresa Teste 1',
        cnpj: '12.345.678/0001-90',
        regime_tributario: 'Simples Nacional',
        ativa: true,
        created_at: '2023-01-15T10:00:00Z'
      },
      {
        id: 'test-empresa-002',
        nome: 'Empresa Teste 2',
        cnpj: '98.765.432/0001-10',
        regime_tributario: 'Lucro Presumido',
        ativa: true,
        created_at: '2023-02-20T14:30:00Z'
      }
    ],
    total: 2,
    cached: true,
    generated_at: new Date().toISOString()
  }),

  // Documentos recentes
  documentosRecentes: () => ({
    success: true,
    empresa_id: 'test-empresa-001',
    documentos: [
      {
        id: 'doc-001',
        nome_arquivo: 'nfe-001.pdf',
        tipo_documento: 'NFe',
        valor_total: 2500.00,
        data_documento: '2024-02-15T10:00:00Z',
        status_processamento: 'processado',
        confianca_estruturacao: 0.95
      },
      {
        id: 'doc-002',
        nome_arquivo: 'nfce-002.pdf',
        tipo_documento: 'NFCe',
        valor_total: 150.00,
        data_documento: '2024-02-14T15:30:00Z',
        status_processamento: 'processado',
        confianca_estruturacao: 0.88
      },
      {
        id: 'doc-003',
        nome_arquivo: 'recibo-003.pdf',
        tipo_documento: 'Recibo',
        valor_total: 800.00,
        data_documento: '2024-02-13T09:15:00Z',
        status_processamento: 'processado',
        confianca_estruturacao: 0.92
      }
    ],
    total: 3,
    cached: true,
    generated_at: new Date().toISOString()
  }),

  // Estatísticas de cache
  cacheStats: () => ({
    totalEntries: 15,
    totalSize: 2048, // KB
    hitRate: 85.5,
    missRate: 14.5,
    evictions: 3,
    lastCleanup: Date.now() - 300000 // 5 minutos atrás
  })
}

// Mock do cache manager
export const mockCacheManager = {
  get: jest.fn().mockImplementation((key: string) => {
    switch (key) {
      case 'empresa-insights-cached':
        return createMockCacheData.empresaInsights()
      case 'metricas-financeiras':
        return createMockCacheData.metricasFinanceiras()
      case 'compliance-analysis':
        return createMockCacheData.complianceAnalysis()
      case 'ai-insights':
        return createMockCacheData.aiInsights()
      default:
        return null
    }
  }),

  set: jest.fn(),
  invalidate: jest.fn(),
  invalidateByTags: jest.fn(),
  clear: jest.fn(),
  cleanup: jest.fn(),
  getStats: jest.fn().mockReturnValue(createMockCacheData.cacheStats())
}

// Mock do cache provider
export const mockCacheProvider = {
  stats: createMockCacheData.cacheStats(),
  isInitialized: true,
  clearCache: jest.fn(),
  invalidateByTags: jest.fn(),
  cleanup: jest.fn(),
  refreshStats: jest.fn()
}
