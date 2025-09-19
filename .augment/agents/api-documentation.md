---
type: "agent_requested"
description: "Example description"
---

# ContabilidadePRO - API Documentation

## Overview
This document provides comprehensive documentation for all API endpoints, Supabase Edge Functions, and third-party integrations used in the ContabilidadePRO system.

## Base Configuration

### API Base URLs
```typescript
const config = {
  supabase: {
    url: 'https://selnwgpyjctpjzdrfrey.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY // Server-side only
  },
  functions: {
    baseUrl: 'https://selnwgpyjctpjzdrfrey.supabase.co/functions/v1'
  }
}
```

### Authentication
All API requests require authentication via Supabase JWT tokens:
```typescript
// Client-side authentication
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Headers for authenticated requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}
```

## Supabase Edge Functions

### 1. AI Chat Function
**Endpoint**: `/functions/v1/chat`  
**Method**: `POST`  
**Purpose**: Handle AI conversations and provide intelligent assistance

#### Request Format
```typescript
interface ChatRequest {
  message: string;
  conversationId?: string;
  empresaId?: string;
  context?: {
    type: 'dashboard' | 'document' | 'tax_calculation' | 'general';
    data?: any;
  };
  stream?: boolean;
}
```

#### Response Format
```typescript
interface ChatResponse {
  success: boolean;
  data: {
    conversationId: string;
    message: {
      id: string;
      content: string;
      role: 'assistant';
      timestamp: string;
      tokensUsed: number;
      model: string;
    };
    suggestions?: string[];
    actions?: Array<{
      type: string;
      label: string;
      payload: any;
    }>;
  };
  error?: string;
}
```

#### Example Usage
```typescript
const response = await supabase.functions.invoke('chat', {
  body: {
    message: "Calcule o DAS para janeiro de 2025",
    empresaId: "123e4567-e89b-12d3-a456-426614174000",
    context: {
      type: "tax_calculation",
      data: { periodo: "2025-01" }
    }
  }
});
```

#### Error Codes
- `400`: Invalid request format
- `401`: Authentication required
- `403`: Insufficient permissions
- `429`: Rate limit exceeded
- `500`: Internal server error

### 2. Document Processing Function
**Endpoint**: `/functions/v1/process-document`  
**Method**: `POST`  
**Purpose**: Process uploaded documents with OCR and data extraction

#### Request Format
```typescript
interface DocumentProcessingRequest {
  documentId: string;
  empresaId: string;
  options?: {
    extractText: boolean;
    categorizeTransactions: boolean;
    validateData: boolean;
    generateSummary: boolean;
  };
}
```

#### Response Format
```typescript
interface DocumentProcessingResponse {
  success: boolean;
  data: {
    documentId: string;
    status: 'processing' | 'completed' | 'failed';
    extractedData?: {
      text: string;
      entities: Array<{
        type: 'cnpj' | 'cpf' | 'valor' | 'data' | 'numero_documento';
        value: string;
        confidence: number;
      }>;
      transactions?: Array<{
        descricao: string;
        valor: number;
        data: string;
        categoria: string;
        confidence: number;
      }>;
    };
    processingTime: number;
    warnings?: string[];
  };
  error?: string;
}
```

#### Example Usage
```typescript
const response = await supabase.functions.invoke('process-document', {
  body: {
    documentId: "doc-123",
    empresaId: "empresa-456",
    options: {
      extractText: true,
      categorizeTransactions: true,
      validateData: true
    }
  }
});
```

### 3. Tax Calculation Function
**Endpoint**: `/functions/v1/calculate-tax`  
**Method**: `POST`  
**Purpose**: Perform Brazilian tax calculations (DAS, IRPJ, CSLL, etc.)

#### Request Format
```typescript
interface TaxCalculationRequest {
  empresaId: string;
  tipoCalculo: 'DAS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS' | 'ICMS' | 'ISS';
  periodoApuracao: string; // YYYY-MM format
  parametros?: {
    anexoSimples?: 'I' | 'II' | 'III' | 'IV' | 'V';
    regimeTributario?: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
    receitaBruta?: number;
    deducoes?: number;
  };
}
```

#### Response Format
```typescript
interface TaxCalculationResponse {
  success: boolean;
  data: {
    calculoId: string;
    tipoCalculo: string;
    periodo: string;
    resultado: {
      receitaBruta: number;
      baseCalculo: number;
      aliquota: number;
      valorImposto: number;
      valorDevido: number;
      dataVencimento: string;
    };
    detalhes: {
      metodologia: string;
      consideracoes: string[];
      fundamentosLegais: string[];
    };
    codigoBarras?: string;
  };
  error?: string;
}
```

#### Example Usage
```typescript
const response = await supabase.functions.invoke('calculate-tax', {
  body: {
    empresaId: "empresa-123",
    tipoCalculo: "DAS",
    periodoApuracao: "2025-01",
    parametros: {
      anexoSimples: "I",
      regimeTributario: "Simples Nacional"
    }
  }
});
```

### 4. Report Generation Function
**Endpoint**: `/functions/v1/generate-report`  
**Method**: `POST`  
**Purpose**: Generate accounting reports in PDF/Excel format

#### Request Format
```typescript
interface ReportGenerationRequest {
  empresaId: string;
  tipoRelatorio: 'DRE' | 'balanco' | 'fluxo_caixa' | 'impostos' | 'transacoes';
  periodoInicio: string; // YYYY-MM-DD
  periodoFim: string; // YYYY-MM-DD
  formato: 'PDF' | 'EXCEL' | 'JSON';
  parametros?: {
    incluirGraficos?: boolean;
    detalhamento?: 'resumido' | 'detalhado' | 'completo';
    moeda?: 'BRL' | 'USD';
    consolidado?: boolean;
  };
}
```

#### Response Format
```typescript
interface ReportGenerationResponse {
  success: boolean;
  data: {
    reportId: string;
    status: 'generating' | 'completed' | 'failed';
    downloadUrl?: string;
    previewUrl?: string;
    expiresAt: string;
    metadata: {
      totalPages?: number;
      fileSize?: number;
      generatedAt: string;
    };
  };
  error?: string;
}
```

## Database API (Supabase Client)

### 1. Companies (Empresas)

#### Get Companies
```typescript
const { data: empresas, error } = await supabase
  .from('empresas')
  .select(`
    *,
    empresa_socios(*)
  `)
  .eq('user_id', userId)
  .eq('status', 'ativo');
```

#### Create Company
```typescript
const { data, error } = await supabase
  .from('empresas')
  .insert({
    user_id: userId,
    razao_social: 'Empresa Exemplo LTDA',
    cnpj: '12.345.678/0001-90',
    regime_tributario: 'Simples Nacional',
    anexo_simples: 'I',
    atividade_principal: 'Consultoria em TI',
    endereco: {
      logradouro: 'Rua das Flores, 123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01234-567'
    }
  })
  .select()
  .single();
```

#### Update Company
```typescript
const { data, error } = await supabase
  .from('empresas')
  .update({
    regime_tributario: 'Lucro Presumido',
    updated_at: new Date().toISOString()
  })
  .eq('id', empresaId)
  .eq('user_id', userId);
```

### 2. Documents (Documentos)

#### Upload Document
```typescript
// First, upload file to storage
const { data: fileData, error: uploadError } = await supabase.storage
  .from('documentos')
  .upload(`${empresaId}/${Date.now()}_${file.name}`, file);

// Then, create document record
const { data, error } = await supabase
  .from('documentos')
  .insert({
    empresa_id: empresaId,
    user_id: userId,
    tipo_documento: 'NFe',
    arquivo_url: fileData.path,
    arquivo_nome: file.name,
    arquivo_tamanho: file.size,
    arquivo_tipo: file.type
  })
  .select()
  .single();
```

#### Get Documents
```typescript
const { data: documentos, error } = await supabase
  .from('documentos')
  .select(`
    *,
    empresas(razao_social)
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(0, 49); // Pagination: first 50 records
```

### 3. Transactions (Transações)

#### Create Transaction
```typescript
const { data, error } = await supabase
  .from('transacoes')
  .insert({
    empresa_id: empresaId,
    tipo_transacao: 'receita',
    categoria: 'Vendas de Produtos',
    descricao: 'Venda de software - Cliente ABC',
    valor: 1500.00,
    data_transacao: '2025-01-15',
    status: 'pago',
    forma_pagamento: 'pix'
  })
  .select()
  .single();
```

#### Get Transactions with Filters
```typescript
const { data: transacoes, error } = await supabase
  .from('transacoes')
  .select(`
    *,
    empresas(razao_social)
  `)
  .in('empresa_id', empresaIds)
  .gte('data_transacao', startDate)
  .lte('data_transacao', endDate)
  .eq('tipo_transacao', 'receita')
  .order('data_transacao', { ascending: false });
```

### 4. Tax Calculations (Cálculos de Impostos)

#### Get Tax Calculations
```typescript
const { data: calculos, error } = await supabase
  .from('calculos_impostos')
  .select(`
    *,
    empresas(razao_social, regime_tributario)
  `)
  .eq('empresa_id', empresaId)
  .gte('periodo_apuracao', startPeriod)
  .lte('periodo_apuracao', endPeriod)
  .order('periodo_apuracao', { ascending: false });
```

#### Create Tax Calculation
```typescript
const { data, error } = await supabase
  .from('calculos_impostos')
  .insert({
    empresa_id: empresaId,
    periodo_apuracao: '2025-01-01',
    tipo_calculo: 'DAS',
    regime_tributario: 'Simples Nacional',
    receita_bruta: 15000.00,
    base_calculo: 15000.00,
    aliquota: 0.06,
    valor_imposto: 900.00,
    valor_devido: 900.00,
    data_vencimento: '2025-02-20',
    detalhes_calculo: {
      anexo: 'I',
      faixa_receita: '1ª faixa',
      metodologia: 'Simples Nacional - Anexo I'
    }
  })
  .select()
  .single();
```

### 5. Fiscal Obligations (Obrigações Fiscais)

#### Get Upcoming Deadlines
```typescript
const { data: obrigacoes, error } = await supabase
  .from('obrigacoes_fiscais')
  .select(`
    *,
    empresas(razao_social)
  `)
  .eq('empresa_id', empresaId)
  .eq('status', 'pendente')
  .gte('data_vencimento', new Date().toISOString().split('T')[0])
  .lte('data_vencimento', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  .order('data_vencimento', { ascending: true });
```

## Real-time Subscriptions

### Document Processing Updates
```typescript
const documentSubscription = supabase
  .channel('document-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'documentos',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      console.log('Document updated:', payload.new);
      // Update UI with new document status
    }
  )
  .subscribe();
```

### Tax Calculation Results
```typescript
const taxSubscription = supabase
  .channel('tax-calculations')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'calculos_impostos',
      filter: `empresa_id=eq.${empresaId}`
    },
    (payload) => {
      console.log('New tax calculation:', payload.new);
      // Notify user of completed calculation
    }
  )
  .subscribe();
```

## Third-party API Integrations

### 1. OpenAI GPT-4 Integration
```typescript
interface OpenAIRequest {
  model: 'gpt-4' | 'gpt-4-turbo';
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

// Usage in Edge Function
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
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
        content: userMessage
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  })
});
```

### 2. Azure Document Intelligence (OCR)
```typescript
interface AzureOCRRequest {
  endpoint: string;
  apiKey: string;
  documentUrl: string;
}

// Usage for document processing
const analyzeDocument = async (documentUrl: string) => {
  const response = await fetch(
    `${process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT}/formrecognizer/documentModels/prebuilt-invoice:analyze?api-version=2023-07-31`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        urlSource: documentUrl
      })
    }
  );
  
  return response.json();
};
```

### 3. Brazilian Government APIs

#### CNPJ Validation (ReceitaWS)
```typescript
const validateCNPJ = async (cnpj: string) => {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  
  const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
  const data = await response.json();
  
  return {
    valid: data.status !== 'ERROR',
    razaoSocial: data.nome,
    nomeFantasia: data.fantasia,
    situacao: data.situacao,
    atividades: data.atividade_principal
  };
};
```

#### CEP Lookup (ViaCEP)
```typescript
const lookupCEP = async (cep: string) => {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  
  const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
  const data = await response.json();
  
  return {
    logradouro: data.logradouro,
    bairro: data.bairro,
    cidade: data.localidade,
    uf: data.uf,
    cep: data.cep
  };
};
```

## Error Handling & Best Practices

### Standard Error Format
```typescript
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

### Rate Limiting
- **Chat API**: 60 requests per minute per user
- **Document Processing**: 10 requests per minute per user
- **Tax Calculations**: 30 requests per minute per user
- **Report Generation**: 5 requests per minute per user

### Retry Logic
```typescript
const apiCall = async (endpoint: string, options: any, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(endpoint, options);
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status >= 500 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      
      throw new Error(`API call failed: ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

### Caching Strategy
```typescript
// React Query configuration for API caching
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});
```

## Security Considerations

### API Key Management
- All API keys stored in environment variables
- Rotation schedule: Every 90 days
- Separate keys for development/staging/production
- Never expose keys in client-side code

### Input Validation
```typescript
// Zod schemas for API validation
const empresaSchema = z.object({
  razao_social: z.string().min(1).max(255),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/),
  regime_tributario: z.enum(['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real'])
});

// Usage in API endpoints
const validateEmpresa = (data: unknown) => {
  return empresaSchema.parse(data);
};
```

### Rate Limiting Implementation
```typescript
// Rate limiting in Edge Functions
const rateLimiter = new Map();

const checkRateLimit = (userId: string, limit: number, window: number) => {
  const now = Date.now();
  const userKey = `${userId}:${Math.floor(now / window)}`;
  
  const requests = rateLimiter.get(userKey) || 0;
  if (requests >= limit) {
    throw new Error('Rate limit exceeded');
  }
  
  rateLimiter.set(userKey, requests + 1);
};
```

---

*This API documentation is maintained to reflect the current implementation and will be updated as new features are added to the ContabilidadePRO platform.*

**API Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: April 2025