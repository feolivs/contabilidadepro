/**
 * 🚀 USE DOCUMENT PROCESSOR UNIFIED - ContabilidadePRO
 * Hook para usar a nova Edge Function unificada de processamento de documentos
 * Suporte para extração universal de dados com IA avançada
 */

import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { logger } from '@/lib/simple-logger'

// Interfaces
export interface UnifiedDocumentRequest {
  action: 'upload' | 'process_ocr' | 'extract_data' | 'classify' | 'analyze' | 'status' | 'reprocess'
  documentId?: string
  filePath?: string
  fileName?: string
  fileBuffer?: string // base64
  mimeType?: string
  options?: {
    language?: string
    quality?: 'low' | 'medium' | 'high'
    extractTables?: boolean
    enableCache?: boolean
    documentType?: string
    extractionMode?: 'basic' | 'advanced' | 'complete'
    enableAI?: boolean
  }
}

export interface UniversalExtractionResult {
  success: boolean
  documentId: string
  processingStages: {
    ocr: OCRStageResult
    regex: RegexStageResult
    ai: AIStageResult
    validation: ValidationStageResult
  }
  extractedData: UniversalDocumentData
  metadata: ProcessingMetadata
  confidence: number
  processingTime: number
}

export interface UniversalDocumentData {
  raw_text: string
  document_type: string
  confidence_score: number
  entities: ExtractedEntity[]
  financial_data: FinancialData[]
  dates: ExtractedDate[]
  addresses: ExtractedAddress[]
  contacts: ExtractedContact[]
  fiscal_data?: FiscalDocumentData
  contract_data?: ContractData
  receipt_data?: ReceiptData
  additional_fields: Record<string, any>
  relationships: DataRelationship[]
  insights: string[]
}

export interface ExtractedEntity {
  type: 'person' | 'company' | 'product' | 'service' | 'location' | 'other'
  value: string
  confidence: number
  context: string
  position: { start: number, end: number }
}

export interface FinancialData {
  type: 'total' | 'subtotal' | 'tax' | 'discount' | 'fee' | 'other'
  value: number
  currency: string
  description: string
  confidence: number
}

export interface ExtractedDate {
  type: 'emission' | 'due' | 'payment' | 'validity' | 'other'
  date: string
  confidence: number
  context: string
}

export interface ExtractedContact {
  type: 'email' | 'phone' | 'website' | 'other'
  value: string
  confidence: number
  context: string
}

export interface ExtractedAddress {
  type: 'billing' | 'shipping' | 'company' | 'other'
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  confidence: number
  context: string
}

export interface FiscalDocumentData {
  documentType: string
  documentNumber: string
  issuer: string
  recipient: string
  totalValue: number
  taxValue: number
  issueDate: string
  dueDate?: string
}

export interface ContractData {
  contractType: string
  parties: string[]
  startDate: string
  endDate?: string
  value?: number
  terms: string[]
}

export interface ReceiptData {
  receiptNumber: string
  vendor: string
  date: string
  totalAmount: number
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

export interface DataRelationship {
  type: 'references' | 'contains' | 'related_to' | 'part_of'
  source: string
  target: string
  confidence: number
  description: string
}

// Interfaces auxiliares
interface OCRStageResult {
  text: string
  confidence: number
  provider: string
  metadata: any
}

interface RegexStageResult {
  patterns_found: string[]
  extracted_data: Record<string, any[]>
  document_type: string
  total_matches: number
  confidence: number
}

interface AIStageResult {
  provider: string
  entities: ExtractedEntity[]
  insights: string[]
  structured_data: Record<string, any>
  confidence: number
}

interface ValidationStageResult {
  errors: string[]
  warnings: string[]
  enrichments: string[]
  validation_score: number
  is_valid: boolean
}

interface ProcessingMetadata {
  fileName: string
  mimeType: string
  fileSize: number
  extractionMode: string
  timestamp: string
  providers_used: string[]
}

/**
 * 🎯 Hook principal para processamento unificado
 */
export function useDocumentProcessorUnified() {
  const [processingStatus, setProcessingStatus] = useState<{
    stage: string
    progress: number
    message: string
  } | null>(null)

  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  /**
   * 📤 Upload e processamento completo
   */
  const uploadAndProcess = useMutation({
    mutationFn: async ({
      file,
      documentType,
      extractionMode = 'complete',
      enableAI = true
    }: {
      file: File
      documentType?: string
      extractionMode?: 'basic' | 'advanced' | 'complete'
      enableAI?: boolean
    }): Promise<UniversalExtractionResult> => {
      
      if (!user) throw new Error('Usuário não autenticado')

      logger.info('Iniciando upload e processamento unificado', {
        fileName: file.name,
        fileSize: file.size,
        extractionMode,
        enableAI
      })

      setProcessingStatus({
        stage: 'uploading',
        progress: 10,
        message: 'Fazendo upload do arquivo...'
      })

      // 1. Upload para storage
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }

      setProcessingStatus({
        stage: 'creating_record',
        progress: 20,
        message: 'Criando registro no banco...'
      })

      // 2. Criar registro no banco
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
        throw new Error(`Erro ao criar documento: ${dbError.message}`)
      }

      setProcessingStatus({
        stage: 'processing',
        progress: 30,
        message: 'Processando com IA...'
      })

      // 3. Processar com Edge Function unificada
      const { data, error } = await supabase.functions.invoke('document-processor-unified', {
        body: {
          action: 'process_ocr',
          documentId: documento.id,
          filePath: uploadData.path,
          fileName: file.name,
          options: {
            language: 'por',
            quality: 'high',
            extractTables: true,
            enableCache: true,
            documentType,
            extractionMode,
            enableAI
          }
        }
      })

      if (error) {
        throw new Error(`Erro no processamento: ${error.message}`)
      }

      setProcessingStatus({
        stage: 'complete',
        progress: 100,
        message: 'Processamento concluído!'
      })

      logger.info('Processamento unificado concluído', {
        documentId: documento.id,
        confidence: data.data.confidence,
        entitiesFound: data.data.extractedData.entities?.length || 0
      })

      return data.data
    },
    onError: (error) => {
      logger.error('Erro no processamento unificado', { error: error.message })
      setProcessingStatus(null)
    },
    onSuccess: () => {
      setTimeout(() => setProcessingStatus(null), 3000)
    }
  })

  /**
   * 🔍 Processar OCR apenas
   */
  const processOCR = useMutation({
    mutationFn: async ({
      documentId,
      options = {}
    }: {
      documentId: string
      options?: UnifiedDocumentRequest['options']
    }) => {
      const { data, error } = await supabase.functions.invoke('document-processor-unified', {
        body: {
          action: 'process_ocr',
          documentId,
          options: {
            language: 'por',
            quality: 'high',
            extractionMode: 'complete',
            enableAI: true,
            ...options
          }
        }
      })

      if (error) throw error
      return data.data
    }
  })

  /**
   * 📊 Extrair dados estruturados
   */
  const extractData = useMutation({
    mutationFn: async ({
      documentId,
      options = {}
    }: {
      documentId: string
      options?: UnifiedDocumentRequest['options']
    }) => {
      const { data, error } = await supabase.functions.invoke('document-processor-unified', {
        body: {
          action: 'extract_data',
          documentId,
          options
        }
      })

      if (error) throw error
      return data.data
    }
  })

  /**
   * 🏷️ Classificar documento
   */
  const classifyDocument = useMutation({
    mutationFn: async ({
      documentId,
      fileName
    }: {
      documentId: string
      fileName?: string
    }) => {
      const { data, error } = await supabase.functions.invoke('document-processor-unified', {
        body: {
          action: 'classify',
          documentId,
          fileName
        }
      })

      if (error) throw error
      return data.data
    }
  })

  /**
   * 🧠 Análise avançada com IA
   */
  const analyzeDocument = useMutation({
    mutationFn: async ({
      documentId,
      options = {}
    }: {
      documentId: string
      options?: UnifiedDocumentRequest['options']
    }) => {
      const { data, error } = await supabase.functions.invoke('document-processor-unified', {
        body: {
          action: 'analyze',
          documentId,
          options
        }
      })

      if (error) throw error
      return data.data
    }
  })

  /**
   * 🔄 Reprocessar documento
   */
  const reprocessDocument = useMutation({
    mutationFn: async ({
      documentId,
      options = {}
    }: {
      documentId: string
      options?: UnifiedDocumentRequest['options']
    }) => {
      const { data, error } = await supabase.functions.invoke('document-processor-unified', {
        body: {
          action: 'reprocess',
          documentId,
          options: {
            extractionMode: 'complete',
            enableAI: true,
            ...options
          }
        }
      })

      if (error) throw error
      return data.data
    }
  })

  /**
   * 📊 Verificar status
   */
  const getDocumentStatus = useCallback(async (documentId: string) => {
    const { data, error } = await supabase.functions.invoke('document-processor-unified', {
      body: {
        action: 'status',
        documentId
      }
    })

    if (error) throw error
    return data.data
  }, [supabase])

  return {
    // Mutations
    uploadAndProcess,
    processOCR,
    extractData,
    classifyDocument,
    analyzeDocument,
    reprocessDocument,

    // Status
    processingStatus,
    getDocumentStatus,

    // Estados
    isProcessing: uploadAndProcess.isPending || processOCR.isPending || extractData.isPending,
    error: uploadAndProcess.error || processOCR.error || extractData.error
  }
}
