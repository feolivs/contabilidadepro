/**
 * 🧠 INTELLIGENT CACHE SERVICE
 * Sistema de cache inteligente para Edge Functions com TTL dinâmico
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CacheEntry {
  key: string
  value: any
  created_at: string
  expires_at: string
  hit_count: number
  query_type: string
  user_id: string
}

interface CacheConfig {
  defaultTTL: number // segundos
  maxTTL: number
  minTTL: number
  hitCountBonus: number // segundos extras por hit
}

export class IntelligentCache {
  private supabase: any
  private config: CacheConfig

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.config = {
      defaultTTL: 3600, // 1 hora
      maxTTL: 86400, // 24 horas
      minTTL: 300, // 5 minutos
      hitCountBonus: 1800 // 30 minutos extras por hit
    }
  }

  /**
   * Gera chave de cache baseada na pergunta e contexto
   */
  private generateCacheKey(pergunta: string, userId: string, context?: string): string {
    const normalizedQuery = pergunta.toLowerCase().trim()
    const contextStr = context || 'default'
    
    // Criar hash simples (para Edge Functions sem crypto)
    const combined = `${normalizedQuery}:${userId}:${contextStr}`
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `ai_cache_${Math.abs(hash)}`
  }

  /**
   * Determina TTL inteligente baseado no tipo de consulta
   */
  private calculateIntelligentTTL(pergunta: string, hitCount: number = 0): number {
    let baseTTL = this.config.defaultTTL

    // TTL baseado no tipo de consulta
    const queryLower = pergunta.toLowerCase()
    
    if (queryLower.includes('das') || queryLower.includes('calculo')) {
      baseTTL = 7200 // 2 horas - cálculos mudam menos
    } else if (queryLower.includes('prazo') || queryLower.includes('vencimento')) {
      baseTTL = 1800 // 30 minutos - prazos são mais dinâmicos
    } else if (queryLower.includes('lei') || queryLower.includes('regulamento')) {
      baseTTL = 43200 // 12 horas - legislação muda raramente
    } else if (queryLower.includes('como') || queryLower.includes('o que')) {
      baseTTL = 14400 // 4 horas - perguntas conceituais
    }

    // Bonus por popularidade (mais hits = mais tempo de cache)
    const popularityBonus = Math.min(hitCount * this.config.hitCountBonus, this.config.maxTTL - baseTTL)
    const finalTTL = Math.min(baseTTL + popularityBonus, this.config.maxTTL)
    
    return Math.max(finalTTL, this.config.minTTL)
  }

  /**
   * Busca resposta no cache
   */
  async get(pergunta: string, userId: string, context?: string): Promise<any | null> {
    try {
      const cacheKey = this.generateCacheKey(pergunta, userId, context)
      
      const { data, error } = await this.supabase
        .from('ai_cache')
        .select('*')
        .eq('key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        return null
      }

      // Incrementar hit count
      await this.incrementHitCount(cacheKey)

      console.log(`🎯 Cache HIT: ${cacheKey}`)
      return JSON.parse(data.value)
    } catch (error) {
      console.warn('Cache get error:', error)
      return null
    }
  }

  /**
   * Armazena resposta no cache
   */
  async set(pergunta: string, userId: string, response: any, context?: string): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(pergunta, userId, context)
      const ttl = this.calculateIntelligentTTL(pergunta)
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
      
      const queryType = this.classifyQuery(pergunta)

      const cacheEntry: Partial<CacheEntry> = {
        key: cacheKey,
        value: JSON.stringify(response),
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        hit_count: 0,
        query_type: queryType,
        user_id: userId
      }

      await this.supabase
        .from('ai_cache')
        .upsert(cacheEntry)

      console.log(`💾 Cache SET: ${cacheKey} (TTL: ${ttl}s, Type: ${queryType})`)
    } catch (error) {
      console.warn('Cache set error:', error)
    }
  }

  /**
   * Incrementa contador de hits
   */
  private async incrementHitCount(cacheKey: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_cache_hits', { cache_key: cacheKey })
    } catch (error) {
      console.warn('Hit count increment error:', error)
    }
  }

  /**
   * Classifica tipo de consulta para métricas
   */
  private classifyQuery(pergunta: string): string {
    const queryLower = pergunta.toLowerCase()
    
    if (queryLower.includes('das') || queryLower.includes('calculo')) return 'calculation'
    if (queryLower.includes('prazo') || queryLower.includes('vencimento')) return 'deadline'
    if (queryLower.includes('lei') || queryLower.includes('regulamento')) return 'regulation'
    if (queryLower.includes('como') || queryLower.includes('o que')) return 'conceptual'
    if (queryLower.includes('empresa') || queryLower.includes('cnpj')) return 'company'
    
    return 'general'
  }

  /**
   * Limpa cache expirado
   */
  async cleanup(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('ai_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (error) throw error
      
      const deletedCount = data?.length || 0
      console.log(`🧹 Cache cleanup: ${deletedCount} entries removed`)
      return deletedCount
    } catch (error) {
      console.warn('Cache cleanup error:', error)
      return 0
    }
  }

  /**
   * Invalida cache por padrão
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('ai_cache')
        .delete()
        .like('key', `%${pattern}%`)

      if (error) throw error
      
      const deletedCount = data?.length || 0
      console.log(`🗑️ Cache invalidated: ${deletedCount} entries for pattern "${pattern}"`)
      return deletedCount
    } catch (error) {
      console.warn('Cache invalidation error:', error)
      return 0
    }
  }

  /**
   * Obtém estatísticas do cache
   */
  async getStats(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('ai_cache')
        .select('query_type, hit_count, created_at')
        .gt('expires_at', new Date().toISOString())

      if (error) throw error

      const stats = {
        totalEntries: data.length,
        totalHits: data.reduce((sum, entry) => sum + entry.hit_count, 0),
        avgHitsPerEntry: data.length > 0 ? data.reduce((sum, entry) => sum + entry.hit_count, 0) / data.length : 0,
        typeDistribution: data.reduce((acc, entry) => {
          acc[entry.query_type] = (acc[entry.query_type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }

      return stats
    } catch (error) {
      console.warn('Cache stats error:', error)
      return null
    }
  }
}
