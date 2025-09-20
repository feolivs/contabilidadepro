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
      search_empresas_advanced: {
        Args: {
          search_query: string
          similarity_threshold?: number
          result_limit?: number
        }
        Returns: Array<{
          data: any
          score: number
          match_type: string
        }>
      }
      search_by_cnpj: {
        Args: {
          cnpj_query: string
        }
        Returns: Array<{
          data: any
          score: number
          match_type: string
        }>
      }
      pgmq_send: {
        Args: {
          queue_name: string
          msg: any
          delay_seconds?: number
        }
        Returns: number
      }
      pgmq_read: {
        Args: {
          queue_name: string
          visibility_timeout?: number
        }
        Returns: Array<{
          msg_id: number
          read_ct: number
          enqueued_at: string
          vt: string
          message: any
        }>
      }
      pgmq_delete: {
        Args: {
          queue_name: string
          msg_id: number
        }
        Returns: boolean
      }
      validate_json_schema: {
        Args: {
          schema: any
          instance: any
        }
        Returns: boolean
      }
      encrypt_data: {
        Args: {
          plaintext: string
          key_id?: string
        }
        Returns: {
          encrypted: string
          key_id: string
          algorithm: string
        }
      }
      decrypt_data: {
        Args: {
          ciphertext: string
          key_id?: string
        }
        Returns: string
      }
      // Adicionar mais funções conforme necessário
    }
    Enums: {
      [_ in never]: never
    }
  }
  n8n_workflows: {
    Tables: {
      execution_logs: {
        Row: {
          id: string
          workflow_id: string
          execution_id: string
          status: 'running' | 'success' | 'error' | 'waiting'
          start_time: string
          end_time: string | null
          input_data: any | null
          output_data: any | null
          error_message: string | null
          metadata: Record<string, string> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          execution_id: string
          status: 'running' | 'success' | 'error' | 'waiting'
          start_time?: string
          end_time?: string | null
          input_data?: any | null
          output_data?: any | null
          error_message?: string | null
          metadata?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          execution_id?: string
          status?: 'running' | 'success' | 'error' | 'waiting'
          start_time?: string
          end_time?: string | null
          input_data?: any | null
          output_data?: any | null
          error_message?: string | null
          metadata?: Record<string, string> | null
          created_at?: string
          updated_at?: string
        }
      }
      fiscal_processing_queue: {
        Row: {
          id: string
          empresa_id: string
          tipo_calculo: 'DAS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS' | 'ICMS'
          periodo_apuracao: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          priority: number
          input_data: any
          result_data: any | null
          error_details: string | null
          workflow_execution_id: string | null
          scheduled_for: string
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          tipo_calculo: 'DAS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS' | 'ICMS'
          periodo_apuracao: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          priority?: number
          input_data: any
          result_data?: any | null
          error_details?: string | null
          workflow_execution_id?: string | null
          scheduled_for?: string
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          tipo_calculo?: 'DAS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS' | 'ICMS'
          periodo_apuracao?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          priority?: number
          input_data?: any
          result_data?: any | null
          error_details?: string | null
          workflow_execution_id?: string | null
          scheduled_for?: string
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      webhook_events: {
        Row: {
          id: string
          event_type: string
          source_system: string
          webhook_url: string
          payload: any
          headers: any | null
          status: 'received' | 'processing' | 'processed' | 'failed'
          response_data: any | null
          retry_count: number
          max_retries: number
          next_retry_at: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          source_system: string
          webhook_url: string
          payload: any
          headers?: any | null
          status?: 'received' | 'processing' | 'processed' | 'failed'
          response_data?: any | null
          retry_count?: number
          max_retries?: number
          next_retry_at?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          source_system?: string
          webhook_url?: string
          payload?: any
          headers?: any | null
          status?: 'received' | 'processing' | 'processed' | 'failed'
          response_data?: any | null
          retry_count?: number
          max_retries?: number
          next_retry_at?: string | null
          processed_at?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      execution_summary: {
        Row: {
          workflow_id: string
          status: string
          total_executions: number
          avg_duration_seconds: number
          last_execution: string
          error_count: number
        }
      }
      queue_status: {
        Row: {
          tipo_calculo: string
          status: string
          count: number
          avg_priority: number
          oldest_pending: string | null
          newest_item: string
        }
      }
    }
    Functions: {
      notify_workflow_change: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
