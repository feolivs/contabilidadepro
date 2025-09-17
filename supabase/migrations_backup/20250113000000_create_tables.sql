-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    inscricao_estadual TEXT,
    inscricao_municipal TEXT,
    regime_tributario TEXT NOT NULL DEFAULT 'Simples Nacional',
    atividade_principal TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    telefone TEXT,
    email TEXT,
    responsavel_nome TEXT,
    responsavel_cpf TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de cálculos fiscais
CREATE TABLE IF NOT EXISTS public.calculos_fiscais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo_calculo TEXT NOT NULL,
    competencia TEXT NOT NULL,
    valor_imposto DECIMAL(15,2) NOT NULL,
    aliquota_efetiva DECIMAL(6,4),
    detalhes_calculo JSONB,
    data_vencimento DATE,
    codigo_barras TEXT,
    guia_pdf_url TEXT,
    status TEXT DEFAULT 'pendente',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de tabelas fiscais (Simples Nacional)
CREATE TABLE IF NOT EXISTS public.tabelas_fiscais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anexo TEXT NOT NULL,
    faixa INTEGER NOT NULL,
    receita_minima DECIMAL(15,2) NOT NULL,
    receita_maxima DECIMAL(15,2) NOT NULL,
    aliquota DECIMAL(6,4) NOT NULL,
    deducao DECIMAL(15,2) NOT NULL DEFAULT 0,
    irpj_percentual DECIMAL(6,2) DEFAULT 0,
    csll_percentual DECIMAL(6,2) DEFAULT 0,
    pis_percentual DECIMAL(6,2) DEFAULT 0,
    cofins_percentual DECIMAL(6,2) DEFAULT 0,
    icms_percentual DECIMAL(6,2) DEFAULT 0,
    iss_percentual DECIMAL(6,2) DEFAULT 0,
    cpp_percentual DECIMAL(6,2) DEFAULT 0,
    vigencia_inicio DATE NOT NULL DEFAULT '2025-01-01',
    vigencia_fim DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de documentos
CREATE TABLE IF NOT EXISTS public.documentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    tipo_documento TEXT NOT NULL,
    categoria TEXT,
    competencia TEXT,
    tamanho_arquivo BIGINT,
    url_arquivo TEXT NOT NULL,
    hash_arquivo TEXT,
    status_processamento TEXT DEFAULT 'pendente',
    dados_extraidos JSONB,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados de exemplo para empresas
INSERT INTO public.empresas (razao_social, nome_fantasia, cnpj, regime_tributario, atividade_principal, endereco, cidade, estado, cep) VALUES
('Tech Solutions Ltda', 'TechSol', '12.345.678/0001-90', 'Simples Nacional', 'Desenvolvimento de Software', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567'),
('Comércio Geral ME', 'ComGeral', '98.765.432/0001-10', 'Simples Nacional', 'Comércio Varejista', 'Av. Principal, 456', 'Rio de Janeiro', 'RJ', '20123-456'),
('Consultoria Empresarial Eireli', 'ConsultEmp', '11.222.333/0001-44', 'Lucro Presumido', 'Consultoria Empresarial', 'Rua dos Negócios, 789', 'Belo Horizonte', 'MG', '30123-789');

-- Inserir tabelas fiscais do Simples Nacional 2025 (Anexo I - Comércio)
INSERT INTO public.tabelas_fiscais (anexo, faixa, receita_minima, receita_maxima, aliquota, deducao, irpj_percentual, csll_percentual, pis_percentual, cofins_percentual, icms_percentual, cpp_percentual) VALUES
('I', 1, 0, 180000, 4.00, 0, 5.50, 3.50, 0.00, 0.00, 34.00, 41.50),
('I', 2, 180000.01, 360000, 7.30, 5940, 5.50, 3.50, 0.00, 0.00, 34.00, 41.50),
('I', 3, 360000.01, 720000, 9.50, 13860, 5.50, 3.50, 0.00, 0.00, 34.00, 41.50),
('I', 4, 720000.01, 1800000, 10.70, 22500, 5.50, 3.50, 0.00, 0.00, 34.00, 41.50),
('I', 5, 1800000.01, 3600000, 14.30, 87300, 5.50, 3.50, 0.00, 0.00, 34.00, 41.50),
('I', 6, 3600000.01, 4800000, 19.00, 378000, 13.50, 10.00, 0.00, 0.00, 35.00, 41.50);

-- Inserir alguns cálculos de exemplo
INSERT INTO public.calculos_fiscais (empresa_id, tipo_calculo, competencia, valor_imposto, aliquota_efetiva, data_vencimento, status) VALUES
((SELECT id FROM public.empresas WHERE cnpj = '12.345.678/0001-90'), 'DAS', '2024-12', 2844.00, 7.19, '2025-01-20', 'pendente'),
((SELECT id FROM public.empresas WHERE cnpj = '98.765.432/0001-10'), 'DAS', '2024-12', 1200.00, 4.00, '2025-01-20', 'pago'),
((SELECT id FROM public.empresas WHERE cnpj = '11.222.333/0001-44'), 'IRPJ', '2024-12', 4800.00, 8.50, '2025-01-31', 'pendente');

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON public.empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_calculos_empresa_id ON public.calculos_fiscais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_calculos_competencia ON public.calculos_fiscais(competencia);
CREATE INDEX IF NOT EXISTS idx_tabelas_fiscais_anexo ON public.tabelas_fiscais(anexo);
CREATE INDEX IF NOT EXISTS idx_documentos_empresa_id ON public.documentos(empresa_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculos_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabelas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS básicas (permitir tudo para desenvolvimento)
CREATE POLICY "Allow all for authenticated users" ON public.empresas FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.calculos_fiscais FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.tabelas_fiscais FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.documentos FOR ALL TO authenticated USING (true);

-- Permitir acesso anônimo para desenvolvimento local
CREATE POLICY "Allow all for anon users" ON public.empresas FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon users" ON public.calculos_fiscais FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon users" ON public.tabelas_fiscais FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon users" ON public.documentos FOR ALL TO anon USING (true);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para atualizar updated_at
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calculos_updated_at BEFORE UPDATE ON public.calculos_fiscais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
