-- =====================================================
-- SCRIPT PARA CORRIGIR FUNÇÕES CRÍTICAS
-- ContabilidadePRO - Correção de Dados de Teste
-- =====================================================

-- 1. CRIAR DADOS DE TESTE PARA calculate-das-service
-- =====================================================

-- Inserir empresa de teste se não existir
INSERT INTO public.empresas (
    id,
    razao_social,
    nome_fantasia,
    cnpj,
    inscricao_estadual,
    regime_tributario,
    anexo_simples,
    atividade_principal,
    endereco,
    contato,
    ativo,
    created_at,
    updated_at
) VALUES (
    'test-empresa-123',
    'Empresa Teste LTDA',
    'Teste Contábil',
    '11.222.333/0001-81',
    '123.456.789.012',
    'Simples Nacional',
    'I',
    'Comércio varejista de artigos diversos',
    '{"logradouro": "Rua Teste, 123", "bairro": "Centro", "cidade": "São Paulo", "uf": "SP", "cep": "01234-567"}',
    '{"email": "teste@empresa.com", "telefone": "(11) 99999-9999", "responsavel": "João Teste"}',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    regime_tributario = EXCLUDED.regime_tributario,
    anexo_simples = EXCLUDED.anexo_simples,
    updated_at = NOW();

-- Inserir mais empresas de teste para diferentes cenários
INSERT INTO public.empresas (
    id,
    razao_social,
    nome_fantasia,
    cnpj,
    regime_tributario,
    anexo_simples,
    atividade_principal,
    endereco,
    contato,
    ativo
) VALUES 
(
    'test-empresa-456',
    'Prestadora de Serviços LTDA',
    'Serviços Teste',
    '22.333.444/0001-92',
    'Simples Nacional',
    'III',
    'Prestação de serviços de consultoria',
    '{"logradouro": "Av. Teste, 456", "bairro": "Jardins", "cidade": "São Paulo", "uf": "SP", "cep": "01234-890"}',
    '{"email": "servicos@teste.com", "telefone": "(11) 88888-8888", "responsavel": "Maria Teste"}',
    true
),
(
    'test-empresa-789',
    'Indústria Teste S/A',
    'Indústria Teste',
    '33.444.555/0001-03',
    'Simples Nacional',
    'II',
    'Fabricação de produtos diversos',
    '{"logradouro": "Rua Industrial, 789", "bairro": "Industrial", "cidade": "São Paulo", "uf": "SP", "cep": "01234-123"}',
    '{"email": "industria@teste.com", "telefone": "(11) 77777-7777", "responsavel": "Pedro Teste"}',
    true
) ON CONFLICT (id) DO NOTHING;

-- 2. CRIAR USUÁRIO DE TESTE
-- =====================================================

-- Inserir usuário de teste se não existir
INSERT INTO public.users (
    id,
    email,
    nome_completo,
    role,
    ativo,
    created_at,
    updated_at
) VALUES (
    'test-user-456',
    'teste@contabilidadepro.com',
    'Usuário Teste',
    'contador',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    updated_at = NOW();

-- 3. CRIAR DADOS DE TESTE PARA CÁLCULOS
-- =====================================================

-- Inserir alguns cálculos de exemplo
INSERT INTO public.calculos_fiscais (
    id,
    empresa_id,
    user_id,
    tipo_calculo,
    competencia,
    regime_tributario,
    faturamento_bruto,
    faturamento_12_meses,
    anexo_simples,
    base_calculo,
    aliquota_nominal,
    aliquota_efetiva,
    valor_imposto,
    valor_total,
    status,
    data_vencimento,
    calculado_automaticamente,
    created_at
) VALUES 
(
    gen_random_uuid(),
    'test-empresa-123',
    'test-user-456',
    'DAS',
    '2024-01',
    'Simples Nacional',
    50000.00,
    600000.00,
    'I',
    50000.00,
    4.00,
    4.00,
    2000.00,
    2000.00,
    'calculado',
    '2024-02-20',
    true,
    NOW()
),
(
    gen_random_uuid(),
    'test-empresa-456',
    'test-user-456',
    'DAS',
    '2024-01',
    'Simples Nacional',
    30000.00,
    360000.00,
    'III',
    30000.00,
    6.00,
    6.00,
    1800.00,
    1800.00,
    'calculado',
    '2024-02-20',
    true,
    NOW()
) ON CONFLICT DO NOTHING;

-- 4. CRIAR TABELAS FISCAIS SE NÃO EXISTIREM
-- =====================================================

-- Criar tabela de tabelas fiscais se não existir
CREATE TABLE IF NOT EXISTS public.tabelas_fiscais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anexo TEXT NOT NULL,
    faixa INTEGER NOT NULL,
    receita_minima DECIMAL(15,2) NOT NULL,
    receita_maxima DECIMAL(15,2) NOT NULL,
    aliquota DECIMAL(5,4) NOT NULL,
    deducao DECIMAL(15,2) NOT NULL DEFAULT 0,
    irpj_percentual DECIMAL(5,4) DEFAULT 0,
    csll_percentual DECIMAL(5,4) DEFAULT 0,
    pis_percentual DECIMAL(5,4) DEFAULT 0,
    cofins_percentual DECIMAL(5,4) DEFAULT 0,
    cpp_percentual DECIMAL(5,4) DEFAULT 0,
    icms_percentual DECIMAL(5,4) DEFAULT 0,
    iss_percentual DECIMAL(5,4) DEFAULT 0,
    vigencia_inicio DATE NOT NULL DEFAULT '2024-01-01',
    vigencia_fim DATE,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados da tabela do Simples Nacional 2024 - Anexo I
INSERT INTO public.tabelas_fiscais (
    anexo, faixa, receita_minima, receita_maxima, aliquota, deducao,
    irpj_percentual, csll_percentual, pis_percentual, cofins_percentual, cpp_percentual, icms_percentual
) VALUES 
('I', 1, 0, 180000, 4.0000, 0, 5.50, 3.50, 0.00, 0.00, 41.50, 34.00),
('I', 2, 180000.01, 360000, 7.3000, 5940, 5.50, 3.50, 0.00, 0.00, 41.50, 34.00),
('I', 3, 360000.01, 720000, 9.5000, 13860, 5.50, 3.50, 0.00, 0.00, 41.50, 34.00),
('I', 4, 720000.01, 1800000, 10.7000, 22500, 5.50, 3.50, 0.00, 0.00, 41.50, 34.00),
('I', 5, 1800000.01, 3600000, 14.3000, 87300, 5.50, 3.50, 0.00, 0.00, 41.50, 34.00),
('I', 6, 3600000.01, 4800000, 19.0000, 378000, 13.50, 10.00, 0.00, 0.00, 41.50, 35.00)
ON CONFLICT DO NOTHING;

-- Inserir dados da tabela do Simples Nacional 2024 - Anexo III (Serviços)
INSERT INTO public.tabelas_fiscais (
    anexo, faixa, receita_minima, receita_maxima, aliquota, deducao,
    irpj_percentual, csll_percentual, pis_percentual, cofins_percentual, cpp_percentual, iss_percentual
) VALUES 
('III', 1, 0, 180000, 6.0000, 0, 4.00, 3.50, 0.00, 7.50, 43.40, 0.00),
('III', 2, 180000.01, 360000, 11.2000, 9360, 4.00, 3.50, 0.00, 7.50, 43.40, 0.00),
('III', 3, 360000.01, 720000, 13.5000, 17640, 4.00, 3.50, 0.00, 7.50, 43.40, 0.00),
('III', 4, 720000.01, 1800000, 16.0000, 35640, 4.00, 3.50, 0.00, 7.50, 43.40, 0.00),
('III', 5, 1800000.01, 3600000, 21.0000, 125640, 4.00, 3.50, 0.00, 7.50, 43.40, 0.00),
('III', 6, 3600000.01, 4800000, 33.0000, 648000, 35.00, 15.00, 0.00, 16.00, 34.00, 0.00)
ON CONFLICT DO NOTHING;

-- 5. VERIFICAR SE AS TABELAS EXISTEM E TÊM DADOS
-- =====================================================

-- Verificar empresas de teste
SELECT 
    'Empresas de teste criadas:' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN id LIKE 'test-%' THEN 1 END) as teste
FROM public.empresas;

-- Verificar usuários de teste  
SELECT 
    'Usuários de teste criados:' as status,
    COUNT(*) as total,
    COUNT(CASE WHEN id LIKE 'test-%' THEN 1 END) as teste
FROM public.users;

-- Verificar tabelas fiscais
SELECT 
    'Tabelas fiscais criadas:' as status,
    COUNT(*) as total,
    COUNT(DISTINCT anexo) as anexos
FROM public.tabelas_fiscais;

-- 6. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_empresas_regime_tributario ON public.empresas(regime_tributario);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON public.empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_calculos_fiscais_empresa_id ON public.calculos_fiscais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_calculos_fiscais_competencia ON public.calculos_fiscais(competencia);
CREATE INDEX IF NOT EXISTS idx_tabelas_fiscais_anexo_receita ON public.tabelas_fiscais(anexo, receita_minima, receita_maxima);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- Mensagem de sucesso
SELECT 'Script de correção executado com sucesso! Dados de teste criados.' as resultado;
