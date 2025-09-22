-- 🚨 ALERT ESCALATION SYSTEM
-- Sistema de escalação automática para alertas não reconhecidos
-- Integração com o sistema de notificações em tempo real

-- =====================================================
-- 1. CONFIGURAÇÕES DE ESCALAÇÃO
-- =====================================================

-- Tabela para regras de escalação personalizadas
CREATE TABLE IF NOT EXISTS alert_escalation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Regra de escalação
  alert_type alert_type NOT NULL,
  priority alert_priority NOT NULL,
  hours_unacknowledged INTEGER DEFAULT 24,
  
  -- Ações de escalação
  escalation_actions TEXT[] DEFAULT ARRAY['increase_priority'],
  new_priority alert_priority,
  new_frequency notification_frequency,
  
  -- Canais de notificação para escalação
  escalation_channels TEXT[] DEFAULT ARRAY['dashboard', 'email'],
  
  -- Configurações
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, alert_type, priority)
);

-- Tabela de histórico de escalações
CREATE TABLE IF NOT EXISTS alert_escalation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES fiscal_alerts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Detalhes da escalação
  escalated_from alert_priority NOT NULL,
  escalated_to alert_priority NOT NULL,
  escalation_reason TEXT NOT NULL,
  escalation_actions TEXT[] NOT NULL,
  
  -- Timing
  escalated_at TIMESTAMPTZ DEFAULT NOW(),
  hours_unacknowledged INTEGER NOT NULL,
  
  -- Resultados
  notifications_sent INTEGER DEFAULT 0,
  channels_used TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Metadados
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 2. CRON JOB PARA ESCALAÇÃO AUTOMÁTICA
-- =====================================================

-- Job de escalação de alertas (a cada 2 horas)
SELECT cron.schedule(
    'alert-escalation-monitor',
    '0 */2 * * *', -- A cada 2 horas
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alert-escalation-service',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'action', 'check_escalations'
        )
    );
    $$
);

-- Job para processar alertas vencidos (diário às 08:00)
SELECT cron.schedule(
    'overdue-alerts-processor',
    '0 8 * * *', -- Todo dia às 08:00
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alert-escalation-service',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
            'action', 'process_overdue'
        )
    );
    $$
);

-- =====================================================
-- 3. FUNÇÕES DE APOIO
-- =====================================================

-- Função para criar regras padrão de escalação
CREATE OR REPLACE FUNCTION create_default_escalation_rules(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO alert_escalation_rules (
    user_id, 
    alert_type, 
    priority, 
    hours_unacknowledged, 
    escalation_actions, 
    new_priority,
    escalation_channels
  )
  VALUES 
    -- DAS crítico: escalar após 12h
    (p_user_id, 'DAS_VENCIMENTO', 'HIGH', 12, 
     ARRAY['increase_priority', 'send_email'], 'CRITICAL', 
     ARRAY['dashboard', 'email', 'push']),
    
    -- DEFIS crítico: escalar após 6h
    (p_user_id, 'DEFIS_PRAZO', 'CRITICAL', 6, 
     ARRAY['increase_frequency', 'send_email', 'send_sms'], NULL, 
     ARRAY['dashboard', 'email', 'sms']),
    
    -- Documentos: escalar após 48h
    (p_user_id, 'DOCUMENTO_VENCIDO', 'MEDIUM', 48, 
     ARRAY['increase_priority'], 'HIGH', 
     ARRAY['dashboard', 'email']),
    
    -- Certificado: escalar após 24h
    (p_user_id, 'CERTIFICADO_VENCIMENTO', 'HIGH', 24, 
     ARRAY['increase_priority', 'send_email'], 'CRITICAL', 
     ARRAY['dashboard', 'email'])
  ON CONFLICT (user_id, alert_type, priority) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Função para obter status de escalação
CREATE OR REPLACE FUNCTION get_escalation_status()
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
        -- Buscar última execução na tabela job_run_details se disponível
        COALESCE(
            (SELECT MAX(start_time) 
             FROM cron.job_run_details jrd 
             WHERE jrd.jobid = cj.jobid),
            cj.last_run_started_at
        ) as last_run,
        cj.next_run_at as next_run
    FROM cron.job cj
    WHERE cj.jobname IN (
        'alert-escalation-monitor',
        'overdue-alerts-processor'
    )
    ORDER BY cj.jobname;
END;
$$;

-- Função para estatísticas de escalação
CREATE OR REPLACE FUNCTION get_escalation_stats(p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_escalations', (
            SELECT COUNT(*) 
            FROM alert_escalation_history aeh
            WHERE (p_user_id IS NULL OR aeh.user_id = p_user_id)
        ),
        'escalations_today', (
            SELECT COUNT(*) 
            FROM alert_escalation_history aeh
            WHERE (p_user_id IS NULL OR aeh.user_id = p_user_id)
            AND aeh.escalated_at >= CURRENT_DATE
        ),
        'escalations_this_week', (
            SELECT COUNT(*) 
            FROM alert_escalation_history aeh
            WHERE (p_user_id IS NULL OR aeh.user_id = p_user_id)
            AND aeh.escalated_at >= DATE_TRUNC('week', CURRENT_DATE)
        ),
        'avg_hours_to_escalation', (
            SELECT ROUND(AVG(aeh.hours_unacknowledged), 1)
            FROM alert_escalation_history aeh
            WHERE (p_user_id IS NULL OR aeh.user_id = p_user_id)
            AND aeh.escalated_at >= CURRENT_DATE - INTERVAL '30 days'
        ),
        'most_escalated_type', (
            SELECT aeh.escalated_from
            FROM alert_escalation_history aeh
            WHERE (p_user_id IS NULL OR aeh.user_id = p_user_id)
            GROUP BY aeh.escalated_from
            ORDER BY COUNT(*) DESC
            LIMIT 1
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGERS PARA ESCALAÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para criar regras padrão quando usuário é criado
CREATE OR REPLACE FUNCTION create_user_escalation_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar regras padrão de escalação
    PERFORM create_default_escalation_rules(NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na criação de usuário
DROP TRIGGER IF EXISTS trigger_create_user_escalation_rules ON auth.users;
CREATE TRIGGER trigger_create_user_escalation_rules
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_escalation_rules();

-- =====================================================
-- 5. RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE alert_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_escalation_history ENABLE ROW LEVEL SECURITY;

-- Políticas para alert_escalation_rules
CREATE POLICY "Users can view own escalation rules" ON alert_escalation_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own escalation rules" ON alert_escalation_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own escalation rules" ON alert_escalation_rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own escalation rules" ON alert_escalation_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para alert_escalation_history
CREATE POLICY "Users can view own escalation history" ON alert_escalation_history
    FOR SELECT USING (auth.uid() = user_id);

-- Service role pode inserir histórico
CREATE POLICY "Service role can insert escalation history" ON alert_escalation_history
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 6. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_alert_escalation_rules_user_type 
ON alert_escalation_rules(user_id, alert_type);

CREATE INDEX IF NOT EXISTS idx_alert_escalation_history_user_date 
ON alert_escalation_history(user_id, escalated_at);

CREATE INDEX IF NOT EXISTS idx_alert_escalation_history_alert_id 
ON alert_escalation_history(alert_id);

-- =====================================================
-- 7. CONFIGURAÇÕES INICIAIS
-- =====================================================

-- Inserir configurações padrão para usuários existentes
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id FROM auth.users 
        WHERE id NOT IN (
            SELECT DISTINCT user_id 
            FROM alert_escalation_rules 
            WHERE user_id IS NOT NULL
        )
    LOOP
        PERFORM create_default_escalation_rules(user_record.id);
    END LOOP;
END $$;

-- =====================================================
-- 8. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se os cron jobs foram criados
DO $$
DECLARE
    job_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO job_count
    FROM cron.job 
    WHERE jobname IN ('alert-escalation-monitor', 'overdue-alerts-processor')
    AND active = true;
    
    IF job_count = 2 THEN
        RAISE NOTICE '✅ Sistema de Escalação de Alertas ativado com sucesso!';
        RAISE NOTICE '📊 Jobs ativos: alert-escalation-monitor (a cada 2h), overdue-alerts-processor (diário 8h)';
    ELSE
        RAISE WARNING '⚠️ Apenas % de 2 jobs de escalação foram criados', job_count;
    END IF;
END $$;
