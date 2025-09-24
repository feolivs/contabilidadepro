import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isInitialized: boolean
  lastAuthEvent: AuthChangeEvent | null
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setInitialized: (initialized: boolean) => void
  setAuthEvent: (event: AuthChangeEvent) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isInitialized: false,
      lastAuthEvent: null,

      setUser: (user) => set({
        user,
        isLoading: false,
        isInitialized: true
      }),

      setSession: (session) => set({
        session,
        user: session?.user || null,
        isLoading: false,
        isInitialized: true
      }),

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),

      setAuthEvent: (lastAuthEvent) => set({ lastAuthEvent }),

      logout: () => set({
        user: null,
        session: null,
        isLoading: false,
        lastAuthEvent: 'SIGNED_OUT'
      }),

      initialize: () => {
        const state = get()
        if (!state.isInitialized && !state.isLoading) {
          set({ isLoading: true })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isInitialized: state.isInitialized
      }),
    }
  )
)
