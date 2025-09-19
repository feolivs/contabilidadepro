import { useState, useEffect } from 'react'

export interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
}

export interface CacheDiagnostics {
  entries: Array<{
    key: string
    size: number
    lastAccessed: Date
    ttl: number
  }>
  performance: {
    averageResponseTime: number
    totalRequests: number
  }
}

export function useNextjsCache() {
  const [stats, setStats] = useState<CacheStats>({
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0
  })

  const [diagnostics, setDiagnostics] = useState<CacheDiagnostics>({
    entries: [],
    performance: {
      averageResponseTime: 0,
      totalRequests: 0
    }
  })

  const clearCache = async () => {
    // Placeholder for cache clearing functionality
    console.log('Cache cleared')
  }

  const refreshStats = () => {
    // Placeholder for stats refresh
    setStats({
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0
    })
  }

  return {
    stats,
    diagnostics,
    clearCache,
    refreshStats,
    isLoading: false,
    error: null
  }
}

// Additional hooks for compatibility
export function useEmpresas() {
  return {
    data: [],
    isLoading: false,
    error: null
  }
}

export function useCalculosStats() {
  return {
    data: {
      total_calculos: 0,
      valor_total_periodo: 0,
      calculos_pendentes: 0
    },
    isLoading: false,
    error: null
  }
}

export function useCacheInvalidation() {
  const invalidateCache = async () => {
    console.log('Cache invalidated')
  }

  const invalidateAll = async () => {
    console.log('All cache invalidated')
  }

  const invalidateEmpresas = async () => {
    console.log('Empresas cache invalidated')
  }

  const invalidateCalculos = async () => {
    console.log('Calculos cache invalidated')
  }

  return {
    invalidateCache,
    invalidateAll,
    invalidateEmpresas,
    invalidateCalculos,
    isLoading: false
  }
}