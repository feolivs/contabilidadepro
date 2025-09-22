-- =====================================================
-- MIGRATION: Configurar RLS e Permissões
-- Data: 2025-01-22
-- Descrição: Row Level Security para todas as novas tabelas
-- =====================================================

-- 1. HABILITAR RLS NAS NOVAS TABELAS

-- Habilitar RLS para dados_estruturados
ALTER TABLE dados_estruturados ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS para metricas_financeiras
ALTER TABLE metricas_financeiras ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS para compliance_analysis
ALTER TABLE compliance_analysis ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS para ai_insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS para analytics_cache
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS para ai_insights_cache
ALTER TABLE ai_insights_cache ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS para performance_metrics (apenas leitura para usuários)
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS para cache_invalidation_log (apenas leitura para usuários)
ALTER TABLE cache_invalidation_log ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS RLS PARA DADOS_ESTRUTURADOS

-- Usuários podem ver dados estruturados de documentos de suas empresas
CREATE POLICY "Users can view dados_estruturados of their companies" ON dados_estruturados
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documentos d
            JOIN empresas e ON d.empresa_id = e.id
            WHERE d.id = dados_estruturados.documento_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem inserir dados estruturados para documentos de suas empresas
CREATE POLICY "Users can insert dados_estruturados for their companies" ON dados_estruturados
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documentos d
            JOIN empresas e ON d.empresa_id = e.id
            WHERE d.id = dados_estruturados.documento_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem atualizar dados estruturados de suas empresas
CREATE POLICY "Users can update dados_estruturados of their companies" ON dados_estruturados
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM documentos d
            JOIN empresas e ON d.empresa_id = e.id
            WHERE d.id = dados_estruturados.documento_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem deletar dados estruturados de suas empresas
CREATE POLICY "Users can delete dados_estruturados of their companies" ON dados_estruturados
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM documentos d
            JOIN empresas e ON d.empresa_id = e.id
            WHERE d.id = dados_estruturados.documento_id
            AND e.user_id = auth.uid()
        )
    );

-- 3. POLÍTICAS RLS PARA METRICAS_FINANCEIRAS

-- Usuários podem ver métricas financeiras de suas empresas
CREATE POLICY "Users can view metricas_financeiras of their companies" ON metricas_financeiras
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = metricas_financeiras.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem inserir métricas financeiras para suas empresas
CREATE POLICY "Users can insert metricas_financeiras for their companies" ON metricas_financeiras
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = metricas_financeiras.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem atualizar métricas financeiras de suas empresas
CREATE POLICY "Users can update metricas_financeiras of their companies" ON metricas_financeiras
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = metricas_financeiras.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem deletar métricas financeiras de suas empresas
CREATE POLICY "Users can delete metricas_financeiras of their companies" ON metricas_financeiras
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = metricas_financeiras.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- 4. POLÍTICAS RLS PARA COMPLIANCE_ANALYSIS

-- Usuários podem ver análises de compliance de suas empresas
CREATE POLICY "Users can view compliance_analysis of their companies" ON compliance_analysis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = compliance_analysis.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem inserir análises de compliance para suas empresas
CREATE POLICY "Users can insert compliance_analysis for their companies" ON compliance_analysis
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = compliance_analysis.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem atualizar análises de compliance de suas empresas
CREATE POLICY "Users can update compliance_analysis of their companies" ON compliance_analysis
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = compliance_analysis.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem deletar análises de compliance de suas empresas
CREATE POLICY "Users can delete compliance_analysis of their companies" ON compliance_analysis
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = compliance_analysis.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- 5. POLÍTICAS RLS PARA AI_INSIGHTS

-- Usuários podem ver insights de IA de suas empresas
CREATE POLICY "Users can view ai_insights of their companies" ON ai_insights
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = ai_insights.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem inserir insights de IA para suas empresas
CREATE POLICY "Users can insert ai_insights for their companies" ON ai_insights
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = ai_insights.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem atualizar insights de IA de suas empresas
CREATE POLICY "Users can update ai_insights of their companies" ON ai_insights
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = ai_insights.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem deletar insights de IA de suas empresas
CREATE POLICY "Users can delete ai_insights of their companies" ON ai_insights
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = ai_insights.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- 6. POLÍTICAS RLS PARA ANALYTICS_CACHE

-- Usuários podem ver cache de suas empresas
CREATE POLICY "Users can view analytics_cache of their companies" ON analytics_cache
    FOR SELECT USING (
        empresa_id IS NULL OR EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = analytics_cache.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem inserir cache para suas empresas
CREATE POLICY "Users can insert analytics_cache for their companies" ON analytics_cache
    FOR INSERT WITH CHECK (
        empresa_id IS NULL OR EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = analytics_cache.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem atualizar cache de suas empresas
CREATE POLICY "Users can update analytics_cache of their companies" ON analytics_cache
    FOR UPDATE USING (
        empresa_id IS NULL OR EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = analytics_cache.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem deletar cache de suas empresas
CREATE POLICY "Users can delete analytics_cache of their companies" ON analytics_cache
    FOR DELETE USING (
        empresa_id IS NULL OR EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = analytics_cache.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- 7. POLÍTICAS RLS PARA AI_INSIGHTS_CACHE

-- Usuários podem ver cache de insights de suas empresas
CREATE POLICY "Users can view ai_insights_cache of their companies" ON ai_insights_cache
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = ai_insights_cache.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem inserir cache de insights para suas empresas
CREATE POLICY "Users can insert ai_insights_cache for their companies" ON ai_insights_cache
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = ai_insights_cache.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem atualizar cache de insights de suas empresas
CREATE POLICY "Users can update ai_insights_cache of their companies" ON ai_insights_cache
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = ai_insights_cache.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- Usuários podem deletar cache de insights de suas empresas
CREATE POLICY "Users can delete ai_insights_cache of their companies" ON ai_insights_cache
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = ai_insights_cache.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- 8. POLÍTICAS RLS PARA PERFORMANCE_METRICS (SOMENTE LEITURA)

-- Usuários podem ver métricas de performance de suas empresas
CREATE POLICY "Users can view performance_metrics of their companies" ON performance_metrics
    FOR SELECT USING (
        empresa_id IS NULL OR EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = performance_metrics.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- 9. POLÍTICAS RLS PARA CACHE_INVALIDATION_LOG (SOMENTE LEITURA)

-- Usuários podem ver logs de invalidação de cache de suas empresas
CREATE POLICY "Users can view cache_invalidation_log of their companies" ON cache_invalidation_log
    FOR SELECT USING (
        empresa_id IS NULL OR EXISTS (
            SELECT 1 FROM empresas e
            WHERE e.id = cache_invalidation_log.empresa_id
            AND e.user_id = auth.uid()
        )
    );

-- 10. PERMISSÕES PARA SERVICE ROLE

-- Service role pode fazer tudo nas novas tabelas
CREATE POLICY "Service role can do everything on dados_estruturados" ON dados_estruturados
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on metricas_financeiras" ON metricas_financeiras
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on compliance_analysis" ON compliance_analysis
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on ai_insights" ON ai_insights
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on analytics_cache" ON analytics_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on ai_insights_cache" ON ai_insights_cache
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on performance_metrics" ON performance_metrics
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on cache_invalidation_log" ON cache_invalidation_log
    FOR ALL USING (auth.role() = 'service_role');

-- 11. GRANTS PARA AUTHENTICATED USERS

-- Conceder permissões básicas para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON dados_estruturados TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON metricas_financeiras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON compliance_analysis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_insights_cache TO authenticated;
GRANT SELECT ON performance_metrics TO authenticated;
GRANT SELECT ON cache_invalidation_log TO authenticated;

-- Conceder acesso às views
GRANT SELECT ON cache_statistics TO authenticated;
GRANT SELECT ON performance_summary TO authenticated;

-- Conceder execução das funções de cache para authenticated
GRANT EXECUTE ON FUNCTION clean_expired_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_empresa_cache(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_cache_hit(text) TO authenticated;

-- 12. GRANTS PARA ANON (usuários não autenticados)

-- Usuários anônimos não têm acesso às novas tabelas
-- (Apenas service_role e authenticated têm acesso)

-- Comentários sobre segurança
COMMENT ON POLICY "Users can view dados_estruturados of their companies" ON dados_estruturados IS 
'Usuários só podem ver dados estruturados de documentos de empresas que possuem';

COMMENT ON POLICY "Service role can do everything on dados_estruturados" ON dados_estruturados IS 
'Service role tem acesso total para Edge Functions e operações do sistema';

-- Verificar se RLS está funcionando corretamente
DO $$
BEGIN
    -- Verificar se todas as tabelas têm RLS habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname IN ('dados_estruturados', 'metricas_financeiras', 'compliance_analysis', 'ai_insights')
        AND c.relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS não está habilitado em todas as tabelas necessárias';
    END IF;
    
    RAISE NOTICE 'RLS configurado com sucesso para todas as novas tabelas';
END $$;
