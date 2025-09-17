// Cache service for Edge Functions
export interface CacheStats {
  totalEntries: number
  hitRate: number
  missRate: number
  lastCleanup: Date
  memoryUsage: number
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

class CacheService {
  private static instance: CacheService
  private cache: Map<string, CacheEntry<any>> = new Map()
  private stats = {
    hits: 0,
    misses: 0,
    lastCleanup: new Date()
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService()
    }
    return CacheService.instance
  }

  set<T>(key: string, data: T, ttlSeconds = 300): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
      hits: 0
    }
    
    this.cache.set(key, entry)
    this.cleanup()
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    entry.hits++
    this.stats.hits++
    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      lastCleanup: new Date()
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    // Only cleanup once per hour
    if (this.stats.lastCleanup.getTime() > oneHourAgo) {
      return
    }

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
    
    this.stats.lastCleanup = new Date()
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      totalEntries: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      missRate: total > 0 ? (this.stats.misses / total) * 100 : 0,
      lastCleanup: this.stats.lastCleanup,
      memoryUsage: this.cache.size * 1024 // Rough estimate
    }
  }
}

const cacheService = CacheService.getInstance()

export function setCache<T>(key: string, data: T, ttlSeconds = 300): void {
  cacheService.set(key, data, ttlSeconds)
}

export function getCache<T>(key: string): T | null {
  return cacheService.get<T>(key)
}

export function hasCache(key: string): boolean {
  return cacheService.has(key)
}

export function deleteCache(key: string): boolean {
  return cacheService.delete(key)
}

export function clearCache(): void {
  cacheService.clear()
}

export function getCacheStats(): CacheStats {
  return cacheService.getStats()
}
