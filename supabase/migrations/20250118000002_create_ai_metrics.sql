-- 📊 AI METRICS TABLE
-- Tabela para métricas de performance e uso da IA

-- Criar tabela de métricas
CREATE TABLE IF NOT EXISTS ai_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  query_text TEXT NOT NULL,
  query_type TEXT DEFAULT 'general',
  
  -- Performance metrics
  total_time_ms INTEGER NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  cache_lookup_time_ms INTEGER,
  openai_time_ms INTEGER,
  streaming BOOLEAN DEFAULT FALSE,
  
  -- Response metrics
  response_length INTEGER,
  response_cached BOOLEAN DEFAULT FALSE,
  tokens_used INTEGER,
  
  -- Quality metrics
  user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
  user_feedback TEXT,
  
  -- Error tracking
  error_occurred BOOLEAN DEFAULT FALSE,
  error_type TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  
  CONSTRAINT ai_metrics_satisfaction_check CHECK (
    user_satisfaction IS NULL OR (user_satisfaction >= 1 AND user_satisfaction <= 5)
  )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_metrics_user_id ON ai_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_created_at ON ai_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_query_type ON ai_metrics(query_type);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_cache_hit ON ai_metrics(cache_hit);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_error_occurred ON ai_metrics(error_occurred);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_session_id ON ai_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_performance ON ai_metrics(total_time_ms, cache_hit);

-- View para estatísticas de performance
CREATE OR REPLACE VIEW ai_performance_stats AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_queries,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  COUNT(*) FILTER (WHERE error_occurred = true) as errors,
  
  -- Performance metrics
  AVG(total_time_ms) as avg_total_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_time_ms) as median_total_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_time_ms) as p95_total_time_ms,
  
  -- Cache metrics
  ROUND(
    (COUNT(*) FILTER (WHERE cache_hit = true))::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 2
  ) as cache_hit_rate_percent,
  
  AVG(cache_lookup_time_ms) FILTER (WHERE cache_lookup_time_ms IS NOT NULL) as avg_cache_time_ms,
  AVG(openai_time_ms) FILTER (WHERE openai_time_ms IS NOT NULL) as avg_openai_time_ms,
  
  -- Response metrics
  AVG(response_length) as avg_response_length,
  AVG(tokens_used) FILTER (WHERE tokens_used IS NOT NULL) as avg_tokens_used,
  
  -- Quality metrics
  AVG(user_satisfaction) FILTER (WHERE user_satisfaction IS NOT NULL) as avg_satisfaction,
  COUNT(*) FILTER (WHERE user_satisfaction IS NOT NULL) as satisfaction_responses,
  
  -- Query type distribution
  COUNT(*) FILTER (WHERE query_type = 'calculation') as calculation_queries,
  COUNT(*) FILTER (WHERE query_type = 'deadline') as deadline_queries,
  COUNT(*) FILTER (WHERE query_type = 'regulation') as regulation_queries,
  COUNT(*) FILTER (WHERE query_type = 'conceptual') as conceptual_queries,
  COUNT(*) FILTER (WHERE query_type = 'general') as general_queries
  
FROM ai_metrics 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- View para estatísticas de usuário
CREATE OR REPLACE VIEW ai_user_stats AS
SELECT 
  user_id,
  COUNT(*) as total_queries,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  COUNT(*) FILTER (WHERE error_occurred = true) as errors,
  
  AVG(total_time_ms) as avg_response_time_ms,
  AVG(user_satisfaction) FILTER (WHERE user_satisfaction IS NOT NULL) as avg_satisfaction,
  COUNT(*) FILTER (WHERE user_satisfaction IS NOT NULL) as satisfaction_responses,
  
  MIN(created_at) as first_query,
  MAX(created_at) as last_query,
  
  -- Query patterns
  MODE() WITHIN GROUP (ORDER BY query_type) as most_common_query_type,
  COUNT(DISTINCT session_id) as unique_sessions,
  
  -- Performance insights
  CASE 
    WHEN AVG(total_time_ms) < 3000 THEN 'fast'
    WHEN AVG(total_time_ms) < 8000 THEN 'medium'
    ELSE 'slow'
  END as performance_category
  
FROM ai_metrics 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

-- Função para registrar métrica
CREATE OR REPLACE FUNCTION log_ai_metric(
  p_user_id UUID,
  p_session_id TEXT,
  p_query_text TEXT,
  p_query_type TEXT DEFAULT 'general',
  p_total_time_ms INTEGER DEFAULT NULL,
  p_cache_hit BOOLEAN DEFAULT FALSE,
  p_cache_lookup_time_ms INTEGER DEFAULT NULL,
  p_openai_time_ms INTEGER DEFAULT NULL,
  p_streaming BOOLEAN DEFAULT FALSE,
  p_response_length INTEGER DEFAULT NULL,
  p_response_cached BOOLEAN DEFAULT FALSE,
  p_tokens_used INTEGER DEFAULT NULL,
  p_error_occurred BOOLEAN DEFAULT FALSE,
  p_error_type TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_retry_count INTEGER DEFAULT 0,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO ai_metrics (
    user_id, session_id, query_text, query_type,
    total_time_ms, cache_hit, cache_lookup_time_ms, openai_time_ms,
    streaming, response_length, response_cached, tokens_used,
    error_occurred, error_type, error_message, retry_count,
    user_agent, ip_address
  ) VALUES (
    p_user_id, p_session_id, p_query_text, p_query_type,
    p_total_time_ms, p_cache_hit, p_cache_lookup_time_ms, p_openai_time_ms,
    p_streaming, p_response_length, p_response_cached, p_tokens_used,
    p_error_occurred, p_error_type, p_error_message, p_retry_count,
    p_user_agent, p_ip_address
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar satisfação do usuário
CREATE OR REPLACE FUNCTION update_user_satisfaction(
  p_metric_id UUID,
  p_satisfaction INTEGER,
  p_feedback TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ai_metrics 
  SET 
    user_satisfaction = p_satisfaction,
    user_feedback = p_feedback
  WHERE id = p_metric_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas em tempo real
CREATE OR REPLACE FUNCTION get_realtime_ai_stats()
RETURNS TABLE (
  metric TEXT,
  value NUMERIC,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'total_queries_today'::TEXT,
    COUNT(*)::NUMERIC,
    'Total de consultas hoje'::TEXT
  FROM ai_metrics 
  WHERE created_at >= CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    'cache_hit_rate_today'::TEXT,
    ROUND(
      (COUNT(*) FILTER (WHERE cache_hit = true))::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 2
    ),
    'Taxa de acerto do cache hoje (%)'::TEXT
  FROM ai_metrics 
  WHERE created_at >= CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    'avg_response_time_today'::TEXT,
    ROUND(AVG(total_time_ms)::NUMERIC, 0),
    'Tempo médio de resposta hoje (ms)'::TEXT
  FROM ai_metrics 
  WHERE created_at >= CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    'error_rate_today'::TEXT,
    ROUND(
      (COUNT(*) FILTER (WHERE error_occurred = true))::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 2
    ),
    'Taxa de erro hoje (%)'::TEXT
  FROM ai_metrics 
  WHERE created_at >= CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    'avg_satisfaction_week'::TEXT,
    ROUND(AVG(user_satisfaction)::NUMERIC, 2),
    'Satisfação média da semana'::TEXT
  FROM ai_metrics 
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND user_satisfaction IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE ai_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só podem ver suas próprias métricas
CREATE POLICY "Users can view own metrics" ON ai_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: usuários só podem inserir suas próprias métricas
CREATE POLICY "Users can insert own metrics" ON ai_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: usuários só podem atualizar suas próprias métricas
CREATE POLICY "Users can update own metrics" ON ai_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE ai_metrics IS 'Métricas de performance e uso do sistema de IA';
COMMENT ON COLUMN ai_metrics.total_time_ms IS 'Tempo total de resposta em milissegundos';
COMMENT ON COLUMN ai_metrics.cache_hit IS 'Se a resposta foi encontrada no cache';
COMMENT ON COLUMN ai_metrics.user_satisfaction IS 'Avaliação do usuário de 1 a 5';
COMMENT ON COLUMN ai_metrics.query_type IS 'Tipo de consulta: calculation, deadline, regulation, etc.';

-- Trigger para limpeza automática de métricas antigas (manter apenas 90 dias)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_metrics WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Agendar limpeza diária (se pg_cron estiver disponível)
-- SELECT cron.schedule('cleanup-ai-metrics', '0 2 * * *', 'SELECT cleanup_old_metrics();');
