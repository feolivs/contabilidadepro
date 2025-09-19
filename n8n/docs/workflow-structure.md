# 🏗️ Estrutura dos Workflows n8n - ContabilidadePRO

## 📊 Arquitetura Geral

Todos os workflows seguem um padrão arquitetural consistente:

```
Trigger → Buscar Dados → Processar IA → Enviar Email → Log → Update Status
```

## 🔄 Workflow 1: Relatórios IA Pro v5

### Nós e Fluxo
1. **🗓️ Trigger Mensal Dia 1** (`n8n-nodes-base.cron`)
   - Executa todo dia 1 às 9h
   - Trigger para relatórios mensais

2. **🏢 Buscar Empresas** (`n8n-nodes-base.supabase`)
   - Query: `empresas` com status ativa
   - Join: `auth.users` para dados do contador
   - Limit: 100 empresas

3. **📋 Buscar Dados Fiscais** (`n8n-nodes-base.supabase`)
   - Query: `fiscal_obligations` do mês anterior
   - Filtros: created_at entre início e fim do mês
   - Limit: 1000 registros

4. **⚙️ Preparar Dados** (`n8n-nodes-base.code`)
   - Combina dados de empresas e fiscais
   - Calcula métricas avançadas
   - Prepara payload para IA

5. **🤖 IA: Gerar Relatório** (`n8n-nodes-base.openAi`)
   - Modelo: GPT-4o
   - Prompt especializado em contabilidade BR
   - Output: JSON estruturado

6. **⚙️ Processar Relatório** (`n8n-nodes-base.code`)
   - Parse da resposta da IA
   - Fallback para lógica tradicional
   - Combina dados finais

7. **📧 Enviar Gmail** (`n8n-nodes-base.gmail`)
   - API nativa do Gmail
   - Template HTML responsivo
   - OAuth2 authentication

8. **📝 Log Comunicação** (`n8n-nodes-base.supabase`)
   - Registra envio na tabela `communication_log`
   - Metadata completa para auditoria

### Configurações Específicas
```json
{
  "trigger": {
    "mode": "everyMonth",
    "day": 1,
    "hour": 9,
    "minute": 0
  },
  "openai": {
    "model": "gpt-4o",
    "maxTokens": 2000,
    "temperature": 0.3
  },
  "gmail": {
    "resource": "message",
    "operation": "send",
    "emailType": "html"
  }
}
```

## 🚨 Workflow 2: Alertas Fiscais IA Pro v5

### Nós e Fluxo
1. **⏰ Trigger Diário 8h** (`n8n-nodes-base.cron`)
   - Executa diariamente às 8h
   - Monitoramento contínuo

2. **📋 Buscar Prazos** (`n8n-nodes-base.supabase`)
   - Query: `fiscal_obligations` pendentes
   - Filtros: due_date próximas (30 dias)
   - Condição: alert_sent = false

3. **🤖 IA: Análise Pro** (`n8n-nodes-base.openAi`)
   - Análise de urgência inteligente
   - Cálculo de multas estimadas
   - Recomendações personalizadas

4. **⚙️ Processar com IA Pro** (`n8n-nodes-base.code`)
   - Combina análise IA com dados originais
   - Fallback para lógica de urgência
   - Calcula dias restantes

5. **📧 Enviar Gmail** (`n8n-nodes-base.gmail`)
   - Headers dinâmicos por urgência
   - Cores e emojis baseados em criticidade
   - Template responsivo

6. **✅ Marcar Enviado** (`n8n-nodes-base.supabase`)
   - Update: alert_sent = true
   - Timestamp: alert_sent_at

7. **📝 Log Comunicação** (`n8n-nodes-base.supabase`)
   - Registro detalhado do alerta
   - Metadata de urgência e IA

### Lógica de Urgência
```javascript
// Critérios de urgência automática
if (diasRestantes <= 1) {
  urgencia = 'critica';
  emoji = '🚨';
  cor = '#dc3545';
} else if (diasRestantes <= 3) {
  urgencia = 'alta';
  emoji = '⚠️';
  cor = '#fd7e14';
} else if (diasRestantes <= 7) {
  urgencia = 'media';
  emoji = '📋';
  cor = '#ffc107';
} else {
  urgencia = 'baixa';
  emoji = '📅';
  cor = '#28a745';
}
```

## 📊 Workflow 3: Relatórios Estratégicos IA Pro v5

### Nós e Fluxo
1. **🗓️ Trigger Mensal Dia 1** (`n8n-nodes-base.cron`)
   - Mesmo trigger do Workflow 1
   - Execução paralela

2. **🏢 Buscar Empresas** + **📋 Buscar Dados Fiscais**
   - Mesma lógica do Workflow 1
   - Dados mais detalhados

3. **⚙️ Preparar Dados Detalhados** (`n8n-nodes-base.code`)
   - Análise por tipo de obrigação
   - Métricas avançadas de performance
   - Dados históricos quando disponíveis

4. **🤖 IA: Relatório Estratégico** (`n8n-nodes-base.openAi`)
   - Prompt executivo especializado
   - Análise de compliance avançada
   - Insights exclusivos e tendências

5. **⚙️ Processar Relatório Estratégico** (`n8n-nodes-base.code`)
   - Parse de JSON complexo
   - Fallback robusto
   - Validação de dados

6. **📧 Enviar Gmail** (`n8n-nodes-base.gmail`)
   - Template executivo premium
   - Design profissional avançado
   - Métricas visuais

7. **📝 Log Relatório** (`n8n-nodes-base.supabase`)
   - Log específico para relatórios estratégicos
   - Metadata de performance

## 🔧 Configurações Comuns

### Error Handling
```json
{
  "onError": "continueRegularOutput"
}
```
- Todos os nós têm tratamento de erro
- Workflow continua mesmo com falhas
- Logs de erro para debugging

### Credenciais
```json
{
  "supabaseApi": {
    "id": "Z1duNws8VXU74YbQ",
    "name": "Supabase account"
  },
  "openAiApi": {
    "id": "cxdYbudGSeASHNl8", 
    "name": "OpenAi account"
  },
  "googleApi": {
    "id": "gmail-oauth",
    "name": "Google account"
  }
}
```

### Execution Settings
```json
{
  "executionOrder": "v1",
  "saveDataErrorExecution": "all",
  "saveDataSuccessExecution": "all",
  "saveExecutionProgress": true
}
```

## 📈 Monitoramento e Logs

### Tabelas de Log
- `communication_log`: Todos os envios de email
- `workflow_executions`: Execuções dos workflows
- `error_logs`: Erros e falhas

### Métricas Importantes
- Taxa de sucesso por workflow
- Tempo médio de execução
- Precisão da análise de IA
- Deliverability dos emails

### Alertas de Sistema
- Falhas consecutivas (>3)
- Tempo de execução elevado (>5min)
- Taxa de erro alta (>10%)
- Credenciais expiradas

---

**Documentação técnica completa dos workflows n8n v5**
**Atualizada em**: 19/09/2025
