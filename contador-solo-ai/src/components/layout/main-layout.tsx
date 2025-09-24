'use client'

import React, { useState, Suspense, lazy } from 'react'

interface MainLayoutProps {
  children: React.ReactNode
}

// ETAPA 5: Sidebar funcional sem dependências complexas
function FunctionalSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:bg-gray-900">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center px-4 py-6">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                <span className="text-white font-bold">⚡</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">ContabilidadePRO</h1>
                <p className="text-xs text-gray-400">Sistema Inteligente</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-6">
            <div className="space-y-3">
              <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Principal
              </h3>
              <div className="space-y-1">
                <a href="/dashboard" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md bg-blue-600 text-white">
                  📈 Dashboard
                </a>
                <a href="/assistente" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
                  🤖 Assistente IA
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Gestão
              </h3>
              <div className="space-y-1">
                <a href="/clientes" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
                  👥 Clientes
                </a>
                <a href="/documentos" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
                  📄 Documentos
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Operações
              </h3>
              <div className="space-y-1">
                <a href="/calculos" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
                  🧮 Cálculos Fiscais
                </a>
                <a href="/prazos" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
                  📅 Prazos Fiscais
                </a>
                <a href="/relatorios" className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white">
                  📊 Relatórios
                </a>
              </div>
            </div>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">U</span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Usuário</p>
                <p className="text-xs text-gray-400">Sistema ativo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

const Header = lazy(() =>
  import('./header').then(module => ({ default: module.Header }))
    .catch(() => ({ default: SimpleHeader }))
)

// Sidebar simples como fallback
function SimpleSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <div className="w-64 bg-gray-900 text-white p-4 shadow-lg">
      <div className="mb-6">
        <h2 className="text-lg font-bold m-0">
          📊 ContabilidadePRO (FALLBACK)
        </h2>
      </div>
      <nav>
        <ul className="list-none p-0 m-0">
          <li className="mb-2">
            <a href="/dashboard" className="block px-3 py-2 text-white no-underline rounded bg-gray-700 hover:bg-gray-600">
              📈 Dashboard
            </a>
          </li>
          <li className="mb-2">
            <a href="/clientes" className="block px-3 py-2 text-white no-underline rounded hover:bg-gray-700">
              👥 Clientes
            </a>
          </li>
          <li className="mb-2">
            <a href="/documentos" className="block px-3 py-2 text-white no-underline rounded hover:bg-gray-700">
              📄 Documentos
            </a>
          </li>
          <li className="mb-2">
            <a href="/assistente" className="block px-3 py-2 text-white no-underline rounded hover:bg-gray-700">
              🤖 Assistente IA
            </a>
          </li>
        </ul>
      </nav>
    </div>
  )
}

// Header simples como fallback
function SimpleHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="bg-white px-6 py-4 border-b border-gray-200 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900 m-0">
        ContabilidadePRO (FALLBACK)
      </h1>
    </header>
  )
}

// Error boundary para componentes
class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Componente falhou, usando fallback
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* ETAPA 5: SIDEBAR FUNCIONAL SEM DEPENDÊNCIAS COMPLEXAS */}
      <FunctionalSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 lg:ml-64">
        {/* Header Unificado - Variante Standard */}
        <ComponentErrorBoundary fallback={<SimpleHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />}>
          <Suspense fallback={<SimpleHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} />}>
            <Header
              onMenuClick={() => setSidebarOpen(!sidebarOpen)}
              variant="standard"
              showBreadcrumbs={true}
              showSearch={true}
              showNotifications={true}
            />
          </Suspense>
        </ComponentErrorBoundary>

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
