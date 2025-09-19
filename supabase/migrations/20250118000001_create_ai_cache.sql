-- 🧠 INTELLIGENT CACHE TABLE
-- Tabela para cache inteligente das respostas de IA

-- Criar tabela de cache
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  query_type TEXT DEFAULT 'general',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Índices para performance
  CONSTRAINT ai_cache_key_unique UNIQUE (key)
);

-- Índices otimizados
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache(key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at ON ai_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_user_id ON ai_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_cache_query_type ON ai_cache(query_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_hit_count ON ai_cache(hit_count DESC);

-- Função para incrementar hit count
CREATE OR REPLACE FUNCTION increment_cache_hits(cache_key TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_cache 
  SET hit_count = hit_count + 1,
      expires_at = CASE 
        -- Estender TTL para entradas populares
        WHEN hit_count > 5 THEN expires_at + INTERVAL '30 minutes'
        WHEN hit_count > 10 THEN expires_at + INTERVAL '1 hour'
        ELSE expires_at
      END
  WHERE key = cache_key;
END;
$$ LANGUAGE plpgsql;

-- Função para limpeza automática de cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger para limpeza automática (executa a cada inserção)
CREATE OR REPLACE FUNCTION trigger_cache_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Limpar cache expirado ocasionalmente (1 em 100 inserções)
  IF random() < 0.01 THEN
    PERFORM cleanup_expired_cache();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cache_cleanup_trigger
  AFTER INSERT ON ai_cache
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cache_cleanup();

-- View para estatísticas de cache
CREATE OR REPLACE VIEW ai_cache_stats AS
SELECT 
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry,
  query_type,
  COUNT(*) as entries_by_type,
  AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_ttl_seconds
FROM ai_cache 
GROUP BY query_type
UNION ALL
SELECT 
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
  SUM(hit_count) as total_hits,
  AVG(hit_count) as avg_hits_per_entry,
  'TOTAL' as query_type,
  COUNT(*) as entries_by_type,
  AVG(EXTRACT(EPOCH FROM (expires_at - created_at))) as avg_ttl_seconds
FROM ai_cache;

-- RLS (Row Level Security)
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só podem ver seu próprio cache
CREATE POLICY "Users can view own cache" ON ai_cache
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: usuários só podem inserir em seu próprio cache
CREATE POLICY "Users can insert own cache" ON ai_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: usuários só podem atualizar seu próprio cache
CREATE POLICY "Users can update own cache" ON ai_cache
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: usuários só podem deletar seu próprio cache
CREATE POLICY "Users can delete own cache" ON ai_cache
  FOR DELETE USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE ai_cache IS 'Cache inteligente para respostas de IA com TTL dinâmico';
COMMENT ON COLUMN ai_cache.key IS 'Chave única gerada a partir da pergunta + contexto';
COMMENT ON COLUMN ai_cache.value IS 'Resposta da IA em formato JSON';
COMMENT ON COLUMN ai_cache.expires_at IS 'Data/hora de expiração do cache';
COMMENT ON COLUMN ai_cache.hit_count IS 'Número de vezes que esta entrada foi acessada';
COMMENT ON COLUMN ai_cache.query_type IS 'Tipo de consulta: calculation, deadline, regulation, etc.';

-- Função para obter estatísticas detalhadas
CREATE OR REPLACE FUNCTION get_cache_performance_stats()
RETURNS TABLE (
  metric TEXT,
  value NUMERIC,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'cache_hit_rate'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE hit_count > 0))::NUMERIC / COUNT(*)::NUMERIC * 100
      ELSE 0
    END,
    'Percentage of cache entries that have been accessed'::TEXT
  FROM ai_cache WHERE expires_at > NOW()
  
  UNION ALL
  
  SELECT 
    'avg_response_reuse'::TEXT,
    AVG(hit_count),
    'Average number of times each cached response is reused'::TEXT
  FROM ai_cache WHERE expires_at > NOW()
  
  UNION ALL
  
  SELECT 
    'cache_efficiency'::TEXT,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        SUM(hit_count)::NUMERIC / COUNT(*)::NUMERIC
      ELSE 0
    END,
    'Total cache hits divided by total cache entries'::TEXT
  FROM ai_cache WHERE expires_at > NOW();
END;
$$ LANGUAGE plpgsql;
