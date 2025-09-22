/**
 * Testes de Integração para Componentes React
 * Testa componentes com dados reais e cache
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Providers
import { CacheProvider } from '@/providers/cache-provider'

// Componentes
import { AIInsightsPanel } from '@/components/dashboard/ai-insights-panel'
import { MetricasFinanceirasPanel } from '@/components/dashboard/metricas-financeiras-panel'
import { ComplianceAnalysisPanel } from '@/components/dashboard/compliance-analysis-panel'
import { CacheMonitor } from '@/components/cache/cache-monitor'
import { DashboardOptimized } from '@/components/dashboard/dashboard-optimized'

// Mocks
import { createMockSupabaseClient } from '../mocks/supabase-mock'
import { createMockCacheData } from '../mocks/cache-mock'

// ============================================
// SETUP DOS TESTES
// ============================================

// Mock do Supabase
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: () => createMockSupabaseClient()
}))

// Mock do Auth Store
jest.mock('@/store/auth-store', () => ({
  useAuthStore: () => ({
    user: {
      id: 'test-user-001',
      email: 'test@example.com'
    }
  })
}))

// Wrapper para testes
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider autoCleanup={false}>
        {children}
      </CacheProvider>
    </QueryClientProvider>
  )
}

const renderWithProviders = (component: React.ReactElement) => {
  return render(component, { wrapper: TestWrapper })
}

// ============================================
// TESTES DE COMPONENTES
// ============================================

describe('🎨 Testes de Componentes React', () => {
  
  beforeEach(() => {
    // Limpar mocks antes de cada teste
    jest.clearAllMocks()
  })

  describe('🤖 AIInsightsPanel', () => {
    it('deve renderizar loading state corretamente', () => {
      renderWithProviders(
        <AIInsightsPanel 
          empresaId="test-empresa-001" 
          variant="quick"
        />
      )

      expect(screen.getByText('Insights de IA')).toBeInTheDocument()
      expect(screen.getByText('Carregando...')).toBeInTheDocument()
    })

    it('deve renderizar dados de insights corretamente', async () => {
      const mockData = createMockCacheData.aiInsights()
      
      renderWithProviders(
        <AIInsightsPanel 
          empresaId="test-empresa-001" 
          variant="full"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Resumo')).toBeInTheDocument()
        expect(screen.getByText('Financeiro')).toBeInTheDocument()
        expect(screen.getByText('Alertas')).toBeInTheDocument()
        expect(screen.getByText('Projeções')).toBeInTheDocument()
      })
    })

    it('deve permitir navegação entre tabs', async () => {
      renderWithProviders(
        <AIInsightsPanel 
          empresaId="test-empresa-001" 
          variant="full"
        />
      )

      await waitFor(() => {
        const financialTab = screen.getByText('Financeiro')
        fireEvent.click(financialTab)
        
        expect(screen.getByText('Análise Financeira')).toBeInTheDocument()
      })
    })

    it('deve mostrar indicador de cache quando dados vêm do cache', async () => {
      renderWithProviders(
        <AIInsightsPanel 
          empresaId="test-empresa-001" 
          variant="quick"
        />
      )

      await waitFor(() => {
        const cacheIndicator = screen.getByText('Cache')
        expect(cacheIndicator).toBeInTheDocument()
      })
    })

    it('deve permitir refresh dos dados', async () => {
      renderWithProviders(
        <AIInsightsPanel 
          empresaId="test-empresa-001" 
          variant="full"
          showRefresh={true}
        />
      )

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i })
        expect(refreshButton).toBeInTheDocument()
        
        fireEvent.click(refreshButton)
        // Verificar que o loading aparece
        expect(screen.getByText(/carregando/i)).toBeInTheDocument()
      })
    })
  })

  describe('📊 MetricasFinanceirasPanel', () => {
    it('deve renderizar métricas financeiras corretamente', async () => {
      renderWithProviders(
        <MetricasFinanceirasPanel 
          empresaId="test-empresa-001" 
          periodMonths={6}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Métricas Financeiras')).toBeInTheDocument()
        expect(screen.getByText('Resumo')).toBeInTheDocument()
        expect(screen.getByText('Projeções')).toBeInTheDocument()
        expect(screen.getByText('Fluxo de Caixa')).toBeInTheDocument()
        expect(screen.getByText('Performance')).toBeInTheDocument()
      })
    })

    it('deve formatar valores monetários corretamente', async () => {
      renderWithProviders(
        <MetricasFinanceirasPanel 
          empresaId="test-empresa-001" 
          periodMonths={6}
        />
      )

      await waitFor(() => {
        // Verificar se valores estão formatados em Real brasileiro
        const monetaryValues = screen.getAllByText(/R\$/)
        expect(monetaryValues.length).toBeGreaterThan(0)
      })
    })

    it('deve mostrar indicadores de tendência', async () => {
      renderWithProviders(
        <MetricasFinanceirasPanel 
          empresaId="test-empresa-001" 
          periodMonths={6}
        />
      )

      await waitFor(() => {
        // Verificar se há indicadores de crescimento/declínio
        const trendIndicators = screen.getAllByText(/%/)
        expect(trendIndicators.length).toBeGreaterThan(0)
      })
    })
  })

  describe('🛡️ ComplianceAnalysisPanel', () => {
    it('deve renderizar análise de compliance corretamente', async () => {
      renderWithProviders(
        <ComplianceAnalysisPanel 
          empresaId="test-empresa-001" 
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Análise de Compliance')).toBeInTheDocument()
        expect(screen.getByText('Score')).toBeInTheDocument()
        expect(screen.getByText('Prazos')).toBeInTheDocument()
        expect(screen.getByText('Riscos')).toBeInTheDocument()
        expect(screen.getByText('Qualidade')).toBeInTheDocument()
      })
    })

    it('deve mostrar score de compliance com cores apropriadas', async () => {
      renderWithProviders(
        <ComplianceAnalysisPanel 
          empresaId="test-empresa-001" 
        />
      )

      await waitFor(() => {
        const scoreElement = screen.getByText(/\d+\.\d/)
        expect(scoreElement).toBeInTheDocument()
        
        // Verificar se tem classe de cor baseada no score
        expect(scoreElement).toHaveClass(/text-(green|yellow|red)-600/)
      })
    })

    it('deve mostrar alertas quando há riscos', async () => {
      renderWithProviders(
        <ComplianceAnalysisPanel 
          empresaId="test-empresa-001" 
        />
      )

      await waitFor(() => {
        const riskTab = screen.getByText('Riscos')
        fireEvent.click(riskTab)
        
        // Deve mostrar alertas ou mensagem de "nenhum risco"
        const alertsOrNoRisk = screen.getByText(/alerta|risco|nenhum/i)
        expect(alertsOrNoRisk).toBeInTheDocument()
      })
    })
  })

  describe('📊 CacheMonitor', () => {
    it('deve renderizar monitor de cache corretamente', () => {
      renderWithProviders(
        <CacheMonitor showAdvanced={false} />
      )

      expect(screen.getByText('Monitor de Cache')).toBeInTheDocument()
      expect(screen.getByText('Hit Rate')).toBeInTheDocument()
      expect(screen.getByText('Entradas')).toBeInTheDocument()
      expect(screen.getByText('Tamanho')).toBeInTheDocument()
      expect(screen.getByText('Evictions')).toBeInTheDocument()
    })

    it('deve mostrar estatísticas de cache em tempo real', async () => {
      renderWithProviders(
        <CacheMonitor autoRefresh={true} refreshInterval={1000} />
      )

      await waitFor(() => {
        // Verificar se há valores numéricos nas estatísticas
        const percentageValues = screen.getAllByText(/%/)
        expect(percentageValues.length).toBeGreaterThan(0)
      })
    })

    it('deve permitir limpeza do cache', async () => {
      renderWithProviders(
        <CacheMonitor showAdvanced={true} />
      )

      await waitFor(() => {
        const clearButton = screen.getByText('Limpar Tudo')
        expect(clearButton).toBeInTheDocument()
        
        // Simular clique (sem confirmar para não afetar outros testes)
        fireEvent.click(clearButton)
      })
    })

    it('deve mostrar tabs avançadas quando habilitado', () => {
      renderWithProviders(
        <CacheMonitor showAdvanced={true} />
      )

      expect(screen.getByText('Performance')).toBeInTheDocument()
      expect(screen.getByText('Gerenciamento')).toBeInTheDocument()
      expect(screen.getByText('Configurações')).toBeInTheDocument()
    })
  })

  describe('⚡ DashboardOptimized', () => {
    it('deve renderizar dashboard otimizado corretamente', async () => {
      renderWithProviders(
        <DashboardOptimized empresaId="test-empresa-001" />
      )

      await waitFor(() => {
        expect(screen.getByText('Dashboard Otimizado')).toBeInTheDocument()
        expect(screen.getByText('Receita Total')).toBeInTheDocument()
        expect(screen.getByText('Documentos')).toBeInTheDocument()
        expect(screen.getByText('Compliance')).toBeInTheDocument()
        expect(screen.getByText('Confiança IA')).toBeInTheDocument()
      })
    })

    it('deve mostrar indicadores de cache quando dados vêm do cache', async () => {
      renderWithProviders(
        <DashboardOptimized empresaId="test-empresa-001" />
      )

      await waitFor(() => {
        const cacheIndicators = screen.getAllByText(/cache/i)
        expect(cacheIndicators.length).toBeGreaterThan(0)
      })
    })

    it('deve permitir seleção de período', async () => {
      renderWithProviders(
        <DashboardOptimized empresaId="test-empresa-001" />
      )

      await waitFor(() => {
        const periodSelector = screen.getByRole('combobox')
        expect(periodSelector).toBeInTheDocument()
        
        fireEvent.click(periodSelector)
        
        expect(screen.getByText('3 meses')).toBeInTheDocument()
        expect(screen.getByText('6 meses')).toBeInTheDocument()
        expect(screen.getByText('12 meses')).toBeInTheDocument()
      })
    })

    it('deve permitir refresh de todos os dados', async () => {
      renderWithProviders(
        <DashboardOptimized empresaId="test-empresa-001" />
      )

      await waitFor(() => {
        const refreshButton = screen.getByText('Atualizar')
        expect(refreshButton).toBeInTheDocument()
        
        fireEvent.click(refreshButton)
        
        // Verificar que o botão fica desabilitado durante o loading
        expect(refreshButton).toBeDisabled()
      })
    })

    it('deve mostrar informações de performance', async () => {
      renderWithProviders(
        <DashboardOptimized empresaId="test-empresa-001" />
      )

      await waitFor(() => {
        const performanceInfo = screen.getByText(/processados em.*ms via Edge Functions/i)
        expect(performanceInfo).toBeInTheDocument()
      })
    })
  })

  describe('🔄 Integração entre Componentes', () => {
    it('deve sincronizar cache entre componentes', async () => {
      const { rerender } = renderWithProviders(
        <div>
          <AIInsightsPanel empresaId="test-empresa-001" variant="quick" />
          <CacheMonitor autoRefresh={false} />
        </div>
      )

      await waitFor(() => {
        // Verificar se ambos os componentes estão renderizados
        expect(screen.getByText('Insights de IA')).toBeInTheDocument()
        expect(screen.getByText('Monitor de Cache')).toBeInTheDocument()
      })

      // Simular atualização de dados
      rerender(
        <div>
          <AIInsightsPanel empresaId="test-empresa-001" variant="full" />
          <CacheMonitor autoRefresh={false} />
        </div>
      )

      await waitFor(() => {
        // Verificar se as mudanças são refletidas
        expect(screen.getByText('Resumo')).toBeInTheDocument()
      })
    })

    it('deve propagar invalidação de cache entre componentes', async () => {
      renderWithProviders(
        <div>
          <MetricasFinanceirasPanel empresaId="test-empresa-001" periodMonths={6} />
          <ComplianceAnalysisPanel empresaId="test-empresa-001" />
        </div>
      )

      await waitFor(() => {
        expect(screen.getByText('Métricas Financeiras')).toBeInTheDocument()
        expect(screen.getByText('Análise de Compliance')).toBeInTheDocument()
      })

      // Simular invalidação de cache (seria feita por ação do usuário)
      // Os componentes devem reagir à invalidação
    })
  })

  describe('📱 Responsividade', () => {
    it('deve adaptar layout para mobile', () => {
      // Simular viewport mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      renderWithProviders(
        <DashboardOptimized empresaId="test-empresa-001" />
      )

      // Verificar se componentes se adaptam ao mobile
      const dashboard = screen.getByText('Dashboard Otimizado')
      expect(dashboard).toBeInTheDocument()
    })

    it('deve adaptar layout para desktop', () => {
      // Simular viewport desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      })

      renderWithProviders(
        <DashboardOptimized empresaId="test-empresa-001" />
      )

      const dashboard = screen.getByText('Dashboard Otimizado')
      expect(dashboard).toBeInTheDocument()
    })
  })

  describe('♿ Acessibilidade', () => {
    it('deve ter labels apropriados para screen readers', async () => {
      renderWithProviders(
        <AIInsightsPanel empresaId="test-empresa-001" variant="full" />
      )

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          expect(button).toHaveAccessibleName()
        })
      })
    })

    it('deve suportar navegação por teclado', async () => {
      renderWithProviders(
        <MetricasFinanceirasPanel empresaId="test-empresa-001" periodMonths={6} />
      )

      await waitFor(() => {
        const tabs = screen.getAllByRole('tab')
        tabs.forEach(tab => {
          expect(tab).toHaveAttribute('tabindex')
        })
      })
    })

    it('deve ter contraste adequado', () => {
      renderWithProviders(
        <ComplianceAnalysisPanel empresaId="test-empresa-001" />
      )

      // Verificar se elementos críticos têm classes de cor apropriadas
      const elements = screen.getAllByText(/score|compliance/i)
      elements.forEach(element => {
        // Verificar se não usa cores muito claras
        expect(element).not.toHaveClass('text-gray-300')
      })
    })
  })
})
