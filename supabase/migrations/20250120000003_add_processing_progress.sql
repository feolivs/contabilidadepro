-- Adicionar tabela para tracking de progresso de processamento
CREATE TABLE IF NOT EXISTS processing_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('upload', 'ocr', 'ai_analysis', 'validation', 'complete')),
    progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    estimated_time_remaining INTEGER, -- em segundos
    current_operation TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Index para performance
    UNIQUE(document_id) -- Um documento pode ter apenas um progresso ativo
);

-- RLS policies
ALTER TABLE processing_progress ENABLE ROW LEVEL SECURITY;

-- Policy para leitura - usuários podem ver progresso de documentos de suas empresas
CREATE POLICY "Users can read progress of their documents" ON processing_progress
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM documentos d
        JOIN empresas e ON d.empresa_id = e.id
        WHERE d.id = processing_progress.document_id
        AND e.created_by = auth.uid()
    )
);

-- Policy para inserção/atualização - apenas sistema pode modificar
CREATE POLICY "System can manage processing progress" ON processing_progress
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Função para atualizar progress automaticamente
CREATE OR REPLACE FUNCTION update_processing_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
CREATE TRIGGER update_processing_progress_updated_at
    BEFORE UPDATE ON processing_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_processing_progress_timestamp();

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_processing_progress_document_id ON processing_progress(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_progress_stage ON processing_progress(stage);
CREATE INDEX IF NOT EXISTS idx_processing_progress_updated_at ON processing_progress(updated_at);

-- Função para limpar progresso antigo (documentos processados há mais de 1 hora)
CREATE OR REPLACE FUNCTION cleanup_old_processing_progress()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM processing_progress
    WHERE stage = 'complete'
    AND updated_at < NOW() - INTERVAL '1 hour';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Criar job para limpeza automática (se pg_cron estiver disponível)
-- SELECT cron.schedule('cleanup-processing-progress', '0 * * * *', 'SELECT cleanup_old_processing_progress();');

COMMENT ON TABLE processing_progress IS 'Tracking de progresso de processamento de documentos em tempo real';
COMMENT ON COLUMN processing_progress.stage IS 'Estágio atual: upload, ocr, ai_analysis, validation, complete';
COMMENT ON COLUMN processing_progress.progress_percent IS 'Percentual de progresso (0-100)';
COMMENT ON COLUMN processing_progress.estimated_time_remaining IS 'Tempo estimado restante em segundos';
COMMENT ON COLUMN processing_progress.current_operation IS 'Descrição da operação atual sendo executada';