/**
 * UnifiedCacheService - ContabilidadePRO
 * Sistema de cache unificado com 3 camadas: Browser, Memory, Database
 * Substitui os 9 sistemas de cache existentes por uma arquitetura consolidada
 */

import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/simple-logger'

// Tipos e interfaces
export interface CacheConfig {
  browser?: boolean    // localStorage
  memory?: boolean     // In-memory LRU
  database?: boolean   // Supabase para persistência
}

export interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
  tags?: string[]
  hitCount?: number
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  memoryUsage: number
  itemCount: number
}

export interface CacheOptions {
  ttl?: number           // Time to live em ms
  tags?: string[]        // Tags para invalidação
  priority?: 'low' | 'normal' | 'high'
  compress?: boolean     // Comprimir dados grandes
}

// Implementação LRU para camada de memória
class LRUCache<T> {
  private cache = new Map<string, CacheItem<T>>()
  private maxSize: number
  private stats = { hits: 0, misses: 0 }

  constructor(maxSize = 1000) {
    this.maxSize = maxSize
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }

    // Verificar expiração
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Mover para o final (mais recente)
    this.cache.delete(key)
    this.cache.set(key, { ...item, hitCount: (item.hitCount || 0) + 1 })
    this.stats.hits++
    
    return item.data
  }

  set(key: string, data: T, ttl: number, tags?: string[]): void {
    // Remover item mais antigo se necessário
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      tags,
      hitCount: 0
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  invalidateByTag(tag: string): number {
    let invalidated = 0
    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag)) {
        this.cache.delete(key)
        invalidated++
      }
    }
    return invalidated
  }

  clear(): void {
    this.cache.clear()
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      memoryUsage: this.cache.size,
      itemCount: this.cache.size
    }
  }
}

// Serviço de cache unificado
export class UnifiedCacheService {
  private memoryCache = new LRUCache(1000)
  private supabase = createClient()
  private defaultTTL = 5 * 60 * 1000 // 5 minutos

  /**
   * Buscar item do cache (verifica todas as camadas)
   */
  async get<T>(
    key: string, 
    config: CacheConfig = { memory: true, browser: true, database: false }
  ): Promise<T | null> {
    try {
      // 1. Tentar memória primeiro (mais rápido)
      if (config.memory) {
        const memoryResult = this.memoryCache.get<T>(key)
        if (memoryResult !== null) {
          logger.debug(`Cache HIT (memory): ${key}`)
          return memoryResult
        }
      }

      // 2. Tentar browser cache
      if (config.browser && typeof window !== 'undefined') {
        const browserResult = this.getBrowserCache<T>(key)
        if (browserResult !== null) {
          // Promover para memória
          if (config.memory) {
            this.memoryCache.set(key, browserResult, this.defaultTTL)
          }
          logger.debug(`Cache HIT (browser): ${key}`)
          return browserResult
        }
      }

      // 3. Tentar database (mais lento)
      if (config.database) {
        const dbResult = await this.getDatabaseCache<T>(key)
        if (dbResult !== null) {
          // Promover para camadas superiores
          if (config.memory) {
            this.memoryCache.set(key, dbResult, this.defaultTTL)
          }
          if (config.browser && typeof window !== 'undefined') {
            this.setBrowserCache(key, dbResult, this.defaultTTL)
          }
          logger.debug(`Cache HIT (database): ${key}`)
          return dbResult
        }
      }

      logger.debug(`Cache MISS: ${key}`)
      return null
    } catch (error) {
      logger.error('Cache get error:', { key, error })
      return null
    }
  }

  /**
   * Armazenar item no cache (em todas as camadas configuradas)
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {},
    config: CacheConfig = { memory: true, browser: true, database: false }
  ): Promise<void> {
    const { ttl = this.defaultTTL, tags, priority = 'normal' } = options

    try {
      // Armazenar em memória
      if (config.memory) {
        this.memoryCache.set(key, data, ttl, tags)
      }

      // Armazenar no browser
      if (config.browser && typeof window !== 'undefined') {
        this.setBrowserCache(key, data, ttl)
      }

      // Armazenar no database (apenas para dados importantes)
      if (config.database) {
        await this.setDatabaseCache(key, data, ttl, tags)
      }

      logger.debug(`Cache SET: ${key}`, { ttl, tags, config })
    } catch (error) {
      logger.error('Cache set error:', { key, error })
    }
  }

  /**
   * Invalidar cache por chave
   */
  async invalidate(
    key: string,
    config: CacheConfig = { memory: true, browser: true, database: true }
  ): Promise<void> {
    try {
      if (config.memory) {
        this.memoryCache.delete(key)
      }

      if (config.browser && typeof window !== 'undefined') {
        localStorage.removeItem(`cache:${key}`)
      }

      if (config.database) {
        await this.supabase
          .from('unified_cache')
          .delete()
          .eq('key', key)
      }

      logger.debug(`Cache INVALIDATE: ${key}`)
    } catch (error) {
      logger.error('Cache invalidate error:', { key, error })
    }
  }

  /**
   * Invalidar cache por tags
   */
  async invalidateByTag(
    tag: string,
    config: CacheConfig = { memory: true, browser: false, database: true }
  ): Promise<number> {
    let invalidated = 0

    try {
      if (config.memory) {
        invalidated += this.memoryCache.invalidateByTag(tag)
      }

      if (config.database) {
        const { count } = await this.supabase
          .from('unified_cache')
          .delete()
          .contains('tags', [tag])
          .select('*', { count: 'exact', head: true })
        
        invalidated += count || 0
      }

      logger.debug(`Cache INVALIDATE BY TAG: ${tag}`, { invalidated })
      return invalidated
    } catch (error) {
      logger.error('Cache invalidate by tag error:', { tag, error })
      return invalidated
    }
  }

  /**
   * Limpar todo o cache
   */
  async clear(config: CacheConfig = { memory: true, browser: true, database: false }): Promise<void> {
    try {
      if (config.memory) {
        this.memoryCache.clear()
      }

      if (config.browser && typeof window !== 'undefined') {
        // Remover apenas chaves de cache
        const keys = Object.keys(localStorage).filter(key => key.startsWith('cache:'))
        keys.forEach(key => localStorage.removeItem(key))
      }

      if (config.database) {
        await this.supabase
          .from('unified_cache')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
      }

      logger.info('Cache cleared', { config })
    } catch (error) {
      logger.error('Cache clear error:', error)
    }
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): CacheStats {
    return this.memoryCache.getStats()
  }

  // Métodos privados para cada camada
  private getBrowserCache<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`cache:${key}`)
      if (!stored) return null

      const item = JSON.parse(stored)
      
      if (Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(`cache:${key}`)
        return null
      }

      return item.data as T
    } catch {
      return null
    }
  }

  private setBrowserCache<T>(key: string, data: T, ttl: number): void {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl
      }
      localStorage.setItem(`cache:${key}`, JSON.stringify(item))
    } catch {
      // Ignorar erros de quota exceeded
    }
  }

  private async getDatabaseCache<T>(key: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('value, expires_at')
        .eq('key', key)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) return null

      return JSON.parse(data.value) as T
    } catch {
      return null
    }
  }

  private async setDatabaseCache<T>(key: string, data: T, ttl: number, tags?: string[]): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl).toISOString()
      
      await this.supabase
        .from('unified_cache')
        .upsert({
          key,
          value: JSON.stringify(data),
          expires_at: expiresAt,
          tags: tags || [],
          created_at: new Date().toISOString()
        })
    } catch (error) {
      logger.warn('Database cache set failed:', error)
    }
  }
}

// Instância singleton
export const unifiedCache = new UnifiedCacheService()

// Utilitários específicos para domínios
export const fiscalCache = {
  getDAS: (empresaId: string, competencia: string) =>
    unifiedCache.get(`das:${empresaId}:${competencia}`, { memory: true, browser: true }),
  
  setDAS: (empresaId: string, competencia: string, data: any) =>
    unifiedCache.set(
      `das:${empresaId}:${competencia}`, 
      data, 
      { ttl: 24 * 60 * 60 * 1000, tags: ['das', `empresa:${empresaId}`] },
      { memory: true, browser: true, database: true }
    ),

  getEmpresa: (empresaId: string) =>
    unifiedCache.get(`empresa:${empresaId}`, { memory: true, browser: true }),
  
  setEmpresa: (empresaId: string, data: any) =>
    unifiedCache.set(
      `empresa:${empresaId}`, 
      data, 
      { ttl: 60 * 60 * 1000, tags: ['empresas'] },
      { memory: true, browser: true }
    )
}

export const aiCache = {
  getResponse: (pergunta: string, userId: string, context?: string) => {
    const key = `ai:${userId}:${Buffer.from(pergunta).toString('base64')}${context ? `:${context}` : ''}`
    return unifiedCache.get(key, { memory: true, database: true })
  },
  
  setResponse: (pergunta: string, userId: string, resposta: any, context?: string) => {
    const key = `ai:${userId}:${Buffer.from(pergunta).toString('base64')}${context ? `:${context}` : ''}`
    return unifiedCache.set(
      key, 
      resposta, 
      { ttl: 24 * 60 * 60 * 1000, tags: ['ai', `user:${userId}`] },
      { memory: true, database: true }
    )
  }
}

export const ocrCache = {
  getResult: (filePath: string) =>
    unifiedCache.get(`ocr:${filePath}`, { memory: true, database: true }),
  
  setResult: (filePath: string, result: any) =>
    unifiedCache.set(
      `ocr:${filePath}`, 
      result, 
      { ttl: 7 * 24 * 60 * 60 * 1000, tags: ['ocr'] },
      { memory: true, database: true }
    )
}
