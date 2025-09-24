/**
 * Painel de Configurações de Acessibilidade
 * Interface para usuários configurarem preferências de acessibilidade
 */

'use client'

import React from 'react'
import { 
  Eye, 
  Keyboard, 
  Volume2, 
  MousePointer, 
  Zap, 
  Settings,
  Info,
  Check,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAccessibility } from '@/lib/accessibility/accessibility-manager'
import { cn } from '@/lib/utils'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface AccessibilityPanelProps {
  className?: string
  onClose?: () => void
}

interface SettingItemProps {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon: React.ReactNode
  badge?: string
  disabled?: boolean
}

// =====================================================
// COMPONENTE DE ITEM DE CONFIGURAÇÃO
// =====================================================

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  checked,
  onChange,
  icon,
  badge,
  disabled = false
}) => {
  const id = React.useId()

  return (
    <div className={cn(
      "flex items-start space-x-3 p-4 rounded-lg border transition-colors",
      checked ? "bg-primary/5 border-primary/20" : "bg-background border-border",
      disabled && "opacity-50 cursor-not-allowed"
    )}>
      <div className="flex-shrink-0 mt-1">
        {icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Label 
            htmlFor={id}
            className={cn(
              "text-sm font-medium cursor-pointer",
              disabled && "cursor-not-allowed"
            )}
          >
            {title}
          </Label>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>

      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-describedby={`${id}-description`}
      />
    </div>
  )
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  className,
  onClose
}) => {
  const { settings, updateSettings, announce, isScreenReaderActive } = useAccessibility()
  const [activeTab, setActiveTab] = React.useState('visual')

  // Anunciar mudanças importantes
  const handleSettingChange = React.useCallback((
    setting: keyof typeof settings,
    value: boolean,
    announcement: string
  ) => {
    updateSettings({ [setting]: value })
    announce(announcement, { priority: 'polite' })
  }, [updateSettings, announce])

  // Detectar se há configurações ativas
  const hasActiveSettings = React.useMemo(() => {
    return Object.entries(settings).some(([key, value]) => 
      key !== 'keyboardNavigation' && value === true
    )
  }, [settings])

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Configurações de Acessibilidade</CardTitle>
            {hasActiveSettings && (
              <Badge variant="secondary" className="ml-2">
                Ativo
              </Badge>
            )}
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fechar painel de acessibilidade"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          Personalize a experiência da aplicação para suas necessidades de acessibilidade
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visual" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="navigation" className="flex items-center gap-1">
              <Keyboard className="h-3 w-3" />
              Navegação
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              Áudio
            </TabsTrigger>
            <TabsTrigger value="interaction" className="flex items-center gap-1">
              <MousePointer className="h-3 w-3" />
              Interação
            </TabsTrigger>
          </TabsList>

          {/* Configurações Visuais */}
          <TabsContent value="visual" className="space-y-4 mt-6">
            <div className="space-y-3">
              <SettingItem
                title="Alto Contraste"
                description="Aumenta o contraste entre texto e fundo para melhor legibilidade"
                checked={settings.highContrast}
                onChange={(checked) => handleSettingChange(
                  'highContrast', 
                  checked, 
                  checked ? 'Alto contraste ativado' : 'Alto contraste desativado'
                )}
                icon={<Eye className="h-4 w-4 text-blue-600" />}
                badge="WCAG AA"
              />

              <SettingItem
                title="Texto Grande"
                description="Aumenta o tamanho da fonte em toda a aplicação"
                checked={settings.largeText}
                onChange={(checked) => handleSettingChange(
                  'largeText', 
                  checked, 
                  checked ? 'Texto grande ativado' : 'Texto grande desativado'
                )}
                icon={<Zap className="h-4 w-4 text-green-600" />}
              />

              <SettingItem
                title="Foco Visível"
                description="Destaca claramente o elemento que está em foco"
                checked={settings.focusVisible}
                onChange={(checked) => handleSettingChange(
                  'focusVisible', 
                  checked, 
                  checked ? 'Foco visível ativado' : 'Foco visível desativado'
                )}
                icon={<MousePointer className="h-4 w-4 text-purple-600" />}
              />

              <SettingItem
                title="Movimento Reduzido"
                description="Reduz animações e transições para evitar desconforto"
                checked={settings.reducedMotion}
                onChange={(checked) => handleSettingChange(
                  'reducedMotion', 
                  checked, 
                  checked ? 'Movimento reduzido ativado' : 'Movimento reduzido desativado'
                )}
                icon={<Settings className="h-4 w-4 text-orange-600" />}
                badge="Vestibular"
              />
            </div>
          </TabsContent>

          {/* Configurações de Navegação */}
          <TabsContent value="navigation" className="space-y-4 mt-6">
            <div className="space-y-3">
              <SettingItem
                title="Navegação por Teclado"
                description="Permite navegar pela aplicação usando apenas o teclado"
                checked={settings.keyboardNavigation}
                onChange={(checked) => handleSettingChange(
                  'keyboardNavigation', 
                  checked, 
                  checked ? 'Navegação por teclado ativada' : 'Navegação por teclado desativada'
                )}
                icon={<Keyboard className="h-4 w-4 text-blue-600" />}
                badge="Essencial"
              />

              <SettingItem
                title="Links de Pular"
                description="Adiciona links para pular para seções principais da página"
                checked={settings.skipLinks}
                onChange={(checked) => handleSettingChange(
                  'skipLinks', 
                  checked, 
                  checked ? 'Links de pular ativados' : 'Links de pular desativados'
                )}
                icon={<Zap className="h-4 w-4 text-green-600" />}
                badge="WCAG AA"
              />
            </div>

            {/* Informações sobre atalhos */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Atalhos de Teclado Disponíveis:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• <kbd className="px-1 py-0.5 bg-background rounded text-xs">Alt + H</kbd> - Ir para conteúdo principal</li>
                    <li>• <kbd className="px-1 py-0.5 bg-background rounded text-xs">Alt + N</kbd> - Ir para navegação</li>
                    <li>• <kbd className="px-1 py-0.5 bg-background rounded text-xs">Alt + S</kbd> - Ir para busca</li>
                    <li>• <kbd className="px-1 py-0.5 bg-background rounded text-xs">Shift + ?</kbd> - Mostrar todos os atalhos</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Configurações de Áudio */}
          <TabsContent value="audio" className="space-y-4 mt-6">
            <div className="space-y-3">
              <SettingItem
                title="Anúncios de Screen Reader"
                description="Anuncia mudanças importantes para leitores de tela"
                checked={settings.announcements}
                onChange={(checked) => handleSettingChange(
                  'announcements', 
                  checked, 
                  checked ? 'Anúncios ativados' : 'Anúncios desativados'
                )}
                icon={<Volume2 className="h-4 w-4 text-blue-600" />}
                badge={isScreenReaderActive ? "Detectado" : ""}
              />

              <SettingItem
                title="Suporte a Screen Reader"
                description="Otimiza a experiência para usuários de leitores de tela"
                checked={settings.screenReader}
                onChange={(checked) => handleSettingChange(
                  'screenReader', 
                  checked, 
                  checked ? 'Suporte a screen reader ativado' : 'Suporte a screen reader desativado'
                )}
                icon={<Settings className="h-4 w-4 text-green-600" />}
              />
            </div>

            {/* Status do Screen Reader */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                {isScreenReaderActive ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Screen Reader Detectado</span>
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Nenhum Screen Reader Detectado</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isScreenReaderActive 
                  ? "A aplicação está otimizada para seu leitor de tela"
                  : "As configurações de acessibilidade ainda estão disponíveis"
                }
              </p>
            </div>
          </TabsContent>

          {/* Configurações de Interação */}
          <TabsContent value="interaction" className="space-y-4 mt-6">
            <div className="space-y-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Configurações de Interação</p>
                    <p className="text-xs text-muted-foreground">
                      Funcionalidades adicionais de interação serão implementadas em futuras versões.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Ações do Painel */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Configurações salvas automaticamente
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateSettings({
                  highContrast: false,
                  reducedMotion: false,
                  largeText: false,
                  screenReader: false,
                  focusVisible: true,
                  announcements: true,
                  skipLinks: true
                })
                announce('Configurações restauradas para padrão')
              }}
            >
              Restaurar Padrão
            </Button>
            
            {onClose && (
              <Button size="sm" onClick={onClose}>
                Concluído
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =====================================================
// HOOK PARA USAR O PAINEL
// =====================================================

export function useAccessibilityPanel() {
  const [isOpen, setIsOpen] = React.useState(false)

  const openPanel = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const closePanel = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  const togglePanel = React.useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    openPanel,
    closePanel,
    togglePanel
  }
}
