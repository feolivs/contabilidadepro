// 🔐 SECURITY SERVICE
// Edge Function unificada para gerenciar segurança e MFA no ContabilidadePRO
// Unifica: auth-security-monitor + mfa-enrollment-handler

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Importar bibliotecas para TOTP
import { encode as base32Encode } from 'https://deno.land/std@0.168.0/encoding/base32.ts'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

// =====================================================
// INTERFACES UNIFICADAS
// =====================================================

interface SecurityServiceRequest {
  operation: 
    // Auth Security Monitor Operations
    | 'log_security_event'
    | 'analyze_threat' 
    | 'check_user_security'
    | 'get_security_dashboard'
    // MFA Enrollment Operations
    | 'enroll_mfa'
    | 'verify_mfa'
    | 'unenroll_mfa'
    | 'generate_backup_codes'
    | 'verify_backup_code'
    | 'get_mfa_status'
    // New Unified Operations
    | 'get_security_overview'
    | 'update_security_preferences'
  
  // Dados específicos por operação
  [key: string]: any
}

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

interface MFAEnrollmentRequest {
  user_id: string
  factor_type: 'totp' | 'sms'
  phone_number?: string
}

interface MFAVerificationRequest {
  user_id: string
  factor_id: string
  code: string
}

// =====================================================
// CACHE CONFIGURATION
// =====================================================

interface CacheConfig {
  ttl: number // seconds
  key_prefix: string
}

const CACHE_CONFIG: Record<string, CacheConfig> = {
  'get_mfa_status': { ttl: 300, key_prefix: 'mfa_status' }, // 5 minutos
  'check_user_security': { ttl: 180, key_prefix: 'user_security' }, // 3 minutos
  'get_security_dashboard': { ttl: 600, key_prefix: 'security_dashboard' }, // 10 minutos
  'get_security_overview': { ttl: 300, key_prefix: 'security_overview' }, // 5 minutos
}

// Cache em memória simples
const cache = new Map<string, { data: any, expires: number }>()

// =====================================================
// MAIN HANDLER
// =====================================================

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

    const requestData: SecurityServiceRequest = await req.json()
    const { operation, ...operationData } = requestData

    // Log da operação
    console.log(`🔐 Security Service - Operation: ${operation}`, {
      timestamp: new Date().toISOString(),
      operation,
      hasUserData: !!operationData.user_id
    })

    // Verificar cache primeiro (para operações que suportam cache)
    if (CACHE_CONFIG[operation]) {
      const cached = getCachedData(operation, operationData.user_id)
      if (cached) {
        console.log(`📦 Cache hit for ${operation}`)
        return new Response(
          JSON.stringify(cached),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    let result: any

    switch (operation) {
      // =====================================================
      // AUTH SECURITY MONITOR OPERATIONS
      // =====================================================
      case 'log_security_event':
        result = await logSecurityEvent(supabase, operationData)
        break
      
      case 'analyze_threat':
        result = await analyzeThreat(supabase, operationData)
        break
      
      case 'check_user_security':
        result = await checkUserSecurity(supabase, operationData)
        break
      
      case 'get_security_dashboard':
        result = await getSecurityDashboard(supabase, operationData)
        break

      // =====================================================
      // MFA ENROLLMENT OPERATIONS
      // =====================================================
      case 'enroll_mfa':
        result = await enrollMFA(supabase, operationData)
        break
      
      case 'verify_mfa':
        result = await verifyMFA(supabase, operationData)
        break
      
      case 'unenroll_mfa':
        result = await unenrollMFA(supabase, operationData)
        break
      
      case 'generate_backup_codes':
        result = await generateBackupCodes(supabase, operationData)
        break
      
      case 'verify_backup_code':
        result = await verifyBackupCode(supabase, operationData)
        break
      
      case 'get_mfa_status':
        result = await getMFAStatus(supabase, operationData)
        break

      // =====================================================
      // NEW UNIFIED OPERATIONS
      // =====================================================
      case 'get_security_overview':
        result = await getSecurityOverview(supabase, operationData)
        break
      
      case 'update_security_preferences':
        result = await updateSecurityPreferences(supabase, operationData)
        break

      default:
        throw new Error(`Operação não reconhecida: ${operation}`)
    }

    // Armazenar no cache se aplicável
    if (CACHE_CONFIG[operation] && result.success) {
      setCachedData(operation, operationData.user_id, result)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('🚨 Erro no security-service:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
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
// CACHE FUNCTIONS
// =====================================================

function getCachedData(operation: string, userId?: string): any | null {
  const config = CACHE_CONFIG[operation]
  if (!config || !userId) return null

  const key = `${config.key_prefix}:${userId}`
  const cached = cache.get(key)
  
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  
  // Remove expired cache
  if (cached) {
    cache.delete(key)
  }
  
  return null
}

function setCachedData(operation: string, userId: string | undefined, data: any): void {
  const config = CACHE_CONFIG[operation]
  if (!config || !userId) return

  const key = `${config.key_prefix}:${userId}`
  const expires = Date.now() + (config.ttl * 1000)
  
  cache.set(key, { data, expires })
}

// =====================================================
// AUTH SECURITY MONITOR FUNCTIONS
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

    // Se alto risco, registrar alerta
    if (risk_score >= 50) {
      await handleHighRiskEvent(supabase, user_id, { 
        risk_score, 
        threat_indicators: [`High risk ${event_type}`],
        recommended_actions: ['Review security settings'],
        should_block: risk_score >= 70
      })
    }

    return {
      success: true,
      event_id: event.id,
      risk_score,
      message: 'Evento de segurança registrado com sucesso'
    }

  } catch (error) {
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

  return {
    success: true,
    analysis
  }
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

  return {
    success: true,
    security_status: securityStatus,
    preferences,
    recent_events_count: recentEvents?.length || 0
  }
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

  return {
    success: true,
    dashboard,
    period_days: days
  }
}

// =====================================================
// MFA ENROLLMENT FUNCTIONS
// =====================================================

async function enrollMFA(supabase: any, data: MFAEnrollmentRequest) {
  const { user_id, factor_type, phone_number } = data

  try {
    // Usar a API nativa do Supabase para MFA
    const { data: enrollData, error } = await supabase.auth.mfa.enroll({
      factorType: factor_type,
      friendlyName: `ContabilidadePRO ${factor_type.toUpperCase()}`,
      ...(phone_number && { phone: phone_number })
    })

    if (error) throw error

    // Registrar evento de segurança
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'mfa_setup',
      success: true,
      metadata: {
        factor_type,
        factor_id: enrollData.id
      }
    })

    // Atualizar preferências do usuário
    await supabase
      .from('user_security_preferences')
      .update({
        mfa_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)

    return {
      success: true,
      factor_id: enrollData.id,
      qr_code: enrollData.qr_code,
      secret: enrollData.secret,
      message: 'MFA configurado com sucesso'
    }

  } catch (error) {
    // Registrar falha
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'mfa_setup',
      success: false,
      failure_reason: error.message
    })

    throw error
  }
}

async function verifyMFA(supabase: any, data: MFAVerificationRequest) {
  const { user_id, factor_id, code } = data

  try {
    // Verificar código MFA
    const { data: verifyData, error } = await supabase.auth.mfa.verify({
      factorId: factor_id,
      challengeId: data.challenge_id,
      code
    })

    if (error) throw error

    // Registrar evento de sucesso
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'mfa_verify_success',
      success: true,
      metadata: { factor_id }
    })

    return {
      success: true,
      verified: true,
      message: 'MFA verificado com sucesso'
    }

  } catch (error) {
    // Registrar falha
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'mfa_verify_failed',
      success: false,
      failure_reason: error.message,
      metadata: { factor_id }
    })

    throw error
  }
}

async function unenrollMFA(supabase: any, data: any) {
  const { user_id, factor_id } = data

  try {
    // Remover fator MFA
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: factor_id
    })

    if (error) throw error

    // Verificar se ainda há outros fatores ativos
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const hasActiveFactor = factors?.some(f => f.status === 'verified')

    // Atualizar preferências se não há mais fatores
    if (!hasActiveFactor) {
      await supabase
        .from('user_security_preferences')
        .update({
          mfa_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
    }

    // Remover códigos de backup
    await supabase
      .from('mfa_backup_codes')
      .delete()
      .eq('user_id', user_id)

    // Registrar evento
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'mfa_unenroll',
      success: true,
      metadata: { factor_id }
    })

    return {
      success: true,
      message: 'MFA removido com sucesso'
    }

  } catch (error) {
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'mfa_unenroll',
      success: false,
      failure_reason: error.message
    })

    throw error
  }
}

async function generateBackupCodes(supabase: any, data: any) {
  const { user_id } = data

  try {
    // Gerar 10 códigos de backup
    const backupCodes = []

    for (let i = 0; i < 10; i++) {
      const code = generateRandomCode()
      const codeHash = await hashCode(code)

      backupCodes.push({
        code, // Retornar apenas uma vez para o usuário
        hash: codeHash
      })
    }

    // Remover códigos antigos
    await supabase
      .from('mfa_backup_codes')
      .delete()
      .eq('user_id', user_id)

    // Inserir novos códigos (apenas hash)
    const { error } = await supabase
      .from('mfa_backup_codes')
      .insert(
        backupCodes.map(({ hash }) => ({
          user_id,
          code_hash: hash
        }))
      )

    if (error) throw error

    // Atualizar preferências
    await supabase
      .from('user_security_preferences')
      .update({
        mfa_backup_codes_generated: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)

    // Registrar evento
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'backup_codes_generated',
      success: true,
      metadata: { codes_count: backupCodes.length }
    })

    return {
      success: true,
      backup_codes: backupCodes.map(c => c.code),
      message: 'Códigos de backup gerados com sucesso'
    }

  } catch (error) {
    throw error
  }
}

async function verifyBackupCode(supabase: any, data: any) {
  const { user_id, code } = data

  try {
    const codeHash = await hashCode(code)

    // Buscar código não usado
    const { data: backupCode, error } = await supabase
      .from('mfa_backup_codes')
      .select('*')
      .eq('user_id', user_id)
      .eq('code_hash', codeHash)
      .eq('used', false)
      .single()

    if (error || !backupCode) {
      throw new Error('Código de backup inválido ou já utilizado')
    }

    // Marcar código como usado
    await supabase
      .from('mfa_backup_codes')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', backupCode.id)

    // Registrar evento
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'backup_code_used',
      success: true,
      metadata: { backup_code_id: backupCode.id }
    })

    return {
      success: true,
      verified: true,
      message: 'Código de backup verificado com sucesso'
    }

  } catch (error) {
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'backup_code_failed',
      success: false,
      failure_reason: error.message
    })

    throw error
  }
}

async function getMFAStatus(supabase: any, data: any) {
  const { user_id } = data

  try {
    // Buscar fatores MFA
    const { data: factors } = await supabase.auth.mfa.listFactors()

    // Buscar preferências
    const { data: preferences } = await supabase
      .from('user_security_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single()

    // Contar códigos de backup disponíveis
    const { data: backupCodes } = await supabase
      .from('mfa_backup_codes')
      .select('used')
      .eq('user_id', user_id)

    const availableBackupCodes = backupCodes?.filter(c => !c.used).length || 0

    return {
      success: true,
      mfa_enabled: preferences?.mfa_enabled || false,
      factors: factors || [],
      backup_codes_available: availableBackupCodes,
      preferences
    }

  } catch (error) {
    throw error
  }
}

// =====================================================
// NEW UNIFIED OPERATIONS
// =====================================================

async function getSecurityOverview(supabase: any, data: any) {
  const { user_id } = data

  try {
    // Buscar status MFA
    const mfaStatus = await getMFAStatus(supabase, { user_id })

    // Buscar status de segurança
    const securityStatus = await checkUserSecurity(supabase, { user_id })

    // Buscar eventos recentes (últimas 24h)
    const { data: recentEvents } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Calcular score de segurança geral
    const overallSecurityScore = calculateOverallSecurityScore(
      mfaStatus,
      securityStatus.security_status,
      recentEvents || []
    )

    return {
      success: true,
      overview: {
        security_score: overallSecurityScore,
        mfa_status: mfaStatus,
        security_status: securityStatus.security_status,
        recent_events: recentEvents || [],
        recommendations: generateSecurityRecommendations(overallSecurityScore, mfaStatus)
      }
    }

  } catch (error) {
    throw error
  }
}

async function updateSecurityPreferences(supabase: any, data: any) {
  const { user_id, preferences } = data

  try {
    // Atualizar preferências
    const { data: updated, error } = await supabase
      .from('user_security_preferences')
      .update({
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) throw error

    // Registrar evento
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'security_preferences_updated',
      success: true,
      metadata: { updated_fields: Object.keys(preferences) }
    })

    // Invalidar cache
    const cacheKeys = ['user_security', 'security_overview', 'mfa_status']
    cacheKeys.forEach(prefix => {
      const key = `${prefix}:${user_id}`
      cache.delete(key)
    })

    return {
      success: true,
      preferences: updated,
      message: 'Preferências de segurança atualizadas com sucesso'
    }

  } catch (error) {
    throw error
  }
}

// =====================================================
// AUXILIARY FUNCTIONS
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
    successful_events: events.filter(e => e.success).length,
    failed_events: events.filter(e => !e.success).length,
    high_risk_events: events.filter(e => e.risk_score >= 50).length,
    event_types: {} as Record<string, number>,
    risk_distribution: {
      low: events.filter(e => e.risk_score < 30).length,
      medium: events.filter(e => e.risk_score >= 30 && e.risk_score < 70).length,
      high: events.filter(e => e.risk_score >= 70).length
    }
  }

  // Contar tipos de eventos
  events.forEach(event => {
    dashboard.event_types[event.event_type] = (dashboard.event_types[event.event_type] || 0) + 1
  })

  return dashboard
}

function calculateOverallSecurityScore(mfaStatus: any, securityStatus: any, recentEvents: any[]): number {
  let score = 0

  // Base score from security status
  score += securityStatus.security_score * 0.4

  // MFA bonus
  if (mfaStatus.mfa_enabled) {
    score += 30
    if (mfaStatus.factors?.some((f: any) => f.status === 'verified')) {
      score += 10
    }
  }

  // Recent activity penalty
  const failedEvents = recentEvents.filter(e => !e.success).length
  if (failedEvents > 0) {
    score -= Math.min(failedEvents * 5, 20)
  }

  // High risk events penalty
  const highRiskEvents = recentEvents.filter(e => e.risk_score >= 50).length
  if (highRiskEvents > 0) {
    score -= Math.min(highRiskEvents * 10, 30)
  }

  return Math.max(0, Math.min(100, score))
}

function generateSecurityRecommendations(securityScore: number, mfaStatus: any): string[] {
  const recommendations: string[] = []

  if (securityScore < 50) {
    recommendations.push('Seu nível de segurança está baixo. Considere melhorar suas configurações.')
  }

  if (!mfaStatus.mfa_enabled) {
    recommendations.push('Ative a autenticação de dois fatores (MFA) para maior segurança.')
  }

  if (mfaStatus.backup_codes_available === 0 && mfaStatus.mfa_enabled) {
    recommendations.push('Gere códigos de backup para seu MFA.')
  }

  if (securityScore >= 80) {
    recommendations.push('Excelente! Suas configurações de segurança estão bem configuradas.')
  }

  return recommendations
}

// =====================================================
// MFA UTILITY FUNCTIONS
// =====================================================

function generateRandomCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
