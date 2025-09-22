# 🧪 Testes End-to-End - ContabilidadePRO

## 📋 Visão Geral

Este diretório contém a suíte completa de testes end-to-end (E2E) para o sistema ContabilidadePRO, focando na validação da integração entre:

- **Database Layer**: Migrations, RLS policies, e funções PostgreSQL
- **Edge Functions**: Processamento serverless com IA
- **Cache System**: Sistema de cache inteligente multicamadas
- **React Components**: Interface de usuário com hooks integrados
- **Complete User Flows**: Fluxos completos de usuário

## 🏗️ Arquitetura dos Testes

```
src/tests/
├── integration/
│   ├── end-to-end.test.ts          # Testes principais E2E
│   ├── component-tests.tsx         # Testes de componentes React
│   └── test-runner.ts              # Runner personalizado
├── mocks/
│   ├── supabase-mock.ts           # Mock do Supabase
│   └── cache-mock.ts              # Mock do sistema de cache
├── setup/
│   ├── jest.setup.ts              # Configuração do Jest
│   └── env.setup.ts               # Variáveis de ambiente
└── README.md                      # Este arquivo
```

## 🚀 Como Executar

### Comandos Disponíveis

```bash
# Executar testes E2E básicos
npm run test:e2e

# Executar com watch mode
npm run test:e2e:watch

# Executar com coverage
npm run test:e2e:coverage

# Executar suite completa com relatórios
npm run test:e2e:full

# Executar e abrir relatório HTML
npm run test:e2e:report
```

### Pré-requisitos

1. **Variáveis de Ambiente**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_key
   ```

2. **Banco de Dados**:
   - Migrations aplicadas
   - Dados de teste configurados
   - RLS policies ativas

3. **Edge Functions**:
   - Functions deployadas no Supabase
   - Configurações de CORS corretas

## 📊 Suítes de Teste

### 1. 📊 Database Tests
Valida a camada de banco de dados:
- ✅ Tabelas criadas corretamente
- ✅ Funções helper funcionando
- ✅ RLS policies aplicadas
- ✅ Triggers e índices ativos

### 2. ⚡ Edge Function Tests
Testa as funções serverless:
- ✅ `empresa-context-service` com todos os parâmetros
- ✅ `documentos-analytics-service` com operações múltiplas
- ✅ Geração de insights de IA
- ✅ Análise de compliance
- ✅ Performance e timeouts

### 3. 💾 Cache Tests
Valida o sistema de cache:
- ✅ Operações básicas (set/get/delete)
- ✅ Invalidação por tags
- ✅ Estratégias diferenciadas por tipo
- ✅ Cleanup automático
- ✅ Estatísticas e métricas
- ✅ Persistência e compressão

### 4. 🔗 Integration Tests
Testa integrações completas:
- ✅ Hooks + Edge Functions + Cache
- ✅ Invalidação automática
- ✅ Sincronização entre componentes
- ✅ Performance com cache

### 5. 🎨 Component Tests
Valida componentes React:
- ✅ `AIInsightsPanel` com dados reais
- ✅ `MetricasFinanceirasPanel` com formatação
- ✅ `ComplianceAnalysisPanel` com scores
- ✅ `CacheMonitor` com estatísticas
- ✅ `DashboardOptimized` completo

### 6. 🎯 User Flow Tests
Simula fluxos completos:
- ✅ Login → Dashboard → Insights
- ✅ Invalidação após atualizações
- ✅ Navegação entre páginas
- ✅ Responsividade e acessibilidade

### 7. 💪 Stress Tests
Testa sob carga:
- ✅ Múltiplas chamadas simultâneas
- ✅ Cache sob alta carga
- ✅ Gerenciamento de memória
- ✅ Recuperação de falhas

## 📈 Métricas de Performance

### Benchmarks Esperados

| Componente | Métrica | Target | Crítico |
|------------|---------|--------|---------|
| **Edge Functions** | Tempo médio | < 3s | < 5s |
| **Cache Hit Rate** | Taxa de acerto | > 80% | > 70% |
| **Database Queries** | Tempo médio | < 500ms | < 1s |
| **Component Render** | First Paint | < 100ms | < 200ms |
| **Full Page Load** | Complete | < 2s | < 3s |

### Critérios de Sucesso

- ✅ **Taxa de Sucesso**: > 90%
- ✅ **Performance**: Dentro dos benchmarks
- ✅ **Cache Efficiency**: Hit rate > 80%
- ✅ **Error Handling**: Graceful degradation
- ✅ **Accessibility**: WCAG 2.1 AA compliance

## 📋 Relatórios

### Formatos Disponíveis

1. **HTML Report**: `test-reports/e2e-report.html`
   - Interface visual completa
   - Gráficos de performance
   - Detalhes de cada teste

2. **Markdown Report**: `test-reports/e2e-report.md`
   - Formato texto estruturado
   - Ideal para documentação
   - Fácil integração com CI/CD

3. **JSON Report**: `test-reports/e2e-report.json`
   - Dados estruturados
   - Integração com ferramentas
   - Análise programática

4. **Jest HTML**: `test-reports/jest/e2e-jest-report.html`
   - Relatório detalhado do Jest
   - Coverage maps
   - Test execution details

### Exemplo de Relatório

```
📊 RESUMO FINAL DOS TESTES E2E
============================================================
✅ Testes passaram: 45/47
❌ Testes falharam: 2
⏱️  Duração total: 125.3s
📈 Taxa de sucesso: 95.7%
⚡ Edge Functions: 1,250ms médio
💾 Cache Hit Rate: 87.3%

💡 RECOMENDAÇÕES:
  • Todos os sistemas funcionando perfeitamente! 🎉
  • Cache performance excelente
  • Edge Functions dentro do esperado

🎯 STATUS GERAL:
🎉 EXCELENTE! Todos os sistemas funcionando perfeitamente!
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente para Testes

```bash
# Configurações de teste
NODE_ENV=test
TEST_TIMEOUT=30000
TEST_RETRY_COUNT=2
TEST_PARALLEL_WORKERS=2

# Cache para testes
CACHE_MAX_SIZE=100
CACHE_DEFAULT_TTL=300000
CACHE_CLEANUP_INTERVAL=60000

# Features flags
ENABLE_CACHE=true
ENABLE_AI_INSIGHTS=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_DEBUG_MODE=false
```

### Customização do Jest

O arquivo `jest.config.e2e.js` permite customizar:
- Timeout dos testes
- Coverage thresholds
- Reporters personalizados
- Mock configurations
- Parallel execution

### Mocks Personalizados

Os mocks em `src/tests/mocks/` simulam:
- **Supabase Client**: Todas as operações de banco
- **Cache Manager**: Sistema de cache completo
- **Edge Functions**: Respostas realistas
- **React Components**: Componentes pesados

## 🐛 Troubleshooting

### Problemas Comuns

1. **Timeout nos testes**:
   ```bash
   # Aumentar timeout no jest.config.e2e.js
   testTimeout: 60000
   ```

2. **Falhas de conexão**:
   ```bash
   # Verificar variáveis de ambiente
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Cache não funcionando**:
   ```bash
   # Limpar cache antes dos testes
   npm run test:e2e -- --clearCache
   ```

4. **Edge Functions falhando**:
   ```bash
   # Verificar deploy das functions
   supabase functions list
   ```

### Debug Mode

Para debug detalhado:

```bash
# Executar com logs verbosos
DEBUG=true npm run test:e2e

# Executar teste específico
npm run test:e2e -- --testNamePattern="Cache Tests"

# Executar com coverage detalhado
npm run test:e2e:coverage -- --verbose
```

## 🚀 CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:e2e:full
      - uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: test-reports/
```

### Quality Gates

- ✅ Taxa de sucesso > 90%
- ✅ Performance dentro dos benchmarks
- ✅ Coverage > 70%
- ✅ Zero falhas críticas

## 📚 Recursos Adicionais

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Supabase Testing Guide](https://supabase.com/docs/guides/getting-started/local-development)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

**Desenvolvido para ContabilidadePRO** - Sistema de Cache Inteligente com Edge Functions e IA
