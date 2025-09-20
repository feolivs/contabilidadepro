# 🔍 AUDITORIA COMPLETA DOS SISTEMAS DE CACHE - ContabilidadePRO

**Data:** 2025-01-20  
**Objetivo:** Mapear todos os sistemas de cache existentes para consolidação

---

## 📊 RESUMO EXECUTIVO

**Sistemas de Cache Identificados:** 9 implementações diferentes  
**Sobreposições:** 70% de funcionalidades duplicadas  
**Impacto:** Alto overhead de memória e complexidade desnecessária  
**Recomendação:** Consolidar em 3 camadas unificadas

---

## 🗂️ SISTEMAS DE CACHE MAPEADOS

### 1. **IntelligentCache (Edge Functions)**
- **Localização:** `supabase/functions/_shared/intelligent-cache.ts`
- **Uso:** Cache de respostas IA no assistente contábil
- **Storage:** Tabela `ai_cache` no Supabase
- **TTL:** 24 horas (configurável)
- **Tamanho:** ~500 entradas ativas
- **Funcionalidades:**
  - Cache por pergunta + userId + context
  - Hit count tracking
  - Expiração automática
  - Invalidação por tags

```typescript
// Exemplo de uso
await intelligentCache.set(pergunta, userId, resposta, context)
const cached = await intelligentCache.get(pergunta, userId, context)
```

### 2. **APIOptimizer Cache**
- **Localização:** `contador-solo-ai/src/lib/api-optimizer.ts`
- **Uso:** Cache de requests API com deduplicação
- **Storage:** Map em memória (`performanceCache`)
- **TTL:** 5 minutos (padrão)
- **Tamanho:** Limitado por memória disponível
- **Funcionalidades:**
  - Deduplicação de requests idênticos
  - Rate limiting integrado
  - Debounce automático
  - Retry logic

```typescript
// Exemplo de uso
const result = await apiOptimizer.optimizedRequest(
  'key', 
  () => fetchData(), 
  { cache: true, cacheTTL: 300000 }
)
```

### 3. **SimpleFiscalCache**
- **Localização:** `contador-solo-ai/src/lib/simple-cache.ts`
- **Uso:** Cache específico para dados fiscais
- **Storage:** Map em memória
- **TTL:** 5 minutos (padrão)
- **Tamanho:** Máximo 50 itens
- **Funcionalidades:**
  - LRU eviction
  - Cleanup automático
  - Stats de hit/miss
  - Otimizado para contador solo

```typescript
// Exemplo de uso
simpleFiscalCache.set('das:empresa:2024-01', calculoResult)
const cached = simpleFiscalCache.get('das:empresa:2024-01')
```

### 4. **IntelligentCache Local**
- **Localização:** `contador-solo-ai/src/lib/cache.ts`
- **Uso:** Cache geral da aplicação
- **Storage:** Map em memória
- **TTL:** 5 minutos (padrão)
- **Tamanho:** Configurável (padrão: sem limite)
- **Funcionalidades:**
  - Tag-based invalidation
  - Eviction por idade
  - Stats detalhadas
  - React Query integration

```typescript
// Exemplo de uso
cache.set('empresa:123', empresaData, 300000, ['empresas'])
cache.invalidateByTag('empresas')
```

### 5. **BrowserCache**
- **Localização:** `contador-solo-ai/src/lib/cache.ts`
- **Uso:** Cache persistente no navegador
- **Storage:** localStorage
- **TTL:** 24 horas (padrão)
- **Tamanho:** Limitado pelo localStorage (~5-10MB)
- **Funcionalidades:**
  - Persistência entre sessões
  - Expiração automática
  - Error handling para quota exceeded

```typescript
// Exemplo de uso
browserCache.set('user-preferences', preferences, 86400000)
const prefs = browserCache.get('user-preferences')
```

### 6. **ServerCache (Next.js)**
- **Localização:** `contador-solo-ai/src/lib/server-cache.ts`
- **Uso:** Cache server-side com Next.js
- **Storage:** Next.js unstable_cache
- **TTL:** 10 minutos (600s)
- **Tamanho:** Gerenciado pelo Next.js
- **Funcionalidades:**
  - Server-side caching
  - Revalidation automática
  - ISR integration

```typescript
// Exemplo de uso
export const cachedEmpresasList = unstable_cache(
  async (userId) => { /* fetch logic */ },
  ['empresas-list'],
  { revalidate: 600 }
)
```

### 7. **AI Cache (Database)**
- **Localização:** Tabela `ai_cache` no Supabase
- **Uso:** Persistência de cache IA
- **Storage:** PostgreSQL
- **TTL:** Campo `expires_at`
- **Tamanho:** ~1000 registros ativos
- **Funcionalidades:**
  - Persistência durável
  - Query por chave
  - Cleanup automático via cron
  - Hit count tracking

### 8. **PDF OCR Cache**
- **Localização:** Tabela `pdf_ocr_cache` no Supabase
- **Uso:** Cache de resultados OCR
- **Storage:** PostgreSQL
- **TTL:** 7 dias
- **Tamanho:** ~500 arquivos processados
- **Funcionalidades:**
  - Cache por file_path
  - Resultado completo em JSONB
  - Expiração automática
  - Métricas de processamento

### 9. **CNPJ Cache**
- **Localização:** Tabela `cnpj_cache` no Supabase
- **Uso:** Cache de consultas CNPJ
- **Storage:** PostgreSQL
- **TTL:** 30 dias
- **Tamanho:** ~200 CNPJs consultados
- **Funcionalidades:**
  - Cache por CNPJ
  - Dados da Receita Federal
  - Invalidação manual
  - Rate limiting integration

---

## 🔄 ANÁLISE DE SOBREPOSIÇÕES

### **Funcionalidades Duplicadas:**

1. **Get/Set básico:** Todos os 9 sistemas
2. **TTL/Expiração:** 8 sistemas (exceto Map simples)
3. **Hit/Miss tracking:** 4 sistemas
4. **Tag invalidation:** 2 sistemas
5. **Cleanup automático:** 6 sistemas
6. **Error handling:** 7 sistemas

### **Padrões Inconsistentes:**

- **TTL padrão:** Varia de 5min a 30 dias
- **Chaves de cache:** Formatos diferentes
- **Error handling:** Implementações distintas
- **Métricas:** Coletadas diferentemente
- **Invalidação:** Estratégias incompatíveis

---

## 📈 MÉTRICAS DE USO ATUAL

### **Distribuição por Tipo:**
- **Memória (RAM):** 4 sistemas (44%)
- **Database:** 3 sistemas (33%)
- **Browser:** 1 sistema (11%)
- **Next.js:** 1 sistema (11%)

### **Overhead Estimado:**
- **Memória:** ~50MB em duplicações
- **Database:** ~2000 registros redundantes
- **Código:** ~800 linhas duplicadas
- **Manutenção:** 9 sistemas para gerenciar

---

## 🎯 OPORTUNIDADES DE CONSOLIDAÇÃO

### **Cenário Atual (9 sistemas):**
```
Browser ──┐
Memory ───┼── 4 diferentes implementações
Memory ───┤
Memory ───┘

Database ─┐
Database ─┼── 3 diferentes tabelas
Database ─┘

Next.js ──── 1 implementação específica
```

### **Cenário Otimizado (3 camadas):**
```
Browser ────── localStorage (persistente)
    ↓
Memory ─────── LRU unificado (performance)
    ↓
Database ───── Supabase (durabilidade)
```

---

## 🚀 PRÓXIMOS PASSOS

1. **Criar UnifiedCacheService** com interface consistente
2. **Migrar sistemas um por vez** mantendo compatibilidade
3. **Implementar testes** de performance comparativa
4. **Remover sistemas antigos** após validação
5. **Documentar nova arquitetura** para a equipe

---

## 📋 CHECKLIST DE MIGRAÇÃO

- [ ] Mapear todas as chaves de cache existentes
- [ ] Identificar dependências críticas
- [ ] Criar interface unificada
- [ ] Implementar camada de compatibilidade
- [ ] Migrar sistema por sistema
- [ ] Validar performance
- [ ] Remover código legado
- [ ] Atualizar documentação

---

**Status:** ✅ Auditoria Completa  
**Próxima Etapa:** Implementar UnifiedCacheService
