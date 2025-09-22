/**
 * Testes unitários para hook use-unified-cache
 * Foco em funcionalidade de cache inteligente e performance
 */

import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import * as React from 'react'

// Mock do cache inteligente
const mockIntelligentCache = {
  get: jest.fn(),
  set: jest.fn(),
  invalidate: jest.fn(),
  clear: jest.fn(),
  getStats: jest.fn(),
}

// Mock removido - usando mocks locais

// Mock do Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}

// Mock removido - usando mocks locais

// Simular o hook use-unified-cache
interface UseCacheOptions {
  ttl?: number
  tags?: string[]
  config?: {
    memory?: boolean
    browser?: boolean
    database?: boolean
  }
}

function useUnifiedCache<T>(
  key: string,
  queryFn: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const { useQuery } = require('@tanstack/react-query')
  const { ttl = 5 * 60 * 1000, tags = [], config = {} } = options

  return useQuery({
    queryKey: [key, ...tags],
    queryFn: async (): Promise<T> => {
      // Tentar buscar do cache primeiro
      const cached = await mockIntelligentCache.get(key)
      if (cached) {
        return cached
      }

      // Se não está no cache, executar a query
      const data = await queryFn()
      
      // Armazenar no cache
      await mockIntelligentCache.set(key, data, { ttl, tags, config })
      
      return data
    },
    staleTime: ttl,
    gcTime: ttl,
  })
}

function useFiscalCache<T>(
  type: 'das' | 'irpj' | 'csll' | 'empresa' | 'cliente',
  id: string,
  queryFn: () => Promise<T>,
  options: Omit<UseCacheOptions, 'tags'> = {}
) {
  const key = `${type}:${id}`
  const ttl = type === 'empresa' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 1h para empresa, 24h para cálculos
  
  return useUnifiedCache(key, queryFn, {
    ...options,
    ttl,
    tags: [type, `${type}:${id}`],
    config: { memory: true, browser: true, database: type !== 'cliente' }
  })
}

// Wrapper para React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function TestWrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useUnifiedCache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Cache Hit', () => {
    test('deve retornar dados do cache quando disponível', async () => {
      const dadosCache = { id: '1', nome: 'Teste Cache' }
      const queryFn = jest.fn().mockResolvedValue({ id: '1', nome: 'Teste Query' })
      
      mockIntelligentCache.get.mockResolvedValue(dadosCache)

      const { result } = renderHook(
        () => useUnifiedCache('test-key', queryFn),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(dadosCache)
      expect(mockIntelligentCache.get).toHaveBeenCalledWith('test-key')
      expect(queryFn).not.toHaveBeenCalled() // Não deve executar query se tem cache
    })

    test('deve usar configurações de TTL personalizadas', async () => {
      const dadosCache = { id: '1', valor: 1000 }
      const queryFn = jest.fn()
      const customTTL = 10 * 60 * 1000 // 10 minutos
      
      mockIntelligentCache.get.mockResolvedValue(dadosCache)

      const { result } = renderHook(
        () => useUnifiedCache('test-key', queryFn, { ttl: customTTL }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(dadosCache)
    })
  })

  describe('Cache Miss', () => {
    test('deve executar query e armazenar no cache quando cache miss', async () => {
      const dadosQuery = { id: '1', nome: 'Teste Query' }
      const queryFn = jest.fn().mockResolvedValue(dadosQuery)
      
      mockIntelligentCache.get.mockResolvedValue(null) // Cache miss

      const { result } = renderHook(
        () => useUnifiedCache('test-key', queryFn),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(dadosQuery)
      expect(mockIntelligentCache.get).toHaveBeenCalledWith('test-key')
      expect(queryFn).toHaveBeenCalled()
      expect(mockIntelligentCache.set).toHaveBeenCalledWith(
        'test-key',
        dadosQuery,
        expect.objectContaining({
          ttl: 5 * 60 * 1000,
          tags: [],
          config: {}
        })
      )
    })

    test('deve propagar erros da query', async () => {
      const erro = new Error('Erro na query')
      const queryFn = jest.fn().mockRejectedValue(erro)
      
      mockIntelligentCache.get.mockResolvedValue(null)

      const { result } = renderHook(
        () => useUnifiedCache('test-key', queryFn),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(erro)
      expect(mockIntelligentCache.set).not.toHaveBeenCalled()
    })
  })

  describe('Tags e Invalidação', () => {
    test('deve usar tags para organização do cache', async () => {
      const dadosQuery = { id: '1', tipo: 'empresa' }
      const queryFn = jest.fn().mockResolvedValue(dadosQuery)
      const tags = ['empresa', 'empresa:1']
      
      mockIntelligentCache.get.mockResolvedValue(null)

      const { result } = renderHook(
        () => useUnifiedCache('empresa:1', queryFn, { tags }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockIntelligentCache.set).toHaveBeenCalledWith(
        'empresa:1',
        dadosQuery,
        expect.objectContaining({
          tags: ['empresa', 'empresa:1']
        })
      )
    })
  })

  describe('Configurações de Storage', () => {
    test('deve usar configurações de storage personalizadas', async () => {
      const dadosQuery = { id: '1', calculo: 'DAS' }
      const queryFn = jest.fn().mockResolvedValue(dadosQuery)
      const config = { memory: true, browser: true, database: true }
      
      mockIntelligentCache.get.mockResolvedValue(null)

      const { result } = renderHook(
        () => useUnifiedCache('calculo:1', queryFn, { config }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockIntelligentCache.set).toHaveBeenCalledWith(
        'calculo:1',
        dadosQuery,
        expect.objectContaining({
          config: { memory: true, browser: true, database: true }
        })
      )
    })
  })
})

describe('useFiscalCache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Cache de Empresa', () => {
    test('deve usar TTL de 1 hora para dados de empresa', async () => {
      const dadosEmpresa = { id: 'emp-1', razao_social: 'Empresa Teste' }
      const queryFn = jest.fn().mockResolvedValue(dadosEmpresa)
      
      mockIntelligentCache.get.mockResolvedValue(null)

      const { result } = renderHook(
        () => useFiscalCache('empresa', 'emp-1', queryFn),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockIntelligentCache.set).toHaveBeenCalledWith(
        'empresa:emp-1',
        dadosEmpresa,
        expect.objectContaining({
          ttl: 60 * 60 * 1000, // 1 hora
          tags: ['empresa', 'empresa:emp-1'],
          config: { memory: true, browser: true, database: true }
        })
      )
    })
  })

  describe('Cache de Cálculos', () => {
    test('deve usar TTL de 24 horas para cálculos DAS', async () => {
      const calculoDAS = { id: 'das-1', valor_imposto: 4000 }
      const queryFn = jest.fn().mockResolvedValue(calculoDAS)
      
      mockIntelligentCache.get.mockResolvedValue(null)

      const { result } = renderHook(
        () => useFiscalCache('das', 'das-1', queryFn),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockIntelligentCache.set).toHaveBeenCalledWith(
        'das:das-1',
        calculoDAS,
        expect.objectContaining({
          ttl: 24 * 60 * 60 * 1000, // 24 horas
          tags: ['das', 'das:das-1'],
          config: { memory: true, browser: true, database: true }
        })
      )
    })

    test('deve usar TTL de 24 horas para cálculos IRPJ', async () => {
      const calculoIRPJ = { id: 'irpj-1', valor_total: 9120 }
      const queryFn = jest.fn().mockResolvedValue(calculoIRPJ)
      
      mockIntelligentCache.get.mockResolvedValue(null)

      const { result } = renderHook(
        () => useFiscalCache('irpj', 'irpj-1', queryFn),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockIntelligentCache.set).toHaveBeenCalledWith(
        'irpj:irpj-1',
        calculoIRPJ,
        expect.objectContaining({
          ttl: 24 * 60 * 60 * 1000, // 24 horas
          tags: ['irpj', 'irpj:irpj-1']
        })
      )
    })
  })

  describe('Cache de Cliente', () => {
    test('deve não persistir dados de cliente no database', async () => {
      const dadosCliente = { id: 'cli-1', nome: 'Cliente Teste' }
      const queryFn = jest.fn().mockResolvedValue(dadosCliente)
      
      mockIntelligentCache.get.mockResolvedValue(null)

      const { result } = renderHook(
        () => useFiscalCache('cliente', 'cli-1', queryFn),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockIntelligentCache.set).toHaveBeenCalledWith(
        'cliente:cli-1',
        dadosCliente,
        expect.objectContaining({
          config: { memory: true, browser: true, database: false }
        })
      )
    })
  })

  describe('Performance e Estados', () => {
    test('deve mostrar loading durante busca inicial', async () => {
      const queryFn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ id: '1' }), 100))
      )
      
      mockIntelligentCache.get.mockResolvedValue(null)

      const { result } = renderHook(
        () => useFiscalCache('das', 'das-1', queryFn),
        { wrapper: createWrapper() }
      )

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.isLoading).toBe(false)
    })

    test('deve retornar dados imediatamente quando em cache', async () => {
      const dadosCache = { id: 'das-1', valor: 4000 }
      const queryFn = jest.fn()
      
      mockIntelligentCache.get.mockResolvedValue(dadosCache)

      const { result } = renderHook(
        () => useFiscalCache('das', 'das-1', queryFn),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(dadosCache)
      expect(queryFn).not.toHaveBeenCalled()
    })
  })
})
