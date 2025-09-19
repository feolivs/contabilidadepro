-- 📊 USER FEEDBACK & SATISFACTION SYSTEM
-- Sistema de feedback e análise de satisfação do usuário

-- Enum para tipos de feedback
CREATE TYPE feedback_type AS ENUM (
  'AI_RESPONSE',
  'DOCUMENT_PROCESSING',
  'ALERT_SYSTEM',
  'GENERAL_SYSTEM',
  'FEATURE_REQUEST',
  'BUG_REPORT',
  'PERFORMANCE',
  'UI_UX'
);

-- Enum para rating de satisfação
CREATE TYPE satisfaction_rating AS ENUM (
  'VERY_DISSATISFIED',
  'DISSATISFIED', 
  'NEUTRAL',
  'SATISFIED',
  'VERY_SATISFIED'
);

-- Enum para status do feedback
CREATE TYPE feedback_status AS ENUM (
  'PENDING',
  'REVIEWED',
  'IN_PROGRESS',
  'RESOLVED',
  'DISMISSED'
);

-- Tabela principal de feedback
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo e contexto do feedback
  feedback_type feedback_type NOT NULL,
  rating satisfaction_rating NOT NULL,
  
  -- Conteúdo do feedback
  title TEXT,
  description TEXT,
  
  -- Contexto específico
  context_data JSONB DEFAULT '{}', -- Dados contextuais (ex: ID da consulta, documento, etc)
  
  -- Informações técnicas
  user_agent TEXT,
  page_url TEXT,
  session_id TEXT,
  
  -- Status e processamento
  status feedback_status DEFAULT 'PENDING',
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  
  -- Tags para categorização
  tags TEXT[] DEFAULT '{}'
);

-- Tabela de métricas de satisfação agregadas
CREATE TABLE IF NOT EXISTS satisfaction_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Período da métrica
  metric_date DATE NOT NULL,
  metric_type feedback_type NOT NULL,
  
  -- Métricas agregadas
  total_interactions INTEGER DEFAULT 0,
  total_feedback INTEGER DEFAULT 0,
  
  -- Distribuição de ratings
  very_dissatisfied_count INTEGER DEFAULT 0,
  dissatisfied_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  satisfied_count INTEGER DEFAULT 0,
  very_satisfied_count INTEGER DEFAULT 0,
  
  -- Métricas calculadas
  average_rating DECIMAL(3,2),
  satisfaction_score DECIMAL(5,2), -- Percentual de satisfeitos + muito satisfeitos
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, metric_date, metric_type)
);

-- Tabela de interações do usuário (para calcular métricas)
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de interação
  interaction_type feedback_type NOT NULL,
  
  -- Contexto da interação
  context_data JSONB DEFAULT '{}',
  
  -- Informações de performance
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT,
  page_url TEXT
);

-- Tabela de respostas a feedback (para follow-up)
CREATE TABLE IF NOT EXISTS feedback_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_id UUID REFERENCES user_feedback(id) ON DELETE CASCADE NOT NULL,
  responder_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Conteúdo da resposta
  response_text TEXT NOT NULL,
  
  -- Tipo de resposta
  response_type TEXT DEFAULT 'COMMENT', -- COMMENT, RESOLUTION, FOLLOW_UP
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notificação
  notification_sent BOOLEAN DEFAULT FALSE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_satisfaction_metrics_user_id ON satisfaction_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_metrics_date ON satisfaction_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_satisfaction_metrics_type ON satisfaction_metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON user_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_feedback_id ON feedback_responses(feedback_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

CREATE TRIGGER trigger_update_satisfaction_metrics_updated_at
  BEFORE UPDATE ON satisfaction_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- Função para registrar interação do usuário
CREATE OR REPLACE FUNCTION log_user_interaction(
  p_user_id UUID,
  p_interaction_type feedback_type,
  p_context_data JSONB DEFAULT '{}',
  p_response_time_ms INTEGER DEFAULT NULL,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  interaction_id UUID;
BEGIN
  INSERT INTO user_interactions (
    user_id,
    interaction_type,
    context_data,
    response_time_ms,
    success,
    error_message,
    session_id,
    page_url
  )
  VALUES (
    p_user_id,
    p_interaction_type,
    p_context_data,
    p_response_time_ms,
    p_success,
    p_error_message,
    p_session_id,
    p_page_url
  )
  RETURNING id INTO interaction_id;
  
  RETURN interaction_id;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular métricas de satisfação
CREATE OR REPLACE FUNCTION calculate_satisfaction_metrics(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_feedback_type feedback_type DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  metric_record RECORD;
  interaction_count INTEGER;
BEGIN
  -- Loop através dos tipos de feedback (ou apenas um se especificado)
  FOR metric_record IN 
    SELECT DISTINCT feedback_type as ftype
    FROM user_feedback 
    WHERE user_id = p_user_id 
    AND DATE(created_at) = p_date
    AND (p_feedback_type IS NULL OR feedback_type = p_feedback_type)
  LOOP
    
    -- Contar interações do dia
    SELECT COUNT(*) INTO interaction_count
    FROM user_interactions
    WHERE user_id = p_user_id
    AND DATE(created_at) = p_date
    AND interaction_type = metric_record.ftype;
    
    -- Inserir ou atualizar métricas
    INSERT INTO satisfaction_metrics (
      user_id,
      metric_date,
      metric_type,
      total_interactions,
      total_feedback,
      very_dissatisfied_count,
      dissatisfied_count,
      neutral_count,
      satisfied_count,
      very_satisfied_count,
      average_rating,
      satisfaction_score
    )
    SELECT 
      p_user_id,
      p_date,
      metric_record.ftype,
      interaction_count,
      COUNT(*) as total_feedback,
      COUNT(*) FILTER (WHERE rating = 'VERY_DISSATISFIED') as very_dissatisfied,
      COUNT(*) FILTER (WHERE rating = 'DISSATISFIED') as dissatisfied,
      COUNT(*) FILTER (WHERE rating = 'NEUTRAL') as neutral,
      COUNT(*) FILTER (WHERE rating = 'SATISFIED') as satisfied,
      COUNT(*) FILTER (WHERE rating = 'VERY_SATISFIED') as very_satisfied,
      AVG(
        CASE rating
          WHEN 'VERY_DISSATISFIED' THEN 1
          WHEN 'DISSATISFIED' THEN 2
          WHEN 'NEUTRAL' THEN 3
          WHEN 'SATISFIED' THEN 4
          WHEN 'VERY_SATISFIED' THEN 5
        END
      ) as avg_rating,
      (
        COUNT(*) FILTER (WHERE rating IN ('SATISFIED', 'VERY_SATISFIED'))::DECIMAL / 
        GREATEST(COUNT(*), 1) * 100
      ) as satisfaction_score
    FROM user_feedback
    WHERE user_id = p_user_id
    AND DATE(created_at) = p_date
    AND feedback_type = metric_record.ftype
    GROUP BY user_id, feedback_type
    
    ON CONFLICT (user_id, metric_date, metric_type)
    DO UPDATE SET
      total_interactions = EXCLUDED.total_interactions,
      total_feedback = EXCLUDED.total_feedback,
      very_dissatisfied_count = EXCLUDED.very_dissatisfied_count,
      dissatisfied_count = EXCLUDED.dissatisfied_count,
      neutral_count = EXCLUDED.neutral_count,
      satisfied_count = EXCLUDED.satisfied_count,
      very_satisfied_count = EXCLUDED.very_satisfied_count,
      average_rating = EXCLUDED.average_rating,
      satisfaction_score = EXCLUDED.satisfaction_score,
      updated_at = NOW();
      
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular métricas automaticamente quando feedback é inserido
CREATE OR REPLACE FUNCTION trigger_calculate_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular métricas para o dia do feedback
  PERFORM calculate_satisfaction_metrics(
    NEW.user_id,
    DATE(NEW.created_at),
    NEW.feedback_type
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feedback_metrics
  AFTER INSERT OR UPDATE ON user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_metrics();

-- Função para obter estatísticas de satisfação
CREATE OR REPLACE FUNCTION get_satisfaction_stats(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_feedback_type feedback_type DEFAULT NULL
)
RETURNS TABLE (
  feedback_type feedback_type,
  total_interactions BIGINT,
  total_feedback BIGINT,
  average_rating NUMERIC,
  satisfaction_score NUMERIC,
  feedback_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.metric_type as feedback_type,
    SUM(sm.total_interactions) as total_interactions,
    SUM(sm.total_feedback) as total_feedback,
    AVG(sm.average_rating) as average_rating,
    AVG(sm.satisfaction_score) as satisfaction_score,
    CASE 
      WHEN SUM(sm.total_interactions) > 0 
      THEN (SUM(sm.total_feedback)::NUMERIC / SUM(sm.total_interactions) * 100)
      ELSE 0
    END as feedback_rate
  FROM satisfaction_metrics sm
  WHERE sm.user_id = p_user_id
  AND sm.metric_date BETWEEN p_start_date AND p_end_date
  AND (p_feedback_type IS NULL OR sm.metric_type = p_feedback_type)
  GROUP BY sm.metric_type
  ORDER BY total_feedback DESC;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE satisfaction_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Policies para user_feedback
CREATE POLICY "Users can manage own feedback" ON user_feedback
  FOR ALL USING (auth.uid() = user_id);

-- Policies para satisfaction_metrics
CREATE POLICY "Users can view own metrics" ON satisfaction_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Policies para user_interactions
CREATE POLICY "Users can manage own interactions" ON user_interactions
  FOR ALL USING (auth.uid() = user_id);

-- Policies para feedback_responses
CREATE POLICY "Users can view responses to their feedback" ON feedback_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_feedback 
      WHERE id = feedback_responses.feedback_id 
      AND user_id = auth.uid()
    )
  );

-- Comentários para documentação
COMMENT ON TABLE user_feedback IS 'Feedback e avaliações dos usuários sobre o sistema';
COMMENT ON TABLE satisfaction_metrics IS 'Métricas agregadas de satisfação por usuário e tipo';
COMMENT ON TABLE user_interactions IS 'Log de interações do usuário para cálculo de métricas';
COMMENT ON TABLE feedback_responses IS 'Respostas da equipe aos feedbacks dos usuários';

COMMENT ON COLUMN user_feedback.context_data IS 'Dados contextuais da interação que gerou o feedback';
COMMENT ON COLUMN satisfaction_metrics.satisfaction_score IS 'Percentual de usuários satisfeitos + muito satisfeitos';
COMMENT ON COLUMN user_interactions.response_time_ms IS 'Tempo de resposta da operação em milissegundos';
