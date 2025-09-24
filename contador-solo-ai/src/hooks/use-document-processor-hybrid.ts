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

// Funções de mapeamento para tabela unificada
const mapDocumentCategory = (documentType?: string): 'fiscal' | 'contabil' | 'societario' | 'bancario' => {
  if (!documentType) return 'fiscal'

  const type = documentType.toLowerCase()
  if (type.includes('nf') || type.includes('fiscal') || type.includes('das') || type.includes('darf')) {
    return 'fiscal'
  }
  if (type.includes('contrato') || type.includes('ata') || type.includes('procuração')) {
    return 'societario'
  }
  if (type.includes('extrato') || type.includes('boleto') || type.includes('bancário')) {
    return 'bancario'
  }
  return 'contabil'
}

const mapDocumentType = (documentType?: string): string => {
  if (!documentType) return 'documento_generico'

  const mappings: Record<string, string> = {
    'NFe': 'nota_fiscal_eletronica',
    'NFCe': 'nota_fiscal_consumidor',
    'DAS': 'das_simples_nacional',
    'DARF': 'darf_federal',
    'GPS': 'gps_inss',
    'Boleto': 'boleto_bancario',
    'Recibo': 'recibo_pagamento',
    'Pró-labore': 'pro_labore',
    'Contrato': 'contrato_social',
    'Extrato': 'extrato_bancario',
    'Outro': 'documento_generico'
  }

  return mappings[documentType] || documentType.toLowerCase().replace(/\s+/g, '_')
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

      // 2. Criar registro na tabela unificada
      const { data: documento, error: dbError } = await supabase
        .from('documentos_unified')
        .insert({
          empresa_id: user.user_metadata?.empresa_id || user.id,
          user_id: user.id,
          categoria: mapDocumentCategory(documentType),
          tipo_documento: mapDocumentType(documentType),
          arquivo_nome: file.name,
          arquivo_tipo: file.type,
          arquivo_tamanho: file.size,
          arquivo_url: `${supabase.storage.from('documentos').getPublicUrl(filePath).data.publicUrl}`,
          arquivo_path: filePath,
          status_processamento: 'processando',
          metodo_processamento: 'hybrid_processor',
          dados_extraidos: {}
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

      // 4. Atualizar documento com dados extraídos na tabela unificada
      const result = data.data as UniversalExtractionResult

      await supabase
        .from('documentos_unified')
        .update({
          status_processamento: 'processado',
          confianca_extracao: result.confidence,
          data_processamento: new Date().toISOString(),
          metodo_processamento: 'hybrid_processor',
          dados_extraidos: {
            // Estrutura universal completa
            raw_text: result.extractedData.raw_text,
            document_type: result.extractedData.document_type,
            confidence_score: result.confidence,
            entities: result.extractedData.entities || [],
            financial_data: result.extractedData.financial_data || [],
            dates: result.extractedData.dates || [],
            contacts: result.extractedData.contacts || [],
            additional_fields: result.extractedData.additional_fields || {},
            relationships: result.extractedData.relationships || [],
            insights: [
              ...(result.extractedData.insights || []),
              `Processamento híbrido concluído com ${Math.round(result.confidence * 100)}% de confiança`,
              `${result.extractedData.entities?.length || 0} entidades identificadas`
            ],

            // Campos específicos para compatibilidade (mantidos no additional_fields)
            numero_documento: result.extractedData.entities?.find(e => e.type === 'other' && e.context?.includes('número'))?.value,
            valor_total: result.extractedData.financial_data?.find(f => f.type === 'total')?.value,
            data_emissao: result.extractedData.dates?.find(d => d.type === 'emission')?.date,
            empresa_emitente: result.extractedData.entities?.find(e => e.type === 'company')?.value,
            cnpj_emitente: result.extractedData.entities?.find(e => e.value?.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/))?.value,

            // Metadados do processamento
            extraction_method: 'hybrid_processor',
            processing_time: result.processingTime,
            providers_used: result.metadata?.providers_used || ['hybrid_ai']
          },
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
