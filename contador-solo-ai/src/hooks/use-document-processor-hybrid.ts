/**
 * 🔄 HOOK HÍBRIDO PARA PROCESSAMENTO DE DOCUMENTOS
 * Compatível com Edge Function otimizada e estrutura universal
 * Substitui use-document-processor-unified.ts com correções
 */

import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import { logger } from '@/lib/simple-logger'

// Interfaces compatíveis com frontend
export interface UnifiedDocumentRequest {
  action: 'upload' | 'process_ocr' | 'extract_data' | 'classify' | 'analyze' | 'status' | 'reprocess'
  documentId?: string
  filePath?: string
  fileName?: string
  fileBuffer?: string | number[] // Suporte a ambos os formatos
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
    ocr: { method: string, success: boolean }
    regex: { patterns_matched: number }
    ai: { enabled: boolean }
    validation: { is_valid: boolean }
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
  contacts: ExtractedContact[]
  additional_fields: Record<string, any>
  relationships: DataRelationship[]
  insights: string[]
}

export interface ExtractedEntity {
  type: 'person' | 'company' | 'product' | 'service' | 'location' | 'other'
  value: string
  confidence: number
  context: string
  position?: { start: number, end: number }
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
  type: 'phone' | 'email' | 'website'
  value: string
  confidence: number
  context: string
}

export interface DataRelationship {
  from_entity: string
  to_entity: string
  relationship_type: string
  confidence: number
}

export interface ProcessingMetadata {
  fileName: string
  mimeType?: string
  fileSize?: number
  extractionMode?: string
  timestamp: string
  providers_used: string[]
}

interface ProcessingStatus {
  stage: 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  message: string
  currentStep?: string
}

/**
 * 🚀 HOOK HÍBRIDO PRINCIPAL
 */
export function useDocumentProcessorHybrid() {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null)

  /**
   * 📤 Upload e processamento completo (HÍBRIDO)
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

      logger.info('Iniciando upload e processamento híbrido', {
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

      // 1. Upload para Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }

      setProcessingStatus({
        stage: 'processing',
        progress: 30,
        message: 'Criando registro no banco...'
      })

      // 2. Criar registro na tabela documentos
      const { data: documento, error: dbError } = await supabase
        .from('documentos')
        .insert({
          empresa_id: user.user_metadata?.empresa_id || user.id,
          tipo_documento: documentType || 'Outro',
          arquivo_nome: file.name,
          arquivo_tipo: file.type,
          arquivo_tamanho: file.size,
          arquivo_url: `${supabase.storage.from('documentos').getPublicUrl(filePath).data.publicUrl}`,
          arquivo_path: filePath,
          status_processamento: 'processando'
        })
        .select()
        .single()

      if (dbError || !documento) {
        throw new Error(`Erro ao criar registro: ${dbError?.message}`)
      }

      setProcessingStatus({
        stage: 'processing',
        progress: 60,
        message: 'Processando com IA...'
      })

      // 3. Processar com Edge Function híbrida
      const { data, error } = await supabase.functions.invoke('document-processor-unified', {
        body: {
          action: 'process_ocr',  // ✅ Agora suportado
          documentId: documento.id,
          filePath: filePath,
          fileName: file.name,
          mimeType: file.type,
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
        stage: 'processing',
        progress: 90,
        message: 'Salvando resultados...'
      })

      // 4. Atualizar documento com dados extraídos
      const result = data.data as UniversalExtractionResult
      
      await supabase
        .from('documentos')
        .update({
          status_processamento: 'processado',
          dados_extraidos: {
            // Manter compatibilidade com estrutura antiga
            confidence: result.confidence,
            extraction_method: 'hybrid_processor',
            extraction_confidence: result.confidence,

            // Novos dados universais
            raw_text: result.extractedData.raw_text,
            document_type: result.extractedData.document_type,
            entities: result.extractedData.entities,
            financial_data: result.extractedData.financial_data,
            dates: result.extractedData.dates,
            contacts: result.extractedData.contacts,
            additional_fields: result.extractedData.additional_fields,
            relationships: result.extractedData.relationships,
            insights: result.extractedData.insights,

            // Campos específicos para compatibilidade
            numero_documento: result.extractedData.entities?.find(e => e.type === 'other' && e.context.includes('número'))?.value,
            valor_total: result.extractedData.financial_data?.find(f => f.type === 'total')?.value,
            data_emissao: result.extractedData.dates?.find(d => d.type === 'emission')?.date,
            empresa_emitente: result.extractedData.entities?.find(e => e.type === 'company')?.value,
            cnpj_emitente: result.extractedData.entities?.find(e => e.value.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/))?.value
          },
          data_processamento: new Date().toISOString(),
          observacoes: `Processamento híbrido - Confiança: ${Math.round(result.confidence * 100)}% - ${result.extractedData.entities?.length || 0} entidades encontradas`,
          updated_at: new Date().toISOString()
        })
        .eq('id', documento.id)

      setProcessingStatus({
        stage: 'complete',
        progress: 100,
        message: 'Processamento concluído!'
      })

      logger.info('Processamento híbrido concluído', {
        documentId: documento.id,
        confidence: result.confidence,
        entitiesFound: result.extractedData.entities?.length || 0
      })

      // Retornar resultado com documentId correto
      return {
        ...result,
        documentId: documento.id
      }
    },
    onError: (error) => {
      logger.error('Erro no processamento híbrido', { error: error.message })
      setProcessingStatus({
        stage: 'error',
        progress: 0,
        message: `Erro: ${error.message}`
      })
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
  const getDocumentStatus = useCallback(async (documentId?: string) => {
    const { data, error } = await supabase.functions.invoke('document-processor-unified', {
      body: {
        action: 'status',
        documentId
      }
    })

    if (error) throw error
    return data.data || data
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
    isProcessing: uploadAndProcess.isPending || processOCR.isPending || extractData.isPending,
    error: uploadAndProcess.error || processOCR.error || extractData.error,

    // Utilities
    getDocumentStatus
  }
}
