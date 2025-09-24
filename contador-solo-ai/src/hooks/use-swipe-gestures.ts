'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  preventScroll?: boolean
  enabled?: boolean
}

interface TouchPosition {
  x: number
  y: number
  time: number
}

export const useSwipeGestures = (options: SwipeGestureOptions) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false,
    enabled = true
  } = options

  const touchStart = useRef<TouchPosition | null>(null)
  const touchEnd = useRef<TouchPosition | null>(null)
  const elementRef = useRef<HTMLElement | null>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return

    const touch = e.touches[0]
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
    touchEnd.current = null

    if (preventScroll) {
      e.preventDefault()
    }
  }, [enabled, preventScroll])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStart.current) return

    const touch = e.touches[0]
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    // Prevenir scroll durante o swipe se necessário
    if (preventScroll) {
      const deltaX = Math.abs(touch.clientX - touchStart.current.x)
      const deltaY = Math.abs(touch.clientY - touchStart.current.y)
      
      // Se o movimento horizontal é maior que vertical, prevenir scroll
      if (deltaX > deltaY) {
        e.preventDefault()
      }
    }
  }, [enabled, preventScroll])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || !touchStart.current || !touchEnd.current) return

    const deltaX = touchEnd.current.x - touchStart.current.x
    const deltaY = touchEnd.current.y - touchStart.current.y
    const deltaTime = touchEnd.current.time - touchStart.current.time

    // Verificar se o movimento foi rápido o suficiente (menos de 300ms)
    if (deltaTime > 300) return

    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Determinar direção do swipe
    if (absDeltaX > absDeltaY) {
      // Swipe horizontal
      if (absDeltaX > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      }
    } else {
      // Swipe vertical
      if (absDeltaY > threshold) {
        if (deltaY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }
    }

    // Reset
    touchStart.current = null
    touchEnd.current = null
  }, [enabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return

    // Adicionar event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventScroll })
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled, preventScroll])

  return elementRef
}

// Hook específico para sidebar mobile
export const useSidebarSwipe = (onClose: () => void, enabled = true) => {
  return useSwipeGestures({
    onSwipeLeft: onClose,
    threshold: 100, // Threshold maior para sidebar
    preventScroll: true,
    enabled
  })
}

// Hook para detectar se é dispositivo touch
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      )
    }

    checkTouch()
    
    // Verificar novamente após um delay para garantir
    const timeout = setTimeout(checkTouch, 100)
    
    return () => clearTimeout(timeout)
  }, [])

  return isTouch
}

// Hook para detectar orientação do dispositivo
export const useDeviceOrientation = () => {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
    }

    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)

    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return orientation
}

// Hook combinado para responsividade mobile
export const useMobileResponsive = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const isTouch = useIsTouchDevice()
  const orientation = useDeviceOrientation()

  useEffect(() => {
    const updateBreakpoints = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }

    updateBreakpoints()
    window.addEventListener('resize', updateBreakpoints)

    return () => window.removeEventListener('resize', updateBreakpoints)
  }, [])

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    isTouch,
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape'
  }
}

export default useSwipeGestures
