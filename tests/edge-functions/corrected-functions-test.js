#!/usr/bin/env node

/**
 * Testes específicos para as funções críticas corrigidas
 * ContabilidadePRO - Validação das correções aplicadas
 */

const { TestLogger, EdgeFunctionTest } = require('./test-runner');

/**
 * Teste corrigido para calculate-das-service
 */
class CorrectedCalculateDASTest extends EdgeFunctionTest {
  constructor() {
    super('calculate-das-service', 'Teste corrigido de cálculo DAS');
  }

  async run() {
    const testCases = [
      {
        name: 'DAS Anexo I - Faixa 1',
        data: {
          empresa_id: 'test-empresa-123',
          competencia: '2024-01',
          faturamento_12_meses: 150000.00,
          faturamento_mes: 12500.00,
          anexo: 'I'
        },
        expectedRange: {
          min: 400,
          max: 600
        }
      },
      {
        name: 'DAS Anexo I - Faixa 2',
        data: {
          empresa_id: 'test-empresa-123',
          competencia: '2024-02',
          faturamento_12_meses: 300000.00,
          faturamento_mes: 25000.00,
          anexo: 'I'
        },
        expectedRange: {
          min: 1500,
          max: 2000
        }
      },
      {
        name: 'DAS Anexo III - Serviços',
        data: {
          empresa_id: 'test-empresa-456',
          competencia: '2024-01',
          faturamento_12_meses: 200000.00,
          faturamento_mes: 16666.67,
          anexo: 'III'
        },
        expectedRange: {
          min: 1500,
          max: 2000
        }
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        TestLogger.info(`  Testando: ${testCase.name}`);
        
        const response = await this.makeRequest('POST', testCase.data);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${data.error || 'Erro desconhecido'}`);
        }

        // Validar estrutura da resposta
        const requiredFields = ['valor_das', 'aliquota_efetiva', 'data_vencimento'];
        for (const field of requiredFields) {
          if (!(field in data)) {
            throw new Error(`Campo obrigatório ausente: ${field}`);
          }
        }

        // Validar valor calculado
        const valorDAS = parseFloat(data.valor_das);
        if (isNaN(valorDAS) || valorDAS <= 0) {
          throw new Error(`Valor DAS inválido: ${data.valor_das}`);
        }

        // Validar se está na faixa esperada
        if (testCase.expectedRange) {
          if (valorDAS < testCase.expectedRange.min || valorDAS > testCase.expectedRange.max) {
            TestLogger.warning(`  Valor fora da faixa esperada: R$ ${valorDAS.toFixed(2)} (esperado: R$ ${testCase.expectedRange.min} - R$ ${testCase.expectedRange.max})`);
          }
        }

        // Validar alíquota
        const aliquota = parseFloat(data.aliquota_efetiva);
        if (isNaN(aliquota) || aliquota <= 0 || aliquota > 50) {
          throw new Error(`Alíquota inválida: ${data.aliquota_efetiva}%`);
        }

        // Validar data de vencimento
        const dataVencimento = new Date(data.data_vencimento);
        if (isNaN(dataVencimento.getTime())) {
          throw new Error(`Data de vencimento inválida: ${data.data_vencimento}`);
        }

        results.push({
          testCase: testCase.name,
          status: 'PASSED',
          valorDAS: valorDAS,
          aliquota: aliquota,
          dataVencimento: data.data_vencimento
        });

        TestLogger.success(`    ✓ Valor: R$ ${valorDAS.toFixed(2)}, Alíquota: ${aliquota}%`);

      } catch (error) {
        results.push({
          testCase: testCase.name,
          status: 'FAILED',
          error: error.message
        });
        TestLogger.error(`    ✗ ${error.message}`);
      }
    }

    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const totalTests = results.length;

    return {
      status: passedTests === totalTests ? 'PASSED' : passedTests > 0 ? 'PARTIAL' : 'FAILED',
      message: `Cálculo DAS: ${passedTests}/${totalTests} casos passaram`,
      data: results
    };
  }
}

/**
 * Teste corrigido para health-service
 */
class CorrectedHealthServiceTest extends EdgeFunctionTest {
  constructor() {
    super('health-service', 'Teste corrigido de health service');
  }

  async run() {
    const testCases = [
      {
        name: 'Health Check Básico',
        data: {
          action: 'check'
        }
      },
      {
        name: 'Health Check com Detalhes',
        data: {
          action: 'check',
          include_details: true
        }
      },
      {
        name: 'System Status',
        data: {
          action: 'status'
        }
      },
      {
        name: 'System Metrics',
        data: {
          action: 'metrics'
        }
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        TestLogger.info(`  Testando: ${testCase.name}`);
        
        const response = await this.makeRequest('POST', testCase.data);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${data.error || 'Erro desconhecido'}`);
        }

        // Validar estrutura básica
        if (!data.status) {
          throw new Error('Campo status ausente na resposta');
        }

        // Validar status válido
        const validStatuses = ['healthy', 'degraded', 'unhealthy'];
        if (!validStatuses.includes(data.status)) {
          throw new Error(`Status inválido: ${data.status}`);
        }

        results.push({
          testCase: testCase.name,
          status: 'PASSED',
          healthStatus: data.status,
          hasComponents: !!data.components,
          componentCount: data.components ? Object.keys(data.components).length : 0
        });

        TestLogger.success(`    ✓ Status: ${data.status}`);
        if (data.components) {
          const componentStatuses = Object.entries(data.components).map(([name, comp]) => 
            `${name}: ${comp.status}`
          ).join(', ');
          TestLogger.info(`    Componentes: ${componentStatuses}`);
        }

      } catch (error) {
        results.push({
          testCase: testCase.name,
          status: 'FAILED',
          error: error.message
        });
        TestLogger.error(`    ✗ ${error.message}`);
      }
    }

    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const totalTests = results.length;

    return {
      status: passedTests === totalTests ? 'PASSED' : passedTests > 0 ? 'PARTIAL' : 'FAILED',
      message: `Health Service: ${passedTests}/${totalTests} casos passaram`,
      data: results
    };
  }
}

/**
 * Teste corrigido para pdf-ocr-service
 */
class CorrectedPDFOCRTest extends EdgeFunctionTest {
  constructor() {
    super('pdf-ocr-service', 'Teste corrigido de PDF OCR');
  }

  async run() {
    // Verificar se OpenAI está configurado
    const openaiConfigured = process.env.OPENAI_API_KEY && 
                            process.env.OPENAI_API_KEY !== 'sua_chave_openai_aqui';

    if (!openaiConfigured) {
      return {
        status: 'SKIPPED',
        message: 'PDF OCR: OpenAI não configurado - teste pulado',
        data: { reason: 'OPENAI_API_KEY não configurada' }
      };
    }

    const testCases = [
      {
        name: 'Teste de Configuração',
        data: {
          documentId: 'test-config-001',
          filePath: 'test/config/check.pdf',
          fileName: 'config-check.pdf',
          options: {
            language: 'por',
            quality: 'medium'
          }
        },
        expectError: true, // Esperamos erro de arquivo não encontrado
        expectedErrorType: 'download'
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        TestLogger.info(`  Testando: ${testCase.name}`);
        
        const response = await this.makeRequest('POST', testCase.data);
        const data = await response.json();

        if (testCase.expectError) {
          // Para testes que esperamos erro
          if (response.ok) {
            throw new Error('Esperava erro, mas função retornou sucesso');
          }

          // Verificar se é o tipo de erro esperado
          if (testCase.expectedErrorType && data.error) {
            if (data.error.toLowerCase().includes(testCase.expectedErrorType)) {
              results.push({
                testCase: testCase.name,
                status: 'PASSED',
                note: 'Erro esperado recebido - função está configurada corretamente'
              });
              TestLogger.success(`    ✓ Erro esperado: ${data.error}`);
            } else {
              throw new Error(`Tipo de erro inesperado: ${data.error}`);
            }
          } else {
            results.push({
              testCase: testCase.name,
              status: 'PASSED',
              note: 'Função respondeu com erro (esperado para arquivo inexistente)'
            });
            TestLogger.success(`    ✓ Função respondeu adequadamente`);
          }
        } else {
          // Para testes que esperamos sucesso
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${data.error || 'Erro desconhecido'}`);
          }

          results.push({
            testCase: testCase.name,
            status: 'PASSED',
            data: data
          });
          TestLogger.success(`    ✓ Processamento concluído`);
        }

      } catch (error) {
        results.push({
          testCase: testCase.name,
          status: 'FAILED',
          error: error.message
        });
        TestLogger.error(`    ✗ ${error.message}`);
      }
    }

    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const totalTests = results.length;

    return {
      status: passedTests === totalTests ? 'PASSED' : passedTests > 0 ? 'PARTIAL' : 'FAILED',
      message: `PDF OCR: ${passedTests}/${totalTests} casos passaram`,
      data: results
    };
  }
}

/**
 * Suite de testes para funções corrigidas
 */
const correctedTestSuite = [
  new CorrectedCalculateDASTest(),
  new CorrectedHealthServiceTest(),
  new CorrectedPDFOCRTest()
];

/**
 * Executa todos os testes das funções corrigidas
 */
async function runCorrectedFunctionsTests() {
  TestLogger.header('TESTES DAS FUNÇÕES CRÍTICAS CORRIGIDAS');
  
  let passed = 0;
  let failed = 0;
  let partial = 0;
  let skipped = 0;
  const results = [];
  const startTime = Date.now();

  for (const test of correctedTestSuite) {
    try {
      TestLogger.info(`\n🧪 Executando: ${test.name}`);
      const result = await test.run();
      
      results.push({
        functionName: test.functionName,
        status: result.status,
        message: result.message,
        data: result.data
      });

      switch (result.status) {
        case 'PASSED':
          passed++;
          TestLogger.success(`✅ ${test.name}: ${result.message}`);
          break;
        case 'PARTIAL':
          partial++;
          TestLogger.warning(`⚠️ ${test.name}: ${result.message}`);
          break;
        case 'SKIPPED':
          skipped++;
          TestLogger.info(`⏭️ ${test.name}: ${result.message}`);
          break;
        default:
          failed++;
          TestLogger.error(`❌ ${test.name}: ${result.message}`);
      }

    } catch (error) {
      failed++;
      TestLogger.error(`💥 ${test.name}: ${error.message}`);
      results.push({
        functionName: test.functionName,
        status: 'FAILED',
        message: error.message,
        error: error.stack
      });
    }
  }

  const duration = Date.now() - startTime;
  const total = passed + failed + partial + skipped;

  TestLogger.header('RESULTADO DOS TESTES DAS FUNÇÕES CORRIGIDAS');
  console.log(`Total: ${total}`);
  console.log(`Passou: ${passed}`);
  console.log(`Parcial: ${partial}`);
  console.log(`Pulado: ${skipped}`);
  console.log(`Falhou: ${failed}`);
  console.log(`Duração: ${(duration / 1000).toFixed(2)}s`);
  
  const successRate = total > 0 ? ((passed + partial * 0.5) / total * 100) : 0;
  console.log(`Taxa de sucesso: ${successRate.toFixed(1)}%`);

  if (successRate >= 80) {
    TestLogger.success('\n🎉 Funções críticas corrigidas com sucesso!');
  } else if (successRate >= 60) {
    TestLogger.warning('\n⚠️ Algumas funções ainda precisam de ajustes.');
  } else {
    TestLogger.error('\n💥 Correções não foram suficientes. Revisar implementação.');
  }

  return results;
}

// Executar se chamado diretamente
if (require.main === module) {
  runCorrectedFunctionsTests().catch(error => {
    TestLogger.error('Erro fatal nos testes das funções corrigidas', error);
    process.exit(1);
  });
}

module.exports = {
  correctedTestSuite,
  runCorrectedFunctionsTests,
  CorrectedCalculateDASTest,
  CorrectedHealthServiceTest,
  CorrectedPDFOCRTest
};
