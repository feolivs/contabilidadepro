/**
 * Hook para processamento de dados estruturados por tipo de documento - USANDO EDGE FUNCTIONS
 */

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import {
  processarDadosEstruturados,
  type DadosEstruturados,
  type ResultadoProcessamento
} from '@/lib/dados-estruturados-processor'
import type { TipoDocumento } from '@/types/documento'

/**
 * Interface para documento com dados estruturados
 */
export interface DocumentoComDadosEstruturados {
  id: string
  tipo_documento: TipoDocumento
  arquivo_nome: string
  dados_extraidos: any
  dados_estruturados?: DadosEstruturados
  confianca_estruturacao?: number
  erros_estruturacao?: string[]
  avisos_estruturacao?: string[]
  data_estruturacao?: string
  tempo_processamento?: number
}

/**
 * Estatísticas de processamento
 */
export interface EstatisticasProcessamento {
  total_documentos: number
  processados_com_sucesso: number
  com_erros: number
  com_avisos: number
  confianca_media: number
  tempo_medio_processamento: number
  por_tipo: Record<TipoDocumento, {
    total: number
    sucesso: number
    confianca_media: number
  }>
}

/**
 * Interface para resultado da Edge Function
 */
export interface DadosEstruturadosEdgeResult {
  total_documentos: number
  por_tipo: Array<{
    tipo_documento: string
    quantidade: number
    valor_total: number
    confianca_media: number
    campos_mais_extraidos: Array<{
      campo: string
      count: number
    }>
  }>
  por_mes: Array<{
    mes: string
    receita_total: number
    despesa_total: number
    quantidade_documentos: number
    tipos_documento: string[]
    confianca_media: number
  }>
  qualidade_geral: {
    taxa_estruturacao: number
    confianca_media: number
    total_documentos: number
    documentos_estruturados: number
    qualidade_geral: 'alta' | 'media' | 'baixa'
    areas_criticas: string[]
  }
  periodo_analise: string
  // Metadados da Edge Function
  processing_time?: number
  cached?: boolean
  generated_at?: string
}

/**
 * Hook para dados estruturados usando Edge Functions
 */
export function useDadosEstruturadosEdge(
  empresaId: string,
  options?: {
    period_months?: number
    force_refresh?: boolean
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  }
) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  return useQuery({
    queryKey: [
      'dados-estruturados-edge',
      empresaId,
      options?.period_months || 6,
      options?.force_refresh
    ],
    queryFn: async (): Promise<DadosEstruturadosEdgeResult> => {
      if (!user) throw new Error('Usuário não autenticado')
      if (!empresaId) throw new Error('ID da empresa é obrigatório')

      console.log(`[useDadosEstruturadosEdge] Processando dados estruturados para empresa ${empresaId}`)

      // Chamar Edge Function documentos-service
      const { data, error } = await supabase.functions.invoke('documentos-service', {
        body: {
          operation: 'process_structured_data',
          empresa_id: empresaId,
          user_id: user.id,
          period_months: options?.period_months || 6,
          force_refresh: options?.force_refresh || false
        }
      })

      if (error) {
        console.error('[useDadosEstruturadosEdge] Erro na Edge Function:', error)
        throw new Error(`Erro ao processar dados estruturados: ${error.message}`)
      }

      if (!data?.success) {
        console.error('[useDadosEstruturadosEdge] Edge Function retornou erro:', data?.error)
        throw new Error(data?.error || 'Erro desconhecido ao processar dados estruturados')
      }

      console.log(`[useDadosEstruturadosEdge] Dados processados com sucesso (${data.processing_time}ms, cached: ${data.cached})`)

      return {
        ...data.result,
        processing_time: data.processing_time,
        cached: data.cached,
        generated_at: data.generated_at
      }
    },
    enabled: !!user && !!empresaId && (options?.enabled !== false),
    staleTime: options?.staleTime || 10 * 60 * 1000, // 10 minutos
    refetchInterval: options?.refetchInterval || 30 * 60 * 1000, // 30 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Erro ao processar dados estruturados'
    }
  })
}

/**
 * Hook principal para dados estruturados (processamento local)
 */
export function useDadosEstruturados(empresaId?: string) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Query para buscar documentos com dados estruturados
  const {
    data: documentos = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dados-estruturados', empresaId],
    queryFn: async (): Promise<DocumentoComDadosEstruturados[]> => {
      if (!user) return []

      let query = supabase
        .from('documentos')
        .select(`
          id,
          tipo_documento,
          arquivo_nome,
          dados_extraidos,
          dados_estruturados,
          confianca_estruturacao,
          erros_estruturacao,
          avisos_estruturacao,
          data_estruturacao,
          tempo_processamento
        `)
        .eq('status_processamento', 'processado')
        .not('dados_extraidos', 'is', null)
        .order('created_at', { ascending: false })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000 // 10 minutos
  })

  // Mutation para processar documento individual
  const processarDocumentoMutation = useMutation({
    mutationFn: async ({ 
      documentoId, 
      tipoDocumento, 
      dadosExtraidos 
    }: {
      documentoId: string
      tipoDocumento: TipoDocumento
      dadosExtraidos: any
    }): Promise<ResultadoProcessamento> => {
      return await processarDadosEstruturados(dadosExtraidos, tipoDocumento, documentoId)
    },
    onSuccess: async (resultado, { documentoId }) => {
      if (resultado.sucesso && resultado.dados_estruturados) {
        // Salvar dados estruturados no banco
        await supabase
          .from('documentos')
          .update({
            dados_estruturados: resultado.dados_estruturados,
            confianca_estruturacao: resultado.confianca_geral,
            erros_estruturacao: resultado.erros,
            avisos_estruturacao: resultado.avisos,
            data_estruturacao: new Date().toISOString(),
            tempo_processamento: resultado.tempo_processamento
          })
          .eq('id', documentoId)

        // Invalidar cache
        queryClient.invalidateQueries(['dados-estruturados'])
      }
    }
  })

  // Mutation para processar múltiplos documentos
  const processarLoteMutation = useMutation({
    mutationFn: async (documentos: Array<{
      id: string
      tipo_documento: TipoDocumento
      dados_extraidos: any
    }>): Promise<{
      sucessos: number
      erros: number
      resultados: Array<{ id: string; sucesso: boolean; erro?: string }>
    }> => {
      const resultados = []
      let sucessos = 0
      let erros = 0

      for (const doc of documentos) {
        try {
          const resultado = await processarDadosEstruturados(
            doc.dados_extraidos, 
            doc.tipo_documento, 
            doc.id
          )

          if (resultado.sucesso && resultado.dados_estruturados) {
            // Salvar no banco
            await supabase
              .from('documentos')
              .update({
                dados_estruturados: resultado.dados_estruturados,
                confianca_estruturacao: resultado.confianca_geral,
                erros_estruturacao: resultado.erros,
                avisos_estruturacao: resultado.avisos,
                data_estruturacao: new Date().toISOString(),
                tempo_processamento: resultado.tempo_processamento
              })
              .eq('id', doc.id)

            sucessos++
            resultados.push({ id: doc.id, sucesso: true })
          } else {
            erros++
            resultados.push({ 
              id: doc.id, 
              sucesso: false, 
              erro: resultado.erros.join(', ') 
            })
          }
        } catch (error) {
          erros++
          resultados.push({ 
            id: doc.id, 
            sucesso: false, 
            erro: error instanceof Error ? error.message : 'Erro desconhecido' 
          })
        }
      }

      return { sucessos, erros, resultados }
    },
    onSuccess: () => {
      // Invalidar cache após processamento em lote
      queryClient.invalidateQueries(['dados-estruturados'])
    }
  })

  // Calcular estatísticas
  const estatisticas: EstatisticasProcessamento = {
    total_documentos: documentos.length,
    processados_com_sucesso: documentos.filter(doc => doc.dados_estruturados && (!doc.erros_estruturacao || doc.erros_estruturacao.length === 0)).length,
    com_erros: documentos.filter(doc => doc.erros_estruturacao && doc.erros_estruturacao.length > 0).length,
    com_avisos: documentos.filter(doc => doc.avisos_estruturacao && doc.avisos_estruturacao.length > 0).length,
    confianca_media: documentos.length > 0 
      ? documentos.reduce((sum, doc) => sum + (doc.confianca_estruturacao || 0), 0) / documentos.length 
      : 0,
    tempo_medio_processamento: documentos.length > 0
      ? documentos.reduce((sum, doc) => sum + (doc.tempo_processamento || 0), 0) / documentos.length
      : 0,
    por_tipo: calcularEstatisticasPorTipo(documentos)
  }

  // Funções utilitárias
  const processarDocumento = useCallback((
    documentoId: string, 
    tipoDocumento: TipoDocumento, 
    dadosExtraidos: any
  ) => {
    return processarDocumentoMutation.mutateAsync({
      documentoId,
      tipoDocumento,
      dadosExtraidos
    })
  }, [processarDocumentoMutation])

  const processarLote = useCallback((documentos: Array<{
    id: string
    tipo_documento: TipoDocumento
    dados_extraidos: any
  }>) => {
    return processarLoteMutation.mutateAsync(documentos)
  }, [processarLoteMutation])

  const obterDocumentoPorId = useCallback((id: string) => {
    return documentos.find(doc => doc.id === id)
  }, [documentos])

  const filtrarPorTipo = useCallback((tipo: TipoDocumento) => {
    return documentos.filter(doc => doc.tipo_documento === tipo)
  }, [documentos])

  const filtrarComErros = useCallback(() => {
    return documentos.filter(doc => doc.erros_estruturacao && doc.erros_estruturacao.length > 0)
  }, [documentos])

  const filtrarComAvisos = useCallback(() => {
    return documentos.filter(doc => doc.avisos_estruturacao && doc.avisos_estruturacao.length > 0)
  }, [documentos])

  const filtrarPorConfianca = useCallback((confiancaMinima: number) => {
    return documentos.filter(doc => (doc.confianca_estruturacao || 0) >= confiancaMinima)
  }, [documentos])

  return {
    // Dados
    documentos,
    estatisticas,
    
    // Estados
    isLoading,
    error,
    isProcessing: processarDocumentoMutation.isPending || processarLoteMutation.isPending,
    
    // Ações
    processarDocumento,
    processarLote,
    refetch,
    
    // Utilitários
    obterDocumentoPorId,
    filtrarPorTipo,
    filtrarComErros,
    filtrarComAvisos,
    filtrarPorConfianca
  }
}

/**
 * Hook específico para documentos não estruturados
 */
export function useDocumentosNaoEstruturados(empresaId?: string) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['documentos-nao-estruturados', empresaId],
    queryFn: async () => {
      if (!user) return []

      let query = supabase
        .from('documentos')
        .select(`
          id,
          tipo_documento,
          arquivo_nome,
          dados_extraidos,
          created_at
        `)
        .eq('status_processamento', 'processado')
        .not('dados_extraidos', 'is', null)
        .is('dados_estruturados', null)
        .order('created_at', { ascending: false })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Calcular estatísticas por tipo de documento
 */
function calcularEstatisticasPorTipo(
  documentos: DocumentoComDadosEstruturados[]
): Record<TipoDocumento, { total: number; sucesso: number; confianca_media: number }> {
  const tipos: TipoDocumento[] = ['NFE', 'NFSE', 'RECIBO', 'BOLETO', 'EXTRATO', 'COMPROVANTE', 'CONTRATO', 'OUTROS']
  
  const estatisticas = {} as Record<TipoDocumento, { total: number; sucesso: number; confianca_media: number }>
  
  for (const tipo of tipos) {
    const documentosTipo = documentos.filter(doc => doc.tipo_documento === tipo)
    const sucessos = documentosTipo.filter(doc => 
      doc.dados_estruturados && (!doc.erros_estruturacao || doc.erros_estruturacao.length === 0)
    )
    
    estatisticas[tipo] = {
      total: documentosTipo.length,
      sucesso: sucessos.length,
      confianca_media: documentosTipo.length > 0
        ? documentosTipo.reduce((sum, doc) => sum + (doc.confianca_estruturacao || 0), 0) / documentosTipo.length
        : 0
    }
  }
  
  return estatisticas
}
