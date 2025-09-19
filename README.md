# ContabilidadePRO 🧮

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/feolivs/contabilidadepro)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-green)](https://supabase.com)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black)](https://nextjs.org)

Sistema **simplificado** de contabilidade brasileira com IA integrada, otimizado para **contadores solo**.

## ✨ **SISTEMA RECÉM SIMPLIFICADO**
- 🎯 **Arquitetura 80% mais simples** (31 → 6 funções)
- ⚡ **Deploy 5x mais rápido**
- 🔧 **Manutenção 10x mais fácil**
- 🎪 **Foco total em contabilidade**

## 🚀 Funcionalidades Principais

- [x] **Gestão de Clientes** - Cadastro completo com validação de CNPJ/CPF
- [x] **Cálculos Fiscais Automatizados** - DAS, IRPJ, CSLL, PIS/COFINS
- [x] **Assistente IA** - Chat inteligente para dúvidas contábeis
- [x] **OCR de Documentos** - Extração automática de dados de PDFs
- [x] **Prazos Fiscais** - Calendário automático de obrigações
- [x] **Relatórios Gerenciais** - Dashboards e análises financeiras
- [x] **Integração APIs** - Receita Federal, SEFAZ e outros órgãos
- [x] **🤖 Automação n8n** - Workflows inteligentes com IA integrada

## 🤖 Automação Avançada com n8n

### Workflows Ativos (v5 - Gmail Nativo)
- **📊 Relatórios IA Pro** - Relatórios mensais automatizados com análise de IA
- **🚨 Alertas Fiscais IA** - Monitoramento diário de prazos com urgência inteligente
- **📊 Relatórios Estratégicos** - Insights executivos e análise de performance

### Tecnologias de Automação
- **n8n**: Orquestração de workflows
- **OpenAI GPT-4o**: Análise inteligente especializada em contabilidade BR
- **Gmail API**: Envio nativo de emails profissionais
- **Supabase**: Integração completa com banco de dados

## 🏗️ Arquitetura Simplificada

### 6 Serviços Principais
- 🤖 **assistente-contabil-ia** - IA conversacional + análises
- 🏢 **company-service** - Empresas + consulta CNPJ
- 📄 **document-service** - Upload + OCR + classificação
- 💰 **fiscal-service** - DAS + obrigações + simulador
- 📊 **reports-service** - Relatórios + guias PDF
- 📈 **analytics-service** - Métricas + dashboard

### Tecnologias
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **IA**: OpenAI GPT-4o
- **Automação**: n8n (Docker) + Gmail API + Workflows inteligentes
- **Deploy**: Vercel + Supabase Cloud

## 🚀 Deploy Rápido

### 1. Configuração da OpenAI (OBRIGATÓRIO para IA)

```bash
# 1. Configure sua chave OpenAI no .env.local
echo "OPENAI_API_KEY=sk-sua-chave-aqui" >> contador-solo-ai/.env.local

# 2. Execute o script de configuração automática
node scripts/setup-openai.js

# 3. Teste a configuração
npm run dev
```

**⚠️ IMPORTANTE**: Sem a chave OpenAI, as funcionalidades de IA não funcionarão!

### 2. Deploy Automático via Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/feolivs/contabilidadepro)

### 2. Configuração Manual

```bash
# Clone o repositório
git clone https://github.com/feolivs/contabilidadepro.git
cd contabilidadepro/contador-solo-ai

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves

# Execute em desenvolvimento
npm run dev
```

## 📋 Variáveis de Ambiente Necessárias

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-your-openai-key

# Azure Document Intelligence (Opcional)
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your-azure-endpoint
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-azure-key

# Aplicação
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Sentry (Opcional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

## 🏗️ Estrutura do Projeto

```
ContabilidadePRO/
├── contador-solo-ai/          # Aplicação Next.js principal
│   ├── src/
│   │   ├── app/              # App Router (Next.js 13+)
│   │   ├── components/       # Componentes React
│   │   ├── lib/             # Utilitários e configurações
│   │   ├── services/        # Serviços e APIs
│   │   └── types/           # Definições TypeScript
│   ├── public/              # Arquivos estáticos
│   └── docs/                # Documentação
├── supabase/                # Configurações do Supabase
│   ├── functions/           # Edge Functions
│   ├── migrations/          # Migrações do banco
│   └── config.toml         # Configuração local
├── n8n/                     # 🤖 Workflows de Automação
│   ├── workflows/           # Configurações dos workflows v5
│   ├── docs/               # Documentação técnica
│   └── README.md           # Guia de automação
└── scripts/                 # Scripts de automação
```

## 🚀 Como Contribuir

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Suporte

- 📧 Email: suporte@contabilidadepro.com
- 💬 Discord: [Comunidade ContabilidadePRO](https://discord.gg/contabilidadepro)
- 📖 Documentação: [docs.contabilidadepro.com](https://docs.contabilidadepro.com)

---

**Desenvolvido com ❤️ para contadores brasileiros**
