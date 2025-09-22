// 🚨 ALERT ESCALATION SERVICE
// Edge Function para escalação automática de alertas não reconhecidos
// Aumenta prioridade e frequência de notificações para alertas críticos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface EscalationRequest {
  action: 'check_escalations' | 'escalate_alert' | 'process_overdue'
  alert_id?: string
  escalation_rules?: EscalationRule[]
}

interface EscalationRule {
  alert_type: string
  priority: string
  hours_unacknowledged: number
  escalation_actions: string[]
  new_priority?: string
  notification_frequency?: string
}

interface EscalationResult {
  success: boolean
  alerts_escalated: number
  notifications_sent: number
  errors: string[]
  execution_time: number
}

// Regras padrão de escalação
const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    alert_type: 'DAS_VENCIMENTO',
    priority: 'HIGH',
    hours_unacknowledged: 24,
    escalation_actions: ['increase_priority', 'increase_frequency', 'send_email'],
    new_priority: 'CRITICAL',
    notification_frequency: 'DAILY'
  },
  {
    alert_type: 'DEFIS_PRAZO',
    priority: 'CRITICAL',
    hours_unacknowledged: 12,
    escalation_actions: ['increase_frequency', 'send_email', 'send_sms'],
    notification_frequency: 'DAILY'
  },
  {
    alert_type: 'DOCUMENTO_VENCIDO',
    priority: 'MEDIUM',
    hours_unacknowledged: 48,
    escalation_actions: ['increase_priority'],
    new_priority: 'HIGH'
  },
  {
    alert_type: 'CERTIFICADO_VENCIMENTO',
    priority: 'HIGH',
    hours_unacknowledged: 24,
    escalation_actions: ['increase_priority', 'send_email'],
    new_priority: 'CRITICAL'
  }
]

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const body: EscalationRequest = await req.json()
    const { action, alert_id, escalation_rules = DEFAULT_ESCALATION_RULES } = body

    console.log('🚨 Alert Escalation Service iniciado:', { action, alert_id })

    let alertsEscalated = 0
    let notificationsSent = 0
    const errors: string[] = []

    switch (action) {
      case 'check_escalations':
        const checkResult = await checkAndEscalateAlerts(supabase, escalation_rules)
        alertsEscalated += checkResult.escalated
        notificationsSent += checkResult.notifications_sent
        errors.push(...checkResult.errors)
        break

      case 'escalate_alert':
        if (!alert_id) {
          throw new Error('alert_id é obrigatório para escalate_alert')
        }
        const escalateResult = await escalateSingleAlert(supabase, alert_id, escalation_rules)
        alertsEscalated += escalateResult.escalated ? 1 : 0
        notificationsSent += escalateResult.notifications_sent
        if (escalateResult.error) {
          errors.push(escalateResult.error)
        }
        break

      case 'process_overdue':
        const overdueResult = await processOverdueAlerts(supabase)
        alertsEscalated += overdueResult.escalated
        notificationsSent += overdueResult.notifications_sent
        errors.push(...overdueResult.errors)
        break

      default:
        throw new Error(`Ação não reconhecida: ${action}`)
    }

    const executionTime = Date.now() - startTime

    const result: EscalationResult = {
      success: true,
      alerts_escalated: alertsEscalated,
      notifications_sent: notificationsSent,
      errors,
      execution_time: executionTime
    }

    console.log('✅ Alert Escalation Service concluído:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erro no Alert Escalation Service:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      execution_time: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Verificar e escalar alertas não reconhecidos
async function checkAndEscalateAlerts(supabase: any, rules: EscalationRule[]) {
  let escalated = 0
  let notifications_sent = 0
  const errors: string[] = []

  try {
    // Buscar alertas ativos não reconhecidos
    const { data: alerts, error } = await supabase
      .from('fiscal_alerts')
      .select('*')
      .eq('status', 'ACTIVE')
      .is('acknowledged_at', null)

    if (error) {
      throw error
    }

    const now = new Date()

    for (const alert of alerts || []) {
      try {
        // Calcular tempo desde criação
        const createdAt = new Date(alert.created_at)
        const hoursUnacknowledged = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

        // Encontrar regra aplicável
        const applicableRule = rules.find(rule => 
          rule.alert_type === alert.alert_type && 
          rule.priority === alert.priority &&
          hoursUnacknowledged >= rule.hours_unacknowledged
        )

        if (applicableRule) {
          const result = await executeEscalation(supabase, alert, applicableRule)
          if (result.escalated) {
            escalated++
          }
          notifications_sent += result.notifications_sent
          
          if (result.error) {
            errors.push(result.error)
          }
        }
      } catch (error) {
        errors.push(`Erro ao processar alerta ${alert.id}: ${error.message}`)
      }
    }

  } catch (error) {
    errors.push(`Erro geral em checkAndEscalateAlerts: ${error.message}`)
  }

  return { escalated, notifications_sent, errors }
}

// Escalar alerta específico
async function escalateSingleAlert(supabase: any, alertId: string, rules: EscalationRule[]) {
  try {
    // Buscar alerta
    const { data: alert, error } = await supabase
      .from('fiscal_alerts')
      .select('*')
      .eq('id', alertId)
      .single()

    if (error) {
      throw error
    }

    if (!alert) {
      return { escalated: false, notifications_sent: 0, error: 'Alerta não encontrado' }
    }

    // Encontrar regra aplicável
    const applicableRule = rules.find(rule => 
      rule.alert_type === alert.alert_type && 
      rule.priority === alert.priority
    )

    if (!applicableRule) {
      return { escalated: false, notifications_sent: 0, error: 'Nenhuma regra de escalação aplicável' }
    }

    const result = await executeEscalation(supabase, alert, applicableRule)
    return {
      escalated: result.escalated,
      notifications_sent: result.notifications_sent,
      error: result.error
    }

  } catch (error) {
    return { escalated: false, notifications_sent: 0, error: error.message }
  }
}

// Processar alertas vencidos
async function processOverdueAlerts(supabase: any) {
  let escalated = 0
  let notifications_sent = 0
  const errors: string[] = []

  try {
    // Buscar alertas vencidos
    const today = new Date().toISOString().split('T')[0]
    const { data: overdueAlerts, error } = await supabase
      .from('fiscal_alerts')
      .select('*')
      .eq('status', 'ACTIVE')
      .lt('due_date', today)

    if (error) {
      throw error
    }

    for (const alert of overdueAlerts || []) {
      try {
        // Escalar automaticamente para CRITICAL
        const { error: updateError } = await supabase
          .from('fiscal_alerts')
          .update({ 
            priority: 'CRITICAL',
            updated_at: new Date().toISOString()
          })
          .eq('id', alert.id)

        if (updateError) {
          errors.push(`Erro ao atualizar alerta vencido ${alert.id}: ${updateError.message}`)
          continue
        }

        // Criar notificação de vencimento
        const notificationResult = await createOverdueNotification(supabase, alert)
        if (notificationResult.success) {
          notifications_sent++
        } else {
          errors.push(notificationResult.error || 'Erro ao criar notificação de vencimento')
        }

        escalated++
      } catch (error) {
        errors.push(`Erro ao processar alerta vencido ${alert.id}: ${error.message}`)
      }
    }

  } catch (error) {
    errors.push(`Erro geral em processOverdueAlerts: ${error.message}`)
  }

  return { escalated, notifications_sent, errors }
}

// Executar escalação
async function executeEscalation(supabase: any, alert: any, rule: EscalationRule) {
  let escalated = false
  let notifications_sent = 0
  let error: string | undefined

  try {
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    // Aplicar ações de escalação
    for (const action of rule.escalation_actions) {
      switch (action) {
        case 'increase_priority':
          if (rule.new_priority) {
            updates.priority = rule.new_priority
          }
          break

        case 'increase_frequency':
          // Atualizar configuração do usuário para este tipo de alerta
          if (rule.notification_frequency) {
            await updateUserAlertFrequency(supabase, alert.user_id, alert.alert_type, rule.notification_frequency)
          }
          break

        case 'send_email':
          const emailResult = await sendEscalationEmail(supabase, alert)
          if (emailResult.success) {
            notifications_sent++
          }
          break

        case 'send_sms':
          const smsResult = await sendEscalationSMS(supabase, alert)
          if (smsResult.success) {
            notifications_sent++
          }
          break
      }
    }

    // Atualizar alerta se há mudanças
    if (Object.keys(updates).length > 1) { // Mais que apenas updated_at
      const { error: updateError } = await supabase
        .from('fiscal_alerts')
        .update(updates)
        .eq('id', alert.id)

      if (updateError) {
        throw updateError
      }

      escalated = true
    }

    // Criar notificação de escalação
    const escalationNotification = await createEscalationNotification(supabase, alert, rule)
    if (escalationNotification.success) {
      notifications_sent++
    }

  } catch (err) {
    error = err.message
  }

  return { escalated, notifications_sent, error }
}

// Atualizar frequência de alerta do usuário
async function updateUserAlertFrequency(supabase: any, userId: string, alertType: string, frequency: string) {
  const { error } = await supabase
    .from('alert_configurations')
    .upsert({
      user_id: userId,
      alert_type: alertType,
      notification_frequency: frequency,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('Erro ao atualizar frequência de alerta:', error)
  }
}

// Criar notificação de escalação
async function createEscalationNotification(supabase: any, alert: any, rule: EscalationRule) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: alert.user_id,
        title: `🚨 ESCALAÇÃO: ${alert.title}`,
        message: `Este alerta foi escalado devido à falta de reconhecimento. Ação imediata necessária.`,
        type: 'escalation_alert',
        category: 'compliance',
        priority: 'CRITICAL',
        status: 'unread',
        source: 'escalation_service',
        related_entity_type: 'fiscal_alert',
        related_entity_id: alert.id,
        action_url: '/prazos',
        action_label: 'Ver Alerta',
        metadata: {
          original_priority: alert.priority,
          escalation_rule: rule.alert_type,
          escalated_at: new Date().toISOString()
        }
      })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Criar notificação de vencimento
async function createOverdueNotification(supabase: any, alert: any) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: alert.user_id,
        title: `⚠️ VENCIDO: ${alert.title}`,
        message: `Este prazo fiscal já venceu. Ação urgente necessária para evitar multas.`,
        type: 'overdue_alert',
        category: 'compliance',
        priority: 'CRITICAL',
        status: 'unread',
        source: 'escalation_service',
        related_entity_type: 'fiscal_alert',
        related_entity_id: alert.id,
        action_url: '/prazos',
        action_label: 'Ver Prazo Vencido',
        metadata: {
          due_date: alert.due_date,
          overdue_since: new Date().toISOString(),
          alert_type: alert.alert_type
        }
      })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Enviar email de escalação (placeholder)
async function sendEscalationEmail(supabase: any, alert: any) {
  // Implementar integração com serviço de email
  console.log('📧 Enviando email de escalação para alerta:', alert.id)
  return { success: true }
}

// Enviar SMS de escalação (placeholder)
async function sendEscalationSMS(supabase: any, alert: any) {
  // Implementar integração com serviço de SMS
  console.log('📱 Enviando SMS de escalação para alerta:', alert.id)
  return { success: true }
}
