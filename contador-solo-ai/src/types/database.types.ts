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
      automation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          empresa_id: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          payload: Json | null
          priority: string | null
          result: Json | null
          retry_count: number | null
          scheduled_for: string | null
          started_at: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          empresa_id?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          payload?: Json | null
          priority?: string | null
          result?: Json | null
          retry_count?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          empresa_id?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          payload?: Json | null
          priority?: string | null
          result?: Json | null
          retry_count?: number | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_id: string
          backup_type: string
          checksum: string | null
          created_at: string | null
          duration_ms: number
          error_message: string | null
          id: string
          metadata: Json | null
          size_bytes: number
          status: string
          storage_path: string | null
          tables_count: number
          updated_at: string | null
        }
        Insert: {
          backup_id: string
          backup_type?: string
          checksum?: string | null
          created_at?: string | null
          duration_ms?: number
          error_message?: string | null
          id?: string
          metadata?: Json | null
          size_bytes?: number
          status?: string
          storage_path?: string | null
          tables_count?: number
          updated_at?: string | null
        }
        Update: {
          backup_id?: string
          backup_type?: string
          checksum?: string | null
          created_at?: string | null
          duration_ms?: number
          error_message?: string | null
          id?: string
          metadata?: Json | null
          size_bytes?: number
          status?: string
          storage_path?: string | null
          tables_count?: number
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      certificados_digitais: {
        Row: {
          arquivo_size: number | null
          arquivo_url: string | null
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          data_emissao: string
          data_vencimento: string
          emissor: string | null
          empresa_id: string
          id: string
          nome_arquivo: string
          numero_serie: string | null
          senha_criptografada: string
          status: string | null
          thumbprint: string | null
          tipo_certificado: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          arquivo_size?: number | null
          arquivo_url?: string | null
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_emissao: string
          data_vencimento: string
          emissor?: string | null
          empresa_id: string
          id?: string
          nome_arquivo: string
          numero_serie?: string | null
          senha_criptografada: string
          status?: string | null
          thumbprint?: string | null
          tipo_certificado?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          arquivo_size?: number | null
          arquivo_url?: string | null
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_emissao?: string
          data_vencimento?: string
          emissor?: string | null
          empresa_id?: string
          id?: string
          nome_arquivo?: string
          numero_serie?: string | null
          senha_criptografada?: string
          status?: string | null
          thumbprint?: string | null
          tipo_certificado?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_digitais_empresa_id_fkey"
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
      dashboard_alerts: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          dismissed_at: string | null
          empresa_id: string | null
          expires_at: string | null
          id: string
          message: string
          priority: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          empresa_id?: string | null
          expires_at?: string | null
          id?: string
          message: string
          priority?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          empresa_id?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          cache_expires_at: string | null
          cached_data: Json | null
          config: Json | null
          created_at: string | null
          description: string | null
          empresa_id: string | null
          id: string
          position: Json
          refresh_interval: number | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
          visible: boolean | null
        }
        Insert: {
          cache_expires_at?: string | null
          cached_data?: Json | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          empresa_id?: string | null
          id?: string
          position?: Json
          refresh_interval?: number | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
          visible?: boolean | null
        }
        Update: {
          cache_expires_at?: string | null
          cached_data?: Json | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          empresa_id?: string | null
          id?: string
          position?: Json
          refresh_interval?: number | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          visible?: boolean | null
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
          created_at: string | null
          dados_extraidos: Json | null
          data_emissao: string | null
          data_processamento: string | null
          empresa_id: string
          id: string
          numero_documento: string | null
          observacoes: string | null
          serie: string | null
          status_processamento: Database["public"]["Enums"]["status_processamento"]
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
          created_at?: string | null
          dados_extraidos?: Json | null
          data_emissao?: string | null
          data_processamento?: string | null
          empresa_id: string
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          serie?: string | null
          status_processamento?: Database["public"]["Enums"]["status_processamento"]
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
          created_at?: string | null
          dados_extraidos?: Json | null
          data_emissao?: string | null
          data_processamento?: string | null
          empresa_id?: string
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          serie?: string | null
          status_processamento?: Database["public"]["Enums"]["status_processamento"]
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
      empresa_configuracoes: {
        Row: {
          anexo_simples_nacional: string | null
          codigo_atividade_principal: string | null
          configuracoes_sistema: Json | null
          created_at: string | null
          data_inicio_servicos: string | null
          data_opcao_regime: string | null
          empresa_id: string
          id: string
          observacoes_gerais: string | null
          plano_contratado: string | null
          preferencias_usuario: Json | null
          status_conta: string | null
          updated_at: string | null
        }
        Insert: {
          anexo_simples_nacional?: string | null
          codigo_atividade_principal?: string | null
          configuracoes_sistema?: Json | null
          created_at?: string | null
          data_inicio_servicos?: string | null
          data_opcao_regime?: string | null
          empresa_id: string
          id?: string
          observacoes_gerais?: string | null
          plano_contratado?: string | null
          preferencias_usuario?: Json | null
          status_conta?: string | null
          updated_at?: string | null
        }
        Update: {
          anexo_simples_nacional?: string | null
          codigo_atividade_principal?: string | null
          configuracoes_sistema?: Json | null
          created_at?: string | null
          data_inicio_servicos?: string | null
          data_opcao_regime?: string | null
          empresa_id?: string
          id?: string
          observacoes_gerais?: string | null
          plano_contratado?: string | null
          preferencias_usuario?: Json | null
          status_conta?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_configuracoes_fiscais: {
        Row: {
          auto_calcular_darf: boolean | null
          auto_calcular_das: boolean | null
          created_at: string | null
          dia_vencimento_darf: number | null
          dia_vencimento_das: number | null
          empresa_id: string
          id: string
          lucro_presumido_atividade: string | null
          lucro_presumido_percentual: number | null
          lucro_real_opcao: string | null
          notificar_1_dia: boolean | null
          notificar_15_dias: boolean | null
          notificar_30_dias: boolean | null
          notificar_7_dias: boolean | null
          simples_nacional_anexo: string | null
          simples_nacional_fator_r: number | null
          simples_nacional_inicio: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_calcular_darf?: boolean | null
          auto_calcular_das?: boolean | null
          created_at?: string | null
          dia_vencimento_darf?: number | null
          dia_vencimento_das?: number | null
          empresa_id: string
          id?: string
          lucro_presumido_atividade?: string | null
          lucro_presumido_percentual?: number | null
          lucro_real_opcao?: string | null
          notificar_1_dia?: boolean | null
          notificar_15_dias?: boolean | null
          notificar_30_dias?: boolean | null
          notificar_7_dias?: boolean | null
          simples_nacional_anexo?: string | null
          simples_nacional_fator_r?: number | null
          simples_nacional_inicio?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_calcular_darf?: boolean | null
          auto_calcular_das?: boolean | null
          created_at?: string | null
          dia_vencimento_darf?: number | null
          dia_vencimento_das?: number | null
          empresa_id?: string
          id?: string
          lucro_presumido_atividade?: string | null
          lucro_presumido_percentual?: number | null
          lucro_real_opcao?: string | null
          notificar_1_dia?: boolean | null
          notificar_15_dias?: boolean | null
          notificar_30_dias?: boolean | null
          notificar_7_dias?: boolean | null
          simples_nacional_anexo?: string | null
          simples_nacional_fator_r?: number | null
          simples_nacional_inicio?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      job_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          job_id: string
          progress_percentage: number
          started_at: string | null
          status: string
          step_data: Json | null
          step_description: string | null
          step_name: string
          step_order: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          progress_percentage?: number
          started_at?: string | null
          status?: string
          step_data?: Json | null
          step_description?: string | null
          step_name: string
          step_order?: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          progress_percentage?: number
          started_at?: string | null
          status?: string
          step_data?: Json | null
          step_description?: string | null
          step_name?: string
          step_order?: number
          updated_at?: string | null
        }
        Relationships: []
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
      metricas_assistente_ia: {
        Row: {
          created_at: string | null
          data_metrica: string
          id: string
          satisfacao_media: number | null
          tempo_medio_resposta: number | null
          tipos_consulta: Json | null
          total_consultas: number | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_metrica?: string
          id?: string
          satisfacao_media?: number | null
          tempo_medio_resposta?: number | null
          tipos_consulta?: Json | null
          total_consultas?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_metrica?: string
          id?: string
          satisfacao_media?: number | null
          tempo_medio_resposta?: number | null
          tipos_consulta?: Json | null
          total_consultas?: number | null
          total_tokens?: number | null
          updated_at?: string | null
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
      observability_performance: {
        Row: {
          cold_start: boolean | null
          created_at: string | null
          database_queries: number | null
          database_time_ms: number | null
          empresa_id: string | null
          errors: number | null
          execution_time_ms: number
          function_name: string
          id: string
          memory_used_mb: number | null
          metadata: Json | null
          request_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          cold_start?: boolean | null
          created_at?: string | null
          database_queries?: number | null
          database_time_ms?: number | null
          empresa_id?: string | null
          errors?: number | null
          execution_time_ms: number
          function_name: string
          id?: string
          memory_used_mb?: number | null
          metadata?: Json | null
          request_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          cold_start?: boolean | null
          created_at?: string | null
          database_queries?: number | null
          database_time_ms?: number | null
          empresa_id?: string | null
          errors?: number | null
          execution_time_ms?: number
          function_name?: string
          id?: string
          memory_used_mb?: number | null
          metadata?: Json | null
          request_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      production_alerts: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string | null
          status: string | null
          title: string
          triggered_at: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title: string
          triggered_at?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
          title?: string
          triggered_at?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      queue_configurations: {
        Row: {
          created_at: string | null
          dead_letter_queue: string | null
          enabled: boolean
          id: string
          job_timeout_seconds: number
          max_jobs_per_worker: number
          max_workers: number
          queue_name: string
          retry_delay_seconds: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dead_letter_queue?: string | null
          enabled?: boolean
          id?: string
          job_timeout_seconds?: number
          max_jobs_per_worker?: number
          max_workers?: number
          queue_name: string
          retry_delay_seconds?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dead_letter_queue?: string | null
          enabled?: boolean
          id?: string
          job_timeout_seconds?: number
          max_jobs_per_worker?: number
          max_workers?: number
          queue_name?: string
          retry_delay_seconds?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      queue_workers: {
        Row: {
          current_job_id: string | null
          id: string
          last_heartbeat: string | null
          metadata: Json | null
          queue_name: string
          started_at: string | null
          status: string
          worker_id: string
        }
        Insert: {
          current_job_id?: string | null
          id?: string
          last_heartbeat?: string | null
          metadata?: Json | null
          queue_name: string
          started_at?: string | null
          status?: string
          worker_id: string
        }
        Update: {
          current_job_id?: string | null
          id?: string
          last_heartbeat?: string | null
          metadata?: Json | null
          queue_name?: string
          started_at?: string | null
          status?: string
          worker_id?: string
        }
        Relationships: []
      }
      realtime_notifications: {
        Row: {
          auto_dismiss_seconds: number | null
          category: string | null
          created_at: string | null
          delivered_at: string | null
          dismissed_at: string | null
          empresa_id: string | null
          expires_at: string | null
          id: string
          job_id: string | null
          job_status: string | null
          job_type: string | null
          message: string
          metadata: Json | null
          notification_type: string
          payload: Json | null
          priority: string
          progress_percentage: number | null
          read_at: string | null
          sent_at: string | null
          session_id: string | null
          show_badge: boolean | null
          show_toast: boolean | null
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          auto_dismiss_seconds?: number | null
          category?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dismissed_at?: string | null
          empresa_id?: string | null
          expires_at?: string | null
          id?: string
          job_id?: string | null
          job_status?: string | null
          job_type?: string | null
          message: string
          metadata?: Json | null
          notification_type: string
          payload?: Json | null
          priority?: string
          progress_percentage?: number | null
          read_at?: string | null
          sent_at?: string | null
          session_id?: string | null
          show_badge?: boolean | null
          show_toast?: boolean | null
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          auto_dismiss_seconds?: number | null
          category?: string | null
          created_at?: string | null
          delivered_at?: string | null
          dismissed_at?: string | null
          empresa_id?: string | null
          expires_at?: string | null
          id?: string
          job_id?: string | null
          job_status?: string | null
          job_type?: string | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          payload?: Json | null
          priority?: string
          progress_percentage?: number | null
          read_at?: string | null
          sent_at?: string | null
          session_id?: string | null
          show_badge?: boolean | null
          show_toast?: boolean | null
          status?: string
          title?: string
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
      user_automation_settings: {
        Row: {
          auto_calculate_darf: boolean | null
          auto_calculate_das: boolean | null
          automation_enabled: boolean | null
          calculation_schedule: string | null
          compliance_check_frequency: string | null
          compliance_checks_enabled: boolean | null
          created_at: string | null
          dashboard_auto_refresh: boolean | null
          dashboard_refresh_interval: number | null
          id: string
          notification_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_calculate_darf?: boolean | null
          auto_calculate_das?: boolean | null
          automation_enabled?: boolean | null
          calculation_schedule?: string | null
          compliance_check_frequency?: string | null
          compliance_checks_enabled?: boolean | null
          created_at?: string | null
          dashboard_auto_refresh?: boolean | null
          dashboard_refresh_interval?: number | null
          id?: string
          notification_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_calculate_darf?: boolean | null
          auto_calculate_das?: boolean | null
          automation_enabled?: boolean | null
          calculation_schedule?: string | null
          compliance_check_frequency?: string | null
          compliance_checks_enabled?: boolean | null
          created_at?: string | null
          dashboard_auto_refresh?: boolean | null
          dashboard_refresh_interval?: number | null
          id?: string
          notification_preferences?: Json | null
          updated_at?: string | null
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
    }
    Views: {
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
    }
    Functions: {
      archive_old_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      archive_task: {
        Args: { archived_by_param?: string; task_id_param: string }
        Returns: boolean
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      calculate_suggestion_confidence: {
        Args: {
          p_context_data: Json
          p_suggestion_type: string
          p_user_id: string
        }
        Returns: number
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
      cleanup_expired_cnpj_cache: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_agent_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      get_cron_jobs_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_dashboard_complete: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
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
      initiate_backup: {
        Args: { p_backup_location: string; p_backup_type: string }
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
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
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
      optimize_system_performance: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      process_webhook_retries: {
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
      resolve_system_alert: {
        Args: { alert_id: string; resolved_by_user?: string }
        Returns: undefined
      }
      run_automation_monitoring_cron: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      run_cleanup_expired_cron: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      update_agent_heartbeat: {
        Args: { p_agent_id: string }
        Returns: boolean
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      validate_cnpj: {
        Args: { cnpj_input: string }
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
      verify_critical_rls_enabled: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      verify_tasks_rls: {
        Args: Record<PropertyKey, never>
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
    }
    Enums: {
      integration_context: "sistema" | "usuario_final"
      status_processamento:
        | "pendente"
        | "processando"
        | "processado"
        | "erro"
        | "rejeitado"
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
    }
    CompositeTypes: {
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
      integration_context: ["sistema", "usuario_final"],
      status_processamento: [
        "pendente",
        "processando",
        "processado",
        "erro",
        "rejeitado",
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
      ],
    },
  },
} as const
