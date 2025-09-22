/**
 * 📊 DOCUMENTOS ANALYTICS SERVICE - ContabilidadePRO
 * Edge Function para análises avançadas de documentos
 * Especializada em métricas financeiras, compliance e insights
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { intelligentCache } from '../_shared/unified-cache-adapter.ts'

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? ''

// Interfaces
interface AnalyticsRequest {
  empresa_id: string
  user_id: string
  operation: 'calculate_metrics' | 'analyze_compliance' | 'generate_insights' | 'process_structured_data'
  period_months?: number
  force_refresh?: boolean
  options?: {
    insight_type?: 'financeiro' | 'compliance' | 'operacional' | 'estrategico' | 'completo'
    include_projections?: boolean
    include_benchmarking?: boolean
  }
}

interface AnalyticsResponse {
  success: boolean
  operation: string
  result: any
  processing_time: number
  cached: boolean
  generated_at: string
  error?: string
}

// Inicializar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 📊 Calcular métricas financeiras
 */
async function calculateMetricsFinanceiras(
  empresaId: string, 
  periodMonths: number = 6
): Promise<any> {
  console.log(`[METRICS] Calculando métricas financeiras para empresa ${empresaId}`)
  
  const startTime = Date.now()
  
  try {
    // Buscar dados estruturados dos últimos meses
    const { data: dadosEstruturados } = await supabase
      .rpc('get_dados_estruturados_empresa', {
        p_empresa_id: empresaId,
        p_data_inicio: new Date(Date.now() - periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
          periodo_analise: `${periodMonths} meses`,
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
      periodo_analise: `${periodMonths} meses`,
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
        empresa_id: empresaId,
        periodo_inicio: new Date(Date.now() - periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

/**
 * 📋 Analisar compliance
 */
async function analyzeCompliance(empresaId: string): Promise<any> {
  console.log(`[COMPLIANCE] Analisando compliance para empresa ${empresaId}`)
  
  const startTime = Date.now()
  
  try {
    // Buscar dados da empresa e documentos
    const { data: empresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single()

    const { data: documentos } = await supabase
      .from('documentos')
      .select('*')
      .eq('empresa_id', empresaId)
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
        empresa_id: empresaId,
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

/**
 * 🤖 Gerar insights com IA
 */
async function generateAIInsights(
  empresaId: string, 
  insightType: string = 'completo',
  options: any = {}
): Promise<any> {
  console.log(`[AI_INSIGHTS] Gerando insights ${insightType} para empresa ${empresaId}`)
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key não configurada')
  }

  const startTime = Date.now()
  
  try {
    // Buscar dados necessários
    const [empresaData, metricsData, complianceData] = await Promise.all([
      supabase.rpc('get_empresa_dashboard_complete', { p_empresa_id: empresaId, p_periodo_meses: 6 }),
      supabase.rpc('get_latest_metricas_financeiras', { p_empresa_id: empresaId }),
      supabase.rpc('get_latest_compliance_analysis', { p_empresa_id: empresaId })
    ])

    // Preparar contexto para IA
    const contexto = {
      empresa: empresaData.data?.empresa || {},
      metricas: metricsData.data || {},
      compliance: complianceData.data || {},
      documentos_stats: empresaData.data?.documentos_stats || {}
    }

    // Gerar insights com OpenAI
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
        empresa_id: empresaId,
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

/**
 * 🎯 Função principal - Processar analytics
 */
async function processDocumentosAnalytics(request: AnalyticsRequest): Promise<AnalyticsResponse> {
  const startTime = Date.now()
  const { empresa_id, user_id, operation, period_months = 6, force_refresh = false, options = {} } = request

  console.log(`[ANALYTICS] Processando ${operation} para empresa ${empresa_id}`)

  // Verificar cache primeiro (se não forçar refresh)
  if (!force_refresh) {
    const cacheKey = `analytics:${operation}:${empresa_id}:${period_months}:${JSON.stringify(options)}`
    
    try {
      const cachedData = await intelligentCache.get(cacheKey, user_id)
      if (cachedData) {
        console.log(`[ANALYTICS] Cache HIT para ${operation}`)
        return {
          success: true,
          operation,
          result: cachedData,
          processing_time: Date.now() - startTime,
          cached: true,
          generated_at: new Date().toISOString()
        }
      }
    } catch (error) {
      console.warn('[ANALYTICS] Erro no cache, continuando:', error)
    }
  }

  let result: any

  try {
    // Executar operação específica
    switch (operation) {
      case 'calculate_metrics':
        result = await calculateMetricsFinanceiras(empresa_id, period_months)
        break
      
      case 'analyze_compliance':
        result = await analyzeCompliance(empresa_id)
        break
      
      case 'generate_insights':
        result = await generateAIInsights(empresa_id, options.insight_type, options)
        break
      
      case 'process_structured_data':
        result = await processStructuredData(empresa_id, period_months)
        break
      
      default:
        throw new Error(`Operação não suportada: ${operation}`)
    }

    const response: AnalyticsResponse = {
      success: true,
      operation,
      result,
      processing_time: Date.now() - startTime,
      cached: false,
      generated_at: new Date().toISOString()
    }

    // Salvar no cache (TTL baseado na operação)
    const cacheTTL = operation === 'generate_insights' ? 60 * 60 * 1000 : 30 * 60 * 1000 // 1h para insights, 30min para outros
    const cacheKey = `analytics:${operation}:${empresa_id}:${period_months}:${JSON.stringify(options)}`
    
    try {
      await intelligentCache.set(cacheKey, user_id, result, undefined, cacheTTL)
    } catch (error) {
      console.warn('[ANALYTICS] Erro ao salvar no cache:', error)
    }

    console.log(`[ANALYTICS] ${operation} processado em ${Date.now() - startTime}ms`)
    return response

  } catch (error) {
    console.error(`[ANALYTICS] Erro em ${operation}:`, error)

    return {
      success: false,
      operation,
      result: null,
      processing_time: Date.now() - startTime,
      cached: false,
      generated_at: new Date().toISOString(),
      error: error.message
    }
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

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
  const analysis = data.choices[0]?.message?.content

  if (!analysis) {
    throw new Error('Nenhuma análise retornada pela IA')
  }

  try {
    return JSON.parse(analysis)
  } catch (error) {
    console.error('Erro ao parsear resposta da IA:', error)
    throw new Error('Resposta da IA inválida')
  }
}

/**
 * 📊 Processar dados estruturados
 */
async function processStructuredData(empresaId: string, periodMonths: number): Promise<any> {
  console.log(`[STRUCTURED_DATA] Processando dados estruturados para empresa ${empresaId}`)

  const { data: dadosEstruturados } = await supabase
    .rpc('get_dados_estruturados_empresa', {
      p_empresa_id: empresaId,
      p_data_inicio: new Date(Date.now() - periodMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_data_fim: new Date().toISOString().split('T')[0],
      p_confianca_minima: 0.3
    })

  return {
    total_documentos: dadosEstruturados?.length || 0,
    por_tipo: processarDadosPorTipo(dadosEstruturados || []),
    por_mes: processarDadosPorMes(dadosEstruturados || []),
    qualidade_geral: analisarQualidadeDocumentacao([], dadosEstruturados || []),
    periodo_analise: `${periodMonths} meses`
  }
}

// Função principal do servidor
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as AnalyticsRequest

    if (!body.empresa_id || !body.user_id || !body.operation) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'empresa_id, user_id e operation são obrigatórios'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await processDocumentosAnalytics(body)

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro no documentos-analytics-service:', error)

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
