# 🧪 Sistema de Testes para Edge Functions - ContabilidadePRO

Este diretório contém um sistema abrangente de testes automatizados para todas as Edge Functions do ContabilidadePRO, seguindo as diretrizes de qualidade estabelecidas para software contábil brasileiro.

## 📋 Visão Geral

O sistema de testes é organizado em módulos especializados que cobrem todas as funcionalidades críticas:

- **Funções Fiscais**: Cálculos tributários, DAS, obrigações fiscais
- **Documentos e IA**: Processamento inteligente, OCR, classificação
- **Integração e Serviços**: APIs externas, backup, CRM, webhooks
- **Analytics**: Relatórios, métricas, dashboards
- **Automação**: Alertas inteligentes, notificações
- **Utilitários**: Serviços de apoio e infraestrutura

## 🚀 Início Rápido

### Método Recomendado (Mais Simples)

```bash
# Executar sequência recomendada (setup + testes operacionais + resumo)
node run-tests.js --recommended
```

### Método Interativo

```bash
# Menu interativo com todas as opções
node run-tests.js
```

### Métodos Específicos

```bash
# Configuração inicial
node run-tests.js setup

# Testar apenas funções operacionais (recomendado)
node run-tests.js operational

# Gerar resumo executivo
node run-tests.js summary

# Ver todas as opções
node run-tests.js --help
```

## 📁 Estrutura dos Arquivos

```
tests/edge-functions/
├── README.md                          # Este arquivo
├── test-config.json                   # Configurações dos testes
├── setup-tests.js                     # Script de configuração inicial
├── run-all-tests.js                   # Executor principal de todos os testes
├── test-runner.js                     # Framework base para testes
├── fiscal-functions-test.js           # Testes das funções fiscais
├── document-ai-test.js               # Testes de documentos e IA
├── integration-services-test.js      # Testes de integração
├── reports/                          # Relatórios gerados
│   ├── test-report-[timestamp].html  # Relatório visual
│   ├── test-report-[timestamp].json  # Dados estruturados
│   └── setup-report.json            # Status do setup
└── test-data/                        # Dados de teste
    └── mock-data.json                # Dados fictícios para testes
```

## 🔧 Configuração

### Arquivo test-config.json

O arquivo de configuração contém:

- **Credenciais Supabase**: URL e chave de API
- **Configurações de Teste**: Timeouts, tentativas, pausas
- **Dados de Teste**: Empresas, usuários, documentos fictícios
- **Mapeamento de Funções**: Organização por categoria
- **Critérios de Performance**: Limites de tempo de resposta

### Variáveis de Ambiente (Opcional)

```bash
# Sobrescrever configurações via ambiente
export SUPABASE_URL="sua-url-aqui"
export SUPABASE_ANON_KEY="sua-chave-aqui"
export TEST_TIMEOUT="30000"
```

## 🧪 Tipos de Teste

### 1. Testes de Smoke
Verificações básicas de conectividade e saúde do sistema.

### 2. Testes Funcionais
Validação completa das funcionalidades de cada edge function.

### 3. Testes de Integração
Verificação de integrações com APIs externas e serviços.

### 4. Testes de Performance
Medição de tempos de resposta e uso de recursos.

### 5. Testes de Segurança
Validação de autenticação, autorização e sanitização de dados.

## 📊 Relatórios

### Relatório HTML
- Interface visual amigável
- Estatísticas detalhadas
- Status de cada teste
- Detalhes de erros
- Gráficos de performance

### Relatório JSON
- Dados estruturados para análise
- Integração com ferramentas de CI/CD
- Histórico de execuções
- Métricas de performance

## 🎯 Funcionalidades Testadas

### Funções Fiscais
- ✅ Cálculo de DAS (Simples Nacional)
- ✅ Simulador tributário
- ✅ Geração de guias PDF
- ✅ Obrigações fiscais
- ✅ Monitor de compliance
- ✅ Automação fiscal
- ✅ Lançamentos contábeis

### Documentos e IA
- ✅ Processamento inteligente de documentos
- ✅ Classificação automática
- ✅ OCR de PDFs
- ✅ Assistente contábil IA
- ✅ Processamento de NFe
- ✅ Fila de processamento

### Integração e Serviços
- ✅ Consulta CNPJ otimizada
- ✅ Conciliação bancária
- ✅ Parser OFX multi-banco
- ✅ Serviços de CRM
- ✅ Sistema de backup
- ✅ Dispatcher de webhooks
- ✅ Monitor de performance

## 🔍 Critérios de Qualidade

### Cálculos Fiscais
- **Precisão**: 99.99% de accuracy
- **Performance**: < 5 segundos para cálculos
- **Compliance**: Aderência total à legislação brasileira

### Processamento de Documentos
- **Confiança OCR**: > 85%
- **Classificação**: > 90% de precisão
- **Performance**: < 15 segundos para documentos padrão

### Integrações
- **Disponibilidade**: > 99%
- **Tempo de resposta**: < 3 segundos
- **Rate limiting**: Respeitado conforme APIs

## 🚨 Tratamento de Erros

O sistema de testes implementa tratamento robusto de erros:

- **Retry automático** para falhas temporárias
- **Circuit breaker** para APIs indisponíveis
- **Logging estruturado** para debugging
- **Alertas** para falhas críticas

## 📈 Métricas e Monitoramento

### Métricas Coletadas
- Tempo de resposta por função
- Taxa de sucesso/falha
- Uso de memória
- Throughput de requisições
- Disponibilidade de serviços

### Alertas Configurados
- Falha em testes críticos
- Performance degradada
- Indisponibilidade de APIs
- Erros de compliance

## 🔄 Integração CI/CD

### GitHub Actions (Exemplo)
```yaml
name: Edge Functions Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd tests/edge-functions && node setup-tests.js
      - run: cd tests/edge-functions && node run-all-tests.js
      - uses: actions/upload-artifact@v2
        with:
          name: test-reports
          path: tests/edge-functions/reports/
```

## 🛠️ Desenvolvimento e Manutenção

### Adicionando Novos Testes

1. **Criar classe de teste** estendendo `EdgeFunctionTest`
2. **Implementar método `run()`** com validações específicas
3. **Adicionar ao suite apropriado** (fiscal, document-ai, etc.)
4. **Atualizar configuração** em `test-config.json`

### Exemplo de Novo Teste
```javascript
class NovaFuncaoTest extends EdgeFunctionTest {
  constructor() {
    super('nova-funcao', 'Descrição do teste');
  }

  async run() {
    const testData = { /* dados de teste */ };
    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Teste falhou: ${data.error}`);
    }

    // Validações específicas
    if (!data.resultado) {
      throw new Error('Resultado esperado não encontrado');
    }

    return {
      status: 'PASSED',
      message: 'Nova função funcionando corretamente',
      data: data
    };
  }
}
```

## 📞 Suporte e Contribuição

### Reportar Problemas
- Abra uma issue no repositório
- Inclua logs completos
- Descreva o comportamento esperado vs atual

### Contribuir
1. Fork do repositório
2. Criar branch para feature/fix
3. Implementar testes para novas funcionalidades
4. Submeter pull request

## 📚 Recursos Adicionais

- [Documentação das Edge Functions](../../docs/)
- [Guia de Desenvolvimento](../../docs/development-guide.md)
- [Regulamentações Fiscais](../../docs/brazilian-tax-regulations.md)
- [Arquitetura do Sistema](../../docs/architecture.md)

---

**Desenvolvido para ContabilidadePRO** - Sistema de contabilidade brasileira com IA integrada.

*Última atualização: Janeiro 2025*
