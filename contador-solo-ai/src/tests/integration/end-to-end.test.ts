/**
 * Testes de Integração End-to-End
 * Valida todo o fluxo desde banco de dados até interface
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { cacheManager } from '@/lib/cache/cache-manager'

// ============================================
// CONFIGURAÇÃO DOS TESTES
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Dados de teste
const testEmpresa = {
  id: 'test-empresa-e2e-001',
  nome: 'Empresa Teste E2E',
  cnpj: '12.345.678/0001-90',
  regime_tributario: 'Simples Nacional',
  atividade_principal: 'Consultoria em TI',
  user_id: 'test-user-e2e-001'
}

const testDocumento = {
  id: 'test-doc-e2e-001',
  empresa_id: testEmpresa.id,
  nome_arquivo: 'nota-fiscal-teste.pdf',
  tipo_documento: 'NFe',
  valor_total: 1500.00,
  data_documento: new Date().toISOString(),
  status_processamento: 'processado',
  dados_estruturados: {
    numero_documento: '12345',
    serie: '001',
    chave_acesso: 'test-key-123',
    valor_produtos: 1200.00,
    valor_impostos: 300.00
  },
  confianca_estruturacao: 0.95
}

// ============================================
// SETUP E TEARDOWN
// ============================================

beforeAll(async () => {
  console.log('🚀 Iniciando testes E2E...')
  
  // Limpar cache antes dos testes
  cacheManager.clear()
  
  // Criar dados de teste no banco
  await setupTestData()
})

afterAll(async () => {
  console.log('🧹 Limpando dados de teste...')
  
  // Limpar dados de teste
  await cleanupTestData()
  
  // Limpar cache
  cacheManager.clear()
})

beforeEach(() => {
  // Limpar cache antes de cada teste
  cacheManager.clear()
})

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function setupTestData() {
  try {
    // Criar empresa de teste
    const { error: empresaError } = await supabase
      .from('empresas')
      .upsert(testEmpresa)
    
    if (empresaError) {
      console.error('Erro ao criar empresa de teste:', empresaError)
    }

    // Criar documento de teste
    const { error: docError } = await supabase
      .from('documentos')
      .upsert(testDocumento)
    
    if (docError) {
      console.error('Erro ao criar documento de teste:', docError)
    }

    console.log('✅ Dados de teste criados')
  } catch (error) {
    console.error('❌ Erro no setup:', error)
  }
}

async function cleanupTestData() {
  try {
    // Remover documento de teste
    await supabase
      .from('documentos')
      .delete()
      .eq('id', testDocumento.id)

    // Remover empresa de teste
    await supabase
      .from('empresas')
      .delete()
      .eq('id', testEmpresa.id)

    console.log('✅ Dados de teste removidos')
  } catch (error) {
    console.error('❌ Erro no cleanup:', error)
  }
}

async function callEdgeFunction(functionName: string, body: any) {
  const { data, error } = await supabase.functions.invoke(functionName, { body })
  
  if (error) {
    throw new Error(`Edge Function ${functionName} error: ${error.message}`)
  }
  
  return data
}

// ============================================
// TESTES DE INTEGRAÇÃO
// ============================================

describe('🔄 Testes End-to-End - Fluxo Completo', () => {
  
  describe('📊 1. Banco de Dados e Migrations', () => {
    it('deve ter todas as tabelas criadas', async () => {
      const tables = [
        'empresas',
        'documentos', 
        'dados_estruturados',
        'metricas_financeiras',
        'compliance_analysis',
        'ai_insights',
        'cache_entries',
        'performance_metrics'
      ]

      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        expect(error).toBeNull()
        expect(data).toBeDefined()
      }
    })

    it('deve ter as funções helper criadas', async () => {
      const { data, error } = await supabase
        .rpc('get_empresa_dashboard_complete', {
          p_empresa_id: testEmpresa.id
        })

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('deve ter RLS configurado corretamente', async () => {
      // Tentar acessar dados sem autenticação deve falhar
      const publicClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      
      const { data, error } = await publicClient
        .from('empresas')
        .select('*')
        .eq('id', testEmpresa.id)

      // Deve retornar vazio ou erro devido ao RLS
      expect(data?.length || 0).toBe(0)
    })
  })

  describe('⚡ 2. Edge Functions', () => {
    it('deve processar empresa-context-service corretamente', async () => {
      const result = await callEdgeFunction('empresa-context-service', {
        empresa_id: testEmpresa.id,
        include_insights: true,
        include_compliance: true,
        include_metrics: true,
        insight_type: 'completo'
      })

      expect(result.success).toBe(true)
      expect(result.empresa).toBeDefined()
      expect(result.empresa.id).toBe(testEmpresa.id)
      expect(result.financial_summary).toBeDefined()
      expect(result.compliance_summary).toBeDefined()
      expect(result.processing_time).toBeGreaterThan(0)
    })

    it('deve processar documentos-service corretamente', async () => {
      const result = await callEdgeFunction('documentos-service', {
        operation: 'calculate_metrics',
        empresa_id: testEmpresa.id,
        user_id: 'test-user-id',
        period_months: 6
      })

      expect(result.success).toBe(true)
      expect(result.resumo_executivo).toBeDefined()
      expect(result.metricas_mensais).toBeDefined()
      expect(result.processing_time).toBeGreaterThan(0)
    })

    it('deve gerar insights de IA corretamente', async () => {
      const result = await callEdgeFunction('documentos-service', {
        operation: 'generate_insights',
        empresa_id: testEmpresa.id,
        user_id: 'test-user-id',
        options: { insight_type: 'financeiro' }
      })

      expect(result.success).toBe(true)
      expect(result.resumo_executivo).toBeDefined()
      expect(result.analise_financeira).toBeDefined()
      expect(result.confianca_analise).toBeGreaterThan(0)
    })

    it('deve processar análise de compliance corretamente', async () => {
      const result = await callEdgeFunction('documentos-service', {
        operation: 'analyze_compliance',
        empresa_id: testEmpresa.id,
        user_id: 'test-user-id'
      })

      expect(result.success).toBe(true)
      expect(result.score_geral).toBeGreaterThanOrEqual(0)
      expect(result.score_geral).toBeLessThanOrEqual(100)
      expect(result.nivel).toBeDefined()
      expect(result.consistencia_dados).toBeDefined()
    })
  })

  describe('💾 3. Sistema de Cache', () => {
    it('deve armazenar e recuperar dados do cache', () => {
      const testData = { test: 'data', timestamp: Date.now() }
      const strategy = {
        name: 'test-strategy',
        ttl: 5 * 60 * 1000,
        priority: 'medium' as const,
        tags: ['test'],
        compression: false,
        persistence: false
      }

      // Armazenar no cache
      cacheManager.set('test-key', testData, strategy)

      // Recuperar do cache
      const cached = cacheManager.get('test-key')
      
      expect(cached).toEqual(testData)
    })

    it('deve invalidar cache por tags', () => {
      const strategy = {
        name: 'test-strategy',
        ttl: 5 * 60 * 1000,
        priority: 'medium' as const,
        tags: ['empresa', 'test'],
        compression: false,
        persistence: false
      }

      cacheManager.set('test-key-1', { data: 1 }, strategy)
      cacheManager.set('test-key-2', { data: 2 }, { ...strategy, tags: ['financeiro'] })

      // Invalidar por tag
      cacheManager.invalidateByTags(['empresa'])

      // Primeiro deve estar invalidado, segundo não
      expect(cacheManager.get('test-key-1')).toBeNull()
      expect(cacheManager.get('test-key-2')).not.toBeNull()
    })

    it('deve fazer cleanup automático de entradas expiradas', () => {
      const expiredStrategy = {
        name: 'expired-strategy',
        ttl: 1, // 1ms - expira imediatamente
        priority: 'low' as const,
        tags: ['test'],
        compression: false,
        persistence: false
      }

      cacheManager.set('expired-key', { data: 'expired' }, expiredStrategy)

      // Aguardar expiração
      setTimeout(() => {
        cacheManager.cleanup()
        expect(cacheManager.get('expired-key')).toBeNull()
      }, 10)
    })

    it('deve gerar estatísticas corretas', () => {
      // Limpar cache
      cacheManager.clear()

      const strategy = {
        name: 'stats-strategy',
        ttl: 5 * 60 * 1000,
        priority: 'medium' as const,
        tags: ['test'],
        compression: false,
        persistence: false
      }

      // Adicionar algumas entradas
      cacheManager.set('stats-1', { data: 1 }, strategy)
      cacheManager.set('stats-2', { data: 2 }, strategy)

      // Fazer alguns hits
      cacheManager.get('stats-1')
      cacheManager.get('stats-1')
      cacheManager.get('stats-2')

      // Fazer alguns misses
      cacheManager.get('non-existent-1')
      cacheManager.get('non-existent-2')

      const stats = cacheManager.getStats()
      
      expect(stats.totalEntries).toBe(2)
      expect(stats.hitRate).toBeGreaterThan(0)
      expect(stats.missRate).toBeGreaterThan(0)
      expect(stats.hitRate + stats.missRate).toBeCloseTo(100, 1)
    })
  })

  describe('🔗 4. Integração Hooks + Edge Functions + Cache', () => {
    it('deve integrar empresa insights com cache', async () => {
      // Simular chamada do hook (sem React)
      const mockHookCall = async () => {
        // Verificar cache primeiro
        const cached = cacheManager.get('empresa-insights-cached', {
          empresaId: testEmpresa.id,
          insight_type: 'completo'
        })

        if (cached) {
          return { ...cached, fromCache: true }
        }

        // Chamar Edge Function
        const result = await callEdgeFunction('empresa-context-service', {
          empresa_id: testEmpresa.id,
          include_insights: true,
          include_compliance: true,
          include_metrics: true,
          insight_type: 'completo'
        })

        // Armazenar no cache
        const strategy = {
          name: 'empresa-insights',
          ttl: 10 * 60 * 1000,
          priority: 'high' as const,
          tags: ['empresa', 'insights'],
          compression: true,
          persistence: true
        }

        cacheManager.set('empresa-insights-cached', result, strategy, {
          empresaId: testEmpresa.id,
          insight_type: 'completo'
        })

        return { ...result, fromCache: false }
      }

      // Primeira chamada - deve vir da Edge Function
      const firstCall = await mockHookCall()
      expect(firstCall.success).toBe(true)
      expect(firstCall.fromCache).toBe(false)

      // Segunda chamada - deve vir do cache
      const secondCall = await mockHookCall()
      expect(secondCall.success).toBe(true)
      expect(secondCall.fromCache).toBe(true)
    })

    it('deve integrar métricas financeiras com cache', async () => {
      const mockMetricasCall = async () => {
        const cacheKey = 'metricas-financeiras'
        const params = { empresaId: testEmpresa.id, periodMonths: 6 }
        
        const cached = cacheManager.get(cacheKey, params)
        if (cached) return { ...cached, fromCache: true }

        const result = await callEdgeFunction('documentos-service', {
          operation: 'calculate_metrics',
          empresa_id: testEmpresa.id,
          user_id: 'test-user-id',
          period_months: 6
        })

        const strategy = {
          name: 'metricas-financeiras',
          ttl: 5 * 60 * 1000,
          priority: 'high' as const,
          tags: ['financeiro', 'metricas'],
          compression: true,
          persistence: true
        }

        cacheManager.set(cacheKey, result, strategy, params)
        return { ...result, fromCache: false }
      }

      const firstCall = await mockMetricasCall()
      expect(firstCall.success).toBe(true)
      expect(firstCall.fromCache).toBe(false)

      const secondCall = await mockMetricasCall()
      expect(secondCall.success).toBe(true)
      expect(secondCall.fromCache).toBe(true)
    })
  })

  describe('🎯 5. Fluxo Completo de Usuário', () => {
    it('deve simular fluxo completo: login → dashboard → insights', async () => {
      // 1. Simular dados da empresa (já criados no setup)
      expect(testEmpresa.id).toBeDefined()

      // 2. Buscar insights da empresa
      const insights = await callEdgeFunction('empresa-context-service', {
        empresa_id: testEmpresa.id,
        include_insights: true,
        include_compliance: true,
        include_metrics: true
      })

      expect(insights.success).toBe(true)
      expect(insights.empresa.nome).toBe(testEmpresa.nome)

      // 3. Buscar métricas financeiras
      const metricas = await callEdgeFunction('documentos-service', {
        operation: 'calculate_metrics',
        empresa_id: testEmpresa.id,
        user_id: 'test-user-id',
        period_months: 6
      })

      expect(metricas.success).toBe(true)
      expect(metricas.resumo_executivo).toBeDefined()

      // 4. Buscar análise de compliance
      const compliance = await callEdgeFunction('documentos-service', {
        operation: 'analyze_compliance',
        empresa_id: testEmpresa.id,
        user_id: 'test-user-id'
      })

      expect(compliance.success).toBe(true)
      expect(compliance.score_geral).toBeGreaterThanOrEqual(0)

      // 5. Gerar insights de IA
      const aiInsights = await callEdgeFunction('documentos-service', {
        operation: 'generate_insights',
        empresa_id: testEmpresa.id,
        user_id: 'test-user-id',
        options: { insight_type: 'completo' }
      })

      expect(aiInsights.success).toBe(true)
      expect(aiInsights.resumo_executivo).toBeDefined()

      // 6. Verificar que todos os dados são consistentes
      expect(insights.empresa.id).toBe(testEmpresa.id)
      expect(metricas.empresa_id).toBe(testEmpresa.id)
      expect(compliance.empresa_id).toBe(testEmpresa.id)
      expect(aiInsights.empresa_id).toBe(testEmpresa.id)
    })

    it('deve simular invalidação de cache após atualização', async () => {
      const cacheKey = 'test-invalidation'
      const strategy = {
        name: 'test-strategy',
        ttl: 10 * 60 * 1000,
        priority: 'medium' as const,
        tags: ['empresa', 'financeiro'],
        compression: false,
        persistence: false
      }

      // 1. Armazenar dados no cache
      cacheManager.set(cacheKey, { version: 1 }, strategy)
      expect(cacheManager.get(cacheKey)).toEqual({ version: 1 })

      // 2. Simular atualização de dados da empresa
      const { error } = await supabase
        .from('empresas')
        .update({ nome: 'Empresa Teste E2E Atualizada' })
        .eq('id', testEmpresa.id)

      expect(error).toBeNull()

      // 3. Invalidar cache relacionado à empresa
      cacheManager.invalidateByTags(['empresa'])

      // 4. Verificar que cache foi invalidado
      expect(cacheManager.get(cacheKey)).toBeNull()

      // 5. Restaurar nome original
      await supabase
        .from('empresas')
        .update({ nome: testEmpresa.nome })
        .eq('id', testEmpresa.id)
    })
  })

  describe('📈 6. Performance e Otimização', () => {
    it('deve ter performance adequada nas Edge Functions', async () => {
      const startTime = Date.now()

      const result = await callEdgeFunction('empresa-context-service', {
        empresa_id: testEmpresa.id,
        include_insights: true,
        include_compliance: true,
        include_metrics: true
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(10000) // Menos de 10 segundos
      expect(result.processing_time).toBeLessThan(5000) // Menos de 5 segundos de processamento
    })

    it('deve ter hit rate adequado no cache', () => {
      // Limpar estatísticas
      cacheManager.clear()

      const strategy = {
        name: 'performance-test',
        ttl: 5 * 60 * 1000,
        priority: 'medium' as const,
        tags: ['test'],
        compression: false,
        persistence: false
      }

      // Simular padrão de uso real
      const keys = ['key1', 'key2', 'key3']
      
      // Armazenar dados
      keys.forEach(key => {
        cacheManager.set(key, { data: key }, strategy)
      })

      // Simular acessos (80% hits, 20% misses)
      for (let i = 0; i < 100; i++) {
        if (i < 80) {
          // Hit
          const key = keys[i % keys.length]
          cacheManager.get(key)
        } else {
          // Miss
          cacheManager.get(`non-existent-${i}`)
        }
      }

      const stats = cacheManager.getStats()
      expect(stats.hitRate).toBeGreaterThan(70) // Pelo menos 70% de hit rate
    })
  })
})

// ============================================
// TESTES DE STRESS
// ============================================

describe('💪 Testes de Stress', () => {
  it('deve suportar múltiplas chamadas simultâneas', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      callEdgeFunction('empresa-context-service', {
        empresa_id: testEmpresa.id,
        include_insights: false, // Mais rápido para teste de stress
        include_compliance: false,
        include_metrics: false
      })
    )

    const results = await Promise.allSettled(promises)
    const successful = results.filter(r => r.status === 'fulfilled').length

    expect(successful).toBeGreaterThan(7) // Pelo menos 70% de sucesso
  })

  it('deve gerenciar cache sob alta carga', () => {
    const strategy = {
      name: 'stress-test',
      ttl: 1 * 60 * 1000,
      priority: 'low' as const,
      tags: ['stress'],
      compression: false,
      persistence: false
    }

    // Adicionar muitas entradas
    for (let i = 0; i < 500; i++) {
      cacheManager.set(`stress-key-${i}`, { data: i }, strategy)
    }

    // Verificar que o sistema ainda funciona
    const stats = cacheManager.getStats()
    expect(stats.totalEntries).toBeGreaterThan(0)
    expect(stats.totalEntries).toBeLessThanOrEqual(1000) // Limite configurado

    // Fazer muitos acessos
    for (let i = 0; i < 1000; i++) {
      cacheManager.get(`stress-key-${i % 500}`)
    }

    const finalStats = cacheManager.getStats()
    expect(finalStats.hitRate).toBeGreaterThan(0)
  })
})
