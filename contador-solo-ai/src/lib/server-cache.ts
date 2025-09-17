/**
 * Cache Server-Side para Next.js
 * 
 * Funções que só podem ser usadas em Server Components e Server Actions
 */

import { unstable_cache, revalidateTag, revalidatePath } from 'next/cache'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface CacheOptions {
  tags?: string[]
  revalidate?: number | false
}

// ============================================
// FUNÇÕES DE CACHE SERVER-SIDE
// ============================================

/**
 * Wrapper para unstable_cache com tipagem melhorada
 */
export function createCachedFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyParts: string[],
  options: CacheOptions = {}
) {
  const { tags = [], revalidate = 300 } = options // 5 minutos default
  
  return unstable_cache(
    fn,
    keyParts,
    {
      tags,
      revalidate
    }
  )
}

/**
 * Utilitários de invalidação
 */
export const cacheInvalidation = {
  /**
   * Invalida cache por tag
   */
  invalidateTag: (tag: string) => {
    revalidateTag(tag)
  },

  /**
   * Invalida cache por múltiplas tags
   */
  invalidateTags: (tags: string[]) => {
    tags.forEach(tag => revalidateTag(tag))
  },

  /**
   * Invalida cache por rota
   */
  invalidatePath: (path: string, type: 'layout' | 'page' = 'page') => {
    revalidatePath(path, type)
  },

  /**
   * Invalida múltiplas rotas
   */
  invalidatePaths: (paths: string[], type: 'layout' | 'page' = 'page') => {
    paths.forEach(path => revalidatePath(path, type))
  }
}

// ============================================
// CACHE ESPECÍFICO PARA CÁLCULOS FISCAIS
// ============================================

/**
 * Cache para dados de empresas
 */
export const cachedEmpresaData = createCachedFunction(
  async (empresaId: string) => {
    const { createClient } = await import('@/lib/supabase')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single()

    if (error) {
      throw new Error(`Erro ao buscar empresa: ${error.message}`)
    }

    return data
  },
  ['empresa-data'],
  {
    tags: ['empresas'],
    revalidate: 60 * 60 // 1 hora
  }
)

/**
 * Cache para lista de empresas
 */
export const cachedEmpresasList = createCachedFunction(
  async () => {
    const { createClient } = await import('@/lib/supabase')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('ativa', true)
      .order('nome')

    if (error) {
      throw new Error(`Erro ao buscar empresas: ${error.message}`)
    }

    return data || []
  },
  ['empresas-list'],
  {
    tags: ['empresas'],
    revalidate: 30 * 60 // 30 minutos
  }
)

/**
 * Cache para cálculos de uma empresa
 */
export const cachedCalculosByEmpresa = createCachedFunction(
  async (empresaId: string) => {
    const { createClient } = await import('@/lib/supabase')
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('calculos_fiscais')
      .select(`
        id,
        empresa_id,
        tipo_calculo,
        competencia,
        valor_total,
        status,
        data_vencimento,
        created_at,
        detalhes_calculo
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao buscar cálculos: ${error.message}`)
    }

    return data || []
  },
  ['calculos-by-empresa'],
  {
    tags: ['calculos'],
    revalidate: 5 * 60 // 5 minutos
  }
)

/**
 * Cache para estatísticas de cálculos
 */
export const cachedCalculosStats = createCachedFunction(
  async (empresaId?: string) => {
    const { createClient } = await import('@/lib/supabase')
    const supabase = createClient()
    
    let query = supabase
      .from('calculos_fiscais')
      .select('tipo_calculo, status, valor_total, created_at')

    if (empresaId) {
      query = query.eq('empresa_id', empresaId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`)
    }

    // Processar estatísticas
    const stats = {
      total: data?.length || 0,
      pendentes: data?.filter(c => c.status === 'pendente').length || 0,
      pagos: data?.filter(c => c.status === 'pago').length || 0,
      valorTotal: data?.reduce((sum, c) => sum + (c.valor_total || 0), 0) || 0,
      porTipo: data?.reduce((acc, c) => {
        acc[c.tipo_calculo] = (acc[c.tipo_calculo] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
    }

    return stats
  },
  ['calculos-stats'],
  {
    tags: ['calculos', 'stats'],
    revalidate: 10 * 60 // 10 minutos
  }
)

// ============================================
// UTILITÁRIOS DE CACHE FISCAL
// ============================================

export const fiscalCacheUtils = {
  /**
   * Invalida cache de uma empresa específica
   */
  invalidateEmpresa: (empresaId: string) => {
    cacheInvalidation.invalidateTags([
      `empresa:${empresaId}`,
      'empresas',
      'calculos'
    ])
  },

  /**
   * Invalida todos os cálculos
   */
  invalidateCalculos: () => {
    cacheInvalidation.invalidateTags(['calculos', 'stats'])
  },

  /**
   * Invalida cálculos DAS
   */
  invalidateDAS: (empresaId?: string) => {
    const tags = ['das', 'calculos']
    if (empresaId) {
      tags.push(`empresa:${empresaId}`)
    }
    cacheInvalidation.invalidateTags(tags)
  },

  /**
   * Invalida cálculos IRPJ
   */
  invalidateIRPJ: (empresaId?: string) => {
    const tags = ['irpj', 'calculos']
    if (empresaId) {
      tags.push(`empresa:${empresaId}`)
    }
    cacheInvalidation.invalidateTags(tags)
  },

  /**
   * Invalida cache completo
   */
  invalidateAll: () => {
    cacheInvalidation.invalidateTags([
      'empresas',
      'calculos',
      'das',
      'irpj',
      'stats'
    ])
    
    // Também invalida rotas principais
    cacheInvalidation.invalidatePaths([
      '/calculos',
      '/calculos/server-actions',
      '/dashboard',
      '/relatorios'
    ])
  }
}
