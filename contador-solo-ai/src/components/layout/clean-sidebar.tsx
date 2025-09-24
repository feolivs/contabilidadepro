'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LayoutDashboard,
  Bot,
  Users,
  FileText,
  Calculator,
  Calendar,
  BarChart3,
  Building2,
  Settings,
  ChevronLeft,
  Zap,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
  Shield
} from 'lucide-react'
import { useNavigationData } from '@/hooks/use-navigation-data'
import { SmartBadge } from '@/components/ui/smart-badge'
import { SidebarAlerts } from '@/components/layout/sidebar-alerts'
import { LoadingSpinner, SidebarLoading } from '@/components/ui/loading-states'
import { useMobileResponsive } from '@/hooks/use-swipe-gestures'

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  description?: string
  dataKey?: keyof NavigationStats | keyof NavigationAlerts
  alertType?: 'deadline' | 'document' | 'client' | 'calculation'
}

interface NavigationSection {
  title: string
  items: NavItem[]
}

interface NavigationStats {
  totalClientes: number
  documentosPendentes: number
  calculosPendentes: number
  prazosPendentes: number
  alertasCriticos: number
}

interface NavigationAlerts {
  aiInsights: number
  compliance: number
  documentosProcessamento: number
  prazosVencendo: number
}

// Função para determinar a variante do badge baseada na urgência
const getBadgeVariant = (count: number, type: 'deadline' | 'document' | 'client' | 'calculation'): 'default' | 'secondary' | 'destructive' | 'outline' | undefined => {
  if (count === 0) return undefined

  switch (type) {
    case 'deadline':
      return count >= 5 ? 'destructive' : count >= 2 ? 'default' : 'secondary'
    case 'document':
      return count >= 10 ? 'destructive' : count >= 5 ? 'default' : 'secondary'
    case 'calculation':
      return count >= 3 ? 'default' : 'secondary'
    case 'client':
      return 'secondary'
    default:
      return 'secondary'
  }
}

// Hook para gerar seções de navegação com dados dinâmicos
const useNavigationSections = (): NavigationSection[] => {
  const { data: navigationData } = useNavigationData()

  return [
    {
      title: 'Principal',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          description: 'Visão geral do sistema'
        },

        {
          title: 'Assistente IA',
          href: '/assistente',
          icon: Bot,
          badge: navigationData?.alerts.aiInsights || 'IA',
          badgeVariant: navigationData?.alerts.aiInsights ? 'default' : 'secondary',
          description: 'Assistente inteligente',
          dataKey: 'aiInsights'
        }
      ]
    },
    {
      title: 'Gestão de Dados',
      items: [
        {
          title: 'Clientes',
          href: '/clientes',
          icon: Users,
          badge: navigationData?.stats.totalClientes || 0,
          badgeVariant: getBadgeVariant(navigationData?.stats.totalClientes || 0, 'client'),
          description: 'Gestão de clientes',
          dataKey: 'totalClientes',
          alertType: 'client'
        },
        {
          title: 'Empresas',
          href: '/empresas',
          icon: Building2,
          description: 'Gestão de empresas'
        },
        {
          title: 'Documentos',
          href: '/documentos',
          icon: FileText,
          badge: navigationData?.stats.documentosPendentes || 0,
          badgeVariant: getBadgeVariant(navigationData?.stats.documentosPendentes || 0, 'document'),
          description: 'Documentos pendentes',
          dataKey: 'documentosPendentes',
          alertType: 'document'
        }
      ]
    },
    {
      title: 'Operações Fiscais',
      items: [
        {
          title: 'Cálculos Fiscais',
          href: '/calculos',
          icon: Calculator,
          badge: navigationData?.stats.calculosPendentes || 0,
          badgeVariant: getBadgeVariant(navigationData?.stats.calculosPendentes || 0, 'calculation'),
          description: 'Cálculos e apurações',
          dataKey: 'calculosPendentes',
          alertType: 'calculation'
        },

        {
          title: 'Prazos Fiscais',
          href: '/prazos',
          icon: Calendar,
          badge: navigationData?.stats.prazosPendentes || 0,
          badgeVariant: getBadgeVariant(navigationData?.stats.prazosPendentes || 0, 'deadline'),
          description: 'Vencimentos próximos',
          dataKey: 'prazosPendentes',
          alertType: 'deadline'
        },

      ]
    },
    {
      title: 'Relatórios e Análises',
      items: [
        {
          title: 'Relatórios',
          href: '/relatorios',
          icon: BarChart3,
          description: 'Relatórios padrão'
        },



      ]
    },
    {
      title: 'Sistema',
      items: [
        {
          title: 'Configurações',
          href: '/configuracoes',
          icon: Settings,
          description: 'Configurações gerais'
        },
        {
          title: 'Segurança',
          href: '/seguranca',
          icon: Shield,
          description: 'Configurações de segurança'
        }
      ]
    }
  ]
}

// Hook para gerar estatísticas rápidas com dados dinâmicos
const useQuickStats = () => {
  const { data: navigationData, isLoading } = useNavigationData()

  return [
    {
      label: 'Clientes',
      value: navigationData?.stats.totalClientes?.toString() || '0',
      icon: Building2,
      color: 'text-blue-600',
      isLoading
    },
    {
      label: 'Vencimentos',
      value: navigationData?.stats.prazosPendentes?.toString() || '0',
      icon: AlertCircle,
      color: navigationData?.stats.prazosPendentes && navigationData.stats.prazosPendentes > 0 ? 'text-red-600' : 'text-green-600',
      isLoading
    },
    {
      label: 'Pendentes',
      value: navigationData?.stats.documentosPendentes?.toString() || '0',
      icon: FileText,
      color: navigationData?.stats.documentosPendentes && navigationData.stats.documentosPendentes > 5 ? 'text-red-600' : 'text-yellow-600',
      isLoading
    }
  ]
}

// Componente simples para loading com fallback
const SimpleLoadingWrapper = ({
  isLoading,
  fallback,
  children
}: {
  isLoading: boolean
  fallback: React.ReactNode
  children: React.ReactNode
}) => {
  if (isLoading) {
    return <>{fallback}</>
  }
  return <>{children}</>
}

// Componente para skeleton de estatísticas rápidas
const QuickStatsSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-8" />
      </div>
    ))}
  </div>
)

// Componente para indicador de conexão avançado
const ConnectionStatus = () => {
  const { data: navigationData, isLoading, error, refetch } = useNavigationData()
  const isConnected = !error && navigationData
  const lastUpdate = navigationData?.lastUpdated ? new Date(navigationData.lastUpdated) : undefined

  const getStatusInfo = () => {
    if (isLoading) {
      return {
        icon: <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />,
        text: 'Sincronizando...',
        color: 'text-yellow-600'
      }
    }

    if (error) {
      return {
        icon: <WifiOff className="w-3 h-3 text-red-500" />,
        text: 'Erro de conexão',
        color: 'text-red-600'
      }
    }

    if (isConnected) {
      const now = new Date()
      const diffMinutes = lastUpdate ? Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60)) : 0

      if (diffMinutes < 2) {
        return {
          icon: <Wifi className="w-3 h-3 text-green-500" />,
          text: 'Dados atuais',
          color: 'text-green-600'
        }
      } else if (diffMinutes < 10) {
        return {
          icon: <Wifi className="w-3 h-3 text-yellow-500" />,
          text: `Há ${diffMinutes}min`,
          color: 'text-yellow-600'
        }
      } else {
        return {
          icon: <Wifi className="w-3 h-3 text-red-500" />,
          text: 'Dados antigos',
          color: 'text-red-600'
        }
      }
    }

    return {
      icon: <WifiOff className="w-3 h-3 text-gray-500" />,
      text: 'Desconectado',
      color: 'text-gray-600'
    }
  }

  const status = getStatusInfo()

  return (
    <div
      className="flex items-center space-x-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => error && refetch?.()}
      title={error ? 'Clique para tentar novamente' : status.text}
    >
      {status.icon}
      <span className={cn('font-medium', status.color)}>
        {status.text}
      </span>
    </div>
  )
}

// Componente para badge inteligente baseado no tipo de alerta
const SmartNavigationBadge = ({
  badge,
  alertType,
  isLoading
}: {
  badge?: string | number
  alertType?: 'deadline' | 'document' | 'client' | 'calculation'
  isLoading?: boolean
}) => {
  if (isLoading) {
    return <Skeleton className="h-5 w-6 rounded-full" />
  }

  if (!badge || badge === 0) return null

  return (
    <SmartBadge
      count={badge}
      type={alertType}
      size="sm"
      className="ml-2"
    />
  )
}

// Componente para renderizar uma seção de navegação
const NavigationSection: React.FC<{
  section: NavigationSection
  collapsed: boolean
  isTouch: boolean
  isMobile: boolean
}> = ({ section, collapsed, isTouch, isMobile }) => {
  const pathname = usePathname()

  if (collapsed) {
    // Modo colapsado - apenas ícones
    return (
      <div className="space-y-1">
        {section.items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full h-10 px-2 justify-center",
                  isActive && "bg-secondary font-medium"
                )}
              >
                <item.icon className="h-4 w-4" />
              </Button>
            </Link>
          )
        })}
      </div>
    )
  }

  // Modo expandido - com seções
  return (
    <div className="space-y-3">
      {/* Título da seção */}
      <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {section.title}
      </h3>

      {/* Itens da seção */}
      <div className="space-y-1">
        {section.items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start transition-all duration-200",
                  isTouch ? "h-12" : "h-10",
                  isMobile ? "px-4" : "px-3",
                  isActive && "bg-secondary font-medium shadow-sm",
                  isTouch && "active:scale-95 active:bg-accent/80",
                  !isTouch && "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 mr-3" />
                <span className="flex-1 text-left">{item.title}</span>

                {/* Badge inteligente */}
                <SmartNavigationBadge
                  badge={item.badge}
                  alertType={item.alertType}
                />
              </Button>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function CleanSidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const navigationSections = useNavigationSections()
  const quickStats = useQuickStats()
  const { isLoading } = useNavigationData()
  const { isMobile, isTouch, orientation } = useMobileResponsive()

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r transition-all duration-300 relative",
      collapsed ? "w-16" : "w-64",
      // Otimizações para dispositivos touch
      isTouch && "touch-pan-y",
      // Melhor scroll em mobile
      isMobile && "overscroll-contain"
    )}>
      {/* Indicador de swipe para mobile */}
      {isMobile && !collapsed && (
        <div className="absolute top-4 right-2 z-10 opacity-30">
          <div className="flex flex-col items-center text-xs text-muted-foreground">
            <div className="w-6 h-1 bg-current rounded-full mb-1" />
            <div className="w-4 h-1 bg-current rounded-full mb-1" />
            <div className="w-2 h-1 bg-current rounded-full" />
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">ContabilidadePRO</h1>
              <p className="text-xs text-muted-foreground">Sistema Inteligente</p>
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary mx-auto">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn("h-8 w-8 p-0", collapsed && "mx-auto mt-2")}
          >
            <ChevronLeft className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )} />
          </Button>
        )}
      </div>

      {/* Quick Stats */}
      {!collapsed && (
        <div className="p-4 border-b">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Resumo Rápido
          </h3>
          <SimpleLoadingWrapper
            isLoading={isLoading}
            fallback={<QuickStatsSkeleton count={3} />}
          >
            <div className="space-y-2">
              {quickStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                    <span className="text-muted-foreground">{stat.label}</span>
                  </div>
                  <span className="font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </SimpleLoadingWrapper>
        </div>
      )}

      {/* Barra de progresso para loading */}
      {isLoading && !collapsed && (
        <div className="px-4 pb-2">
          <div className="w-full bg-muted rounded-full h-1">
            <div className="bg-primary h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Alertas Críticos */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <SimpleLoadingWrapper
            isLoading={isLoading}
            fallback={
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            }
          >
            <SidebarAlerts compact={true} maxAlerts={2} />
          </SimpleLoadingWrapper>
        </div>
      )}

      {/* Navegação por Seções */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {navigationSections.map((section) => (
            <NavigationSection
              key={section.title}
              section={section}
              collapsed={collapsed}
              isTouch={isTouch}
              isMobile={isMobile}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        {!collapsed ? (
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">AD</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin</p>
              <ConnectionStatus />
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-medium text-primary-foreground">AD</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CleanSidebar
