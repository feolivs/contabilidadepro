-- =====================================================
-- 📊 MIGRATION: CREATE DATA EXPORT TABLES
-- Criação de tabelas para sistema de exportação de dados
-- Data: 2025-01-22
-- =====================================================

-- Tabela para histórico de exportações
CREATE TABLE IF NOT EXISTS data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    formato TEXT NOT NULL CHECK (formato IN ('excel', 'csv', 'json')),
    tipo_dados TEXT NOT NULL CHECK (tipo_dados IN ('empresas', 'documentos', 'metricas', 'compliance', 'comparativo', 'personalizado')),
    config JSONB NOT NULL DEFAULT '{}',
    arquivo_url TEXT,
    tamanho_arquivo INTEGER DEFAULT 0,
    total_registros INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
    erro_detalhes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_data_exports_user_id ON data_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);
CREATE INDEX IF NOT EXISTS idx_data_exports_created_at ON data_exports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_exports_tipo_dados ON data_exports(tipo_dados);
CREATE INDEX IF NOT EXISTS idx_data_exports_formato ON data_exports(formato);

-- Tabela para templates de exportação
CREATE TABLE IF NOT EXISTS export_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    publico BOOLEAN DEFAULT FALSE,
    uso_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para templates
CREATE INDEX IF NOT EXISTS idx_export_templates_user_id ON export_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_export_templates_publico ON export_templates(publico);
CREATE INDEX IF NOT EXISTS idx_export_templates_uso_count ON export_templates(uso_count DESC);

-- Tabela para estatísticas de exportação
CREATE TABLE IF NOT EXISTS export_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    data_referencia DATE NOT NULL DEFAULT CURRENT_DATE,
    total_exportacoes INTEGER DEFAULT 0,
    total_registros_exportados INTEGER DEFAULT 0,
    total_tamanho_arquivos BIGINT DEFAULT 0,
    formatos_utilizados JSONB DEFAULT '{}',
    tipos_dados_exportados JSONB DEFAULT '{}',
    tempo_medio_processamento DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, data_referencia)
);

-- Índices para estatísticas
CREATE INDEX IF NOT EXISTS idx_export_statistics_user_id ON export_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_export_statistics_data_referencia ON export_statistics(data_referencia DESC);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_data_exports_updated_at 
    BEFORE UPDATE ON data_exports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_templates_updated_at 
    BEFORE UPDATE ON export_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_statistics_updated_at 
    BEFORE UPDATE ON export_statistics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar estatísticas de exportação
CREATE OR REPLACE FUNCTION update_export_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar estatísticas quando uma exportação é concluída
    IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
        INSERT INTO export_statistics (
            user_id,
            data_referencia,
            total_exportacoes,
            total_registros_exportados,
            total_tamanho_arquivos,
            formatos_utilizados,
            tipos_dados_exportados
        )
        VALUES (
            NEW.user_id,
            CURRENT_DATE,
            1,
            COALESCE(NEW.total_registros, 0),
            COALESCE(NEW.tamanho_arquivo, 0),
            jsonb_build_object(NEW.formato, 1),
            jsonb_build_object(NEW.tipo_dados, 1)
        )
        ON CONFLICT (user_id, data_referencia)
        DO UPDATE SET
            total_exportacoes = export_statistics.total_exportacoes + 1,
            total_registros_exportados = export_statistics.total_registros_exportados + COALESCE(NEW.total_registros, 0),
            total_tamanho_arquivos = export_statistics.total_tamanho_arquivos + COALESCE(NEW.tamanho_arquivo, 0),
            formatos_utilizados = export_statistics.formatos_utilizados || 
                jsonb_build_object(
                    NEW.formato, 
                    COALESCE((export_statistics.formatos_utilizados->>NEW.formato)::INTEGER, 0) + 1
                ),
            tipos_dados_exportados = export_statistics.tipos_dados_exportados || 
                jsonb_build_object(
                    NEW.tipo_dados, 
                    COALESCE((export_statistics.tipos_dados_exportados->>NEW.tipo_dados)::INTEGER, 0) + 1
                ),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar estatísticas
CREATE TRIGGER update_export_statistics_trigger
    AFTER UPDATE ON data_exports
    FOR EACH ROW EXECUTE FUNCTION update_export_statistics();

-- Função para limpeza automática de arquivos antigos
CREATE OR REPLACE FUNCTION cleanup_old_exports()
RETURNS void AS $$
BEGIN
    -- Marcar exportações antigas para limpeza (mais de 30 dias)
    UPDATE data_exports 
    SET status = 'expirado'
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND status = 'concluido';
    
    -- Log da limpeza
    INSERT INTO system_logs (level, message, metadata)
    VALUES (
        'INFO',
        'Limpeza automática de exportações executada',
        jsonb_build_object(
            'exportacoes_expiradas', (
                SELECT COUNT(*) 
                FROM data_exports 
                WHERE status = 'expirado' 
                AND updated_at >= NOW() - INTERVAL '1 minute'
            )
        )
    );
END;
$$ language 'plpgsql';

-- Função para obter estatísticas de exportação do usuário
CREATE OR REPLACE FUNCTION get_user_export_stats(p_user_id UUID)
RETURNS TABLE (
    total_exportacoes BIGINT,
    total_registros BIGINT,
    total_tamanho_mb DECIMAL,
    formato_mais_usado TEXT,
    tipo_dados_mais_usado TEXT,
    ultima_exportacao TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_exportacoes,
        COALESCE(SUM(de.total_registros), 0)::BIGINT as total_registros,
        ROUND(COALESCE(SUM(de.tamanho_arquivo), 0)::DECIMAL / 1024 / 1024, 2) as total_tamanho_mb,
        (
            SELECT formato 
            FROM data_exports 
            WHERE user_id = p_user_id AND status = 'concluido'
            GROUP BY formato 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as formato_mais_usado,
        (
            SELECT tipo_dados 
            FROM data_exports 
            WHERE user_id = p_user_id AND status = 'concluido'
            GROUP BY tipo_dados 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as tipo_dados_mais_usado,
        MAX(de.created_at) as ultima_exportacao
    FROM data_exports de
    WHERE de.user_id = p_user_id 
    AND de.status = 'concluido';
END;
$$ language 'plpgsql';

-- RLS Policies
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_statistics ENABLE ROW LEVEL SECURITY;

-- Políticas para data_exports
CREATE POLICY "Users can view their own exports" ON data_exports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exports" ON data_exports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports" ON data_exports
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all exports" ON data_exports
    FOR ALL USING (auth.role() = 'service_role');

-- Políticas para export_templates
CREATE POLICY "Users can view their own templates and public ones" ON export_templates
    FOR SELECT USING (auth.uid() = user_id OR publico = true);

CREATE POLICY "Users can create their own templates" ON export_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON export_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON export_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para export_statistics
CREATE POLICY "Users can view their own statistics" ON export_statistics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all statistics" ON export_statistics
    FOR ALL USING (auth.role() = 'service_role');

-- Inserir templates padrão
INSERT INTO export_templates (id, user_id, nome, descricao, config, publico) VALUES
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000', -- Template público
    'Empresas - Dados Completos',
    'Exportação completa com todos os dados das empresas',
    '{
        "tipo_dados": "empresas",
        "campos": {
            "dados_empresa": true,
            "metricas_financeiras": true,
            "dados_documentos": true,
            "analise_compliance": true,
            "insights_ia": true,
            "dados_mensais": false,
            "comparativos": false
        },
        "agrupamento": {
            "por_empresa": true,
            "por_regime": false,
            "por_mes": false,
            "por_tipo_documento": false,
            "por_status": false
        },
        "opcoes": {
            "incluir_cabecalhos": true,
            "incluir_totalizadores": true,
            "incluir_graficos": false,
            "incluir_metadados": true,
            "compactar_arquivo": false
        }
    }',
    true
),
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000', -- Template público
    'Relatório de Compliance',
    'Foco em análise de conformidade e riscos',
    '{
        "tipo_dados": "compliance",
        "campos": {
            "dados_empresa": true,
            "metricas_financeiras": false,
            "dados_documentos": true,
            "analise_compliance": true,
            "insights_ia": true,
            "dados_mensais": false,
            "comparativos": false
        },
        "agrupamento": {
            "por_empresa": true,
            "por_regime": true,
            "por_mes": false,
            "por_tipo_documento": true,
            "por_status": true
        },
        "opcoes": {
            "incluir_cabecalhos": true,
            "incluir_totalizadores": true,
            "incluir_graficos": true,
            "incluir_metadados": true,
            "compactar_arquivo": false
        }
    }',
    true
);

-- Comentários nas tabelas
COMMENT ON TABLE data_exports IS 'Histórico de exportações de dados realizadas pelos usuários';
COMMENT ON TABLE export_templates IS 'Templates de configuração para exportações rápidas';
COMMENT ON TABLE export_statistics IS 'Estatísticas agregadas de uso do sistema de exportação';

COMMENT ON COLUMN data_exports.config IS 'Configuração JSON da exportação (filtros, campos, opções)';
COMMENT ON COLUMN data_exports.arquivo_url IS 'URL do arquivo gerado no Supabase Storage';
COMMENT ON COLUMN data_exports.tamanho_arquivo IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN data_exports.total_registros IS 'Número total de registros exportados';

COMMENT ON COLUMN export_templates.config IS 'Configuração JSON do template (campos, filtros, agrupamentos)';
COMMENT ON COLUMN export_templates.publico IS 'Se o template está disponível para todos os usuários';
COMMENT ON COLUMN export_templates.uso_count IS 'Contador de quantas vezes o template foi usado';

COMMENT ON COLUMN export_statistics.formatos_utilizados IS 'JSON com contadores por formato (excel: 5, csv: 3, etc)';
COMMENT ON COLUMN export_statistics.tipos_dados_exportados IS 'JSON com contadores por tipo de dados';
COMMENT ON COLUMN export_statistics.tempo_medio_processamento IS 'Tempo médio de processamento em segundos';

-- Log da migração
INSERT INTO system_logs (level, message, metadata)
VALUES (
    'INFO',
    'Migration 20250122000006_create_data_export_tables executada com sucesso',
    jsonb_build_object(
        'tabelas_criadas', ARRAY['data_exports', 'export_templates', 'export_statistics'],
        'funcoes_criadas', ARRAY['update_export_statistics', 'cleanup_old_exports', 'get_user_export_stats'],
        'templates_inseridos', 2
    )
);
