---
type: "agent_requested"
description: "Example description"
---

# ContabilidadePRO - Testing Strategy

## Overview
This document outlines the comprehensive testing strategy for ContabilidadePRO, ensuring reliability, accuracy, and compliance for Brazilian accounting operations. Given the critical nature of financial data, our testing approach emphasizes precision, security, and regulatory compliance.

## Testing Philosophy

### Core Principles
1. **Financial Accuracy First**: Every tax calculation must be 100% accurate
2. **Security by Design**: All tests must validate data protection and access controls
3. **Compliance Validation**: Brazilian tax regulations must be continuously verified
4. **User Experience**: Tests ensure smooth, intuitive workflows for accountants
5. **Performance Standards**: System must handle peak loads without degradation

### Testing Pyramid
```
                    ┌─────────────────┐
                    │   E2E Tests     │ 20%
                    │   (Critical     │
                    │   Workflows)    │
                    └─────────────────┘
                  ┌───────────────────────┐
                  │  Integration Tests    │ 30%
                  │  (API, Database,      │
                  │   External Services)  │
                  └───────────────────────┘
              ┌─────────────────────────────────┐
              │        Unit Tests               │ 50%
              │  (Business Logic, Utilities,    │
              │   Components, Tax Calculations) │
              └─────────────────────────────────┘
```

## Test Environment Setup

### Testing Stack
```typescript
interface TestingStack {
  unitTesting: {
    framework: 'Jest';
    reactTesting: '@testing-library/react';
    utilities: '@testing-library/jest-dom';
    coverage: 'minimum_80_percent';
  };
  
  integrationTesting: {
    api: 'Supertest + Jest';
    database: 'Supabase Test Database';
    mocking: 'MSW (Mock Service Worker)';
  };
  
  e2eTesting: {
    framework: 'Playwright';
    browsers: ['chromium', 'firefox', 'webkit'];
    parallelization: true;
    headless: true;
  };
  
  performanceTesting: {
    load: 'Artillery.js';
    lighthouse: 'Lighthouse CI';
    database: 'pgbench';
  };
}
```

### Test Database Configuration
```sql
-- Test database setup with sample data
CREATE SCHEMA IF NOT EXISTS test_data;

-- Sample test companies
INSERT INTO empresas (id, user_id, razao_social, cnpj, regime_tributario, anexo_simples)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'test-user-1', 'Empresa Teste LTDA', '12.345.678/0001-90', 'Simples Nacional', 'I'),
  ('550e8400-e29b-41d4-a716-446655440002', 'test-user-1', 'Serviços Tech LTDA', '98.765.432/0001-10', 'Simples Nacional', 'III'),
  ('550e8400-e29b-41d4-a716-446655440003', 'test-user-2', 'Consultoria ABC LTDA', '11.222.333/0001-44', 'Lucro Presumido', NULL);

-- Sample transactions for tax calculations
INSERT INTO transacoes (empresa_id, tipo_transacao, categoria, descricao, valor, data_transacao, status)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'receita', 'Vendas', 'Venda produto A', 1500.00, '2024-01-15', 'pago'),
  ('550e8400-e29b-41d4-a716-446655440001', 'receita', 'Vendas', 'Venda produto B', 2300.00, '2024-02-15', 'pago'),
  ('550e8400-e29b-41d4-a716-446655440001', 'despesa', 'Fornecedores', 'Compra matéria prima', 800.00, '2024-01-20', 'pago');
```

## Unit Testing

### Tax Calculation Tests
```typescript
// tests/unit/tax-calculations.test.ts
import { calculateDAS, calculateIRPJ, validateCNPJ } from '@/lib/tax-utils';

describe('Tax Calculations', () => {
  describe('DAS Calculation - Simples Nacional', () => {
    test('should calculate DAS correctly for Annex I - 1st bracket', () => {
      const result = calculateDAS({
        receitaBruta12Meses: 150000,
        anexo: 'I',
        regimeTributario: 'Simples Nacional'
      });

      expect(result.aliquotaEfetiva).toBeCloseTo(0.04, 4);
      expect(result.valorDAS).toBeCloseTo(500.00, 2); // 150k/12 * 4%
      expect(result.faixaAplicada.limite).toBe(180000);
    });

    test('should calculate DAS correctly for Annex I - 2nd bracket', () => {
      const result = calculateDAS({
        receitaBruta12Meses: 300000,
        anexo: 'I',
        regimeTributario: 'Simples Nacional'
      });

      const expectedAliquota = (300000 * 0.073 - 5940) / 300000;
      expect(result.aliquotaEfetiva).toBeCloseTo(expectedAliquota, 4);
      expect(result.valorDAS).toBeCloseTo(1522.50, 2); // (300k * 7.3% - 5940) / 12
    });

    test('should handle Fator R calculation for Annex III', () => {
      const result = calculateDAS({
        receitaBruta12Meses: 200000,
        anexo: 'III',
        regimeTributario: 'Simples Nacional',
        fatorR: 0.25 // Below 28%, should use Annex V rates
      });

      // Should use Annex V rates when Fator R < 28%
      expect(result.anexoUtilizado).toBe('V');
      expect(result.fatorR).toBe(0.25);
    });

    test('should throw error for invalid revenue limits', () => {
      expect(() => {
        calculateDAS({
          receitaBruta12Meses: 5000000, // Above Simples Nacional limit
          anexo: 'I',
          regimeTributario: 'Simples Nacional'
        });
      }).toThrow('Receita excede limite do Simples Nacional');
    });
  });

  describe('IRPJ/CSLL Calculation - Lucro Presumido', () => {
    test('should calculate IRPJ correctly for commerce activity', () => {
      const result = calculateIRPJ({
        receitaTrimestral: 300000,
        atividade: 'comercio',
        regimeTributario: 'Lucro Presumido'
      });

      const lucroPresumido = 300000 * 0.08; // 8% for commerce
      const irpjExpected = lucroPresumido * 0.15; // 15% IRPJ rate
      
      expect(result.lucroPresumido).toBe(24000);
      expect(result.irpj).toBe(3600);
      expect(result.csll).toBe(2160); // 24000 * 12% * 9%
    });

    test('should apply additional 10% IRPJ on excess profit', () => {
      const result = calculateIRPJ({
        receitaTrimestral: 900000, // Large revenue
        atividade: 'servicos',
        regimeTributario: 'Lucro Presumido'
      });

      const lucroPresumido = 900000 * 0.32; // 32% for services
      const excessProfit = lucroPresumido - 60000; // R$ 20k monthly * 3 months
      
      expect(result.irpjAdicional).toBe(excessProfit * 0.10);
      expect(result.totalIRPJ).toBe(9000 + (lucroPresumido - 60000) * 0.10);
    });
  });

  describe('Validation Functions', () => {
    test('should validate CNPJ correctly', () => {
      expect(validateCNPJ('12.345.678/0001-90')).toBe(true);
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
      expect(validateCNPJ('12.345.678/0001-91')).toBe(false); // Invalid check digit
      expect(validateCNPJ('12345678000190')).toBe(true); // Unformatted
      expect(validateCNPJ('123.456.789/0001-90')).toBe(false); // Invalid format
    });

    test('should validate CPF correctly', () => {
      expect(validateCPF('123.456.789-09')).toBe(true);
      expect(validateCPF('12345678909')).toBe(true);
      expect(validateCPF('123.456.789-10')).toBe(false);
      expect(validateCPF('111.111.111-11')).toBe(false); // Sequential numbers
    });

    test('should validate tax regime compatibility', () => {
      expect(validateTaxRegime('MEI', 50000)).toBe(true);
      expect(validateTaxRegime('MEI', 90000)).toBe(false); // Exceeds MEI limit
      expect(validateTaxRegime('Simples Nacional', 3000000)).toBe(true);
      expect(validateTaxRegime('Simples Nacional', 5000000)).toBe(false);
    });
  });
});

// tests/unit/components/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '@/app/dashboard/page';
import { createMockSupabaseClient } from '../__mocks__/supabase';

jest.mock('@/lib/supabase', () => ({
  createClientComponentClient: () => createMockSupabaseClient()
}));

describe('Dashboard Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
  });

  test('should render dashboard metrics correctly', async () => {
    const mockData = {
      total_clientes: 5,
      documentos_mes: 12,
      proximos_vencimentos: 3,
      receita_mes: 15000.50
    };

    const mockSupabase = createMockSupabaseClient();
    mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Total clients
      expect(screen.getByText('12')).toBeInTheDocument(); // Documents this month
      expect(screen.getByText('R$ 15.000,50')).toBeInTheDocument(); // Revenue
    });
  });

  test('should handle loading state', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  test('should handle error state', async () => {
    const mockSupabase = createMockSupabaseClient();
    mockSupabase.rpc.mockResolvedValue({ 
      data: null, 
      error: { message: 'Database connection failed' } 
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Dashboard />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/erro ao carregar/i)).toBeInTheDocument();
    });
  });
});
```

### Business Logic Tests
```typescript
// tests/unit/document-processing.test.ts
import { categorizeTransaction, extractInvoiceData } from '@/lib/document-utils';

describe('Document Processing', () => {
  test('should categorize transaction based on description', () => {
    const testCases = [
      { description: 'Compra de material de escritório', expected: 'Despesas Administrativas' },
      { description: 'Pagamento de energia elétrica', expected: 'Utilidades' },
      { description: 'Venda de produtos para cliente ABC', expected: 'Receita de Vendas' },
      { description: 'Honorários advocatícios', expected: 'Serviços Profissionais' }
    ];

    testCases.forEach(({ description, expected }) => {
      const result = categorizeTransaction(description);
      expect(result.categoria).toBe(expected);
    });
  });

  test('should extract NFe data correctly', () => {
    const mockNFeXML = `
      <nfeProc>
        <NFe>
          <infNFe>
            <emit>
              <CNPJ>12345678000190</CNPJ>
              <xNome>Empresa Emissora LTDA</xNome>
            </emit>
            <total>
              <ICMSTot>
                <vNF>1500.00</vNF>
              </ICMSTot>
            </total>
          </infNFe>
        </NFe>
      </nfeProc>
    `;

    const result = extractInvoiceData(mockNFeXML);
    
    expect(result.cnpjEmissor).toBe('12.345.678/0001-90');
    expect(result.nomeEmissor).toBe('Empresa Emissora LTDA');
    expect(result.valorTotal).toBe(1500.00);
  });
});
```

## Integration Testing

### API Integration Tests
```typescript
// tests/integration/api/chat.test.ts
import { createRouteHandlerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

describe('Chat API Integration', () => {
  let supabase: any;

  beforeEach(() => {
    supabase = createRouteHandlerClient({ cookies });
    // Mock authentication
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });
  });

  test('should handle chat message and return AI response', async () => {
    const mockOpenAIResponse = {
      choices: [{ message: { content: 'Resposta do AI sobre contabilidade' } }],
      usage: { total_tokens: 150 }
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenAIResponse)
    });

    const response = await supabase.functions.invoke('chat', {
      body: {
        message: 'Como calcular o DAS?',
        empresaId: 'test-empresa-id',
        context: { type: 'tax_calculation' }
      }
    });

    expect(response.data.success).toBe(true);
    expect(response.data.data.message.content).toContain('contabilidade');
    expect(response.data.data.message.tokensUsed).toBe(150);
  });

  test('should handle OpenAI API errors gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limit exceeded' })
    });

    const response = await supabase.functions.invoke('chat', {
      body: { message: 'Test message' }
    });

    expect(response.error).toBeDefined();
    expect(response.error.message).toContain('rate limit');
  });
});

// tests/integration/database/tax-calculations.test.ts
describe('Tax Calculation Database Integration', () => {
  test('should store and retrieve DAS calculations correctly', async () => {
    const empresaId = 'test-empresa-id';
    const calculationData = {
      empresa_id: empresaId,
      periodo_apuracao: '2024-01-01',
      tipo_calculo: 'DAS',
      regime_tributario: 'Simples Nacional',
      receita_bruta: 15000.00,
      valor_imposto: 600.00,
      data_vencimento: '2024-02-20'
    };

    const { data: inserted, error: insertError } = await supabase
      .from('calculos_impostos')
      .insert(calculationData)
      .select()
      .single();

    expect(insertError).toBeNull();
    expect(inserted.valor_imposto).toBe(600.00);

    // Retrieve and verify
    const { data: retrieved } = await supabase
      .from('calculos_impostos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('periodo_apuracao', '2024-01-01')
      .single();

    expect(retrieved.valor_imposto).toBe(600.00);
    expect(retrieved.regime_tributario).toBe('Simples Nacional');
  });

  test('should enforce RLS policies correctly', async () => {
    // Try to access another user's data
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('user_id', 'different-user-id');

    // Should return empty result due to RLS
    expect(data).toEqual([]);
    expect(error).toBeNull();
  });
});
```

### External Service Integration Tests
```typescript
// tests/integration/external/azure-ocr.test.ts
describe('Azure Document Intelligence Integration', () => {
  test('should process invoice document successfully', async () => {
    const mockDocumentUrl = 'https://example.com/test-invoice.pdf';
    
    const response = await supabase.functions.invoke('process-document', {
      body: {
        documentId: 'test-doc-id',
        empresaId: 'test-empresa-id',
        options: {
          extractText: true,
          categorizeTransactions: true
        }
      }
    });

    expect(response.data.success).toBe(true);
    expect(response.data.data.extractedData).toBeDefined();
    expect(response.data.data.extractedData.entities).toContain(
      expect.objectContaining({ type: 'valor' })
    );
  });

  test('should handle Azure API errors gracefully', async () => {
    // Mock Azure API failure
    const response = await supabase.functions.invoke('process-document', {
      body: {
        documentId: 'invalid-doc-id',
        empresaId: 'test-empresa-id'
      }
    });

    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('processing failed');
  });
});
```

## End-to-End Testing

### Critical User Journeys
```typescript
// tests/e2e/user-journeys.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Accounting Workflow', () => {
  test('should complete full DAS calculation workflow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@accountant.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Navigate to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Add new company
    await page.click('text=Adicionar Empresa');
    await page.fill('input[name="razaoSocial"]', 'Empresa Teste E2E LTDA');
    await page.fill('input[name="cnpj"]', '12.345.678/0001-90');
    await page.selectOption('select[name="regimeTributario"]', 'Simples Nacional');
    await page.selectOption('select[name="anexoSimples"]', 'I');
    await page.click('button[type="submit"]');

    // Verify company was created
    await expect(page.locator('text=Empresa Teste E2E LTDA')).toBeVisible();

    // Add transaction
    await page.click('text=Nova Transação');
    await page.selectOption('select[name="tipoTransacao"]', 'receita');
    await page.fill('input[name="descricao"]', 'Venda de produtos');
    await page.fill('input[name="valor"]', '5000.00');
    await page.fill('input[name="dataTransacao"]', '2024-01-15');
    await page.click('button[type="submit"]');

    // Calculate DAS
    await page.click('text=Calcular DAS');
    await page.selectOption('select[name="periodo"]', '2024-02');
    await page.click('button[text="Calcular"]');

    // Verify calculation results
    await expect(page.locator('[data-testid="das-value"]')).toContainText('R$');
    await expect(page.locator('[data-testid="due-date"]')).toContainText('20/03/2024');

    // Generate payment slip
    await page.click('text=Gerar Boleto');
    await expect(page.locator('[data-testid="barcode"]')).toBeVisible();
    
    // Download payment slip
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Download PDF');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/DAS_.*\.pdf/);
  });

  test('should handle document upload and processing', async ({ page }) => {
    await page.goto('/dashboard');

    // Upload document
    await page.click('text=Upload Documento');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('input[type="file"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles('tests/fixtures/sample-invoice.pdf');

    // Select document type
    await page.selectOption('select[name="tipoDocumento"]', 'NFe');
    await page.click('button[text="Processar"]');

    // Wait for processing to complete
    await expect(page.locator('[data-testid="processing-status"]')).toContainText('Processado');

    // Verify extracted data
    await expect(page.locator('[data-testid="extracted-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="extracted-date"]')).toBeVisible();

    // Approve and categorize transaction
    await page.click('text=Aprovar Transação');
    await page.selectOption('select[name="categoria"]', 'Vendas');
    await page.click('button[text="Salvar"]');

    // Verify transaction was created
    await page.goto('/transactions');
    await expect(page.locator('table')).toContainText('sample-invoice.pdf');
  });

  test('should generate and download financial reports', async ({ page }) => {
    await page.goto('/reports');

    // Select report type
    await page.selectOption('select[name="tipoRelatorio"]', 'DRE');
    
    // Set date range
    await page.fill('input[name="dataInicio"]', '2024-01-01');
    await page.fill('input[name="dataFim"]', '2024-12-31');
    
    // Select company
    await page.selectOption('select[name="empresa"]', 'Empresa Teste E2E LTDA');
    
    // Generate report
    await page.click('button[text="Gerar Relatório"]');
    
    // Wait for generation
    await expect(page.locator('[data-testid="report-status"]')).toContainText('Concluído');
    
    // Verify report contents
    await expect(page.locator('[data-testid="receita-bruta"]')).toBeVisible();
    await expect(page.locator('[data-testid="lucro-liquido"]')).toBeVisible();
    
    // Download report
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Download PDF');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/DRE_.*\.pdf/);
  });
});

// tests/e2e/ai-assistant.spec.ts
test.describe('AI Assistant Functionality', () => {
  test('should provide accurate tax calculation assistance', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open AI chat
    await page.click('[data-testid="ai-chat-toggle"]');
    
    // Ask tax question
    await page.fill('[data-testid="chat-input"]', 'Como calcular o DAS para uma empresa do Anexo I com receita de R$ 200.000 nos últimos 12 meses?');
    await page.click('[data-testid="send-message"]');
    
    // Wait for AI response
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 10000 });
    
    // Verify response contains relevant information
    const response = await page.locator('[data-testid="ai-response"]').textContent();
    expect(response).toContain('Anexo I');
    expect(response).toContain('R$ 200.000');
    expect(response).toMatch(/alíquota|percentual/);
    
    // Test follow-up question
    await page.fill('[data-testid="chat-input"]', 'Qual seria a data de vencimento?');
    await page.click('[data-testid="send-message"]');
    
    await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('20');
  });

  test('should handle document analysis requests', async ({ page }) => {
    await page.goto('/documents');
    
    // Select a processed document
    await page.click('[data-testid="document-item"]').first();
    
    // Open AI analysis
    await page.click('text=Analisar com AI');
    
    // Wait for analysis
    await expect(page.locator('[data-testid="ai-analysis"]')).toBeVisible({ timeout: 15000 });
    
    // Verify analysis contains key insights
    const analysis = await page.locator('[data-testid="ai-analysis"]').textContent();
    expect(analysis).toMatch(/categoria|classificação|valor/);
  });
});
```

## Performance Testing

### Load Testing
```typescript
// tests/performance/load-test.js (Artillery.js)
module.exports = {
  config: {
    target: 'https://contabilidadepro.com',
    phases: [
      { duration: 60, arrivalRate: 5 }, // Warm up
      { duration: 120, arrivalRate: 10 }, // Sustained load
      { duration: 60, arrivalRate: 20 }, // Peak load
    ],
    defaults: {
      headers: {
        'Authorization': 'Bearer {{$randomString()}}',
        'Content-Type': 'application/json'
      }
    }
  },
  scenarios: [
    {
      name: 'Dashboard Load Test',
      weight: 40,
      flow: [
        { get: { url: '/api/dashboard' } },
        { think: 2 },
        { get: { url: '/api/companies' } },
        { think: 3 },
        { get: { url: '/api/recent-transactions' } }
      ]
    },
    {
      name: 'Tax Calculation Load Test',
      weight: 30,
      flow: [
        { post: { 
            url: '/api/calculate-tax',
            json: {
              empresaId: '{{ $randomUUID() }}',
              tipoCalculo: 'DAS',
              periodoApuracao: '2024-01'
            }
          }
        }
      ]
    },
    {
      name: 'AI Chat Load Test',
      weight: 20,
      flow: [
        { post: {
            url: '/functions/v1/chat',
            json: {
              message: 'Como calcular impostos?',
              context: { type: 'general' }
            }
          }
        }
      ]
    },
    {
      name: 'Document Processing Load Test', 
      weight: 10,
      flow: [
        { post: {
            url: '/functions/v1/process-document',
            json: {
              documentId: '{{ $randomUUID() }}',
              empresaId: '{{ $randomUUID() }}'
            }
          }
        }
      ]
    }
  ]
};
```

### Database Performance Tests
```sql
-- tests/performance/database-performance.sql

-- Test query performance with increasing data volume
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM get_dashboard_complete('550e8400-e29b-41d4-a716-446655440001');

-- Test index effectiveness
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM transacoes 
WHERE empresa_id = '550e8400-e29b-41d4-a716-446655440001'
  AND data_transacao >= '2024-01-01'
  AND status = 'pago';

-- Test concurrent access patterns
BEGIN;
  SELECT pg_advisory_lock(12345);
  -- Simulate concurrent tax calculations
  SELECT * FROM calculos_impostos WHERE empresa_id = '550e8400-e29b-41d4-a716-446655440001';
  INSERT INTO calculos_impostos (empresa_id, periodo_apuracao, valor_imposto) 
  VALUES ('550e8400-e29b-41d4-a716-446655440001', '2024-01-01', 500.00);
  SELECT pg_advisory_unlock(12345);
COMMIT;
```

## Security Testing

### Authentication & Authorization Tests
```typescript
// tests/security/auth-security.test.ts
describe('Security Testing', () => {
  test('should prevent unauthorized access to sensitive endpoints', async () => {
    // Test without authentication
    const response = await fetch('/api/companies', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(response.status).toBe(401);
  });

  test('should prevent SQL injection in query parameters', async () => {
    const maliciousInput = "'; DROP TABLE empresas; --";
    
    const response = await fetch(`/api/companies?search=${encodeURIComponent(maliciousInput)}`, {
      headers: { 'Authorization': 'Bearer valid-token' }
    });
    
    // Should not execute SQL injection
    expect(response.status).not.toBe(500);
    
    // Verify table still exists
    const { data } = await supabase.from('empresas').select('count').single();
    expect(data).toBeDefined();
  });

  test('should enforce RLS policies across all operations', async () => {
    const userAToken = 'user-a-token';
    const userBCompanyId = 'user-b-company-id';
    
    // User A tries to access User B's data
    const response = await fetch(`/api/companies/${userBCompanyId}`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    
    expect(response.status).toBe(403);
  });

  test('should validate and sanitize all input data', async () => {
    const maliciousData = {
      razaoSocial: '<script>alert("xss")</script>',
      cnpj: 'invalid-cnpj',
      endereco: { 
        script: '<img src=x onerror=alert(1)>' 
      }
    };
    
    const response = await fetch('/api/companies', {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer valid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(maliciousData)
    });
    
    expect(response.status).toBe(400);
    
    const error = await response.json();
    expect(error.message).toContain('validation');
  });
});
```

## Compliance Testing

### Brazilian Tax Regulation Tests
```typescript
// tests/compliance/tax-compliance.test.ts
describe('Brazilian Tax Compliance', () => {
  test('should enforce MEI revenue limits', () => {
    const meiLimit = 81000; // 2025 limit
    
    expect(() => {
      validateMEIEligibility(meiLimit + 1);
    }).toThrow('Revenue exceeds MEI limit');
    
    expect(validateMEIEligibility(meiLimit)).toBe(true);
  });

  test('should apply correct Simples Nacional rates for 2025', () => {
    const testCases = [
      { revenue: 150000, anexo: 'I', expectedRate: 0.04 },
      { revenue: 300000, anexo: 'I', expectedRate: 0.073 },
      { revenue: 600000, anexo: 'III', expectedRate: 0.135 }
    ];

    testCases.forEach(({ revenue, anexo, expectedRate }) => {
      const result = calculateSimplesNacionalRate(revenue, anexo);
      expect(result.aliquotaNominal).toBeCloseTo(expectedRate, 3);
    });
  });

  test('should calculate correct due dates for all tax types', () => {
    const dueDate2024_02 = calculateDueDate('DAS', new Date('2024-02-01'));
    expect(dueDate2024_02).toEqual(new Date('2024-03-20')); // 20th of following month
    
    const fgtsDate = calculateDueDate('FGTS', new Date('2024-02-01'));
    expect(fgtsDate.getDate()).toBeLessThanOrEqual(7); // 7th working day
  });

  test('should validate CNPJ and CPF according to Brazilian standards', () => {
    // Valid CNPJs
    expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
    expect(validateCNPJ('12.345.678/0001-90')).toBe(true);
    
    // Invalid CNPJs
    expect(validateCNPJ('11.222.333/0001-82')).toBe(false);
    expect(validateCNPJ('123.456.789/0001-90')).toBe(false);
    
    // Valid CPFs
    expect(validateCPF('123.456.789-09')).toBe(true);
    expect(validateCPF('987.654.321-00')).toBe(true);
    
    // Invalid CPFs
    expect(validateCPF('123.456.789-10')).toBe(false);
    expect(validateCPF('111.111.111-11')).toBe(false); // Sequential
  });
});

// tests/compliance/data-protection.test.ts
describe('LGPD Compliance', () => {
  test('should encrypt sensitive personal data', async () => {
    const sensitiveData = {
      cpf: '123.456.789-09',
      dadosBancarios: { banco: '001', agencia: '1234', conta: '56789' }
    };

    const { data } = await supabase
      .from('users')
      .insert({ ...sensitiveData, email: 'test@example.com' })
      .select()
      .single();

    // Verify CPF is encrypted in database
    const { data: rawData } = await supabase
      .rpc('get_raw_user_data', { user_id: data.id });
    
    expect(rawData.cpf).not.toBe('123.456.789-09');
    expect(rawData.cpf).toMatch(/^encrypted:/);
  });

  test('should allow data export for LGPD compliance', async () => {
    const userId = 'test-user-id';
    
    const response = await fetch(`/api/user-data-export/${userId}`, {
      headers: { 'Authorization': 'Bearer user-token' }
    });
    
    expect(response.status).toBe(200);
    
    const exportData = await response.json();
    expect(exportData).toHaveProperty('userData');
    expect(exportData).toHaveProperty('companies');
    expect(exportData).toHaveProperty('transactions');
    expect(exportData).toHaveProperty('documents');
  });

  test('should handle data deletion requests', async () => {
    const userId = 'test-user-to-delete';
    
    const response = await fetch(`/api/delete-user-data/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer admin-token' }
    });
    
    expect(response.status).toBe(200);
    
    // Verify user data is anonymized, not deleted (for audit trail)
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    expect(data.email).toBe('[DELETED]');
    expect(data.cpf).toBeNull();
  });
});
```

## Test Automation & CI/CD

### GitHub Actions Workflow
```yaml
# .github/workflows/testing.yml
name: Comprehensive Testing Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Setup test database
        run: |
          npm run supabase:start
          npm run supabase:db:reset
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Build application
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  performance-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Artillery
        run: npm install -g artillery
      
      - name: Run load tests
        run: artillery run tests/performance/load-test.yml
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Run security audit
        run: npm audit --audit-level high
      
      - name: Run SAST with CodeQL
        uses: github/codeql-action/analyze@v2
        with:
          languages: typescript, javascript
```

### Test Coverage Requirements
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 85,
        "lines": 85,
        "statements": 85
      },
      "./src/lib/tax-utils.ts": {
        "branches": 95,
        "functions": 100,
        "lines": 95,
        "statements": 95
      },
      "./src/lib/validation.ts": {
        "branches": 90,
        "functions": 95,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

## Quality Gates

### Pre-deployment Checklist
```typescript
interface QualityGates {
  unitTests: {
    coverage: 'minimum_85_percent';
    passingRate: '100_percent';
    taxCalculations: '100_percent_accuracy';
  };
  
  integrationTests: {
    apiEndpoints: 'all_passing';
    databaseOperations: 'all_passing';
    externalServices: 'all_passing';
  };
  
  e2eTests: {
    criticalJourneys: 'all_passing';
    crossBrowser: 'chrome_firefox_safari';
    mobileResponsive: 'tested_and_passing';
  };
  
  performance: {
    loadTime: 'under_3_seconds';
    apiResponse: 'under_1_second';
    lighthouse: 'score_above_90';
  };
  
  security: {
    vulnerabilities: 'zero_high_critical';
    authentication: 'all_tests_passing';
    dataProtection: 'lgpd_compliant';
  };
  
  compliance: {
    taxRegulations: 'brazilian_standards_validated';
    calculations: '100_percent_accuracy';
    deadlines: 'all_dates_verified';
  };
}
```

---

*This testing strategy ensures the highest quality and reliability for financial operations. All tests must pass before any deployment to production, with special emphasis on tax calculation accuracy and data security.*

**Testing Strategy Version**: 1.0  
**Last Updated**: January 2025  
**Next Review**: April 2025  
**Owner**: QA & Development Team