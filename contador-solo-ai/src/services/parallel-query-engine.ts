'use client'

import type { Database } from '@/types/database.types'
import { createClient } from '@supabase/supabase-js'
import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA PARALLEL QUERY ENGINE
// =====================================================

export interface QueryDefinition<T = any> {
  id: string
  name: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  timeout: number
  retries: number
  cacheStrategy?: string
  dependencies?: string[]
  condition?: () => boolean
  executor: () => Promise<T>
}

export interface QueryBatch {
  id: string
  queries: QueryDefinition[]
  maxConcurrency: number
  failureStrategy: 'fail_fast' | 'continue_on_error' | 'retry_failed'
}

export interface QueryResult<T = any> {
  queryId: string
  success: boolean
  data?: T
  error?: ContextError
  duration: number
  fromCache: boolean
  retryCount: number
}

export interface BatchResult {
  batchId: string
  results: QueryResult[]
  totalDuration: number
  successCount: number
  failureCount: number
  cacheHitCount: number
}

// =====================================================
// PARALLEL QUERY ENGINE
// =====================================================

export class ParallelQueryEngine {
  private supabase: ReturnType<typeof createClient<Database>>
  private activeQueries = new Map<string, Promise<any>>()
  private queryMetrics = new Map<string, QueryMetrics>()
  private readonly MAX_CONCURRENT_QUERIES = 10
  private readonly DEFAULT_TIMEOUT = 30000 // 30s

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Executa um lote de queries em paralelo com otimizações
   */
  async executeBatch(batch: QueryBatch): Promise<Result<BatchResult, ContextError>> {
    const operationContext = createOperationContext('execute_query_batch', 'system', { batchId: batch.id })
    
    return await measureOperation('executeBatch', async () => {
      try {
        logger.info('Starting query batch execution', {
          batchId: batch.id,
          queryCount: batch.queries.length,
          maxConcurrency: batch.maxConcurrency,
          traceId: operationContext.traceId
        })

        // Ordenar queries por prioridade e dependências
        const sortedQueries = this.sortQueriesByPriority(batch.queries)
        
        // Executar queries em grupos baseado na concorrência máxima
        const results: QueryResult[] = []
        const chunks = this.chunkQueries(sortedQueries, batch.maxConcurrency)

        for (const chunk of chunks) {
          const chunkResults = await this.executeQueryChunk(chunk, batch.failureStrategy)
          results.push(...chunkResults)

          // Verificar se deve parar em caso de falha
          if (batch.failureStrategy === 'fail_fast' && chunkResults.some(r => !r.success)) {
            break
          }
        }

        const batchResult: BatchResult = {
          batchId: batch.id,
          results,
          totalDuration: Date.now() - operationContext.startTime,
          successCount: results.filter(r => r.success).length,
          failureCount: results.filter(r => !r.success).length,
          cacheHitCount: results.filter(r => r.fromCache).length
        }

        logger.info('Query batch completed', {
          batchId: batch.id,
          successCount: batchResult.successCount,
          failureCount: batchResult.failureCount,
          cacheHitCount: batchResult.cacheHitCount,
          totalDuration: batchResult.totalDuration,
          traceId: operationContext.traceId
        })

        return { success: true, data: batchResult }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to execute query batch',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { batchId: batch.id },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        logger.error('Query batch execution failed', {
          error: contextError.toJSON(),
          batchId: batch.id,
          traceId: operationContext.traceId
        })

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Executa uma única query com otimizações
   */
  async executeQuery<T>(query: QueryDefinition<T>): Promise<QueryResult<T>> {
    const startTime = Date.now()
    let retryCount = 0

    // Verificar condição se especificada
    if (query.condition && !query.condition()) {
      return {
        queryId: query.id,
        success: false,
        error: new ContextErrorClass(
          'Query condition not met',
          ERROR_CODES.VALIDATION_FAILED,
          { queryId: query.id }
        ),
        duration: 0,
        fromCache: false,
        retryCount: 0
      }
    }

    // Tentar buscar do cache primeiro
    if (query.cacheStrategy) {
      const cacheKey = `query:${query.id}`
      const cachedResult = await unifiedCacheService.get<T>(cacheKey, query.cacheStrategy)
      
      if (cachedResult) {
        this.updateQueryMetrics(query.id, Date.now() - startTime, true, true)
        
        return {
          queryId: query.id,
          success: true,
          data: cachedResult,
          duration: Date.now() - startTime,
          fromCache: true,
          retryCount: 0
        }
      }
    }

    // Executar query com retry logic
    while (retryCount <= query.retries) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), query.timeout || this.DEFAULT_TIMEOUT)
        })

        const result = await Promise.race([
          query.executor(),
          timeoutPromise
        ])

        // Salvar no cache se especificado
        if (query.cacheStrategy && result) {
          const cacheKey = `query:${query.id}`
          await unifiedCacheService.set(cacheKey, result, query.cacheStrategy)
        }

        const duration = Date.now() - startTime
        this.updateQueryMetrics(query.id, duration, true, false)

        return {
          queryId: query.id,
          success: true,
          data: result,
          duration,
          fromCache: false,
          retryCount
        }

      } catch (error) {
        retryCount++
        
        if (retryCount > query.retries) {
          const duration = Date.now() - startTime
          this.updateQueryMetrics(query.id, duration, false, false)

          return {
            queryId: query.id,
            success: false,
            error: new ContextErrorClass(
              `Query failed after ${retryCount} retries`,
              ERROR_CODES.EXTERNAL_SERVICE_ERROR,
              { queryId: query.id, retryCount },
              error instanceof Error ? error : new Error(String(error))
            ),
            duration,
            fromCache: false,
            retryCount
          }
        }

        // Backoff exponencial
        await this.delay(Math.pow(2, retryCount) * 1000)
      }
    }

    // Nunca deveria chegar aqui, mas TypeScript precisa
    throw new Error('Unexpected query execution path')
  }

  /**
   * Cria queries otimizadas para dados de empresa
   */
  createEmpresaQueries(empresaId: string, userId: string, options: {
    includeFinancialData?: boolean
    includeObligations?: boolean
    includeDocuments?: boolean
    timeRange?: string
  }): QueryDefinition[] {
    const queries: QueryDefinition[] = []

    // Query básica da empresa (sempre necessária)
    queries.push({
      id: `empresa-${empresaId}`,
      name: 'Dados básicos da empresa',
      priority: 'critical',
      timeout: 5000,
      retries: 2,
      cacheStrategy: 'empresa-completa',
      executor: async () => {
        const { data, error } = await this.supabase
          .from('empresas')
          .select('*')
          .eq('id', empresaId)
          .single()

        if (error) throw error
        return data
      }
    })

    // Query de cálculos (condicional)
    if (options.includeFinancialData !== false) {
      queries.push({
        id: `calculos-${empresaId}`,
        name: 'Cálculos recentes',
        priority: 'high',
        timeout: 10000,
        retries: 1,
        cacheStrategy: 'calculos-recentes',
        condition: () => options.includeFinancialData !== false,
        executor: async () => {
          const dateFilter = this.getDateFilter(options.timeRange)
          
          const { data, error } = await this.supabase
            .from('calculos_fiscais')
            .select('id, tipo_calculo, competencia, valor_total, status, data_vencimento, aliquota_efetiva')
            .eq('empresa_id', empresaId)
            .gte('created_at', dateFilter.toISOString())
            .order('competencia', { ascending: false })
            .limit(12)

          if (error) throw error
          return data || []
        }
      })
    }

    // Query de obrigações (condicional)
    if (options.includeObligations !== false) {
      queries.push({
        id: `obrigacoes-${empresaId}`,
        name: 'Obrigações pendentes',
        priority: 'high',
        timeout: 8000,
        retries: 1,
        cacheStrategy: 'obrigacoes-pendentes',
        condition: () => options.includeObligations !== false,
        executor: async () => {
          const { data, error } = await this.supabase
            .from('obrigacoes_fiscais')
            .select('*')
            .eq('empresa_id', empresaId)
            .in('situacao', ['vencida', 'proxima', 'futura'])
            .order('data_vencimento', { ascending: true })
            .limit(20)

          if (error) throw error
          return data || []
        }
      })
    }

    // Query de documentos (condicional)
    if (options.includeDocuments !== false) {
      queries.push({
        id: `documentos-${empresaId}`,
        name: 'Documentos recentes',
        priority: 'medium',
        timeout: 15000,
        retries: 1,
        cacheStrategy: 'documentos-insights',
        condition: () => options.includeDocuments !== false,
        executor: async () => {
          const { data, error } = await this.supabase
            .from('documentos_fiscais')
            .select('id, nome_arquivo, tipo_documento, data_emissao, valor_total, status, created_at')
            .eq('empresa_id', empresaId)
            .in('status', ['processado', 'validado'])
            .order('created_at', { ascending: false })
            .limit(20)

          if (error) throw error
          return data || []
        }
      })
    }

    return queries
  }

  /**
   * Utilitários privados
   */
  private sortQueriesByPriority(queries: QueryDefinition[]): QueryDefinition[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return [...queries].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  private chunkQueries(queries: QueryDefinition[], chunkSize: number): QueryDefinition[][] {
    const chunks: QueryDefinition[][] = []
    for (let i = 0; i < queries.length; i += chunkSize) {
      chunks.push(queries.slice(i, i + chunkSize))
    }
    return chunks
  }

  private async executeQueryChunk(
    queries: QueryDefinition[], 
    failureStrategy: QueryBatch['failureStrategy']
  ): Promise<QueryResult[]> {
    const promises = queries.map(query => this.executeQuery(query))
    
    if (failureStrategy === 'fail_fast') {
      return await Promise.all(promises)
    } else {
      const results = await Promise.allSettled(promises)
      return results.map(result => 
        result.status === 'fulfilled' ? result.value : {
          queryId: 'unknown',
          success: false,
          error: new ContextErrorClass('Query execution failed', ERROR_CODES.EXTERNAL_SERVICE_ERROR),
          duration: 0,
          fromCache: false,
          retryCount: 0
        }
      )
    }
  }

  private updateQueryMetrics(queryId: string, duration: number, success: boolean, fromCache: boolean): void {
    const existing = this.queryMetrics.get(queryId) || {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      averageDuration: 0,
      cacheHitCount: 0
    }

    existing.totalExecutions++
    if (success) existing.successCount++
    else existing.failureCount++
    if (fromCache) existing.cacheHitCount++
    
    existing.averageDuration = (existing.averageDuration * (existing.totalExecutions - 1) + duration) / existing.totalExecutions

    this.queryMetrics.set(queryId, existing)
  }

  private getDateFilter(timeRange?: string): Date {
    const now = new Date()
    switch (timeRange) {
      case 'current_month':
        return new Date(now.getFullYear(), now.getMonth(), 1)
      case 'last_year':
        return new Date(now.getFullYear() - 1, 0, 1)
      case 'last_3_months':
      default:
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Obtém métricas de performance das queries
   */
  getQueryMetrics(): Map<string, QueryMetrics> {
    return new Map(this.queryMetrics)
  }

  /**
   * Limpa métricas antigas
   */
  clearMetrics(): void {
    this.queryMetrics.clear()
  }
}

interface QueryMetrics {
  totalExecutions: number
  successCount: number
  failureCount: number
  averageDuration: number
  cacheHitCount: number
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const parallelQueryEngine = new ParallelQueryEngine()
