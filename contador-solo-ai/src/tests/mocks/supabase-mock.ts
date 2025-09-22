/**
 * Mock do Supabase Client para testes
 */

export const createMockSupabaseClient = () => ({
  // Auth
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-001',
          email: 'test@example.com'
        }
      },
      error: null
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-001' } },
      error: null
    }),
    signOut: jest.fn().mockResolvedValue({ error: null })
  },

  // Database queries
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'test-empresa-001',
            nome: 'Empresa Teste',
            cnpj: '12.345.678/0001-90',
            regime_tributario: 'Simples Nacional'
          },
          error: null
        }),
        limit: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'test-empresa-001',
              nome: 'Empresa Teste',
              cnpj: '12.345.678/0001-90'
            }
          ],
          error: null
        })
      }),
      limit: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'test-doc-001',
            nome_arquivo: 'documento-teste.pdf',
            tipo_documento: 'NFe',
            valor_total: 1500.00
          }
        ],
        error: null
      })
    }),
    insert: jest.fn().mockResolvedValue({
      data: { id: 'new-id' },
      error: null
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: { id: 'updated-id' },
        error: null
      })
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: null
      })
    }),
    upsert: jest.fn().mockResolvedValue({
      data: { id: 'upserted-id' },
      error: null
    })
  }),

  // RPC calls
  rpc: jest.fn().mockImplementation((functionName: string, params?: any) => {
    switch (functionName) {
      case 'get_empresa_dashboard_complete':
        return Promise.resolve({
          data: {
            empresa: {
              id: params?.p_empresa_id || 'test-empresa-001',
              nome: 'Empresa Teste',
              cnpj: '12.345.678/0001-90'
            },
            financial_summary: {
              receita_total: 50000.00,
              crescimento_medio: 15.5
            },
            documents_summary: {
              total: 25,
              processados: 23
            },
            compliance_summary: {
              score_geral: 85.5,
              nivel: 'alto'
            }
          },
          error: null
        })

      default:
        return Promise.resolve({
          data: { success: true },
          error: null
        })
    }
  }),

  // Edge Functions
  functions: {
    invoke: jest.fn().mockImplementation((functionName: string, options?: any) => {
      const body = options?.body || {}
      
      switch (functionName) {
        case 'empresa-context-service':
          return Promise.resolve({
            data: {
              success: true,
              empresa: {
                id: body.empresa_id || 'test-empresa-001',
                nome: 'Empresa Teste',
                cnpj: '12.345.678/0001-90',
                regime_tributario: 'Simples Nacional'
              },
              financial_summary: {
                receita_total: 50000.00,
                crescimento_medio: 15.5,
                faturamento_mes_atual: 8500.00,
                ticket_medio: 2125.00
              },
              documents_summary: {
                total: 25,
                processados: 23,
                pendentes: 2,
                tipos_mais_comuns: [
                  { tipo: 'NFe', quantidade: 15 },
                  { tipo: 'NFCe', quantidade: 8 },
                  { tipo: 'Recibo', quantidade: 2 }
                ]
              },
              compliance_summary: {
                score_geral: 85.5,
                nivel: 'alto',
                prazos_fiscais: {
                  das_proximo_vencimento: '2024-02-20',
                  dias_para_das: 15
                }
              },
              insights_summary: body.include_insights ? {
                pontos_principais: [
                  'Crescimento consistente nos últimos 3 meses',
                  'Compliance em dia com todas as obrigações',
                  'Oportunidade de otimização fiscal identificada'
                ],
                score_geral: 88
              } : undefined,
              metrics_summary: body.include_metrics ? {
                periodo_analise: '6 meses',
                total_documentos: 25,
                confianca_dados: 0.92
              } : undefined,
              cached: false,
              processing_time: 1250,
              generated_at: new Date().toISOString()
            },
            error: null
          })

        case 'documentos-analytics-service':
          switch (body.operation) {
            case 'calculate_metrics':
              return Promise.resolve({
                data: {
                  success: true,
                  empresa_id: body.empresa_id,
                  resumo_executivo: {
                    receita_total: 50000.00,
                    crescimento_medio: 15.5,
                    total_documentos: 25,
                    confianca_dados: 0.92,
                    periodo_analise: `${body.period_months || 6} meses`
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
                      { mes: '2024-02', valor: 6500.00 }
                    ]
                  },
                  indicadores_performance: {
                    ticket_medio: 2125.00,
                    frequencia_documentos: 4.2,
                    crescimento_percentual: 15.5,
                    eficiencia_processamento: 0.92
                  },
                  cached: false,
                  processing_time: 850,
                  generated_at: new Date().toISOString()
                },
                error: null
              })

            case 'analyze_compliance':
              return Promise.resolve({
                data: {
                  success: true,
                  empresa_id: body.empresa_id,
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
                  cached: false,
                  processing_time: 650,
                  generated_at: new Date().toISOString()
                },
                error: null
              })

            case 'generate_insights':
              return Promise.resolve({
                data: {
                  success: true,
                  empresa_id: body.empresa_id,
                  tipo_insight: body.insight_type || 'completo',
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
                  cached: false,
                  processing_time: 2150,
                  generated_at: new Date().toISOString()
                },
                error: null
              })

            default:
              return Promise.resolve({
                data: { success: true, message: 'Operation completed' },
                error: null
              })
          }

        default:
          return Promise.resolve({
            data: { success: true },
            error: null
          })
      }
    })
  },

  // Storage
  storage: {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: { path: 'test-file.pdf' },
        error: null
      }),
      download: jest.fn().mockResolvedValue({
        data: new Blob(['test content']),
        error: null
      }),
      remove: jest.fn().mockResolvedValue({
        data: null,
        error: null
      })
    })
  },

  // Realtime
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockReturnThis()
  })
})

// Mock específico para hooks
export const mockSupabaseHooks = {
  useSupabaseClient: () => createMockSupabaseClient(),
  useUser: () => ({
    id: 'test-user-001',
    email: 'test@example.com'
  }),
  useSession: () => ({
    access_token: 'mock-token',
    user: {
      id: 'test-user-001',
      email: 'test@example.com'
    }
  })
}
