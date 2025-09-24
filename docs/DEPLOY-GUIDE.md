# 🚀 ContabilidadePRO - Guia de Deploy e Produção

## 📋 Visão Geral

Este guia detalha o processo completo de deploy e configuração de produção para o **ContabilidadePRO AI Context Service**. O sistema foi projetado com arquitetura cloud-native e suporta deploy em múltiplas plataformas com alta disponibilidade.

## 🎯 Arquitetura de Produção

### **Stack de Produção Recomendada**
```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 FRONTEND (Next.js 15)                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │   Vercel/AWS    │ │   CloudFlare    │ │    CDN       │  │
│  │   Edge Runtime  │ │   WAF + DDoS    │ │   Global     │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  🧠 AI CONTEXT SERVICE LAYER               │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │   API Gateway   │ │  Load Balancer  │ │   Rate       │  │
│  │   (AWS/Azure)   │ │   (NGINX/HAP)   │ │   Limiter    │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│               📊 APPLICATION SERVICES (17)                 │
│  ┌──────────────┐ ┌───────────────┐ ┌─────────────────┐    │
│  │ AI Context   │ │ Parallel      │ │ Predictive      │    │
│  │ Service      │ │ Query Engine  │ │ Cache ML        │    │
│  └──────────────┘ └───────────────┘ └─────────────────┘    │
│  ┌──────────────┐ ┌───────────────┐ ┌─────────────────┐    │
│  │ Government   │ │ Fiscal        │ │ Document        │    │
│  │ APIs         │ │ Automation    │ │ Processing      │    │
│  └──────────────┘ └───────────────┘ └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    💾 DATA LAYER                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │   Supabase      │ │   Redis Cache   │ │   File       │  │
│  │   PostgreSQL    │ │   Cluster       │ │   Storage    │  │
│  │   (Primary)     │ │   (Memory)      │ │   (S3/Blob)  │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  🔧 MONITORING & OBSERVABILITY             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐  │
│  │   Prometheus    │ │   Grafana       │ │   Logging    │  │
│  │   Metrics       │ │   Dashboards    │ │   System     │  │
│  └─────────────────┘ └─────────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🌟 Opções de Deploy

### **1. Deploy Rápido - Vercel (Recomendado para MVP)**

#### **Pré-requisitos**
- Conta Vercel
- Repositório Git
- Supabase Project configurado

#### **Configuração**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy automático
vercel --prod

# 3. Configurar variáveis de ambiente
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

#### **Configuração `vercel.json`**
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["gru1"],
  "env": {
    "NODE_ENV": "production"
  },
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "redirects": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1",
      "permanent": false
    }
  ]
}
```

### **2. Deploy Enterprise - AWS/Azure**

#### **AWS Infrastructure as Code (Terraform)**
```hcl
# main.tf
provider "aws" {
  region = var.aws_region
}

# VPC and Networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "contabilidadepro-vpc"
    Environment = var.environment
  }
}

# ECS Cluster for Application Services
resource "aws_ecs_cluster" "app_cluster" {
  name = "contabilidadepro-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Application Load Balancer
resource "aws_lb" "app_lb" {
  name               = "contabilidadepro-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets           = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production"
}

# RDS for Supabase Alternative (Optional)
resource "aws_db_instance" "postgres" {
  count = var.use_rds ? 1 : 0

  identifier = "contabilidadepro-db"
  engine     = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage

  db_name  = "contabilidadepro"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = var.environment == "production" ? 30 : 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = var.environment != "production"
  deletion_protection = var.environment == "production"
}

# ElastiCache for Redis
resource "aws_elasticache_subnet_group" "main" {
  name       = "contabilidadepro-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id         = "contabilidadepro-redis"
  description                  = "Redis cluster for ContabilidadePRO"

  port               = 6379
  parameter_group_name = "default.redis7"
  node_type          = var.redis_node_type
  num_cache_clusters = var.redis_num_replicas

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis_sg.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  automatic_failover_enabled = var.environment == "production"
  multi_az_enabled          = var.environment == "production"
}

# Variables
variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  default     = "production"
}

variable "use_rds" {
  description = "Use RDS instead of Supabase"
  default     = false
}

variable "db_instance_class" {
  description = "RDS instance class"
  default     = "db.t3.medium"
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  default     = "cache.t3.medium"
}
```

#### **Docker Setup**
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### **Kubernetes Deployment**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: contabilidadepro-app
  labels:
    app: contabilidadepro
spec:
  replicas: 3
  selector:
    matchLabels:
      app: contabilidadepro
  template:
    metadata:
      labels:
        app: contabilidadepro
    spec:
      containers:
      - name: app
        image: contabilidadepro:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: supabase-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: openai-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: contabilidadepro-service
spec:
  selector:
    app: contabilidadepro
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### **3. Deploy Hybrid - Supabase + Vercel**

#### **Configuração Supabase**
```sql
-- Database Setup
-- Enable RLS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own data" ON usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own companies" ON empresas
  FOR SELECT USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_empresas_user_id ON empresas(user_id);
CREATE INDEX idx_documentos_empresa_id ON documentos(empresa_id);
CREATE INDEX idx_cache_entries_key ON cache_entries(cache_key);

-- Edge Functions Setup
CREATE OR REPLACE FUNCTION process_document(
  document_data JSONB,
  user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Process document with AI
  -- Return structured data
  RETURN result;
END;
$$;
```

#### **Supabase Edge Functions**
```typescript
// supabase/functions/ai-context/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: user } = await supabase.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { empresaId, includeInsights } = await req.json()

    // AI Context Service Logic
    const contextData = await collectContextualData({
      userId: user.user!.id,
      empresaId,
      includeInsights
    })

    return new Response(
      JSON.stringify({ success: true, data: contextData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

## ⚙️ Configuração de Variáveis de Ambiente

### **Variáveis Obrigatórias**
```env
# Core
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.contabilidadepro.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_ORGANIZATION=org-your-org-id

# APIs Governamentais
RECEITA_FEDERAL_API_KEY=your-rf-key
SEFAZ_API_KEY=your-sefaz-key

# Cache e Performance
REDIS_URL=redis://your-redis-url:6379
REDIS_PASSWORD=your-redis-password

# Monitoring
PROMETHEUS_ENDPOINT=https://your-prometheus

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=3600000
```

### **Configuração por Ambiente**
```typescript
// config/environment.ts
export const config = {
  development: {
    database: {
      maxConnections: 10,
      timeout: 30000
    },
    cache: {
      ttl: 300, // 5 minutes
      maxEntries: 1000
    },
    rateLimit: {
      max: 100,
      windowMs: 900000 // 15 minutes
    }
  },
  production: {
    database: {
      maxConnections: 100,
      timeout: 10000
    },
    cache: {
      ttl: 3600, // 1 hour
      maxEntries: 10000
    },
    rateLimit: {
      max: 1000,
      windowMs: 3600000 // 1 hour
    }
  }
}
```

## 📊 Monitoramento e Observabilidade

### **Health Checks**
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { AIContextService } from '@/services/ai-context-service'

export async function GET() {
  try {
    const aiContext = AIContextService.getInstance()
    const health = await aiContext.checkSystemHealth()

    const status = health.overallStatus === 'healthy' ? 200 : 503

    return NextResponse.json(health, { status })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    )
  }
}
```

### **Prometheus Metrics**
```typescript
// lib/metrics.ts
import prometheus from 'prom-client'

// Create metrics
export const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
})

export const aiContextOperations = new prometheus.Counter({
  name: 'ai_context_operations_total',
  help: 'Total number of AI context operations',
  labelNames: ['operation', 'status']
})

export const cacheHitRate = new prometheus.Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage'
})

// Middleware to collect metrics
export function metricsMiddleware(req: Request, res: Response, next: Function) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    httpRequestDuration
      .labels(req.method, req.route?.path || req.url, res.statusCode.toString())
      .observe(duration)
  })

  next()
}
```

### **Grafana Dashboard Config**
```json
{
  "dashboard": {
    "title": "ContabilidadePRO AI Context Service",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_request_duration_seconds_count[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "cache_hit_rate",
            "legendFormat": "Hit Rate %"
          }
        ]
      }
    ]
  }
}
```

## 🔒 Segurança em Produção

### **SSL/TLS Configuration**
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name app.contabilidadepro.com;

    ssl_certificate /etc/ssl/certs/contabilidadepro.crt;
    ssl_certificate_key /etc/ssl/private/contabilidadepro.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### **WAF Rules (CloudFlare)**
```javascript
// CloudFlare Worker for WAF
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Rate limiting per IP
  const ip = request.headers.get('CF-Connecting-IP')
  const rateLimitKey = `rate_limit:${ip}`

  // Block suspicious patterns
  if (url.pathname.includes('..') ||
      url.pathname.includes('<script>') ||
      request.headers.get('User-Agent')?.includes('bot')) {
    return new Response('Blocked', { status: 403 })
  }

  // Forward to origin
  return fetch(request)
}
```

## 📦 Scripts de Deploy

### **Deploy Automatizado**
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting ContabilidadePRO deployment..."

# Variables
ENVIRONMENT=${1:-production}
VERSION=$(git rev-parse --short HEAD)
IMAGE_TAG="contabilidadepro:${VERSION}"

echo "📦 Building application..."
npm run build

echo "🐳 Building Docker image..."
docker build -t ${IMAGE_TAG} .

echo "📤 Pushing to registry..."
docker tag ${IMAGE_TAG} your-registry.com/${IMAGE_TAG}
docker push your-registry.com/${IMAGE_TAG}

echo "🔄 Updating Kubernetes deployment..."
kubectl set image deployment/contabilidadepro-app app=your-registry.com/${IMAGE_TAG}
kubectl rollout status deployment/contabilidadepro-app

echo "🏥 Running health checks..."
kubectl get pods -l app=contabilidadepro
curl -f https://app.contabilidadepro.com/api/health || exit 1

echo "✅ Deployment completed successfully!"
```

### **Database Migrations**
```bash
#!/bin/bash
# migrate.sh

echo "🗄️ Running database migrations..."

# Backup current database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Run migrations
npm run db:migrate

# Verify migration
npm run db:verify

echo "✅ Database migration completed!"
```

## 🔧 Troubleshooting

### **Problemas Comuns**

#### **1. Performance Issues**
```bash
# Check system metrics
kubectl top pods
kubectl top nodes

# Check logs
kubectl logs -f deployment/contabilidadepro-app

# Check cache hit rate
redis-cli info stats
```

#### **2. Database Connection Issues**
```bash
# Test database connectivity
pg_isready -h your-db-host -p 5432

# Check connection pool
SELECT * FROM pg_stat_activity;

# Monitor slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

#### **3. API Rate Limiting**
```bash
# Check rate limit status
curl -I https://api.receitafederal.gov.br/status

# Monitor rate limiting metrics
redis-cli get "rate_limit:api:receita_federal"
```

### **Recovery Procedures**

#### **Rollback Deployment**
```bash
# Get previous deployment
kubectl rollout history deployment/contabilidadepro-app

# Rollback to previous version
kubectl rollout undo deployment/contabilidadepro-app

# Verify rollback
kubectl rollout status deployment/contabilidadepro-app
```

#### **Database Recovery**
```bash
# Restore from backup
psql $DATABASE_URL < backup-20240101-120000.sql

# Verify data integrity
npm run db:verify
```

## 📈 Scaling Guide

### **Horizontal Scaling**
```bash
# Scale application pods
kubectl scale deployment contabilidadepro-app --replicas=5

# Auto-scaling configuration
kubectl autoscale deployment contabilidadepro-app \
  --cpu-percent=70 \
  --min=3 \
  --max=10
```

### **Vertical Scaling**
```yaml
# Update resource limits
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### **Database Scaling**
```sql
-- Read replicas configuration
CREATE SUBSCRIPTION read_replica_sub
CONNECTION 'host=replica-host dbname=contabilidadepro user=replicator'
PUBLICATION read_replica_pub;

-- Connection pooling
-- Configure PgBouncer for connection management
```

## 📞 Suporte de Produção

### **Canais de Suporte**
- **Alertas Críticos**: Slack #prod-alerts
- **Monitoramento**: Grafana Dashboard
- **Logs**: ELK Stack / CloudWatch
- **Métricas**: Prometheus + Grafana

### **SLA Targets**
- **Uptime**: 99.95%
- **Response Time**: < 500ms (p95)
- **Error Rate**: < 0.2%
- **Recovery Time**: < 5 minutes

### **Escalation Matrix**
1. **L1**: Automated alerts and basic troubleshooting
2. **L2**: Application team intervention
3. **L3**: Architecture team and vendor escalation

---

**✅ Deploy Guide Completo** - *Transforme o ContabilidadePRO em produção com confiança* 🚀🔧