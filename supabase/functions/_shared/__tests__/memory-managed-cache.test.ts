/**
 * 🧪 UNIT TESTS - Memory Managed Cache
 * Testes para validar funcionalidade do cache híbrido
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { MemoryManagedCache, createMemoryManagedCache } from '../memory-managed-cache.ts'

// Mock do fallback cache
const mockFallbackCache = {
  get: jest.fn(),
  set: jest.fn()
}

describe('MemoryManagedCache', () => {
  let cache: MemoryManagedCache

  beforeEach(() => {
    cache = createMemoryManagedCache(mockFallbackCache, {
      maxMemorySize: 1024 * 1024, // 1MB para testes
      maxEntries: 100,
      defaultTTL: 5000, // 5 segundos
      cleanupInterval: 1000, // 1 segundo
      evictionThreshold: 0.8
    })

    jest.clearAllMocks()
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('Basic Operations', () => {
    it('should set and get values from memory cache', async () => {
      const key = 'test-key'
      const value = { data: 'test data' }

      await cache.set(key, value)
      const result = await cache.get(key)

      expect(result).toEqual(value)
    })

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should invalidate cache entries', async () => {
      const key = 'test-key'
      const value = { data: 'test data' }

      await cache.set(key, value)
      await cache.invalidate(key)

      const result = await cache.get(key)
      expect(result).toBeNull()
    })
  })

  describe('TTL Functionality', () => {
    it('should expire entries after TTL', async () => {
      const key = 'ttl-test'
      const value = { data: 'expires soon' }

      await cache.set(key, value, 100) // 100ms TTL

      // Should exist immediately
      let result = await cache.get(key)
      expect(result).toEqual(value)

      // Should expire after TTL
      await new Promise(resolve => setTimeout(resolve, 150))
      result = await cache.get(key)
      expect(result).toBeNull()
    })

    it('should handle cleanup of expired entries', async () => {
      const key1 = 'short-ttl'
      const key2 = 'long-ttl'

      await cache.set(key1, 'data1', 50) // 50ms
      await cache.set(key2, 'data2', 5000) // 5s

      // Wait for first to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      const cleaned = cache.cleanup()
      expect(cleaned).toBeGreaterThan(0)

      // Short TTL should be gone, long TTL should remain
      expect(await cache.get(key1)).toBeNull()
      expect(await cache.get(key2)).toEqual('data2')
    })
  })

  describe('Fallback Cache Integration', () => {
    it('should fallback to external cache on memory miss', async () => {
      const key = 'fallback-test'
      const value = { data: 'from fallback' }

      (mockFallbackCache.get as any).mockResolvedValue(value)

      const result = await cache.get(key)

      expect(mockFallbackCache.get).toHaveBeenCalledWith(key)
      expect(result).toEqual(value)
    })

    it('should store in fallback cache when setting', async () => {
      const key = 'store-test'
      const value = { data: 'to store' }

      await cache.set(key, value)

      expect(mockFallbackCache.set).toHaveBeenCalledWith(key, value, expect.any(Number))
    })

    it('should handle fallback cache errors gracefully', async () => {
      (mockFallbackCache.get as any).mockRejectedValue(new Error('Fallback error'))

      const result = await cache.get('error-test')
      expect(result).toBeNull()
    })
  })

  describe('Memory Management', () => {
    it('should track memory usage', async () => {
      const key = 'memory-test'
      const value = { data: 'x'.repeat(1000) } // Large value

      await cache.set(key, value)

      const stats = cache.getStats()
      expect(stats.memoryEntries).toBe(1)
      expect(stats.memorySize).toBeGreaterThan(1000)
    })

    it('should perform LRU eviction when over threshold', async () => {
      // Fill cache near limit
      for (let i = 0; i < 90; i++) {
        await cache.set(`key-${i}`, { data: 'x'.repeat(1000) })
      }

      const statsBefore = cache.getStats()
      expect(statsBefore.memoryEntries).toBe(90)

      // Add more to trigger eviction
      for (let i = 90; i < 110; i++) {
        await cache.set(`key-${i}`, { data: 'x'.repeat(1000) })
      }

      const statsAfter = cache.getStats()
      expect(statsAfter.evictions).toBeGreaterThan(0)
      expect(statsAfter.memoryEntries).toBeLessThan(110)
    })
  })

  describe('Statistics', () => {
    it('should track hit and miss rates', async () => {
      const key = 'stats-test'
      const value = { data: 'test' }

      // Set and hit
      await cache.set(key, value)
      await cache.get(key) // Hit
      await cache.get('non-existent') // Miss

      const stats = cache.getStats()
      expect(stats.totalHits).toBe(1)
      expect(stats.totalMisses).toBe(1)
      expect(stats.hitRate).toBe(50)
    })

    it('should calculate memory usage percentage', async () => {
      const stats = cache.getStats()
      expect(stats.memoryUsagePercent).toBeGreaterThanOrEqual(0)
      expect(stats.memoryUsagePercent).toBeLessThanOrEqual(100)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null/undefined values', async () => {
      await cache.set('null-test', null)
      await cache.set('undefined-test', undefined)

      expect(await cache.get('null-test')).toBeNull()
      expect(await cache.get('undefined-test')).toBeUndefined()
    })

    it('should handle very large values', async () => {
      const largeValue = { data: 'x'.repeat(100000) } // 100KB

      await cache.set('large-test', largeValue)
      const result = await cache.get('large-test')

      expect(result).toEqual(largeValue)
    })

    it('should handle concurrent operations', async () => {
      const promises = []

      // Concurrent sets
      for (let i = 0; i < 10; i++) {
        promises.push(cache.set(`concurrent-${i}`, { value: i }))
      }

      await Promise.all(promises)

      // Verify all were set
      for (let i = 0; i < 10; i++) {
        const result = await cache.get(`concurrent-${i}`)
        expect(result).toEqual({ value: i })
      }
    })
  })
})

describe('Debug Utils', () => {
  it('should log cache state', () => {
    const cache = createMemoryManagedCache()
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    // debugUtils.logCacheState(cache)

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
    cache.destroy()
  })
})