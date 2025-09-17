'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { ocrService, type OCRResult } from '@/services/ocr-service'
import { toast } from 'sonner'
import type { DocumentoUploadPrazo } from '@/types/prazo-fiscal'

// =====================================================
// INTERFACES
// =====================================================

export interface UploadPrazoFiscalResult {
  success: boolean
  documentoId: string
  prazosDetectados: PrazoDetectado[]
  ocrResult: OCRResult
  confidence: number
  processingTime: number
  error?: string
}

export interface PrazoDetectado {
  tipo_obrigacao: string
  descricao: string
  data_vencimento: string
  valor_estimado?: number
  competencia?: string
  codigo_receita?: string
  confidence: number
}

export interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'extracting' | 'completed' | 'error'
  progress: number
  message: string
  currentStep?: string
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useUploadPrazoFiscal() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    message: 'Aguardando upload...'
  })

  const queryClient = useQueryClient()
  const supabase = createBrowserSupabaseClient()

  /**
   * Detecta tipo de documento fiscal baseado no nome do arquivo
   */
  const detectarTipoDocumento = (fileName: string): string => {
    const name = fileName.toLowerCase()
    
    if (name.includes('das')) return 'DAS'
    if (name.includes('gps')) return 'GPS'
    if (name.includes('darf')) return 'DARF'
    if (name.includes('gare')) return 'GARE'
    if (name.includes('gnre')) return 'GNRE'
    if (name.includes('nfe') || name.includes('danfe')) return 'NFe'
    if (name.includes('nfse') || name.includes('danfse')) return 'NFSe'
    if (name.includes('cte') || name.includes('dacte')) return 'CTe'
    if (name.includes('esocial')) return 'ESOCIAL'
    if (name.includes('sped')) return 'SPED_FISCAL'
    if (name.includes('dirf')) return 'DIRF'
    if (name.includes('defis')) return 'DEFIS'
    if (name.includes('ecf')) return 'ECF'
    if (name.includes('extrato')) return 'EXTRATO_BANCARIO'
    
    return 'DOCUMENTO_FISCAL'
  }

  /**
   * Extrai prazos fiscais do resultado do OCR
   */
  const extrairPrazos = async (ocrResult: OCRResult, tipoDocumento: string): Promise<PrazoDetectado[]> => {
    const prazos: PrazoDetectado[] = []

    // Usar dados estruturados se disponíveis
    if (ocrResult.dados_estruturados?.datas_importantes) {
      for (const data of ocrResult.dados_estruturados.datas_importantes) {
        if (data.tipo === 'vencimento') {
          prazos.push({
            tipo_obrigacao: tipoDocumento,
            descricao: `${tipoDocumento} - Vencimento`,
            data_vencimento: data.data,
            confidence: 0.9
          })
        }
      }
    }

    // Usar valores monetários se disponíveis
    if (ocrResult.dados_estruturados?.valores_monetarios) {
      const valorPrincipal = ocrResult.dados_estruturados.valores_monetarios
        .find(v => v.descricao.toLowerCase().includes('total') || v.descricao.toLowerCase().includes('valor'))

      if (valorPrincipal && valorPrincipal.valor && prazos.length > 0 && prazos[0]) {
        prazos[0].valor_estimado = valorPrincipal.valor
      }
    }

    // Se não encontrou prazos estruturados, tentar extrair do texto
    if (prazos.length === 0) {
      const texto = ocrResult.texto_extraido.toLowerCase()
      
      // Buscar padrões de data de vencimento
      const regexVencimento = /vencimento[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi
      const matchesVencimento = texto.match(regexVencimento)
      
      if (matchesVencimento) {
        for (const match of matchesVencimento) {
          const dataMatch = match.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
          if (dataMatch && dataMatch[1]) {
            prazos.push({
              tipo_obrigacao: tipoDocumento,
              descricao: `${tipoDocumento} - Vencimento detectado`,
              data_vencimento: dataMatch[1].replace(/\-/g, '/'),
              confidence: 0.7
            })
          }
        }
      }
    }

    return prazos
  }

  /**
   * Salva prazos detectados no banco de dados
   */
  const salvarPrazos = async (prazos: PrazoDetectado[], empresaId: string, documentoId: string) => {
    for (const prazo of prazos) {
      // Converter data para formato ISO
      const partesData = prazo.data_vencimento.split('/')
      if (partesData.length !== 3) continue

      const [dia, mes, ano] = partesData
      if (!dia || !mes || !ano) continue

      const dataVencimento = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))

      const { error } = await supabase
        .from('fiscal_obligations')
        .insert({
          empresa_id: empresaId,
          name: prazo.descricao,
          description: `Prazo extraído automaticamente do documento`,
          obligation_type: prazo.tipo_obrigacao,
          due_date: dataVencimento.toISOString().split('T')[0],
          estimated_amount: prazo.valor_estimado || 0,
          priority: 'medium',
          status: 'pending',
          alert_days_before: 7,
          metadata: {
            documento_origem: documentoId,
            confidence: prazo.confidence,
            competencia: prazo.competencia,
            codigo_receita: prazo.codigo_receita,
            extraido_automaticamente: true
          }
        })

      if (error) {
        console.error('Erro ao salvar prazo:', error)
        throw new Error(`Erro ao salvar prazo: ${error.message}`)
      }
    }
  }

  /**
   * Mutation principal para upload e processamento
   */
  const uploadMutation = useMutation({
    mutationFn: async (data: DocumentoUploadPrazo): Promise<UploadPrazoFiscalResult> => {
      const startTime = Date.now()
      
      try {
        // 1. Upload do arquivo
        setUploadStatus({
          status: 'uploading',
          progress: 10,
          message: 'Fazendo upload do arquivo...',
          currentStep: 'upload'
        })

        const fileExt = data.arquivo.name.split('.').pop()
        const fileName = `prazos-fiscais/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(fileName, data.arquivo, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Erro no upload: ${uploadError.message}`)
        }

        // 2. Salvar documento no banco
        setUploadStatus({
          status: 'processing',
          progress: 30,
          message: 'Salvando informações do documento...',
          currentStep: 'database'
        })

        const tipoDetectado = detectarTipoDocumento(data.arquivo.name)

        const { data: documento, error: dbError } = await supabase
          .from('documentos')
          .insert({
            empresa_id: data.empresa_id,
            nome_arquivo: data.arquivo.name,
            caminho_arquivo: fileName,
            tipo_documento: tipoDetectado,
            tamanho_arquivo: data.arquivo.size,
            tipo_mime: data.arquivo.type,
            numero_documento: data.numero_documento,
            data_emissao: data.data_emissao,
            valor_total: data.valor_total,
            observacoes: data.observacoes,
            status: 'processando',
            metadata: {
              auto_extract_prazo: data.auto_extract_prazo || true,
              origem: 'upload_prazo_fiscal'
            }
          })
          .select()
          .single()

        if (dbError) {
          throw new Error(`Erro ao salvar documento: ${dbError.message}`)
        }

        // 3. Processar com OCR
        setUploadStatus({
          status: 'extracting',
          progress: 50,
          message: 'Extraindo texto do documento...',
          currentStep: 'ocr'
        })

        // Converter arquivo para buffer
        const arrayBuffer = await data.arquivo.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)

        const ocrResult = await ocrService.processDocument(fileBuffer, data.arquivo.name, tipoDetectado)

        // 4. Extrair prazos
        setUploadStatus({
          status: 'extracting',
          progress: 70,
          message: 'Detectando prazos fiscais...',
          currentStep: 'extraction'
        })

        const prazosDetectados = await extrairPrazos(ocrResult, tipoDetectado)

        // 5. Salvar prazos se habilitado
        if (data.auto_extract_prazo && prazosDetectados.length > 0) {
          setUploadStatus({
            status: 'processing',
            progress: 90,
            message: 'Salvando prazos detectados...',
            currentStep: 'saving'
          })

          await salvarPrazos(prazosDetectados, data.empresa_id, documento.id)
        }

        // 6. Atualizar status do documento
        await supabase
          .from('documentos')
          .update({
            status: 'processado',
            texto_extraido: ocrResult.texto_extraido,
            dados_estruturados: ocrResult.dados_estruturados,
            confidence: ocrResult.confianca,
            metadata: {
              ...documento.metadata,
              prazos_detectados: prazosDetectados.length,
              processing_time_ms: Date.now() - startTime
            }
          })
          .eq('id', documento.id)

        setUploadStatus({
          status: 'completed',
          progress: 100,
          message: `Processamento concluído! ${prazosDetectados.length} prazo(s) detectado(s).`,
          currentStep: 'completed'
        })

        return {
          success: true,
          documentoId: documento.id,
          prazosDetectados,
          ocrResult,
          confidence: ocrResult.confianca,
          processingTime: Date.now() - startTime
        }

      } catch (error: any) {
        setUploadStatus({
          status: 'error',
          progress: 0,
          message: `Erro: ${error.message}`,
          currentStep: 'error'
        })
        
        throw error
      }
    },
    onSuccess: (result) => {
      toast.success(`Upload concluído! ${result.prazosDetectados.length} prazo(s) detectado(s).`)
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['prazos'] })
      queryClient.invalidateQueries({ queryKey: ['estatisticas-prazos'] })
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
    },
    onError: (error: any) => {
      toast.error(`Erro no upload: ${error.message}`)
    }
  })

  return {
    upload: uploadMutation.mutateAsync,
    uploadStatus,
    isUploading: uploadMutation.isPending,
    error: uploadMutation.error,
    reset: () => {
      uploadMutation.reset()
      setUploadStatus({
        status: 'idle',
        progress: 0,
        message: 'Aguardando upload...'
      })
    }
  }
}
