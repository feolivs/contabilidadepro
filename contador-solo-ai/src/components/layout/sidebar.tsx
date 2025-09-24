'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  BarChart3,
  FileBarChart,
  Settings,
  MessageSquare,
  Download,
  Bot,
  TrendingUp,
  Shield,
  HelpCircle,
  Zap
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuthStore } from '@/store/auth-store'
import { useDashboardStatsInteligentes, useAnaliseAnomalias } from '@/hooks/use-relatorios-inteligentes'

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface NavigationItem {
  name: string
  href: string
  icon: any
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
}

// Hook para gerar navegação com dados reais
function useNavigationSections(): NavigationSection[] {
  const { data: statsInteligentes } = useDashboardStatsInteligentes('30')
  const { data: alertasCompliance } = useAnaliseAnomalias()

  // Contar alertas críticos
  const alertasCriticos = 0

  // Contar insights importantes
  const insightsImportantes = 0

  return [
    {
      title: 'Principal',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        {
          name: 'Assistente IA',
          href: '/assistente',
          icon: Bot,
          badge: insightsImportantes > 0 ? insightsImportantes : 'NOVO',
          badgeVariant: insightsImportantes > 0 ? 'destructive' : 'secondary'
        },
      ]
    },
    {
      title: 'Gestão',
      items: [
        { name: 'Clientes', href: '/clientes', icon: Users, badge: 0 },
        {
          name: 'Documentos',
          href: '/documentos',
          icon: FileText,
          badge: alertasCriticos > 0 ? alertasCriticos : undefined,
          badgeVariant: alertasCriticos > 0 ? 'destructive' : undefined
        },
      ]
    },
    {
      title: 'Operações',
      items: [
        { name: 'Cálculos', href: '/calculos', icon: Calculator, badge: 'PRO', badgeVariant: 'outline' },
        {
          name: 'Prazos Fiscais',
          href: '/prazos',
          icon: Calendar,
          badge: 0,
          badgeVariant: undefined
        },
        {
          name: 'Relatórios',
          href: '/relatorios',
          icon: FileBarChart,
          badge: undefined,
          badgeVariant: undefined
        },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { name: 'Configurações', href: '/configuracoes', icon: Settings },
      ]
    }
  ]
}

// Componente de navegação reutilizável
function NavigationItems({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname()
  const navigationSections = useNavigationSections()

  return (
    <nav className="flex-1 px-2 space-y-6">
      {navigationSections.map((section) => (
        <div key={section.title}>
          <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {section.title}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onItemClick}
                  className={cn(
                    'group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5 flex-shrink-0',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-accent-foreground'
                      )}
                    />
                    {item.name}
                  </div>
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant || 'default'}
                      className="text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

// Componente de estatísticas rápidas
function QuickStats() {
  const { data: statsInteligentes } = useDashboardStatsInteligentes('30')
  const { data: alertasCompliance } = useAnaliseAnomalias()

  const alertasCriticos = 0

  return (
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      <div className="bg-muted rounded-lg p-2">
        <div className="text-xs font-semibold text-foreground">
          0
        </div>
        <div className="text-xs text-muted-foreground">Clientes</div>
      </div>
      <div className="bg-muted rounded-lg p-2">
        <div className="text-xs font-semibold text-foreground">
          0
        </div>
        <div className="text-xs text-muted-foreground">Pendentes</div>
      </div>
      <div className="bg-muted rounded-lg p-2">
        <div className={`text-xs font-semibold ${alertasCriticos > 0 ? 'text-red-600' : 'text-foreground'}`}>
          0
        </div>
        <div className="text-xs text-muted-foreground">Prazos</div>
      </div>
    </div>
  )
}

// Footer do usuário
function UserFooter() {
  const { user } = useAuthStore()
  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'AD'
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.user_metadata?.avatar_url} alt={userName} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {userName}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-xs text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Quick stats com dados reais */}
      <QuickStats />
    </div>
  )
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col h-full bg-background border-r border-border">
          {/* Header */}
          <div className="flex items-center flex-shrink-0 px-4 py-5 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Contador Solo AI
                </h1>
                <p className="text-xs text-muted-foreground">Sistema Inteligente</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto py-4">
            <NavigationItems />
          </div>

          {/* Footer */}
          <UserFooter />
        </div>
      </div>

      {/* Mobile sidebar usando Sheet */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <SheetTitle className="text-left text-lg font-bold text-foreground">
                    Contador Solo AI
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">Sistema Inteligente</p>
                </div>
              </div>
              <ThemeToggle showOnMobile={true} variant="dropdown" />
            </div>
          </SheetHeader>

          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto py-4">
            <NavigationItems onItemClick={() => onOpenChange(false)} />
          </div>

          {/* Footer */}
          <UserFooter />
        </SheetContent>
      </Sheet>
    </>
  )
}
