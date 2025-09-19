-- 🚨 FISCAL ALERTS SYSTEM
-- Sistema de alertas inteligentes para prazos fiscais

-- Enum para tipos de alerta
CREATE TYPE alert_type AS ENUM (
  'DAS_VENCIMENTO',
  'IRPJ_VENCIMENTO', 
  'CSLL_VENCIMENTO',
  'DEFIS_PRAZO',
  'SPED_PRAZO',
  'DCTF_PRAZO',
  'GFIP_PRAZO',
  'RAIS_PRAZO',
  'DIRF_PRAZO',
  'DOCUMENTO_VENCIDO',
  'RECEITA_LIMITE',
  'REGIME_MUDANCA',
  'CERTIFICADO_VENCIMENTO',
  'CUSTOM'
);

-- Enum para prioridade do alerta
CREATE TYPE alert_priority AS ENUM (
  'LOW',
  'MEDIUM', 
  'HIGH',
  'CRITICAL'
);

-- Enum para status do alerta
CREATE TYPE alert_status AS ENUM (
  'ACTIVE',
  'ACKNOWLEDGED',
  'RESOLVED',
  'DISMISSED'
);

-- Enum para frequência de notificação
CREATE TYPE notification_frequency AS ENUM (
  'ONCE',
  'DAILY',
  'WEEKLY',
  'MONTHLY'
);

-- Tabela de configurações de alertas por usuário
CREATE TABLE IF NOT EXISTS alert_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Configuração do alerta
  alert_type alert_type NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  
  -- Timing
  days_before INTEGER DEFAULT 7, -- Quantos dias antes alertar
  notification_frequency notification_frequency DEFAULT 'ONCE',
  
  -- Configurações específicas por tipo
  configuration JSONB DEFAULT '{}',
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, alert_type)
);

-- Tabela de alertas ativos
CREATE TABLE IF NOT EXISTS fiscal_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Informações do alerta
  alert_type alert_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority alert_priority DEFAULT 'MEDIUM',
  status alert_status DEFAULT 'ACTIVE',
  
  -- Datas importantes
  due_date DATE NOT NULL,
  alert_date DATE NOT NULL, -- Quando o alerta deve ser mostrado
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Dados contextuais
  context_data JSONB DEFAULT '{}', -- Dados específicos do alerta
  
  -- Ações sugeridas
  suggested_actions TEXT[],
  
  -- Referências
  related_document_id UUID REFERENCES processed_documents(id),
  related_company_id UUID, -- Referência para empresa se houver
  
  -- Notificações
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  notification_count INTEGER DEFAULT 0,
  
  -- Metadados
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de histórico de notificações
CREATE TABLE IF NOT EXISTS alert_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES fiscal_alerts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Detalhes da notificação
  notification_type TEXT NOT NULL, -- email, push, in_app
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  
  -- Conteúdo
  subject TEXT,
  message TEXT,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_alert_configurations_user_id ON alert_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_configurations_type ON alert_configurations(alert_type);

CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_user_id ON fiscal_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_status ON fiscal_alerts(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_priority ON fiscal_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_due_date ON fiscal_alerts(due_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_alert_date ON fiscal_alerts(alert_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_alerts_type ON fiscal_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_user_id ON alert_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_sent_at ON alert_notifications(sent_at);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_alert_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_alert_configurations_updated_at
  BEFORE UPDATE ON alert_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_updated_at();

CREATE TRIGGER trigger_update_fiscal_alerts_updated_at
  BEFORE UPDATE ON fiscal_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_alert_updated_at();

-- Função para criar alertas automáticos baseados em documentos
CREATE OR REPLACE FUNCTION create_document_based_alerts()
RETURNS TRIGGER AS $$
DECLARE
  alert_config RECORD;
  due_date DATE;
  alert_date DATE;
BEGIN
  -- Processar apenas documentos completados
  IF NEW.status = 'completed' THEN
    
    -- Alertas para NFE (vencimento de impostos)
    IF NEW.document_type = 'NFE' AND NEW.extracted_data->'valores'->>'valorTotal' IS NOT NULL THEN
      
      -- Buscar configurações de alerta do usuário
      FOR alert_config IN 
        SELECT * FROM alert_configurations 
        WHERE user_id = NEW.user_id 
        AND alert_type = 'DAS_VENCIMENTO' 
        AND enabled = TRUE
      LOOP
        -- Calcular data de vencimento (20 do mês seguinte)
        due_date := DATE_TRUNC('month', (NEW.extracted_data->>'dataEmissao')::DATE) + INTERVAL '1 month' + INTERVAL '19 days';
        alert_date := due_date - INTERVAL '1 day' * alert_config.days_before;
        
        -- Criar alerta se ainda não existe
        INSERT INTO fiscal_alerts (
          user_id,
          alert_type,
          title,
          description,
          priority,
          due_date,
          alert_date,
          context_data,
          suggested_actions,
          related_document_id
        )
        SELECT 
          NEW.user_id,
          'DAS_VENCIMENTO',
          'Vencimento DAS - ' || TO_CHAR(due_date, 'MM/YYYY'),
          'O DAS referente ao mês ' || TO_CHAR((NEW.extracted_data->>'dataEmissao')::DATE, 'MM/YYYY') || ' vence em ' || TO_CHAR(due_date, 'DD/MM/YYYY'),
          'HIGH',
          due_date,
          alert_date,
          jsonb_build_object(
            'valor_estimado', NEW.extracted_data->'valores'->>'valorTotal',
            'mes_referencia', TO_CHAR((NEW.extracted_data->>'dataEmissao')::DATE, 'MM/YYYY'),
            'documento_origem', NEW.file_name
          ),
          ARRAY['Calcular DAS', 'Gerar guia de pagamento', 'Agendar pagamento'],
          NEW.id
        WHERE NOT EXISTS (
          SELECT 1 FROM fiscal_alerts 
          WHERE user_id = NEW.user_id 
          AND alert_type = 'DAS_VENCIMENTO'
          AND due_date = due_date
          AND status = 'ACTIVE'
        );
      END LOOP;
    END IF;
    
    -- Alertas para documentos com data de vencimento
    IF NEW.extracted_data->>'dataVencimento' IS NOT NULL THEN
      FOR alert_config IN 
        SELECT * FROM alert_configurations 
        WHERE user_id = NEW.user_id 
        AND alert_type = 'DOCUMENTO_VENCIDO' 
        AND enabled = TRUE
      LOOP
        due_date := (NEW.extracted_data->>'dataVencimento')::DATE;
        alert_date := due_date - INTERVAL '1 day' * alert_config.days_before;
        
        -- Criar alerta apenas se a data de vencimento for futura
        IF due_date > CURRENT_DATE THEN
          INSERT INTO fiscal_alerts (
            user_id,
            alert_type,
            title,
            description,
            priority,
            due_date,
            alert_date,
            context_data,
            suggested_actions,
            related_document_id
          )
          SELECT 
            NEW.user_id,
            'DOCUMENTO_VENCIDO',
            'Documento vencendo - ' || NEW.file_name,
            'O documento ' || NEW.file_name || ' vence em ' || TO_CHAR(due_date, 'DD/MM/YYYY'),
            CASE 
              WHEN due_date - CURRENT_DATE <= 3 THEN 'CRITICAL'
              WHEN due_date - CURRENT_DATE <= 7 THEN 'HIGH'
              ELSE 'MEDIUM'
            END,
            due_date,
            alert_date,
            jsonb_build_object(
              'documento_tipo', NEW.document_type,
              'arquivo', NEW.file_name
            ),
            ARRAY['Verificar documento', 'Tomar ação necessária'],
            NEW.id
          WHERE NOT EXISTS (
            SELECT 1 FROM fiscal_alerts 
            WHERE related_document_id = NEW.id
            AND alert_type = 'DOCUMENTO_VENCIDO'
            AND status = 'ACTIVE'
          );
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar alertas automaticamente
CREATE TRIGGER trigger_create_document_alerts
  AFTER INSERT OR UPDATE ON processed_documents
  FOR EACH ROW
  EXECUTE FUNCTION create_document_based_alerts();

-- Função para obter alertas ativos do usuário
CREATE OR REPLACE FUNCTION get_active_alerts(
  p_user_id UUID,
  p_priority alert_priority DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  alert_type alert_type,
  title TEXT,
  description TEXT,
  priority alert_priority,
  due_date DATE,
  days_until_due INTEGER,
  context_data JSONB,
  suggested_actions TEXT[],
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.alert_type,
    fa.title,
    fa.description,
    fa.priority,
    fa.due_date,
    (fa.due_date - CURRENT_DATE)::INTEGER as days_until_due,
    fa.context_data,
    fa.suggested_actions,
    fa.created_at
  FROM fiscal_alerts fa
  WHERE fa.user_id = p_user_id
    AND fa.status = 'ACTIVE'
    AND fa.alert_date <= CURRENT_DATE
    AND (p_priority IS NULL OR fa.priority = p_priority)
  ORDER BY 
    CASE fa.priority
      WHEN 'CRITICAL' THEN 1
      WHEN 'HIGH' THEN 2
      WHEN 'MEDIUM' THEN 3
      WHEN 'LOW' THEN 4
    END,
    fa.due_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar alerta como reconhecido
CREATE OR REPLACE FUNCTION acknowledge_alert(
  p_alert_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE fiscal_alerts 
  SET 
    status = 'ACKNOWLEDGED',
    acknowledged_at = NOW()
  WHERE id = p_alert_id 
    AND user_id = p_user_id
    AND status = 'ACTIVE';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para resolver alerta
CREATE OR REPLACE FUNCTION resolve_alert(
  p_alert_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE fiscal_alerts 
  SET 
    status = 'RESOLVED',
    resolved_at = NOW()
  WHERE id = p_alert_id 
    AND user_id = p_user_id
    AND status IN ('ACTIVE', 'ACKNOWLEDGED');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para criar configurações padrão de alertas
CREATE OR REPLACE FUNCTION create_default_alert_configurations(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO alert_configurations (user_id, alert_type, days_before, notification_frequency)
  VALUES 
    (p_user_id, 'DAS_VENCIMENTO', 7, 'ONCE'),
    (p_user_id, 'IRPJ_VENCIMENTO', 10, 'ONCE'),
    (p_user_id, 'DOCUMENTO_VENCIDO', 3, 'DAILY'),
    (p_user_id, 'DEFIS_PRAZO', 15, 'ONCE'),
    (p_user_id, 'CERTIFICADO_VENCIMENTO', 30, 'WEEKLY')
  ON CONFLICT (user_id, alert_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

-- Policies para alert_configurations
CREATE POLICY "Users can manage own alert configurations" ON alert_configurations
  FOR ALL USING (auth.uid() = user_id);

-- Policies para fiscal_alerts
CREATE POLICY "Users can view own alerts" ON fiscal_alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts" ON fiscal_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies para alert_notifications
CREATE POLICY "Users can view own notifications" ON alert_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE alert_configurations IS 'Configurações de alertas por usuário';
COMMENT ON TABLE fiscal_alerts IS 'Alertas fiscais ativos e histórico';
COMMENT ON TABLE alert_notifications IS 'Histórico de notificações enviadas';

COMMENT ON COLUMN fiscal_alerts.context_data IS 'Dados contextuais específicos do alerta em JSON';
COMMENT ON COLUMN fiscal_alerts.suggested_actions IS 'Array de ações sugeridas para resolver o alerta';
