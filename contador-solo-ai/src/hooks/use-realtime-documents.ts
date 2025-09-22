import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { StatusProcessamento } from '@/types/documento'
import { calculateDocumentProgress } from '@/lib/document-progress'

export interface DocumentStatus {
  id: string
  name: string
  status: 'processing' | 'completed' | 'error' | 'pending'
  progress: number
  lastUpdated: string
  type: string
  empresa_id?: string
  arquivo_tamanho?: number
  confidence?: number
  processing_stage?: string
}

interface DocumentoRealtime {
  id: string
  arquivo_nome: string
  status_processamento: StatusProcessamento
  tipo_documento: string
  empresa_id: string
  arquivo_tamanho?: number
  dados_extraidos?: any
  updated_at: string
  created_at: string
}

export function useRealtimeDocuments(userId?: string) {
  const [documents, setDocuments] = useState<DocumentStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  const targetUserId = userId || user?.id

  // Converter status do banco para status da interface
  const mapStatusToUI = (status: StatusProcessamento): DocumentStatus['status'] => {
    switch (status) {
      case 'processando':
        return 'processing'
      case 'processado':
        return 'completed'
      case 'erro':
      case 'rejeitado':
        return 'error'
      case 'pendente':
      default:
        return 'pending'
    }
  }

  // Usar a função centralizada de cálculo de progresso
  const getDocumentProgress = (status: StatusProcessamento, dadosExtraidos?: any): number => {
    const progressData = calculateDocumentProgress(status, dadosExtraidos)
    return progressData.progress
  }

  // Converter documento do banco para DocumentStatus
  const mapDocumentoToStatus = (doc: DocumentoRealtime): DocumentStatus => {
    const progressData = calculateDocumentProgress(doc.status_processamento, doc.dados_extraidos)

    return {
      id: doc.id,
      name: doc.arquivo_nome,
      status: mapStatusToUI(doc.status_processamento),
      progress: progressData.progress,
      lastUpdated: doc.updated_at,
      type: doc.tipo_documento,
      empresa_id: doc.empresa_id,
      arquivo_tamanho: doc.arquivo_tamanho,
      confidence: doc.dados_extraidos?.confianca || doc.dados_extraidos?.confidence,
      processing_stage: progressData.stage || doc.dados_extraidos?.processing_stage
    }
  }

  // Carregar documentos iniciais
  const loadInitialDocuments = useCallback(async () => {
    if (!targetUserId) return

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: queryError } = await supabase
        .from('documentos')
        .select(`
          id,
          arquivo_nome,
          status_processamento,
          tipo_documento,
          empresa_id,
          arquivo_tamanho,
          dados_extraidos,
          updated_at,
          created_at,
          empresas!inner(user_id)
        `)
        .eq('empresas.user_id', targetUserId)
        .order('updated_at', { ascending: false })
        .limit(50) // Limitar para performance

      if (queryError) {
        throw new Error(`Erro ao carregar documentos: ${queryError.message}`)
      }

      const mappedDocuments = (data || []).map(mapDocumentoToStatus)
      setDocuments(mappedDocuments)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao carregar documentos iniciais:', err)
    } finally {
      setIsLoading(false)
    }
  }, [targetUserId, supabase])

  // Handlers para eventos real-time
  const handleDocumentInsert = useCallback((payload: any) => {
    console.log('📄 Novo documento inserido:', payload.new)
    const newDoc = mapDocumentoToStatus(payload.new)

    setDocuments(prev => {
      // Evitar duplicatas
      const exists = prev.some(doc => doc.id === newDoc.id)
      if (exists) return prev

      return [newDoc, ...prev].slice(0, 50) // Manter apenas 50 mais recentes
    })

    // Notificação para novos documentos
    toast.success(`Novo documento adicionado: ${newDoc.name}`)
  }, [])

  const handleDocumentUpdate = useCallback((payload: any) => {
    console.log('📄 Documento atualizado:', payload.new)
    const updatedDoc = mapDocumentoToStatus(payload.new)

    setDocuments(prev =>
      prev.map(doc =>
        doc.id === updatedDoc.id ? updatedDoc : doc
      )
    )

    // Notificação para status importantes
    if (updatedDoc.status === 'completed') {
      toast.success(`Documento processado: ${updatedDoc.name}`)
    } else if (updatedDoc.status === 'error') {
      toast.error(`Erro no processamento: ${updatedDoc.name}`)
    }
  }, [])

  const handleDocumentDelete = useCallback((payload: any) => {
    console.log('📄 Documento removido:', payload.old)
    const deletedId = payload.old.id

    setDocuments(prev => prev.filter(doc => doc.id !== deletedId))
    toast.info('Documento removido')
  }, [])

  // Setup da subscription real-time
  useEffect(() => {
    if (!targetUserId) {
      setDocuments([])
      setIsLoading(false)
      return
    }

    // Carregar dados iniciais
    loadInitialDocuments()

    // Limpar subscription anterior
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Criar nova subscription
    const channel = supabase
      .channel(`documents-${targetUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documentos'
        },
        handleDocumentInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documentos'
        },
        handleDocumentUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'documentos'
        },
        handleDocumentDelete
      )
      .subscribe((status) => {
        console.log('📡 Status da subscription de documentos:', status)

        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          console.log('✅ Conectado ao real-time de documentos')
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          setError('Erro na conexão real-time')
          console.error('❌ Erro na conexão real-time de documentos')
          toast.error('Erro na conexão em tempo real. Algumas atualizações podem não aparecer automaticamente.')
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    // Cleanup
    return () => {
      console.log('🔌 Desconectando subscription de documentos')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsConnected(false)
    }
  }, [targetUserId, supabase, loadInitialDocuments, handleDocumentInsert, handleDocumentUpdate, handleDocumentDelete])

  // Função para forçar refresh
  const refresh = useCallback(() => {
    loadInitialDocuments()
  }, [loadInitialDocuments])

  return {
    documents,
    isLoading,
    error,
    isConnected,
    refresh
  }
}