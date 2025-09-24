-- ✅ MIGRAÇÃO PARA TABELA UNIFICADA - ContabilidadePRO
-- Migra dados da tabela 'documentos' para 'documentos_unified' com estrutura universal

-- 🔄 FUNÇÃO DE MIGRAÇÃO DE DADOS
CREATE OR REPLACE FUNCTION migrate_documentos_to_unified()
RETURNS TABLE (
  migrated_count INTEGER,
  skipped_count INTEGER,
  error_count INTEGER,
  details JSONB
) AS $$
DECLARE
  doc_record RECORD;
  migrated_count INTEGER := 0;
  skipped_count INTEGER := 0;
  error_count INTEGER := 0;
  migration_details JSONB := '[]'::JSONB;
  unified_data JSONB;
  categoria_mapped TEXT;
  tipo_documento_mapped TEXT;
  confianca_calculada NUMERIC;
BEGIN
  -- Iterar sobre todos os documentos da tabela original
  FOR doc_record IN 
    SELECT * FROM documentos 
    WHERE deleted_at IS NULL
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- 🏷️ MAPEAR CATEGORIA baseado no tipo_documento
      categoria_mapped := CASE 
        WHEN doc_record.tipo_documento::TEXT IN ('NFe', 'NFCe', 'CTe', 'MDFe') THEN 'fiscal'
        WHEN doc_record.tipo_documento::TEXT IN ('DAS', 'DARF', 'GPS', 'GRU') THEN 'tributario'
        WHEN doc_record.tipo_documento::TEXT IN ('Contrato', 'Procuração', 'Ata') THEN 'juridico'
        WHEN doc_record.tipo_documento::TEXT IN ('Balanço', 'DRE', 'Balancete') THEN 'contabil'
        WHEN doc_record.tipo_documento::TEXT IN ('Recibo', 'Boleto', 'Fatura') THEN 'financeiro'
        ELSE 'outros'
      END;

      -- 📋 MAPEAR TIPO_DOCUMENTO para formato padronizado
      tipo_documento_mapped := CASE
        WHEN doc_record.tipo_documento::TEXT = 'NFe' THEN 'nota_fiscal_eletronica'
        WHEN doc_record.tipo_documento::TEXT = 'NFCe' THEN 'nota_fiscal_consumidor'
        WHEN doc_record.tipo_documento::TEXT = 'DAS' THEN 'das_simples_nacional'
        WHEN doc_record.tipo_documento::TEXT = 'Cartão CNPJ' THEN 'cartao_cnpj'
        WHEN doc_record.tipo_documento::TEXT = 'Outro' THEN 'documento_generico'
        ELSE LOWER(REPLACE(doc_record.tipo_documento::TEXT, ' ', '_'))
      END;

      -- 📊 CONSTRUIR DADOS EXTRAÍDOS UNIVERSAIS
      unified_data := COALESCE(doc_record.dados_extraidos, '{}'::JSONB);
      
      -- Adicionar estrutura universal se não existir
      IF NOT unified_data ? 'raw_text' THEN
        unified_data := unified_data || jsonb_build_object(
          'raw_text', COALESCE(unified_data->>'descricao', ''),
          'document_type', tipo_documento_mapped,
          'confidence_score', COALESCE((unified_data->>'confidence')::NUMERIC, 0.5),
          'entities', '[]'::JSONB,
          'financial_data', '[]'::JSONB,
          'dates', '[]'::JSONB,
          'contacts', '[]'::JSONB,
          'additional_fields', unified_data,
          'relationships', '[]'::JSONB,
          'insights', '[]'::JSONB
        );
      END IF;

      -- 🔢 CALCULAR CONFIANÇA baseada nos dados existentes
      confianca_calculada := COALESCE(
        (unified_data->>'confidence')::NUMERIC,
        doc_record.ocr_confidence,
        CASE 
          WHEN doc_record.status_processamento = 'processado' THEN 0.8
          WHEN doc_record.dados_extraidos IS NOT NULL THEN 0.6
          ELSE 0.3
        END
      );

      -- 📅 EXTRAIR ANO E MÊS FISCAL
      DECLARE
        ano_fiscal_calc INTEGER;
        mes_fiscal_calc INTEGER;
        competencia_fiscal_calc DATE;
      BEGIN
        -- Tentar extrair da data_emissao primeiro, depois created_at
        IF doc_record.data_emissao IS NOT NULL THEN
          ano_fiscal_calc := EXTRACT(YEAR FROM doc_record.data_emissao);
          mes_fiscal_calc := EXTRACT(MONTH FROM doc_record.data_emissao);
          competencia_fiscal_calc := doc_record.data_emissao;
        ELSE
          ano_fiscal_calc := EXTRACT(YEAR FROM doc_record.created_at);
          mes_fiscal_calc := EXTRACT(MONTH FROM doc_record.created_at);
          competencia_fiscal_calc := doc_record.created_at::DATE;
        END IF;
      END;

      -- ✅ INSERIR NA TABELA UNIFICADA (com UPSERT para evitar duplicatas)
      INSERT INTO documentos_unified (
        id,
        empresa_id,
        user_id,
        categoria,
        tipo_documento,
        subtipo_documento,
        arquivo_nome,
        arquivo_tamanho,
        arquivo_tipo,
        arquivo_url,
        arquivo_path,
        numero_documento,
        serie,
        status_processamento,
        data_processamento,
        metodo_processamento,
        dados_extraidos,
        confianca_extracao,
        valor_total,
        data_documento,
        ano_fiscal,
        mes_fiscal,
        competencia_fiscal,
        observacoes,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) VALUES (
        doc_record.id,
        doc_record.empresa_id,
        doc_record.empresa_id, -- Assumindo que empresa_id é o user_id por enquanto
        categoria_mapped,
        tipo_documento_mapped,
        NULL, -- subtipo_documento
        doc_record.arquivo_nome,
        doc_record.arquivo_tamanho,
        doc_record.arquivo_tipo,
        doc_record.arquivo_url,
        doc_record.arquivo_path,
        doc_record.numero_documento,
        doc_record.serie,
        doc_record.status_processamento::TEXT::unified_processing_status,
        doc_record.data_processamento,
        COALESCE(doc_record.ocr_method, 'legacy_processor'),
        unified_data,
        confianca_calculada,
        doc_record.valor_total,
        doc_record.data_emissao,
        ano_fiscal_calc,
        mes_fiscal_calc,
        competencia_fiscal_calc,
        doc_record.observacoes,
        doc_record.created_at,
        doc_record.updated_at,
        doc_record.empresa_id, -- created_by
        doc_record.empresa_id  -- updated_by
      )
      ON CONFLICT (id) DO UPDATE SET
        categoria = EXCLUDED.categoria,
        tipo_documento = EXCLUDED.tipo_documento,
        dados_extraidos = EXCLUDED.dados_extraidos,
        confianca_extracao = EXCLUDED.confianca_extracao,
        metodo_processamento = EXCLUDED.metodo_processamento,
        ano_fiscal = EXCLUDED.ano_fiscal,
        mes_fiscal = EXCLUDED.mes_fiscal,
        competencia_fiscal = EXCLUDED.competencia_fiscal,
        updated_at = NOW();

      migrated_count := migrated_count + 1;
      
      -- Adicionar detalhes da migração
      migration_details := migration_details || jsonb_build_object(
        'id', doc_record.id,
        'arquivo_nome', doc_record.arquivo_nome,
        'categoria_original', doc_record.tipo_documento,
        'categoria_mapeada', categoria_mapped,
        'tipo_mapeado', tipo_documento_mapped,
        'confianca', confianca_calculada,
        'status', 'migrated'
      );

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      
      -- Log do erro
      migration_details := migration_details || jsonb_build_object(
        'id', doc_record.id,
        'arquivo_nome', doc_record.arquivo_nome,
        'error', SQLERRM,
        'status', 'error'
      );
      
      CONTINUE;
    END;
  END LOOP;

  -- Retornar resultados
  RETURN QUERY SELECT 
    migrated_count,
    skipped_count,
    error_count,
    migration_details;
END;
$$ LANGUAGE plpgsql;

-- 🚀 EXECUTAR MIGRAÇÃO
SELECT * FROM migrate_documentos_to_unified();

-- 📊 VERIFICAR RESULTADOS DA MIGRAÇÃO
SELECT 
  'documentos_original' as tabela,
  COUNT(*) as total,
  COUNT(CASE WHEN status_processamento = 'processado' THEN 1 END) as processados,
  COUNT(CASE WHEN dados_extraidos IS NOT NULL THEN 1 END) as com_dados
FROM documentos
WHERE deleted_at IS NULL

UNION ALL

SELECT 
  'documentos_unified' as tabela,
  COUNT(*) as total,
  COUNT(CASE WHEN status_processamento = 'processado' THEN 1 END) as processados,
  COUNT(CASE WHEN dados_extraidos != '{}'::JSONB THEN 1 END) as com_dados
FROM documentos_unified
WHERE deleted_at IS NULL;

-- 🏷️ VERIFICAR DISTRIBUIÇÃO POR CATEGORIA
SELECT 
  categoria,
  COUNT(*) as quantidade,
  ROUND(AVG(confianca_extracao), 2) as confianca_media,
  COUNT(CASE WHEN status_processamento = 'processado' THEN 1 END) as processados
FROM documentos_unified 
WHERE deleted_at IS NULL
GROUP BY categoria
ORDER BY quantidade DESC;

-- 📋 VERIFICAR TIPOS DE DOCUMENTO MAPEADOS
SELECT 
  tipo_documento,
  COUNT(*) as quantidade,
  ROUND(AVG(confianca_extracao), 2) as confianca_media
FROM documentos_unified 
WHERE deleted_at IS NULL
GROUP BY tipo_documento
ORDER BY quantidade DESC;

-- 📅 VERIFICAR DISTRIBUIÇÃO TEMPORAL
SELECT 
  ano_fiscal,
  mes_fiscal,
  COUNT(*) as documentos,
  COUNT(CASE WHEN status_processamento = 'processado' THEN 1 END) as processados
FROM documentos_unified 
WHERE deleted_at IS NULL AND ano_fiscal IS NOT NULL
GROUP BY ano_fiscal, mes_fiscal
ORDER BY ano_fiscal DESC, mes_fiscal DESC;

-- 🧹 LIMPAR FUNÇÃO TEMPORÁRIA
DROP FUNCTION IF EXISTS migrate_documentos_to_unified();
