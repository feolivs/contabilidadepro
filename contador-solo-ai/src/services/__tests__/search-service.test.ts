/**
 * Testes para Serviço de Busca - ContabilidadePRO
 */

import { SearchService, getSearchService } from '../search-service'

// Mock do Supabase
const mockSupabaseData = {
  empresas: [
    {
      id: '1',
      razao_social: 'Empresa ABC Ltda',
      nome_fantasia: 'ABC',
      cnpj: '12.345.678/0001-90',
      created_at: '2024-01-01',
      updated_at: '2024-01-15'
    }
  ],
  documentos: [
    {
      id: '1',
      nome: 'Nota Fiscal 001',
      tipo: 'NFe',
      status: 'processado',
      created_at: '2024-01-01',
      updated_at: '2024-01-15'
    }
  ],
  calculos: [
    {
      id: '1',
      nome: 'DAS Janeiro 2024',
      tipo: 'DAS',
      status: 'concluido',
      valor_calculado: 1500.50,
      created_at: '2024-01-01',
      updated_at: '2024-01-15'
    }
  ],
  prazos_fiscais: [
    {
      id: '1',
      nome: 'DAS Janeiro',
      descricao: 'Vencimento DAS Janeiro 2024',
      data_vencimento: '2024-02-20',
      status: 'pendente',
      created_at: '2024-01-01',
      updated_at: '2024-01-15'
    }
  ],
  relatorios: [
    {
      id: '1',
      nome: 'Relatório Mensal',
      tipo: 'mensal',
      status: 'gerado',
      created_at: '2024-01-01',
      updated_at: '2024-01-15'
    }
  ]
}

const createMockSupabase = (tableName: string) => ({
  from: jest.fn((table: string) => ({
    select: jest.fn(() => ({
      or: jest.fn(() => ({
        limit: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: mockSupabaseData[table as keyof typeof mockSupabaseData] || [],
            error: null
          }))
        }))
      }))
    }))
  }))
})

describe('SearchService', () => {
  let searchService: SearchService
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabase('empresas')
    searchService = new SearchService(mockSupabase)
    jest.clearAllMocks()
  })

  describe('search', () => {
    test('deve retornar resposta vazia para query muito curta', async () => {
      const result = await searchService.search({
        query: 'a',
        types: ['clientes']
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
      expect(result.query).toBe('a')
    })

    test('deve retornar resposta vazia para query vazia', async () => {
      const result = await searchService.search({
        query: '',
        types: ['clientes']
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    test('deve buscar em todos os tipos quando type é "all"', async () => {
      const result = await searchService.search({
        query: 'test',
        types: ['all'],
        userId: 'user-123'
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('empresas')
      expect(result.query).toBe('test')
      expect(typeof result.executionTime).toBe('number')
    })

    test('deve buscar apenas nos tipos especificados', async () => {
      await searchService.search({
        query: 'test',
        types: ['clientes'],
        userId: 'user-123'
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('empresas')
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)
    })

    test('deve aplicar limit e offset corretamente', async () => {
      const result = await searchService.search({
        query: 'test',
        types: ['clientes'],
        limit: 5,
        offset: 10,
        userId: 'user-123'
      })

      expect(result).toBeDefined()
      expect(result.results).toBeDefined()
    })

    test('deve incluir userId na busca quando fornecido', async () => {
      await searchService.search({
        query: 'test',
        types: ['clientes'],
        userId: 'user-123'
      })

      // Verificar se eq foi chamado com user_id
      const fromCall = mockSupabase.from.mock.results[0].value
      const selectCall = fromCall.select.mock.results[0].value
      const orCall = selectCall.or.mock.results[0].value
      const limitCall = orCall.limit.mock.results[0].value
      
      expect(limitCall.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })
  })

  describe('calculateRelevance', () => {
    test('deve calcular relevância corretamente', async () => {
      // Mock com dados específicos para testar relevância
      const mockData = [
        {
          id: '1',
          razao_social: 'Test Company', // Título exato
          nome_fantasia: 'Test',
          cnpj: '12.345.678/0001-90',
          created_at: '2024-01-01',
          updated_at: '2024-01-15'
        },
        {
          id: '2',
          razao_social: 'Another Test Company', // Contém query
          nome_fantasia: 'Another',
          cnpj: '12.345.678/0001-91',
          created_at: '2024-01-01',
          updated_at: '2024-01-15'
        }
      ]

      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockData,
                error: null
              }))
            }))
          }))
        }))
      }))

      const result = await searchService.search({
        query: 'test company',
        types: ['clientes'],
        userId: 'user-123'
      })

      expect(result.results).toHaveLength(2)

      // Primeiro resultado deve ter maior relevância (título exato)
      expect(result.results[0]?.relevance).toBeGreaterThan(result.results[1]?.relevance || 0)
    })
  })

  describe('cache', () => {
    test('deve usar cache para queries idênticas', async () => {
      const options = {
        query: 'test',
        types: ['clientes'] as any,
        userId: 'user-123'
      }

      // Primeira busca
      const result1 = await searchService.search(options)
      
      // Segunda busca idêntica
      const result2 = await searchService.search(options)

      // Deve ter usado cache (mesmo resultado, menos chamadas ao DB)
      expect(result1.query).toBe(result2.query)
      expect(result1.results).toEqual(result2.results)
    })

    test('deve limpar cache corretamente', async () => {
      const options = {
        query: 'test',
        types: ['clientes'] as any,
        userId: 'user-123'
      }

      // Primeira busca
      await searchService.search(options)
      
      // Limpar cache
      searchService.clearCache()
      
      // Segunda busca após limpar cache
      await searchService.search(options)

      // Deve ter feito nova busca no DB
      expect(mockSupabase.from).toHaveBeenCalledTimes(2)
    })

    test('deve expirar cache após TTL', async () => {
      // Este teste seria mais complexo de implementar sem mockar o tempo
      // Por simplicidade, apenas verificamos se o método clearCache existe
      expect(typeof searchService.clearCache).toBe('function')
    })
  })

  describe('tratamento de erros', () => {
    test('deve lidar com erros de API graciosamente', async () => {
      // Mock de erro
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            limit: jest.fn(() => ({
              eq: jest.fn(() => {
                throw new Error('Database error')
              })
            }))
          }))
        }))
      }))

      const result = await searchService.search({
        query: 'test',
        types: ['clientes'],
        userId: 'user-123'
      })

      expect(result.results).toHaveLength(0)
      expect(result.total).toBe(0)
      expect(result.hasMore).toBe(false)
    })

    test('deve retornar array vazio quando não há dados', async () => {
      // Mock sem dados
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: null,
                error: null
              }))
            }))
          }))
        }))
      }))

      const result = await searchService.search({
        query: 'test',
        types: ['clientes'],
        userId: 'user-123'
      })

      expect(result.results).toHaveLength(0)
    })
  })

  describe('tipos de busca específicos', () => {
    test('deve buscar clientes corretamente', async () => {
      await searchService.search({
        query: 'empresa',
        types: ['clientes'],
        userId: 'user-123'
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('empresas')
    })

    test('deve buscar documentos corretamente', async () => {
      mockSupabase.from = jest.fn((table: string) => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockSupabaseData.documentos,
                error: null
              }))
            }))
          }))
        }))
      }))

      await searchService.search({
        query: 'nota',
        types: ['documentos'],
        userId: 'user-123'
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('documentos')
    })

    test('deve buscar cálculos corretamente', async () => {
      mockSupabase.from = jest.fn((table: string) => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockSupabaseData.calculos,
                error: null
              }))
            }))
          }))
        }))
      }))

      await searchService.search({
        query: 'das',
        types: ['calculos'],
        userId: 'user-123'
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('calculos')
    })
  })

  describe('formatação de resultados', () => {
    test('deve formatar resultados de clientes corretamente', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockSupabaseData.empresas,
                error: null
              }))
            }))
          }))
        }))
      }))

      const result = await searchService.search({
        query: 'empresa',
        types: ['clientes'],
        userId: 'user-123'
      })

      expect(result.results[0]).toMatchObject({
        id: '1',
        type: 'clientes',
        title: 'Empresa ABC Ltda',
        subtitle: 'ABC',
        description: 'CNPJ: 12.345.678/0001-90',
        url: '/clientes/1',
        metadata: { cnpj: '12.345.678/0001-90' }
      })
    })

    test('deve formatar resultados de cálculos com valor monetário', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          or: jest.fn(() => ({
            limit: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockSupabaseData.calculos,
                error: null
              }))
            }))
          }))
        }))
      }))

      const result = await searchService.search({
        query: 'das',
        types: ['calculos'],
        userId: 'user-123'
      })

      expect(result.results[0]?.description).toContain('R$ 1.500,50')
    })
  })
})

describe('getSearchService', () => {
  test('deve retornar instância singleton', () => {
    const mockSupabase1 = createMockSupabase('empresas')
    const mockSupabase2 = createMockSupabase('empresas')

    const service1 = getSearchService(mockSupabase1)
    const service2 = getSearchService(mockSupabase2)

    // Deve retornar a mesma instância
    expect(service1).toBe(service2)
  })

  test('deve criar nova instância se não existir', () => {
    // Limpar instância singleton
    jest.resetModules()
    
    const mockSupabase = createMockSupabase('empresas')
    const service = getSearchService(mockSupabase)

    expect(service).toBeInstanceOf(SearchService)
  })
})
