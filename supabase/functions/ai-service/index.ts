/**
 * 🤖 AI SERVICE - ContábilPRO ERP
 * 
 * Edge Function principal para integração com OpenAI GPT-4
 * Substitui a function removida na "limpeza radical"
 * 
 * FUNCIONALIDADES:
 * - Chat conversacional com contexto contábil brasileiro
 * - Análise de relatórios com IA
 * - Busca semântica em base de conhecimento
 * - Detecção de anomalias fiscais
 * - Assistente fiscal especializado
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { SPECIALIZED_PROMPTS } from '../_shared/specialized-prompts.ts';
// =====================================================
// CONFIGURAÇÕES
// =====================================================
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY não configurada');
}
// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API Key não configurada');
    }
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização necessário');
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }
    const requestData = await req.json();
    const startTime = Date.now();
    console.log('[AI_SERVICE] Processando:', {
      action: requestData.action,
      userId: user.id,
      empresaId: requestData.empresa_id
    });
    let result;
    switch(requestData.action){
      case 'assistant':
        result = await processAssistantChat(requestData, supabase);
        break;
      case 'analyze_report':
        result = await analyzeReport(requestData);
        break;
      case 'semantic_search':
        result = await performSemanticSearch(requestData, supabase);
        break;
      case 'detect_fiscal_anomalies':
        result = await detectFiscalAnomalies(requestData);
        break;
      default:
        throw new Error(`Ação não suportada: ${requestData.action}`);
    }
    const processingTime = Date.now() - startTime;
    result.processing_time = processingTime;
    console.log('[AI_SERVICE] Concluído:', {
      action: requestData.action,
      processingTime,
      success: result.success
    });
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('[AI_SERVICE_ERROR]', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================
/**
 * Determina o tipo de consulta baseado na mensagem
 */ function determineQueryType(message) {
  const lowerMessage = message.toLowerCase();
  // Palavras-chave para DAS
  const dasKeywords = [
    'das',
    'simples nacional',
    'aliquota',
    'faturamento',
    'anexo',
    'calcular imposto'
  ];
  if (dasKeywords.some((keyword)=>lowerMessage.includes(keyword))) {
    return 'das_calculation';
  }
  // Palavras-chave para análise fiscal
  const fiscalKeywords = [
    'anomalia',
    'conformidade',
    'auditoria',
    'risco fiscal',
    'irregularidade'
  ];
  if (fiscalKeywords.some((keyword)=>lowerMessage.includes(keyword))) {
    return 'fiscal_analysis';
  }
  // Palavras-chave para documentos
  const docKeywords = [
    'nfe',
    'nfce',
    'documento',
    'ocr',
    'classificar',
    'extrair dados'
  ];
  if (docKeywords.some((keyword)=>lowerMessage.includes(keyword))) {
    return 'document_processing';
  }
  return 'general';
}
// =====================================================
// FUNÇÕES DE PROCESSAMENTO
// =====================================================
/**
 * Processar chat do assistente
 */ async function processAssistantChat(request, supabase) {
  const { message, context, model = 'gpt-4', temperature = 0.7, systemPrompt } = request;
  if (!message) {
    throw new Error('Mensagem é obrigatória para chat');
  }
  // Construir contexto para IA
  let contextualInfo = '';
  if (context?.empresaAtiva) {
    contextualInfo += `\nEMPRESA ATIVA: ${context.empresaAtiva.nome} (${context.empresaAtiva.cnpj})`;
    contextualInfo += `\nREGIME TRIBUTÁRIO: ${context.empresaAtiva.regime_tributario}`;
  }
  if (context?.obrigacoesPendentes && context.obrigacoesPendentes > 0) {
    contextualInfo += `\nOBRIGAÇÕES PENDENTES: ${context.obrigacoesPendentes}`;
  }
  if (context?.documentosPendentes && context.documentosPendentes > 0) {
    contextualInfo += `\nDOCUMENTOS PENDENTES: ${context.documentosPendentes}`;
  }
  // Adicionar conhecimento fiscal se disponível
  let conhecimentoFiscal = '';
  if (context?._conhecimento_fiscal && Array.isArray(context._conhecimento_fiscal)) {
    conhecimentoFiscal = '\n\nCONHECIMENTO FISCAL RELEVANTE:\n';
    context._conhecimento_fiscal.forEach((item, index)=>{
      conhecimentoFiscal += `${index + 1}. ${item.texto}\n`;
      if (item.fonte) conhecimentoFiscal += `   Fonte: ${item.fonte}\n`;
    });
  }
  // Determinar tipo de consulta para usar prompt especializado
  const queryType = determineQueryType(message);
  let basePrompt = SPECIALIZED_PROMPTS.ACCOUNTING_ASSISTANT;
  // Usar prompt especializado baseado no tipo de consulta
  if (queryType === 'das_calculation') {
    basePrompt = SPECIALIZED_PROMPTS.DAS_CALCULATOR;
  } else if (queryType === 'fiscal_analysis') {
    basePrompt = SPECIALIZED_PROMPTS.FISCAL_ANALYSIS;
  } else if (queryType === 'document_processing') {
    basePrompt = SPECIALIZED_PROMPTS.DOCUMENT_PROCESSOR;
  }
  const systemMessage = systemPrompt || `${basePrompt}

CONTEXTO ATUAL:${contextualInfo}${conhecimentoFiscal}

INSTRUÇÕES ADICIONAIS:
- Considere o regime tributário da empresa nas respostas
- Use dados oficiais e atualizados
- Forneça explicações passo a passo quando necessário
- Identifique oportunidades de otimização fiscal`;
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature,
      max_tokens: 1000
    })
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('Resposta vazia da OpenAI');
  }
  // Gerar sugestões baseadas no contexto
  const suggestions = generateSuggestions(context);
  return {
    success: true,
    response: aiResponse,
    tokens_used: data.usage?.total_tokens,
    model,
    confidence: 85,
    suggestions,
    metadata: {
      context_used: !!contextualInfo,
      knowledge_used: !!conhecimentoFiscal
    }
  };
}
/**
 * Analisar relatório com IA
 */ async function analyzeReport(request) {
  const { report_type, report_data, company_info, period, analysis_config } = request;
  if (!report_type || !report_data) {
    throw new Error('Tipo de relatório e dados são obrigatórios');
  }
  const prompt = `Analise este relatório ${report_type} da empresa:

DADOS DO RELATÓRIO:
${JSON.stringify(report_data, null, 2)}

INFORMAÇÕES DA EMPRESA:
${JSON.stringify(company_info, null, 2)}

PERÍODO: ${period}

Forneça uma análise detalhada incluindo:
1. Principais insights financeiros
2. Anomalias ou pontos de atenção
3. Recomendações específicas
4. Comparações com benchmarks do setor
5. Ações sugeridas

Responda em formato JSON estruturado.`;
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Você é um analista financeiro especializado em empresas brasileiras.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1500
    })
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  const analysis = data.choices[0]?.message?.content;
  return {
    success: true,
    analysis_result: {
      analysis,
      report_type,
      period,
      confidence: 90
    },
    tokens_used: data.usage?.total_tokens,
    model: 'gpt-4'
  };
}
/**
 * Busca semântica
 */ async function performSemanticSearch(request, supabase) {
  const { query, match_threshold = 0.7, match_count = 5 } = request;
  if (!query) {
    throw new Error('Query é obrigatória para busca semântica');
  }
  // Buscar na base de conhecimento semântico
  const { data: results, error } = await supabase.rpc('match_semantic_knowledge', {
    query_text: query,
    match_threshold,
    match_count
  });
  if (error) {
    console.warn('[SEMANTIC_SEARCH] Erro na busca:', error);
    return {
      success: true,
      results: [],
      metadata: {
        fallback: true
      }
    };
  }
  return {
    success: true,
    results: results || [],
    metadata: {
      query,
      match_threshold,
      results_count: results?.length || 0
    }
  };
}
/**
 * Detectar anomalias fiscais
 */ async function detectFiscalAnomalies(request) {
  const { company_id, analysis_type, analysis_data, detection_config } = request;
  if (!company_id || !analysis_data) {
    throw new Error('ID da empresa e dados de análise são obrigatórios');
  }
  const prompt = `${SPECIALIZED_PROMPTS.ANOMALY_DETECTION}

DADOS PARA ANÁLISE:
- Empresa ID: ${company_id}
- Tipo de Análise: ${analysis_type}
- Dados: ${JSON.stringify(analysis_data, null, 2)}

Retorne um JSON estruturado com:
{
  "anomalies": [
    {
      "type": "tipo_da_anomalia",
      "severity": "low|medium|high|critical",
      "description": "descrição detalhada",
      "affected_items": ["itens afetados"],
      "recommendation": "recomendação específica",
      "confidence": 0.85
    }
  ],
  "risk_score": 45.2,
  "summary": "resumo executivo",
  "next_actions": ["ações recomendadas"]
}`;
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: SPECIALIZED_PROMPTS.FISCAL_ANALYSIS
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    })
  });
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  const aiResponse = data.choices[0]?.message?.content;
  if (!aiResponse) {
    throw new Error('Resposta vazia da OpenAI');
  }
  try {
    // Tentar parsear como JSON estruturado
    const detectionResult = JSON.parse(aiResponse);
    return {
      success: true,
      response: `Análise concluída. ${detectionResult.anomalies?.length || 0} anomalias detectadas.`,
      detection_result: detectionResult,
      tokens_used: data.usage?.total_tokens,
      model: 'gpt-4',
      confidence: 0.9,
      suggestions: detectionResult.next_actions || []
    };
  } catch (parseError) {
    // Fallback se não conseguir parsear JSON
    return {
      success: true,
      response: aiResponse,
      detection_result: {
        anomalies: [],
        risk_score: 0,
        summary: aiResponse,
        analysis_type
      },
      tokens_used: data.usage?.total_tokens,
      model: 'gpt-4'
    };
  }
}
/**
 * Gerar sugestões contextuais
 */ function generateSuggestions(context) {
  const suggestions = [];
  if (context?.obrigacoesPendentes && context.obrigacoesPendentes > 0) {
    suggestions.push('Ver obrigações pendentes (/obrigacoes)');
  }
  if (context?.documentosPendentes && context.documentosPendentes > 0) {
    suggestions.push('Processar documentos (/processar)');
  }
  if (context?.empresaAtiva?.regime_tributario === 'simples') {
    suggestions.push('Calcular DAS (/das)');
  }
  suggestions.push('Gerar relatórios (/relatorios)');
  suggestions.push('Consultar CNPJ (/cnpj)');
  return suggestions;
}
