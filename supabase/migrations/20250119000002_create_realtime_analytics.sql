-- 📊 REALTIME ANALYTICS - DASHBOARD CONTADORES
-- Migração para implementar analytics em tempo real
-- Data: 2025-01-19
-- Autor: ContabilidadePRO Analytics Enhancement

-- =====================================================
-- 1. TABELA DE EVENTOS DE ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'document_upload', 'document_processed', 'calculation_done', 
    'company_created', 'company_updated', 'payment_generated',
    'deadline_approaching', 'compliance_check', 'ai_query',
    'report_generated', 'user_login', 'system_alert'
  )),
  entity_type TEXT, -- 'empresa', 'documento', 'calculo', 'usuario'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  value_numeric DECIMAL(15,2), -- Para métricas numéricas
  processing_time_ms INTEGER, -- Tempo de processamento
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_events_entity ON analytics_events(entity_type, entity_id);

-- =====================================================
-- 2. SNAPSHOTS DE KPIs (para histórico)
-- =====================================================

CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  snapshot_hour INTEGER CHECK (snapshot_hour >= 0 AND snapshot_hour <= 23),
  
  -- KPIs Financeiros
  faturamento_total DECIMAL(15,2) DEFAULT 0,
  impostos_calculados DECIMAL(15,2) DEFAULT 0,
  impostos_pagos DECIMAL(15,2) DEFAULT 0,
  margem_lucro_media DECIMAL(5,2) DEFAULT 0,
  
  -- KPIs Operacionais
  total_empresas INTEGER DEFAULT 0,
  empresas_ativas INTEGER DEFAULT 0,
  documentos_processados INTEGER DEFAULT 0,
  calculos_realizados INTEGER DEFAULT 0,
  tempo_medio_processamento INTEGER DEFAULT 0, -- em ms
  
  -- KPIs de Compliance
  prazos_vencendo_7d INTEGER DEFAULT 0,
  prazos_vencendo_15d INTEGER DEFAULT 0,
  prazos_vencendo_30d INTEGER DEFAULT 0,
  obrigacoes_pendentes INTEGER DEFAULT 0,
  alertas_criticos INTEGER DEFAULT 0,
  
  -- KPIs de Produtividade
  consultas_ia INTEGER DEFAULT 0,
  relatorios_gerados INTEGER DEFAULT 0,
  tempo_medio_resposta_ia INTEGER DEFAULT 0, -- em ms
  taxa_sucesso_calculos DECIMAL(5,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, snapshot_date, snapshot_hour)
);

-- Índices
CREATE INDEX idx_kpi_snapshots_user_date ON kpi_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_kpi_snapshots_date ON kpi_snapshots(snapshot_date DESC);

-- =====================================================
-- 3. VIEW MATERIALIZADA - DASHBOARD METRICS REALTIME
-- =====================================================

CREATE MATERIALIZED VIEW dashboard_metrics_realtime AS
SELECT 
  user_id,
  
  -- Métricas do Dia Atual
  COUNT(*) FILTER (WHERE event_type = 'document_upload' AND timestamp >= CURRENT_DATE) as docs_hoje,
  COUNT(*) FILTER (WHERE event_type = 'calculation_done' AND timestamp >= CURRENT_DATE) as calculos_hoje,
  COUNT(*) FILTER (WHERE event_type = 'ai_query' AND timestamp >= CURRENT_DATE) as consultas_ia_hoje,
  COUNT(*) FILTER (WHERE event_type = 'report_generated' AND timestamp >= CURRENT_DATE) as relatorios_hoje,
  
  -- Métricas da Semana
  COUNT(*) FILTER (WHERE event_type = 'document_processed' AND timestamp >= CURRENT_DATE - INTERVAL '7 days') as docs_semana,
  COUNT(*) FILTER (WHERE event_type = 'calculation_done' AND timestamp >= CURRENT_DATE - INTERVAL '7 days') as calculos_semana,
  
  -- Métricas do Mês
  COUNT(*) FILTER (WHERE event_type = 'document_processed' AND timestamp >= CURRENT_DATE - INTERVAL '30 days') as docs_mes,
  COUNT(*) FILTER (WHERE event_type = 'calculation_done' AND timestamp >= CURRENT_DATE - INTERVAL '30 days') as calculos_mes,
  
  -- Performance Metrics
  AVG(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL AND timestamp >= CURRENT_DATE) as tempo_medio_processamento_hoje,
  AVG(processing_time_ms) FILTER (WHERE processing_time_ms IS NOT NULL AND timestamp >= CURRENT_DATE - INTERVAL '7 days') as tempo_medio_processamento_semana,
  
  -- Valores Financeiros
  SUM(value_numeric) FILTER (WHERE event_type = 'calculation_done' AND timestamp >= CURRENT_DATE) as valor_impostos_hoje,
  SUM(value_numeric) FILTER (WHERE event_type = 'calculation_done' AND timestamp >= CURRENT_DATE - INTERVAL '30 days') as valor_impostos_mes,
  
  -- Última atualização
  MAX(timestamp) as ultima_atualizacao
  
FROM analytics_events 
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id;

-- Índice único para a view materializada
CREATE UNIQUE INDEX idx_dashboard_metrics_realtime_user ON dashboard_metrics_realtime(user_id);

-- =====================================================
-- 4. VIEW MATERIALIZADA - EMPRESAS ANALYTICS
-- =====================================================

CREATE MATERIALIZED VIEW empresas_analytics AS
SELECT 
  e.user_id,
  e.regime_tributario,
  COUNT(*) as total_empresas,
  COUNT(*) FILTER (WHERE e.status = 'ativa') as empresas_ativas,
  COUNT(*) FILTER (WHERE e.created_at >= CURRENT_DATE - INTERVAL '30 days') as empresas_criadas_mes,
  
  -- Métricas por regime
  COUNT(*) FILTER (WHERE e.regime_tributario = 'MEI') as total_mei,
  COUNT(*) FILTER (WHERE e.regime_tributario = 'Simples Nacional') as total_simples,
  COUNT(*) FILTER (WHERE e.regime_tributario = 'Lucro Presumido') as total_presumido,
  COUNT(*) FILTER (WHERE e.regime_tributario = 'Lucro Real') as total_real,
  
  -- Cálculos por empresa
  COALESCE(AVG(calc_stats.total_calculos), 0) as media_calculos_por_empresa,
  COALESCE(SUM(calc_stats.valor_total), 0) as valor_total_impostos
  
FROM empresas e
LEFT JOIN (
  SELECT 
    empresa_id,
    COUNT(*) as total_calculos,
    SUM(valor_total) as valor_total
  FROM calculos_fiscais 
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY empresa_id
) calc_stats ON e.id = calc_stats.empresa_id
GROUP BY e.user_id, e.regime_tributario;

-- Índice para a view
CREATE INDEX idx_empresas_analytics_user ON empresas_analytics(user_id);

-- =====================================================
-- 5. FUNÇÃO PARA REGISTRAR EVENTOS DE ANALYTICS
-- =====================================================

CREATE OR REPLACE FUNCTION log_analytics_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_value_numeric DECIMAL DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    user_id, event_type, entity_type, entity_id, 
    metadata, value_numeric, processing_time_ms
  ) VALUES (
    p_user_id, p_event_type, p_entity_type, p_entity_id,
    p_metadata, p_value_numeric, p_processing_time_ms
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. FUNÇÃO PARA ATUALIZAR SNAPSHOTS DE KPI
-- =====================================================

CREATE OR REPLACE FUNCTION update_kpi_snapshot(p_user_id UUID) RETURNS VOID AS $$
DECLARE
  current_hour INTEGER := EXTRACT(HOUR FROM NOW());
  current_date DATE := CURRENT_DATE;
BEGIN
  -- Inserir ou atualizar snapshot da hora atual
  INSERT INTO kpi_snapshots (
    user_id, snapshot_date, snapshot_hour,
    faturamento_total, impostos_calculados, total_empresas, empresas_ativas,
    documentos_processados, calculos_realizados, consultas_ia, relatorios_gerados
  )
  SELECT 
    p_user_id,
    current_date,
    current_hour,
    COALESCE(SUM(cf.faturamento_bruto), 0),
    COALESCE(SUM(cf.valor_total), 0),
    COUNT(DISTINCT e.id),
    COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'ativa'),
    COUNT(DISTINCT d.id),
    COUNT(DISTINCT cf.id),
    COUNT(*) FILTER (WHERE ae.event_type = 'ai_query'),
    COUNT(*) FILTER (WHERE ae.event_type = 'report_generated')
  FROM empresas e
  LEFT JOIN calculos_fiscais cf ON e.id = cf.empresa_id AND cf.created_at >= current_date
  LEFT JOIN documentos d ON e.id = d.empresa_id AND d.created_at >= current_date
  LEFT JOIN analytics_events ae ON ae.user_id = p_user_id AND ae.timestamp >= current_date
  WHERE e.user_id = p_user_id
  
  ON CONFLICT (user_id, snapshot_date, snapshot_hour) 
  DO UPDATE SET
    faturamento_total = EXCLUDED.faturamento_total,
    impostos_calculados = EXCLUDED.impostos_calculados,
    total_empresas = EXCLUDED.total_empresas,
    empresas_ativas = EXCLUDED.empresas_ativas,
    documentos_processados = EXCLUDED.documentos_processados,
    calculos_realizados = EXCLUDED.calculos_realizados,
    consultas_ia = EXCLUDED.consultas_ia,
    relatorios_gerados = EXCLUDED.relatorios_gerados;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar métricas quando há novos cálculos
CREATE OR REPLACE FUNCTION trigger_update_analytics() RETURNS TRIGGER AS $$
BEGIN
  -- Registrar evento de analytics
  PERFORM log_analytics_event(
    NEW.user_id,
    'calculation_done',
    'calculo',
    NEW.id,
    jsonb_build_object('tipo_calculo', NEW.tipo_calculo, 'regime', NEW.regime_tributario),
    NEW.valor_total,
    NULL
  );
  
  -- Atualizar view materializada (async)
  PERFORM pg_notify('refresh_dashboard_metrics', NEW.user_id::text);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculos_fiscais_analytics
  AFTER INSERT ON calculos_fiscais
  FOR EACH ROW EXECUTE FUNCTION trigger_update_analytics();

-- Trigger para documentos
CREATE OR REPLACE FUNCTION trigger_document_analytics() RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_analytics_event(
    NEW.user_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'document_upload'
      WHEN NEW.status_processamento = 'processado' AND OLD.status_processamento != 'processado' THEN 'document_processed'
      ELSE 'document_updated'
    END,
    'documento',
    NEW.id,
    jsonb_build_object('tipo', NEW.tipo_documento, 'status', NEW.status_processamento),
    NULL,
    NULL
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documentos_analytics
  AFTER INSERT OR UPDATE ON documentos
  FOR EACH ROW EXECUTE FUNCTION trigger_document_analytics();

-- =====================================================
-- 8. FUNÇÃO PARA REFRESH DAS VIEWS MATERIALIZADAS
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_analytics_views() RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics_realtime;
  REFRESH MATERIALIZED VIEW CONCURRENTLY empresas_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own analytics events" ON analytics_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own KPI snapshots" ON kpi_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 10. CONFIGURAR REALTIME
-- =====================================================

-- Habilitar realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE analytics_events;
ALTER PUBLICATION supabase_realtime ADD TABLE kpi_snapshots;

-- =====================================================
-- 11. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE analytics_events IS 'Eventos de analytics para dashboard em tempo real';
COMMENT ON TABLE kpi_snapshots IS 'Snapshots históricos de KPIs por hora';
COMMENT ON MATERIALIZED VIEW dashboard_metrics_realtime IS 'Métricas agregadas para dashboard em tempo real';
COMMENT ON MATERIALIZED VIEW empresas_analytics IS 'Analytics agregados por empresa e regime tributário';

-- =====================================================
-- 12. DADOS INICIAIS E CONFIGURAÇÃO
-- =====================================================

-- Agendar refresh das views materializadas a cada 5 minutos
SELECT cron.schedule('refresh-analytics-views', '*/5 * * * *', 'SELECT refresh_analytics_views();');
