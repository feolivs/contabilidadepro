/**
 * Sidebar Otimizada - Fase 2
 * Versão com cache avançado, memoização inteligente e lazy loading
 */

'use client'

import React, { Suspense, lazy } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Bot,
  Users,
  FileText,
  Calculator,
  Calendar,
  FileBarChart,
  BarChart3,
  Settings,
  Shield,
  Zap,
  ChevronRight,
  User,
  LogOut
} from 'lucide-react'

import { useNavigationData } from '@/hooks/use-navigation-data'
import { APP_ROUTES, hasRoutePermission } from '@/lib/routes'
import { advancedCache } from '@/lib/advanced-cache'
import { 
  withIntelligentMemo, 
  useIntelligentMemo, 
  useIntelligentCallback,
  useRenderAnalytics 
} from '@/lib/advanced-memoization'

// Componentes diretos - são leves e não precisam de lazy loading
import { UserProfile } from '@/components/layout/user-profile'
import { QuickActions } from '@/components/layout/quick-actions'
import { NotificationBadge } from '@/components/ui/notification-badge'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface SidebarOptimizedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  permission?: string
  priority: 'high' | 'medium' | 'low'
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
  collapsible?: boolean
  defaultExpanded?: boolean
}

// =====================================================
// COMPONENTES MEMOIZADOS
// =====================================================

const NavigationItemComponent = withIntelligentMemo<{
  item: NavigationItem
  isActive: boolean
  onClick?: () => void
}>(({ item, isActive, onClick }) => {
  const { logRender } = useRenderAnalytics('NavigationItem', { item: item.name, isActive })

  const handleClick = useIntelligentCallback(() => {
    logRender('item clicked')
    onClick?.()
  }, [onClick], { key: `nav-item-${item.name}` })

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isActive
          ? 'bg-accent text-accent-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <item.icon
        className={cn(
          'mr-3 h-5 w-5 transition-colors',
          isActive ? 'text-accent-foreground' : 'text-muted-foreground group-hover:text-foreground'
        )}
        aria-hidden="true"
      />
      <span className="flex-1">{item.name}</span>
      
      {item.badge && (
        <Suspense fallback={<Skeleton className="h-5 w-6" />}>
          <NotificationBadge
            count={typeof item.badge === 'number' ? item.badge : undefined}
            variant={item.badgeVariant}
            className="ml-2"
          >
            {typeof item.badge === 'string' ? item.badge : undefined}
          </NotificationBadge>
        </Suspense>
      )}
    </Link>
  )
}, { 
  deepCompare: true, 
  analytics: true, 
  displayName: 'NavigationItem' 
})

const NavigationSectionComponent = withIntelligentMemo<{
  section: NavigationSection
  currentPath: string
}>(({ section, currentPath }) => {
  const { logRender } = useRenderAnalytics('NavigationSection', { section: section.title })

  // Memoizar itens filtrados por permissão
  const filteredItems = useIntelligentMemo(() => {
    return section.items.filter(item => 
      !item.permission || hasRoutePermission(item.href, item.permission)
    )
  }, [section.items], { key: `section-${section.title}` })

  if (filteredItems.length === 0) {
    return null
  }

  logRender('section rendered')

  return (
    <div className="space-y-1">
      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {section.title}
      </h3>
      <nav className="space-y-1" role="navigation" aria-label={section.title}>
        {filteredItems.map((item) => (
          <NavigationItemComponent
            key={item.href}
            item={item}
            isActive={currentPath === item.href}
          />
        ))}
      </nav>
    </div>
  )
}, { 
  deepCompare: true, 
  analytics: true, 
  displayName: 'NavigationSection' 
})

// =====================================================
// HOOK PARA DADOS DE NAVEGAÇÃO OTIMIZADOS
// =====================================================

function useOptimizedNavigationSections(): NavigationSection[] {
  const { stats, alerts, permissions, isLoading } = useNavigationData({
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000 // 5 minutos
  })

  return useIntelligentMemo(() => {
    if (isLoading) {
      return [] // Retorna array vazio durante loading
    }

    // Cache das seções com base nos dados atuais
    const cacheKey = `nav-sections-${JSON.stringify({ stats, alerts, permissions })}`
    
    const cached = advancedCache.get(cacheKey)
    if (cached) {
      return cached
    }

    const sections: NavigationSection[] = [
      {
        title: 'Principal',
        items: [
          {
            name: 'Dashboard',
            href: APP_ROUTES.DASHBOARD,
            icon: LayoutDashboard,
            badge: alerts?.aiInsights > 0 ? alerts.aiInsights : undefined,
            badgeVariant: 'default',
            priority: 'high'
          },
          {
            name: 'Assistente IA',
            href: APP_ROUTES.ASSISTENTE,
            icon: Bot,
            badge: 'IA',
            badgeVariant: 'secondary',
            priority: 'high'
          }
        ]
      },
      {
        title: 'Gestão',
        items: [
          {
            name: 'Clientes',
            href: APP_ROUTES.CLIENTES,
            icon: Users,
            badge: stats?.totalClientes || undefined,
            priority: 'medium'
          },
          {
            name: 'Documentos',
            href: APP_ROUTES.DOCUMENTOS,
            icon: FileText,
            badge: stats?.documentosPendentes > 0 ? stats.documentosPendentes : undefined,
            badgeVariant: stats?.documentosPendentes > 5 ? 'destructive' : 'outline',
            priority: 'medium'
          },
          {
            name: 'Cálculos',
            href: APP_ROUTES.CALCULOS,
            icon: Calculator,
            badge: stats?.calculosPendentes > 0 ? stats.calculosPendentes : undefined,
            badgeVariant: 'outline',
            priority: 'medium'
          }
        ]
      },
      {
        title: 'Operações',
        items: [
          {
            name: 'Prazos',
            href: APP_ROUTES.PRAZOS,
            icon: Calendar,
            badge: alerts?.prazosVencendo > 0 ? alerts.prazosVencendo : undefined,
            badgeVariant: alerts?.prazosVencendo > 0 ? 'destructive' : undefined,
            priority: 'medium'
          },
          {
            name: 'Relatórios',
            href: APP_ROUTES.RELATORIOS,
            icon: FileBarChart,
            priority: 'low'
          }
        ]
      },
      {
        title: 'Sistema',
        items: [

          {
            name: 'Configurações',
            href: APP_ROUTES.CONFIGURACOES,
            icon: Settings,
            permission: 'admin',
            priority: 'low'
          },
          {
            name: 'Segurança',
            href: APP_ROUTES.SEGURANCA,
            icon: Shield,
            permission: 'admin',
            priority: 'low'
          }
        ]
      }
    ]

    // Armazenar no cache avançado
    advancedCache.set(cacheKey, sections, {
      ttl: 5 * 60 * 1000, // 5 minutos
      tags: ['navigation', 'sidebar'],
      priority: 'high'
    })

    return sections
  }, [stats, alerts, permissions, isLoading], { 
    deepCompare: true, 
    key: 'navigation-sections' 
  })
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const SidebarOptimized = withIntelligentMemo<SidebarOptimizedProps>(({ 
  open, 
  onOpenChange 
}) => {
  const pathname = usePathname()
  const sections = useOptimizedNavigationSections()
  const { logRender } = useRenderAnalytics('SidebarOptimized', { open, sectionsCount: sections.length })

  const handleClose = useIntelligentCallback(() => {
    onOpenChange(false)
  }, [onOpenChange], { key: 'sidebar-close' })

  logRender('sidebar rendered')

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">ContabilidadePRO</span>
            <span className="text-xs text-muted-foreground">v2.0</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 p-4 overflow-y-auto">
        {sections.length > 0 ? (
          sections.map((section) => (
            <NavigationSectionComponent
              key={section.title}
              section={section}
              currentPath={pathname}
            />
          ))
        ) : (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center space-x-3 px-2 py-2">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer com ações rápidas */}
      <div className="border-t p-4 space-y-4">
        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <QuickActions />
        </Suspense>
        
        <Suspense fallback={<Skeleton className="h-12 w-full" />}>
          <UserProfile />
        </Suspense>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  )
}, { 
  deepCompare: true, 
  analytics: true, 
  displayName: 'SidebarOptimized' 
})
