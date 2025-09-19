-- =====================================================
-- 🚨 FIX REMAINING PARTITION CONFLICTS
-- Fix the 2026 yearly partition conflict
-- =====================================================

BEGIN;

-- Remove conflicting 2026 yearly partition
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs_2026') THEN
        RAISE NOTICE 'Removendo partição anual conflitante: system_logs_2026';
        DROP TABLE IF EXISTS system_logs_2026;
    END IF;
END $$;

-- Create January 2026 partition
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs_2026_01') THEN
        CREATE TABLE system_logs_2026_01 PARTITION OF system_logs
        FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
        RAISE NOTICE 'Criada partição: system_logs_2026_01';
    END IF;
END $$;

-- Test the partition system by inserting a log
INSERT INTO system_logs (user_id, action, metadata, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'PARTITION_FIX_COMPLETE',
    '{"message": "Audit system partitions fixed successfully"}',
    NOW()
);

-- Verify partitions
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE 'system_logs_20%'
ORDER BY tablename DESC;

COMMIT;