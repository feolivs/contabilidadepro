'use client'

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

interface HeaderProps {
  onMenuClick: () => void
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
  '/configuracoes': 'Configurações'
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const supabase = useSupabase()
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      logout()
      router.push('/login')
    } catch (error) {

    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Implementar busca

    }
  }

  const unreadNotifications = notifications.filter(n => !n.read).length
  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'AD'
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'
  const currentPageTitle = pageTitles[pathname] || 'Página'

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <FileText className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <header className="bg-background border-b border-border px-4 py-3 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <div className="hidden lg:flex items-center text-sm text-muted-foreground mb-3">
        <span>Contador Solo AI</span>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="text-foreground font-medium">{currentPageTitle}</span>
      </div>

      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden mr-3"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden sm:block flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Buscar clientes, documentos, cálculos..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 ml-4">
          {/* Theme toggle */}
          <ThemeToggle variant="dropdown" />

          {/* Notifications Center - Sistema em tempo real */}
          <NotificationCenter />

          {/* User menu */}
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
        </div>
      </div>
    </header>
  )
}
