/**
 * 📄 DOCUMENT SERVICE - Core Service Consolidado
 * ContábilPro ERP - Serviço unificado para processamento de documentos
 * 
 * CONSOLIDA:
 * - process-ocr
 * - classify-document  
 * - approve-document
 * - document-processing-orchestrator
 * - parse-xml-document
 * - webhook-documento-status
 */ import { withValidation } from '../_shared/validation-middleware.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getOptimizedConnection } from '../_shared/connection-pool.ts';
import { withAPM, monitorDatabase, recordCustomMetric } from '../_shared/apm-monitor.ts';
// =====================================================
// SCHEMAS DE VALIDAÇÃO
// =====================================================
const ProcessDocumentSchema = z.object({
  action: z.enum([
    'upload',
    'process',
    'classify',
    'approve',
    'reject',
    'status'
  ]),
  file_path: z.string().optional(),
  file_name: z.string().optional(),
  empresa_id: z.string().uuid().optional(),
  document_id: z.string().uuid().optional(),
  tipo_documento: z.string().optional(),
  approval_data: z.object({
    approved: z.boolean(),
    notes: z.string().optional()
  }).optional()
});
// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
export default withValidation({
  schema: ProcessDocumentSchema,
  context: 'document-service',
  requireAuth: true,
  requireUserId: true
}, async (data, metadata)=>{
  return await withAPM('document-service', async (traceId)=>{
    const { action } = data;
    const supabaseClient = await getOptimizedConnection('document-service');
    console.log(`[DOCUMENT_SERVICE] Ação: ${action}, User: ${metadata.user_id}`);
    recordCustomMetric('document_service_request', 1, {
      action
    });
    switch(action){
      case 'upload':
        return await handleUpload(supabaseClient, data, metadata, traceId);
      case 'process':
        return await handleProcess(supabaseClient, data, metadata, traceId);
      case 'classify':
        return await handleClassify(supabaseClient, data, metadata, traceId);
      case 'approve':
        return await handleApprove(supabaseClient, data, metadata, traceId);
      case 'reject':
        return await handleReject(supabaseClient, data, metadata, traceId);
      case 'status':
        return await handleStatus(supabaseClient, data, metadata, traceId);
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  }, {
    action: data.action,
    user_id: metadata.user_id
  });
});
// =====================================================
// HANDLERS ESPECÍFICOS
// =====================================================
/**
 * Handle Upload - Criar registro inicial do documento
 */ async function handleUpload(supabase, data, metadata, traceId) {
  const { file_path, file_name, empresa_id, tipo_documento } = data;
  try {
    // Criar registro do documento
    const { data: document, error } = await monitorDatabase(traceId, 'Create document record', ()=>supabase.from('documentos_fiscais').insert({
        nome_arquivo: file_name,
        caminho_arquivo: file_path,
        empresa_id,
        user_id: metadata.user_id,
        tipo_documento: tipo_documento || 'unknown',
        status: 'pendente',
        tamanho_arquivo: 0,
        created_at: new Date().toISOString()
      }).select().single());
    if (error) throw error;
    recordCustomMetric('document_upload_success', 1);
    return {
      success: true,
      document_id: document.id,
      status: 'pendente',
      processing_time: 0
    };
  } catch (error) {
    console.error('[DOCUMENT_UPLOAD_ERROR]', error);
    recordCustomMetric('document_upload_error', 1);
    throw error;
  }
}
/**
 * Handle Process - Executar OCR e extração de dados
 */ async function handleProcess(supabase, data, metadata, traceId) {
  const { document_id } = data;
  const startTime = Date.now();
  try {
    // Atualizar status para processando
    await monitorDatabase(traceId, 'Update document status to processing', ()=>supabase.from('documentos_fiscais').update({
        status: 'processando',
        updated_at: new Date().toISOString()
      }).eq('id', document_id));
    // Buscar dados do documento
    const { data: document, error: fetchError } = await monitorDatabase(traceId, 'Fetch document data', ()=>supabase.from('documentos_fiscais').select('*').eq('id', document_id).single());
    if (fetchError || !document) {
      throw new Error('Documento não encontrado');
    }
    // Determinar tipo de processamento
    let result;
    if (document.nome_arquivo.toLowerCase().endsWith('.xml')) {
      result = await processXMLDocument(supabase, document, traceId);
    } else {
      result = await processOCRDocument(supabase, document, traceId);
    }
    // Atualizar documento com resultado
    const updateData = {
      status: result.success ? 'processado' : 'erro',
      dados_extraidos: result.extracted_data,
      error_log: result.error,
      updated_at: new Date().toISOString()
    };
    await monitorDatabase(traceId, 'Update document with processing result', ()=>supabase.from('documentos_fiscais').update(updateData).eq('id', document_id));
    const processingTime = Date.now() - startTime;
    recordCustomMetric('document_processing_time', processingTime);
    recordCustomMetric('document_processing_success', result.success ? 1 : 0);
    return {
      ...result,
      processing_time: processingTime
    };
  } catch (error) {
    console.error('[DOCUMENT_PROCESS_ERROR]', error);
    // Atualizar status para erro
    await supabase.from('documentos_fiscais').update({
      status: 'erro',
      error_log: error.message,
      updated_at: new Date().toISOString()
    }).eq('id', document_id);
    recordCustomMetric('document_processing_error', 1);
    throw error;
  }
}
/**
 * Handle Classify - Classificar documento usando IA
 */ async function handleClassify(supabase, data, metadata, traceId) {
  const { document_id } = data;
  try {
    // Buscar documento
    const { data: document } = await supabase.from('documentos_fiscais').select('*').eq('id', document_id).single();
    if (!document) throw new Error('Documento não encontrado');
    // Classificar usando IA
    const classification = await classifyDocument(document, traceId);
    // Atualizar classificação
    await monitorDatabase(traceId, 'Update document classification', ()=>supabase.from('documentos_fiscais').update({
        tipo_documento: classification.tipo_documento,
        confidence_score: classification.confidence,
        metadata: classification.metadata,
        updated_at: new Date().toISOString()
      }).eq('id', document_id));
    recordCustomMetric('document_classification_success', 1);
    return {
      success: true,
      document_id,
      classification: classification.tipo_documento,
      confidence: classification.confidence
    };
  } catch (error) {
    console.error('[DOCUMENT_CLASSIFY_ERROR]', error);
    recordCustomMetric('document_classification_error', 1);
    throw error;
  }
}
/**
 * Handle Approve - Aprovar ou rejeitar documento
 */ async function handleApprove(supabase, data, metadata, traceId) {
  const { document_id, approval_data } = data;
  try {
    const status = approval_data.approved ? 'aprovado' : 'rejeitado';
    await monitorDatabase(traceId, 'Update document approval status', ()=>supabase.from('documentos_fiscais').update({
        status,
        approval_notes: approval_data.notes,
        approved_by: metadata.user_id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', document_id));
    // Log da aprovação
    await supabase.from('audit_logs').insert({
      user_id: metadata.user_id,
      action: approval_data.approved ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      resource_type: 'documento',
      resource_id: document_id,
      metadata: {
        notes: approval_data.notes,
        trace_id: traceId
      }
    });
    recordCustomMetric('document_approval', 1, {
      approved: approval_data.approved
    });
    return {
      success: true,
      document_id,
      status
    };
  } catch (error) {
    console.error('[DOCUMENT_APPROVE_ERROR]', error);
    recordCustomMetric('document_approval_error', 1);
    throw error;
  }
}
/**
 * Handle Reject - Rejeitar documento
 */ async function handleReject(supabase, data, metadata, traceId) {
  return await handleApprove(supabase, {
    ...data,
    approval_data: {
      approved: false,
      notes: data.rejection_reason
    }
  }, metadata, traceId);
}
/**
 * Handle Status - Verificar status do documento
 */ async function handleStatus(supabase, data, metadata, traceId) {
  const { document_id } = data;
  try {
    const { data: document, error } = await monitorDatabase(traceId, 'Fetch document status', ()=>supabase.from('documentos_fiscais').select('id, status, dados_extraidos, error_log, confidence_score, created_at, updated_at').eq('id', document_id).single());
    if (error || !document) {
      throw new Error('Documento não encontrado');
    }
    return {
      success: true,
      document_id,
      status: document.status,
      extracted_data: document.dados_extraidos,
      confidence: document.confidence_score,
      error: document.error_log
    };
  } catch (error) {
    console.error('[DOCUMENT_STATUS_ERROR]', error);
    throw error;
  }
}
// =====================================================
// FUNÇÕES DE PROCESSAMENTO
// =====================================================
/**
 * Processar documento XML (NFe, NFCe, CTe, etc.)
 */ async function processXMLDocument(supabase, document, traceId) {
  try {
    console.log(`[XML_PROCESSING] Processando XML: ${document.nome_arquivo}`);
    // Baixar arquivo do storage
    const { data: fileData } = await supabase.storage.from('documentos').download(document.caminho_arquivo);
    if (!fileData) throw new Error('Arquivo não encontrado no storage');
    // Converter para texto
    const xmlText = await fileData.text();
    // Parsear XML e extrair dados estruturados
    const extractedData = await parseXMLDocument(xmlText, document.tipo_documento);
    recordCustomMetric('xml_processing_success', 1);
    return {
      success: true,
      extracted_data: extractedData,
      confidence: 0.95
    };
  } catch (error) {
    console.error('[XML_PROCESSING_ERROR]', error);
    recordCustomMetric('xml_processing_error', 1);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Processar documento via OCR
 */ async function processOCRDocument(supabase, document, traceId) {
  try {
    console.log(`[OCR_PROCESSING] Processando via OCR: ${document.nome_arquivo}`);
    // Chamar Google Vision API
    const ocrResult = await performOCR(document.caminho_arquivo, traceId);
    // Extrair dados estruturados do texto
    const extractedData = await extractStructuredData(ocrResult.text, document.tipo_documento);
    recordCustomMetric('ocr_processing_success', 1);
    recordCustomMetric('ocr_confidence', ocrResult.confidence);
    return {
      success: true,
      extracted_data: extractedData,
      confidence: ocrResult.confidence
    };
  } catch (error) {
    console.error('[OCR_PROCESSING_ERROR]', error);
    recordCustomMetric('ocr_processing_error', 1);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Classificar documento usando IA
 */ async function classifyDocument(document, traceId) {
  try {
    // Usar nome do arquivo e dados extraídos para classificação
    const features = {
      filename: document.nome_arquivo,
      extracted_text: document.dados_extraidos?.text || '',
      file_size: document.tamanho_arquivo,
      mime_type: document.mime_type
    };
    // Classificação baseada em regras + IA
    const classification = await performAIClassification(features);
    recordCustomMetric('document_classification', 1, {
      tipo: classification.tipo_documento,
      confidence: classification.confidence
    });
    return classification;
  } catch (error) {
    console.error('[CLASSIFICATION_ERROR]', error);
    throw error;
  }
}
// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================
/**
 * Parsear documento XML
 */ async function parseXMLDocument(xmlText, tipoDocumento) {
  // Implementação simplificada - expandir conforme necessário
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  // Extrair dados básicos baseado no tipo
  switch(tipoDocumento){
    case 'nfe':
      return parseNFe(xmlDoc);
    case 'nfce':
      return parseNFCe(xmlDoc);
    case 'cte':
      return parseCTe(xmlDoc);
    default:
      return parseGenericXML(xmlDoc);
  }
}
/**
 * Executar OCR usando Google Vision API
 */ async function performOCR(filePath, traceId) {
  const startTime = Date.now();
  try {
    // Implementação do OCR - placeholder
    // Na implementação real, integraria com Google Vision API
    const mockResult = {
      text: 'Texto extraído via OCR',
      confidence: 0.85,
      structured_data: {},
      processing_time: Date.now() - startTime
    };
    return mockResult;
  } catch (error) {
    console.error('[OCR_ERROR]', error);
    throw error;
  }
}
/**
 * Extrair dados estruturados do texto OCR
 */ async function extractStructuredData(text, tipoDocumento) {
  // Usar regex e IA para extrair dados estruturados
  const extractors = {
    cnpj: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g,
    cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
    valor: /R\$\s*[\d.,]+/g,
    data: /\d{2}\/\d{2}\/\d{4}/g
  };
  const extracted = {};
  for (const [key, regex] of Object.entries(extractors)){
    const matches = text.match(regex);
    if (matches) {
      extracted[key] = matches[0];
    }
  }
  return extracted;
}
/**
 * Classificação por IA
 */ async function performAIClassification(features) {
  // Classificação baseada em regras simples
  // Na implementação real, usaria modelo de ML
  const filename = features.filename.toLowerCase();
  if (filename.includes('nfe') || filename.includes('nota fiscal eletronica')) {
    return {
      tipo_documento: 'nfe',
      confidence: 0.9,
      metadata: {
        source: 'filename_pattern'
      }
    };
  }
  if (filename.includes('nfce') || filename.includes('cupom fiscal')) {
    return {
      tipo_documento: 'nfce',
      confidence: 0.85,
      metadata: {
        source: 'filename_pattern'
      }
    };
  }
  return {
    tipo_documento: 'unknown',
    confidence: 0.5,
    metadata: {
      source: 'fallback'
    }
  };
}
/**
 * Parsers específicos para XML
 */ function parseNFe(xmlDoc) {
  // Implementação específica para NFe
  return {
    tipo: 'nfe',
    numero: 'extrair_do_xml',
    valor_total: 0,
    cnpj_emitente: 'extrair_do_xml'
  };
}
function parseNFCe(xmlDoc) {
  // Implementação específica para NFCe
  return {
    tipo: 'nfce',
    numero: 'extrair_do_xml',
    valor_total: 0
  };
}
function parseCTe(xmlDoc) {
  // Implementação específica para CTe
  return {
    tipo: 'cte',
    numero: 'extrair_do_xml'
  };
}
function parseGenericXML(xmlDoc) {
  // Parser genérico
  return {
    tipo: 'xml_generico',
    raw_data: xmlDoc.toString()
  };
}
