/**
 * Hooks para usar o Cache API nativo do Next.js
 * 
 * Substitui o sistema de cache customizado por APIs nativas:
 * - unstable_cache para server-side caching
 * - React Query para client-side caching
 * - revalidateTag/revalidatePath para invalidação
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { serverCache } from '@/lib/nextjs-cache'
import { createClient } from '@/lib/supabase'
import type { CalculoFiscal, FiltroCalculos } from '@/types/calculo'

// ============================================
// HOOKS PARA EMPRESAS
// ============================================

/**
 * Hook para buscar dados de uma empresa específica
 */
export function useEmpresa(empresaId: string) {
  return useQuery({
    queryKey: ['empresa', empresaId],
    queryFn: async () => {
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
    enabled: !!empresaId,
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  })
}

/**
 * Hook para buscar lista de empresas
 */
export function useEmpresas() {
  return useQuery({
    queryKey: ['empresas'],
    queryFn: async () => {
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
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

// ============================================
// HOOKS PARA CÁLCULOS
// ============================================

/**
 * Hook para buscar cálculos de uma empresa
 */
export function useCalculosByEmpresa(empresaId: string) {
  return useQuery({
    queryKey: ['calculos', 'empresa', empresaId],
    queryFn: async () => {
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
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  })
}

/**
 * Hook para buscar cálculos com filtros (sem cache server-side)
 */
export function useCalculosWithFilters(filtros?: FiltroCalculos) {
  return useQuery({
    queryKey: ['calculos', 'filtered', filtros],
    queryFn: async (): Promise<CalculoFiscal[]> => {
      const supabase = createClient()
      
      let query = supabase
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
          detalhes_calculo,
          empresas!inner(nome, cnpj, regime_tributario)
        `)
        .order('created_at', { ascending: false })

      if (filtros?.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id)
      }

      if (filtros?.tipo_calculo) {
        query = query.eq('tipo_calculo', filtros.tipo_calculo)
      }

      if (filtros?.status) {
        query = query.eq('status', filtros.status)
      }

      if (filtros?.competencia_inicio) {
        query = query.gte('competencia', filtros.competencia_inicio)
      }

      if (filtros?.competencia_fim) {
        query = query.lte('competencia', filtros.competencia_fim)
      }

      const { data, error } = await query.limit(1000)

      if (error) {
        throw new Error(`Erro ao buscar cálculos: ${error.message}`)
      }

      return (data || []) as any[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

/**
 * Hook para estatísticas de cálculos
 */
export function useCalculosStats(empresaId?: string) {
  return useQuery({
    queryKey: ['calculos', 'stats', empresaId],
    queryFn: async () => {
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
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

// ============================================
// HOOKS PARA INVALIDAÇÃO DE CACHE
// ============================================

/**
 * Hook para invalidação de cache
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  return {
    /**
     * Invalida cache de uma empresa específica
     */
    invalidateEmpresa: (empresaId: string) => {
      // Invalidar React Query
      queryClient.invalidateQueries({
        queryKey: ['empresa', empresaId]
      })
      queryClient.invalidateQueries({
        queryKey: ['calculos', 'empresa', empresaId]
      })
    },

    /**
     * Invalida todos os cálculos
     */
    invalidateCalculos: () => {
      // Invalidar React Query
      queryClient.invalidateQueries({
        queryKey: ['calculos']
      })
      queryClient.invalidateQueries({
        queryKey: ['calculos', 'stats']
      })
    },

    /**
     * Invalida cálculos DAS
     */
    invalidateDAS: (empresaId?: string) => {
      // Invalidar React Query
      queryClient.invalidateQueries({
        queryKey: ['calculos']
      })

      if (empresaId) {
        queryClient.invalidateQueries({
          queryKey: ['calculos', 'empresa', empresaId]
        })
      }
    },

    /**
     * Invalida cálculos IRPJ
     */
    invalidateIRPJ: (empresaId?: string) => {
      // Invalidar React Query
      queryClient.invalidateQueries({
        queryKey: ['calculos']
      })

      if (empresaId) {
        queryClient.invalidateQueries({
          queryKey: ['calculos', 'empresa', empresaId]
        })
      }
    },

    /**
     * Invalida empresas
     */
    invalidateEmpresas: () => {
      // Invalidar React Query
      queryClient.invalidateQueries({
        queryKey: ['empresas']
      })
    },

    /**
     * Invalida tudo
     */
    invalidateAll: () => {
      // Invalidar React Query
      queryClient.invalidateQueries()
    }
  }
}

// ============================================
// HOOKS PARA MUTAÇÕES
// ============================================

/**
 * Hook para criar/atualizar empresa
 */
export function useEmpresaMutation() {
  const queryClient = useQueryClient()
  const { invalidateEmpresas, invalidateEmpresa } = useCacheInvalidation()

  return useMutation({
    mutationFn: async (empresaData: any) => {
      const supabase = createClient()
      
      if (empresaData.id) {
        // Atualizar
        const { data, error } = await supabase
          .from('empresas')
          .update(empresaData)
          .eq('id', empresaData.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Criar
        const { data, error } = await supabase
          .from('empresas')
          .insert(empresaData)
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: (data) => {
      // Invalidar caches relevantes
      invalidateEmpresas()
      if (data.id) {
        invalidateEmpresa(data.id)
      }
      
      toast.success(
        data.id ? 'Empresa atualizada com sucesso!' : 'Empresa criada com sucesso!'
      )
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar empresa: ${error.message}`)
    }
  })
}

/**
 * Hook para excluir empresa
 */
export function useDeleteEmpresa() {
  const { invalidateEmpresas, invalidateEmpresa } = useCacheInvalidation()

  return useMutation({
    mutationFn: async (empresaId: string) => {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', empresaId)

      if (error) throw error
    },
    onSuccess: (_, empresaId) => {
      // Invalidar caches relevantes
      invalidateEmpresas()
      invalidateEmpresa(empresaId)
      
      toast.success('Empresa excluída com sucesso!')
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir empresa: ${error.message}`)
    }
  })
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Hook para prefetch de dados
 */
export function usePrefetch() {
  const queryClient = useQueryClient()

  return {
    prefetchEmpresas: () => {
      queryClient.prefetchQuery({
        queryKey: ['empresas'],
        queryFn: async () => {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('ativa', true)
            .order('nome')

          if (error) throw new Error(`Erro ao buscar empresas: ${error.message}`)
          return data || []
        },
        staleTime: 15 * 60 * 1000
      })
    },

    prefetchEmpresa: (empresaId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['empresa', empresaId],
        queryFn: async () => {
          const supabase = createClient()
          const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', empresaId)
            .single()

          if (error) throw new Error(`Erro ao buscar empresa: ${error.message}`)
          return data
        },
        staleTime: 30 * 60 * 1000
      })
    },

    prefetchCalculos: (empresaId: string) => {
      queryClient.prefetchQuery({
        queryKey: ['calculos', 'empresa', empresaId],
        queryFn: async () => {
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

          if (error) throw new Error(`Erro ao buscar cálculos: ${error.message}`)
          return data || []
        },
        staleTime: 5 * 60 * 1000
      })
    }
  }
}
