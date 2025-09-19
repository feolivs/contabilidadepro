'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, Monitor, Zap, Palette, Loader2 } from 'lucide-react'
import { useEnhancedTheme } from '@/hooks/use-enhanced-theme'

interface ThemeToggleProps {
  showOnMobile?: boolean
  variant?: 'button' | 'dropdown'
}

export function ThemeToggle({ showOnMobile = false, variant = 'button' }: ThemeToggleProps) {
  const {
    theme,
    setTheme,
    resolvedTheme,
    mounted,
    preferences,
    toggleAutoMode,
    getThemeDescription,
    isAutoMode
  } = useEnhancedTheme()

  const [isChanging, setIsChanging] = useState(false)
  const [lastTheme, setLastTheme] = useState(resolvedTheme)

  const handleThemeChange = async (newTheme: string) => {
    setIsChanging(true)
    setLastTheme(resolvedTheme)

    // Add a small delay to show the animation
    setTimeout(() => {
      setTheme(newTheme)
      setTimeout(() => {
        setIsChanging(false)
      }, 300) // Match CSS transition duration
    }, 100)
  }

  const toggleTheme = () => {
    if (!isAutoMode) {
      const newTheme = theme === 'dark' ? 'light' : 'dark'
      handleThemeChange(newTheme)
    }
  }

  const getThemeIcon = () => {
    if (!mounted) return <div className="h-4 w-4" />

    if (isChanging) {
      return (
        <div className="relative h-4 w-4">
          <Loader2 className="h-4 w-4 animate-spin absolute inset-0" />
        </div>
      )
    }

    const currentTheme = resolvedTheme || 'light'
    const isNewTheme = lastTheme !== currentTheme

    switch (currentTheme) {
      case 'dark':
        return (
          <Sun
            className={`h-4 w-4 transition-all duration-500 ease-out transform ${
              isNewTheme ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
            } hover:rotate-12 hover:scale-110`}
          />
        )
      case 'light':
        return (
          <Moon
            className={`h-4 w-4 transition-all duration-500 ease-out transform ${
              isNewTheme ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
            } hover:-rotate-12 hover:scale-110`}
          />
        )
      default:
        return (
          <Monitor
            className={`h-4 w-4 transition-all duration-500 ease-out transform ${
              isNewTheme ? 'scale-110' : 'scale-100'
            } hover:scale-110`}
          />
        )
    }
  }

  const getThemeLabel = () => {
    if (!mounted) return 'Carregando tema...'
    return getThemeDescription()
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-label="Carregando tema..."
        className={showOnMobile ? "flex" : "hidden sm:flex"}
        disabled
      >
        <div className="h-4 w-4" />
      </Button>
    )
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label={getThemeLabel()}
            aria-pressed={theme !== 'system'}
            className={`${showOnMobile ? "flex" : "hidden sm:flex"} transition-all duration-200 hover:bg-accent`}
          >
            {getThemeIcon()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 backdrop-blur-lg bg-background/95 border-border/50 shadow-2xl">
          <DropdownMenuItem
            onClick={() => handleThemeChange('light')}
            className={`cursor-pointer transition-all duration-300 group
              hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50
              dark:hover:from-yellow-950/50 dark:hover:to-orange-950/50
              ${theme === 'light' && !isAutoMode ? 'bg-yellow-50 dark:bg-yellow-950/30 border-l-2 border-yellow-400' : ''}
              ${isAutoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isAutoMode || isChanging}
          >
            <Sun className={`mr-2 h-4 w-4 transition-all duration-300 group-hover:text-yellow-600 group-hover:rotate-45 group-hover:scale-110
              ${theme === 'light' && !isAutoMode ? 'text-yellow-600' : ''}`} />
            <div className="flex flex-col">
              <span className="font-medium">Modo claro</span>
              {theme === 'light' && !isAutoMode && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 animate-pulse">✨ Ativo</span>
              )}
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange('dark')}
            className={`cursor-pointer transition-all duration-300 group
              hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
              dark:hover:from-blue-950/50 dark:hover:to-purple-950/50
              ${theme === 'dark' && !isAutoMode ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-400' : ''}
              ${isAutoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isAutoMode || isChanging}
          >
            <Moon className={`mr-2 h-4 w-4 transition-all duration-300 group-hover:text-blue-600 group-hover:-rotate-12 group-hover:scale-110
              ${theme === 'dark' && !isAutoMode ? 'text-blue-600' : ''}`} />
            <div className="flex flex-col">
              <span className="font-medium">Modo escuro</span>
              {theme === 'dark' && !isAutoMode && (
                <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">🌙 Ativo</span>
              )}
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange('system')}
            className={`cursor-pointer transition-all duration-300 group
              hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-50
              dark:hover:from-slate-950/50 dark:hover:to-gray-950/50
              ${theme === 'system' && !isAutoMode ? 'bg-slate-50 dark:bg-slate-950/30 border-l-2 border-slate-400' : ''}
              ${isAutoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isAutoMode || isChanging}
          >
            <Monitor className={`mr-2 h-4 w-4 transition-all duration-300 group-hover:text-slate-600 group-hover:scale-110
              ${theme === 'system' && !isAutoMode ? 'text-slate-600' : ''}`} />
            <div className="flex flex-col">
              <span className="font-medium">Sistema</span>
              {theme === 'system' && !isAutoMode && (
                <span className="text-xs text-slate-600 dark:text-slate-400 animate-pulse">
                  💻 Ativo ({resolvedTheme === 'dark' ? 'escuro' : 'claro'})
                </span>
              )}
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            onClick={() => toggleAutoMode(!isAutoMode)}
            className={`cursor-pointer transition-all duration-300 group
              hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50
              dark:hover:from-emerald-950/50 dark:hover:to-green-950/50
              ${isAutoMode ? 'bg-emerald-50 dark:bg-emerald-950/30 border-l-2 border-emerald-400' : ''}`}
            disabled={isChanging}
          >
            <Zap className={`mr-2 h-4 w-4 transition-all duration-300 group-hover:text-emerald-600 group-hover:scale-110
              ${isAutoMode ? 'text-emerald-600 animate-pulse' : ''}`} />
            <div className="flex flex-col">
              <span className="font-medium">Modo automático</span>
              <span className={`text-xs transition-colors duration-300 ${
                isAutoMode
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground'
              }`}>
                {isAutoMode ? '⚡ Ativo (6h-18h claro)' : 'Desativado'}
              </span>
            </div>
          </DropdownMenuItem>
          {(preferences.highContrast || preferences.reducedMotion) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Palette className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-xs">Acessibilidade ativa</span>
                  {preferences.highContrast && (
                    <span className="text-xs text-muted-foreground">Alto contraste</span>
                  )}
                  {preferences.reducedMotion && (
                    <span className="text-xs text-muted-foreground">Sem animações</span>
                  )}
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      aria-label={getThemeLabel()}
      aria-pressed={theme === 'dark'}
      disabled={isChanging || isAutoMode}
      className={`${showOnMobile ? "flex" : "hidden sm:flex"}
        relative overflow-hidden transition-all duration-300 ease-out
        hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50
        dark:hover:from-blue-950/50 dark:hover:to-purple-950/50
        hover:shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/20
        hover:scale-105 active:scale-95 ripple
        ${isChanging ? 'theme-toggle-bounce bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900' : ''}
        ${isAutoMode ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-200 dark:hover:border-blue-700'}
        group transform-gpu`}
    >
      <div className="relative flex items-center justify-center">
        {/* Background glow effect */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
          isChanging ? 'bg-gradient-to-r from-blue-400/30 to-purple-400/30 scale-150 blur-sm' : 'scale-0'
        }`} />

        {/* Icon container */}
        <div className="relative z-10 flex items-center justify-center">
          {getThemeIcon()}
        </div>

        {/* Sparkle effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute top-1 right-1 w-1 h-1 bg-yellow-400 rounded-full theme-sparkle" />
          <div className="absolute bottom-1 left-1 w-0.5 h-0.5 bg-blue-400 rounded-full theme-sparkle animation-delay-150" />
          <div className="absolute top-1 left-1 w-0.5 h-0.5 bg-purple-400 rounded-full theme-sparkle animation-delay-300" />
        </div>
      </div>
    </Button>
  )
}
