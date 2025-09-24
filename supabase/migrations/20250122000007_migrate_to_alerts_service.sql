-- =====================================================
-- MIGRAÇÃO PARA ALERTS-SERVICE UNIFICADO
-- Atualiza todos os cron jobs para usar a nova função unificada
-- Data: 2025-01-22
-- =====================================================

-- =====================================================
-- 1. REMOVER CRON JOBS ANTIGOS
-- =====================================================

-- Remover job de compliance monitor
SELECT cron.unschedule('compliance-monitor-daily') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'compliance-monitor-daily'
);

-- Remover job de alertas inteligentes
SELECT cron.unschedule('intelligent-alerts-scheduler') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'intelligent-alerts-scheduler'
);

-- Remover job de escalação de alertas
SELECT cron.unschedule('alert-escalation-monitor') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'alert-escalation-monitor'
);

-- Remover job de processamento de alertas vencidos
SELECT cron.unschedule('overdue-alerts-processor') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'overdue-alerts-processor'
);

-- =====================================================
-- 2. CRIAR NOVOS CRON JOBS UNIFICADOS
-- =====================================================

-- 2.1 COMPLIANCE MONITOR (Diário às 09:00)
-- Substitui: compliance-monitor-daily
SELECT cron.schedule(
    'alerts-service-compliance-daily',
    '0 9 * * *', -- Todo dia às 09:00
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alerts-service',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'operation', 'check_compliance',
            'compliance_config', jsonb_build_object(
                'mode', 'check_all',
                'days_ahead', 30,
                'send_alerts', true,
                'alert_channels', array['email', 'dashboard']
            )
        )
    );
    $$
);

-- 2.2 NOTIFICAÇÕES INTELIGENTES (A cada 4 horas)
-- Substitui: intelligent-alerts-scheduler
SELECT cron.schedule(
    'alerts-service-notifications-4h',
    '0 */4 * * *', -- A cada 4 horas
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alerts-service',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'operation', 'process_notifications',
            'notification_config', jsonb_build_object(
                'action', 'check_deadlines',
                'check_config', jsonb_build_object(
                    'days_ahead', array[7, 3, 1],
                    'send_notifications', true
                )
            )
        )
    );
    $$
);

-- 2.3 ESCALAÇÃO DE ALERTAS (A cada 2 horas)
-- Substitui: alert-escalation-monitor
SELECT cron.schedule(
    'alerts-service-escalation-2h',
    '0 */2 * * *', -- A cada 2 horas
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alerts-service',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'operation', 'escalate_alerts',
            'escalation_config', jsonb_build_object(
                'action', 'check_escalations'
            )
        )
    );
    $$
);

-- 2.4 PROCESSAMENTO DE ALERTAS VENCIDOS (Diário às 08:00)
-- Substitui: overdue-alerts-processor
SELECT cron.schedule(
    'alerts-service-overdue-daily',
    '0 8 * * *', -- Todo dia às 08:00
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alerts-service',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'operation', 'process_overdue'
        )
    );
    $$
);

-- =====================================================
-- 3. FUNÇÃO PARA MONITORAR CRON JOBS
-- =====================================================

-- Atualizar função de monitoramento para incluir novos jobs
CREATE OR REPLACE FUNCTION get_alerts_cron_status()
RETURNS TABLE (
    job_name text,
    schedule text,
    active boolean,
    last_run timestamptz,
    next_run timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cj.jobname::text,
        cj.schedule::text,
        cj.active,
        cj.last_run_started_at as last_run,
        cj.next_run_at as next_run
    FROM cron.job cj
    WHERE cj.jobname IN (
        'alerts-service-compliance-daily',
        'alerts-service-notifications-4h', 
        'alerts-service-escalation-2h',
        'alerts-service-overdue-daily'
    )
    ORDER BY cj.jobname;
END;
$$;

-- =====================================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION get_alerts_cron_status() IS 
'Função para monitorar o status dos cron jobs do alerts-service unificado.
Substitui os 4 jobs antigos por 4 jobs unificados que usam a mesma função.';

-- =====================================================
-- 5. VERIFICAÇÃO DE MIGRAÇÃO
-- =====================================================

-- Verificar se todos os jobs antigos foram removidos
DO $$
DECLARE
    old_jobs text[] := ARRAY[
        'compliance-monitor-daily',
        'intelligent-alerts-scheduler',
        'alert-escalation-monitor',
        'overdue-alerts-processor'
    ];
    job_name text;
    job_count int;
BEGIN
    FOREACH job_name IN ARRAY old_jobs
    LOOP
        SELECT COUNT(*) INTO job_count 
        FROM cron.job 
        WHERE jobname = job_name;
        
        IF job_count > 0 THEN
            RAISE WARNING 'Job antigo ainda existe: %', job_name;
        ELSE
            RAISE NOTICE 'Job antigo removido com sucesso: %', job_name;
        END IF;
    END LOOP;
END;
$$;

-- Verificar se todos os novos jobs foram criados
DO $$
DECLARE
    new_jobs text[] := ARRAY[
        'alerts-service-compliance-daily',
        'alerts-service-notifications-4h',
        'alerts-service-escalation-2h',
        'alerts-service-overdue-daily'
    ];
    job_name text;
    job_count int;
BEGIN
    FOREACH job_name IN ARRAY new_jobs
    LOOP
        SELECT COUNT(*) INTO job_count 
        FROM cron.job 
        WHERE jobname = job_name;
        
        IF job_count = 0 THEN
            RAISE WARNING 'Novo job não foi criado: %', job_name;
        ELSE
            RAISE NOTICE 'Novo job criado com sucesso: %', job_name;
        END IF;
    END LOOP;
END;
$$;

-- =====================================================
-- 6. LOGS DE MIGRAÇÃO
-- =====================================================

-- Registrar migração no log do sistema
INSERT INTO public.system_logs (
    level,
    message,
    category,
    metadata,
    created_at
) VALUES (
    'INFO',
    'Migração para alerts-service unificado concluída',
    'cron_migration',
    jsonb_build_object(
        'migration_file', '20250122000007_migrate_to_alerts_service.sql',
        'old_functions', array['alert-escalation-service', 'notification-service', 'compliance-monitor'],
        'new_function', 'alerts-service',
        'jobs_migrated', 4,
        'migration_date', now()
    ),
    now()
) ON CONFLICT DO NOTHING;

-- Exibir status final
SELECT 'MIGRAÇÃO CONCLUÍDA' as status, 
       'alerts-service unificado ativo' as message,
       now() as timestamp;
