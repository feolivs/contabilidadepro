#!/usr/bin/env node

/**
 * Script para Limpeza de Edge Functions Duplicadas e Desnecessárias
 * 
 * Este script identifica e remove edge functions que:
 * - Têm funcionalidades duplicadas
 * - São versões obsoletas
 * - Não são utilizadas no sistema
 * - São apenas para teste/desenvolvimento
 */

const fs = require('fs');
const path = require('path');

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Edge Functions identificadas para remoção
 */
const FUNCTIONS_TO_REMOVE = {
  // DUPLICATAS DE CÁLCULO DAS
  duplicates_das: [
    'calculo-das-automatico',  // Duplicata de calculate-das-service
    'generate-das-service'     // Duplicata de calculate-das-service
  ],
  
  // DUPLICATAS DE IA/ASSISTENTE
  duplicates_ai: [
    'ai-contextual-assistant', // Duplicata de assistente-contabil-ia
    'ai-semantic-service',     // Duplicata de ai-service
    'consulta-ia'              // Duplicata de assistente-contabil-ia
  ],
  
  // DUPLICATAS DE PROCESSAMENTO DE DOCUMENTOS
  duplicates_documents: [
    'process-document',        // DEPRECATED - usa unified-document-processor
    'process-document-service', // Duplicata de intelligent-document-processor
    'process-ocr',             // Duplicata de pdf-ocr-service
    'queue-document-processor' // Funcionalidade não essencial
  ],
  
  // DUPLICATAS DE ANALYTICS
  duplicates_analytics: [
    'dashboard-analytics',     // Duplicata de analytics-service
    'generate-analytics-reports', // Duplicata de analytics-service
    'export-analytics-report', // Duplicata de analytics-service
    'metrics-dashboard',       // Duplicata de simple-analytics
    'assistant-dashboard-data' // Duplicata de analytics-service
  ],
  
  // DUPLICATAS DE NOTIFICAÇÕES
  duplicates_notifications: [
    'generate-notifications',  // Duplicata de notification-service
    'intelligent-notifications', // Duplicata de notification-service
    'cleanup-notifications'    // Funcionalidade não essencial
  ],
  
  // DUPLICATAS DE AUTOMAÇÃO
  duplicates_automation: [
    'automation-monitor',      // Duplicata de automation-service
    'intelligent-alerts-scheduler' // Duplicata de automation-service
  ],
  
  // FUNÇÕES DE TESTE E DESENVOLVIMENTO
  test_functions: [
    'test-simple',            // Apenas para testes
    'create-test-user'        // Apenas para desenvolvimento
  ],
  
  // FUNÇÕES EXPERIMENTAIS/NÃO UTILIZADAS
  experimental: [
    'mcp-context-provider',   // Experimental
    'performance-monitor',    // Duplicata de health-service
    'unified-api-gateway'     // Não utilizado
  ],
  
  // DUPLICATAS DE CNPJ
  duplicates_cnpj: [
    // Manter apenas consultar-cnpj-optimized (versão melhor)
    'consultar-cnpj'          // Versão não otimizada
  ]
};

/**
 * Edge Functions que devem ser MANTIDAS (essenciais)
 */
const ESSENTIAL_FUNCTIONS = [
  // Fiscais/Tributárias
  'calculate-das-service',
  'simulador-tributario',
  'gerar-guia-pdf',
  'gerar-relatorio-pdf',
  'get-fiscal-obligations',
  'compliance-monitor',
  'fiscal-automation-engine',
  'generate-accounting-entries',
  
  // IA e Assistente
  'assistente-contabil-ia',
  'assistente-contabil-ia-enhanced',
  'ai-service',
  
  // Processamento de Documentos
  'intelligent-document-processor',
  'unified-document-processor',
  'classify-document',
  'pdf-ocr-service',
  'nfe-processor',
  
  // Integração e Serviços
  'consultar-cnpj-optimized',
  'bank-reconciliation-engine',
  'ofx-parser-multi-bank',
  'crm-service',
  'backup-service',
  'webhook-dispatcher',
  
  // Analytics
  'analytics-service',
  'simple-analytics',
  
  // Automação e Notificações
  'automation-service',
  'notification-service',
  
  // Serviços Core
  'health-service',
  'company-service',
  'document-service',
  'portal-service'
];

/**
 * Logger com cores
 */
class Logger {
  static info(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
  }
  
  static success(message) {
    console.log(`${colors.green}✅${colors.reset} ${message}`);
  }
  
  static warning(message) {
    console.log(`${colors.yellow}⚠️${colors.reset} ${message}`);
  }
  
  static error(message) {
    console.log(`${colors.red}❌${colors.reset} ${message}`);
  }
  
  static header(message) {
    console.log(`\n${colors.cyan}${colors.reset}`);
    console.log(`${colors.cyan}🧹 ${message}${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(message.length + 4)}${colors.reset}\n`);
  }
}

/**
 * Classe principal para limpeza
 */
class EdgeFunctionCleaner {
  constructor() {
    this.functionsDir = path.join(__dirname, 'supabase', 'functions');
    this.backupDir = path.join(__dirname, 'backup-edge-functions');
    this.removedFunctions = [];
    this.keptFunctions = [];
  }
  
  /**
   * Lista todas as edge functions existentes
   */
  listExistingFunctions() {
    try {
      const items = fs.readdirSync(this.functionsDir);
      return items.filter(item => {
        const itemPath = path.join(this.functionsDir, item);
        return fs.statSync(itemPath).isDirectory() && !item.startsWith('_');
      });
    } catch (error) {
      Logger.error(`Erro ao listar funções: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Cria backup das funções antes de remover
   */
  createBackup() {
    Logger.info('Criando backup das edge functions...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
    
    try {
      // Copiar toda a pasta functions
      this.copyDirectory(this.functionsDir, backupPath);
      Logger.success(`Backup criado em: ${backupPath}`);
      return backupPath;
    } catch (error) {
      Logger.error(`Erro ao criar backup: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Copia diretório recursivamente
   */
  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const items = fs.readdirSync(src);
    
    for (const item of items) {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);
      
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  /**
   * Remove uma edge function
   */
  removeFunction(functionName) {
    const functionPath = path.join(this.functionsDir, functionName);
    
    if (!fs.existsSync(functionPath)) {
      Logger.warning(`Função ${functionName} não encontrada`);
      return false;
    }
    
    try {
      // Remover diretório recursivamente
      fs.rmSync(functionPath, { recursive: true, force: true });
      Logger.success(`Removida: ${functionName}`);
      this.removedFunctions.push(functionName);
      return true;
    } catch (error) {
      Logger.error(`Erro ao remover ${functionName}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Analisa e exibe relatório antes da remoção
   */
  analyzeForRemoval() {
    const existingFunctions = this.listExistingFunctions();
    const allToRemove = Object.values(FUNCTIONS_TO_REMOVE).flat();
    
    Logger.header('ANÁLISE DE EDGE FUNCTIONS PARA REMOÇÃO');
    
    console.log(`📊 Estatísticas:`);
    console.log(`   • Total de funções existentes: ${existingFunctions.length}`);
    console.log(`   • Funções marcadas para remoção: ${allToRemove.length}`);
    console.log(`   • Funções essenciais a manter: ${ESSENTIAL_FUNCTIONS.length}`);
    
    console.log(`\n🗑️ Funções que serão removidas por categoria:\n`);
    
    for (const [category, functions] of Object.entries(FUNCTIONS_TO_REMOVE)) {
      const categoryName = category.replace(/_/g, ' ').toUpperCase();
      console.log(`   ${categoryName}:`);
      
      for (const func of functions) {
        const exists = existingFunctions.includes(func);
        const status = exists ? '🗑️' : '❓';
        console.log(`     ${status} ${func} ${exists ? '' : '(não encontrada)'}`);
      }
      console.log('');
    }
    
    console.log(`✅ Funções essenciais que serão mantidas:`);
    for (const func of ESSENTIAL_FUNCTIONS) {
      const exists = existingFunctions.includes(func);
      const status = exists ? '✅' : '❓';
      console.log(`   ${status} ${func} ${exists ? '' : '(não encontrada)'}`);
    }
    
    return { existingFunctions, allToRemove };
  }
  
  /**
   * Executa a limpeza
   */
  async performCleanup(createBackup = true) {
    Logger.header('INICIANDO LIMPEZA DAS EDGE FUNCTIONS');
    
    // Análise prévia
    const { existingFunctions, allToRemove } = this.analyzeForRemoval();
    
    // Confirmação do usuário
    console.log(`\n⚠️ Esta operação irá remover ${allToRemove.length} edge functions.`);
    console.log(`${createBackup ? '📦 Um backup será criado antes da remoção.' : '🚨 NENHUM backup será criado!'}`);
    
    // Criar backup se solicitado
    let backupPath = null;
    if (createBackup) {
      backupPath = this.createBackup();
    }
    
    // Executar remoções
    Logger.info('Iniciando remoção das funções...');
    
    let removedCount = 0;
    let errorCount = 0;
    
    for (const functionName of allToRemove) {
      if (existingFunctions.includes(functionName)) {
        if (this.removeFunction(functionName)) {
          removedCount++;
        } else {
          errorCount++;
        }
      }
    }
    
    // Relatório final
    Logger.header('LIMPEZA CONCLUÍDA');
    
    console.log(`📊 Resultados:`);
    console.log(`   • Funções removidas: ${removedCount}`);
    console.log(`   • Erros: ${errorCount}`);
    console.log(`   • Funções restantes: ${existingFunctions.length - removedCount}`);
    
    if (backupPath) {
      console.log(`   • Backup salvo em: ${backupPath}`);
    }
    
    console.log(`\n🗑️ Funções removidas:`);
    for (const func of this.removedFunctions) {
      console.log(`   • ${func}`);
    }
    
    console.log(`\n✅ Próximos passos:`);
    console.log(`   1. Verificar se o sistema ainda funciona corretamente`);
    console.log(`   2. Atualizar testes para remover referências às funções removidas`);
    console.log(`   3. Atualizar documentação`);
    console.log(`   4. Fazer deploy das mudanças`);
    
    return {
      removedCount,
      errorCount,
      backupPath,
      removedFunctions: this.removedFunctions
    };
  }
  
  /**
   * Modo dry-run (apenas simula)
   */
  dryRun() {
    Logger.header('SIMULAÇÃO DE LIMPEZA (DRY RUN)');
    
    const { existingFunctions, allToRemove } = this.analyzeForRemoval();
    
    console.log(`\n🔍 Simulação - Nenhuma função será realmente removida:`);
    
    let wouldRemove = 0;
    for (const functionName of allToRemove) {
      if (existingFunctions.includes(functionName)) {
        console.log(`   🗑️ Removeria: ${functionName}`);
        wouldRemove++;
      }
    }
    
    console.log(`\n📊 Resumo da simulação:`);
    console.log(`   • Funções que seriam removidas: ${wouldRemove}`);
    console.log(`   • Funções que permaneceriam: ${existingFunctions.length - wouldRemove}`);
    
    console.log(`\n💡 Para executar a limpeza real:`);
    console.log(`   node cleanup-edge-functions.js --execute`);
  }
}

/**
 * Função principal
 */
async function main() {
  const args = process.argv.slice(2);
  const cleaner = new EdgeFunctionCleaner();
  
  try {
    if (args.includes('--execute') || args.includes('-e')) {
      const createBackup = !args.includes('--no-backup');
      await cleaner.performCleanup(createBackup);
    } else if (args.includes('--help') || args.includes('-h')) {
      console.log('🧹 Script de Limpeza de Edge Functions\n');
      console.log('Uso:');
      console.log('  node cleanup-edge-functions.js                # Simulação (dry run)');
      console.log('  node cleanup-edge-functions.js --execute     # Executar limpeza');
      console.log('  node cleanup-edge-functions.js -e --no-backup # Executar sem backup');
      console.log('  node cleanup-edge-functions.js --help        # Esta ajuda');
    } else {
      cleaner.dryRun();
    }
  } catch (error) {
    Logger.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { EdgeFunctionCleaner, FUNCTIONS_TO_REMOVE, ESSENTIAL_FUNCTIONS };
