# 🤖 Configuração OpenAI - ContabilidadePRO

## 📋 Visão Geral

Este guia mostra como configurar a OpenAI API Key de forma **SEGURA** para habilitar todas as funcionalidades de IA do ContabilidadePRO.

### ✅ O que funciona COM OpenAI:
- 🤖 **Assistente Contábil IA** - Chat especializado em contabilidade brasileira
- 📄 **OCR Inteligente** - Extração de dados de documentos fiscais
- 🧠 **Análise Contextual** - Insights automáticos sobre empresas
- 📊 **Classificação Automática** - Categorização de documentos
- 💡 **Sugestões Proativas** - Otimizações tributárias

### ❌ O que NÃO funciona SEM OpenAI:
- Todas as funcionalidades acima retornam dados simulados/mock
- Interface mostra "IA não configurada"
- Logs mostram avisos de configuração

## 🔧 Configuração Passo a Passo

### **Passo 1: Obter Chave OpenAI**

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Faça login ou crie uma conta
3. Vá em **API Keys** no menu lateral
4. Clique em **Create new secret key**
5. Copie a chave (formato: `sk-proj-...` ou `sk-...`)

⚠️ **IMPORTANTE**: Guarde a chave em local seguro - ela não será mostrada novamente!

### **Passo 2: Configuração Local**

Edite o arquivo `contador-solo-ai/.env.local`:

```env
# ========================================
# OPENAI CONFIGURATION
# ========================================
# ✅ CONFIGURADO: Chave OpenAI para funcionalidades de IA
OPENAI_API_KEY=sk-proj-sua_chave_real_aqui
```

### **Passo 3: Configuração no Supabase (Produção)**

Para que as Edge Functions funcionem em produção:

```bash
# Instalar Supabase CLI (se não tiver)
npm install -g supabase

# Login no Supabase
supabase login

# Configurar secret (substitua pela sua chave real)
supabase secrets set OPENAI_API_KEY="sk-proj-sua_chave_real_aqui"
```

### **Passo 4: Configuração Automática (Recomendado)**

Execute o script de configuração automática:

```bash
# Navegar para o diretório do projeto
cd ContabilidadePRO

# Executar script de configuração
node scripts/setup-openai.js
```

Este script irá:
- ✅ Verificar se a chave está configurada localmente
- ✅ Testar conectividade com OpenAI
- ✅ Configurar secrets no Supabase automaticamente
- ✅ Testar as Edge Functions

## 🔒 Segurança

### **Princípios de Segurança Implementados:**

1. **Nunca exposta no frontend**
   - Chave OpenAI nunca enviada para o cliente
   - Todas as chamadas feitas via Edge Functions (server-side)

2. **Validação rigorosa**
   - Verificação de formato da chave
   - Teste de conectividade antes do uso
   - Fallback gracioso quando não configurada

3. **Rate limiting**
   - Limite de 50 requests por minuto por usuário
   - Timeout de 25 segundos por chamada
   - Logs estruturados para monitoramento

4. **Variáveis de ambiente seguras**
   - `.env.local` no `.gitignore` (nunca commitado)
   - Secrets do Supabase criptografados
   - Validação de chaves inválidas/placeholder

## 🧪 Testando a Configuração

### **1. Teste via Interface**

1. Inicie o servidor: `npm run dev`
2. Acesse `/assistente`
3. Verifique o componente de status OpenAI
4. Faça uma pergunta de teste

### **2. Teste via Script**

```bash
# Testar configuração completa
node scripts/setup-openai.js

# Verificar logs do servidor
npm run dev
# Procure por: "✅ OpenAI configurado e pronto para uso"
```

### **3. Teste Manual da Edge Function**

```bash
# Testar diretamente a Edge Function
curl -X POST "https://selnwgpyjctpjzdrfrey.supabase.co/functions/v1/assistente-contabil-ia" \
  -H "Authorization: Bearer sua_anon_key" \
  -H "Content-Type: application/json" \
  -d '{
    "pergunta": "Teste de conectividade",
    "user_id": "test-user"
  }'
```

## 🚨 Solução de Problemas

### **Erro: "OpenAI não configurado"**

**Causa**: Chave não encontrada ou inválida

**Solução**:
```bash
# Verificar se a chave está no .env.local
cat contador-solo-ai/.env.local | grep OPENAI_API_KEY

# Verificar formato da chave
echo $OPENAI_API_KEY | grep -E "^sk-"
```

### **Erro: "Rate limit atingido"**

**Causa**: Muitas chamadas em pouco tempo

**Solução**: Aguarde 1 minuto ou configure billing na OpenAI

### **Erro: "Timeout na chamada OpenAI"**

**Causa**: Conectividade ou sobrecarga da API

**Solução**:
```bash
# Testar conectividade
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

### **Edge Function não funciona**

**Causa**: Secret não propagado no Supabase

**Solução**:
```bash
# Reconfigurar secret
supabase secrets set OPENAI_API_KEY="sua_chave"

# Aguardar 2-3 minutos para propagação
# Testar novamente
```

## 💰 Custos

### **Modelo Usado**: `gpt-4o-mini`
- **Custo**: ~$0.15 por 1M tokens de entrada
- **Uso típico**: ~800 tokens por pergunta
- **Custo por pergunta**: ~$0.0001 (menos de 1 centavo)

### **Estimativa Mensal**:
- **Uso leve** (100 perguntas/mês): ~$0.01
- **Uso moderado** (1000 perguntas/mês): ~$0.10
- **Uso intenso** (10000 perguntas/mês): ~$1.00

### **Dicas para Economizar**:
- Use perguntas específicas e diretas
- Evite conversas muito longas
- Configure rate limiting adequado
- Monitore uso no dashboard OpenAI

## 📊 Monitoramento

### **Logs Importantes**:

```bash
# Sucesso
✅ OpenAI configurado e pronto para uso
✅ OpenAI call successful (1234ms)

# Avisos
⚠️ OpenAI não configurado - funcionalidades de IA desabilitadas
⚠️ Rate limit atingido

# Erros
❌ OpenAI API error: 401 - Invalid API key
❌ Timeout na chamada OpenAI
```

### **Métricas no Dashboard**:
- Tempo de resposta médio
- Taxa de sucesso das chamadas
- Tokens consumidos
- Erros por tipo

## 🔄 Atualizações

### **Rotação de Chaves** (Recomendado a cada 90 dias):

```bash
# 1. Gerar nova chave na OpenAI
# 2. Atualizar .env.local
# 3. Atualizar secret no Supabase
supabase secrets set OPENAI_API_KEY="nova_chave"
# 4. Testar funcionamento
node scripts/setup-openai.js
```

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** do servidor de desenvolvimento
2. **Execute o script de teste**: `node scripts/setup-openai.js`
3. **Consulte a documentação** da OpenAI
4. **Verifique o billing** na sua conta OpenAI

**Lembre-se**: Sem a chave OpenAI configurada, o sistema funciona normalmente, mas as funcionalidades de IA ficam desabilitadas com dados simulados.
