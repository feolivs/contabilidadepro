export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          last_activity: string | null
          mfa_verified: boolean | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          mfa_verified?: boolean | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          last_activity?: string | null
          mfa_verified?: boolean | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          created_at: string | null
          expires_at: string
          hit_count: number | null
          id: string
          key: string
          query_type: string | null
          user_id: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          hit_count?: number | null
          id?: string
          key: string
          query_type?: string | null
          user_id?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          key?: string
          query_type?: string | null
          user_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      ai_insights: {
        Row: {
          alertas_prioritarios: Json
          analise_compliance: Json
          analise_financeira: Json
          benchmarking: Json
          confianca_analise: number | null
          configuracao_geracao: Json
          created_at: string
          data_geracao: string
          empresa_id: string
          id: string
          insights_operacionais: Json
          limitacoes: Json
          modelo_usado: string
          nivel_detalhamento: string
          projecoes_estrategicas: Json
          proxima_revisao_sugerida: string | null
          resumo_executivo: Json
          tempo_processamento_ms: number
          tipo_insight: string
          tokens_utilizados: number
          updated_at: string
          valido_ate: string | null
        }
        Insert: {
          alertas_prioritarios?: Json
          analise_compliance?: Json
          analise_financeira?: Json
          benchmarking?: Json
          confianca_analise?: number | null
          configuracao_geracao?: Json
          created_at?: string
          data_geracao?: string
          empresa_id: string
          id?: string
          insights_operacionais?: Json
          limitacoes?: Json
          modelo_usado?: string
          nivel_detalhamento: string
          projecoes_estrategicas?: Json
          proxima_revisao_sugerida?: string | null
          resumo_executivo?: Json
          tempo_processamento_ms?: number
          tipo_insight: string
          tokens_utilizados?: number
          updated_at?: string
          valido_ate?: string | null
        }
        Update: {
          alertas_prioritarios?: Json
          analise_compliance?: Json
          analise_financeira?: Json
          benchmarking?: Json
          confianca_analise?: number | null
          configuracao_geracao?: Json
          created_at?: string
          data_geracao?: string
          empresa_id?: string
          id?: string
          insights_operacionais?: Json
          limitacoes?: Json
          modelo_usado?: string
          nivel_detalhamento?: string
          projecoes_estrategicas?: Json
          proxima_revisao_sugerida?: string | null
          resumo_executivo?: Json
          tempo_processamento_ms?: number
          tipo_insight?: string
          tokens_utilizados?: number
          updated_at?: string
          valido_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights_cache: {
        Row: {
          confianca_cache: number
          config_hash: string
          configuracao_original: Json
          created_at: string
          empresa_id: string
          expires_at: string
          hit_count: number
          id: string
          insights_data: Json
          last_hit_at: string | null
          modelo_usado: string
          tempo_geracao_ms: number
          tipo_insight: string
          tokens_utilizados: number
          updated_at: string
        }
        Insert: {
          confianca_cache?: number
          config_hash: string
          configuracao_original: Json
          created_at?: string
          empresa_id: string
          expires_at: string
          hit_count?: number
          id?: string
          insights_data: Json
          last_hit_at?: string | null
          modelo_usado?: string
          tempo_geracao_ms?: number
          tipo_insight: string
          tokens_utilizados?: number
          updated_at?: string
        }
        Update: {
          confianca_cache?: number
          config_hash?: string
          configuracao_original?: Json
          created_at?: string
          empresa_id?: string
          expires_at?: string
          hit_count?: number
          id?: string
          insights_data?: Json
          last_hit_at?: string | null
          modelo_usado?: string
          tempo_geracao_ms?: number
          tipo_insight?: string
          tokens_utilizados?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_cache_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_metrics: {
        Row: {
          cache_hit: boolean | null
          cache_lookup_time_ms: number | null
          created_at: string | null
          error_message: string | null
          error_occurred: boolean | null
          error_type: string | null
          id: string
          ip_address: unknown | null
          openai_time_ms: number | null
          query_text: string
          query_type: string | null
          response_cached: boolean | null
          response_length: number | null
          retry_count: number | null
          session_id: string | null
          streaming: boolean | null
          tokens_used: number | null
          total_time_ms: number
          user_agent: string | null
          user_feedback: string | null
          user_id: string | null
          user_satisfaction: number | null
        }
        Insert: {
          cache_hit?: boolean | null
          cache_lookup_time_ms?: number | null
          created_at?: string | null
          error_message?: string | null
          error_occurred?: boolean | null
          error_type?: string | null
          id?: string
          ip_address?: unknown | null
          openai_time_ms?: number | null
          query_text: string
          query_type?: string | null
          response_cached?: boolean | null
          response_length?: number | null
          retry_count?: number | null
          session_id?: string | null
          streaming?: boolean | null
          tokens_used?: number | null
          total_time_ms: number
          user_agent?: string | null
          user_feedback?: string | null
          user_id?: string | null
          user_satisfaction?: number | null
        }
        Update: {
          cache_hit?: boolean | null
          cache_lookup_time_ms?: number | null
          created_at?: string | null
          error_message?: string | null
          error_occurred?: boolean | null
          error_type?: string | null
          id?: string
          ip_address?: unknown | null
          openai_time_ms?: number | null
          query_text?: string
          query_type?: string | null
          response_cached?: boolean | null
          response_length?: number | null
          retry_count?: number | null
          session_id?: string | null
          streaming?: boolean | null
          tokens_used?: number | null
          total_time_ms?: number
          user_agent?: string | null
          user_feedback?: string | null
          user_id?: string | null
          user_satisfaction?: number | null
        }
        Relationships: []
      }
      alert_configurations: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          configuration: Json | null
          created_at: string | null
          days_before: number | null
          enabled: boolean | null
          id: string
          notification_frequency:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          configuration?: Json | null
          created_at?: string | null
          days_before?: number | null
          enabled?: boolean | null
          id?: string
          notification_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          configuration?: Json | null
          created_at?: string | null
          days_before?: number | null
          enabled?: boolean | null
          id?: string
          notification_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alert_escalation_history: {
        Row: {
          alert_id: string
          channels_used: string[] | null
          escalated_at: string | null
          escalated_from: Database["public"]["Enums"]["alert_priority"]
          escalated_to: Database["public"]["Enums"]["alert_priority"]
          escalation_actions: string[]
          escalation_reason: string
          hours_unacknowledged: number
          id: string
          metadata: Json | null
          notifications_sent: number | null
          user_id: string
        }
        Insert: {
          alert_id: string
          channels_used?: string[] | null
          escalated_at?: string | null
          escalated_from: Database["public"]["Enums"]["alert_priority"]
          escalated_to: Database["public"]["Enums"]["alert_priority"]
          escalation_actions: string[]
          escalation_reason: string
          hours_unacknowledged: number
          id?: string
          metadata?: Json | null
          notifications_sent?: number | null
          user_id: string
        }
        Update: {
          alert_id?: string
          channels_used?: string[] | null
          escalated_at?: string | null
          escalated_from?: Database["public"]["Enums"]["alert_priority"]
          escalated_to?: Database["public"]["Enums"]["alert_priority"]
          escalation_actions?: string[]
          escalation_reason?: string
          hours_unacknowledged?: number
          id?: string
          metadata?: Json | null
          notifications_sent?: number | null
          user_id?: string
        }
        Relationships: []
      }
      alert_escalation_rules: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string | null
          enabled: boolean | null
          escalation_actions: string[] | null
          escalation_channels: string[] | null
          hours_unacknowledged: number | null
          id: string
          new_frequency:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          new_priority: Database["public"]["Enums"]["alert_priority"] | null
          priority: Database["public"]["Enums"]["alert_priority"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string | null
          enabled?: boolean | null
          escalation_actions?: string[] | null
          escalation_channels?: string[] | null
          hours_unacknowledged?: number | null
          id?: string
          new_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          new_priority?: Database["public"]["Enums"]["alert_priority"] | null
          priority: Database["public"]["Enums"]["alert_priority"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string | null
          enabled?: boolean | null
          escalation_actions?: string[] | null
          escalation_channels?: string[] | null
          hours_unacknowledged?: number | null
          id?: string
          new_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          new_priority?: Database["public"]["Enums"]["alert_priority"] | null
          priority?: Database["public"]["Enums"]["alert_priority"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_cache: {
        Row: {
          cache_data: Json
          cache_key: string
          cache_type: string
          compression_ratio: number | null
          created_at: string
          data_size_bytes: number
          empresa_id: string | null
          expires_at: string
          hit_count: number
          id: string
          last_hit_at: string | null
          metadata: Json
          updated_at: string
        }
        Insert: {
          cache_data: Json
          cache_key: string
          cache_type: string
          compression_ratio?: number | null
          created_at?: string
          data_size_bytes?: number
          empresa_id?: string | null
          expires_at: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          metadata?: Json
          updated_at?: string
        }
        Update: {
          cache_data?: Json
          cache_key?: string
          cache_type?: string
          compression_ratio?: number | null
          created_at?: string
          data_size_bytes?: number
          empresa_id?: string | null
          expires_at?: string
          hit_count?: number
          id?: string
          last_hit_at?: string | null
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_cache_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          processing_time_ms: number | null
          timestamp: string | null
          user_id: string | null
          value_numeric: number | null
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          processing_time_ms?: number | null
          timestamp?: string | null
          user_id?: string | null
          value_numeric?: number | null
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          processing_time_ms?: number | null
          timestamp?: string | null
          user_id?: string | null
          value_numeric?: number | null
        }
        Relationships: []
      }
      cache_invalidation_log: {
        Row: {
          cache_key: string
          cache_type: string
          empresa_id: string | null
          id: string
          invalidation_reason: string
          metadata: Json
          timestamp: string
          triggered_by: string | null
        }
        Insert: {
          cache_key: string
          cache_type: string
          empresa_id?: string | null
          id?: string
          invalidation_reason: string
          metadata?: Json
          timestamp?: string
          triggered_by?: string | null
        }
        Update: {
          cache_key?: string
          cache_type?: string
          empresa_id?: string | null
          id?: string
          invalidation_reason?: string
          metadata?: Json
          timestamp?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cache_invalidation_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      calculos_fiscais: {
        Row: {
          aliquota_efetiva: number
          aliquota_nominal: number
          anexo_simples: string | null
          aprovado_por: string | null
          base_calculo: number
          calculado_automaticamente: boolean | null
          calculado_por: string | null
          codigo_barras: string | null
          cofins: number | null
          competencia: string
          cpp: number | null
          created_at: string | null
          csll: number | null
          data_aprovacao: string | null
          data_pagamento: string | null
          data_vencimento: string
          deducoes: number | null
          empresa_id: string
          fator_r: number | null
          faturamento_12_meses: number
          faturamento_bruto: number
          icms: number | null
          id: string
          irpj: number | null
          iss: number | null
          linha_digitavel: string | null
          observacoes: string | null
          pis: number | null
          regime_tributario: string
          status: string | null
          tipo_calculo: string
          updated_at: string | null
          user_id: string
          valor_imposto: number
          valor_juros: number | null
          valor_multa: number | null
          valor_total: number
        }
        Insert: {
          aliquota_efetiva?: number
          aliquota_nominal?: number
          anexo_simples?: string | null
          aprovado_por?: string | null
          base_calculo?: number
          calculado_automaticamente?: boolean | null
          calculado_por?: string | null
          codigo_barras?: string | null
          cofins?: number | null
          competencia: string
          cpp?: number | null
          created_at?: string | null
          csll?: number | null
          data_aprovacao?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          deducoes?: number | null
          empresa_id: string
          fator_r?: number | null
          faturamento_12_meses?: number
          faturamento_bruto?: number
          icms?: number | null
          id?: string
          irpj?: number | null
          iss?: number | null
          linha_digitavel?: string | null
          observacoes?: string | null
          pis?: number | null
          regime_tributario: string
          status?: string | null
          tipo_calculo: string
          updated_at?: string | null
          user_id: string
          valor_imposto?: number
          valor_juros?: number | null
          valor_multa?: number | null
          valor_total?: number
        }
        Update: {
          aliquota_efetiva?: number
          aliquota_nominal?: number
          anexo_simples?: string | null
          aprovado_por?: string | null
          base_calculo?: number
          calculado_automaticamente?: boolean | null
          calculado_por?: string | null
          codigo_barras?: string | null
          cofins?: number | null
          competencia?: string
          cpp?: number | null
          created_at?: string | null
          csll?: number | null
          data_aprovacao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          deducoes?: number | null
          empresa_id?: string
          fator_r?: number | null
          faturamento_12_meses?: number
          faturamento_bruto?: number
          icms?: number | null
          id?: string
          irpj?: number | null
          iss?: number | null
          linha_digitavel?: string | null
          observacoes?: string | null
          pis?: number | null
          regime_tributario?: string
          status?: string | null
          tipo_calculo?: string
          updated_at?: string | null
          user_id?: string
          valor_imposto?: number
          valor_juros?: number | null
          valor_multa?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_calculos_fiscais_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cnpj_cache: {
        Row: {
          cnpj: string
          created_at: string | null
          data: Json
          expires_at: string | null
          fonte: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          cnpj: string
          created_at?: string | null
          data: Json
          expires_at?: string | null
          fonte?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          cnpj?: string
          created_at?: string | null
          data?: Json
          expires_at?: string | null
          fonte?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      compliance_analysis: {
        Row: {
          alertas_urgentes: Json
          configuracao_analise: Json
          consistencia_dados: Json
          created_at: string
          data_analise: string
          documentos_analisados: number
          empresa_id: string
          historico_compliance: Json
          id: string
          nivel: string
          obrigacoes_fiscais: Json
          periodo_analise_fim: string | null
          periodo_analise_inicio: string | null
          prazos_fiscais: Json
          qualidade_documentacao: Json
          riscos_identificados: Json
          score_geral: number
          updated_at: string
          versao_analyzer: string
        }
        Insert: {
          alertas_urgentes?: Json
          configuracao_analise?: Json
          consistencia_dados?: Json
          created_at?: string
          data_analise?: string
          documentos_analisados?: number
          empresa_id: string
          historico_compliance?: Json
          id?: string
          nivel: string
          obrigacoes_fiscais?: Json
          periodo_analise_fim?: string | null
          periodo_analise_inicio?: string | null
          prazos_fiscais?: Json
          qualidade_documentacao?: Json
          riscos_identificados?: Json
          score_geral: number
          updated_at?: string
          versao_analyzer?: string
        }
        Update: {
          alertas_urgentes?: Json
          configuracao_analise?: Json
          consistencia_dados?: Json
          created_at?: string
          data_analise?: string
          documentos_analisados?: number
          empresa_id?: string
          historico_compliance?: Json
          id?: string
          nivel?: string
          obrigacoes_fiscais?: Json
          periodo_analise_fim?: string | null
          periodo_analise_inicio?: string | null
          prazos_fiscais?: Json
          qualidade_documentacao?: Json
          riscos_identificados?: Json
          score_geral?: number
          updated_at?: string
          versao_analyzer?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_analysis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas_ia: {
        Row: {
          confianca: number
          created_at: string | null
          empresas_relacionadas: string[] | null
          id: string
          pergunta: string
          resposta: string
          tempo_resposta: number
          tipo_consulta: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confianca: number
          created_at?: string | null
          empresas_relacionadas?: string[] | null
          id?: string
          pergunta: string
          resposta: string
          tempo_resposta: number
          tipo_consulta: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confianca?: number
          created_at?: string | null
          empresas_relacionadas?: string[] | null
          id?: string
          pergunta?: string
          resposta?: string
          tempo_resposta?: number
          tipo_consulta?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversas_ia: {
        Row: {
          contexto: Json | null
          created_at: string | null
          empresa_id: string | null
          feedback: number | null
          id: string
          modelo_usado: string
          pergunta: string
          resposta: string
          tempo_resposta: number | null
          tipo_consulta: string
          tokens_usados: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contexto?: Json | null
          created_at?: string | null
          empresa_id?: string | null
          feedback?: number | null
          id?: string
          modelo_usado?: string
          pergunta: string
          resposta: string
          tempo_resposta?: number | null
          tipo_consulta?: string
          tokens_usados?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contexto?: Json | null
          created_at?: string | null
          empresa_id?: string | null
          feedback?: number | null
          id?: string
          modelo_usado?: string
          pergunta?: string
          resposta?: string
          tempo_resposta?: number | null
          tipo_consulta?: string
          tokens_usados?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversas_ia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_estruturados: {
        Row: {
          campos_extraidos: string[]
          confianca_extracao: number
          created_at: string
          dados_processados: Json
          data_processamento: string
          documento_id: string | null
          erros_validacao: Json
          id: string
          metadados_processamento: Json
          processado_por: string
          tipo_documento: string
          updated_at: string
          versao_processador: string
        }
        Insert: {
          campos_extraidos?: string[]
          confianca_extracao?: number
          created_at?: string
          dados_processados?: Json
          data_processamento?: string
          documento_id?: string | null
          erros_validacao?: Json
          id?: string
          metadados_processamento?: Json
          processado_por?: string
          tipo_documento: string
          updated_at?: string
          versao_processador?: string
        }
        Update: {
          campos_extraidos?: string[]
          confianca_extracao?: number
          created_at?: string
          dados_processados?: Json
          data_processamento?: string
          documento_id?: string | null
          erros_validacao?: Json
          id?: string
          metadados_processamento?: Json
          processado_por?: string
          tipo_documento?: string
          updated_at?: string
          versao_processador?: string
        }
        Relationships: [
          {
            foreignKeyName: "dados_estruturados_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      data_exports: {
        Row: {
          arquivo_url: string | null
          config: Json
          created_at: string | null
          erro_detalhes: string | null
          formato: string
          id: string
          nome_arquivo: string
          status: string
          tamanho_arquivo: number | null
          tipo_dados: string
          total_registros: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          arquivo_url?: string | null
          config?: Json
          created_at?: string | null
          erro_detalhes?: string | null
          formato: string
          id?: string
          nome_arquivo: string
          status?: string
          tamanho_arquivo?: number | null
          tipo_dados: string
          total_registros?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          arquivo_url?: string | null
          config?: Json
          created_at?: string | null
          erro_detalhes?: string | null
          formato?: string
          id?: string
          nome_arquivo?: string
          status?: string
          tamanho_arquivo?: number | null
          tipo_dados?: string
          total_registros?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_processing_config: {
        Row: {
          auto_cleanup_enabled: boolean | null
          batch_size: number | null
          created_at: string | null
          id: string
          max_concurrent_jobs: number | null
          ocr_cache_ttl_hours: number | null
          updated_at: string | null
        }
        Insert: {
          auto_cleanup_enabled?: boolean | null
          batch_size?: number | null
          created_at?: string | null
          id?: string
          max_concurrent_jobs?: number | null
          ocr_cache_ttl_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_cleanup_enabled?: boolean | null
          batch_size?: number | null
          created_at?: string | null
          id?: string
          max_concurrent_jobs?: number | null
          ocr_cache_ttl_hours?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_processing_metrics: {
        Row: {
          avg_processing_time_seconds: number | null
          cache_hit_rate: number | null
          created_at: string | null
          date: string | null
          id: string
          peak_concurrent_jobs: number | null
          storage_used_bytes: number | null
          total_failed: number | null
          total_processed: number | null
        }
        Insert: {
          avg_processing_time_seconds?: number | null
          cache_hit_rate?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          peak_concurrent_jobs?: number | null
          storage_used_bytes?: number | null
          total_failed?: number | null
          total_processed?: number | null
        }
        Update: {
          avg_processing_time_seconds?: number | null
          cache_hit_rate?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          peak_concurrent_jobs?: number | null
          storage_used_bytes?: number | null
          total_failed?: number | null
          total_processed?: number | null
        }
        Relationships: []
      }
      document_processing_queue: {
        Row: {
          created_at: string | null
          documento_id: string | null
          error_details: string | null
          estimated_processing_time: unknown | null
          id: string
          max_retries: number | null
          priority: number | null
          processing_completed_at: string | null
          processing_started_at: string | null
          retry_count: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          documento_id?: string | null
          error_details?: string | null
          estimated_processing_time?: unknown | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          documento_id?: string | null
          error_details?: string | null
          estimated_processing_time?: unknown | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_queue_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      document_type_support: {
        Row: {
          confidence_threshold: number | null
          created_at: string | null
          document_type: string
          extraction_patterns: Json | null
          id: string
          is_brazilian_fiscal: boolean | null
          max_file_size_mb: number | null
          mime_types: string[]
          processing_priority: number | null
          recognition_method: string
          supports_ocr: boolean | null
          supports_structured_data: boolean | null
        }
        Insert: {
          confidence_threshold?: number | null
          created_at?: string | null
          document_type: string
          extraction_patterns?: Json | null
          id?: string
          is_brazilian_fiscal?: boolean | null
          max_file_size_mb?: number | null
          mime_types: string[]
          processing_priority?: number | null
          recognition_method: string
          supports_ocr?: boolean | null
          supports_structured_data?: boolean | null
        }
        Update: {
          confidence_threshold?: number | null
          created_at?: string | null
          document_type?: string
          extraction_patterns?: Json | null
          id?: string
          is_brazilian_fiscal?: boolean | null
          max_file_size_mb?: number | null
          mime_types?: string[]
          processing_priority?: number | null
          recognition_method?: string
          supports_ocr?: boolean | null
          supports_structured_data?: boolean | null
        }
        Relationships: []
      }
      documento_analises_ia: {
        Row: {
          analise_resultado: Json
          arquivo_url: string | null
          confianca: number | null
          correcoes_manuais: Json | null
          created_at: string | null
          empresa_id: string
          erro_detalhes: string | null
          id: string
          metadados_processamento: Json | null
          modelo_usado: string | null
          status: string | null
          texto_original: string | null
          tipo_documento: string
          updated_at: string | null
          user_id: string | null
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          analise_resultado: Json
          arquivo_url?: string | null
          confianca?: number | null
          correcoes_manuais?: Json | null
          created_at?: string | null
          empresa_id: string
          erro_detalhes?: string | null
          id?: string
          metadados_processamento?: Json | null
          modelo_usado?: string | null
          status?: string | null
          texto_original?: string | null
          tipo_documento: string
          updated_at?: string | null
          user_id?: string | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          analise_resultado?: Json
          arquivo_url?: string | null
          confianca?: number | null
          correcoes_manuais?: Json | null
          created_at?: string | null
          empresa_id?: string
          erro_detalhes?: string | null
          id?: string
          metadados_processamento?: Json | null
          modelo_usado?: string | null
          status?: string | null
          texto_original?: string | null
          tipo_documento?: string
          updated_at?: string | null
          user_id?: string | null
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          arquivo_nome: string
          arquivo_path: string
          arquivo_tamanho: number
          arquivo_tipo: string
          arquivo_url: string
          confianca_estruturacao: number | null
          created_at: string | null
          dados_estruturados: Json | null
          dados_extraidos: Json | null
          data_emissao: string | null
          data_estruturacao: string | null
          data_processamento: string | null
          empresa_id: string
          erro_processamento: string | null
          erros_estruturacao: Json | null
          id: string
          mensagem_status: string | null
          numero_documento: string | null
          observacoes: string | null
          ocr_confidence: number | null
          ocr_method: string | null
          processing_metadata: Json | null
          progresso_processamento: number | null
          serie: string | null
          status_processamento: Database["public"]["Enums"]["status_processamento"]
          tentativas_processamento: number | null
          text_extraction_quality: Json | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"]
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_path: string
          arquivo_tamanho: number
          arquivo_tipo: string
          arquivo_url: string
          confianca_estruturacao?: number | null
          created_at?: string | null
          dados_estruturados?: Json | null
          dados_extraidos?: Json | null
          data_emissao?: string | null
          data_estruturacao?: string | null
          data_processamento?: string | null
          empresa_id: string
          erro_processamento?: string | null
          erros_estruturacao?: Json | null
          id?: string
          mensagem_status?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          ocr_confidence?: number | null
          ocr_method?: string | null
          processing_metadata?: Json | null
          progresso_processamento?: number | null
          serie?: string | null
          status_processamento?: Database["public"]["Enums"]["status_processamento"]
          tentativas_processamento?: number | null
          text_extraction_quality?: Json | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"]
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_path?: string
          arquivo_tamanho?: number
          arquivo_tipo?: string
          arquivo_url?: string
          confianca_estruturacao?: number | null
          created_at?: string | null
          dados_estruturados?: Json | null
          dados_extraidos?: Json | null
          data_emissao?: string | null
          data_estruturacao?: string | null
          data_processamento?: string | null
          empresa_id?: string
          erro_processamento?: string | null
          erros_estruturacao?: Json | null
          id?: string
          mensagem_status?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          ocr_confidence?: number | null
          ocr_method?: string | null
          processing_metadata?: Json | null
          progresso_processamento?: number | null
          serie?: string | null
          status_processamento?: Database["public"]["Enums"]["status_processamento"]
          tentativas_processamento?: number | null
          text_extraction_quality?: Json | null
          tipo_documento?: Database["public"]["Enums"]["tipo_documento"]
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_fiscais: {
        Row: {
          competencia: string | null
          confidence_score: number | null
          created_at: string | null
          created_by: string | null
          dados_extraidos: Json | null
          data_documento: string | null
          data_emissao: string | null
          empresa_id: string
          error_log: string | null
          file_url: string | null
          id: string
          mime_type: string | null
          nome_arquivo: string
          numero: string | null
          numero_documento: string | null
          status: string | null
          storage_path: string | null
          tamanho_arquivo: number | null
          tipo: string | null
          tipo_documento: string
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          competencia?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          dados_extraidos?: Json | null
          data_documento?: string | null
          data_emissao?: string | null
          empresa_id: string
          error_log?: string | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          numero?: string | null
          numero_documento?: string | null
          status?: string | null
          storage_path?: string | null
          tamanho_arquivo?: number | null
          tipo?: string | null
          tipo_documento: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          competencia?: string | null
          confidence_score?: number | null
          created_at?: string | null
          created_by?: string | null
          dados_extraidos?: Json | null
          data_documento?: string | null
          data_emissao?: string | null
          empresa_id?: string
          error_log?: string | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          numero?: string | null
          numero_documento?: string | null
          status?: string | null
          storage_path?: string | null
          tamanho_arquivo?: number | null
          tipo?: string | null
          tipo_documento?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_documentos_fiscais_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_unified: {
        Row: {
          ano_fiscal: number | null
          arquivo_hash: string | null
          arquivo_nome: string
          arquivo_path: string | null
          arquivo_tamanho: number | null
          arquivo_tipo: string | null
          arquivo_url: string | null
          categoria: Database["public"]["Enums"]["document_category"]
          chave_acesso: string | null
          codigo_barras: string | null
          competencia_fiscal: string | null
          confianca_extracao: number | null
          created_at: string | null
          created_by: string | null
          dados_extraidos: Json
          data_documento: string | null
          data_processamento: string | null
          deleted_at: string | null
          deleted_by: string | null
          empresa_id: string | null
          id: string
          mes_fiscal: number | null
          metodo_processamento: string | null
          numero_documento: string | null
          observacoes: string | null
          observacoes_validacao: string | null
          prioridade: number | null
          serie: string | null
          status_processamento:
            | Database["public"]["Enums"]["unified_processing_status"]
            | null
          subtipo_documento: string | null
          tags: string[] | null
          tipo_documento: string
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          validado_em: string | null
          validado_manualmente: boolean | null
          validado_por: string | null
          valor_total: number | null
        }
        Insert: {
          ano_fiscal?: number | null
          arquivo_hash?: string | null
          arquivo_nome: string
          arquivo_path?: string | null
          arquivo_tamanho?: number | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          categoria: Database["public"]["Enums"]["document_category"]
          chave_acesso?: string | null
          codigo_barras?: string | null
          competencia_fiscal?: string | null
          confianca_extracao?: number | null
          created_at?: string | null
          created_by?: string | null
          dados_extraidos?: Json
          data_documento?: string | null
          data_processamento?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id?: string | null
          id?: string
          mes_fiscal?: number | null
          metodo_processamento?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          observacoes_validacao?: string | null
          prioridade?: number | null
          serie?: string | null
          status_processamento?:
            | Database["public"]["Enums"]["unified_processing_status"]
            | null
          subtipo_documento?: string | null
          tags?: string[] | null
          tipo_documento: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          validado_em?: string | null
          validado_manualmente?: boolean | null
          validado_por?: string | null
          valor_total?: number | null
        }
        Update: {
          ano_fiscal?: number | null
          arquivo_hash?: string | null
          arquivo_nome?: string
          arquivo_path?: string | null
          arquivo_tamanho?: number | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          categoria?: Database["public"]["Enums"]["document_category"]
          chave_acesso?: string | null
          codigo_barras?: string | null
          competencia_fiscal?: string | null
          confianca_extracao?: number | null
          created_at?: string | null
          created_by?: string | null
          dados_extraidos?: Json
          data_documento?: string | null
          data_processamento?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          empresa_id?: string | null
          id?: string
          mes_fiscal?: number | null
          metodo_processamento?: string | null
          numero_documento?: string | null
          observacoes?: string | null
          observacoes_validacao?: string | null
          prioridade?: number | null
          serie?: string | null
          status_processamento?:
            | Database["public"]["Enums"]["unified_processing_status"]
            | null
          subtipo_documento?: string | null
          tags?: string[] | null
          tipo_documento?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          validado_em?: string | null
          validado_manualmente?: boolean | null
          validado_por?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_unified_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean | null
          atividade_principal: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome: string
          nome_fantasia: string | null
          observacoes: string | null
          regime_tributario: string | null
          status: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativa?: boolean | null
          atividade_principal?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome: string
          nome_fantasia?: string | null
          observacoes?: string | null
          regime_tributario?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativa?: boolean | null
          atividade_principal?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          regime_tributario?: string | null
          status?: string | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      enderecos: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          complemento: string | null
          created_at: string | null
          empresa_id: string
          estado: string
          id: string
          logradouro: string
          numero: string | null
          pais: string | null
          principal: boolean | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          bairro: string
          cep: string
          cidade: string
          complemento?: string | null
          created_at?: string | null
          empresa_id: string
          estado: string
          id?: string
          logradouro: string
          numero?: string | null
          pais?: string | null
          principal?: boolean | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string | null
          created_at?: string | null
          empresa_id?: string
          estado?: string
          id?: string
          logradouro?: string
          numero?: string | null
          pais?: string | null
          principal?: boolean | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      export_templates: {
        Row: {
          config: Json
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          publico: boolean | null
          updated_at: string | null
          user_id: string
          uso_count: number | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          publico?: boolean | null
          updated_at?: string | null
          user_id: string
          uso_count?: number | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          publico?: boolean | null
          updated_at?: string | null
          user_id?: string
          uso_count?: number | null
        }
        Relationships: []
      }
      feedback_responses: {
        Row: {
          created_at: string | null
          feedback_id: string
          id: string
          notification_sent: boolean | null
          responder_id: string
          response_text: string
          response_type: string | null
        }
        Insert: {
          created_at?: string | null
          feedback_id: string
          id?: string
          notification_sent?: boolean | null
          responder_id: string
          response_text: string
          response_type?: string | null
        }
        Update: {
          created_at?: string | null
          feedback_id?: string
          id?: string
          notification_sent?: boolean | null
          responder_id?: string
          response_text?: string
          response_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_responses_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "user_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string | null
          days_before: number | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          notification_frequency:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          priority: Database["public"]["Enums"]["alert_priority"] | null
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string | null
          days_before?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          notification_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          priority?: Database["public"]["Enums"]["alert_priority"] | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string | null
          days_before?: number | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          notification_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          priority?: Database["public"]["Enums"]["alert_priority"] | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fiscal_calculations: {
        Row: {
          competencia: string
          created_at: string | null
          dados_entrada: Json
          empresa_id: string
          id: string
          resultado_calculo: Json
          status: string | null
          tipo_calculo: string
          updated_at: string | null
          user_id: string
          valor_total: number | null
          vencimento: string | null
        }
        Insert: {
          competencia: string
          created_at?: string | null
          dados_entrada: Json
          empresa_id: string
          id?: string
          resultado_calculo: Json
          status?: string | null
          tipo_calculo: string
          updated_at?: string | null
          user_id?: string
          valor_total?: number | null
          vencimento?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string | null
          dados_entrada?: Json
          empresa_id?: string
          id?: string
          resultado_calculo?: Json
          status?: string | null
          tipo_calculo?: string
          updated_at?: string | null
          user_id?: string
          valor_total?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_calculations_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_obligations: {
        Row: {
          alert_days_before: number | null
          alert_sent: boolean | null
          alert_sent_at: string | null
          bar_code: string | null
          category: string
          code: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string | null
          description: string | null
          document_number: string | null
          document_url: string | null
          due_date: string | null
          empresa_id: string | null
          estimated_amount: number | null
          frequency: string | null
          generated_at: string | null
          gross_revenue: number | null
          id: string
          interest_rate: number | null
          metadata: Json | null
          name: string
          next_due_date: string | null
          obligation_data: Json | null
          obligation_type: string
          penalty_amount: number | null
          priority: string | null
          status: string | null
          tax_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_days_before?: number | null
          alert_sent?: boolean | null
          alert_sent_at?: string | null
          bar_code?: string | null
          category: string
          code?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string | null
          document_number?: string | null
          document_url?: string | null
          due_date?: string | null
          empresa_id?: string | null
          estimated_amount?: number | null
          frequency?: string | null
          generated_at?: string | null
          gross_revenue?: number | null
          id?: string
          interest_rate?: number | null
          metadata?: Json | null
          name: string
          next_due_date?: string | null
          obligation_data?: Json | null
          obligation_type: string
          penalty_amount?: number | null
          priority?: string | null
          status?: string | null
          tax_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_days_before?: number | null
          alert_sent?: boolean | null
          alert_sent_at?: string | null
          bar_code?: string | null
          category?: string
          code?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string | null
          document_number?: string | null
          document_url?: string | null
          due_date?: string | null
          empresa_id?: string | null
          estimated_amount?: number | null
          frequency?: string | null
          generated_at?: string | null
          gross_revenue?: number | null
          id?: string
          interest_rate?: number | null
          metadata?: Json | null
          name?: string
          next_due_date?: string | null
          obligation_data?: Json | null
          obligation_type?: string
          penalty_amount?: number | null
          priority?: string | null
          status?: string | null
          tax_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fiscal_obligations_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queues: {
        Row: {
          completed_at: string | null
          created_at: string | null
          empresa_id: string | null
          error_message: string | null
          id: string
          job_type: string
          max_retries: number
          payload: Json
          priority: number
          queue_name: string
          result: Json | null
          retry_count: number
          scheduled_at: string | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          empresa_id?: string | null
          error_message?: string | null
          id?: string
          job_type: string
          max_retries?: number
          payload?: Json
          priority?: number
          queue_name: string
          result?: Json | null
          retry_count?: number
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          empresa_id?: string | null
          error_message?: string | null
          id?: string
          job_type?: string
          max_retries?: number
          payload?: Json
          priority?: number
          queue_name?: string
          result?: Json | null
          retry_count?: number
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      kpi_snapshots: {
        Row: {
          alertas_criticos: number | null
          calculos_realizados: number | null
          consultas_ia: number | null
          created_at: string | null
          documentos_processados: number | null
          empresas_ativas: number | null
          faturamento_total: number | null
          id: string
          impostos_calculados: number | null
          impostos_pagos: number | null
          margem_lucro_media: number | null
          obrigacoes_pendentes: number | null
          prazos_vencendo_15d: number | null
          prazos_vencendo_30d: number | null
          prazos_vencendo_7d: number | null
          relatorios_gerados: number | null
          snapshot_date: string
          snapshot_hour: number | null
          taxa_sucesso_calculos: number | null
          tempo_medio_processamento: number | null
          tempo_medio_resposta_ia: number | null
          total_empresas: number | null
          user_id: string | null
        }
        Insert: {
          alertas_criticos?: number | null
          calculos_realizados?: number | null
          consultas_ia?: number | null
          created_at?: string | null
          documentos_processados?: number | null
          empresas_ativas?: number | null
          faturamento_total?: number | null
          id?: string
          impostos_calculados?: number | null
          impostos_pagos?: number | null
          margem_lucro_media?: number | null
          obrigacoes_pendentes?: number | null
          prazos_vencendo_15d?: number | null
          prazos_vencendo_30d?: number | null
          prazos_vencendo_7d?: number | null
          relatorios_gerados?: number | null
          snapshot_date: string
          snapshot_hour?: number | null
          taxa_sucesso_calculos?: number | null
          tempo_medio_processamento?: number | null
          tempo_medio_resposta_ia?: number | null
          total_empresas?: number | null
          user_id?: string | null
        }
        Update: {
          alertas_criticos?: number | null
          calculos_realizados?: number | null
          consultas_ia?: number | null
          created_at?: string | null
          documentos_processados?: number | null
          empresas_ativas?: number | null
          faturamento_total?: number | null
          id?: string
          impostos_calculados?: number | null
          impostos_pagos?: number | null
          margem_lucro_media?: number | null
          obrigacoes_pendentes?: number | null
          prazos_vencendo_15d?: number | null
          prazos_vencendo_30d?: number | null
          prazos_vencendo_7d?: number | null
          relatorios_gerados?: number | null
          snapshot_date?: string
          snapshot_hour?: number | null
          taxa_sucesso_calculos?: number | null
          tempo_medio_processamento?: number | null
          tempo_medio_resposta_ia?: number | null
          total_empresas?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      lancamentos_contabeis: {
        Row: {
          ai_classification_confidence: number | null
          ai_model_version: string | null
          ai_processed_at: string | null
          ai_tags: Json | null
          conta_credito: string
          conta_debito: string
          created_at: string | null
          created_by: string | null
          data_lancamento: string
          documento_origem: string | null
          documento_origem_id: string | null
          embedding: string | null
          empresa_id: string
          historico: string
          id: string
          lote: string | null
          numero_lancamento: number
          origem: string | null
          status: string | null
          tipo: string | null
          tipo_lancamento: string | null
          updated_at: string | null
          updated_by: string | null
          usuario_id: string | null
          valor: number
          valor_total: number | null
        }
        Insert: {
          ai_classification_confidence?: number | null
          ai_model_version?: string | null
          ai_processed_at?: string | null
          ai_tags?: Json | null
          conta_credito: string
          conta_debito: string
          created_at?: string | null
          created_by?: string | null
          data_lancamento: string
          documento_origem?: string | null
          documento_origem_id?: string | null
          embedding?: string | null
          empresa_id: string
          historico: string
          id?: string
          lote?: string | null
          numero_lancamento?: number
          origem?: string | null
          status?: string | null
          tipo?: string | null
          tipo_lancamento?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usuario_id?: string | null
          valor: number
          valor_total?: number | null
        }
        Update: {
          ai_classification_confidence?: number | null
          ai_model_version?: string | null
          ai_processed_at?: string | null
          ai_tags?: Json | null
          conta_credito?: string
          conta_debito?: string
          created_at?: string | null
          created_by?: string | null
          data_lancamento?: string
          documento_origem?: string | null
          documento_origem_id?: string | null
          embedding?: string | null
          empresa_id?: string
          historico?: string
          id?: string
          lote?: string | null
          numero_lancamento?: number
          origem?: string | null
          status?: string | null
          tipo?: string | null
          tipo_lancamento?: string | null
          updated_at?: string | null
          updated_by?: string | null
          usuario_id?: string | null
          valor?: number
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_lancamentos_contabeis_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_contabeis_documento_origem_fkey"
            columns: ["documento_origem"]
            isOneToOne: false
            referencedRelation: "documentos_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      metricas_financeiras: {
        Row: {
          confianca_calculo: number
          created_at: string
          data_calculo: string
          documentos_analisados: number
          empresa_id: string
          fluxo_caixa: Json
          id: string
          indicadores_performance: Json
          metricas_mensais: Json
          metricas_por_tipo: Json
          periodo_fim: string
          periodo_inicio: string
          projecoes: Json
          resumo_executivo: Json
          updated_at: string
          versao_calculadora: string
        }
        Insert: {
          confianca_calculo?: number
          created_at?: string
          data_calculo?: string
          documentos_analisados?: number
          empresa_id: string
          fluxo_caixa?: Json
          id?: string
          indicadores_performance?: Json
          metricas_mensais?: Json
          metricas_por_tipo?: Json
          periodo_fim: string
          periodo_inicio: string
          projecoes?: Json
          resumo_executivo?: Json
          updated_at?: string
          versao_calculadora?: string
        }
        Update: {
          confianca_calculo?: number
          created_at?: string
          data_calculo?: string
          documentos_analisados?: number
          empresa_id?: string
          fluxo_caixa?: Json
          id?: string
          indicadores_performance?: Json
          metricas_mensais?: Json
          metricas_por_tipo?: Json
          periodo_fim?: string
          periodo_inicio?: string
          projecoes?: Json
          resumo_executivo?: Json
          updated_at?: string
          versao_calculadora?: string
        }
        Relationships: [
          {
            foreignKeyName: "metricas_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          expires_at: string | null
          id: string
          used: boolean | null
          used_at: string | null
          used_ip: unknown | null
          user_id: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          used_ip?: unknown | null
          user_id?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          used_ip?: unknown | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          action_label: string | null
          action_url: string | null
          active: boolean | null
          auto_dismiss_hours: number | null
          category: string
          channels: Json | null
          created_at: string | null
          description: string | null
          frequency_limit: string | null
          id: string
          message_template: string
          name: string
          priority: string
          requires_action: boolean | null
          template_key: string
          title_template: string
          trigger_conditions: Json | null
          updated_at: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          active?: boolean | null
          auto_dismiss_hours?: number | null
          category: string
          channels?: Json | null
          created_at?: string | null
          description?: string | null
          frequency_limit?: string | null
          id?: string
          message_template: string
          name: string
          priority: string
          requires_action?: boolean | null
          template_key: string
          title_template: string
          trigger_conditions?: Json | null
          updated_at?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          active?: boolean | null
          auto_dismiss_hours?: number | null
          category?: string
          channels?: Json | null
          created_at?: string | null
          description?: string | null
          frequency_limit?: string | null
          id?: string
          message_template?: string
          name?: string
          priority?: string
          requires_action?: boolean | null
          template_key?: string
          title_template?: string
          trigger_conditions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string
          created_at: string | null
          dismissed_at: string | null
          expires_at: string | null
          fiscal_data: Json | null
          id: string
          message: string
          notification_type: string | null
          priority: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          scheduled_for: string | null
          source: string
          status: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category: string
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          fiscal_data?: Json | null
          id?: string
          message: string
          notification_type?: string | null
          priority?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          source?: string
          status?: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          fiscal_data?: Json | null
          id?: string
          message?: string
          notification_type?: string | null
          priority?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          scheduled_for?: string | null
          source?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      observability_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          empresa_id: string | null
          error_details: Json | null
          function_name: string | null
          id: string
          level: string
          message: string
          span_id: string | null
          timestamp: string | null
          trace_id: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          empresa_id?: string | null
          error_details?: Json | null
          function_name?: string | null
          id?: string
          level: string
          message: string
          span_id?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          empresa_id?: string | null
          error_details?: Json | null
          function_name?: string | null
          id?: string
          level?: string
          message?: string
          span_id?: string | null
          timestamp?: string | null
          trace_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pdf_ocr_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          file_path: string
          id: string
          result: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          file_path: string
          id?: string
          result: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          file_path?: string
          id?: string
          result?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          cpu_usage_percent: number | null
          data_processed_bytes: number | null
          empresa_id: string | null
          error_message: string | null
          execution_time_ms: number
          id: string
          memory_usage_mb: number | null
          metadata: Json
          metric_type: string
          operation_name: string
          success: boolean
          timestamp: string
          tokens_used: number | null
        }
        Insert: {
          cpu_usage_percent?: number | null
          data_processed_bytes?: number | null
          empresa_id?: string | null
          error_message?: string | null
          execution_time_ms: number
          id?: string
          memory_usage_mb?: number | null
          metadata?: Json
          metric_type: string
          operation_name: string
          success?: boolean
          timestamp?: string
          tokens_used?: number | null
        }
        Update: {
          cpu_usage_percent?: number | null
          data_processed_bytes?: number | null
          empresa_id?: string | null
          error_message?: string | null
          execution_time_ms?: number
          id?: string
          memory_usage_mb?: number | null
          metadata?: Json
          metric_type?: string
          operation_name?: string
          success?: boolean
          timestamp?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          aceita_lancamento: boolean | null
          ativa: boolean | null
          codigo: string
          codigo_pai: string | null
          conta_pai_id: string | null
          created_at: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          natureza: string | null
          nivel: number
          nome: string
          subtipo: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          aceita_lancamento?: boolean | null
          ativa?: boolean | null
          codigo: string
          codigo_pai?: string | null
          conta_pai_id?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          natureza?: string | null
          nivel?: number
          nome: string
          subtipo?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          aceita_lancamento?: boolean | null
          ativa?: boolean | null
          codigo?: string
          codigo_pai?: string | null
          conta_pai_id?: string | null
          created_at?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          natureza?: string | null
          nivel?: number
          nome?: string
          subtipo?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plano_contas_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_contas_codigo_pai_fkey"
            columns: ["codigo_pai"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "plano_contas_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_documents: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          extracted_data: Json
          file_name: string
          file_size: number | null
          file_type: string | null
          fiscal_month: number | null
          fiscal_year: number | null
          id: string
          manually_validated: boolean | null
          original_file_url: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["processing_status"] | null
          tags: string[] | null
          total_value: number | null
          updated_at: string | null
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validation_notes: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          extracted_data?: Json
          file_name: string
          file_size?: number | null
          file_type?: string | null
          fiscal_month?: number | null
          fiscal_year?: number | null
          id?: string
          manually_validated?: boolean | null
          original_file_url?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["processing_status"] | null
          tags?: string[] | null
          total_value?: number | null
          updated_at?: string | null
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          extracted_data?: Json
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          fiscal_month?: number | null
          fiscal_year?: number | null
          id?: string
          manually_validated?: boolean | null
          original_file_url?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["processing_status"] | null
          tags?: string[] | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
        }
        Relationships: []
      }
      processing_progress: {
        Row: {
          created_at: string | null
          current_operation: string | null
          document_id: string
          error_message: string | null
          estimated_time_remaining: number | null
          id: string
          progress_percent: number
          stage: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_operation?: string | null
          document_id: string
          error_message?: string | null
          estimated_time_remaining?: number | null
          id?: string
          progress_percent?: number
          stage: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_operation?: string | null
          document_id?: string
          error_message?: string | null
          estimated_time_remaining?: number | null
          id?: string
          progress_percent?: number
          stage?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_progress_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts_especializados: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          id: string
          nome: string
          parametros: Json | null
          prompt_sistema: string
          prompt_usuario: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string | null
          id?: string
          nome: string
          parametros?: Json | null
          prompt_sistema: string
          prompt_usuario?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          id?: string
          nome?: string
          parametros?: Json | null
          prompt_sistema?: string
          prompt_usuario?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          category: string | null
          created_at: string | null
          id: string
          ip_address: unknown | null
          mfa_verified: boolean | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          category?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          mfa_verified?: boolean | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          category?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          mfa_verified?: boolean | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_type: string
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          location: Json | null
          metadata: Json | null
          risk_score: number | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          location?: Json | null
          metadata?: Json | null
          risk_score?: number | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          location?: Json | null
          metadata?: Json | null
          risk_score?: number | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      socios: {
        Row: {
          ativo: boolean | null
          celular: string | null
          cpf: string
          created_at: string | null
          data_entrada: string | null
          data_nascimento: string | null
          data_saida: string | null
          email: string | null
          empresa_id: string
          endereco_completo: string | null
          id: string
          nome: string
          percentual_participacao: number | null
          rg: string | null
          telefone: string | null
          tipo_participacao: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          celular?: string | null
          cpf: string
          created_at?: string | null
          data_entrada?: string | null
          data_nascimento?: string | null
          data_saida?: string | null
          email?: string | null
          empresa_id: string
          endereco_completo?: string | null
          id?: string
          nome: string
          percentual_participacao?: number | null
          rg?: string | null
          telefone?: string | null
          tipo_participacao?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          celular?: string | null
          cpf?: string
          created_at?: string | null
          data_entrada?: string | null
          data_nascimento?: string | null
          data_saida?: string | null
          email?: string | null
          empresa_id?: string
          endereco_completo?: string | null
          id?: string
          nome?: string
          percentual_participacao?: number | null
          rg?: string | null
          telefone?: string | null
          tipo_participacao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          action: string | null
          context: string | null
          created_at: string
          id: string
          level: string | null
          message: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs_2025_09: {
        Row: {
          action: string | null
          context: string | null
          created_at: string
          id: string
          level: string | null
          message: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs_2025_10: {
        Row: {
          action: string | null
          context: string | null
          created_at: string
          id: string
          level: string | null
          message: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs_2025_11: {
        Row: {
          action: string | null
          context: string | null
          created_at: string
          id: string
          level: string | null
          message: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs_2025_12: {
        Row: {
          action: string | null
          context: string | null
          created_at: string
          id: string
          level: string | null
          message: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs_2026_01: {
        Row: {
          action: string | null
          context: string | null
          created_at: string
          id: string
          level: string | null
          message: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          context?: string | null
          created_at?: string
          id?: string
          level?: string | null
          message?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tabelas_fiscais: {
        Row: {
          aliquota: number
          anexo: string | null
          created_at: string | null
          faixa: number
          faturamento_ate: number
          id: string
          percentual_cofins: number | null
          percentual_cpp: number | null
          percentual_csll: number | null
          percentual_icms: number | null
          percentual_irpj: number | null
          percentual_iss: number | null
          percentual_pis: number | null
          tipo_tabela: string
          updated_at: string | null
          valor_deducao: number | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          aliquota: number
          anexo?: string | null
          created_at?: string | null
          faixa: number
          faturamento_ate: number
          id?: string
          percentual_cofins?: number | null
          percentual_cpp?: number | null
          percentual_csll?: number | null
          percentual_icms?: number | null
          percentual_irpj?: number | null
          percentual_iss?: number | null
          percentual_pis?: number | null
          tipo_tabela: string
          updated_at?: string | null
          valor_deducao?: number | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          aliquota?: number
          anexo?: string | null
          created_at?: string | null
          faixa?: number
          faturamento_ate?: number
          id?: string
          percentual_cofins?: number | null
          percentual_cpp?: number | null
          percentual_csll?: number | null
          percentual_icms?: number | null
          percentual_irpj?: number | null
          percentual_iss?: number | null
          percentual_pis?: number | null
          tipo_tabela?: string
          updated_at?: string | null
          valor_deducao?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          context_data: Json | null
          created_at: string | null
          description: string | null
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id: string
          page_url: string | null
          rating: Database["public"]["Enums"]["satisfaction_rating"]
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string | null
          status: Database["public"]["Enums"]["feedback_status"] | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string | null
          description?: string | null
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id?: string
          page_url?: string | null
          rating: Database["public"]["Enums"]["satisfaction_rating"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string | null
          description?: string | null
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          page_url?: string | null
          rating?: Database["public"]["Enums"]["satisfaction_rating"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          context_data: Json | null
          created_at: string | null
          error_message: string | null
          id: string
          interaction_type: Database["public"]["Enums"]["feedback_type"]
          page_url: string | null
          response_time_ms: number | null
          session_id: string | null
          success: boolean | null
          user_id: string
        }
        Insert: {
          context_data?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          interaction_type: Database["public"]["Enums"]["feedback_type"]
          page_url?: string | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
          user_id: string
        }
        Update: {
          context_data?: Json | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["feedback_type"]
          page_url?: string | null
          response_time_ms?: number | null
          session_id?: string | null
          success?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          compliance_channels: Json | null
          compliance_enabled: boolean | null
          compliance_urgent_only: boolean | null
          created_at: string | null
          digest_enabled: boolean | null
          digest_frequency: string | null
          digest_time: string | null
          documento_channels: Json | null
          documento_enabled: boolean | null
          documento_urgent_only: boolean | null
          empresa_channels: Json | null
          empresa_enabled: boolean | null
          empresa_urgent_only: boolean | null
          enabled: boolean | null
          fiscal_channels: Json | null
          fiscal_enabled: boolean | null
          fiscal_urgent_only: boolean | null
          id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sistema_channels: Json | null
          sistema_enabled: boolean | null
          sistema_urgent_only: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          compliance_channels?: Json | null
          compliance_enabled?: boolean | null
          compliance_urgent_only?: boolean | null
          created_at?: string | null
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          digest_time?: string | null
          documento_channels?: Json | null
          documento_enabled?: boolean | null
          documento_urgent_only?: boolean | null
          empresa_channels?: Json | null
          empresa_enabled?: boolean | null
          empresa_urgent_only?: boolean | null
          enabled?: boolean | null
          fiscal_channels?: Json | null
          fiscal_enabled?: boolean | null
          fiscal_urgent_only?: boolean | null
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sistema_channels?: Json | null
          sistema_enabled?: boolean | null
          sistema_urgent_only?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          compliance_channels?: Json | null
          compliance_enabled?: boolean | null
          compliance_urgent_only?: boolean | null
          created_at?: string | null
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          digest_time?: string | null
          documento_channels?: Json | null
          documento_enabled?: boolean | null
          documento_urgent_only?: boolean | null
          empresa_channels?: Json | null
          empresa_enabled?: boolean | null
          empresa_urgent_only?: boolean | null
          enabled?: boolean | null
          fiscal_channels?: Json | null
          fiscal_enabled?: boolean | null
          fiscal_urgent_only?: boolean | null
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sistema_channels?: Json | null
          sistema_enabled?: boolean | null
          sistema_urgent_only?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_security_preferences: {
        Row: {
          allowed_ip_ranges: unknown[] | null
          created_at: string | null
          lockout_duration_minutes: number | null
          log_all_activities: boolean | null
          max_failed_attempts: number | null
          mfa_backup_codes_generated: boolean | null
          mfa_enabled: boolean | null
          mfa_required_for_financial: boolean | null
          notification_email: string | null
          notify_login_attempts: boolean | null
          notify_mfa_changes: boolean | null
          notify_suspicious_activity: boolean | null
          require_mfa_for_sensitive_ops: boolean | null
          require_password_change_days: number | null
          retention_days: number | null
          session_timeout_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_ip_ranges?: unknown[] | null
          created_at?: string | null
          lockout_duration_minutes?: number | null
          log_all_activities?: boolean | null
          max_failed_attempts?: number | null
          mfa_backup_codes_generated?: boolean | null
          mfa_enabled?: boolean | null
          mfa_required_for_financial?: boolean | null
          notification_email?: string | null
          notify_login_attempts?: boolean | null
          notify_mfa_changes?: boolean | null
          notify_suspicious_activity?: boolean | null
          require_mfa_for_sensitive_ops?: boolean | null
          require_password_change_days?: number | null
          retention_days?: number | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_ip_ranges?: unknown[] | null
          created_at?: string | null
          lockout_duration_minutes?: number | null
          log_all_activities?: boolean | null
          max_failed_attempts?: number | null
          mfa_backup_codes_generated?: boolean | null
          mfa_enabled?: boolean | null
          mfa_required_for_financial?: boolean | null
          notification_email?: string | null
          notify_login_attempts?: boolean | null
          notify_mfa_changes?: boolean | null
          notify_suspicious_activity?: boolean | null
          require_mfa_for_sensitive_ops?: boolean | null
          require_password_change_days?: number | null
          retention_days?: number | null
          session_timeout_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ai_cache_stats: {
        Row: {
          active_entries: number | null
          avg_hits_per_entry: number | null
          avg_ttl_seconds: number | null
          entries_by_type: number | null
          expired_entries: number | null
          query_type: string | null
          total_entries: number | null
          total_hits: number | null
        }
        Relationships: []
      }
      ai_performance_stats: {
        Row: {
          avg_cache_time_ms: number | null
          avg_openai_time_ms: number | null
          avg_response_length: number | null
          avg_satisfaction: number | null
          avg_tokens_used: number | null
          avg_total_time_ms: number | null
          cache_hit_rate_percent: number | null
          cache_hits: number | null
          calculation_queries: number | null
          conceptual_queries: number | null
          deadline_queries: number | null
          errors: number | null
          general_queries: number | null
          hour: string | null
          median_total_time_ms: number | null
          p95_total_time_ms: number | null
          regulation_queries: number | null
          satisfaction_responses: number | null
          total_queries: number | null
        }
        Relationships: []
      }
      ai_user_stats: {
        Row: {
          avg_response_time_ms: number | null
          avg_satisfaction: number | null
          cache_hits: number | null
          errors: number | null
          first_query: string | null
          last_query: string | null
          most_common_query_type: string | null
          performance_category: string | null
          satisfaction_responses: number | null
          total_queries: number | null
          unique_sessions: number | null
          user_id: string | null
        }
        Relationships: []
      }
      cache_statistics: {
        Row: {
          active_entries: number | null
          avg_hits_per_entry: number | null
          avg_size_bytes: number | null
          cache_type: string | null
          expired_entries: number | null
          total_entries: number | null
          total_hits: number | null
          total_size_bytes: number | null
        }
        Relationships: []
      }
      dashboard_metrics_realtime: {
        Row: {
          calculos_hoje: number | null
          calculos_mes: number | null
          calculos_semana: number | null
          consultas_ia_hoje: number | null
          docs_hoje: number | null
          docs_mes: number | null
          docs_semana: number | null
          relatorios_hoje: number | null
          tempo_medio_processamento_hoje: number | null
          tempo_medio_processamento_semana: number | null
          ultima_atualizacao: string | null
          user_id: string | null
          valor_impostos_hoje: number | null
          valor_impostos_mes: number | null
        }
        Relationships: []
      }
      document_processing_stats: {
        Row: {
          avg_confidence: number | null
          document_count: number | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          first_document: string | null
          last_document: string | null
          status: Database["public"]["Enums"]["processing_status"] | null
          total_value_sum: number | null
          user_id: string | null
          validated_count: number | null
        }
        Relationships: []
      }
      empresas_analytics: {
        Row: {
          empresas_ativas: number | null
          empresas_criadas_mes: number | null
          media_calculos_por_empresa: number | null
          regime_tributario: string | null
          total_empresas: number | null
          total_mei: number | null
          total_presumido: number | null
          total_real: number | null
          total_simples: number | null
          user_id: string | null
          valor_total_impostos: number | null
        }
        Relationships: []
      }
      monthly_document_summary: {
        Row: {
          avg_confidence: number | null
          completed_count: number | null
          document_count: number | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          failed_count: number | null
          fiscal_month: number | null
          fiscal_year: number | null
          total_value: number | null
          user_id: string | null
        }
        Relationships: []
      }
      obrigacoes_fiscais: {
        Row: {
          created_at: string | null
          data_vencimento: string | null
          descricao: string | null
          empresa_id: string | null
          empresa_nome: string | null
          id: string | null
          nome: string | null
          prioridade: string | null
          situacao: string | null
          status: string | null
          tipo_obrigacao: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fiscal_obligations_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_summary: {
        Row: {
          avg_execution_time_ms: number | null
          failed_operations: number | null
          max_execution_time_ms: number | null
          metric_type: string | null
          min_execution_time_ms: number | null
          operation_name: string | null
          p95_execution_time_ms: number | null
          success_rate_percent: number | null
          successful_operations: number | null
          total_operations: number | null
        }
        Relationships: []
      }
      pg_all_foreign_keys: {
        Row: {
          fk_columns: unknown[] | null
          fk_constraint_name: unknown | null
          fk_schema_name: unknown | null
          fk_table_name: unknown | null
          fk_table_oid: unknown | null
          is_deferrable: boolean | null
          is_deferred: boolean | null
          match_type: string | null
          on_delete: string | null
          on_update: string | null
          pk_columns: unknown[] | null
          pk_constraint_name: unknown | null
          pk_index_name: unknown | null
          pk_schema_name: unknown | null
          pk_table_name: unknown | null
          pk_table_oid: unknown | null
        }
        Relationships: []
      }
      prazos_fiscais: {
        Row: {
          data_vencimento: string | null
          empresa_id: string | null
          empresa_nome: string | null
          situacao: string | null
          status: string | null
          tipo_obrigacao: string | null
          total_obrigacoes: number | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_fiscal_obligations_empresa"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tap_funky: {
        Row: {
          args: string | null
          is_definer: boolean | null
          is_strict: boolean | null
          is_visible: boolean | null
          kind: unknown | null
          langoid: unknown | null
          name: unknown | null
          oid: unknown | null
          owner: unknown | null
          returns: string | null
          returns_set: boolean | null
          schema: unknown | null
          volatility: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _cleanup: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      _contract_on: {
        Args: { "": string }
        Returns: unknown
      }
      _currtest: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      _db_privs: {
        Args: Record<PropertyKey, never>
        Returns: unknown[]
      }
      _definer: {
        Args: { "": unknown }
        Returns: boolean
      }
      _dexists: {
        Args: { "": unknown }
        Returns: boolean
      }
      _expand_context: {
        Args: { "": string }
        Returns: string
      }
      _expand_on: {
        Args: { "": string }
        Returns: string
      }
      _expand_vol: {
        Args: { "": string }
        Returns: string
      }
      _ext_exists: {
        Args: { "": unknown }
        Returns: boolean
      }
      _extensions: {
        Args: Record<PropertyKey, never> | { "": unknown }
        Returns: unknown[]
      }
      _funkargs: {
        Args: { "": unknown[] }
        Returns: string
      }
      _get: {
        Args: { "": string }
        Returns: number
      }
      _get_db_owner: {
        Args: { "": unknown }
        Returns: unknown
      }
      _get_dtype: {
        Args: { "": unknown }
        Returns: string
      }
      _get_language_owner: {
        Args: { "": unknown }
        Returns: unknown
      }
      _get_latest: {
        Args: { "": string }
        Returns: number[]
      }
      _get_note: {
        Args: { "": number } | { "": string }
        Returns: string
      }
      _get_opclass_owner: {
        Args: { "": unknown }
        Returns: unknown
      }
      _get_rel_owner: {
        Args: { "": unknown }
        Returns: unknown
      }
      _get_schema_owner: {
        Args: { "": unknown }
        Returns: unknown
      }
      _get_tablespace_owner: {
        Args: { "": unknown }
        Returns: unknown
      }
      _get_type_owner: {
        Args: { "": unknown }
        Returns: unknown
      }
      _got_func: {
        Args: { "": unknown }
        Returns: boolean
      }
      _grolist: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      _has_group: {
        Args: { "": unknown }
        Returns: boolean
      }
      _has_role: {
        Args: { "": unknown }
        Returns: boolean
      }
      _has_user: {
        Args: { "": unknown }
        Returns: boolean
      }
      _inherited: {
        Args: { "": unknown }
        Returns: boolean
      }
      _is_schema: {
        Args: { "": unknown }
        Returns: boolean
      }
      _is_super: {
        Args: { "": unknown }
        Returns: boolean
      }
      _is_trusted: {
        Args: { "": unknown }
        Returns: boolean
      }
      _is_verbose: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      _lang: {
        Args: { "": unknown }
        Returns: unknown
      }
      _ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      _ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      _opc_exists: {
        Args: { "": unknown }
        Returns: boolean
      }
      _parts: {
        Args: { "": unknown }
        Returns: unknown[]
      }
      _pg_sv_type_array: {
        Args: { "": unknown[] }
        Returns: unknown[]
      }
      _prokind: {
        Args: { p_oid: unknown }
        Returns: unknown
      }
      _query: {
        Args: { "": string }
        Returns: string
      }
      _refine_vol: {
        Args: { "": string }
        Returns: string
      }
      _relexists: {
        Args: { "": unknown }
        Returns: boolean
      }
      _returns: {
        Args: { "": unknown }
        Returns: string
      }
      _strict: {
        Args: { "": unknown }
        Returns: boolean
      }
      _table_privs: {
        Args: Record<PropertyKey, never>
        Returns: unknown[]
      }
      _temptypes: {
        Args: { "": string }
        Returns: string
      }
      _todo: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _vol: {
        Args: { "": unknown }
        Returns: string
      }
      acknowledge_alert: {
        Args: { p_alert_id: string; p_user_id: string }
        Returns: boolean
      }
      akeys: {
        Args: { "": unknown }
        Returns: string[]
      }
      algorithm_sign: {
        Args: { algorithm: string; secret: string; signables: string }
        Returns: string
      }
      archive_old_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      archive_task: {
        Args: { archived_by_param?: string; task_id_param: string }
        Returns: boolean
      }
      avals: {
        Args: { "": unknown }
        Returns: string[]
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      calculate_satisfaction_metrics: {
        Args: {
          p_date?: string
          p_feedback_type?: Database["public"]["Enums"]["feedback_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      calculate_suggestion_confidence: {
        Args: {
          p_context_data: Json
          p_suggestion_type: string
          p_user_id: string
        }
        Returns: number
      }
      can: {
        Args: { "": unknown[] }
        Returns: string
      }
      casts_are: {
        Args: { "": string[] }
        Returns: string
      }
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      claim_next_job: {
        Args: { p_job_types?: string[]; p_worker_id: string }
        Returns: {
          documento_id: string
          empresa_id: string
          job_id: string
          job_type: string
          payload: Json
          retry_count: number
        }[]
      }
      classify_document_semantic: {
        Args: {
          document_embedding: string
          document_text: string
          empresa_id_param: string
        }
        Returns: Json
      }
      clean_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_cnpj_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_ocr_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_agent_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_data: {
        Args: { p_days_to_keep?: number }
        Returns: Json
      }
      cleanup_old_documents: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      cleanup_old_metrics: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_partitions_system_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_processing_progress: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_progress: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_temp_uploads: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      col_is_null: {
        Args:
          | {
              column_name: unknown
              description?: string
              schema_name: unknown
              table_name: unknown
            }
          | { column_name: unknown; description?: string; table_name: unknown }
        Returns: string
      }
      col_not_null: {
        Args:
          | {
              column_name: unknown
              description?: string
              schema_name: unknown
              table_name: unknown
            }
          | { column_name: unknown; description?: string; table_name: unknown }
        Returns: string
      }
      collect_tap: {
        Args: Record<PropertyKey, never> | { "": string[] }
        Returns: string
      }
      complete_job: {
        Args: { p_error_message?: string; p_job_id: string; p_result?: Json }
        Returns: boolean
      }
      create_async_job: {
        Args: {
          p_documento_id?: string
          p_empresa_id?: string
          p_estimated_duration?: number
          p_job_type: string
          p_max_retries?: number
          p_payload: Json
          p_priority?: number
        }
        Returns: string
      }
      create_automated_backup: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      create_default_alert_configurations: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_indexes_on_partition: {
        Args: { partition_name: string }
        Returns: undefined
      }
      create_monthly_partition: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_monthly_partition_system_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_monthly_partitions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_realtime_notification: {
        Args: {
          p_empresa_id?: string
          p_job_id?: string
          p_message?: string
          p_notification_type?: string
          p_payload?: Json
          p_priority?: string
          p_title?: string
          p_user_id: string
        }
        Returns: string
      }
      crosstab: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      crosstab2: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["tablefunc_crosstab_2"][]
      }
      crosstab3: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["tablefunc_crosstab_3"][]
      }
      crosstab4: {
        Args: { "": string }
        Returns: Database["public"]["CompositeTypes"]["tablefunc_crosstab_4"][]
      }
      daitch_mokotoff: {
        Args: { "": string }
        Returns: string[]
      }
      decrypt_data: {
        Args: { ciphertext: string; key_id?: string }
        Returns: string
      }
      delete_duplicate_notifications: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      dequeue_job: {
        Args: { p_queue_name: string; p_worker_id: string }
        Returns: {
          job_id: string
          job_type: string
          max_retries: number
          payload: Json
          retry_count: number
        }[]
      }
      detect_embedding_dimension: {
        Args: { embedding_vector: string }
        Returns: number
      }
      diag: {
        Args:
          | Record<PropertyKey, never>
          | Record<PropertyKey, never>
          | { msg: string }
          | { msg: unknown }
        Returns: string
      }
      diag_test_name: {
        Args: { "": string }
        Returns: string
      }
      dmetaphone: {
        Args: { "": string }
        Returns: string
      }
      dmetaphone_alt: {
        Args: { "": string }
        Returns: string
      }
      do_tap: {
        Args: Record<PropertyKey, never> | { "": string } | { "": unknown }
        Returns: string[]
      }
      document_processing_flow_info: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      domains_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      each: {
        Args: { hs: unknown }
        Returns: Record<string, unknown>[]
      }
      encrypt_data: {
        Args: { key_id?: string; plaintext: string }
        Returns: Json
      }
      enqueue_job: {
        Args: {
          p_empresa_id?: string
          p_job_type: string
          p_payload?: Json
          p_priority?: number
          p_queue_name: string
          p_scheduled_at?: string
          p_user_id?: string
        }
        Returns: string
      }
      enums_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      extensions_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      fail: {
        Args: Record<PropertyKey, never> | { "": string }
        Returns: string
      }
      find_similar_lancamentos: {
        Args: {
          empresa_id_filter?: string
          max_results?: number
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          ai_classification_confidence: number
          conta_credito: string
          conta_debito: string
          historico: string
          id: string
          similarity: number
        }[]
      }
      findfuncs: {
        Args: { "": string }
        Returns: string[]
      }
      finish: {
        Args: { exception_on_failure?: boolean }
        Returns: string[]
      }
      foreign_tables_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      functions_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      generate_encryption_key: {
        Args: { key_name: string }
        Returns: string
      }
      generate_secure_token: {
        Args: { token_length?: number }
        Returns: string
      }
      get_active_alerts: {
        Args: {
          p_limit?: number
          p_priority?: Database["public"]["Enums"]["alert_priority"]
          p_user_id: string
        }
        Returns: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          context_data: Json
          created_at: string
          days_until_due: number
          description: string
          due_date: string
          id: string
          priority: Database["public"]["Enums"]["alert_priority"]
          suggested_actions: string[]
          title: string
        }[]
      }
      get_automation_dashboard_data: {
        Args: { days_back?: number }
        Returns: {
          automation_type: string
          avg_duration_ms: number
          failed_executions: number
          last_execution: string
          last_failure: string
          last_success: string
          running_executions: number
          success_rate: number
          successful_executions: number
          total_executions: number
        }[]
      }
      get_automation_statistics: {
        Args: { days_back?: number }
        Returns: {
          automation_type: string
          avg_duration_ms: number
          failed_executions: number
          last_execution: string
          success_rate: number
          successful_executions: number
          total_executions: number
        }[]
      }
      get_cache_performance_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          metric: string
          value: number
        }[]
      }
      get_cron_jobs_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_dados_estruturados_empresa: {
        Args: {
          p_confianca_minima?: number
          p_data_fim?: string
          p_data_inicio?: string
          p_empresa_id: string
          p_tipos_documento?: string[]
        }
        Returns: {
          arquivo_nome: string
          campos_extraidos: string[]
          confianca_extracao: number
          dados_processados: Json
          data_emissao: string
          data_processamento: string
          documento_id: string
          erros_validacao: Json
          id: string
          tipo_documento: string
          valor_total: number
        }[]
      }
      get_dashboard_complete: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: Json
      }
      get_documentos_stats_empresa: {
        Args: { p_empresa_id: string; p_periodo_meses?: number }
        Returns: Json
      }
      get_embedding_column_name: {
        Args: { dimension: number }
        Returns: string
      }
      get_empresa_dashboard_complete: {
        Args: { p_empresa_id: string; p_periodo_meses?: number }
        Returns: Json
      }
      get_fiscal_alerts_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          job_name: string
          last_run: string
          next_run: string
          schedule: string
        }[]
      }
      get_fiscal_summary: {
        Args: { p_month?: number; p_user_id: string; p_year?: number }
        Returns: {
          avg_value: number
          document_count: number
          document_type: Database["public"]["Enums"]["document_type"]
          max_value: number
          min_value: number
          total_value: number
        }[]
      }
      get_latest_ai_insights: {
        Args: { p_empresa_id: string; p_tipo_insight?: string }
        Returns: Json
      }
      get_latest_compliance_analysis: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      get_latest_metricas_financeiras: {
        Args: { p_empresa_id: string }
        Returns: Json
      }
      get_monitoring_statistics: {
        Args: { days_back?: number }
        Returns: {
          avg_resolution_time_hours: number
          critical_alerts: number
          most_problematic_automation: string
          resolved_alerts: number
          system_uptime_percent: number
          total_alerts: number
        }[]
      }
      get_next_document_batch: {
        Args: { worker_id?: string }
        Returns: {
          documento_id: string
          priority: number
          retry_count: number
        }[]
      }
      get_ocr_quality_by_method: {
        Args: Record<PropertyKey, never>
        Returns: {
          avg_confidence: number
          avg_processing_time: number
          avg_readability: number
          document_count: number
          method: string
          structured_data_rate: number
        }[]
      }
      get_ocr_statistics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_confidence: number
          avg_processing_time: number
          documents_with_structured_data: number
          hybrid_extraction: number
          native_extraction: number
          ocr_extraction: number
          success_rate: number
          total_documents: number
        }[]
      }
      get_realtime_ai_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          description: string
          metric: string
          value: number
        }[]
      }
      get_satisfaction_stats: {
        Args: {
          p_end_date?: string
          p_feedback_type?: Database["public"]["Enums"]["feedback_type"]
          p_start_date?: string
          p_user_id: string
        }
        Returns: {
          average_rating: number
          feedback_rate: number
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          satisfaction_score: number
          total_feedback: number
          total_interactions: number
        }[]
      }
      get_tasks_stats: {
        Args: { empresa_uuid?: string }
        Returns: {
          completed_tasks: number
          high_priority_tasks: number
          in_progress_tasks: number
          overdue_tasks: number
          pending_tasks: number
          total_tasks: number
        }[]
      }
      get_user_dashboard_metrics: {
        Args: { user_uuid: string }
        Returns: Json
      }
      ghstore_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ghstore_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ghstore_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ghstore_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      ghstore_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      groups_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_check: {
        Args: { "": unknown }
        Returns: string
      }
      has_composite: {
        Args: { "": unknown }
        Returns: string
      }
      has_domain: {
        Args: { "": unknown }
        Returns: string
      }
      has_enum: {
        Args: { "": unknown }
        Returns: string
      }
      has_extension: {
        Args: { "": unknown }
        Returns: string
      }
      has_fk: {
        Args: { "": unknown }
        Returns: string
      }
      has_foreign_table: {
        Args: { "": unknown }
        Returns: string
      }
      has_function: {
        Args: { "": unknown }
        Returns: string
      }
      has_group: {
        Args: { "": unknown }
        Returns: string
      }
      has_inherited_tables: {
        Args: { "": unknown }
        Returns: string
      }
      has_language: {
        Args: { "": unknown }
        Returns: string
      }
      has_materialized_view: {
        Args: { "": unknown }
        Returns: string
      }
      has_opclass: {
        Args: { "": unknown }
        Returns: string
      }
      has_pk: {
        Args: { "": unknown }
        Returns: string
      }
      has_relation: {
        Args: { "": unknown }
        Returns: string
      }
      has_role: {
        Args: { "": unknown }
        Returns: string
      }
      has_schema: {
        Args: { "": unknown }
        Returns: string
      }
      has_sequence: {
        Args: { "": unknown }
        Returns: string
      }
      has_table: {
        Args: { "": unknown }
        Returns: string
      }
      has_tablespace: {
        Args: { "": unknown }
        Returns: string
      }
      has_type: {
        Args: { "": unknown }
        Returns: string
      }
      has_unique: {
        Args: { "": string }
        Returns: string
      }
      has_user: {
        Args: { "": unknown }
        Returns: string
      }
      has_view: {
        Args: { "": unknown }
        Returns: string
      }
      hash_ltree: {
        Args: { "": unknown }
        Returns: number
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      hasnt_composite: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_domain: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_enum: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_extension: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_fk: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_foreign_table: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_function: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_group: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_inherited_tables: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_language: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_materialized_view: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_opclass: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_pk: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_relation: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_role: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_schema: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_sequence: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_table: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_tablespace: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_type: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_user: {
        Args: { "": unknown }
        Returns: string
      }
      hasnt_view: {
        Args: { "": unknown }
        Returns: string
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore: {
        Args: { "": string[] } | { "": Record<string, unknown> }
        Returns: unknown
      }
      hstore_hash: {
        Args: { "": unknown }
        Returns: number
      }
      hstore_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore_send: {
        Args: { "": unknown }
        Returns: string
      }
      hstore_subscript_handler: {
        Args: { "": unknown }
        Returns: unknown
      }
      hstore_to_array: {
        Args: { "": unknown }
        Returns: string[]
      }
      hstore_to_json: {
        Args: { "": unknown }
        Returns: Json
      }
      hstore_to_json_loose: {
        Args: { "": unknown }
        Returns: Json
      }
      hstore_to_jsonb: {
        Args: { "": unknown }
        Returns: Json
      }
      hstore_to_jsonb_loose: {
        Args: { "": unknown }
        Returns: Json
      }
      hstore_to_matrix: {
        Args: { "": unknown }
        Returns: string[]
      }
      hstore_version_diag: {
        Args: { "": unknown }
        Returns: number
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { data: Json; uri: string } | { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { content: string; content_type: string; uri: string }
          | { data: Json; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      hybrid_search_archon_code_examples: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          query_text: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          match_type: string
          metadata: Json
          similarity: number
          source_id: string
          summary: string
          url: string
        }[]
      }
      hybrid_search_archon_crawled_pages: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          query_text: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          match_type: string
          metadata: Json
          similarity: number
          source_id: string
          url: string
        }[]
      }
      in_todo: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      increment_cache_hits: {
        Args: { cache_key: string }
        Returns: undefined
      }
      index_is_primary: {
        Args: { "": unknown }
        Returns: string
      }
      index_is_unique: {
        Args: { "": unknown }
        Returns: string
      }
      initiate_backup: {
        Args: { p_backup_location: string; p_backup_type: string }
        Returns: string
      }
      intelligent_compliance_monitor: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      intelligent_compliance_monitor_simple: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      intelligent_maintenance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      intelligent_maintenance_simple: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      invalidate_empresa_cache: {
        Args: { p_empresa_id: string; p_reason?: string }
        Returns: number
      }
      is_aggregate: {
        Args: { "": unknown }
        Returns: string
      }
      is_clustered: {
        Args: { "": unknown }
        Returns: string
      }
      is_definer: {
        Args: { "": unknown }
        Returns: string
      }
      is_empty: {
        Args: { "": string }
        Returns: string
      }
      is_normal_function: {
        Args: { "": unknown }
        Returns: string
      }
      is_partitioned: {
        Args: { "": unknown }
        Returns: string
      }
      is_procedure: {
        Args: { "": unknown }
        Returns: string
      }
      is_strict: {
        Args: { "": unknown }
        Returns: string
      }
      is_superuser: {
        Args: { "": unknown }
        Returns: string
      }
      is_window: {
        Args: { "": unknown }
        Returns: string
      }
      isnt_aggregate: {
        Args: { "": unknown }
        Returns: string
      }
      isnt_definer: {
        Args: { "": unknown }
        Returns: string
      }
      isnt_empty: {
        Args: { "": string }
        Returns: string
      }
      isnt_normal_function: {
        Args: { "": unknown }
        Returns: string
      }
      isnt_partitioned: {
        Args: { "": unknown }
        Returns: string
      }
      isnt_procedure: {
        Args: { "": unknown }
        Returns: string
      }
      isnt_strict: {
        Args: { "": unknown }
        Returns: string
      }
      isnt_superuser: {
        Args: { "": unknown }
        Returns: string
      }
      isnt_window: {
        Args: { "": unknown }
        Returns: string
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      json_matches_schema: {
        Args: { instance: Json; schema: Json }
        Returns: boolean
      }
      jsonb_matches_schema: {
        Args: { instance: Json; schema: Json }
        Returns: boolean
      }
      jsonschema_is_valid: {
        Args: { schema: Json }
        Returns: boolean
      }
      jsonschema_validation_errors: {
        Args: { instance: Json; schema: Json }
        Returns: string[]
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      language_is_trusted: {
        Args: { "": unknown }
        Returns: string
      }
      languages_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      lca: {
        Args: { "": unknown[] }
        Returns: unknown
      }
      lives_ok: {
        Args: { "": string }
        Returns: string
      }
      log_ai_metric: {
        Args: {
          p_cache_hit?: boolean
          p_cache_lookup_time_ms?: number
          p_error_message?: string
          p_error_occurred?: boolean
          p_error_type?: string
          p_ip_address?: unknown
          p_openai_time_ms?: number
          p_query_text: string
          p_query_type?: string
          p_response_cached?: boolean
          p_response_length?: number
          p_retry_count?: number
          p_session_id: string
          p_streaming?: boolean
          p_tokens_used?: number
          p_total_time_ms?: number
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      log_analytics_event: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_event_type: string
          p_metadata?: Json
          p_processing_time_ms?: number
          p_user_id: string
          p_value_numeric?: number
        }
        Returns: string
      }
      log_query_performance: {
        Args: {
          p_execution_time_ms: number
          p_metadata?: Json
          p_query_name: string
          p_rows_affected?: number
        }
        Returns: string
      }
      log_user_interaction: {
        Args: {
          p_context_data?: Json
          p_error_message?: string
          p_interaction_type: Database["public"]["Enums"]["feedback_type"]
          p_page_url?: string
          p_response_time_ms?: number
          p_session_id?: string
          p_success?: boolean
          p_user_id: string
        }
        Returns: string
      }
      lquery_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      lquery_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_gist_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      ltree_gist_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltree_send: {
        Args: { "": unknown }
        Returns: string
      }
      ltree2text: {
        Args: { "": unknown }
        Returns: string
      }
      ltxtq_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_recv: {
        Args: { "": unknown }
        Returns: unknown
      }
      ltxtq_send: {
        Args: { "": unknown }
        Returns: string
      }
      match_archon_code_examples: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          metadata: Json
          similarity: number
          source_id: string
          summary: string
          url: string
        }[]
      }
      match_archon_code_examples_multi: {
        Args: {
          embedding_dimension: number
          filter?: Json
          match_count?: number
          query_embedding: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          metadata: Json
          similarity: number
          source_id: string
          summary: string
          url: string
        }[]
      }
      match_archon_crawled_pages: {
        Args: {
          filter?: Json
          match_count?: number
          query_embedding: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          metadata: Json
          similarity: number
          source_id: string
          url: string
        }[]
      }
      match_archon_crawled_pages_multi: {
        Args: {
          embedding_dimension: number
          filter?: Json
          match_count?: number
          query_embedding: string
          source_filter?: string
        }
        Returns: {
          chunk_number: number
          content: string
          id: number
          metadata: Json
          similarity: number
          source_id: string
          url: string
        }[]
      }
      materialized_views_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      migrate_documentos_to_unified: {
        Args: Record<PropertyKey, never>
        Returns: {
          error_message: string
          migrated_count: number
          source_table: string
          success: boolean
        }[]
      }
      nlevel: {
        Args: { "": unknown }
        Returns: number
      }
      no_plan: {
        Args: Record<PropertyKey, never>
        Returns: boolean[]
      }
      num_failed: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      ok: {
        Args: { "": boolean }
        Returns: string
      }
      opclasses_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      operators_are: {
        Args: { "": string[] }
        Returns: string
      }
      optimize_ocr_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      optimize_system_performance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      os_name: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      pass: {
        Args: Record<PropertyKey, never> | { "": string }
        Returns: string
      }
      pg_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      pg_version_num: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      pgtap_version: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      plan: {
        Args: { "": number }
        Returns: string
      }
      process_document_batch: {
        Args: { batch_size_param?: number }
        Returns: Json
      }
      process_webhook_retries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      register_agent: {
        Args: {
          p_agent_id: string
          p_agent_name: string
          p_agent_type: string
          p_capabilities: string[]
        }
        Returns: boolean
      }
      resolve_alert: {
        Args: { p_alert_id: string; p_user_id: string }
        Returns: boolean
      }
      resolve_system_alert: {
        Args: { alert_id: string; resolved_by_user?: string }
        Returns: undefined
      }
      roles_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      run_automation_monitoring_cron: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      run_cleanup_expired_cron: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      run_compliance_monitor_cron_optimized: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      run_incremental_backup_cron_optimized: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      runtests: {
        Args: Record<PropertyKey, never> | { "": string } | { "": unknown }
        Returns: string[]
      }
      schemas_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      search_by_cnpj: {
        Args: { cnpj_query: string }
        Returns: {
          data: Json
          match_type: string
          score: number
        }[]
      }
      search_documents: {
        Args: {
          p_document_type?: Database["public"]["Enums"]["document_type"]
          p_limit?: number
          p_search_term: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          extracted_data: Json
          file_name: string
          id: string
          relevance: number
          total_value: number
        }[]
      }
      search_empresas_advanced: {
        Args: {
          result_limit?: number
          search_query: string
          similarity_threshold?: number
        }
        Returns: {
          data: Json
          match_type: string
          score: number
        }[]
      }
      sequences_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sign: {
        Args: { algorithm?: string; payload: Json; secret: string }
        Returns: string
      }
      skeys: {
        Args: { "": unknown }
        Returns: string[]
      }
      skip: {
        Args:
          | { "": number }
          | { "": string }
          | { how_many: number; why: string }
        Returns: string
      }
      smart_analytics_refresh: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      smart_analytics_refresh_simple: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      soundex: {
        Args: { "": string }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      svals: {
        Args: { "": unknown }
        Returns: string[]
      }
      tables_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      tablespaces_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      test_document_recognition: {
        Args: {
          file_mime_type: string
          file_name?: string
          sample_content?: string
        }
        Returns: Json
      }
      test_rls_security: {
        Args: Record<PropertyKey, never>
        Returns: {
          actual_result: string
          expected_result: string
          status: string
          test_name: string
        }[]
      }
      test_webhook_system: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      text_soundex: {
        Args: { "": string }
        Returns: string
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      text2ltree: {
        Args: { "": string }
        Returns: unknown
      }
      throws_ok: {
        Args: { "": string }
        Returns: string
      }
      todo: {
        Args:
          | { how_many: number }
          | { how_many: number; why: string }
          | { how_many: number; why: string }
          | { why: string }
        Returns: boolean[]
      }
      todo_end: {
        Args: Record<PropertyKey, never>
        Returns: boolean[]
      }
      todo_start: {
        Args: Record<PropertyKey, never> | { "": string }
        Returns: boolean[]
      }
      try_cast_double: {
        Args: { inp: string }
        Returns: number
      }
      types_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
      unified_backup_manager: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      unified_backup_manager_simple: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_agent_heartbeat: {
        Args: { p_agent_id: string }
        Returns: boolean
      }
      update_cache_hit: {
        Args: { p_cache_key: string }
        Returns: undefined
      }
      update_kpi_snapshot: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_processing_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_satisfaction: {
        Args: {
          p_feedback?: string
          p_metric_id: string
          p_satisfaction: number
        }
        Returns: boolean
      }
      url_decode: {
        Args: { data: string }
        Returns: string
      }
      url_encode: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      users_are: {
        Args: { "": unknown[] }
        Returns: string
      }
      validate_cnpj: {
        Args: { cnpj_input: string }
        Returns: boolean
      }
      validate_document: {
        Args: {
          p_corrected_data?: Json
          p_document_id: string
          p_validation_notes?: string
          p_validator_id: string
        }
        Returns: boolean
      }
      validate_json_schema: {
        Args: { instance: Json; schema: Json }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      verify: {
        Args: { algorithm?: string; secret: string; token: string }
        Returns: {
          header: Json
          payload: Json
          valid: boolean
        }[]
      }
      verify_critical_rls_enabled: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      verify_password: {
        Args: { hash: string; password: string }
        Returns: boolean
      }
      verify_tasks_rls: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      views_are: {
        Args: { "": unknown[] }
        Returns: string
      }
    }
    Enums: {
      alert_priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      alert_status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED"
      alert_type:
        | "DAS_VENCIMENTO"
        | "IRPJ_VENCIMENTO"
        | "CSLL_VENCIMENTO"
        | "DEFIS_PRAZO"
        | "SPED_PRAZO"
        | "DCTF_PRAZO"
        | "GFIP_PRAZO"
        | "RAIS_PRAZO"
        | "DIRF_PRAZO"
        | "DOCUMENTO_VENCIDO"
        | "RECEITA_LIMITE"
        | "REGIME_MUDANCA"
        | "CERTIFICADO_VENCIMENTO"
        | "CUSTOM"
      document_category: "fiscal" | "contabil" | "societario" | "bancario"
      document_type:
        | "NFE"
        | "RECIBO"
        | "CONTRATO"
        | "COMPROVANTE"
        | "BOLETO"
        | "EXTRATO"
      feedback_status:
        | "PENDING"
        | "REVIEWED"
        | "IN_PROGRESS"
        | "RESOLVED"
        | "DISMISSED"
      feedback_type:
        | "AI_RESPONSE"
        | "DOCUMENT_PROCESSING"
        | "ALERT_SYSTEM"
        | "GENERAL_SYSTEM"
        | "FEATURE_REQUEST"
        | "BUG_REPORT"
        | "PERFORMANCE"
        | "UI_UX"
      integration_context: "sistema" | "usuario_final"
      notification_frequency: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY"
      processing_status: "pending" | "processing" | "completed" | "failed"
      satisfaction_rating:
        | "VERY_DISSATISFIED"
        | "DISSATISFIED"
        | "NEUTRAL"
        | "SATISFIED"
        | "VERY_SATISFIED"
      status_processamento:
        | "pendente"
        | "processando"
        | "processado"
        | "erro"
        | "rejeitado"
        | "requer_verificacao"
      task_status: "todo" | "doing" | "review" | "done"
      tipo_documento:
        | "NFe"
        | "NFCe"
        | "NFSe"
        | "CTe"
        | "Recibo"
        | "Contrato"
        | "Boleto"
        | "Extrato"
        | "Outro"
        | "Pró-labore"
      unified_processing_status:
        | "pendente"
        | "processando"
        | "processado"
        | "erro"
        | "rejeitado"
    }
    CompositeTypes: {
      _time_trial_type: {
        a_time: number | null
      }
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
      tablefunc_crosstab_2: {
        row_name: string | null
        category_1: string | null
        category_2: string | null
      }
      tablefunc_crosstab_3: {
        row_name: string | null
        category_1: string | null
        category_2: string | null
        category_3: string | null
      }
      tablefunc_crosstab_4: {
        row_name: string | null
        category_1: string | null
        category_2: string | null
        category_3: string | null
        category_4: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alert_priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      alert_status: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"],
      alert_type: [
        "DAS_VENCIMENTO",
        "IRPJ_VENCIMENTO",
        "CSLL_VENCIMENTO",
        "DEFIS_PRAZO",
        "SPED_PRAZO",
        "DCTF_PRAZO",
        "GFIP_PRAZO",
        "RAIS_PRAZO",
        "DIRF_PRAZO",
        "DOCUMENTO_VENCIDO",
        "RECEITA_LIMITE",
        "REGIME_MUDANCA",
        "CERTIFICADO_VENCIMENTO",
        "CUSTOM",
      ],
      document_category: ["fiscal", "contabil", "societario", "bancario"],
      document_type: [
        "NFE",
        "RECIBO",
        "CONTRATO",
        "COMPROVANTE",
        "BOLETO",
        "EXTRATO",
      ],
      feedback_status: [
        "PENDING",
        "REVIEWED",
        "IN_PROGRESS",
        "RESOLVED",
        "DISMISSED",
      ],
      feedback_type: [
        "AI_RESPONSE",
        "DOCUMENT_PROCESSING",
        "ALERT_SYSTEM",
        "GENERAL_SYSTEM",
        "FEATURE_REQUEST",
        "BUG_REPORT",
        "PERFORMANCE",
        "UI_UX",
      ],
      integration_context: ["sistema", "usuario_final"],
      notification_frequency: ["ONCE", "DAILY", "WEEKLY", "MONTHLY"],
      processing_status: ["pending", "processing", "completed", "failed"],
      satisfaction_rating: [
        "VERY_DISSATISFIED",
        "DISSATISFIED",
        "NEUTRAL",
        "SATISFIED",
        "VERY_SATISFIED",
      ],
      status_processamento: [
        "pendente",
        "processando",
        "processado",
        "erro",
        "rejeitado",
        "requer_verificacao",
      ],
      task_status: ["todo", "doing", "review", "done"],
      tipo_documento: [
        "NFe",
        "NFCe",
        "NFSe",
        "CTe",
        "Recibo",
        "Contrato",
        "Boleto",
        "Extrato",
        "Outro",
        "Pró-labore",
      ],
      unified_processing_status: [
        "pendente",
        "processando",
        "processado",
        "erro",
        "rejeitado",
      ],
    },
  },
} as const
