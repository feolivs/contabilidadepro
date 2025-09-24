# 🤖 Guia de Integração com Supabase AI Assistant v2

## 📋 Visão Geral

O **Supabase AI Assistant v2** é uma ferramenta integrada ao dashboard do Supabase que pode ser acessada via `cmd+i` (ou `ctrl+i` no Windows). Este guia mostra como aproveitar ao máximo esta ferramenta no desenvolvimento do ContabilidadePRO.

## 🚀 Como Acessar

### No Dashboard do Supabase:
1. **Abra seu projeto** no dashboard do Supabase
2. **Pressione `cmd+i`** (Mac) ou `ctrl+i` (Windows/Linux)
3. **O painel do AI Assistant** aparecerá na lateral direita

### Funcionalidades Disponíveis:
- ✅ **Schema Design** - Design de banco de dados
- ✅ **Query Writing** - Escrita de queries SQL
- ✅ **Query Debugging** - Debug de queries problemáticas
- ✅ **RLS Policies** - Criação de políticas de segurança
- ✅ **Functions & Triggers** - Criação de funções PostgreSQL
- ✅ **SQL to supabase-js** - Conversão de código

## 🛠️ Funções Helper Implementadas

### 1. **Preparar Contexto para IA**
```typescript
// Chama nossa Edge Function para preparar contexto
const response = await fetch('/functions/v1/ai-assistant-v2', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`
  },
  body: JSON.stringify({
    operation: 'prepare_context',
    data: {
      table_name: 'empresas', // opcional
      include_relationships: true
    }
  })
})

const context = await response.json()
// Use este contexto ao fazer perguntas para o AI Assistant
```

### 2. **Analisar Schema**
```typescript
const analysis = await fetch('/functions/v1/ai-assistant-v2', {
  method: 'POST',
  body: JSON.stringify({
    operation: 'analyze_schema',
    data: { table_name: 'calculos_fiscais' } // opcional
  })
})
```

### 3. **Obter Sugestões**
```typescript
const suggestions = await fetch('/functions/v1/ai-assistant-v2', {
  method: 'POST',
  body: JSON.stringify({
    operation: 'get_suggestions',
    data: { task_type: 'schema_design' }
  })
})
```

## 💡 Exemplos Práticos de Uso

### **Schema Design**
```
Prompt para o AI Assistant (cmd+i):

"Crie uma tabela para controlar prazos fiscais brasileiros com os seguintes requisitos:
- Diferentes tipos de obrigações (DAS, DARF, SPED, etc.)
- Datas de vencimento
- Status de cumprimento
- Integração com tabela de empresas
- Campos de auditoria
- RLS para multi-tenant"
```

### **Query Debugging**
```
Prompt para o AI Assistant:

"Esta query está muito lenta, como otimizar?

SELECT e.razao_social, COUNT(c.id) as total_calculos
FROM empresas e
LEFT JOIN calculos_fiscais c ON e.id = c.empresa_id
WHERE c.created_at >= '2024-01-01'
GROUP BY e.id, e.razao_social
ORDER BY total_calculos DESC;"
```

### **RLS Policies**
```
Prompt para o AI Assistant:

"Crie políticas RLS para a tabela 'documentos_fiscais' garantindo que:
- Usuários só vejam documentos de suas empresas
- Administradores vejam todos os documentos
- Auditores vejam apenas em modo leitura
- Use auth.uid() e tabela de permissões"
```

### **SQL para Supabase-JS**
```
Prompt para o AI Assistant:

"Converta esta query para supabase-js:

SELECT d.*, e.razao_social 
FROM documentos d
JOIN empresas e ON d.empresa_id = e.id
WHERE d.tipo = 'NFe' 
AND d.status = 'processado'
ORDER BY d.created_at DESC
LIMIT 10;"
```

## 🔧 Funções PostgreSQL Disponíveis

### **Para Análise de Schema**
```sql
-- Obter informações do schema para IA
SELECT * FROM get_schema_for_ai_assistant('public');

-- Obter relacionamentos entre tabelas
SELECT * FROM get_table_relationships_for_ai();

-- Analisar performance de query
SELECT * FROM analyze_query_for_ai_assistant('SELECT * FROM empresas');

-- Converter SQL para supabase-js
SELECT * FROM sql_to_supabase_js_helper('SELECT * FROM empresas WHERE ativo = true');
```

## 📊 Monitoramento e Logs

### **Logs Automáticos**
- ✅ **Cron job** roda a cada 6 horas
- ✅ **Relatórios de uso** salvos em `system_logs`
- ✅ **Limpeza automática** de logs antigos (30 dias)

### **Tabela de Interações**
```sql
-- Ver suas interações com AI Assistant
SELECT * FROM ai_assistant_interactions 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

## 🎯 Melhores Práticas

### **1. Preparação de Contexto**
- **Sempre prepare contexto** antes de usar o AI Assistant
- **Seja específico** sobre o domínio (contabilidade brasileira)
- **Inclua informações** sobre tabelas relacionadas

### **2. Prompts Efetivos**
- **Use linguagem clara** e específica
- **Mencione padrões brasileiros** (DAS, NFe, Simples Nacional)
- **Especifique tipos de dados** (NUMERIC para valores financeiros)
- **Peça por RLS policies** quando apropriado

### **3. Validação**
- **Sempre teste** o código gerado
- **Valide queries** com EXPLAIN ANALYZE
- **Teste RLS policies** com diferentes usuários
- **Use TypeScript** para melhor type safety

## 🚨 Limitações e Considerações

### **O que o AI Assistant PODE fazer:**
- ✅ Gerar SQL DDL para criação de tabelas
- ✅ Otimizar queries existentes
- ✅ Criar RLS policies
- ✅ Converter SQL para supabase-js
- ✅ Explicar erros de SQL

### **O que o AI Assistant NÃO pode fazer:**
- ❌ Executar queries diretamente no banco
- ❌ Acessar dados sensíveis
- ❌ Fazer deploy automático de mudanças
- ❌ Integrar com APIs externas

### **Segurança:**
- 🔒 **Nunca compartilhe** dados sensíveis nos prompts
- 🔒 **Sempre revise** o código gerado
- 🔒 **Teste em ambiente** de desenvolvimento primeiro
- 🔒 **Valide RLS policies** cuidadosamente

## 📈 Métricas de Sucesso

### **Indicadores de Produtividade:**
- ⏱️ **Tempo de desenvolvimento** reduzido em 40-60%
- 🐛 **Menos bugs** em queries SQL
- 🔒 **RLS policies** mais consistentes
- 📚 **Melhor documentação** de código

### **Monitoramento:**
```sql
-- Ver estatísticas de uso
SELECT 
  interaction_type,
  COUNT(*) as total_uses,
  AVG(execution_time_ms) as avg_time,
  COUNT(*) FILTER (WHERE success = true) as successful_uses
FROM ai_assistant_interactions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY interaction_type;
```

## 🔄 Próximos Passos

1. **Teste as funções helper** implementadas
2. **Experimente diferentes tipos** de prompts
3. **Documente padrões** que funcionam bem
4. **Treine a equipe** no uso efetivo
5. **Monitore métricas** de produtividade

---

**💡 Dica:** O AI Assistant aprende com o contexto do seu projeto. Quanto mais específico você for sobre o domínio contábil brasileiro, melhores serão as respostas!
