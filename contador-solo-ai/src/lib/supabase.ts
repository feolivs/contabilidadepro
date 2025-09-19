import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// 🔒 SEGURANÇA: Variáveis de ambiente obrigatórias
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '🚨 CONFIGURAÇÃO FALTANDO: Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local'
  )
}

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
