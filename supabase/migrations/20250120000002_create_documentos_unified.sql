-- Migração para criar tabela unificada de documentos
-- Data: 2025-01-20
-- Descrição: Consolida documentos, documentos_fiscais e processed_documents

-- Criar enums unificados
CREATE TYPE document_category AS ENUM ('fiscal', 'contabil', 'societario', 'bancario');
CREATE TYPE unified_processing_status AS ENUM ('pendente', 'processando', 'processado', 'erro', 'rejeitado');

-- Tabela unificada de documentos
CREATE TABLE IF NOT EXISTS documentos_unified (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relacionamentos
  empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Categorização unificada
  categoria document_category NOT NULL,
  tipo_documento TEXT NOT NULL,
  subtipo_documento TEXT, -- Para classificações mais específicas
  
  -- Metadados do arquivo (campos unificados)
  arquivo_nome TEXT NOT NULL,
  arquivo_tamanho BIGINT,
  arquivo_tipo TEXT, -- MIME type
  arquivo_url TEXT,
  arquivo_path TEXT, -- Path no storage
  arquivo_hash TEXT, -- Para detecção de duplicatas
  
  -- Identificação do documento
  numero_documento TEXT,
  serie TEXT,
  chave_acesso TEXT UNIQUE, -- Para documentos eletrônicos
  codigo_barras TEXT,
  
  -- Status de processamento unificado
  status_processamento unified_processing_status DEFAULT 'pendente',
  data_processamento TIMESTAMPTZ,
  metodo_processamento TEXT, -- 'manual', 'ocr', 'api', 'importacao'
  
  -- Dados extraídos (formato padronizado)
  dados_extraidos JSONB NOT NULL DEFAULT '{}',
  confianca_extracao DECIMAL(3,2) CHECK (confianca_extracao >= 0 AND confianca_extracao <= 1),
  
  -- Campos calculados automaticamente (GENERATED ALWAYS AS)
  valor_total DECIMAL(15,2) GENERATED ALWAYS AS (
    CASE 
      WHEN dados_extraidos->>'valorTotal' IS NOT NULL 
      THEN (dados_extraidos->>'valorTotal')::DECIMAL(15,2)
      WHEN dados_extraidos->>'valor' IS NOT NULL 
      THEN (dados_extraidos->>'valor')::DECIMAL(15,2)
      ELSE NULL
    END
  ) STORED,
  
  data_documento DATE GENERATED ALWAYS AS (
    CASE 
      WHEN dados_extraidos->>'dataEmissao' IS NOT NULL 
      THEN (dados_extraidos->>'dataEmissao')::DATE
      WHEN dados_extraidos->>'dataDocumento' IS NOT NULL 
      THEN (dados_extraidos->>'dataDocumento')::DATE
      WHEN dados_extraidos->>'dataTransacao' IS NOT NULL 
      THEN (dados_extraidos->>'dataTransacao')::DATE
      ELSE NULL
    END
  ) STORED,
  
  ano_fiscal INTEGER GENERATED ALWAYS AS (
    EXTRACT(YEAR FROM (
      CASE 
        WHEN dados_extraidos->>'dataEmissao' IS NOT NULL 
        THEN (dados_extraidos->>'dataEmissao')::DATE
        WHEN dados_extraidos->>'dataDocumento' IS NOT NULL 
        THEN (dados_extraidos->>'dataDocumento')::DATE
        WHEN dados_extraidos->>'dataTransacao' IS NOT NULL 
        THEN (dados_extraidos->>'dataTransacao')::DATE
        ELSE NULL
      END
    ))
  ) STORED,
  
  mes_fiscal INTEGER GENERATED ALWAYS AS (
    EXTRACT(MONTH FROM (
      CASE 
        WHEN dados_extraidos->>'dataEmissao' IS NOT NULL 
        THEN (dados_extraidos->>'dataEmissao')::DATE
        WHEN dados_extraidos->>'dataDocumento' IS NOT NULL 
        THEN (dados_extraidos->>'dataDocumento')::DATE
        WHEN dados_extraidos->>'dataTransacao' IS NOT NULL 
        THEN (dados_extraidos->>'dataTransacao')::DATE
        ELSE NULL
      END
    ))
  ) STORED,
  
  -- Competência fiscal (para documentos que têm competência diferente da data)
  competencia_fiscal DATE,
  
  -- Validação manual
  validado_manualmente BOOLEAN DEFAULT FALSE,
  validado_por UUID REFERENCES auth.users(id),
  validado_em TIMESTAMPTZ,
  observacoes_validacao TEXT,
  
  -- Metadados adicionais
  tags TEXT[] DEFAULT '{}',
  observacoes TEXT,
  prioridade INTEGER DEFAULT 0, -- Para ordenação/priorização
  
  -- Campos de auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Campos para soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT documentos_unified_empresa_user_check 
    CHECK (empresa_id IS NOT NULL OR user_id IS NOT NULL),
  CONSTRAINT documentos_unified_arquivo_check 
    CHECK (arquivo_nome IS NOT NULL AND (arquivo_url IS NOT NULL OR arquivo_path IS NOT NULL))
);

-- Índices otimizados para performance
CREATE INDEX idx_documentos_unified_empresa_categoria 
  ON documentos_unified(empresa_id, categoria) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_documentos_unified_user_categoria 
  ON documentos_unified(user_id, categoria) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_documentos_unified_status_data 
  ON documentos_unified(status_processamento, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_documentos_unified_tipo_documento 
  ON documentos_unified(tipo_documento) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_documentos_unified_chave_acesso 
  ON documentos_unified(chave_acesso) 
  WHERE chave_acesso IS NOT NULL;

CREATE INDEX idx_documentos_unified_numero_documento 
  ON documentos_unified(numero_documento) 
  WHERE numero_documento IS NOT NULL;

-- Índice para busca full-text
CREATE INDEX idx_documentos_unified_search 
  ON documentos_unified USING GIN(
    to_tsvector('portuguese', 
      COALESCE(arquivo_nome, '') || ' ' || 
      COALESCE(numero_documento, '') || ' ' || 
      COALESCE(dados_extraidos::TEXT, '')
    )
  ) WHERE deleted_at IS NULL;

-- Índice para dados extraídos (JSONB)
CREATE INDEX idx_documentos_unified_dados_extraidos 
  ON documentos_unified USING GIN(dados_extraidos) 
  WHERE deleted_at IS NULL;

-- Índice para período fiscal
CREATE INDEX idx_documentos_unified_fiscal_period 
  ON documentos_unified(ano_fiscal, mes_fiscal) 
  WHERE categoria = 'fiscal' AND deleted_at IS NULL;

-- Índice para tags
CREATE INDEX idx_documentos_unified_tags 
  ON documentos_unified USING GIN(tags) 
  WHERE deleted_at IS NULL;

-- Índice composto para queries comuns
CREATE INDEX idx_documentos_unified_empresa_status_data 
  ON documentos_unified(empresa_id, status_processamento, created_at DESC) 
  WHERE deleted_at IS NULL;

-- Trigger para atualizar updated_at e campos calculados
CREATE OR REPLACE FUNCTION update_documentos_unified_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar timestamp
  NEW.updated_at = NOW();
  
  -- Definir updated_by se não fornecido
  IF NEW.updated_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  
  -- Validar dados extraídos (estrutura básica)
  IF NEW.dados_extraidos IS NOT NULL THEN
    -- Garantir que é um objeto JSON válido
    IF jsonb_typeof(NEW.dados_extraidos) != 'object' THEN
      NEW.dados_extraidos = '{}'::jsonb;
    END IF;
  END IF;
  
  -- Auto-detectar categoria se não fornecida
  IF NEW.categoria IS NULL THEN
    NEW.categoria = CASE 
      WHEN NEW.tipo_documento ILIKE '%nf%' OR NEW.tipo_documento ILIKE '%fiscal%' THEN 'fiscal'::document_category
      WHEN NEW.tipo_documento ILIKE '%contrato%' OR NEW.tipo_documento ILIKE '%ata%' THEN 'societario'::document_category
      WHEN NEW.tipo_documento ILIKE '%extrato%' OR NEW.tipo_documento ILIKE '%boleto%' THEN 'bancario'::document_category
      ELSE 'contabil'::document_category
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documentos_unified_fields
  BEFORE INSERT OR UPDATE ON documentos_unified
  FOR EACH ROW EXECUTE FUNCTION update_documentos_unified_fields();

-- Trigger para soft delete
CREATE OR REPLACE FUNCTION soft_delete_documentos_unified()
RETURNS TRIGGER AS $$
BEGIN
  -- Em vez de deletar, marcar como deleted
  UPDATE documentos_unified 
  SET 
    deleted_at = NOW(),
    deleted_by = auth.uid(),
    updated_at = NOW()
  WHERE id = OLD.id;
  
  -- Prevenir delete real
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_soft_delete_documentos_unified
  BEFORE DELETE ON documentos_unified
  FOR EACH ROW EXECUTE FUNCTION soft_delete_documentos_unified();

-- Função para busca avançada unificada
CREATE OR REPLACE FUNCTION search_documentos_unified(
  p_user_id UUID DEFAULT NULL,
  p_empresa_id UUID DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_categoria document_category DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_status unified_processing_status DEFAULT NULL,
  p_ano_fiscal INTEGER DEFAULT NULL,
  p_mes_fiscal INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  arquivo_nome TEXT,
  tipo_documento TEXT,
  categoria document_category,
  status_processamento unified_processing_status,
  valor_total DECIMAL,
  data_documento DATE,
  created_at TIMESTAMPTZ,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.arquivo_nome,
    d.tipo_documento,
    d.categoria,
    d.status_processamento,
    d.valor_total,
    d.data_documento,
    d.created_at,
    CASE 
      WHEN p_search_term IS NOT NULL THEN
        ts_rank(
          to_tsvector('portuguese', 
            COALESCE(d.arquivo_nome, '') || ' ' || 
            COALESCE(d.numero_documento, '') || ' ' || 
            COALESCE(d.dados_extraidos::TEXT, '')
          ),
          plainto_tsquery('portuguese', p_search_term)
        )
      ELSE 1.0
    END as relevance
  FROM documentos_unified d
  WHERE d.deleted_at IS NULL
    AND (p_user_id IS NULL OR d.user_id = p_user_id)
    AND (p_empresa_id IS NULL OR d.empresa_id = p_empresa_id)
    AND (p_categoria IS NULL OR d.categoria = p_categoria)
    AND (p_tipo_documento IS NULL OR d.tipo_documento ILIKE '%' || p_tipo_documento || '%')
    AND (p_status IS NULL OR d.status_processamento = p_status)
    AND (p_ano_fiscal IS NULL OR d.ano_fiscal = p_ano_fiscal)
    AND (p_mes_fiscal IS NULL OR d.mes_fiscal = p_mes_fiscal)
    AND (
      p_search_term IS NULL OR
      to_tsvector('portuguese', 
        COALESCE(d.arquivo_nome, '') || ' ' || 
        COALESCE(d.numero_documento, '') || ' ' || 
        COALESCE(d.dados_extraidos::TEXT, '')
      ) @@ plainto_tsquery('portuguese', p_search_term)
    )
  ORDER BY 
    CASE WHEN p_search_term IS NOT NULL THEN relevance ELSE 0 END DESC,
    d.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- View para estatísticas unificadas
CREATE OR REPLACE VIEW documentos_unified_stats AS
SELECT 
  COALESCE(empresa_id::TEXT, user_id::TEXT) as owner_id,
  categoria,
  tipo_documento,
  status_processamento,
  COUNT(*) as document_count,
  AVG(confianca_extracao) as avg_confidence,
  SUM(valor_total) as total_value,
  MIN(created_at) as first_document,
  MAX(created_at) as last_document,
  COUNT(*) FILTER (WHERE validado_manualmente = true) as validated_count,
  COUNT(*) FILTER (WHERE status_processamento = 'processado') as processed_count,
  COUNT(*) FILTER (WHERE status_processamento = 'erro') as error_count
FROM documentos_unified
WHERE deleted_at IS NULL
GROUP BY COALESCE(empresa_id::TEXT, user_id::TEXT), categoria, tipo_documento, status_processamento;

-- Políticas RLS
ALTER TABLE documentos_unified ENABLE ROW LEVEL SECURITY;

-- Política para acesso por empresa
CREATE POLICY documentos_unified_empresa_access ON documentos_unified
  FOR ALL USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
    )
  );

-- Política para acesso direto por usuário
CREATE POLICY documentos_unified_user_access ON documentos_unified
  FOR ALL USING (user_id = auth.uid());

-- Política para administradores
CREATE POLICY documentos_unified_admin_access ON documentos_unified
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Comentários para documentação
COMMENT ON TABLE documentos_unified IS 'Tabela unificada consolidando todos os tipos de documentos';
COMMENT ON COLUMN documentos_unified.categoria IS 'Categoria principal: fiscal, contabil, societario, bancario';
COMMENT ON COLUMN documentos_unified.dados_extraidos IS 'Dados extraídos em formato JSONB padronizado';
COMMENT ON COLUMN documentos_unified.valor_total IS 'Valor total calculado automaticamente dos dados extraídos';
COMMENT ON COLUMN documentos_unified.data_documento IS 'Data do documento calculada automaticamente';
COMMENT ON COLUMN documentos_unified.ano_fiscal IS 'Ano fiscal calculado automaticamente';
COMMENT ON COLUMN documentos_unified.mes_fiscal IS 'Mês fiscal calculado automaticamente';
COMMENT ON COLUMN documentos_unified.confianca_extracao IS 'Score de confiança da extração (0.00-1.00)';

-- Função para migrar dados das tabelas antigas
CREATE OR REPLACE FUNCTION migrate_documentos_to_unified()
RETURNS TABLE (
  migrated_count INTEGER,
  source_table TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  docs_count INTEGER := 0;
  docs_fiscais_count INTEGER := 0;
  processed_docs_count INTEGER := 0;
  error_msg TEXT;
BEGIN
  -- Migrar tabela documentos
  BEGIN
    INSERT INTO documentos_unified (
      id, empresa_id, categoria, tipo_documento, arquivo_nome, arquivo_tamanho,
      arquivo_tipo, arquivo_url, arquivo_path, numero_documento, serie,
      chave_acesso, status_processamento, data_processamento,
      dados_extraidos, observacoes, created_at, updated_at
    )
    SELECT
      d.id,
      d.empresa_id,
      CASE
        WHEN d.tipo_documento::TEXT ILIKE '%nf%' THEN 'fiscal'::document_category
        WHEN d.tipo_documento::TEXT ILIKE '%contrato%' THEN 'societario'::document_category
        WHEN d.tipo_documento::TEXT ILIKE '%extrato%' THEN 'bancario'::document_category
        ELSE 'contabil'::document_category
      END,
      d.tipo_documento::TEXT,
      d.arquivo_nome,
      d.arquivo_tamanho,
      d.arquivo_tipo,
      d.arquivo_url,
      d.arquivo_path,
      d.numero_documento,
      d.serie,
      NULL, -- chave_acesso não existe na tabela original
      CASE d.status_processamento::TEXT
        WHEN 'pendente' THEN 'pendente'::unified_processing_status
        WHEN 'processando' THEN 'processando'::unified_processing_status
        WHEN 'processado' THEN 'processado'::unified_processing_status
        WHEN 'erro' THEN 'erro'::unified_processing_status
        ELSE 'pendente'::unified_processing_status
      END,
      d.data_processamento,
      COALESCE(d.dados_extraidos, '{}'::jsonb),
      d.observacoes,
      d.created_at,
      d.updated_at
    FROM documentos d
    WHERE NOT EXISTS (
      SELECT 1 FROM documentos_unified du WHERE du.id = d.id
    );

    GET DIAGNOSTICS docs_count = ROW_COUNT;

    RETURN QUERY SELECT docs_count, 'documentos'::TEXT, true, NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RETURN QUERY SELECT 0, 'documentos'::TEXT, false, error_msg;
  END;

  -- Migrar tabela documentos_fiscais
  BEGIN
    INSERT INTO documentos_unified (
      empresa_id, categoria, tipo_documento, arquivo_nome, arquivo_tamanho,
      arquivo_tipo, arquivo_url, arquivo_path, numero_documento,
      status_processamento, dados_extraidos, confianca_extracao,
      created_at, updated_at, created_by
    )
    SELECT
      df.empresa_id,
      'fiscal'::document_category,
      df.tipo_documento,
      df.nome_arquivo,
      df.tamanho_arquivo,
      df.mime_type,
      df.file_url,
      df.storage_path,
      df.numero_documento,
      CASE df.status
        WHEN 'pendente' THEN 'pendente'::unified_processing_status
        WHEN 'processado' THEN 'processado'::unified_processing_status
        ELSE 'pendente'::unified_processing_status
      END,
      COALESCE(df.dados_extraidos, '{}'::jsonb),
      df.confidence_score,
      df.created_at,
      df.updated_at,
      df.created_by
    FROM documentos_fiscais df
    WHERE NOT EXISTS (
      SELECT 1 FROM documentos_unified du
      WHERE du.arquivo_nome = df.nome_arquivo
      AND du.empresa_id = df.empresa_id
      AND du.created_at = df.created_at
    );

    GET DIAGNOSTICS docs_fiscais_count = ROW_COUNT;

    RETURN QUERY SELECT docs_fiscais_count, 'documentos_fiscais'::TEXT, true, NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RETURN QUERY SELECT 0, 'documentos_fiscais'::TEXT, false, error_msg;
  END;

  -- Migrar tabela processed_documents
  BEGIN
    INSERT INTO documentos_unified (
      user_id, categoria, tipo_documento, arquivo_nome, arquivo_tamanho,
      arquivo_tipo, arquivo_url, status_processamento, data_processamento,
      dados_extraidos, confianca_extracao, validado_manualmente,
      validado_por, validado_em, observacoes_validacao, tags,
      created_at, updated_at
    )
    SELECT
      pd.user_id,
      CASE pd.document_type::TEXT
        WHEN 'NFE' THEN 'fiscal'::document_category
        WHEN 'RECIBO' THEN 'fiscal'::document_category
        WHEN 'CONTRATO' THEN 'societario'::document_category
        WHEN 'EXTRATO' THEN 'bancario'::document_category
        ELSE 'contabil'::document_category
      END,
      pd.document_type::TEXT,
      pd.file_name,
      pd.file_size,
      pd.file_type,
      pd.original_file_url,
      CASE pd.status::TEXT
        WHEN 'pending' THEN 'pendente'::unified_processing_status
        WHEN 'processing' THEN 'processando'::unified_processing_status
        WHEN 'completed' THEN 'processado'::unified_processing_status
        WHEN 'failed' THEN 'erro'::unified_processing_status
        ELSE 'pendente'::unified_processing_status
      END,
      pd.processed_at,
      pd.extracted_data,
      pd.confidence_score,
      pd.manually_validated,
      pd.validated_by,
      pd.validated_at,
      pd.validation_notes,
      pd.tags,
      pd.created_at,
      pd.updated_at
    FROM processed_documents pd
    WHERE NOT EXISTS (
      SELECT 1 FROM documentos_unified du
      WHERE du.arquivo_nome = pd.file_name
      AND du.user_id = pd.user_id
      AND du.created_at = pd.created_at
    );

    GET DIAGNOSTICS processed_docs_count = ROW_COUNT;

    RETURN QUERY SELECT processed_docs_count, 'processed_documents'::TEXT, true, NULL::TEXT;

  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM;
    RETURN QUERY SELECT 0, 'processed_documents'::TEXT, false, error_msg;
  END;

END;
$$ LANGUAGE plpgsql;
