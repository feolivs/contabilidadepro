/**
 * 📊 DOCUMENTOS SERVICE - ContabilidadePRO
 * Edge Function unificada para contexto e analytics de documentos
 * Combina documentos-context-service + documentos-analytics-service
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { intelligentCache } from '../_shared/unified-cache-adapter.ts'

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

// Interface unificada
interface DocumentosServiceRequest {
  // Identificação
  empresa_id?: string
  user_id: string
  
  // Operação a executar
  operation: 'get_context' | 'calculate_metrics' | 'analyze_compliance' | 'generate_insights' | 'process_structured_data'
  
  // Parâmetros do context-service
  document_type?: string
  status_filter?: string
  period_days?: number
  include_analysis?: boolean
  include_patterns?: boolean
  limit?: number
  
  // Parâmetros do analytics-service
  period_months?: number
  force_refresh?: boolean
  options?: {
    insight_type?: 'financeiro' | 'compliance' | 'operacional' | 'estrategico' | 'completo'
    include_projections?: boolean
    include_benchmarking?: boolean
  }
}

interface DocumentosServiceResponse {
  success: boolean
  operation: string
  
  // Context data (quando operation = 'get_context')
  summary?: DocumentsSummary
  recent_documents?: DocumentInfo[]
  patterns_analysis?: PatternsAnalysis
  processing_status?: ProcessingStatus
  recommendations?: string[]
  
  // Analytics data (outras operations)
  result?: any
  
  processing_time: number
  cached: boolean
  generated_at: string
  error?: string
}

// Interfaces do context-service
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
 * 🎯 Função principal - Processar documentos service
 */
async function processDocumentosService(request: DocumentosServiceRequest): Promise<DocumentosServiceResponse> {
  const startTime = Date.now()
  const { operation, user_id, empresa_id, force_refresh = false } = request

  console.log(`[DOCUMENTOS_SERVICE] Processando ${operation} para empresa ${empresa_id || 'all'}`)

  // Cache inteligente unificado
  const cacheKey = generateUnifiedCacheKey(request)
  
  try {
    if (!force_refresh) {
      const cachedData = await intelligentCache.get(cacheKey, user_id)
      if (cachedData) {
        console.log('🎯 Cache HIT para documentos service')
        return { ...cachedData, cached: true }
      }
    }
  } catch (error) {
    console.warn('Cache error:', error)
  }

  let result: any

  try {
    // Executar operação específica
    switch (operation) {
      case 'get_context':
        result = await processContextOperation(request)
        break
      
      case 'calculate_metrics':
        result = await processMetricsOperation(request)
        break
      
      case 'analyze_compliance':
        result = await processComplianceOperation(request)
        break
      
      case 'generate_insights':
        result = await processInsightsOperation(request)
        break
      
      case 'process_structured_data':
        result = await processStructuredDataOperation(request)
        break
      
      default:
        throw new Error(`Operação não suportada: ${operation}`)
    }

    const response: DocumentosServiceResponse = {
      success: true,
      operation,
      ...result,
      processing_time: Date.now() - startTime,
      cached: false,
      generated_at: new Date().toISOString()
    }

    // Cache com TTL otimizado
    try {
      await intelligentCache.set(cacheKey, user_id, response, undefined, getCacheTTL(operation))
    } catch (error) {
      console.warn('Erro ao salvar no cache:', error)
    }

    console.log(`✅ ${operation} processado em ${Date.now() - startTime}ms`)
    return response

  } catch (error) {
    console.error(`[DOCUMENTOS_SERVICE] Erro em ${operation}:`, error)
    
    return {
      success: false,
      operation,
      processing_time: Date.now() - startTime,
      cached: false,
      generated_at: new Date().toISOString(),
      error: error.message || 'Erro interno do servidor'
    }
  }
}

/**
 * 🔑 Gerar chave de cache unificada
 */
function generateUnifiedCacheKey(request: DocumentosServiceRequest): string {
  const { operation, user_id, empresa_id, period_days, period_months, options } = request
  
  const keyParts = [
    'docs_unified',
    operation,
    user_id,
    empresa_id || 'all',
    period_days || period_months || 30,
    options?.insight_type || 'default'
  ]
  
  return keyParts.join(':')
}

/**
 * ⏰ Obter TTL do cache por operação
 */
function getCacheTTL(operation: string): number {
  const ttlMap = {
    'get_context': 10 * 60 * 1000,           // 10 minutos
    'calculate_metrics': 30 * 60 * 1000,     // 30 minutos
    'analyze_compliance': 60 * 60 * 1000,    // 1 hora
    'generate_insights': 2 * 60 * 60 * 1000, // 2 horas
    'process_structured_data': 15 * 60 * 1000 // 15 minutos
  }
  
  return ttlMap[operation] || 15 * 60 * 1000
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
 * 📊 Processar dados por mês
 */
function processarDadosPorMes(dadosEstruturados: any[]): any[] {
  const dadosPorMes: Record<string, any> = {}

  dadosEstruturados.forEach(dado => {
    const mes = dado.data_emissao?.substring(0, 7) || new Date().toISOString().substring(0, 7)

    if (!dadosPorMes[mes]) {
      dadosPorMes[mes] = {
        mes,
        receita_total: 0,
        despesa_total: 0,
        quantidade_documentos: 0,
        tipos_documento: new Set(),
        confianca_media: 0
      }
    }

    const valores = dado.dados_processados?.valores || []
    const receitaDoc = valores.find((v: any) => v.tipo === 'total' || v.tipo === 'receita')?.valor || 0

    dadosPorMes[mes].receita_total += receitaDoc
    dadosPorMes[mes].quantidade_documentos += 1
    dadosPorMes[mes].tipos_documento.add(dado.tipo_documento)
    dadosPorMes[mes].confianca_media += dado.confianca_extracao || 0
  })

  return Object.values(dadosPorMes).map((mes: any) => ({
    ...mes,
    tipos_documento: Array.from(mes.tipos_documento),
    confianca_media: mes.confianca_media / mes.quantidade_documentos
  })).sort((a, b) => a.mes.localeCompare(b.mes))
}

/**
 * 📋 Processar dados por tipo de documento
 */
function processarDadosPorTipo(dadosEstruturados: any[]): any[] {
  const dadosPorTipo: Record<string, any> = {}

  dadosEstruturados.forEach(dado => {
    const tipo = dado.tipo_documento

    if (!dadosPorTipo[tipo]) {
      dadosPorTipo[tipo] = {
        tipo_documento: tipo,
        quantidade: 0,
        valor_total: 0,
        confianca_media: 0,
        campos_mais_extraidos: {}
      }
    }

    const valores = dado.dados_processados?.valores || []
    const valorDoc = valores.find((v: any) => v.tipo === 'total' || v.tipo === 'receita')?.valor || 0

    dadosPorTipo[tipo].quantidade += 1
    dadosPorTipo[tipo].valor_total += valorDoc
    dadosPorTipo[tipo].confianca_media += dado.confianca_extracao || 0

    // Contar campos extraídos
    dado.campos_extraidos?.forEach((campo: string) => {
      dadosPorTipo[tipo].campos_mais_extraidos[campo] = (dadosPorTipo[tipo].campos_mais_extraidos[campo] || 0) + 1
    })
  })

  return Object.values(dadosPorTipo).map((tipo: any) => ({
    ...tipo,
    confianca_media: tipo.confianca_media / tipo.quantidade,
    campos_mais_extraidos: Object.entries(tipo.campos_mais_extraidos)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([campo, count]) => ({ campo, count }))
  }))
}

/**
 * 📈 Calcular projeções
 */
function calcularProjecoes(metricasMensais: any[]): any {
  if (metricasMensais.length < 2) {
    return {
      proximo_mes: 0,
      proximo_trimestre: 0,
      anual: 0,
      tendencia: 'insuficiente_dados'
    }
  }

  const receitas = metricasMensais.map(m => m.receita_total)
  const crescimentoMedio = calcularCrescimentoMedio(metricasMensais)
  const receitaMedia = receitas.reduce((sum, r) => sum + r, 0) / receitas.length
  const ultimaReceita = receitas[receitas.length - 1]

  return {
    proximo_mes: ultimaReceita * (1 + crescimentoMedio / 100),
    proximo_trimestre: ultimaReceita * 3 * (1 + crescimentoMedio / 100),
    anual: receitaMedia * 12 * (1 + crescimentoMedio / 100),
    tendencia: crescimentoMedio > 5 ? 'crescimento' : crescimentoMedio < -5 ? 'declinio' : 'estavel'
  }
}

/**
 * 💰 Calcular fluxo de caixa
 */
function calcularFluxoCaixa(metricasMensais: any[]): any {
  const entradas = metricasMensais.map(m => ({ mes: m.mes, valor: m.receita_total }))
  const saidas = metricasMensais.map(m => ({ mes: m.mes, valor: m.despesa_total || 0 }))
  const saldos = metricasMensais.map(m => ({
    mes: m.mes,
    valor: m.receita_total - (m.despesa_total || 0)
  }))

  return {
    entradas,
    saidas,
    saldos,
    saldo_acumulado: saldos.reduce((acc, s) => acc + s.valor, 0)
  }
}

/**
 * 📊 Calcular indicadores de performance
 */
function calcularIndicadoresPerformance(dadosEstruturados: any[], metricasMensais: any[]): any {
  const totalReceita = metricasMensais.reduce((sum, m) => sum + m.receita_total, 0)
  const totalDocumentos = dadosEstruturados.length
  const mesesComDados = metricasMensais.length

  return {
    ticket_medio: totalDocumentos > 0 ? totalReceita / totalDocumentos : 0,
    frequencia_documentos: mesesComDados > 0 ? totalDocumentos / mesesComDados : 0,
    crescimento_percentual: calcularCrescimentoMedio(metricasMensais),
    margem_bruta: 85, // Estimativa - seria calculado com dados de custo
    eficiencia_processamento: dadosEstruturados.reduce((sum, d) => sum + (d.confianca_extracao || 0), 0) / totalDocumentos
  }
}

/**
 * 📈 Calcular crescimento médio
 */
function calcularCrescimentoMedio(metricasMensais: any[]): number {
  if (metricasMensais.length < 2) return 0

  const crescimentos = []
  for (let i = 1; i < metricasMensais.length; i++) {
    const anterior = metricasMensais[i - 1].receita_total
    const atual = metricasMensais[i].receita_total
    if (anterior > 0) {
      crescimentos.push(((atual - anterior) / anterior) * 100)
    }
  }

  return crescimentos.length > 0
    ? crescimentos.reduce((sum, c) => sum + c, 0) / crescimentos.length
    : 0
}

/**
 * 🔍 Calcular score de compliance
 */
function calcularScoreCompliance(empresa: any, documentos: any[], dadosEstruturados: any[]): number {
  let score = 100

  // Penalizar por falta de documentos
  if (documentos.length === 0) score -= 30
  else if (documentos.length < 5) score -= 15

  // Penalizar por baixa qualidade de dados estruturados
  const confiancaMedia = dadosEstruturados.length > 0
    ? dadosEstruturados.reduce((sum, d) => sum + (d.confianca_extracao || 0), 0) / dadosEstruturados.length
    : 0

  if (confiancaMedia < 0.7) score -= 20
  else if (confiancaMedia < 0.8) score -= 10

  // Penalizar por regime tributário não definido
  if (!empresa?.regime_tributario || empresa.regime_tributario === 'Não definido') {
    score -= 15
  }

  // Penalizar por documentos pendentes
  const documentosPendentes = documentos.filter(d => d.status_processamento === 'pendente').length
  if (documentosPendentes > 5) score -= 10

  return Math.max(0, Math.min(100, score))
}

/**
 * ⚠️ Identificar riscos
 */
function identificarRiscos(empresa: any, documentos: any[], dadosEstruturados: any[]): string[] {
  const riscos = []

  if (documentos.length === 0) {
    riscos.push('Nenhum documento processado nos últimos 6 meses')
  }

  if (dadosEstruturados.length < documentos.length * 0.5) {
    riscos.push('Baixa taxa de extração de dados estruturados')
  }

  const confiancaMedia = dadosEstruturados.length > 0
    ? dadosEstruturados.reduce((sum, d) => sum + (d.confianca_extracao || 0), 0) / dadosEstruturados.length
    : 0

  if (confiancaMedia < 0.6) {
    riscos.push('Qualidade dos dados extraídos abaixo do aceitável')
  }

  if (!empresa?.regime_tributario || empresa.regime_tributario === 'Não definido') {
    riscos.push('Regime tributário não definido pode causar cálculos incorretos')
  }

  return riscos
}

/**
 * 🚨 Identificar alertas urgentes
 */
function identificarAlertasUrgentes(empresa: any, documentos: any[]): string[] {
  const alertas = []
  const hoje = new Date()
  const documentosRecentes = documentos.filter(d =>
    new Date(d.created_at) > new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
  )

  if (documentosRecentes.length === 0) {
    alertas.push('Nenhum documento processado nos últimos 30 dias')
  }

  const documentosComErro = documentos.filter(d => d.status_processamento === 'erro')
  if (documentosComErro.length > 0) {
    alertas.push(`${documentosComErro.length} documentos com erro de processamento`)
  }

  // Verificar se está próximo do fim do mês (DAS)
  if (hoje.getDate() > 15 && hoje.getDate() <= 20) {
    alertas.push('Período de vencimento do DAS - verificar obrigações')
  }

  return alertas
}

/**
 * 📋 Analisar qualidade da documentação
 */
function analisarQualidadeDocumentacao(documentos: any[], dadosEstruturados: any[]): any {
  const totalDocumentos = documentos.length
  const documentosEstruturados = dadosEstruturados.length
  const taxaEstruturacao = totalDocumentos > 0 ? documentosEstruturados / totalDocumentos : 0

  const confiancaMedia = dadosEstruturados.length > 0
    ? dadosEstruturados.reduce((sum, d) => sum + (d.confianca_extracao || 0), 0) / dadosEstruturados.length
    : 0

  return {
    taxa_estruturacao: taxaEstruturacao,
    confianca_media: confiancaMedia,
    total_documentos: totalDocumentos,
    documentos_estruturados: documentosEstruturados,
    qualidade_geral: taxaEstruturacao > 0.8 && confiancaMedia > 0.7 ? 'alta' :
                     taxaEstruturacao > 0.6 && confiancaMedia > 0.6 ? 'media' : 'baixa',
    areas_criticas: taxaEstruturacao < 0.5 ? ['Baixa taxa de estruturação'] : []
  }
}

/**
 * 📊 Analisar consistência de dados
 */
function analisarConsistenciaDados(dadosEstruturados: any[]): any {
  if (dadosEstruturados.length === 0) {
    return {
      score: 0,
      inconsistencias: ['Nenhum dado estruturado disponível'],
      campos_faltantes: [],
      duplicatas_potenciais: []
    }
  }

  const inconsistencias = []
  const camposFaltantes = []

  // Verificar campos essenciais
  const camposEssenciais = ['cnpj', 'razaoSocial', 'valores']
  camposEssenciais.forEach(campo => {
    const documentosComCampo = dadosEstruturados.filter(d =>
      d.campos_extraidos?.includes(campo)
    ).length

    const percentual = documentosComCampo / dadosEstruturados.length
    if (percentual < 0.7) {
      camposFaltantes.push(`${campo}: ${Math.round(percentual * 100)}% dos documentos`)
    }
  })

  // Verificar duplicatas potenciais (mesmo CNPJ, mesmo valor, datas próximas)
  const duplicatasPotenciais = []
  // Implementação simplificada - em produção seria mais sofisticada

  const score = Math.max(0, 100 - inconsistencias.length * 10 - camposFaltantes.length * 5)

  return {
    score,
    inconsistencias,
    campos_faltantes: camposFaltantes,
    duplicatas_potenciais: duplicatasPotenciais
  }
}

/**
 * 📅 Analisar prazos fiscais
 */
function analisarPrazosFiscais(empresa: any): any {
  const hoje = new Date()
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)

  return {
    das_proximo_vencimento: new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 20).toISOString().split('T')[0],
    dias_para_das: Math.ceil((new Date(proximoMes.getFullYear(), proximoMes.getMonth(), 20).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)),
    regime_tributario: empresa?.regime_tributario || 'Não definido',
    alertas_prazo: hoje.getDate() > 15 ? ['Próximo do vencimento do DAS'] : []
  }
}

/**
 * 📋 Analisar obrigações fiscais
 */
function analisarObrigacoesFiscais(empresa: any): any {
  const obrigacoes = []

  if (empresa?.regime_tributario === 'Simples Nacional' || empresa?.regime_tributario === 'simples') {
    obrigacoes.push({
      tipo: 'DAS',
      periodicidade: 'mensal',
      vencimento: 'dia 20 do mês seguinte',
      status: 'ativa'
    })
  }

  return {
    obrigacoes_ativas: obrigacoes,
    regime_tributario: empresa?.regime_tributario || 'Não definido',
    recomendacoes: empresa?.regime_tributario ? [] : ['Definir regime tributário para identificar obrigações específicas']
  }
}

/**
 * 🤖 Chamar OpenAI para insights
 */
async function callOpenAIForInsights(contexto: any, insightType: string, options: any): Promise<any> {
  const prompt = `Você é um especialista em contabilidade brasileira. Analise os dados fornecidos e gere insights ${insightType} para esta empresa.

Dados da empresa:
${JSON.stringify(contexto, null, 2)}

Gere insights estruturados em JSON com:
- resumo_executivo: principais pontos e recomendações
- analise_financeira: análise detalhada dos números
- analise_compliance: situação fiscal e compliance
- insights_operacionais: melhorias operacionais
- projecoes_estrategicas: projeções e estratégias
- alertas_prioritarios: alertas que requerem ação imediata
- benchmarking: comparação com padrões do setor
- confianca_analise: score de 0-100 da confiança na análise
- limitacoes: limitações dos dados ou análise

Responda APENAS em JSON válido.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um especialista em contabilidade brasileira. Responda sempre em JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  try {
    return JSON.parse(content)
  } catch (error) {
    console.error('Erro ao parsear resposta da OpenAI:', error)
    return {
      resumo_executivo: { erro: 'Erro ao processar insights' },
      confianca_analise: 0,
      limitacoes: ['Erro na geração de insights']
    }
  }
}

/**
 * 📄 Processar operação de contexto de documentos
 */
async function processContextOperation(request: DocumentosServiceRequest) {
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

  // Buscar dados em paralelo
  const [summary, recentDocuments, patternsAnalysis, processingStatus] = await Promise.allSettled([
    getDocumentsSummary(user_id, empresa_id, period_days),
    getRecentDocuments(user_id, empresa_id, document_type, status_filter, limit),
    include_patterns ? getPatternsAnalysis(user_id, empresa_id, period_days * 3) : Promise.resolve(undefined),
    getProcessingStatus(user_id, empresa_id)
  ])

  // Processar resultados
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

  // Gerar recomendações
  const recommendations = generateRecommendations(summaryData, patternsData, statusData)

  return {
    summary: summaryData,
    recent_documents: documentsData,
    patterns_analysis: patternsData,
    processing_status: statusData,
    recommendations
  }
}

async function processMetricsOperation(request: DocumentosServiceRequest) {
  const { empresa_id, period_months = 6 } = request

  if (!empresa_id) {
    throw new Error('empresa_id é obrigatório para cálculo de métricas')
  }

  console.log(`[METRICS] Calculando métricas financeiras para empresa ${empresa_id}`)

  const startTime = Date.now()

  try {
    // Buscar dados estruturados dos últimos meses
    const { data: dadosEstruturados } = await supabase
      .rpc('get_dados_estruturados_empresa', {
        p_empresa_id: empresa_id,
        p_data_inicio: new Date(Date.now() - period_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_data_fim: new Date().toISOString().split('T')[0],
        p_confianca_minima: 0.5
      })

    if (!dadosEstruturados || dadosEstruturados.length === 0) {
      console.log('[METRICS] Nenhum dado estruturado encontrado')
      return {
        metricas_mensais: [],
        metricas_por_tipo: [],
        projecoes: {},
        fluxo_caixa: {},
        indicadores_performance: {},
        resumo_executivo: {
          total_documentos: 0,
          periodo_analise: `${period_months} meses`,
          confianca_dados: 0
        }
      }
    }

    // Processar dados por mês
    const metricasMensais = processarDadosPorMes(dadosEstruturados)

    // Processar dados por tipo de documento
    const metricasPorTipo = processarDadosPorTipo(dadosEstruturados)

    // Calcular projeções
    const projecoes = calcularProjecoes(metricasMensais)

    // Calcular fluxo de caixa
    const fluxoCaixa = calcularFluxoCaixa(metricasMensais)

    // Calcular indicadores de performance
    const indicadoresPerformance = calcularIndicadoresPerformance(dadosEstruturados, metricasMensais)

    // Resumo executivo
    const resumoExecutivo = {
      total_documentos: dadosEstruturados.length,
      periodo_analise: `${period_months} meses`,
      receita_total: metricasMensais.reduce((sum: number, m: any) => sum + (m.receita_total || 0), 0),
      crescimento_medio: calcularCrescimentoMedio(metricasMensais),
      confianca_dados: dadosEstruturados.reduce((sum: number, d: any) => sum + d.confianca_extracao, 0) / dadosEstruturados.length
    }

    const result = {
      metricas_mensais: metricasMensais,
      metricas_por_tipo: metricasPorTipo,
      projecoes,
      fluxo_caixa: fluxoCaixa,
      indicadores_performance: indicadoresPerformance,
      resumo_executivo: resumoExecutivo
    }

    // Salvar no banco de dados
    await supabase
      .from('metricas_financeiras')
      .upsert({
        empresa_id: empresa_id,
        periodo_inicio: new Date(Date.now() - period_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        periodo_fim: new Date().toISOString().split('T')[0],
        metricas_mensais: metricasMensais,
        metricas_por_tipo: metricasPorTipo,
        projecoes,
        fluxo_caixa: fluxoCaixa,
        indicadores_performance: indicadoresPerformance,
        resumo_executivo: resumoExecutivo,
        documentos_analisados: dadosEstruturados.length,
        confianca_calculo: resumoExecutivo.confianca_dados,
        versao_calculadora: '1.0'
      }, {
        onConflict: 'empresa_id,periodo_inicio,periodo_fim'
      })

    console.log(`[METRICS] Métricas calculadas em ${Date.now() - startTime}ms`)
    return result

  } catch (error) {
    console.error('[METRICS] Erro ao calcular métricas:', error)
    throw error
  }
}

async function processComplianceOperation(request: DocumentosServiceRequest) {
  const { empresa_id } = request

  if (!empresa_id) {
    throw new Error('empresa_id é obrigatório para análise de compliance')
  }

  console.log(`[COMPLIANCE] Analisando compliance para empresa ${empresa_id}`)

  const startTime = Date.now()

  try {
    // Buscar dados da empresa e documentos
    const { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresa_id)
      .single()

    const { data: documentos } = await supabase
      .from('documentos')
      .select('*')
      .eq('empresa_id', empresa_id)
      .gte('data_emissao', new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const { data: dadosEstruturados } = await supabase
      .from('dados_estruturados')
      .select('*')
      .in('documento_id', documentos?.map(d => d.id) || [])

    // Calcular score de compliance
    const scoreGeral = calcularScoreCompliance(empresa, documentos || [], dadosEstruturados || [])

    // Identificar riscos
    const riscosIdentificados = identificarRiscos(empresa, documentos || [], dadosEstruturados || [])

    // Alertas urgentes
    const alertasUrgentes = identificarAlertasUrgentes(empresa, documentos || [])

    // Qualidade da documentação
    const qualidadeDocumentacao = analisarQualidadeDocumentacao(documentos || [], dadosEstruturados || [])

    const result = {
      score_geral: scoreGeral,
      nivel: scoreGeral >= 90 ? 'excelente' : scoreGeral >= 80 ? 'alto' : scoreGeral >= 60 ? 'medio' : scoreGeral >= 40 ? 'baixo' : 'critico',
      consistencia_dados: analisarConsistenciaDados(dadosEstruturados || []),
      prazos_fiscais: analisarPrazosFiscais(empresa),
      obrigacoes_fiscais: analisarObrigacoesFiscais(empresa),
      qualidade_documentacao: qualidadeDocumentacao,
      riscos_identificados: riscosIdentificados,
      alertas_urgentes: alertasUrgentes,
      historico_compliance: {},
      configuracao_analise: {
        periodo_meses: 6,
        documentos_analisados: documentos?.length || 0,
        versao_analyzer: '1.0'
      }
    }

    // Salvar no banco de dados
    await supabase
      .from('compliance_analysis')
      .insert({
        empresa_id: empresa_id,
        score_geral: scoreGeral,
        nivel: result.nivel,
        consistencia_dados: result.consistencia_dados,
        prazos_fiscais: result.prazos_fiscais,
        obrigacoes_fiscais: result.obrigacoes_fiscais,
        qualidade_documentacao: result.qualidade_documentacao,
        riscos_identificados: result.riscos_identificados,
        alertas_urgentes: result.alertas_urgentes,
        historico_compliance: result.historico_compliance,
        configuracao_analise: result.configuracao_analise,
        documentos_analisados: documentos?.length || 0,
        versao_analyzer: '1.0'
      })

    console.log(`[COMPLIANCE] Compliance analisado em ${Date.now() - startTime}ms`)
    return result

  } catch (error) {
    console.error('[COMPLIANCE] Erro ao analisar compliance:', error)
    throw error
  }
}

async function processInsightsOperation(request: DocumentosServiceRequest) {
  const { empresa_id, options } = request

  if (!empresa_id) {
    throw new Error('empresa_id é obrigatório para geração de insights')
  }

  console.log(`[AI_INSIGHTS] Gerando insights para empresa ${empresa_id}`)

  const startTime = Date.now()
  const insightType = options?.insight_type || 'completo'

  try {
    // Buscar dados necessários
    const [empresaData, metricsData, complianceData] = await Promise.all([
      supabase.rpc('get_empresa_dashboard_complete', { p_empresa_id: empresa_id, p_periodo_meses: 6 }),
      supabase.rpc('get_latest_metricas_financeiras', { p_empresa_id: empresa_id }),
      supabase.rpc('get_latest_compliance_analysis', { p_empresa_id: empresa_id })
    ])

    // Preparar contexto para IA
    const contexto = {
      empresa: empresaData.data?.empresa || {},
      metricas: metricsData.data || {},
      compliance: complianceData.data || {},
      documentos_stats: empresaData.data?.documentos_stats || {}
    }

    // Gerar insights com OpenAI (implementação simplificada)
    const insights = await callOpenAIForInsights(contexto, insightType, options)

    const result = {
      tipo_insight: insightType,
      nivel_detalhamento: 'gerencial',
      resumo_executivo: insights.resumo_executivo || {},
      analise_financeira: insights.analise_financeira || {},
      analise_compliance: insights.analise_compliance || {},
      insights_operacionais: insights.insights_operacionais || {},
      projecoes_estrategicas: insights.projecoes_estrategicas || {},
      alertas_prioritarios: insights.alertas_prioritarios || [],
      benchmarking: insights.benchmarking || {},
      configuracao_geracao: {
        modelo_usado: 'gpt-4o',
        versao: '1.0',
        timestamp: new Date().toISOString()
      },
      confianca_analise: insights.confianca_analise || 85,
      limitacoes: insights.limitacoes || []
    }

    // Salvar no banco de dados
    await supabase
      .from('ai_insights')
      .insert({
        empresa_id: empresa_id,
        tipo_insight: insightType,
        nivel_detalhamento: 'gerencial',
        resumo_executivo: result.resumo_executivo,
        analise_financeira: result.analise_financeira,
        analise_compliance: result.analise_compliance,
        insights_operacionais: result.insights_operacionais,
        projecoes_estrategicas: result.projecoes_estrategicas,
        alertas_prioritarios: result.alertas_prioritarios,
        benchmarking: result.benchmarking,
        configuracao_geracao: result.configuracao_geracao,
        confianca_analise: result.confianca_analise,
        modelo_usado: 'gpt-4o',
        tokens_utilizados: insights.tokens_utilizados || 0,
        tempo_processamento_ms: Date.now() - startTime,
        valido_ate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
        limitacoes: result.limitacoes
      })

    console.log(`[AI_INSIGHTS] Insights gerados em ${Date.now() - startTime}ms`)
    return result

  } catch (error) {
    console.error('[AI_INSIGHTS] Erro ao gerar insights:', error)
    throw error
  }
}

async function processStructuredDataOperation(request: DocumentosServiceRequest) {
  const { empresa_id, period_months = 6 } = request

  if (!empresa_id) {
    throw new Error('empresa_id é obrigatório para processamento de dados estruturados')
  }

  console.log(`[STRUCTURED_DATA] Processando dados estruturados para empresa ${empresa_id}`)

  try {
    // Buscar dados estruturados
    const { data: dadosEstruturados } = await supabase
      .rpc('get_dados_estruturados_empresa', {
        p_empresa_id: empresa_id,
        p_data_inicio: new Date(Date.now() - period_months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_data_fim: new Date().toISOString().split('T')[0],
        p_confianca_minima: 0.3
      })

    return {
      dados_estruturados: dadosEstruturados || [],
      total_registros: dadosEstruturados?.length || 0,
      periodo_analise: `${period_months} meses`,
      processado_em: new Date().toISOString()
    }

  } catch (error) {
    console.error('[STRUCTURED_DATA] Erro ao processar dados estruturados:', error)
    throw error
  }
}

// Servir a função
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const body: DocumentosServiceRequest = await req.json()
    
    // Validar parâmetros obrigatórios
    if (!body.user_id) {
      throw new Error('user_id é obrigatório')
    }
    
    if (!body.operation) {
      throw new Error('operation é obrigatória')
    }

    // Processar request
    const result = await processDocumentosService(body)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro no documentos-service:', error)

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
