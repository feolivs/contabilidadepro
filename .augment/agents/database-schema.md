---
type: "agent_requested"
description: "Example description"
---

# ContabilidadePRO - Database Schema Design

## Overview
This document defines the comprehensive database schema for ContabilidadePRO, designed to handle Brazilian accounting operations, client management, document processing, and AI-powered automation features.

## Schema Architecture

### Database Technology
- **Primary Database**: PostgreSQL 15+ on Supabase
- **Extensions**: pgvector (for AI embeddings), uuid-ossp (for UUIDs)
- **Security**: Row Level Security (RLS) enabled on all tables
- **Backup Strategy**: Automated daily backups with point-in-time recovery

## Core Tables

### 1. User Management

#### `users` (extends Supabase auth.users)
```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  nome_completo text NOT NULL,
  cpf text UNIQUE,
  telefone text,
  avatar_url text,
  plano_assinatura text DEFAULT 'free' CHECK (plano_assinatura IN ('free', 'basic', 'pro', 'enterprise')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  configuracoes jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS Policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING (auth.uid() = id);
```

#### `user_sessions`
```sql
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  ip_address inet,
  user_agent text,
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
```

### 2. Client Management

#### `empresas` (Companies/Clients)
```sql
CREATE TABLE empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text UNIQUE NOT NULL,
  inscricao_estadual text,
  inscricao_municipal text,
  regime_tributario text NOT NULL CHECK (regime_tributario IN ('MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real')),
  anexo_simples text CHECK (anexo_simples IN ('I', 'II', 'III', 'IV', 'V')),
  atividade_principal text NOT NULL,
  atividades_secundarias text[],
  endereco jsonb NOT NULL, -- {logradouro, numero, complemento, bairro, cidade, uf, cep}
  contato jsonb, -- {email, telefone, responsavel}
  dados_bancarios jsonb[], -- Array of bank account details
  configuracoes jsonb DEFAULT '{}',
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_empresas_user_id ON empresas(user_id);
CREATE INDEX idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX idx_empresas_regime ON empresas(regime_tributario);
```

#### `empresa_socios` (Company Partners)
```sql
CREATE TABLE empresa_socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text NOT NULL,
  participacao_percentual decimal(5,2) NOT NULL CHECK (participacao_percentual > 0 AND participacao_percentual <= 100),
  cargo text,
  endereco jsonb,
  contato jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_empresa_socios_empresa_id ON empresa_socios(empresa_id);
CREATE INDEX idx_empresa_socios_cpf ON empresa_socios(cpf);
```

### 3. Document Management

#### `documentos`
```sql
CREATE TABLE documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tipo_documento text NOT NULL CHECK (tipo_documento IN ('NFe', 'NFCe', 'NFSe', 'CTe', 'Recibo', 'Contrato', 'Boleto', 'Extrato', 'Outro')),
  numero_documento text,
  serie text,
  chave_acesso text UNIQUE, -- For electronic invoices
  arquivo_url text NOT NULL, -- Supabase Storage URL
  arquivo_nome text NOT NULL,
  arquivo_tamanho bigint,
  arquivo_tipo text,
  status_processamento text DEFAULT 'pendente' CHECK (status_processamento IN ('pendente', 'processando', 'processado', 'erro', 'rejeitado')),
  dados_extraidos jsonb, -- OCR extracted data
  dados_validados jsonb, -- Validated and categorized data
  observacoes text,
  tags text[],
  data_documento date,
  valor_total decimal(15,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_documentos_empresa_id ON documentos(empresa_id);
CREATE INDEX idx_documentos_tipo ON documentos(tipo_documento);
CREATE INDEX idx_documentos_status ON documentos(status_processamento);
CREATE INDEX idx_documentos_data ON documentos(data_documento);
CREATE INDEX idx_documentos_chave ON documentos(chave_acesso);
```

#### `documento_processamento_log`
```sql
CREATE TABLE documento_processamento_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid REFERENCES documentos(id) ON DELETE CASCADE,
  etapa text NOT NULL, -- 'upload', 'ocr', 'validation', 'categorization'
  status text NOT NULL CHECK (status IN ('iniciado', 'em_progresso', 'concluido', 'erro')),
  detalhes jsonb,
  erro_mensagem text,
  tempo_processamento interval,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_doc_log_documento_id ON documento_processamento_log(documento_id);
CREATE INDEX idx_doc_log_etapa ON documento_processamento_log(etapa);
```

### 4. Financial Transactions

#### `transacoes`
```sql
CREATE TABLE transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  documento_id uuid REFERENCES documentos(id) ON DELETE SET NULL,
  tipo_transacao text NOT NULL CHECK (tipo_transacao IN ('receita', 'despesa', 'transferencia')),
  categoria text NOT NULL, -- Chart of accounts category
  subcategoria text,
  descricao text NOT NULL,
  valor decimal(15,2) NOT NULL,
  data_transacao date NOT NULL,
  data_vencimento date,
  data_pagamento date,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'vencido', 'cancelado')),
  forma_pagamento text, -- 'dinheiro', 'cartao', 'pix', 'boleto', 'transferencia'
  conta_bancaria text,
  centro_custo text,
  projeto text,
  observacoes text,
  tags text[],
  metadados jsonb, -- Additional flexible data
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_transacoes_empresa_id ON transacoes(empresa_id);
CREATE INDEX idx_transacoes_tipo ON transacoes(tipo_transacao);
CREATE INDEX idx_transacoes_categoria ON transacoes(categoria);
CREATE INDEX idx_transacoes_data ON transacoes(data_transacao);
CREATE INDEX idx_transacoes_status ON transacoes(status);
```

#### `plano_contas`
```sql
CREATE TABLE plano_contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('ativo', 'passivo', 'patrimonio_liquido', 'receita', 'despesa')),
  nivel integer NOT NULL,
  conta_pai uuid REFERENCES plano_contas(id),
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_plano_contas_codigo ON plano_contas(codigo);
CREATE INDEX idx_plano_contas_tipo ON plano_contas(tipo);
CREATE INDEX idx_plano_contas_pai ON plano_contas(conta_pai);
```

### 5. Tax Calculations & Compliance

#### `calculos_impostos`
```sql
CREATE TABLE calculos_impostos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  periodo_apuracao date NOT NULL, -- Month/quarter being calculated
  tipo_calculo text NOT NULL CHECK (tipo_calculo IN ('DAS', 'IRPJ', 'CSLL', 'PIS', 'COFINS', 'ICMS', 'ISS')),
  regime_tributario text NOT NULL,
  receita_bruta decimal(15,2) NOT NULL DEFAULT 0,
  deducoes decimal(15,2) NOT NULL DEFAULT 0,
  base_calculo decimal(15,2) NOT NULL DEFAULT 0,
  aliquota decimal(5,4) NOT NULL,
  valor_imposto decimal(15,2) NOT NULL DEFAULT 0,
  valor_devido decimal(15,2) NOT NULL DEFAULT 0,
  valor_pago decimal(15,2) NOT NULL DEFAULT 0,
  data_vencimento date NOT NULL,
  data_pagamento date,
  codigo_barras text,
  status text DEFAULT 'calculado' CHECK (status IN ('calculado', 'pago', 'vencido', 'parcelado')),
  detalhes_calculo jsonb, -- Detailed calculation breakdown
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_calculos_empresa_id ON calculos_impostos(empresa_id);
CREATE INDEX idx_calculos_periodo ON calculos_impostos(periodo_apuracao);
CREATE INDEX idx_calculos_tipo ON calculos_impostos(tipo_calculo);
CREATE INDEX idx_calculos_vencimento ON calculos_impostos(data_vencimento);
```

#### `obrigacoes_fiscais`
```sql
CREATE TABLE obrigacoes_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  nome_obrigacao text NOT NULL, -- 'DCTF', 'ECF', 'SPED', etc.
  descricao text,
  periodicidade text NOT NULL CHECK (periodicidade IN ('mensal', 'trimestral', 'semestral', 'anual')),
  dia_vencimento integer NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  esfera text NOT NULL CHECK (esfera IN ('federal', 'estadual', 'municipal')),
  regime_aplicavel text[], -- Which tax regimes this applies to
  data_vencimento date NOT NULL,
  status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue', 'vencida', 'nao_se_aplica')),
  data_entrega timestamp with time zone,
  protocolo_entrega text,
  arquivo_gerado text, -- URL to generated file
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_obrigacoes_empresa_id ON obrigacoes_fiscais(empresa_id);
CREATE INDEX idx_obrigacoes_vencimento ON obrigacoes_fiscais(data_vencimento);
CREATE INDEX idx_obrigacoes_status ON obrigacoes_fiscais(status);
```

### 6. AI & Automation

#### `ai_conversas`
```sql
CREATE TABLE ai_conversas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
  titulo text,
  contexto text, -- 'dashboard', 'document_processing', 'tax_calculation', etc.
  status text DEFAULT 'ativa' CHECK (status IN ('ativa', 'arquivada', 'deletada')),
  metadados jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ai_conversas_user_id ON ai_conversas(user_id);
CREATE INDEX idx_ai_conversas_empresa_id ON ai_conversas(empresa_id);
```

#### `ai_mensagens`
```sql
CREATE TABLE ai_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id uuid REFERENCES ai_conversas(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('user', 'assistant', 'system')),
  conteudo text NOT NULL,
  embedding vector(1536), -- OpenAI embedding for semantic search
  tokens_usados integer,
  modelo_usado text,
  confidence_score decimal(3,2),
  metadados jsonb, -- Additional context, function calls, etc.
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ai_mensagens_conversa_id ON ai_mensagens(conversa_id);
CREATE INDEX idx_ai_mensagens_tipo ON ai_mensagens(tipo);
CREATE INDEX ON ai_mensagens USING ivfflat (embedding vector_cosine_ops);
```

#### `ai_tarefas_automatizadas`
```sql
CREATE TABLE ai_tarefas_automatizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_tarefa text NOT NULL, -- 'document_categorization', 'tax_calculation', 'deadline_reminder'
  configuracao jsonb NOT NULL,
  agenda_execucao text, -- Cron expression for scheduled tasks
  status text DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'concluida', 'erro')),
  ultima_execucao timestamp with time zone,
  proxima_execucao timestamp with time zone,
  contador_execucoes integer DEFAULT 0,
  log_execucoes jsonb[], -- Array of execution logs
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ai_tarefas_user_id ON ai_tarefas_automatizadas(user_id);
CREATE INDEX idx_ai_tarefas_proxima_exec ON ai_tarefas_automatizadas(proxima_execucao);
```

### 7. Reports & Analytics

#### `relatorios`
```sql
CREATE TABLE relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  tipo_relatorio text NOT NULL, -- 'DRE', 'balanco', 'fluxo_caixa', 'impostos', etc.
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  parametros jsonb, -- Report configuration parameters
  dados_relatorio jsonb NOT NULL, -- Generated report data
  arquivo_url text, -- Generated PDF/Excel file
  status text DEFAULT 'gerado' CHECK (status IN ('gerado', 'processando', 'erro', 'arquivado')),
  compartilhado_com uuid[], -- Array of user IDs who can access
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_relatorios_empresa_id ON relatorios(empresa_id);
CREATE INDEX idx_relatorios_tipo ON relatorios(tipo_relatorio);
CREATE INDEX idx_relatorios_periodo ON relatorios(periodo_inicio, periodo_fim);
```

## Database Functions & Procedures

### Dashboard Data Aggregation
```sql
CREATE OR REPLACE FUNCTION get_dashboard_complete(empresa_uuid uuid DEFAULT NULL)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_clientes', (
      SELECT COUNT(*) FROM empresas 
      WHERE (empresa_uuid IS NULL OR id = empresa_uuid)
      AND status = 'ativo'
    ),
    'documentos_mes', (
      SELECT COUNT(*) FROM documentos d
      JOIN empresas e ON d.empresa_id = e.id
      WHERE (empresa_uuid IS NULL OR e.id = empresa_uuid)
      AND d.created_at >= date_trunc('month', CURRENT_DATE)
    ),
    'proximos_vencimentos', (
      SELECT COUNT(*) FROM obrigacoes_fiscais o
      JOIN empresas e ON o.empresa_id = e.id
      WHERE (empresa_uuid IS NULL OR e.id = empresa_uuid)
      AND o.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND o.status = 'pendente'
    ),
    'receita_mes', (
      SELECT COALESCE(SUM(valor), 0) FROM transacoes t
      JOIN empresas e ON t.empresa_id = e.id
      WHERE (empresa_uuid IS NULL OR e.id = empresa_uuid)
      AND t.tipo_transacao = 'receita'
      AND t.data_transacao >= date_trunc('month', CURRENT_DATE)
      AND t.status = 'pago'
    ),
    'tarefas_pendentes', (
      SELECT json_agg(
        json_build_object(
          'id', id,
          'nome', nome_obrigacao,
          'vencimento', data_vencimento,
          'empresa', (SELECT razao_social FROM empresas WHERE id = empresa_id)
        )
      ) FROM obrigacoes_fiscais o
      JOIN empresas e ON o.empresa_id = e.id
      WHERE (empresa_uuid IS NULL OR e.id = empresa_uuid)
      AND o.status = 'pendente'
      AND o.data_vencimento <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY o.data_vencimento
      LIMIT 5
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Tax Calculation Functions
```sql
CREATE OR REPLACE FUNCTION calcular_das_simples_nacional(
  empresa_uuid uuid,
  periodo_apuracao date,
  anexo text DEFAULT 'I'
) RETURNS json AS $$
DECLARE
  receita_12_meses decimal(15,2);
  aliquota decimal(5,4);
  valor_das decimal(15,2);
  result json;
BEGIN
  -- Calculate 12-month trailing revenue
  SELECT COALESCE(SUM(valor), 0) INTO receita_12_meses
  FROM transacoes t
  WHERE t.empresa_id = empresa_uuid
    AND t.tipo_transacao = 'receita'
    AND t.status = 'pago'
    AND t.data_transacao > periodo_apuracao - INTERVAL '12 months'
    AND t.data_transacao <= periodo_apuracao;
  
  -- Determine tax rate based on revenue and annex
  SELECT rate INTO aliquota
  FROM simples_nacional_tabela
  WHERE anexo_tipo = anexo
    AND receita_12_meses >= faixa_inicio
    AND receita_12_meses < faixa_fim
  LIMIT 1;
  
  -- Calculate DAS value
  valor_das := receita_12_meses * aliquota / 12;
  
  SELECT json_build_object(
    'receita_12_meses', receita_12_meses,
    'aliquota', aliquota,
    'valor_das', valor_das,
    'periodo', periodo_apuracao,
    'anexo', anexo
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Indexes & Performance

### Critical Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_transacoes_empresa_data_tipo ON transacoes(empresa_id, data_transacao, tipo_transacao);
CREATE INDEX idx_documentos_empresa_status_data ON documentos(empresa_id, status_processamento, created_at);
CREATE INDEX idx_obrigacoes_empresa_vencimento_status ON obrigacoes_fiscais(empresa_id, data_vencimento, status);

-- Full-text search indexes
CREATE INDEX idx_empresas_search ON empresas USING gin(to_tsvector('portuguese', razao_social || ' ' || COALESCE(nome_fantasia, '')));
CREATE INDEX idx_documentos_search ON documentos USING gin(to_tsvector('portuguese', COALESCE(observacoes, '')));

-- Partial indexes for active records
CREATE INDEX idx_empresas_ativas ON empresas(id) WHERE status = 'ativo';
CREATE INDEX idx_obrigacoes_pendentes ON obrigacoes_fiscais(data_vencimento) WHERE status = 'pendente';
```

## Security & RLS Policies

### Row Level Security Examples
```sql
-- Empresas policy
CREATE POLICY "Users can only access their own companies" ON empresas
  FOR ALL USING (user_id = auth.uid());

-- Documentos policy
CREATE POLICY "Users can only access documents from their companies" ON documentos
  FOR ALL USING (
    user_id = auth.uid() OR
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );

-- Transações policy
CREATE POLICY "Users can only access transactions from their companies" ON transacoes
  FOR ALL USING (
    empresa_id IN (SELECT id FROM empresas WHERE user_id = auth.uid())
  );
```

## Backup & Recovery Strategy

### Automated Backups
- **Daily**: Full database backup
- **Hourly**: Transaction log backup
- **Real-time**: Continuous archiving for point-in-time recovery
- **Retention**: 30 days for daily backups, 7 days for hourly backups

### Disaster Recovery
- **RTO**: 4 hours maximum
- **RPO**: 15 minutes maximum
- **Failover**: Automated to secondary region
- **Testing**: Monthly disaster recovery drills

---

*This database schema is designed to scale with the ContabilidadePRO platform while maintaining data integrity, performance, and security standards required for financial and accounting applications.*

**Schema Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: April 2025