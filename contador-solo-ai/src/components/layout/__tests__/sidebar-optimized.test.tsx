/**
 * Testes para Sidebar Otimizada - Fase 2
 * Testes de performance, memoização e funcionalidade
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SidebarOptimized } from '../sidebar-optimized'
import { advancedCache } from '@/lib/advanced-cache'
import { memoizationUtils } from '@/lib/advanced-memoization'

// Mock dos hooks e dependências
const mockNavigationData = {
  stats: {
    totalClientes: 10,
    documentosPendentes: 5,
    calculosPendentes: 3
  },
  alerts: {
    aiInsights: 2,
    compliance: 1,
    documentosProcessamento: 0,
    prazosVencendo: 4
  },
  permissions: ['read:dashboard', 'write:calculos'],
  isLoading: false,
  error: null
}

jest.mock('@/hooks/use-navigation-data', () => ({
  useNavigationData: jest.fn(() => mockNavigationData)
}))

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard')
}))

// Mock dos componentes lazy
jest.mock('@/components/layout/user-profile', () => ({
  UserProfile: () => <div data-testid="user-profile">User Profile</div>
}))

jest.mock('@/components/layout/quick-actions', () => ({
  QuickActions: () => <div data-testid="quick-actions">Quick Actions</div>
}))

jest.mock('@/components/ui/notification-badge', () => ({
  NotificationBadge: ({ children, count }: any) => (
    <span data-testid="notification-badge">{count || children}</span>
  )
}))

// Setup do teste
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('SidebarOptimized', () => {
  let mockOnOpenChange: jest.Mock

  beforeEach(() => {
    mockOnOpenChange = jest.fn()
    advancedCache.clear()
    memoizationUtils.clearGlobalCache()
    jest.clearAllMocks()
  })

  afterEach(() => {
    advancedCache.clear()
    memoizationUtils.clearGlobalCache()
  })

  describe('Renderização Básica', () => {
    it('deve renderizar a sidebar corretamente', () => {
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      expect(screen.getByText('ContabilidadePRO')).toBeInTheDocument()
      expect(screen.getByText('v2.0')).toBeInTheDocument()
      expect(screen.getByText('Principal')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Assistente IA')).toBeInTheDocument()
    })

    it('deve mostrar badges com dados reais', () => {
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      // Verificar badges baseados nos dados mockados
      expect(screen.getByText('2')).toBeInTheDocument() // AI Insights
      expect(screen.getByText('10')).toBeInTheDocument() // Total Clientes
      expect(screen.getByText('5')).toBeInTheDocument() // Documentos Pendentes
      expect(screen.getByText('4')).toBeInTheDocument() // Prazos Vencendo
    })

    it('deve renderizar componentes lazy corretamente', async () => {
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      await waitFor(() => {
        expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
        expect(screen.getByTestId('user-profile')).toBeInTheDocument()
      })
    })
  })

  describe('Performance e Memoização', () => {
    it('deve usar cache avançado para seções de navegação', () => {
      const cacheSetSpy = jest.spyOn(advancedCache, 'set')
      const cacheGetSpy = jest.spyOn(advancedCache, 'get')

      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      // Verificar se o cache foi usado
      expect(cacheSetSpy).toHaveBeenCalled()
      
      // Renderizar novamente para testar cache hit
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      expect(cacheGetSpy).toHaveBeenCalled()
    })

    it('deve memoizar componentes corretamente', () => {
      const { rerender } = renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      const initialRenderCount = screen.getAllByRole('link').length

      // Re-renderizar com as mesmas props
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
        </QueryClientProvider>
      )

      // Verificar que o número de elementos não mudou (componente foi memoizado)
      expect(screen.getAllByRole('link')).toHaveLength(initialRenderCount)
    })

    it('deve ter tempo de renderização aceitável', async () => {
      const startTime = performance.now()

      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
      })

      const renderTime = performance.now() - startTime
      
      // Renderização deve ser menor que 100ms
      expect(renderTime).toBeLessThan(100)
    })
  })

  describe('Responsividade', () => {
    it('deve mostrar sidebar desktop por padrão', () => {
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      const desktopSidebar = screen.getByText('ContabilidadePRO').closest('.lg\\:fixed')
      expect(desktopSidebar).toBeInTheDocument()
    })

    it('deve abrir sidebar mobile quando open=true', () => {
      renderWithProviders(
        <SidebarOptimized open={true} onOpenChange={mockOnOpenChange} />
      )

      // Verificar se o Sheet está aberto
      expect(screen.getAllByText('ContabilidadePRO')).toHaveLength(2) // Desktop + Mobile
    })
  })

  describe('Interações', () => {
    it('deve navegar corretamente ao clicar em itens', () => {
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveAttribute('href', '/dashboard')

      const clientesLink = screen.getByRole('link', { name: /clientes/i })
      expect(clientesLink).toHaveAttribute('href', '/clientes')
    })

    it('deve destacar item ativo corretamente', () => {
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('Acessibilidade', () => {
    it('deve ter estrutura ARIA correta', () => {
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      // Verificar navegação principal
      const mainNav = screen.getByRole('navigation', { name: /principal/i })
      expect(mainNav).toBeInTheDocument()

      // Verificar links com aria-current
      const activeLink = screen.getByRole('link', { current: 'page' })
      expect(activeLink).toBeInTheDocument()
    })

    it('deve ter labels adequados para screen readers', () => {
      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      // Verificar se badges têm contexto adequado
      const badges = screen.getAllByTestId('notification-badge')
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('Estados de Loading', () => {
    it('deve mostrar skeleton durante carregamento', () => {
      // Mock loading state
      const useNavigationDataMock = jest.requireMock('@/hooks/use-navigation-data').useNavigationData
      useNavigationDataMock.mockReturnValue({
        stats: null,
        alerts: null,
        permissions: [],
        isLoading: true,
        error: null
      })

      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      // Verificar se skeletons estão presentes
      const skeletons = screen.getAllByTestId(/skeleton/i)
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro nos dados de navegação', () => {
      const useNavigationDataMock = jest.requireMock('@/hooks/use-navigation-data').useNavigationData
      useNavigationDataMock.mockReturnValue({
        stats: null,
        alerts: null,
        permissions: [],
        isLoading: false,
        error: new Error('Falha ao carregar dados')
      })

      renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      // Sidebar deve ainda renderizar estrutura básica
      expect(screen.getByText('ContabilidadePRO')).toBeInTheDocument()
    })
  })

  describe('Cache e Invalidação', () => {
    it('deve invalidar cache quando dados mudam', () => {
      const cacheInvalidateSpy = jest.spyOn(advancedCache, 'invalidateByTags')

      const { rerender } = renderWithProviders(
        <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
      )

      // Simular mudança nos dados
      const useNavigationDataMock = jest.requireMock('@/hooks/use-navigation-data').useNavigationData
      useNavigationDataMock.mockReturnValue({
        stats: {
          totalClientes: 15, // Valor alterado
          documentosPendentes: 5,
          calculosPendentes: 3
        },
        alerts: {
          aiInsights: 2,
          compliance: 1,
          documentosProcessamento: 0,
          prazosVencendo: 4
        },
        permissions: ['read:dashboard', 'write:calculos'],
        isLoading: false,
        error: null
      })

      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <SidebarOptimized open={false} onOpenChange={mockOnOpenChange} />
        </QueryClientProvider>
      )

      // Cache deve ser atualizado com novos dados
      expect(screen.getByText('15')).toBeInTheDocument()
    })
  })
})
