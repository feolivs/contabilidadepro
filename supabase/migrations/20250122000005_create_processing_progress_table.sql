-- =====================================================
-- MIGRATION: CREATE PROCESSING PROGRESS TABLE
-- Criada em: 2025-01-22
-- Descrição: Tabela para tracking de progresso de processamento OCR
-- =====================================================

-- Criar tabela de progresso de processamento
CREATE TABLE IF NOT EXISTS processing_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('uploading', 'ocr_processing', 'data_extraction', 'validation', 'completed', 'error')),
    progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
    message TEXT NOT NULL,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_processing_progress_document_id ON processing_progress(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_progress_stage ON processing_progress(stage);
CREATE INDEX IF NOT EXISTS idx_processing_progress_created_at ON processing_progress(created_at);

-- Adicionar colunas na tabela documentos para tracking de progresso
ALTER TABLE documentos 
ADD COLUMN IF NOT EXISTS progresso_processamento INTEGER DEFAULT 0 CHECK (progresso_processamento >= 0 AND progresso_processamento <= 100),
ADD COLUMN IF NOT EXISTS mensagem_status TEXT,
ADD COLUMN IF NOT EXISTS erro_processamento TEXT,
ADD COLUMN IF NOT EXISTS tentativas_processamento INTEGER DEFAULT 0;

-- Criar índice para progresso na tabela documentos
CREATE INDEX IF NOT EXISTS idx_documentos_progresso ON documentos(progresso_processamento);
CREATE INDEX IF NOT EXISTS idx_documentos_status_processamento ON documentos(status_processamento);

-- Função para limpar histórico antigo de progresso (manter apenas últimos 7 dias)
CREATE OR REPLACE FUNCTION cleanup_old_progress()
RETURNS void AS $$
BEGIN
    DELETE FROM processing_progress 
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_processing_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_processing_progress_updated_at
    BEFORE UPDATE ON processing_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_processing_progress_updated_at();

-- RLS (Row Level Security) para processing_progress
ALTER TABLE processing_progress ENABLE ROW LEVEL SECURITY;

-- Policy para usuários autenticados verem apenas seus próprios progressos
CREATE POLICY "Users can view their own processing progress" ON processing_progress
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM documentos WHERE user_id = auth.uid()
        )
    );

-- Policy para service role ter acesso completo
CREATE POLICY "Service role has full access to processing progress" ON processing_progress
    FOR ALL USING (auth.role() = 'service_role');

-- Comentários para documentação
COMMENT ON TABLE processing_progress IS 'Tabela para tracking de progresso de processamento OCR em tempo real';
COMMENT ON COLUMN processing_progress.document_id IS 'ID do documento sendo processado';
COMMENT ON COLUMN processing_progress.stage IS 'Estágio atual do processamento';
COMMENT ON COLUMN processing_progress.progress IS 'Progresso em porcentagem (0-100)';
COMMENT ON COLUMN processing_progress.message IS 'Mensagem descritiva do progresso atual';
COMMENT ON COLUMN processing_progress.error_message IS 'Mensagem de erro se aplicável';
COMMENT ON COLUMN processing_progress.retry_count IS 'Número de tentativas realizadas';

COMMENT ON COLUMN documentos.progresso_processamento IS 'Progresso atual do processamento (0-100)';
COMMENT ON COLUMN documentos.mensagem_status IS 'Mensagem de status atual';
COMMENT ON COLUMN documentos.erro_processamento IS 'Última mensagem de erro';
COMMENT ON COLUMN documentos.tentativas_processamento IS 'Número total de tentativas de processamento';
