/**
 * Navegação Mobile Otimizada
 * Sistema de navegação responsivo com foco em mobile-first
 */

'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calculator, 
  Calendar,
  BarChart3,
  Bot,
  Settings,
  Menu,
  X,
  ChevronRight,
  Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAccessibility } from '@/lib/accessibility/accessibility-manager'
import { APP_ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface MobileNavigationProps {
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  isNew?: boolean
  description?: string
}

interface NavigationSection {
  title: string
  items: NavigationItem[]
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
        href: APP_ROUTES.DASHBOARD,
        icon: LayoutDashboard,
        description: 'Visão geral dos dados'
      },
      {
        name: 'Assistente IA',
        href: APP_ROUTES.ASSISTENTE,
        icon: Bot,
        badge: 'NOVO',
        badgeVariant: 'secondary',
        isNew: true,
        description: 'Assistente inteligente para contabilidade'
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
        description: 'Gerenciar clientes'
      },
      {
        name: 'Documentos',
        href: APP_ROUTES.DOCUMENTOS,
        icon: FileText,
        description: 'Documentos e OCR'
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
        description: 'Cálculos e impostos'
      },
      {
        name: 'Prazos Fiscais',
        href: APP_ROUTES.PRAZOS,
        icon: Calendar,
        description: 'Calendário de obrigações'
      },
      {
        name: 'Relatórios',
        href: APP_ROUTES.RELATORIOS,
        icon: BarChart3,
        description: 'Relatórios e análises'
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
        description: 'Configurações do sistema'
      }
    ]
  }
]

// =====================================================
// COMPONENTE DE ITEM DE NAVEGAÇÃO
// =====================================================

interface NavigationItemComponentProps {
  item: NavigationItem
  isActive: boolean
  onItemClick: () => void
}

const NavigationItemComponent: React.FC<NavigationItemComponentProps> = ({
  item,
  isActive,
  onItemClick
}) => {
  const { settings, announce } = useAccessibility()

  const handleClick = () => {
    if (settings.announcements) {
      announce(`Navegando para ${item.name}`)
    }
    onItemClick()
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all duration-200",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        isActive && "bg-accent text-accent-foreground font-medium",
        "group"
      )}
      aria-current={isActive ? 'page' : undefined}
      aria-describedby={item.description ? `${item.name}-description` : undefined}
    >
      <item.icon className={cn(
        "h-5 w-5 flex-shrink-0 transition-colors",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate">{item.name}</span>
          {item.badge && (
            <Badge 
              variant={item.badgeVariant || 'default'} 
              className="text-xs px-1.5 py-0.5 h-auto"
              aria-label={`${item.name} - ${item.badge}`}
            >
              {item.badge}
            </Badge>
          )}
          {item.isNew && (
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" aria-hidden="true" />
          )}
        </div>
        
        {item.description && (
          <p 
            id={`${item.name}-description`}
            className="text-xs text-muted-foreground mt-0.5 truncate"
          >
            {item.description}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  className
}) => {
  const pathname = usePathname()
  const { settings, announce } = useAccessibility()
  const [isOpen, setIsOpen] = React.useState(false)

  // Detectar se é mobile
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fechar navegação ao mudar de rota
  React.useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Anunciar abertura/fechamento
  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open)
    if (settings.announcements) {
      announce(open ? 'Menu de navegação aberto' : 'Menu de navegação fechado')
    }
  }, [settings.announcements, announce])

  // Encontrar item ativo
  const activeItem = React.useMemo(() => {
    for (const section of navigationSections) {
      const item = section.items.find(item => item.href === pathname)
      if (item) return item
    }
    return null
  }, [pathname])

  // Se não for mobile, não renderizar
  if (!isMobile) {
    return null
  }

  return (
    <div className={cn("lg:hidden", className)}>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent 
          side="left" 
          className="w-80 p-0 flex flex-col"
          aria-describedby="mobile-navigation-description"
        >
          <SheetHeader className="p-6 pb-4">
            <SheetTitle className="flex items-center gap-2 text-left">
              <Home className="h-5 w-5 text-primary" />
              ContabilidadePRO
            </SheetTitle>
            <p 
              id="mobile-navigation-description"
              className="text-sm text-muted-foreground text-left"
            >
              Navegue pelas funcionalidades da aplicação
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6">
            <nav className="space-y-6" role="navigation" aria-label="Navegação principal">
              {navigationSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavigationItemComponent
                        key={item.href}
                        item={item}
                        isActive={pathname === item.href}
                        onItemClick={() => setIsOpen(false)}
                      />
                    ))}
                  </div>

                  {sectionIndex < navigationSections.length - 1 && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* Footer com informações do usuário */}
          <div className="p-6 pt-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Usuário</p>
                <p className="text-xs text-muted-foreground truncate">
                  Contador
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Breadcrumb mobile */}
      {activeItem && (
        <div className="flex items-center gap-2 ml-3 text-sm text-muted-foreground">
          <activeItem.icon className="h-4 w-4" />
          <span className="font-medium text-foreground">{activeItem.name}</span>
        </div>
      )}
    </div>
  )
}

// =====================================================
// BOTTOM NAVIGATION (ALTERNATIVA)
// =====================================================

const bottomNavigationItems = [
  { name: 'Dashboard', href: APP_ROUTES.DASHBOARD, icon: LayoutDashboard },
  { name: 'Clientes', href: APP_ROUTES.CLIENTES, icon: Users },
  { name: 'Documentos', href: APP_ROUTES.DOCUMENTOS, icon: FileText },
  { name: 'Cálculos', href: APP_ROUTES.CALCULOS, icon: Calculator },
  { name: 'Mais', href: '#', icon: Menu }
]

export const BottomNavigation: React.FC = () => {
  const pathname = usePathname()
  const { settings, announce } = useAccessibility()
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!isMobile) {
    return null
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
      role="navigation"
      aria-label="Navegação inferior"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {bottomNavigationItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              onClick={() => {
                if (settings.announcements) {
                  announce(`Navegando para ${item.name}`)
                }
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// =====================================================
// HOOK PARA NAVEGAÇÃO MOBILE
// =====================================================

export function useMobileNavigation() {
  const [isMobile, setIsMobile] = React.useState(false)
  const [isTablet, setIsTablet] = React.useState(false)

  React.useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet
  }
}
