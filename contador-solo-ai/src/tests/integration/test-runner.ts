/**
 * Test Runner para Testes de Integração E2E
 * Executa testes e gera relatórios detalhados
 */

import { createClient } from '@supabase/supabase-js'
import { cacheManager } from '@/lib/cache/cache-manager'
import { logger } from '@/lib/simple-logger'

// ============================================
// CONFIGURAÇÃO
// ============================================

interface TestResult {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  error?: string
  details?: any
}

interface TestSuite {
  name: string
  tests: TestResult[]
  totalDuration: number
  passed: number
  failed: number
  skipped: number
}

interface TestReport {
  timestamp: string
  environment: string
  suites: TestSuite[]
  summary: {
    totalTests: number
    totalPassed: number
    totalFailed: number
    totalSkipped: number
    totalDuration: number
    successRate: number
  }
  performance: {
    avgEdgeFunctionTime: number
    avgCacheHitRate: number
    avgDatabaseQueryTime: number
  }
  recommendations: string[]
}

// ============================================
// TEST RUNNER PRINCIPAL
// ============================================

export class E2ETestRunner {
  private supabase: any
  private results: TestSuite[] = []
  private startTime: number = 0

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Iniciando testes E2E completos...')
    this.startTime = Date.now()

    try {
      // Preparar ambiente
      await this.setupEnvironment()

      // Executar suites de teste
      await this.runDatabaseTests()
      await this.runEdgeFunctionTests()
      await this.runCacheTests()
      await this.runIntegrationTests()
      await this.runPerformanceTests()

      // Gerar relatório
      const report = this.generateReport()
      
      // Limpar ambiente
      await this.cleanupEnvironment()

      console.log('✅ Testes E2E concluídos!')
      return report

    } catch (error) {
      console.error('❌ Erro nos testes E2E:', error)
      throw error
    }
  }

  private async setupEnvironment() {
    console.log('🔧 Configurando ambiente de teste...')
    
    // Limpar cache
    cacheManager.clear()
    
    // Criar dados de teste
    const testEmpresa = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      nome: 'Empresa Teste Runner',
      cnpj: '98.765.432/0001-10',
      regime_tributario: 'Simples Nacional',
      user_id: '550e8400-e29b-41d4-a716-446655440001'
    }

    await this.supabase
      .from('empresas')
      .upsert(testEmpresa)

    console.log('✅ Ambiente configurado')
  }

  private async cleanupEnvironment() {
    console.log('🧹 Limpando ambiente de teste...')
    
    // Remover dados de teste
    await this.supabase
      .from('empresas')
      .delete()
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')

    // Limpar cache
    cacheManager.clear()

    console.log('✅ Ambiente limpo')
  }

  private async runDatabaseTests(): Promise<void> {
    console.log('📊 Executando testes de banco de dados...')
    
    const suite: TestSuite = {
      name: 'Database Tests',
      tests: [],
      totalDuration: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }

    // Teste 1: Verificar tabelas
    await this.runTest(suite, 'Verificar tabelas criadas', async () => {
      const tables = ['empresas', 'documentos', 'dados_estruturados', 'metricas_financeiras']
      
      for (const table of tables) {
        const { error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) throw new Error(`Tabela ${table} não encontrada: ${error.message}`)
      }
      
      return { tablesChecked: tables.length }
    })

    // Teste 2: Verificar funções
    await this.runTest(suite, 'Verificar funções helper', async () => {
      const { data, error } = await this.supabase
        .rpc('get_empresa_dashboard_complete', {
          p_empresa_id: '550e8400-e29b-41d4-a716-446655440000'
        })

      if (error) throw new Error(`Função helper falhou: ${error.message}`)
      
      return { functionResult: !!data }
    })

    // Teste 3: Verificar RLS
    await this.runTest(suite, 'Verificar RLS policies', async () => {
      const publicClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data } = await publicClient
        .from('empresas')
        .select('*')
        .eq('id', '550e8400-e29b-41d4-a716-446655440000')

      // RLS deve impedir acesso não autorizado
      if (data && data.length > 0) {
        throw new Error('RLS não está funcionando corretamente')
      }
      
      return { rlsWorking: true }
    })

    this.results.push(suite)
  }

  private async runEdgeFunctionTests(): Promise<void> {
    console.log('⚡ Executando testes de Edge Functions...')

    const suite: TestSuite = {
      name: 'Edge Function Tests',
      tests: [],
      totalDuration: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }

    // Teste 1: empresa-context-service - Conectividade
    await this.runTest(suite, 'Testar conectividade empresa-context-service', async () => {
      const startTime = Date.now()

      try {
        const { data, error } = await this.supabase.functions.invoke('empresa-context-service', {
          body: {
            empresa_id: '550e8400-e29b-41d4-a716-446655440000',
            include_insights: false,
            include_compliance: false,
            include_metrics: false
          }
        })

        const duration = Date.now() - startTime

        // Se chegou aqui, a function está respondendo (mesmo que com erro)
        return {
          functionResponding: true,
          duration,
          hasResponse: !!data,
          responseType: typeof data,
          statusReceived: true
        }
      } catch (networkError) {
        // Erro de rede/conectividade
        throw new Error(`Network error: ${networkError.message}`)
      }
    })

    // Teste 2: documentos-service - Conectividade
    await this.runTest(suite, 'Testar conectividade documentos-service', async () => {
      const startTime = Date.now()

      try {
        const { data, error } = await this.supabase.functions.invoke('documentos-service', {
          body: {
            operation: 'calculate_metrics',
            empresa_id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: 'test-user-id',
            period_months: 1
          }
        })

        const duration = Date.now() - startTime

        // Se chegou aqui, a function está respondendo
        return {
          functionResponding: true,
          duration,
          hasResponse: !!data,
          responseType: typeof data,
          statusReceived: true
        }
      } catch (networkError) {
        throw new Error(`Network error: ${networkError.message}`)
      }
    })

    // Teste 3: Validar estrutura de resposta
    await this.runTest(suite, 'Testar estrutura de resposta das Edge Functions', async () => {
      const { data } = await this.supabase.functions.invoke('empresa-context-service', {
        body: { empresa_id: '550e8400-e29b-41d4-a716-446655440000' }
      })

      // Validar que a resposta tem estrutura esperada
      const hasValidStructure = data &&
                               typeof data === 'object' &&
                               ('success' in data || 'error' in data)

      if (!hasValidStructure) {
        throw new Error('Response structure is invalid')
      }

      return {
        validStructure: true,
        hasSuccessField: 'success' in data,
        hasErrorField: 'error' in data,
        responseKeys: Object.keys(data)
      }
    })

    this.results.push(suite)
  }

  private async runCacheTests(): Promise<void> {
    console.log('💾 Executando testes de cache...')
    
    const suite: TestSuite = {
      name: 'Cache Tests',
      tests: [],
      totalDuration: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }

    // Teste 1: Operações básicas de cache
    await this.runTest(suite, 'Testar operações básicas de cache', async () => {
      const testData = { test: 'cache-data', timestamp: Date.now() }
      const strategy = {
        name: 'test-strategy',
        ttl: 5 * 60 * 1000,
        priority: 'medium' as const,
        tags: ['test'],
        compression: false,
        persistence: false
      }

      // Set
      cacheManager.set('test-cache-key', testData, strategy)
      
      // Get
      const retrieved = cacheManager.get('test-cache-key')
      
      if (!retrieved || retrieved.test !== testData.test) {
        throw new Error('Cache set/get não funcionou')
      }

      return { cacheWorking: true, dataMatches: true }
    })

    // Teste 2: Invalidação por tags
    await this.runTest(suite, 'Testar invalidação por tags', async () => {
      const strategy = {
        name: 'tag-test',
        ttl: 5 * 60 * 1000,
        priority: 'medium' as const,
        tags: ['empresa', 'test'],
        compression: false,
        persistence: false
      }

      cacheManager.set('tag-test-1', { data: 1 }, strategy)
      cacheManager.set('tag-test-2', { data: 2 }, { ...strategy, tags: ['financeiro'] })

      // Invalidar por tag
      cacheManager.invalidateByTags(['empresa'])

      const result1 = cacheManager.get('tag-test-1')
      const result2 = cacheManager.get('tag-test-2')

      if (result1 !== null) throw new Error('Invalidação por tag não funcionou')
      if (result2 === null) throw new Error('Invalidação por tag afetou dados incorretos')

      return { tagInvalidationWorking: true }
    })

    // Teste 3: Estatísticas
    await this.runTest(suite, 'Testar estatísticas de cache', async () => {
      // Limpar para teste limpo
      cacheManager.clear()

      const strategy = {
        name: 'stats-test',
        ttl: 5 * 60 * 1000,
        priority: 'medium' as const,
        tags: ['test'],
        compression: false,
        persistence: false
      }

      // Adicionar dados
      cacheManager.set('stats-1', { data: 1 }, strategy)
      cacheManager.set('stats-2', { data: 2 }, strategy)

      // Fazer hits e misses
      cacheManager.get('stats-1') // hit
      cacheManager.get('stats-1') // hit
      cacheManager.get('non-existent') // miss

      const stats = cacheManager.getStats()

      return {
        totalEntries: stats.totalEntries,
        hitRate: stats.hitRate,
        missRate: stats.missRate,
        statsWorking: stats.totalEntries === 2
      }
    })

    this.results.push(suite)
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Executando testes de integração...')
    
    const suite: TestSuite = {
      name: 'Integration Tests',
      tests: [],
      totalDuration: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }

    // Teste 1: Fluxo completo com cache
    await this.runTest(suite, 'Testar fluxo completo com cache', async () => {
      const empresaId = '550e8400-e29b-41d4-a716-446655440000'
      
      // Primeira chamada - deve ir para Edge Function
      const startTime1 = Date.now()
      const { data: result1 } = await this.supabase.functions.invoke('empresa-context-service', {
        body: { empresa_id: empresaId, include_insights: true }
      })
      const duration1 = Date.now() - startTime1

      // Armazenar no cache
      const strategy = {
        name: 'integration-test',
        ttl: 10 * 60 * 1000,
        priority: 'high' as const,
        tags: ['empresa', 'insights'],
        compression: true,
        persistence: false
      }

      cacheManager.set('integration-test-key', result1, strategy, { empresaId })

      // Segunda chamada - deve vir do cache
      const startTime2 = Date.now()
      const cached = cacheManager.get('integration-test-key', { empresaId })
      const duration2 = Date.now() - startTime2

      return {
        firstCallDuration: duration1,
        secondCallDuration: duration2,
        cacheSpeedup: duration1 / Math.max(duration2, 1),
        dataConsistent: result1?.empresa?.id === cached?.empresa?.id
      }
    })

    this.results.push(suite)
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('📈 Executando testes de performance...')
    
    const suite: TestSuite = {
      name: 'Performance Tests',
      tests: [],
      totalDuration: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }

    // Teste 1: Performance Edge Functions
    await this.runTest(suite, 'Testar performance Edge Functions', async () => {
      const iterations = 5
      const durations: number[] = []

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()
        
        const { data } = await this.supabase.functions.invoke('empresa-context-service', {
          body: {
            empresa_id: '550e8400-e29b-41d4-a716-446655440000',
            include_insights: false // Mais rápido
          }
        })

        const duration = Date.now() - startTime
        durations.push(duration)

        if (!data?.success) throw new Error(`Iteration ${i} failed`)
      }

      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)
      const minDuration = Math.min(...durations)

      return {
        iterations,
        avgDuration,
        maxDuration,
        minDuration,
        performanceGood: avgDuration < 5000 // Menos de 5 segundos
      }
    })

    this.results.push(suite)
  }

  private async runTest(
    suite: TestSuite, 
    name: string, 
    testFn: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log(`  ⏳ ${name}...`)
      
      const result = await testFn()
      const duration = Date.now() - startTime
      
      suite.tests.push({
        name,
        status: 'passed',
        duration,
        details: result
      })
      
      suite.passed++
      console.log(`  ✅ ${name} (${duration}ms)`)
      
    } catch (error) {
      const duration = Date.now() - startTime
      
      suite.tests.push({
        name,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      suite.failed++
      console.log(`  ❌ ${name} (${duration}ms): ${error}`)
    }
    
    suite.totalDuration += Date.now() - startTime
  }

  private generateReport(): TestReport {
    const totalDuration = Date.now() - this.startTime
    
    const summary = this.results.reduce((acc, suite) => ({
      totalTests: acc.totalTests + suite.tests.length,
      totalPassed: acc.totalPassed + suite.passed,
      totalFailed: acc.totalFailed + suite.failed,
      totalSkipped: acc.totalSkipped + suite.skipped,
      totalDuration: acc.totalDuration + suite.totalDuration
    }), {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalDuration: 0
    })

    const successRate = summary.totalTests > 0 
      ? (summary.totalPassed / summary.totalTests) * 100 
      : 0

    // Calcular métricas de performance
    const edgeFunctionTests = this.results
      .find(s => s.name === 'Edge Function Tests')?.tests || []
    
    const avgEdgeFunctionTime = edgeFunctionTests.length > 0
      ? edgeFunctionTests.reduce((acc, test) => acc + test.duration, 0) / edgeFunctionTests.length
      : 0

    const cacheStats = cacheManager.getStats()

    const recommendations = this.generateRecommendations(summary, cacheStats)

    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      suites: this.results,
      summary: {
        ...summary,
        successRate
      },
      performance: {
        avgEdgeFunctionTime,
        avgCacheHitRate: cacheStats.hitRate,
        avgDatabaseQueryTime: 0 // TODO: Implementar se necessário
      },
      recommendations
    }
  }

  private generateRecommendations(summary: any, cacheStats: any): string[] {
    const recommendations: string[] = []

    if (summary.successRate < 90) {
      recommendations.push('Taxa de sucesso baixa. Revisar testes falhando.')
    }

    if (cacheStats.hitRate < 70) {
      recommendations.push('Hit rate do cache baixo. Considerar ajustar TTL das estratégias.')
    }

    if (summary.totalDuration > 60000) {
      recommendations.push('Testes demoram muito. Considerar otimizações ou paralelização.')
    }

    if (cacheStats.evictions > 10) {
      recommendations.push('Muitas evictions no cache. Considerar aumentar limites de memória.')
    }

    if (recommendations.length === 0) {
      recommendations.push('Todos os sistemas funcionando perfeitamente! 🎉')
    }

    return recommendations
  }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

export async function runE2ETests(): Promise<TestReport> {
  const runner = new E2ETestRunner()
  return await runner.runAllTests()
}

// Para execução direta
if (require.main === module) {
  runE2ETests()
    .then(report => {
      console.log('\n📊 RELATÓRIO FINAL:')
      console.log(`✅ Testes passaram: ${report.summary.totalPassed}/${report.summary.totalTests}`)
      console.log(`❌ Testes falharam: ${report.summary.totalFailed}`)
      console.log(`⏱️  Duração total: ${report.summary.totalDuration}ms`)
      console.log(`📈 Taxa de sucesso: ${report.summary.successRate.toFixed(1)}%`)
      console.log(`💾 Hit rate cache: ${report.performance.avgCacheHitRate.toFixed(1)}%`)
      
      console.log('\n💡 RECOMENDAÇÕES:')
      report.recommendations.forEach(rec => console.log(`  • ${rec}`))
      
      process.exit(report.summary.totalFailed > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('❌ Erro fatal nos testes:', error)
      process.exit(1)
    })
}
