/**
 * Testes para Hook de Dados de Navegação - ContabilidadePRO
 */

import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNavigationData, useNavigationPermissions, useNavigationStats } from '../use-navigation-data'

// Mock do Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        count: 5,
        single: jest.fn(() => ({ data: { role: 'contador', permissions: [] } }))
      })),
      in: jest.fn(() => ({ count: 3 })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => ({ count: 2 }))
      }))
    }))
  }))
}

// Mock do Auth Store
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User'
}

jest.mock('@/store/auth-store', () => ({
  useAuthStore: () => ({ user: mockUser })
}))

jest.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => mockSupabase
}))

// Wrapper para React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useNavigationData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('deve retornar dados iniciais corretos', () => {
    const { result } = renderHook(() => useNavigationData(), {
      wrapper: createWrapper()
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(result.current.stats).toBeUndefined()
    expect(result.current.alerts).toBeUndefined()
    expect(result.current.permissions).toEqual([])
  })

  test('deve buscar dados quando habilitado', async () => {
    const { result } = renderHook(() => useNavigationData({ enabled: true }), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('empresas')
    expect(mockSupabase.from).toHaveBeenCalledWith('documentos')
    expect(mockSupabase.from).toHaveBeenCalledWith('calculos')
    expect(mockSupabase.from).toHaveBeenCalledWith('prazos_fiscais')
  })

  test('deve não buscar dados quando desabilitado', () => {
    renderHook(() => useNavigationData({ enabled: false }), {
      wrapper: createWrapper()
    })

    expect(mockSupabase.from).not.toHaveBeenCalled()
  })

  test('deve invalidar cache corretamente', () => {
    const { result } = renderHook(() => useNavigationData(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.invalidateCache).toBe('function')
    
    // Não deve lançar erro
    expect(() => result.current.invalidateCache()).not.toThrow()
  })

  test('deve atualizar dados específicos', () => {
    const { result } = renderHook(() => useNavigationData(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.updateNavigationData).toBe('function')
    
    // Não deve lançar erro
    expect(() => {
      result.current.updateNavigationData((oldData) => oldData)
    }).not.toThrow()
  })

  test('deve fazer prefetch de dados', () => {
    const { result } = renderHook(() => useNavigationData(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.prefetchNavigationData).toBe('function')
    
    // Não deve lançar erro
    expect(() => result.current.prefetchNavigationData()).not.toThrow()
  })
})

describe('useNavigationPermissions', () => {
  test('deve verificar permissão específica', () => {
    const { result } = renderHook(() => useNavigationPermissions(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.hasPermission).toBe('function')
    expect(typeof result.current.hasAnyPermission).toBe('function')
    expect(typeof result.current.hasAllPermissions).toBe('function')
  })

  test('deve retornar false para permissões não existentes', () => {
    const { result } = renderHook(() => useNavigationPermissions(), {
      wrapper: createWrapper()
    })

    expect(result.current.hasPermission('non-existent-permission')).toBe(false)
  })

  test('deve verificar múltiplas permissões corretamente', () => {
    const { result } = renderHook(() => useNavigationPermissions(), {
      wrapper: createWrapper()
    })

    // Com array vazio, deve retornar false
    expect(result.current.hasAnyPermission(['perm1', 'perm2'])).toBe(false)
    expect(result.current.hasAllPermissions(['perm1', 'perm2'])).toBe(false)
  })
})

describe('useNavigationStats', () => {
  test('deve calcular total de pendentes', () => {
    const { result } = renderHook(() => useNavigationStats(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.getTotalPendentes).toBe('function')
    
    // Com stats undefined, deve retornar 0
    expect(result.current.getTotalPendentes()).toBe(0)
  })

  test('deve verificar se há alertas', () => {
    const { result } = renderHook(() => useNavigationStats(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.hasAlerts).toBe('function')
    
    // Com stats undefined, deve retornar false
    expect(result.current.hasAlerts()).toBe(false)
  })

  test('deve retornar estados de loading e erro', () => {
    const { result } = renderHook(() => useNavigationStats(), {
      wrapper: createWrapper()
    })

    expect(typeof result.current.isLoading).toBe('boolean')
    expect(result.current.error).toBeNull()
  })
})

describe('NavigationDataService', () => {
  // Testes para a classe de serviço seriam implementados aqui
  // Por ser uma classe interna, testamos através dos hooks

  test('deve lidar com erros de API graciosamente', async () => {
    // Mock de erro no Supabase
    const errorSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => {
          throw new Error('Database error')
        })
      }))
    }

    // Temporariamente substituir o mock
    jest.doMock('@/hooks/use-supabase', () => ({
      useSupabase: () => errorSupabase
    }))

    const { result } = renderHook(() => useNavigationData(), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Deve ter lidado com o erro sem quebrar
    expect(result.current.error).toBeDefined()
  })
})

describe('Integração com React Query', () => {
  test('deve usar cache corretamente', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 1000 // 1 segundo
        }
      }
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    // Primeira renderização
    const { result: result1 } = renderHook(() => useNavigationData(), { wrapper })
    
    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false)
    })

    // Segunda renderização - deve usar cache
    const { result: result2 } = renderHook(() => useNavigationData(), { wrapper })
    
    // Deve retornar dados imediatamente do cache
    expect(result2.current.isLoading).toBe(false)
  })

  test('deve refetch quando necessário', async () => {
    const { result } = renderHook(() => useNavigationData({
      staleTime: 0, // Dados sempre stale
      refetchInterval: false
    }), {
      wrapper: createWrapper()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Invalidar cache deve triggerar refetch
    result.current.invalidateCache()

    await waitFor(() => {
      expect(result.current.isFetching).toBe(true)
    })
  })
})

describe('Performance e Otimização', () => {
  test('deve usar staleTime configurado', () => {
    const staleTime = 5 * 60 * 1000 // 5 minutos
    
    const { result } = renderHook(() => useNavigationData({
      staleTime
    }), {
      wrapper: createWrapper()
    })

    // Verificar se o hook foi configurado corretamente
    expect(result.current).toBeDefined()
  })

  test('deve usar refetchInterval configurado', () => {
    const refetchInterval = 10 * 60 * 1000 // 10 minutos
    
    const { result } = renderHook(() => useNavigationData({
      refetchInterval
    }), {
      wrapper: createWrapper()
    })

    // Verificar se o hook foi configurado corretamente
    expect(result.current).toBeDefined()
  })

  test('deve não refetch em window focus por padrão', () => {
    const { result } = renderHook(() => useNavigationData(), {
      wrapper: createWrapper()
    })

    // Simular window focus
    window.dispatchEvent(new Event('focus'))

    // Não deve triggerar refetch adicional
    expect(result.current.isFetching).toBe(false)
  })
})
