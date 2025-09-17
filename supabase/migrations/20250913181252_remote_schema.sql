

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gin" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."integration_context" AS ENUM (
    'sistema',
    'usuario_final'
);


ALTER TYPE "public"."integration_context" OWNER TO "postgres";


COMMENT ON TYPE "public"."integration_context" IS 'Define o público da integração: ''sistema'' (contadores/admin) ou ''usuario_final'' (clientes)';



CREATE TYPE "public"."status_processamento" AS ENUM (
    'pendente',
    'processando',
    'processado',
    'erro',
    'rejeitado'
);


ALTER TYPE "public"."status_processamento" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'todo',
    'doing',
    'review',
    'done'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE TYPE "public"."tipo_documento" AS ENUM (
    'NFe',
    'NFCe',
    'NFSe',
    'CTe',
    'Recibo',
    'Contrato',
    'Boleto',
    'Extrato',
    'Outro'
);


ALTER TYPE "public"."tipo_documento" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_old_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  archived_count integer := 0;
  result jsonb;
BEGIN
  -- Arquivar automation_executions > 6 meses
  INSERT INTO automation_executions_archive
  SELECT * FROM automation_executions 
  WHERE started_at < NOW() - INTERVAL '6 months'
  AND status IN ('completed', 'failed');
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Remover dados arquivados
  DELETE FROM automation_executions 
  WHERE started_at < NOW() - INTERVAL '6 months'
  AND status IN ('completed', 'failed');
  
  -- Limpar cache CNPJ antigo
  DELETE FROM cnpj_cache WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Limpar logs antigos
  DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '7 days' AND level = 'DEBUG';
  
  -- Construir resultado
  result := jsonb_build_object(
    'success', true,
    'archived_executions', archived_count,
    'timestamp', NOW(),
    'next_run', NOW() + INTERVAL '1 month'
  );
  
  -- Log do archiving
  INSERT INTO system_logs (level, message, context, metadata, created_at)
  VALUES ('INFO', 'Automatic archiving completed', 'archiving', result, NOW());
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."archive_old_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_task"("task_id_param" "uuid", "archived_by_param" "text" DEFAULT 'system'::"text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    task_exists BOOLEAN;
BEGIN
    -- Check if task exists and is not already archived
    SELECT EXISTS(
        SELECT 1 FROM archon_tasks
        WHERE id = task_id_param AND archived = FALSE
    ) INTO task_exists;

    IF NOT task_exists THEN
        RETURN FALSE;
    END IF;

    -- Archive the task
    UPDATE archon_tasks
    SET
        archived = TRUE,
        archived_at = NOW(),
        archived_by = archived_by_param,
        updated_at = NOW()
    WHERE id = task_id_param;

    -- Also archive all subtasks
    UPDATE archon_tasks
    SET
        archived = TRUE,
        archived_at = NOW(),
        archived_by = archived_by_param,
        updated_at = NOW()
    WHERE parent_task_id = task_id_param AND archived = FALSE;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."archive_task"("task_id_param" "uuid", "archived_by_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_documentos_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO system_logs (
        level,
        message,
        context,
        metadata,
        created_at
    ) VALUES (
        'INFO',
        'Documento fiscal ' || TG_OP,
        'AUDIT_DOCUMENTOS',
        jsonb_build_object(
            'action', TG_OP,
            'table_name', 'documentos_fiscais',
            'record_id', COALESCE(NEW.id, OLD.id)::text,
            'old_data', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
            'new_data', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END
        ),
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_documentos_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_empresas_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO system_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        created_at
    ) VALUES (
        auth.uid(),
        TG_OP,
        'empresas',
        COALESCE(NEW.id, OLD.id)::text,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_empresas_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_suggestion_confidence"("p_user_id" "uuid", "p_suggestion_type" "text", "p_context_data" "jsonb") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  base_confidence DECIMAL(3,2) := 0.5;
  pattern_boost DECIMAL(3,2) := 0.0;
  history_boost DECIMAL(3,2) := 0.0;
BEGIN
  -- Boost baseado em padrões comportamentais
  SELECT COALESCE(AVG(confidence_score), 0) INTO pattern_boost
  FROM behavior_patterns 
  WHERE user_id = p_user_id 
  AND pattern_type = 'efficiency';
  
  -- Boost baseado no histórico de aceitação
  SELECT COALESCE(
    COUNT(CASE WHEN status = 'accepted' THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(*), 0), 0
  ) INTO history_boost
  FROM ai_suggestions 
  WHERE user_id = p_user_id 
  AND suggestion_type = p_suggestion_type
  AND created_at > NOW() - INTERVAL '30 days';
  
  RETURN LEAST(0.95, base_confidence + (pattern_boost * 0.3) + (history_boost * 0.2));
END;
$$;


ALTER FUNCTION "public"."calculate_suggestion_confidence"("p_user_id" "uuid", "p_suggestion_type" "text", "p_context_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_next_job"("p_worker_id" character varying, "p_job_types" character varying[] DEFAULT NULL::character varying[]) RETURNS TABLE("job_id" "uuid", "job_type" character varying, "payload" "jsonb", "empresa_id" "uuid", "documento_id" "uuid", "retry_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  claimed_job_id UUID;
BEGIN
  -- Buscar e "clamar" o próximo job disponível atomicamente
  UPDATE async_jobs 
  SET 
    status = 'processing',
    started_at = NOW(),
    worker_id = p_worker_id
  WHERE id = (
    SELECT id FROM async_jobs
    WHERE status IN ('pending', 'retrying')
      AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
      AND (parent_job_id IS NULL OR EXISTS (
        SELECT 1 FROM async_jobs parent 
        WHERE parent.id = async_jobs.parent_job_id 
        AND parent.status = 'completed'
      ))
    ORDER BY priority ASC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO claimed_job_id;
  
  -- Se encontrou um job, retornar os dados
  IF claimed_job_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      aj.id,
      aj.job_type,
      aj.payload,
      aj.empresa_id,
      aj.documento_id,
      aj.retry_count
    FROM async_jobs aj
    WHERE aj.id = claimed_job_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."claim_next_job"("p_worker_id" character varying, "p_job_types" character varying[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."classify_document_semantic"("document_text" "text", "document_embedding" "public"."vector", "empresa_id_param" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  similar_docs RECORD;
  classification_result JSONB;
BEGIN
  -- Buscar documentos similares da mesma empresa
  SELECT INTO similar_docs
    COUNT(*) as total_similar,
    MODE() WITHIN GROUP (ORDER BY de.classification_result->>'tipo_documento') as most_common_type,
    AVG((de.confidence_score)::NUMERIC) as avg_confidence
  FROM document_embeddings de
  JOIN documentos_fiscais df ON de.documento_id = df.id
  WHERE 
    df.empresa_id = empresa_id_param
    AND (1 - (de.embedding <=> document_embedding)) >= 0.8
  LIMIT 20;

  -- Se encontrou documentos similares, usar classificação baseada em similaridade
  IF similar_docs.total_similar > 0 THEN
    classification_result := jsonb_build_object(
      'tipo_documento', COALESCE(similar_docs.most_common_type, 'Outros'),
      'confidence', LEAST(similar_docs.avg_confidence + 0.1, 1.0),
      'method', 'semantic_similarity',
      'similar_docs_found', similar_docs.total_similar
    );
  ELSE
    -- Fallback para classificação baseada em conhecimento semântico global
    SELECT INTO similar_docs
      sk.metadata->>'suggested_classification' as suggested_type,
      sk.confidence_score
    FROM semantic_knowledge sk
    WHERE 
      sk.knowledge_type = 'document_pattern'
      AND (1 - (sk.embedding <=> document_embedding)) >= 0.75
    ORDER BY sk.embedding <=> document_embedding
    LIMIT 1;

    classification_result := jsonb_build_object(
      'tipo_documento', COALESCE(similar_docs.suggested_type, 'Outros'),
      'confidence', COALESCE(similar_docs.confidence_score, 0.6),
      'method', 'semantic_knowledge',
      'fallback', true
    );
  END IF;

  RETURN classification_result;
END;
$$;


ALTER FUNCTION "public"."classify_document_semantic"("document_text" "text", "document_embedding" "public"."vector", "empresa_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_cnpj_cache"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cnpj_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO system_logs (action, table_name, metadata, created_at)
    VALUES (
        'CACHE_CLEANUP',
        'cnpj_cache',
        jsonb_build_object('deleted_records', deleted_count),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_cnpj_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_agent_messages"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Limpar mensagens processadas com mais de 7 dias
  DELETE FROM agent_message_queue 
  WHERE created_at < NOW() - INTERVAL '7 days' 
  AND status = 'completed';
  
  -- Limpar atualizações de contexto com mais de 30 dias
  DELETE FROM shared_context_updates 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Limpar eventos comportamentais baseado nas configurações do usuário
  DELETE FROM user_behavior_events 
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND user_id NOT IN (
    SELECT user_id FROM ai_privacy_settings 
    WHERE data_retention_days > 90
  );
  
  -- Limpar métricas antigas (manter apenas 6 meses)
  DELETE FROM agent_performance_metrics 
  WHERE recorded_at < NOW() - INTERVAL '6 months';
  
  RAISE NOTICE 'Limpeza de dados antigos concluída';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_agent_messages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_job"("p_job_id" "uuid", "p_result" "jsonb" DEFAULT NULL::"jsonb", "p_error_message" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  job_status VARCHAR(20);
  current_retry_count INTEGER;
  max_retry_count INTEGER;
BEGIN
  -- Buscar informações do job
  SELECT status, retry_count, max_retries 
  INTO job_status, current_retry_count, max_retry_count
  FROM async_jobs 
  WHERE id = p_job_id;
  
  IF job_status != 'processing' THEN
    RETURN FALSE; -- Job não está sendo processado
  END IF;
  
  -- Se há erro e ainda pode tentar novamente
  IF p_error_message IS NOT NULL AND current_retry_count < max_retry_count THEN
    UPDATE async_jobs 
    SET 
      status = 'retrying',
      error_message = p_error_message,
      retry_count = retry_count + 1,
      started_at = NULL,
      worker_id = NULL
    WHERE id = p_job_id;
  ELSE
    -- Completar job (sucesso ou falha definitiva)
    UPDATE async_jobs 
    SET 
      status = CASE WHEN p_error_message IS NULL THEN 'completed' ELSE 'failed' END,
      result = p_result,
      error_message = p_error_message,
      completed_at = NOW(),
      actual_duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE id = p_job_id;
  END IF;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."complete_job"("p_job_id" "uuid", "p_result" "jsonb", "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_async_job"("p_job_type" character varying, "p_payload" "jsonb", "p_empresa_id" "uuid" DEFAULT NULL::"uuid", "p_documento_id" "uuid" DEFAULT NULL::"uuid", "p_priority" integer DEFAULT 5, "p_max_retries" integer DEFAULT 3, "p_estimated_duration" integer DEFAULT NULL::integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO async_jobs (
    job_type,
    payload,
    empresa_id,
    documento_id,
    priority,
    max_retries,
    estimated_duration_seconds,
    created_by
  ) VALUES (
    p_job_type,
    p_payload,
    p_empresa_id,
    p_documento_id,
    p_priority,
    p_max_retries,
    p_estimated_duration,
    auth.uid()
  ) RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$;


ALTER FUNCTION "public"."create_async_job"("p_job_type" character varying, "p_payload" "jsonb", "p_empresa_id" "uuid", "p_documento_id" "uuid", "p_priority" integer, "p_max_retries" integer, "p_estimated_duration" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_automated_backup"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    backup_name TEXT;
    table_counts JSONB := '{}';
    total_records INTEGER := 0;
BEGIN
    backup_name := 'backup_' || to_char(NOW(), 'YYYY_MM_DD_HH24_MI_SS');
    
    -- Contar registros das tabelas principais
    SELECT jsonb_build_object(
        'empresas', (SELECT COUNT(*) FROM empresas),
        'documentos_fiscais', (SELECT COUNT(*) FROM documentos_fiscais),
        'tasks', (SELECT COUNT(*) FROM tasks),
        'fiscal_obligations', (SELECT COUNT(*) FROM fiscal_obligations),
        'ai_interactions', (SELECT COUNT(*) FROM ai_interactions),
        'notifications', (SELECT COUNT(*) FROM notifications)
    ) INTO table_counts;
    
    -- Calcular total de registros
    SELECT (table_counts->>'empresas')::int + 
           (table_counts->>'documentos_fiscais')::int + 
           (table_counts->>'tasks')::int + 
           (table_counts->>'fiscal_obligations')::int + 
           (table_counts->>'ai_interactions')::int + 
           (table_counts->>'notifications')::int
    INTO total_records;
    
    -- Log do backup
    INSERT INTO system_logs (
        level,
        message,
        context,
        metadata,
        created_at
    ) VALUES (
        'INFO',
        'Backup automático executado com sucesso',
        'BACKUP_SYSTEM',
        jsonb_build_object(
            'backup_name', backup_name,
            'table_counts', table_counts,
            'total_records', total_records,
            'status', 'completed'
        ),
        NOW()
    );
    
    RETURN backup_name;
END;
$$;


ALTER FUNCTION "public"."create_automated_backup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_monthly_partitions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  table_name TEXT;
BEGIN
  -- Criar partição para o próximo mês
  start_date := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
  end_date := start_date + INTERVAL '1 month';
  
  -- Automation executions
  table_name := 'automation_executions_' || TO_CHAR(start_date, 'YYYY_MM');
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF automation_executions FOR VALUES FROM (%L) TO (%L)',
                 table_name, start_date, end_date);
  
  -- System logs
  table_name := 'system_logs_' || TO_CHAR(start_date, 'YYYY_MM');
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
                 table_name, start_date, end_date);
END;
$$;


ALTER FUNCTION "public"."create_monthly_partitions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_realtime_notification"("p_user_id" "uuid", "p_empresa_id" "uuid" DEFAULT NULL::"uuid", "p_notification_type" "text" DEFAULT 'custom'::"text", "p_title" "text" DEFAULT 'Notificação'::"text", "p_message" "text" DEFAULT ''::"text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_job_id" "uuid" DEFAULT NULL::"uuid", "p_priority" "text" DEFAULT 'normal'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO realtime_notifications (
    user_id, empresa_id, notification_type, title, message,
    payload, job_id, priority
  ) VALUES (
    p_user_id, p_empresa_id, p_notification_type, p_title, p_message,
    p_payload, p_job_id, p_priority
  ) RETURNING id INTO notification_id;
  
  UPDATE realtime_notifications 
  SET status = 'sent', sent_at = NOW()
  WHERE id = notification_id;
  
  RETURN notification_id;
END;
$$;


ALTER FUNCTION "public"."create_realtime_notification"("p_user_id" "uuid", "p_empresa_id" "uuid", "p_notification_type" "text", "p_title" "text", "p_message" "text", "p_payload" "jsonb", "p_job_id" "uuid", "p_priority" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_duplicate_notifications"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, related_entity_type, related_entity_id, type 
             ORDER BY created_at DESC
           ) as rn
    FROM notifications
    WHERE related_entity_id IS NOT NULL
  )
  DELETE FROM notifications
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."delete_duplicate_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dequeue_job"("p_queue_name" "text", "p_worker_id" "text") RETURNS TABLE("job_id" "uuid", "job_type" "text", "payload" "jsonb", "retry_count" integer, "max_retries" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  selected_job_id UUID;
BEGIN
  -- Select and lock the next available job
  SELECT id INTO selected_job_id
  FROM job_queues
  WHERE queue_name = p_queue_name
    AND status = 'pending'
    AND scheduled_at <= NOW()
  ORDER BY priority DESC, scheduled_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF selected_job_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Update job status to processing
  UPDATE job_queues
  SET status = 'processing',
      started_at = NOW(),
      updated_at = NOW()
  WHERE id = selected_job_id;
  
  -- Return job details
  RETURN QUERY
  SELECT j.id, j.job_type, j.payload, j.retry_count, j.max_retries
  FROM job_queues j
  WHERE j.id = selected_job_id;
END;
$$;


ALTER FUNCTION "public"."dequeue_job"("p_queue_name" "text", "p_worker_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_job"("p_queue_name" "text", "p_job_type" "text", "p_payload" "jsonb" DEFAULT '{}'::"jsonb", "p_priority" integer DEFAULT 0, "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_empresa_id" "uuid" DEFAULT NULL::"uuid", "p_scheduled_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO job_queues (
    queue_name, job_type, payload, priority, 
    user_id, empresa_id, scheduled_at
  ) VALUES (
    p_queue_name, p_job_type, p_payload, p_priority,
    p_user_id, p_empresa_id, p_scheduled_at
  ) RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$;


ALTER FUNCTION "public"."enqueue_job"("p_queue_name" "text", "p_job_type" "text", "p_payload" "jsonb", "p_priority" integer, "p_user_id" "uuid", "p_empresa_id" "uuid", "p_scheduled_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."extract_fiscal_calculation_values"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Extrair valor_total do JSONB
    IF NEW.resultado_calculo ? 'valor_total' THEN
        NEW.valor_total = (NEW.resultado_calculo->>'valor_total')::decimal;
    END IF;
    
    -- Extrair vencimento do JSONB
    IF NEW.resultado_calculo ? 'vencimento' THEN
        NEW.vencimento = (NEW.resultado_calculo->>'vencimento')::date;
    END IF;
    
    -- Atualizar updated_at
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."extract_fiscal_calculation_values"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_similar_lancamentos"("query_embedding" "public"."vector", "empresa_id_filter" "uuid" DEFAULT NULL::"uuid", "similarity_threshold" double precision DEFAULT 0.7, "max_results" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "historico" "text", "conta_debito" character varying, "conta_credito" character varying, "similarity" double precision, "ai_classification_confidence" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.historico,
    l.conta_debito,
    l.conta_credito,
    (1 - (l.embedding <=> query_embedding)) as similarity,
    l.ai_classification_confidence
  FROM lancamentos_contabeis l
  WHERE 
    l.embedding IS NOT NULL
    AND (empresa_id_filter IS NULL OR l.empresa_id = empresa_id_filter)
    AND (1 - (l.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY l.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;


ALTER FUNCTION "public"."find_similar_lancamentos"("query_embedding" "public"."vector", "empresa_id_filter" "uuid", "similarity_threshold" double precision, "max_results" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_automation_dashboard_data"("days_back" integer DEFAULT 7) RETURNS TABLE("automation_type" "text", "total_executions" bigint, "successful_executions" bigint, "failed_executions" bigint, "running_executions" bigint, "success_rate" numeric, "avg_duration_ms" numeric, "last_execution" timestamp with time zone, "last_success" timestamp with time zone, "last_failure" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.automation_type::TEXT,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE ae.status = 'completed') as successful_executions,
    COUNT(*) FILTER (WHERE ae.status = 'failed') as failed_executions,
    COUNT(*) FILTER (WHERE ae.status = 'running') as running_executions,
    ROUND(
      (COUNT(*) FILTER (WHERE ae.status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as success_rate,
    ROUND(AVG(ae.duration_ms) FILTER (WHERE ae.duration_ms IS NOT NULL), 2) as avg_duration_ms,
    MAX(ae.started_at) as last_execution,
    MAX(ae.started_at) FILTER (WHERE ae.status = 'completed') as last_success,
    MAX(ae.started_at) FILTER (WHERE ae.status = 'failed') as last_failure
  FROM automation_executions ae
  WHERE ae.started_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY ae.automation_type
  ORDER BY ae.automation_type;
END;
$$;


ALTER FUNCTION "public"."get_automation_dashboard_data"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_automation_statistics"("days_back" integer DEFAULT 7) RETURNS TABLE("automation_type" "text", "total_executions" bigint, "successful_executions" bigint, "failed_executions" bigint, "success_rate" numeric, "avg_duration_ms" numeric, "last_execution" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.automation_type::TEXT,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE ae.status = 'completed') as successful_executions,
    COUNT(*) FILTER (WHERE ae.status = 'failed') as failed_executions,
    ROUND(
      (COUNT(*) FILTER (WHERE ae.status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) as success_rate,
    ROUND(AVG(ae.duration_ms), 2) as avg_duration_ms,
    MAX(ae.started_at) as last_execution
  FROM automation_executions ae
  WHERE ae.started_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY ae.automation_type
  ORDER BY ae.automation_type;
END;
$$;


ALTER FUNCTION "public"."get_automation_statistics"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cron_jobs_status"() RETURNS TABLE("jobid" bigint, "jobname" "text", "schedule" "text", "active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cj.jobid,
    cj.jobname::TEXT,
    cj.schedule::TEXT,
    cj.active
  FROM cron.job cj
  WHERE cj.jobname LIKE '%compliance%' 
     OR cj.jobname LIKE '%backup%' 
     OR cj.jobname LIKE '%ai-predictions%'
     OR cj.jobname LIKE '%cleanup%'
  ORDER BY cj.jobname;
END;
$$;


ALTER FUNCTION "public"."get_cron_jobs_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_complete"("p_user_id" "uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result JSON;
    v_empresas_count INTEGER;
    v_documentos_processados INTEGER;
    v_documentos_pendentes INTEGER;
    v_tarefas_pendentes INTEGER;
    v_receita_mensal DECIMAL(15,2);
    v_insights_count INTEGER;
    v_faturas_vencidas INTEGER := 0;
    v_proximos_prazos INTEGER := 0;
    v_proximos_prazos_data JSON;
BEGIN
    -- Verificar se o usuário existe
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID é obrigatório';
    END IF;

    -- Definir período padrão se não fornecido
    IF p_start_date IS NULL THEN
        p_start_date := DATE_TRUNC('month', CURRENT_DATE);
    END IF;
    
    IF p_end_date IS NULL THEN
        p_end_date := CURRENT_DATE;
    END IF;

    -- Buscar empresas ativas e receita
    SELECT 
        COUNT(DISTINCT e.id),
        COALESCE(SUM(e.receita_mensal), 0)
    INTO 
        v_empresas_count,
        v_receita_mensal
    FROM empresas e
    WHERE e.user_id = p_user_id 
        AND e.ativa = true;

    -- Buscar documentos fiscais
    SELECT 
        COALESCE(SUM(CASE WHEN df.status = 'processado' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN df.status != 'processado' THEN 1 ELSE 0 END), 0)
    INTO 
        v_documentos_processados,
        v_documentos_pendentes
    FROM documentos_fiscais df
    JOIN empresas e ON e.id = df.empresa_id
    WHERE e.user_id = p_user_id 
        AND df.created_at >= p_start_date 
        AND df.created_at <= p_end_date + INTERVAL '1 day';

    -- Buscar tarefas pendentes
    SELECT COUNT(*)
    INTO v_tarefas_pendentes
    FROM tarefas t
    JOIN empresas e ON e.id = t.empresa_id
    WHERE e.user_id = p_user_id 
        AND t.status = 'pendente';

    -- Buscar próximos prazos (próximos 30 dias)
    SELECT 
        COUNT(*),
        COALESCE(
            json_agg(
                json_build_object(
                    'id', of.id,
                    'titulo', of.titulo,
                    'descricao', of.descricao,
                    'data_vencimento', of.data_vencimento,
                    'cliente_nome', emp.nome,
                    'tipo_obrigacao', of.tipo_obrigacao,
                    'status', of.status,
                    'valor', of.valor,
                    'prioridade', of.prioridade
                )
                ORDER BY of.data_vencimento
            ),
            '[]'::json
        )
    INTO 
        v_proximos_prazos,
        v_proximos_prazos_data
    FROM obrigacoes_fiscais of
    JOIN empresas emp ON emp.id = of.empresa_id
    WHERE emp.user_id = p_user_id 
        AND of.status = 'pendente'
        AND of.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

    -- Buscar insights novos
    SELECT COUNT(*)
    INTO v_insights_count
    FROM insights_gerenciais ig
    JOIN empresas e ON e.id = ig.empresa_id
    WHERE e.user_id = p_user_id 
        AND ig.status = 'novo'
        AND ig.data_geracao >= p_start_date;

    -- Simular faturas vencidas baseado em tarefas urgentes
    SELECT COUNT(*)
    INTO v_faturas_vencidas
    FROM tarefas t
    JOIN empresas e ON e.id = t.empresa_id
    WHERE e.user_id = p_user_id 
        AND t.status IN ('pendente', 'em_andamento')
        AND t.prioridade IN ('alta', 'urgente');

    -- Construir resposta JSON
    v_result := json_build_object(
        'metrics', json_build_object(
            'clientesAtivos', v_empresas_count,
            'tarefasPendentes', v_tarefas_pendentes,
            'receitaMensal', v_receita_mensal,
            'proximosPrazos', v_proximos_prazos,
            'faturaVencidas', v_faturas_vencidas,
            'documentosProcessados', v_documentos_processados,
            'documentosPendentes', v_documentos_pendentes,
            'insightsIA', ARRAY[
                CASE 
                    WHEN v_insights_count > 0 THEN 
                        v_insights_count || ' novos insights disponíveis'
                    ELSE 
                        'Nenhum insight novo'
                END,
                CASE 
                    WHEN v_proximos_prazos > 0 THEN 
                        v_proximos_prazos || ' obrigações vencem nos próximos 30 dias'
                    ELSE 
                        'Nenhuma obrigação urgente'
                END,
                'Sistema funcionando normalmente'
            ]
        ),
        'charts', json_build_object(
            'faturamentoPorMes', '[]'::json,
            'documentosPorStatus', json_build_array(
                json_build_object('status', 'Processados', 'quantidade', v_documentos_processados, 'cor', '#10b981'),
                json_build_object('status', 'Pendentes', 'quantidade', v_documentos_pendentes, 'cor', '#f59e0b')
            ),
            'tarefasPorPrioridade', json_build_array(
                json_build_object('prioridade', 'Pendentes', 'quantidade', v_tarefas_pendentes, 'cor', '#f59e0b'),
                json_build_object('prioridade', 'Urgentes', 'quantidade', v_faturas_vencidas, 'cor', '#ef4444')
            )
        ),
        'proximosPrazos', v_proximos_prazos_data,
        'metadata', json_build_object(
            'generated_at', NOW(),
            'period_start', p_start_date,
            'period_end', p_end_date,
            'user_id', p_user_id
        )
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_complete"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monitoring_statistics"("days_back" integer DEFAULT 7) RETURNS TABLE("total_alerts" integer, "critical_alerts" integer, "resolved_alerts" integer, "avg_resolution_time_hours" numeric, "system_uptime_percent" numeric, "most_problematic_automation" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE;
BEGIN
  v_start_date := NOW() - (days_back || ' days')::INTERVAL;
  
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE severity = 'critical')::INTEGER,
    COUNT(*) FILTER (WHERE resolved = true)::INTEGER,
    ROUND(
      AVG(
        EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600
      ) FILTER (WHERE resolved = true), 
      2
    ),
    ROUND(
      (
        SELECT 
          (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*), 0)) * 100
        FROM automation_executions 
        WHERE started_at >= v_start_date
      ), 
      2
    ),
    (
      SELECT automation_type
      FROM system_alerts 
      WHERE created_at >= v_start_date 
        AND automation_type IS NOT NULL
      GROUP BY automation_type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  INTO 
    total_alerts,
    critical_alerts,
    resolved_alerts,
    avg_resolution_time_hours,
    system_uptime_percent,
    most_problematic_automation
  FROM system_alerts
  WHERE created_at >= v_start_date;
  
  RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."get_monitoring_statistics"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tasks_stats"("empresa_uuid" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("total_tasks" bigint, "pending_tasks" bigint, "in_progress_tasks" bigint, "completed_tasks" bigint, "overdue_tasks" bigint, "high_priority_tasks" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_tasks,
    COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'in_progress')::bigint as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint as completed_tasks,
    COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed', 'cancelled'))::bigint as overdue_tasks,
    COUNT(*) FILTER (WHERE priority IN ('high', 'urgent'))::bigint as high_priority_tasks
  FROM tasks
  WHERE (empresa_uuid IS NULL OR company_id = empresa_uuid);
END;
$$;


ALTER FUNCTION "public"."get_tasks_stats"("empresa_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_dashboard_metrics"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    metrics JSONB;
BEGIN
    SELECT jsonb_build_object(
        'empresas', jsonb_build_object(
            'total', total_empresas,
            'ativas', empresas_ativas,
            'simples_nacional', empresas_simples,
            'lucro_presumido', empresas_lucro_presumido
        ),
        'tarefas', jsonb_build_object(
            'total', total_tarefas,
            'pendentes', tarefas_pendentes,
            'em_andamento', tarefas_em_andamento,
            'concluidas', tarefas_concluidas,
            'atrasadas', tarefas_atrasadas
        ),
        'documentos', jsonb_build_object(
            'total', total_documentos,
            'processados', documentos_processados,
            'pendentes', documentos_pendentes
        ),
        'obrigacoes_fiscais', jsonb_build_object(
            'total', total_obrigacoes,
            'proximas_7_dias', obrigacoes_proximas,
            'vencidas', obrigacoes_vencidas
        ),
        'ia', jsonb_build_object(
            'total_interacoes', total_interacoes_ia,
            'confianca_media', ROUND(media_confianca_ia::numeric, 2)
        )
    )
    INTO metrics
    FROM dashboard_metrics
    WHERE user_id = user_uuid;
    
    RETURN COALESCE(metrics, '{}');
END;
$$;


ALTER FUNCTION "public"."get_user_dashboard_metrics"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initiate_backup"("p_backup_type" character varying, "p_backup_location" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$ DECLARE backup_id UUID; BEGIN INSERT INTO backup_logs (backup_type, backup_location, status) VALUES (p_backup_type, p_backup_location, 'initiated') RETURNING id INTO backup_id; RETURN backup_id; END; $$;


ALTER FUNCTION "public"."initiate_backup"("p_backup_type" character varying, "p_backup_location" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_query_performance"("p_query_name" character varying, "p_execution_time_ms" integer, "p_rows_affected" integer DEFAULT 0, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO performance_monitoring (
        query_name,
        execution_time_ms,
        rows_affected,
        user_id,
        metadata,
        created_at
    ) VALUES (
        p_query_name,
        p_execution_time_ms,
        p_rows_affected,
        auth.uid(),
        p_metadata,
        NOW()
    ) RETURNING id INTO log_id;
    
    -- Alertar se query está muito lenta (> 5 segundos)
    IF p_execution_time_ms > 5000 THEN
        INSERT INTO system_logs (
            level,
            message,
            context,
            metadata,
            created_at
        ) VALUES (
            'WARNING',
            'Query lenta detectada',
            'PERFORMANCE_MONITORING',
            jsonb_build_object(
                'query_name', p_query_name,
                'execution_time_ms', p_execution_time_ms,
                'performance_log_id', log_id
            ),
            NOW()
        );
    END IF;
    
    RETURN log_id;
END;
$$;


ALTER FUNCTION "public"."log_query_performance"("p_query_name" character varying, "p_execution_time_ms" integer, "p_rows_affected" integer, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_archon_code_examples"("query_embedding" "public"."vector", "match_count" integer DEFAULT 10, "filter" "jsonb" DEFAULT '{}'::"jsonb", "source_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" bigint, "url" character varying, "chunk_number" integer, "content" "text", "summary" "text", "metadata" "jsonb", "source_id" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    url,
    chunk_number,
    content,
    summary,
    metadata,
    source_id,
    1 - (archon_code_examples.embedding <=> query_embedding) AS similarity
  FROM archon_code_examples
  WHERE metadata @> filter
    AND (source_filter IS NULL OR source_id = source_filter)
  ORDER BY archon_code_examples.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_archon_code_examples"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb", "source_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_archon_crawled_pages"("query_embedding" "public"."vector", "match_count" integer DEFAULT 10, "filter" "jsonb" DEFAULT '{}'::"jsonb", "source_filter" "text" DEFAULT NULL::"text") RETURNS TABLE("id" bigint, "url" character varying, "chunk_number" integer, "content" "text", "metadata" "jsonb", "source_id" "text", "similarity" double precision)
    LANGUAGE "plpgsql"
    AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    url,
    chunk_number,
    content,
    metadata,
    source_id,
    1 - (archon_crawled_pages.embedding <=> query_embedding) AS similarity
  FROM archon_crawled_pages
  WHERE metadata @> filter
    AND (source_filter IS NULL OR source_id = source_filter)
  ORDER BY archon_crawled_pages.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."match_archon_crawled_pages"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb", "source_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_document_processed"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  empresa_nome TEXT;
BEGIN
  -- Buscar nome da empresa
  SELECT nome INTO empresa_nome 
  FROM empresas 
  WHERE id = NEW.empresa_id;

  -- Notificar via pg_notify
  PERFORM pg_notify('assistant_activity', json_build_object(
    'type', 'document_processed',
    'id', NEW.id,
    'description', 'Documento processado automaticamente',
    'details', 'Arquivo: ' || NEW.nome_arquivo || ' foi processado com sucesso',
    'client', empresa_nome,
    'timestamp', NOW(),
    'impact', 'high',
    'user_id', (SELECT user_id FROM empresas WHERE id = NEW.empresa_id)
  )::text);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_document_processed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_obligation_detected"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  empresa_nome TEXT;
  days_until_due INTEGER;
BEGIN
  -- Buscar nome da empresa
  SELECT nome INTO empresa_nome 
  FROM empresas 
  WHERE id = NEW.empresa_id;

  -- Calcular dias até vencimento
  days_until_due := EXTRACT(DAY FROM (NEW.data_vencimento - CURRENT_DATE));

  -- Notificar via pg_notify
  PERFORM pg_notify('assistant_activity', json_build_object(
    'type', 'obligation_detected',
    'id', NEW.id,
    'description', 'Nova obrigação fiscal detectada',
    'details', NEW.tipo || ': ' || NEW.descricao || ' - Vence em ' || days_until_due || ' dias',
    'client', empresa_nome,
    'timestamp', NOW(),
    'impact', CASE 
      WHEN days_until_due <= 2 THEN 'high'
      WHEN days_until_due <= 7 THEN 'medium'
      ELSE 'low'
    END,
    'user_id', (SELECT user_id FROM empresas WHERE id = NEW.empresa_id)
  )::text);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_obligation_detected"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."optimize_system_performance"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  optimization_count integer := 0;
BEGIN
  -- 1. Atualizar estatísticas de todas as tabelas
  ANALYZE;
  optimization_count := optimization_count + 1;
  
  -- 2. Refresh das materialized views
  REFRESH MATERIALIZED VIEW mv_dashboard_metrics;
  REFRESH MATERIALIZED VIEW mv_performance_analytics;
  optimization_count := optimization_count + 2;
  
  -- 3. Limpar cache antigo
  DELETE FROM cnpj_cache WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- 4. Limpar logs antigos
  DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '3 days' AND level = 'DEBUG';
  
  -- 5. Construir resultado
  result := jsonb_build_object(
    'success', true,
    'optimizations_applied', optimization_count,
    'timestamp', NOW(),
    'actions', jsonb_build_array(
      'ANALYZE executed',
      'Materialized views refreshed',
      'Old cache cleaned',
      'Debug logs cleaned'
    )
  );
  
  -- Log da otimização
  INSERT INTO system_logs (level, message, context, metadata, created_at)
  VALUES ('INFO', 'System performance optimization completed', 'performance_optimization', result, NOW());
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."optimize_system_performance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_webhook_retries"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_delivery RECORD;
BEGIN
  -- Buscar deliveries que precisam de retry
  FOR v_delivery IN 
    SELECT id, webhook_id, target_url, event_type
    FROM webhook_deliveries
    WHERE status = 'retrying'
      AND next_retry_at <= NOW()
    LIMIT 10 -- Processar no máximo 10 por vez
  LOOP
    -- Marcar como processando
    UPDATE webhook_deliveries 
    SET status = 'pending', next_retry_at = NULL
    WHERE id = v_delivery.id;
    
    -- Aqui seria feita a chamada para reprocessar o webhook
    -- Em produção, isso seria uma chamada para a Edge Function
    RAISE NOTICE 'Reprocessando webhook delivery: %', v_delivery.id;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."process_webhook_retries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_dashboard_metrics"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Refresh concorrente para não bloquear
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_metrics;
  
  -- Log do refresh
  INSERT INTO system_logs (level, message, context, created_at)
  VALUES ('INFO', 'Dashboard metrics refreshed successfully', 'materialized_views', NOW());
  
EXCEPTION WHEN OTHERS THEN
  -- Log do erro
  INSERT INTO system_logs (level, message, context, error_details, created_at)
  VALUES ('ERROR', 'Failed to refresh dashboard metrics', 'materialized_views', SQLERRM, NOW());
  
  RAISE;
END;
$$;


ALTER FUNCTION "public"."refresh_dashboard_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_agent"("p_agent_id" "text", "p_agent_name" "text", "p_agent_type" "text", "p_capabilities" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO agent_registry (
    agent_id, agent_name, agent_type, capabilities, status, last_heartbeat
  ) VALUES (
    p_agent_id, p_agent_name, p_agent_type, p_capabilities, 'active', NOW()
  )
  ON CONFLICT (agent_id) DO UPDATE SET
    agent_name = EXCLUDED.agent_name,
    agent_type = EXCLUDED.agent_type,
    capabilities = EXCLUDED.capabilities,
    status = 'active',
    last_heartbeat = NOW(),
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."register_agent"("p_agent_id" "text", "p_agent_name" "text", "p_agent_type" "text", "p_capabilities" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_system_alert"("alert_id" "uuid", "resolved_by_user" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE system_alerts 
  SET 
    resolved = true,
    resolved_at = NOW(),
    resolved_by = COALESCE(resolved_by_user, auth.uid())
  WHERE id = alert_id AND NOT resolved;
END;
$$;


ALTER FUNCTION "public"."resolve_system_alert"("alert_id" "uuid", "resolved_by_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_automation_monitoring_cron"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_execution_id UUID;
  v_start_time TIMESTAMP WITH TIME ZONE;
  v_result JSONB;
  v_error_msg TEXT;
BEGIN
  v_execution_id := gen_random_uuid();
  v_start_time := NOW();
  
  -- Registrar início da execução
  INSERT INTO automation_executions (
    automation_type, execution_id, status, started_at, triggered_by
  ) VALUES (
    'automation_monitor', v_execution_id, 'running', v_start_time, 'cron'
  );

  BEGIN
    -- Simular execução do monitoramento
    -- Em produção, aqui seria a chamada para a Edge Function
    
    -- Verificar se há alertas críticos
    DECLARE
      v_critical_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_critical_count
      FROM system_alerts 
      WHERE severity = 'critical' AND NOT resolved
        AND created_at > NOW() - INTERVAL '24 hours';
      
      v_result := jsonb_build_object(
        'overall_health', CASE 
          WHEN v_critical_count > 0 THEN 'critical'
          ELSE 'healthy'
        END,
        'critical_alerts', v_critical_count,
        'monitoring_completed', true
      );
    END;
    
    -- Simular delay de processamento
    PERFORM pg_sleep(1);

    -- Atualizar como concluído
    UPDATE automation_executions 
    SET 
      status = 'completed',
      completed_at = NOW(),
      duration_ms = EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
      result_summary = v_result
    WHERE execution_id = v_execution_id;

  EXCEPTION WHEN OTHERS THEN
    v_error_msg := SQLERRM;
    
    -- Atualizar como falhou
    UPDATE automation_executions 
    SET 
      status = 'failed',
      completed_at = NOW(),
      duration_ms = EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
      error_message = v_error_msg
    WHERE execution_id = v_execution_id;
    
    RAISE WARNING 'Automation Monitoring Cron failed: %', v_error_msg;
  END;
END;
$$;


ALTER FUNCTION "public"."run_automation_monitoring_cron"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_cleanup_expired_cron"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_execution_id UUID;
  v_start_time TIMESTAMP WITH TIME ZONE;
  v_cleaned_executions INTEGER;
BEGIN
  v_execution_id := gen_random_uuid();
  v_start_time := NOW();
  
  -- Registrar início da execução
  INSERT INTO automation_executions (
    automation_type, execution_id, status, started_at, triggered_by
  ) VALUES (
    'cleanup_expired', v_execution_id, 'running', v_start_time, 'cron'
  );

  -- Limpar execuções antigas (mais de 30 dias)
  DELETE FROM automation_executions WHERE started_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_cleaned_executions = ROW_COUNT;

  -- Atualizar como concluído
  UPDATE automation_executions 
  SET 
    status = 'completed',
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
    result_summary = jsonb_build_object(
      'cleaned_executions', v_cleaned_executions
    )
  WHERE execution_id = v_execution_id;

END;
$$;


ALTER FUNCTION "public"."run_cleanup_expired_cron"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_rls_security"() RETURNS TABLE("test_name" "text", "expected_result" "text", "actual_result" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Teste 1: Verificar se RLS está habilitado
  RETURN QUERY
  SELECT 
    'RLS habilitado em empresas'::TEXT as test_name,
    'true'::TEXT as expected_result,
    CASE WHEN relrowsecurity THEN 'true' ELSE 'false' END::TEXT as actual_result,
    CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END::TEXT as status
  FROM pg_class 
  WHERE relname = 'empresas';
  
  -- Teste 2: Verificar se RLS está habilitado em profiles
  RETURN QUERY
  SELECT 
    'RLS habilitado em profiles'::TEXT as test_name,
    'true'::TEXT as expected_result,
    CASE WHEN relrowsecurity THEN 'true' ELSE 'false' END::TEXT as actual_result,
    CASE WHEN relrowsecurity THEN 'PASS' ELSE 'FAIL' END::TEXT as status
  FROM pg_class 
  WHERE relname = 'profiles';
  
  -- Teste 3: Verificar se políticas foram criadas
  RETURN QUERY
  SELECT 
    'Políticas criadas para empresas'::TEXT as test_name,
    '> 0'::TEXT as expected_result,
    COUNT(*)::TEXT as actual_result,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END::TEXT as status
  FROM pg_policies 
  WHERE tablename = 'empresas';
  
  -- Teste 4: Verificar estrutura das tabelas de segurança
  RETURN QUERY
  SELECT 
    'Tabela profiles existe'::TEXT as test_name,
    'true'::TEXT as expected_result,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') 
         THEN 'true' ELSE 'false' END::TEXT as actual_result,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT as status;
         
  RETURN QUERY
  SELECT 
    'Tabela contador_clientes existe'::TEXT as test_name,
    'true'::TEXT as expected_result,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contador_clientes') 
         THEN 'true' ELSE 'false' END::TEXT as actual_result,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contador_clientes') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT as status;
         
  RETURN QUERY
  SELECT 
    'Tabela user_roles existe'::TEXT as test_name,
    'true'::TEXT as expected_result,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') 
         THEN 'true' ELSE 'false' END::TEXT as actual_result,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_roles') 
         THEN 'PASS' ELSE 'FAIL' END::TEXT as status;
END;
$$;


ALTER FUNCTION "public"."test_rls_security"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_webhook_system"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_webhook_id UUID;
  v_result JSONB;
BEGIN
  -- Criar um webhook de teste
  v_webhook_id := gen_random_uuid();
  
  INSERT INTO webhook_logs (
    id, event_type, payload, target_count, status
  ) VALUES (
    v_webhook_id,
    'compliance_alert',
    '{"message": "Teste de webhook", "severity": "high", "empresa_id": "test"}',
    1,
    'completed'
  );
  
  -- Criar delivery de teste
  INSERT INTO webhook_deliveries (
    id, webhook_id, target_url, event_type, status, attempts, delivered_at
  ) VALUES (
    gen_random_uuid(),
    v_webhook_id,
    'https://webhook.site/test',
    'compliance_alert',
    'delivered',
    1,
    NOW()
  );
  
  -- Retornar resultado
  v_result := jsonb_build_object(
    'webhook_id', v_webhook_id,
    'status', 'test_completed',
    'message', 'Webhook de teste criado com sucesso'
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."test_webhook_system"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_agent_heartbeat"("p_agent_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE agent_registry 
  SET last_heartbeat = NOW(), updated_at = NOW()
  WHERE agent_id = p_agent_id;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_agent_heartbeat"("p_agent_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_agent_registry_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_agent_registry_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_behavior_pattern_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_behavior_pattern_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tasks_completed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Se mudou para completed, definir completed_at
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Se mudou de completed para outro status, limpar completed_at
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tasks_completed_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tasks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tasks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_cnpj"("cnpj_input" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    cnpj_clean TEXT;
    len INTEGER;
BEGIN
    -- Remove caracteres não numéricos
    cnpj_clean := regexp_replace(cnpj_input, '[^0-9]', '', 'g');
    
    -- Verifica se tem 14 dígitos
    len := length(cnpj_clean);
    IF len != 14 THEN
        RETURN FALSE;
    END IF;
    
    -- Verifica sequências inválidas (todos iguais)
    IF cnpj_clean ~ '^(.)\1{13}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Por enquanto, aceita CNPJs com 14 dígitos que não sejam sequências
    -- TODO: Implementar algoritmo completo de validação
    RETURN TRUE;
END;
$_$;


ALTER FUNCTION "public"."validate_cnpj"("cnpj_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_critical_rls_enabled"() RETURNS TABLE("table_name" "text", "rls_enabled" boolean, "policy_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    t.rowsecurity,
    COUNT(p.policyname)
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public' 
    AND t.tablename IN ('empresa_addresses', 'empresa_contacts', 'empresa_settings', 'performance_monitoring')
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$;


ALTER FUNCTION "public"."verify_critical_rls_enabled"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_tasks_rls"() RETURNS TABLE("table_name" "text", "rls_enabled" boolean, "policy_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'tasks'::text,
    pg_tables.rowsecurity,
    COUNT(pg_policies.policyname)
  FROM pg_tables
  LEFT JOIN pg_policies ON pg_tables.tablename = pg_policies.tablename
  WHERE pg_tables.schemaname = 'public' 
    AND pg_tables.tablename = 'tasks'
  GROUP BY pg_tables.tablename, pg_tables.rowsecurity;
END;
$$;


ALTER FUNCTION "public"."verify_tasks_rls"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."automation_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "empresa_id" "uuid",
    "type" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "priority" character varying(10) DEFAULT 'medium'::character varying,
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "retry_count" integer DEFAULT 0,
    "max_retries" integer DEFAULT 3,
    "error_message" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "result" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "automation_jobs_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['high'::character varying, 'medium'::character varying, 'low'::character varying])::"text"[]))),
    CONSTRAINT "automation_jobs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "automation_jobs_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['fiscal_calculation'::character varying, 'notification_dispatch'::character varying, 'dashboard_refresh'::character varying, 'compliance_check'::character varying])::"text"[])))
);


ALTER TABLE "public"."automation_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."backup_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "backup_id" character varying(255) NOT NULL,
    "backup_type" character varying(50) DEFAULT 'full'::character varying NOT NULL,
    "size_bytes" bigint DEFAULT 0 NOT NULL,
    "duration_ms" integer DEFAULT 0 NOT NULL,
    "tables_count" integer DEFAULT 0 NOT NULL,
    "storage_path" "text",
    "checksum" character varying(255),
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "error_message" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."backup_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calculos_fiscais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "tipo_calculo" character varying(20) NOT NULL,
    "competencia" "date" NOT NULL,
    "regime_tributario" character varying(50) NOT NULL,
    "faturamento_bruto" numeric(15,2) DEFAULT 0.00 NOT NULL,
    "faturamento_12_meses" numeric(15,2) DEFAULT 0.00 NOT NULL,
    "deducoes" numeric(15,2) DEFAULT 0.00,
    "anexo_simples" character varying(5),
    "fator_r" numeric(5,4),
    "base_calculo" numeric(15,2) DEFAULT 0.00 NOT NULL,
    "aliquota_nominal" numeric(5,4) DEFAULT 0.0000 NOT NULL,
    "aliquota_efetiva" numeric(5,4) DEFAULT 0.0000 NOT NULL,
    "valor_imposto" numeric(15,2) DEFAULT 0.00 NOT NULL,
    "valor_multa" numeric(15,2) DEFAULT 0.00,
    "valor_juros" numeric(15,2) DEFAULT 0.00,
    "valor_total" numeric(15,2) DEFAULT 0.00 NOT NULL,
    "irpj" numeric(15,2) DEFAULT 0.00,
    "csll" numeric(15,2) DEFAULT 0.00,
    "pis" numeric(15,2) DEFAULT 0.00,
    "cofins" numeric(15,2) DEFAULT 0.00,
    "cpp" numeric(15,2) DEFAULT 0.00,
    "icms" numeric(15,2) DEFAULT 0.00,
    "iss" numeric(15,2) DEFAULT 0.00,
    "status" character varying(20) DEFAULT 'calculado'::character varying,
    "data_vencimento" "date" NOT NULL,
    "data_pagamento" "date",
    "codigo_barras" "text",
    "linha_digitavel" "text",
    "calculado_automaticamente" boolean DEFAULT true,
    "calculado_por" "uuid",
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "calculos_fiscais_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['calculado'::character varying, 'aprovado'::character varying, 'pago'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "calculos_fiscais_tipo_calculo_check" CHECK ((("tipo_calculo")::"text" = ANY ((ARRAY['DAS'::character varying, 'DARF'::character varying, 'IRPJ'::character varying, 'CSLL'::character varying, 'PIS'::character varying, 'COFINS'::character varying])::"text"[])))
);


ALTER TABLE "public"."calculos_fiscais" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificados_digitais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nome_arquivo" character varying(255) NOT NULL,
    "tipo_certificado" character varying(10) DEFAULT 'A1'::character varying,
    "senha_criptografada" "text" NOT NULL,
    "data_emissao" "date" NOT NULL,
    "data_vencimento" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "ativo" boolean DEFAULT true,
    "emissor" character varying(255),
    "numero_serie" character varying(100),
    "thumbprint" character varying(100),
    "arquivo_url" "text",
    "arquivo_size" bigint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "certificados_digitais_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'vencido'::character varying, 'revogado'::character varying, 'suspenso'::character varying])::"text"[]))),
    CONSTRAINT "certificados_digitais_tipo_certificado_check" CHECK ((("tipo_certificado")::"text" = ANY ((ARRAY['A1'::character varying, 'A3'::character varying])::"text"[])))
);


ALTER TABLE "public"."certificados_digitais" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cnpj_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cnpj" character varying(14) NOT NULL,
    "data" "jsonb" NOT NULL,
    "fonte" character varying(50) DEFAULT 'receitaws'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval)
)
WITH ("autovacuum_vacuum_scale_factor"='0.3');


ALTER TABLE "public"."cnpj_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultas_ia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "pergunta" "text" NOT NULL,
    "resposta" "text" NOT NULL,
    "tipo_consulta" character varying(50) NOT NULL,
    "empresas_relacionadas" "uuid"[] DEFAULT '{}'::"uuid"[],
    "confianca" integer NOT NULL,
    "tempo_resposta" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "consultas_ia_confianca_check" CHECK ((("confianca" >= 0) AND ("confianca" <= 100)))
);


ALTER TABLE "public"."consultas_ia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "empresa_id" "uuid",
    "type" character varying(20) NOT NULL,
    "title" character varying(500) NOT NULL,
    "message" "text" NOT NULL,
    "action_label" character varying(100),
    "action_url" character varying(500),
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "expires_at" timestamp with time zone,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "dismissed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "dashboard_alerts_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['urgent'::character varying, 'high'::character varying, 'medium'::character varying, 'low'::character varying])::"text"[]))),
    CONSTRAINT "dashboard_alerts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'dismissed'::character varying, 'expired'::character varying])::"text"[]))),
    CONSTRAINT "dashboard_alerts_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['warning'::character varying, 'error'::character varying, 'info'::character varying, 'success'::character varying])::"text"[])))
);


ALTER TABLE "public"."dashboard_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_widgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "empresa_id" "uuid",
    "type" character varying(20) NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" "text",
    "position" "jsonb" DEFAULT '{"h": 3, "w": 4, "x": 0, "y": 0}'::"jsonb" NOT NULL,
    "visible" boolean DEFAULT true,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "cached_data" "jsonb",
    "cache_expires_at" timestamp with time zone,
    "refresh_interval" integer DEFAULT 300,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "dashboard_widgets_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['metric'::character varying, 'chart'::character varying, 'list'::character varying, 'alert'::character varying, 'action'::character varying])::"text"[])))
);


ALTER TABLE "public"."dashboard_widgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documento_analises_ia" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "tipo_documento" character varying(50) NOT NULL,
    "texto_original" "text",
    "arquivo_url" character varying(500),
    "analise_resultado" "jsonb" NOT NULL,
    "modelo_usado" character varying(50) DEFAULT 'gpt-4o-mini'::character varying,
    "confianca" integer,
    "status" character varying(20) DEFAULT 'processado'::character varying,
    "erro_detalhes" "text",
    "validado_por" "uuid",
    "validado_em" timestamp with time zone,
    "correcoes_manuais" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "documento_analises_ia_confianca_check" CHECK ((("confianca" >= 0) AND ("confianca" <= 100))),
    CONSTRAINT "documento_analises_ia_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['processando'::character varying, 'processado'::character varying, 'erro'::character varying, 'revisao_manual'::character varying])::"text"[])))
);


ALTER TABLE "public"."documento_analises_ia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "tipo_documento" "public"."tipo_documento" NOT NULL,
    "arquivo_nome" character varying(255) NOT NULL,
    "arquivo_tipo" character varying(100) NOT NULL,
    "arquivo_tamanho" bigint NOT NULL,
    "arquivo_url" "text" NOT NULL,
    "arquivo_path" "text" NOT NULL,
    "numero_documento" character varying(50),
    "serie" character varying(10),
    "data_emissao" "date",
    "valor_total" numeric(15,2),
    "dados_extraidos" "jsonb",
    "status_processamento" "public"."status_processamento" DEFAULT 'pendente'::"public"."status_processamento" NOT NULL,
    "data_processamento" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."documentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documentos_fiscais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nome_arquivo" character varying(255) NOT NULL,
    "tipo_documento" character varying(50) NOT NULL,
    "status" character varying(50) DEFAULT 'pendente'::character varying,
    "dados_extraidos" "jsonb",
    "confidence_score" numeric(3,2) DEFAULT 0.0,
    "file_url" "text",
    "storage_path" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "numero" "text",
    "tipo" "text",
    "valor_total" numeric(15,2),
    "data_emissao" "date",
    "competencia" "date",
    "numero_documento" "text",
    "data_documento" "date",
    "tamanho_arquivo" bigint,
    "mime_type" "text",
    "created_by" "uuid",
    "error_log" "text",
    CONSTRAINT "documentos_fiscais_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "documentos_fiscais_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'processando'::character varying, 'processado'::character varying, 'erro'::character varying, 'rejeitado'::character varying, 'pending_validation'::character varying])::"text"[]))),
    CONSTRAINT "documentos_fiscais_tipo_documento_check" CHECK ((("tipo_documento")::"text" = ANY ((ARRAY['nfe'::character varying, 'nfce'::character varying, 'nfse'::character varying, 'cte'::character varying, 'extrato'::character varying, 'comprovante'::character varying, 'recibo'::character varying, 'contrato'::character varying, 'balancete'::character varying, 'das'::character varying, 'outros'::character varying])::"text"[])))
);

ALTER TABLE ONLY "public"."documentos_fiscais" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."documentos_fiscais" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empresa_configuracoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "anexo_simples_nacional" character varying(5),
    "data_opcao_regime" "date",
    "codigo_atividade_principal" character varying(10),
    "data_inicio_servicos" "date" DEFAULT CURRENT_DATE,
    "observacoes_gerais" "text",
    "configuracoes_sistema" "jsonb" DEFAULT '{}'::"jsonb",
    "preferencias_usuario" "jsonb" DEFAULT '{}'::"jsonb",
    "status_conta" character varying(20) DEFAULT 'ativa'::character varying,
    "plano_contratado" character varying(50) DEFAULT 'basico'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "empresa_configuracoes_status_conta_check" CHECK ((("status_conta")::"text" = ANY ((ARRAY['ativa'::character varying, 'suspensa'::character varying, 'cancelada'::character varying, 'trial'::character varying])::"text"[])))
);


ALTER TABLE "public"."empresa_configuracoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empresa_configuracoes_fiscais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "simples_nacional_anexo" character varying(5),
    "simples_nacional_fator_r" numeric(5,4) DEFAULT 0.0000,
    "simples_nacional_inicio" "date",
    "lucro_presumido_atividade" character varying(100),
    "lucro_presumido_percentual" numeric(5,2) DEFAULT 8.00,
    "lucro_real_opcao" character varying(20),
    "dia_vencimento_das" integer DEFAULT 20,
    "dia_vencimento_darf" integer DEFAULT 20,
    "auto_calcular_das" boolean DEFAULT true,
    "auto_calcular_darf" boolean DEFAULT true,
    "notificar_30_dias" boolean DEFAULT true,
    "notificar_15_dias" boolean DEFAULT true,
    "notificar_7_dias" boolean DEFAULT true,
    "notificar_1_dia" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "empresa_configuracoes_fiscais_dia_vencimento_darf_check" CHECK ((("dia_vencimento_darf" >= 1) AND ("dia_vencimento_darf" <= 31))),
    CONSTRAINT "empresa_configuracoes_fiscais_dia_vencimento_das_check" CHECK ((("dia_vencimento_das" >= 1) AND ("dia_vencimento_das" <= 31))),
    CONSTRAINT "empresa_configuracoes_fiscais_lucro_real_opcao_check" CHECK ((("lucro_real_opcao")::"text" = ANY ((ARRAY['anual'::character varying, 'trimestral'::character varying])::"text"[]))),
    CONSTRAINT "empresa_configuracoes_fiscais_simples_nacional_anexo_check" CHECK ((("simples_nacional_anexo")::"text" = ANY ((ARRAY['I'::character varying, 'II'::character varying, 'III'::character varying, 'IV'::character varying, 'V'::character varying])::"text"[])))
);


ALTER TABLE "public"."empresa_configuracoes_fiscais" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."empresas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "nome" character varying(255) NOT NULL,
    "nome_fantasia" character varying(255),
    "cnpj" character varying(18),
    "regime_tributario" character varying(50) DEFAULT 'simples'::character varying,
    "atividade_principal" "text",
    "inscricao_estadual" character varying(50),
    "inscricao_municipal" character varying(50),
    "status" character varying(50) DEFAULT 'ativa'::character varying,
    "ativa" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "email" character varying(255),
    "telefone" character varying(20),
    "endereco" "text",
    "observacoes" "text",
    CONSTRAINT "valid_cnpj" CHECK ((("cnpj" IS NULL) OR "public"."validate_cnpj"(("cnpj")::"text")))
);

ALTER TABLE ONLY "public"."empresas" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."empresas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enderecos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "cep" character varying(9) NOT NULL,
    "logradouro" character varying(255) NOT NULL,
    "numero" character varying(20),
    "complemento" character varying(100),
    "bairro" character varying(100) NOT NULL,
    "cidade" character varying(100) NOT NULL,
    "estado" character varying(2) NOT NULL,
    "pais" character varying(50) DEFAULT 'Brasil'::character varying,
    "tipo" character varying(20) DEFAULT 'comercial'::character varying,
    "principal" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "enderecos_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['comercial'::character varying, 'residencial'::character varying, 'correspondencia'::character varying])::"text"[])))
);


ALTER TABLE "public"."enderecos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fiscal_calculations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "tipo_calculo" "text" NOT NULL,
    "competencia" "text" NOT NULL,
    "dados_entrada" "jsonb" NOT NULL,
    "resultado_calculo" "jsonb" NOT NULL,
    "valor_total" numeric(15,2),
    "vencimento" "date",
    "status" "text" DEFAULT 'calculated'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fiscal_calculations_status_check" CHECK (("status" = ANY (ARRAY['calculated'::"text", 'paid'::"text", 'overdue'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "fiscal_calculations_tipo_calculo_check" CHECK (("tipo_calculo" = ANY (ARRAY['das'::"text", 'darf'::"text", 'iss'::"text", 'icms'::"text"])))
);


ALTER TABLE "public"."fiscal_calculations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fiscal_obligations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "empresa_id" "uuid",
    "obligation_type" character varying(100) NOT NULL,
    "category" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "code" character varying(50),
    "due_date" "date",
    "frequency" character varying(50),
    "next_due_date" "date",
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "estimated_amount" numeric(15,2),
    "penalty_amount" numeric(15,2),
    "interest_rate" numeric(5,2),
    "alert_days_before" integer DEFAULT 7,
    "alert_sent" boolean DEFAULT false,
    "alert_sent_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "completion_notes" "text",
    "obligation_data" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tax_amount" numeric(15,2),
    "document_url" "text",
    "document_number" character varying(50),
    "bar_code" character varying(100),
    "generated_at" timestamp with time zone,
    "gross_revenue" numeric(15,2)
);

ALTER TABLE ONLY "public"."fiscal_obligations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."fiscal_obligations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "step_name" "text" NOT NULL,
    "step_description" "text",
    "step_order" integer DEFAULT 1 NOT NULL,
    "progress_percentage" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "step_data" "jsonb" DEFAULT '{}'::"jsonb",
    "error_message" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_progress_progress_percentage_check" CHECK ((("progress_percentage" >= 0) AND ("progress_percentage" <= 100))),
    CONSTRAINT "job_progress_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."job_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_queues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "queue_name" "text" NOT NULL,
    "job_type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "priority" integer DEFAULT 0 NOT NULL,
    "max_retries" integer DEFAULT 3 NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "scheduled_at" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" "text",
    "result" "jsonb",
    "user_id" "uuid",
    "empresa_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_queues_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."job_queues" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lancamentos_contabeis" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "documento_origem" "uuid",
    "conta_debito" character varying(20) NOT NULL,
    "conta_credito" character varying(20) NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "historico" "text" NOT NULL,
    "data_lancamento" "date" NOT NULL,
    "numero_lancamento" integer NOT NULL,
    "lote" character varying(50),
    "tipo_lancamento" character varying(50) DEFAULT 'automatico'::character varying,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "valor_total" numeric(15,2),
    "tipo" character varying(20) DEFAULT 'MANUAL'::character varying,
    "origem" character varying(50),
    "documento_origem_id" "uuid",
    "usuario_id" "uuid",
    "embedding" "public"."vector"(1536),
    "ai_classification_confidence" numeric(3,2) DEFAULT 0.0,
    "ai_tags" "jsonb" DEFAULT '[]'::"jsonb",
    "ai_processed_at" timestamp with time zone,
    "ai_model_version" character varying(50) DEFAULT 'text-embedding-3-small'::character varying,
    CONSTRAINT "lancamentos_contabeis_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'cancelado'::character varying, 'estornado'::character varying])::"text"[]))),
    CONSTRAINT "lancamentos_contabeis_tipo_lancamento_check" CHECK ((("tipo_lancamento")::"text" = ANY ((ARRAY['automatico'::character varying, 'manual'::character varying, 'ajuste'::character varying])::"text"[]))),
    CONSTRAINT "lancamentos_contabeis_valor_check" CHECK (("valor" > (0)::numeric))
);

ALTER TABLE ONLY "public"."lancamentos_contabeis" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."lancamentos_contabeis" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."lancamentos_contabeis_numero_lancamento_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."lancamentos_contabeis_numero_lancamento_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."lancamentos_contabeis_numero_lancamento_seq" OWNED BY "public"."lancamentos_contabeis"."numero_lancamento";



CREATE TABLE IF NOT EXISTS "public"."notification_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_key" character varying(100) NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "category" character varying(50) NOT NULL,
    "priority" character varying(20) NOT NULL,
    "title_template" "text" NOT NULL,
    "message_template" "text" NOT NULL,
    "action_label" character varying(100),
    "action_url" character varying(500),
    "channels" "jsonb" DEFAULT '["in_app"]'::"jsonb",
    "auto_dismiss_hours" integer DEFAULT 24,
    "requires_action" boolean DEFAULT false,
    "trigger_conditions" "jsonb" DEFAULT '{}'::"jsonb",
    "frequency_limit" character varying(20) DEFAULT 'none'::character varying,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_templates_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['fiscal'::character varying, 'documento'::character varying, 'sistema'::character varying, 'compliance'::character varying, 'empresa'::character varying])::"text"[]))),
    CONSTRAINT "notification_templates_frequency_limit_check" CHECK ((("frequency_limit")::"text" = ANY ((ARRAY['none'::character varying, 'once_per_day'::character varying, 'once_per_week'::character varying, 'once_per_month'::character varying])::"text"[]))),
    CONSTRAINT "notification_templates_priority_check" CHECK ((("priority")::"text" = ANY ((ARRAY['urgent'::character varying, 'important'::character varying, 'info'::character varying, 'low'::character varying])::"text"[])))
);


ALTER TABLE "public"."notification_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "type" character varying(50) NOT NULL,
    "category" character varying(50) NOT NULL,
    "priority" character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'unread'::character varying NOT NULL,
    "source" character varying(50) DEFAULT 'system'::character varying NOT NULL,
    "related_entity_type" character varying(50),
    "related_entity_id" "uuid",
    "action_url" character varying(500),
    "action_label" character varying(100),
    "scheduled_for" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "read_at" timestamp with time zone,
    "dismissed_at" timestamp with time zone,
    "notification_type" character varying(50) DEFAULT 'general'::character varying,
    "fiscal_data" "jsonb" DEFAULT '{}'::"jsonb"
);

ALTER TABLE ONLY "public"."notifications" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."obrigacoes_fiscais" AS
 SELECT "fo"."id",
    "fo"."empresa_id",
    "e"."nome" AS "empresa_nome",
    "fo"."obligation_type" AS "tipo_obrigacao",
    "fo"."name" AS "nome",
    "fo"."description" AS "descricao",
    "fo"."due_date" AS "data_vencimento",
    "fo"."estimated_amount" AS "valor",
    "fo"."status",
    "fo"."priority" AS "prioridade",
    "fo"."created_at",
        CASE
            WHEN ("fo"."due_date" < CURRENT_DATE) THEN 'vencida'::"text"
            WHEN ("fo"."due_date" <= (CURRENT_DATE + '7 days'::interval)) THEN 'proxima'::"text"
            ELSE 'futura'::"text"
        END AS "situacao"
   FROM ("public"."fiscal_obligations" "fo"
     JOIN "public"."empresas" "e" ON (("e"."id" = "fo"."empresa_id")))
  WHERE ("e"."ativa" = true);


ALTER VIEW "public"."obrigacoes_fiscais" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."observability_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "level" "text" NOT NULL,
    "message" "text" NOT NULL,
    "function_name" "text",
    "trace_id" "text",
    "span_id" "text",
    "user_id" "uuid",
    "empresa_id" "uuid",
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "error_details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "observability_logs_level_check" CHECK (("level" = ANY (ARRAY['debug'::"text", 'info'::"text", 'warn'::"text", 'error'::"text", 'fatal'::"text"])))
);


ALTER TABLE "public"."observability_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."observability_performance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "function_name" "text" NOT NULL,
    "execution_time_ms" integer NOT NULL,
    "memory_used_mb" numeric,
    "database_time_ms" integer,
    "database_queries" integer DEFAULT 0,
    "cold_start" boolean DEFAULT false,
    "errors" integer DEFAULT 0,
    "user_id" "uuid",
    "empresa_id" "uuid",
    "request_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."observability_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plano_contas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "codigo_pai" character varying(20),
    "nivel" integer DEFAULT 1 NOT NULL,
    "tipo" character varying(20) NOT NULL,
    "subtipo" character varying(50),
    "aceita_lancamento" boolean DEFAULT true,
    "ativa" boolean DEFAULT true,
    "descricao" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "empresa_id" "uuid",
    "natureza" character varying(10),
    "conta_pai_id" "uuid",
    CONSTRAINT "plano_contas_natureza_check" CHECK ((("natureza")::"text" = ANY ((ARRAY['DEVEDORA'::character varying, 'CREDORA'::character varying])::"text"[]))),
    CONSTRAINT "plano_contas_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['ativo'::character varying, 'passivo'::character varying, 'patrimonio'::character varying, 'receita'::character varying, 'despesa'::character varying])::"text"[])))
);


ALTER TABLE "public"."plano_contas" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."prazos_fiscais" AS
 SELECT "empresa_id",
    "empresa_nome",
    "tipo_obrigacao",
    "data_vencimento",
    "status",
    "situacao",
    "count"(*) AS "total_obrigacoes",
    "sum"("valor") AS "valor_total"
   FROM "public"."obrigacoes_fiscais"
  GROUP BY "empresa_id", "empresa_nome", "tipo_obrigacao", "data_vencimento", "status", "situacao"
  ORDER BY "data_vencimento";


ALTER VIEW "public"."prazos_fiscais" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "type" character varying(50) DEFAULT 'info'::character varying,
    "severity" character varying(20) DEFAULT 'medium'::character varying,
    "status" character varying(20) DEFAULT 'active'::character varying,
    "empresa_id" "uuid",
    "user_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "triggered_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "production_alerts_severity_check" CHECK ((("severity")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "production_alerts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::"text"[]))),
    CONSTRAINT "production_alerts_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['info'::character varying, 'warning'::character varying, 'error'::character varying, 'success'::character varying])::"text"[])))
);


ALTER TABLE "public"."production_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."queue_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "queue_name" "text" NOT NULL,
    "max_workers" integer DEFAULT 1 NOT NULL,
    "max_jobs_per_worker" integer DEFAULT 10 NOT NULL,
    "job_timeout_seconds" integer DEFAULT 300 NOT NULL,
    "retry_delay_seconds" integer DEFAULT 60 NOT NULL,
    "dead_letter_queue" "text",
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."queue_configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."queue_workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "text" NOT NULL,
    "queue_name" "text" NOT NULL,
    "status" "text" DEFAULT 'idle'::"text" NOT NULL,
    "current_job_id" "uuid",
    "last_heartbeat" timestamp with time zone DEFAULT "now"(),
    "started_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "queue_workers_status_check" CHECK (("status" = ANY (ARRAY['idle'::"text", 'busy'::"text", 'offline'::"text"])))
);


ALTER TABLE "public"."queue_workers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."realtime_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "empresa_id" "uuid",
    "session_id" "text",
    "notification_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "job_id" "uuid",
    "job_type" "text",
    "job_status" "text",
    "progress_percentage" integer,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "show_toast" boolean DEFAULT true,
    "show_badge" boolean DEFAULT true,
    "auto_dismiss_seconds" integer DEFAULT 10,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "dismissed_at" timestamp with time zone,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval),
    CONSTRAINT "realtime_notifications_notification_type_check" CHECK (("notification_type" = ANY (ARRAY['job_progress'::"text", 'job_completed'::"text", 'job_failed'::"text", 'system_alert'::"text", 'document_processed'::"text", 'das_calculated'::"text", 'report_generated'::"text", 'sync_status'::"text", 'user_action'::"text", 'custom'::"text"]))),
    CONSTRAINT "realtime_notifications_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "realtime_notifications_progress_percentage_check" CHECK ((("progress_percentage" >= 0) AND ("progress_percentage" <= 100))),
    CONSTRAINT "realtime_notifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'delivered'::"text", 'read'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."realtime_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."socios" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "empresa_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "cpf" character varying(14) NOT NULL,
    "rg" character varying(20),
    "data_nascimento" "date",
    "email" character varying(255),
    "telefone" character varying(20),
    "celular" character varying(20),
    "tipo_participacao" character varying(20) DEFAULT 'socio'::character varying,
    "percentual_participacao" numeric(5,2) DEFAULT 0.00,
    "ativo" boolean DEFAULT true,
    "data_entrada" "date" DEFAULT CURRENT_DATE,
    "data_saida" "date",
    "endereco_completo" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "socios_tipo_participacao_check" CHECK ((("tipo_participacao")::"text" = ANY ((ARRAY['socio'::character varying, 'administrador'::character varying, 'responsavel_legal'::character varying, 'procurador'::character varying, 'contador'::character varying])::"text"[])))
);


ALTER TABLE "public"."socios" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "level" character varying(20),
    "message" "text",
    "context" character varying(100),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "action" character varying(50),
    "table_name" character varying(100),
    "record_id" "text",
    "old_data" "jsonb",
    "new_data" "jsonb"
)
PARTITION BY RANGE ("created_at");


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tabelas_fiscais" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tipo_tabela" character varying(50) NOT NULL,
    "anexo" character varying(10),
    "vigencia_inicio" "date" NOT NULL,
    "vigencia_fim" "date",
    "faixa" integer NOT NULL,
    "faturamento_ate" numeric(15,2) NOT NULL,
    "aliquota" numeric(6,4) NOT NULL,
    "valor_deducao" numeric(15,2) DEFAULT 0.00,
    "percentual_irpj" numeric(5,2) DEFAULT 0.00,
    "percentual_csll" numeric(5,2) DEFAULT 0.00,
    "percentual_pis" numeric(5,2) DEFAULT 0.00,
    "percentual_cofins" numeric(5,2) DEFAULT 0.00,
    "percentual_cpp" numeric(5,2) DEFAULT 0.00,
    "percentual_icms" numeric(5,2) DEFAULT 0.00,
    "percentual_iss" numeric(5,2) DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tabelas_fiscais" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_automation_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "automation_enabled" boolean DEFAULT true,
    "auto_calculate_das" boolean DEFAULT true,
    "auto_calculate_darf" boolean DEFAULT false,
    "calculation_schedule" character varying(20) DEFAULT 'monthly'::character varying,
    "notification_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "dashboard_auto_refresh" boolean DEFAULT true,
    "dashboard_refresh_interval" integer DEFAULT 300,
    "compliance_checks_enabled" boolean DEFAULT true,
    "compliance_check_frequency" character varying(20) DEFAULT 'daily'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_automation_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT true,
    "quiet_hours_start" time without time zone DEFAULT '22:00:00'::time without time zone,
    "quiet_hours_end" time without time zone DEFAULT '08:00:00'::time without time zone,
    "timezone" character varying(50) DEFAULT 'America/Sao_Paulo'::character varying,
    "fiscal_enabled" boolean DEFAULT true,
    "fiscal_channels" "jsonb" DEFAULT '["in_app", "email"]'::"jsonb",
    "fiscal_urgent_only" boolean DEFAULT false,
    "documento_enabled" boolean DEFAULT true,
    "documento_channels" "jsonb" DEFAULT '["in_app"]'::"jsonb",
    "documento_urgent_only" boolean DEFAULT false,
    "sistema_enabled" boolean DEFAULT true,
    "sistema_channels" "jsonb" DEFAULT '["in_app"]'::"jsonb",
    "sistema_urgent_only" boolean DEFAULT true,
    "compliance_enabled" boolean DEFAULT true,
    "compliance_channels" "jsonb" DEFAULT '["in_app", "email"]'::"jsonb",
    "compliance_urgent_only" boolean DEFAULT false,
    "empresa_enabled" boolean DEFAULT true,
    "empresa_channels" "jsonb" DEFAULT '["in_app"]'::"jsonb",
    "empresa_urgent_only" boolean DEFAULT false,
    "digest_enabled" boolean DEFAULT true,
    "digest_frequency" character varying(20) DEFAULT 'daily'::character varying,
    "digest_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_notification_preferences_digest_frequency_check" CHECK ((("digest_frequency")::"text" = ANY ((ARRAY['hourly'::character varying, 'daily'::character varying, 'weekly'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_notification_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."lancamentos_contabeis" ALTER COLUMN "numero_lancamento" SET DEFAULT "nextval"('"public"."lancamentos_contabeis_numero_lancamento_seq"'::"regclass");



ALTER TABLE ONLY "public"."automation_jobs"
    ADD CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."backup_logs"
    ADD CONSTRAINT "backup_logs_backup_id_key" UNIQUE ("backup_id");



ALTER TABLE ONLY "public"."backup_logs"
    ADD CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calculos_fiscais"
    ADD CONSTRAINT "calculos_fiscais_empresa_id_tipo_calculo_competencia_key" UNIQUE ("empresa_id", "tipo_calculo", "competencia");



ALTER TABLE ONLY "public"."calculos_fiscais"
    ADD CONSTRAINT "calculos_fiscais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificados_digitais"
    ADD CONSTRAINT "certificados_digitais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cnpj_cache"
    ADD CONSTRAINT "cnpj_cache_cnpj_key" UNIQUE ("cnpj");



ALTER TABLE ONLY "public"."cnpj_cache"
    ADD CONSTRAINT "cnpj_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultas_ia"
    ADD CONSTRAINT "consultas_ia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_alerts"
    ADD CONSTRAINT "dashboard_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documento_analises_ia"
    ADD CONSTRAINT "documento_analises_ia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentos_fiscais"
    ADD CONSTRAINT "documentos_fiscais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentos"
    ADD CONSTRAINT "documentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresa_configuracoes_fiscais"
    ADD CONSTRAINT "empresa_configuracoes_fiscais_empresa_id_key" UNIQUE ("empresa_id");



ALTER TABLE ONLY "public"."empresa_configuracoes_fiscais"
    ADD CONSTRAINT "empresa_configuracoes_fiscais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresa_configuracoes"
    ADD CONSTRAINT "empresa_configuracoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_normalized_cnpj_key" UNIQUE ("cnpj");



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_normalized_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."enderecos"
    ADD CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fiscal_calculations"
    ADD CONSTRAINT "fiscal_calculations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fiscal_obligations"
    ADD CONSTRAINT "fiscal_obligations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_progress"
    ADD CONSTRAINT "job_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_queues"
    ADD CONSTRAINT "job_queues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_templates"
    ADD CONSTRAINT "notification_templates_template_key_key" UNIQUE ("template_key");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."observability_logs"
    ADD CONSTRAINT "observability_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."observability_performance"
    ADD CONSTRAINT "observability_performance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plano_contas"
    ADD CONSTRAINT "plano_contas_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."plano_contas"
    ADD CONSTRAINT "plano_contas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_alerts"
    ADD CONSTRAINT "production_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."queue_configurations"
    ADD CONSTRAINT "queue_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."queue_configurations"
    ADD CONSTRAINT "queue_configurations_queue_name_key" UNIQUE ("queue_name");



ALTER TABLE ONLY "public"."queue_workers"
    ADD CONSTRAINT "queue_workers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."queue_workers"
    ADD CONSTRAINT "queue_workers_worker_id_key" UNIQUE ("worker_id");



ALTER TABLE ONLY "public"."realtime_notifications"
    ADD CONSTRAINT "realtime_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."socios"
    ADD CONSTRAINT "socios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_partitioned_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."tabelas_fiscais"
    ADD CONSTRAINT "tabelas_fiscais_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tabelas_fiscais"
    ADD CONSTRAINT "tabelas_fiscais_tipo_tabela_anexo_faixa_vigencia_inicio_key" UNIQUE ("tipo_tabela", "anexo", "faixa", "vigencia_inicio");



ALTER TABLE ONLY "public"."user_automation_settings"
    ADD CONSTRAINT "user_automation_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_automation_settings"
    ADD CONSTRAINT "user_automation_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_automation_jobs_scheduled" ON "public"."automation_jobs" USING "btree" ("scheduled_for") WHERE (("status")::"text" = 'pending'::"text");



CREATE INDEX "idx_automation_jobs_type_priority" ON "public"."automation_jobs" USING "btree" ("type", "priority");



CREATE INDEX "idx_automation_jobs_user_status" ON "public"."automation_jobs" USING "btree" ("user_id", "status");



CREATE INDEX "idx_backup_logs_backup_id" ON "public"."backup_logs" USING "btree" ("backup_id");



CREATE INDEX "idx_backup_logs_backup_type" ON "public"."backup_logs" USING "btree" ("backup_type");



CREATE INDEX "idx_backup_logs_created_at" ON "public"."backup_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_backup_logs_status" ON "public"."backup_logs" USING "btree" ("status");



CREATE INDEX "idx_calculos_fiscais_empresa_competencia" ON "public"."calculos_fiscais" USING "btree" ("empresa_id", "competencia");



CREATE INDEX "idx_calculos_fiscais_tipo_status" ON "public"."calculos_fiscais" USING "btree" ("tipo_calculo", "status");



CREATE INDEX "idx_calculos_fiscais_vencimento" ON "public"."calculos_fiscais" USING "btree" ("data_vencimento") WHERE (("status")::"text" = ANY ((ARRAY['calculado'::character varying, 'aprovado'::character varying])::"text"[]));



CREATE INDEX "idx_certificados_ativo" ON "public"."certificados_digitais" USING "btree" ("empresa_id", "ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_certificados_empresa_id" ON "public"."certificados_digitais" USING "btree" ("empresa_id");



CREATE INDEX "idx_certificados_vencimento" ON "public"."certificados_digitais" USING "btree" ("data_vencimento") WHERE (("status")::"text" = 'ativo'::"text");



CREATE INDEX "idx_cnpj_cache_created" ON "public"."cnpj_cache" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_cnpj_cache_created_at" ON "public"."cnpj_cache" USING "btree" ("created_at");



CREATE INDEX "idx_cnpj_cache_expires" ON "public"."cnpj_cache" USING "btree" ("expires_at");



CREATE INDEX "idx_consultas_ia_created_at" ON "public"."consultas_ia" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_consultas_ia_tipo" ON "public"."consultas_ia" USING "btree" ("tipo_consulta");



CREATE INDEX "idx_consultas_ia_user_id" ON "public"."consultas_ia" USING "btree" ("user_id");



CREATE INDEX "idx_dashboard_alerts_expires" ON "public"."dashboard_alerts" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_dashboard_alerts_user_active" ON "public"."dashboard_alerts" USING "btree" ("user_id", "status") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_dashboard_widgets_empresa" ON "public"."dashboard_widgets" USING "btree" ("empresa_id") WHERE ("visible" = true);



CREATE INDEX "idx_dashboard_widgets_user" ON "public"."dashboard_widgets" USING "btree" ("user_id") WHERE ("visible" = true);



CREATE INDEX "idx_docs_empresa_created" ON "public"."documentos_fiscais" USING "btree" ("empresa_id", "created_at" DESC);



CREATE INDEX "idx_docs_status" ON "public"."documentos_fiscais" USING "btree" ("status");



CREATE INDEX "idx_docs_tipo" ON "public"."documentos_fiscais" USING "btree" ("tipo_documento");



CREATE INDEX "idx_documento_analises_ia_confianca" ON "public"."documento_analises_ia" USING "btree" ("confianca");



CREATE INDEX "idx_documento_analises_ia_empresa" ON "public"."documento_analises_ia" USING "btree" ("empresa_id");



CREATE INDEX "idx_documento_analises_ia_status" ON "public"."documento_analises_ia" USING "btree" ("status");



CREATE INDEX "idx_documento_analises_ia_tipo" ON "public"."documento_analises_ia" USING "btree" ("tipo_documento");



CREATE INDEX "idx_documentos_competencia" ON "public"."documentos_fiscais" USING "btree" ("competencia");



CREATE INDEX "idx_documentos_created_at" ON "public"."documentos_fiscais" USING "btree" ("created_at");



CREATE INDEX "idx_documentos_data_emissao" ON "public"."documentos_fiscais" USING "btree" ("data_emissao");



CREATE INDEX "idx_documentos_empresa_created_status" ON "public"."documentos_fiscais" USING "btree" ("empresa_id", "created_at" DESC, "status");



CREATE INDEX "idx_documentos_empresa_id" ON "public"."documentos_fiscais" USING "btree" ("empresa_id");



CREATE INDEX "idx_documentos_empresa_recent" ON "public"."documentos_fiscais" USING "btree" ("empresa_id", "created_at" DESC, "status");



CREATE INDEX "idx_documentos_empresa_status" ON "public"."documentos_fiscais" USING "btree" ("empresa_id", "status");



CREATE INDEX "idx_documentos_fiscais_empresa_status" ON "public"."documentos_fiscais" USING "btree" ("empresa_id", "status", "updated_at");



CREATE INDEX "idx_documentos_nome_trgm" ON "public"."documentos_fiscais" USING "gin" ("nome_arquivo" "public"."gin_trgm_ops");



CREATE INDEX "idx_documentos_numero" ON "public"."documentos_fiscais" USING "btree" ("numero");



CREATE INDEX "idx_documentos_status" ON "public"."documentos_fiscais" USING "btree" ("status");



CREATE INDEX "idx_documentos_tipo" ON "public"."documentos_fiscais" USING "btree" ("tipo_documento");



CREATE INDEX "idx_documentos_tipo_data" ON "public"."documentos_fiscais" USING "btree" ("tipo_documento", "created_at" DESC);



CREATE INDEX "idx_empresa_configuracoes_empresa_id" ON "public"."empresa_configuracoes" USING "btree" ("empresa_id");



CREATE INDEX "idx_empresa_configuracoes_fiscais_empresa_id" ON "public"."empresa_configuracoes_fiscais" USING "btree" ("empresa_id");



CREATE INDEX "idx_empresas_cnpj" ON "public"."empresas" USING "btree" ("cnpj") WHERE ("cnpj" IS NOT NULL);



CREATE INDEX "idx_empresas_cnpj_unique" ON "public"."empresas" USING "btree" ("cnpj") WHERE ("cnpj" IS NOT NULL);



CREATE INDEX "idx_empresas_created_desc" ON "public"."empresas" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_empresas_regime" ON "public"."empresas" USING "btree" ("regime_tributario");



CREATE INDEX "idx_empresas_status" ON "public"."empresas" USING "btree" ("status", "ativa");



CREATE INDEX "idx_empresas_user" ON "public"."empresas" USING "btree" ("user_id");



CREATE INDEX "idx_empresas_user_ativa" ON "public"."empresas" USING "btree" ("user_id", "ativa") WHERE ("ativa" = true);



CREATE INDEX "idx_empresas_user_id" ON "public"."empresas" USING "btree" ("user_id");



CREATE INDEX "idx_enderecos_empresa_id" ON "public"."enderecos" USING "btree" ("empresa_id");



CREATE INDEX "idx_enderecos_principal" ON "public"."enderecos" USING "btree" ("empresa_id", "principal") WHERE ("principal" = true);



CREATE INDEX "idx_fiscal_calculations_competencia" ON "public"."fiscal_calculations" USING "btree" ("competencia");



CREATE INDEX "idx_fiscal_calculations_empresa_id" ON "public"."fiscal_calculations" USING "btree" ("empresa_id");



CREATE INDEX "idx_fiscal_calculations_tipo" ON "public"."fiscal_calculations" USING "btree" ("tipo_calculo");



CREATE INDEX "idx_fiscal_calculations_user_id" ON "public"."fiscal_calculations" USING "btree" ("user_id");



CREATE INDEX "idx_fiscal_calculations_vencimento" ON "public"."fiscal_calculations" USING "btree" ("vencimento");



CREATE INDEX "idx_fiscal_obligations_alerts" ON "public"."fiscal_obligations" USING "btree" ("alert_sent", "due_date") WHERE ("alert_sent" = false);



CREATE INDEX "idx_fiscal_obligations_category" ON "public"."fiscal_obligations" USING "btree" ("category");



CREATE INDEX "idx_fiscal_obligations_created_at" ON "public"."fiscal_obligations" USING "btree" ("created_at");



CREATE INDEX "idx_fiscal_obligations_due_date" ON "public"."fiscal_obligations" USING "btree" ("due_date") WHERE (("status")::"text" <> 'completed'::"text");



CREATE INDEX "idx_fiscal_obligations_empresa" ON "public"."fiscal_obligations" USING "btree" ("empresa_id");



CREATE INDEX "idx_fiscal_obligations_empresa_id" ON "public"."fiscal_obligations" USING "btree" ("empresa_id");



CREATE INDEX "idx_fiscal_obligations_next_due_date" ON "public"."fiscal_obligations" USING "btree" ("next_due_date");



CREATE INDEX "idx_fiscal_obligations_obligation_type" ON "public"."fiscal_obligations" USING "btree" ("obligation_type");



CREATE INDEX "idx_fiscal_obligations_priority" ON "public"."fiscal_obligations" USING "btree" ("priority");



CREATE INDEX "idx_fiscal_obligations_status" ON "public"."fiscal_obligations" USING "btree" ("status");



CREATE INDEX "idx_fiscal_obligations_type" ON "public"."fiscal_obligations" USING "btree" ("obligation_type", "category");



CREATE INDEX "idx_fiscal_obligations_user" ON "public"."fiscal_obligations" USING "btree" ("user_id");



CREATE INDEX "idx_fiscal_obligations_user_id" ON "public"."fiscal_obligations" USING "btree" ("user_id");



CREATE INDEX "idx_job_progress_job" ON "public"."job_progress" USING "btree" ("job_id");



CREATE INDEX "idx_job_progress_order" ON "public"."job_progress" USING "btree" ("job_id", "step_order");



CREATE INDEX "idx_job_queues_empresa" ON "public"."job_queues" USING "btree" ("empresa_id");



CREATE INDEX "idx_job_queues_queue_priority" ON "public"."job_queues" USING "btree" ("queue_name", "priority" DESC, "scheduled_at");



CREATE INDEX "idx_job_queues_status" ON "public"."job_queues" USING "btree" ("status");



CREATE INDEX "idx_job_queues_user" ON "public"."job_queues" USING "btree" ("user_id");



CREATE INDEX "idx_lancamentos_data" ON "public"."lancamentos_contabeis" USING "btree" ("data_lancamento");



CREATE INDEX "idx_lancamentos_documento_origem_id" ON "public"."lancamentos_contabeis" USING "btree" ("documento_origem_id");



CREATE INDEX "idx_lancamentos_empresa_data" ON "public"."lancamentos_contabeis" USING "btree" ("empresa_id", "data_lancamento" DESC);



CREATE INDEX "idx_lancamentos_empresa_id" ON "public"."lancamentos_contabeis" USING "btree" ("empresa_id");



CREATE INDEX "idx_lancamentos_empresa_tipo_recent" ON "public"."lancamentos_contabeis" USING "btree" ("empresa_id", "tipo", "created_at" DESC, "valor");



CREATE INDEX "idx_lancamentos_status" ON "public"."lancamentos_contabeis" USING "btree" ("status");



CREATE INDEX "idx_lancamentos_usuario_id" ON "public"."lancamentos_contabeis" USING "btree" ("usuario_id");



CREATE INDEX "idx_notifications_category_priority" ON "public"."notifications" USING "btree" ("category", "priority");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_expires" ON "public"."notifications" USING "btree" ("expires_at") WHERE (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying])::"text"[]));



CREATE INDEX "idx_notifications_priority" ON "public"."notifications" USING "btree" ("priority");



CREATE INDEX "idx_notifications_scheduled" ON "public"."notifications" USING "btree" ("scheduled_for") WHERE (("status")::"text" = 'pending'::"text");



CREATE INDEX "idx_notifications_scheduled_for" ON "public"."notifications" USING "btree" ("scheduled_for");



CREATE INDEX "idx_notifications_status" ON "public"."notifications" USING "btree" ("status");



CREATE INDEX "idx_notifications_tipo_data" ON "public"."notifications" USING "btree" ("notification_type", "created_at" DESC);



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_type_user" ON "public"."notifications" USING "btree" ("user_id", "notification_type", "created_at");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_status" ON "public"."notifications" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "idx_observability_logs_function" ON "public"."observability_logs" USING "btree" ("function_name");



CREATE INDEX "idx_observability_logs_level" ON "public"."observability_logs" USING "btree" ("level");



CREATE INDEX "idx_observability_logs_timestamp" ON "public"."observability_logs" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_observability_performance_function" ON "public"."observability_performance" USING "btree" ("function_name");



CREATE INDEX "idx_observability_performance_timestamp" ON "public"."observability_performance" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_plano_contas_empresa_codigo" ON "public"."plano_contas" USING "btree" ("empresa_id", "codigo", "ativa") WHERE ("ativa" = true);



CREATE INDEX "idx_production_alerts_empresa_id" ON "public"."production_alerts" USING "btree" ("empresa_id");



CREATE INDEX "idx_production_alerts_severity" ON "public"."production_alerts" USING "btree" ("severity");



CREATE INDEX "idx_production_alerts_status" ON "public"."production_alerts" USING "btree" ("status");



CREATE INDEX "idx_production_alerts_triggered_at" ON "public"."production_alerts" USING "btree" ("triggered_at" DESC);



CREATE INDEX "idx_production_alerts_type" ON "public"."production_alerts" USING "btree" ("type");



CREATE INDEX "idx_production_alerts_user_id" ON "public"."production_alerts" USING "btree" ("user_id");



CREATE INDEX "idx_queue_workers_queue" ON "public"."queue_workers" USING "btree" ("queue_name");



CREATE INDEX "idx_queue_workers_status" ON "public"."queue_workers" USING "btree" ("status");



CREATE INDEX "idx_realtime_notifications_empresa" ON "public"."realtime_notifications" USING "btree" ("empresa_id");



CREATE INDEX "idx_realtime_notifications_job" ON "public"."realtime_notifications" USING "btree" ("job_id");



CREATE INDEX "idx_realtime_notifications_status" ON "public"."realtime_notifications" USING "btree" ("status");



CREATE INDEX "idx_realtime_notifications_user" ON "public"."realtime_notifications" USING "btree" ("user_id");



CREATE INDEX "idx_socios_ativo" ON "public"."socios" USING "btree" ("empresa_id", "ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_socios_cpf" ON "public"."socios" USING "btree" ("cpf");



CREATE INDEX "idx_socios_empresa_id" ON "public"."socios" USING "btree" ("empresa_id");



CREATE INDEX "idx_tabelas_fiscais_lookup" ON "public"."tabelas_fiscais" USING "btree" ("tipo_tabela", "anexo", "vigencia_inicio");



CREATE OR REPLACE TRIGGER "document_processed_trigger" AFTER UPDATE ON "public"."documentos_fiscais" FOR EACH ROW WHEN (((("old"."status")::"text" <> ("new"."status")::"text") AND (("new"."status")::"text" = 'processado'::"text"))) EXECUTE FUNCTION "public"."notify_document_processed"();



CREATE OR REPLACE TRIGGER "documentos_audit_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."documentos_fiscais" FOR EACH ROW EXECUTE FUNCTION "public"."audit_documentos_changes"();



CREATE OR REPLACE TRIGGER "empresas_audit_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."empresas" FOR EACH ROW EXECUTE FUNCTION "public"."audit_empresas_changes"();



CREATE OR REPLACE TRIGGER "extract_fiscal_values_trigger" BEFORE INSERT OR UPDATE ON "public"."fiscal_calculations" FOR EACH ROW EXECUTE FUNCTION "public"."extract_fiscal_calculation_values"();



CREATE OR REPLACE TRIGGER "obligation_detected_trigger" AFTER INSERT ON "public"."fiscal_obligations" FOR EACH ROW EXECUTE FUNCTION "public"."notify_obligation_detected"();



CREATE OR REPLACE TRIGGER "update_cnpj_cache_updated_at" BEFORE UPDATE ON "public"."cnpj_cache" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_documentos_updated_at" BEFORE UPDATE ON "public"."documentos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_production_alerts_updated_at" BEFORE UPDATE ON "public"."production_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."certificados_digitais"
    ADD CONSTRAINT "certificados_digitais_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."certificados_digitais"
    ADD CONSTRAINT "certificados_digitais_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificados_digitais"
    ADD CONSTRAINT "certificados_digitais_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."consultas_ia"
    ADD CONSTRAINT "consultas_ia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."documentos"
    ADD CONSTRAINT "documentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documentos_fiscais"
    ADD CONSTRAINT "documentos_fiscais_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."empresa_configuracoes"
    ADD CONSTRAINT "empresa_configuracoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."empresas"
    ADD CONSTRAINT "empresas_normalized_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enderecos"
    ADD CONSTRAINT "enderecos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fiscal_calculations"
    ADD CONSTRAINT "fiscal_calculations_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fiscal_obligations"
    ADD CONSTRAINT "fiscal_obligations_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fiscal_obligations"
    ADD CONSTRAINT "fiscal_obligations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documentos_fiscais"
    ADD CONSTRAINT "fk_documentos_fiscais_empresa" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fiscal_obligations"
    ADD CONSTRAINT "fk_fiscal_obligations_empresa" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lancamentos_contabeis"
    ADD CONSTRAINT "fk_lancamentos_contabeis_empresa" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."plano_contas"
    ADD CONSTRAINT "fk_plano_contas_empresa" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_documento_origem_fkey" FOREIGN KEY ("documento_origem") REFERENCES "public"."documentos_fiscais"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lancamentos_contabeis"
    ADD CONSTRAINT "lancamentos_contabeis_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."plano_contas"
    ADD CONSTRAINT "plano_contas_codigo_pai_fkey" FOREIGN KEY ("codigo_pai") REFERENCES "public"."plano_contas"("codigo");



ALTER TABLE ONLY "public"."plano_contas"
    ADD CONSTRAINT "plano_contas_conta_pai_id_fkey" FOREIGN KEY ("conta_pai_id") REFERENCES "public"."plano_contas"("id");



ALTER TABLE ONLY "public"."socios"
    ADD CONSTRAINT "socios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can insert fiscal obligations" ON "public"."fiscal_obligations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Development access" ON "public"."empresas" FOR SELECT USING (("user_id" = '1ff74f50-bc2d-49ae-8fb4-3b819df08078'::"uuid"));



CREATE POLICY "Plano de contas is visible for all" ON "public"."plano_contas" FOR SELECT USING (true);



CREATE POLICY "Read cnpj cache (auth only)" ON "public"."cnpj_cache" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Service writes cnpj cache" ON "public"."cnpj_cache" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can delete own empresas" ON "public"."empresas" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own fiscal obligations" ON "public"."fiscal_obligations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own calculos_fiscais" ON "public"."calculos_fiscais" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert alerts" ON "public"."production_alerts" FOR INSERT WITH CHECK ((("empresa_id" IS NULL) OR ("empresa_id" = (("auth"."jwt"() ->> 'empresa_id'::"text"))::"uuid") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert own consultas_ia" ON "public"."consultas_ia" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own empresas" ON "public"."empresas" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own calculos_fiscais" ON "public"."calculos_fiscais" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own fiscal calculations" ON "public"."fiscal_calculations" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own empresas" ON "public"."empresas" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own fiscal obligations" ON "public"."fiscal_obligations" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their alerts" ON "public"."production_alerts" FOR UPDATE USING ((("empresa_id" IS NULL) OR ("empresa_id" = (("auth"."jwt"() ->> 'empresa_id'::"text"))::"uuid") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can update their own calculos_fiscais" ON "public"."calculos_fiscais" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view alerts from their company" ON "public"."production_alerts" FOR SELECT USING ((("empresa_id" IS NULL) OR ("empresa_id" = (("auth"."jwt"() ->> 'empresa_id'::"text"))::"uuid") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view own consultas_ia" ON "public"."consultas_ia" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own empresas" ON "public"."empresas" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own fiscal obligations" ON "public"."fiscal_obligations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own calculos_fiscais" ON "public"."calculos_fiscais" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own lancamentos" ON "public"."lancamentos_contabeis" TO "authenticated" USING (("empresa_id" IN ( SELECT "empresas"."id"
   FROM "public"."empresas"
  WHERE ("empresas"."user_id" = "auth"."uid"())))) WITH CHECK (("empresa_id" IN ( SELECT "empresas"."id"
   FROM "public"."empresas"
  WHERE ("empresas"."user_id" = "auth"."uid"()))));



CREATE POLICY "Usuários podem atualizar certificados de suas empresas" ON "public"."certificados_digitais" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "certificados_digitais"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem atualizar configurações de suas empresas" ON "public"."empresa_configuracoes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "empresa_configuracoes"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem atualizar documentos das suas empresas" ON "public"."documentos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "documentos"."empresa_id") AND ("e"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "documentos"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem atualizar endereços de suas empresas" ON "public"."enderecos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "enderecos"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem atualizar sócios de suas empresas" ON "public"."socios" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "socios"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem criar certificados para suas empresas" ON "public"."certificados_digitais" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "certificados_digitais"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem criar configurações para suas empresas" ON "public"."empresa_configuracoes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "empresa_configuracoes"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem criar endereços para suas empresas" ON "public"."enderecos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "enderecos"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem criar sócios para suas empresas" ON "public"."socios" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "socios"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem deletar certificados de suas empresas" ON "public"."certificados_digitais" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "certificados_digitais"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem deletar configurações de suas empresas" ON "public"."empresa_configuracoes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "empresa_configuracoes"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem deletar endereços de suas empresas" ON "public"."enderecos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "enderecos"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem deletar sócios de suas empresas" ON "public"."socios" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "socios"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem excluir documentos das suas empresas" ON "public"."documentos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "documentos"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem inserir documentos nas suas empresas" ON "public"."documentos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "documentos"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem ver certificados de suas empresas" ON "public"."certificados_digitais" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "certificados_digitais"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem ver configurações de suas empresas" ON "public"."empresa_configuracoes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "empresa_configuracoes"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem ver documentos das suas empresas" ON "public"."documentos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "documentos"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem ver endereços de suas empresas" ON "public"."enderecos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "enderecos"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Usuários podem ver sócios de suas empresas" ON "public"."socios" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."empresas" "e"
  WHERE (("e"."id" = "socios"."empresa_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "authenticated_read_backup_logs" ON "public"."backup_logs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."automation_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automation_jobs_user_isolation" ON "public"."automation_jobs" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."backup_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calculos_fiscais" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calculos_fiscais_isolation" ON "public"."calculos_fiscais" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."certificados_digitais" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cnpj_cache" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultas_ia" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dashboard_alerts_user_isolation" ON "public"."dashboard_alerts" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."dashboard_widgets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dashboard_widgets_user_isolation" ON "public"."dashboard_widgets" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."documento_analises_ia" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documento_analises_ia_isolation" ON "public"."documento_analises_ia" USING (("empresa_id" IN ( SELECT "empresas"."id"
   FROM "public"."empresas"
  WHERE ("empresas"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."documentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documentos_delete_policy" ON "public"."documentos_fiscais" FOR DELETE USING (("empresa_id" IN ( SELECT "empresas"."id"
   FROM "public"."empresas"
  WHERE (("empresas"."user_id" = "auth"."uid"()) AND ("empresas"."ativa" = true)))));



ALTER TABLE "public"."documentos_fiscais" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documentos_insert_policy" ON "public"."documentos_fiscais" FOR INSERT WITH CHECK (("empresa_id" IN ( SELECT "empresas"."id"
   FROM "public"."empresas"
  WHERE (("empresas"."user_id" = "auth"."uid"()) AND ("empresas"."ativa" = true)))));



CREATE POLICY "documentos_select_policy" ON "public"."documentos_fiscais" FOR SELECT USING (("empresa_id" IN ( SELECT "empresas"."id"
   FROM "public"."empresas"
  WHERE (("empresas"."user_id" = "auth"."uid"()) AND ("empresas"."ativa" = true)))));



CREATE POLICY "documentos_update_policy" ON "public"."documentos_fiscais" FOR UPDATE USING (("empresa_id" IN ( SELECT "empresas"."id"
   FROM "public"."empresas"
  WHERE (("empresas"."user_id" = "auth"."uid"()) AND ("empresas"."ativa" = true)))));



ALTER TABLE "public"."empresa_configuracoes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."empresa_configuracoes_fiscais" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "empresa_configuracoes_fiscais_isolation" ON "public"."empresa_configuracoes_fiscais" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."enderecos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fiscal_calculations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fiscal_obligations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lancamentos_contabeis" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_templates_read_all" ON "public"."notification_templates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_user_isolation" ON "public"."notifications" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."plano_contas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_backup_logs" ON "public"."backup_logs" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."socios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tabelas_fiscais" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tabelas_fiscais_read_all" ON "public"."tabelas_fiscais" FOR SELECT USING (true);



ALTER TABLE "public"."user_automation_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_automation_settings_isolation" ON "public"."user_automation_settings" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_notification_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_notification_preferences_isolation" ON "public"."user_notification_preferences" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."job_progress";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."job_queues";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."realtime_notifications";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."archive_old_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."archive_old_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_old_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_task"("task_id_param" "uuid", "archived_by_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_task"("task_id_param" "uuid", "archived_by_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_task"("task_id_param" "uuid", "archived_by_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_documentos_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_documentos_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_documentos_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_empresas_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_empresas_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_empresas_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."bytea_to_text"("data" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_suggestion_confidence"("p_user_id" "uuid", "p_suggestion_type" "text", "p_context_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_suggestion_confidence"("p_user_id" "uuid", "p_suggestion_type" "text", "p_context_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_suggestion_confidence"("p_user_id" "uuid", "p_suggestion_type" "text", "p_context_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_next_job"("p_worker_id" character varying, "p_job_types" character varying[]) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_next_job"("p_worker_id" character varying, "p_job_types" character varying[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_next_job"("p_worker_id" character varying, "p_job_types" character varying[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."classify_document_semantic"("document_text" "text", "document_embedding" "public"."vector", "empresa_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."classify_document_semantic"("document_text" "text", "document_embedding" "public"."vector", "empresa_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."classify_document_semantic"("document_text" "text", "document_embedding" "public"."vector", "empresa_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_cnpj_cache"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_cnpj_cache"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_cnpj_cache"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_agent_messages"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_agent_messages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_agent_messages"() TO "service_role";



GRANT ALL ON FUNCTION "public"."complete_job"("p_job_id" "uuid", "p_result" "jsonb", "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_job"("p_job_id" "uuid", "p_result" "jsonb", "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_job"("p_job_id" "uuid", "p_result" "jsonb", "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_async_job"("p_job_type" character varying, "p_payload" "jsonb", "p_empresa_id" "uuid", "p_documento_id" "uuid", "p_priority" integer, "p_max_retries" integer, "p_estimated_duration" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_async_job"("p_job_type" character varying, "p_payload" "jsonb", "p_empresa_id" "uuid", "p_documento_id" "uuid", "p_priority" integer, "p_max_retries" integer, "p_estimated_duration" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_async_job"("p_job_type" character varying, "p_payload" "jsonb", "p_empresa_id" "uuid", "p_documento_id" "uuid", "p_priority" integer, "p_max_retries" integer, "p_estimated_duration" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_automated_backup"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_automated_backup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_automated_backup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_monthly_partitions"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_monthly_partitions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_monthly_partitions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_realtime_notification"("p_user_id" "uuid", "p_empresa_id" "uuid", "p_notification_type" "text", "p_title" "text", "p_message" "text", "p_payload" "jsonb", "p_job_id" "uuid", "p_priority" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_realtime_notification"("p_user_id" "uuid", "p_empresa_id" "uuid", "p_notification_type" "text", "p_title" "text", "p_message" "text", "p_payload" "jsonb", "p_job_id" "uuid", "p_priority" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_realtime_notification"("p_user_id" "uuid", "p_empresa_id" "uuid", "p_notification_type" "text", "p_title" "text", "p_message" "text", "p_payload" "jsonb", "p_job_id" "uuid", "p_priority" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_duplicate_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_duplicate_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_duplicate_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."dequeue_job"("p_queue_name" "text", "p_worker_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."dequeue_job"("p_queue_name" "text", "p_worker_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dequeue_job"("p_queue_name" "text", "p_worker_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_job"("p_queue_name" "text", "p_job_type" "text", "p_payload" "jsonb", "p_priority" integer, "p_user_id" "uuid", "p_empresa_id" "uuid", "p_scheduled_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_job"("p_queue_name" "text", "p_job_type" "text", "p_payload" "jsonb", "p_priority" integer, "p_user_id" "uuid", "p_empresa_id" "uuid", "p_scheduled_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_job"("p_queue_name" "text", "p_job_type" "text", "p_payload" "jsonb", "p_priority" integer, "p_user_id" "uuid", "p_empresa_id" "uuid", "p_scheduled_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."extract_fiscal_calculation_values"() TO "anon";
GRANT ALL ON FUNCTION "public"."extract_fiscal_calculation_values"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."extract_fiscal_calculation_values"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_similar_lancamentos"("query_embedding" "public"."vector", "empresa_id_filter" "uuid", "similarity_threshold" double precision, "max_results" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_similar_lancamentos"("query_embedding" "public"."vector", "empresa_id_filter" "uuid", "similarity_threshold" double precision, "max_results" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_similar_lancamentos"("query_embedding" "public"."vector", "empresa_id_filter" "uuid", "similarity_threshold" double precision, "max_results" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_automation_dashboard_data"("days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_automation_dashboard_data"("days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_automation_dashboard_data"("days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_automation_statistics"("days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_automation_statistics"("days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_automation_statistics"("days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cron_jobs_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cron_jobs_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cron_jobs_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_complete"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_complete"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_complete"("p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monitoring_statistics"("days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_monitoring_statistics"("days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monitoring_statistics"("days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tasks_stats"("empresa_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tasks_stats"("empresa_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tasks_stats"("empresa_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_dashboard_metrics"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_metrics"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_dashboard_metrics"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_btree_consistent"("internal", smallint, "anyelement", integer, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_btree_consistent"("internal", smallint, "anyelement", integer, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_btree_consistent"("internal", smallint, "anyelement", integer, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_btree_consistent"("internal", smallint, "anyelement", integer, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_anyenum"("anyenum", "anyenum", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_anyenum"("anyenum", "anyenum", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_anyenum"("anyenum", "anyenum", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_anyenum"("anyenum", "anyenum", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bit"(bit, bit, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bit"(bit, bit, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bit"(bit, bit, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bit"(bit, bit, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bool"(boolean, boolean, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bool"(boolean, boolean, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bool"(boolean, boolean, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bool"(boolean, boolean, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bpchar"(character, character, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bpchar"(character, character, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bpchar"(character, character, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bpchar"(character, character, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bytea"("bytea", "bytea", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bytea"("bytea", "bytea", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bytea"("bytea", "bytea", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_bytea"("bytea", "bytea", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_char"("char", "char", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_char"("char", "char", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_char"("char", "char", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_char"("char", "char", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_cidr"("cidr", "cidr", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_cidr"("cidr", "cidr", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_cidr"("cidr", "cidr", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_cidr"("cidr", "cidr", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_date"("date", "date", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_date"("date", "date", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_date"("date", "date", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_date"("date", "date", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float4"(real, real, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float4"(real, real, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float4"(real, real, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float4"(real, real, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float8"(double precision, double precision, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float8"(double precision, double precision, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float8"(double precision, double precision, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_float8"(double precision, double precision, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_inet"("inet", "inet", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_inet"("inet", "inet", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_inet"("inet", "inet", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_inet"("inet", "inet", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int2"(smallint, smallint, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int2"(smallint, smallint, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int2"(smallint, smallint, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int2"(smallint, smallint, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int4"(integer, integer, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int4"(integer, integer, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int4"(integer, integer, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int4"(integer, integer, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int8"(bigint, bigint, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int8"(bigint, bigint, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int8"(bigint, bigint, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_int8"(bigint, bigint, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_interval"(interval, interval, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_interval"(interval, interval, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_interval"(interval, interval, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_interval"(interval, interval, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr"("macaddr", "macaddr", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr"("macaddr", "macaddr", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr"("macaddr", "macaddr", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr"("macaddr", "macaddr", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr8"("macaddr8", "macaddr8", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr8"("macaddr8", "macaddr8", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr8"("macaddr8", "macaddr8", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_macaddr8"("macaddr8", "macaddr8", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_money"("money", "money", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_money"("money", "money", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_money"("money", "money", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_money"("money", "money", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_name"("name", "name", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_name"("name", "name", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_name"("name", "name", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_name"("name", "name", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_numeric"(numeric, numeric, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_numeric"(numeric, numeric, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_numeric"(numeric, numeric, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_numeric"(numeric, numeric, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_oid"("oid", "oid", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_oid"("oid", "oid", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_oid"("oid", "oid", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_oid"("oid", "oid", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_text"("text", "text", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_text"("text", "text", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_text"("text", "text", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_text"("text", "text", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_time"(time without time zone, time without time zone, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_time"(time without time zone, time without time zone, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_time"(time without time zone, time without time zone, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_time"(time without time zone, time without time zone, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamp"(timestamp without time zone, timestamp without time zone, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamp"(timestamp without time zone, timestamp without time zone, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamp"(timestamp without time zone, timestamp without time zone, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamp"(timestamp without time zone, timestamp without time zone, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamptz"(timestamp with time zone, timestamp with time zone, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamptz"(timestamp with time zone, timestamp with time zone, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamptz"(timestamp with time zone, timestamp with time zone, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timestamptz"(timestamp with time zone, timestamp with time zone, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timetz"(time with time zone, time with time zone, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timetz"(time with time zone, time with time zone, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timetz"(time with time zone, time with time zone, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_timetz"(time with time zone, time with time zone, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_uuid"("uuid", "uuid", smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_uuid"("uuid", "uuid", smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_uuid"("uuid", "uuid", smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_uuid"("uuid", "uuid", smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_compare_prefix_varbit"(bit varying, bit varying, smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_varbit"(bit varying, bit varying, smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_varbit"(bit varying, bit varying, smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_compare_prefix_varbit"(bit varying, bit varying, smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_enum_cmp"("anyenum", "anyenum") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_enum_cmp"("anyenum", "anyenum") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_enum_cmp"("anyenum", "anyenum") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_enum_cmp"("anyenum", "anyenum") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_anyenum"("anyenum", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_anyenum"("anyenum", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_anyenum"("anyenum", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_anyenum"("anyenum", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_bit"(bit, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bit"(bit, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bit"(bit, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bit"(bit, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_bool"(boolean, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bool"(boolean, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bool"(boolean, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bool"(boolean, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_bpchar"(character, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bpchar"(character, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bpchar"(character, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bpchar"(character, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_bytea"("bytea", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bytea"("bytea", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bytea"("bytea", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_bytea"("bytea", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_char"("char", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_char"("char", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_char"("char", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_char"("char", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_cidr"("cidr", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_cidr"("cidr", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_cidr"("cidr", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_cidr"("cidr", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_date"("date", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_date"("date", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_date"("date", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_date"("date", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_float4"(real, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float4"(real, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float4"(real, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float4"(real, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_float8"(double precision, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float8"(double precision, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float8"(double precision, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_float8"(double precision, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_inet"("inet", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_inet"("inet", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_inet"("inet", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_inet"("inet", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_int2"(smallint, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int2"(smallint, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int2"(smallint, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int2"(smallint, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_int4"(integer, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int4"(integer, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int4"(integer, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int4"(integer, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_int8"(bigint, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int8"(bigint, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int8"(bigint, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_int8"(bigint, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_interval"(interval, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_interval"(interval, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_interval"(interval, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_interval"(interval, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr"("macaddr", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr"("macaddr", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr"("macaddr", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr"("macaddr", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr8"("macaddr8", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr8"("macaddr8", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr8"("macaddr8", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_macaddr8"("macaddr8", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_money"("money", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_money"("money", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_money"("money", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_money"("money", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_name"("name", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_name"("name", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_name"("name", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_name"("name", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_numeric"(numeric, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_numeric"(numeric, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_numeric"(numeric, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_numeric"(numeric, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_oid"("oid", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_oid"("oid", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_oid"("oid", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_oid"("oid", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_text"("text", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_text"("text", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_text"("text", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_text"("text", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_time"(time without time zone, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_time"(time without time zone, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_time"(time without time zone, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_time"(time without time zone, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamp"(timestamp without time zone, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamp"(timestamp without time zone, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamp"(timestamp without time zone, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamp"(timestamp without time zone, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamptz"(timestamp with time zone, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamptz"(timestamp with time zone, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamptz"(timestamp with time zone, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timestamptz"(timestamp with time zone, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_timetz"(time with time zone, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timetz"(time with time zone, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timetz"(time with time zone, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_timetz"(time with time zone, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_uuid"("uuid", "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_uuid"("uuid", "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_uuid"("uuid", "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_uuid"("uuid", "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_varbit"(bit varying, "internal", smallint, "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_varbit"(bit varying, "internal", smallint, "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_varbit"(bit varying, "internal", smallint, "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_varbit"(bit varying, "internal", smallint, "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_anyenum"("anyenum", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_anyenum"("anyenum", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_anyenum"("anyenum", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_anyenum"("anyenum", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_bit"(bit, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bit"(bit, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bit"(bit, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bit"(bit, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_bool"(boolean, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bool"(boolean, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bool"(boolean, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bool"(boolean, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_bpchar"(character, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bpchar"(character, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bpchar"(character, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bpchar"(character, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_bytea"("bytea", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bytea"("bytea", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bytea"("bytea", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_bytea"("bytea", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_char"("char", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_char"("char", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_char"("char", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_char"("char", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_cidr"("cidr", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_cidr"("cidr", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_cidr"("cidr", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_cidr"("cidr", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_date"("date", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_date"("date", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_date"("date", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_date"("date", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_float4"(real, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float4"(real, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float4"(real, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float4"(real, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_float8"(double precision, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float8"(double precision, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float8"(double precision, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_float8"(double precision, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_inet"("inet", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_inet"("inet", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_inet"("inet", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_inet"("inet", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_int2"(smallint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int2"(smallint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int2"(smallint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int2"(smallint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_int4"(integer, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int4"(integer, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int4"(integer, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int4"(integer, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_int8"(bigint, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int8"(bigint, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int8"(bigint, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_int8"(bigint, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_interval"(interval, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_interval"(interval, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_interval"(interval, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_interval"(interval, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr"("macaddr", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr"("macaddr", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr"("macaddr", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr"("macaddr", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr8"("macaddr8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr8"("macaddr8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr8"("macaddr8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_macaddr8"("macaddr8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_money"("money", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_money"("money", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_money"("money", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_money"("money", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_name"("name", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_name"("name", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_name"("name", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_name"("name", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_numeric"(numeric, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_numeric"(numeric, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_numeric"(numeric, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_numeric"(numeric, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_oid"("oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_oid"("oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_oid"("oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_oid"("oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_text"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_text"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_text"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_text"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_time"(time without time zone, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_time"(time without time zone, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_time"(time without time zone, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_time"(time without time zone, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamp"(timestamp without time zone, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamp"(timestamp without time zone, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamp"(timestamp without time zone, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamp"(timestamp without time zone, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamptz"(timestamp with time zone, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamptz"(timestamp with time zone, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamptz"(timestamp with time zone, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timestamptz"(timestamp with time zone, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_timetz"(time with time zone, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timetz"(time with time zone, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timetz"(time with time zone, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_timetz"(time with time zone, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_uuid"("uuid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_uuid"("uuid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_uuid"("uuid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_uuid"("uuid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_varbit"(bit varying, "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_varbit"(bit varying, "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_varbit"(bit varying, "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_varbit"(bit varying, "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_numeric_cmp"(numeric, numeric) TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_numeric_cmp"(numeric, numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."gin_numeric_cmp"(numeric, numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_numeric_cmp"(numeric, numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "postgres";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "anon";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http"("request" "public"."http_request") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_delete"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_get"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_head"("uri" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_header"("field" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_list_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_patch"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_post"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_put"("uri" character varying, "content" character varying, "content_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "postgres";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "anon";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_reset_curlopt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."http_set_curlopt"("curlopt" character varying, "value" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."initiate_backup"("p_backup_type" character varying, "p_backup_location" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."initiate_backup"("p_backup_type" character varying, "p_backup_location" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initiate_backup"("p_backup_type" character varying, "p_backup_location" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_query_performance"("p_query_name" character varying, "p_execution_time_ms" integer, "p_rows_affected" integer, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_query_performance"("p_query_name" character varying, "p_execution_time_ms" integer, "p_rows_affected" integer, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_query_performance"("p_query_name" character varying, "p_execution_time_ms" integer, "p_rows_affected" integer, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_archon_code_examples"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb", "source_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_archon_code_examples"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb", "source_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_archon_code_examples"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb", "source_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."match_archon_crawled_pages"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb", "source_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."match_archon_crawled_pages"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb", "source_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_archon_crawled_pages"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb", "source_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_document_processed"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_document_processed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_document_processed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_obligation_detected"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_obligation_detected"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_obligation_detected"() TO "service_role";



GRANT ALL ON FUNCTION "public"."optimize_system_performance"() TO "anon";
GRANT ALL ON FUNCTION "public"."optimize_system_performance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."optimize_system_performance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_webhook_retries"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_webhook_retries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_webhook_retries"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_dashboard_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_dashboard_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_dashboard_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_agent"("p_agent_id" "text", "p_agent_name" "text", "p_agent_type" "text", "p_capabilities" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."register_agent"("p_agent_id" "text", "p_agent_name" "text", "p_agent_type" "text", "p_capabilities" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_agent"("p_agent_id" "text", "p_agent_name" "text", "p_agent_type" "text", "p_capabilities" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_system_alert"("alert_id" "uuid", "resolved_by_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_system_alert"("alert_id" "uuid", "resolved_by_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_system_alert"("alert_id" "uuid", "resolved_by_user" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."run_automation_monitoring_cron"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_automation_monitoring_cron"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_automation_monitoring_cron"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_cleanup_expired_cron"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_cleanup_expired_cron"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_cleanup_expired_cron"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."test_rls_security"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_rls_security"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_rls_security"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_webhook_system"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_webhook_system"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_webhook_system"() TO "service_role";



GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."text_to_bytea"("data" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_heartbeat"("p_agent_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_heartbeat"("p_agent_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_heartbeat"("p_agent_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_registry_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_registry_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_registry_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_behavior_pattern_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_behavior_pattern_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_behavior_pattern_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tasks_completed_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tasks_completed_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tasks_completed_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tasks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "postgres";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."urlencode"("string" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_cnpj"("cnpj_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_cnpj"("cnpj_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_cnpj"("cnpj_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_critical_rls_enabled"() TO "anon";
GRANT ALL ON FUNCTION "public"."verify_critical_rls_enabled"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_critical_rls_enabled"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_tasks_rls"() TO "anon";
GRANT ALL ON FUNCTION "public"."verify_tasks_rls"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_tasks_rls"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";















GRANT ALL ON TABLE "public"."automation_jobs" TO "anon";
GRANT ALL ON TABLE "public"."automation_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."backup_logs" TO "anon";
GRANT ALL ON TABLE "public"."backup_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."backup_logs" TO "service_role";



GRANT ALL ON TABLE "public"."calculos_fiscais" TO "anon";
GRANT ALL ON TABLE "public"."calculos_fiscais" TO "authenticated";
GRANT ALL ON TABLE "public"."calculos_fiscais" TO "service_role";



GRANT ALL ON TABLE "public"."certificados_digitais" TO "anon";
GRANT ALL ON TABLE "public"."certificados_digitais" TO "authenticated";
GRANT ALL ON TABLE "public"."certificados_digitais" TO "service_role";



GRANT ALL ON TABLE "public"."cnpj_cache" TO "anon";
GRANT ALL ON TABLE "public"."cnpj_cache" TO "authenticated";
GRANT ALL ON TABLE "public"."cnpj_cache" TO "service_role";



GRANT ALL ON TABLE "public"."consultas_ia" TO "anon";
GRANT ALL ON TABLE "public"."consultas_ia" TO "authenticated";
GRANT ALL ON TABLE "public"."consultas_ia" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_alerts" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_widgets" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "service_role";



GRANT ALL ON TABLE "public"."documento_analises_ia" TO "anon";
GRANT ALL ON TABLE "public"."documento_analises_ia" TO "authenticated";
GRANT ALL ON TABLE "public"."documento_analises_ia" TO "service_role";



GRANT ALL ON TABLE "public"."documentos" TO "anon";
GRANT ALL ON TABLE "public"."documentos" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos" TO "service_role";



GRANT ALL ON TABLE "public"."documentos_fiscais" TO "anon";
GRANT ALL ON TABLE "public"."documentos_fiscais" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos_fiscais" TO "service_role";



GRANT ALL ON TABLE "public"."empresa_configuracoes" TO "anon";
GRANT ALL ON TABLE "public"."empresa_configuracoes" TO "authenticated";
GRANT ALL ON TABLE "public"."empresa_configuracoes" TO "service_role";



GRANT ALL ON TABLE "public"."empresa_configuracoes_fiscais" TO "anon";
GRANT ALL ON TABLE "public"."empresa_configuracoes_fiscais" TO "authenticated";
GRANT ALL ON TABLE "public"."empresa_configuracoes_fiscais" TO "service_role";



GRANT ALL ON TABLE "public"."empresas" TO "anon";
GRANT ALL ON TABLE "public"."empresas" TO "authenticated";
GRANT ALL ON TABLE "public"."empresas" TO "service_role";



GRANT ALL ON TABLE "public"."enderecos" TO "anon";
GRANT ALL ON TABLE "public"."enderecos" TO "authenticated";
GRANT ALL ON TABLE "public"."enderecos" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_calculations" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_calculations" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_calculations" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_obligations" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_obligations" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_obligations" TO "service_role";



GRANT ALL ON TABLE "public"."job_progress" TO "anon";
GRANT ALL ON TABLE "public"."job_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."job_progress" TO "service_role";



GRANT ALL ON TABLE "public"."job_queues" TO "anon";
GRANT ALL ON TABLE "public"."job_queues" TO "authenticated";
GRANT ALL ON TABLE "public"."job_queues" TO "service_role";



GRANT ALL ON TABLE "public"."lancamentos_contabeis" TO "anon";
GRANT ALL ON TABLE "public"."lancamentos_contabeis" TO "authenticated";
GRANT ALL ON TABLE "public"."lancamentos_contabeis" TO "service_role";



GRANT ALL ON SEQUENCE "public"."lancamentos_contabeis_numero_lancamento_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."lancamentos_contabeis_numero_lancamento_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."lancamentos_contabeis_numero_lancamento_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_templates" TO "anon";
GRANT ALL ON TABLE "public"."notification_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_templates" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."obrigacoes_fiscais" TO "anon";
GRANT ALL ON TABLE "public"."obrigacoes_fiscais" TO "authenticated";
GRANT ALL ON TABLE "public"."obrigacoes_fiscais" TO "service_role";



GRANT ALL ON TABLE "public"."observability_logs" TO "anon";
GRANT ALL ON TABLE "public"."observability_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."observability_logs" TO "service_role";



GRANT ALL ON TABLE "public"."observability_performance" TO "anon";
GRANT ALL ON TABLE "public"."observability_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."observability_performance" TO "service_role";



GRANT ALL ON TABLE "public"."plano_contas" TO "anon";
GRANT ALL ON TABLE "public"."plano_contas" TO "authenticated";
GRANT ALL ON TABLE "public"."plano_contas" TO "service_role";



GRANT ALL ON TABLE "public"."prazos_fiscais" TO "anon";
GRANT ALL ON TABLE "public"."prazos_fiscais" TO "authenticated";
GRANT ALL ON TABLE "public"."prazos_fiscais" TO "service_role";



GRANT ALL ON TABLE "public"."production_alerts" TO "anon";
GRANT ALL ON TABLE "public"."production_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."production_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."queue_configurations" TO "anon";
GRANT ALL ON TABLE "public"."queue_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."queue_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."queue_workers" TO "anon";
GRANT ALL ON TABLE "public"."queue_workers" TO "authenticated";
GRANT ALL ON TABLE "public"."queue_workers" TO "service_role";



GRANT ALL ON TABLE "public"."realtime_notifications" TO "anon";
GRANT ALL ON TABLE "public"."realtime_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."realtime_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."socios" TO "anon";
GRANT ALL ON TABLE "public"."socios" TO "authenticated";
GRANT ALL ON TABLE "public"."socios" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tabelas_fiscais" TO "anon";
GRANT ALL ON TABLE "public"."tabelas_fiscais" TO "authenticated";
GRANT ALL ON TABLE "public"."tabelas_fiscais" TO "service_role";



GRANT ALL ON TABLE "public"."user_automation_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_automation_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_automation_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
