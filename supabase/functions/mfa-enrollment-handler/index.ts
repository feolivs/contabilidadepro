// 🔐 MFA ENROLLMENT HANDLER
// Edge Function para gerenciar cadastro e verificação de MFA
// Integrado ao sistema ContabilidadePRO

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Importar bibliotecas para TOTP
import { encode as base32Encode } from 'https://deno.land/std@0.168.0/encoding/base32.ts'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

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

    const { action, ...requestData } = await req.json()

    switch (action) {
      case 'enroll_mfa':
        return await enrollMFA(supabase, requestData)
      
      case 'verify_mfa':
        return await verifyMFA(supabase, requestData)
      
      case 'unenroll_mfa':
        return await unenrollMFA(supabase, requestData)
      
      case 'generate_backup_codes':
        return await generateBackupCodes(supabase, requestData)
      
      case 'verify_backup_code':
        return await verifyBackupCode(supabase, requestData)
      
      case 'get_mfa_status':
        return await getMFAStatus(supabase, requestData)
      
      default:
        throw new Error(`Ação não reconhecida: ${action}`)
    }

  } catch (error) {
    console.error('Erro no mfa-enrollment-handler:', error)
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

    return new Response(
      JSON.stringify({
        success: true,
        factor_id: enrollData.id,
        qr_code: enrollData.qr_code,
        secret: enrollData.secret,
        message: 'MFA configurado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

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
    // Verificar código MFA usando Supabase
    const { data: verifyData, error } = await supabase.auth.mfa.verify({
      factorId: factor_id,
      code: code
    })

    if (error) throw error

    // Registrar evento de sucesso
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'mfa_verify_success',
      success: true,
      metadata: {
        factor_id,
        verification_method: 'totp'
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        access_token: verifyData.access_token,
        refresh_token: verifyData.refresh_token,
        message: 'MFA verificado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'MFA removido com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

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

    return new Response(
      JSON.stringify({
        success: true,
        backup_codes: backupCodes.map(c => c.code),
        message: 'Códigos de backup gerados. Guarde-os em local seguro!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'backup_codes_generated',
      success: false,
      failure_reason: error.message
    })

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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Código de backup verificado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    await logSecurityEvent(supabase, {
      user_id,
      event_type: 'backup_code_used',
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

    return new Response(
      JSON.stringify({
        success: true,
        mfa_enabled: preferences?.mfa_enabled || false,
        factors: factors || [],
        backup_codes_available: availableBackupCodes,
        preferences
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    throw error
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

async function logSecurityEvent(supabase: any, eventData: any) {
  await supabase
    .from('security_events')
    .insert(eventData)
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
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
