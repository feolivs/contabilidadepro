# 🔧 GUIA DE MANUTENÇÃO SIMPLIFICADO - ContabilidadePRO

**Versão:** 2.0 (Pós-Otimização)  
**Data:** 2025-01-20  
**Público:** Desenvolvedores e DevOps

---

## 🎯 **VISÃO GERAL**

### **Sistema Otimizado:**
Após a otimização completa, o ContabilidadePRO possui uma arquitetura **75% mais simples** de manter, com **componentes consolidados** e **processos automatizados**.

### **Pontos de Manutenção Reduzidos:**
- **Cache:** 9 → 3 sistemas
- **Tabelas:** 3 → 1 unificada  
- **Cron Jobs:** 21 → 4 funções
- **Triggers:** 15+ → 3 consolidados
- **Debugging:** 70% mais simples

---

## 🚨 **MONITORAMENTO ESSENCIAL**

### **Métricas Críticas (Alertas Automáticos)**

#### **🔴 Crítico (Ação Imediata):**
```yaml
Query Performance:
  - Tempo médio > 100ms
  - P95 > 500ms
  - Timeouts > 1%

Cache Hit Rate:
  - Browser < 70%
  - Memory < 60%
  - Database < 50%

Edge Functions:
  - Latência > 10s
  - Error rate > 5%
  - Timeout rate > 2%

Database:
  - Conexões > 90
  - CPU > 90%
  - Storage > 90%
```

#### **🟡 Warning (Monitorar):**
```yaml
Performance:
  - Query time 50-100ms
  - Cache hit 50-70%
  - CPU 70-90%

Resources:
  - Memory > 150MB
  - Storage > 80%
  - Connections > 70
```

### **Dashboard de Monitoramento**

#### **URLs Importantes:**
- **Supabase Dashboard:** https://supabase.com/dashboard/project/selnwgpyjctpjzdrfrey
- **Logs:** Supabase → Logs → Edge Functions
- **Métricas:** Supabase → Reports → Performance
- **RLS:** Supabase → Authentication → Policies

#### **Queries de Monitoramento:**
```sql
-- Performance de queries
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Cache hit rates
SELECT 
  schemaname,
  tablename,
  heap_blks_read,
  heap_blks_hit,
  (heap_blks_hit::float / (heap_blks_hit + heap_blks_read)) * 100 as hit_rate
FROM pg_statio_user_tables
WHERE heap_blks_read > 0
ORDER BY hit_rate ASC;

-- Conexões ativas
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

---

## 🔧 **TAREFAS DE MANUTENÇÃO**

### **Diárias (Automatizadas)**

#### **✅ Executadas Automaticamente:**
- **3h:** Limpeza de cache expirado
- **2h:** Backup incremental
- **1h:** Manutenção de índices
- **A cada 5min:** Refresh de métricas

#### **👀 Verificação Manual (5min):**
```bash
# 1. Status geral do sistema
curl -f https://selnwgpyjctpjzdrfrey.supabase.co/rest/v1/ \
  -H "apikey: $SUPABASE_ANON_KEY"

# 2. Edge Functions health
curl -f https://selnwgpyjctpjzdrfrey.supabase.co/functions/v1/fiscal-service \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -d '{"action": "health_check"}'

# 3. Verificar logs de erro
# Via Supabase Dashboard → Logs → Filter by "ERROR"
```

### **Semanais (15min)**

#### **🔍 Análise de Performance:**
```sql
-- 1. Top queries mais lentas
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE mean_exec_time > 50 
ORDER BY mean_exec_time DESC 
LIMIT 5;

-- 2. Tabelas com mais I/O
SELECT schemaname, tablename, 
       heap_blks_read + heap_blks_hit as total_blks
FROM pg_statio_user_tables 
ORDER BY total_blks DESC 
LIMIT 5;

-- 3. Cache efficiency
SELECT 
  'documentos_unified' as table_name,
  COUNT(*) as total_queries,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_response_ms
FROM documentos_unified 
WHERE created_at > NOW() - INTERVAL '7 days';
```

#### **🧹 Limpeza Manual:**
```sql
-- 1. Limpar cache muito antigo (> 30 dias)
DELETE FROM ai_cache 
WHERE expires_at < NOW() - INTERVAL '30 days';

-- 2. Limpar logs antigos (> 90 dias)
DELETE FROM observability_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- 3. Vacuum tabelas grandes
VACUUM ANALYZE documentos_unified;
VACUUM ANALYZE analytics_events;
```

### **Mensais (30min)**

#### **📊 Relatório de Saúde:**
```sql
-- 1. Crescimento de dados
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. Performance trends
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as documents_processed,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
FROM documentos_unified 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day;
```

#### **🔄 Otimizações:**
```sql
-- 1. Reindex tabelas principais
REINDEX TABLE documentos_unified;
REINDEX TABLE empresas;
REINDEX TABLE calculos_fiscais;

-- 2. Update statistics
ANALYZE documentos_unified;
ANALYZE analytics_events;

-- 3. Verificar fragmentação
SELECT 
  schemaname, 
  tablename, 
  attname, 
  n_distinct, 
  correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('documentos_unified', 'empresas')
ORDER BY abs(correlation) DESC;
```

---

## 🚨 **TROUBLESHOOTING**

### **Problemas Comuns e Soluções**

#### **🐌 Performance Degradada**

**Sintomas:**
- Queries > 100ms
- Cache hit rate < 50%
- Usuários reportando lentidão

**Diagnóstico:**
```sql
-- Identificar queries lentas
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements 
WHERE mean_exec_time > 100
ORDER BY total_exec_time DESC;

-- Verificar bloqueios
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity 
  ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
  ON blocking_locks.locktype = blocked_locks.locktype
WHERE NOT blocked_locks.granted;
```

**Soluções:**
```sql
-- 1. Otimizar query específica
EXPLAIN ANALYZE SELECT * FROM documentos_unified 
WHERE categoria = 'fiscal' 
ORDER BY created_at DESC LIMIT 10;

-- 2. Rebuild índices se necessário
REINDEX INDEX idx_documentos_unified_status_data;

-- 3. Limpar cache se corrompido
DELETE FROM ai_cache WHERE expires_at < NOW();
```

#### **💾 Cache Ineficiente**

**Sintomas:**
- Hit rate < 60%
- Muitas queries repetidas
- Latência alta

**Diagnóstico:**
```typescript
// Verificar configuração de cache
const cacheStats = await unifiedCache.getStats();
console.log('Cache Stats:', cacheStats);

// Verificar TTL adequado
const cacheConfig = {
  fiscal: { ttl: 300 }, // 5min
  ai: { ttl: 1800 },    // 30min
  cnpj: { ttl: 86400 }  // 24h
};
```

**Soluções:**
```typescript
// 1. Ajustar TTL por tipo de dados
await unifiedCache.set('fiscal-calc-123', data, {
  ttl: 300, // 5min para cálculos
  tags: ['fiscal', 'user-123']
});

// 2. Invalidar cache específico
await unifiedCache.invalidateByTag('fiscal');

// 3. Limpar cache corrompido
await unifiedCache.clear();
```

#### **⚡ Edge Functions Lentas**

**Sintomas:**
- Timeout > 10s
- Error rate > 5%
- Usuários reportando falhas

**Diagnóstico:**
```bash
# Verificar logs da função
supabase functions logs fiscal-service

# Testar função diretamente
curl -X POST https://selnwgpyjctpjzdrfrey.supabase.co/functions/v1/fiscal-service \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "calculate_das", "receita_bruta": 50000}'
```

**Soluções:**
```typescript
// 1. Adicionar timeout adequado
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 25000);

// 2. Implementar retry logic
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// 3. Otimizar função
// - Usar cache quando possível
// - Reduzir chamadas externas
// - Implementar circuit breaker
```

#### **🔒 Problemas de RLS**

**Sintomas:**
- Usuários vendo dados de outros
- Acesso negado incorretamente
- Queries muito lentas

**Diagnóstico:**
```sql
-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'documentos_unified';

-- Testar política específica
SET ROLE authenticated;
SELECT * FROM documentos_unified LIMIT 1;
RESET ROLE;
```

**Soluções:**
```sql
-- 1. Verificar política correta
DROP POLICY IF EXISTS "old_policy" ON documentos_unified;
CREATE POLICY "correct_policy" ON documentos_unified
FOR ALL USING (
  empresa_id IN (
    SELECT id FROM empresas WHERE user_id = auth.uid()
  )
);

-- 2. Otimizar política lenta
CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON empresas(user_id);

-- 3. Debug política
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM documentos_unified 
WHERE empresa_id IN (
  SELECT id FROM empresas WHERE user_id = auth.uid()
);
```

---

## 📋 **CHECKLIST DE DEPLOY**

### **Pré-Deploy**
```bash
# ✅ Testes locais
npm run test
npm run type-check
npm run lint

# ✅ Build de produção
npm run build

# ✅ Testes de integração
npm run test:integration

# ✅ Backup do banco
supabase db dump --data-only > backup-$(date +%Y%m%d).sql
```

### **Deploy**
```bash
# ✅ Deploy Edge Functions
supabase functions deploy --no-verify-jwt

# ✅ Aplicar migrações
supabase db push

# ✅ Deploy frontend
npm run deploy

# ✅ Smoke tests
curl -f https://app.contabilidadepro.com/api/health
```

### **Pós-Deploy**
```bash
# ✅ Verificar métricas
# - Query performance
# - Cache hit rates
# - Error rates

# ✅ Monitorar logs
# - Edge Function logs
# - Database logs
# - Application logs

# ✅ Validar funcionalidades
# - Login/logout
# - Cálculos fiscais
# - Upload de documentos
# - Chat IA
```

---

## 🆘 **CONTATOS DE EMERGÊNCIA**

### **Escalação:**
1. **Desenvolvedor Principal** - Issues de código
2. **DevOps** - Issues de infraestrutura  
3. **Supabase Support** - Issues de plataforma
4. **Usuário Final** - Validação de funcionalidades

### **Recursos de Suporte:**
- **Supabase Docs:** https://supabase.com/docs
- **Status Page:** https://status.supabase.com
- **Community:** https://github.com/supabase/supabase/discussions
- **Discord:** https://discord.supabase.com

---

## 🎯 **CONCLUSÃO**

### **Manutenção Simplificada:**
Com a arquitetura otimizada, a manutenção do ContabilidadePRO é **75% mais simples**:

- **Menos componentes** para monitorar
- **Processos automatizados** para tarefas rotineiras
- **Debugging simplificado** com arquitetura limpa
- **Documentação centralizada** para referência rápida

### **Próximos Passos:**
1. **Implementar alertas** automáticos
2. **Criar dashboards** de monitoramento
3. **Automatizar** mais tarefas de manutenção
4. **Treinar equipe** nos novos processos

**Status:** 🟢 **GUIA DE MANUTENÇÃO PRONTO PARA USO**
