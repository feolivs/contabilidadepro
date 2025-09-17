import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// Configuração direta para evitar problemas de inicialização
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://selnwgpyjctpjzdrfrey.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k'

// Cliente para uso no browser (compatibilidade)
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// Cliente para Client Components
export const createBrowserSupabaseClient = () => {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Cliente simples para Server Components (sem cookies)
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey)
}

// Tipos do banco de dados (serão gerados automaticamente)
export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          nome: string
          cnpj: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string
          created_at?: string
          updated_at?: string
        }
      }
      // Adicionar mais tabelas conforme necessário
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_complete: {
        Args: {
          p_user_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: any
      }
      // Adicionar mais funções conforme necessário
    }
    Enums: {
      [_ in never]: never
    }
  }
}
