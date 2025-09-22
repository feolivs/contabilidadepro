-- =====================================================
-- MIGRATION: Criar Tabelas para Dados Estruturados
-- Data: 2025-01-22
-- Descrição: Suporte para Fase 3 - Análise Financeira e Insights
-- =====================================================

-- 1. TABELA DADOS_ESTRUTURADOS
-- Armazena dados estruturados extraídos dos documentos por tipo
CREATE TABLE IF NOT EXISTS dados_estruturados (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id uuid REFERENCES documentos(id) ON DELETE CASCADE,
    tipo_documento text NOT NULL CHECK (tipo_documento IN ('NFE', 'NFSE', 'RECIBO', 'BOLETO', 'EXTRATO')),
    dados_processados jsonb NOT NULL DEFAULT '{}',
    confianca_extracao numeric(5,4) NOT NULL DEFAULT 0 CHECK (confianca_extracao >= 0 AND confianca_extracao <= 1),
    campos_extraidos text[] NOT NULL DEFAULT '{}',
    erros_validacao jsonb NOT NULL DEFAULT '[]',
    data_processamento timestamp with time zone NOT NULL DEFAULT now(),
    processado_por text NOT NULL DEFAULT 'system',
    versao_processador text NOT NULL DEFAULT '1.0',
    metadados_processamento jsonb NOT NULL DEFAULT '{}',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para dados_estruturados
CREATE INDEX IF NOT EXISTS idx_dados_estruturados_documento_id ON dados_estruturados(documento_id);
CREATE INDEX IF NOT EXISTS idx_dados_estruturados_tipo_documento ON dados_estruturados(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_dados_estruturados_data_processamento ON dados_estruturados(data_processamento DESC);
CREATE INDEX IF NOT EXISTS idx_dados_estruturados_confianca ON dados_estruturados(confianca_extracao DESC);
CREATE INDEX IF NOT EXISTS idx_dados_estruturados_dados_gin ON dados_estruturados USING gin(dados_processados);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_dados_estruturados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dados_estruturados_updated_at
    BEFORE UPDATE ON dados_estruturados
    FOR EACH ROW
    EXECUTE FUNCTION update_dados_estruturados_updated_at();

-- 2. TABELA METRICAS_FINANCEIRAS
-- Armazena métricas financeiras calculadas por empresa e período
CREATE TABLE IF NOT EXISTS metricas_financeiras (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    periodo_inicio date NOT NULL,
    periodo_fim date NOT NULL,
    metricas_mensais jsonb NOT NULL DEFAULT '[]',
    metricas_por_tipo jsonb NOT NULL DEFAULT '[]',
    projecoes jsonb NOT NULL DEFAULT '{}',
    fluxo_caixa jsonb NOT NULL DEFAULT '{}',
    indicadores_performance jsonb NOT NULL DEFAULT '{}',
    resumo_executivo jsonb NOT NULL DEFAULT '{}',
    data_calculo timestamp with time zone NOT NULL DEFAULT now(),
    versao_calculadora text NOT NULL DEFAULT '1.0',
    documentos_analisados integer NOT NULL DEFAULT 0,
    confianca_calculo numeric(5,4) NOT NULL DEFAULT 0 CHECK (confianca_calculo >= 0 AND confianca_calculo <= 1),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT metricas_financeiras_periodo_valido CHECK (periodo_fim >= periodo_inicio),
    CONSTRAINT metricas_financeiras_documentos_positivo CHECK (documentos_analisados >= 0)
);

-- Índices para metricas_financeiras
CREATE INDEX IF NOT EXISTS idx_metricas_financeiras_empresa_id ON metricas_financeiras(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metricas_financeiras_periodo ON metricas_financeiras(periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS idx_metricas_financeiras_data_calculo ON metricas_financeiras(data_calculo DESC);
CREATE INDEX IF NOT EXISTS idx_metricas_financeiras_confianca ON metricas_financeiras(confianca_calculo DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_metricas_financeiras_empresa_periodo ON metricas_financeiras(empresa_id, periodo_inicio, periodo_fim);

-- Trigger para updated_at
CREATE TRIGGER trigger_metricas_financeiras_updated_at
    BEFORE UPDATE ON metricas_financeiras
    FOR EACH ROW
    EXECUTE FUNCTION update_dados_estruturados_updated_at();

-- 3. TABELA COMPLIANCE_ANALYSIS
-- Armazena análises de compliance por empresa
CREATE TABLE IF NOT EXISTS compliance_analysis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    score_geral integer NOT NULL CHECK (score_geral >= 0 AND score_geral <= 100),
    nivel text NOT NULL CHECK (nivel IN ('critico', 'baixo', 'medio', 'alto', 'excelente')),
    consistencia_dados jsonb NOT NULL DEFAULT '{}',
    prazos_fiscais jsonb NOT NULL DEFAULT '{}',
    obrigacoes_fiscais jsonb NOT NULL DEFAULT '{}',
    qualidade_documentacao jsonb NOT NULL DEFAULT '{}',
    riscos_identificados jsonb NOT NULL DEFAULT '[]',
    alertas_urgentes jsonb NOT NULL DEFAULT '[]',
    historico_compliance jsonb NOT NULL DEFAULT '{}',
    configuracao_analise jsonb NOT NULL DEFAULT '{}',
    data_analise timestamp with time zone NOT NULL DEFAULT now(),
    versao_analyzer text NOT NULL DEFAULT '1.0',
    documentos_analisados integer NOT NULL DEFAULT 0,
    periodo_analise_inicio date,
    periodo_analise_fim date,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT compliance_analysis_documentos_positivo CHECK (documentos_analisados >= 0),
    CONSTRAINT compliance_analysis_periodo_valido CHECK (
        (periodo_analise_inicio IS NULL AND periodo_analise_fim IS NULL) OR
        (periodo_analise_inicio IS NOT NULL AND periodo_analise_fim IS NOT NULL AND periodo_analise_fim >= periodo_analise_inicio)
    )
);

-- Índices para compliance_analysis
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_empresa_id ON compliance_analysis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_score ON compliance_analysis(score_geral DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_nivel ON compliance_analysis(nivel);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_data ON compliance_analysis(data_analise DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_analysis_periodo ON compliance_analysis(periodo_analise_inicio, periodo_analise_fim);

-- Trigger para updated_at
CREATE TRIGGER trigger_compliance_analysis_updated_at
    BEFORE UPDATE ON compliance_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_dados_estruturados_updated_at();

-- 4. TABELA AI_INSIGHTS
-- Armazena insights gerados por IA
CREATE TABLE IF NOT EXISTS ai_insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_insight text NOT NULL CHECK (tipo_insight IN ('financeiro', 'compliance', 'operacional', 'estrategico', 'completo')),
    nivel_detalhamento text NOT NULL CHECK (nivel_detalhamento IN ('executivo', 'gerencial', 'operacional')),
    resumo_executivo jsonb NOT NULL DEFAULT '{}',
    analise_financeira jsonb NOT NULL DEFAULT '{}',
    analise_compliance jsonb NOT NULL DEFAULT '{}',
    insights_operacionais jsonb NOT NULL DEFAULT '{}',
    projecoes_estrategicas jsonb NOT NULL DEFAULT '{}',
    alertas_prioritarios jsonb NOT NULL DEFAULT '[]',
    benchmarking jsonb NOT NULL DEFAULT '{}',
    configuracao_geracao jsonb NOT NULL DEFAULT '{}',
    confianca_analise integer CHECK (confianca_analise >= 0 AND confianca_analise <= 100),
    modelo_usado text NOT NULL DEFAULT 'gpt-4o',
    tokens_utilizados integer NOT NULL DEFAULT 0,
    tempo_processamento_ms integer NOT NULL DEFAULT 0,
    data_geracao timestamp with time zone NOT NULL DEFAULT now(),
    valido_ate timestamp with time zone,
    limitacoes jsonb NOT NULL DEFAULT '[]',
    proxima_revisao_sugerida date,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT ai_insights_tokens_positivo CHECK (tokens_utilizados >= 0),
    CONSTRAINT ai_insights_tempo_positivo CHECK (tempo_processamento_ms >= 0),
    CONSTRAINT ai_insights_validade CHECK (valido_ate IS NULL OR valido_ate > data_geracao)
);

-- Índices para ai_insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_empresa_id ON ai_insights(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_tipo ON ai_insights(tipo_insight);
CREATE INDEX IF NOT EXISTS idx_ai_insights_data_geracao ON ai_insights(data_geracao DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_valido_ate ON ai_insights(valido_ate) WHERE valido_ate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_insights_confianca ON ai_insights(confianca_analise DESC) WHERE confianca_analise IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_insights_modelo ON ai_insights(modelo_usado);

-- Trigger para updated_at
CREATE TRIGGER trigger_ai_insights_updated_at
    BEFORE UPDATE ON ai_insights
    FOR EACH ROW
    EXECUTE FUNCTION update_dados_estruturados_updated_at();

-- 5. EXTENSÕES NA TABELA DOCUMENTOS
-- Adicionar campos necessários para dados estruturados
DO $$
BEGIN
    -- Adicionar campo dados_estruturados se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        AND column_name = 'dados_estruturados' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE documentos ADD COLUMN dados_estruturados jsonb DEFAULT NULL;
    END IF;
    
    -- Adicionar campo confianca_estruturacao se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        AND column_name = 'confianca_estruturacao' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE documentos ADD COLUMN confianca_estruturacao numeric(5,4) DEFAULT NULL 
        CHECK (confianca_estruturacao IS NULL OR (confianca_estruturacao >= 0 AND confianca_estruturacao <= 1));
    END IF;
    
    -- Adicionar campo data_estruturacao se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        AND column_name = 'data_estruturacao' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE documentos ADD COLUMN data_estruturacao timestamp with time zone DEFAULT NULL;
    END IF;
    
    -- Adicionar campo erros_estruturacao se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documentos' 
        AND column_name = 'erros_estruturacao' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE documentos ADD COLUMN erros_estruturacao jsonb DEFAULT '[]';
    END IF;
END $$;

-- Índices adicionais para documentos
CREATE INDEX IF NOT EXISTS idx_documentos_dados_estruturados_gin ON documentos USING gin(dados_estruturados) WHERE dados_estruturados IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documentos_confianca_estruturacao ON documentos(confianca_estruturacao DESC) WHERE confianca_estruturacao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documentos_data_estruturacao ON documentos(data_estruturacao DESC) WHERE data_estruturacao IS NOT NULL;

-- Comentários nas tabelas
COMMENT ON TABLE dados_estruturados IS 'Armazena dados estruturados extraídos dos documentos por tipo específico (NFe, NFSe, etc.)';
COMMENT ON TABLE metricas_financeiras IS 'Métricas financeiras calculadas por empresa e período para análise de performance';
COMMENT ON TABLE compliance_analysis IS 'Análises de compliance fiscal automáticas com score e recomendações';
COMMENT ON TABLE ai_insights IS 'Insights gerados por IA baseados em dados financeiros e de compliance';

-- Comentários em colunas importantes
COMMENT ON COLUMN dados_estruturados.confianca_extracao IS 'Score de confiança da extração (0.0 a 1.0)';
COMMENT ON COLUMN metricas_financeiras.confianca_calculo IS 'Confiança nos cálculos baseada na qualidade dos dados';
COMMENT ON COLUMN compliance_analysis.score_geral IS 'Score geral de compliance (0 a 100)';
COMMENT ON COLUMN ai_insights.confianca_analise IS 'Confiança da análise de IA (0 a 100)';
