/**
 * Sidebar Melhorada - ContabilidadePRO
 * Versão otimizada com dados reais, cache inteligente e acessibilidade completa
 */

'use client'

import React, { useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Bot, 
  Users, 
  FileText, 
  Calculator, 
  Calendar,
  FileBarChart,
  BarChart3,
  Download,
  Settings,
  Shield,
  Plus,
  TrendingUp,
  Zap,
  ChevronRight,
  User,
  LogOut
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { APP_ROUTES, getRoutesByCategory, type RouteMetadata } from '@/lib/routes'
import { useNavigationData, useNavigationPermissions } from '@/hooks/use-navigation-data'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  permissions?: string[]
  isNew?: boolean
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
}

interface SidebarImprovedProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// =====================================================
// MAPEAMENTO DE ÍCONES
// =====================================================

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Bot,
  Users,
  FileText,
  Calculator,
  Calendar,
  FileBarChart,
  BarChart3,
  Download,
  Settings,
  Shield,
  Plus,
  TrendingUp
}

// =====================================================
// HOOK PARA SEÇÕES DE NAVEGAÇÃO
// =====================================================

const useNavigationSections = (): NavigationSection[] => {
  const { data, isLoading } = useNavigationData()
  const { hasPermission } = useNavigationPermissions()

  return useMemo(() => {
    if (isLoading || !data) return []

    const { stats, alerts } = data

    // Construir seções baseadas nas categorias de rotas
    const routeCategories = getRoutesByCategory()

    const sections: NavigationSection[] = [
      {
        title: 'Principal',
        items: [
          {
            name: 'Dashboard',
            href: APP_ROUTES.DASHBOARD,
            icon: LayoutDashboard,
            permissions: ['read:dashboard']
          },
          {
            name: 'Assistente IA',
            href: APP_ROUTES.ASSISTENTE,
            icon: Bot,
            badge: alerts.aiInsights > 0 ? alerts.aiInsights : 'NOVO',
            badgeVariant: alerts.aiInsights > 0 ? 'destructive' : 'secondary',
            isNew: true,
            permissions: ['read:assistente']
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
            badge: stats.totalClientes > 0 ? stats.totalClientes : undefined,
            permissions: ['read:clientes']
          },
          {
            name: 'Documentos',
            href: APP_ROUTES.DOCUMENTOS,
            icon: FileText,
            badge: stats.documentosPendentes > 0 ? stats.documentosPendentes : undefined,
            badgeVariant: stats.documentosPendentes > 0 ? 'destructive' : undefined,
            permissions: ['read:documentos']
          }
        ]
      },
      {
        title: 'Operações',
        items: [
          {
            name: 'Cálculos Fiscais',
            href: APP_ROUTES.CALCULOS,
            icon: Calculator,
            badge: stats.calculosPendentes > 0 ? stats.calculosPendentes : 'PRO',
            badgeVariant: stats.calculosPendentes > 0 ? 'destructive' : 'outline',
            permissions: ['read:calculos']
          },
          {
            name: 'Prazos Fiscais',
            href: APP_ROUTES.PRAZOS,
            icon: Calendar,
            badge: stats.prazosPendentes > 0 ? stats.prazosPendentes : undefined,
            badgeVariant: stats.prazosPendentes > 0 ? 'destructive' : undefined,
            permissions: ['read:prazos']
          },
          {
            name: 'Relatórios',
            href: APP_ROUTES.RELATORIOS,
            icon: FileBarChart,
            permissions: ['read:relatorios']
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
            permissions: ['read:configuracoes']
          },
          {
            name: 'Segurança',
            href: APP_ROUTES.SEGURANCA,
            icon: Shield,
            badge: alerts.compliance > 0 ? alerts.compliance : undefined,
            badgeVariant: alerts.compliance > 0 ? 'destructive' : undefined,
            permissions: ['read:seguranca']
          }
        ]
      }
    ]

    // Filtrar itens baseado em permissões
    return sections.map(section => ({
      ...section,
      items: section.items.filter(item => 
        !item.permissions || item.permissions.some(permission => hasPermission(permission))
      )
    })).filter(section => section.items.length > 0)

  }, [data, isLoading, hasPermission])
}

// =====================================================
// COMPONENTES AUXILIARES
// =====================================================

const NavigationSkeleton = memo(() => (
  <nav className="flex-1 px-2 space-y-6" aria-label="Carregando navegação">
    {Array.from({ length: 3 }).map((_, sectionIndex) => (
      <div key={sectionIndex} className="space-y-3">
        <Skeleton className="h-4 w-20" />
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, itemIndex) => (
            <div key={itemIndex} className="flex items-center space-x-3 px-2 py-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </nav>
))

NavigationSkeleton.displayName = 'NavigationSkeleton'

const getBadgeAriaLabel = (itemName: string, badge: string | number): string => {
  if (typeof badge === 'number') {
    return badge === 1 ? 'item' : 'itens'
  }
  
  switch (badge.toLowerCase()) {
    case 'novo': return 'nova funcionalidade'
    case 'pro': return 'funcionalidade premium'
    default: return 'notificação'
  }
}

const NavigationLink = memo(({ 
  item, 
  isActive, 
  onClick 
}: {
  item: NavigationItem
  isActive: boolean
  onClick?: () => void
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }
  
  return (
    <Link
      href={item.href}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="menuitem"
      tabIndex={0}
      aria-current={isActive ? 'page' : undefined}
      aria-describedby={item.badge ? `badge-${item.href}` : undefined}
      className={cn(
        'group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <div className="flex items-center">
        <item.icon
          className="mr-3 h-5 w-5 flex-shrink-0"
          aria-hidden="true"
        />
        <span>{item.name}</span>
      </div>
      
      {item.badge && (
        <Badge
          id={`badge-${item.href}`}
          variant={item.badgeVariant || 'default'}
          className="text-xs"
          aria-label={`${item.badge} ${getBadgeAriaLabel(item.name, item.badge)}`}
        >
          {item.badge}
        </Badge>
      )}
    </Link>
  )
})

NavigationLink.displayName = 'NavigationLink'

const NavigationSection = memo(({ 
  section, 
  pathname, 
  onItemClick 
}: {
  section: NavigationSection
  pathname: string
  onItemClick?: () => void
}) => (
  <div className="space-y-3">
    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {section.title}
    </h3>
    <div className="space-y-1" role="group" aria-labelledby={`section-${section.title}`}>
      {section.items.map((item) => (
        <NavigationLink
          key={item.href}
          item={item}
          isActive={pathname === item.href}
          onClick={onItemClick}
        />
      ))}
    </div>
  </div>
))

NavigationSection.displayName = 'NavigationSection'

const QuickStats = memo(() => {
  const { stats, isLoading } = useNavigationData()
  
  if (isLoading) {
    return (
      <div className="flex justify-between text-xs">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="flex justify-between text-xs text-muted-foreground">
      <div className="text-center">
        <div className="font-semibold text-foreground">{stats.totalClientes}</div>
        <div>Clientes</div>
      </div>
      <div className="text-center">
        <div className="font-semibold text-foreground">{stats.documentosPendentes + stats.calculosPendentes}</div>
        <div>Pendentes</div>
      </div>
      <div className="text-center">
        <div className="font-semibold text-foreground">{stats.prazosPendentes}</div>
        <div>Prazos</div>
      </div>
    </div>
  )
})

QuickStats.displayName = 'QuickStats'

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const SidebarImproved = memo(({ open, onOpenChange }: SidebarImprovedProps) => {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const navigationSections = useNavigationSections()
  const { isLoading } = useNavigationData()

  const handleItemClick = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }, [logout])

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-6">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Contador Solo AI</h1>
            <p className="text-xs text-muted-foreground">Sistema Inteligente</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      {isLoading ? (
        <NavigationSkeleton />
      ) : (
        <nav className="flex-1 px-2 py-4 space-y-6" role="navigation" aria-label="Menu principal">
          {navigationSections.map((section) => (
            <NavigationSection
              key={section.title}
              section={section}
              pathname={pathname}
              onItemClick={handleItemClick}
            />
          ))}
        </nav>
      )}

      <Separator />

      {/* User Section */}
      <div className="p-4 space-y-4">
        <QuickStats />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            aria-label="Sair do sistema"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:bg-background">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de navegação</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  )
})

SidebarImproved.displayName = 'SidebarImproved'
