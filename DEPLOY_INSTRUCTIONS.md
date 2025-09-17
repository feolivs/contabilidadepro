# 🚀 Instruções de Deploy - ContabilidadePRO

## 📋 Checklist Pré-Deploy

- [ ] Código commitado no GitHub
- [ ] Variáveis de ambiente configuradas
- [ ] Edge Functions do Supabase deployadas
- [ ] Testes executados com sucesso

## 🔐 Variáveis de Ambiente para Produção

### **Obrigatórias**

```bash
# Supabase - Obtenha em: https://app.supabase.com/project/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://selnwgpyjctpjzdrfrey.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI - Obtenha em: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-your-openai-key-here

# Aplicação
NEXT_PUBLIC_APP_URL=https://contabilidadepro.vercel.app
NODE_ENV=production
```

### **Opcionais (Recomendadas)**

```bash
# Azure Document Intelligence - Para OCR avançado
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-azure-key

# Google Vision API - OCR alternativo
GOOGLE_VISION_API_KEY=your-google-vision-key

# Cloudflare AI - IA alternativa
CLOUDFLARE_AI_TOKEN=your-cloudflare-token

# Sentry - Monitoramento de erros
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token

# Google OAuth - Para login social
GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-client-secret
```

## 🌐 Deploy na Vercel

### **Método 1: Deploy Automático (Recomendado)**

1. **Conectar Repositório**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "New Project"
   - Importe o repositório `feolivs/contabilidadepro`

2. **Configurar Projeto**
   ```json
   {
     "name": "contabilidadepro",
     "framework": "nextjs",
     "rootDirectory": "contador-solo-ai",
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm ci"
   }
   ```

3. **Adicionar Variáveis de Ambiente**
   - Vá em Settings → Environment Variables
   - Adicione todas as variáveis listadas acima
   - Marque para todos os ambientes (Production, Preview, Development)

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build completar (~3-5 minutos)

### **Método 2: Deploy via CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login na Vercel
vercel login

# Deploy
cd contador-solo-ai
vercel

# Para produção
vercel --prod
```

## 🗄️ Deploy das Edge Functions (Supabase)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login no Supabase
supabase login

# Linkar projeto
supabase link --project-ref selnwgpyjctpjzdrfrey

# Deploy das functions
supabase functions deploy

# Configurar secrets das functions
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set GOOGLE_VISION_API_KEY=your-google-key
supabase secrets set CLOUDFLARE_AI_TOKEN=your-cloudflare-token
```

## 🔍 Verificações Pós-Deploy

### **Testes Funcionais**
- [ ] Login/logout funcionando
- [ ] Cadastro de clientes
- [ ] Cálculos fiscais (DAS, IRPJ)
- [ ] Upload de documentos
- [ ] Chat com IA
- [ ] Relatórios

### **Testes de Performance**
- [ ] Tempo de carregamento < 3s
- [ ] Core Web Vitals no verde
- [ ] Imagens otimizadas
- [ ] Cache funcionando

### **Testes de Segurança**
- [ ] HTTPS ativo
- [ ] Headers de segurança
- [ ] Variáveis sensíveis não expostas
- [ ] RLS policies ativas no Supabase

## 🚨 Troubleshooting

### **Erro: "Module not found"**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### **Erro: "Supabase connection failed"**
- Verificar se as URLs e chaves estão corretas
- Confirmar se o projeto Supabase está ativo
- Testar conexão local primeiro

### **Erro: "OpenAI API rate limit"**
- Verificar cota da API
- Implementar rate limiting
- Considerar usar cache para respostas

### **Build falha na Vercel**
- Verificar logs detalhados no dashboard
- Confirmar se todas as dependências estão no package.json
- Testar build local: `npm run build`

## 📊 Monitoramento

### **Vercel Analytics**
- Ativar em Project Settings → Analytics
- Monitorar Core Web Vitals
- Acompanhar usage e performance

### **Supabase Dashboard**
- Monitorar uso do banco de dados
- Verificar logs das Edge Functions
- Acompanhar autenticação

### **Sentry (se configurado)**
- Monitorar erros em tempo real
- Configurar alertas
- Analisar performance

## 🔄 CI/CD Automático

O projeto está configurado para deploy automático:
- **Push para `main`** → Deploy em produção
- **Pull Request** → Deploy de preview
- **Push para outras branches** → Deploy de desenvolvimento

## 📞 Suporte

Se encontrar problemas durante o deploy:
1. Verifique os logs da Vercel
2. Consulte a documentação do Supabase
3. Abra uma issue no GitHub
4. Entre em contato: suporte@contabilidadepro.com
