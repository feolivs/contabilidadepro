-- =====================================================
-- SCRIPT PARA ATIVAR SISTEMA DE ALERTAS FISCAIS
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Verificar se as configurações necessárias estão definidas
DO $$
BEGIN
    -- Verificar se as configurações do app estão definidas
    IF current_setting('app.supabase_url', true) IS NULL THEN
        RAISE NOTICE 'ATENÇÃO: Configure app.supabase_url nas configurações do projeto';
        RAISE NOTICE 'Execute: ALTER DATABASE postgres SET app.supabase_url = ''https://seu-projeto.supabase.co'';';
    END IF;
    
    IF current_setting('app.supabase_service_role_key', true) IS NULL THEN
        RAISE NOTICE 'ATENÇÃO: Configure app.supabase_service_role_key nas configurações do projeto';
        RAISE NOTICE 'Execute: ALTER DATABASE postgres SET app.supabase_service_role_key = ''sua-service-role-key'';';
    END IF;
END $$;

-- 2. Aplicar a migration principal
\i supabase/migrations/20250116000001_activate_fiscal_alerts.sql

-- 3. Verificar se os cron jobs foram criados
SELECT 
    jobname as "Job Name",
    schedule as "Schedule", 
    active as "Active",
    CASE 
        WHEN last_run_started_at IS NULL THEN 'Never'
        ELSE last_run_started_at::text
    END as "Last Run",
    CASE 
        WHEN next_run_at IS NULL THEN 'Not scheduled'
        ELSE next_run_at::text
    END as "Next Run"
FROM cron.job 
WHERE jobname IN (
    'compliance-monitor-daily',
    'intelligent-alerts-scheduler', 
    'cleanup-expired-data'
)
ORDER BY jobname;

-- 4. Testar função de status
SELECT * FROM get_fiscal_alerts_status();

-- 5. Criar algumas obrigações fiscais de teste (opcional)
INSERT INTO fiscal_obligations (
    user_id,
    empresa_id,
    obligation_type,
    category,
    name,
    description,
    due_date,
    frequency,
    status,
    priority,
    estimated_amount,
    alert_days_before,
    alert_sent,
    created_at,
    updated_at
) VALUES 
-- Prazo vencido (para testar alertas críticos)
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM empresas LIMIT 1),
    'DAS',
    'tax',
    'DAS - Dezembro 2024',
    'Documento de Arrecadação do Simples Nacional',
    CURRENT_DATE - INTERVAL '2 days',
    'monthly',
    'pending',
    'high',
    1250.80,
    7,
    false,
    NOW(),
    NOW()
),
-- Prazo próximo (para testar alertas de atenção)
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM empresas LIMIT 1),
    'GPS',
    'social_security',
    'GPS - Janeiro 2025',
    'Guia da Previdência Social',
    CURRENT_DATE + INTERVAL '3 days',
    'monthly',
    'pending',
    'medium',
    890.50,
    7,
    false,
    NOW(),
    NOW()
),
-- Prazo futuro (não deve gerar alerta)
(
    (SELECT id FROM auth.users LIMIT 1),
    (SELECT id FROM empresas LIMIT 1),
    'DCTF',
    'tax',
    'DCTF - 1º Trimestre 2025',
    'Declaração de Débitos e Créditos Tributários Federais',
    CURRENT_DATE + INTERVAL '15 days',
    'quarterly',
    'pending',
    'medium',
    2500.00,
    7,
    false,
    NOW(),
    NOW()
);

-- 6. Verificar se os alertas foram criados automaticamente
SELECT 
    sa.type,
    sa.severity,
    sa.title,
    sa.message,
    sa.created_at,
    sa.resolved
FROM system_alerts sa
WHERE sa.type = 'fiscal_deadline'
AND sa.created_at >= CURRENT_DATE
ORDER BY sa.created_at DESC;

-- 7. Verificar configurações de notificação dos usuários
SELECT 
    u.email,
    unp.fiscal_enabled,
    unp.fiscal_channels,
    unp.compliance_enabled,
    unp.compliance_channels,
    unp.digest_enabled,
    unp.digest_frequency
FROM auth.users u
LEFT JOIN user_notification_preferences unp ON u.id = unp.user_id
LIMIT 5;

-- 8. Status final do sistema
SELECT 
    'Sistema de Alertas Fiscais' as component,
    CASE 
        WHEN COUNT(*) = 3 THEN 'ATIVO ✅'
        ELSE 'ERRO ❌ - ' || COUNT(*) || ' de 3 jobs ativos'
    END as status
FROM cron.job 
WHERE jobname IN (
    'compliance-monitor-daily',
    'intelligent-alerts-scheduler', 
    'cleanup-expired-data'
) AND active = true;

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'SISTEMA DE ALERTAS FISCAIS ATIVADO COM SUCESSO!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Verifique o status dos cron jobs acima';
    RAISE NOTICE '2. Acesse a página de Prazos Fiscais no frontend';
    RAISE NOTICE '3. Verifique o componente "Sistema de Alertas"';
    RAISE NOTICE '4. Monitore os logs de execução';
    RAISE NOTICE '';
    RAISE NOTICE 'Cron Jobs configurados:';
    RAISE NOTICE '- Compliance Monitor: Diário às 09:00';
    RAISE NOTICE '- Alertas Inteligentes: A cada 4 horas';
    RAISE NOTICE '- Limpeza de Dados: Domingo às 02:00';
    RAISE NOTICE '';
    RAISE NOTICE 'Para desativar: SELECT cron.unschedule(''job-name'');';
    RAISE NOTICE '=================================================';
END $$;
