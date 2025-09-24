/**
 * Modal de Atalhos de Teclado
 * Interface para visualizar e gerenciar atalhos de teclado da aplicação
 */

'use client'

import React from 'react'
import { 
  Keyboard, 
  Search, 
  Navigation, 
  Zap, 
  Settings, 
  X,
  Info,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAccessibility, type KeyboardShortcut } from '@/lib/accessibility/accessibility-manager'
import { cn } from '@/lib/utils'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface KeyboardShortcutsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ShortcutGroupProps {
  title: string
  icon: React.ReactNode
  shortcuts: KeyboardShortcut[]
  searchQuery: string
}

// =====================================================
// ATALHOS PADRÃO DA APLICAÇÃO
// =====================================================

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Navegação
  {
    key: 'h',
    modifiers: ['alt'],
    action: () => {},
    description: 'Ir para conteúdo principal',
    category: 'Navegação'
  },
  {
    key: 'n',
    modifiers: ['alt'],
    action: () => {},
    description: 'Ir para navegação',
    category: 'Navegação'
  },
  {
    key: 's',
    modifiers: ['alt'],
    action: () => {},
    description: 'Focar na busca',
    category: 'Navegação'
  },
  {
    key: 'd',
    modifiers: ['alt'],
    action: () => {},
    description: 'Ir para dashboard',
    category: 'Navegação'
  },
  {
    key: 'c',
    modifiers: ['alt'],
    action: () => {},
    description: 'Ir para clientes',
    category: 'Navegação'
  },

  // Ações
  {
    key: 'n',
    modifiers: ['ctrl'],
    action: () => {},
    description: 'Novo item',
    category: 'Ações'
  },
  {
    key: 's',
    modifiers: ['ctrl'],
    action: () => {},
    description: 'Salvar',
    category: 'Ações'
  },
  {
    key: 'f',
    modifiers: ['ctrl'],
    action: () => {},
    description: 'Buscar',
    category: 'Ações'
  },
  {
    key: 'p',
    modifiers: ['ctrl'],
    action: () => {},
    description: 'Imprimir',
    category: 'Ações'
  },

  // Acessibilidade
  {
    key: '?',
    modifiers: ['shift'],
    action: () => {},
    description: 'Mostrar atalhos',
    category: 'Acessibilidade'
  },
  {
    key: 'a',
    modifiers: ['alt'],
    action: () => {},
    description: 'Configurações de acessibilidade',
    category: 'Acessibilidade'
  },
  {
    key: 't',
    modifiers: ['alt'],
    action: () => {},
    description: 'Alternar tema',
    category: 'Acessibilidade'
  },

  // Sistema
  {
    key: 'Escape',
    modifiers: [],
    action: () => {},
    description: 'Fechar modal/menu',
    category: 'Sistema'
  },
  {
    key: 'Tab',
    modifiers: [],
    action: () => {},
    description: 'Navegar entre elementos',
    category: 'Sistema'
  },
  {
    key: 'Enter',
    modifiers: [],
    action: () => {},
    description: 'Ativar elemento focado',
    category: 'Sistema'
  }
]

// =====================================================
// COMPONENTE DE GRUPO DE ATALHOS
// =====================================================

const ShortcutGroup: React.FC<ShortcutGroupProps> = ({
  title,
  icon,
  shortcuts,
  searchQuery
}) => {
  const [copiedShortcut, setCopiedShortcut] = React.useState<string | null>(null)

  // Filtrar atalhos baseado na busca
  const filteredShortcuts = React.useMemo(() => {
    if (!searchQuery) return shortcuts

    return shortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.modifiers.some(mod => mod.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [shortcuts, searchQuery])

  if (filteredShortcuts.length === 0) {
    return null
  }

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const modifierMap = {
      ctrl: 'Ctrl',
      alt: 'Alt',
      shift: 'Shift',
      meta: 'Cmd'
    }

    const modifiers = shortcut.modifiers.map(mod => modifierMap[mod] || mod)
    const key = shortcut.key === ' ' ? 'Space' : shortcut.key
    
    return [...modifiers, key].join(' + ')
  }

  const copyShortcut = async (shortcut: KeyboardShortcut) => {
    const shortcutText = formatShortcut(shortcut)
    try {
      await navigator.clipboard.writeText(shortcutText)
      setCopiedShortcut(shortcut.key)
      setTimeout(() => setCopiedShortcut(null), 2000)
    } catch (error) {
      console.warn('Não foi possível copiar o atalho:', error)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto">
            {filteredShortcuts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filteredShortcuts.map((shortcut, index) => (
          <div
            key={`${shortcut.category}-${shortcut.key}-${index}`}
            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {shortcut.description}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-muted rounded border">
                {formatShortcut(shortcut)}
              </kbd>
              
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyShortcut(shortcut)}
                aria-label={`Copiar atalho: ${formatShortcut(shortcut)}`}
              >
                {copiedShortcut === shortcut.key ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onOpenChange
}) => {
  const { settings, announce } = useAccessibility()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeTab, setActiveTab] = React.useState('all')

  // Combinar atalhos padrão com atalhos registrados
  const allShortcuts = React.useMemo(() => {
    // Em uma implementação real, você pegaria os atalhos registrados
    // const registeredShortcuts = accessibilityManager.getShortcuts()
    return DEFAULT_SHORTCUTS
  }, [])

  // Agrupar atalhos por categoria
  const shortcutGroups = React.useMemo(() => {
    const groups = allShortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category]?.push(shortcut)
      return acc
    }, {} as Record<string, KeyboardShortcut[]>)

    return Object.entries(groups).map(([category, shortcuts]) => ({
      category,
      shortcuts: shortcuts.sort((a, b) => a.description.localeCompare(b.description))
    }))
  }, [allShortcuts])

  // Filtrar grupos baseado na aba ativa
  const filteredGroups = React.useMemo(() => {
    if (activeTab === 'all') return shortcutGroups
    return shortcutGroups.filter(group => 
      group.category.toLowerCase() === activeTab.toLowerCase()
    )
  }, [shortcutGroups, activeTab])

  // Anunciar abertura do modal
  React.useEffect(() => {
    if (open && settings.announcements) {
      announce('Modal de atalhos de teclado aberto', { priority: 'polite' })
    }
  }, [open, settings.announcements, announce])

  // Ícones para categorias
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'navegação':
        return <Navigation className="h-4 w-4 text-blue-600" />
      case 'ações':
        return <Zap className="h-4 w-4 text-green-600" />
      case 'acessibilidade':
        return <Settings className="h-4 w-4 text-purple-600" />
      case 'sistema':
        return <Keyboard className="h-4 w-4 text-orange-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  const totalShortcuts = allShortcuts.length
  const filteredShortcuts = filteredGroups.reduce(
    (total, group) => total + group.shortcuts.length, 
    0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Atalhos de Teclado
            <Badge variant="secondary" className="ml-2">
              {filteredShortcuts} de {totalShortcuts}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Navegue pela aplicação de forma mais eficiente usando atalhos de teclado
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar atalhos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Buscar atalhos de teclado"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="navegação">Navegação</TabsTrigger>
              <TabsTrigger value="ações">Ações</TabsTrigger>
              <TabsTrigger value="acessibilidade">Acessibilidade</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-4">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map(({ category, shortcuts }) => (
                    <ShortcutGroup
                      key={category}
                      title={category}
                      icon={getCategoryIcon(category)}
                      shortcuts={shortcuts}
                      searchQuery={searchQuery}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhum atalho encontrado para "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Pressione <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift + ?</kbd> para abrir este modal
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================
// HOOK PARA USAR O MODAL
// =====================================================

export function useKeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const { registerShortcut, unregisterShortcut, settings } = useAccessibility()

  // Registrar atalho para abrir o modal
  React.useEffect(() => {
    if (!settings.keyboardNavigation) return

    const shortcut: KeyboardShortcut = {
      key: '?',
      modifiers: ['shift'],
      action: () => setIsOpen(true),
      description: 'Mostrar atalhos de teclado',
      category: 'Acessibilidade'
    }

    registerShortcut(shortcut)

    // Listener para evento customizado
    const handleShowShortcuts = () => setIsOpen(true)
    window.addEventListener('show-keyboard-shortcuts', handleShowShortcuts)

    return () => {
      unregisterShortcut('?', ['shift'])
      window.removeEventListener('show-keyboard-shortcuts', handleShowShortcuts)
    }
  }, [registerShortcut, unregisterShortcut, settings.keyboardNavigation])

  const openModal = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeModal = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    openModal,
    closeModal,
    setIsOpen
  }
}
