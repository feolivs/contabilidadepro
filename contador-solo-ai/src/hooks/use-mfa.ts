// 🔐 USE MFA HOOK
// Hook personalizado para gerenciar MFA no ContabilidadePRO
// Integrado com Supabase Auth e Edge Functions

'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from './use-supabase'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'react-hot-toast'

interface MFAFactor {
  id: string
  type: 'totp' | 'sms'
  friendly_name: string
  status: 'unverified' | 'verified'
  created_at: string
}

interface MFAStatus {
  mfa_enabled: boolean
  factors: MFAFactor[]
  backup_codes_available: number
  preferences: any
}

interface EnrollMFAData {
  factor_type: 'totp' | 'sms'
  phone_number?: string
}

interface VerifyMFAData {
  factor_id: string
  code: string
}

export function useMFA() {
  const supabase = useSupabase()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [isEnrolling, setIsEnrolling] = useState(false)

  // =====================================================
  // QUERIES
  // =====================================================

  // Buscar status MFA do usuário
  const {
    data: mfaStatus,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery({
    queryKey: ['mfa-status', user?.id],
    queryFn: async (): Promise<MFAStatus> => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('mfa-enrollment-handler', {
        body: {
          action: 'get_mfa_status',
          user_id: user.id
        }
      })

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // =====================================================
  // MUTATIONS
  // =====================================================

  // Cadastrar MFA
  const enrollMFA = useMutation({
    mutationFn: async (data: EnrollMFAData) => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      setIsEnrolling(true)

      const { data: result, error } = await supabase.functions.invoke('mfa-enrollment-handler', {
        body: {
          action: 'enroll_mfa',
          user_id: user.id,
          ...data
        }
      })

      if (error) throw error
      return result
    },
    onSuccess: (data) => {
      toast.success('MFA configurado com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] })
      setIsEnrolling(false)
    },
    onError: (error: any) => {
      toast.error(`Erro ao configurar MFA: ${error.message}`)
      setIsEnrolling(false)
    }
  })

  // Verificar código MFA
  const verifyMFA = useMutation({
    mutationFn: async (data: VerifyMFAData) => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data: result, error } = await supabase.functions.invoke('mfa-enrollment-handler', {
        body: {
          action: 'verify_mfa',
          user_id: user.id,
          ...data
        }
      })

      if (error) throw error
      return result
    },
    onSuccess: () => {
      toast.success('Código MFA verificado!')
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: (error: any) => {
      toast.error(`Código MFA inválido: ${error.message}`)
    }
  })

  // Remover MFA
  const unenrollMFA = useMutation({
    mutationFn: async (factor_id: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data: result, error } = await supabase.functions.invoke('mfa-enrollment-handler', {
        body: {
          action: 'unenroll_mfa',
          user_id: user.id,
          factor_id
        }
      })

      if (error) throw error
      return result
    },
    onSuccess: () => {
      toast.success('MFA removido com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover MFA: ${error.message}`)
    }
  })

  // Gerar códigos de backup
  const generateBackupCodes = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data: result, error } = await supabase.functions.invoke('mfa-enrollment-handler', {
        body: {
          action: 'generate_backup_codes',
          user_id: user.id
        }
      })

      if (error) throw error
      return result
    },
    onSuccess: () => {
      toast.success('Códigos de backup gerados!')
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar códigos: ${error.message}`)
    }
  })

  // Verificar código de backup
  const verifyBackupCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data: result, error } = await supabase.functions.invoke('mfa-enrollment-handler', {
        body: {
          action: 'verify_backup_code',
          user_id: user.id,
          code
        }
      })

      if (error) throw error
      return result
    },
    onSuccess: () => {
      toast.success('Código de backup verificado!')
      queryClient.invalidateQueries({ queryKey: ['mfa-status'] })
    },
    onError: (error: any) => {
      toast.error(`Código de backup inválido: ${error.message}`)
    }
  })

  // =====================================================
  // FUNÇÕES AUXILIARES
  // =====================================================

  const isMFAEnabled = mfaStatus?.mfa_enabled || false
  const hasVerifiedFactor = mfaStatus?.factors?.some(f => f.status === 'verified') || false
  const availableBackupCodes = mfaStatus?.backup_codes_available || 0

  const getMFARequirement = (operation: string) => {
    const preferences = mfaStatus?.preferences
    
    if (!preferences) return false

    // Operações que sempre requerem MFA se habilitado
    const sensitiveOperations = [
      'financial_calculation',
      'document_upload',
      'company_creation',
      'security_settings'
    ]

    if (preferences.require_mfa_for_sensitive_ops && sensitiveOperations.includes(operation)) {
      return isMFAEnabled
    }

    return false
  }

  const canPerformOperation = (operation: string) => {
    const requiresMFA = getMFARequirement(operation)
    
    if (!requiresMFA) return true
    
    // Se requer MFA, verificar se está configurado e verificado
    return hasVerifiedFactor
  }

  // =====================================================
  // RETURN
  // =====================================================

  return {
    // Estado
    mfaStatus,
    isLoadingStatus,
    statusError,
    isEnrolling,
    isMFAEnabled,
    hasVerifiedFactor,
    availableBackupCodes,

    // Mutations
    enrollMFA,
    verifyMFA,
    unenrollMFA,
    generateBackupCodes,
    verifyBackupCode,

    // Funções auxiliares
    getMFARequirement,
    canPerformOperation,
    refetchStatus,

    // Estados de loading
    isEnrollingMFA: enrollMFA.isPending,
    isVerifyingMFA: verifyMFA.isPending,
    isUnenrollingMFA: unenrollMFA.isPending,
    isGeneratingBackupCodes: generateBackupCodes.isPending,
    isVerifyingBackupCode: verifyBackupCode.isPending,
  }
}

// =====================================================
// HOOK PARA EVENTOS DE SEGURANÇA
// =====================================================

export function useSecurityEvents() {
  const supabase = useSupabase()
  const { user } = useAuthStore()

  // Buscar eventos de segurança
  const {
    data: securityEvents,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['security-events', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })

  // Registrar evento de segurança
  const logSecurityEvent = useMutation({
    mutationFn: async (eventData: any) => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('auth-security-monitor', {
        body: {
          action: 'log_security_event',
          user_id: user.id,
          ...eventData
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      refetch()
    }
  })

  return {
    securityEvents,
    isLoading,
    error,
    logSecurityEvent,
    refetch
  }
}

// =====================================================
// HOOK PARA DASHBOARD DE SEGURANÇA
// =====================================================

export function useSecurityDashboard(days: number = 7) {
  const supabase = useSupabase()
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['security-dashboard', user?.id, days],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.functions.invoke('auth-security-monitor', {
        body: {
          action: 'get_security_dashboard',
          user_id: user.id,
          days
        }
      })

      if (error) throw error
      return data
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}
