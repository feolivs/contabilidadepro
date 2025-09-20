/**
 * Adaptador para manter compatibilidade com o sistema de cache de IA existente
 * Migra gradualmente para o cache unificado mantendo a interface original
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CacheItem<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
  tags?: string[]
  hitCount?: number
}

interface LegacyCacheInterface {
  get(pergunta: string, userId: string, context?: string): Promise<any | null>
  set(pergunta: string, userId: string, resposta: any, context?: string, ttl?: number): Promise<void>
  invalidate(pergunta: string, userId: string, context?: string): Promise<void>
  invalidateByUser(userId: string): Promise<number>
  clear(): Promise<void>
}

/**
 * Adaptador que implementa a interface legada usando o cache unificado
 */
export class UnifiedCacheAdapter implements LegacyCacheInterface {
  private supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  /**
   * Gerar chave de cache consistente
   */
  private generateCacheKey(pergunta: string, userId: string, context?: string): string {
    const baseKey = `ai:${userId}:${this.hashString(pergunta)}`
    return context ? `${baseKey}:${this.hashString(context)}` : baseKey
  }

  /**
   * Hash simples para chaves consistentes
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Buscar resposta no cache (compatível com interface legada)
   */
  async get(pergunta: string, userId: string, context?: string): Promise<any | null> {
    try {
      const cacheKey = this.generateCacheKey(pergunta, userId, context)
      
      // Tentar buscar do cache unificado
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('value, hit_count')
        .eq('key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        console.log(`🔍 Cache MISS: ${cacheKey}`)
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
   * Armazenar resposta no cache (compatível com interface legada)
   */
  async set(
    pergunta: string, 
    userId: string, 
    resposta: any, 
    context?: string, 
    ttl: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(pergunta, userId, context)
      const expiresAt = new Date(Date.now() + ttl).toISOString()
      
      await this.supabase
        .from('unified_cache')
        .upsert({
          key: cacheKey,
          value: JSON.stringify(resposta),
          expires_at: expiresAt,
          tags: ['ai', `user:${userId}`, 'legacy'],
          user_id: userId,
          priority: 'high',
          created_at: new Date().toISOString()
        })

      console.log(`💾 Cache SET: ${cacheKey}`)
    } catch (error) {
      console.warn('Cache set error:', error)
    }
  }

  /**
   * Invalidar cache específico
   */
  async invalidate(pergunta: string, userId: string, context?: string): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(pergunta, userId, context)
      
      await this.supabase
        .from('unified_cache')
        .delete()
        .eq('key', cacheKey)

      console.log(`🗑️ Cache INVALIDATE: ${cacheKey}`)
    } catch (error) {
      console.warn('Cache invalidate error:', error)
    }
  }

  /**
   * Invalidar todo cache de um usuário
   */
  async invalidateByUser(userId: string): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('unified_cache')
        .delete()
        .eq('user_id', userId)
        .select('*', { count: 'exact', head: true })

      console.log(`🗑️ Cache INVALIDATE USER: ${userId}`, { count })
      return count || 0
    } catch (error) {
      console.warn('Cache invalidate by user error:', error)
      return 0
    }
  }

  /**
   * Limpar todo o cache de IA
   */
  async clear(): Promise<void> {
    try {
      await this.supabase
        .from('unified_cache')
        .delete()
        .contains('tags', ['ai'])

      console.log('🗑️ AI Cache CLEARED')
    } catch (error) {
      console.warn('Cache clear error:', error)
    }
  }

  /**
   * Incrementar contador de hits
   */
  private async incrementHitCount(cacheKey: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_cache_hit', { cache_key: cacheKey })
    } catch (error) {
      // Ignorar erros de hit count - não é crítico
    }
  }

  /**
   * Migrar dados do cache legado
   */
  async migrateLegacyData(): Promise<{ migrated: number; errors: number }> {
    let migrated = 0
    let errors = 0

    try {
      // Buscar dados do ai_cache legado
      const { data: legacyData, error } = await this.supabase
        .from('ai_cache')
        .select('*')
        .gt('expires_at', new Date().toISOString())

      if (error || !legacyData) {
        console.log('No legacy AI cache data to migrate')
        return { migrated: 0, errors: 0 }
      }

      // Migrar cada item
      for (const item of legacyData) {
        try {
          const unifiedKey = `ai:${item.user_id}:${this.hashString(item.key)}`
          
          await this.supabase
            .from('unified_cache')
            .upsert({
              key: unifiedKey,
              value: item.value,
              expires_at: item.expires_at,
              tags: ['ai', `user:${item.user_id}`, 'migrated'],
              user_id: item.user_id,
              hit_count: item.hit_count || 0,
              created_at: item.created_at
            })

          migrated++
        } catch (itemError) {
          console.warn('Error migrating item:', itemError)
          errors++
        }
      }

      console.log(`✅ AI Cache migration completed: ${migrated} migrated, ${errors} errors`)
      return { migrated, errors }
    } catch (error) {
      console.error('AI Cache migration failed:', error)
      return { migrated, errors: errors + 1 }
    }
  }

  /**
   * Obter estatísticas do cache de IA
   */
  async getStats(): Promise<{
    totalEntries: number
    activeEntries: number
    totalHits: number
    avgHitCount: number
    topUsers: Array<{ userId: string; entries: number }>
  }> {
    try {
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('user_id, hit_count, expires_at')
        .contains('tags', ['ai'])

      if (error || !data) {
        return {
          totalEntries: 0,
          activeEntries: 0,
          totalHits: 0,
          avgHitCount: 0,
          topUsers: []
        }
      }

      const now = new Date()
      const activeEntries = data.filter(item => new Date(item.expires_at) > now)
      const totalHits = data.reduce((sum, item) => sum + (item.hit_count || 0), 0)
      
      // Top usuários por número de entradas
      const userCounts = data.reduce((acc, item) => {
        if (item.user_id) {
          acc[item.user_id] = (acc[item.user_id] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      const topUsers = Object.entries(userCounts)
        .map(([userId, entries]) => ({ userId, entries }))
        .sort((a, b) => b.entries - a.entries)
        .slice(0, 10)

      return {
        totalEntries: data.length,
        activeEntries: activeEntries.length,
        totalHits,
        avgHitCount: data.length > 0 ? totalHits / data.length : 0,
        topUsers
      }
    } catch (error) {
      console.warn('Error getting cache stats:', error)
      return {
        totalEntries: 0,
        activeEntries: 0,
        totalHits: 0,
        avgHitCount: 0,
        topUsers: []
      }
    }
  }
}

// Instância singleton para uso nas Edge Functions
export const intelligentCache = new UnifiedCacheAdapter()

// Função SQL para incrementar hit count (deve ser criada no banco)
/*
CREATE OR REPLACE FUNCTION increment_cache_hit(cache_key TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE unified_cache 
  SET hit_count = COALESCE(hit_count, 0) + 1 
  WHERE key = cache_key;
END;
$$ LANGUAGE plpgsql;
*/

// Exportar interface legada para compatibilidade
export default intelligentCache

// Utilitários para migração gradual
export const cacheUtils = {
  // Verificar se uma chave existe no cache legado
  async hasLegacyKey(key: string): Promise<boolean> {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data } = await supabase
      .from('ai_cache')
      .select('key')
      .eq('key', key)
      .single()

    return !!data
  },

  // Migrar chave específica
  async migrateSingleKey(key: string, userId: string): Promise<boolean> {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const { data: legacyItem } = await supabase
        .from('ai_cache')
        .select('*')
        .eq('key', key)
        .eq('user_id', userId)
        .single()

      if (!legacyItem) return false

      const adapter = new UnifiedCacheAdapter()
      const unifiedKey = `ai:${userId}:${adapter['hashString'](key)}`

      await supabase
        .from('unified_cache')
        .upsert({
          key: unifiedKey,
          value: legacyItem.value,
          expires_at: legacyItem.expires_at,
          tags: ['ai', `user:${userId}`, 'migrated'],
          user_id: userId,
          hit_count: legacyItem.hit_count || 0,
          created_at: legacyItem.created_at
        })

      return true
    } catch (error) {
      console.warn('Single key migration failed:', error)
      return false
    }
  }
}
