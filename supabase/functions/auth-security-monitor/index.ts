// 🔐 AUTH SECURITY MONITOR
// Edge Function para monitoramento de segurança e detecção de ameaças
// Integrado ao sistema ContabilidadePRO

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface SecurityEvent {
  user_id?: string
  event_type: string
  ip_address?: string
  user_agent?: string
  success: boolean
  failure_reason?: string
  metadata?: Record<string, any>
}

interface ThreatAnalysis {
  risk_score: number
  threat_indicators: string[]
  recommended_actions: string[]
  should_block: boolean
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, ...eventData } = await req.json()

    switch (action) {
      case 'log_security_event':
        return await logSecurityEvent(supabase, eventData)
      
      case 'analyze_threat':
        return await analyzeThreat(supabase, eventData)
      
      case 'check_user_security':
        return await checkUserSecurity(supabase, eventData)
      
      case 'get_security_dashboard':
        return await getSecurityDashboard(supabase, eventData)
      
      default:
        throw new Error(`Ação não reconhecida: ${action}`)
    }

  } catch (error) {
    console.error('Erro no auth-security-monitor:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// =====================================================
// FUNÇÕES PRINCIPAIS
// =====================================================

async function logSecurityEvent(supabase: any, eventData: SecurityEvent) {
  try {
    const {
      user_id,
      event_type,
      ip_address,
      user_agent,
      success,
      failure_reason,
      metadata = {}
    } = eventData

    // Análise simples de risco
    let risk_score = 0
    if (!success && event_type && event_type.includes('login')) {
      risk_score = 30
    }
    if (event_type && event_type.includes('mfa') && !success) {
      risk_score = 50
    }

    // Registrar evento
    const { data: event, error } = await supabase
      .from('security_events')
      .insert({
        user_id,
        event_type,
        ip_address,
        user_agent,
        success,
        failure_reason,
        metadata,
        risk_score
      })
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event.id,
        risk_score,
        message: 'Evento de segurança registrado'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro ao registrar evento:', error)
    throw error
  }
}

async function analyzeThreat(supabase: any, data: any) {
  const { user_id, ip_address, event_type } = data

  // Buscar eventos recentes do usuário
  const { data: recentEvents } = await supabase
    .from('security_events')
    .select('*')
    .eq('user_id', user_id)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })

  // Buscar eventos do IP
  const { data: ipEvents } = await supabase
    .from('security_events')
    .select('*')
    .eq('ip_address', ip_address)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

  const analysis = await performThreatAnalysis({
    user_id,
    ip_address,
    event_type,
    recent_events: recentEvents || [],
    ip_events: ipEvents || []
  })

  return new Response(
    JSON.stringify({
      success: true,
      analysis
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function checkUserSecurity(supabase: any, data: any) {
  const { user_id } = data

  // Buscar preferências de segurança
  const { data: preferences } = await supabase
    .from('user_security_preferences')
    .select('*')
    .eq('user_id', user_id)
    .single()

  // Buscar eventos recentes
  const { data: recentEvents } = await supabase
    .from('security_events')
    .select('*')
    .eq('user_id', user_id)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  // Analisar status de segurança
  const securityStatus = analyzeUserSecurityStatus(preferences, recentEvents || [])

  return new Response(
    JSON.stringify({
      success: true,
      security_status: securityStatus,
      preferences,
      recent_events_count: recentEvents?.length || 0
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getSecurityDashboard(supabase: any, data: any) {
  const { user_id, days = 7 } = data
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Métricas de segurança
  const { data: events } = await supabase
    .from('security_events')
    .select('*')
    .eq('user_id', user_id)
    .gte('created_at', startDate.toISOString())

  const dashboard = generateSecurityDashboard(events || [])

  return new Response(
    JSON.stringify({
      success: true,
      dashboard,
      period_days: days
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

async function performThreatAnalysis(data: any): Promise<ThreatAnalysis> {
  let risk_score = 0
  const threat_indicators: string[] = []
  const recommended_actions: string[] = []

  const {
    user_id,
    event_type,
    ip_address,
    success,
    recent_events = [],
    ip_events = []
  } = data || {}

  // Análise de tentativas falhadas
  if (!success && event_type && event_type.includes('login')) {
    const failedAttempts = recent_events.filter(e =>
      e.event_type && e.event_type.includes('login') && !e.success
    ).length

    if (failedAttempts >= 3) {
      risk_score += 30
      threat_indicators.push(`${failedAttempts} tentativas de login falhadas`)
      recommended_actions.push('Considerar bloqueio temporário')
    }
  }

  // Análise de IP suspeito
  if (ip_events.length > 10) {
    risk_score += 20
    threat_indicators.push('Múltiplas tentativas do mesmo IP')
    recommended_actions.push('Verificar origem do IP')
  }

  // Análise de horário suspeito (fora do horário comercial)
  const hour = new Date().getHours()
  if (hour < 6 || hour > 22) {
    risk_score += 10
    threat_indicators.push('Acesso fora do horário comercial')
  }

  // Análise de eventos MFA
  if (event_type && event_type.includes('mfa') && !success) {
    risk_score += 25
    threat_indicators.push('Falha na verificação MFA')
    recommended_actions.push('Notificar usuário sobre tentativa MFA')
  }

  return {
    risk_score: Math.min(risk_score, 100),
    threat_indicators,
    recommended_actions,
    should_block: risk_score >= 70
  }
}

async function handleHighRiskEvent(supabase: any, user_id: string, analysis: ThreatAnalysis) {
  // Registrar alerta de alto risco
  await supabase
    .from('security_audit_log')
    .insert({
      user_id,
      action: 'high_risk_event_detected',
      severity: 'critical',
      category: 'authentication',
      metadata: {
        risk_score: analysis.risk_score,
        threat_indicators: analysis.threat_indicators,
        actions_taken: analysis.recommended_actions
      }
    })

  // Aqui poderia enviar notificação, bloquear conta, etc.
  console.log(`🚨 Alto risco detectado para usuário ${user_id}:`, analysis)
}

function analyzeUserSecurityStatus(preferences: any, events: any[]) {
  const status = {
    mfa_enabled: preferences?.mfa_enabled || false,
    recent_suspicious_activity: false,
    password_age_days: 0, // Seria calculado com base na última mudança
    security_score: 0
  }

  // Calcular score de segurança
  let score = 0
  
  if (status.mfa_enabled) score += 40
  if (!status.recent_suspicious_activity) score += 30
  if (events.filter(e => e.success).length > 0) score += 20
  if (preferences?.allowed_ip_ranges?.length > 0) score += 10

  status.security_score = score

  return status
}

function generateSecurityDashboard(events: any[]) {
  const dashboard = {
    total_events: events.length,
    successful_logins: events.filter(e => e.event_type === 'login_success').length,
    failed_attempts: events.filter(e => e.event_type === 'login_failed').length,
    mfa_events: events.filter(e => e.event_type.includes('mfa')).length,
    high_risk_events: events.filter(e => e.risk_score >= 70).length,
    unique_ips: new Set(events.map(e => e.ip_address)).size,
    events_by_day: {} as Record<string, number>
  }

  // Agrupar eventos por dia
  events.forEach(event => {
    const day = new Date(event.created_at).toISOString().split('T')[0]
    dashboard.events_by_day[day] = (dashboard.events_by_day[day] || 0) + 1
  })

  return dashboard
}
