// 🔔 NOTIFICATION SERVICE
// Edge Function para processamento de notificações e alertas
// Chamada pelos cron jobs para verificar prazos e enviar notificações

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface NotificationRequest {
  action: 'check_deadlines' | 'send_notification' | 'process_alerts'
  check_config?: {
    days_ahead: number[]
    send_notifications: boolean
    user_id?: string
  }
  notification_data?: {
    user_id: string
    title: string
    message: string
    type: string
    priority: string
    action_url?: string
  }
}

interface NotificationResult {
  success: boolean
  notifications_sent: number
  alerts_processed: number
  users_notified: number
  errors: string[]
  execution_time: number
}

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
    const body: NotificationRequest = await req.json()
    const { action } = body

    console.log('🔔 Notification Service iniciado:', { action })

    let notificationsSent = 0
    let alertsProcessed = 0
    let usersNotified = 0
    const errors: string[] = []

    switch (action) {
      case 'check_deadlines':
        const deadlineResult = await checkDeadlines(supabase, body.check_config!)
        notificationsSent += deadlineResult.notifications_sent
        alertsProcessed += deadlineResult.alerts_processed
        usersNotified += deadlineResult.users_notified
        errors.push(...deadlineResult.errors)
        break

      case 'send_notification':
        const notificationResult = await sendSingleNotification(supabase, body.notification_data!)
        notificationsSent += notificationResult.sent ? 1 : 0
        if (notificationResult.error) {
          errors.push(notificationResult.error)
        }
        break

      case 'process_alerts':
        const alertResult = await processActiveAlerts(supabase)
        alertsProcessed += alertResult.processed
        notificationsSent += alertResult.notifications_sent
        errors.push(...alertResult.errors)
        break

      default:
        throw new Error(`Ação não reconhecida: ${action}`)
    }

    const executionTime = Date.now() - startTime

    const result: NotificationResult = {
      success: true,
      notifications_sent: notificationsSent,
      alerts_processed: alertsProcessed,
      users_notified: usersNotified,
      errors,
      execution_time: executionTime
    }

    console.log('✅ Notification Service concluído:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erro no Notification Service:', error)
    
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

// Verificar prazos e criar notificações
async function checkDeadlines(supabase: any, config: any) {
  const { days_ahead = [7, 3, 1], send_notifications = true, user_id } = config
  
  let notifications_sent = 0
  let alerts_processed = 0
  let users_notified = 0
  const errors: string[] = []

  try {
    // Buscar alertas ativos que precisam de notificação
    let alertsQuery = supabase
      .from('fiscal_alerts')
      .select(`
        id,
        user_id,
        alert_type,
        title,
        description,
        priority,
        due_date,
        alert_date,
        context_data,
        suggested_actions,
        notification_sent
      `)
      .eq('status', 'ACTIVE')
      .eq('notification_sent', false)

    if (user_id) {
      alertsQuery = alertsQuery.eq('user_id', user_id)
    }

    const { data: alerts, error: alertsError } = await alertsQuery

    if (alertsError) {
      throw new Error(`Erro ao buscar alertas: ${alertsError.message}`)
    }

    const today = new Date()
    const processedUsers = new Set<string>()

    for (const alert of alerts || []) {
      try {
        const dueDate = new Date(alert.due_date)
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        // Verificar se deve notificar baseado nos dias configurados
        if (days_ahead.includes(daysUntilDue) || daysUntilDue <= 0) {
          if (send_notifications) {
            // Criar notificação na tabela notifications
            const notificationResult = await createNotificationFromAlert(supabase, alert, daysUntilDue)
            
            if (notificationResult.success) {
              notifications_sent++
              processedUsers.add(alert.user_id)

              // Marcar alerta como notificado
              await supabase
                .from('fiscal_alerts')
                .update({ 
                  notification_sent: true,
                  notification_sent_at: new Date().toISOString()
                })
                .eq('id', alert.id)
            } else {
              errors.push(notificationResult.error || 'Erro desconhecido ao criar notificação')
            }
          }

          alerts_processed++
        }
      } catch (error) {
        errors.push(`Erro ao processar alerta ${alert.id}: ${error.message}`)
      }
    }

    users_notified = processedUsers.size

  } catch (error) {
    errors.push(`Erro geral em checkDeadlines: ${error.message}`)
  }

  return { notifications_sent, alerts_processed, users_notified, errors }
}

// Criar notificação a partir de alerta fiscal
async function createNotificationFromAlert(supabase: any, alert: any, daysUntilDue: number) {
  try {
    // Determinar prioridade baseada nos dias restantes
    let priority = alert.priority
    if (daysUntilDue <= 0) {
      priority = 'CRITICAL'
    } else if (daysUntilDue <= 1) {
      priority = 'CRITICAL'
    } else if (daysUntilDue <= 3) {
      priority = 'HIGH'
    }

    // Criar mensagem contextual
    let message = alert.description
    if (daysUntilDue <= 0) {
      message = `⚠️ VENCIDO: ${alert.description}`
    } else if (daysUntilDue === 1) {
      message = `🚨 VENCE AMANHÃ: ${alert.description}`
    } else {
      message = `📅 Vence em ${daysUntilDue} dias: ${alert.description}`
    }

    // Determinar URL de ação baseada no tipo de alerta
    let action_url = '/prazos'
    let action_label = 'Ver Prazos'

    switch (alert.alert_type) {
      case 'DAS_VENCIMENTO':
        action_url = '/calculos/das'
        action_label = 'Calcular DAS'
        break
      case 'DEFIS_PRAZO':
        action_url = '/prazos'
        action_label = 'Ver DEFIS'
        break
      case 'DOCUMENTO_VENCIDO':
        action_url = '/documentos'
        action_label = 'Ver Documentos'
        break
    }

    // Inserir notificação
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: alert.user_id,
        title: alert.title,
        message: message,
        type: 'fiscal_alert',
        category: 'compliance',
        priority: priority,
        status: 'unread',
        source: 'notification_service',
        related_entity_type: 'fiscal_alert',
        related_entity_id: alert.id,
        action_url: action_url,
        action_label: action_label,
        metadata: {
          alert_type: alert.alert_type,
          due_date: alert.due_date,
          days_until_due: daysUntilDue,
          suggested_actions: alert.suggested_actions,
          context_data: alert.context_data
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

// Enviar notificação única
async function sendSingleNotification(supabase: any, data: any) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        category: 'system',
        priority: data.priority || 'MEDIUM',
        status: 'unread',
        source: 'notification_service',
        action_url: data.action_url,
        metadata: data.metadata || {}
      })

    if (error) {
      throw error
    }

    return { sent: true }
  } catch (error) {
    return { sent: false, error: error.message }
  }
}

// Processar alertas ativos
async function processActiveAlerts(supabase: any) {
  let processed = 0
  let notifications_sent = 0
  const errors: string[] = []

  try {
    // Buscar alertas que precisam ser processados
    const { data: alerts, error } = await supabase
      .from('fiscal_alerts')
      .select('*')
      .eq('status', 'ACTIVE')
      .lte('alert_date', new Date().toISOString().split('T')[0])

    if (error) {
      throw error
    }

    for (const alert of alerts || []) {
      try {
        // Verificar se já foi notificado recentemente
        const { data: recentNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('related_entity_id', alert.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
          .single()

        if (!recentNotification) {
          const dueDate = new Date(alert.due_date)
          const today = new Date()
          const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          const result = await createNotificationFromAlert(supabase, alert, daysUntilDue)
          
          if (result.success) {
            notifications_sent++
          } else {
            errors.push(result.error || 'Erro ao criar notificação')
          }
        }

        processed++
      } catch (error) {
        errors.push(`Erro ao processar alerta ${alert.id}: ${error.message}`)
      }
    }

  } catch (error) {
    errors.push(`Erro geral em processActiveAlerts: ${error.message}`)
  }

  return { processed, notifications_sent, errors }
}
