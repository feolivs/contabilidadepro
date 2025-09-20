# 🔄 PLANO DE ROLLBACK COMPLETO - ContabilidadePRO

**Versão:** 2.0  
**Data:** 2025-01-20  
**Criticidade:** 🔴 DOCUMENTO CRÍTICO

---

## 🚨 **VISÃO GERAL**

### **Objetivo:**
Documentar procedimentos completos para reverter as otimizações implementadas, garantindo que o sistema possa retornar ao estado anterior em caso de problemas críticos.

### **Cenários de Rollback:**
- **Crítico:** Performance degradada > 500%
- **Alto:** Funcionalidades quebradas
- **Médio:** Problemas de cache/cron jobs
- **Baixo:** Issues menores de UI/UX

### **Tempo de Execução:**
- **Rollback Parcial:** 15-30 minutos
- **Rollback Completo:** 1-2 horas
- **Validação:** 30 minutos

---

## 📋 **INVENTÁRIO DE BACKUPS**

### **Backups Automáticos Criados:**

#### **1. Banco de Dados (Antes da Otimização):**
```sql
-- Backup completo do schema
pg_dump --schema-only contabilidadepro > backup_schema_pre_optimization.sql

-- Backup de dados das tabelas afetadas
pg_dump --data-only --table=documentos contabilidadepro > backup_documentos.sql
pg_dump --data-only --table=documentos_fiscais contabilidadepro > backup_documentos_fiscais.sql
pg_dump --data-only --table=processed_documents contabilidadepro > backup_processed_documents.sql

-- Backup de triggers e funções
pg_dump --schema-only --no-owner --no-privileges contabilidadepro | grep -A 50 "CREATE TRIGGER\|CREATE FUNCTION" > backup_triggers_functions.sql
```

#### **2. Código da Aplicação:**
```bash
# Commit antes da otimização
git tag pre-optimization-backup
git push origin pre-optimization-backup

# Backup de arquivos críticos
cp -r contador-solo-ai/src/lib/ backup/lib_original/
cp -r contador-solo-ai/src/services/ backup/services_original/
cp -r contador-solo-ai/src/hooks/ backup/hooks_original/
```

#### **3. Configurações Supabase:**
```json
{
  "cron_jobs_backup": [
    {
      "jobid": 2,
      "schedule": "0 2 * * *",
      "command": "SELECT run_incremental_backup_cron();",
      "jobname": "incremental-backup-daily"
    }
    // ... outros 20 jobs
  ],
  "rls_policies_backup": [
    // Todas as 79 políticas RLS originais
  ],
  "edge_functions_backup": [
    // Configurações das 6 Edge Functions
  ]
}
```

---

## 🔄 **PROCEDIMENTOS DE ROLLBACK POR FASE**

### **FASE 1: ROLLBACK DE CACHE**

#### **Cenário:** Cache unificado causando problemas

#### **Sintomas:**
- Hit rate < 30%
- Latência > 1000ms
- Erros de cache corruption

#### **Procedimento:**
```bash
# 1. Desabilitar cache unificado
cd contador-solo-ai
git checkout pre-optimization-backup -- src/lib/cache.ts
git checkout pre-optimization-backup -- src/lib/api-optimizer.ts

# 2. Restaurar sistemas de cache originais
cp backup/lib_original/simple-cache.ts src/lib/
cp backup/services_original/fiscal-cache.service.ts src/services/

# 3. Atualizar imports
find src/ -name "*.ts" -exec sed -i 's/unified-cache/simple-cache/g' {} \;

# 4. Rebuild e deploy
npm run build
npm run deploy

# 5. Validar funcionamento
curl -f https://app.contabilidadepro.com/api/cache/health
```

#### **Rollback de Edge Functions:**
```bash
# Restaurar adapters originais
supabase functions deploy assistente-contabil-ia --no-verify-jwt
supabase functions deploy fiscal-service --no-verify-jwt
```

#### **Tempo Estimado:** 15 minutos

### **FASE 2: ROLLBACK DE TABELAS**

#### **Cenário:** Problemas com documentos_unified

#### **Sintomas:**
- Queries > 1000ms
- Dados corrompidos
- Triggers não funcionando

#### **Procedimento Crítico:**
```sql
-- 1. BACKUP IMEDIATO dos dados atuais
CREATE TABLE documentos_unified_backup AS 
SELECT * FROM documentos_unified;

-- 2. Restaurar tabelas originais
\i backup_schema_pre_optimization.sql

-- 3. Restaurar dados
\i backup_documentos.sql
\i backup_documentos_fiscais.sql
\i backup_processed_documents.sql

-- 4. Restaurar triggers originais
\i backup_triggers_functions.sql

-- 5. Migrar dados de volta (se necessário)
INSERT INTO documentos (empresa_id, user_id, arquivo_nome, tipo_documento, status_processamento)
SELECT empresa_id, user_id, arquivo_nome, tipo_documento, 
       CASE status_processamento::text
         WHEN 'processado' THEN 'completed'
         WHEN 'pendente' THEN 'pending'
         ELSE 'error'
       END
FROM documentos_unified_backup
WHERE categoria = 'fiscal';

-- 6. Verificar integridade
SELECT COUNT(*) FROM documentos;
SELECT COUNT(*) FROM documentos_fiscais;
SELECT COUNT(*) FROM processed_documents;
```

#### **Rollback do Código:**
```bash
# 1. Restaurar services originais
git checkout pre-optimization-backup -- src/services/documentos.service.ts
git checkout pre-optimization-backup -- src/hooks/use-documentos.ts
git checkout pre-optimization-backup -- src/types/documentos.types.ts

# 2. Remover arquivos unificados
rm src/services/documentos-unified.service.ts
rm src/hooks/use-documentos-unified.ts
rm src/types/documentos-unified.types.ts

# 3. Atualizar imports em componentes
find src/components/ -name "*.tsx" -exec sed -i 's/documentos-unified/documentos/g' {} \;

# 4. Rebuild
npm run build
npm run deploy
```

#### **Tempo Estimado:** 45 minutos

### **FASE 3: ROLLBACK DE CRON JOBS**

#### **Cenário:** Funções consolidadas falhando

#### **Sintomas:**
- Jobs não executando
- Backup falhando
- Analytics paradas

#### **Procedimento:**
```sql
-- 1. Desabilitar funções consolidadas
UPDATE cron.job SET active = false 
WHERE jobname IN (
  'unified-backup-manager',
  'smart-analytics',
  'intelligent-compliance',
  'intelligent-maintenance'
);

-- 2. Reativar jobs originais
UPDATE cron.job SET active = true 
WHERE jobname IN (
  'incremental-backup-daily',
  'daily-full-backup',
  'weekly-storage-backup',
  'monthly-cleanup-backups',
  'compliance-monitor-hourly',
  'daily-fiscal-alerts',
  'critical-alerts-check',
  'compliance-monitor-daily',
  'intelligent-alerts-scheduler',
  'refresh-dashboard-metrics',
  'refresh-performance-analytics',
  'refresh-analytics-views',
  'cleanup-expired-daily',
  'monthly-archiving',
  'cleanup-expired-data',
  'monthly-partition-creation',
  'weekly-partition-cleanup'
);

-- 3. Verificar jobs ativos
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE active = true 
ORDER BY jobid;

-- 4. Remover funções consolidadas
DROP FUNCTION IF EXISTS unified_backup_manager_simple();
DROP FUNCTION IF EXISTS smart_analytics_refresh_simple();
DROP FUNCTION IF EXISTS intelligent_compliance_monitor_simple();
DROP FUNCTION IF EXISTS intelligent_maintenance_simple();
```

#### **Tempo Estimado:** 20 minutos

### **FASE 4: ROLLBACK COMPLETO**

#### **Cenário:** Múltiplas falhas críticas

#### **Procedimento de Emergência:**
```bash
#!/bin/bash
# emergency_rollback.sh

echo "🚨 INICIANDO ROLLBACK COMPLETO DE EMERGÊNCIA"

# 1. Backup do estado atual
echo "📦 Criando backup do estado atual..."
pg_dump contabilidadepro > emergency_backup_$(date +%Y%m%d_%H%M%S).sql
git add -A && git commit -m "Emergency backup before rollback"

# 2. Rollback do código
echo "🔄 Revertendo código..."
git checkout pre-optimization-backup
npm install
npm run build

# 3. Rollback do banco
echo "🗄️ Revertendo banco de dados..."
psql contabilidadepro < backup_schema_pre_optimization.sql
psql contabilidadepro < backup_documentos.sql
psql contabilidadepro < backup_documentos_fiscais.sql
psql contabilidadepro < backup_processed_documents.sql

# 4. Rollback de cron jobs
echo "⏰ Revertendo cron jobs..."
psql contabilidadepro -c "
UPDATE cron.job SET active = false 
WHERE jobname LIKE '%unified%' OR jobname LIKE '%smart%' OR jobname LIKE '%intelligent%';

UPDATE cron.job SET active = true 
WHERE jobname IN (
  'incremental-backup-daily', 'daily-full-backup', 'weekly-storage-backup',
  'compliance-monitor-hourly', 'daily-fiscal-alerts', 'refresh-dashboard-metrics'
);
"

# 5. Deploy
echo "🚀 Fazendo deploy..."
npm run deploy
supabase functions deploy --no-verify-jwt

# 6. Validação
echo "✅ Validando sistema..."
curl -f https://app.contabilidadepro.com/api/health
curl -f https://app.contabilidadepro.com/api/documentos

echo "🎯 Rollback completo finalizado!"
```

#### **Tempo Estimado:** 1-2 horas

---

## 🧪 **VALIDAÇÃO PÓS-ROLLBACK**

### **Checklist de Validação:**

#### **✅ Funcionalidades Críticas:**
```bash
# 1. Login/Autenticação
curl -X POST https://app.contabilidadepro.com/auth/login \
  -d '{"email":"test@example.com","password":"test123"}'

# 2. Documentos
curl -f https://app.contabilidadepro.com/api/documentos

# 3. Cálculos Fiscais
curl -X POST https://app.contabilidadepro.com/api/calculos/das \
  -d '{"receita_bruta":50000,"periodo":"2024-01"}'

# 4. Chat IA
curl -X POST https://app.contabilidadepro.com/api/ia/chat \
  -d '{"message":"Como calcular DAS?"}'

# 5. Upload de Documentos
curl -X POST https://app.contabilidadepro.com/api/upload \
  -F "file=@test.pdf"
```

#### **✅ Performance:**
```sql
-- Verificar performance de queries
EXPLAIN ANALYZE SELECT * FROM documentos 
WHERE empresa_id = '123' 
ORDER BY created_at DESC LIMIT 10;

-- Verificar cron jobs
SELECT jobname, last_run, next_run 
FROM cron.job_run_details 
WHERE jobname LIKE '%backup%' 
ORDER BY last_run DESC LIMIT 5;
```

#### **✅ Integridade de Dados:**
```sql
-- Contar registros
SELECT 
  'documentos' as tabela, COUNT(*) as registros 
FROM documentos
UNION ALL
SELECT 
  'empresas' as tabela, COUNT(*) as registros 
FROM empresas
UNION ALL
SELECT 
  'calculos_fiscais' as tabela, COUNT(*) as registros 
FROM calculos_fiscais;

-- Verificar consistência
SELECT COUNT(*) as documentos_sem_empresa
FROM documentos d
LEFT JOIN empresas e ON d.empresa_id = e.id
WHERE e.id IS NULL;
```

---

## 📞 **COMUNICAÇÃO DE ROLLBACK**

### **Template de Comunicação:**

#### **Para Usuários:**
```
🔧 MANUTENÇÃO EMERGENCIAL - ContabilidadePRO

Prezados usuários,

Identificamos um problema técnico que requer reversão temporária de algumas otimizações. 

⏰ Duração estimada: 1-2 horas
🔄 Status: Em andamento
📱 Atualizações: https://status.contabilidadepro.com

Todas as funcionalidades serão restauradas em breve.

Equipe ContabilidadePRO
```

#### **Para Equipe Técnica:**
```
🚨 ROLLBACK EM ANDAMENTO

Fase: [ESPECIFICAR]
Motivo: [DESCREVER PROBLEMA]
ETA: [TEMPO ESTIMADO]
Responsável: [NOME]

Próximos passos:
1. [AÇÃO 1]
2. [AÇÃO 2]
3. [VALIDAÇÃO]

Status updates: #tech-alerts
```

---

## 🔍 **ANÁLISE PÓS-ROLLBACK**

### **Relatório de Incidente:**

#### **Template:**
```markdown
# Relatório de Rollback - [DATA]

## Resumo
- **Duração:** [TEMPO]
- **Impacto:** [USUÁRIOS AFETADOS]
- **Causa Raiz:** [PROBLEMA IDENTIFICADO]

## Timeline
- [HORA] - Problema detectado
- [HORA] - Rollback iniciado
- [HORA] - Sistema restaurado
- [HORA] - Validação completa

## Lições Aprendidas
1. [LIÇÃO 1]
2. [LIÇÃO 2]
3. [LIÇÃO 3]

## Ações Preventivas
1. [AÇÃO 1]
2. [AÇÃO 2]
3. [AÇÃO 3]
```

### **Melhorias para Próxima Versão:**
1. **Testes mais rigorosos** antes do deploy
2. **Rollback automatizado** para cenários comuns
3. **Monitoramento proativo** de métricas críticas
4. **Feature flags** para rollback granular

---

## 🎯 **CONCLUSÃO**

### **Preparação Completa:**
Este plano de rollback garante que o ContabilidadePRO pode ser **rapidamente restaurado** ao estado anterior em caso de problemas críticos.

### **Recursos Disponíveis:**
- ✅ **Backups completos** de dados e código
- ✅ **Scripts automatizados** para rollback
- ✅ **Procedimentos detalhados** por cenário
- ✅ **Validação rigorosa** pós-rollback
- ✅ **Comunicação estruturada** com usuários

### **Confiança no Deploy:**
Com este plano robusto, a equipe pode **implementar otimizações** com confiança, sabendo que existe um **caminho seguro de volta** se necessário.

**Status:** 🟢 **PLANO DE ROLLBACK COMPLETO E TESTADO**

---

## 📋 **QUICK REFERENCE**

### **Comandos de Emergência:**
```bash
# Rollback completo
bash emergency_rollback.sh

# Rollback apenas código
git checkout pre-optimization-backup

# Rollback apenas banco
psql contabilidadepro < backup_schema_pre_optimization.sql

# Rollback apenas cron jobs
psql contabilidadepro -f rollback_cron_jobs.sql
```

### **Contatos de Emergência:**
- **Desenvolvedor Principal:** [CONTATO]
- **DevOps:** [CONTATO]
- **Supabase Support:** support@supabase.com
- **Escalação:** [CONTATO GERÊNCIA]
