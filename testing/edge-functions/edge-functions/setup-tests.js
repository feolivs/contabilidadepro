#!/usr/bin/env node

/**
 * Script de Setup para Testes das Edge Functions
 * 
 * Este script prepara o ambiente de testes, verifica dependências
 * e configura os dados necessários para execução dos testes.
 */

const fs = require('fs');
const path = require('path');
const { TestLogger } = require('./test-runner');

/**
 * Classe para setup do ambiente de testes
 */
class TestSetup {
  constructor() {
    this.configPath = path.join(__dirname, 'test-config.json');
    this.reportsDir = path.join(__dirname, 'reports');
    this.testDataDir = path.join(__dirname, 'test-data');
  }

  /**
   * Verifica se Node.js tem a versão adequada
   */
  checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
      throw new Error(`Node.js versão ${majorVersion} não suportada. Mínimo: v16`);
    }
    
    TestLogger.success(`Node.js ${nodeVersion} - OK`);
  }

  /**
   * Verifica dependências necessárias
   */
  async checkDependencies() {
    TestLogger.info('Verificando dependências...');
    
    // Verificar se fetch está disponível (Node 18+)
    if (typeof fetch === 'undefined') {
      try {
        global.fetch = require('node-fetch');
        TestLogger.info('node-fetch carregado como polyfill');
      } catch (error) {
        throw new Error('fetch não disponível. Instale node-fetch ou use Node.js 18+');
      }
    }
    
    TestLogger.success('Dependências verificadas');
  }

  /**
   * Cria estrutura de diretórios
   */
  createDirectories() {
    TestLogger.info('Criando estrutura de diretórios...');
    
    const dirs = [this.reportsDir, this.testDataDir];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        TestLogger.info(`Diretório criado: ${dir}`);
      }
    }
    
    TestLogger.success('Estrutura de diretórios criada');
  }

  /**
   * Verifica conectividade com Supabase
   */
  async checkSupabaseConnectivity() {
    TestLogger.info('Verificando conectividade com Supabase...');
    
    const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    
    try {
      const response = await fetch(`${config.supabase.url}/rest/v1/`, {
        headers: {
          'apikey': config.supabase.anonKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok || response.status === 401) {
        TestLogger.success('Conectividade com Supabase - OK');
      } else {
        throw new Error(`Status inesperado: ${response.status}`);
      }
    } catch (error) {
      TestLogger.error('Falha na conectividade com Supabase', error.message);
      throw error;
    }
  }

  /**
   * Cria dados de teste
   */
  createTestData() {
    TestLogger.info('Criando dados de teste...');
    
    const testData = {
      empresas: [
        {
          id: 'test-empresa-123',
          nome: 'Empresa Teste LTDA',
          cnpj: '11.222.333/0001-81',
          regimeTributario: 'Simples Nacional',
          atividade: 'comercio'
        }
      ],
      usuarios: [
        {
          id: 'test-user-456',
          nome: 'Usuário Teste',
          email: 'teste@contabilidadepro.com',
          role: 'contador'
        }
      ],
      documentos: [
        {
          id: 'test-doc-001',
          nome: 'Nota Fiscal Teste',
          tipo: 'nota_fiscal',
          conteudo: 'Dados de teste para processamento'
        }
      ],
      transacoes: [
        {
          id: 'test-txn-001',
          data: '2024-01-15',
          valor: 2500.00,
          tipo: 'receita',
          descricao: 'Venda de produtos'
        }
      ]
    };
    
    const testDataPath = path.join(this.testDataDir, 'mock-data.json');
    fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
    
    TestLogger.success(`Dados de teste criados: ${testDataPath}`);
  }

  /**
   * Valida configuração de testes
   */
  validateConfig() {
    TestLogger.info('Validando configuração de testes...');
    
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Arquivo de configuração não encontrado: ${this.configPath}`);
    }
    
    const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    
    // Validar campos obrigatórios
    const requiredFields = ['supabase', 'testSettings', 'edgeFunctions'];
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Campo obrigatório ausente na configuração: ${field}`);
      }
    }
    
    // Validar URL do Supabase
    if (!config.supabase.url || !config.supabase.anonKey) {
      throw new Error('Configuração do Supabase incompleta');
    }
    
    TestLogger.success('Configuração validada');
  }

  /**
   * Gera relatório de setup
   */
  generateSetupReport() {
    const report = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      directories: {
        reports: this.reportsDir,
        testData: this.testDataDir
      },
      status: 'ready'
    };
    
    const reportPath = path.join(this.reportsDir, 'setup-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    TestLogger.success(`Relatório de setup gerado: ${reportPath}`);
  }

  /**
   * Executa todo o processo de setup
   */
  async run() {
    try {
      TestLogger.header('CONFIGURANDO AMBIENTE DE TESTES');
      
      this.checkNodeVersion();
      await this.checkDependencies();
      this.createDirectories();
      this.validateConfig();
      await this.checkSupabaseConnectivity();
      this.createTestData();
      this.generateSetupReport();
      
      TestLogger.header('SETUP CONCLUÍDO COM SUCESSO');
      
      console.log('🎉 Ambiente de testes configurado e pronto para uso!');
      console.log('\nPróximos passos:');
      console.log('  • Execute: node run-all-tests.js (todos os testes)');
      console.log('  • Execute: node fiscal-functions-test.js (apenas testes fiscais)');
      console.log('  • Execute: node document-ai-test.js (apenas testes de documentos/IA)');
      console.log('  • Execute: node integration-services-test.js (apenas testes de integração)');
      console.log('\nRelatórios serão gerados em: ./reports/');
      
    } catch (error) {
      TestLogger.error('Falha no setup do ambiente de testes', error.message);
      console.log('\n❌ Setup falhou. Verifique os erros acima e tente novamente.');
      process.exit(1);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const setup = new TestSetup();
  setup.run();
}

module.exports = { TestSetup };
