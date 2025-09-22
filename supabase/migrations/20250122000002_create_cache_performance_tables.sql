-- =====================================================
-- MIGRATION: Criar Tabelas de Cache e Performance
-- Data: 2025-01-22
-- Descrição: Sistema de cache inteligente e métricas de performance
-- =====================================================

-- 1. TABELA ANALYTICS_CACHE
-- Cache inteligente para dados agregados e cálculos pesados
CREATE TABLE IF NOT EXISTS analytics_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key text UNIQUE NOT NULL,
    cache_type text NOT NULL CHECK (cache_type IN ('metricas', 'compliance', 'insights', 'dados_estruturados', 'dashboard')),
    cache_data jsonb NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE,
    expires_at timestamp with time zone NOT NULL,
    hit_count integer NOT NULL DEFAULT 0,
    last_hit_at timestamp with time zone,
    data_size_bytes integer NOT NULL DEFAULT 0,
    compression_ratio numeric(5,4) DEFAULT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT analytics_cache_hit_count_positive CHECK (hit_count >= 0),
    CONSTRAINT analytics_cache_data_size_positive CHECK (data_size_bytes >= 0),
    CONSTRAINT analytics_cache_expires_future CHECK (expires_at > created_at)
);

-- Índices para analytics_cache
CREATE INDEX IF NOT EXISTS idx_analytics_cache_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_cache_type ON analytics_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_empresa_id ON analytics_cache(empresa_id) WHERE empresa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires_at ON analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_hit_count ON analytics_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_created_at ON analytics_cache(created_at DESC);

-- 2. TABELA AI_INSIGHTS_CACHE
-- Cache específico para insights de IA com hash de configuração
CREATE TABLE IF NOT EXISTS ai_insights_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    config_hash text NOT NULL,
    tipo_insight text NOT NULL CHECK (tipo_insight IN ('financeiro', 'compliance', 'operacional', 'estrategico', 'completo')),
    insights_data jsonb NOT NULL,
    configuracao_original jsonb NOT NULL,
    tokens_utilizados integer NOT NULL DEFAULT 0,
    tempo_geracao_ms integer NOT NULL DEFAULT 0,
    modelo_usado text NOT NULL DEFAULT 'gpt-4o',
    confianca_cache numeric(5,4) NOT NULL DEFAULT 1.0 CHECK (confianca_cache >= 0 AND confianca_cache <= 1),
    expires_at timestamp with time zone NOT NULL,
    hit_count integer NOT NULL DEFAULT 0,
    last_hit_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT ai_insights_cache_tokens_positive CHECK (tokens_utilizados >= 0),
    CONSTRAINT ai_insights_cache_tempo_positive CHECK (tempo_geracao_ms >= 0),
    CONSTRAINT ai_insights_cache_hit_count_positive CHECK (hit_count >= 0),
    
    -- Unique constraint para evitar duplicatas
    UNIQUE(empresa_id, config_hash, tipo_insight)
);

-- Índices para ai_insights_cache
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_empresa_id ON ai_insights_cache(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_config_hash ON ai_insights_cache(config_hash);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_tipo ON ai_insights_cache(tipo_insight);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires_at ON ai_insights_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_hit_count ON ai_insights_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_modelo ON ai_insights_cache(modelo_usado);

-- 3. TABELA PERFORMANCE_METRICS
-- Métricas de performance do sistema
CREATE TABLE IF NOT EXISTS performance_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type text NOT NULL CHECK (metric_type IN ('ocr', 'estruturacao', 'metricas', 'compliance', 'insights', 'cache', 'api')),
    operation_name text NOT NULL,
    empresa_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
    execution_time_ms integer NOT NULL,
    memory_usage_mb numeric(10,2),
    cpu_usage_percent numeric(5,2),
    tokens_used integer DEFAULT 0,
    data_processed_bytes integer DEFAULT 0,
    success boolean NOT NULL DEFAULT true,
    error_message text,
    metadata jsonb NOT NULL DEFAULT '{}',
    timestamp timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT performance_metrics_execution_time_positive CHECK (execution_time_ms >= 0),
    CONSTRAINT performance_metrics_memory_positive CHECK (memory_usage_mb IS NULL OR memory_usage_mb >= 0),
    CONSTRAINT performance_metrics_cpu_valid CHECK (cpu_usage_percent IS NULL OR (cpu_usage_percent >= 0 AND cpu_usage_percent <= 100)),
    CONSTRAINT performance_metrics_tokens_positive CHECK (tokens_used >= 0),
    CONSTRAINT performance_metrics_data_positive CHECK (data_processed_bytes >= 0)
);

-- Índices para performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_empresa_id ON performance_metrics(empresa_id) WHERE empresa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_success ON performance_metrics(success);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_execution_time ON performance_metrics(execution_time_ms DESC);

-- Particionamento por mês para performance_metrics (opcional, para grandes volumes)
-- CREATE TABLE performance_metrics_y2025m01 PARTITION OF performance_metrics
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- 4. TABELA CACHE_INVALIDATION_LOG
-- Log de invalidações de cache para auditoria
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key text NOT NULL,
    cache_type text NOT NULL,
    invalidation_reason text NOT NULL CHECK (invalidation_reason IN ('expired', 'manual', 'data_change', 'system_update', 'error')),
    empresa_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
    triggered_by text DEFAULT 'system',
    metadata jsonb NOT NULL DEFAULT '{}',
    timestamp timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para cache_invalidation_log
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_cache_key ON cache_invalidation_log(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_cache_type ON cache_invalidation_log(cache_type);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_reason ON cache_invalidation_log(invalidation_reason);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_timestamp ON cache_invalidation_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cache_invalidation_log_empresa_id ON cache_invalidation_log(empresa_id) WHERE empresa_id IS NOT NULL;

-- 5. FUNÇÕES DE CACHE

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Limpar analytics_cache expirado
    DELETE FROM analytics_cache WHERE expires_at <= now();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Limpar ai_insights_cache expirado
    DELETE FROM ai_insights_cache WHERE expires_at <= now();
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO cache_invalidation_log (cache_key, cache_type, invalidation_reason, metadata)
    VALUES ('bulk_cleanup', 'system', 'expired', jsonb_build_object('deleted_count', deleted_count));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para invalidar cache por empresa
CREATE OR REPLACE FUNCTION invalidate_empresa_cache(p_empresa_id uuid, p_reason text DEFAULT 'data_change')
RETURNS integer AS $$
DECLARE
    deleted_count integer := 0;
    cache_keys text[];
BEGIN
    -- Coletar chaves antes de deletar
    SELECT array_agg(cache_key) INTO cache_keys
    FROM analytics_cache 
    WHERE empresa_id = p_empresa_id;
    
    -- Deletar do analytics_cache
    DELETE FROM analytics_cache WHERE empresa_id = p_empresa_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Deletar do ai_insights_cache
    DELETE FROM ai_insights_cache WHERE empresa_id = p_empresa_id;
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    -- Log das invalidações
    IF array_length(cache_keys, 1) > 0 THEN
        INSERT INTO cache_invalidation_log (cache_key, cache_type, invalidation_reason, empresa_id, metadata)
        SELECT unnest(cache_keys), 'empresa_cache', p_reason, p_empresa_id, 
               jsonb_build_object('total_invalidated', deleted_count);
    END IF;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar hit count do cache
CREATE OR REPLACE FUNCTION update_cache_hit(p_cache_key text)
RETURNS void AS $$
BEGIN
    UPDATE analytics_cache 
    SET hit_count = hit_count + 1, 
        last_hit_at = now(),
        updated_at = now()
    WHERE cache_key = p_cache_key;
    
    UPDATE ai_insights_cache 
    SET hit_count = hit_count + 1, 
        last_hit_at = now(),
        updated_at = now()
    WHERE config_hash = p_cache_key;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGERS PARA INVALIDAÇÃO AUTOMÁTICA

-- Trigger para invalidar cache quando documentos são alterados
CREATE OR REPLACE FUNCTION trigger_invalidate_cache_on_document_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Invalidar cache da empresa quando documento é inserido/atualizado/deletado
    IF TG_OP = 'DELETE' THEN
        PERFORM invalidate_empresa_cache(OLD.empresa_id, 'document_change');
        RETURN OLD;
    ELSE
        PERFORM invalidate_empresa_cache(NEW.empresa_id, 'document_change');
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela documentos
DROP TRIGGER IF EXISTS trigger_documentos_cache_invalidation ON documentos;
CREATE TRIGGER trigger_documentos_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION trigger_invalidate_cache_on_document_change();

-- Trigger para invalidar cache quando dados estruturados são alterados
CREATE TRIGGER trigger_dados_estruturados_cache_invalidation
    AFTER INSERT OR UPDATE OR DELETE ON dados_estruturados
    FOR EACH ROW
    EXECUTE FUNCTION trigger_invalidate_cache_on_document_change();

-- 7. VIEWS PARA MONITORAMENTO

-- View para estatísticas de cache
CREATE OR REPLACE VIEW cache_statistics AS
SELECT 
    cache_type,
    COUNT(*) as total_entries,
    SUM(hit_count) as total_hits,
    AVG(hit_count) as avg_hits_per_entry,
    SUM(data_size_bytes) as total_size_bytes,
    AVG(data_size_bytes) as avg_size_bytes,
    COUNT(*) FILTER (WHERE expires_at > now()) as active_entries,
    COUNT(*) FILTER (WHERE expires_at <= now()) as expired_entries
FROM analytics_cache
GROUP BY cache_type;

-- View para performance por operação
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    metric_type,
    operation_name,
    COUNT(*) as total_operations,
    AVG(execution_time_ms) as avg_execution_time_ms,
    MIN(execution_time_ms) as min_execution_time_ms,
    MAX(execution_time_ms) as max_execution_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_execution_time_ms,
    COUNT(*) FILTER (WHERE success = true) as successful_operations,
    COUNT(*) FILTER (WHERE success = false) as failed_operations,
    (COUNT(*) FILTER (WHERE success = true)::float / COUNT(*) * 100) as success_rate_percent
FROM performance_metrics
WHERE timestamp >= now() - interval '24 hours'
GROUP BY metric_type, operation_name
ORDER BY avg_execution_time_ms DESC;

-- Comentários
COMMENT ON TABLE analytics_cache IS 'Cache inteligente para dados agregados com TTL e métricas de hit';
COMMENT ON TABLE ai_insights_cache IS 'Cache específico para insights de IA com hash de configuração';
COMMENT ON TABLE performance_metrics IS 'Métricas de performance de todas as operações do sistema';
COMMENT ON TABLE cache_invalidation_log IS 'Log de auditoria para invalidações de cache';

COMMENT ON FUNCTION clean_expired_cache() IS 'Remove entradas de cache expiradas e retorna quantidade removida';
COMMENT ON FUNCTION invalidate_empresa_cache(uuid, text) IS 'Invalida todo cache relacionado a uma empresa específica';
COMMENT ON FUNCTION update_cache_hit(text) IS 'Incrementa contador de hits para uma chave de cache';

-- Criar job para limpeza automática de cache (executar a cada hora)
SELECT cron.schedule('clean-expired-cache', '0 * * * *', 'SELECT clean_expired_cache();');
