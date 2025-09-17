'use client'

/**
 * 🚀 EXEMPLO DE USO DO AI CONTEXT SERVICE REFATORADO
 * 
 * Este arquivo demonstra como usar o novo AIContextService
 * com Singleton Pattern, Result Pattern e Error Handling estruturado
 */

import { useState, useCallback } from 'react'
import { AIContextService } from '@/services/ai-context-service'
import { logger } from '@/services/structured-logger'
import { unifiedCacheService } from '@/services/unified-cache-service'
import type { EnhancedAIContext, ContextualData } from '@/services/ai-context-service'

// =====================================================
// EXEMPLO 1: USO BÁSICO COM SINGLETON
// =====================================================

export async function exemploUsoBasico() {
  // ✅ Usar getInstance() ao invés de new
  const aiContext = AIContextService.getInstance()
  
  const context: EnhancedAIContext = {
    userId: 'user-123',
    empresaId: 'empresa-456',
    includeFinancialData: true,
    includeObligations: true,
    includeDocuments: false,
    includeInsights: true,
    timeRange: 'last_3_months'
  }

  // ✅ Usar Result Pattern para tratamento de erros
  const result = await aiContext.collectContextualData(context)
  
  if (result.success) {
    console.log('✅ Dados coletados com sucesso:', result.data)
    
    // Acessar dados da empresa
    if (result.data.empresa) {
      console.log('📊 Empresa:', result.data.empresa.nome)
      console.log('💰 Cálculos recentes:', result.data.empresa.calculos_recentes.length)
      console.log('📋 Obrigações pendentes:', result.data.empresa.obrigacoes_pendentes.length)
      console.log('🎯 Score de conformidade:', result.data.empresa.insights.score_conformidade)
    }
  } else {
    // ✅ Error handling estruturado
    console.error('❌ Erro ao coletar dados:', result.error.message)
    console.error('🔍 Código do erro:', result.error.code)
    console.error('📝 Contexto:', result.error.context)
    console.error('🆔 Trace ID:', result.error.traceId)
  }
}

// =====================================================
// EXEMPLO 2: MONITORAMENTO DE PERFORMANCE
// =====================================================

export async function exemploMonitoramento() {
  const aiContext = AIContextService.getInstance()
  
  // ✅ Verificar uso de recursos
  const resourceUsage = aiContext.getResourceUsage()
  console.log('📊 Uso de recursos:', {
    memoryUsage: `${(resourceUsage.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
    cacheSize: resourceUsage.cacheSize,
    activeConnections: resourceUsage.activeConnections,
    uptime: `${(resourceUsage.uptime / 1000 / 60).toFixed(2)} min`
  })

  // ✅ Verificar métricas do cache
  const cacheMetrics = unifiedCacheService.getMetrics()
  console.log('💾 Métricas do cache:', {
    hitRate: `${(cacheMetrics.hitRate * 100).toFixed(2)}%`,
    totalRequests: cacheMetrics.totalRequests,
    cacheSize: cacheMetrics.cacheSize,
    evictions: cacheMetrics.evictions
  })

  // ✅ Estatísticas detalhadas do cache
  const detailedStats = unifiedCacheService.getDetailedStats()
  console.log('📈 Estatísticas detalhadas:', {
    entriesByStrategy: detailedStats.entriesByStrategy,
    mostAccessedEntry: detailedStats.mostAccessedEntry,
    oldestEntry: detailedStats.oldestEntry
  })
}

// =====================================================
// EXEMPLO 3: GERENCIAMENTO DE CACHE INTELIGENTE
// =====================================================

export async function exemploCacheInteligente() {
  // ✅ Invalidar cache por regras de negócio
  const deletedCount = unifiedCacheService.invalidateByRules([
    'calculo-new',
    'empresa-update'
  ])
  console.log(`🗑️ Invalidadas ${deletedCount} entradas do cache`)

  // ✅ Invalidar cache por padrão
  const patternDeleted = unifiedCacheService.invalidatePattern('empresa-123')
  console.log(`🎯 Invalidadas ${patternDeleted} entradas por padrão`)

  // ✅ Limpar cache completamente se necessário
  // unifiedCacheService.clear()
}

// =====================================================
// EXEMPLO 4: LOGGING ESTRUTURADO
// =====================================================

export async function exemploLogging() {
  // ✅ Logs estruturados com contexto
  logger.info('Iniciando operação de exemplo', {
    operation: 'exemplo_logging',
    userId: 'user-123',
    timestamp: new Date().toISOString()
  })

  try {
    // Simular operação
    await new Promise(resolve => setTimeout(resolve, 100))
    
    logger.info('Operação concluída com sucesso', {
      operation: 'exemplo_logging',
      duration: 100,
      success: true
    })
  } catch (error) {
    logger.error('Operação falhou', {
      operation: 'exemplo_logging',
      error: error instanceof Error ? error.message : String(error),
      success: false
    })
  }

  // ✅ Buscar logs por filtros
  const recentLogs = logger.getLogs({
    operation: 'exemplo_logging',
    since: new Date(Date.now() - 60000) // Últimos 60 segundos
  })
  console.log(`📝 Encontrados ${recentLogs.length} logs recentes`)

  // ✅ Estatísticas dos logs
  const logStats = logger.getLogStats()
  console.log('📊 Estatísticas dos logs:', logStats)
}

// =====================================================
// EXEMPLO 5: CLEANUP DE RECURSOS
// =====================================================

export async function exemploCleanup() {
  const aiContext = AIContextService.getInstance()
  
  // ✅ Cleanup manual se necessário (normalmente automático)
  await aiContext.cleanup()
  console.log('🧹 Cleanup do AIContextService concluído')

  // ✅ Cleanup do cache
  unifiedCacheService.destroy()
  console.log('🧹 Cleanup do UnifiedCacheService concluído')
}

// =====================================================
// EXEMPLO 6: TRATAMENTO DE ERROS AVANÇADO
// =====================================================

export async function exemploTratamentoErros() {
  const aiContext = AIContextService.getInstance()
  
  const context: EnhancedAIContext = {
    userId: 'user-invalid', // ID inválido para forçar erro
    empresaId: 'empresa-inexistente',
    includeFinancialData: true
  }

  const result = await aiContext.collectContextualData(context)
  
  if (!result.success) {
    const error = result.error
    
    // ✅ Análise detalhada do erro
    console.log('🔍 Análise do erro:', {
      message: error.message,
      code: error.code,
      context: error.context,
      traceId: error.traceId,
      originalError: error.originalError?.message
    })

    // ✅ Ações baseadas no tipo de erro
    switch (error.code) {
      case 'EMPRESA_FETCH_FAILED':
        console.log('💡 Sugestão: Verificar se a empresa existe e se o usuário tem acesso')
        break
      case 'CONTEXT_COLLECTION_FAILED':
        console.log('💡 Sugestão: Verificar conectividade e tentar novamente')
        break
      default:
        console.log('💡 Sugestão: Contatar suporte técnico')
    }

    // ✅ Log estruturado do erro
    logger.error('Exemplo de tratamento de erro', {
      errorCode: error.code,
      errorMessage: error.message,
      traceId: error.traceId,
      context: error.context
    })
  }
}

// =====================================================
// EXEMPLO 7: USO EM COMPONENTE REACT
// =====================================================

export function useAIContextExample() {
  // ✅ Hook personalizado para usar o AIContextService
  const [contextData, setContextData] = useState<ContextualData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadContextData = useCallback(async (context: EnhancedAIContext) => {
    setLoading(true)
    setError(null)

    try {
      const aiContext = AIContextService.getInstance()
      const result = await aiContext.collectContextualData(context)

      if (result.success) {
        setContextData(result.data)
      } else {
        setError(result.error.message)
        logger.error('Failed to load context data in component', {
          errorCode: result.error.code,
          errorMessage: result.error.message,
          traceId: result.error.traceId
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('Unexpected error in useAIContextExample', {
        error: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    contextData,
    loading,
    error,
    loadContextData,
    // ✅ Funções utilitárias
    clearCache: () => unifiedCacheService.clear(),
    getMetrics: () => unifiedCacheService.getMetrics(),
    getResourceUsage: () => AIContextService.getInstance().getResourceUsage()
  }
}

// =====================================================
// FUNÇÃO PRINCIPAL PARA TESTAR TODOS OS EXEMPLOS
// =====================================================

export async function executarTodosExemplos() {
  console.log('🚀 Iniciando exemplos do AI Context Service refatorado...\n')

  try {
    console.log('1️⃣ Exemplo de uso básico:')
    await exemploUsoBasico()
    console.log('\n')

    console.log('2️⃣ Exemplo de monitoramento:')
    await exemploMonitoramento()
    console.log('\n')

    console.log('3️⃣ Exemplo de cache inteligente:')
    await exemploCacheInteligente()
    console.log('\n')

    console.log('4️⃣ Exemplo de logging:')
    await exemploLogging()
    console.log('\n')

    console.log('5️⃣ Exemplo de tratamento de erros:')
    await exemploTratamentoErros()
    console.log('\n')

    console.log('✅ Todos os exemplos executados com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao executar exemplos:', error)
    logger.error('Failed to execute examples', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
