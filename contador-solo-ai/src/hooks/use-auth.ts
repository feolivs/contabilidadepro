// 🔐 USE AUTH HOOK
// Hook para gerenciar autenticação integrado com Zustand store
// Compatível com o sistema ContabilidadePRO existente

'use client'

import { useAuthStore } from '@/store/auth-store'
import { useSupabase } from '@/hooks/use-supabase'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { createAuthErrorHandler, getUserFriendlyMessage } from '@/lib/auth-error-handler'

export interface AuthUser extends User {
  // Extensões específicas do ContabilidadePRO
  role?: string
  permissions?: string[]
}

export function useAuth() {
  const { user, isLoading, setUser, logout: storeLogout } = useAuthStore()
  const supabase = useSupabase()
  const router = useRouter()

  // Error handler personalizado
  const handleAuthError = createAuthErrorHandler((path) => router.push(path))

  // Login com email e senha
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setUser(data.user)
      router.push('/dashboard')
    },
    onError: (error) => {
      const errorInfo = handleAuthError(error)
      console.error('Erro no login:', errorInfo)
    }
  })

  // Login com Google OAuth
  const loginWithGoogleMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) throw error
      return data
    },
    onError: (error) => {
      const errorInfo = handleAuthError(error)
      console.error('Erro no login com Google:', errorInfo)
    }
  })

  // Login com Magic Link (OTP via email)
  const loginWithMagicLinkMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Informar usuário para verificar email
      router.push('/login?message=check-email-magic-link')
    },
    onError: (error) => {
      const errorInfo = handleAuthError(error)
      console.error('Erro ao enviar magic link:', errorInfo)
    }
  })

  // Verificar OTP (para magic links e outros)
  const verifyOtpMutation = useMutation({
    mutationFn: async ({
      email,
      token,
      type = 'email'
    }: {
      email: string;
      token: string;
      type?: 'email' | 'sms' | 'phone_change' | 'signup'
    }) => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type
      })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setUser(data.user)
      router.push('/dashboard')
    },
    onError: (error) => {
      const errorInfo = handleAuthError(error)
      console.error('Erro na verificação OTP:', errorInfo)
    }
  })

  // Registro de novo usuário
  const registerMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      metadata
    }: {
      email: string;
      password: string;
      metadata?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Redirecionar para página de confirmação de email
      router.push('/login?message=check-email')
    },
    onError: (error) => {
      const errorInfo = handleAuthError(error)
      console.error('Erro no registro:', errorInfo)
    }
  })

  // Logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    onSuccess: () => {
      storeLogout()
      router.push('/login')
    },
    onError: (error) => {
      const errorInfo = handleAuthError(error)
      console.error('Erro no logout:', errorInfo)
      // Mesmo com erro, limpar estado local
      storeLogout()
      router.push('/login')
    }
  })

  // Reset de senha
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      return data
    }
  })

  // Atualizar senha
  const updatePasswordMutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      const { data, error } = await supabase.auth.updateUser({
        password
      })

      if (error) throw error
      return data
    }
  })

  // Atualizar perfil do usuário
  const updateProfileMutation = useMutation({
    mutationFn: async ({
      email,
      metadata
    }: {
      email?: string;
      metadata?: Record<string, unknown>
    }) => {
      const updateData: Record<string, unknown> = {}

      if (email) updateData.email = email
      if (metadata) updateData.data = metadata

      const { data, error } = await supabase.auth.updateUser(updateData)

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setUser(data.user)
    }
  })

  // Verificar se usuário está autenticado
  const isAuthenticated = !!user && !isLoading

  // Verificar se usuário tem permissão específica
  const hasPermission = useCallback((permission: string) => {
    if (!user) return false
    
    // Implementar lógica de permissões baseada nos metadados do usuário
    const userPermissions = user.user_metadata?.permissions || []
    return userPermissions.includes(permission)
  }, [user])

  // Verificar se usuário é admin
  const isAdmin = useCallback(() => {
    if (!user) return false
    return user.user_metadata?.role === 'admin'
  }, [user])

  // Sincronizar usuário atual (força refresh)
  const syncUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.getUser()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      setUser(data.user)
    },
    onError: (error) => {
      const errorInfo = handleAuthError(error)
      console.error('Erro ao sincronizar usuário:', errorInfo)
    }
  })

  // Obter dados do perfil do usuário
  const getUserProfile = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!user?.id,
    retry: (failureCount, error: any) => {
      // Não tentar novamente se for erro de autenticação
      if (error?.message?.includes('não autenticado')) return false
      return failureCount < 3
    }
  })

  // Funções de conveniência
  const login = loginMutation.mutate
  const loginWithGoogle = loginWithGoogleMutation.mutate
  const loginWithMagicLink = loginWithMagicLinkMutation.mutate
  const verifyOtp = verifyOtpMutation.mutate
  const register = registerMutation.mutate
  const logout = logoutMutation.mutate
  const resetPassword = resetPasswordMutation.mutate
  const updatePassword = updatePasswordMutation.mutate
  const updateProfile = updateProfileMutation.mutate
  const syncUser = syncUserMutation.mutate

  return {
    // Estado
    user: user as AuthUser | null,
    isLoading,
    isAuthenticated,
    
    // Dados do perfil
    profile: getUserProfile.data,
    profileLoading: getUserProfile.isLoading,
    
    // Funções de autenticação
    login,
    loginWithGoogle,
    loginWithMagicLink,
    verifyOtp,
    register,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    syncUser,

    // Estados de loading das operações
    loginLoading: loginMutation.isPending,
    loginWithMagicLinkLoading: loginWithMagicLinkMutation.isPending,
    verifyOtpLoading: verifyOtpMutation.isPending,
    registerLoading: registerMutation.isPending,
    logoutLoading: logoutMutation.isPending,
    resetPasswordLoading: resetPasswordMutation.isPending,
    updatePasswordLoading: updatePasswordMutation.isPending,
    updateProfileLoading: updateProfileMutation.isPending,
    syncUserLoading: syncUserMutation.isPending,

    // Erros
    loginError: loginMutation.error,
    loginWithMagicLinkError: loginWithMagicLinkMutation.error,
    verifyOtpError: verifyOtpMutation.error,
    registerError: registerMutation.error,
    logoutError: logoutMutation.error,
    resetPasswordError: resetPasswordMutation.error,
    updatePasswordError: updatePasswordMutation.error,
    updateProfileError: updateProfileMutation.error,
    syncUserError: syncUserMutation.error,
    
    // Utilitários
    hasPermission,
    isAdmin,
    getErrorMessage: (error: any) => getUserFriendlyMessage(error),
    
    // Reset de estados
    resetLoginError: loginMutation.reset,
    resetLoginWithMagicLinkError: loginWithMagicLinkMutation.reset,
    resetVerifyOtpError: verifyOtpMutation.reset,
    resetRegisterError: registerMutation.reset,
    resetResetPasswordError: resetPasswordMutation.reset,
    resetUpdatePasswordError: updatePasswordMutation.reset,
    resetUpdateProfileError: updateProfileMutation.reset,
    resetSyncUserError: syncUserMutation.reset
  }
}

// Hook para verificar autenticação em componentes protegidos
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  if (!isLoading && !isAuthenticated) {
    router.push('/login')
    return { isAuthorized: false, isLoading: false }
  }

  return { 
    isAuthorized: isAuthenticated, 
    isLoading 
  }
}

// Hook para verificar permissões específicas
export function useRequirePermission(permission: string) {
  const { hasPermission, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const hasRequiredPermission = hasPermission(permission)

  if (!isLoading && (!isAuthenticated || !hasRequiredPermission)) {
    router.push('/unauthorized')
    return { isAuthorized: false, isLoading: false }
  }

  return { 
    isAuthorized: isAuthenticated && hasRequiredPermission, 
    isLoading 
  }
}

// Hook para verificar se é admin
export function useRequireAdmin() {
  const { isAdmin, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const isUserAdmin = isAdmin()

  if (!isLoading && (!isAuthenticated || !isUserAdmin)) {
    router.push('/unauthorized')
    return { isAuthorized: false, isLoading: false }
  }

  return { 
    isAuthorized: isAuthenticated && isUserAdmin, 
    isLoading 
  }
}
