---
type: "agent_requested"
description: "Example description"
---

# ContabilidadePRO - Deployment Guide

## Overview
This comprehensive guide covers the deployment process for ContabilidadePRO across development, staging, and production environments using Vercel and Supabase infrastructure.

## Architecture Overview

### Deployment Stack
```
┌─────────────────────────────────────────────────────────────┐
│                    Production Stack                        │
├─────────────────────────────────────────────────────────────┤
│ Frontend: Vercel (Next.js)                                │
│ Backend: Supabase (PostgreSQL + Edge Functions)            │
│ Storage: Supabase Storage + CDN                           │
│ Monitoring: Vercel Analytics + Supabase Metrics           │
│ Security: Cloudflare (optional) + Supabase Auth           │
└─────────────────────────────────────────────────────────────┘
```

### Environment Strategy
- **Development**: Local Next.js + Supabase Cloud
- **Staging**: Vercel Preview + Supabase Staging
- **Production**: Vercel Production + Supabase Production

## Prerequisites

### Required Accounts & Tools
```bash
# Required accounts
- GitHub account (for code repository)
- Vercel account (linked to GitHub)
- Supabase account (for backend services)
- Domain registrar account (for custom domain)

# Required tools
- Node.js 18+ 
- npm or yarn
- Git
- Supabase CLI
- Vercel CLI (optional)
```

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/your-org/contabilidadepro.git
cd contabilidadepro/contador-solo-ai

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

## Environment Configuration

### Environment Variables

#### Required Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-azure-key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://contabilidadepro.com
NODE_ENV=production

# Security Configuration
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://contabilidadepro.com

# Optional: Analytics & Monitoring
VERCEL_ANALYTICS_ID=your-analytics-id
SENTRY_DSN=https://your-sentry-dsn
```

#### Environment-Specific Variables

**Development (.env.local)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://selnwgpyjctpjzdrfrey.supabase.co
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Staging (Vercel Environment)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=https://staging.contabilidadepro.com
```

**Production (Vercel Environment)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://contabilidadepro.com
```

## Supabase Backend Setup

### Database Setup

#### 1. Create Supabase Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize project
supabase init

# Link to remote project
supabase link --project-ref your-project-ref
```

#### 2. Database Schema Migration
```bash
# Create migration files
supabase migration new initial_schema

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id your-project-id > src/types/database.types.ts
```

#### 3. Sample Migration File
```sql
-- migration: 001_initial_schema.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  nome_completo TEXT NOT NULL,
  cpf TEXT UNIQUE,
  telefone TEXT,
  avatar_url TEXT,
  plano_assinatura TEXT DEFAULT 'free' CHECK (plano_assinatura IN ('free', 'basic', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  configuracoes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING (auth.uid() = id);

-- Create companies table
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE NOT NULL,
  regime_tributario TEXT NOT NULL CHECK (regime_tributario IN ('MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real')),
  endereco JSONB NOT NULL,
  contato JSONB,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for companies
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own companies" ON empresas
  FOR ALL USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_empresas_user_id ON empresas(user_id);
CREATE INDEX idx_empresas_cnpj ON empresas(cnpj);
```

### Storage Setup

#### 1. Storage Buckets Configuration
```sql
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/xml']::text[]
);

-- Create RLS policies for storage
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Edge Functions Setup

#### 1. Chat Function
```typescript
// supabase/functions/chat/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, conversationId, empresaId, context } = await req.json()
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em contabilidade brasileira.'
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    const aiResponse = await openaiResponse.json()
    
    // Save conversation to database
    const { data: conversation } = await supabaseClient
      .from('ai_conversas')
      .upsert({
        id: conversationId,
        user_id: user.id,
        empresa_id: empresaId,
        contexto: context?.type || 'general'
      })
      .select()
      .single()

    // Save messages
    await supabaseClient
      .from('ai_mensagens')
      .insert([
        {
          conversa_id: conversation.id,
          tipo: 'user',
          conteudo: message
        },
        {
          conversa_id: conversation.id,
          tipo: 'assistant',
          conteudo: aiResponse.choices[0].message.content,
          tokens_usados: aiResponse.usage.total_tokens,
          modelo_usado: 'gpt-4'
        }
      ])

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          conversationId: conversation.id,
          message: {
            id: crypto.randomUUID(),
            content: aiResponse.choices[0].message.content,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            tokensUsed: aiResponse.usage.total_tokens,
            model: 'gpt-4'
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
```

#### 2. Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy chat

# Set function secrets
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set AZURE_DOCUMENT_INTELLIGENCE_KEY=your-azure-key
```

## Vercel Frontend Deployment

### 1. Vercel Project Setup

#### Connect Repository
1. Visit [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings:

```json
{
  "name": "contabilidadepro",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "devCommand": "npm run dev"
}
```

#### Environment Variables Setup
```bash
# Add via Vercel Dashboard or CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT production
vercel env add AZURE_DOCUMENT_INTELLIGENCE_KEY production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXTAUTH_URL production
```

### 2. Build Configuration

#### next.config.ts
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['selnwgpyjctpjzdrfrey.supabase.co'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enable static exports for better performance
  output: 'standalone',
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

#### vercel.json
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/supabase/(.*)",
      "destination": "https://selnwgpyjctpjzdrfrey.supabase.co/rest/v1/$1"
    }
  ]
}
```

### 3. Deployment Process

#### Automatic Deployment
```bash
# Push to main branch triggers automatic deployment
git add .
git commit -m "feat: deploy to production"
git push origin main

# Vercel automatically:
# 1. Detects changes in main branch
# 2. Runs build process
# 3. Deploys to production
# 4. Updates custom domain
```

#### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

## Domain & SSL Configuration

### 1. Custom Domain Setup

#### Add Domain in Vercel
1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain: `contabilidadepro.com`
3. Configure DNS records:

```dns
# A record
Type: A
Name: @
Value: 76.76.19.61

# CNAME record
Type: CNAME
Name: www
Value: cname.vercel-dns.com

# Optional: subdomain for staging
Type: CNAME
Name: staging
Value: cname.vercel-dns.com
```

#### SSL Certificate
- Vercel automatically provisions SSL certificates
- Supports custom certificates if needed
- Auto-renewal handled by Vercel

### 2. CDN Configuration

#### Vercel Edge Network
```typescript
// next.config.ts - CDN optimization
const nextConfig: NextConfig = {
  images: {
    domains: ['selnwgpyjctpjzdrfrey.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  compress: true,
  poweredByHeader: false,
  // Enable static file caching
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

## Monitoring & Analytics

### 1. Vercel Analytics
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Supabase Monitoring
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s

-- Create monitoring views
CREATE VIEW performance_monitoring AS
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public';
```

### 3. Error Tracking with Sentry
```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// app/global-error.tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import Error from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <Error statusCode={500} />
      </body>
    </html>
  );
}
```

## Security Configuration

### 1. Environment Security
```bash
# Use Vercel's encrypted environment variables
vercel env add SECRET_KEY production --sensitive

# Rotate secrets regularly
vercel env rm OLD_SECRET production
vercel env add NEW_SECRET production
```

### 2. Database Security
```sql
-- Enable audit logging
CREATE EXTENSION IF NOT EXISTS "pgaudit";
ALTER SYSTEM SET pgaudit.log = 'all';

-- Create security policies
CREATE POLICY "Admin only access" ON sensitive_table
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
```

### 3. API Security
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rate limiting
  const ip = request.ip ?? '127.0.0.1';
  const rateLimitKey = `rate_limit_${ip}`;
  
  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
```

## Backup & Recovery

### 1. Database Backups
```bash
# Automated daily backups (Supabase handles this)
# Manual backup
supabase db dump --file backup-$(date +%Y%m%d).sql

# Restore from backup
supabase db reset --file backup-20250115.sql
```

### 2. Code Backups
```bash
# Git repository backup
git clone --mirror https://github.com/your-org/contabilidadepro.git

# Environment backup
vercel env pull .env.backup
```

## CI/CD Pipeline

### 1. GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 2. Pre-deployment Checks
```bash
# package.json scripts
{
  "scripts": {
    "pre-deploy": "npm run lint && npm run type-check && npm run test",
    "deploy": "npm run pre-deploy && vercel --prod"
  }
}
```

## Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear Vercel cache
vercel --prod --force

# Check build logs
vercel logs

# Local build debugging
npm run build
npm run start
```

#### Database Connection Issues
```bash
# Test Supabase connection
supabase status

# Reset local database
supabase db reset

# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

#### Performance Issues
```bash
# Analyze bundle size
npm run analyze

# Check Core Web Vitals
# Use Vercel Analytics or Google PageSpeed Insights

# Database query optimization
# Use Supabase query analyzer
```

### Rollback Procedures
```bash
# Rollback Vercel deployment
vercel rollback

# Rollback database migration
supabase migration repair --status reverted

# Emergency maintenance mode
# Add maintenance page to repository and deploy
```

---

*This deployment guide ensures consistent, secure, and reliable deployments across all environments. Follow these procedures carefully and maintain proper documentation of any customizations.*

**Deployment Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: April 2025  
**Owner**: DevOps & Infrastructure Team