'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/auth-store'
import { Documento, DocumentoFilter } from '@/types/documento'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook para updates em tempo real de documentos
 * Monitora mudanças na tabela documentos e atualiza as queries automaticamente
 */
export function useRealtimeDocumentos(filter?: DocumentoFilter) {
  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Função para atualizar queries relacionadas a documentos
  const invalidateDocumentQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['documentos'] })
    queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })
  }, [queryClient])

  // Função para atualizar documento específico no cache
  const updateDocumentInCache = useCallback((updatedDocument: Documento) => {
    // Atualizar cache do documento específico
    queryClient.setQueryData(['documento', updatedDocument.id], updatedDocument)

    // Atualizar cache da lista de documentos
    queryClient.setQueriesData(
      { queryKey: ['documentos'] },
      (oldData: Documento[] | undefined) => {
        if (!oldData) return oldData

        return oldData.map(doc =>
          doc.id === updatedDocument.id ? updatedDocument : doc
        )
      }
    )

    // Invalidar stats para recalcular
    queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })
  }, [queryClient])

  // Handler para novos documentos
  const handleDocumentInsert = useCallback((payload: any) => {
    console.log('🆕 Novo documento inserido:', payload.new)

    const newDocument = payload.new as Documento

    // Mostrar notificação apenas se não for do usuário atual
    // (para evitar notificação dupla quando o próprio usuário faz upload)
    if (newDocument.created_by !== user?.id) {
      toast.info(`Novo documento: ${newDocument.arquivo_nome}`, {
        description: 'Um novo documento foi adicionado ao sistema'
      })
    }

    // Invalidar queries para recarregar a lista
    invalidateDocumentQueries()
  }, [user?.id, invalidateDocumentQueries])

  // Handler para atualizações de documentos
  const handleDocumentUpdate = useCallback((payload: any) => {
    console.log('🔄 Documento atualizado:', payload.new)

    const updatedDocument = payload.new as Documento
    const oldDocument = payload.old as Documento

    // Verificar se o status mudou
    if (oldDocument.status_processamento !== updatedDocument.status_processamento) {
      const statusMessages = {
        processando: 'está sendo processado',
        processado: 'foi processado com sucesso',
        erro: 'falhou no processamento',
        rejeitado: 'foi rejeitado',
        requer_verificacao: 'requer verificação manual'
      }

      const message = statusMessages[updatedDocument.status_processamento as keyof typeof statusMessages]

      if (message) {
        const toastConfig = {
          description: `Documento: ${updatedDocument.arquivo_nome}`
        }

        switch (updatedDocument.status_processamento) {
          case 'processado':
            toast.success(`Documento ${message}`, toastConfig)
            break
          case 'erro':
          case 'rejeitado':
            toast.error(`Documento ${message}`, toastConfig)
            break
          case 'requer_verificacao':
            toast.warning(`Documento ${message}`, toastConfig)
            break
          default:
            toast.info(`Documento ${message}`, toastConfig)
        }
      }
    }

    // Atualizar cache com o documento atualizado
    updateDocumentInCache(updatedDocument)
  }, [updateDocumentInCache])

  // Handler para documentos deletados
  const handleDocumentDelete = useCallback((payload: any) => {
    console.log('🗑️ Documento deletado:', payload.old)

    const deletedDocument = payload.old as Documento

    // Remover do cache
    queryClient.removeQueries({ queryKey: ['documento', deletedDocument.id] })

    // Atualizar lista removendo o documento
    queryClient.setQueriesData(
      { queryKey: ['documentos'] },
      (oldData: Documento[] | undefined) => {
        if (!oldData) return oldData
        return oldData.filter(doc => doc.id !== deletedDocument.id)
      }
    )

    // Invalidar stats
    queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })

    // Mostrar notificação apenas se não for do usuário atual
    if (deletedDocument.created_by !== user?.id) {
      toast.info(`Documento removido: ${deletedDocument.arquivo_nome}`)
    }
  }, [queryClient, user?.id])

  // Iniciar subscription
  useEffect(() => {
    if (!user) return

    console.log('🔔 Iniciando subscription para documentos em tempo real')

    // Cleanup da subscription anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Criar nova subscription
    const channel = supabase
      .channel('documentos-realtime')
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
          console.log('✅ Conectado ao real-time de documentos')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro na conexão real-time de documentos')
          toast.error('Erro na conexão em tempo real. Algumas atualizações podem não aparecer automaticamente.')
        }
      })

    channelRef.current = channel

    // Cleanup na desmontagem
    return () => {
      console.log('🔌 Desconectando subscription de documentos')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, supabase, handleDocumentInsert, handleDocumentUpdate, handleDocumentDelete])

  // Retornar informações sobre a conexão
  return {
    isConnected: !!channelRef.current,
    invalidateQueries: invalidateDocumentQueries
  }
}

/**
 * Hook simples para habilitar real-time sem retorno de dados
 * Use este quando você só quer as atualizações automáticas
 */
export function useDocumentosRealtime(filter?: DocumentoFilter) {
  const { isConnected } = useRealtimeDocumentos(filter)

  return {
    isConnected
  }
}