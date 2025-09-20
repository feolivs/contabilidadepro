/**
 * Hook React para gerenciar documentos unificados
 * Substitui useDocumentos, useDocumentosFiscais e useProcessedDocuments
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DocumentosUnifiedService } from '@/services/documentos-unified.service'
import { 
  DocumentoUnified, 
  DocumentoUnifiedInsert, 
  DocumentoUnifiedUpdate,
  DocumentoSearchParams,
  DocumentCategory,
  UnifiedProcessingStatus
} from '@/types/documentos-unified.types'

// Query keys
const QUERY_KEYS = {
  documentos: 'documentos-unified',
  documento: (id: string) => ['documentos-unified', id],
  search: (params: DocumentoSearchParams) => ['documentos-unified', 'search', params],
  stats: (empresaId?: string, userId?: string) => ['documentos-unified', 'stats', empresaId, userId],
  categoria: (categoria: DocumentCategory, empresaId?: string, userId?: string) => 
    ['documentos-unified', 'categoria', categoria, empresaId, userId],
  pendentes: (empresaId?: string, userId?: string) => 
    ['documentos-unified', 'pendentes', empresaId, userId]
}

/**
 * Hook para listar documentos com paginação
 */
export function useDocumentosUnified(
  empresaId?: string,
  userId?: string,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: [QUERY_KEYS.documentos, empresaId, userId, page, limit],
    queryFn: () => DocumentosUnifiedService.listDocumentos(empresaId, userId, page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

/**
 * Hook para buscar documento por ID
 */
export function useDocumentoUnified(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.documento(id),
    queryFn: () => DocumentosUnifiedService.getDocumento(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook para busca avançada de documentos
 */
export function useSearchDocumentosUnified(params: DocumentoSearchParams) {
  return useQuery({
    queryKey: QUERY_KEYS.search(params),
    queryFn: () => DocumentosUnifiedService.searchDocumentos(params),
    enabled: !!(params.search_term || params.categoria || params.tipo_documento),
    staleTime: 2 * 60 * 1000, // 2 minutos para busca
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Hook para estatísticas de documentos
 */
export function useDocumentosStats(empresaId?: string, userId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.stats(empresaId, userId),
    queryFn: () => DocumentosUnifiedService.getStats(empresaId, userId),
    staleTime: 10 * 60 * 1000, // 10 minutos para stats
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook para documentos por categoria
 */
export function useDocumentosByCategoria(
  categoria: DocumentCategory,
  empresaId?: string,
  userId?: string
) {
  return useQuery({
    queryKey: QUERY_KEYS.categoria(categoria, empresaId, userId),
    queryFn: () => DocumentosUnifiedService.getByCategoria(categoria, empresaId, userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook para documentos pendentes
 */
export function useDocumentosPendentes(empresaId?: string, userId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.pendentes(empresaId, userId),
    queryFn: () => DocumentosUnifiedService.getPendentes(empresaId, userId),
    staleTime: 1 * 60 * 1000, // 1 minuto para pendentes
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos
  })
}

/**
 * Hook para criar documento
 */
export function useCreateDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documento: DocumentoUnifiedInsert) => 
      DocumentosUnifiedService.createDocumento(documento),
    onSuccess: (result) => {
      if (result.error) {
        toast.error('Erro ao criar documento', {
          description: result.error
        })
        return
      }

      toast.success('Documento criado com sucesso!')
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos, 'stats'] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos, 'pendentes'] })
    },
    onError: (error) => {
      console.error('Erro na criação:', error)
      toast.error('Erro ao criar documento')
    }
  })
}

/**
 * Hook para atualizar documento
 */
export function useUpdateDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: DocumentoUnifiedUpdate }) =>
      DocumentosUnifiedService.updateDocumento(id, updates),
    onSuccess: (result, { id }) => {
      if (result.error) {
        toast.error('Erro ao atualizar documento', {
          description: result.error
        })
        return
      }

      toast.success('Documento atualizado com sucesso!')
      
      // Invalidar queries específicas
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documento(id) })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos, 'stats'] })
    },
    onError: (error) => {
      console.error('Erro na atualização:', error)
      toast.error('Erro ao atualizar documento')
    }
  })
}

/**
 * Hook para deletar documento (soft delete)
 */
export function useDeleteDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => DocumentosUnifiedService.deleteDocumento(id),
    onSuccess: (result, id) => {
      if (result.error) {
        toast.error('Erro ao deletar documento', {
          description: result.error
        })
        return
      }

      toast.success('Documento removido com sucesso!')
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documento(id) })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos, 'stats'] })
    },
    onError: (error) => {
      console.error('Erro na deleção:', error)
      toast.error('Erro ao deletar documento')
    }
  })
}

/**
 * Hook para validar documento manualmente
 */
export function useValidarDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes?: string }) =>
      DocumentosUnifiedService.validarDocumento(id, observacoes),
    onSuccess: (result, { id }) => {
      if (result.error) {
        toast.error('Erro ao validar documento', {
          description: result.error
        })
        return
      }

      toast.success('Documento validado com sucesso!')
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documento(id) })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos, 'stats'] })
    },
    onError: (error) => {
      console.error('Erro na validação:', error)
      toast.error('Erro ao validar documento')
    }
  })
}

/**
 * Hook para atualizar status de processamento
 */
export function useUpdateStatusDocumento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      id, 
      status, 
      dadosExtraidos 
    }: { 
      id: string
      status: UnifiedProcessingStatus
      dadosExtraidos?: Record<string, any>
    }) => DocumentosUnifiedService.updateStatus(id, status, dadosExtraidos),
    onSuccess: (result, { id }) => {
      if (result.error) {
        toast.error('Erro ao atualizar status', {
          description: result.error
        })
        return
      }

      toast.success('Status atualizado com sucesso!')
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documento(id) })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos, 'pendentes'] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.documentos, 'stats'] })
    },
    onError: (error) => {
      console.error('Erro na atualização de status:', error)
      toast.error('Erro ao atualizar status')
    }
  })
}

/**
 * Hook para upload de arquivo
 */
export function useUploadDocumento() {
  return useMutation({
    mutationFn: ({ 
      file, 
      empresaId, 
      categoria 
    }: { 
      file: File
      empresaId: string
      categoria: DocumentCategory
    }) => DocumentosUnifiedService.uploadFile(file, empresaId, categoria),
    onError: (error) => {
      console.error('Erro no upload:', error)
      toast.error('Erro no upload do arquivo')
    }
  })
}
