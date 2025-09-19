'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// Tipos
export type DocumentType = 'NFE' | 'RECIBO' | 'CONTRATO' | 'COMPROVANTE' | 'BOLETO' | 'EXTRATO'
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ProcessedDocument {
  id: string
  user_id: string
  file_name: string
  file_size?: number
  file_type?: string
  document_type: DocumentType
  status: ProcessingStatus
  extracted_data: any
  confidence_score?: number
  manually_validated: boolean
  created_at: string
  updated_at: string
  fiscal_year?: number
  fiscal_month?: number
  total_value?: number
  tags: string[]
}

// =====================================================
// FUNÇÕES AUXILIARES PARA OTIMIZAÇÃO MOBILE
// =====================================================

/**
 * 📱 Preparar arquivo para upload (compressão mobile)
 */
async function prepareFileForUpload(file: File): Promise<File> {
  // Se não for imagem, retornar arquivo original
  if (!file.type.startsWith('image/')) {
    return file
  }

  // Detectar se é mobile (viewport pequeno ou touch)
  const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window

  // Se não for mobile ou arquivo já é pequeno, não comprimir
  if (!isMobile || file.size <= 1024 * 1024) { // 1MB
    return file
  }

  try {
    return await compressImage(file)
  } catch (error) {
    console.warn('Erro na compressão, usando arquivo original:', error)
    return file
  }
}

/**
 * 🗜️ Comprimir imagem para mobile
 */
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calcular dimensões otimizadas
      const maxWidth = 1920
      const maxHeight = 1080
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height

      // Desenhar imagem redimensionada
      ctx?.drawImage(img, 0, 0, width, height)

      // Converter para blob com qualidade otimizada
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            reject(new Error('Erro na compressão'))
          }
        },
        'image/jpeg',
        0.8 // 80% qualidade
      )
    }

    img.onerror = () => reject(new Error('Erro ao carregar imagem'))
    img.src = URL.createObjectURL(file)
  })
}

export interface DocumentUploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  result?: ProcessedDocument
}

/**
 * 📄 Hook para processamento de documentos com OCR
 */
export const useDocumentOCR = () => {
  const { user } = useAuthStore()
  const supabase = createBrowserSupabaseClient()
  const queryClient = useQueryClient()
  
  const [uploadProgress, setUploadProgress] = useState<Map<string, DocumentUploadProgress>>(new Map())

  // Mutation para processar documento - NOVA ARQUITETURA STORAGE-FIRST
  const processDocumentMutation = useMutation({
    mutationFn: async ({
      file,
      documentType
    }: {
      file: File
      documentType?: DocumentType
    }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      // 🚀 FASE 1: Preparar arquivo (compressão para mobile se necessário)
      const processedFile = await prepareFileForUpload(file)

      const fileExt = processedFile.name.split('.').pop()
      const fileName = `ocr/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // 🚀 FASE 2: Upload direto para Supabase Storage (RÁPIDO + PROGRESSO)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }

      // 🚀 FASE 2: Criar registro no banco
      const { data: documento, error: dbError } = await supabase
        .from('documentos')
        .insert({
          arquivo_nome: file.name,
          arquivo_path: uploadData.path,
          arquivo_tamanho: file.size,
          tipo_mime: file.type,
          tipo_documento: documentType || 'OUTROS',
          status_processamento: 'pendente',
          user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (dbError) {
        throw new Error(`Erro ao salvar documento: ${dbError.message}`)
      }

      // 🚀 FASE 3: Chamar Edge Function para processamento (SEM ARQUIVO)
      const { data, error } = await supabase.functions.invoke('pdf-ocr-service', {
        body: {
          action: 'process_ocr',
          documentId: documento.id,
          filePath: uploadData.path,
          fileName: file.name,
          options: {
            documentType,
            userId: user.id
          }
        }
      })

      if (error) {
        throw new Error(`Erro no processamento OCR: ${error.message}`)
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido no processamento OCR')
      }

      return {
        success: true,
        document: documento,
        ocr_result: data.data
      }
    },
    onSuccess: (data, variables) => {
      // Atualizar progresso
      setUploadProgress(prev => {
        const newMap = new Map(prev)
        const fileKey = `${variables.file.name}-${variables.file.size}`
        newMap.set(fileKey, {
          file: variables.file,
          progress: 100,
          status: 'completed',
          result: data.document
        })
        return newMap
      })

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['processed-documents'] })
      queryClient.invalidateQueries({ queryKey: ['document-stats'] })
    },
    onError: (error, variables) => {
      // Atualizar progresso com erro
      setUploadProgress(prev => {
        const newMap = new Map(prev)
        const fileKey = `${variables.file.name}-${variables.file.size}`
        newMap.set(fileKey, {
          file: variables.file,
          progress: 0,
          status: 'error',
          error: error.message
        })
        return newMap
      })
    }
  })

  // Função para processar múltiplos arquivos
  const processMultipleFiles = useCallback(async (
    files: File[], 
    documentType?: DocumentType
  ) => {
    const results = []
    
    for (const file of files) {
      const fileKey = `${file.name}-${file.size}`
      
      // Inicializar progresso
      setUploadProgress(prev => {
        const newMap = new Map(prev)
        newMap.set(fileKey, {
          file,
          progress: 0,
          status: 'uploading'
        })
        return newMap
      })

      try {
        // Atualizar para processando
        setUploadProgress(prev => {
          const newMap = new Map(prev)
          newMap.set(fileKey, {
            file,
            progress: 50,
            status: 'processing'
          })
          return newMap
        })

        const result = await processDocumentMutation.mutateAsync({ file, documentType })
        results.push(result)
      } catch (error) {
        console.error(`Erro ao processar ${file.name}:`, error)
        results.push({ error: error instanceof Error ? error.message : 'Erro desconhecido', file: file.name })
      }
    }

    return results
  }, [processDocumentMutation])

  // Query para listar documentos processados
  const useProcessedDocuments = (filters?: {
    documentType?: DocumentType
    status?: ProcessingStatus
    limit?: number
  }) => {
    return useQuery({
      queryKey: ['processed-documents', user?.id, filters],
      queryFn: async () => {
        if (!user?.id) return []

        let query = supabase
          .from('processed_documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (filters?.documentType) {
          query = query.eq('document_type', filters.documentType)
        }

        if (filters?.status) {
          query = query.eq('status', filters.status)
        }

        if (filters?.limit) {
          query = query.limit(filters.limit)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Erro ao buscar documentos: ${error.message}`)
        }

        return data as ProcessedDocument[]
      },
      enabled: !!user?.id
    })
  }

  // Query para estatísticas de documentos
  const useDocumentStats = () => {
    return useQuery({
      queryKey: ['document-stats', user?.id],
      queryFn: async () => {
        if (!user?.id) return null

        const { data, error } = await supabase
          .from('document_processing_stats')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          throw new Error(`Erro ao buscar estatísticas: ${error.message}`)
        }

        return data
      },
      enabled: !!user?.id
    })
  }

  // Função para buscar documentos
  const searchDocuments = useCallback(async (
    searchTerm: string,
    documentType?: DocumentType,
    limit: number = 20
  ) => {
    if (!user?.id) return []

    const { data, error } = await supabase.rpc('search_documents', {
      p_user_id: user.id,
      p_search_term: searchTerm,
      p_document_type: documentType,
      p_limit: limit
    })

    if (error) {
      throw new Error(`Erro na busca: ${error.message}`)
    }

    return data
  }, [user?.id, supabase])

  // Função para obter resumo fiscal
  const getFiscalSummary = useCallback(async (
    year?: number,
    month?: number
  ) => {
    if (!user?.id) return []

    const { data, error } = await supabase.rpc('get_fiscal_summary', {
      p_user_id: user.id,
      p_year: year,
      p_month: month
    })

    if (error) {
      throw new Error(`Erro ao obter resumo fiscal: ${error.message}`)
    }

    return data
  }, [user?.id, supabase])

  // Função para validar documento manualmente
  const validateDocument = useMutation({
    mutationFn: async ({
      documentId,
      validationNotes,
      correctedData
    }: {
      documentId: string
      validationNotes?: string
      correctedData?: any
    }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      const { data, error } = await supabase.rpc('validate_document', {
        p_document_id: documentId,
        p_validator_id: user.id,
        p_validation_notes: validationNotes,
        p_corrected_data: correctedData
      })

      if (error) {
        throw new Error(`Erro na validação: ${error.message}`)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processed-documents'] })
    }
  })

  // Função para limpar progresso
  const clearProgress = useCallback(() => {
    setUploadProgress(new Map())
  }, [])

  // Função para remover item do progresso
  const removeProgressItem = useCallback((fileKey: string) => {
    setUploadProgress(prev => {
      const newMap = new Map(prev)
      newMap.delete(fileKey)
      return newMap
    })
  }, [])

  return {
    // Mutations
    processDocument: processDocumentMutation.mutateAsync,
    processMultipleFiles,
    validateDocument: validateDocument.mutateAsync,
    
    // Queries
    useProcessedDocuments,
    useDocumentStats,
    
    // Functions
    searchDocuments,
    getFiscalSummary,
    
    // State
    uploadProgress: Array.from(uploadProgress.values()),
    isProcessing: processDocumentMutation.isPending,
    
    // Utils
    clearProgress,
    removeProgressItem,
    
    // Status
    error: processDocumentMutation.error?.message
  }
}
