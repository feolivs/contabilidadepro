# 🚀 Guia de Importação dos Workflows n8n - ContabilidadePRO

## 📋 **Workflows Criados**

Foram criados **3 workflows** prontos para importação no seu n8n Docker:

### **1. Alertas Fiscais Inteligentes v1**
- **Arquivo:** `n8n-workflows/workflow-alertas-fiscais-v1.json`
- **Função:** Monitoramento diário de prazos fiscais com alertas inteligentes
- **Execução:** Diariamente às 8h
- **Recursos:** Classificação por urgência, emails personalizados, logs automáticos

### **2. Relatórios Mensais Automatizados v1**
- **Arquivo:** `n8n-workflows/workflow-relatorios-mensais-v1.json`
- **Função:** Geração e envio automático de relatórios mensais
- **Execução:** Todo dia 1 às 9h
- **Recursos:** Personalização por regime tributário, templates HTML profissionais

### **3. Monitoramento de Sistema v1**
- **Arquivo:** `n8n-workflows/workflow-monitoramento-sistema-v1.json`
- **Função:** Health check contínuo do sistema
- **Execução:** A cada 15 minutos
- **Recursos:** Testes de Database/Edge Functions/Storage, alertas críticos

---

## 🔧 **Passo a Passo para Importação**

### **Passo 1: Acessar o n8n**
```bash
# Verificar se n8n está rodando
docker ps | grep n8n

# Acessar interface web
# Abrir: http://localhost:5678
```

### **Passo 2: Importar Workflows**

1. **Acesse a interface do n8n** em `http://localhost:5678`

2. **Para cada workflow:**
   - Clique em **"+ Add workflow"** ou **"Import from file"**
   - Selecione o arquivo JSON correspondente
   - Clique em **"Import"**

3. **Ordem recomendada de importação:**
   1. `workflow-monitoramento-sistema-v1.json` (primeiro)
   2. `workflow-alertas-fiscais-v1.json` (segundo)
   3. `workflow-relatorios-mensais-v1.json` (terceiro)

### **Passo 3: Configurar Credenciais**

#### **PostgreSQL (Supabase)**
```json
{
  "host": "db.selnwgpyjctpjzdrfrey.supabase.co",
  "port": 5432,
  "database": "postgres",
  "username": "postgres",
  "password": "[SEU_SUPABASE_DB_PASSWORD]",
  "ssl": true
}
```

#### **Email SMTP**
```json
{
  "user": "sistema@contabilidadepro.com",
  "password": "[SUA_SENHA_EMAIL]",
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false
}
```

#### **HTTP Header Auth (Supabase)**
```json
{
  "name": "Authorization",
  "value": "Bearer [SEU_SUPABASE_SERVICE_ROLE_KEY]"
}
```

### **Passo 4: Configurar Variáveis**

Edite os workflows e substitua:
- `contador@contabilidadepro.com` → Seu email
- `admin@contabilidadepro.com` → Email do administrador
- `sistema@contabilidadepro.com` → Email de envio
- URLs do Supabase se necessário

---

## ✅ **Validação e Testes**

### **Teste 1: Monitoramento de Sistema**
```bash
# 1. Ativar o workflow "Monitoramento de Sistema v1"
# 2. Executar manualmente (botão "Execute Workflow")
# 3. Verificar se todos os nós executam sem erro
# 4. Confirmar se métricas são salvas no banco
```

### **Teste 2: Alertas Fiscais**
```sql
-- Criar um prazo fiscal de teste
INSERT INTO fiscal_obligations (
  user_id, empresa_id, name, obligation_type, 
  due_date, status, priority, estimated_amount
) VALUES (
  '[SEU_USER_ID]', '[UMA_EMPRESA_ID]', 'DAS Teste', 'DAS',
  CURRENT_DATE + INTERVAL '2 days', 'pending', 'high', 1500.00
);
```

```bash
# 1. Executar workflow "Alertas Fiscais Inteligentes v1" manualmente
# 2. Verificar se email foi enviado
# 3. Confirmar se prazo foi marcado como alert_sent = true
```

### **Teste 3: Relatórios Mensais**
```bash
# 1. Executar workflow "Relatórios Mensais Automatizados v1" manualmente
# 2. Verificar se relatórios são gerados para todas as empresas
# 3. Confirmar se emails são enviados com templates corretos
# 4. Verificar logs na tabela communication_log
```

---

## 🔍 **Troubleshooting**

### **Problema: Erro de Conexão PostgreSQL**
```bash
# Verificar se Supabase está acessível
curl -I https://selnwgpyjctpjzdrfrey.supabase.co

# Testar conexão do Docker
docker exec -it n8n-container ping db.selnwgpyjctpjzdrfrey.supabase.co
```

### **Problema: Emails não são enviados**
```bash
# Verificar configuração SMTP
# Testar com email alternativo
# Verificar logs do n8n
docker logs n8n-container
```

### **Problema: Edge Functions não respondem**
```bash
# Verificar se Edge Functions estão ativas no Supabase
# Testar URLs manualmente
curl -X POST https://selnwgpyjctpjzdrfrey.supabase.co/functions/v1/health-check
```

---

## 📊 **Monitoramento dos Workflows**

### **Dashboard de Acompanhamento**
```sql
-- Status dos workflows (últimas 24h)
SELECT 
  'alertas_enviados' as metric,
  COUNT(*) as value
FROM system_alerts 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Relatórios enviados (último mês)
SELECT 
  'relatorios_enviados' as metric,
  COUNT(*) as value
FROM communication_log 
WHERE tipo = 'relatorio_mensal' 
AND enviado_em >= DATE_TRUNC('month', NOW());

-- Uptime do sistema (última semana)
SELECT 
  'uptime_medio' as metric,
  ROUND(AVG(uptime_percentage), 2) as value
FROM system_health_metrics 
WHERE timestamp >= NOW() - INTERVAL '7 days';
```

### **Alertas de Falha**
```sql
-- Verificar execuções com falha
SELECT * FROM n8n_executions 
WHERE finished = false 
AND stopped_at IS NOT NULL 
ORDER BY started_at DESC;
```

---

## 🎯 **Próximos Passos**

### **Após Importação Bem-sucedida:**

1. **Ativar Workflows:**
   - Monitoramento: Ativar imediatamente
   - Alertas: Ativar após teste
   - Relatórios: Ativar próximo ao dia 1

2. **Configurar Notificações:**
   - Slack (opcional)
   - WhatsApp (opcional)
   - SMS (opcional)

3. **Personalizar Templates:**
   - Ajustar cores e logos
   - Personalizar mensagens
   - Adicionar informações específicas

4. **Expandir Funcionalidades:**
   - Adicionar mais tipos de alertas
   - Criar relatórios específicos
   - Integrar com APIs governamentais

---

## 🎉 **Resultado Esperado**

Após a implementação completa, você terá:

- ✅ **Sistema de alertas 100% automatizado**
- ✅ **Relatórios mensais enviados automaticamente**
- ✅ **Monitoramento contínuo do sistema**
- ✅ **Zero intervenção manual necessária**
- ✅ **Economia de 15+ horas por semana**

**🚀 Seu escritório contábil agora opera como uma máquina automatizada, permitindo foco total no estratégico!**

---

## 📞 **Suporte**

Se encontrar problemas:
1. Verificar logs do n8n: `docker logs n8n-container`
2. Testar conexões manualmente
3. Validar credenciais e permissões
4. Consultar documentação do n8n: https://docs.n8n.io

**A automação está pronta para transformar sua operação contábil! 🎯**
