'use client'

import React, { Suspense } from 'react'
import { AdvancedSidebar } from './advanced-sidebar'
import { IntegratedHeader } from './integrated-header'
import { AdvancedThemeToggle } from '../theme/advanced-theme-toggle'
import { useModernSidebar } from '@/hooks/use-responsive-sidebar'
import { useContextualNavigation } from '@/hooks/use-contextual-navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'

// =====================================================
// COMPONENTES DE LOADING
// =====================================================

const HeaderSkeleton = () => (
  <div className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl">
    <div className="flex h-16 items-center gap-4 px-6">
      <Skeleton className="h-6 w-6 lg:hidden" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-60 hidden xl:block" />
        <Skeleton className="h-9 w-9 xl:hidden" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  </div>
)

const QuickActionsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    ))}
  </div>
)

const StatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
)

// =====================================================
// COMPONENTES CONTEXTUAIS
// =====================================================

const ContextualQuickActions = () => {
  const { quickActions } = useContextualNavigation()

  if (!quickActions.length) return null

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        Ações Rápidas
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Card key={action.id} className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <action.icon className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                <Badge variant={action.variant || 'default'} className="text-xs">
                  Rápido
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-base mb-1">{action.label}</CardTitle>
              <CardDescription className="text-sm">
                {action.description}
              </CardDescription>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-3 justify-start p-0 h-auto font-normal"
                asChild
              >
                <a href={action.href}>
                  Executar ação →
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

const ContextualStats = () => {
  const { stats } = useContextualNavigation()

  if (!stats?.length) return null

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getVariantColor = (variant?: 'success' | 'warning' | 'error' | 'info') => {
    switch (variant) {
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'info':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-foreground'
    }
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Estatísticas
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={cn("text-2xl font-bold", getVariantColor(stat.variant))}>
                    {stat.value}
                  </p>
                </div>
                {getTrendIcon(stat.trend)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

const PageHeader = () => {
  const { pageTitle, pageDescription } = useContextualNavigation()

  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight mb-2">{pageTitle}</h1>
      <p className="text-muted-foreground">{pageDescription}</p>
    </div>
  )
}

// =====================================================
// LAYOUT PRINCIPAL FASE 2
// =====================================================

interface ModernLayoutPhase2Props {
  children: React.ReactNode
  sidebarVariant?: 'default' | 'glass' | 'minimal' | 'premium'
  showContextualActions?: boolean
  showStats?: boolean
  className?: string
}

export const ModernLayoutPhase2 = ({ 
  children, 
  sidebarVariant = 'glass',
  showContextualActions = true,
  showStats = true,
  className 
}: ModernLayoutPhase2Props) => {
  const {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    collapsed
  } = useModernSidebar()

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Advanced Sidebar */}
      <AdvancedSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        variant={sidebarVariant}
        collapsible={!isMobile}
        showQuickActions={true}
      />

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden transition-all duration-300",
        !isMobile && !collapsed && "lg:ml-sidebar",
        !isMobile && collapsed && "lg:ml-sidebar-collapsed"
      )}>
        {/* Integrated Header */}
        <Suspense fallback={<HeaderSkeleton />}>
          <IntegratedHeader 
            onMenuClick={toggleSidebar}
            showBreadcrumbs={true}
            showSearch={true}
            showNotifications={true}
          />
        </Suspense>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 max-w-7xl">
            {/* Page Header */}
            <PageHeader />

            {/* Contextual Stats */}
            {showStats && (
              <Suspense fallback={<StatsSkeleton />}>
                <ContextualStats />
              </Suspense>
            )}

            {/* Contextual Quick Actions */}
            {showContextualActions && (
              <Suspense fallback={<QuickActionsSkeleton />}>
                <ContextualQuickActions />
              </Suspense>
            )}

            {/* Page Content */}
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// =====================================================
// EXEMPLO DE USO COMPLETO
// =====================================================

export const ModernLayoutPhase2Example = () => (
  <ModernLayoutPhase2 
    sidebarVariant="premium"
    showContextualActions={true}
    showStats={true}
  >
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo à Fase 2</CardTitle>
          <CardDescription>
            Layout moderno com sidebar avançada, header integrado e navegação contextual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-green-600">✅ Implementado</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Sidebar hierárquica avançada</li>
                <li>• Glass morphism premium</li>
                <li>• Header com breadcrumbs dinâmicos</li>
                <li>• Navegação contextual</li>
                <li>• Ações rápidas por página</li>
                <li>• Estatísticas em tempo real</li>
                <li>• Busca global (Cmd+K)</li>
                <li>• Centro de notificações</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-600">🎨 Design Moderno</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 4 variantes de sidebar</li>
                <li>• Animações suaves</li>
                <li>• Gradientes profissionais</li>
                <li>• Indicadores visuais</li>
                <li>• Badges contextuais</li>
                <li>• Hover effects avançados</li>
                <li>• Transições fluidas</li>
                <li>• Responsividade total</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-600">⚡ Performance</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Lazy loading completo</li>
                <li>• Memoização inteligente</li>
                <li>• Suspense boundaries</li>
                <li>• Bundle splitting</li>
                <li>• Cache otimizado</li>
                <li>• Skeleton loading</li>
                <li>• Debounced search</li>
                <li>• Virtual scrolling</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </ModernLayoutPhase2>
)

export default ModernLayoutPhase2
