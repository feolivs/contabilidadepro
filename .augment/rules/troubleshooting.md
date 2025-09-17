---
type: "agent_requested"
description: "Example description"
---

# ContabilidadePRO - Troubleshooting Guide

## Overview
This comprehensive troubleshooting guide helps developers, administrators, and support teams quickly identify and resolve common issues in the ContabilidadePRO platform.

## Quick Issue Resolution

### 🚨 Emergency Issues

#### System Down / Cannot Access Platform
1. **Check Vercel Status**: https://vercel.com/status
2. **Check Supabase Status**: https://status.supabase.com
3. **Verify Domain DNS**: `nslookup contabilidadepro.com`
4. **Check SSL Certificate**: Browser dev tools → Security tab

**Quick Fix Commands**:
```bash
# Force redeploy
vercel --prod --force

# Check deployment logs
vercel logs --follow

# Verify environment variables
vercel env ls
```

#### Database Connection Lost
```bash
# Check Supabase project status
supabase status

# Test database connection
psql "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# Reset connection pool
# Contact Supabase support if persistent
```

## Authentication Issues

### AUTH-001: Login Failures

#### Symptoms
- Users cannot log in with correct credentials
- "Invalid credentials" error with valid email/password
- Infinite loading on login page

#### Diagnostics
```typescript
// Check in browser console
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Auth state:', supabase.auth.getSession());

// Verify JWT token
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
```

#### Common Causes & Solutions

**1. Environment Variables Missing**
```bash
# Verify required variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Solution: Add missing variables to Vercel dashboard
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

**2. Invalid Supabase Configuration**
```typescript
// Check supabase client initialization
const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});

// Verify client is working
const { data, error } = await supabase.auth.getUser();
if (error) console.error('Auth error:', error);
```

**3. RLS Policy Issues**
```sql
-- Check if user can access their data
SELECT * FROM auth.users WHERE id = auth.uid();

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Fix: Ensure user exists in public.users table
INSERT INTO public.users (id, email, nome_completo)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.users);
```

### AUTH-002: Session Expiration Issues

#### Symptoms
- Users logged out unexpectedly
- "Session expired" errors during active use
- Need to re-login frequently

#### Solutions
```typescript
// Implement session refresh
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      }
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    }
  );

  return () => subscription?.unsubscribe();
}, []);

// Auto-refresh before expiration
const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) console.error('Refresh error:', error);
};
```

### AUTH-003: OAuth Issues (Google Login)

#### Symptoms
- Google login redirects but doesn't complete
- "OAuth callback error" messages
- Users can't authenticate with Google

#### Diagnostics & Solutions
```bash
# Check OAuth configuration in Supabase dashboard
# 1. Authentication → Providers → Google
# 2. Verify Client ID and Secret
# 3. Check authorized redirect URIs

# Correct redirect URIs:
https://contabilidadepro.com/auth/callback
https://staging.contabilidadepro.com/auth/callback
http://localhost:3000/auth/callback
```

```typescript
// Verify OAuth flow
const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });
  
  if (error) console.error('OAuth error:', error);
};
```

## Database Issues

### DB-001: Query Performance Problems

#### Symptoms
- Slow page loading times
- Timeouts on dashboard data
- High database CPU usage

#### Diagnostics
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Solutions
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_transacoes_empresa_data 
ON transacoes(empresa_id, data_transacao);

CREATE INDEX CONCURRENTLY idx_documentos_status_created 
ON documentos(status_processamento, created_at);

-- Optimize common dashboard query
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
  user_id,
  COUNT(*) as total_empresas,
  SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as empresas_ativas
FROM empresas
GROUP BY user_id;

-- Refresh materialized view hourly
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
END;
$$ LANGUAGE plpgsql;
```

### DB-002: Connection Pool Exhaustion

#### Symptoms
- "Too many connections" errors
- Random connection failures
- Slow response times

#### Diagnostics
```sql
-- Check active connections
SELECT count(*) as connections, state
FROM pg_stat_activity
WHERE state IS NOT NULL
GROUP BY state;

-- Check connection sources
SELECT client_addr, count(*) as connections
FROM pg_stat_activity
WHERE state = 'active'
GROUP BY client_addr
ORDER BY connections DESC;
```

#### Solutions
```typescript
// Implement connection pooling in client
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app-name' },
  },
});

// Use React Query for connection reuse
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});
```

### DB-003: RLS Policy Problems

#### Symptoms
- Users can't see their own data
- "Permission denied" errors
- Data leakage between users

#### Diagnostics
```sql
-- Test RLS policies
SET role TO authenticated;
SET request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Try accessing data as specific user
SELECT * FROM empresas WHERE user_id = 'user-uuid-here';

-- Check policy definitions
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE schemaname = 'public';
```

#### Solutions
```sql
-- Fix common RLS issues

-- 1. Ensure auth.uid() function works
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json ->> 'sub',
    NULL
  )::uuid;
$$ LANGUAGE sql STABLE;

-- 2. Update problematic policies
DROP POLICY IF EXISTS "Users can only access their own companies" ON empresas;
CREATE POLICY "Users can only access their own companies" ON empresas
  FOR ALL USING (
    user_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- 3. Ensure INSERT policies allow new records
CREATE POLICY "Users can insert their own companies" ON empresas
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

## API & Edge Functions Issues

### API-001: Edge Function Timeouts

#### Symptoms
- AI chat responses timeout
- Document processing fails with timeout
- Function invocation errors

#### Diagnostics
```typescript
// Check function logs
const { data, error } = await supabase.functions.invoke('chat', {
  body: { message: 'test' }
});

if (error) {
  console.error('Function error:', error);
  // Check specific error types
  if (error.message.includes('timeout')) {
    // Handle timeout specifically
  }
}
```

#### Solutions
```typescript
// Implement retry logic
const invokeWithRetry = async (functionName: string, payload: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

// Optimize Edge Function
// In supabase/functions/chat/index.ts
serve(async (req) => {
  const startTime = Date.now();
  
  try {
    // Add timeout to OpenAI request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      signal: controller.signal,
      // ... other options
    });
    
    clearTimeout(timeoutId);
    // ... rest of function
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Function failed after ${duration}ms:`, error);
    throw error;
  }
});
```

### API-002: Rate Limiting Issues

#### Symptoms
- "Too many requests" errors
- OpenAI API quota exceeded
- Temporary service unavailable

#### Solutions
```typescript
// Implement client-side rate limiting
class RateLimiter {
  private requests: number[] = [];
  
  constructor(private maxRequests: number, private windowMs: number) {}
  
  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.checkLimit();
    }
    
    this.requests.push(now);
    return true;
  }
}

// Usage
const rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

const sendMessage = async (message: string) => {
  await rateLimiter.checkLimit();
  return await supabase.functions.invoke('chat', { body: { message } });
};
```

### API-003: CORS Issues

#### Symptoms
- Cross-origin request blocked
- Preflight request failures
- API calls work in dev but fail in production

#### Solutions
```typescript
// Fix CORS in Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://contabilidadepro.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Handle preflight requests
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}

// Add CORS headers to all responses
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  status: 200,
});
```

## Document Processing Issues

### DOC-001: OCR Processing Failures

#### Symptoms
- Documents stuck in "processing" status
- Poor text extraction quality
- Azure Document Intelligence errors

#### Diagnostics
```typescript
// Check document processing status
const { data: documents } = await supabase
  .from('documentos')
  .select('*')
  .eq('status_processamento', 'processando')
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

console.log('Stuck documents:', documents);

// Check processing logs
const { data: logs } = await supabase
  .from('documento_processamento_log')
  .select('*')
  .in('documento_id', documents.map(d => d.id))
  .order('created_at', { ascending: false });
```

#### Solutions
```typescript
// Implement retry mechanism for failed processing
const retryDocumentProcessing = async (documentId: string) => {
  // Reset status
  await supabase
    .from('documentos')
    .update({ 
      status_processamento: 'pendente',
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);

  // Trigger reprocessing
  const { error } = await supabase.functions.invoke('process-document', {
    body: { documentId, retry: true }
  });

  if (error) {
    console.error('Retry failed:', error);
    // Mark as failed and notify admin
    await supabase
      .from('documentos')
      .update({ status_processamento: 'erro' })
      .eq('id', documentId);
  }
};

// Improve OCR preprocessing
const preprocessImage = async (file: File): Promise<File> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = new Image();
  
  return new Promise((resolve) => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Enhance contrast and brightness
      ctx.filter = 'contrast(120%) brightness(110%)';
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: 'image/png' }));
      }, 'image/png');
    };
    
    img.src = URL.createObjectURL(file);
  });
};
```

### DOC-002: File Upload Issues

#### Symptoms
- Upload progress stuck at 99%
- "File too large" errors
- Upload fails silently

#### Solutions
```typescript
// Implement chunked upload for large files
const uploadLargeFile = async (file: File, empresaId: string) => {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  const uploadId = crypto.randomUUID();

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const chunkPath = `${empresaId}/${uploadId}/chunk-${i}`;
    
    const { error } = await supabase.storage
      .from('documentos')
      .upload(chunkPath, chunk);

    if (error) {
      // Cleanup uploaded chunks
      for (let j = 0; j < i; j++) {
        await supabase.storage
          .from('documentos')
          .remove([`${empresaId}/${uploadId}/chunk-${j}`]);
      }
      throw error;
    }
  }

  // Combine chunks on server side (Edge Function)
  const { data, error } = await supabase.functions.invoke('combine-chunks', {
    body: { uploadId, empresaId, totalChunks, fileName: file.name }
  });

  return data;
};

// File validation before upload
const validateFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/xml'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Arquivo muito grande (máximo 10MB)' };
  }

  return { valid: true };
};
```

## Tax Calculation Issues

### TAX-001: Incorrect DAS Calculations

#### Symptoms
- DAS values don't match expected amounts
- Wrong tax rates applied
- Calculation errors for specific companies

#### Diagnostics
```typescript
// Debug DAS calculation
const debugDASCalculation = async (empresaId: string, periodo: string) => {
  // Get company data
  const { data: empresa } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', empresaId)
    .single();

  // Get 12-month revenue
  const startDate = new Date(periodo);
  startDate.setMonth(startDate.getMonth() - 12);
  
  const { data: transacoes } = await supabase
    .from('transacoes')
    .select('valor, data_transacao')
    .eq('empresa_id', empresaId)
    .eq('tipo_transacao', 'receita')
    .eq('status', 'pago')
    .gte('data_transacao', startDate.toISOString().split('T')[0])
    .lte('data_transacao', periodo);

  const receita12Meses = transacoes?.reduce((sum, t) => sum + t.valor, 0) || 0;
  
  console.log('Debug DAS:', {
    empresa: empresa?.razao_social,
    regime: empresa?.regime_tributario,
    anexo: empresa?.anexo_simples,
    receita12Meses,
    transacoes: transacoes?.length
  });

  return { empresa, receita12Meses, transacoes };
};
```

#### Solutions
```typescript
// Fix DAS calculation logic
const calculateDASCorrect = (receita12Meses: number, anexo: string): DASResult => {
  const tabelas = {
    'I': [
      { limite: 180000, aliquota: 0.04, deducao: 0 },
      { limite: 360000, aliquota: 0.073, deducao: 5940 },
      { limite: 720000, aliquota: 0.095, deducao: 13860 },
      { limite: 1800000, aliquota: 0.107, deducao: 22500 },
      { limite: 3600000, aliquota: 0.143, deducao: 87300 },
      { limite: 4800000, aliquota: 0.19, deducao: 378000 }
    ],
    // ... other annexes
  };

  const faixas = tabelas[anexo] || tabelas['I'];
  const faixa = faixas.find(f => receita12Meses <= f.limite) || faixas[faixas.length - 1];
  
  const aliquotaEfetiva = (receita12Meses * faixa.aliquota - faixa.deducao) / receita12Meses;
  const receitaMensal = receita12Meses / 12;
  const valorDAS = receitaMensal * aliquotaEfetiva;

  return {
    aliquotaEfetiva,
    valorDAS: Math.round(valorDAS * 100) / 100, // Round to 2 decimals
    faixaAplicada: faixa,
    receita12Meses,
    receitaMensal
  };
};
```

### TAX-002: Deadline Calculation Errors

#### Symptoms
- Wrong due dates for tax payments
- Missing deadline alerts
- Inconsistent deadline tracking

#### Solutions
```typescript
// Fix deadline calculation
const calculateTaxDeadlines = (ano: number, mes: number) => {
  const deadlines = {
    DAS: new Date(ano, mes, 20), // 20th of following month
    FGTS: getWorkingDay(ano, mes, 7), // 7th working day
    GPS: new Date(ano, mes, 20),
    IRPJ_CSLL: getLastWorkingDay(ano, mes) // Last working day
  };

  // Adjust for weekends and holidays
  Object.keys(deadlines).forEach(key => {
    deadlines[key] = adjustForBusinessDay(deadlines[key]);
  });

  return deadlines;
};

const adjustForBusinessDay = (date: Date): Date => {
  const day = date.getDay();
  if (day === 0) { // Sunday
    date.setDate(date.getDate() + 1);
  } else if (day === 6) { // Saturday
    date.setDate(date.getDate() + 2);
  }
  
  // Check for Brazilian holidays
  if (isBrazilianHoliday(date)) {
    return adjustForBusinessDay(new Date(date.getTime() + 24 * 60 * 60 * 1000));
  }
  
  return date;
};
```

## Performance Issues

### PERF-001: Slow Dashboard Loading

#### Symptoms
- Dashboard takes >5 seconds to load
- Multiple database queries executing
- High Time to First Byte (TTFB)

#### Solutions
```typescript
// Implement dashboard data caching
const useDashboardData = (empresaId?: string) => {
  return useQuery({
    queryKey: ['dashboard', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_complete', {
        empresa_uuid: empresaId
      });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

// Optimize dashboard RPC function
CREATE OR REPLACE FUNCTION get_dashboard_complete(empresa_uuid UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_clientes', (
      SELECT COUNT(*) FROM empresas 
      WHERE (empresa_uuid IS NULL OR id = empresa_uuid)
      AND status = 'ativo'
    ),
    'documentos_mes', (
      SELECT COUNT(*) FROM documentos d
      WHERE (empresa_uuid IS NULL OR d.empresa_id = empresa_uuid)
      AND d.created_at >= date_trunc('month', CURRENT_DATE)
    ),
    -- Use indexes for better performance
    'receita_mes', (
      SELECT COALESCE(SUM(valor), 0) FROM transacoes
      WHERE (empresa_uuid IS NULL OR empresa_id = empresa_uuid)
      AND tipo_transacao = 'receita'
      AND status = 'pago'
      AND data_transacao >= date_trunc('month', CURRENT_DATE)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### PERF-002: Large Dataset Queries

#### Symptoms
- Timeout errors on reports
- Memory issues with large result sets
- Slow pagination

#### Solutions
```typescript
// Implement cursor-based pagination
const useTransactionsPaginated = (empresaId: string, pageSize = 50) => {
  const [cursor, setCursor] = useState<string | null>(null);
  
  return useInfiniteQuery({
    queryKey: ['transactions', empresaId],
    queryFn: async ({ pageParam = null }) => {
      let query = supabase
        .from('transacoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(pageSize);

      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        data,
        nextCursor: data.length === pageSize ? data[data.length - 1].created_at : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
};

// Database query optimization
-- Add composite index for common query patterns
CREATE INDEX CONCURRENTLY idx_transacoes_empresa_created 
ON transacoes(empresa_id, created_at DESC) 
WHERE status = 'pago';

-- Use LIMIT and OFFSET efficiently
SELECT * FROM transacoes 
WHERE empresa_id = $1 
  AND created_at < $2 
ORDER BY created_at DESC 
LIMIT 50;
```

## Monitoring & Alerting

### Alert Setup
```typescript
// Implement error monitoring
class ErrorMonitor {
  static async logError(error: Error, context: Record<string, any>) {
    console.error('Application Error:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });

    // Send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          context
        })
      });
    }
  }
}

// Usage throughout the app
try {
  // risky operation
} catch (error) {
  ErrorMonitor.logError(error, { 
    component: 'DashboardPage',
    action: 'loadData',
    userId: user?.id
  });
}
```

## Support Escalation

### When to Escalate
1. **Database corruption or data loss**
2. **Security incidents or breaches**
3. **Platform-wide outages >30 minutes**
4. **Payment processing failures**
5. **Legal compliance issues**

### Escalation Contacts
```typescript
const escalationMatrix = {
  P0_Critical: {
    timeframe: 'immediate',
    contacts: ['cto@company.com', '+55-11-99999-9999'],
    services: ['Supabase Support', 'Vercel Support']
  },
  P1_High: {
    timeframe: '4_hours',
    contacts: ['dev-team@company.com'],
    services: ['Technical Support Chat']
  },
  P2_Medium: {
    timeframe: '24_hours',
    contacts: ['support@company.com'],
    services: ['Standard Support Ticket']
  }
};
```

---

*This troubleshooting guide should be updated regularly based on new issues encountered and their solutions. Keep this document accessible to all team members and support staff.*

**Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: April 2025  
**Owner**: DevOps & Support Team