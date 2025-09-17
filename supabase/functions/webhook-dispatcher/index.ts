/**
 * 🔗 SIMPLE WEBHOOK - Webhooks Simplificados
 * ContábilPRO ERP - Dispatcher básico para contadora única
 *
 * FASE 2: Simplificação para contadora única
 * - Removida complexidade de retry avançado
 * - Simplificados tipos de eventos
 * - Foco em notificações essenciais
 */ import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withValidation, createSuccessResponse } from '../_shared/validation-middleware.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
// Schema simplificado para webhook
const SimpleWebhookSchema = z.object({
  event_type: z.enum([
    'document_processed',
    'das_generated',
    'obligation_due',
    'system_notification'
  ]),
  empresa_id: z.string().uuid().optional(),
  payload: z.record(z.any()),
  target_url: z.string().url().optional(),
  timeout_ms: z.number().min(1000).max(10000).default(5000)
});
export default withValidation({
  schema: WebhookDispatchSchema,
  context: 'webhook-dispatcher',
  _requireAuth: false
}, async (data, metadata)=>{
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();
  console.log(`[WEBHOOK_DISPATCHER] Processando webhook:`, {
    event_type: data.event_type,
    empresa_id: data.empresa_id,
    trace_id: metadata.trace_id
  });
  // Buscar URLs de destino se não fornecidas
  const targetUrls = data.target_urls || await getWebhookTargets(supabase, data.event_type, data.empresa_id);
  assertBusinessRule(targetUrls.length > 0, 'Nenhuma URL de webhook configurada para este evento', {
    event_type: data.event_type,
    empresa_id: data.empresa_id
  }, 'webhook-targets');
  // Criar webhook principal
  const webhookId = crypto.randomUUID();
  await saveWebhookRecord(supabase, webhookId, data, targetUrls.length);
  // Processar deliveries
  const deliveries = await processWebhookDeliveries(supabase, webhookId, data, targetUrls);
  const endTime = Date.now();
  const result = {
    _webhook_id: webhookId,
    event_type: data.event_type,
    total_targets: targetUrls.length,
    successful_deliveries: deliveries.filter((d)=>d.status === 'delivered').length,
    failed_deliveries: deliveries.filter((d)=>d.status === 'failed').length,
    pending_deliveries: deliveries.filter((d)=>d.status === 'pending' || d.status === 'retrying').length,
    deliveries,
    processing_time_ms: endTime - startTime
  };
  console.log(`[WEBHOOK_DISPATCHER] Processamento concluído:`, {
    _webhook_id: webhookId,
    successful: result.successful_deliveries,
    failed: result.failed_deliveries,
    trace_id: metadata.trace_id
  });
  return createSuccessResponse(result, {
    trace_id: metadata.trace_id,
    _webhook_id: webhookId
  });
});
/**
 * Busca URLs de webhook configuradas
 */ async function getWebhookTargets(supabase, eventType, empresaId) {
  let query = supabase.from('webhook_endpoints').select('url, events, active').eq('active', true);
  if (empresaId) {
    query = query.or(`empresa_id.eq.${empresaId},empresa_id.is.null`);
  } else {
    query = query.is('empresa_id', null); // Apenas webhooks globais
  }
  const { data, error: error1 } = await query;
  if (error1) {
    console.error('[WEBHOOK_TARGETS_ERROR]', error1);
    return [];
  }
  // Filtrar por tipo de evento
  const targets = (data || []).filter((endpoint)=>endpoint.events.includes(eventType) || endpoint.events.includes('*') // Wildcard para todos os eventos
  ).map((endpoint)=>endpoint.url);
  return targets;
}
/**
 * Salva registro do webhook
 */ async function saveWebhookRecord(supabase, webhookId, data, targetCount) {
  const { error: error1 } = await supabase.from('webhook_logs').insert({
    id: webhookId,
    event_type: data.event_type,
    empresa_id: data.empresa_id,
    payload: data.payload,
    _target_count: targetCount,
    status: 'processing',
    created_at: new Date().toISOString()
  });
  if (error1) {
    console.error('[SAVE_WEBHOOK_ERROR]', error1);
  // Não falhar o webhook se não conseguir salvar log
  }
}
/**
 * Processa deliveries dos webhooks
 */ async function processWebhookDeliveries(supabase, webhookId, data, targetUrls) {
  const deliveries = [];
  const retryConfig = data.retry_config || {
    max_retries: 3,
    retry_delay_ms: 5000,
    exponential_backoff: true
  };
  // Processar cada URL de destino
  for (const url of targetUrls){
    const delivery = await deliverWebhook(url, data, webhookId, retryConfig);
    deliveries.push(delivery);
    // Salvar delivery no banco
    await saveDeliveryRecord(supabase, delivery);
  }
  // Atualizar status do webhook principal
  const successCount = deliveries.filter((d)=>d.status === 'delivered').length;
  const finalStatus = successCount === deliveries.length ? 'completed' : successCount > 0 ? 'partial' : 'failed';
  await supabase.from('webhook_logs').update({
    status: finalStatus,
    successful_deliveries: successCount,
    failed_deliveries: deliveries.length - successCount,
    completed_at: new Date().toISOString()
  }).eq('id', webhookId);
  return deliveries;
}
/**
 * Entrega webhook para uma URL específica
 */ async function deliverWebhook(url, data, webhookId, retryConfig) {
  const deliveryId = crypto.randomUUID();
  const delivery = {
    id: deliveryId,
    _webhook_id: webhookId,
    target_url: url,
    event_type: data.event_type,
    payload: data.payload,
    status: 'pending',
    attempts: 0,
    max_retries: retryConfig.max_retries
  };
  // Preparar payload do webhook
  const webhookPayload = {
    id: webhookId,
    event: data.event_type,
    timestamp: new Date().toISOString(),
    data: data.payload,
    empresa_id: data.empresa_id
  };
  // Preparar headers
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'ContabilPro-Webhook/1.0',
    'X-Webhook-ID': webhookId,
    'X-Webhook-Event': data.event_type,
    ...data.headers
  };
  // Adicionar assinatura se configurada
  if (data.signature_secret) {
    const signature = await generateSignature(JSON.stringify(webhookPayload), data.signature_secret);
    headers['X-Webhook-Signature'] = signature;
  }
  // Tentar entrega com retry
  for(let attempt = 1; attempt <= retryConfig.max_retries + 1; attempt++){
    delivery.attempts = attempt;
    delivery.last_attempt_at = new Date().toISOString();
    try {
      console.log(`[WEBHOOK_DELIVERY] Tentativa ${attempt} para ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhookPayload),
        signal: AbortSignal.timeout(data.timeout_ms || 10000)
      });
      delivery.response_status = response.status;
      delivery.response_body = await response.text().catch(()=>'');
      if (response.ok) {
        delivery.status = 'delivered';
        delivery.delivered_at = new Date().toISOString();
        console.log(`[WEBHOOK_DELIVERY] Sucesso para ${url}`);
        break;
      } else {
        delivery.error_message = `HTTP ${response.status}: ${delivery.response_body}`;
        console.warn(`[WEBHOOK_DELIVERY] Falha HTTP ${response.status} para ${url}`);
      }
    } catch (_error) {
      delivery.error_message = error.message;
      console.error(`[WEBHOOK_DELIVERY] Erro para ${url}:`, error);
    }
    // Se não é a última tentativa, calcular próximo retry
    if (attempt <= retryConfig.max_retries) {
      const delay = retryConfig.exponential_backoff ? retryConfig.retry_delay_ms * Math.pow(2, attempt - 1) : retryConfig.retry_delay_ms;
      delivery.next_retry_at = new Date(Date.now() + delay).toISOString();
      delivery.status = 'retrying';
      // Aguardar antes da próxima tentativa
      await new Promise((resolve)=>setTimeout(resolve, delay));
    } else {
      delivery.status = 'failed';
    }
  }
  return delivery;
}
/**
 * Salva registro de delivery
 */ async function saveDeliveryRecord(supabase, delivery) {
  const { error: error1 } = await supabase.from('webhook_deliveries').insert({
    id: delivery.id,
    webhook_id: delivery.webhook_id,
    target_url: delivery.target_url,
    event_type: delivery.event_type,
    status: delivery.status,
    attempts: delivery.attempts,
    max_retries: delivery.max_retries,
    last_attempt_at: delivery.last_attempt_at,
    delivered_at: delivery.delivered_at,
    error_message: delivery.error_message,
    response_status: delivery.response_status,
    response_body: delivery.response_body,
    next_retry_at: delivery.next_retry_at
  });
  if (error1) {
    console.error('[SAVE_DELIVERY_ERROR]', error1);
  }
}
/**
 * Gera assinatura HMAC para webhook
 */ async function generateSignature(payload, secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, {
    name: 'HMAC',
    hash: 'SHA-256'
  }, false, [
    'sign'
  ]);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map((b)=>b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hashHex}`;
}
