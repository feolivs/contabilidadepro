-- 📄 PROCESSED DOCUMENTS TABLE
-- Tabela para armazenar documentos processados com OCR

-- Enum para tipos de documento
CREATE TYPE document_type AS ENUM (
  'NFE',
  'RECIBO', 
  'CONTRATO',
  'COMPROVANTE',
  'BOLETO',
  'EXTRATO'
);

-- Enum para status de processamento
CREATE TYPE processing_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Tabela principal de documentos processados
CREATE TABLE IF NOT EXISTS processed_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Informações do arquivo
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  original_file_url TEXT,
  
  -- Processamento
  document_type document_type NOT NULL,
  status processing_status DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  
  -- Dados extraídos
  extracted_data JSONB NOT NULL DEFAULT '{}',
  confidence_score DECIMAL(3,2), -- Score de confiança 0.00-1.00
  
  -- Validação manual
  manually_validated BOOLEAN DEFAULT FALSE,
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Tags para categorização
  tags TEXT[] DEFAULT '{}',
  
  -- Informações fiscais extraídas (campos calculados via trigger)
  fiscal_year INTEGER,
  fiscal_month INTEGER,
  total_value DECIMAL(15,2)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_processed_documents_user_id ON processed_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_processed_documents_document_type ON processed_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_processed_documents_status ON processed_documents(status);
CREATE INDEX IF NOT EXISTS idx_processed_documents_created_at ON processed_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processed_documents_fiscal_period ON processed_documents(fiscal_year, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_processed_documents_total_value ON processed_documents(total_value);
CREATE INDEX IF NOT EXISTS idx_processed_documents_tags ON processed_documents USING GIN(tags);

-- Índice para busca em dados extraídos
CREATE INDEX IF NOT EXISTS idx_processed_documents_extracted_data ON processed_documents USING GIN(extracted_data);

-- Trigger para atualizar updated_at e campos calculados
CREATE OR REPLACE FUNCTION update_processed_documents_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar timestamp
  NEW.updated_at = NOW();

  -- Calcular fiscal_year
  IF NEW.extracted_data->>'dataEmissao' IS NOT NULL THEN
    NEW.fiscal_year = EXTRACT(YEAR FROM (NEW.extracted_data->>'dataEmissao')::DATE);
  ELSIF NEW.extracted_data->>'dataTransacao' IS NOT NULL THEN
    NEW.fiscal_year = EXTRACT(YEAR FROM (NEW.extracted_data->>'dataTransacao')::DATE);
  END IF;

  -- Calcular fiscal_month
  IF NEW.extracted_data->>'dataEmissao' IS NOT NULL THEN
    NEW.fiscal_month = EXTRACT(MONTH FROM (NEW.extracted_data->>'dataEmissao')::DATE);
  ELSIF NEW.extracted_data->>'dataTransacao' IS NOT NULL THEN
    NEW.fiscal_month = EXTRACT(MONTH FROM (NEW.extracted_data->>'dataTransacao')::DATE);
  END IF;

  -- Calcular total_value
  IF NEW.extracted_data->'valores'->>'valorTotal' IS NOT NULL THEN
    NEW.total_value = (NEW.extracted_data->'valores'->>'valorTotal')::DECIMAL;
  ELSIF NEW.extracted_data->>'valor' IS NOT NULL THEN
    NEW.total_value = (NEW.extracted_data->>'valor')::DECIMAL;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, apenas atualizar timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_processed_documents_fields
  BEFORE INSERT OR UPDATE ON processed_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_processed_documents_fields();

-- View para estatísticas de documentos
CREATE OR REPLACE VIEW document_processing_stats AS
SELECT 
  user_id,
  document_type,
  status,
  COUNT(*) as document_count,
  AVG(confidence_score) as avg_confidence,
  SUM(total_value) as total_value_sum,
  MIN(created_at) as first_document,
  MAX(created_at) as last_document,
  COUNT(*) FILTER (WHERE manually_validated = true) as validated_count
FROM processed_documents
GROUP BY user_id, document_type, status;

-- View para resumo mensal
CREATE OR REPLACE VIEW monthly_document_summary AS
SELECT 
  user_id,
  fiscal_year,
  fiscal_month,
  document_type,
  COUNT(*) as document_count,
  SUM(total_value) as total_value,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM processed_documents
WHERE fiscal_year IS NOT NULL AND fiscal_month IS NOT NULL
GROUP BY user_id, fiscal_year, fiscal_month, document_type
ORDER BY fiscal_year DESC, fiscal_month DESC;

-- Função para buscar documentos por conteúdo
CREATE OR REPLACE FUNCTION search_documents(
  p_user_id UUID,
  p_search_term TEXT,
  p_document_type document_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  document_type document_type,
  extracted_data JSONB,
  total_value DECIMAL,
  created_at TIMESTAMPTZ,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.id,
    pd.file_name,
    pd.document_type,
    pd.extracted_data,
    pd.total_value,
    pd.created_at,
    ts_rank(
      to_tsvector('portuguese', 
        COALESCE(pd.file_name, '') || ' ' || 
        COALESCE(pd.extracted_data::TEXT, '')
      ),
      plainto_tsquery('portuguese', p_search_term)
    ) as relevance
  FROM processed_documents pd
  WHERE pd.user_id = p_user_id
    AND (p_document_type IS NULL OR pd.document_type = p_document_type)
    AND (
      to_tsvector('portuguese', 
        COALESCE(pd.file_name, '') || ' ' || 
        COALESCE(pd.extracted_data::TEXT, '')
      ) @@ plainto_tsquery('portuguese', p_search_term)
    )
  ORDER BY relevance DESC, pd.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para obter resumo fiscal
CREATE OR REPLACE FUNCTION get_fiscal_summary(
  p_user_id UUID,
  p_year INTEGER DEFAULT NULL,
  p_month INTEGER DEFAULT NULL
)
RETURNS TABLE (
  document_type document_type,
  document_count BIGINT,
  total_value NUMERIC,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pd.document_type,
    COUNT(*) as document_count,
    COALESCE(SUM(pd.total_value), 0) as total_value,
    COALESCE(AVG(pd.total_value), 0) as avg_value,
    COALESCE(MIN(pd.total_value), 0) as min_value,
    COALESCE(MAX(pd.total_value), 0) as max_value
  FROM processed_documents pd
  WHERE pd.user_id = p_user_id
    AND pd.status = 'completed'
    AND (p_year IS NULL OR pd.fiscal_year = p_year)
    AND (p_month IS NULL OR pd.fiscal_month = p_month)
    AND pd.total_value IS NOT NULL
  GROUP BY pd.document_type
  ORDER BY total_value DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para validar documento manualmente
CREATE OR REPLACE FUNCTION validate_document(
  p_document_id UUID,
  p_validator_id UUID,
  p_validation_notes TEXT DEFAULT NULL,
  p_corrected_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE processed_documents 
  SET 
    manually_validated = true,
    validated_by = p_validator_id,
    validated_at = NOW(),
    validation_notes = p_validation_notes,
    extracted_data = COALESCE(p_corrected_data, extracted_data)
  WHERE id = p_document_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE processed_documents ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só podem ver seus próprios documentos
CREATE POLICY "Users can view own documents" ON processed_documents
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: usuários só podem inserir seus próprios documentos
CREATE POLICY "Users can insert own documents" ON processed_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: usuários só podem atualizar seus próprios documentos
CREATE POLICY "Users can update own documents" ON processed_documents
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: usuários só podem deletar seus próprios documentos
CREATE POLICY "Users can delete own documents" ON processed_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE processed_documents IS 'Documentos processados com OCR e extração de dados';
COMMENT ON COLUMN processed_documents.extracted_data IS 'Dados extraídos do documento em formato JSON';
COMMENT ON COLUMN processed_documents.confidence_score IS 'Score de confiança da extração (0.00-1.00)';
COMMENT ON COLUMN processed_documents.fiscal_year IS 'Ano fiscal extraído automaticamente';
COMMENT ON COLUMN processed_documents.fiscal_month IS 'Mês fiscal extraído automaticamente';
COMMENT ON COLUMN processed_documents.total_value IS 'Valor total extraído automaticamente';

-- Função para limpeza de documentos antigos (opcional)
CREATE OR REPLACE FUNCTION cleanup_old_documents(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processed_documents 
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL
    AND manually_validated = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
