import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withValidation, createSuccessResponse } from '../_shared/validation-middleware.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
// Schema de validação para classificação de documento
const ClassifyDocumentSchema = z.object({
  text: z.string().min(1, 'Texto é obrigatório'),
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  options: z.object({
    confidence_threshold: z.number().min(0).max(1).default(0.7),
    max_tokens: z.number().positive().default(1000),
    temperature: z.number().min(0).max(2).default(0.3)
  }).optional().default({})
});
export default withValidation({
  schema: ClassifyDocumentSchema,
  context: 'classify-document',
  requireAuth: true,
  requireUserId: false
}, async (data, metadata)=>{
  const { text, fileName, systemPrompt, userPrompt, options } = data;
  console.log(`[CLASSIFY_DOCUMENT] Iniciando classificação: ${fileName}`, {
    textLength: text.length,
    options,
    trace_id: metadata.trace_id
  });
  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  try {
    if (!text || !fileName) {
      throw new Error('Texto e nome do arquivo são obrigatórios');
    }
    if (text.length > 50000) {
      throw new Error('Texto muito longo para classificação');
    }
    // Obter API Key do Vault
    const { data: apiKey, error: vaultError } = await supabaseClient.rpc('get_secret', {
      p_name: 'OpenAI API KEY'
    });
    if (vaultError || !apiKey) {
      console.error('[VAULT_ERROR]', vaultError);
      return new Response(JSON.stringify({
        success: true,
        result: ruleBasedClassification(text, fileName),
        fallback: true
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Fazer chamada para OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: {
          type: 'json_object'
        }
      })
    });
    if (!openaiResponse.ok) {
      console.warn('[OPENAI_API_ERROR]', await openaiResponse.text());
      const fallbackResult = ruleBasedClassification(text, fileName);
      return createSuccessResponse({
        result: fallbackResult,
        fallback: true,
        model: 'rule-based'
      }, {
        trace_id: metadata.trace_id,
        file_name: fileName,
        text_length: text.length
      });
    }
    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);
    // Log de auditoria
    await supabaseClient.from('audit_logs').insert({
      user_id: metadata.user_id,
      action: 'document_classification',
      resource: 'document',
      metadata: {
        fileName,
        textLength: text.length,
        tipo_documento: result.tipo_documento,
        categoria: result.categoria,
        confidence: result.confidence,
        model: 'gpt-4o-mini',
        trace_id: metadata.trace_id
      }
    });
    return createSuccessResponse({
      result: {
        tipo_documento: result.tipo_documento || 'Outros',
        categoria: result.categoria || 'outros',
        confidence: result.confidence || 0.7,
        reasoning: result.reasoning || 'Classificação automática',
        extractedData: result.extractedData || {},
        tags: result.tags || []
      },
      fallback: false,
      model: 'gpt-4o-mini'
    }, {
      trace_id: metadata.trace_id,
      file_name: fileName,
      text_length: text.length
    });
  } catch (error) {
    console.error('[CLASSIFY_DOCUMENT_ERROR]', error, {
      trace_id: metadata.trace_id,
      file_name: fileName
    });
    throw error;
  }
});
// Função de fallback para classificação baseada em regras
function ruleBasedClassification(text, fileName) {
  const textLower = text.toLowerCase();
  const fileNameLower = fileName.toLowerCase();
  let tipo_documento = 'Outros';
  let categoria = 'outros';
  let confidence = 0.6;
  let reasoning = 'Classificação baseada em regras';
  const tags = [];
  // NFe
  if (textLower.includes('nota fiscal eletrônica') || textLower.includes('chave de acesso') || textLower.includes('danfe') || fileNameLower.includes('nfe')) {
    tipo_documento = 'NFe';
    categoria = 'fiscal';
    confidence = 0.9;
    reasoning = 'Identificado como NFe pela presença de termos específicos';
    tags.push('fiscal', 'eletronica');
  } else if (textLower.includes('nfc-e') || textLower.includes('cupom fiscal eletrônico') || fileNameLower.includes('nfce')) {
    tipo_documento = 'NFCe';
    categoria = 'fiscal';
    confidence = 0.9;
    reasoning = 'Identificado como NFCe pela presença de termos específicos';
    tags.push('fiscal', 'consumidor');
  } else if (textLower.includes('extrato') || textLower.includes('saldo') || textLower.includes('conta corrente') || fileNameLower.includes('extrato')) {
    tipo_documento = 'Extrato';
    categoria = 'bancario';
    confidence = 0.8;
    reasoning = 'Identificado como extrato bancário';
    tags.push('bancario', 'extrato');
  }
  // Adicionar tags baseadas no conteúdo
  if (textLower.includes('cnpj')) tags.push('empresa');
  if (textLower.includes('cpf')) tags.push('pessoa-fisica');
  if (textLower.includes('valor') || textLower.includes('r$')) tags.push('financeiro');
  return {
    tipo_documento,
    categoria,
    confidence,
    reasoning,
    extractedData: {},
    tags
  };
}
