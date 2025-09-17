-- =====================================================
-- ATIVAÇÃO DO SISTEMA DE ALERTAS FISCAIS AUTOMÁTICOS
-- ContabilidadePRO - Migration para ativar cron jobs
-- =====================================================

-- Verificar se pg_cron está disponível
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE EXCEPTION 'pg_cron extension is not available. Please install it first.';
    END IF;
END $$;

-- =====================================================
-- 1. CRON JOB - COMPLIANCE MONITOR (Diário às 09:00)
-- =====================================================

-- Remover job existente se houver
SELECT cron.unschedule('compliance-monitor-daily') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'compliance-monitor-daily'
);

-- Criar job de monitoramento de compliance
SELECT cron.schedule(
    'compliance-monitor-daily',
    '0 9 * * *', -- Todo dia às 09:00
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/compliance-monitor',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'mode', 'check_all',
            'days_ahead', 30,
            'send_alerts', true,
            'alert_channels', array['email', 'dashboard']
        )
    );
    $$
);

-- =====================================================
-- 2. CRON JOB - ALERTAS INTELIGENTES (A cada 4 horas)
-- =====================================================

-- Remover job existente se houver
SELECT cron.unschedule('intelligent-alerts-scheduler') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'intelligent-alerts-scheduler'
);

-- Criar job de alertas inteligentes
SELECT cron.schedule(
    'intelligent-alerts-scheduler',
    '0 */4 * * *', -- A cada 4 horas
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/notification-service',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'action', 'check_deadlines',
            'check_config', jsonb_build_object(
                'days_ahead', array[7, 3, 1],
                'send_notifications', true
            )
        )
    );
    $$
);

-- =====================================================
-- 3. CRON JOB - LIMPEZA DE DADOS (Semanal)
-- =====================================================

-- Remover job existente se houver
SELECT cron.unschedule('cleanup-expired-data') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-data'
);

-- Criar job de limpeza
SELECT cron.schedule(
    'cleanup-expired-data',
    '0 2 * * 0', -- Domingo às 02:00
    $$
    -- Limpar notificações antigas (mais de 90 dias)
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '90 days' 
    AND status = 'read';
    
    -- Limpar logs de execução antigos (mais de 30 dias)
    DELETE FROM automation_executions 
    WHERE started_at < NOW() - INTERVAL '30 days';
    
    -- Limpar alertas resolvidos antigos (mais de 60 dias)
    DELETE FROM system_alerts 
    WHERE created_at < NOW() - INTERVAL '60 days' 
    AND resolved = true;
    $$
);

-- =====================================================
-- 4. FUNÇÃO PARA VERIFICAR STATUS DOS CRON JOBS
-- =====================================================

CREATE OR REPLACE FUNCTION get_fiscal_alerts_status()
RETURNS TABLE(
    job_name TEXT,
    schedule TEXT,
    active BOOLEAN,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cj.jobname::TEXT as job_name,
        cj.schedule::TEXT as schedule,
        cj.active,
        cj.last_run_started_at as last_run,
        cj.next_run_at as next_run
    FROM cron.job cj
    WHERE cj.jobname IN (
        'compliance-monitor-daily',
        'intelligent-alerts-scheduler', 
        'cleanup-expired-data'
    )
    ORDER BY cj.jobname;
END;
$$;

-- =====================================================
-- 5. CONFIGURAÇÕES PADRÃO DE ALERTAS
-- =====================================================

-- Inserir configurações padrão de alertas para usuários existentes
INSERT INTO user_notification_preferences (
    user_id,
    fiscal_enabled,
    fiscal_channels,
    fiscal_urgent_only,
    compliance_enabled,
    compliance_channels,
    compliance_urgent_only,
    digest_enabled,
    digest_frequency,
    digest_time
)
SELECT 
    u.id,
    true, -- fiscal_enabled
    '["in_app", "email"]'::jsonb, -- fiscal_channels
    false, -- fiscal_urgent_only
    true, -- compliance_enabled
    '["in_app", "email"]'::jsonb, -- compliance_channels
    false, -- compliance_urgent_only
    true, -- digest_enabled
    'daily', -- digest_frequency
    '09:00:00'::time -- digest_time
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_notification_preferences unp 
    WHERE unp.user_id = u.id
);

-- =====================================================
-- 6. TRIGGER PARA ALERTAS AUTOMÁTICOS
-- =====================================================

-- Função para processar alertas quando obrigação é criada/atualizada
CREATE OR REPLACE FUNCTION process_fiscal_obligation_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    days_until_due INTEGER;
    alert_message TEXT;
    alert_severity TEXT;
BEGIN
    -- Calcular dias até vencimento
    days_until_due := (NEW.due_date - CURRENT_DATE);
    
    -- Determinar severidade e mensagem
    IF days_until_due <= 0 THEN
        alert_severity := 'critical';
        alert_message := format('VENCIDO: %s - %s venceu há %s dia(s)', 
            NEW.obligation_type, NEW.name, ABS(days_until_due));
    ELSIF days_until_due <= 3 THEN
        alert_severity := 'high';
        alert_message := format('URGENTE: %s - %s vence em %s dia(s)', 
            NEW.obligation_type, NEW.name, days_until_due);
    ELSIF days_until_due <= 7 THEN
        alert_severity := 'medium';
        alert_message := format('ATENÇÃO: %s - %s vence em %s dia(s)', 
            NEW.obligation_type, NEW.name, days_until_due);
    ELSE
        -- Não criar alerta para prazos distantes
        RETURN NEW;
    END IF;
    
    -- Criar alerta no sistema
    INSERT INTO system_alerts (
        user_id,
        type,
        severity,
        title,
        message,
        metadata,
        resolved,
        created_at
    ) VALUES (
        NEW.user_id,
        'fiscal_deadline',
        alert_severity,
        format('%s - %s', NEW.obligation_type, NEW.name),
        alert_message,
        jsonb_build_object(
            'obligation_id', NEW.id,
            'due_date', NEW.due_date,
            'days_until_due', days_until_due,
            'estimated_amount', NEW.estimated_amount
        ),
        false,
        NOW()
    );
    
    RETURN NEW;
END;
$$;

-- Criar trigger para alertas automáticos
DROP TRIGGER IF EXISTS fiscal_obligation_alerts_trigger ON fiscal_obligations;
CREATE TRIGGER fiscal_obligation_alerts_trigger
    AFTER INSERT OR UPDATE OF due_date, status
    ON fiscal_obligations
    FOR EACH ROW
    WHEN (NEW.status != 'completed')
    EXECUTE FUNCTION process_fiscal_obligation_alerts();

-- =====================================================
-- 7. LOG DA ATIVAÇÃO
-- =====================================================

-- Registrar ativação do sistema
INSERT INTO observability_logs (
    level,
    message,
    function_name,
    context,
    created_at
) VALUES (
    'info',
    'Sistema de alertas fiscais automáticos ativado com sucesso',
    'activate_fiscal_alerts_migration',
    jsonb_build_object(
        'cron_jobs_created', 3,
        'triggers_created', 1,
        'functions_created', 2,
        'migration_version', '20250116000001'
    ),
    NOW()
);

-- Comentário final
COMMENT ON FUNCTION get_fiscal_alerts_status() IS 
'Função para verificar o status dos cron jobs de alertas fiscais';

COMMENT ON FUNCTION process_fiscal_obligation_alerts() IS 
'Função trigger para processar alertas automáticos de obrigações fiscais';
