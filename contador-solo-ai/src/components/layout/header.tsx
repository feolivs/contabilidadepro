'use client'

import React, { Suspense, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { useAuthStore } from '@/store/auth-store'
import { useSupabase } from '@/hooks/use-supabase'
import {
  Menu,
  Bell,
  Search,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { SearchImproved } from './search-improved'
import { cn } from '@/lib/utils'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface HeaderProps {
  onMenuClick: () => void
  variant?: 'standard' | 'optimized' | 'minimal'
  showBreadcrumbs?: boolean
  showSearch?: boolean
  showNotifications?: boolean
  showQuickActions?: boolean
  enableOptimizations?: boolean
  className?: string
}

interface BreadcrumbItem {
  label: string
  href?: string
  isActive: boolean
}

// Mock notifications data
const notifications = [
  {
    id: 1,
    title: 'DAS vencendo em 3 dias',
    description: 'Empresa ABC Ltda - Vencimento: 20/01/2024',
    type: 'warning',
    time: '2 horas atrás',
    read: false
  },
  {
    id: 2,
    title: 'Documento processado',
    description: 'NFe #123456 foi processada com sucesso',
    type: 'success',
    time: '4 horas atrás',
    read: false
  },
  {
    id: 3,
    title: 'Novo cliente cadastrado',
    description: 'XYZ Comércio foi adicionado ao sistema',
    type: 'info',
    time: '1 dia atrás',
    read: true
  }
]

// =====================================================
// UTILITÁRIOS E DADOS
// =====================================================

// Page titles mapping
const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/assistente': 'Assistente IA',
  '/clientes': 'Clientes',
  '/documentos': 'Documentos',
  '/upload': 'Upload de Documentos',
  '/calculos': 'Cálculos Fiscais',
  '/prazos': 'Prazos Fiscais',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
  '/empresas': 'Empresas',
  '/seguranca': 'Segurança'
}

const pageDescriptions: Record<string, string> = {
  '/dashboard': 'Visão geral do sistema contábil',
  '/assistente': 'Assistente inteligente para contabilidade',
  '/clientes': 'Gestão de clientes e empresas',
  '/documentos': 'Processamento de documentos fiscais',
  '/calculos': 'Cálculos e apurações fiscais',
  '/prazos': 'Controle de vencimentos e prazos',
  '/relatorios': 'Relatórios e análises',
  '/empresas': 'Cadastro e gestão de empresas',
  '/seguranca': 'Configurações de segurança'
}

// Gerar breadcrumbs simples
const generateSimpleBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'ContabilidadePRO', href: '/', isActive: false }
  ]

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    const title = pageTitles[currentPath] || segment
    breadcrumbs.push({
      label: title,
      href: currentPath,
      isActive: currentPath === pathname
    })
  }

  return breadcrumbs
}

// =====================================================
// COMPONENTES AUXILIARES
// =====================================================

const BreadcrumbComponent = React.memo<{ items: BreadcrumbItem[] }>(({ items }) => {
  if (items.length <= 1) return null

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 && (
            <span className="mx-2 text-muted-foreground/50" aria-hidden="true">
              /
            </span>
          )}
          {item.href && !item.isActive ? (
            <a
              href={item.href}
              className="hover:text-foreground transition-colors"
              aria-current={item.isActive ? 'page' : undefined}
            >
              {item.label}
            </a>
          ) : (
            <span
              className={item.isActive ? 'text-foreground font-medium' : ''}
              aria-current={item.isActive ? 'page' : undefined}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
})

BreadcrumbComponent.displayName = 'BreadcrumbComponent'

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function Header({
  onMenuClick,
  variant = 'standard',
  showBreadcrumbs = true,
  showSearch = true,
  showNotifications = true,
  showQuickActions = false,
  enableOptimizations = false,
  className
}: HeaderProps) {
  const { user, logout } = useAuthStore()
  const supabase = useSupabase()
  const router = useRouter()
  const pathname = usePathname()
  // Dados do usuário
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'
  const userInitials = userName
    .split(' ')
    .map(name => name?.[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'US'

  // Dados da página atual
  const currentPageTitle = pageTitles[pathname] || 'ContabilidadePRO'
  const currentPageDescription = pageDescriptions[pathname] || 'Sistema de inteligência contábil'

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!showBreadcrumbs) return []
    return generateSimpleBreadcrumbs(pathname)
  }, [pathname, showBreadcrumbs])

  // Handlers
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      logout()
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  // Estilos baseados na variante
  const headerStyles = {
    standard: "bg-background border-b border-border px-4 py-3 sm:px-6 lg:px-8",
    optimized: "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
    minimal: "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
  }

  const contentStyles = {
    standard: "flex items-center justify-between",
    optimized: "flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8",
    minimal: "flex h-16 items-center px-6"
  }

  return (
    <header className={cn(headerStyles[variant], className)}>
      {/* Breadcrumbs - apenas para variante standard */}
      {variant === 'standard' && showBreadcrumbs && breadcrumbs.length > 1 && (
        <div className="hidden lg:flex items-center text-sm text-muted-foreground mb-3">
          <BreadcrumbComponent items={breadcrumbs} />
        </div>
      )}

      {/* Breadcrumbs - para variante optimized */}
      {variant === 'optimized' && showBreadcrumbs && (
        <div className="hidden sm:block min-w-0 flex-1">
          <BreadcrumbComponent items={breadcrumbs} />
        </div>
      )}

      {/* Page Title - para variante minimal */}
      {variant === 'minimal' && (
        <div className="flex-1">
          <h1 className="text-lg font-semibold">{currentPageTitle}</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            {currentPageDescription}
          </p>
        </div>
      )}

      <div className={contentStyles[variant]}>
        {/* Left side - adaptável por variante */}
        {variant !== 'minimal' && (
          <div className="flex items-center flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden mr-3"
              onClick={onMenuClick}
              aria-label="Abrir menu de navegação"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Search bar - condicional */}
            {showSearch && (
              <div className="hidden sm:block flex-1 max-w-lg">
                {enableOptimizations ? (
                  <Suspense fallback={<Skeleton className="h-9 w-full" />}>
                    <SearchImproved
                      placeholder="Buscar clientes, documentos, cálculos..."
                      showFilters={false}
                      maxResults={8}
                    />
                  </Suspense>
                ) : (
                  <SearchImproved
                    placeholder="Buscar clientes, documentos, cálculos..."
                    showFilters={false}
                    maxResults={8}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Mobile Menu Button - para variante minimal */}
        {variant === 'minimal' && (
          <Button
            variant="ghost"
            size="sm"
            className="mr-4 lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Right side - adaptável por variante */}
        <div className="flex items-center space-x-2">
          {/* Search para variante minimal */}
          {variant === 'minimal' && showSearch && (
            <>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="w-64 pl-9"
                />
              </div>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Search className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Mobile Search Button - para outras variantes */}
          {variant !== 'minimal' && showSearch && (
            <div className="md:hidden">
              <Button variant="ghost" size="sm">
                <Search className="h-4 w-4" />
                <span className="sr-only">Buscar</span>
              </Button>
            </div>
          )}

          {/* Theme toggle */}
          {enableOptimizations ? (
            <Suspense fallback={<Skeleton className="h-9 w-9" />}>
              <ThemeToggle variant={variant === 'minimal' ? 'dropdown' : 'button'} />
            </Suspense>
          ) : (
            <ThemeToggle variant={variant === 'minimal' ? 'dropdown' : 'button'} />
          )}

          {/* Notifications - condicional */}
          {showNotifications && (
            <>
              {variant === 'minimal' ? (
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    3
                  </Badge>
                </Button>
              ) : enableOptimizations ? (
                <Suspense fallback={<Skeleton className="h-9 w-9" />}>
                  <NotificationCenter />
                </Suspense>
              ) : (
                <NotificationCenter />
              )}
            </>
          )}

          {/* User menu */}
          {variant === 'minimal' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-xs font-medium text-primary-foreground">
                      {userInitials}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{userName}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/perfil')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/configuracoes')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : enableOptimizations ? (
            <Suspense fallback={<Skeleton className="h-9 w-9 rounded-full" />}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="Menu do usuário"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url} alt={userName} />
                      <AvatarFallback className="bg-blue-500 text-white">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userName}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/perfil')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push('/configuracoes')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Suporte
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Suspense>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  aria-label="Menu do usuário"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt={userName} />
                    <AvatarFallback className="bg-blue-500 text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push('/perfil')}
                >
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push('/configuracoes')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Suporte
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mobile Search Bar - para variante optimized */}
      {variant === 'optimized' && showSearch && (
        <div className="md:hidden border-t px-4 py-3">
          {enableOptimizations ? (
            <Suspense fallback={<Skeleton className="h-9 w-full" />}>
              <SearchImproved
                placeholder="Buscar..."
                showFilters={false}
                maxResults={5}
              />
            </Suspense>
          ) : (
            <SearchImproved
              placeholder="Buscar..."
              showFilters={false}
              maxResults={5}
            />
          )}
        </div>
      )}
    </header>
  )
}
