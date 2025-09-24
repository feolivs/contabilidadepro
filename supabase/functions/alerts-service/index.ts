// 🚨 ALERTS SERVICE
// Edge Function unificada para gerenciamento completo de alertas e notificações
// Substitui: alert-escalation-service, notification-service, compliance-monitor
// Integrado ao sistema ContabilidadePRO

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// =====================================================
// INTERFACES UNIFICADAS
// =====================================================

interface AlertsServiceRequest {
  operation: 'check_compliance' | 'process_notifications' | 'escalate_alerts' | 'send_notification' | 'process_overdue'
  user_id?: string
  
  // Parâmetros para compliance monitoring
  compliance_config?: {
    mode: 'check_all' | 'check_user' | 'check_type'
    alert_type?: string
    days_ahead?: number
    send_alerts?: boolean
    alert_channels?: string[]
  }
  
  // Parâmetros para notificações
  notification_config?: {
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
  
  // Parâmetros para escalação
  escalation_config?: {
    action: 'check_escalations' | 'escalate_alert' | 'process_overdue'
    alert_id?: string
    escalation_rules?: EscalationRule[]
  }
}

interface EscalationRule {
  alert_type: string
  priority: string
  hours_unacknowledged: number
  escalation_actions: string[]
  new_priority?: string
  notification_frequency?: string
}

interface AlertsServiceResult {
  success: boolean
  operation: string
  alerts_created?: number
  alerts_updated?: number
  alerts_escalated?: number
  notifications_sent?: number
  users_processed?: number
  errors: string[]
  execution_time: number
  cache_hit?: boolean
}

// =====================================================
// CONFIGURAÇÕES E CONSTANTES
// =====================================================

const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    alert_type: 'DAS_VENCIMENTO',
    priority: 'HIGH',
    hours_unacknowledged: 24,
    escalation_actions: ['increase_priority', 'send_email', 'create_notification'],
    new_priority: 'CRITICAL',
    notification_frequency: 'every_6_hours'
  },
  {
    alert_type: 'DEFIS_PRAZO',
    priority: 'MEDIUM',
    hours_unacknowledged: 48,
    escalation_actions: ['increase_priority', 'send_notification'],
    new_priority: 'HIGH',
    notification_frequency: 'daily'
  },
  {
    alert_type: 'DOCUMENTO_VENCIDO',
    priority: 'LOW',
    hours_unacknowledged: 72,
    escalation_actions: ['send_notification'],
    new_priority: 'MEDIUM',
    notification_frequency: 'weekly'
  }
]

// Cache TTL por operação (em segundos)
const CACHE_TTL = {
  check_compliance: 15 * 60,      // 15 minutos
  process_notifications: 5 * 60,  // 5 minutos
  escalate_alerts: 10 * 60,       // 10 minutos
  send_notification: 0,           // Sem cache (operação única)
  process_overdue: 30 * 60        // 30 minutos
}

// =====================================================
// HANDLER PRINCIPAL
// =====================================================

serve(async (req) => {
  const startTime = Date.now()
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    const body: AlertsServiceRequest = await req.json()
    const { operation, user_id } = body

    console.log(`🚨 Alerts Service iniciado: ${operation}`, { user_id })

    // Verificar cache primeiro
    const cacheKey = generateCacheKey(operation, body)
    const cachedResult = await getCachedResult(supabase, cacheKey)
    
    if (cachedResult) {
      console.log(`💾 Cache hit para ${operation}`)
      return new Response(JSON.stringify({
        ...cachedResult,
        cache_hit: true,
        execution_time: Date.now() - startTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Executar operação
    let result: AlertsServiceResult

    switch (operation) {
      case 'check_compliance':
        result = await checkCompliance(supabase, body.compliance_config, user_id)
        break

      case 'process_notifications':
        result = await processNotifications(supabase, body.notification_config)
        break

      case 'escalate_alerts':
        result = await escalateAlerts(supabase, body.escalation_config)
        break

      case 'send_notification':
        result = await sendNotification(supabase, body.notification_config?.notification_data)
        break

      case 'process_overdue':
        result = await processOverdueAlerts(supabase)
        break

      default:
        throw new Error(`Operação não reconhecida: ${operation}`)
    }

    // Adicionar métricas
    result.execution_time = Date.now() - startTime
    result.operation = operation
    result.cache_hit = false

    // Salvar no cache se aplicável
    if (CACHE_TTL[operation] > 0) {
      await setCachedResult(supabase, cacheKey, result, CACHE_TTL[operation])
    }

    console.log(`✅ Alerts Service concluído: ${operation}`, {
      execution_time: result.execution_time,
      alerts_created: result.alerts_created,
      notifications_sent: result.notifications_sent
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erro no Alerts Service:', error)
    
    const errorResult: AlertsServiceResult = {
      success: false,
      operation: 'unknown',
      errors: [error.message],
      execution_time: Date.now() - startTime
    }

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// =====================================================
// FUNÇÕES PRINCIPAIS (COMPLIANCE)
// =====================================================

async function checkCompliance(supabase: any, config: any, user_id?: string): Promise<AlertsServiceResult> {
  const { mode = 'check_all', alert_type, days_ahead = 7, send_alerts = true } = config || {}
  
  let alerts_created = 0
  let alerts_updated = 0
  let users_processed = 0
  const errors: string[] = []

  try {
    console.log('🔍 Verificando compliance...', { mode, alert_type, days_ahead })

    // Buscar usuários para processar
    const usersToProcess = await getUsersToProcess(supabase, mode, user_id)
    
    for (const user of usersToProcess) {
      try {
        const userResult = await processUserCompliance(supabase, user.id, alert_type, days_ahead, send_alerts)
        alerts_created += userResult.alerts_created
        alerts_updated += userResult.alerts_updated
        users_processed++
      } catch (error) {
        errors.push(`Erro ao processar usuário ${user.id}: ${error.message}`)
      }
    }

    return {
      success: true,
      operation: 'check_compliance',
      alerts_created,
      alerts_updated,
      users_processed,
      errors,
      execution_time: 0 // Será preenchido pelo handler principal
    }

  } catch (error) {
    return {
      success: false,
      operation: 'check_compliance',
      alerts_created,
      alerts_updated,
      users_processed,
      errors: [...errors, error.message],
      execution_time: 0
    }
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function generateCacheKey(operation: string, body: AlertsServiceRequest): string {
  const keyData = {
    operation,
    user_id: body.user_id,
    config: body.compliance_config || body.notification_config || body.escalation_config
  }
  
  return `alerts_service:${operation}:${btoa(JSON.stringify(keyData)).slice(0, 32)}`
}

async function getCachedResult(supabase: any, cacheKey: string): Promise<AlertsServiceResult | null> {
  try {
    const { data, error } = await supabase
      .from('unified_cache')
      .select('data, expires_at')
      .eq('key', cacheKey)
      .single()

    if (error || !data) return null

    const now = new Date()
    const expiresAt = new Date(data.expires_at)

    if (now > expiresAt) {
      // Cache expirado, remover
      await supabase.from('unified_cache').delete().eq('key', cacheKey)
      return null
    }

    return data.data as AlertsServiceResult
  } catch (error) {
    console.warn('⚠️ Erro ao buscar cache:', error)
    return null
  }
}

async function setCachedResult(supabase: any, cacheKey: string, result: AlertsServiceResult, ttlSeconds: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

    await supabase
      .from('unified_cache')
      .upsert({
        key: cacheKey,
        data: result,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.warn('⚠️ Erro ao salvar cache:', error)
  }
}

async function getUsersToProcess(supabase: any, mode: string, user_id?: string): Promise<any[]> {
  if (mode === 'check_user' && user_id) {
    return [{ id: user_id }]
  }

  // Buscar todos os usuários ativos
  const { data: users, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('active', true)

  if (error) throw error
  return users || []
}

async function processUserCompliance(supabase: any, userId: string, alertType?: string, daysAhead: number = 7, sendAlerts: boolean = true): Promise<{alerts_created: number, alerts_updated: number}> {
  let alerts_created = 0
  let alerts_updated = 0

  try {
    // Processar diferentes tipos de alertas
    if (!alertType || alertType === 'DAS_VENCIMENTO') {
      const dasResult = await processDASAlerts(supabase, userId, daysAhead, sendAlerts)
      alerts_created += dasResult.created
      alerts_updated += dasResult.updated
    }

    if (!alertType || alertType === 'DEFIS_PRAZO') {
      const defisResult = await processDEFISAlerts(supabase, userId, daysAhead, sendAlerts)
      alerts_created += defisResult.created
      alerts_updated += defisResult.updated
    }

    if (!alertType || alertType === 'DOCUMENTO_VENCIDO') {
      const docResult = await processDocumentAlerts(supabase, userId, daysAhead, sendAlerts)
      alerts_created += docResult.created
      alerts_updated += docResult.updated
    }

    return { alerts_created, alerts_updated }
  } catch (error) {
    console.error(`Erro ao processar compliance para usuário ${userId}:`, error)
    return { alerts_created, alerts_updated }
  }
}

async function processDASAlerts(supabase: any, userId: string, daysAhead: number, sendAlerts: boolean): Promise<{created: number, updated: number}> {
  let created = 0
  let updated = 0

  try {
    // Buscar empresas do usuário no Simples Nacional
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('user_id', userId)
      .eq('regime_tributario', 'Simples Nacional')
      .eq('ativo', true)

    if (error) throw error

    const now = new Date()
    const checkUntil = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    for (const empresa of empresas || []) {
      // Calcular próximos vencimentos DAS
      const proximosVencimentos = calcularProximosVencimentosDAS(empresa, now, checkUntil)

      for (const vencimento of proximosVencimentos) {
        // Verificar se já existe alerta
        const { data: existingAlert } = await supabase
          .from('fiscal_alerts')
          .select('id, status')
          .eq('user_id', userId)
          .eq('empresa_id', empresa.id)
          .eq('alert_type', 'DAS_VENCIMENTO')
          .eq('due_date', vencimento.due_date)
          .single()

        if (!existingAlert) {
          // Criar novo alerta
          const { error: insertError } = await supabase
            .from('fiscal_alerts')
            .insert({
              user_id: userId,
              empresa_id: empresa.id,
              alert_type: 'DAS_VENCIMENTO',
              title: `DAS ${vencimento.periodo} - ${empresa.nome}`,
              description: `Vencimento do DAS referente ao período ${vencimento.periodo}`,
              priority: calculatePriority(vencimento.due_date, now),
              status: 'ACTIVE',
              due_date: vencimento.due_date,
              context_data: {
                periodo: vencimento.periodo,
                valor_estimado: vencimento.valor_estimado,
                codigo_barras: vencimento.codigo_barras
              },
              suggested_actions: [
                'Calcular valor do DAS',
                'Gerar guia de pagamento',
                'Efetuar pagamento até o vencimento'
              ]
            })

          if (!insertError) {
            created++

            if (sendAlerts) {
              await createNotificationFromAlert(supabase, {
                user_id: userId,
                empresa_id: empresa.id,
                alert_type: 'DAS_VENCIMENTO',
                title: `DAS ${vencimento.periodo} - ${empresa.nome}`,
                due_date: vencimento.due_date,
                priority: calculatePriority(vencimento.due_date, now)
              })
            }
          }
        } else if (existingAlert.status === 'RESOLVED') {
          // Reativar alerta se necessário
          const { error: updateError } = await supabase
            .from('fiscal_alerts')
            .update({
              status: 'ACTIVE',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAlert.id)

          if (!updateError) updated++
        }
      }
    }

    return { created, updated }
  } catch (error) {
    console.error('Erro ao processar alertas DAS:', error)
    return { created, updated }
  }
}

async function processDEFISAlerts(supabase: any, userId: string, daysAhead: number, sendAlerts: boolean): Promise<{created: number, updated: number}> {
  let created = 0
  let updated = 0

  try {
    // Buscar empresas do usuário
    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('user_id', userId)
      .eq('ativo', true)

    if (error) throw error

    const now = new Date()
    const checkUntil = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    for (const empresa of empresas || []) {
      // DEFIS é anual, vencimento em 31/03
      const currentYear = now.getFullYear()
      const defisDate = new Date(currentYear, 2, 31) // 31 de março

      // Se já passou, considerar próximo ano
      if (defisDate < now) {
        defisDate.setFullYear(currentYear + 1)
      }

      if (defisDate <= checkUntil) {
        // Verificar se já existe alerta
        const { data: existingAlert } = await supabase
          .from('fiscal_alerts')
          .select('id, status')
          .eq('user_id', userId)
          .eq('empresa_id', empresa.id)
          .eq('alert_type', 'DEFIS_PRAZO')
          .eq('due_date', defisDate.toISOString().split('T')[0])
          .single()

        if (!existingAlert) {
          // Criar novo alerta
          const { error: insertError } = await supabase
            .from('fiscal_alerts')
            .insert({
              user_id: userId,
              empresa_id: empresa.id,
              alert_type: 'DEFIS_PRAZO',
              title: `DEFIS ${defisDate.getFullYear()} - ${empresa.nome}`,
              description: `Prazo para entrega da DEFIS referente ao ano ${defisDate.getFullYear() - 1}`,
              priority: calculatePriority(defisDate, now),
              status: 'ACTIVE',
              due_date: defisDate.toISOString().split('T')[0],
              context_data: {
                ano_calendario: defisDate.getFullYear() - 1,
                tipo_declaracao: 'DEFIS'
              },
              suggested_actions: [
                'Preparar documentação fiscal',
                'Calcular demonstrativo financeiro',
                'Transmitir DEFIS via sistema da Receita Federal'
              ]
            })

          if (!insertError) {
            created++

            if (sendAlerts) {
              await createNotificationFromAlert(supabase, {
                user_id: userId,
                empresa_id: empresa.id,
                alert_type: 'DEFIS_PRAZO',
                title: `DEFIS ${defisDate.getFullYear()} - ${empresa.nome}`,
                due_date: defisDate.toISOString().split('T')[0],
                priority: calculatePriority(defisDate, now)
              })
            }
          }
        }
      }
    }

    return { created, updated }
  } catch (error) {
    console.error('Erro ao processar alertas DEFIS:', error)
    return { created, updated }
  }
}

async function processDocumentAlerts(supabase: any, userId: string, daysAhead: number, sendAlerts: boolean): Promise<{created: number, updated: number}> {
  let created = 0
  let updated = 0

  try {
    // Buscar documentos próximos ao vencimento
    const now = new Date()
    const checkUntil = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    const { data: documentos, error } = await supabase
      .from('documentos')
      .select('*, empresas(nome)')
      .eq('user_id', userId)
      .not('data_vencimento', 'is', null)
      .gte('data_vencimento', now.toISOString().split('T')[0])
      .lte('data_vencimento', checkUntil.toISOString().split('T')[0])
      .eq('status', 'pendente')

    if (error) throw error

    for (const documento of documentos || []) {
      // Verificar se já existe alerta
      const { data: existingAlert } = await supabase
        .from('fiscal_alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('alert_type', 'DOCUMENTO_VENCIDO')
        .eq('related_entity_id', documento.id)
        .single()

      if (!existingAlert) {
        // Criar novo alerta
        const { error: insertError } = await supabase
          .from('fiscal_alerts')
          .insert({
            user_id: userId,
            empresa_id: documento.empresa_id,
            alert_type: 'DOCUMENTO_VENCIDO',
            title: `Documento vencendo - ${documento.nome}`,
            description: `Documento ${documento.tipo} da empresa ${documento.empresas?.nome} vence em ${documento.data_vencimento}`,
            priority: calculatePriority(new Date(documento.data_vencimento), now),
            status: 'ACTIVE',
            due_date: documento.data_vencimento,
            related_entity_type: 'documento',
            related_entity_id: documento.id,
            context_data: {
              documento_tipo: documento.tipo,
              documento_nome: documento.nome,
              empresa_nome: documento.empresas?.nome
            },
            suggested_actions: [
              'Revisar documento',
              'Processar antes do vencimento',
              'Atualizar status do documento'
            ]
          })

        if (!insertError) {
          created++

          if (sendAlerts) {
            await createNotificationFromAlert(supabase, {
              user_id: userId,
              empresa_id: documento.empresa_id,
              alert_type: 'DOCUMENTO_VENCIDO',
              title: `Documento vencendo - ${documento.nome}`,
              due_date: documento.data_vencimento,
              priority: calculatePriority(new Date(documento.data_vencimento), now)
            })
          }
        }
      }
    }

    return { created, updated }
  } catch (error) {
    console.error('Erro ao processar alertas de documentos:', error)
    return { created, updated }
  }
}

// =====================================================
// FUNÇÕES PRINCIPAIS (NOTIFICAÇÕES)
// =====================================================

async function processNotifications(supabase: any, config: any): Promise<AlertsServiceResult> {
  const { action, check_config, notification_data } = config || {}

  let notifications_sent = 0
  const errors: string[] = []

  try {
    console.log('🔔 Processando notificações...', { action })

    switch (action) {
      case 'check_deadlines':
        const deadlineResult = await checkDeadlinesAndNotify(supabase, check_config)
        notifications_sent += deadlineResult.notifications_sent
        errors.push(...deadlineResult.errors)
        break

      case 'send_notification':
        const sendResult = await sendSingleNotification(supabase, notification_data)
        if (sendResult.sent) notifications_sent++
        if (sendResult.error) errors.push(sendResult.error)
        break

      case 'process_alerts':
        const alertsResult = await processActiveAlerts(supabase)
        notifications_sent += alertsResult.notifications_sent
        errors.push(...alertsResult.errors)
        break

      default:
        throw new Error(`Ação de notificação não reconhecida: ${action}`)
    }

    return {
      success: true,
      operation: 'process_notifications',
      notifications_sent,
      errors,
      execution_time: 0
    }

  } catch (error) {
    return {
      success: false,
      operation: 'process_notifications',
      notifications_sent,
      errors: [...errors, error.message],
      execution_time: 0
    }
  }
}

async function checkDeadlinesAndNotify(supabase: any, config: any): Promise<{notifications_sent: number, errors: string[]}> {
  const { days_ahead = [7, 3, 1], send_notifications = true, user_id } = config || {}

  let notifications_sent = 0
  const errors: string[] = []

  try {
    for (const days of days_ahead) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + days)

      // Buscar alertas que vencem na data alvo
      let query = supabase
        .from('fiscal_alerts')
        .select('*')
        .eq('status', 'ACTIVE')
        .eq('due_date', targetDate.toISOString().split('T')[0])

      if (user_id) {
        query = query.eq('user_id', user_id)
      }

      const { data: alerts, error } = await query

      if (error) {
        errors.push(`Erro ao buscar alertas para ${days} dias: ${error.message}`)
        continue
      }

      for (const alert of alerts || []) {
        if (send_notifications) {
          const result = await createNotificationFromAlert(supabase, alert, days)
          if (result.success) {
            notifications_sent++
          } else {
            errors.push(result.error || 'Erro ao criar notificação')
          }
        }
      }
    }

    return { notifications_sent, errors }
  } catch (error) {
    return { notifications_sent, errors: [...errors, error.message] }
  }
}

async function sendSingleNotification(supabase: any, data: any): Promise<{sent: boolean, error?: string}> {
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
        source: 'alerts_service',
        action_url: data.action_url,
        metadata: data.metadata || {}
      })

    if (error) throw error
    return { sent: true }
  } catch (error) {
    return { sent: false, error: error.message }
  }
}

async function processActiveAlerts(supabase: any): Promise<{notifications_sent: number, errors: string[]}> {
  let notifications_sent = 0
  const errors: string[] = []

  try {
    // Buscar alertas ativos
    const { data: alerts, error } = await supabase
      .from('fiscal_alerts')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    for (const alert of alerts || []) {
      try {
        // Verificar se já foi notificado recentemente
        const { data: recentNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('related_entity_id', alert.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
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
      } catch (error) {
        errors.push(`Erro ao processar alerta ${alert.id}: ${error.message}`)
      }
    }

    return { notifications_sent, errors }
  } catch (error) {
    return { notifications_sent, errors: [error.message] }
  }
}

// =====================================================
// FUNÇÕES PRINCIPAIS (ESCALAÇÃO)
// =====================================================

async function escalateAlerts(supabase: any, config: any): Promise<AlertsServiceResult> {
  const { action, alert_id, escalation_rules = DEFAULT_ESCALATION_RULES } = config || {}

  let alerts_escalated = 0
  let notifications_sent = 0
  const errors: string[] = []

  try {
    console.log('⬆️ Escalando alertas...', { action, alert_id })

    switch (action) {
      case 'check_escalations':
        const checkResult = await checkAndEscalateAlerts(supabase, escalation_rules)
        alerts_escalated += checkResult.escalated
        notifications_sent += checkResult.notifications_sent
        errors.push(...checkResult.errors)
        break

      case 'escalate_alert':
        if (!alert_id) throw new Error('alert_id é obrigatório para escalate_alert')
        const escalateResult = await escalateSingleAlert(supabase, alert_id, escalation_rules)
        if (escalateResult.escalated) alerts_escalated++
        notifications_sent += escalateResult.notifications_sent
        if (escalateResult.error) errors.push(escalateResult.error)
        break

      case 'process_overdue':
        const overdueResult = await processOverdueAlertsInternal(supabase)
        alerts_escalated += overdueResult.escalated
        notifications_sent += overdueResult.notifications_sent
        errors.push(...overdueResult.errors)
        break

      default:
        throw new Error(`Ação de escalação não reconhecida: ${action}`)
    }

    return {
      success: true,
      operation: 'escalate_alerts',
      alerts_escalated,
      notifications_sent,
      errors,
      execution_time: 0
    }

  } catch (error) {
    return {
      success: false,
      operation: 'escalate_alerts',
      alerts_escalated,
      notifications_sent,
      errors: [...errors, error.message],
      execution_time: 0
    }
  }
}

async function sendNotification(supabase: any, data: any): Promise<AlertsServiceResult> {
  try {
    const result = await sendSingleNotification(supabase, data)

    return {
      success: result.sent,
      operation: 'send_notification',
      notifications_sent: result.sent ? 1 : 0,
      errors: result.error ? [result.error] : [],
      execution_time: 0
    }
  } catch (error) {
    return {
      success: false,
      operation: 'send_notification',
      notifications_sent: 0,
      errors: [error.message],
      execution_time: 0
    }
  }
}

async function processOverdueAlerts(supabase: any): Promise<AlertsServiceResult> {
  try {
    const result = await processOverdueAlertsInternal(supabase)

    return {
      success: true,
      operation: 'process_overdue',
      alerts_escalated: result.escalated,
      notifications_sent: result.notifications_sent,
      errors: result.errors,
      execution_time: 0
    }
  } catch (error) {
    return {
      success: false,
      operation: 'process_overdue',
      alerts_escalated: 0,
      notifications_sent: 0,
      errors: [error.message],
      execution_time: 0
    }
  }
}

// =====================================================
// FUNÇÕES AUXILIARES DE ESCALAÇÃO
// =====================================================

async function checkAndEscalateAlerts(supabase: any, rules: EscalationRule[]): Promise<{escalated: number, notifications_sent: number, errors: string[]}> {
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

    if (error) throw error

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
          if (result.escalated) escalated++
          notifications_sent += result.notifications_sent
          if (result.error) errors.push(result.error)
        }
      } catch (error) {
        errors.push(`Erro ao processar alerta ${alert.id}: ${error.message}`)
      }
    }

    return { escalated, notifications_sent, errors }
  } catch (error) {
    return { escalated, notifications_sent, errors: [error.message] }
  }
}

async function escalateSingleAlert(supabase: any, alertId: string, rules: EscalationRule[]): Promise<{escalated: boolean, notifications_sent: number, error?: string}> {
  try {
    // Buscar alerta específico
    const { data: alert, error } = await supabase
      .from('fiscal_alerts')
      .select('*')
      .eq('id', alertId)
      .single()

    if (error) throw error
    if (!alert) throw new Error('Alerta não encontrado')

    // Encontrar regra aplicável
    const applicableRule = rules.find(rule =>
      rule.alert_type === alert.alert_type &&
      rule.priority === alert.priority
    )

    if (!applicableRule) {
      return { escalated: false, notifications_sent: 0, error: 'Nenhuma regra de escalação aplicável' }
    }

    const result = await executeEscalation(supabase, alert, applicableRule)
    return result
  } catch (error) {
    return { escalated: false, notifications_sent: 0, error: error.message }
  }
}

async function executeEscalation(supabase: any, alert: any, rule: EscalationRule): Promise<{escalated: boolean, notifications_sent: number, error?: string}> {
  let notifications_sent = 0

  try {
    // Atualizar prioridade se especificado
    if (rule.new_priority && rule.new_priority !== alert.priority) {
      const { error: updateError } = await supabase
        .from('fiscal_alerts')
        .update({
          priority: rule.new_priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', alert.id)

      if (updateError) throw updateError
    }

    // Executar ações de escalação
    for (const action of rule.escalation_actions) {
      switch (action) {
        case 'send_notification':
        case 'create_notification':
          const notificationResult = await createEscalationNotification(supabase, alert, rule)
          if (notificationResult.success) notifications_sent++
          break

        case 'send_email':
          // Implementar envio de email se necessário
          console.log(`📧 Email de escalação seria enviado para alerta ${alert.id}`)
          break

        case 'increase_priority':
          // Já tratado acima
          break

        default:
          console.warn(`Ação de escalação não reconhecida: ${action}`)
      }
    }

    return { escalated: true, notifications_sent }
  } catch (error) {
    return { escalated: false, notifications_sent, error: error.message }
  }
}

async function processOverdueAlertsInternal(supabase: any): Promise<{escalated: number, notifications_sent: number, errors: string[]}> {
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

    if (error) throw error

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

    return { escalated, notifications_sent, errors }
  } catch (error) {
    return { escalated, notifications_sent, errors: [error.message] }
  }
}

// =====================================================
// FUNÇÕES AUXILIARES GERAIS
// =====================================================

function calculatePriority(dueDate: Date, now: Date): string {
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilDue <= 0) return 'CRITICAL'
  if (daysUntilDue <= 1) return 'HIGH'
  if (daysUntilDue <= 3) return 'MEDIUM'
  return 'LOW'
}

function calcularProximosVencimentosDAS(empresa: any, startDate: Date, endDate: Date): any[] {
  const vencimentos = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    // DAS vence no dia 20 de cada mês
    const vencimento = new Date(currentDate.getFullYear(), currentDate.getMonth(), 20)

    if (vencimento >= startDate && vencimento <= endDate) {
      const periodo = `${String(currentDate.getMonth()).padStart(2, '0')}/${currentDate.getFullYear()}`

      vencimentos.push({
        due_date: vencimento.toISOString().split('T')[0],
        periodo,
        valor_estimado: 0, // Seria calculado baseado no faturamento
        codigo_barras: null
      })
    }

    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  return vencimentos
}

async function createNotificationFromAlert(supabase: any, alert: any, daysUntilDue?: number): Promise<{success: boolean, error?: string}> {
  try {
    const dueDate = new Date(alert.due_date)
    const today = new Date()
    const calculatedDays = daysUntilDue ?? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Determinar urgência e mensagem
    let message = ''
    let priority = alert.priority || 'MEDIUM'
    let action_url = ''
    let action_label = ''

    switch (alert.alert_type) {
      case 'DAS_VENCIMENTO':
        if (calculatedDays <= 0) {
          message = `⚠️ URGENTE: DAS venceu hoje! Efetue o pagamento imediatamente para evitar multas.`
          priority = 'CRITICAL'
        } else if (calculatedDays === 1) {
          message = `🚨 DAS vence amanhã (${dueDate.toLocaleDateString('pt-BR')})! Prepare o pagamento.`
          priority = 'HIGH'
        } else {
          message = `📅 DAS vence em ${calculatedDays} dias (${dueDate.toLocaleDateString('pt-BR')}). Organize-se para o pagamento.`
        }
        action_url = '/calculos'
        action_label = 'Calcular DAS'
        break

      case 'DEFIS_PRAZO':
        if (calculatedDays <= 0) {
          message = `⚠️ URGENTE: Prazo da DEFIS venceu! Transmita imediatamente para evitar multas.`
          priority = 'CRITICAL'
        } else if (calculatedDays <= 7) {
          message = `🚨 DEFIS vence em ${calculatedDays} dias (${dueDate.toLocaleDateString('pt-BR')})! Prepare a documentação.`
          priority = 'HIGH'
        } else {
          message = `📅 DEFIS vence em ${calculatedDays} dias (${dueDate.toLocaleDateString('pt-BR')}). Organize a documentação fiscal.`
        }
        action_url = '/prazos'
        action_label = 'Ver Prazos'
        break

      case 'DOCUMENTO_VENCIDO':
        message = `📄 Documento "${alert.context_data?.documento_nome || 'documento'}" vence em ${calculatedDays} dias. Revise e processe.`
        action_url = '/documentos'
        action_label = 'Ver Documentos'
        break

      default:
        message = alert.description || `Alerta: ${alert.title}`
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
        source: 'alerts_service',
        related_entity_type: 'fiscal_alert',
        related_entity_id: alert.id,
        action_url: action_url,
        action_label: action_label,
        metadata: {
          alert_type: alert.alert_type,
          due_date: alert.due_date,
          days_until_due: calculatedDays,
          suggested_actions: alert.suggested_actions,
          context_data: alert.context_data
        }
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function createEscalationNotification(supabase: any, alert: any, rule: EscalationRule): Promise<{success: boolean, error?: string}> {
  try {
    const message = `🚨 ESCALAÇÃO: Alerta "${alert.title}" foi escalado para ${rule.new_priority || 'prioridade superior'} devido à falta de reconhecimento.`

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: alert.user_id,
        title: `Escalação: ${alert.title}`,
        message: message,
        type: 'escalation',
        category: 'compliance',
        priority: rule.new_priority || alert.priority,
        status: 'unread',
        source: 'alerts_service',
        related_entity_type: 'fiscal_alert',
        related_entity_id: alert.id,
        action_url: '/dashboard',
        action_label: 'Ver Dashboard',
        metadata: {
          escalation_rule: rule,
          original_priority: alert.priority,
          escalated_at: new Date().toISOString()
        }
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function createOverdueNotification(supabase: any, alert: any): Promise<{success: boolean, error?: string}> {
  try {
    const message = `⚠️ VENCIDO: "${alert.title}" venceu e foi escalado para CRÍTICO. Ação imediata necessária!`

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: alert.user_id,
        title: `VENCIDO: ${alert.title}`,
        message: message,
        type: 'overdue_alert',
        category: 'compliance',
        priority: 'CRITICAL',
        status: 'unread',
        source: 'alerts_service',
        related_entity_type: 'fiscal_alert',
        related_entity_id: alert.id,
        action_url: '/dashboard',
        action_label: 'Ação Imediata',
        metadata: {
          original_due_date: alert.due_date,
          escalated_at: new Date().toISOString(),
          alert_type: alert.alert_type
        }
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
