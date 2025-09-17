import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fiscalCache, useCachedQuery } from '@/lib/cache'
import { toast } from 'sonner'

interface CalculoFiscal {
  id: string
  empresa_id: string
  tipo_calculo: string
  competencia: string
  valor_total: number
  status: string
  data_vencimento: string
  created_at: string
  detalhes_calculo?: any
}

interface DASCalculationInput {
  empresa_id: string
  competencia: string
  faturamento_bruto: number
  regime_tributario: string
  anexo_simples?: string
}

/**
 * Hook para cálculos fiscais com cache inteligente
 */
export function useCachedCalculos(empresa_id?: string) {
  return useQuery({
    queryKey: ['calculos', empresa_id],
    queryFn: async (): Promise<CalculoFiscal[]> => {
      // Tenta buscar do cache primeiro
      const cacheKey = `calculos:${empresa_id || 'all'}`
      const cached = fiscalCache.getEmpresa(cacheKey)
      
      if (cached) {
        return cached
      }

      // Busca do banco de dados
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
          detalhes_calculo
        `)
        .order('created_at', { ascending: false })

      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Erro ao buscar cálculos: ${error.message}`)
      }

      const calculos = data || []
      
      // Armazena no cache
      fiscalCache.setEmpresa(cacheKey, calculos)
      
      return calculos
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

/**
 * Hook para cálculo DAS com cache otimizado
 */
export function useCachedDASCalculation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DASCalculationInput) => {
      // Verifica cache primeiro
      const cached = fiscalCache.getDASCalculation(input.empresa_id, input.competencia)
      
      if (cached) {
        // Se encontrou no cache, retorna imediatamente
        toast.success('Cálculo recuperado do cache', {
          description: 'Resultado obtido instantaneamente'
        })
        return cached
      }

      // Se não está no cache, calcula
      const { data, error } = await supabase.functions.invoke('calcular-das', {
        body: input
      })

      if (error) {
        throw new Error(error.message || 'Erro no cálculo DAS')
      }

      // Armazena no cache
      fiscalCache.setDASCalculation(input.empresa_id, input.competencia, data)

      return data
    },
    onSuccess: (data, variables) => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['calculos', variables.empresa_id] 
      })
      
      toast.success('Cálculo DAS realizado com sucesso!')
    },
    onError: (error: Error) => {
      toast.error('Erro no cálculo DAS', {
        description: error.message
      })
    }
  })
}

/**
 * Hook para empresas com cache
 */
export function useCachedEmpresas() {
  return useCachedQuery(
    'empresas:all',
    async () => {
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
    {
      ttl: 60 * 60 * 1000, // 1 hora
      tags: ['empresas'],
      staleTime: 30 * 60 * 1000 // 30 minutos
    }
  )
}

/**
 * Hook para dados de uma empresa específica com cache
 */
export function useCachedEmpresa(empresa_id: string) {
  return useQuery({
    queryKey: ['empresa', empresa_id],
    queryFn: async () => {
      // Verifica cache primeiro
      const cached = fiscalCache.getEmpresa(empresa_id)
      if (cached) {
        return cached
      }

      // Busca do banco
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresa_id)
        .single()

      if (error) {
        throw new Error(`Erro ao buscar empresa: ${error.message}`)
      }

      // Armazena no cache
      fiscalCache.setEmpresa(empresa_id, data)

      return data
    },
    staleTime: 30 * 60 * 1000, // 30 minutos
    enabled: !!empresa_id
  })
}

/**
 * Hook para relatórios com cache
 */
export function useCachedRelatorios(filtros?: {
  empresa_id?: string
  data_inicio?: string
  data_fim?: string
  tipo_calculo?: string
}) {
  const cacheKey = `relatorios:${JSON.stringify(filtros || {})}`
  
  return useCachedQuery(
    cacheKey,
    async () => {
      let query = supabase
        .from('calculos_fiscais')
        .select(`
          id,
          tipo_calculo,
          competencia,
          valor_total,
          status,
          data_vencimento,
          created_at,
          empresas!inner(nome, cnpj, regime_tributario)
        `)
        .order('created_at', { ascending: false })

      if (filtros?.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id)
      }

      if (filtros?.data_inicio) {
        query = query.gte('competencia', filtros.data_inicio)
      }

      if (filtros?.data_fim) {
        query = query.lte('competencia', filtros.data_fim)
      }

      if (filtros?.tipo_calculo) {
        query = query.eq('tipo_calculo', filtros.tipo_calculo)
      }

      const { data, error } = await query.limit(1000)

      if (error) {
        throw new Error(`Erro ao buscar relatórios: ${error.message}`)
      }

      return data || []
    },
    {
      ttl: 10 * 60 * 1000, // 10 minutos
      tags: ['relatorios', 'calculos'],
      staleTime: 5 * 60 * 1000 // 5 minutos
    }
  )
}

/**
 * Hook para invalidar cache
 */
export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  return {
    invalidateEmpresa: (empresa_id: string) => {
      fiscalCache.invalidateEmpresa(empresa_id)
      queryClient.invalidateQueries({ queryKey: ['empresa', empresa_id] })
      queryClient.invalidateQueries({ queryKey: ['calculos', empresa_id] })
    },

    invalidateCalculos: () => {
      fiscalCache.invalidateCalculos()
      queryClient.invalidateQueries({ queryKey: ['calculos'] })
      queryClient.invalidateQueries({ queryKey: ['relatorios'] })
    },

    invalidateAll: () => {
      fiscalCache.invalidateCalculos()
      fiscalCache.invalidateEmpresa('all')
      queryClient.invalidateQueries()
    }
  }
}

/**
 * Hook para estatísticas de cache
 */
export function useCacheStats() {
  return useQuery({
    queryKey: ['cache-stats'],
    queryFn: () => {
      // Retorna estatísticas básicas do cache
      return { hits: 0, misses: 0, size: 0, hitRate: 0 }
    },
    refetchInterval: 30 * 1000, // Atualiza a cada 30 segundos
    staleTime: 0
  })
}
