/**
 * 🚀 SUITE DE TESTES DE CARGA - ContabilidadePRO
 * Validar melhorias de performance após otimização
 */

const { createClient } = require('@supabase/supabase-js');
const { performance } = require('perf_hooks');

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://selnwgpyjctpjzdrfrey.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente SUPABASE não configuradas');
  process.exit(1);
}

// Clientes Supabase
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Configurações de teste
const TEST_CONFIG = {
  CONCURRENT_USERS: 10,
  REQUESTS_PER_USER: 20,
  CACHE_TEST_ITERATIONS: 100,
  QUERY_TEST_ITERATIONS: 50,
  EDGE_FUNCTION_ITERATIONS: 30
};

/**
 * 📊 Classe para coletar métricas
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      cache: [],
      queries: [],
      edgeFunctions: [],
      concurrent: []
    };
  }

  addMetric(category, metric) {
    if (this.metrics[category]) {
      this.metrics[category].push(metric);
    }
  }

  getStats(category) {
    const data = this.metrics[category];
    if (!data || data.length === 0) return null;

    const sorted = data.sort((a, b) => a - b);
    return {
      count: data.length,
      min: Math.min(...data),
      max: Math.max(...data),
      avg: data.reduce((a, b) => a + b, 0) / data.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  generateReport() {
    return {
      cache: this.getStats('cache'),
      queries: this.getStats('queries'),
      edgeFunctions: this.getStats('edgeFunctions'),
      concurrent: this.getStats('concurrent'),
      timestamp: new Date().toISOString()
    };
  }
}

const metrics = new MetricsCollector();

/**
 * 🔄 Teste de Performance de Cache
 */
async function testCachePerformance() {
  console.log('🔄 Testando performance de cache...');
  
  const cacheKeys = [
    'test_fiscal_cache_key',
    'test_ai_cache_key', 
    'test_ocr_cache_key',
    'test_cnpj_cache_key'
  ];

  for (let i = 0; i < TEST_CONFIG.CACHE_TEST_ITERATIONS; i++) {
    const key = cacheKeys[i % cacheKeys.length];
    const testData = { test: true, iteration: i, timestamp: Date.now() };
    
    try {
      // Teste de escrita
      const writeStart = performance.now();
      await supabaseService
        .from('ai_cache')
        .upsert({
          cache_key: `${key}_${i}`,
          cache_data: testData,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          user_id: '1ff74f50-bc2d-49ae-8fb4-3b819df08078'
        });
      const writeTime = performance.now() - writeStart;

      // Teste de leitura
      const readStart = performance.now();
      await supabaseService
        .from('ai_cache')
        .select('*')
        .eq('cache_key', `${key}_${i}`)
        .single();
      const readTime = performance.now() - readStart;

      metrics.addMetric('cache', writeTime + readTime);
      
      if (i % 20 === 0) {
        console.log(`  Cache test ${i}/${TEST_CONFIG.CACHE_TEST_ITERATIONS} - ${(writeTime + readTime).toFixed(2)}ms`);
      }
    } catch (error) {
      console.warn(`  Cache test ${i} failed:`, error.message);
    }
  }
}

/**
 * 📊 Teste de Performance de Queries
 */
async function testQueryPerformance() {
  console.log('📊 Testando performance de queries...');

  const queries = [
    // Query na tabela unificada
    () => supabaseService
      .from('documentos_unified')
      .select('id, arquivo_nome, categoria, status_processamento, created_at')
      .eq('categoria', 'fiscal')
      .order('created_at', { ascending: false })
      .limit(10),
    
    // Query com filtro por empresa
    () => supabaseService
      .from('documentos_unified')
      .select('*')
      .eq('empresa_id', '1ff74f50-bc2d-49ae-8fb4-3b819df08078')
      .limit(5),
    
    // Query de analytics
    () => supabaseService
      .from('analytics_events')
      .select('event_type, count(*)')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      .limit(20),
    
    // Query de empresas
    () => supabaseService
      .from('empresas')
      .select('id, nome_fantasia, cnpj, ativa')
      .eq('ativa', true)
      .limit(10)
  ];

  for (let i = 0; i < TEST_CONFIG.QUERY_TEST_ITERATIONS; i++) {
    const query = queries[i % queries.length];
    
    try {
      const start = performance.now();
      await query();
      const duration = performance.now() - start;
      
      metrics.addMetric('queries', duration);
      
      if (i % 10 === 0) {
        console.log(`  Query test ${i}/${TEST_CONFIG.QUERY_TEST_ITERATIONS} - ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.warn(`  Query test ${i} failed:`, error.message);
    }
  }
}

/**
 * ⚡ Teste de Performance de Edge Functions
 */
async function testEdgeFunctionPerformance() {
  console.log('⚡ Testando performance de Edge Functions...');

  const functions = [
    {
      name: 'fiscal-service',
      payload: {
        action: 'calculate_das',
        empresa_id: '1ff74f50-bc2d-49ae-8fb4-3b819df08078',
        receita_bruta: 50000,
        periodo: '2024-01'
      }
    },
    {
      name: 'assistente-contabil-ia',
      payload: {
        message: 'Como calcular DAS para MEI?',
        user_id: '1ff74f50-bc2d-49ae-8fb4-3b819df08078'
      }
    }
  ];

  for (let i = 0; i < TEST_CONFIG.EDGE_FUNCTION_ITERATIONS; i++) {
    const func = functions[i % functions.length];
    
    try {
      const start = performance.now();
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify(func.payload)
      });
      
      if (response.ok) {
        await response.json();
      }
      
      const duration = performance.now() - start;
      metrics.addMetric('edgeFunctions', duration);
      
      if (i % 5 === 0) {
        console.log(`  Edge Function test ${i}/${TEST_CONFIG.EDGE_FUNCTION_ITERATIONS} - ${duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.warn(`  Edge Function test ${i} failed:`, error.message);
    }
  }
}

/**
 * 👥 Teste de Carga Concorrente
 */
async function testConcurrentLoad() {
  console.log('👥 Testando carga concorrente...');

  const concurrentTests = [];
  
  for (let user = 0; user < TEST_CONFIG.CONCURRENT_USERS; user++) {
    const userTest = async () => {
      const userMetrics = [];
      
      for (let req = 0; req < TEST_CONFIG.REQUESTS_PER_USER; req++) {
        try {
          const start = performance.now();
          
          // Simular operação típica do usuário
          await supabaseService
            .from('documentos_unified')
            .select('id, arquivo_nome, categoria')
            .limit(5);
          
          const duration = performance.now() - start;
          userMetrics.push(duration);
        } catch (error) {
          console.warn(`User ${user} request ${req} failed:`, error.message);
        }
      }
      
      return userMetrics;
    };
    
    concurrentTests.push(userTest());
  }

  const results = await Promise.all(concurrentTests);
  
  // Consolidar métricas de todos os usuários
  results.forEach(userMetrics => {
    userMetrics.forEach(metric => {
      metrics.addMetric('concurrent', metric);
    });
  });
}

/**
 * 🧪 Teste das Funções Consolidadas de Cron
 */
async function testConsolidatedFunctions() {
  console.log('🧪 Testando funções consolidadas...');

  const functions = [
    'unified_backup_manager_simple',
    'smart_analytics_refresh_simple',
    'intelligent_compliance_monitor_simple',
    'intelligent_maintenance_simple'
  ];

  for (const funcName of functions) {
    try {
      const start = performance.now();
      
      const { data, error } = await supabaseService
        .rpc(funcName);
      
      const duration = performance.now() - start;
      
      if (error) {
        console.warn(`  ❌ ${funcName}: ${error.message}`);
      } else {
        console.log(`  ✅ ${funcName}: ${duration.toFixed(2)}ms - ${data || 'Success'}`);
      }
    } catch (error) {
      console.warn(`  ❌ ${funcName}: ${error.message}`);
    }
  }
}

/**
 * 📈 Gerar Relatório de Performance
 */
function generatePerformanceReport(report) {
  console.log('\n📈 RELATÓRIO DE PERFORMANCE');
  console.log('=' .repeat(50));
  
  if (report.cache) {
    console.log('\n🔄 CACHE PERFORMANCE:');
    console.log(`  Requests: ${report.cache.count}`);
    console.log(`  Avg: ${report.cache.avg.toFixed(2)}ms`);
    console.log(`  P95: ${report.cache.p95.toFixed(2)}ms`);
    console.log(`  Min/Max: ${report.cache.min.toFixed(2)}ms / ${report.cache.max.toFixed(2)}ms`);
  }

  if (report.queries) {
    console.log('\n📊 QUERY PERFORMANCE:');
    console.log(`  Requests: ${report.queries.count}`);
    console.log(`  Avg: ${report.queries.avg.toFixed(2)}ms`);
    console.log(`  P95: ${report.queries.p95.toFixed(2)}ms`);
    console.log(`  Min/Max: ${report.queries.min.toFixed(2)}ms / ${report.queries.max.toFixed(2)}ms`);
  }

  if (report.edgeFunctions) {
    console.log('\n⚡ EDGE FUNCTIONS PERFORMANCE:');
    console.log(`  Requests: ${report.edgeFunctions.count}`);
    console.log(`  Avg: ${report.edgeFunctions.avg.toFixed(2)}ms`);
    console.log(`  P95: ${report.edgeFunctions.p95.toFixed(2)}ms`);
    console.log(`  Min/Max: ${report.edgeFunctions.min.toFixed(2)}ms / ${report.edgeFunctions.max.toFixed(2)}ms`);
  }

  if (report.concurrent) {
    console.log('\n👥 CONCURRENT LOAD PERFORMANCE:');
    console.log(`  Total Requests: ${report.concurrent.count}`);
    console.log(`  Avg: ${report.concurrent.avg.toFixed(2)}ms`);
    console.log(`  P95: ${report.concurrent.p95.toFixed(2)}ms`);
    console.log(`  Min/Max: ${report.concurrent.min.toFixed(2)}ms / ${report.concurrent.max.toFixed(2)}ms`);
  }

  // Análise de performance
  console.log('\n🎯 ANÁLISE DE PERFORMANCE:');
  
  if (report.cache && report.cache.avg < 100) {
    console.log('  ✅ Cache: EXCELENTE (< 100ms)');
  } else if (report.cache && report.cache.avg < 200) {
    console.log('  ⚠️  Cache: BOM (< 200ms)');
  } else if (report.cache) {
    console.log('  ❌ Cache: PRECISA OTIMIZAÇÃO (> 200ms)');
  }

  if (report.queries && report.queries.avg < 50) {
    console.log('  ✅ Queries: EXCELENTE (< 50ms)');
  } else if (report.queries && report.queries.avg < 100) {
    console.log('  ⚠️  Queries: BOM (< 100ms)');
  } else if (report.queries) {
    console.log('  ❌ Queries: PRECISA OTIMIZAÇÃO (> 100ms)');
  }

  if (report.edgeFunctions && report.edgeFunctions.avg < 1000) {
    console.log('  ✅ Edge Functions: EXCELENTE (< 1s)');
  } else if (report.edgeFunctions && report.edgeFunctions.avg < 3000) {
    console.log('  ⚠️  Edge Functions: BOM (< 3s)');
  } else if (report.edgeFunctions) {
    console.log('  ❌ Edge Functions: PRECISA OTIMIZAÇÃO (> 3s)');
  }
}

/**
 * 🚀 Executar Suite Completa de Testes
 */
async function runLoadTestSuite() {
  console.log('🚀 INICIANDO SUITE DE TESTES DE CARGA');
  console.log('=' .repeat(50));
  console.log(`Usuários Concorrentes: ${TEST_CONFIG.CONCURRENT_USERS}`);
  console.log(`Requests por Usuário: ${TEST_CONFIG.REQUESTS_PER_USER}`);
  console.log(`Iterações de Cache: ${TEST_CONFIG.CACHE_TEST_ITERATIONS}`);
  console.log(`Iterações de Query: ${TEST_CONFIG.QUERY_TEST_ITERATIONS}`);
  console.log(`Iterações de Edge Functions: ${TEST_CONFIG.EDGE_FUNCTION_ITERATIONS}`);
  console.log('');

  const startTime = performance.now();

  try {
    // Executar testes sequencialmente
    await testCachePerformance();
    await testQueryPerformance();
    await testEdgeFunctionPerformance();
    await testConsolidatedFunctions();
    await testConcurrentLoad();

    const totalTime = performance.now() - startTime;
    
    // Gerar relatório
    const report = metrics.generateReport();
    generatePerformanceReport(report);
    
    console.log(`\n⏱️  Tempo Total de Execução: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`📅 Timestamp: ${report.timestamp}`);
    
    // Salvar relatório em arquivo
    const fs = require('fs');
    fs.writeFileSync(
      'load-test-results.json', 
      JSON.stringify(report, null, 2)
    );
    console.log('💾 Relatório salvo em: load-test-results.json');
    
    return report;
  } catch (error) {
    console.error('❌ Erro durante execução dos testes:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runLoadTestSuite()
    .then(() => {
      console.log('\n✅ Suite de testes concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na execução dos testes:', error);
      process.exit(1);
    });
}

module.exports = {
  runLoadTestSuite,
  MetricsCollector,
  TEST_CONFIG
};
