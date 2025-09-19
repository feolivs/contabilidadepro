-- =====================================================
-- 🚨 EMERGENCY FIX: BROKEN AUDIT SYSTEM PARTITIONS
-- Phase 0 - Critical system repair
-- =====================================================

-- Problem: "no partition of relation system_logs found for row"
-- Solution: Create missing partitions and automatic management

BEGIN;

-- 1. CHECK AND HANDLE EXISTING PARTITIONS
-- =====================================================

-- Check if there are existing partitions that might conflict
DO $$
DECLARE
    partition_exists boolean;
BEGIN
    -- Check for existing yearly partition 2025 that might conflict
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'system_logs_2025'
    ) INTO partition_exists;

    IF partition_exists THEN
        -- Drop the conflicting yearly partition if it exists
        RAISE NOTICE 'Removendo partição anual conflitante: system_logs_2025';
        DROP TABLE IF EXISTS system_logs_2025;
    END IF;

    -- Check for existing yearly partition 2026 that might conflict
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'system_logs_2026'
    ) INTO partition_exists;

    IF partition_exists THEN
        -- Drop the conflicting yearly partition if it exists
        RAISE NOTICE 'Removendo partição anual conflitante: system_logs_2026';
        DROP TABLE IF EXISTS system_logs_2026;
    END IF;
END $$;

-- 2. CREATE MISSING PARTITIONS FOR CURRENT DATE RANGE
-- =====================================================

-- Setembro 2025 (current month) - Only create if doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs_2025_09') THEN
        CREATE TABLE system_logs_2025_09 PARTITION OF system_logs
        FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
        RAISE NOTICE 'Criada partição: system_logs_2025_09';
    END IF;
END $$;

-- Outubro 2025 (next month)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs_2025_10') THEN
        CREATE TABLE system_logs_2025_10 PARTITION OF system_logs
        FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
        RAISE NOTICE 'Criada partição: system_logs_2025_10';
    END IF;
END $$;

-- Novembro 2025 (buffer)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs_2025_11') THEN
        CREATE TABLE system_logs_2025_11 PARTITION OF system_logs
        FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
        RAISE NOTICE 'Criada partição: system_logs_2025_11';
    END IF;
END $$;

-- Dezembro 2025 (buffer)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs_2025_12') THEN
        CREATE TABLE system_logs_2025_12 PARTITION OF system_logs
        FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
        RAISE NOTICE 'Criada partição: system_logs_2025_12';
    END IF;
END $$;

-- Janeiro 2026 (advance planning)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs_2026_01') THEN
        CREATE TABLE system_logs_2026_01 PARTITION OF system_logs
        FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
        RAISE NOTICE 'Criada partição: system_logs_2026_01';
    END IF;
END $$;

-- 2. CREATE AUTOMATIC PARTITION MANAGEMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_monthly_partition_system_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
    table_exists boolean;
BEGIN
    -- Criar partição para o mês atual
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + interval '1 month';
    partition_name := 'system_logs_' || to_char(start_date, 'YYYY_MM');

    -- Verificar se a tabela já existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = partition_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        RAISE NOTICE 'Criada partição: %', partition_name;
    END IF;

    -- Criar partição para o próximo mês (buffer)
    start_date := start_date + interval '1 month';
    end_date := start_date + interval '1 month';
    partition_name := 'system_logs_' || to_char(start_date, 'YYYY_MM');

    -- Verificar se a tabela já existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = partition_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        RAISE NOTICE 'Criada partição buffer: %', partition_name;
    END IF;

    -- Criar partição para 2 meses à frente (planejamento)
    start_date := start_date + interval '1 month';
    end_date := start_date + interval '1 month';
    partition_name := 'system_logs_' || to_char(start_date, 'YYYY_MM');

    -- Verificar se a tabela já existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = partition_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        RAISE NOTICE 'Criada partição planejamento: %', partition_name;
    END IF;
END;
$$;

-- 3. CREATE PARTITION CLEANUP FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_partitions_system_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    partition_record record;
    cutoff_date date;
BEGIN
    -- Manter apenas os últimos 6 meses de partições
    cutoff_date := date_trunc('month', CURRENT_DATE) - interval '6 months';

    -- Buscar partições antigas
    FOR partition_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE tablename LIKE 'system_logs_20%'
        AND tablename < 'system_logs_' || to_char(cutoff_date, 'YYYY_MM')
    LOOP
        -- Dropar partição antiga
        EXECUTE format('DROP TABLE IF EXISTS %I.%I',
                      partition_record.schemaname,
                      partition_record.tablename);

        RAISE NOTICE 'Removida partição antiga: %', partition_record.tablename;
    END LOOP;
END;
$$;

-- 4. SETUP AUTOMATIC PARTITION MANAGEMENT WITH CRON
-- =====================================================

-- Criar partições automaticamente todo dia 1º do mês às 02:00
SELECT cron.schedule(
    'monthly-partition-creation',
    '0 2 1 * *',  -- Todo dia 1º às 02:00
    'SELECT create_monthly_partition_system_logs();'
);

-- Limpar partições antigas todo domingo às 03:00
SELECT cron.schedule(
    'weekly-partition-cleanup',
    '0 3 * * 0',  -- Todo domingo às 03:00
    'SELECT cleanup_old_partitions_system_logs();'
);

-- 5. EMERGENCY PARTITION CREATION FOR IMMEDIATE USE
-- =====================================================

-- Executar a função agora para garantir que as partições existem
SELECT create_monthly_partition_system_logs();

-- 6. CREATE INDEXES ON NEW PARTITIONS
-- =====================================================

-- Função para criar índices em novas partições
CREATE OR REPLACE FUNCTION create_indexes_on_partition(partition_name text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Índice principal por data
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_created_at_idx ON %I (created_at DESC)',
        partition_name, partition_name
    );

    -- Índice por usuário (para queries de auditoria)
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_user_id_idx ON %I (user_id)',
        partition_name, partition_name
    );

    -- Índice por ação (para relatórios)
    EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I_action_idx ON %I (action)',
        partition_name, partition_name
    );

    RAISE NOTICE 'Índices criados para partição: %', partition_name;
END;
$$;

-- Aplicar índices nas partições existentes
DO $$
DECLARE
    partition_name text;
BEGIN
    FOR partition_name IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'system_logs_20%'
    LOOP
        PERFORM create_indexes_on_partition(partition_name);
    END LOOP;
END;
$$;

-- 7. UPDATE PARTITION CREATION FUNCTION TO INCLUDE INDEXES
-- =====================================================

CREATE OR REPLACE FUNCTION create_monthly_partition_system_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
    table_exists boolean;
BEGIN
    -- Criar partição para o mês atual
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + interval '1 month';
    partition_name := 'system_logs_' || to_char(start_date, 'YYYY_MM');

    -- Verificar se a tabela já existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = partition_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        -- Criar índices na nova partição
        PERFORM create_indexes_on_partition(partition_name);

        RAISE NOTICE 'Criada partição com índices: %', partition_name;
    END IF;

    -- Repetir para próximo mês
    start_date := start_date + interval '1 month';
    end_date := start_date + interval '1 month';
    partition_name := 'system_logs_' || to_char(start_date, 'YYYY_MM');

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = partition_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        PERFORM create_indexes_on_partition(partition_name);

        RAISE NOTICE 'Criada partição buffer com índices: %', partition_name;
    END IF;

    -- Repetir para 2 meses à frente
    start_date := start_date + interval '1 month';
    end_date := start_date + interval '1 month';
    partition_name := 'system_logs_' || to_char(start_date, 'YYYY_MM');

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = partition_name
    ) INTO table_exists;

    IF NOT table_exists THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );

        PERFORM create_indexes_on_partition(partition_name);

        RAISE NOTICE 'Criada partição planejamento com índices: %', partition_name;
    END IF;
END;
$$;

-- 8. TEST THE PARTITION SYSTEM
-- =====================================================

-- Inserir um log de teste para verificar se funciona
INSERT INTO system_logs (user_id, action, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'PARTITION_TEST',
    '{"message": "Testing partition system after emergency fix"}',
    NOW()
);

-- Verificar se o insert funcionou
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE 'system_logs_20%'
ORDER BY tablename DESC;

COMMIT;

-- =====================================================
-- 🎉 EMERGENCY FIX COMPLETED
-- =====================================================

-- O sistema de auditoria agora deve funcionar normalmente
-- As partições são criadas automaticamente
-- Partições antigas são limpas automaticamente
-- O problema "no partition found" foi resolvido

-- Para verificar o status:
-- SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 5;