// 🚨 COMPLIANCE MONITOR
// Edge Function para monitoramento de compliance fiscal
// Chamada pelos cron jobs para verificar prazos e gerar alertas

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ComplianceRequest {
  mode: 'check_all' | 'check_user' | 'check_type'
  user_id?: string
  alert_type?: string
  days_ahead?: number
  send_alerts?: boolean
  alert_channels?: string[]
}

interface ComplianceResult {
  success: boolean
  alerts_created: number
  alerts_updated: number
  users_processed: number
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
    const body: ComplianceRequest = await req.json()
    const {
      mode = 'check_all',
      user_id,
      alert_type,
      days_ahead = 30,
      send_alerts = true,
      alert_channels = ['dashboard']
    } = body

    console.log('🔍 Compliance Monitor iniciado:', { mode, user_id, alert_type, days_ahead })

    let alertsCreated = 0
    let alertsUpdated = 0
    let usersProcessed = 0
    const errors: string[] = []

    // Buscar usuários para processar
    let usersQuery = supabase.from('profiles').select('id, email')
    
    if (mode === 'check_user' && user_id) {
      usersQuery = usersQuery.eq('id', user_id)
    }

    const { data: users, error: usersError } = await usersQuery

    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`)
    }

    // Processar cada usuário
    for (const user of users || []) {
      try {
        console.log(`📋 Processando usuário: ${user.email}`)
        
        // Buscar configurações de alerta do usuário
        const { data: configs, error: configsError } = await supabase
          .from('alert_configurations')
          .select('*')
          .eq('user_id', user.id)
          .eq('enabled', true)

        if (configsError) {
          errors.push(`Erro ao buscar configs do usuário ${user.id}: ${configsError.message}`)
          continue
        }

        // Processar cada configuração
        for (const config of configs || []) {
          if (alert_type && config.alert_type !== alert_type) {
            continue
          }

          const result = await processAlertType(supabase, user.id, config, days_ahead)
          alertsCreated += result.created
          alertsUpdated += result.updated
          
          if (result.error) {
            errors.push(result.error)
          }
        }

        usersProcessed++
      } catch (error) {
        errors.push(`Erro ao processar usuário ${user.id}: ${error.message}`)
      }
    }

    // Enviar notificações se solicitado
    if (send_alerts && alertsCreated > 0) {
      await sendComplianceNotifications(supabase, alert_channels)
    }

    const executionTime = Date.now() - startTime

    const result: ComplianceResult = {
      success: true,
      alerts_created: alertsCreated,
      alerts_updated: alertsUpdated,
      users_processed: usersProcessed,
      errors,
      execution_time: executionTime
    }

    console.log('✅ Compliance Monitor concluído:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erro no Compliance Monitor:', error)
    
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

// Processar tipo específico de alerta
async function processAlertType(
  supabase: any,
  userId: string,
  config: any,
  daysAhead: number
): Promise<{ created: number; updated: number; error?: string }> {
  try {
    const today = new Date()
    const alertDate = new Date(today)
    alertDate.setDate(today.getDate() + config.days_before)

    let created = 0
    let updated = 0

    switch (config.alert_type) {
      case 'DAS_VENCIMENTO':
        const dasResult = await processDASAlerts(supabase, userId, config, alertDate)
        created += dasResult.created
        updated += dasResult.updated
        break

      case 'DEFIS_PRAZO':
        const defisResult = await processDEFISAlerts(supabase, userId, config, alertDate)
        created += defisResult.created
        updated += defisResult.updated
        break

      case 'DOCUMENTO_VENCIDO':
        const docResult = await processDocumentAlerts(supabase, userId, config, alertDate)
        created += docResult.created
        updated += docResult.updated
        break

      default:
        console.log(`⚠️ Tipo de alerta não implementado: ${config.alert_type}`)
    }

    return { created, updated }
  } catch (error) {
    return { created: 0, updated: 0, error: error.message }
  }
}

// Processar alertas DAS
async function processDASAlerts(supabase: any, userId: string, config: any, alertDate: Date) {
  // Calcular próximo vencimento DAS (dia 20 do mês seguinte)
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 20)
  
  // Verificar se já existe alerta para este período
  const { data: existingAlert } = await supabase
    .from('fiscal_alerts')
    .select('id')
    .eq('user_id', userId)
    .eq('alert_type', 'DAS_VENCIMENTO')
    .eq('due_date', nextMonth.toISOString().split('T')[0])
    .single()

  if (existingAlert) {
    return { created: 0, updated: 0 }
  }

  // Criar novo alerta DAS
  const { error } = await supabase
    .from('fiscal_alerts')
    .insert({
      user_id: userId,
      alert_type: 'DAS_VENCIMENTO',
      title: `DAS vence em ${config.days_before} dias`,
      description: `O DAS referente ao mês ${today.getMonth() + 1}/${today.getFullYear()} vence no dia 20/${nextMonth.getMonth() + 1}/${nextMonth.getFullYear()}.`,
      priority: config.days_before <= 3 ? 'CRITICAL' : config.days_before <= 7 ? 'HIGH' : 'MEDIUM',
      due_date: nextMonth.toISOString().split('T')[0],
      alert_date: alertDate.toISOString().split('T')[0],
      suggested_actions: [
        'Calcular valor do DAS',
        'Gerar boleto de pagamento',
        'Verificar saldo em conta',
        'Agendar pagamento'
      ],
      context_data: {
        competencia: `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`,
        vencimento: nextMonth.toISOString().split('T')[0],
        dias_restantes: config.days_before
      }
    })

  if (error) {
    throw error
  }

  return { created: 1, updated: 0 }
}

// Processar alertas DEFIS
async function processDEFISAlerts(supabase: any, userId: string, config: any, alertDate: Date) {
  // DEFIS vence em 31 de março
  const currentYear = new Date().getFullYear()
  const defisDeadline = new Date(currentYear, 2, 31) // Março é mês 2 (0-indexed)
  
  // Se já passou o prazo, considerar o próximo ano
  if (defisDeadline < new Date()) {
    defisDeadline.setFullYear(currentYear + 1)
  }

  // Verificar se já existe alerta
  const { data: existingAlert } = await supabase
    .from('fiscal_alerts')
    .select('id')
    .eq('user_id', userId)
    .eq('alert_type', 'DEFIS_PRAZO')
    .eq('due_date', defisDeadline.toISOString().split('T')[0])
    .single()

  if (existingAlert) {
    return { created: 0, updated: 0 }
  }

  // Criar alerta DEFIS
  const { error } = await supabase
    .from('fiscal_alerts')
    .insert({
      user_id: userId,
      alert_type: 'DEFIS_PRAZO',
      title: `DEFIS ${defisDeadline.getFullYear()} vence em ${config.days_before} dias`,
      description: `A Declaração de Informações Socioeconômicas e Fiscais (DEFIS) referente ao ano ${defisDeadline.getFullYear() - 1} deve ser entregue até 31/03/${defisDeadline.getFullYear()}.`,
      priority: config.days_before <= 7 ? 'CRITICAL' : config.days_before <= 15 ? 'HIGH' : 'MEDIUM',
      due_date: defisDeadline.toISOString().split('T')[0],
      alert_date: alertDate.toISOString().split('T')[0],
      suggested_actions: [
        'Reunir documentos necessários',
        'Acessar portal da Receita Federal',
        'Preencher DEFIS',
        'Transmitir declaração'
      ],
      context_data: {
        ano_calendario: defisDeadline.getFullYear() - 1,
        prazo_final: defisDeadline.toISOString().split('T')[0],
        dias_restantes: config.days_before
      }
    })

  if (error) {
    throw error
  }

  return { created: 1, updated: 0 }
}

// Processar alertas de documentos vencidos
async function processDocumentAlerts(supabase: any, userId: string, config: any, alertDate: Date) {
  // Buscar documentos com data de vencimento próxima
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + config.days_before)

  const { data: documents, error } = await supabase
    .from('processed_documents')
    .select('id, filename, extracted_data')
    .eq('user_id', userId)
    .not('extracted_data->dataVencimento', 'is', null)

  if (error) {
    throw error
  }

  let created = 0

  for (const doc of documents || []) {
    const vencimento = doc.extracted_data?.dataVencimento
    if (!vencimento) continue

    const vencimentoDate = new Date(vencimento)
    if (vencimentoDate <= futureDate && vencimentoDate > new Date()) {
      // Verificar se já existe alerta para este documento
      const { data: existingAlert } = await supabase
        .from('fiscal_alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('alert_type', 'DOCUMENTO_VENCIDO')
        .eq('related_document_id', doc.id)
        .single()

      if (!existingAlert) {
        // Criar alerta para documento
        await supabase
          .from('fiscal_alerts')
          .insert({
            user_id: userId,
            alert_type: 'DOCUMENTO_VENCIDO',
            title: `Documento ${doc.filename} vence em breve`,
            description: `O documento ${doc.filename} vence em ${vencimento}.`,
            priority: 'MEDIUM',
            due_date: vencimento,
            alert_date: alertDate.toISOString().split('T')[0],
            related_document_id: doc.id,
            suggested_actions: [
              'Verificar documento',
              'Renovar se necessário',
              'Atualizar registros'
            ],
            context_data: {
              documento_nome: doc.filename,
              data_vencimento: vencimento
            }
          })

        created++
      }
    }
  }

  return { created, updated: 0 }
}

// Enviar notificações de compliance
async function sendComplianceNotifications(supabase: any, channels: string[]) {
  console.log('📧 Enviando notificações de compliance:', channels)
  
  // Implementar envio de notificações conforme canais especificados
  // Por enquanto, apenas log
  
  return true
}
