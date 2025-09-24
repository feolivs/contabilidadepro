'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ChevronLeft, 
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

} from 'lucide-react'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
}

interface ModernSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: 'default' | 'glass' | 'minimal'
  collapsible?: boolean
}

// =====================================================
// DADOS DE NAVEGAÇÃO
// =====================================================

const navigationSections: NavigationSection[] = [
  {
    title: 'Principal',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard
      },
      {
        name: 'Assistente IA',
        href: '/assistente',
        icon: Bot,
        badge: 'NOVO',
        badgeVariant: 'secondary'
      },
    ]
  },
  {
    title: 'Gestão',
    items: [
      {
        name: 'Clientes',
        href: '/clientes',
        icon: Users
      },
      {
        name: 'Documentos',
        href: '/documentos',
        icon: FileText
      },
    ]
  },
  {
    title: 'Operações',
    items: [
      {
        name: 'Cálculos Fiscais',
        href: '/calculos',
        icon: Calculator
      },
      {
        name: 'Prazos Fiscais',
        href: '/prazos',
        icon: Calendar,
        badge: 3,
        badgeVariant: 'destructive'
      },
      {
        name: 'Relatórios',
        href: '/relatorios',
        icon: BarChart3
      },
    ]
  },
]

// =====================================================
// COMPONENTES
// =====================================================

const NavigationItem = ({ 
  item, 
  collapsed = false 
}: { 
  item: NavigationItem
  collapsed?: boolean 
}) => {
  const pathname = usePathname()
  const isActive = pathname === item.href

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors sidebar-transition",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "active:bg-accent/80",
        isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
      )}
      aria-label={collapsed ? item.name : undefined}
      title={collapsed ? item.name : undefined}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.name}</span>
          {item.badge && (
            <Badge variant={item.badgeVariant || 'default'} className="text-xs">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  )
}

const NavigationSection = ({ 
  section, 
  collapsed = false 
}: { 
  section: NavigationSection
  collapsed?: boolean 
}) => (
  <div className="space-y-1">
    {!collapsed && (
      <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {section.title}
      </h3>
    )}
    <div className="space-y-1">
      {section.items.map((item) => (
        <NavigationItem key={item.href} item={item} collapsed={collapsed} />
      ))}
    </div>
  </div>
)

const UserProfile = ({ collapsed = false }: { collapsed?: boolean }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
    <Avatar className="h-8 w-8">
      <AvatarImage src="" alt="Usuário" />
      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
        U
      </AvatarFallback>
    </Avatar>
    {!collapsed && (
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          Usuário
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Sistema ativo
        </p>
      </div>
    )}
  </div>
)

const SidebarContent = ({ 
  collapsed = false,
  variant = 'default' 
}: { 
  collapsed?: boolean
  variant?: 'default' | 'glass' | 'minimal'
}) => (
  <div className="flex h-full flex-col">
    {/* Logo/Brand */}
    <div className="flex h-16 items-center border-b px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-semibold">ContabilidadePRO</h1>
            <p className="text-xs text-muted-foreground">Sistema Inteligente</p>
          </div>
        )}
      </div>
    </div>
    
    {/* Navigation */}
    <ScrollArea className="flex-1 px-3 py-4">
      <nav role="navigation" aria-label="Menu principal" className="space-y-6">
        {navigationSections.map((section) => (
          <NavigationSection 
            key={section.title} 
            section={section} 
            collapsed={collapsed} 
          />
        ))}
      </nav>
    </ScrollArea>
    
    {/* Footer */}
    <div className="border-t p-4">
      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        <UserProfile collapsed={collapsed} />
      </Suspense>
    </div>
  </div>
)

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const ModernSidebar = ({ 
  open, 
  onOpenChange, 
  variant = 'default',
  collapsible = true 
}: ModernSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false)

  const sidebarClasses = cn(
    "fixed left-0 top-0 z-50 h-full sidebar-transition",
    collapsed ? "w-sidebar-collapsed" : "w-sidebar",
    variant === 'glass' && "sidebar-glass dark:sidebar-glass-dark",
    variant === 'default' && "bg-background border-r sidebar-shadow",
    variant === 'minimal' && "bg-background/95 border-r",
    "hidden lg:block"
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={sidebarClasses}>
        <SidebarContent collapsed={collapsed} variant={variant} />
        
        {collapsible && (
          <Button
            variant="outline"
            size="sm"
            className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-background p-0 shadow-md"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            <ChevronLeft className={cn(
              "h-3 w-3 transition-transform",
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
          <SidebarContent variant={variant} />
        </SheetContent>
      </Sheet>
    </>
  )
}

export default ModernSidebar
