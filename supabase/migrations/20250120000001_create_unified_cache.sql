-- Migração para criar tabela de cache unificado
-- Data: 2025-01-20
-- Descrição: Consolida todos os sistemas de cache em uma tabela unificada

-- Criar tabela de cache unificado
CREATE TABLE IF NOT EXISTS unified_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  tags TEXT[] DEFAULT '{}',
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadados opcionais
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  compressed BOOLEAN DEFAULT FALSE,
  size_bytes INTEGER
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_unified_cache_key ON unified_cache(key);
CREATE INDEX IF NOT EXISTS idx_unified_cache_expires_at ON unified_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_unified_cache_tags ON unified_cache USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_unified_cache_user_id ON unified_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_cache_created_at ON unified_cache(created_at DESC);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_unified_cache_key_expires ON unified_cache(key, expires_at) 
  WHERE expires_at > NOW();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_unified_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Calcular tamanho em bytes se não fornecido
  IF NEW.size_bytes IS NULL THEN
    NEW.size_bytes = octet_length(NEW.value::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_unified_cache_updated_at
  BEFORE UPDATE ON unified_cache
  FOR EACH ROW EXECUTE FUNCTION update_unified_cache_updated_at();

-- Trigger para incrementar hit_count
CREATE OR REPLACE FUNCTION increment_cache_hit_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Incrementar hit_count quando há SELECT na chave
  UPDATE unified_cache 
  SET hit_count = hit_count + 1 
  WHERE key = NEW.key;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para limpeza automática de cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM unified_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza
  INSERT INTO system_logs (level, message, metadata)
  VALUES ('info', 'Cache cleanup completed', jsonb_build_object('deleted_count', deleted_count));
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para invalidar cache por tags
CREATE OR REPLACE FUNCTION invalidate_cache_by_tag(tag_name TEXT)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM unified_cache 
  WHERE tags @> ARRAY[tag_name];
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas do cache
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_entries', COUNT(*),
    'expired_entries', COUNT(*) FILTER (WHERE expires_at < NOW()),
    'active_entries', COUNT(*) FILTER (WHERE expires_at >= NOW()),
    'total_size_mb', ROUND(SUM(size_bytes)::NUMERIC / 1024 / 1024, 2),
    'avg_hit_count', ROUND(AVG(hit_count), 2),
    'top_tags', (
      SELECT jsonb_agg(tag_stats)
      FROM (
        SELECT jsonb_build_object('tag', tag, 'count', count) as tag_stats
        FROM (
          SELECT unnest(tags) as tag, COUNT(*) as count
          FROM unified_cache
          WHERE expires_at >= NOW()
          GROUP BY tag
          ORDER BY count DESC
          LIMIT 10
        ) t
      ) ts
    )
  ) INTO stats
  FROM unified_cache;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Função para migrar dados dos caches antigos
CREATE OR REPLACE FUNCTION migrate_legacy_caches()
RETURNS JSONB AS $$
DECLARE
  ai_migrated INTEGER := 0;
  ocr_migrated INTEGER := 0;
  cnpj_migrated INTEGER := 0;
  result JSONB;
BEGIN
  -- Migrar ai_cache
  INSERT INTO unified_cache (key, value, expires_at, tags, hit_count, user_id, created_at)
  SELECT 
    'ai:' || user_id || ':' || encode(digest(key, 'sha256'), 'hex'),
    value,
    expires_at,
    ARRAY['ai', 'legacy'],
    hit_count,
    user_id::UUID,
    created_at
  FROM ai_cache
  WHERE expires_at > NOW()
  ON CONFLICT (key) DO NOTHING;
  
  GET DIAGNOSTICS ai_migrated = ROW_COUNT;
  
  -- Migrar pdf_ocr_cache
  INSERT INTO unified_cache (key, value, expires_at, tags, created_at)
  SELECT 
    'ocr:' || file_path,
    result,
    expires_at,
    ARRAY['ocr', 'legacy'],
    created_at
  FROM pdf_ocr_cache
  WHERE expires_at > NOW()
  ON CONFLICT (key) DO NOTHING;
  
  GET DIAGNOSTICS ocr_migrated = ROW_COUNT;
  
  -- Migrar cnpj_cache (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cnpj_cache') THEN
    INSERT INTO unified_cache (key, value, expires_at, tags, created_at)
    SELECT 
      'cnpj:' || cnpj,
      dados_receita,
      COALESCE(expires_at, NOW() + INTERVAL '30 days'),
      ARRAY['cnpj', 'legacy'],
      created_at
    FROM cnpj_cache
    WHERE COALESCE(expires_at, NOW() + INTERVAL '1 day') > NOW()
    ON CONFLICT (key) DO NOTHING;
    
    GET DIAGNOSTICS cnpj_migrated = ROW_COUNT;
  END IF;
  
  result := jsonb_build_object(
    'ai_cache_migrated', ai_migrated,
    'ocr_cache_migrated', ocr_migrated,
    'cnpj_cache_migrated', cnpj_migrated,
    'total_migrated', ai_migrated + ocr_migrated + cnpj_migrated
  );
  
  -- Log da migração
  INSERT INTO system_logs (level, message, metadata)
  VALUES ('info', 'Legacy cache migration completed', result);
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Políticas RLS
ALTER TABLE unified_cache ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados (acesso aos próprios dados)
CREATE POLICY unified_cache_user_access ON unified_cache
  FOR ALL USING (
    user_id IS NULL OR user_id = auth.uid()
  );

-- Política para cache público (sem user_id)
CREATE POLICY unified_cache_public_access ON unified_cache
  FOR SELECT USING (user_id IS NULL);

-- Cron job para limpeza automática (executa a cada hora)
SELECT cron.schedule(
  'cleanup-unified-cache',
  '0 * * * *',
  'SELECT cleanup_expired_cache();'
);

-- Cron job para estatísticas diárias
SELECT cron.schedule(
  'cache-stats-daily',
  '0 6 * * *',
  $$
  INSERT INTO system_logs (level, message, metadata)
  VALUES ('info', 'Daily cache statistics', get_cache_stats());
  $$
);

-- Comentários para documentação
COMMENT ON TABLE unified_cache IS 'Cache unificado consolidando todos os sistemas de cache da aplicação';
COMMENT ON COLUMN unified_cache.key IS 'Chave única do cache com prefixo indicando o tipo (ai:, ocr:, das:, etc.)';
COMMENT ON COLUMN unified_cache.value IS 'Dados em formato JSONB para flexibilidade';
COMMENT ON COLUMN unified_cache.expires_at IS 'Data/hora de expiração do cache';
COMMENT ON COLUMN unified_cache.tags IS 'Tags para invalidação em lote';
COMMENT ON COLUMN unified_cache.hit_count IS 'Contador de acessos para métricas';
COMMENT ON COLUMN unified_cache.priority IS 'Prioridade do cache (low, normal, high)';
COMMENT ON COLUMN unified_cache.size_bytes IS 'Tamanho em bytes para monitoramento';

-- Inserir dados de exemplo para testes (opcional)
-- INSERT INTO unified_cache (key, value, expires_at, tags, priority)
-- VALUES 
--   ('test:example', '{"message": "Hello World"}', NOW() + INTERVAL '1 hour', ARRAY['test'], 'normal'),
--   ('ai:test:query', '{"response": "Test AI response"}', NOW() + INTERVAL '24 hours', ARRAY['ai', 'test'], 'high');

-- Executar migração dos caches legados (comentado para execução manual)
-- SELECT migrate_legacy_caches();
