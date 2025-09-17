'use client'

import { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'

export interface RealtimeDocument {
  id: string
  nome: string
  tipo: string
  status: 'pendente' | 'processando' | 'processado' | 'erro'
  tamanho: number
  progress: number
  created_at: string
  updated_at: string
  url_arquivo?: string
  metadata?: Record<string, any>
  error_message?: string
}

export interface DocumentStats {
  total: number
  pendentes: number
  processando: number
  processados: number
  erros: number
  totalTamanho: number
}

export function useRealtimeDocuments() {
  const [documents, setDocuments] = useState<RealtimeDocument[]>([])
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    pendentes: 0,
    processando: 0,
    processados: 0,
    erros: 0,
    totalTamanho: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()

  const updateStats = () => {
    setStats({
      total: documents.length,
      pendentes: documents.filter(d => d.status === 'pendente').length,
      processando: documents.filter(d => d.status === 'processando').length,
      processados: documents.filter(d => d.status === 'processado').length,
      erros: documents.filter(d => d.status === 'erro').length,
      totalTamanho: documents.reduce((acc, doc) => acc + (doc.tamanho || 0), 0)
    })
  }

  const fetchDocuments = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const formattedDocuments: RealtimeDocument[] = (data || []).map(doc => ({
        id: doc.id,
        nome: doc.nome || 'Documento sem nome',
        tipo: doc.tipo || 'Indefinido',
        status: doc.status || 'pendente',
        tamanho: doc.tamanho || 0,
        progress: getProgressFromStatus(doc.status),
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        url_arquivo: doc.url_arquivo,
        metadata: doc.metadata,
        error_message: doc.error_message
      }))

      setDocuments(formattedDocuments)

    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
    }
  }

  const getProgressFromStatus = (status: string): number => {
    switch (status) {
      case 'pendente':
        return 0
      case 'processando':
        return 50
      case 'processado':
        return 100
      case 'erro':
        return 0
      default:
        return 0
    }
  }

  const updateDocumentProgress = (id: string, progress: number) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id ? { ...doc, progress } : doc
      )
    )
  }

  const simulateProcessingProgress = (documentId: string) => {
    let progress = 10
    const interval = setInterval(() => {
      progress += Math.random() * 20
      if (progress >= 90) {
        clearInterval(interval)
        progress = 100
      }
      updateDocumentProgress(documentId, Math.min(progress, 90))
    }, 1000)

    return interval
  }

  useEffect(() => {
    if (!user) return

    setIsLoading(true)
    fetchDocuments().finally(() => setIsLoading(false))

    // Subscription para atualizações em tempo real
    const subscription = supabase
      .channel('documents_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documentos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📄 Novo documento adicionado:', payload)
          const newDoc: RealtimeDocument = {
            id: payload.new.id,
            nome: payload.new.nome || 'Documento sem nome',
            tipo: payload.new.tipo || 'Indefinido',
            status: payload.new.status || 'pendente',
            tamanho: payload.new.tamanho || 0,
            progress: getProgressFromStatus(payload.new.status),
            created_at: payload.new.created_at,
            updated_at: payload.new.updated_at,
            url_arquivo: payload.new.url_arquivo,
            metadata: payload.new.metadata,
            error_message: payload.new.error_message
          }

          setDocuments(prev => [newDoc, ...prev.slice(0, 49)])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documentos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📄 Documento atualizado:', payload)
          setDocuments(prev =>
            prev.map(doc =>
              doc.id === payload.new.id
                ? {
                    ...doc,
                    status: payload.new.status,
                    progress: getProgressFromStatus(payload.new.status),
                    updated_at: payload.new.updated_at,
                    url_arquivo: payload.new.url_arquivo,
                    metadata: payload.new.metadata,
                    error_message: payload.new.error_message
                  }
                : doc
            )
          )

          // Se o status mudou para "processando", simular progresso
          if (payload.new.status === 'processando') {
            simulateProcessingProgress(payload.new.id)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'documentos',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📄 Documento removido:', payload)
          setDocuments(prev => prev.filter(doc => doc.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  useEffect(() => {
    updateStats()
  }, [documents])

  const getDocumentsByStatus = (status: string) => {
    return documents.filter(doc => doc.status === status)
  }

  const getRecentDocuments = (limit = 10) => {
    return documents.slice(0, limit)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return {
    documents,
    stats,
    isLoading,
    getDocumentsByStatus,
    getRecentDocuments,
    formatFileSize,
    updateDocumentProgress,
    refresh: fetchDocuments
  }
}