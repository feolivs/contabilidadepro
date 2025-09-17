#!/bin/bash

# Script para deploy na Vercel via CLI
# Execute este script no diretório contador-solo-ai

echo "🚀 Iniciando deploy do ContabilidadePRO na Vercel..."

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script no diretório contador-solo-ai"
    exit 1
fi

# Instalar Vercel CLI se não estiver instalado
if ! command -v vercel &> /dev/null; then
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

# Login na Vercel (se necessário)
echo "🔐 Fazendo login na Vercel..."
vercel login

# Configurar variáveis de ambiente
echo "⚙️ Configurando variáveis de ambiente..."

# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# OpenAI
vercel env add OPENAI_API_KEY production

# Aplicação
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NODE_ENV production

# OCR APIs (opcionais)
vercel env add GOOGLE_VISION_API_KEY production
vercel env add CLOUDFLARE_AI_TOKEN production

# Sentry (opcional)
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_ORG production
vercel env add SENTRY_PROJECT production

# Deploy para produção
echo "🚀 Fazendo deploy para produção..."
vercel --prod

echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://contabilidadepro.vercel.app"
