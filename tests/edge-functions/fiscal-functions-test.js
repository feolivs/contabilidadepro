#!/usr/bin/env node

/**
 * Testes Específicos para Edge Functions Fiscais
 * 
 * Este módulo contém testes detalhados para as funções relacionadas
 * a cálculos fiscais e compliance tributário brasileiro.
 */

const { EdgeFunctionTest, TestLogger } = require('./test-runner');

/**
 * Teste abrangente para Simulador Tributário
 */
class SimuladorTributarioTest extends EdgeFunctionTest {
  constructor() {
    super('simulador-tributario', 'Teste do simulador tributário');
  }

  async run() {
    const testCases = [
      {
        name: 'MEI - Receita baixa',
        data: {
          receitaAnual: 50000,
          atividade: 'comercio',
          funcionarios: 0,
          regimeAtual: null
        },
        expectedRegime: 'MEI'
      },
      {
        name: 'Simples Nacional - Receita média',
        data: {
          receitaAnual: 2000000,
          atividade: 'servicos',
          funcionarios: 5,
          regimeAtual: null
        },
        expectedRegime: 'Simples Nacional'
      },
      {
        name: 'Lucro Presumido - Receita alta',
        data: {
          receitaAnual: 50000000,
          atividade: 'industria',
          funcionarios: 50,
          regimeAtual: null
        },
        expectedRegime: 'Lucro Presumido'
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        const response = await this.makeRequest('POST', testCase.data);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`Simulação falhou para ${testCase.name}: ${data.error}`);
        }

        // Validar estrutura da resposta
        if (!data.regimeRecomendado || !data.economia || !data.detalhes) {
          throw new Error(`Resposta inválida para ${testCase.name}`);
        }

        results.push({
          testCase: testCase.name,
          regimeRecomendado: data.regimeRecomendado,
          economia: data.economia,
          status: 'PASSED'
        });

        TestLogger.success(`  ✓ ${testCase.name}: ${data.regimeRecomendado}`);

      } catch (error) {
        results.push({
          testCase: testCase.name,
          status: 'FAILED',
          error: error.message
        });
        TestLogger.error(`  ✗ ${testCase.name}: ${error.message}`);
      }
    }

    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const totalTests = results.length;

    if (passedTests !== totalTests) {
      throw new Error(`${totalTests - passedTests} de ${totalTests} casos de teste falharam`);
    }

    return {
      status: 'PASSED',
      message: `Todos os ${totalTests} casos de teste passaram`,
      data: results
    };
  }
}

/**
 * Teste para Geração de Guias PDF
 */
class GerarGuiaPDFTest extends EdgeFunctionTest {
  constructor() {
    super('gerar-guia-pdf', 'Teste de geração de guias PDF');
  }

  async run() {
    const testData = {
      tipo: 'DAS',
      empresaId: 'test-empresa-123',
      competencia: '2024-01',
      valor: 1500.50,
      dataVencimento: '2024-02-20',
      codigoBarras: '03399999999999999999999999999999999999999999'
    };

    const response = await this.makeRequest('POST', testData);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Geração de PDF falhou: ${errorData.error || response.status}`);
    }

    // Verificar se retornou um PDF
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      throw new Error('Resposta não é um PDF válido');
    }

    const pdfBuffer = await response.arrayBuffer();
    if (pdfBuffer.byteLength < 1000) {
      throw new Error('PDF gerado é muito pequeno, provavelmente inválido');
    }

    return {
      status: 'PASSED',
      message: 'PDF gerado com sucesso',
      data: {
        contentType,
        size: pdfBuffer.byteLength,
        sizeKB: Math.round(pdfBuffer.byteLength / 1024)
      }
    };
  }
}

/**
 * Teste para Obrigações Fiscais
 */
class FiscalObligationsTest extends EdgeFunctionTest {
  constructor() {
    super('get-fiscal-obligations', 'Teste de obrigações fiscais');
  }

  async run() {
    const testData = {
      empresaId: 'test-empresa-123',
      regimeTributario: 'Simples Nacional',
      atividade: 'comercio',
      periodo: '2024-01'
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Consulta de obrigações falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!Array.isArray(data.obrigacoes)) {
      throw new Error('Resposta deve conter array de obrigações');
    }

    // Verificar se cada obrigação tem os campos necessários
    for (const obrigacao of data.obrigacoes) {
      if (!obrigacao.nome || !obrigacao.prazo || !obrigacao.status) {
        throw new Error('Obrigação com campos obrigatórios faltando');
      }
    }

    return {
      status: 'PASSED',
      message: `${data.obrigacoes.length} obrigações fiscais encontradas`,
      data: data
    };
  }
}

/**
 * Teste para Compliance Monitor
 */
class ComplianceMonitorTest extends EdgeFunctionTest {
  constructor() {
    super('compliance-monitor', 'Teste do monitor de compliance');
  }

  async run() {
    const testData = {
      empresaId: 'test-empresa-123',
      periodo: '2024-01',
      verificacoes: ['das', 'defis', 'sped']
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Monitor de compliance falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.status || !data.verificacoes) {
      throw new Error('Resposta do compliance monitor inválida');
    }

    return {
      status: 'PASSED',
      message: 'Monitor de compliance funcionando',
      data: data
    };
  }
}

/**
 * Teste para Automação Fiscal
 */
class FiscalAutomationTest extends EdgeFunctionTest {
  constructor() {
    super('fiscal-automation-engine', 'Teste do motor de automação fiscal');
  }

  async run() {
    const testData = {
      empresaId: 'test-empresa-123',
      tipoAutomacao: 'calculo_impostos',
      parametros: {
        periodo: '2024-01',
        regime: 'Simples Nacional'
      }
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Automação fiscal falhou: ${data.error || response.status}`);
    }

    return {
      status: 'PASSED',
      message: 'Motor de automação fiscal funcionando',
      data: data
    };
  }
}

/**
 * Teste para Geração de Lançamentos Contábeis
 */
class AccountingEntriesTest extends EdgeFunctionTest {
  constructor() {
    super('generate-accounting-entries', 'Teste de geração de lançamentos contábeis');
  }

  async run() {
    const testData = {
      empresaId: 'test-empresa-123',
      transacoes: [
        {
          tipo: 'receita',
          valor: 5000.00,
          descricao: 'Venda de produtos',
          data: '2024-01-15',
          categoria: 'vendas'
        },
        {
          tipo: 'despesa',
          valor: 1200.00,
          descricao: 'Aluguel do escritório',
          data: '2024-01-05',
          categoria: 'aluguel'
        }
      ]
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Geração de lançamentos falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!Array.isArray(data.lancamentos)) {
      throw new Error('Resposta deve conter array de lançamentos');
    }

    // Verificar se cada lançamento tem débito e crédito
    for (const lancamento of data.lancamentos) {
      if (!lancamento.debito || !lancamento.credito || !lancamento.valor) {
        throw new Error('Lançamento contábil inválido');
      }
    }

    return {
      status: 'PASSED',
      message: `${data.lancamentos.length} lançamentos contábeis gerados`,
      data: data
    };
  }
}

/**
 * Suite de testes fiscais
 */
const fiscalTestSuite = [
  new SimuladorTributarioTest(),
  new GerarGuiaPDFTest(),
  new FiscalObligationsTest(),
  new ComplianceMonitorTest(),
  new FiscalAutomationTest(),
  new AccountingEntriesTest()
];

/**
 * Executa todos os testes fiscais
 */
async function runFiscalTests() {
  TestLogger.header('TESTES DAS FUNÇÕES FISCAIS');
  
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const test of fiscalTestSuite) {
    try {
      TestLogger.info(`Executando: ${test.description}`);
      const result = await test.run();
      passed++;
      results.push({
        functionName: test.functionName,
        status: 'PASSED',
        message: result.message,
        data: result.data
      });
      TestLogger.success(`✅ ${test.description} - PASSOU`);
    } catch (error) {
      failed++;
      results.push({
        functionName: test.functionName,
        status: 'FAILED',
        message: error.message,
        error: error.stack
      });
      TestLogger.error(`❌ ${test.description} - FALHOU`, error.message);
    }

    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  TestLogger.header('RESULTADO DOS TESTES FISCAIS');
  console.log(`Total: ${passed + failed}`);
  console.log(`Passou: ${passed}`);
  console.log(`Falhou: ${failed}`);
  console.log(`Taxa de sucesso: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  return results;
}

// Executar se chamado diretamente
if (require.main === module) {
  runFiscalTests().catch(error => {
    TestLogger.error('Erro fatal nos testes fiscais', error);
    process.exit(1);
  });
}

module.exports = {
  fiscalTestSuite,
  runFiscalTests,
  SimuladorTributarioTest,
  GerarGuiaPDFTest,
  FiscalObligationsTest,
  ComplianceMonitorTest,
  FiscalAutomationTest,
  AccountingEntriesTest
};
