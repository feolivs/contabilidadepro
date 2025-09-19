# 🔐 Configuração de Credenciais - n8n ContabilidadePRO

## 📋 Credenciais Necessárias

### 1. 🗄️ Supabase API
- **ID**: `Z1duNws8VXU74YbQ`
- **Nome**: `Supabase account`
- **Tipo**: `supabaseApi`

#### Configuração
```json
{
  "host": "https://[PROJECT_ID].supabase.co",
  "serviceRole": "[SERVICE_ROLE_KEY]"
}
```

#### Permissões Necessárias
- `SELECT` em `empresas`, `fiscal_obligations`
- `INSERT/UPDATE` em `communication_log`
- `UPDATE` em `fiscal_obligations` (alert_sent)

### 2. 🤖 OpenAI API
- **ID**: `cxdYbudGSeASHNl8`
- **Nome**: `OpenAi account`
- **Tipo**: `openAiApi`

#### Configuração
```json
{
  "apiKey": "[OPENAI_API_KEY]",
  "organization": "[OPTIONAL_ORG_ID]"
}
```

#### Modelos Utilizados
- **GPT-4o**: Para análise avançada
- **Fallback**: GPT-4 se 4o indisponível
- **Tokens**: 2000-3000 por request

### 3. 📧 Gmail OAuth2
- **ID**: `gmail-oauth`
- **Nome**: `Google account`
- **Tipo**: `googleApi`

#### Configuração Google Cloud Console
1. **Criar Projeto** no Google Cloud Console
2. **Habilitar APIs**:
   - Gmail API
   - Google+ API (para profile info)

3. **Configurar OAuth Consent Screen**:
   - Tipo: Externo (para uso geral)
   - Scopes necessários:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/userinfo.email`

4. **Criar Credenciais OAuth 2.0**:
   - Tipo: Web application
   - Authorized redirect URIs:
     - `https://[N8N_DOMAIN]/rest/oauth2-credential/callback`

#### Configuração n8n
```json
{
  "clientId": "[GOOGLE_CLIENT_ID]",
  "clientSecret": "[GOOGLE_CLIENT_SECRET]",
  "scope": "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"
}
```

## 🔧 Setup Passo a Passo

### Supabase Setup
1. **Acessar Supabase Dashboard**
2. **Ir em Settings > API**
3. **Copiar**:
   - Project URL
   - Service Role Key (secret)
4. **Configurar no n8n**:
   - Host: Project URL
   - Service Role: Service Role Key

### OpenAI Setup
1. **Acessar OpenAI Platform**
2. **Ir em API Keys**
3. **Criar nova chave**:
   - Nome: `ContabilidadePRO-n8n`
   - Permissions: All
4. **Configurar no n8n**:
   - API Key: Chave gerada

### Gmail OAuth Setup
1. **Google Cloud Console**:
   ```bash
   # Habilitar APIs
   gcloud services enable gmail.googleapis.com
   gcloud services enable plus.googleapis.com
   ```

2. **Criar OAuth Client**:
   - Application type: Web application
   - Name: `ContabilidadePRO-n8n`
   - Authorized redirect URIs: `https://n8n.domain.com/rest/oauth2-credential/callback`

3. **Configurar n8n**:
   - Client ID: Do Google Cloud Console
   - Client Secret: Do Google Cloud Console
   - Authorize: Clicar e autorizar conta Gmail

## 🔒 Segurança e Boas Práticas

### Rotação de Credenciais
- **Supabase**: Rotacionar service role key a cada 6 meses
- **OpenAI**: Rotacionar API key a cada 3 meses
- **Gmail**: Refresh token automático (OAuth2)

### Monitoramento
- **Rate Limits**: Monitorar uso de APIs
- **Logs de Acesso**: Auditar acessos às credenciais
- **Alertas**: Configurar alertas para falhas de auth

### Backup
```json
{
  "credentials_backup": {
    "supabase": {
      "project_id": "[BACKUP_PROJECT_ID]",
      "service_role": "[BACKUP_SERVICE_ROLE]"
    },
    "openai": {
      "api_key": "[BACKUP_API_KEY]",
      "organization": "[BACKUP_ORG]"
    },
    "gmail": {
      "client_id": "[BACKUP_CLIENT_ID]",
      "client_secret": "[BACKUP_CLIENT_SECRET]"
    }
  }
}
```

## 🚨 Troubleshooting

### Erros Comuns

#### Supabase
```
Error: Invalid API key
```
**Solução**: Verificar se service role key está correto e não expirou

#### OpenAI
```
Error: Rate limit exceeded
```
**Solução**: Implementar retry logic ou upgrade do plano

#### Gmail
```
Error: insufficient_scope
```
**Solução**: Verificar se scopes estão corretos no OAuth consent

### Validação de Credenciais
```javascript
// Script de teste para validar credenciais
const testCredentials = async () => {
  // Teste Supabase
  const supabaseTest = await supabase
    .from('empresas')
    .select('count')
    .limit(1);
  
  // Teste OpenAI
  const openaiTest = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'test' }],
    max_tokens: 5
  });
  
  // Teste Gmail
  const gmailTest = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 1
  });
  
  console.log('All credentials valid ✅');
};
```

## 📊 Limites e Quotas

### Supabase
- **Requests**: 500/min (Free), 1000/min (Pro)
- **Storage**: 500MB (Free), 8GB (Pro)
- **Bandwidth**: 2GB (Free), 100GB (Pro)

### OpenAI
- **GPT-4o**: $15/1M input tokens, $60/1M output tokens
- **Rate Limits**: 10,000 TPM (Tier 1), 30,000 TPM (Tier 2)
- **Daily Limits**: $100/day (default)

### Gmail API
- **Send Quota**: 1 billion/day (praticamente ilimitado)
- **Rate Limits**: 250 quota units/user/second
- **Daily Quota**: 1 billion quota units/day

## 🔄 Ambiente de Desenvolvimento vs Produção

### Desenvolvimento
```json
{
  "supabase": {
    "host": "https://dev-project.supabase.co",
    "service_role": "[DEV_SERVICE_ROLE]"
  },
  "openai": {
    "api_key": "[DEV_API_KEY]",
    "organization": "[DEV_ORG]"
  },
  "gmail": {
    "client_id": "[DEV_CLIENT_ID]",
    "test_email": "test@contabilidadepro.com"
  }
}
```

### Produção
```json
{
  "supabase": {
    "host": "https://prod-project.supabase.co",
    "service_role": "[PROD_SERVICE_ROLE]"
  },
  "openai": {
    "api_key": "[PROD_API_KEY]",
    "organization": "[PROD_ORG]"
  },
  "gmail": {
    "client_id": "[PROD_CLIENT_ID]",
    "domain": "contabilidadepro.com"
  }
}
```

---

**Guia completo de credenciais para n8n workflows**
**Atualizado em**: 19/09/2025
**Próxima revisão**: 19/12/2025
