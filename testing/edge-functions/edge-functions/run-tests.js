#!/usr/bin/env node

/**
 * Script Principal para Execução de Testes das Edge Functions
 * 
 * Este script oferece uma interface simples para executar diferentes
 * tipos de testes nas edge functions do ContabilidadePRO.
 */

const { spawn } = require('child_process');
const path = require('path');
const { TestLogger } = require('./test-runner');

/**
 * Opções de teste disponíveis
 */
const TEST_OPTIONS = {
  'setup': {
    script: 'setup-tests.js',
    description: 'Configurar ambiente de testes',
    icon: '🔧'
  },
  'clean': {
    script: 'clean-functions-test.js',
    description: 'Testar funções após limpeza (RECOMENDADO)',
    icon: '🧹'
  },
  'operational': {
    script: 'operational-functions-test.js',
    description: 'Testar apenas funções operacionais',
    icon: '✅'
  },
  'working': {
    script: 'working-functions-test.js',
    description: 'Testar funções com parâmetros corrigidos',
    icon: '🔧'
  },
  'fiscal': {
    script: 'fiscal-functions-test.js',
    description: 'Testar funções fiscais e tributárias',
    icon: '💰'
  },
  'document-ai': {
    script: 'document-ai-test.js',
    description: 'Testar processamento de documentos e IA',
    icon: '📄'
  },
  'integration': {
    script: 'integration-services-test.js',
    description: 'Testar integrações e serviços externos',
    icon: '🔗'
  },
  'all': {
    script: 'run-all-tests.js',
    description: 'Executar todos os testes (pode demorar)',
    icon: '🧪'
  },
  'summary': {
    script: 'test-summary.js',
    description: 'Gerar resumo executivo dos testes',
    icon: '📊'
  }
};

/**
 * Executa um script de teste
 */
function runTestScript(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    
    TestLogger.info(`Executando: ${scriptName}`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Script ${scriptName} falhou com código ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Exibe menu de opções
 */
function displayMenu() {
  console.log('\n🧪 Sistema de Testes - ContabilidadePRO Edge Functions\n');
  console.log('Escolha uma opção:\n');
  
  Object.entries(TEST_OPTIONS).forEach(([key, option], index) => {
    console.log(`${index + 1}. ${option.icon} ${option.description}`);
  });
  
  console.log('\n0. Sair\n');
}

/**
 * Processa a escolha do usuário
 */
async function processChoice(choice) {
  const options = Object.keys(TEST_OPTIONS);
  
  if (choice === '0' || choice.toLowerCase() === 'sair') {
    console.log('👋 Saindo...');
    process.exit(0);
  }
  
  const index = parseInt(choice) - 1;
  if (index >= 0 && index < options.length) {
    const optionKey = options[index];
    const option = TEST_OPTIONS[optionKey];
    
    try {
      TestLogger.header(`EXECUTANDO: ${option.description.toUpperCase()}`);
      await runTestScript(option.script);
      TestLogger.success(`✅ ${option.description} concluído com sucesso!`);
    } catch (error) {
      TestLogger.error(`❌ Erro ao executar ${option.description}`, error.message);
    }
  } else if (options.includes(choice)) {
    const option = TEST_OPTIONS[choice];
    try {
      TestLogger.header(`EXECUTANDO: ${option.description.toUpperCase()}`);
      await runTestScript(option.script);
      TestLogger.success(`✅ ${option.description} concluído com sucesso!`);
    } catch (error) {
      TestLogger.error(`❌ Erro ao executar ${option.description}`, error.message);
    }
  } else {
    console.log('❌ Opção inválida. Tente novamente.');
  }
}

/**
 * Execução interativa
 */
async function runInteractive() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  while (true) {
    displayMenu();
    
    const choice = await new Promise(resolve => {
      rl.question('Digite sua escolha: ', resolve);
    });
    
    if (choice === '0') {
      rl.close();
      break;
    }
    
    await processChoice(choice);
    
    console.log('\nPressione Enter para continuar...');
    await new Promise(resolve => {
      rl.question('', resolve);
    });
  }
}

/**
 * Execução via argumentos de linha de comando
 */
async function runWithArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Uso: node run-tests.js <opção>');
    console.log('\nOpções disponíveis:');
    Object.entries(TEST_OPTIONS).forEach(([key, option]) => {
      console.log(`  ${key.padEnd(12)} - ${option.description}`);
    });
    console.log('\nExemplos:');
    console.log('  node run-tests.js setup');
    console.log('  node run-tests.js operational');
    console.log('  node run-tests.js summary');
    return;
  }
  
  const choice = args[0].toLowerCase();
  
  if (TEST_OPTIONS[choice]) {
    await processChoice(choice);
  } else {
    console.log(`❌ Opção inválida: ${choice}`);
    console.log('Opções válidas:', Object.keys(TEST_OPTIONS).join(', '));
    process.exit(1);
  }
}

/**
 * Sequência recomendada de testes
 */
async function runRecommendedSequence() {
  TestLogger.header('EXECUTANDO SEQUÊNCIA RECOMENDADA DE TESTES');
  
  const sequence = [
    'setup',
    'clean',
    'summary'
  ];
  
  for (const step of sequence) {
    const option = TEST_OPTIONS[step];
    try {
      TestLogger.info(`\n${option.icon} Executando: ${option.description}`);
      await runTestScript(option.script);
      TestLogger.success(`✅ ${option.description} concluído!`);
    } catch (error) {
      TestLogger.error(`❌ Falha em: ${option.description}`, error.message);
      console.log('\n⚠️ Continuando com próximo teste...\n');
    }
  }
  
  TestLogger.header('SEQUÊNCIA RECOMENDADA CONCLUÍDA');
  console.log('📄 Verifique os relatórios em: ./reports/');
}

/**
 * Função principal
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Verificar se é execução especial
    if (args.includes('--recommended') || args.includes('-r')) {
      await runRecommendedSequence();
      return;
    }
    
    if (args.includes('--help') || args.includes('-h')) {
      console.log('🧪 Sistema de Testes - ContabilidadePRO Edge Functions\n');
      console.log('Uso:');
      console.log('  node run-tests.js                    # Modo interativo');
      console.log('  node run-tests.js <opção>            # Executar teste específico');
      console.log('  node run-tests.js --recommended      # Sequência recomendada');
      console.log('  node run-tests.js --help             # Esta ajuda');
      console.log('\nOpções de teste:');
      Object.entries(TEST_OPTIONS).forEach(([key, option]) => {
        console.log(`  ${key.padEnd(12)} ${option.icon} ${option.description}`);
      });
      return;
    }
    
    // Execução com argumentos ou interativa
    if (args.length > 0) {
      await runWithArgs();
    } else {
      await runInteractive();
    }
    
  } catch (error) {
    TestLogger.error('Erro fatal no sistema de testes', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  TEST_OPTIONS,
  runTestScript,
  processChoice,
  runRecommendedSequence
};
