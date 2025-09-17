-- =====================================================
-- TABELAS PARA ASSISTENTE CONTÁBIL IA
-- =====================================================

-- Tabela para armazenar conversas com o assistente de IA
CREATE TABLE IF NOT EXISTS conversas_ia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  tipo_consulta VARCHAR(50) NOT NULL DEFAULT 'consulta_geral',
  modelo_usado VARCHAR(20) NOT NULL DEFAULT 'gpt-4o',
  tokens_usados INTEGER DEFAULT 0,
  tempo_resposta INTEGER DEFAULT 0, -- em millisegundos
  contexto JSONB DEFAULT '{}',
  feedback INTEGER CHECK (feedback IN (1, -1)), -- 1 = positivo, -1 = negativo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar histórico de consultas IA (compatibilidade com função existente)
CREATE TABLE IF NOT EXISTS consultas_ia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  tipo_consulta VARCHAR(50) NOT NULL DEFAULT 'geral',
  empresas_relacionadas UUID[] DEFAULT '{}',
  confianca INTEGER DEFAULT 0 CHECK (confianca >= 0 AND confianca <= 100),
  tempo_resposta INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para armazenar templates de prompts especializados
CREATE TABLE IF NOT EXISTS prompts_especializados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  categoria VARCHAR(50) NOT NULL,
  prompt_sistema TEXT NOT NULL,
  prompt_usuario TEXT,
  parametros JSONB DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para métricas e analytics do assistente IA
CREATE TABLE IF NOT EXISTS metricas_assistente_ia (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  data_metrica DATE NOT NULL DEFAULT CURRENT_DATE,
  total_consultas INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  tempo_medio_resposta INTEGER DEFAULT 0,
  tipos_consulta JSONB DEFAULT '{}', -- {"calculo_fiscal": 10, "analise_financeira": 5}
  satisfacao_media DECIMAL(3,2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, data_metrica)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para conversas_ia
CREATE INDEX IF NOT EXISTS idx_conversas_ia_user_id ON conversas_ia(user_id);
CREATE INDEX IF NOT EXISTS idx_conversas_ia_empresa_id ON conversas_ia(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conversas_ia_tipo_consulta ON conversas_ia(tipo_consulta);
CREATE INDEX IF NOT EXISTS idx_conversas_ia_created_at ON conversas_ia(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversas_ia_modelo_usado ON conversas_ia(modelo_usado);

-- Índices para consultas_ia
CREATE INDEX IF NOT EXISTS idx_consultas_ia_user_id ON consultas_ia(user_id);
CREATE INDEX IF NOT EXISTS idx_consultas_ia_tipo_consulta ON consultas_ia(tipo_consulta);
CREATE INDEX IF NOT EXISTS idx_consultas_ia_created_at ON consultas_ia(created_at DESC);

-- Índices para prompts_especializados
CREATE INDEX IF NOT EXISTS idx_prompts_especializados_categoria ON prompts_especializados(categoria);
CREATE INDEX IF NOT EXISTS idx_prompts_especializados_ativo ON prompts_especializados(ativo);

-- Índices para métricas
CREATE INDEX IF NOT EXISTS idx_metricas_assistente_user_data ON metricas_assistente_ia(user_id, data_metrica);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para conversas_ia
CREATE OR REPLACE FUNCTION update_conversas_ia_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversas_ia_updated_at
  BEFORE UPDATE ON conversas_ia
  FOR EACH ROW
  EXECUTE FUNCTION update_conversas_ia_updated_at();

-- Trigger para prompts_especializados
CREATE OR REPLACE FUNCTION update_prompts_especializados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prompts_especializados_updated_at
  BEFORE UPDATE ON prompts_especializados
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_especializados_updated_at();

-- Trigger para métricas_assistente_ia
CREATE OR REPLACE FUNCTION update_metricas_assistente_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_metricas_assistente_updated_at
  BEFORE UPDATE ON metricas_assistente_ia
  FOR EACH ROW
  EXECUTE FUNCTION update_metricas_assistente_updated_at();

-- =====================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS
ALTER TABLE conversas_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts_especializados ENABLE ROW LEVEL SECURITY;
ALTER TABLE metricas_assistente_ia ENABLE ROW LEVEL SECURITY;

-- Políticas para conversas_ia
CREATE POLICY "Usuários podem ver suas próprias conversas" ON conversas_ia
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias conversas" ON conversas_ia
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias conversas" ON conversas_ia
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para consultas_ia
CREATE POLICY "Usuários podem ver suas próprias consultas" ON consultas_ia
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias consultas" ON consultas_ia
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para prompts_especializados (somente leitura para usuários)
CREATE POLICY "Usuários podem ver prompts ativos" ON prompts_especializados
  FOR SELECT USING (ativo = true);

-- Políticas para métricas_assistente_ia
CREATE POLICY "Usuários podem ver suas próprias métricas" ON metricas_assistente_ia
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias métricas" ON metricas_assistente_ia
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias métricas" ON metricas_assistente_ia
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir prompts especializados iniciais
INSERT INTO prompts_especializados (nome, categoria, prompt_sistema, parametros) VALUES
('calculo_das_simples', 'calculo_fiscal', 
 'Você é um especialista em cálculo de DAS do Simples Nacional. Forneça cálculos precisos baseados na LC 123/2006 e suas atualizações.',
 '{"anexos_disponiveis": ["I", "II", "III", "IV", "V"], "fator_r_aplicavel": true}'),

('analise_dre', 'analise_financeira',
 'Você é um analista financeiro especializado em DRE (Demonstração do Resultado do Exercício) para empresas brasileiras.',
 '{"indicadores_principais": ["margem_bruta", "margem_liquida", "ebitda"], "comparacao_setorial": true}'),

('classificacao_contabil', 'classificacao_contabil',
 'Você é um especialista em classificação contábil seguindo o Plano de Contas padrão brasileiro e as NBCs.',
 '{"plano_contas": "padrao_brasileiro", "nivel_detalhamento": "sintetico_analitico"}'),

('prazos_fiscais', 'prazos_obrigacoes',
 'Você é um especialista em obrigações fiscais brasileiras, conhecendo todos os prazos e penalidades.',
 '{"calendario_fiscal": "2024", "alertas_antecipados": true}')

ON CONFLICT (nome) DO NOTHING;

-- Comentários nas tabelas
COMMENT ON TABLE conversas_ia IS 'Armazena todas as conversas do usuário com o assistente contábil IA';
COMMENT ON TABLE consultas_ia IS 'Tabela de compatibilidade com a função consulta-ia existente';
COMMENT ON TABLE prompts_especializados IS 'Templates de prompts especializados por categoria contábil';
COMMENT ON TABLE metricas_assistente_ia IS 'Métricas e analytics de uso do assistente IA por usuário';
