/**
 * Sistema de Cache Nativo Next.js para ContabilidadePRO
 *
 * Migração do cache customizado para APIs nativas do Next.js:
 * - unstable_cache: Para cache server-side
 * - revalidateTag: Para invalidação por tags
 * - revalidatePath: Para invalidação por rotas
 *
 * NOTA: Este arquivo contém apenas utilitários client-safe.
 * Funções server-side estão em server-cache.ts
 */

import { cache } from 'react'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

// ============================================
// CACHE CLIENT-SIDE
// ============================================

/**
 * Cache para React Server Components
 */
export const serverCache = cache

// ============================================
// COMPATIBILIDADE COM SISTEMA ANTERIOR
// ============================================

// ============================================
// COMPATIBILIDADE COM SISTEMA ANTERIOR
// ============================================

/**
 * Wrapper de compatibilidade para migração gradual
 */
export const legacyCompatibility = {
  /**
   * Simula o comportamento do cache anterior para facilitar migração
   */
  get: <T>(key: string): T | null => {
    // No Next.js, o cache é gerenciado automaticamente
    // Esta função existe apenas para compatibilidade durante a migração
    console.warn('legacyCompatibility.get() is deprecated. Use Next.js native cache instead.')
    return null
  },

  set: <T>(key: string, data: T, ttl?: number, tags?: string[]): void => {
    // No Next.js, o cache é gerenciado automaticamente
    // Esta função existe apenas para compatibilidade durante a migração
    console.warn('legacyCompatibility.set() is deprecated. Use Next.js native cache instead.')
  },

  invalidateByTag: (tag: string): void => {
    console.warn('legacyCompatibility.invalidateByTag() is deprecated. Use Next.js native cache instead.')
  }
}
