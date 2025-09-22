/**
 * 📄 DOCUMENTOS CONTEXT SERVICE - ContabilidadePRO
 * Edge Function para fornecer contexto rico sobre documentos
 * Especializada em análise de documentos, OCR e classificação
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { intelligentCache } from '../_shared/unified-cache-adapter.ts'

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Interfaces
interface DocumentosContextRequest {
  empresa_id?: string
  user_id: string
  document_type?: string
  status_filter?: string
  period_days?: number
  include_analysis?: boolean
  include_patterns?: boolean
  limit?: number
}

interface DocumentosContextResponse {
  success: boolean
  summary: DocumentsSummary
  recent_documents: DocumentInfo[]
  patterns_analysis?: PatternsAnalysis
  processing_status: ProcessingStatus
  recommendations: string[]
  cached: boolean
  generated_at: string
}

interface DocumentsSummary {
  total_documents: number
  by_category: Record<string, number>
  by_status: Record<string, number>
  by_type: Record<string, number>
  by_month: Record<string, number>
  avg_processing_time: number
  success_rate: number
}

interface DocumentInfo {
  id: string
  arquivo_nome: string
  tipo_documento: string
  categoria: string
  status_processamento: string
  created_at: string
  valor_total?: number
  data_documento?: string
  confianca_extracao?: number
  empresa_nome?: string
  tags: string[]
}

interface PatternsAnalysis {
  most_common_types: Array<{type: string, count: number, percentage: number}>
  temporal_patterns: Array<{month: string, count: number}>
  value_patterns: {
    avg_value: number
    max_value: number
    min_value: number
    total_value: number
    value_distribution: Array<{range: string, count: number}>
  }
  quality_patterns: {
    avg_confidence: number
    high_confidence_count: number
    low_confidence_count: number
    manual_validation_rate: number
  }
}

interface ProcessingStatus {
  pending_count: number
  processing_count: number
  completed_count: number
  error_count: number
  queue_health: 'good' | 'warning' | 'critical'
  estimated_processing_time: number
}

// Inicializar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 📊 Gerar resumo geral de documentos
 */
async function getDocumentsSummary(
  userId: string,
  empresaId?: string,
  periodDays: number = 30
): Promise<DocumentsSummary> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - periodDays)

  let query = supabase
    .from('documentos_unified')
    .select('categoria, status_processamento, tipo_documento, created_at, data_processamento')
    .gte('created_at', startDate.toISOString())
    .is('deleted_at', null)

  // Filtrar por empresa se especificada
  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  } else {
    // Se não especificada, filtrar por user_id
    query = query.eq('user_id', userId)
  }

  const { data: documents, error } = await query

  if (error) {
    console.error('Erro ao buscar documentos:', error)
    throw new Error('Erro ao buscar documentos')
  }

  const docs = documents || []
  const totalDocuments = docs.length

  // Agrupar por categoria
  const byCategory = docs.reduce((acc, doc) => {
    acc[doc.categoria] = (acc[doc.categoria] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Agrupar por status
  const byStatus = docs.reduce((acc, doc) => {
    acc[doc.status_processamento] = (acc[doc.status_processamento] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Agrupar por tipo
  const byType = docs.reduce((acc, doc) => {
    acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Agrupar por mês
  const byMonth = docs.reduce((acc, doc) => {
    const month = new Date(doc.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calcular tempo médio de processamento
  const processedDocs = docs.filter(doc =>
    doc.status_processamento === 'processado' && doc.data_processamento
  )

  const avgProcessingTime = processedDocs.length > 0
    ? processedDocs.reduce((sum, doc) => {
        const created = new Date(doc.created_at).getTime()
        const processed = new Date(doc.data_processamento!).getTime()
        return sum + (processed - created)
      }, 0) / processedDocs.length / 1000 / 60 // em minutos
    : 0

  // Taxa de sucesso
  const successRate = totalDocuments > 0
    ? (byStatus['processado'] || 0) / totalDocuments * 100
    : 0

  return {
    total_documents: totalDocuments,
    by_category: byCategory,
    by_status: byStatus,
    by_type: byType,
    by_month: byMonth,
    avg_processing_time: avgProcessingTime,
    success_rate: successRate
  }
}

/**
 * 📋 Buscar documentos recentes com detalhes
 */
async function getRecentDocuments(
  userId: string,
  empresaId?: string,
  documentType?: string,
  statusFilter?: string,
  limit: number = 10
): Promise<DocumentInfo[]> {
  let query = supabase
    .from('documentos_unified')
    .select(`
      id, arquivo_nome, tipo_documento, categoria, status_processamento,
      created_at, valor_total, data_documento, confianca_extracao, tags,
      empresa_id, empresas!inner(nome)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Aplicar filtros
  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  } else {
    query = query.eq('user_id', userId)
  }

  if (documentType) {
    query = query.eq('tipo_documento', documentType)
  }

  if (statusFilter) {
    query = query.eq('status_processamento', statusFilter)
  }

  const { data: documents, error } = await query

  if (error) {
    console.error('Erro ao buscar documentos recentes:', error)
    return []
  }

  return (documents || []).map(doc => ({
    id: doc.id,
    arquivo_nome: doc.arquivo_nome,
    tipo_documento: doc.tipo_documento,
    categoria: doc.categoria,
    status_processamento: doc.status_processamento,
    created_at: doc.created_at,
    valor_total: doc.valor_total,
    data_documento: doc.data_documento,
    confianca_extracao: doc.confianca_extracao,
    empresa_nome: doc.empresas?.nome,
    tags: doc.tags || []
  }))
}

/**
 * 📈 Análise de padrões nos documentos
 */
async function getPatternsAnalysis(
  userId: string,
  empresaId?: string,
  periodDays: number = 90
): Promise<PatternsAnalysis> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - periodDays)

  let query = supabase
    .from('documentos_unified')
    .select('tipo_documento, created_at, valor_total, confianca_extracao, validado_manualmente')
    .gte('created_at', startDate.toISOString())
    .is('deleted_at', null)

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data: documents } = await query
  const docs = documents || []

  // Tipos mais comuns
  const typeCount = docs.reduce((acc, doc) => {
    acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const mostCommonTypes = Object.entries(typeCount)
    .map(([type, count]) => ({
      type,
      count,
      percentage: (count / docs.length) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Padrões temporais
  const monthlyCount = docs.reduce((acc, doc) => {
    const month = new Date(doc.created_at).toLocaleDateString('pt-BR', { month: 'short' })
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const temporalPatterns = Object.entries(monthlyCount)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Padrões de valor
  const valuesWithData = docs.filter(doc => doc.valor_total && doc.valor_total > 0)
  const values = valuesWithData.map(doc => doc.valor_total!)

  const valuePatterns = {
    avg_value: values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0,
    max_value: values.length > 0 ? Math.max(...values) : 0,
    min_value: values.length > 0 ? Math.min(...values) : 0,
    total_value: values.reduce((sum, val) => sum + val, 0),
    value_distribution: [
      { range: '0-100', count: values.filter(v => v <= 100).length },
      { range: '100-1000', count: values.filter(v => v > 100 && v <= 1000).length },
      { range: '1000-10000', count: values.filter(v => v > 1000 && v <= 10000).length },
      { range: '10000+', count: values.filter(v => v > 10000).length }
    ]
  }

  // Padrões de qualidade
  const confidenceValues = docs.filter(doc => doc.confianca_extracao).map(doc => doc.confianca_extracao!)
  const avgConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
    : 0

  const qualityPatterns = {
    avg_confidence: avgConfidence,
    high_confidence_count: confidenceValues.filter(c => c >= 0.8).length,
    low_confidence_count: confidenceValues.filter(c => c < 0.5).length,
    manual_validation_rate: (docs.filter(doc => doc.validado_manualmente).length / docs.length) * 100
  }

  return {
    most_common_types: mostCommonTypes,
    temporal_patterns: temporalPatterns,
    value_patterns: valuePatterns,
    quality_patterns: qualityPatterns
  }
}

/**
 * ⚙️ Status do processamento de documentos
 */
async function getProcessingStatus(userId: string, empresaId?: string): Promise<ProcessingStatus> {
  let query = supabase
    .from('documentos_unified')
    .select('status_processamento, created_at, data_processamento')
    .is('deleted_at', null)

  if (empresaId) {
    query = query.eq('empresa_id', empresaId)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data: documents } = await query
  const docs = documents || []

  const pendingCount = docs.filter(doc => doc.status_processamento === 'pendente').length
  const processingCount = docs.filter(doc => doc.status_processamento === 'processando').length
  const completedCount = docs.filter(doc => doc.status_processamento === 'processado').length
  const errorCount = docs.filter(doc => doc.status_processamento === 'erro').length

  // Determinar saúde da fila
  let queueHealth: 'good' | 'warning' | 'critical' = 'good'
  if (pendingCount > 20) queueHealth = 'warning'
  if (pendingCount > 50 || errorCount > 10) queueHealth = 'critical'

  // Estimar tempo de processamento baseado no histórico
  const recentProcessed = docs
    .filter(doc =>
      doc.status_processamento === 'processado' &&
      doc.data_processamento &&
      new Date(doc.created_at).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000) // últimos 7 dias
    )

  const avgProcessingTime = recentProcessed.length > 0
    ? recentProcessed.reduce((sum, doc) => {
        const created = new Date(doc.created_at).getTime()
        const processed = new Date(doc.data_processamento!).getTime()
        return sum + (processed - created)
      }, 0) / recentProcessed.length / 1000 / 60 // em minutos
    : 5 // padrão 5 minutos

  const estimatedProcessingTime = avgProcessingTime * pendingCount

  return {
    pending_count: pendingCount,
    processing_count: processingCount,
    completed_count: completedCount,
    error_count: errorCount,
    queue_health: queueHealth,
    estimated_processing_time: estimatedProcessingTime
  }
}

/**
 * 💡 Gerar recomendações baseadas nos dados
 */
function generateRecommendations(
  summary: DocumentsSummary,
  patterns?: PatternsAnalysis,
  status?: ProcessingStatus
): string[] {
  const recommendations = []

  // Recomendações baseadas no resumo
  if (summary.success_rate < 80) {
    recommendations.push('Taxa de sucesso baixa no processamento. Revise qualidade dos documentos.')
  }

  if (summary.avg_processing_time > 30) {
    recommendations.push('Tempo de processamento elevado. Considere otimizar o fluxo.')
  }

  // Recomendações baseadas em padrões
  if (patterns) {
    if (patterns.quality_patterns.avg_confidence < 0.7) {
      recommendations.push('Baixa confiança na extração. Verifique qualidade das imagens.')
    }

    if (patterns.quality_patterns.manual_validation_rate > 30) {
      recommendations.push('Alta taxa de validação manual. Considere melhorar automação.')
    }

    if (patterns.most_common_types.length > 0) {
      const topType = patterns.most_common_types[0]
      recommendations.push(`Tipo mais comum: ${topType.type} (${topType.percentage.toFixed(1)}%)`)
    }
  }

  // Recomendações baseadas no status
  if (status) {
    if (status.queue_health === 'critical') {
      recommendations.push('Fila de processamento crítica. Ação imediata necessária.')
    } else if (status.queue_health === 'warning') {
      recommendations.push('Fila de processamento com muitos itens pendentes.')
    }

    if (status.error_count > 5) {
      recommendations.push('Muitos erros de processamento. Investigue as causas.')
    }
  }

  return recommendations.slice(0, 5)
}

/**
 * 🎯 Função principal - Processar contexto de documentos
 */
async function processDocumentosContext(request: DocumentosContextRequest): Promise<DocumentosContextResponse> {
  const startTime = Date.now()
  const {
    empresa_id,
    user_id,
    document_type,
    status_filter,
    period_days = 30,
    include_analysis = true,
    include_patterns = false,
    limit = 10
  } = request

  console.log(`📄 Processando contexto de documentos para user: ${user_id}`)

  // 1. Verificar cache
  const cacheKey = `docs_context:${user_id}:${empresa_id || 'all'}:${period_days}:${include_patterns ? 'p' : ''}`

  try {
    const cachedData = await intelligentCache.get(cacheKey, user_id)
    if (cachedData) {
      console.log('🎯 Cache HIT para contexto de documentos')
      return {
        ...cachedData,
        cached: true
      }
    }
  } catch (error) {
    console.warn('Erro no cache:', error)
  }

  // 2. Buscar dados em paralelo
  const [summary, recentDocuments, patternsAnalysis, processingStatus] = await Promise.allSettled([
    getDocumentsSummary(user_id, empresa_id, period_days),
    getRecentDocuments(user_id, empresa_id, document_type, status_filter, limit),
    include_patterns ? getPatternsAnalysis(user_id, empresa_id, period_days * 3) : Promise.resolve(undefined),
    getProcessingStatus(user_id, empresa_id)
  ])

  // 3. Processar resultados
  const summaryData = summary.status === 'fulfilled' ? summary.value : {
    total_documents: 0,
    by_category: {},
    by_status: {},
    by_type: {},
    by_month: {},
    avg_processing_time: 0,
    success_rate: 0
  }

  const documentsData = recentDocuments.status === 'fulfilled' ? recentDocuments.value : []
  const patternsData = patternsAnalysis.status === 'fulfilled' ? patternsAnalysis.value : undefined
  const statusData = processingStatus.status === 'fulfilled' ? processingStatus.value : {
    pending_count: 0,
    processing_count: 0,
    completed_count: 0,
    error_count: 0,
    queue_health: 'good' as const,
    estimated_processing_time: 0
  }

  // 4. Gerar recomendações
  const recommendations = generateRecommendations(summaryData, patternsData, statusData)

  const response: DocumentosContextResponse = {
    success: true,
    summary: summaryData,
    recent_documents: documentsData,
    patterns_analysis: patternsData,
    processing_status: statusData,
    recommendations,
    cached: false,
    generated_at: new Date().toISOString()
  }

  // 5. Salvar no cache (10 minutos)
  try {
    await intelligentCache.set(cacheKey, user_id, response, undefined, 10 * 60 * 1000)
  } catch (error) {
    console.warn('Erro ao salvar no cache:', error)
  }

  console.log(`✅ Contexto de documentos processado em ${Date.now() - startTime}ms`)
  return response
}

// Função principal do servidor
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as DocumentosContextRequest

    if (!body.user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'user_id é obrigatório'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await processDocumentosContext(body)

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro no documentos-context-service:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro interno do servidor'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})