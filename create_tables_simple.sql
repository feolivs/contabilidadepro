-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    regime_tributario TEXT NOT NULL DEFAULT 'Simples Nacional',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de cálculos fiscais
CREATE TABLE IF NOT EXISTS public.calculos_fiscais (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id),
    tipo_calculo TEXT NOT NULL,
    competencia TEXT NOT NULL,
    valor_imposto DECIMAL(15,2) NOT NULL,
    valor_total DECIMAL(15,2) NOT NULL,
    status TEXT DEFAULT 'pendente',
    data_vencimento DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados de exemplo
INSERT INTO public.empresas (razao_social, cnpj) VALUES
('Tech Solutions Ltda', '12.345.678/0001-90'),
('Comércio Geral ME', '98.765.432/0001-10'),
('Consultoria Empresarial Eireli', '11.222.333/0001-44');

-- Inserir cálculos de exemplo
INSERT INTO public.calculos_fiscais (empresa_id, tipo_calculo, competencia, valor_imposto, valor_total, data_vencimento, status) VALUES
((SELECT id FROM public.empresas WHERE cnpj = '12.345.678/0001-90'), 'DAS', '2024-12', 2844.00, 2844.00, '2025-01-20', 'pendente'),
((SELECT id FROM public.empresas WHERE cnpj = '98.765.432/0001-10'), 'DAS', '2024-12', 1200.00, 1200.00, '2025-01-20', 'pago'),
((SELECT id FROM public.empresas WHERE cnpj = '11.222.333/0001-44'), 'IRPJ', '2024-12', 4800.00, 4800.00, '2025-01-31', 'pendente');

-- Habilitar RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculos_fiscais ENABLE ROW LEVEL SECURITY;

-- Criar políticas permissivas para desenvolvimento
CREATE POLICY "Allow all for anon users" ON public.empresas FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon users" ON public.calculos_fiscais FOR ALL TO anon USING (true);
