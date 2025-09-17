'use client'

import { useSupabase } from '@/hooks/use-supabase'
import { useAuthStore } from '@/store/auth-store'
import { useEffect } from 'react'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Inicializar o hook de autenticação
  useSupabase()
  
  return <>{children}</>
}

// Hook para verificar se o usuário está autenticado
export function useAuth() {
  const { user, isLoading } = useAuthStore()
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user
  }
}
