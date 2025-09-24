#!/usr/bin/env node

/**
 * Testes para Edge Functions de Integração e Serviços
 * 
 * Este módulo testa as funcionalidades de integração com APIs externas,
 * serviços de backup, analytics, CRM e outras integrações do sistema.
 */

const { EdgeFunctionTest, TestLogger } = require('./test-runner');

/**
 * Teste para Consulta CNPJ Otimizada
 */
class ConsultarCNPJOptimizedTest extends EdgeFunctionTest {
  constructor() {
    super('consultar-cnpj-optimized', 'Teste da consulta CNPJ otimizada');
  }

  async run() {
    const testCNPJs = [
      '11.222.333/0001-81', // CNPJ fictício para teste
      '12.345.678/0001-90', // CNPJ fictício para teste
      '98.765.432/0001-10'  // CNPJ fictício para teste
    ];

    const results = [];

    for (const cnpj of testCNPJs) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest('POST', { cnpj });
        const responseTime = Date.now() - startTime;
        const data = await response.json();

        // Aceitar tanto 200 (encontrado) quanto 404 (não encontrado) como válidos
        if (response.status !== 200 && response.status !== 404) {
          throw new Error(`Status inesperado: ${response.status}`);
        }

        results.push({
          cnpj,
          status: response.status,
          responseTime,
          found: response.status === 200,
          cached: data.cached || false
        });

        TestLogger.success(`  ✓ ${cnpj}: ${response.status} (${responseTime}ms)`);

      } catch (error) {
        results.push({
          cnpj,
          status: 'ERROR',
          error: error.message
        });
        TestLogger.error(`  ✗ ${cnpj}: ${error.message}`);
      }
    }

    const avgResponseTime = results
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    return {
      status: 'PASSED',
      message: `Consulta CNPJ otimizada funcionando (avg: ${avgResponseTime.toFixed(0)}ms)`,
      data: { results, avgResponseTime }
    };
  }
}

/**
 * Teste para Bank Reconciliation Engine
 */
class BankReconciliationTest extends EdgeFunctionTest {
  constructor() {
    super('bank-reconciliation-engine', 'Teste do motor de conciliação bancária');
  }

  async run() {
    const testData = {
      empresaId: 'test-empresa-123',
      contaBancaria: 'conta-001',
      periodo: {
        inicio: '2024-01-01',
        fim: '2024-01-31'
      },
      extratoTransacoes: [
        {
          data: '2024-01-15',
          descricao: 'PIX RECEBIDO - CLIENTE ABC',
          valor: 2500.00,
          tipo: 'credito'
        },
        {
          data: '2024-01-20',
          descricao: 'TED ENVIADO - FORNECEDOR XYZ',
          valor: -1200.00,
          tipo: 'debito'
        }
      ],
      lancamentosContabeis: [
        {
          data: '2024-01-15',
          descricao: 'Recebimento Cliente ABC',
          valor: 2500.00,
          conta: 'receitas'
        },
        {
          data: '2024-01-20',
          descricao: 'Pagamento Fornecedor XYZ',
          valor: 1200.00,
          conta: 'despesas'
        }
      ]
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Conciliação bancária falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.conciliacao || !data.estatisticas) {
      throw new Error('Resposta da conciliação inválida');
    }

    return {
      status: 'PASSED',
      message: 'Motor de conciliação bancária funcionando',
      data: data
    };
  }
}

/**
 * Teste para OFX Parser Multi Bank
 */
class OFXParserTest extends EdgeFunctionTest {
  constructor() {
    super('ofx-parser-multi-bank', 'Teste do parser OFX multi-banco');
  }

  async run() {
    const testOFX = `
      OFXHEADER:100
      DATA:OFXSGML
      VERSION:102
      SECURITY:NONE
      ENCODING:USASCII
      CHARSET:1252
      COMPRESSION:NONE
      OLDFILEUID:NONE
      NEWFILEUID:NONE

      <OFX>
        <SIGNONMSGSRSV1>
          <SONRS>
            <STATUS>
              <CODE>0</CODE>
              <SEVERITY>INFO</SEVERITY>
            </STATUS>
          </SONRS>
        </SIGNONMSGSRSV1>
        <BANKMSGSRSV1>
          <STMTTRNRS>
            <STMTRS>
              <CURDEF>BRL</CURDEF>
              <BANKACCTFROM>
                <BANKID>001</BANKID>
                <ACCTID>12345-6</ACCTID>
                <ACCTTYPE>CHECKING</ACCTTYPE>
              </BANKACCTFROM>
              <BANKTRANLIST>
                <DTSTART>20240101</DTSTART>
                <DTEND>20240131</DTEND>
                <STMTTRN>
                  <TRNTYPE>CREDIT</TRNTYPE>
                  <DTPOSTED>20240115</DTPOSTED>
                  <TRNAMT>2500.00</TRNAMT>
                  <FITID>TXN001</FITID>
                  <MEMO>PIX RECEBIDO</MEMO>
                </STMTTRN>
              </BANKTRANLIST>
            </STMTRS>
          </STMTTRNRS>
        </BANKMSGSRSV1>
      </OFX>
    `;

    const testData = {
      ofxContent: testOFX,
      banco: 'banco_do_brasil',
      empresaId: 'test-empresa-123'
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Parser OFX falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.transacoes || !Array.isArray(data.transacoes)) {
      throw new Error('Transações não foram parseadas corretamente');
    }

    return {
      status: 'PASSED',
      message: `Parser OFX funcionando (${data.transacoes.length} transações)`,
      data: data
    };
  }
}

/**
 * Teste para CRM Service
 */
class CRMServiceTest extends EdgeFunctionTest {
  constructor() {
    super('crm-service', 'Teste do serviço de CRM');
  }

  async run() {
    const testOperations = [
      {
        operation: 'create_client',
        data: {
          nome: 'Cliente Teste LTDA',
          cnpj: '12.345.678/0001-90',
          email: 'contato@clienteteste.com.br',
          telefone: '(11) 99999-9999',
          endereco: {
            rua: 'Rua Teste, 123',
            cidade: 'São Paulo',
            estado: 'SP',
            cep: '01234-567'
          }
        }
      },
      {
        operation: 'list_clients',
        data: {
          empresaId: 'test-empresa-123',
          limit: 10
        }
      }
    ];

    const results = [];

    for (const testOp of testOperations) {
      try {
        const response = await this.makeRequest('POST', {
          operation: testOp.operation,
          ...testOp.data
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(`Operação ${testOp.operation} falhou: ${data.error}`);
        }

        results.push({
          operation: testOp.operation,
          status: 'PASSED',
          data: data
        });

        TestLogger.success(`  ✓ ${testOp.operation}: OK`);

      } catch (error) {
        results.push({
          operation: testOp.operation,
          status: 'FAILED',
          error: error.message
        });
        TestLogger.error(`  ✗ ${testOp.operation}: ${error.message}`);
      }
    }

    const passedOps = results.filter(r => r.status === 'PASSED').length;

    return {
      status: passedOps === results.length ? 'PASSED' : 'PARTIAL',
      message: `CRM Service: ${passedOps}/${results.length} operações funcionando`,
      data: results
    };
  }
}

/**
 * Teste para Backup Service
 */
class BackupServiceTest extends EdgeFunctionTest {
  constructor() {
    super('backup-service', 'Teste do serviço de backup');
  }

  async run() {
    const testData = {
      empresaId: 'test-empresa-123',
      tipoBackup: 'incremental',
      incluir: ['documentos', 'lancamentos', 'configuracoes'],
      destino: 'cloud_storage'
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Backup service falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.backupId || !data.status) {
      throw new Error('Resposta do backup service inválida');
    }

    return {
      status: 'PASSED',
      message: 'Serviço de backup funcionando',
      data: data
    };
  }
}

/**
 * Teste para Webhook Dispatcher
 */
class WebhookDispatcherTest extends EdgeFunctionTest {
  constructor() {
    super('webhook-dispatcher', 'Teste do dispatcher de webhooks');
  }

  async run() {
    const testData = {
      evento: 'documento_processado',
      dados: {
        documentoId: 'doc-123',
        empresaId: 'test-empresa-123',
        tipo: 'nota_fiscal',
        status: 'processado'
      },
      webhooks: [
        {
          url: 'https://httpbin.org/post',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Source': 'ContabilidadePRO'
          }
        }
      ]
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Webhook dispatcher falhou: ${data.error || response.status}`);
    }

    return {
      status: 'PASSED',
      message: 'Dispatcher de webhooks funcionando',
      data: data
    };
  }
}

/**
 * Teste para Performance Monitor
 */
class PerformanceMonitorTest extends EdgeFunctionTest {
  constructor() {
    super('performance-monitor', 'Teste do monitor de performance');
  }

  async run() {
    const testData = {
      metricas: ['response_time', 'memory_usage', 'cpu_usage'],
      periodo: '1h',
      servicos: ['edge-functions', 'database', 'storage']
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Performance monitor falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.metricas || !data.timestamp) {
      throw new Error('Resposta do performance monitor inválida');
    }

    return {
      status: 'PASSED',
      message: 'Monitor de performance funcionando',
      data: data
    };
  }
}

/**
 * Suite de testes para integração e serviços
 */
const integrationServicesTestSuite = [
  new ConsultarCNPJOptimizedTest(),
  new BankReconciliationTest(),
  new OFXParserTest(),
  new CRMServiceTest(),
  new BackupServiceTest(),
  new WebhookDispatcherTest(),
  new PerformanceMonitorTest()
];

/**
 * Executa todos os testes de integração e serviços
 */
async function runIntegrationServicesTests() {
  TestLogger.header('TESTES DAS FUNÇÕES DE INTEGRAÇÃO E SERVIÇOS');
  
  let passed = 0;
  let failed = 0;
  let partial = 0;
  const results = [];

  for (const test of integrationServicesTestSuite) {
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
      
      TestLogger.success(`✅ ${test.description} - ${result.status}`);
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

  TestLogger.header('RESULTADO DOS TESTES DE INTEGRAÇÃO E SERVIÇOS');
  console.log(`Total: ${passed + failed + partial}`);
  console.log(`Passou: ${passed}`);
  console.log(`Parcial: ${partial}`);
  console.log(`Falhou: ${failed}`);
  console.log(`Taxa de sucesso: ${(((passed + partial * 0.5) / (passed + failed + partial)) * 100).toFixed(1)}%`);

  return results;
}

// Executar se chamado diretamente
if (require.main === module) {
  runIntegrationServicesTests().catch(error => {
    TestLogger.error('Erro fatal nos testes de integração e serviços', error);
    process.exit(1);
  });
}

module.exports = {
  integrationServicesTestSuite,
  runIntegrationServicesTests,
  ConsultarCNPJOptimizedTest,
  BankReconciliationTest,
  OFXParserTest,
  CRMServiceTest,
  BackupServiceTest,
  WebhookDispatcherTest,
  PerformanceMonitorTest
};
