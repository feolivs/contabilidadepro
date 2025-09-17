#!/usr/bin/env node

/**
 * Script Principal para Execução de Todos os Testes das Edge Functions
 * 
 * Este script coordena a execução de todos os testes das edge functions
 * do ContabilidadePRO, gerando relatórios detalhados e estatísticas.
 */

const fs = require('fs');
const path = require('path');
const { TestLogger } = require('./test-runner');
const { runFiscalTests } = require('./fiscal-functions-test');
const { runDocumentAITests } = require('./document-ai-test');
const { runIntegrationServicesTests } = require('./integration-services-test');

// Configurações globais
const TEST_CONFIG = {
  outputDir: path.join(__dirname, 'reports'),
  timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
  maxConcurrentTests: 3,
  retryFailedTests: true,
  generateDetailedReport: true
};

/**
 * Classe para gerenciar a execução completa dos testes
 */
class MasterTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      fiscal: null,
      documentAI: null,
      integrationServices: null
    };
    this.overallStats = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      partial: 0,
      skipped: 0,
      duration: 0
    };
  }

  /**
   * Prepara o ambiente de testes
   */
  async setupTestEnvironment() {
    TestLogger.header('PREPARANDO AMBIENTE DE TESTES');

    // Criar diretório de relatórios se não existir
    if (!fs.existsSync(TEST_CONFIG.outputDir)) {
      fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
      TestLogger.info('Diretório de relatórios criado');
    }

    // Verificar conectividade com Supabase
    try {
      const response = await fetch('https://selnwgpyjctpjzdrfrey.supabase.co/rest/v1/', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k'
        }
      });

      if (response.ok) {
        TestLogger.success('Conectividade com Supabase verificada');
      } else {
        TestLogger.warning('Possível problema de conectividade com Supabase');
      }
    } catch (error) {
      TestLogger.error('Erro ao verificar conectividade', error.message);
      throw new Error('Falha na verificação de conectividade');
    }

    TestLogger.info('Ambiente de testes preparado com sucesso\n');
  }

  /**
   * Executa todos os grupos de testes
   */
  async runAllTestSuites() {
    TestLogger.header('EXECUTANDO TODOS OS TESTES DAS EDGE FUNCTIONS');
    
    const testSuites = [
      {
        name: 'Funções Fiscais',
        runner: runFiscalTests,
        key: 'fiscal'
      },
      {
        name: 'Documentos e IA',
        runner: runDocumentAITests,
        key: 'documentAI'
      },
      {
        name: 'Integração e Serviços',
        runner: runIntegrationServicesTests,
        key: 'integrationServices'
      }
    ];

    for (const suite of testSuites) {
      try {
        TestLogger.info(`\n🚀 Iniciando testes: ${suite.name}`);
        const startTime = Date.now();
        
        const results = await suite.runner();
        const duration = Date.now() - startTime;
        
        this.results[suite.key] = {
          name: suite.name,
          results,
          duration,
          timestamp: new Date().toISOString()
        };

        TestLogger.success(`✅ ${suite.name} concluído em ${(duration / 1000).toFixed(2)}s`);
        
        // Pausa entre suites de teste
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        TestLogger.error(`❌ Falha na execução de ${suite.name}`, error.message);
        this.results[suite.key] = {
          name: suite.name,
          error: error.message,
          duration: 0,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Calcula estatísticas gerais
   */
  calculateOverallStats() {
    TestLogger.header('CALCULANDO ESTATÍSTICAS GERAIS');

    for (const [key, result] of Object.entries(this.results)) {
      if (result && result.results && Array.isArray(result.results)) {
        for (const testResult of result.results) {
          this.overallStats.totalTests++;
          
          switch (testResult.status) {
            case 'PASSED':
              this.overallStats.passed++;
              break;
            case 'FAILED':
              this.overallStats.failed++;
              break;
            case 'PARTIAL':
              this.overallStats.partial++;
              break;
            default:
              this.overallStats.skipped++;
          }
        }
      }
    }

    this.overallStats.duration = Date.now() - this.startTime;

    TestLogger.info('Estatísticas calculadas:');
    console.log(`  • Total de testes: ${this.overallStats.totalTests}`);
    console.log(`  • Passou: ${this.overallStats.passed}`);
    console.log(`  • Falhou: ${this.overallStats.failed}`);
    console.log(`  • Parcial: ${this.overallStats.partial}`);
    console.log(`  • Pulado: ${this.overallStats.skipped}`);
    console.log(`  • Duração total: ${(this.overallStats.duration / 1000).toFixed(2)}s`);
  }

  /**
   * Gera relatório detalhado em HTML
   */
  generateHTMLReport() {
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes - ContabilidadePRO Edge Functions</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-card.passed { background: #d5f4e6; }
        .stat-card.failed { background: #ffeaa7; }
        .stat-card.partial { background: #fab1a0; }
        .stat-number { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .test-suite { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #3498db; color: white; padding: 15px; font-weight: bold; }
        .test-result { padding: 15px; border-bottom: 1px solid #eee; }
        .test-result:last-child { border-bottom: none; }
        .status-passed { color: #27ae60; font-weight: bold; }
        .status-failed { color: #e74c3c; font-weight: bold; }
        .status-partial { color: #f39c12; font-weight: bold; }
        .error-details { background: #f8f9fa; padding: 10px; margin-top: 10px; border-left: 4px solid #e74c3c; font-family: monospace; font-size: 0.9em; }
        .timestamp { color: #7f8c8d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Relatório de Testes - ContabilidadePRO</h1>
            <p class="timestamp">Executado em: ${new Date().toLocaleString('pt-BR')}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${this.overallStats.totalTests}</div>
                <div>Total de Testes</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${this.overallStats.passed}</div>
                <div>Passou</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${this.overallStats.failed}</div>
                <div>Falhou</div>
            </div>
            <div class="stat-card partial">
                <div class="stat-number">${this.overallStats.partial}</div>
                <div>Parcial</div>
            </div>
        </div>

        ${Object.entries(this.results).map(([key, suite]) => {
          if (!suite || !suite.results) return '';
          
          return `
            <div class="test-suite">
                <div class="suite-header">${suite.name}</div>
                ${suite.results.map(test => `
                    <div class="test-result">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <strong>${test.functionName}</strong>
                            <span class="status-${test.status.toLowerCase()}">${test.status}</span>
                        </div>
                        <div style="margin-top: 5px;">${test.message}</div>
                        ${test.error ? `<div class="error-details">${test.error}</div>` : ''}
                    </div>
                `).join('')}
            </div>
          `;
        }).join('')}

        <div style="margin-top: 30px; text-align: center; color: #7f8c8d;">
            <p>Duração total: ${(this.overallStats.duration / 1000).toFixed(2)} segundos</p>
            <p>Taxa de sucesso: ${(((this.overallStats.passed + this.overallStats.partial * 0.5) / this.overallStats.totalTests) * 100).toFixed(1)}%</p>
        </div>
    </div>
</body>
</html>`;

    const htmlPath = path.join(TEST_CONFIG.outputDir, `test-report-${TEST_CONFIG.timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlContent);
    
    TestLogger.success(`Relatório HTML gerado: ${htmlPath}`);
    return htmlPath;
  }

  /**
   * Gera relatório em JSON
   */
  generateJSONReport() {
    const jsonReport = {
      timestamp: new Date().toISOString(),
      config: TEST_CONFIG,
      overallStats: this.overallStats,
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    const jsonPath = path.join(TEST_CONFIG.outputDir, `test-report-${TEST_CONFIG.timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
    
    TestLogger.success(`Relatório JSON gerado: ${jsonPath}`);
    return jsonPath;
  }

  /**
   * Executa todos os testes e gera relatórios
   */
  async run() {
    try {
      await this.setupTestEnvironment();
      await this.runAllTestSuites();
      this.calculateOverallStats();
      
      const htmlReport = this.generateHTMLReport();
      const jsonReport = this.generateJSONReport();
      
      TestLogger.header('EXECUÇÃO COMPLETA DOS TESTES');
      
      const successRate = ((this.overallStats.passed + this.overallStats.partial * 0.5) / this.overallStats.totalTests) * 100;
      
      console.log(`📊 Resumo Final:`);
      console.log(`   • Total de testes: ${this.overallStats.totalTests}`);
      console.log(`   • Taxa de sucesso: ${successRate.toFixed(1)}%`);
      console.log(`   • Duração: ${(this.overallStats.duration / 1000).toFixed(2)}s`);
      console.log(`   • Relatórios gerados:`);
      console.log(`     - HTML: ${htmlReport}`);
      console.log(`     - JSON: ${jsonReport}`);
      
      // Exit code baseado na taxa de sucesso
      const exitCode = successRate >= 80 ? 0 : 1;
      
      if (exitCode === 0) {
        TestLogger.success('🎉 Todos os testes concluídos com sucesso!');
      } else {
        TestLogger.warning('⚠️ Alguns testes falharam. Verifique os relatórios para detalhes.');
      }
      
      process.exit(exitCode);
      
    } catch (error) {
      TestLogger.error('💥 Erro fatal durante execução dos testes', error);
      process.exit(1);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const runner = new MasterTestRunner();
  runner.run();
}

module.exports = { MasterTestRunner, TEST_CONFIG };
