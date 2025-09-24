-- =====================================================
-- MIGRAÇÃO MANUAL PARA ALERTS-SERVICE
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. REMOVER CRON JOBS ANTIGOS
SELECT cron.unschedule('compliance-monitor-daily') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'compliance-monitor-daily'
);

SELECT cron.unschedule('intelligent-alerts-scheduler') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'intelligent-alerts-scheduler'
);

SELECT cron.unschedule('alert-escalation-monitor') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'alert-escalation-monitor'
);

SELECT cron.unschedule('overdue-alerts-processor') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'overdue-alerts-processor'
);

-- 2. CRIAR NOVOS CRON JOBS UNIFICADOS

-- 2.1 COMPLIANCE MONITOR (Diário às 09:00)
SELECT cron.schedule(
    'alerts-service-compliance-daily',
    '0 9 * * *',
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
                'send_alerts', true
            )
        )
    );
    $$
);

-- 2.2 NOTIFICAÇÕES INTELIGENTES (A cada 4 horas)
SELECT cron.schedule(
    'alerts-service-notifications-4h',
    '0 */4 * * *',
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
SELECT cron.schedule(
    'alerts-service-escalation-2h',
    '0 */2 * * *',
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
SELECT cron.schedule(
    'alerts-service-overdue-daily',
    '0 8 * * *',
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

-- 3. VERIFICAR STATUS DOS CRON JOBS
SELECT 
    jobname,
    schedule,
    active,
    last_run_started_at,
    next_run_at
FROM cron.job 
WHERE jobname LIKE 'alerts-service-%'
ORDER BY jobname;
