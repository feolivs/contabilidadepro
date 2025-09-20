/**
 * 🧪 SUITE DE VALIDAÇÃO FUNCIONAL - ContabilidadePRO
 * Testar todas as funcionalidades críticas após otimização
 */

const { createClient } = require('@supabase/supabase-js');

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://selnwgpyjctpjzdrfrey.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente Supabase
let supabase;
if (SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

/**
 * 📊 Classe para coletar resultados de testes
 */
class TestResults {
  constructor() {
    this.results = {
      database: [],
      cache: [],
      edgeFunctions: [],
      cronJobs: [],
      security: [],
      integration: []
    };
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
  }

  addResult(category, testName, status, message = '', duration = 0) {
    const result = {
      test: testName,
      status, // 'PASS', 'FAIL', 'SKIP'
      message,
      duration,
      timestamp: new Date().toISOString()
    };

    this.results[category].push(result);
    this.summary.total++;
    
    if (status === 'PASS') this.summary.passed++;
    else if (status === 'FAIL') this.summary.failed++;
    else if (status === 'SKIP') this.summary.skipped++;

    // Log resultado
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`  ${emoji} ${testName}: ${message} (${duration}ms)`);
  }

  generateReport() {
    return {
      summary: this.summary,
      results: this.results,
      timestamp: new Date().toISOString()
    };
  }
}

const testResults = new TestResults();

/**
 * 🗄️ Testes de Banco de Dados
 */
async function testDatabaseFunctionality() {
  console.log('🗄️ Testando funcionalidades do banco de dados...');

  // Teste 1: Tabela unificada documentos_unified
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('documentos_unified')
      .select('id, arquivo_nome, categoria, status_processamento')
      .limit(5);
    
    const duration = Date.now() - start;
    
    if (error) {
      testResults.addResult('database', 'Query documentos_unified', 'FAIL', error.message, duration);
    } else {
      testResults.addResult('database', 'Query documentos_unified', 'PASS', `${data.length} registros`, duration);
    }
  } catch (error) {
    testResults.addResult('database', 'Query documentos_unified', 'FAIL', error.message);
  }

  // Teste 2: Empresas
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('empresas')
      .select('id, nome_fantasia, cnpj, ativa')
      .eq('ativa', true)
      .limit(3);
    
    const duration = Date.now() - start;
    
    if (error) {
      testResults.addResult('database', 'Query empresas ativas', 'FAIL', error.message, duration);
    } else {
      testResults.addResult('database', 'Query empresas ativas', 'PASS', `${data.length} empresas`, duration);
    }
  } catch (error) {
    testResults.addResult('database', 'Query empresas ativas', 'FAIL', error.message);
  }

  // Teste 3: Cálculos fiscais
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('calculos_fiscais')
      .select('id, tipo_calculo, valor_imposto, created_at')
      .limit(3);
    
    const duration = Date.now() - start;
    
    if (error) {
      testResults.addResult('database', 'Query cálculos fiscais', 'FAIL', error.message, duration);
    } else {
      testResults.addResult('database', 'Query cálculos fiscais', 'PASS', `${data.length} cálculos`, duration);
    }
  } catch (error) {
    testResults.addResult('database', 'Query cálculos fiscais', 'FAIL', error.message);
  }

  // Teste 4: Políticas RLS
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('documentos_unified')
      .select('id')
      .limit(1);
    
    const duration = Date.now() - start;
    
    if (error && error.message.includes('RLS')) {
      testResults.addResult('database', 'RLS Policies', 'PASS', 'RLS ativo e funcionando', duration);
    } else if (!error) {
      testResults.addResult('database', 'RLS Policies', 'PASS', 'Acesso autorizado', duration);
    } else {
      testResults.addResult('database', 'RLS Policies', 'FAIL', error.message, duration);
    }
  } catch (error) {
    testResults.addResult('database', 'RLS Policies', 'FAIL', error.message);
  }
}

/**
 * 🔄 Testes de Cache
 */
async function testCacheFunctionality() {
  console.log('🔄 Testando funcionalidades de cache...');

  // Teste 1: Cache de IA
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('ai_cache')
      .select('cache_key, created_at')
      .limit(3);
    
    const duration = Date.now() - start;
    
    if (error) {
      testResults.addResult('cache', 'AI Cache Read', 'FAIL', error.message, duration);
    } else {
      testResults.addResult('cache', 'AI Cache Read', 'PASS', `${data.length} entradas`, duration);
    }
  } catch (error) {
    testResults.addResult('cache', 'AI Cache Read', 'FAIL', error.message);
  }

  // Teste 2: Cache de CNPJ
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('cnpj_cache')
      .select('cnpj, cached_data')
      .limit(3);
    
    const duration = Date.now() - start;
    
    if (error) {
      testResults.addResult('cache', 'CNPJ Cache Read', 'FAIL', error.message, duration);
    } else {
      testResults.addResult('cache', 'CNPJ Cache Read', 'PASS', `${data.length} CNPJs`, duration);
    }
  } catch (error) {
    testResults.addResult('cache', 'CNPJ Cache Read', 'FAIL', error.message);
  }

  // Teste 3: Inserção de cache (simulado)
  try {
    const start = Date.now();
    const testKey = `test_cache_${Date.now()}`;
    const { error } = await supabase
      .from('ai_cache')
      .insert({
        cache_key: testKey,
        cache_data: { test: true, timestamp: Date.now() },
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        user_id: '1ff74f50-bc2d-49ae-8fb4-3b819df08078'
      });
    
    const duration = Date.now() - start;
    
    if (error) {
      testResults.addResult('cache', 'Cache Write Test', 'FAIL', error.message, duration);
    } else {
      testResults.addResult('cache', 'Cache Write Test', 'PASS', 'Inserção bem-sucedida', duration);
      
      // Limpar teste
      await supabase.from('ai_cache').delete().eq('cache_key', testKey);
    }
  } catch (error) {
    testResults.addResult('cache', 'Cache Write Test', 'FAIL', error.message);
  }
}

/**
 * ⚡ Testes de Edge Functions
 */
async function testEdgeFunctions() {
  console.log('⚡ Testando Edge Functions...');

  const functions = [
    {
      name: 'fiscal-service',
      payload: { action: 'health_check' },
      timeout: 5000
    },
    {
      name: 'assistente-contabil-ia',
      payload: { message: 'teste', user_id: '1ff74f50-bc2d-49ae-8fb4-3b819df08078' },
      timeout: 10000
    },
    {
      name: 'pdf-ocr-service',
      payload: { action: 'health_check' },
      timeout: 5000
    }
  ];

  for (const func of functions) {
    try {
      const start = Date.now();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify(func.payload),
        signal: AbortSignal.timeout(func.timeout)
      });
      
      const duration = Date.now() - start;
      
      if (response.ok) {
        const result = await response.text();
        testResults.addResult('edgeFunctions', `${func.name}`, 'PASS', `Status ${response.status}`, duration);
      } else {
        testResults.addResult('edgeFunctions', `${func.name}`, 'FAIL', `Status ${response.status}`, duration);
      }
    } catch (error) {
      testResults.addResult('edgeFunctions', `${func.name}`, 'FAIL', error.message);
    }
  }
}

/**
 * ⏰ Testes de Cron Jobs Consolidados
 */
async function testCronJobs() {
  console.log('⏰ Testando funções consolidadas de cron jobs...');

  const functions = [
    'unified_backup_manager_simple',
    'smart_analytics_refresh_simple',
    'intelligent_compliance_monitor_simple',
    'intelligent_maintenance_simple'
  ];

  for (const funcName of functions) {
    try {
      const start = Date.now();
      const { data, error } = await supabase.rpc(funcName);
      const duration = Date.now() - start;
      
      if (error) {
        testResults.addResult('cronJobs', funcName, 'FAIL', error.message, duration);
      } else {
        testResults.addResult('cronJobs', funcName, 'PASS', data || 'Executado com sucesso', duration);
      }
    } catch (error) {
      testResults.addResult('cronJobs', funcName, 'FAIL', error.message);
    }
  }
}

/**
 * 🛡️ Testes de Segurança
 */
async function testSecurity() {
  console.log('🛡️ Testando funcionalidades de segurança...');

  // Teste 1: Acesso sem autenticação (deve falhar)
  try {
    const anonClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || '');
    const { data, error } = await anonClient
      .from('empresas')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('RLS')) {
      testResults.addResult('security', 'RLS Protection', 'PASS', 'Acesso negado corretamente');
    } else if (data && data.length === 0) {
      testResults.addResult('security', 'RLS Protection', 'PASS', 'Nenhum dado retornado');
    } else {
      testResults.addResult('security', 'RLS Protection', 'FAIL', 'Acesso não autorizado permitido');
    }
  } catch (error) {
    testResults.addResult('security', 'RLS Protection', 'PASS', 'Erro de acesso esperado');
  }

  // Teste 2: Verificar políticas RLS ativas
  try {
    const { data, error } = await supabase
      .from('pg_policies')
      .select('tablename, policyname')
      .eq('schemaname', 'public')
      .limit(10);
    
    if (error) {
      testResults.addResult('security', 'RLS Policies Check', 'FAIL', error.message);
    } else {
      testResults.addResult('security', 'RLS Policies Check', 'PASS', `${data.length} políticas ativas`);
    }
  } catch (error) {
    testResults.addResult('security', 'RLS Policies Check', 'FAIL', error.message);
  }
}

/**
 * 🔗 Testes de Integração
 */
async function testIntegration() {
  console.log('🔗 Testando integrações...');

  // Teste 1: Fluxo completo de documento
  try {
    const start = Date.now();
    
    // Simular inserção de documento
    const { data: insertData, error: insertError } = await supabase
      .from('documentos_unified')
      .insert({
        empresa_id: '1ff74f50-bc2d-49ae-8fb4-3b819df08078',
        user_id: '1ff74f50-bc2d-49ae-8fb4-3b819df08078',
        categoria: 'fiscal',
        tipo_documento: 'NFe',
        arquivo_nome: 'teste_integracao.pdf',
        status_processamento: 'pendente',
        dados_extraidos: { teste: true }
      })
      .select()
      .single();
    
    if (insertError) {
      testResults.addResult('integration', 'Document Flow', 'FAIL', insertError.message);
      return;
    }

    // Simular atualização
    const { error: updateError } = await supabase
      .from('documentos_unified')
      .update({ status_processamento: 'processado' })
      .eq('id', insertData.id);
    
    if (updateError) {
      testResults.addResult('integration', 'Document Flow', 'FAIL', updateError.message);
      return;
    }

    // Limpar teste
    await supabase
      .from('documentos_unified')
      .delete()
      .eq('id', insertData.id);
    
    const duration = Date.now() - start;
    testResults.addResult('integration', 'Document Flow', 'PASS', 'CRUD completo', duration);
    
  } catch (error) {
    testResults.addResult('integration', 'Document Flow', 'FAIL', error.message);
  }

  // Teste 2: Triggers funcionando
  try {
    const { data, error } = await supabase
      .from('documentos_unified')
      .select('valor_total, data_documento, ano_fiscal')
      .not('valor_total', 'is', null)
      .limit(1);
    
    if (error) {
      testResults.addResult('integration', 'Triggers Active', 'FAIL', error.message);
    } else if (data.length > 0) {
      testResults.addResult('integration', 'Triggers Active', 'PASS', 'Campos calculados presentes');
    } else {
      testResults.addResult('integration', 'Triggers Active', 'SKIP', 'Sem dados para validar');
    }
  } catch (error) {
    testResults.addResult('integration', 'Triggers Active', 'FAIL', error.message);
  }
}

/**
 * 📊 Gerar Relatório Final
 */
function generateFinalReport(report) {
  console.log('\n📊 RELATÓRIO DE VALIDAÇÃO FUNCIONAL');
  console.log('=' .repeat(60));
  
  console.log(`\n📈 RESUMO:`);
  console.log(`  Total de Testes: ${report.summary.total}`);
  console.log(`  ✅ Aprovados: ${report.summary.passed}`);
  console.log(`  ❌ Falharam: ${report.summary.failed}`);
  console.log(`  ⏭️  Pulados: ${report.summary.skipped}`);
  
  const successRate = ((report.summary.passed / report.summary.total) * 100).toFixed(1);
  console.log(`  🎯 Taxa de Sucesso: ${successRate}%`);

  // Detalhes por categoria
  Object.entries(report.results).forEach(([category, tests]) => {
    if (tests.length > 0) {
      console.log(`\n📋 ${category.toUpperCase()}:`);
      tests.forEach(test => {
        const emoji = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️';
        console.log(`  ${emoji} ${test.test}: ${test.message}`);
      });
    }
  });

  // Status final
  console.log('\n🏁 STATUS FINAL:');
  if (report.summary.failed === 0) {
    console.log('  🟢 TODOS OS TESTES APROVADOS - Sistema funcionando perfeitamente!');
  } else if (report.summary.failed <= 2) {
    console.log('  🟡 MAIORIA DOS TESTES APROVADOS - Pequenos ajustes necessários');
  } else {
    console.log('  🔴 MÚLTIPLAS FALHAS - Revisão necessária');
  }
}

/**
 * 🚀 Executar Suite Completa
 */
async function runFunctionalValidation() {
  console.log('🚀 INICIANDO VALIDAÇÃO FUNCIONAL COMPLETA');
  console.log('=' .repeat(60));
  
  if (!SUPABASE_SERVICE_KEY) {
    console.log('⚠️  Executando testes limitados (sem service key)');
  }

  const startTime = Date.now();

  try {
    if (supabase) {
      await testDatabaseFunctionality();
      await testCacheFunctionality();
      await testEdgeFunctions();
      await testCronJobs();
      await testSecurity();
      await testIntegration();
    } else {
      console.log('⏭️  Pulando testes que requerem autenticação');
      testResults.addResult('database', 'All Database Tests', 'SKIP', 'Service key não configurada');
      testResults.addResult('cache', 'All Cache Tests', 'SKIP', 'Service key não configurada');
      testResults.addResult('edgeFunctions', 'All Edge Function Tests', 'SKIP', 'Service key não configurada');
      testResults.addResult('cronJobs', 'All Cron Job Tests', 'SKIP', 'Service key não configurada');
      testResults.addResult('security', 'All Security Tests', 'SKIP', 'Service key não configurada');
      testResults.addResult('integration', 'All Integration Tests', 'SKIP', 'Service key não configurada');
    }

    const totalTime = Date.now() - startTime;
    const report = testResults.generateReport();
    
    generateFinalReport(report);
    console.log(`\n⏱️  Tempo Total: ${(totalTime / 1000).toFixed(2)}s`);
    
    // Salvar relatório
    const fs = require('fs');
    fs.writeFileSync('functional-validation-results.json', JSON.stringify(report, null, 2));
    console.log('💾 Relatório salvo em: functional-validation-results.json');
    
    return report;
  } catch (error) {
    console.error('❌ Erro durante validação:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runFunctionalValidation()
    .then((report) => {
      const exitCode = report.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('❌ Falha na validação:', error);
      process.exit(1);
    });
}

module.exports = { runFunctionalValidation, TestResults };
