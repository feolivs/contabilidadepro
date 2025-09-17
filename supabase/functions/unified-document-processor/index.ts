/**
 * 📄 UNIFIED DOCUMENT PROCESSOR - ContábilPRO ERP
 * 
 * Edge Function unificada que substitui TODAS as functions de processamento:
 * - document-processor (OCR + classificação)
 * - document-service (upload + processamento)
 * - process-document (processamento básico)
 * 
 * BENEFÍCIOS:
 * - 1 function ao invés de 3
 * - Lógica centralizada e consistente
 * - Menor latência (sem chamadas entre functions)
 * - Manutenção simplificada
 */ import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withValidation, createSuccessResponse, createErrorResponse } from '../_shared/validation-middleware.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { monitorDatabase, recordCustomMetric } from '../_shared/apm-monitor.ts';
// =====================================================
// SCHEMA UNIFICADO DE VALIDAÇÃO
// =====================================================
const UnifiedDocumentSchema = z.object({
  action: z.enum([
    'upload',
    'ocr',
    'classify',
    'process_complete',
    'approve',
    'status'
  ]),
  // Dados do arquivo
  file_name: z.string().min(1, 'Nome do arquivo é obrigatório'),
  file_path: z.string().optional(),
  file_size: z.number().positive().optional(),
  mime_type: z.string().optional(),
  // Dados do documento
  document_id: z.string().uuid().optional(),
  empresa_id: z.string().uuid().optional(),
  tipo_documento: z.string().optional(),
  // Para OCR
  image_data: z.string().optional(),
  // Para classificação
  text_content: z.string().optional(),
  // Para aprovação
  approval_data: z.object({
    approved: z.boolean(),
    notes: z.string().optional(),
    reviewer_id: z.string().uuid().optional()
  }).optional(),
  // Opções de processamento
  options: z.object({
    auto_classify: z.boolean().default(true),
    auto_extract: z.boolean().default(true),
    confidence_threshold: z.number().min(0).max(1).default(0.7),
    language: z.enum([
      'pt',
      'en',
      'es'
    ]).default('pt'),
    extract_tables: z.boolean().default(true),
    quality: z.enum([
      'low',
      'medium',
      'high'
    ]).default('high')
  }).optional().default({})
});
// =====================================================
// FUNÇÃO PRINCIPAL UNIFICADA
// =====================================================
export default withValidation({
  _schema: UnifiedDocumentSchema,
  context: 'unified-document-processor',
  _requireAuth: true,
  _requireUserId: true
}, async (data, metadata)=>{
  const { action, file_name } = data;
  const startTime = Date.now();
  console.log(`[UNIFIED_PROCESSOR] Ação: ${action}, Arquivo: ${file_name}`, {
    user_id: metadata.user_id,
    trace_id: metadata.trace_id
  });
  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  try {
    let result;
    switch(action){
      case 'upload':
        result = await handleUpload(supabaseClient, data, metadata);
        break;
      case 'ocr':
        result = await handleOCR(supabaseClient, data, metadata);
        break;
      case 'classify':
        result = await handleClassification(supabaseClient, data, metadata);
        break;
      case 'process_complete':
        result = await handleCompleteProcessing(supabaseClient, data, metadata);
        break;
      case 'approve':
        result = await handleApproval(supabaseClient, data, metadata);
        break;
      case 'status':
        result = await handleStatusCheck(supabaseClient, data, metadata);
        break;
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
    const processingTime = Date.now() - startTime;
    result.processing_time = processingTime;
    recordCustomMetric(`unified_processor_${action}_success`, 1);
    recordCustomMetric('unified_processor_processing_time', processingTime);
    return createSuccessResponse(result);
  } catch (error) {
    console.error('[UNIFIED_PROCESSOR_ERROR]', {
      action,
      file_name,
      error: error.message,
      trace_id: metadata.trace_id
    });
    recordCustomMetric(`unified_processor_${action}_error`, 1);
    return createErrorResponse(error.message, 500);
  }
});
// =====================================================
// HANDLERS ESPECÍFICOS
// =====================================================
async function handleUpload(supabase, data, metadata) {
  const { file_name, file_path, empresa_id, tipo_documento } = data;
  // Criar registro do documento
  const { data: document, error } = await monitorDatabase(metadata.trace_id, 'Create document record', ()=>supabase.from('documentos_fiscais').insert({
      nome_arquivo: file_name,
      caminho_arquivo: file_path,
      empresa_id,
      user_id: metadata.user_id,
      tipo_documento: tipo_documento || 'unknown',
      status: 'uploaded',
      created_at: new Date().toISOString()
    }).select().single());
  if (error) throw error;
  return {
    success: true,
    document_id: document.id,
    status: 'uploaded'
  };
}
async function handleOCR(supabase, data, metadata) {
  const { document_id, image_data, options = {} } = data;
  // Simular OCR (em produção, usar Google Vision API)
  const mockOCRResult = {
    text: `Documento processado via OCR
    Data: ${new Date().toLocaleDateString('pt-BR')}
    Conteúdo extraído automaticamente
    Qualidade: ${options.quality || 'high'}
    Idioma: ${options.language || 'pt'}`,
    tables: options.extract_tables ? [
      {
        rows: [
          [
            'Item',
            'Valor'
          ],
          [
            'Produto A',
            'R$ 100,00'
          ]
        ],
        confidence: 0.95
      }
    ] : [],
    entities: [
      {
        type: 'CNPJ',
        value: '12.345.678/0001-90',
        confidence: 0.9
      },
      {
        type: 'VALOR',
        value: 'R$ 100,00',
        confidence: 0.85
      }
    ]
  };
  // Atualizar documento com dados extraídos
  if (document_id) {
    await monitorDatabase(metadata.trace_id, 'Update document with OCR data', ()=>supabase.from('documentos_fiscais').update({
        dados_extraidos: mockOCRResult,
        status: 'ocr_completed',
        updated_at: new Date().toISOString()
      }).eq('id', document_id));
  }
  return {
    success: true,
    document_id,
    extracted_data: mockOCRResult,
    status: 'ocr_completed'
  };
}
async function handleClassification(supabase, data, metadata) {
  const { document_id, text_content, options = {} } = data;
  // Simular classificação (em produção, usar OpenAI)
  const mockClassification = {
    tipo_documento: 'nota_fiscal',
    confidence: 0.92,
    metadata: {
      categoria: 'fiscal',
      subcategoria: 'entrada',
      urgencia: 'normal'
    }
  };
  // Atualizar documento com classificação
  if (document_id) {
    await monitorDatabase(metadata.trace_id, 'Update document with classification', ()=>supabase.from('documentos_fiscais').update({
        tipo_documento: mockClassification.tipo_documento,
        confidence_score: mockClassification.confidence,
        metadata: mockClassification.metadata,
        status: 'classified',
        updated_at: new Date().toISOString()
      }).eq('id', document_id));
  }
  return {
    success: true,
    document_id,
    classification: mockClassification,
    status: 'classified'
  };
}
async function handleCompleteProcessing(supabase, data, metadata) {
  // Executar OCR + Classificação em sequência
  const ocrResult = await handleOCR(supabase, data, metadata);
  const classificationData = {
    ...data,
    text_content: ocrResult.extracted_data?.text
  };
  const classificationResult = await handleClassification(supabase, classificationData, metadata);
  return {
    success: true,
    document_id: data.document_id,
    extracted_data: ocrResult.extracted_data,
    classification: classificationResult.classification,
    status: 'processed'
  };
}
async function handleApproval(supabase, data, metadata) {
  const { document_id, approval_data } = data;
  await monitorDatabase(metadata.trace_id, 'Update document approval', ()=>supabase.from('documentos_fiscais').update({
      status: approval_data.approved ? 'approved' : 'rejected',
      approval_notes: approval_data.notes,
      approved_by: approval_data.reviewer_id || metadata.user_id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', document_id));
  return {
    success: true,
    document_id,
    status: approval_data.approved ? 'approved' : 'rejected'
  };
}
async function handleStatusCheck(supabase, data, metadata) {
  const { document_id } = data;
  const { data: document, error } = await monitorDatabase(metadata.trace_id, 'Get document status', ()=>supabase.from('documentos_fiscais').select('id, status, tipo_documento, confidence_score, created_at, updated_at').eq('id', document_id).single());
  if (error) throw error;
  return {
    success: true,
    document_id,
    status: document.status
  };
}
