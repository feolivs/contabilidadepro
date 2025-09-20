import { unifiedCache } from './unified-cache'
'use client'

import { performanceCache } from './performance-cache'

interface APIOptimizerOptions {
  cache?: boolean
  cacheTTL?: number
  debounce?: number
  retries?: number
  timeout?: number
}

class APIOptimizer {
  private pendingRequests = new Map<string, Promise<any>>()
  private requestQueue = new Map<string, { fn: () => Promise<any>; resolve: (value: any) => void; reject: (reason?: any) => void }>()
  private rateLimiter = new Map<string, number>()

  // Debounce para evitar requests duplicados
  async debounce<T>(
    key: string,
    fn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Cancelar request anterior se existir
      if (this.requestQueue.has(key)) {
        this.requestQueue.delete(key)
      }

      // Agendar novo request
      this.requestQueue.set(key, { fn, resolve, reject })

      setTimeout(async () => {
        const request = this.requestQueue.get(key)
        if (request) {
          this.requestQueue.delete(key)
          try {
            const result = await request.fn()
            request.resolve(result)
          } catch (error) {
            request.reject(error)
          }
        }
      }, delay)
    })
  }

  // Deduplicação de requests idênticos
  async deduplicate<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Se já existe um request pendente, retornar o mesmo
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }

    // Criar novo request
    const promise = fn().finally(() => {
      this.pendingRequests.delete(key)
    })

    this.pendingRequests.set(key, promise)
    return promise
  }

  // Rate limiting simples
  async rateLimit(endpoint: string, maxRequestsPerMinute: number = 60): Promise<void> {
    const now = Date.now()
    const windowStart = now - 60000 // 1 minuto

    const requestCount = this.rateLimiter.get(endpoint) || 0

    if (requestCount >= maxRequestsPerMinute) {
      const waitTime = 60000 - (now % 60000)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    this.rateLimiter.set(endpoint, requestCount + 1)

    // Limpar contadores antigos
    setTimeout(() => {
      this.rateLimiter.delete(endpoint)
    }, 60000)
  }

  // Request otimizado com cache, debounce e deduplicação
  async optimizedRequest<T>(
    key: string,
    fn: () => Promise<T>,
    options: APIOptimizerOptions = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheTTL = 5 * 60 * 1000,
      debounce = 300,
      retries = 3,
      timeout = 10000
    } = options

    // 1. Verificar cache primeiro
    if (cache) {
      const cached = await unifiedCache.get(key)
      if (cached) {
        return cached
      }
    }

    // 2. Rate limiting
    await this.rateLimit(key.split(':')[0] || 'default')

    // 3. Debounce + Deduplicação
    const result = await this.debounce(
      key,
      () => this.deduplicate(key, () => this.withRetryAndTimeout(fn, retries, timeout)),
      debounce
    )

    // 4. Salvar no cache
    if (cache && result) {
      await unifiedCache.set(key, result, cacheTTL)
    }

    return result
  }

  // Request com retry e timeout
  private async withRetryAndTimeout<T>(
    fn: () => Promise<T>,
    retries: number,
    timeout: number
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ])
      } catch (error) {
        if (attempt === retries) {
          throw error
        }

        // Backoff exponencial
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error('Max retries exceeded')
  }

  // Batch requests para reduzir chamadas de API
  async batchRequests<T>(
    requests: Array<{ key: string; fn: () => Promise<T> }>,
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = []

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize)

      const batchPromises = batch.map(({ key, fn }) =>
        this.optimizedRequest(key, fn)
      )

      const batchResults = await Promise.allSettled(batchPromises)

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.warn('Batch request failed:', result.reason)
          results.push(null as any)
        }
      }

      // Pequeno delay entre batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  // Preload de dados críticos
  async preloadCriticalData(userId: string) {
    const criticalRequests = [
      {
        key: `user:${userId}:profile`,
        fn: () => fetch(`/api/users/${userId}`).then(r => r.json())
      },
      {
        key: `user:${userId}:settings`,
        fn: () => fetch(`/api/users/${userId}/settings`).then(r => r.json())
      },
      {
        key: `user:${userId}:permissions`,
        fn: () => fetch(`/api/users/${userId}/permissions`).then(r => r.json())
      }
    ]

    // Executar em paralelo com prioridade alta
    const results = await Promise.allSettled(
      criticalRequests.map(({ key, fn }) =>
        this.optimizedRequest(key, fn, { cache: true, cacheTTL: 30 * 60 * 1000 })
      )
    )

    return results
  }

  // Estatísticas de performance
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      queuedRequests: this.requestQueue.size,
      rateLimitedEndpoints: this.rateLimiter.size,
      cache: performanceCache.getStats()
    }
  }

  // Limpar recursos
  clear() {
    this.pendingRequests.clear()
    this.requestQueue.clear()
    this.rateLimiter.clear()
  }
}

// Instância global
export const apiOptimizer = new APIOptimizer()

// Hook para requests otimizados
export function useOptimizedAPI() {
  return {
    request: apiOptimizer.optimizedRequest.bind(apiOptimizer),
    batch: apiOptimizer.batchRequests.bind(apiOptimizer),
    preload: apiOptimizer.preloadCriticalData.bind(apiOptimizer),
    stats: apiOptimizer.getStats.bind(apiOptimizer)
  }
}