-- 🔐 SEGURANÇA AVANÇADA - MFA + AUTH HOOKS
-- Migração para implementar sistema de segurança avançado
-- Data: 2025-01-19
-- Autor: ContabilidadePRO Security Enhancement

-- =====================================================
-- 1. TABELA DE EVENTOS DE SEGURANÇA
-- =====================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_attempt', 'login_success', 'login_failed',
    'mfa_setup', 'mfa_verify_success', 'mfa_verify_failed',
    'password_change', 'email_change', 'account_locked',
    'suspicious_activity', 'session_expired', 'logout'
  )),
  ip_address INET,
  user_agent TEXT,
  location JSONB, -- {country, city, region}
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);
CREATE INDEX idx_security_events_risk ON security_events(risk_score DESC);

-- =====================================================
-- 2. PREFERÊNCIAS DE SEGURANÇA DO USUÁRIO
-- =====================================================

CREATE TABLE IF NOT EXISTS user_security_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- MFA Settings
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_required_for_financial BOOLEAN DEFAULT true,
  mfa_backup_codes_generated BOOLEAN DEFAULT false,
  
  -- Session Settings
  session_timeout_minutes INTEGER DEFAULT 480 CHECK (session_timeout_minutes > 0), -- 8 horas
  require_mfa_for_sensitive_ops BOOLEAN DEFAULT true,
  
  -- Security Policies
  allowed_ip_ranges INET[],
  require_password_change_days INTEGER DEFAULT 90,
  max_failed_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  
  -- Notification Preferences
  notify_login_attempts BOOLEAN DEFAULT true,
  notify_mfa_changes BOOLEAN DEFAULT true,
  notify_suspicious_activity BOOLEAN DEFAULT true,
  notification_email TEXT,
  
  -- Audit Settings
  log_all_activities BOOLEAN DEFAULT true,
  retention_days INTEGER DEFAULT 90,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CÓDIGOS DE BACKUP MFA
-- =====================================================

CREATE TABLE IF NOT EXISTS mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- Hash do código para segurança
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  used_ip INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year')
);

-- Índices
CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX idx_mfa_backup_codes_used ON mfa_backup_codes(used);

-- =====================================================
-- 4. LOG DE AUDITORIA DETALHADO
-- =====================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  
  -- Ação realizada
  action TEXT NOT NULL,
  resource_type TEXT, -- 'empresa', 'documento', 'calculo', etc.
  resource_id UUID,
  
  -- Contexto da ação
  before_data JSONB,
  after_data JSONB,
  
  -- Informações de segurança
  ip_address INET,
  user_agent TEXT,
  mfa_verified BOOLEAN DEFAULT false,
  
  -- Classificação
  severity TEXT DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT DEFAULT 'general' CHECK (category IN (
    'authentication', 'authorization', 'data_access', 'data_modification',
    'financial_operation', 'system_admin', 'compliance', 'general'
  )),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para auditoria
CREATE INDEX idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_action ON security_audit_log(action);
CREATE INDEX idx_security_audit_resource ON security_audit_log(resource_type, resource_id);
CREATE INDEX idx_security_audit_severity ON security_audit_log(severity);
CREATE INDEX idx_security_audit_created_at ON security_audit_log(created_at DESC);

-- =====================================================
-- 5. SESSÕES ATIVAS (para controle de sessão)
-- =====================================================

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  mfa_verified BOOLEAN DEFAULT false,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX idx_active_sessions_expires ON active_sessions(expires_at);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Usuários só acessam seus próprios dados
CREATE POLICY "Users can view their own security events" ON security_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own security preferences" ON user_security_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own backup codes" ON mfa_backup_codes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit log" ON security_audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own active sessions" ON active_sessions
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 7. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para criar preferências de segurança padrão
CREATE OR REPLACE FUNCTION create_default_security_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_security_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar preferências automáticas
CREATE TRIGGER on_auth_user_created_security
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_security_preferences();

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM active_sessions 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE security_events IS 'Log de eventos de segurança do sistema';
COMMENT ON TABLE user_security_preferences IS 'Preferências de segurança por usuário';
COMMENT ON TABLE mfa_backup_codes IS 'Códigos de backup para MFA';
COMMENT ON TABLE security_audit_log IS 'Log detalhado de auditoria de segurança';
COMMENT ON TABLE active_sessions IS 'Controle de sessões ativas dos usuários';

-- =====================================================
-- 9. DADOS INICIAIS
-- =====================================================

-- Inserir preferências padrão para usuários existentes
INSERT INTO user_security_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
