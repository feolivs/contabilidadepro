'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Moon, Sun, Monitor, Palette, Eye, Settings } from 'lucide-react'

interface ThemeSettingsProps {
  className?: string
}

export function ThemeSettings({ className }: ThemeSettingsProps) {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [autoMode, setAutoMode] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Check user preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReducedMotion(prefersReducedMotion)

    // Check for auto mode preference
    const savedAutoMode = localStorage.getItem('contador-auto-theme') === 'true'
    setAutoMode(savedAutoMode)

    // Check for high contrast preference
    const savedHighContrast = localStorage.getItem('contador-high-contrast') === 'true'
    setHighContrast(savedHighContrast)
  }, [])

  useEffect(() => {
    if (mounted && autoMode) {
      const hour = new Date().getHours()
      const shouldBeDark = hour < 6 || hour >= 18
      setTheme(shouldBeDark ? 'dark' : 'light')
    }
  }, [autoMode, mounted, setTheme])

  const handleAutoModeChange = (enabled: boolean) => {
    setAutoMode(enabled)
    localStorage.setItem('contador-auto-theme', enabled.toString())

    if (enabled) {
      const hour = new Date().getHours()
      const shouldBeDark = hour < 6 || hour >= 18
      setTheme(shouldBeDark ? 'dark' : 'light')
    }
  }

  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled)
    localStorage.setItem('contador-high-contrast', enabled.toString())
    document.documentElement.classList.toggle('high-contrast', enabled)
  }

  const handleReducedMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled)
    localStorage.setItem('contador-reduced-motion', enabled.toString())
    document.documentElement.classList.toggle('reduce-motion', enabled)
  }

  const getThemeDescription = () => {
    switch (theme) {
      case 'dark':
        return 'Interface escura para reduzir fadiga visual'
      case 'light':
        return 'Interface clara e brilhante'
      case 'system':
        return `Segue a preferência do sistema (${resolvedTheme === 'dark' ? 'escuro' : 'claro'})`
      default:
        return 'Escolha como você quer ver a interface'
    }
  }

  if (!mounted) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Tema
          </CardTitle>
          <CardDescription>Carregando configurações...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-6 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Configurações de Tema
        </CardTitle>
        <CardDescription>
          Personalize a aparência do sistema conforme sua preferência
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tema Principal</Label>
          <Select value={theme} onValueChange={setTheme} disabled={autoMode}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Claro
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Escuro
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Sistema
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {getThemeDescription()}
          </p>
        </div>

        {/* Quick Theme Preview */}
        <div className="grid grid-cols-3 gap-2">
          {['light', 'dark', 'system'].map((themeOption) => (
            <Button
              key={themeOption}
              variant={theme === themeOption ? 'default' : 'outline'}
              size="sm"
              onClick={() => !autoMode && setTheme(themeOption)}
              disabled={autoMode}
              className="h-16 flex flex-col gap-1"
            >
              {themeOption === 'light' && <Sun className="h-4 w-4" />}
              {themeOption === 'dark' && <Moon className="h-4 w-4" />}
              {themeOption === 'system' && <Monitor className="h-4 w-4" />}
              <span className="text-xs capitalize">{themeOption}</span>
            </Button>
          ))}
        </div>

        {/* Auto Mode */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Modo Automático</Label>
            <p className="text-xs text-muted-foreground">
              Alterna automaticamente entre claro (6h-18h) e escuro (18h-6h)
            </p>
          </div>
          <Switch
            checked={autoMode}
            onCheckedChange={handleAutoModeChange}
            aria-label="Ativar modo automático de tema"
          />
        </div>

        {/* Accessibility Options */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <Label className="text-sm font-medium">Acessibilidade</Label>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label className="text-sm">Alto Contraste</Label>
              <p className="text-xs text-muted-foreground">
                Aumenta o contraste para melhor legibilidade
              </p>
            </div>
            <Switch
              checked={highContrast}
              onCheckedChange={handleHighContrastChange}
              aria-label="Ativar alto contraste"
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <Label className="text-sm">Reduzir Animações</Label>
              <p className="text-xs text-muted-foreground">
                Desativa transições e animações para usuários sensíveis ao movimento
              </p>
            </div>
            <Switch
              checked={reducedMotion}
              onCheckedChange={handleReducedMotionChange}
              aria-label="Reduzir animações"
            />
          </div>
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTheme('system')
              setAutoMode(false)
              setHighContrast(false)
              setReducedMotion(false)
              localStorage.removeItem('contador-auto-theme')
              localStorage.removeItem('contador-high-contrast')
              localStorage.removeItem('contador-reduced-motion')
              document.documentElement.classList.remove('high-contrast', 'reduce-motion')
            }}
            className="w-full"
          >
            Restaurar Padrões
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}