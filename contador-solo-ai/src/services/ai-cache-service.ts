'use client'

import type { ContextualData, EnhancedAIContext } from './ai-context-service'

// Tipos para o cache
interface CacheEntry {
  data: ContextualData;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number; // Time to live em milliseconds
}

interface CacheStats {
  size: number;
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Serviço de cache inteligente para dados contextuais da IA
 * Implementa estratégias de cache com TTL, LRU e invalidação inteligente
 */
export class AICacheService {
  private cache = new Map<string, CacheEntry>()
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }

  // Configurações do cache
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutos
  private readonly MAX_ENTRIES = 100
  private readonly CLEANUP_INTERVAL = 60 * 1000 // 1 minuto

  constructor() {
    // Iniciar limpeza automática
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL)
    }
  }

  /**
   * Gera chave de cache baseada no contexto
   */
  generateCacheKey(context: EnhancedAIContext): string {
    const parts = [
      context.userId,
      context.empresaId || 'all',
      context.includeFinancialData ? 'fin' : '',
      context.includeObligations ? 'obr' : '',
      context.includeDocuments ? 'doc' : '',
      context.timeRange || 'default'
    ]
    
    return parts.filter(Boolean).join('_')
  }

  /**
   * Busca dados no cache
   */
  get(key: string): ContextualData | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // Atualizar estatísticas de acesso
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.stats.hits++

    return entry.data
  }

  /**
   * Armazena dados no cache
   */
  set(key: string, data: ContextualData, ttl?: number): void {
    // Verificar limite de entradas
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evictLRU()
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    }

    this.cache.set(key, entry)
    console.log(`💾 Cache SET para chave: ${key} (TTL: ${entry.ttl}ms)`)
  }

  /**
   * Remove entrada específica do cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {

    }
    return deleted
  }

  /**
   * Invalida cache baseado em padrões
   */
  invalidatePattern(pattern: string): number {
    let invalidated = 0
    
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
        invalidated++
      }
    }

    if (invalidated > 0) {

    }

    return invalidated
  }

  /**
   * Invalida cache de um usuário específico
   */
  invalidateUser(userId: string): number {
    return this.invalidatePattern(userId)
  }

  /**
   * Invalida cache de uma empresa específica
   */
  invalidateEmpresa(empresaId: string): number {
    return this.invalidatePattern(empresaId)
  }

  /**
   * Remove entrada menos recentemente usada (LRU)
   */
  private evictLRU(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++

    }
  }

  /**
   * Limpeza automática de entradas expiradas
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {

    }
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, evictions: 0 }

  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const totalRequests = this.stats.hits + this.stats.misses
    
    return {
      size: this.cache.size,
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    }
  }

  /**
   * Obtém informações detalhadas de uma entrada
   */
  getEntryInfo(key: string): CacheEntry | null {
    return this.cache.get(key) || null
  }

  /**
   * Lista todas as chaves do cache
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Pré-aquece o cache com dados frequentemente acessados
   */
  async warmup(contexts: EnhancedAIContext[], dataFetcher: (context: EnhancedAIContext) => Promise<ContextualData>): Promise<void> {

    const promises = contexts.map(async (context) => {
      try {
        const key = this.generateCacheKey(context)
        if (!this.cache.has(key)) {
          const data = await dataFetcher(context)
          this.set(key, data, this.DEFAULT_TTL * 2) // TTL maior para warmup
        }
      } catch (error) {
        console.warn('Erro ao fazer warmup do cache:', error)
      }
    })

    await Promise.all(promises)

  }

  /**
   * Configura TTL personalizado para tipos específicos de dados
   */
  setCustomTTL(_dataType: string, _ttl: number): void {
    // Implementar lógica de TTL personalizado por tipo de dados
    // TODO: Implementar configuração de TTL por tipo
  }

  /**
   * Obtém métricas de performance
   */
  getPerformanceMetrics(): {
    averageAccessTime: number;
    mostAccessedKeys: Array<{ key: string; count: number }>;
    cacheEfficiency: number;
  } {
    const entries = Array.from(this.cache.entries())
    
    // Chaves mais acessadas
    const mostAccessed = entries
      .map(([key, entry]) => ({ key, count: entry.accessCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Eficiência do cache
    const totalRequests = this.stats.hits + this.stats.misses
    const efficiency = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0

    return {
      averageAccessTime: 0, // TODO: implementar medição de tempo
      mostAccessedKeys: mostAccessed,
      cacheEfficiency: efficiency
    }
  }
}

// Instância singleton do cache
export const aiCacheService = new AICacheService()

// Utilitários para uso em hooks
export const cacheUtils = {
  /**
   * Invalida cache quando dados de empresa são atualizados
   */
  invalidateOnEmpresaUpdate: (empresaId: string) => {
    aiCacheService.invalidateEmpresa(empresaId)
  },

  /**
   * Invalida cache quando cálculos são atualizados
   */
  invalidateOnCalculoUpdate: (empresaId: string) => {
    aiCacheService.invalidatePattern(`${empresaId}_fin`)
  },

  /**
   * Invalida cache quando obrigações são atualizadas
   */
  invalidateOnObrigacaoUpdate: (empresaId: string) => {
    aiCacheService.invalidatePattern(`${empresaId}_obr`)
  },

  /**
   * Obtém estatísticas formatadas para exibição
   */
  getFormattedStats: () => {
    const stats = aiCacheService.getStats()
    return {
      ...stats,
      hitRateFormatted: `${stats.hitRate.toFixed(1)}%`,
      missRateFormatted: `${stats.missRate.toFixed(1)}%`,
      oldestEntryFormatted: stats.oldestEntry > 0 
        ? new Date(stats.oldestEntry).toLocaleTimeString('pt-BR')
        : 'N/A',
      newestEntryFormatted: stats.newestEntry > 0
        ? new Date(stats.newestEntry).toLocaleTimeString('pt-BR')
        : 'N/A'
    }
  }
}
