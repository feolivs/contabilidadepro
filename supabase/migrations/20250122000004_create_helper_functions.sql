-- =====================================================
-- MIGRATION: Criar Funções Auxiliares e Stored Procedures
-- Data: 2025-01-22
-- Descrição: Funções para suporte às funcionalidades da Fase 3
-- =====================================================

-- 1. FUNÇÃO PARA BUSCAR DADOS ESTRUTURADOS POR EMPRESA

CREATE OR REPLACE FUNCTION get_dados_estruturados_empresa(
    p_empresa_id uuid,
    p_data_inicio date DEFAULT NULL,
    p_data_fim date DEFAULT NULL,
    p_tipos_documento text[] DEFAULT NULL,
    p_confianca_minima numeric DEFAULT 0.0
)
RETURNS TABLE (
    id uuid,
    documento_id uuid,
    tipo_documento text,
    dados_processados jsonb,
    confianca_extracao numeric,
    campos_extraidos text[],
    erros_validacao jsonb,
    data_processamento timestamp with time zone,
    arquivo_nome text,
    data_emissao date,
    valor_total numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        de.id,
        de.documento_id,
        de.tipo_documento,
        de.dados_processados,
        de.confianca_extracao,
        de.campos_extraidos,
        de.erros_validacao,
        de.data_processamento,
        d.arquivo_nome,
        d.data_emissao,
        d.valor_total
    FROM dados_estruturados de
    JOIN documentos d ON de.documento_id = d.id
    WHERE d.empresa_id = p_empresa_id
    AND (p_data_inicio IS NULL OR d.data_emissao >= p_data_inicio)
    AND (p_data_fim IS NULL OR d.data_emissao <= p_data_fim)
    AND (p_tipos_documento IS NULL OR de.tipo_documento = ANY(p_tipos_documento))
    AND de.confianca_extracao >= p_confianca_minima
    ORDER BY de.data_processamento DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNÇÃO PARA CALCULAR ESTATÍSTICAS DE DOCUMENTOS

CREATE OR REPLACE FUNCTION get_documentos_stats_empresa(
    p_empresa_id uuid,
    p_periodo_meses integer DEFAULT 6
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    data_inicio date;
BEGIN
    data_inicio := CURRENT_DATE - (p_periodo_meses || ' months')::interval;
    
    WITH stats AS (
        SELECT 
            COUNT(*) as total_documentos,
            COUNT(*) FILTER (WHERE de.id IS NOT NULL) as documentos_estruturados,
            COUNT(*) FILTER (WHERE d.status_processamento = 'concluido') as documentos_processados,
            COUNT(*) FILTER (WHERE d.status_processamento = 'erro') as documentos_com_erro,
            AVG(de.confianca_extracao) as confianca_media,
            COUNT(DISTINCT de.tipo_documento) as tipos_documento_unicos,
            SUM(d.valor_total) as valor_total_documentos,
            MIN(d.data_emissao) as data_mais_antiga,
            MAX(d.data_emissao) as data_mais_recente
        FROM documentos d
        LEFT JOIN dados_estruturados de ON d.id = de.documento_id
        WHERE d.empresa_id = p_empresa_id
        AND d.data_emissao >= data_inicio
    ),
    tipos_stats AS (
        SELECT jsonb_object_agg(
            de.tipo_documento,
            jsonb_build_object(
                'quantidade', COUNT(*),
                'confianca_media', AVG(de.confianca_extracao),
                'valor_total', SUM(d.valor_total)
            )
        ) as por_tipo
        FROM documentos d
        JOIN dados_estruturados de ON d.id = de.documento_id
        WHERE d.empresa_id = p_empresa_id
        AND d.data_emissao >= data_inicio
        GROUP BY de.tipo_documento
    ),
    mensal_stats AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'mes', TO_CHAR(d.data_emissao, 'YYYY-MM'),
                'quantidade', COUNT(*),
                'valor_total', SUM(d.valor_total),
                'confianca_media', AVG(de.confianca_extracao)
            ) ORDER BY TO_CHAR(d.data_emissao, 'YYYY-MM')
        ) as por_mes
        FROM documentos d
        LEFT JOIN dados_estruturados de ON d.id = de.documento_id
        WHERE d.empresa_id = p_empresa_id
        AND d.data_emissao >= data_inicio
        GROUP BY TO_CHAR(d.data_emissao, 'YYYY-MM')
    )
    SELECT jsonb_build_object(
        'resumo', jsonb_build_object(
            'total_documentos', s.total_documentos,
            'documentos_estruturados', s.documentos_estruturados,
            'documentos_processados', s.documentos_processados,
            'documentos_com_erro', s.documentos_com_erro,
            'taxa_sucesso', CASE WHEN s.total_documentos > 0 
                THEN ROUND((s.documentos_processados::numeric / s.total_documentos * 100), 2)
                ELSE 0 END,
            'confianca_media', ROUND(COALESCE(s.confianca_media, 0), 4),
            'tipos_documento_unicos', s.tipos_documento_unicos,
            'valor_total_documentos', COALESCE(s.valor_total_documentos, 0),
            'periodo_analise', jsonb_build_object(
                'inicio', data_inicio,
                'fim', CURRENT_DATE,
                'data_mais_antiga', s.data_mais_antiga,
                'data_mais_recente', s.data_mais_recente
            )
        ),
        'por_tipo', COALESCE(ts.por_tipo, '{}'::jsonb),
        'por_mes', COALESCE(ms.por_mes, '[]'::jsonb),
        'gerado_em', now()
    ) INTO result
    FROM stats s
    CROSS JOIN tipos_stats ts
    CROSS JOIN mensal_stats ms;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO PARA BUSCAR MÉTRICAS FINANCEIRAS MAIS RECENTES

CREATE OR REPLACE FUNCTION get_latest_metricas_financeiras(
    p_empresa_id uuid
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', mf.id,
        'empresa_id', mf.empresa_id,
        'periodo', jsonb_build_object(
            'inicio', mf.periodo_inicio,
            'fim', mf.periodo_fim
        ),
        'metricas_mensais', mf.metricas_mensais,
        'metricas_por_tipo', mf.metricas_por_tipo,
        'projecoes', mf.projecoes,
        'fluxo_caixa', mf.fluxo_caixa,
        'indicadores_performance', mf.indicadores_performance,
        'resumo_executivo', mf.resumo_executivo,
        'data_calculo', mf.data_calculo,
        'documentos_analisados', mf.documentos_analisados,
        'confianca_calculo', mf.confianca_calculo
    ) INTO result
    FROM metricas_financeiras mf
    WHERE mf.empresa_id = p_empresa_id
    ORDER BY mf.data_calculo DESC
    LIMIT 1;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÃO PARA BUSCAR ANÁLISE DE COMPLIANCE MAIS RECENTE

CREATE OR REPLACE FUNCTION get_latest_compliance_analysis(
    p_empresa_id uuid
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', ca.id,
        'empresa_id', ca.empresa_id,
        'score_geral', ca.score_geral,
        'nivel', ca.nivel,
        'consistencia_dados', ca.consistencia_dados,
        'prazos_fiscais', ca.prazos_fiscais,
        'obrigacoes_fiscais', ca.obrigacoes_fiscais,
        'qualidade_documentacao', ca.qualidade_documentacao,
        'riscos_identificados', ca.riscos_identificados,
        'alertas_urgentes', ca.alertas_urgentes,
        'historico_compliance', ca.historico_compliance,
        'data_analise', ca.data_analise,
        'documentos_analisados', ca.documentos_analisados,
        'periodo_analise', CASE 
            WHEN ca.periodo_analise_inicio IS NOT NULL AND ca.periodo_analise_fim IS NOT NULL
            THEN jsonb_build_object(
                'inicio', ca.periodo_analise_inicio,
                'fim', ca.periodo_analise_fim
            )
            ELSE NULL
        END
    ) INTO result
    FROM compliance_analysis ca
    WHERE ca.empresa_id = p_empresa_id
    ORDER BY ca.data_analise DESC
    LIMIT 1;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO PARA BUSCAR INSIGHTS DE IA MAIS RECENTES

CREATE OR REPLACE FUNCTION get_latest_ai_insights(
    p_empresa_id uuid,
    p_tipo_insight text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', ai.id,
        'empresa_id', ai.empresa_id,
        'tipo_insight', ai.tipo_insight,
        'nivel_detalhamento', ai.nivel_detalhamento,
        'resumo_executivo', ai.resumo_executivo,
        'analise_financeira', ai.analise_financeira,
        'analise_compliance', ai.analise_compliance,
        'insights_operacionais', ai.insights_operacionais,
        'projecoes_estrategicas', ai.projecoes_estrategicas,
        'alertas_prioritarios', ai.alertas_prioritarios,
        'benchmarking', ai.benchmarking,
        'confianca_analise', ai.confianca_analise,
        'modelo_usado', ai.modelo_usado,
        'data_geracao', ai.data_geracao,
        'valido_ate', ai.valido_ate,
        'limitacoes', ai.limitacoes,
        'proxima_revisao_sugerida', ai.proxima_revisao_sugerida
    ) INTO result
    FROM ai_insights ai
    WHERE ai.empresa_id = p_empresa_id
    AND (p_tipo_insight IS NULL OR ai.tipo_insight = p_tipo_insight)
    AND (ai.valido_ate IS NULL OR ai.valido_ate > now())
    ORDER BY ai.data_geracao DESC
    LIMIT 1;
    
    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNÇÃO PARA DASHBOARD COMPLETO DA EMPRESA

CREATE OR REPLACE FUNCTION get_empresa_dashboard_complete(
    p_empresa_id uuid,
    p_periodo_meses integer DEFAULT 6
)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
    empresa_info jsonb;
    documentos_stats jsonb;
    metricas_financeiras jsonb;
    compliance_analysis jsonb;
    ai_insights jsonb;
BEGIN
    -- Buscar informações da empresa
    SELECT jsonb_build_object(
        'id', e.id,
        'nome', e.nome,
        'nome_fantasia', e.nome_fantasia,
        'cnpj', e.cnpj,
        'regime_tributario', e.regime_tributario,
        'atividade_principal', e.atividade_principal,
        'status', e.status,
        'created_at', e.created_at
    ) INTO empresa_info
    FROM empresas e
    WHERE e.id = p_empresa_id;
    
    -- Se empresa não existe, retornar erro
    IF empresa_info IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Empresa não encontrada',
            'empresa_id', p_empresa_id
        );
    END IF;
    
    -- Buscar estatísticas de documentos
    SELECT get_documentos_stats_empresa(p_empresa_id, p_periodo_meses) INTO documentos_stats;
    
    -- Buscar métricas financeiras mais recentes
    SELECT get_latest_metricas_financeiras(p_empresa_id) INTO metricas_financeiras;
    
    -- Buscar análise de compliance mais recente
    SELECT get_latest_compliance_analysis(p_empresa_id) INTO compliance_analysis;
    
    -- Buscar insights de IA mais recentes
    SELECT get_latest_ai_insights(p_empresa_id, 'completo') INTO ai_insights;
    
    -- Montar resultado final
    SELECT jsonb_build_object(
        'success', true,
        'empresa', empresa_info,
        'documentos_stats', documentos_stats,
        'metricas_financeiras', metricas_financeiras,
        'compliance_analysis', compliance_analysis,
        'ai_insights', ai_insights,
        'cache_info', jsonb_build_object(
            'gerado_em', now(),
            'periodo_meses', p_periodo_meses,
            'ttl_sugerido', '1 hour'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNÇÃO PARA LIMPAR DADOS ANTIGOS

CREATE OR REPLACE FUNCTION cleanup_old_data(
    p_days_to_keep integer DEFAULT 365
)
RETURNS jsonb AS $$
DECLARE
    deleted_counts jsonb;
    cutoff_date timestamp with time zone;
BEGIN
    cutoff_date := now() - (p_days_to_keep || ' days')::interval;
    
    -- Limpar performance_metrics antigos
    WITH deleted_performance AS (
        DELETE FROM performance_metrics 
        WHERE timestamp < cutoff_date
        RETURNING 1
    ),
    -- Limpar cache_invalidation_log antigos
    deleted_cache_log AS (
        DELETE FROM cache_invalidation_log 
        WHERE timestamp < cutoff_date
        RETURNING 1
    ),
    -- Limpar ai_insights expirados
    deleted_insights AS (
        DELETE FROM ai_insights 
        WHERE valido_ate IS NOT NULL AND valido_ate < now()
        RETURNING 1
    )
    SELECT jsonb_build_object(
        'performance_metrics_deleted', (SELECT COUNT(*) FROM deleted_performance),
        'cache_log_deleted', (SELECT COUNT(*) FROM deleted_cache_log),
        'expired_insights_deleted', (SELECT COUNT(*) FROM deleted_insights),
        'cutoff_date', cutoff_date,
        'cleaned_at', now()
    ) INTO deleted_counts;
    
    RETURN deleted_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. GRANTS PARA AS NOVAS FUNÇÕES

-- Permitir que usuários autenticados executem as funções
GRANT EXECUTE ON FUNCTION get_dados_estruturados_empresa(uuid, date, date, text[], numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION get_documentos_stats_empresa(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_metricas_financeiras(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_compliance_analysis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_ai_insights(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_empresa_dashboard_complete(uuid, integer) TO authenticated;

-- Apenas service_role pode executar limpeza
GRANT EXECUTE ON FUNCTION cleanup_old_data(integer) TO service_role;

-- 9. COMENTÁRIOS NAS FUNÇÕES

COMMENT ON FUNCTION get_dados_estruturados_empresa(uuid, date, date, text[], numeric) IS 
'Busca dados estruturados de uma empresa com filtros opcionais de data, tipo e confiança';

COMMENT ON FUNCTION get_documentos_stats_empresa(uuid, integer) IS 
'Calcula estatísticas completas de documentos de uma empresa para um período';

COMMENT ON FUNCTION get_latest_metricas_financeiras(uuid) IS 
'Retorna as métricas financeiras mais recentes de uma empresa';

COMMENT ON FUNCTION get_latest_compliance_analysis(uuid) IS 
'Retorna a análise de compliance mais recente de uma empresa';

COMMENT ON FUNCTION get_latest_ai_insights(uuid, text) IS 
'Retorna os insights de IA mais recentes de uma empresa, opcionalmente filtrados por tipo';

COMMENT ON FUNCTION get_empresa_dashboard_complete(uuid, integer) IS 
'Retorna dados completos do dashboard de uma empresa incluindo todas as análises';

COMMENT ON FUNCTION cleanup_old_data(integer) IS 
'Remove dados antigos do sistema baseado no número de dias especificado';

-- Criar job para limpeza automática de dados antigos (executar semanalmente)
SELECT cron.schedule('cleanup-old-data', '0 2 * * 0', 'SELECT cleanup_old_data(365);');
