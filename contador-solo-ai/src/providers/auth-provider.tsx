'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@supabase/supabase-js'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {

  useEffect(() => {
    console.log('🔧 Inicializando AuthProvider com verificação estável')

    const { initialize, setInitialized, setUser, setSession, setLoading } = useAuthStore.getState()

    // Inicializar o store
    initialize()
    setLoading(true)

    // Inicialização estável do Supabase Auth
    const initializeSupabaseAuth = async () => {
      try {
        // Cliente Supabase direto
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        console.log('🔍 Verificando sessão atual...')

        // Tentar obter sessão atual com timeout
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        )

        const sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any

        if (sessionResult && !sessionResult.error && sessionResult.data.session) {
          const session = sessionResult.data.session
          console.log('✅ Sessão válida encontrada:', session.user.email)

          setSession(session)
          setUser(session.user)
        } else {
          console.log('❌ Nenhuma sessão válida encontrada')
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        console.error('🚨 Erro na inicialização da auth:', error)

        // Em caso de erro, limpar estado
        setUser(null)
        setSession(null)
      } finally {
        setLoading(false)
        setInitialized(true)
        console.log('✅ AuthProvider inicializado')
      }
    }

    // Inicializar auth com Supabase
    initializeSupabaseAuth()

    // Configurar listener de mudanças de autenticação
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email)

        const { setSession, setUser, setAuthEvent } = useAuthStore.getState()

        setAuthEvent(event)

        if (session) {
          setSession(session)
          setUser(session.user)
        } else {
          setSession(null)
          setUser(null)
        }
      }
    )

    // Cleanup na desmontagem
    return () => {
      subscription.unsubscribe()
    }


  }, [])

  return <>{children}</>
}

// Hook para verificar se o usuário está autenticado
export function useAuth() {
  const { user, isLoading, session, isInitialized } = useAuthStore()

  return {
    user,
    session,
    isLoading,
    isInitialized,
    isAuthenticated: !!user && !!session
  }
}
