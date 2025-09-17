/**
 * 🔔 NOTIFICATION SERVICE - Core Service Consolidado
 * ContábilPro ERP - Serviço unificado para notificações e comunicação
 * 
 * CONSOLIDA:
 * - enviar-email
 * - crm-notifications
 * - compliance-monitor
 * - intelligent-alerts
 * - webhook-manager
 * - webhook-dispatcher
 */ import { withValidation, createSuccessResponse } from '../_shared/validation-middleware.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getOptimizedConnection } from '../_shared/connection-pool.ts';
import { withAPM, monitorDatabase, recordCustomMetric } from '../_shared/apm-monitor.ts';
// =====================================================
// SCHEMAS DE VALIDAÇÃO
// =====================================================
const NotificationServiceSchema = z.object({
  action: z.enum([
    'email',
    'webhook',
    'alert',
    'sms',
    'push',
    'schedule',
    'template'
  ]),
  // Para emails
  email_data: z.object({
    to: z.array(z.string().email()).optional(),
    subject: z.string().optional(),
    template_id: z.string().optional(),
    variables: z.record(z.any()).optional(),
    attachments: z.array(z.string()).optional()
  }).optional(),
  // Para webhooks
  webhook_data: z.object({
    url: z.string().url().optional(),
    method: z.enum([
      'POST',
      'PUT',
      'PATCH'
    ]).optional(),
    headers: z.record(z.string()).optional(),
    payload: z.any().optional(),
    retry_config: z.object({
      max_retries: z.number().optional(),
      retry_delay: z.number().optional()
    }).optional()
  }).optional(),
  // Para alertas
  alert_data: z.object({
    type: z.enum([
      'compliance',
      'performance',
      'security',
      'business'
    ]).optional(),
    severity: z.enum([
      'low',
      'medium',
      'high',
      'critical'
    ]).optional(),
    message: z.string().optional(),
    empresa_id: z.string().uuid().optional(),
    metadata: z.any().optional()
  }).optional(),
  // Para agendamento
  schedule_config: z.object({
    frequency: z.enum([
      'once',
      'daily',
      'weekly',
      'monthly'
    ]),
    schedule_time: z.string().optional(),
    timezone: z.string().optional()
  }).optional()
});
// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
export default withValidation({
  _schema: NotificationServiceSchema,
  context: 'notification-service',
  _requireAuth: true,
  _requireUserId: true
}, async (data, metadata)=>{
  return await withAPM('notification-service', async (traceId)=>{
    const { action } = data;
    const supabaseClient = await getOptimizedConnection('notification-service');
    console.log(`[NOTIFICATION_SERVICE] Ação: ${action}, User: ${metadata.user_id}`);
    recordCustomMetric('notification_service_request', 1, {
      action
    });
    switch(action){
      case 'email':
        return await handleSendEmail(supabaseClient, data, metadata, traceId);
      case 'webhook':
        return await handleSendWebhook(supabaseClient, data, metadata, traceId);
      case 'alert':
        return await handleCreateAlert(supabaseClient, data, metadata, traceId);
      case 'sms':
        return await handleSendSMS(supabaseClient, data, metadata, traceId);
      case 'push':
        return await handleSendPush(supabaseClient, data, metadata, traceId);
      case 'schedule':
        return await handleScheduleNotification(supabaseClient, data, metadata, traceId);
      case 'template':
        return await handleManageTemplate(supabaseClient, data, metadata, traceId);
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
 * Handle Send Email - Envio de emails
 */ async function handleSendEmail(supabase, data, metadata, traceId) {
  const { email_data } = data;
  const startTime = Date.now();
  try {
    // Buscar template se especificado
    let emailContent;
    if (email_data.template_id) {
      const template = await getEmailTemplate(supabase, email_data.template_id);
      emailContent = processTemplate(template, email_data.variables || {});
    } else {
      emailContent = {
        subject: email_data.subject,
        html: email_data.html_content,
        text: email_data.text_content
      };
    }
    // Enviar email
    const emailResult = await sendEmail(email_data.to, emailContent.subject, emailContent.html, email_data.attachments, traceId);
    // Log do envio
    await monitorDatabase(traceId, 'Log email sending', ()=>supabase.from('notification_logs').insert({
        user_id: metadata.user_id,
        type: 'email',
        recipients: email_data.to,
        status: emailResult.success ? 'sent' : 'failed',
        template_id: email_data.template_id,
        delivery_time: Date.now() - startTime,
        error_log: emailResult.error,
        created_at: new Date().toISOString()
      }));
    recordCustomMetric('email_sending_success', emailResult.success ? 1 : 0, {
      recipients_count: email_data.to?.length || 0,
      has_template: !!email_data.template_id
    });
    return createSuccessResponse({
      success: emailResult.success,
      delivery_status: emailResult.success ? 'sent' : 'failed',
      recipients_count: email_data.to?.length || 0,
      delivery_time: Date.now() - startTime,
      error: emailResult.error
    });
  } catch (_error) {
    console.error('[SEND_EMAIL_ERROR]', error);
    recordCustomMetric('email_sending_error', 1);
    throw error;
  }
}
/**
 * Handle Send Webhook - Envio de webhooks
 */ async function handleSendWebhook(supabase, data, metadata, traceId) {
  const { webhook_data } = data;
  const startTime = Date.now();
  try {
    const webhookResult = await sendWebhook(webhook_data.url, webhook_data.method || 'POST', webhook_data.payload, webhook_data.headers || {}, webhook_data.retry_config, traceId);
    // Log do webhook
    await monitorDatabase(traceId, 'Log webhook sending', ()=>supabase.from('webhook_logs').insert({
        user_id: metadata.user_id,
        url: webhook_data.url,
        method: webhook_data.method,
        status: webhookResult.success ? 'success' : 'failed',
        response_status: webhookResult.response_status,
        response_time: webhookResult.response_time,
        retry_count: webhookResult.retry_count,
        error_log: webhookResult.error,
        created_at: new Date().toISOString()
      }));
    recordCustomMetric('webhook_sending_success', webhookResult.success ? 1 : 0);
    return createSuccessResponse({
      success: webhookResult.success,
      ...webhookResult
    });
  } catch (_error) {
    console.error('[SEND_WEBHOOK_ERROR]', error);
    recordCustomMetric('webhook_sending_error', 1);
    throw error;
  }
}
/**
 * Handle Create Alert - Criar alertas inteligentes
 */ async function handleCreateAlert(supabase, data, metadata, traceId) {
  const { alert_data } = data;
  try {
    // Criar alerta
    const { data: alert, error: error1 } = await monitorDatabase(traceId, 'Create alert', ()=>supabase.from('system_alerts').insert({
        user_id: metadata.user_id,
        type: alert_data.type,
        severity: alert_data.severity,
        message: alert_data.message,
        empresa_id: alert_data.empresa_id,
        metadata: alert_data.metadata,
        status: 'active',
        created_at: new Date().toISOString()
      }).select().single());
    if (error1) throw error1;
    // Processar alerta baseado na severidade
    if (alert_data.severity === 'critical') {
      await processUrgentAlert(supabase, alert, metadata.user_id, traceId);
    }
    recordCustomMetric('alert_creation_success', 1, {
      type: alert_data.type,
      severity: alert_data.severity
    });
    return createSuccessResponse({
      success: true,
      alert_id: alert.id,
      severity: alert_data.severity
    });
  } catch (_error) {
    console.error('[CREATE_ALERT_ERROR]', error);
    recordCustomMetric('alert_creation_error', 1);
    throw error;
  }
}
// =====================================================
// FUNÇÕES DE ENVIO
// =====================================================
/**
 * Enviar email usando serviço externo
 */ async function sendEmail(recipients, subject, htmlContent, attachments, traceId) {
  try {
    // Implementação simplificada
    // Na implementação real, integraria com SendGrid, AWS SES, etc.
    console.log(`[EMAIL] Enviando para ${recipients.length} destinatários: ${subject}`);
    // Simular envio
    await new Promise((resolve)=>setTimeout(resolve, 1000));
    return {
      success: true
    };
  } catch (_error) {
    console.error('[EMAIL_SEND_ERROR]', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Enviar webhook com retry
 */ async function sendWebhook(url, method, payload, headers, retryConfig, traceId) {
  const startTime = Date.now();
  const maxRetries = retryConfig?.max_retries || 3;
  const retryDelay = retryConfig?.retry_delay || 1000;
  for(let attempt = 1; attempt <= maxRetries; attempt++){
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ContabilPro-Webhook/1.0',
          ...headers
        },
        body: JSON.stringify(payload)
      });
      const responseTime = Date.now() - startTime;
      if (response.ok) {
        return {
          success: true,
          response_status: response.status,
          response_time: responseTime,
          retry_count: attempt - 1
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (_error) {
      console.error(`[WEBHOOK] Tentativa ${attempt} falhou:`, error);
      if (attempt === maxRetries) {
        return {
          success: false,
          response_time: Date.now() - startTime,
          retry_count: attempt - 1,
          error: error.message
        };
      }
      // Aguardar antes da próxima tentativa
      await new Promise((resolve)=>setTimeout(resolve, retryDelay * attempt));
    }
  }
  return {
    success: false,
    error: 'Max retries exceeded',
    retry_count: maxRetries
  };
}
/**
 * Buscar template de email
 */ async function getEmailTemplate(supabase, templateId) {
  const { data: template, error: error1 } = await supabase.from('email_templates').select('*').eq('id', templateId).single();
  if (error1 || !template) {
    throw new Error('Template de email não encontrado');
  }
  return template;
}
/**
 * Processar template com variáveis
 */ function processTemplate(template, variables) {
  let subject = template.subject;
  let htmlContent = template.html_content;
  let textContent = template.text_content;
  // Substituir variáveis
  for (const [key, value] of Object.entries(variables)){
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
    htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
    textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
  }
  return {
    subject,
    html: htmlContent,
    text: textContent
  };
}
/**
 * Processar alerta urgente
 */ async function processUrgentAlert(supabase, alert, userId, traceId) {
  try {
    // Buscar configurações de notificação do usuário
    const { data: userSettings } = await supabase.from('user_settings').select('configuracoes_sistema').eq('user_id', userId).single();
    const notificationSettings = userSettings?.configuracoes_sistema?.notifications || {};
    // Enviar email se configurado
    if (notificationSettings.email_alerts) {
      await sendEmail([
        notificationSettings.email
      ], `🚨 Alerta Crítico - ${alert.type}`, `<h2>Alerta Crítico</h2><p>${alert.message}</p>`, undefined, traceId);
    }
    // Enviar webhook se configurado
    if (notificationSettings.webhook_url) {
      await sendWebhook(notificationSettings.webhook_url, 'POST', {
        type: 'critical_alert',
        alert_id: alert.id,
        message: alert.message,
        timestamp: new Date().toISOString()
      }, {}, {
        max_retries: 3,
        retry_delay: 1000
      }, traceId);
    }
    console.log(`[URGENT_ALERT] Processado alerta crítico ${alert.id}`);
  } catch (_error) {
    console.error('[URGENT_ALERT_ERROR]', error);
  }
}
