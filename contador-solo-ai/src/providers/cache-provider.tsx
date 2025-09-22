'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { cacheManager, CacheStats } from '@/lib/cache/cache-manager'
import { logger } from '@/lib/simple-logger'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface CacheContextValue {
  stats: CacheStats | null
  isInitialized: boolean
  clearCache: () => void
  invalidateByTags: (tags: string[]) => void
  cleanup: () => void
  refreshStats: () => void
}

export interface CacheProviderProps {
  children: ReactNode
  autoCleanup?: boolean
  cleanupInterval?: number
  statsRefreshInterval?: number
}

// ============================================
// CONTEXTO
// ============================================

const CacheContext = createContext<CacheContextValue | null>(null)

// ============================================
// PROVIDER
// ============================================

/**
 * Provider para o sistema de cache
 */
export function CacheProvider({ 
  children, 
  autoCleanup = true,
  cleanupInterval = 5 * 60 * 1000, // 5 minutos
  statsRefreshInterval = 30 * 1000 // 30 segundos
}: CacheProviderProps) {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Atualizar estatísticas
  const refreshStats = () => {
    try {
      const newStats = cacheManager.getStats()
      setStats(newStats)
    } catch (error) {
      logger.error('Erro ao obter estatísticas do cache', { error })
    }
  }

  // Limpar todo o cache
  const clearCache = () => {
    try {
      cacheManager.clear()
      refreshStats()
      logger.info('Cache limpo pelo usuário')
    } catch (error) {
      logger.error('Erro ao limpar cache', { error })
    }
  }

  // Invalidar por tags
  const invalidateByTags = (tags: string[]) => {
    try {
      cacheManager.invalidateByTags(tags)
      refreshStats()
      logger.info('Cache invalidado por tags', { tags })
    } catch (error) {
      logger.error('Erro ao invalidar cache por tags', { error, tags })
    }
  }

  // Limpeza automática
  const cleanup = () => {
    try {
      cacheManager.cleanup()
      refreshStats()
      logger.debug('Limpeza automática do cache executada')
    } catch (error) {
      logger.error('Erro na limpeza automática do cache', { error })
    }
  }

  // Inicialização
  useEffect(() => {
    logger.info('Inicializando CacheProvider')
    
    // Primeira atualização das estatísticas
    refreshStats()
    setIsInitialized(true)

    // Configurar intervalos
    const intervals: NodeJS.Timeout[] = []

    // Auto cleanup
    if (autoCleanup) {
      const cleanupIntervalId = setInterval(cleanup, cleanupInterval)
      intervals.push(cleanupIntervalId)
      logger.debug('Auto cleanup configurado', { interval: cleanupInterval })
    }

    // Stats refresh
    const statsIntervalId = setInterval(refreshStats, statsRefreshInterval)
    intervals.push(statsIntervalId)
    logger.debug('Stats refresh configurado', { interval: statsRefreshInterval })

    // Cleanup ao desmontar
    return () => {
      intervals.forEach(clearInterval)
      logger.info('CacheProvider desmontado')
    }
  }, [autoCleanup, cleanupInterval, statsRefreshInterval])

  // Monitorar mudanças de visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Página ficou visível - atualizar stats
        refreshStats()
        logger.debug('Página visível - stats atualizadas')
      } else {
        // Página ficou oculta - fazer limpeza se necessário
        if (autoCleanup) {
          cleanup()
          logger.debug('Página oculta - limpeza executada')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [autoCleanup])

  // Monitorar eventos de storage (para sincronizar entre abas)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith('contabilidade-pro-cache')) {
        // Cache foi modificado em outra aba
        refreshStats()
        logger.debug('Cache modificado em outra aba - stats atualizadas')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Monitorar uso de memória (se disponível)
  useEffect(() => {
    if ('memory' in performance) {
      const checkMemoryUsage = () => {
        const memory = (performance as any).memory
        if (memory) {
          const usedMB = memory.usedJSHeapSize / 1024 / 1024
          const limitMB = memory.jsHeapSizeLimit / 1024 / 1024
          const usagePercentage = (usedMB / limitMB) * 100

          // Se uso de memória estiver alto, fazer limpeza agressiva
          if (usagePercentage > 80) {
            logger.warn('Alto uso de memória detectado', { 
              usedMB: usedMB.toFixed(1), 
              limitMB: limitMB.toFixed(1),
              usagePercentage: usagePercentage.toFixed(1)
            })
            cleanup()
          }
        }
      }

      const memoryCheckInterval = setInterval(checkMemoryUsage, 60000) // 1 minuto
      return () => clearInterval(memoryCheckInterval)
    }
  }, [])

  // Context value
  const contextValue: CacheContextValue = {
    stats,
    isInitialized,
    clearCache,
    invalidateByTags,
    cleanup,
    refreshStats
  }

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  )
}

// ============================================
// HOOK
// ============================================

/**
 * Hook para usar o contexto do cache
 */
export function useCache(): CacheContextValue {
  const context = useContext(CacheContext)
  
  if (!context) {
    throw new Error('useCache deve ser usado dentro de um CacheProvider')
  }
  
  return context
}

// ============================================
// HOOKS ESPECIALIZADOS
// ============================================

/**
 * Hook para monitorar performance do cache
 */
export function useCachePerformance() {
  const { stats } = useCache()
  
  const performance = {
    hitRate: stats?.hitRate || 0,
    missRate: stats?.missRate || 0,
    efficiency: stats ? (stats.hitRate > 80 ? 'excellent' : 
                        stats.hitRate > 60 ? 'good' : 
                        stats.hitRate > 40 ? 'fair' : 'poor') : 'unknown',
    totalEntries: stats?.totalEntries || 0,
    totalSize: stats?.totalSize || 0,
    evictions: stats?.evictions || 0
  }
  
  return performance
}

/**
 * Hook para alertas do cache
 */
export function useCacheAlerts() {
  const { stats } = useCache()
  
  const alerts = []
  
  if (stats) {
    // Hit rate baixo
    if (stats.hitRate < 50) {
      alerts.push({
        type: 'warning' as const,
        message: 'Hit rate do cache está baixo',
        suggestion: 'Considere ajustar as estratégias de TTL'
      })
    }
    
    // Muitas evictions
    if (stats.evictions > 100) {
      alerts.push({
        type: 'warning' as const,
        message: 'Muitas evictions detectadas',
        suggestion: 'Considere aumentar o limite de memória do cache'
      })
    }
    
    // Cache quase cheio
    const sizePercentage = (stats.totalSize / (50 * 1024)) * 100
    if (sizePercentage > 80) {
      alerts.push({
        type: 'error' as const,
        message: 'Cache próximo do limite de tamanho',
        suggestion: 'Execute uma limpeza ou aumente o limite'
      })
    }
    
    // Muitas entradas
    const entriesPercentage = (stats.totalEntries / 1000) * 100
    if (entriesPercentage > 80) {
      alerts.push({
        type: 'warning' as const,
        message: 'Muitas entradas no cache',
        suggestion: 'Execute uma limpeza ou aumente o limite de entradas'
      })
    }
    
    // Performance excelente
    if (stats.hitRate > 80 && stats.evictions < 10) {
      alerts.push({
        type: 'success' as const,
        message: 'Cache funcionando perfeitamente',
        suggestion: 'Mantenha as configurações atuais'
      })
    }
  }
  
  return alerts
}

/**
 * Hook para invalidação inteligente
 */
export function useSmartInvalidation() {
  const { invalidateByTags } = useCache()
  
  const invalidateEmpresaData = (empresaId: string) => {
    invalidateByTags(['empresa', 'financeiro', 'compliance'])
    logger.info('Dados da empresa invalidados', { empresaId })
  }
  
  const invalidateFinancialData = () => {
    invalidateByTags(['financeiro', 'metricas'])
    logger.info('Dados financeiros invalidados')
  }
  
  const invalidateComplianceData = () => {
    invalidateByTags(['compliance', 'analise'])
    logger.info('Dados de compliance invalidados')
  }
  
  const invalidateAIData = () => {
    invalidateByTags(['ia', 'insights'])
    logger.info('Dados de IA invalidados')
  }
  
  const invalidateDocumentData = () => {
    invalidateByTags(['documentos', 'estruturados', 'recentes'])
    logger.info('Dados de documentos invalidados')
  }
  
  return {
    invalidateEmpresaData,
    invalidateFinancialData,
    invalidateComplianceData,
    invalidateAIData,
    invalidateDocumentData
  }
}
