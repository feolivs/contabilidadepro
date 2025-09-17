/**
 * 🧮 EDGE FUNCTION: GERAÇÃO AUTOMÁTICA DE LANÇAMENTOS CONTÁBEIS
 * 
 * Processa documentos aprovados e gera lançamentos contábeis automáticos
 * usando IA para classificação e regras contábeis brasileiras.
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
// =====================================================
// REGRAS CONTÁBEIS BRASILEIRAS
// =====================================================
const REGRAS_CONTABEIS = {
  'nfe_entrada': {
    // NFe de compra/entrada
    debito: '1.1.04.001',
    credito: '2.1.01.001',
    historico: (data)=>`Compra de mercadorias conforme NFe ${data.numero || 'N/A'} - ${data.fornecedor?.nome || 'Fornecedor'}`,
    valor: (data)=>data.valor_total || data.total || 0,
    confidence_boost: 0.1 // Regra bem estabelecida
  },
  'nfe_saida': {
    // NFe de venda/saída
    debito: '1.1.02.001',
    credito: '3.1.01.001',
    historico: (data)=>`Venda de mercadorias conforme NFe ${data.numero || 'N/A'} - ${data.cliente?.nome || 'Cliente'}`,
    valor: (data)=>data.valor_total || data.total || 0,
    confidence_boost: 0.1
  },
  'nfse': {
    // Nota Fiscal de Serviços
    debito: '1.1.02.001',
    credito: '3.1.02.001',
    historico: (data)=>`Prestação de serviços conforme NFSe ${data.numero || 'N/A'}`,
    valor: (data)=>data.valor_servicos || data.valor_total || 0,
    confidence_boost: 0.1
  },
  'recibo': {
    // Recibos diversos
    debito: '1.1.01.001',
    credito: '3.1.03.001',
    historico: (data)=>`Recebimento conforme recibo - ${data.descricao || 'Diversos'}`,
    valor: (data)=>data.valor || 0,
    confidence_boost: 0.05
  },
  'extrato_bancario': {
    // Movimentações bancárias
    debito: '1.1.01.002',
    credito: '3.1.03.001',
    historico: (data)=>`Movimentação bancária - ${data.descricao || data.historico || 'Diversos'}`,
    valor: (data)=>Math.abs(data.valor || 0),
    confidence_boost: 0.05
  },
  'default': {
    // Regra padrão para documentos não classificados
    debito: '1.1.01.001',
    credito: '3.1.03.001',
    historico: (data)=>`Lançamento automático - ${data.descricao || 'Documento processado'}`,
    valor: (data)=>data.valor || data.total || 100.00,
    confidence_boost: 0
  }
};
// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================
function determineAccountingRule(documento) {
  const tipo = documento.tipo_documento?.toLowerCase() || '';
  const classification = documento.ai_classification;
  // Verificar classificação da IA primeiro
  if (classification?.tipo_fiscal) {
    const tipoFiscal = classification.tipo_fiscal.toLowerCase();
    if (REGRAS_CONTABEIS[tipoFiscal]) {
      return REGRAS_CONTABEIS[tipoFiscal];
    }
  }
  // Fallback para tipo do documento
  if (tipo.includes('nfe')) {
    // Determinar se é entrada ou saída baseado nos dados
    const isEntrada = documento.ai_extracted_data?.tipo === 'entrada' || documento.ai_extracted_data?.operacao === 'compra';
    return isEntrada ? REGRAS_CONTABEIS['nfe_entrada'] : REGRAS_CONTABEIS['nfe_saida'];
  }
  if (tipo.includes('nfse')) return REGRAS_CONTABEIS['nfse'];
  if (tipo.includes('recibo')) return REGRAS_CONTABEIS['recibo'];
  if (tipo.includes('extrato')) return REGRAS_CONTABEIS['extrato_bancario'];
  return REGRAS_CONTABEIS['default'];
}
function calculateConfidence(documento, regra) {
  let confidence = 0.5; // Base confidence
  // Boost baseado na classificação da IA
  if (documento.ai_classification?.confidence) {
    confidence += documento.ai_classification.confidence * 0.3;
  }
  // Boost baseado na regra contábil
  confidence += regra.confidence_boost;
  // Boost se temos dados estruturados
  if (documento.ai_extracted_data?.valor_total || documento.ai_extracted_data?.total) {
    confidence += 0.1;
  }
  // Boost se temos CNPJ/CPF válido
  if (documento.ai_extracted_data?.cnpj || documento.ai_extracted_data?.cpf) {
    confidence += 0.05;
  }
  return Math.min(confidence, 1.0); // Cap at 1.0
}
function generateLancamento(documento) {
  const regra = determineAccountingRule(documento);
  const extractedData = documento.ai_extracted_data || {};
  const confidence = calculateConfidence(documento, regra);
  // Gerar tags baseadas no documento
  const tags = [
    documento.tipo_documento,
    documento.ai_classification?.categoria || 'geral',
    `confidence_${Math.round(confidence * 100)}`
  ].filter(Boolean);
  return {
    empresa_id: documento.empresa_id,
    documento_origem: documento.id,
    conta_debito: regra.debito,
    conta_credito: regra.credito,
    valor: regra.valor(extractedData),
    historico: regra.historico(extractedData),
    data_lancamento: extractedData.data_emissao || extractedData.data || new Date().toISOString().split('T')[0],
    tipo_lancamento: 'automatico',
    origem: 'ai_processing',
    status: 'pendente',
    ai_classification_confidence: confidence,
    ai_tags: tags
  };
}
// =====================================================
// HANDLER PRINCIPAL
// =====================================================
serve(async (req)=>{
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Parse request
    const body = await req.json();
    const { empresa_id, document_ids, auto_approve = false, confidence_threshold = 0.9 } = body;
    if (!empresa_id) {
      return Response.json({
        success: false,
        error: 'empresa_id é obrigatório'
      }, {
        status: 400,
        headers: corsHeaders
      });
    }
    console.log(`[GENERATE_ACCOUNTING] Iniciando para empresa ${empresa_id}`);
    // 1. Buscar documentos aprovados para processamento
    let query = supabase.from('documents').select('id, tipo_documento, ai_extracted_data, ai_classification, file_name, empresa_id').eq('empresa_id', empresa_id).eq('status', 'approved') // Apenas documentos aprovados
    .is('accounting_processed', null); // Que ainda não foram processados contabilmente
    if (document_ids && document_ids.length > 0) {
      query = query.in('id', document_ids);
    }
    const { data: documents, error: documentsError } = await query.limit(50);
    if (documentsError) {
      throw new Error(`Erro ao buscar documentos: ${documentsError.message}`);
    }
    if (!documents || documents.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhum documento encontrado para processamento',
        generated_count: 0
      }, {
        headers: corsHeaders
      });
    }
    console.log(`[GENERATE_ACCOUNTING] Processando ${documents.length} documentos`);
    // 2. Gerar lançamentos para cada documento
    const lancamentos = [];
    const processedDocuments = [];
    for (const documento of documents){
      try {
        const lancamento = generateLancamento(documento);
        // Auto-aprovar se confiança alta e habilitado
        if (auto_approve && lancamento.ai_classification_confidence >= confidence_threshold) {
          lancamento.status = 'aprovado';
        }
        lancamentos.push(lancamento);
        processedDocuments.push(documento.id);
        console.log(`[GENERATE_ACCOUNTING] Lançamento gerado para documento ${documento.id}: ${lancamento.historico}`);
      } catch (error) {
        console.error(`[GENERATE_ACCOUNTING] Erro ao processar documento ${documento.id}:`, error);
      // Continua processando outros documentos
      }
    }
    // 3. Inserir lançamentos no banco
    if (lancamentos.length > 0) {
      const { data: insertedLancamentos, error: insertError } = await supabase.from('lancamentos_contabeis').insert(lancamentos).select();
      if (insertError) {
        throw new Error(`Erro ao inserir lançamentos: ${insertError.message}`);
      }
      console.log(`[GENERATE_ACCOUNTING] ${insertedLancamentos?.length} lançamentos inseridos`);
      // 4. Marcar documentos como processados contabilmente
      const { error: updateError } = await supabase.from('documents').update({
        accounting_processed: true,
        accounting_processed_at: new Date().toISOString()
      }).in('id', processedDocuments);
      if (updateError) {
        console.error('[GENERATE_ACCOUNTING] Erro ao marcar documentos como processados:', updateError);
      // Não falha a operação, apenas loga o erro
      }
    }
    // 5. Retornar resultado
    const autoApprovedCount = lancamentos.filter((l)=>l.status === 'aprovado').length;
    return Response.json({
      success: true,
      generated_count: lancamentos.length,
      auto_approved_count: autoApprovedCount,
      pending_approval_count: lancamentos.length - autoApprovedCount,
      processed_documents: processedDocuments.length,
      message: `${lancamentos.length} lançamentos gerados com sucesso`
    }, {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('[GENERATE_ACCOUNTING] Erro:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, {
      status: 500,
      headers: corsHeaders
    });
  }
});
