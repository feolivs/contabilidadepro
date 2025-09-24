'use client'

import React, { useState, useEffect } from 'react'
import { CleanSidebar } from './clean-sidebar'
import { Header } from './header'
import { cn } from '@/lib/utils'
import { useSidebarSwipe, useMobileResponsive } from '@/hooks/use-swipe-gestures'

interface CleanLayoutProps {
  children: React.ReactNode
  className?: string
}

export function CleanLayout({ children, className }: CleanLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Use hook responsivo mais avançado
  const { isMobile, isTablet, isTouch, orientation } = useMobileResponsive()

  // Hook para gestos de swipe na sidebar mobile
  const sidebarSwipeRef = useSidebarSwipe(
    () => setSidebarOpen(false),
    isMobile && sidebarOpen
  )

  // Auto-fechar sidebar mobile quando muda para desktop
  useEffect(() => {
    if (!isMobile && sidebarOpen) {
      setSidebarOpen(false)
    }
    if (isMobile && sidebarCollapsed) {
      setSidebarCollapsed(false)
    }
  }, [isMobile, sidebarOpen, sidebarCollapsed])

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  const closeMobileSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:border-r",
        sidebarCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <CleanSidebar 
          collapsed={sidebarCollapsed} 
          onToggle={toggleSidebar}
        />
      </aside>

      {/* Mobile Sidebar */}
      {isMobile && (
        <>
          {/* Overlay com suporte a gestos */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
              onClick={closeMobileSidebar}
              style={{
                background: `rgba(0, 0, 0, ${sidebarOpen ? '0.5' : '0'})`,
                transition: 'background-color 300ms ease-in-out'
              }}
            />
          )}

          {/* Mobile Sidebar com swipe gestures */}
          <aside
            ref={sidebarSwipeRef}
            className={cn(
              "fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:hidden",
              "shadow-2xl border-r border-border",
              // Responsivo baseado na orientação
              orientation === 'portrait' ? "w-80" : "w-72",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
              // Melhor performance em dispositivos touch
              isTouch && "will-change-transform"
            )}
            style={{
              // Otimização para dispositivos touch
              touchAction: 'pan-y',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="relative h-full">
              {/* Indicador visual de swipe */}
              <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                <div className="w-1 h-12 bg-primary/20 rounded-full" />
              </div>

              <CleanSidebar onToggle={toggleSidebar} />
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className={cn(
        "flex flex-1 flex-col overflow-hidden",
        !isMobile && (sidebarCollapsed ? "lg:ml-16" : "lg:ml-64")
      )}>
        {/* Header Unificado - Variante Minimal */}
        <Header
          onMenuClick={toggleSidebar}
          variant="minimal"
          showBreadcrumbs={false}
          showSearch={true}
          showNotifications={true}
        />

        {/* Page Content com responsividade melhorada */}
        <main className="flex-1 overflow-auto">
          <div className={cn(
            "container mx-auto max-w-7xl",
            // Padding responsivo baseado no dispositivo
            isMobile ? "p-4" : isTablet ? "p-5" : "p-6",
            // Ajustes para orientação mobile
            isMobile && orientation === 'landscape' && "py-2",
            className
          )}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default CleanLayout
