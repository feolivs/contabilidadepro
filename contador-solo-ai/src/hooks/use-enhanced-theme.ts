'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

interface ThemePreferences {
  autoMode: boolean
  highContrast: boolean
  reducedMotion: boolean
  lastManualTheme: string
}

export function useEnhancedTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [preferences, setPreferences] = useState<ThemePreferences>({
    autoMode: false,
    highContrast: false,
    reducedMotion: false,
    lastManualTheme: 'system'
  })

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    setMounted(true)

    const savedPreferences: ThemePreferences = {
      autoMode: localStorage.getItem('contador-auto-theme') === 'true',
      highContrast: localStorage.getItem('contador-high-contrast') === 'true',
      reducedMotion: localStorage.getItem('contador-reduced-motion') === 'true',
      lastManualTheme: localStorage.getItem('contador-last-manual-theme') || 'system'
    }

    setPreferences(savedPreferences)

    // Apply saved accessibility preferences
    if (savedPreferences.highContrast) {
      document.documentElement.classList.add('high-contrast')
    }

    if (savedPreferences.reducedMotion) {
      document.documentElement.classList.add('reduce-motion')
    }

    // Apply auto mode if enabled
    if (savedPreferences.autoMode) {
      const hour = new Date().getHours()
      const shouldBeDark = hour < 6 || hour >= 18
      setTheme(shouldBeDark ? 'dark' : 'light')

      // Set up interval to check time changes
      const interval = setInterval(() => {
        const currentHour = new Date().getHours()
        const currentShouldBeDark = currentHour < 6 || currentHour >= 18
        const currentTheme = currentShouldBeDark ? 'dark' : 'light'

        if (theme !== currentTheme) {
          setTheme(currentTheme)
        }
      }, 60000) // Check every minute

      return () => clearInterval(interval)
    }

    // Return undefined for non-auto mode
    return undefined
  }, [setTheme])

  // Save theme changes to localStorage
  const setThemeWithPersistence = (newTheme: string) => {
    setTheme(newTheme)

    if (!preferences.autoMode) {
      localStorage.setItem('contador-last-manual-theme', newTheme)
      setPreferences(prev => ({ ...prev, lastManualTheme: newTheme }))
    }
  }

  // Toggle auto mode
  const toggleAutoMode = (enabled: boolean) => {
    const newPreferences = { ...preferences, autoMode: enabled }
    setPreferences(newPreferences)
    localStorage.setItem('contador-auto-theme', enabled.toString())

    if (enabled) {
      const hour = new Date().getHours()
      const shouldBeDark = hour < 6 || hour >= 18
      setTheme(shouldBeDark ? 'dark' : 'light')
    } else {
      // Restore last manual theme
      setTheme(preferences.lastManualTheme)
    }
  }

  // Toggle high contrast
  const toggleHighContrast = (enabled: boolean) => {
    const newPreferences = { ...preferences, highContrast: enabled }
    setPreferences(newPreferences)
    localStorage.setItem('contador-high-contrast', enabled.toString())
    document.documentElement.classList.toggle('high-contrast', enabled)
  }

  // Toggle reduced motion
  const toggleReducedMotion = (enabled: boolean) => {
    const newPreferences = { ...preferences, reducedMotion: enabled }
    setPreferences(newPreferences)
    localStorage.setItem('contador-reduced-motion', enabled.toString())
    document.documentElement.classList.toggle('reduce-motion', enabled)
  }

  // Reset all preferences
  const resetPreferences = () => {
    const defaultPreferences: ThemePreferences = {
      autoMode: false,
      highContrast: false,
      reducedMotion: false,
      lastManualTheme: 'system'
    }

    setPreferences(defaultPreferences)
    setTheme('system')

    // Clear localStorage
    localStorage.removeItem('contador-auto-theme')
    localStorage.removeItem('contador-high-contrast')
    localStorage.removeItem('contador-reduced-motion')
    localStorage.removeItem('contador-last-manual-theme')

    // Remove CSS classes
    document.documentElement.classList.remove('high-contrast', 'reduce-motion')
  }

  // Get theme description
  const getThemeDescription = () => {
    if (!mounted) return 'Carregando...'

    if (preferences.autoMode) {
      const hour = new Date().getHours()
      const isNightTime = hour < 6 || hour >= 18
      return `Modo automático: ${isNightTime ? 'Escuro' : 'Claro'} (${hour}h)`
    }

    switch (theme) {
      case 'dark':
        return 'Modo escuro para reduzir fadiga visual'
      case 'light':
        return 'Modo claro e brilhante'
      case 'system':
        return `Tema do sistema (${resolvedTheme === 'dark' ? 'escuro' : 'claro'})`
      default:
        return 'Tema personalizado'
    }
  }

  // Get accessibility status
  const getAccessibilityStatus = () => {
    const features = []
    if (preferences.highContrast) features.push('Alto contraste')
    if (preferences.reducedMotion) features.push('Animações reduzidas')

    return features.length > 0
      ? `Acessibilidade: ${features.join(', ')}`
      : 'Configurações padrão de acessibilidade'
  }

  return {
    // Theme state
    theme,
    resolvedTheme,
    systemTheme,
    mounted,

    // Preferences
    preferences,

    // Actions
    setTheme: setThemeWithPersistence,
    toggleAutoMode,
    toggleHighContrast,
    toggleReducedMotion,
    resetPreferences,

    // Computed values
    getThemeDescription,
    getAccessibilityStatus,

    // Utility
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isAutoMode: preferences.autoMode,
    hasAccessibilityFeatures: preferences.highContrast || preferences.reducedMotion
  }
}