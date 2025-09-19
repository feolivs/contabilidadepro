-- =====================================================
-- SETUP TABLES FOR N8N WORKFLOWS - CONTABILIDADEPRO
-- =====================================================

-- Tabela para logs de comunicação
CREATE TABLE IF NOT EXISTS communication_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES empresas(id),
    tipo VARCHAR(50) NOT NULL, -- 'relatorio_mensal', 'alerta_fiscal', 'lembrete'
    canal VARCHAR(20) NOT NULL, -- 'email', 'slack', 'whatsapp', 'sms'
    destinatario VARCHAR(255) NOT NULL,
    assunto TEXT,
    status VARCHAR(20) DEFAULT 'enviado', -- 'enviado', 'falhou', 'pendente'
    enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para métricas de saúde do sistema
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    overall_status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'unhealthy'
    
    -- Database metrics
    database_status VARCHAR(20) NOT NULL,
    database_response_time INTEGER DEFAULT 0,
    
    -- Edge Functions metrics
    edge_functions_status VARCHAR(20) NOT NULL,
    edge_functions_response_time INTEGER DEFAULT 0,
    
    -- Storage metrics
    storage_status VARCHAR(20) NOT NULL,
    storage_response_time INTEGER DEFAULT 0,
    
    -- Business metrics
    total_empresas INTEGER DEFAULT 0,
    prazos_pendentes INTEGER DEFAULT 0,
    alertas_abertos INTEGER DEFAULT 0,
    
    -- System metrics
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    alerts_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_communication_log_empresa_id ON communication_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_communication_log_tipo ON communication_log(tipo);
CREATE INDEX IF NOT EXISTS idx_communication_log_enviado_em ON communication_log(enviado_em);

CREATE INDEX IF NOT EXISTS idx_system_health_metrics_timestamp ON system_health_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_overall_status ON system_health_metrics(overall_status);

-- =====================================================
-- VIEWS PARA DASHBOARDS E RELATÓRIOS
-- =====================================================

-- View para estatísticas de comunicação
CREATE OR REPLACE VIEW v_communication_stats AS
SELECT 
    DATE_TRUNC('day', enviado_em) as data,
    tipo,
    canal,
    status,
    COUNT(*) as total,
    COUNT(DISTINCT empresa_id) as empresas_distintas
FROM communication_log 
WHERE enviado_em >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', enviado_em), tipo, canal, status
ORDER BY data DESC;

-- View para métricas de saúde (últimas 24h)
CREATE OR REPLACE VIEW v_system_health_24h AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hora,
    AVG(CASE WHEN overall_status = 'healthy' THEN 100 
             WHEN overall_status = 'degraded' THEN 75 
             ELSE 25 END) as health_score,
    AVG(database_response_time) as avg_db_response,
    AVG(edge_functions_response_time) as avg_functions_response,
    AVG(storage_response_time) as avg_storage_response,
    AVG(uptime_percentage) as avg_uptime
FROM system_health_metrics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hora DESC;

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para limpar logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Manter apenas 90 dias de logs de comunicação
    DELETE FROM communication_log 
    WHERE enviado_em < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Manter apenas 30 dias de métricas de saúde
    DELETE FROM system_health_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas rápidas
CREATE OR REPLACE FUNCTION get_workflow_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'alertas_hoje', (
            SELECT COUNT(*) FROM system_alerts 
            WHERE DATE(created_at) = CURRENT_DATE
        ),
        'relatorios_mes', (
            SELECT COUNT(*) FROM communication_log 
            WHERE tipo = 'relatorio_mensal' 
            AND DATE_TRUNC('month', enviado_em) = DATE_TRUNC('month', CURRENT_DATE)
        ),
        'uptime_24h', (
            SELECT ROUND(AVG(uptime_percentage), 2) 
            FROM system_health_metrics 
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
        ),
        'prazos_proximos', (
            SELECT COUNT(*) FROM fiscal_obligations 
            WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
            AND status = 'pending'
        ),
        'sistema_status', (
            SELECT overall_status FROM system_health_metrics 
            ORDER BY timestamp DESC LIMIT 1
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DADOS INICIAIS E CONFIGURAÇÕES
-- =====================================================

-- Inserir configurações padrão se não existirem
INSERT INTO user_notification_preferences (
    user_id,
    fiscal_enabled,
    fiscal_channels,
    sistema_enabled,
    sistema_channels
)
SELECT 
    u.id,
    true,
    '["email"]'::jsonb,
    true,
    '["email"]'::jsonb
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_notification_preferences unp 
    WHERE unp.user_id = u.id
);

-- =====================================================
-- TRIGGERS PARA AUDITORIA
-- =====================================================

-- Trigger para log automático de alertas enviados
CREATE OR REPLACE FUNCTION log_alert_sent()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.alert_sent = true AND (OLD.alert_sent IS NULL OR OLD.alert_sent = false) THEN
        INSERT INTO communication_log (
            empresa_id,
            tipo,
            canal,
            destinatario,
            assunto,
            status,
            metadata
        ) VALUES (
            NEW.empresa_id,
            'alerta_fiscal',
            'email',
            'contador@contabilidadepro.com', -- Será substituído pelo email real
            'Alerta: ' || NEW.name,
            'enviado',
            json_build_object(
                'obligation_id', NEW.id,
                'due_date', NEW.due_date,
                'priority', NEW.priority
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela fiscal_obligations
DROP TRIGGER IF EXISTS trigger_log_alert_sent ON fiscal_obligations;
CREATE TRIGGER trigger_log_alert_sent
    AFTER UPDATE ON fiscal_obligations
    FOR EACH ROW
    EXECUTE FUNCTION log_alert_sent();

-- =====================================================
-- PERMISSÕES RLS
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas para communication_log
CREATE POLICY "Users can view their own communication logs" ON communication_log
    FOR SELECT USING (
        empresa_id IN (
            SELECT id FROM empresas WHERE user_id = auth.uid()
        )
    );

-- Políticas para system_health_metrics (apenas admins)
CREATE POLICY "Admins can view system health metrics" ON system_health_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE communication_log IS 'Log de todas as comunicações enviadas pelos workflows n8n';
COMMENT ON TABLE system_health_metrics IS 'Métricas de saúde do sistema coletadas pelo workflow de monitoramento';

COMMENT ON FUNCTION cleanup_old_logs() IS 'Função para limpeza automática de logs antigos - executar via cron';
COMMENT ON FUNCTION get_workflow_stats() IS 'Função para obter estatísticas rápidas dos workflows';

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

-- Verificar se tudo foi criado corretamente
DO $$
BEGIN
    RAISE NOTICE 'Setup concluído com sucesso!';
    RAISE NOTICE 'Tabelas criadas: communication_log, system_health_metrics';
    RAISE NOTICE 'Views criadas: v_communication_stats, v_system_health_24h';
    RAISE NOTICE 'Funções criadas: cleanup_old_logs(), get_workflow_stats()';
    RAISE NOTICE 'Triggers criados: trigger_log_alert_sent';
    RAISE NOTICE 'RLS habilitado e políticas aplicadas';
END $$;
