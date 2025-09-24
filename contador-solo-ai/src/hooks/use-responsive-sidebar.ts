'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseResponsiveSidebarReturn {
  isMobile: boolean
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  closeSidebar: () => void
  openSidebar: () => void
}

/**
 * Hook personalizado para gerenciar o estado responsivo da sidebar
 * 
 * Funcionalidades:
 * - Detecta se está em modo mobile baseado no breakpoint
 * - Gerencia o estado de abertura/fechamento da sidebar
 * - Auto-fecha a sidebar mobile quando muda para desktop
 * - Fornece métodos convenientes para controlar a sidebar
 */
export const useResponsiveSidebar = (
  breakpoint: number = 1024 // lg breakpoint do Tailwind
): UseResponsiveSidebarReturn => {
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Função para verificar se está em modo mobile
  const checkDevice = useCallback(() => {
    const isMobileDevice = window.innerWidth < breakpoint
    setIsMobile(isMobileDevice)
    
    // Auto-fecha a sidebar mobile quando muda para desktop
    if (!isMobileDevice && sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [breakpoint, sidebarOpen])

  // Effect para detectar mudanças no tamanho da tela
  useEffect(() => {
    // Verificação inicial
    checkDevice()
    
    // Listener para mudanças no tamanho da tela
    window.addEventListener('resize', checkDevice)
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkDevice)
    }
  }, [checkDevice])

  // Métodos convenientes para controlar a sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const openSidebar = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  return {
    isMobile,
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar,
  }
}

/**
 * Hook para detectar se a sidebar deve ser colapsada automaticamente
 * baseado no tamanho da tela e preferências do usuário
 */
export const useSidebarCollapse = (
  storageKey: string = 'sidebar-collapsed'
) => {
  const [collapsed, setCollapsed] = useState(false)

  // Carregar estado salvo do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved !== null) {
        setCollapsed(JSON.parse(saved))
      }
    } catch (error) {
      console.warn('Erro ao carregar estado da sidebar:', error)
    }
  }, [storageKey])

  // Salvar estado no localStorage quando mudar
  const setCollapsedWithStorage = useCallback((newCollapsed: boolean) => {
    setCollapsed(newCollapsed)
    try {
      localStorage.setItem(storageKey, JSON.stringify(newCollapsed))
    } catch (error) {
      console.warn('Erro ao salvar estado da sidebar:', error)
    }
  }, [storageKey])

  const toggleCollapsed = useCallback(() => {
    setCollapsedWithStorage(!collapsed)
  }, [collapsed, setCollapsedWithStorage])

  return {
    collapsed,
    setCollapsed: setCollapsedWithStorage,
    toggleCollapsed,
  }
}

/**
 * Hook combinado que gerencia tanto responsividade quanto colapso
 */
export const useModernSidebar = (
  breakpoint: number = 1024,
  storageKey: string = 'sidebar-collapsed'
) => {
  const responsive = useResponsiveSidebar(breakpoint)
  const collapse = useSidebarCollapse(storageKey)

  return {
    ...responsive,
    ...collapse,
  }
}
