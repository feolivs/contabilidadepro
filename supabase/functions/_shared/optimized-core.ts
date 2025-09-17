// Optimized Core Functions for ContabilidadePRO
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface OptimizedQueryConfig {
  useCache?: boolean
  cacheTTL?: number
  timeout?: number
  retries?: number
}

export interface QueryResult<T> {
  data: T | null
  error: string | null
  cached: boolean
  executionTime: number
}

class OptimizedCore {
  private static instance: OptimizedCore
  private supabase: any
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map()

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  static getInstance(): OptimizedCore {
    if (!OptimizedCore.instance) {
      OptimizedCore.instance = new OptimizedCore()
    }
    return OptimizedCore.instance
  }

  async executeQuery<T>(
    query: string,
    params: any[] = [],
    config: OptimizedQueryConfig = {}
  ): Promise<QueryResult<T>> {
    const startTime = performance.now()
    const cacheKey = this.generateCacheKey(query, params)
    
    // Check cache first
    if (config.useCache !== false) {
      const cached = this.getFromCache<T>(cacheKey)
      if (cached) {
        return {
          data: cached,
          error: null,
          cached: true,
          executionTime: performance.now() - startTime
        }
      }
    }

    try {
      // Execute query with timeout
      const queryPromise = this.supabase.rpc('execute_sql', { 
        sql_query: query, 
        params: params 
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), config.timeout || 30000)
      })

      const result = await Promise.race([queryPromise, timeoutPromise])
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      // Cache result if enabled
      if (config.useCache !== false && result.data) {
        this.setCache(cacheKey, result.data, config.cacheTTL || 300000) // 5 min default
      }

      return {
        data: result.data,
        error: null,
        cached: false,
        executionTime: performance.now() - startTime
      }

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
        executionTime: performance.now() - startTime
      }
    }
  }

  async optimizedSelect<T>(
    table: string,
    columns: string = '*',
    conditions: Record<string, any> = {},
    config: OptimizedQueryConfig = {}
  ): Promise<QueryResult<T[]>> {
    const startTime = performance.now()
    
    try {
      let query = this.supabase.from(table).select(columns)
      
      // Apply conditions
      for (const [key, value] of Object.entries(conditions)) {
        if (Array.isArray(value)) {
          query = query.in(key, value)
        } else if (typeof value === 'object' && value !== null) {
          // Handle range queries, etc.
          if (value.gte !== undefined) query = query.gte(key, value.gte)
          if (value.lte !== undefined) query = query.lte(key, value.lte)
          if (value.like !== undefined) query = query.like(key, value.like)
        } else {
          query = query.eq(key, value)
        }
      }

      const result = await query
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      return {
        data: result.data,
        error: null,
        cached: false,
        executionTime: performance.now() - startTime
      }

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
        executionTime: performance.now() - startTime
      }
    }
  }

  async optimizedInsert<T>(
    table: string,
    data: any,
    config: OptimizedQueryConfig = {}
  ): Promise<QueryResult<T>> {
    const startTime = performance.now()
    
    try {
      const result = await this.supabase
        .from(table)
        .insert(data)
        .select()
        .single()

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Invalidate related cache entries
      this.invalidateCache(table)

      return {
        data: result.data,
        error: null,
        cached: false,
        executionTime: performance.now() - startTime
      }

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
        executionTime: performance.now() - startTime
      }
    }
  }

  async optimizedUpdate<T>(
    table: string,
    data: any,
    conditions: Record<string, any>,
    config: OptimizedQueryConfig = {}
  ): Promise<QueryResult<T>> {
    const startTime = performance.now()
    
    try {
      let query = this.supabase.from(table).update(data)
      
      // Apply conditions
      for (const [key, value] of Object.entries(conditions)) {
        query = query.eq(key, value)
      }

      const result = await query.select().single()

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Invalidate related cache entries
      this.invalidateCache(table)

      return {
        data: result.data,
        error: null,
        cached: false,
        executionTime: performance.now() - startTime
      }

    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: false,
        executionTime: performance.now() - startTime
      }
    }
  }

  private generateCacheKey(query: string, params: any[]): string {
    return `${query}:${JSON.stringify(params)}`
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key)
      return null
    }

    return cached.data
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // Cleanup old entries periodically
    if (this.queryCache.size > 1000) {
      this.cleanupCache()
    }
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key)
      }
    }
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.queryCache.delete(key)
      }
    }
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    }
  }

  clearCache(): void {
    this.queryCache.clear()
  }
}

export const optimizedCore = OptimizedCore.getInstance()

// Convenience functions
export async function optimizedSelect<T>(
  table: string,
  columns?: string,
  conditions?: Record<string, any>,
  config?: OptimizedQueryConfig
): Promise<QueryResult<T[]>> {
  return optimizedCore.optimizedSelect<T>(table, columns, conditions, config)
}

export async function optimizedInsert<T>(
  table: string,
  data: any,
  config?: OptimizedQueryConfig
): Promise<QueryResult<T>> {
  return optimizedCore.optimizedInsert<T>(table, data, config)
}

export async function optimizedUpdate<T>(
  table: string,
  data: any,
  conditions: Record<string, any>,
  config?: OptimizedQueryConfig
): Promise<QueryResult<T>> {
  return optimizedCore.optimizedUpdate<T>(table, data, conditions, config)
}
