'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '@/store/auth-store'
import { 
  EmpresaUnified, 
  EmpresasStats, 
  EmpresasQueryOptions,
  EmpresasQueryResult,
  EmpresaFilters,
  CreateEmpresaInput,
  UpdateEmpresaInput,
  UseEmpresasOptions,
  UseEmpresasResult,
  normalizeRegimeTributario
} from '@/types/empresa-unified.types'

// Hook principal unificado para empresas
export function useEmpresasUnified(options: UseEmpresasOptions = {}): UseEmpresasResult {
  const {
    filters,
    search,
    sort,
    pagination,
    viewMode,
    includeRelated = false,
    enabled = true,
    refetchInterval
  } = options

  const queryKey = ['empresas-unified', { filters, search, sort, pagination, includeRelated }]

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<EmpresasQueryResult> => {
      let queryBuilder = supabase.from('empresas').select('*')

      // Incluir dados relacionados se solicitado
      if (includeRelated) {
        queryBuilder = supabase
          .from('empresas')
          .select(`
            *,
            documentos:documentos(count),
            calculos:calculos_fiscais(count),
            prazos_pendentes:prazos_fiscais!inner(
              count,
              data_vencimento
            )
          `)
      }

      // Aplicar filtros
      if (filters) {
        // Filtro por regime tributário
        if (filters.regime && filters.regime !== 'all') {
          queryBuilder = queryBuilder.eq('regime_tributario', filters.regime)
        }

        // Filtro por status
        if (filters.status && filters.status !== 'all') {
          if (filters.status === 'ativa') {
            queryBuilder = queryBuilder.eq('ativa', true)
          } else if (filters.status === 'inativa') {
            queryBuilder = queryBuilder.eq('ativa', false)
          }
        }

        // Filtro por atividade
        if (filters.atividade && filters.atividade !== 'all') {
          queryBuilder = queryBuilder.ilike('atividade_principal', `%${filters.atividade}%`)
        }

        // Filtros temporais
        if (filters.dataInicio) {
          queryBuilder = queryBuilder.gte('created_at', filters.dataInicio.toISOString())
        }
        if (filters.dataFim) {
          queryBuilder = queryBuilder.lte('created_at', filters.dataFim.toISOString())
        }

        // Filtros por localização
        if (filters.uf) {
          queryBuilder = queryBuilder.ilike('endereco', `%${filters.uf}%`)
        }
        if (filters.cidade) {
          queryBuilder = queryBuilder.ilike('endereco', `%${filters.cidade}%`)
        }
      }

      // Aplicar busca textual
      if (search && search.trim()) {
        queryBuilder = queryBuilder.or(
          `nome.ilike.%${search}%,nome_fantasia.ilike.%${search}%,cnpj.ilike.%${search}%`
        )
      }

      // Aplicar ordenação
      if (sort) {
        queryBuilder = queryBuilder.order(sort.field, { ascending: sort.direction === 'asc' })
      } else {
        queryBuilder = queryBuilder.order('created_at', { ascending: false })
      }

      // Aplicar paginação
      const page = pagination?.page || 1
      const limit = pagination?.limit || 50
      const from = (page - 1) * limit
      const to = from + limit - 1

      queryBuilder = queryBuilder.range(from, to)

      const { data, error, count } = await queryBuilder

      if (error) {
        console.error('Erro ao buscar empresas:', error)
        throw new Error('Erro ao carregar empresas')
      }

      const empresas = (data || []) as EmpresaUnified[]
      const total = count || 0
      const hasMore = total > page * limit

      return {
        data: empresas,
        total,
        page,
        limit,
        hasMore
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval
  })

  // Calcular estatísticas dos dados atuais
  const stats = useEmpresasStatsFromData(query.data?.data || [])

  return {
    data: query.data?.data || [],
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasMore: query.data?.hasMore || false,
    loadMore: () => {
      // Implementar carregamento de mais dados
      // Por enquanto, apenas refetch
      query.refetch()
    }
  }
}

// Hook para estatísticas otimizadas
export function useEmpresasStatsUnified(): EmpresasStats {
  return useQuery({
    queryKey: ['empresas-stats-unified'],
    queryFn: async (): Promise<EmpresasStats> => {
      // Buscar dados básicos das empresas
      const { data: empresas, error } = await supabase
        .from('empresas')
        .select('id, ativa, regime_tributario, created_at')

      if (error) {
        console.error('Erro ao buscar estatísticas:', error)
        throw new Error('Erro ao carregar estatísticas')
      }

      return calculateStatsFromEmpresas(empresas || [])
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  }).data || getDefaultStats()
}

// Hook para calcular estatísticas a partir de dados existentes
function useEmpresasStatsFromData(empresas: EmpresaUnified[]): EmpresasStats {
  return calculateStatsFromEmpresas(empresas)
}

// Função utilitária para calcular estatísticas
function calculateStatsFromEmpresas(empresas: any[]): EmpresasStats {
  const now = new Date()
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
  const inicioAno = new Date(now.getFullYear(), 0, 1)

  const stats = {
    // Estatísticas básicas
    total: empresas.length,
    ativas: empresas.filter(e => e.ativa).length,
    inativas: empresas.filter(e => !e.ativa).length,
    
    // Por regime tributário (usando normalização)
    simplesNacional: empresas.filter(e => 
      normalizeRegimeTributario(e.regime_tributario) === 'Simples Nacional'
    ).length,
    lucroPresumido: empresas.filter(e => 
      normalizeRegimeTributario(e.regime_tributario) === 'Lucro Presumido'
    ).length,
    lucroReal: empresas.filter(e => 
      normalizeRegimeTributario(e.regime_tributario) === 'Lucro Real'
    ).length,
    mei: empresas.filter(e => 
      normalizeRegimeTributario(e.regime_tributario) === 'MEI'
    ).length,
    
    // Temporais
    novasEsteMes: empresas.filter(e => {
      const created = new Date(e.created_at)
      return created >= inicioMes
    }).length,
    novasEsteAno: empresas.filter(e => {
      const created = new Date(e.created_at)
      return created >= inicioAno
    }).length,
    
    // Operacionais (placeholder - serão implementados com dados reais)
    documentosPendentes: empresas.reduce((acc, e) => acc + (e.documentos_count || 0), 0),
    calculosPendentes: empresas.reduce((acc, e) => acc + (e.calculos_count || 0), 0),
    prazosPendentes: empresas.reduce((acc, e) => acc + (e.prazos_pendentes_count || 0), 0),
    empresasComCalculosRecentes: empresas.filter(e => (e.calculos_count || 0) > 0).length,
    empresasComDocumentosRecentes: empresas.filter(e => (e.documentos_count || 0) > 0).length,
    
    // Crescimento (placeholder)
    crescimentoMensal: 0,
    crescimentoAnual: 0,
    
    ultimaAtualizacao: new Date(Date.now()).toISOString()
  }

  // Calcular percentuais
  const percentuais = {
    percentualSimplesNacional: stats.total > 0 ? Math.round((stats.simplesNacional / stats.total) * 100) : 0,
    percentualLucroPresumido: stats.total > 0 ? Math.round((stats.lucroPresumido / stats.total) * 100) : 0,
    percentualLucroReal: stats.total > 0 ? Math.round((stats.lucroReal / stats.total) * 100) : 0,
    percentualMEI: stats.total > 0 ? Math.round((stats.mei / stats.total) * 100) : 0,
  }

  return {
    ...stats,
    ...percentuais
  }
}

// Função para obter estatísticas padrão
function getDefaultStats(): EmpresasStats {
  return {
    total: 0,
    ativas: 0,
    inativas: 0,
    simplesNacional: 0,
    lucroPresumido: 0,
    lucroReal: 0,
    mei: 0,
    percentualSimplesNacional: 0,
    percentualLucroPresumido: 0,
    percentualLucroReal: 0,
    percentualMEI: 0,
    novasEsteMes: 0,
    novasEsteAno: 0,
    crescimentoMensal: 0,
    crescimentoAnual: 0,
    documentosPendentes: 0,
    calculosPendentes: 0,
    prazosPendentes: 0,
    empresasComCalculosRecentes: 0,
    empresasComDocumentosRecentes: 0,
    ultimaAtualizacao: new Date(Date.now()).toISOString()
  }
}

// Hook para buscar uma empresa específica
export function useEmpresaUnified(id: string) {
  return useQuery({
    queryKey: ['empresa-unified', id],
    queryFn: async (): Promise<EmpresaUnified | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('empresas')
        .select(`
          *,
          documentos:documentos(count),
          calculos:calculos_fiscais(count),
          prazos_pendentes:prazos_fiscais(
            count,
            data_vencimento
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Erro ao carregar empresa:', error)
        throw new Error('Erro ao carregar empresa')
      }

      return data as EmpresaUnified
    },
    enabled: !!id,
  })
}

// Hook para criar empresa (reutilizando do hook existente)
export function useCreateEmpresaUnified() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (empresaData: CreateEmpresaInput) => {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const dataWithUserId = {
        ...empresaData,
        user_id: user.id,
        ativa: empresaData.ativa ?? true
      }

      const { data, error } = await supabase
        .from('empresas')
        .insert(dataWithUserId)
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar empresa:', error)
        throw new Error(error.message || 'Erro ao criar empresa')
      }

      return data as EmpresaUnified
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['empresas-unified'] })
      queryClient.invalidateQueries({ queryKey: ['empresas-stats-unified'] })
      queryClient.invalidateQueries({ queryKey: ['empresas'] }) // Compatibilidade
      
      // Adicionar ao cache
      queryClient.setQueryData(['empresa-unified', data.id], data)
      
      toast.success('Empresa criada com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao criar empresa:', error)
      toast.error('Erro ao criar empresa')
    },
  })
}

// Hook para atualizar empresa
export function useUpdateEmpresaUnified() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (empresaData: UpdateEmpresaInput) => {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const { id, ...updateData } = empresaData

      const { data, error } = await supabase
        .from('empresas')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar empresa:', error)
        throw new Error(error.message || 'Erro ao atualizar empresa')
      }

      return data as EmpresaUnified
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['empresas-unified'] })
      queryClient.invalidateQueries({ queryKey: ['empresas-stats-unified'] })
      queryClient.invalidateQueries({ queryKey: ['empresas'] }) // Compatibilidade
      
      // Atualizar cache específico
      queryClient.setQueryData(['empresa-unified', data.id], data)
      
      toast.success('Empresa atualizada com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao atualizar empresa:', error)
      toast.error('Erro ao atualizar empresa')
    },
  })
}

// Hook para excluir empresa (reutilizando lógica existente)
export function useDeleteEmpresaUnified() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Simulação de exclusão (mesmo comportamento do hook original)
      console.log('Simulando exclusão da empresa com ID:', id)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Verificar se a empresa existe no cache
      const empresas = queryClient.getQueryData(['empresas-unified']) as EmpresasQueryResult | undefined
      const empresa = empresas?.data?.find(e => e.id === id)

      if (!empresa) {
        throw new Error('Empresa não encontrada')
      }

      return id
    },
    onSuccess: (deletedId) => {
      // Remover do cache
      queryClient.setQueryData(['empresas-unified'], (oldData: EmpresasQueryResult | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          data: oldData.data.filter(empresa => empresa.id !== deletedId),
          total: oldData.total - 1
        }
      })

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['empresas-stats-unified'] })
      queryClient.removeQueries({ queryKey: ['empresa-unified', deletedId] })
      
      // Compatibilidade com hook antigo
      queryClient.invalidateQueries({ queryKey: ['empresas'] })

      toast.success('Empresa removida da lista com sucesso!')
    },
    onError: (error) => {
      console.error('Erro ao excluir empresa:', error)
      toast.error('Erro ao excluir empresa')
    },
  })
}
