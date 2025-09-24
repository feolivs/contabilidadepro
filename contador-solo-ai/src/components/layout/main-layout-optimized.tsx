/**
 * Layout Principal Otimizado - Fase 2
 * Integração dos componentes otimizados com performance superior
 */

'use client'

import React, { Suspense } from 'react'
import { SidebarOptimized } from './sidebar-optimized'
import { Header } from './header'
import { UniversalLoading } from '@/components/ui/loading-states'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  withIntelligentMemo, 
  useRenderAnalytics,
  useIntelligentCallback 
} from '@/lib/advanced-memoization'
import { performanceMonitor } from '@/lib/performance-testing'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface MainLayoutOptimizedProps {
  children: React.ReactNode
}

// =====================================================
// COMPONENTE PRINCIPAL OTIMIZADO
// =====================================================

export const MainLayoutOptimized = withIntelligentMemo<MainLayoutOptimizedProps>(({ 
  children 
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const { logRender } = useRenderAnalytics('MainLayoutOptimized', { sidebarOpen })

  // Callback otimizado para controle da sidebar
  const handleSidebarToggle = useIntelligentCallback(() => {
    setSidebarOpen(true)
    logRender('sidebar opened')
  }, [], { key: 'sidebar-toggle' })

  const handleSidebarClose = useIntelligentCallback((open: boolean) => {
    setSidebarOpen(open)
    if (!open) {
      logRender('sidebar closed')
    }
  }, [], { key: 'sidebar-close' })

  // Iniciar monitoramento de performance
  React.useEffect(() => {
    performanceMonitor.startMonitoring()
    return () => performanceMonitor.stopMonitoring()
  }, [])

  logRender('main layout rendered')

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar Otimizada */}
      <Suspense fallback={<UniversalLoading type="sidebar" />}>
        <SidebarOptimized 
          open={sidebarOpen} 
          onOpenChange={handleSidebarClose} 
        />
      </Suspense>
      
      {/* Conteúdo Principal */}
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-64">
        {/* Header Unificado - Variante Otimizada */}
        <Suspense fallback={<Skeleton className="h-16 w-full" />}>
          <Header
            onMenuClick={handleSidebarToggle}
            variant="optimized"
            showBreadcrumbs={true}
            showSearch={true}
            showNotifications={true}
            showQuickActions={true}
            enableOptimizations={true}
          />
        </Suspense>

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            <Suspense fallback={<UniversalLoading type="page" text="Carregando conteúdo..." />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}, { 
  deepCompare: true, 
  analytics: true, 
  displayName: 'MainLayoutOptimized' 
})

// =====================================================
// COMPONENTE DE TRANSIÇÃO
// =====================================================

/**
 * Componente para migração gradual do layout antigo para o otimizado
 */
export const MainLayoutWithFallback: React.FC<MainLayoutOptimizedProps> = ({ children }) => {
  const [useOptimized, setUseOptimized] = React.useState(false)

  // Detectar se deve usar versão otimizada baseado em feature flags ou condições
  React.useEffect(() => {
    // Verificar se o usuário tem feature flag habilitada
    const hasOptimizedFlag = localStorage.getItem('use-optimized-layout') === 'true'
    
    // Ou verificar se é um ambiente de desenvolvimento
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Ou verificar performance do dispositivo
    const hasGoodPerformance = navigator.hardwareConcurrency >= 4
    
    setUseOptimized(hasOptimizedFlag || isDevelopment || hasGoodPerformance)
  }, [])

  if (useOptimized) {
    return <MainLayoutOptimized>{children}</MainLayoutOptimized>
  }

  // Import direto do layout original - não lazy load no fallback
  const { MainLayout } = require('./main-layout')

  return <MainLayout>{children}</MainLayout>
}

// =====================================================
// HOOK PARA CONTROLE DE PERFORMANCE
// =====================================================

export function useLayoutPerformance() {
  const [metrics, setMetrics] = React.useState<any>(null)
  const [isOptimized, setIsOptimized] = React.useState(false)

  React.useEffect(() => {
    const updateMetrics = () => {
      const report = performanceMonitor.generateReport()
      setMetrics(report)
      
      // Decidir se deve usar layout otimizado baseado na performance
      const shouldOptimize = report.summary.score > 70
      setIsOptimized(shouldOptimize)
    }

    // Atualizar métricas a cada 30 segundos
    const interval = setInterval(updateMetrics, 30000)
    updateMetrics() // Primeira execução

    return () => clearInterval(interval)
  }, [])

  const enableOptimizedLayout = React.useCallback(() => {
    localStorage.setItem('use-optimized-layout', 'true')
    window.location.reload()
  }, [])

  const disableOptimizedLayout = React.useCallback(() => {
    localStorage.setItem('use-optimized-layout', 'false')
    window.location.reload()
  }, [])

  return {
    metrics,
    isOptimized,
    enableOptimizedLayout,
    disableOptimizedLayout
  }
}

// =====================================================
// COMPONENTE DE DEBUG DE PERFORMANCE
// =====================================================

export const PerformanceDebugger: React.FC = () => {
  const { metrics, isOptimized, enableOptimizedLayout, disableOptimizedLayout } = useLayoutPerformance()
  const [isVisible, setIsVisible] = React.useState(false)

  // Mostrar apenas em desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      {/* Botão flutuante para abrir debugger */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700"
        title="Performance Debugger"
      >
        📊
      </button>

      {/* Panel de debug */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-white dark:bg-gray-800 border rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Performance Debug</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {metrics && (
            <div className="space-y-3 text-sm">
              <div>
                <strong>Score:</strong> {metrics.summary.score}/100
              </div>
              <div>
                <strong>Layout:</strong> {isOptimized ? 'Otimizado' : 'Original'}
              </div>
              <div>
                <strong>Testes:</strong> {metrics.summary.passed}/{metrics.summary.total}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={enableOptimizedLayout}
                  className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                >
                  Ativar Otimizado
                </button>
                <button
                  onClick={disableOptimizedLayout}
                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  Usar Original
                </button>
              </div>

              {metrics.recommendations.length > 0 && (
                <div>
                  <strong>Recomendações:</strong>
                  <ul className="list-disc list-inside text-xs mt-1">
                    {metrics.recommendations.slice(0, 3).map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
