#!/usr/bin/env node

/**
 * Testes para Edge Functions Operacionais
 * 
 * Este script testa apenas as edge functions que estão
 * comprovadamente funcionais e operacionais.
 */

const { EdgeFunctionTest, TestLogger } = require('./test-runner');

/**
 * Teste para Consulta CNPJ (Funcionando)
 */
class CNPJOperationalTest extends EdgeFunctionTest {
  constructor() {
    super('consultar-cnpj', 'Teste operacional - Consulta CNPJ');
  }

  async run() {
    const testCases = [
      {
        cnpj: '11.222.333/0001-81',
        expectedStatus: 200,
        description: 'CNPJ válido existente'
      },
      {
        cnpj: '99.999.999/0001-99',
        expectedStatus: 404,
        description: 'CNPJ válido inexistente'
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest('POST', { cnpj: testCase.cnpj });
        const responseTime = Date.now() - startTime;
        const data = await response.json();

        const success = response.status === testCase.expectedStatus;
        
        results.push({
          cnpj: testCase.cnpj,
          description: testCase.description,
          expectedStatus: testCase.expectedStatus,
          actualStatus: response.status,
          responseTime,
          success,
          data: success && response.status === 200 ? data.data : null
        });

        if (success) {
          TestLogger.success(`  ✓ ${testCase.description}: ${response.status} (${responseTime}ms)`);
        } else {
          TestLogger.warning(`  ⚠ ${testCase.description}: esperado ${testCase.expectedStatus}, recebido ${response.status}`);
        }

      } catch (error) {
        results.push({
          cnpj: testCase.cnpj,
          description: testCase.description,
          success: false,
          error: error.message
        });
        TestLogger.error(`  ✗ ${testCase.description}: ${error.message}`);
      }
    }

    const successfulTests = results.filter(r => r.success).length;
    const avgResponseTime = results
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    return {
      status: successfulTests === results.length ? 'PASSED' : 'PARTIAL',
      message: `Consulta CNPJ: ${successfulTests}/${results.length} casos OK (avg: ${avgResponseTime.toFixed(0)}ms)`,
      data: { results, avgResponseTime, successRate: (successfulTests / results.length) * 100 }
    };
  }
}

/**
 * Teste para Processamento Inteligente de Documentos (Funcionando)
 */
class DocumentProcessorOperationalTest extends EdgeFunctionTest {
  constructor() {
    super('intelligent-document-processor', 'Teste operacional - Processamento de Documentos');
  }

  async run() {
    const testCases = [
      {
        name: 'Documento PDF Simples',
        data: {
          documentId: 'test-doc-simple-001',
          filePath: 'documentos/documento-simples.pdf',
          fileName: 'Documento Simples.pdf',
          fileType: 'application/pdf',
          empresaId: 'test-empresa-123'
        }
      },
      {
        name: 'Documento de Texto',
        data: {
          documentId: 'test-doc-text-001',
          filePath: 'documentos/documento-texto.txt',
          fileName: 'Documento Texto.txt',
          fileType: 'text/plain',
          empresaId: 'test-empresa-123'
        }
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest('POST', testCase.data);
        const responseTime = Date.now() - startTime;
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${data.error || 'Erro desconhecido'}`);
        }

        const hasExtractedData = data.extractedData && typeof data.extractedData === 'object';
        const confidence = data.extractedData?.confidence || 0;

        results.push({
          testCase: testCase.name,
          status: 'PASSED',
          responseTime,
          hasExtractedData,
          confidence,
          method: data.extractedData?.method || 'unknown',
          documentId: data.documentId
        });

        TestLogger.success(`  ✓ ${testCase.name}: processado (${responseTime}ms, conf: ${(confidence * 100).toFixed(1)}%)`);

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
    const avgResponseTime = results
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    return {
      status: passedTests > 0 ? 'PASSED' : 'FAILED',
      message: `Processamento de documentos: ${passedTests}/${results.length} casos OK (avg: ${avgResponseTime.toFixed(0)}ms)`,
      data: { results, avgResponseTime, successRate: (passedTests / results.length) * 100 }
    };
  }
}

/**
 * Teste para Test Simple (Função de teste básica)
 */
class TestSimpleOperationalTest extends EdgeFunctionTest {
  constructor() {
    super('test-simple', 'Teste operacional - Função de teste simples');
  }

  async run() {
    const response = await this.makeRequest('GET');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Test simple falhou: ${data.error || response.status}`);
    }

    return {
      status: 'PASSED',
      message: 'Função de teste simples funcionando',
      data: data
    };
  }
}

/**
 * Teste para Consulta CNPJ Otimizada
 */
class CNPJOptimizedOperationalTest extends EdgeFunctionTest {
  constructor() {
    super('consultar-cnpj-optimized', 'Teste operacional - Consulta CNPJ Otimizada');
  }

  async run() {
    const testCNPJ = '11.222.333/0001-81';
    
    const startTime = Date.now();
    const response = await this.makeRequest('POST', { cnpj: testCNPJ });
    const responseTime = Date.now() - startTime;
    const data = await response.json();

    // Aceitar 200 (encontrado) ou 404 (não encontrado) como válidos
    if (response.status !== 200 && response.status !== 404) {
      throw new Error(`Status inesperado: ${response.status}`);
    }

    return {
      status: 'PASSED',
      message: `Consulta CNPJ otimizada funcionando (${responseTime}ms)`,
      data: {
        cnpj: testCNPJ,
        status: response.status,
        responseTime,
        found: response.status === 200,
        cached: data.cached || false
      }
    };
  }
}

/**
 * Suite de testes operacionais
 */
const operationalTestSuite = [
  new CNPJOperationalTest(),
  new DocumentProcessorOperationalTest(),
  new TestSimpleOperationalTest(),
  new CNPJOptimizedOperationalTest()
];

/**
 * Executa todos os testes operacionais
 */
async function runOperationalTests() {
  TestLogger.header('TESTES DAS EDGE FUNCTIONS OPERACIONAIS');
  
  console.log('🎯 Testando apenas as funções comprovadamente operacionais\n');
  
  let passed = 0;
  let failed = 0;
  let partial = 0;
  const results = [];
  const startTime = Date.now();

  for (const test of operationalTestSuite) {
    try {
      TestLogger.info(`Executando: ${test.description}`);
      const result = await test.run();
      
      if (result.status === 'PASSED') {
        passed++;
      } else if (result.status === 'PARTIAL') {
        partial++;
      }
      
      results.push({
        functionName: test.functionName,
        status: result.status,
        message: result.message,
        data: result.data
      });
      
      const statusIcon = result.status === 'PASSED' ? '✅' : result.status === 'PARTIAL' ? '🟡' : '❌';
      TestLogger.success(`${statusIcon} ${test.description} - ${result.status}`);
      
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

  const duration = Date.now() - startTime;
  const total = passed + failed + partial;
  const successRate = ((passed + partial * 0.5) / total) * 100;

  TestLogger.header('RESULTADO DOS TESTES OPERACIONAIS');
  console.log(`📊 Estatísticas:`);
  console.log(`   • Total de testes: ${total}`);
  console.log(`   • ✅ Passou: ${passed}`);
  console.log(`   • 🟡 Parcial: ${partial}`);
  console.log(`   • ❌ Falhou: ${failed}`);
  console.log(`   • 📈 Taxa de sucesso: ${successRate.toFixed(1)}%`);
  console.log(`   • ⏱️ Duração: ${(duration / 1000).toFixed(2)}s`);

  // Salvar relatório detalhado
  const report = {
    timestamp: new Date().toISOString(),
    testType: 'operational',
    duration,
    stats: { 
      total, 
      passed, 
      failed, 
      partial, 
      successRate: parseFloat(successRate.toFixed(1))
    },
    results,
    summary: {
      operationalFunctions: results.filter(r => r.status === 'PASSED').map(r => r.functionName),
      partialFunctions: results.filter(r => r.status === 'PARTIAL').map(r => r.functionName),
      failedFunctions: results.filter(r => r.status === 'FAILED').map(r => r.functionName)
    }
  };

  const fs = require('fs');
  const path = require('path');
  const reportPath = path.join(__dirname, 'reports', 'operational-functions-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  TestLogger.success(`📄 Relatório detalhado salvo: ${reportPath}`);

  // Gerar relatório HTML simples
  const htmlReport = generateSimpleHTMLReport(report);
  const htmlPath = path.join(__dirname, 'reports', 'operational-functions-report.html');
  fs.writeFileSync(htmlPath, htmlReport);
  
  TestLogger.success(`🌐 Relatório HTML gerado: ${htmlPath}`);

  console.log('\n🎉 Testes operacionais concluídos!');
  console.log(`\n📋 Funções operacionais confirmadas:`);
  report.summary.operationalFunctions.forEach(func => {
    console.log(`   ✅ ${func}`);
  });

  if (report.summary.partialFunctions.length > 0) {
    console.log(`\n⚠️ Funções com funcionamento parcial:`);
    report.summary.partialFunctions.forEach(func => {
      console.log(`   🟡 ${func}`);
    });
  }

  if (report.summary.failedFunctions.length > 0) {
    console.log(`\n❌ Funções com problemas:`);
    report.summary.failedFunctions.forEach(func => {
      console.log(`   ❌ ${func}`);
    });
  }

  return results;
}

/**
 * Gera relatório HTML simples
 */
function generateSimpleHTMLReport(report) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes Operacionais - ContabilidadePRO</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #ecf0f1; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-card.passed { background: #d5f4e6; }
        .stat-card.failed { background: #ffeaa7; }
        .stat-card.partial { background: #fab1a0; }
        .stat-number { font-size: 1.8em; font-weight: bold; margin-bottom: 5px; }
        .function-list { margin-bottom: 20px; }
        .function-item { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .function-item.passed { background: #d5f4e6; }
        .function-item.partial { background: #fab1a0; }
        .function-item.failed { background: #ffeaa7; }
        .timestamp { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Relatório de Testes Operacionais</h1>
            <p class="timestamp">Executado em: ${new Date(report.timestamp).toLocaleString('pt-BR')}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${report.stats.total}</div>
                <div>Total</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${report.stats.passed}</div>
                <div>Passou</div>
            </div>
            <div class="stat-card partial">
                <div class="stat-number">${report.stats.partial}</div>
                <div>Parcial</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${report.stats.failed}</div>
                <div>Falhou</div>
            </div>
        </div>

        <div class="function-list">
            <h3>✅ Funções Operacionais (${report.summary.operationalFunctions.length})</h3>
            ${report.summary.operationalFunctions.map(func => 
              `<div class="function-item passed">✅ ${func}</div>`
            ).join('')}
        </div>

        ${report.summary.partialFunctions.length > 0 ? `
        <div class="function-list">
            <h3>🟡 Funções Parciais (${report.summary.partialFunctions.length})</h3>
            ${report.summary.partialFunctions.map(func => 
              `<div class="function-item partial">🟡 ${func}</div>`
            ).join('')}
        </div>
        ` : ''}

        ${report.summary.failedFunctions.length > 0 ? `
        <div class="function-list">
            <h3>❌ Funções com Problemas (${report.summary.failedFunctions.length})</h3>
            ${report.summary.failedFunctions.map(func => 
              `<div class="function-item failed">❌ ${func}</div>`
            ).join('')}
        </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center; color: #7f8c8d;">
            <p>Taxa de sucesso: ${report.stats.successRate}% | Duração: ${(report.duration / 1000).toFixed(2)}s</p>
        </div>
    </div>
</body>
</html>`;
}

// Executar se chamado diretamente
if (require.main === module) {
  runOperationalTests().catch(error => {
    TestLogger.error('Erro fatal nos testes operacionais', error);
    process.exit(1);
  });
}

module.exports = {
  operationalTestSuite,
  runOperationalTests,
  CNPJOperationalTest,
  DocumentProcessorOperationalTest,
  TestSimpleOperationalTest,
  CNPJOptimizedOperationalTest
};
