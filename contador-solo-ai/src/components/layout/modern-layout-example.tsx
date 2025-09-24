'use client'

import React from 'react'
import { ModernSidebar } from './modern-sidebar'
import { Header } from './header'
import { useModernSidebar } from '@/hooks/use-responsive-sidebar'
import { cn } from '@/lib/utils'



// =====================================================
// LAYOUT PRINCIPAL MODERNO
// =====================================================

interface ModernLayoutProps {
  children: React.ReactNode
  sidebarVariant?: 'default' | 'glass' | 'minimal'
  className?: string
}

export const ModernLayoutExample = ({ 
  children, 
  sidebarVariant = 'default',
  className 
}: ModernLayoutProps) => {
  const {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    collapsed,
    toggleCollapsed
  } = useModernSidebar()

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Sidebar Moderna */}
      <ModernSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        variant={sidebarVariant}
        collapsible={!isMobile}
      />

      {/* Conteúdo Principal */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-300",
        !isMobile && !collapsed && "lg:ml-sidebar",
        !isMobile && collapsed && "lg:ml-sidebar-collapsed"
      )}>
        {/* Header Unificado - Variante Minimal */}
        <Header
          onMenuClick={toggleSidebar}
          variant="minimal"
          showBreadcrumbs={false}
          showSearch={true}
          showNotifications={true}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay para mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// =====================================================
// EXEMPLO DE USO
// =====================================================

export const ModernLayoutUsageExample = () => (
  <ModernLayoutExample sidebarVariant="glass">
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-2xl font-bold mb-4">Bem-vindo ao ContabilidadePRO</h2>
        <p className="text-muted-foreground">
          Esta é uma demonstração da nova sidebar moderna com design glass morphism,
          navegação responsiva e integração perfeita com o header.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-2">Recursos Modernos</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Design glass morphism</li>
            <li>• Animações suaves</li>
            <li>• Responsividade total</li>
            <li>• Acessibilidade completa</li>
          </ul>
        </div>
        
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-2">Performance</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Lazy loading</li>
            <li>• Memoização inteligente</li>
            <li>• Transições otimizadas</li>
            <li>• Bundle splitting</li>
          </ul>
        </div>
        
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-2">UX Contábil</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Navegação contextual</li>
            <li>• Badges inteligentes</li>
            <li>• Cores profissionais</li>
            <li>• Workflow otimizado</li>
          </ul>
        </div>
      </div>
    </div>
  </ModernLayoutExample>
)

export default ModernLayoutExample
