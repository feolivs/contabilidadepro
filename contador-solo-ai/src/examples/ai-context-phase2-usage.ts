'use client'

/**
 * 🚀 EXEMPLO DE USO DO AI CONTEXT SERVICE - FASE 2
 * 
 * Este arquivo demonstra como usar as novas funcionalidades da Fase 2:
 * - Queries Paralelas Otimizadas
 * - Cache Preditivo com ML
 * - Monitoring Avançado
 * - Auto-scaling Baseado em Uso
 */

import { AIContextService } from '@/services/ai-context-service'
import { parallelQueryEngine } from '@/services/parallel-query-engine'
import { predictiveCacheService } from '@/services/predictive-cache-service'
import { advancedMonitoringService } from '@/services/advanced-monitoring-service'
import { autoScalingService } from '@/services/auto-scaling-service'
import type { EnhancedAIContext } from '@/services/ai-context-service'

// =====================================================
// EXEMPLO 1: QUERIES PARALELAS OTIMIZADAS
// =====================================================

export async function exemploQueriesParalelas() {
  console.log('🚀 Exemplo: Queries Paralelas Otimizadas\n')

  const empresaId = 'empresa-123'
  const userId = 'user-456'

  // ✅ Criar queries otimizadas para empresa
  const queries = parallelQueryEngine.createEmpresaQueries(empresaId, userId, {
    includeFinancialData: true,
    includeObligations: true,
    includeDocuments: true,
    timeRange: 'last_3_months'
  })

  console.log(`📋 Criadas ${queries.length} queries paralelas:`)
  queries.forEach(query => {
    console.log(`  - ${query.name} (prioridade: ${query.priority})`)
  })

  // ✅ Executar batch de queries
  const batchResult = await parallelQueryEngine.executeBatch({
    id: `empresa-batch-${Date.now()}`,
    queries,
    maxConcurrency: 4,
    failureStrategy: 'continue_on_error'
  })

  if (batchResult.success) {
    const { data } = batchResult
    console.log('\n✅ Batch executado com sucesso:')
    console.log(`  📊 Total: ${data.results.length} queries`)
    console.log(`  ✅ Sucessos: ${data.successCount}`)
    console.log(`  ❌ Falhas: ${data.failureCount}`)
    console.log(`  💾 Cache hits: ${data.cacheHitCount}`)
    console.log(`  ⏱️ Duração total: ${data.totalDuration}ms`)

    // Analisar resultados por query
    data.results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      const cache = result.fromCache ? '💾' : '🔄'
      console.log(`  ${status} ${cache} ${result.queryId}: ${result.duration}ms`)
    })
  } else {
    console.error('❌ Erro no batch:', batchResult.error.message)
  }

  // ✅ Verificar métricas das queries
  const queryMetrics = parallelQueryEngine.getQueryMetrics()
  console.log('\n📈 Métricas das queries:')
  for (const [queryId, metrics] of queryMetrics) {
    console.log(`  📊 ${queryId}:`)
    console.log(`    - Execuções: ${metrics.totalExecutions}`)
    console.log(`    - Taxa de sucesso: ${((metrics.successCount / metrics.totalExecutions) * 100).toFixed(1)}%`)
    console.log(`    - Tempo médio: ${metrics.averageDuration.toFixed(0)}ms`)
    console.log(`    - Cache hits: ${metrics.cacheHitCount}`)
  }
}

// =====================================================
// EXEMPLO 2: CACHE PREDITIVO COM ML
// =====================================================

export async function exemploCachePreditivo() {
  console.log('\n🧠 Exemplo: Cache Preditivo com ML\n')

  const userId = 'user-456'

  // ✅ Simular padrões de acesso
  console.log('📝 Registrando padrões de acesso...')
  
  // Simular acessos em horários diferentes
  const accessPatterns = [
    { resourceType: 'empresa-completa', resourceId: 'empresa-123', hour: 9 },
    { resourceType: 'calculos-recentes', resourceId: 'empresa-123', hour: 9 },
    { resourceType: 'empresa-completa', resourceId: 'empresa-456', hour: 14 },
    { resourceType: 'documentos-insights', resourceId: 'empresa-123', hour: 16 }
  ]

  accessPatterns.forEach(pattern => {
    predictiveCacheService.recordAccess(
      userId,
      pattern.resourceType,
      pattern.resourceId,
      {
        sessionDuration: 300000, // 5 min
        previousAccess: ['dashboard']
      }
    )
  })

  // ✅ Gerar predições
  const predictionsResult = await predictiveCacheService.generatePredictions(userId)
  
  if (predictionsResult.success) {
    const predictions = predictionsResult.data
    console.log(`🔮 Geradas ${predictions.length} predições:`)
    
    predictions.forEach(prediction => {
      console.log(`  📊 ${prediction.resourceType}:${prediction.resourceId}`)
      console.log(`    - Confiança: ${(prediction.confidence * 100).toFixed(1)}%`)
      console.log(`    - Prioridade: ${prediction.priority}`)
      console.log(`    - Razão: ${prediction.reason}`)
      console.log(`    - Estimativa: ${prediction.estimatedAccessTime.toLocaleTimeString()}`)
    })
  } else {
    console.error('❌ Erro nas predições:', predictionsResult.error.message)
  }

  // ✅ Executar prefetch preditivo
  const prefetchResult = await predictiveCacheService.executePrefetch(userId)
  
  if (prefetchResult.success) {
    console.log(`\n🚀 Prefetch executado: ${prefetchResult.data} recursos carregados`)
  }

  // ✅ Verificar estatísticas do sistema preditivo
  const stats = predictiveCacheService.getStatistics()
  console.log('\n📊 Estatísticas do Cache Preditivo:')
  console.log(`  🎯 Modelos ativos: ${stats.totalModels}`)
  console.log(`  📈 Precisão média: ${(stats.averageAccuracy * 100).toFixed(1)}%`)
  console.log(`  🔢 Total de predições: ${stats.totalPredictions}`)
  console.log(`  ✅ Predições corretas: ${stats.correctPredictions}`)
  console.log(`  📝 Tamanho do histórico: ${stats.historySize}`)
  console.log(`  🔮 Predições ativas: ${stats.activePredictions}`)
}

// =====================================================
// EXEMPLO 3: MONITORING AVANÇADO
// =====================================================

export async function exemploMonitoringAvancado() {
  console.log('\n📊 Exemplo: Monitoring Avançado\n')

  // ✅ Verificar saúde do sistema
  const healthResult = await advancedMonitoringService.checkHealth()
  
  if (healthResult.success) {
    const health = healthResult.data
    console.log(`🏥 Status geral do sistema: ${health.overall}`)
    console.log(`⏱️ Uptime: ${health.uptime}%`)
    console.log(`🕐 Última verificação: ${health.lastCheck.toLocaleTimeString()}`)
    
    console.log('\n🔧 Status dos componentes:')
    Object.entries(health.components).forEach(([name, component]) => {
      const statusIcon = component.status === 'healthy' ? '✅' : 
                        component.status === 'warning' ? '⚠️' : '❌'
      console.log(`  ${statusIcon} ${name}: ${component.status}`)
      console.log(`    - Tempo de resposta: ${component.responseTime}ms`)
      console.log(`    - Taxa de erro: ${(component.errorRate * 100).toFixed(2)}%`)
      if (component.lastError) {
        console.log(`    - Último erro: ${component.lastError}`)
      }
    })
  }

  // ✅ Coletar métricas do sistema
  const metricsResult = await advancedMonitoringService.collectMetrics()
  
  if (metricsResult.success) {
    const metrics = metricsResult.data
    console.log('\n📈 Métricas do sistema:')
    console.log('  🚀 Performance:')
    console.log(`    - Tempo médio de resposta: ${metrics.performance.avgResponseTime}ms`)
    console.log(`    - P95: ${metrics.performance.p95ResponseTime}ms`)
    console.log(`    - P99: ${metrics.performance.p99ResponseTime}ms`)
    console.log(`    - Throughput: ${metrics.performance.throughput} req/min`)
    console.log(`    - Taxa de erro: ${(metrics.performance.errorRate * 100).toFixed(2)}%`)
    
    console.log('  💾 Cache:')
    console.log(`    - Hit rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`)
    console.log(`    - Miss rate: ${(metrics.cache.missRate * 100).toFixed(1)}%`)
    console.log(`    - Taxa de eviction: ${(metrics.cache.evictionRate * 100).toFixed(2)}%`)
    console.log(`    - Precisão preditiva: ${(metrics.cache.predictiveAccuracy * 100).toFixed(1)}%`)
    
    console.log('  🔧 Recursos:')
    console.log(`    - Uso de memória: ${(metrics.resources.memoryUsage / 1024 / 1024).toFixed(1)} MB`)
    console.log(`    - Uso de CPU: ${(metrics.resources.cpuUsage * 100).toFixed(1)}%`)
    console.log(`    - Tamanho do cache: ${metrics.resources.cacheSize}`)
    console.log(`    - Conexões ativas: ${metrics.resources.activeConnections}`)
  }

  // ✅ Verificar alertas ativos
  const activeAlerts = advancedMonitoringService.getActiveAlerts()
  console.log(`\n🚨 Alertas ativos: ${activeAlerts.length}`)
  
  activeAlerts.forEach(alert => {
    const severityIcon = alert.severity === 'critical' ? '🔴' : 
                        alert.severity === 'high' ? '🟠' : 
                        alert.severity === 'medium' ? '🟡' : '🟢'
    console.log(`  ${severityIcon} ${alert.title}`)
    console.log(`    - Tipo: ${alert.type}`)
    console.log(`    - Descrição: ${alert.description}`)
    console.log(`    - Criado em: ${alert.timestamp.toLocaleTimeString()}`)
    console.log(`    - Ações: ${alert.actions.length}`)
  })

  // ✅ Obter estatísticas de performance
  const perfStats = advancedMonitoringService.getPerformanceStats(1) // Última hora
  console.log('\n⚡ Estatísticas de performance (última hora):')
  console.log(`  📊 Tempo médio: ${perfStats.avgResponseTime.toFixed(0)}ms`)
  console.log(`  📈 Tempo máximo: ${perfStats.maxResponseTime.toFixed(0)}ms`)
  console.log(`  📉 Tempo mínimo: ${perfStats.minResponseTime.toFixed(0)}ms`)
  console.log(`  🎯 Taxa de erro: ${(perfStats.errorRate * 100).toFixed(2)}%`)
  console.log(`  🚀 Throughput: ${perfStats.throughput.toFixed(1)} req/min`)
}

// =====================================================
// EXEMPLO 4: AUTO-SCALING BASEADO EM USO
// =====================================================

export async function exemploAutoScaling() {
  console.log('\n🔄 Exemplo: Auto-scaling Baseado em Uso\n')

  // ✅ Analisar e executar scaling
  const scalingResult = await autoScalingService.analyzeAndScale()
  
  if (scalingResult.success) {
    const decision = scalingResult.data
    console.log('🎯 Decisão de scaling:')
    console.log(`  📊 Ação: ${decision.action}`)
    console.log(`  💭 Razão: ${decision.reason}`)
    console.log(`  🎯 Confiança: ${(decision.confidence * 100).toFixed(1)}%`)
    
    if (Object.keys(decision.parameters).length > 0) {
      console.log('  ⚙️ Parâmetros:')
      Object.entries(decision.parameters).forEach(([key, value]) => {
        console.log(`    - ${key}: ${value}`)
      })
    }
    
    console.log('  📈 Impacto estimado:')
    console.log(`    - Melhoria de performance: ${(decision.estimatedImpact.performanceImprovement * 100).toFixed(1)}%`)
    console.log(`    - Uso de recursos: ${(decision.estimatedImpact.resourceUsage * 100).toFixed(1)}%`)
    console.log(`    - Custo: ${(decision.estimatedImpact.cost * 100).toFixed(1)}%`)
  }

  // ✅ Obter recomendações de otimização
  const recommendations = autoScalingService.getOptimizationRecommendations()
  console.log('\n💡 Recomendações de otimização:')
  
  if (recommendations.immediate.length > 0) {
    console.log('  🚨 Imediatas:')
    recommendations.immediate.forEach(rec => console.log(`    - ${rec}`))
  }
  
  if (recommendations.shortTerm.length > 0) {
    console.log('  📅 Curto prazo:')
    recommendations.shortTerm.forEach(rec => console.log(`    - ${rec}`))
  }
  
  if (recommendations.longTerm.length > 0) {
    console.log('  🎯 Longo prazo:')
    recommendations.longTerm.forEach(rec => console.log(`    - ${rec}`))
  }

  // ✅ Verificar histórico de scaling
  const scalingHistory = autoScalingService.getScalingHistory()
  console.log(`\n📊 Histórico de scaling: ${scalingHistory.length} decisões`)
  
  const recentDecisions = scalingHistory.slice(-5)
  recentDecisions.forEach((decision, index) => {
    console.log(`  ${index + 1}. ${decision.action} - ${decision.reason}`)
    console.log(`     Confiança: ${(decision.confidence * 100).toFixed(1)}%`)
  })

  // ✅ Verificar limites de recursos
  const resourceLimits = autoScalingService.getResourceLimits()
  console.log('\n⚙️ Limites de recursos:')
  console.log(`  💾 Memória máxima: ${(resourceLimits.maxMemoryUsage / 1024 / 1024).toFixed(0)} MB`)
  console.log(`  📦 Cache máximo: ${resourceLimits.maxCacheSize} entradas`)
  console.log(`  🔄 Queries simultâneas: ${resourceLimits.maxConcurrentQueries}`)
  console.log(`  🔗 Conexões máximas: ${resourceLimits.maxConnectionCount}`)
  
  console.log('  🚨 Thresholds de emergência:')
  console.log(`    - Memória: ${(resourceLimits.emergencyThresholds.memoryUsage / 1024 / 1024).toFixed(0)} MB`)
  console.log(`    - Taxa de erro: ${(resourceLimits.emergencyThresholds.errorRate * 100).toFixed(1)}%`)
  console.log(`    - Tempo de resposta: ${resourceLimits.emergencyThresholds.responseTime}ms`)
}

// =====================================================
// EXEMPLO 5: USO INTEGRADO COM AI CONTEXT SERVICE
// =====================================================

export async function exemploUsoIntegrado() {
  console.log('\n🔗 Exemplo: Uso Integrado - AI Context Service Fase 2\n')

  const aiContext = AIContextService.getInstance()
  const userId = 'user-456'
  const empresaId = 'empresa-123'

  // ✅ Usar o novo sistema integrado
  const context: EnhancedAIContext = {
    userId,
    empresaId,
    includeFinancialData: true,
    includeObligations: true,
    includeDocuments: true,
    includeInsights: true,
    timeRange: 'last_3_months'
  }

  console.log('🚀 Coletando dados contextuais com Fase 2...')
  const result = await aiContext.collectContextualData(context)

  if (result.success) {
    const data = result.data
    console.log('✅ Dados coletados com sucesso!')
    
    if (data.empresa) {
      console.log(`\n🏢 Empresa: ${data.empresa.nome}`)
      console.log(`📊 Cálculos recentes: ${data.empresa.calculos_recentes.length}`)
      console.log(`📋 Obrigações pendentes: ${data.empresa.obrigacoes_pendentes.length}`)
      console.log(`📄 Documentos recentes: ${data.empresa.documentos_recentes.length}`)
      
      console.log('\n🎯 Insights:')
      console.log(`  📈 Score de conformidade: ${data.empresa.insights.score_conformidade}%`)
      console.log(`  💰 Carga tributária média: ${data.empresa.insights.carga_tributaria_media.toFixed(2)}%`)
      console.log(`  📊 Tendência: ${data.empresa.insights.tendencia_faturamento}`)
      console.log(`  🚨 Obrigações críticas: ${data.empresa.insights.obrigacoes_criticas}`)
      console.log(`  💡 Economia potencial: R$ ${data.empresa.insights.economia_potencial.toFixed(2)}`)
      
      if (data.empresa.insights.alertas_importantes.length > 0) {
        console.log('  ⚠️ Alertas importantes:')
        data.empresa.insights.alertas_importantes.forEach(alert => {
          console.log(`    - ${alert}`)
        })
      }
    }
  } else {
    console.error('❌ Erro ao coletar dados:', result.error.message)
  }

  // ✅ Obter métricas avançadas do sistema
  console.log('\n📊 Obtendo métricas avançadas...')
  const metricsResult = await aiContext.getAdvancedMetrics()
  
  if (metricsResult.success) {
    const metrics = metricsResult.data
    console.log('✅ Métricas coletadas:')
    console.log(`  ⚡ Performance: ${Object.keys(metrics.performance).length} métricas`)
    console.log(`  💾 Cache: ${Object.keys(metrics.cache).length} métricas`)
    console.log(`  🔍 Queries: ${Object.keys(metrics.queries).length} tipos monitorados`)
    console.log(`  🧠 Predições: ${Object.keys(metrics.predictions).length} estatísticas`)
    console.log(`  🔄 Scaling: ${Object.keys(metrics.scaling).length} decisões recentes`)
  }

  // ✅ Executar prefetch preditivo
  console.log('\n🚀 Executando prefetch preditivo...')
  const prefetchResult = await aiContext.executePredictivePrefetch(userId)
  
  if (prefetchResult.success) {
    console.log(`✅ Prefetch concluído: ${prefetchResult.data} recursos carregados`)
  }
}

// =====================================================
// FUNÇÃO PRINCIPAL PARA EXECUTAR TODOS OS EXEMPLOS
// =====================================================

export async function executarExemplosFase2() {
  console.log('🚀 INICIANDO EXEMPLOS DA FASE 2 - AI CONTEXT SERVICE\n')
  console.log('=' .repeat(60))

  try {
    await exemploQueriesParalelas()
    console.log('\n' + '='.repeat(60))
    
    await exemploCachePreditivo()
    console.log('\n' + '='.repeat(60))
    
    await exemploMonitoringAvancado()
    console.log('\n' + '='.repeat(60))
    
    await exemploAutoScaling()
    console.log('\n' + '='.repeat(60))
    
    await exemploUsoIntegrado()
    console.log('\n' + '='.repeat(60))

    console.log('\n🎉 TODOS OS EXEMPLOS DA FASE 2 EXECUTADOS COM SUCESSO!')
    console.log('\n📊 Resumo das funcionalidades demonstradas:')
    console.log('  ✅ Queries Paralelas Otimizadas')
    console.log('  ✅ Cache Preditivo com Machine Learning')
    console.log('  ✅ Monitoring Avançado em Tempo Real')
    console.log('  ✅ Auto-scaling Baseado em Uso')
    console.log('  ✅ Integração Completa no AI Context Service')

  } catch (error) {
    console.error('❌ Erro ao executar exemplos da Fase 2:', error)
  }
}
