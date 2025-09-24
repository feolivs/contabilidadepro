'use client'

import React, { useState, Suspense, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Zap, 
  LayoutDashboard, 
  Bot, 
  Users, 
  FileText, 
  Calculator, 
  Calendar,
  BarChart3,
  Settings,
  Home,

  Plus,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  Receipt,
  Building2,
  CreditCard,
  PieChart
} from 'lucide-react'

// =====================================================
// TIPOS E INTERFACES AVANÇADAS
// =====================================================

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  description?: string
  isNew?: boolean
  children?: NavigationItem[]
}

interface NavigationGroup {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: NavigationItem[]
  collapsible?: boolean
  defaultExpanded?: boolean
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

interface AdvancedSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: 'default' | 'glass' | 'minimal' | 'premium'
  collapsible?: boolean
  showQuickActions?: boolean
}

// =====================================================
// DADOS DE NAVEGAÇÃO HIERÁRQUICA
// =====================================================

const navigationGroups: NavigationGroup[] = [
  {
    title: 'Visão Geral',
    icon: LayoutDashboard,
    defaultExpanded: true,
    items: [
      { 
        name: 'Dashboard', 
        href: '/dashboard', 
        icon: Home,
        description: 'Visão geral do sistema'
      },
      { 
        name: 'Assistente IA', 
        href: '/assistente', 
        icon: Bot, 
        badge: 'NOVO',
        badgeVariant: 'success',
        description: 'Assistente inteligente para contabilidade',
        isNew: true
      },
    ]
  },
  {
    title: 'Operações Fiscais',
    icon: Calculator,
    collapsible: true,
    defaultExpanded: true,
    badge: 3,
    badgeVariant: 'warning',
    items: [
      { 
        name: 'Cálculos Fiscais', 
        href: '/calculos', 
        icon: Calculator,
        description: 'Cálculos de impostos e tributos',
        children: [
          { name: 'DAS - Simples Nacional', href: '/calculos/das', icon: FileSpreadsheet },
          { name: 'ICMS', href: '/calculos/icms', icon: Receipt },
          { name: 'ISS', href: '/calculos/iss', icon: Building2 },
          { name: 'IRPJ', href: '/calculos/irpj', icon: CreditCard }
        ]
      },
      { 
        name: 'Prazos Fiscais', 
        href: '/prazos', 
        icon: Calendar,
        badge: 5,
        badgeVariant: 'destructive',
        description: 'Controle de vencimentos'
      },
      { 
        name: 'Apuração', 
        href: '/apuracao', 
        icon: TrendingUp,
        description: 'Apuração de resultados'
      },
    ]
  },
  {
    title: 'Gestão Documental',
    icon: FileText,
    collapsible: true,
    defaultExpanded: false,
    items: [
      { 
        name: 'Documentos', 
        href: '/documentos', 
        icon: FileText,
        description: 'Gerenciamento de documentos',
        children: [
          { name: 'Notas Fiscais', href: '/documentos/nfe', icon: Receipt },
          { name: 'Recibos', href: '/documentos/recibos', icon: FileText },
          { name: 'Contratos', href: '/documentos/contratos', icon: FileSpreadsheet }
        ]
      },

      { 
        name: 'OCR', 
        href: '/documentos-ocr', 
        icon: FileSpreadsheet,
        badge: 'BETA',
        badgeVariant: 'secondary',
        description: 'Processamento automático'
      },
    ]
  },
  {
    title: 'Clientes & Empresas',
    icon: Users,
    collapsible: true,
    defaultExpanded: false,
    items: [
      { 
        name: 'Clientes', 
        href: '/clientes', 
        icon: Users,
        description: 'Gestão de clientes'
      },
      { 
        name: 'Empresas', 
        href: '/empresa', 
        icon: Building2,
        description: 'Dados das empresas'
      },
    ]
  },
  {
    title: 'Relatórios & Analytics',
    icon: BarChart3,
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        name: 'Relatórios',
        href: '/relatorios',
        icon: BarChart3,
        description: 'Relatórios gerenciais'
      },
    ]
  },
]

// =====================================================
// COMPONENTES AVANÇADOS
// =====================================================

const QuickActions = memo(() => (
  <div className="p-4 border-t bg-muted/30">
    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
      Ações Rápidas
    </h4>
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" size="sm" className="h-8 text-xs">
        <Plus className="h-3 w-3 mr-1" />
        Novo DAS
      </Button>
      <Button variant="outline" size="sm" className="h-8 text-xs">
        <FileSpreadsheet className="h-3 w-3 mr-1" />
        Processar NFe
      </Button>
    </div>
  </div>
))

const StatusIndicator = memo(({ type, count }: { type: 'success' | 'warning' | 'error', count: number }) => {
  const variants = {
    success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' }
  }
  
  const variant = variants[type]
  const Icon = variant.icon
  
  return (
    <div className={cn("flex items-center gap-2 p-2 rounded-lg", variant.bg)}>
      <Icon className={cn("h-4 w-4", variant.color)} />
      <span className="text-sm font-medium">{count}</span>
    </div>
  )
})

const NavigationSubItem = memo(({ 
  item, 
  collapsed = false,
  level = 0 
}: { 
  item: NavigationItem
  collapsed?: boolean
  level?: number 
}) => {
  const pathname = usePathname()
  const isActive = pathname === item.href

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all sidebar-transition",
        "hover:bg-accent/50 hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        level > 0 && "ml-6 text-xs",
        isActive && "bg-primary/10 text-primary font-medium border-l-2 border-primary"
      )}
      title={collapsed ? item.name : undefined}
    >
      <item.icon className={cn("flex-shrink-0", level > 0 ? "h-3 w-3" : "h-4 w-4")} />
      {!collapsed && (
        <>
          <span className="flex-1">{item.name}</span>
          {item.badge && (
            <Badge variant={item.badgeVariant || 'default'} className="text-xs">
              {item.badge}
            </Badge>
          )}
          {item.isNew && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </>
      )}
    </Link>
  )
})

const NavigationItem = memo(({ 
  item, 
  collapsed = false 
}: { 
  item: NavigationItem
  collapsed?: boolean 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren && !collapsed) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 py-2 h-auto text-sm font-normal hover:bg-accent/50"
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">{item.name}</span>
            {item.badge && (
              <Badge variant={item.badgeVariant || 'default'} className="text-xs">
                {item.badge}
              </Badge>
            )}
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              isExpanded && "rotate-180"
            )} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 mt-1">
          {item.children?.map((child) => (
            <NavigationSubItem key={child.href} item={child} level={1} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return <NavigationSubItem item={item} collapsed={collapsed} />
})

const NavigationGroup = memo(({ 
  group, 
  collapsed = false 
}: { 
  group: NavigationGroup
  collapsed?: boolean 
}) => {
  const [isExpanded, setIsExpanded] = useState(group.defaultExpanded ?? true)

  if (collapsed) {
    return (
      <div className="space-y-1">
        {group.items.map((item) => (
          <NavigationItem key={item.href} item={item} collapsed={collapsed} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {group.collapsible ? (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2 h-auto text-xs font-medium text-muted-foreground uppercase tracking-wider hover:bg-accent/30"
            >
              <group.icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">{group.title}</span>
              {group.badge && (
                <Badge variant={group.badgeVariant || 'default'} className="text-xs">
                  {group.badge}
                </Badge>
              )}
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                isExpanded && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {group.items.map((item) => (
              <NavigationItem key={item.href} item={item} collapsed={collapsed} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          <div className="flex items-center gap-3 px-3 py-2">
            <group.icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-1">
              {group.title}
            </h3>
            {group.badge && (
              <Badge variant={group.badgeVariant || 'default'} className="text-xs">
                {group.badge}
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavigationItem key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        </>
      )}
    </div>
  )
})

const UserProfileAdvanced = memo(({ collapsed = false }: { collapsed?: boolean }) => (
  <div className="p-4 border-t bg-gradient-to-r from-primary/5 to-accent/5">
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 ring-2 ring-primary/20">
        <AvatarImage src="" alt="Usuário" />
        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
          AD
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            Admin User
          </p>
          <p className="text-xs text-muted-foreground truncate">
            admin@contabilpro.com
          </p>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
          </div>
        </div>
      )}
    </div>
    
    {!collapsed && (
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatusIndicator type="success" count={12} />
        <StatusIndicator type="warning" count={3} />
        <StatusIndicator type="error" count={1} />
      </div>
    )}
  </div>
))

const SidebarContentAdvanced = ({ 
  collapsed = false,
  variant = 'default',
  showQuickActions = true
}: { 
  collapsed?: boolean
  variant?: 'default' | 'glass' | 'minimal' | 'premium'
  showQuickActions?: boolean
}) => (
  <div className="flex h-full flex-col">
    {/* Logo/Brand */}
    <div className="flex h-16 items-center border-b px-6 bg-gradient-to-r from-primary/5 to-accent/5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-lg">
          <Zap className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              ContabilidadePRO
            </h1>
            <p className="text-xs text-muted-foreground font-medium">Sistema Inteligente</p>
          </div>
        )}
      </div>
    </div>
    
    {/* Navigation */}
    <ScrollArea className="flex-1 px-3 py-4">
      <nav role="navigation" aria-label="Menu principal" className="space-y-6">
        {navigationGroups.map((group) => (
          <NavigationGroup 
            key={group.title} 
            group={group} 
            collapsed={collapsed} 
          />
        ))}
      </nav>
    </ScrollArea>
    
    {/* Quick Actions */}
    {showQuickActions && !collapsed && (
      <Suspense fallback={<Skeleton className="h-20 mx-4 mb-4" />}>
        <QuickActions />
      </Suspense>
    )}
    
    {/* Footer */}
    <Suspense fallback={<Skeleton className="h-24 mx-4 mb-4" />}>
      <UserProfileAdvanced collapsed={collapsed} />
    </Suspense>
  </div>
)

// =====================================================
// COMPONENTE PRINCIPAL AVANÇADO
// =====================================================

export const AdvancedSidebar = ({ 
  open, 
  onOpenChange, 
  variant = 'glass',
  collapsible = true,
  showQuickActions = true
}: AdvancedSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false)

  const sidebarClasses = cn(
    "fixed left-0 top-0 z-50 h-full sidebar-transition",
    collapsed ? "w-sidebar-collapsed" : "w-sidebar",
    variant === 'glass' && "sidebar-glass dark:sidebar-glass-dark backdrop-blur-xl",
    variant === 'premium' && "bg-gradient-to-b from-background via-background/95 to-background/90 border-r border-border/50 shadow-2xl",
    variant === 'default' && "bg-background border-r sidebar-shadow",
    variant === 'minimal' && "bg-background/98 border-r border-border/30",
    "hidden lg:block"
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={sidebarClasses}>
        <SidebarContentAdvanced 
          collapsed={collapsed} 
          variant={variant}
          showQuickActions={showQuickActions}
        />
        
        {collapsible && (
          <Button
            variant="outline"
            size="sm"
            className="absolute -right-3 top-8 z-10 h-6 w-6 rounded-full border-2 bg-background p-0 shadow-lg hover:shadow-xl transition-all"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            <ChevronLeft className={cn(
              "h-3 w-3 transition-transform duration-200",
              collapsed && "rotate-180"
            )} />
          </Button>
        )}
      </aside>
      
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-sidebar-mobile p-0 sidebar-shadow-mobile">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de navegação</SheetTitle>
          </SheetHeader>
          <SidebarContentAdvanced 
            variant={variant}
            showQuickActions={showQuickActions}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}

export default AdvancedSidebar
