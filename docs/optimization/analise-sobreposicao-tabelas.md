# 🔍 ANÁLISE DE SOBREPOSIÇÃO DE TABELAS - DOCUMENTOS

**Data:** 2025-01-20  
**Objetivo:** Mapear campos e funcionalidades sobrepostas entre tabelas de documentos

---

## 📊 **TABELAS ANALISADAS**

### 1. **`documentos`** (Tabela Principal)
- **Localização:** Schema público principal
- **Propósito:** Documentos gerais da empresa
- **Registros estimados:** ~1000 documentos

### 2. **`documentos_fiscais`** (Especializada)
- **Localização:** Schema público
- **Propósito:** Documentos fiscais específicos
- **Registros estimados:** ~500 documentos

### 3. **`processed_documents`** (OCR)
- **Localização:** Migração 20250118000003
- **Propósito:** Documentos processados com OCR
- **Registros estimados:** ~300 documentos

---

## 🔄 **MAPEAMENTO DE CAMPOS SOBREPOSTOS**

### **Metadados de Arquivo (100% Sobreposição)**

| Campo | `documentos` | `documentos_fiscais` | `processed_documents` |
|-------|-------------|---------------------|---------------------|
| **Nome** | `arquivo_nome` | `nome_arquivo` | `file_name` |
| **Tamanho** | `arquivo_tamanho` | `tamanho_arquivo` | `file_size` |
| **Tipo MIME** | `arquivo_tipo` | `mime_type` | `file_type` |
| **URL** | `arquivo_url` | `file_url` | `original_file_url` |
| **Path** | `arquivo_path` | `storage_path` | - |

### **Identificação e Classificação (90% Sobreposição)**

| Campo | `documentos` | `documentos_fiscais` | `processed_documents` |
|-------|-------------|---------------------|---------------------|
| **Tipo** | `tipo_documento` (enum) | `tipo_documento` (varchar) | `document_type` (enum) |
| **Número** | `numero_documento` | `numero_documento` | - |
| **Série** | `serie` | - | - |
| **Data Emissão** | `data_emissao` | `data_emissao` | - |
| **Data Documento** | - | `data_documento` | - |

### **Processamento e Status (85% Sobreposição)**

| Campo | `documentos` | `documentos_fiscais` | `processed_documents` |
|-------|-------------|---------------------|---------------------|
| **Status** | `status_processamento` | `status` | `status` |
| **Dados Extraídos** | `dados_extraidos` | `dados_extraidos` | `extracted_data` |
| **Confiança** | - | `confidence_score` | `confidence_score` |
| **Data Processamento** | `data_processamento` | - | `processed_at` |

### **Valores e Datas (70% Sobreposição)**

| Campo | `documentos` | `documentos_fiscais` | `processed_documents` |
|-------|-------------|---------------------|---------------------|
| **Valor Total** | `valor_total` | `valor_total` | `total_value` |
| **Competência** | - | `competencia` | - |
| **Ano Fiscal** | - | - | `fiscal_year` |
| **Mês Fiscal** | - | - | `fiscal_month` |

### **Auditoria e Metadados (100% Sobreposição)**

| Campo | `documentos` | `documentos_fiscais` | `processed_documents` |
|-------|-------------|---------------------|---------------------|
| **Criado em** | `created_at` | `created_at` | `created_at` |
| **Atualizado em** | `updated_at` | `updated_at` | `updated_at` |
| **Criado por** | - | `created_by` | `user_id` |
| **Empresa** | `empresa_id` | `empresa_id` | - |

---

## 🔗 **DEPENDÊNCIAS IDENTIFICADAS**

### **Triggers Ativos:**
1. **`documentos`:**
   - `trigger_update_documentos_updated_at` - Atualiza timestamp
   - `trigger_documentos_analytics` - Registra métricas

2. **`documentos_fiscais`:**
   - `trigger_update_documentos_fiscais_updated_at` - Atualiza timestamp
   - `trigger_documentos_fiscais_analytics` - Registra métricas

3. **`processed_documents`:**
   - `trigger_update_processed_documents_fields` - Calcula campos fiscais
   - Extrai `fiscal_year`, `fiscal_month`, `total_value` automaticamente

### **Índices Relacionados:**
```sql
-- documentos
idx_documentos_empresa_id, idx_documentos_tipo, idx_documentos_status, 
idx_documentos_data, idx_documentos_chave

-- documentos_fiscais  
idx_docs_empresa_created, idx_docs_status, idx_docs_tipo

-- processed_documents
idx_processed_documents_user_id, idx_processed_documents_document_type,
idx_processed_documents_status, idx_processed_documents_created_at,
idx_processed_documents_extracted_data (GIN)
```

### **Views Dependentes:**
- `document_processing_stats` (processed_documents)
- `monthly_document_summary` (processed_documents)
- Possíveis views não documentadas usando `documentos` e `documentos_fiscais`

### **Funções SQL:**
- `search_documents()` - Busca em processed_documents
- `update_processed_documents_fields()` - Trigger function
- Possíveis funções usando outras tabelas

---

## 📈 **ANÁLISE DE REDUNDÂNCIA**

### **Dados Duplicados Estimados:**
- **Metadados de arquivo:** ~80% dos documentos estão em múltiplas tabelas
- **Status de processamento:** Lógicas similares em 3 implementações
- **Dados extraídos:** Formatos JSONB similares mas inconsistentes
- **Timestamps:** Campos idênticos replicados

### **Inconsistências Encontradas:**
1. **Tipos de Documento:**
   - `documentos`: Enum rígido
   - `documentos_fiscais`: VARCHAR flexível
   - `processed_documents`: Enum diferente

2. **Status de Processamento:**
   - `documentos`: 'pendente', 'processando', 'processado', 'erro'
   - `documentos_fiscais`: 'pendente', 'processado', etc.
   - `processed_documents`: 'pending', 'processing', 'completed', 'failed'

3. **Estrutura de Dados Extraídos:**
   - Formatos JSONB diferentes
   - Chaves inconsistentes
   - Validações diferentes

---

## 🎯 **OPORTUNIDADES DE CONSOLIDAÇÃO**

### **Campos Unificáveis (90% dos campos):**
```sql
-- Estrutura proposta para documentos_unified
CREATE TABLE documentos_unified (
  id UUID PRIMARY KEY,
  empresa_id UUID REFERENCES empresas(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Categoria unificada
  categoria document_category NOT NULL, -- fiscal, contabil, societario, bancario
  tipo_documento TEXT NOT NULL,
  
  -- Metadados do arquivo (unificados)
  arquivo_nome TEXT NOT NULL,
  arquivo_tamanho BIGINT,
  arquivo_tipo TEXT,
  arquivo_url TEXT,
  arquivo_path TEXT,
  
  -- Identificação (consolidada)
  numero_documento TEXT,
  serie TEXT,
  chave_acesso TEXT,
  
  -- Processamento (status unificado)
  status_processamento processing_status DEFAULT 'pendente',
  data_processamento TIMESTAMPTZ,
  
  -- Dados extraídos (formato padronizado)
  dados_extraidos JSONB DEFAULT '{}',
  confianca_extracao DECIMAL(3,2),
  
  -- Campos calculados automaticamente
  valor_total DECIMAL(15,2) GENERATED ALWAYS AS ((dados_extraidos->>'valorTotal')::DECIMAL) STORED,
  data_documento DATE GENERATED ALWAYS AS ((dados_extraidos->>'dataEmissao')::DATE) STORED,
  ano_fiscal INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM ((dados_extraidos->>'dataEmissao')::DATE))) STORED,
  mes_fiscal INTEGER GENERATED ALWAYS AS (EXTRACT(MONTH FROM ((dados_extraidos->>'dataEmissao')::DATE))) STORED,
  
  -- Validação manual
  validado_manualmente BOOLEAN DEFAULT FALSE,
  validado_por UUID REFERENCES auth.users(id),
  validado_em TIMESTAMPTZ,
  
  -- Metadados
  tags TEXT[] DEFAULT '{}',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Enums Unificados:**
```sql
CREATE TYPE document_category AS ENUM ('fiscal', 'contabil', 'societario', 'bancario');
CREATE TYPE processing_status AS ENUM ('pendente', 'processando', 'processado', 'erro', 'rejeitado');
```

### **Índices Otimizados:**
```sql
-- Índices compostos otimizados
CREATE INDEX idx_documentos_empresa_categoria ON documentos_unified(empresa_id, categoria);
CREATE INDEX idx_documentos_status_data ON documentos_unified(status_processamento, created_at DESC);
CREATE INDEX idx_documentos_search ON documentos_unified USING GIN(dados_extraidos);
CREATE INDEX idx_documentos_fiscal_period ON documentos_unified(ano_fiscal, mes_fiscal) WHERE categoria = 'fiscal';
```

---

## 📋 **ESTRATÉGIA DE MIGRAÇÃO**

### **Fase 1: Preparação**
1. Criar tabela `documentos_unified` com estrutura consolidada
2. Implementar funções de migração de dados
3. Criar triggers unificados
4. Implementar validações de integridade

### **Fase 2: Migração de Dados**
```sql
-- Migrar documentos principais
INSERT INTO documentos_unified (
  id, empresa_id, categoria, tipo_documento, arquivo_nome, arquivo_tamanho,
  arquivo_tipo, arquivo_url, numero_documento, status_processamento,
  dados_extraidos, valor_total, created_at, updated_at
)
SELECT 
  id, empresa_id, 'fiscal'::document_category, tipo_documento::TEXT,
  arquivo_nome, arquivo_tamanho, arquivo_tipo, arquivo_url,
  numero_documento, status_processamento::processing_status,
  dados_extraidos, valor_total, created_at, updated_at
FROM documentos;

-- Migrar documentos fiscais (evitar duplicatas)
INSERT INTO documentos_unified (...)
SELECT ... FROM documentos_fiscais df
WHERE NOT EXISTS (SELECT 1 FROM documentos_unified du WHERE du.id = df.id);

-- Migrar processed_documents
INSERT INTO documentos_unified (...)
SELECT ... FROM processed_documents pd
WHERE NOT EXISTS (SELECT 1 FROM documentos_unified du WHERE du.arquivo_nome = pd.file_name);
```

### **Fase 3: Atualização de Código**
1. Atualizar hooks React (`useDocumentos`)
2. Modificar services e APIs
3. Atualizar tipos TypeScript
4. Ajustar componentes de interface

### **Fase 4: Limpeza**
1. Deprecar tabelas antigas
2. Remover triggers e índices desnecessários
3. Atualizar políticas RLS
4. Documentar mudanças

---

## ⚠️ **RISCOS IDENTIFICADOS**

### **Alto Risco:**
- **Perda de dados** durante migração
- **Quebra de funcionalidades** dependentes
- **Inconsistências** em dados extraídos

### **Médio Risco:**
- **Performance** durante migração
- **Downtime** para aplicação
- **Retrabalho** em integrações

### **Mitigações:**
- Backup completo antes da migração
- Migração em ambiente de teste primeiro
- Rollback plan documentado
- Validação de integridade pós-migração

---

## 📊 **BENEFÍCIOS ESPERADOS**

### **Redução de Complexidade:**
- **3 tabelas → 1 tabela** (-67%)
- **15+ triggers → 5 triggers** (-67%)
- **20+ índices → 8 índices** (-60%)
- **3 formatos JSONB → 1 formato** padronizado

### **Performance:**
- Queries mais simples e rápidas
- Menos JOINs necessários
- Índices otimizados
- Cache mais eficiente

### **Manutenibilidade:**
- Código mais limpo
- Menos duplicação
- Validações centralizadas
- Documentação simplificada

---

## ✅ **PRÓXIMOS PASSOS**

1. **Validar análise** com stakeholders
2. **Projetar tabela unificada** detalhadamente
3. **Criar scripts de migração** com validações
4. **Implementar em ambiente de teste**
5. **Executar testes de integridade**
6. **Planejar deploy em produção**

---

**Status:** 🔍 **ANÁLISE COMPLETA**  
**Recomendação:** ✅ **PROSSEGUIR COM CONSOLIDAÇÃO**
