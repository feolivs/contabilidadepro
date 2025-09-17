import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface PDFOCROptions {
  language?: string
  quality?: 'low' | 'medium' | 'high'
  forceOCR?: boolean
  enableCache?: boolean
}

interface PDFOCRResult {
  success: boolean
  documentId: string
  extractedText: string
  method: 'native' | 'ocr' | 'hybrid'
  confidence: number
  processingTime: number
  textQuality: {
    characterCount: number
    wordCount: number
    readabilityScore: number
    hasStructuredData: boolean
  }
  error?: string
}

interface OCRMetrics {
  totalDocuments: number
  nativeExtraction: number
  ocrExtraction: number
  hybridExtraction: number
  avgConfidence: number
  avgProcessingTime: number
  successRate: number
  documentsWithStructuredData: number
}

interface OCRQualityByMethod {
  method: string
  documentCount: number
  avgConfidence: number
  avgReadability: number
  structuredDataRate: number
  avgProcessingTime: number
}

export function usePDFOCR() {
  const supabase = createBrowserSupabaseClient()
  const [isProcessing, setIsProcessing] = useState(false)

  /**
   * Processa um PDF com OCR
   */
  const processPDF = useMutation({
    mutationFn: async ({
      documentId,
      filePath,
      fileName,
      options = {}
    }: {
      documentId: string
      filePath: string
      fileName: string
      options?: PDFOCROptions
    }): Promise<PDFOCRResult> => {
      setIsProcessing(true)
      
      try {
        console.log('Chamando pdf-ocr-service com:', {
          documentId,
          filePath,
          fileName,
          options: {
            language: 'por',
            quality: 'medium',
            enableCache: true,
            ...options
          }
        })

        const response = await supabase.functions.invoke('pdf-ocr-service', {
          body: {
            documentId,
            filePath,
            fileName,
            options: {
              language: 'por',
              quality: 'medium',
              enableCache: true,
              ...options
            }
          }
        })

        console.log('Resposta completa do pdf-ocr-service:', response)
        console.log('Data:', response.data)
        console.log('Error:', response.error)

        const { data, error } = response

        // Only throw error if there's actually an error AND no data
        if (error && !data) {
          console.error('Erro na Edge Function:', error)

          // Provide more specific error messages based on error type
          let errorMessage = 'Erro no processamento OCR'

          if (error.message?.includes('Failed to send a request')) {
            errorMessage = 'Falha na comunicação com o serviço OCR. Verifique sua conexão.'
          } else if (error.message?.includes('Service configuration error')) {
            errorMessage = 'Erro de configuração do serviço. Entre em contato com o suporte.'
          } else if (error.message?.includes('Missing required environment variables')) {
            errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.'
          } else if (error.message) {
            errorMessage = error.message
          }

          throw new Error(errorMessage)
        }

        // Check if we got an empty response
        if (!data) {
          console.error('Resposta vazia da Edge Function. Possível erro de parsing.')
          throw new Error('Resposta vazia do serviço OCR. Tente novamente.')
        }

        // Check if the response indicates failure
        if (data.success === false) {
          console.error('Edge Function retornou falha:', data)
          const errorMessage = data?.error || 'Falha no processamento OCR'
          const errorType = data?.errorType || 'unknown'

          // Criar erro com mais contexto
          const error = new Error(errorMessage)
          ;(error as any).errorType = errorType
          ;(error as any).documentId = documentId
          throw error
        }

        // If data.success is not explicitly false, assume success
        // This handles cases where success might be undefined but data exists
        console.log('Resposta da Edge Function:', data)
        return data as PDFOCRResult

      } catch (error: any) {
        console.error('Erro no OCR:', error)

        // Enhanced error logging for debugging
        console.error('OCR Error Details:', {
          message: error.message,
          stack: error.stack,
          documentId,
          fileName,
          filePath
        })

        throw error
      } finally {
        setIsProcessing(false)
      }
    },
    onSuccess: (result) => {
      toast.success(
        `OCR concluído com sucesso! Método: ${result.method}, Confiança: ${Math.round(result.confidence * 100)}%`
      )
    },
    onError: (error: any) => {
      console.error('Erro no processamento OCR:', error)

      // Show user-friendly error message
      const userMessage = error.message || 'Erro desconhecido no processamento OCR'
      toast.error(`Erro no OCR: ${userMessage}`)

      // Additional logging for debugging
      if (error.cause) {
        console.error('Error cause:', error.cause)
      }
    }
  })

  /**
   * Reprocessa um documento com configurações diferentes
   */
  const reprocessDocument = useMutation({
    mutationFn: async ({
      documentId,
      filePath,
      fileName,
      forceOCR = true,
      quality = 'high'
    }: {
      documentId: string
      filePath: string
      fileName: string
      forceOCR?: boolean
      quality?: 'low' | 'medium' | 'high'
    }) => {
      return processPDF.mutateAsync({
        documentId,
        filePath,
        fileName,
        options: {
          forceOCR,
          quality,
          enableCache: false // Não usar cache para reprocessamento
        }
      })
    },
    onSuccess: () => {
      toast.success('Documento reprocessado com sucesso!')
    }
  })

  return {
    processPDF: processPDF.mutateAsync,
    reprocessDocument: reprocessDocument.mutateAsync,
    isProcessing: isProcessing || processPDF.isPending || reprocessDocument.isPending,
    error: processPDF.error || reprocessDocument.error
  }
}

/**
 * Hook para obter métricas de OCR
 */
export function useOCRMetrics(dateRange?: { start: Date; end: Date }) {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['ocr-metrics', dateRange],
    queryFn: async (): Promise<OCRMetrics> => {
      const { data, error } = await supabase.rpc('get_ocr_statistics', {
        start_date: dateRange?.start?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: dateRange?.end?.toISOString() || new Date().toISOString()
      })

      if (error) {
        throw new Error(`Erro ao buscar métricas: ${error.message}`)
      }

      return data[0] || {
        totalDocuments: 0,
        nativeExtraction: 0,
        ocrExtraction: 0,
        hybridExtraction: 0,
        avgConfidence: 0,
        avgProcessingTime: 0,
        successRate: 0,
        documentsWithStructuredData: 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000 // 10 minutos
  })
}

/**
 * Hook para obter qualidade por método
 */
export function useOCRQualityByMethod() {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['ocr-quality-by-method'],
    queryFn: async (): Promise<OCRQualityByMethod[]> => {
      const { data, error } = await supabase.rpc('get_ocr_quality_by_method')

      if (error) {
        throw new Error(`Erro ao buscar qualidade por método: ${error.message}`)
      }

      return data || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchInterval: 15 * 60 * 1000 // 15 minutos
  })
}

/**
 * Hook para obter histórico de processamento de um documento
 */
export function useDocumentOCRHistory(documentId: string) {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['document-ocr-history', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdf_ocr_metrics')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`)
      }

      return data
    },
    enabled: !!documentId,
    staleTime: 2 * 60 * 1000 // 2 minutos
  })
}

/**
 * Hook para limpar cache de OCR
 */
export function useOCRCacheManagement() {
  const supabase = createBrowserSupabaseClient()

  const clearExpiredCache = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cleanup_expired_ocr_cache')

      if (error) {
        throw new Error(`Erro ao limpar cache: ${error.message}`)
      }

      return data
    },
    onSuccess: (deletedCount) => {
      toast.success(`Cache limpo: ${deletedCount} entradas removidas`)
    },
    onError: (error) => {
      toast.error(`Erro ao limpar cache: ${error.message}`)
    }
  })

  const clearAllCache = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('pdf_ocr_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) {
        throw new Error(`Erro ao limpar todo o cache: ${error.message}`)
      }
    },
    onSuccess: () => {
      toast.success('Todo o cache foi limpo')
    },
    onError: (error) => {
      toast.error(`Erro ao limpar cache: ${error.message}`)
    }
  })

  return {
    clearExpiredCache: clearExpiredCache.mutateAsync,
    clearAllCache: clearAllCache.mutateAsync,
    isClearing: clearExpiredCache.isPending || clearAllCache.isPending
  }
}

/**
 * Hook para estatísticas de performance
 */
export function useOCRPerformanceStats() {
  const supabase = createBrowserSupabaseClient()

  return useQuery({
    queryKey: ['ocr-performance-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ocr_performance_summary')
        .select('*')
        .order('date', { ascending: false })
        .limit(30) // Últimos 30 dias

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`)
      }

      return data
    },
    staleTime: 15 * 60 * 1000, // 15 minutos
    refetchInterval: 30 * 60 * 1000 // 30 minutos
  })
}

/**
 * Utilitários para formatação
 */
export const ocrUtils = {
  formatConfidence: (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`
  },

  formatProcessingTime: (timeMs: number): string => {
    if (timeMs < 1000) return `${timeMs}ms`
    if (timeMs < 60000) return `${(timeMs / 1000).toFixed(1)}s`
    return `${(timeMs / 60000).toFixed(1)}min`
  },

  getMethodLabel: (method: string): string => {
    const labels = {
      native: 'Extração Nativa',
      ocr: 'OCR',
      hybrid: 'Híbrido',
      error: 'Erro'
    }
    return labels[method as keyof typeof labels] || method
  },

  getMethodColor: (method: string): string => {
    const colors = {
      native: 'text-green-600',
      ocr: 'text-blue-600',
      hybrid: 'text-purple-600',
      error: 'text-red-600'
    }
    return colors[method as keyof typeof colors] || 'text-gray-600'
  },

  getConfidenceColor: (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    if (confidence >= 0.5) return 'text-orange-600'
    return 'text-red-600'
  }
}
