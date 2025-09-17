'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { 
  PrazoFiscal, 
  ObrigacaoFiscalView,
  PrazoFiscalAgregado,
  CriarPrazoFiscalInput,
  AtualizarPrazoFiscalInput,
  FiltrosPrazos,
  OrdenacaoPrazos,
  EstatisticasPrazos,
  UsePrazosOptions,
  UsePrazosResult
} from '@/types/prazo-fiscal'
import { toast } from 'sonner'

// =====================================================
// HOOK PRINCIPAL - LISTAR PRAZOS
// =====================================================

export function usePrazos(options: UsePrazosOptions = {}): UsePrazosResult {
  const {
    filtros = {},
    ordenacao = { campo: 'due_date', direcao: 'asc' },
    limite = 50,
    pagina = 1,
    enabled = true
  } = options

  const queryKey = ['prazos', filtros, ordenacao, limite, pagina]

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {

      let query = supabase
        .from('fiscal_obligations')
        .select(`
          *,
          empresa:empresas(id, nome, cnpj, regime_tributario)
        `)

      // Aplicar filtros
      if (filtros.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id)
      }

      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status)
      }

      if (filtros.priority && filtros.priority.length > 0) {
        query = query.in('priority', filtros.priority)
      }

      if (filtros.tipo_obrigacao && filtros.tipo_obrigacao.length > 0) {
        query = query.in('obligation_type', filtros.tipo_obrigacao)
      }

      if (filtros.data_inicio) {
        query = query.gte('due_date', filtros.data_inicio)
      }

      if (filtros.data_fim) {
        query = query.lte('due_date', filtros.data_fim)
      }

      if (filtros.search) {
        query = query.or(`name.ilike.%${filtros.search}%,description.ilike.%${filtros.search}%`)
      }

      // Aplicar ordenação
      query = query.order(ordenacao.campo, { ascending: ordenacao.direcao === 'asc' })

      // Aplicar paginação
      const inicio = (pagina - 1) * limite
      query = query.range(inicio, inicio + limite - 1)

      const { data: prazos, error, count } = await query

      if (error) {

        throw new Error(`Erro ao buscar prazos: ${error.message}`)
      }

      // Calcular campos adicionais
      const prazosProcessados = (prazos || []).map(prazo => ({
        ...prazo,
        dias_para_vencimento: calcularDiasParaVencimento(prazo.due_date),
        situacao: calcularSituacao(prazo.due_date),
        valor_total: prazo.estimated_amount || 0
      }))

      return {
        prazos: prazosProcessados,
        total: count || 0
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })

  return {
    prazos: data?.prazos || [],
    total: data?.total || 0,
    isLoading,
    error,
    refetch,
    hasNextPage: (data?.total || 0) > pagina * limite,
    fetchNextPage: () => {
      // Implementar paginação infinita se necessário
    }
  }
}

// =====================================================
// HOOK - PRAZO ESPECÍFICO
// =====================================================

export function usePrazo(id: string) {
  return useQuery({
    queryKey: ['prazo', id],
    queryFn: async () => {

      const { data: prazo, error } = await supabase
        .from('fiscal_obligations')
        .select(`
          *,
          empresa:empresas(id, nome, cnpj, regime_tributario)
        `)
        .eq('id', id)
        .single()

      if (error) {

        throw new Error(`Erro ao buscar prazo: ${error.message}`)
      }

      return {
        ...prazo,
        dias_para_vencimento: calcularDiasParaVencimento(prazo.due_date),
        situacao: calcularSituacao(prazo.due_date),
        valor_total: prazo.estimated_amount || 0
      } as PrazoFiscal
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

// =====================================================
// HOOK - ESTATÍSTICAS
// =====================================================

export function useEstatisticasPrazos(filtros: FiltrosPrazos = {}) {
  return useQuery({
    queryKey: ['estatisticas-prazos', filtros],
    queryFn: async () => {

      // Buscar dados da view agregada
      let query = supabase.from('obrigacoes_fiscais').select('*')

      // Aplicar filtros
      if (filtros.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id)
      }

      if (filtros.data_inicio) {
        query = query.gte('data_vencimento', filtros.data_inicio)
      }

      if (filtros.data_fim) {
        query = query.lte('data_vencimento', filtros.data_fim)
      }

      const { data: obrigacoes, error } = await query

      if (error) {

        throw new Error(`Erro ao buscar estatísticas: ${error.message}`)
      }

      // Calcular estatísticas
      const stats: EstatisticasPrazos = {
        total_prazos: obrigacoes?.length || 0,
        prazos_vencidos: obrigacoes?.filter(o => o.situacao === 'vencida').length || 0,
        prazos_proximos: obrigacoes?.filter(o => o.situacao === 'proxima').length || 0,
        prazos_futuros: obrigacoes?.filter(o => o.situacao === 'futura').length || 0,
        valor_total_estimado: obrigacoes?.reduce((sum, o) => sum + (o.valor || 0), 0) || 0,
        valor_vencido: obrigacoes?.filter(o => o.situacao === 'vencida').reduce((sum, o) => sum + (o.valor || 0), 0) || 0,
        valor_proximo: obrigacoes?.filter(o => o.situacao === 'proxima').reduce((sum, o) => sum + (o.valor || 0), 0) || 0,
        por_tipo: {} as Record<string, { total: number; valor: number; vencidos: number }>,
        por_empresa: {} as Record<string, { nome: string; total: number; valor: number; vencidos: number }>,
        por_mes: {} as Record<string, { total: number; valor: number }>
      }

      // Agrupar por tipo
      obrigacoes?.forEach(obrigacao => {
        const tipo = obrigacao.tipo_obrigacao
        if (!stats.por_tipo[tipo]) {
          stats.por_tipo[tipo] = { total: 0, valor: 0, vencidos: 0 }
        }
        stats.por_tipo[tipo].total++
        stats.por_tipo[tipo].valor += obrigacao.valor || 0
        if (obrigacao.situacao === 'vencida') {
          stats.por_tipo[tipo].vencidos++
        }
      })

      // Agrupar por empresa
      obrigacoes?.forEach(obrigacao => {
        const empresaId = obrigacao.empresa_id
        if (!stats.por_empresa[empresaId]) {
          stats.por_empresa[empresaId] = {
            nome: obrigacao.empresa_nome,
            total: 0,
            valor: 0,
            vencidos: 0
          }
        }
        stats.por_empresa[empresaId].total++
        stats.por_empresa[empresaId].valor += obrigacao.valor || 0
        if (obrigacao.situacao === 'vencida') {
          stats.por_empresa[empresaId].vencidos++
        }
      })

      return stats
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// =====================================================
// MUTATIONS - CRIAR PRAZO
// =====================================================

export function useCriarPrazo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CriarPrazoFiscalInput): Promise<PrazoFiscal> => {

      const { data: prazo, error } = await supabase
        .from('fiscal_obligations')
        .insert({
          ...data,
          alert_days_before: data.alert_days_before || 7,
          alert_sent: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select(`
          *,
          empresa:empresas(id, nome, cnpj, regime_tributario)
        `)
        .single()

      if (error) {

        throw new Error(`Erro ao criar prazo: ${error.message}`)
      }

      return prazo as PrazoFiscal
    },
    onSuccess: (prazo) => {

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['prazos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas-prazos'] })
      
      toast.success('Prazo fiscal criado com sucesso!')
    },
    onError: (error) => {

      toast.error('Erro ao criar prazo fiscal')
    }
  })
}

// =====================================================
// MUTATIONS - ATUALIZAR PRAZO
// =====================================================

export function useAtualizarPrazo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: AtualizarPrazoFiscalInput }): Promise<PrazoFiscal> => {

      const { data: prazo, error } = await supabase
        .from('fiscal_obligations')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          empresa:empresas(id, nome, cnpj, regime_tributario)
        `)
        .single()

      if (error) {

        throw new Error(`Erro ao atualizar prazo: ${error.message}`)
      }

      return prazo as PrazoFiscal
    },
    onSuccess: (prazo) => {

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['prazos'] })
      queryClient.invalidateQueries({ queryKey: ['prazo', prazo.id] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas-prazos'] })
      
      toast.success('Prazo fiscal atualizado com sucesso!')
    },
    onError: (error) => {

      toast.error('Erro ao atualizar prazo fiscal')
    }
  })
}

// =====================================================
// MUTATIONS - DELETAR PRAZO
// =====================================================

export function useDeletarPrazo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {

      const { error } = await supabase
        .from('fiscal_obligations')
        .delete()
        .eq('id', id)

      if (error) {

        throw new Error(`Erro ao deletar prazo: ${error.message}`)
      }
    },
    onSuccess: (_, id) => {

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['prazos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas-prazos'] })
      queryClient.removeQueries({ queryKey: ['prazo', id] })
      
      toast.success('Prazo fiscal deletado com sucesso!')
    },
    onError: (error) => {

      toast.error('Erro ao deletar prazo fiscal')
    }
  })
}

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================

function calcularDiasParaVencimento(dataVencimento: string): number {
  const hoje = new Date()
  const vencimento = new Date(dataVencimento)
  const diffTime = vencimento.getTime() - hoje.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

function calcularSituacao(dataVencimento: string): 'vencida' | 'proxima' | 'futura' {
  const diasParaVencimento = calcularDiasParaVencimento(dataVencimento)
  
  if (diasParaVencimento < 0) {
    return 'vencida'
  } else if (diasParaVencimento <= 7) {
    return 'proxima'
  } else {
    return 'futura'
  }
}
