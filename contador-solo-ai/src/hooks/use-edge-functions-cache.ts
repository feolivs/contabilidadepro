'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { OptimizedEdgeFunctions } from '@/services/edge-function-client'
import { toast } from 'react-hot-toast'

// ✅ Hook para cache inteligente de Edge Functions
export function useEdgeFunctionsCache() {
  const queryClient = useQueryClient()

  // Cache para cálculos fiscais
  const useCalculoFiscal = (cnpj: string, periodo: string, tipo: 'DAS' | 'IRPJ' | 'CSLL') => {
    return useQuery({
      queryKey: ['calculo-fiscal', cnpj, periodo, tipo],
      queryFn: () => OptimizedEdgeFunctions.invokeCalculoFiscal({ cnpj, periodo, tipo }),
      staleTime: 15 * 60 * 1000, // 15 minutos
      gcTime: 60 * 60 * 1000, // 1 hora
      enabled: !!cnpj && !!periodo && !!tipo,
      retry: 2,
      refetchOnWindowFocus: false
    })
  }

  // Cache para OCR de documentos
  const useDocumentOCR = () => {
    return useMutation({
      mutationFn: (data: { documentUrl: string, tipo: 'NFE' | 'RECIBO' | 'CONTRATO' }) =>
        OptimizedEdgeFunctions.invokeDocumentOCR(data),
      onSuccess: (result) => {
        // Cache do resultado por 30 minutos
        queryClient.setQueryData(
          ['document-ocr', result.data?.documentUrl],
          result,
          { updatedAt: Date.now() + (30 * 60 * 1000) }
        )
        toast.success('Documento processado com sucesso!')
      },
      onError: (error) => {
        console.error('Erro no OCR:', error)
        toast.error('Erro ao processar documento')
      }
    })
  }

  // Cache para assistente IA com contexto
  const useAssistenteIA = (message: string, context?: any) => {
    return useQuery({
      queryKey: ['assistente-ia', message, context],
      queryFn: () => OptimizedEdgeFunctions.invokeAssistenteIA({ message, context }),
      enabled: !!message && message.length > 5,
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos
      retry: 1
    })
  }

  // Cache para analytics em tempo real
  const useAnalytics = (empresaId: string, periodo: string, metricas: string[]) => {
    return useQuery({
      queryKey: ['analytics', empresaId, periodo, metricas],
      queryFn: () => OptimizedEdgeFunctions.invokeAnalytics({ empresaId, periodo, metricas }),
      staleTime: 2 * 60 * 1000, // 2 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos
      enabled: !!empresaId && metricas.length > 0,
      refetchInterval: 5 * 60 * 1000 // Atualizar a cada 5 minutos
    })
  }

  // Cache para contexto da empresa
  const useEmpresaContext = (empresaId: string, includeDetails = false) => {
    return useQuery({
      queryKey: ['empresa-context', empresaId, includeDetails],
      queryFn: () => OptimizedEdgeFunctions.invokeEmpresaContext({ empresaId, includeDetails }),
      staleTime: 10 * 60 * 1000, // 10 minutos
      gcTime: 60 * 60 * 1000, // 1 hora
      enabled: !!empresaId,
      retry: 2
    })
  }

  // Cache para geração de relatórios (mais longo)
  const useRelatorioGenerator = () => {
    return useMutation({
      mutationFn: (data: { tipo: string, periodo: string, empresas: string[] }) =>
        OptimizedEdgeFunctions.invokeRelatorioGenerator(data),
      onSuccess: (result, variables) => {
        // Cache do relatório por 2 horas
        queryClient.setQueryData(
          ['relatorio', variables.tipo, variables.periodo],
          result,
          { updatedAt: Date.now() + (2 * 60 * 60 * 1000) }
        )
        toast.success('Relatório gerado com sucesso!')
      },
      onError: (error) => {
        console.error('Erro ao gerar relatório:', error)
        toast.error('Erro ao gerar relatório')
      }
    })
  }

  // Processador de documentos unificado
  const useDocumentProcessor = () => {
    return useMutation({
      mutationFn: (data: { files: File[], empresaId: string, tipo: string }) =>
        OptimizedEdgeFunctions.invokeDocumentProcessor(data),
      onMutate: () => {
        toast.loading('Processando documentos...', { id: 'document-processing' })
      },
      onSuccess: (result) => {
        toast.success('Documentos processados com sucesso!', { id: 'document-processing' })
        // Invalidar cache de documentos da empresa
        queryClient.invalidateQueries({ queryKey: ['documentos'] })
      },
      onError: (error) => {
        console.error('Erro no processamento:', error)
        toast.error('Erro ao processar documentos', { id: 'document-processing' })
      }
    })
  }

  // Utilitários de cache
  const invalidateCache = (pattern: string[]) => {
    queryClient.invalidateQueries({ queryKey: pattern })
  }

  const clearCache = () => {
    queryClient.clear()
  }

  const getCacheStats = () => {
    const cache = queryClient.getQueryCache()
    return {
      totalQueries: cache.getAll().length,
      activeQueries: cache.getAll().filter(query => query.state.fetchStatus === 'fetching').length,
      staleQueries: cache.getAll().filter(query => query.isStale()).length,
      errorQueries: cache.getAll().filter(query => query.state.status === 'error').length
    }
  }

  return {
    // Hooks de cache
    useCalculoFiscal,
    useDocumentOCR,
    useAssistenteIA,
    useAnalytics,
    useEmpresaContext,
    useRelatorioGenerator,
    useDocumentProcessor,

    // Utilitários
    invalidateCache,
    clearCache,
    getCacheStats
  }
}

// ✅ Hook para pré-carregamento inteligente
export function useSmartPreload() {
  const queryClient = useQueryClient()

  const preloadEmpresaContext = (empresaId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['empresa-context', empresaId, false],
      queryFn: () => OptimizedEdgeFunctions.invokeEmpresaContext({ empresaId }),
      staleTime: 10 * 60 * 1000
    })
  }

  const preloadAnalytics = (empresaId: string, periodo = 'mes') => {
    const metricas = ['receita', 'despesas', 'lucro']
    queryClient.prefetchQuery({
      queryKey: ['analytics', empresaId, periodo, metricas],
      queryFn: () => OptimizedEdgeFunctions.invokeAnalytics({ empresaId, periodo, metricas }),
      staleTime: 2 * 60 * 1000
    })
  }

  const preloadCalculosFiscais = (cnpj: string) => {
    const tipos: ('DAS' | 'IRPJ' | 'CSLL')[] = ['DAS', 'IRPJ', 'CSLL']
    const periodo = new Date().toISOString().slice(0, 7) // YYYY-MM

    tipos.forEach(tipo => {
      queryClient.prefetchQuery({
        queryKey: ['calculo-fiscal', cnpj, periodo, tipo],
        queryFn: () => OptimizedEdgeFunctions.invokeCalculoFiscal({ cnpj, periodo, tipo }),
        staleTime: 15 * 60 * 1000
      })
    })
  }

  return {
    preloadEmpresaContext,
    preloadAnalytics,
    preloadCalculosFiscais
  }
}

// ✅ Hook para monitoramento de performance do cache
export function useCacheMonitoring() {
  const queryClient = useQueryClient()

  const getPerformanceMetrics = () => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()

    const metrics = {
      totalQueries: queries.length,
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      memoryUsage: 0
    }

    const hits = queries.filter(q => q.state.dataUpdatedAt > 0 && !q.state.isInvalidated)
    const misses = queries.filter(q => q.state.fetchStatus === 'fetching')

    metrics.hitRate = queries.length > 0 ? (hits.length / queries.length) * 100 : 0
    metrics.missRate = 100 - metrics.hitRate

    // Estimativa de uso de memória (rough)
    metrics.memoryUsage = queries.reduce((acc, query) => {
      const dataSize = JSON.stringify(query.state.data || {}).length
      return acc + dataSize
    }, 0)

    return metrics
  }

  const getCacheHealth = () => {
    const stats = getPerformanceMetrics()
    return {
      status: stats.hitRate > 70 ? 'healthy' : stats.hitRate > 40 ? 'warning' : 'critical',
      recommendations: [
        stats.hitRate < 50 && 'Considere ajustar staleTime para melhorar hit rate',
        stats.memoryUsage > 1000000 && 'Cache muito grande, considere limpeza automática',
        stats.totalQueries > 100 && 'Muitas queries em cache, otimize invalidação'
      ].filter(Boolean)
    }
  }

  return {
    getPerformanceMetrics,
    getCacheHealth
  }
}