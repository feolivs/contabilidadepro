-- Migração para criar tabelas do sistema de OCR nativo para PDFs
-- Data: 2024-12-15
-- Descrição: Adiciona suporte completo para OCR nativo com cache e métricas

-- Tabela para cache de resultados OCR
CREATE TABLE IF NOT EXISTS pdf_ocr_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_path TEXT NOT NULL UNIQUE,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Índices para performance
  CONSTRAINT pdf_ocr_cache_file_path_key UNIQUE (file_path)
);

-- Índices para a tabela de cache
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_cache_file_path ON pdf_ocr_cache(file_path);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_cache_expires_at ON pdf_ocr_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_cache_created_at ON pdf_ocr_cache(created_at DESC);

-- Tabela para métricas de processamento OCR
CREATE TABLE IF NOT EXISTS pdf_ocr_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('native', 'ocr', 'hybrid', 'error')),
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  processing_time INTEGER NOT NULL, -- em milissegundos
  character_count INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  readability_score DECIMAL(3,2) DEFAULT 0 CHECK (readability_score >= 0 AND readability_score <= 1),
  has_structured_data BOOLEAN DEFAULT FALSE,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadados adicionais em JSON
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para a tabela de métricas
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_metrics_document_id ON pdf_ocr_metrics(document_id);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_metrics_method ON pdf_ocr_metrics(method);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_metrics_created_at ON pdf_ocr_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_metrics_success ON pdf_ocr_metrics(success);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_metrics_confidence ON pdf_ocr_metrics(confidence DESC);

-- Tabela para logs detalhados de processamento OCR
CREATE TABLE IF NOT EXISTS pdf_ocr_processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documentos(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  processing_stage TEXT NOT NULL, -- 'download', 'extraction', 'ocr', 'validation', 'complete', 'error'
  stage_duration INTEGER, -- duração da etapa em ms
  stage_result JSONB,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Informações de contexto
  user_id UUID,
  empresa_id UUID,
  session_id TEXT
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_logs_document_id ON pdf_ocr_processing_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_logs_stage ON pdf_ocr_processing_logs(processing_stage);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_logs_created_at ON pdf_ocr_processing_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_ocr_logs_user_id ON pdf_ocr_processing_logs(user_id);

-- Atualizar tabela de documentos para incluir informações de OCR
ALTER TABLE documentos 
ADD COLUMN IF NOT EXISTS ocr_method TEXT CHECK (ocr_method IN ('native', 'ocr', 'hybrid', 'none')),
ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(3,2) CHECK (ocr_confidence >= 0 AND ocr_confidence <= 1),
ADD COLUMN IF NOT EXISTS text_extraction_quality JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS processing_metadata JSONB DEFAULT '{}'::jsonb;

-- Atualizar tabela de análises IA para incluir metadados de processamento
ALTER TABLE documento_analises_ia 
ADD COLUMN IF NOT EXISTS metadados_processamento JSONB DEFAULT '{}'::jsonb;

-- Função para limpeza automática do cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_ocr_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pdf_ocr_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para estatísticas de OCR
CREATE OR REPLACE FUNCTION get_ocr_statistics(
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_documents INTEGER,
  native_extraction INTEGER,
  ocr_extraction INTEGER,
  hybrid_extraction INTEGER,
  avg_confidence DECIMAL,
  avg_processing_time INTEGER,
  success_rate DECIMAL,
  documents_with_structured_data INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_documents,
    COUNT(CASE WHEN method = 'native' THEN 1 END)::INTEGER as native_extraction,
    COUNT(CASE WHEN method = 'ocr' THEN 1 END)::INTEGER as ocr_extraction,
    COUNT(CASE WHEN method = 'hybrid' THEN 1 END)::INTEGER as hybrid_extraction,
    ROUND(AVG(confidence), 2) as avg_confidence,
    ROUND(AVG(processing_time))::INTEGER as avg_processing_time,
    ROUND(
      COUNT(CASE WHEN success THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL, 
      2
    ) as success_rate,
    COUNT(CASE WHEN has_structured_data THEN 1 END)::INTEGER as documents_with_structured_data
  FROM pdf_ocr_metrics 
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Função para obter métricas de qualidade por método
CREATE OR REPLACE FUNCTION get_ocr_quality_by_method()
RETURNS TABLE (
  method TEXT,
  document_count INTEGER,
  avg_confidence DECIMAL,
  avg_readability DECIMAL,
  structured_data_rate DECIMAL,
  avg_processing_time INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.method,
    COUNT(*)::INTEGER as document_count,
    ROUND(AVG(m.confidence), 2) as avg_confidence,
    ROUND(AVG(m.readability_score), 2) as avg_readability,
    ROUND(
      COUNT(CASE WHEN m.has_structured_data THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL, 
      2
    ) as structured_data_rate,
    ROUND(AVG(m.processing_time))::INTEGER as avg_processing_time
  FROM pdf_ocr_metrics m
  WHERE m.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY m.method
  ORDER BY avg_confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at no cache
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pdf_ocr_cache_updated_at
  BEFORE UPDATE ON pdf_ocr_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View para relatórios de OCR
CREATE OR REPLACE VIEW ocr_performance_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  method,
  COUNT(*) as document_count,
  ROUND(AVG(confidence), 2) as avg_confidence,
  ROUND(AVG(processing_time)) as avg_processing_time_ms,
  COUNT(CASE WHEN success THEN 1 END) as successful_extractions,
  COUNT(CASE WHEN has_structured_data THEN 1 END) as structured_documents,
  ROUND(
    COUNT(CASE WHEN success THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100, 
    1
  ) as success_rate_percent
FROM pdf_ocr_metrics
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), method
ORDER BY date DESC, method;

-- Comentários nas tabelas
COMMENT ON TABLE pdf_ocr_cache IS 'Cache de resultados de OCR para evitar reprocessamento';
COMMENT ON TABLE pdf_ocr_metrics IS 'Métricas de performance e qualidade do processamento OCR';
COMMENT ON TABLE pdf_ocr_processing_logs IS 'Logs detalhados do processamento OCR para debugging';

COMMENT ON COLUMN pdf_ocr_cache.file_path IS 'Caminho do arquivo no storage';
COMMENT ON COLUMN pdf_ocr_cache.result IS 'Resultado completo do processamento OCR em JSON';
COMMENT ON COLUMN pdf_ocr_cache.expires_at IS 'Data de expiração do cache (padrão: 7 dias)';

COMMENT ON COLUMN pdf_ocr_metrics.method IS 'Método usado: native (extração nativa), ocr (OCR), hybrid (combinado)';
COMMENT ON COLUMN pdf_ocr_metrics.confidence IS 'Confiança do resultado (0.0 a 1.0)';
COMMENT ON COLUMN pdf_ocr_metrics.processing_time IS 'Tempo de processamento em milissegundos';
COMMENT ON COLUMN pdf_ocr_metrics.readability_score IS 'Score de legibilidade do texto extraído';
COMMENT ON COLUMN pdf_ocr_metrics.has_structured_data IS 'Se o documento contém dados estruturados (CNPJ, valores, etc.)';

-- Inserir dados de exemplo para testes (opcional)
-- INSERT INTO pdf_ocr_metrics (document_id, method, confidence, processing_time, character_count, word_count, readability_score, has_structured_data, success)
-- VALUES 
--   (gen_random_uuid(), 'native', 0.95, 1200, 1500, 250, 0.9, true, true),
--   (gen_random_uuid(), 'ocr', 0.78, 4500, 1200, 200, 0.75, true, true),
--   (gen_random_uuid(), 'hybrid', 0.88, 3200, 1800, 300, 0.85, true, true);

-- Criar política RLS para as novas tabelas (se RLS estiver habilitado)
-- ALTER TABLE pdf_ocr_cache ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pdf_ocr_metrics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pdf_ocr_processing_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de exemplo (ajustar conforme necessário)
-- CREATE POLICY "Users can access their own OCR cache" ON pdf_ocr_cache
--   FOR ALL USING (true); -- Ajustar conforme lógica de negócio

-- CREATE POLICY "Users can access their own OCR metrics" ON pdf_ocr_metrics
--   FOR ALL USING (true); -- Ajustar conforme lógica de negócio
