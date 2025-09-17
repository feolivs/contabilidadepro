'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'

export interface CacheEntry<T = any> {
  key: string
  data: T
  timestamp: number
  ttl: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
  hitCount: number
  lastAccessed: number
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  invalidations: number
  memoryUsage: string
}

class IntelligentCache {
  private cache = new Map<string, CacheEntry>()
  private maxEntries = 1000
  private hitCount = 0
  private missCount = 0
  private invalidationCount = 0

  // TTL padrão baseado na prioridade (em ms)
  private defaultTTL = {
    low: 5 * 60 * 1000,      // 5 minutos
    medium: 10 * 60 * 1000,  // 10 minutos
    high: 30 * 60 * 1000,    // 30 minutos
    critical: 60 * 60 * 1000 // 1 hora
  }

  set<T>(
    key: string,
    data: T,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical'
      ttl?: number
      tags?: string[]
    } = {}
  ): void {
    const {
      priority = 'medium',
      ttl = this.defaultTTL[priority],
      tags = []
    } = options

    // Verificar se precisa fazer limpeza
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      priority,
      tags: [...tags, `user:${key.split(':')[0]}`, 'auto'],
      hitCount: 0,
      lastAccessed: Date.now()
    }

    this.cache.set(key, entry)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      this.missCount++
      return null
    }

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.missCount++
      return null
    }

    // Atualizar estatísticas de acesso
    entry.hitCount++
    entry.lastAccessed = Date.now()
    this.hitCount++

    return entry.data
  }

  invalidateByTag(tag: string): number {
    let invalidated = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    this.invalidationCount += invalidated
    return invalidated
  }

  invalidateByPattern(pattern: string): number {
    let invalidated = 0
    const regex = new RegExp(pattern)

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    this.invalidationCount += invalidated
    return invalidated
  }

  // Algoritmo LRU para remoção
  private evictLRU(): void {
    let oldestEntry: [string, CacheEntry] | null = null
    let oldestTime = Date.now()

    // Priorizar remoção por prioridade baixa e último acesso
    for (const [key, entry] of this.cache.entries()) {
      const score = this.getEvictionScore(entry)
      if (score > oldestTime) {
        oldestTime = score
        oldestEntry = [key, entry]
      }
    }

    if (oldestEntry) {
      this.cache.delete(oldestEntry[0])
    }
  }

  private getEvictionScore(entry: CacheEntry): number {
    const now = Date.now()
    const age = now - entry.timestamp
    const timeSinceAccess = now - entry.lastAccessed

    // Pontuação baseada em prioridade, idade e uso
    const priorityWeight = {
      low: 4,
      medium: 3,
      high: 2,
      critical: 1
    }

    return (
      age * priorityWeight[entry.priority] +
      timeSinceAccess * 2 -
      entry.hitCount * 1000
    )
  }

  clear(): void {
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0
    this.invalidationCount = 0
  }

  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount
    const sizeInBytes = JSON.stringify([...this.cache.values()]).length

    return {
      totalEntries: this.cache.size,
      totalSize: sizeInBytes,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.missCount / totalRequests) * 100 : 0,
      invalidations: this.invalidationCount,
      memoryUsage: this.formatBytes(sizeInBytes)
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Pré-carregar dados com base em padrões de uso
  async predictivePreload(patterns: string[], fetcher: (key: string) => Promise<any>): Promise<void> {
    const promises = patterns.map(async (pattern) => {
      try {
        const data = await fetcher(pattern)
        this.set(pattern, data, { priority: 'medium', tags: ['predictive'] })
      } catch (error) {
        console.warn(`Falha no preload para ${pattern}:`, error)
      }
    })

    await Promise.allSettled(promises)
  }
}

export function useIntelligentCache() {
  const [cache] = useState(() => new IntelligentCache())
  const [stats, setStats] = useState<CacheStats>({
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    invalidations: 0,
    memoryUsage: '0 Bytes'
  })

  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()

  const updateStats = useCallback(() => {
    setStats(cache.getStats())
  }, [cache])

  // Wrapper para operações do cache com logging
  const set = useCallback(<T>(
    key: string,
    data: T,
    options?: Parameters<typeof cache.set>[2]
  ) => {
    const userKey = user ? `${user.id}:${key}` : key
    cache.set(userKey, data, options)
    updateStats()
  }, [cache, user, updateStats])

  const get = useCallback(<T>(key: string): T | null => {
    const userKey = user ? `${user.id}:${key}` : key
    const result = cache.get<T>(userKey)
    updateStats()
    return result
  }, [cache, user, updateStats])

  const invalidateByTag = useCallback((tag: string) => {
    const count = cache.invalidateByTag(tag)
    updateStats()
    return count
  }, [cache, updateStats])

  const invalidateByPattern = useCallback((pattern: string) => {
    const count = cache.invalidateByPattern(pattern)
    updateStats()
    return count
  }, [cache, updateStats])

  const clear = useCallback(() => {
    cache.clear()
    updateStats()
  }, [cache, updateStats])

  // Cache inteligente para consultas do Supabase
  const cachedQuery = useCallback(async <T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical'
      ttl?: number
      tags?: string[]
      forceRefresh?: boolean
    } = {}
  ): Promise<T> => {
    const { forceRefresh = false, ...cacheOptions } = options

    if (!forceRefresh) {
      const cached = get<T>(queryKey)
      if (cached !== null) {
        return cached
      }
    }

    try {
      const data = await queryFn()
      set(queryKey, data, cacheOptions)
      return data
    } catch (error) {
      console.error(`Erro na query ${queryKey}:`, error)
      throw error
    }
  }, [get, set])

  // Preload inteligente baseado em padrões
  const predictivePreload = useCallback(async () => {
    if (!user) return

    const commonPatterns = [
      'stats:dashboard',
      'documents:recent',
      'calculations:pending',
      'deadlines:upcoming'
    ]

    await cache.predictivePreload(
      commonPatterns.map(p => `${user.id}:${p}`),
      async (key) => {
        const [, , type] = key.split(':')

        switch (type) {
          case 'dashboard':
            const { data: statsData } = await supabase
              .from('calculos')
              .select('id, status, created_at')
              .eq('user_id', user.id)
              .limit(100)
            return statsData

          case 'recent':
            const { data: docsData } = await supabase
              .from('documentos')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(20)
            return docsData

          case 'pending':
            const { data: calcData } = await supabase
              .from('calculos')
              .select('*')
              .eq('user_id', user.id)
              .eq('status', 'pendente')
              .limit(50)
            return calcData

          case 'upcoming':
            const { data: deadlineData } = await supabase
              .from('prazos_fiscais')
              .select('*')
              .eq('user_id', user.id)
              .gte('data_vencimento', new Date().toISOString())
              .limit(30)
            return deadlineData

          default:
            return null
        }
      }
    )
  }, [cache, user, supabase])

  // Invalidação automática baseada em mudanças
  useEffect(() => {
    if (!user) return

    const subscriptions = [
      // Invalidar cache de cálculos quando houver mudanças
      supabase
        .channel('cache_invalidation_calculos')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calculos',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('🗄️ Invalidando cache de cálculos')
            invalidateByTag('calculos')
            invalidateByPattern(`${user.id}:stats:.*`)
          }
        )
        .subscribe(),

      // Invalidar cache de documentos
      supabase
        .channel('cache_invalidation_documentos')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documentos',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('🗄️ Invalidando cache de documentos')
            invalidateByTag('documentos')
            invalidateByPattern(`${user.id}:documents:.*`)
          }
        )
        .subscribe(),

      // Invalidar cache de prazos
      supabase
        .channel('cache_invalidation_prazos')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prazos_fiscais',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('🗄️ Invalidando cache de prazos')
            invalidateByTag('prazos')
            invalidateByPattern(`${user.id}:deadlines:.*`)
          }
        )
        .subscribe()
    ]

    // Preload inicial
    predictivePreload()

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }, [user, supabase, invalidateByTag, invalidateByPattern, predictivePreload])

  // Atualizar stats periodicamente
  useEffect(() => {
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [updateStats])

  // Limpeza periódica de cache expirado
  useEffect(() => {
    const cleanup = setInterval(() => {
      const before = stats.totalEntries
      // A limpeza automática já é feita pelo get()
      const after = cache.getStats().totalEntries
      if (before !== after) {
        console.log(`🧹 Cache limpo: ${before - after} entradas removidas`)
        updateStats()
      }
    }, 60000) // A cada minuto

    return () => clearInterval(cleanup)
  }, [cache, stats.totalEntries, updateStats])

  return {
    set,
    get,
    invalidateByTag,
    invalidateByPattern,
    clear,
    cachedQuery,
    predictivePreload,
    stats
  }
}