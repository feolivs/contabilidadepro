'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

interface OptimizedQueryOptions {
  enabled?: boolean
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean
  staleTime?: number
  cacheTime?: number
  refetchInterval?: number | false
}

// Hook para otimizar queries pesadas
export function useOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: OptimizedQueryOptions = {}
) {
  const isVisible = useDocumentVisibility()
  const hasUserInteracted = useUserInteraction()

  const defaultOptions: OptimizedQueryOptions = {
    enabled: isVisible && hasUserInteracted,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false,
    ...options
  }

  return useQuery({
    queryKey,
    queryFn,
    ...defaultOptions
  })
}

// Hook para detectar se o documento está visível
function useDocumentVisibility() {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return isVisible
}

// Hook para detectar interação do usuário
function useUserInteraction() {
  const [hasInteracted, setHasInteracted] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleUserInteraction = () => {
      setHasInteracted(true)

      // Reset after 5 minutes of inactivity
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        setHasInteracted(false)
      }, 5 * 60 * 1000)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']

    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return hasInteracted
}

// Hook para queries condicionais baseadas na rota
export function useConditionalQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  condition: boolean,
  options: OptimizedQueryOptions = {}
) {
  return useOptimizedQuery(
    queryKey,
    queryFn,
    {
      ...options,
      enabled: condition && (options.enabled !== false)
    }
  )
}

// Hook para debounce de queries
export function useDebouncedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  delay: number = 500,
  options: OptimizedQueryOptions = {}
) {
  const [debouncedKey, setDebouncedKey] = useState(queryKey)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKey(queryKey)
    }, delay)

    return () => clearTimeout(timer)
  }, [queryKey, delay])

  return useOptimizedQuery(debouncedKey, queryFn, options)
}

// Arquivo finalizado