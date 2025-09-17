#!/usr/bin/env node

/**
 * Testes para Edge Functions de Documentos e IA
 * 
 * Este módulo testa as funcionalidades de processamento de documentos,
 * OCR, classificação automática e assistentes de IA.
 */

const { EdgeFunctionTest, TestLogger } = require('./test-runner');

/**
 * Teste para Processamento Inteligente de Documentos
 */
class IntelligentDocumentProcessorTest extends EdgeFunctionTest {
  constructor() {
    super('intelligent-document-processor', 'Teste do processador inteligente de documentos');
  }

  async run() {
    const testCases = [
      {
        name: 'Nota Fiscal',
        data: {
          documentId: 'test-nf-001',
          filePath: 'documentos/nota-fiscal-teste.pdf',
          fileName: 'Nota Fiscal 12345.pdf',
          fileType: 'application/pdf',
          empresaId: 'test-empresa-123',
          expectedType: 'nota_fiscal'
        }
      },
      {
        name: 'Recibo de Pagamento',
        data: {
          documentId: 'test-recibo-001',
          filePath: 'documentos/recibo-teste.pdf',
          fileName: 'Recibo Aluguel Janeiro.pdf',
          fileType: 'application/pdf',
          empresaId: 'test-empresa-123',
          expectedType: 'recibo'
        }
      },
      {
        name: 'Extrato Bancário',
        data: {
          documentId: 'test-extrato-001',
          filePath: 'documentos/extrato-teste.pdf',
          fileName: 'Extrato Banco Janeiro.pdf',
          fileType: 'application/pdf',
          empresaId: 'test-empresa-123',
          expectedType: 'extrato_bancario'
        }
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      try {
        const response = await this.makeRequest('POST', testCase.data);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(`Processamento falhou para ${testCase.name}: ${data.error}`);
        }

        // Validar estrutura da resposta
        if (!data.extractedData || !data.classification || !data.confidence) {
          throw new Error(`Resposta inválida para ${testCase.name}`);
        }

        // Verificar confiança mínima
        if (data.confidence < 0.7) {
          TestLogger.warning(`Confiança baixa para ${testCase.name}: ${data.confidence}`);
        }

        results.push({
          testCase: testCase.name,
          classification: data.classification,
          confidence: data.confidence,
          extractedFields: Object.keys(data.extractedData).length,
          status: 'PASSED'
        });

        TestLogger.success(`  ✓ ${testCase.name}: ${data.classification} (${(data.confidence * 100).toFixed(1)}%)`);

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
      message: `Processamento inteligente funcionando para ${totalTests} tipos de documento`,
      data: results
    };
  }
}

/**
 * Teste para Classificação de Documentos
 */
class ClassifyDocumentTest extends EdgeFunctionTest {
  constructor() {
    super('classify-document', 'Teste de classificação de documentos');
  }

  async run() {
    const testData = {
      documentText: `
        NOTA FISCAL ELETRÔNICA
        Número: 12345
        Data: 15/01/2024
        CNPJ Emitente: 12.345.678/0001-90
        Valor Total: R$ 1.500,00
        Descrição: Venda de produtos diversos
      `,
      fileName: 'documento-teste.txt'
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Classificação falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.classification || !data.confidence || !data.suggestedActions) {
      throw new Error('Resposta de classificação inválida');
    }

    // Verificar se classificou corretamente como nota fiscal
    if (!data.classification.toLowerCase().includes('nota') && 
        !data.classification.toLowerCase().includes('fiscal')) {
      TestLogger.warning(`Classificação inesperada: ${data.classification}`);
    }

    return {
      status: 'PASSED',
      message: 'Classificação de documentos funcionando',
      data: data
    };
  }
}

/**
 * Teste para OCR Service
 */
class PDFOCRServiceTest extends EdgeFunctionTest {
  constructor() {
    super('pdf-ocr-service', 'Teste do serviço de OCR');
  }

  async run() {
    const testData = {
      filePath: 'documentos/documento-teste.pdf',
      language: 'por',
      extractTables: true,
      enhanceImage: true
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`OCR falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.text || !data.confidence) {
      throw new Error('Resposta do OCR inválida');
    }

    // Verificar se extraiu texto
    if (data.text.length < 10) {
      throw new Error('Texto extraído muito curto, possível falha no OCR');
    }

    return {
      status: 'PASSED',
      message: 'Serviço de OCR funcionando',
      data: {
        textLength: data.text.length,
        confidence: data.confidence,
        hasStructuredData: !!data.structuredData
      }
    };
  }
}

/**
 * Teste para Assistente Contábil IA
 */
class AssistenteContabilIATest extends EdgeFunctionTest {
  constructor() {
    super('assistente-contabil-ia', 'Teste do assistente contábil IA');
  }

  async run() {
    const testQuestions = [
      {
        question: 'Como calcular o DAS para uma empresa do Simples Nacional?',
        expectedKeywords: ['das', 'simples', 'nacional', 'aliquota']
      },
      {
        question: 'Quais são as obrigações fiscais de uma MEI?',
        expectedKeywords: ['mei', 'obrigacoes', 'dasn', 'simei']
      },
      {
        question: 'Como fazer a conciliação bancária?',
        expectedKeywords: ['conciliacao', 'bancaria', 'extrato', 'lancamentos']
      }
    ];

    const results = [];

    for (const testCase of testQuestions) {
      try {
        const response = await this.makeRequest('POST', {
          question: testCase.question,
          context: 'contabilidade_brasileira',
          empresaId: 'test-empresa-123'
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(`Consulta IA falhou: ${data.error}`);
        }

        // Validar estrutura da resposta
        if (!data.answer || !data.confidence) {
          throw new Error('Resposta da IA inválida');
        }

        // Verificar se a resposta contém palavras-chave esperadas
        const answerLower = data.answer.toLowerCase();
        const foundKeywords = testCase.expectedKeywords.filter(keyword => 
          answerLower.includes(keyword.toLowerCase())
        );

        const keywordScore = foundKeywords.length / testCase.expectedKeywords.length;

        results.push({
          question: testCase.question,
          answerLength: data.answer.length,
          confidence: data.confidence,
          keywordScore: keywordScore,
          foundKeywords: foundKeywords,
          status: keywordScore >= 0.5 ? 'PASSED' : 'PARTIAL'
        });

        TestLogger.success(`  ✓ Pergunta respondida (${(keywordScore * 100).toFixed(0)}% keywords)`);

      } catch (error) {
        results.push({
          question: testCase.question,
          status: 'FAILED',
          error: error.message
        });
        TestLogger.error(`  ✗ Falha na consulta: ${error.message}`);
      }
    }

    const passedTests = results.filter(r => r.status === 'PASSED').length;
    const totalTests = results.length;

    return {
      status: passedTests >= totalTests * 0.7 ? 'PASSED' : 'PARTIAL',
      message: `Assistente IA respondeu ${passedTests}/${totalTests} perguntas adequadamente`,
      data: results
    };
  }
}

/**
 * Teste para Processamento de NFe
 */
class NFEProcessorTest extends EdgeFunctionTest {
  constructor() {
    super('nfe-processor', 'Teste do processador de NFe');
  }

  async run() {
    const testData = {
      nfeXML: `<?xml version="1.0" encoding="UTF-8"?>
        <nfeProc>
          <NFe>
            <infNFe>
              <ide>
                <nNF>12345</nNF>
                <dEmi>2024-01-15</dEmi>
              </ide>
              <emit>
                <CNPJ>12345678000190</CNPJ>
                <xNome>Empresa Teste LTDA</xNome>
              </emit>
              <total>
                <ICMSTot>
                  <vNF>1500.00</vNF>
                </ICMSTot>
              </total>
            </infNFe>
          </NFe>
        </nfeProc>`,
      empresaId: 'test-empresa-123'
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Processamento NFe falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.nfeData || !data.nfeData.numero || !data.nfeData.valor) {
      throw new Error('Dados da NFe não foram extraídos corretamente');
    }

    return {
      status: 'PASSED',
      message: 'Processamento de NFe funcionando',
      data: data
    };
  }
}

/**
 * Teste para Queue Document Processor
 */
class QueueDocumentProcessorTest extends EdgeFunctionTest {
  constructor() {
    super('queue-document-processor', 'Teste do processador de documentos em fila');
  }

  async run() {
    const testData = {
      documents: [
        {
          id: 'doc-001',
          filePath: 'documentos/doc1.pdf',
          priority: 'high'
        },
        {
          id: 'doc-002',
          filePath: 'documentos/doc2.pdf',
          priority: 'normal'
        }
      ],
      empresaId: 'test-empresa-123'
    };

    const response = await this.makeRequest('POST', testData);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Queue processor falhou: ${data.error || response.status}`);
    }

    // Validar estrutura da resposta
    if (!data.queueId || !data.status) {
      throw new Error('Resposta do queue processor inválida');
    }

    return {
      status: 'PASSED',
      message: 'Processador de fila funcionando',
      data: data
    };
  }
}

/**
 * Suite de testes para documentos e IA
 */
const documentAITestSuite = [
  new IntelligentDocumentProcessorTest(),
  new ClassifyDocumentTest(),
  new PDFOCRServiceTest(),
  new AssistenteContabilIATest(),
  new NFEProcessorTest(),
  new QueueDocumentProcessorTest()
];

/**
 * Executa todos os testes de documentos e IA
 */
async function runDocumentAITests() {
  TestLogger.header('TESTES DAS FUNÇÕES DE DOCUMENTOS E IA');
  
  let passed = 0;
  let failed = 0;
  let partial = 0;
  const results = [];

  for (const test of documentAITestSuite) {
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
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  TestLogger.header('RESULTADO DOS TESTES DE DOCUMENTOS E IA');
  console.log(`Total: ${passed + failed + partial}`);
  console.log(`Passou: ${passed}`);
  console.log(`Parcial: ${partial}`);
  console.log(`Falhou: ${failed}`);
  console.log(`Taxa de sucesso: ${(((passed + partial * 0.5) / (passed + failed + partial)) * 100).toFixed(1)}%`);

  return results;
}

// Executar se chamado diretamente
if (require.main === module) {
  runDocumentAITests().catch(error => {
    TestLogger.error('Erro fatal nos testes de documentos e IA', error);
    process.exit(1);
  });
}

module.exports = {
  documentAITestSuite,
  runDocumentAITests,
  IntelligentDocumentProcessorTest,
  ClassifyDocumentTest,
  PDFOCRServiceTest,
  AssistenteContabilIATest,
  NFEProcessorTest,
  QueueDocumentProcessorTest
};
