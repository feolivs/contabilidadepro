/**
 * 🏢 EMPRESA CONTEXT SERVICE - ContabilidadePRO
 * Edge Function para fornecer contexto rico sobre empresas
 * Especializada em dados fiscais, regime tributário e indicadores
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { intelligentCache } from '../_shared/unified-cache-adapter.ts'

// Configuração
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Interfaces
interface EmpresaContextRequest {
  empresa_id: string
  user_id: string
  include_financial?: boolean
  include_documents?: boolean
  include_obligations?: boolean
  period_months?: number
}

interface EmpresaContextResponse {
  success: boolean
  empresa: EmpresaData
  financial_summary?: FinancialSummary
  documents_summary?: DocumentsSummary
  obligations_summary?: ObligationsSummary
  recommendations?: string[]
  cached: boolean
  generated_at: string
}

interface EmpresaData {
  id: string
  nome: string
  cnpj: string
  regime_tributario: string
  porte_empresa: string
  situacao_fiscal: string
  created_at: string
  updated_at: string
  // Dados calculados
  meses_ativa: number
  ultimo_movimento: string | null
}

interface FinancialSummary {
  faturamento_atual_mes: number
  faturamento_12_meses: number
  faturamento_medio_mes: number
  crescimento_percentual: number
  limite_simples_nacional: number
  margem_limite: number
  projecao_anual: number
}

interface DocumentsSummary {
  total_documentos: number
  documentos_mes_atual: number
  documentos_pendentes: number
  documentos_processados: number
  tipos_mais_comuns: Array<{tipo: string, count: number}>
  ultimo_upload: string | null
}

interface ObligationsSummary {
  das_pendente: boolean
  das_valor_estimado: number | null
  das_vencimento: string | null
  obrigacoes_mes: Array<{
    tipo: string
    vencimento: string
    status: string
    valor_estimado?: number
  }>
  alertas_criticos: string[]
}

// Inicializar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 🔍 Buscar dados básicos da empresa com validação de acesso
 */
async function getEmpresaData(empresaId: string, userId: string): Promise<EmpresaData> {
  const { data, error } = await supabase
    .from('empresas')
    .select(`
      id, nome, cnpj, regime_tributario, porte_empresa,
      situacao_fiscal, created_at, updated_at, ativa
    `)
    .eq('id', empresaId)
    .eq('user_id', userId) // 🔒 Segurança: só empresas do usuário
    .eq('ativa', true)
    .single()

  if (error || !data) {
    throw new Error('Empresa não encontrada ou sem acesso')
  }

  // Calcular dados derivados
  const createdAt = new Date(data.created_at)
  const now = new Date()
  const mesesAtiva = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30))

  return {
    id: data.id,
    nome: data.nome,
    cnpj: data.cnpj,
    regime_tributario: data.regime_tributario || 'Não definido',
    porte_empresa: data.porte_empresa || 'Micro',
    situacao_fiscal: data.situacao_fiscal || 'Regular',
    created_at: data.created_at,
    updated_at: data.updated_at,
    meses_ativa: mesesAtiva,
    ultimo_movimento: null // Será calculado se necessário
  }
}

/**
 * 💰 Calcular resumo financeiro da empresa
 */
async function getFinancialSummary(empresaId: string, periodMonths: number = 12): Promise<FinancialSummary> {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - periodMonths)

  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)

  // Buscar dados de faturamento dos últimos meses
  const { data: faturamentoData } = await supabase
    .from('documentos_unified')
    .select('valor_total, data_documento, created_at')
    .eq('empresa_id', empresaId)
    .eq('categoria', 'fiscal')
    .gte('data_documento', startDate.toISOString().split('T')[0])
    .not('valor_total', 'is', null)

  const faturamentos = faturamentoData || []

  // Calcular métricas
  const faturamentoTotal = faturamentos.reduce((sum, doc) => sum + (doc.valor_total || 0), 0)
  const faturamentoMesAtual = faturamentos
    .filter(doc => new Date(doc.data_documento) >= currentMonthStart)
    .reduce((sum, doc) => sum + (doc.valor_total || 0), 0)

  const faturamentoMedio = faturamentoTotal / periodMonths
  const crescimento = faturamentoMedio > 0 ? ((faturamentoMesAtual - faturamentoMedio) / faturamentoMedio) * 100 : 0

  // Limites do Simples Nacional (2024)
  const limiteSimplesNacional = 4800000 // R$ 4,8 milhões
  const margemLimite = ((limiteSimplesNacional - faturamentoTotal) / limiteSimplesNacional) * 100
  const projecaoAnual = faturamentoMedio * 12

  return {
    faturamento_atual_mes: faturamentoMesAtual,
    faturamento_12_meses: faturamentoTotal,
    faturamento_medio_mes: faturamentoMedio,
    crescimento_percentual: crescimento,
    limite_simples_nacional: limiteSimplesNacional,
    margem_limite: Math.max(0, margemLimite),
    projecao_anual: projecaoAnual
  }
}

/**
 * 📄 Resumo de documentos da empresa
 */
async function getDocumentsSummary(empresaId: string): Promise<DocumentsSummary> {
  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)

  // Consulta agregada de documentos
  const { data: docsData } = await supabase
    .from('documentos_unified')
    .select('tipo_documento, status_processamento, created_at')
    .eq('empresa_id', empresaId)
    .is('deleted_at', null)

  const documentos = docsData || []

  const totalDocumentos = documentos.length
  const documentosMesAtual = documentos.filter(doc =>
    new Date(doc.created_at) >= currentMonthStart
  ).length

  const documentosPendentes = documentos.filter(doc =>
    doc.status_processamento === 'pendente'
  ).length

  const documentosProcessados = documentos.filter(doc =>
    doc.status_processamento === 'processado'
  ).length

  // Tipos mais comuns
  const tiposCount = documentos.reduce((acc, doc) => {
    acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const tiposMaisComuns = Object.entries(tiposCount)
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const ultimoUpload = documentos.length > 0
    ? documentos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
    : null

  return {
    total_documentos: totalDocumentos,
    documentos_mes_atual: documentosMesAtual,
    documentos_pendentes: documentosPendentes,
    documentos_processados: documentosProcessados,
    tipos_mais_comuns: tiposMaisComuns,
    ultimo_upload: ultimoUpload
  }
}

/**
 * ⚠️ Resumo de obrigações fiscais
 */
async function getObligationsSummary(empresaId: string, empresa: EmpresaData): Promise<ObligationsSummary> {
  const hoje = new Date()
  const proximoMes = new Date()
  proximoMes.setMonth(proximoMes.getMonth() + 1)

  // Verificar DAS pendente (vence dia 20 do mês seguinte)
  const vencimentoDAS = new Date()
  vencimentoDAS.setMonth(vencimentoDAS.getMonth() + 1)
  vencimentoDAS.setDate(20)

  const dasPendente = hoje.getDate() <= 20 // Se ainda não passou do dia 20

  // Estimar valor do DAS baseado no faturamento
  const { data: faturamentoMes } = await supabase
    .from('documentos_unified')
    .select('valor_total')
    .eq('empresa_id', empresaId)
    .eq('categoria', 'fiscal')
    .gte('data_documento', new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0])
    .lt('data_documento', new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0])

  const faturamentoMesAnterior = (faturamentoMes || [])
    .reduce((sum, doc) => sum + (doc.valor_total || 0), 0)

  // Estimar alíquota baseada no regime (simplificado)
  let aliquotaEstimada = 0.06 // 6% padrão Simples Nacional
  if (empresa.regime_tributario === 'Lucro Presumido') aliquotaEstimada = 0.12
  if (empresa.regime_tributario === 'Lucro Real') aliquotaEstimada = 0.15

  const dasValorEstimado = faturamentoMesAnterior * aliquotaEstimada

  // Obrigações do mês
  const obrigacoesMes = [
    {
      tipo: 'DAS',
      vencimento: vencimentoDAS.toISOString().split('T')[0],
      status: dasPendente ? 'pendente' : 'vencido',
      valor_estimado: dasValorEstimado
    }
  ]

  // Alertas críticos
  const alertasCriticos = []
  if (dasPendente && hoje.getDate() > 15) {
    alertasCriticos.push('DAS do mês vence em poucos dias!')
  }
  if (empresa.regime_tributario === 'Não definido') {
    alertasCriticos.push('Regime tributário não definido')
  }

  return {
    das_pendente: dasPendente,
    das_valor_estimado: dasValorEstimado,
    das_vencimento: vencimentoDAS.toISOString().split('T')[0],
    obrigacoes_mes: obrigacoesMes,
    alertas_criticos: alertasCriticos
  }
}

/**
 * 🤖 Gerar recomendações inteligentes
 */
function generateRecommendations(
  empresa: EmpresaData,
  financial?: FinancialSummary,
  documents?: DocumentsSummary,
  obligations?: ObligationsSummary
): string[] {
  const recommendations = []

  // Recomendações financeiras
  if (financial) {
    if (financial.crescimento_percentual > 20) {
      recommendations.push('Crescimento acelerado detectado. Considere planejamento tributário.')
    }
    if (financial.margem_limite < 20) {
      recommendations.push('Próximo do limite do Simples Nacional. Avalie mudança de regime.')
    }
    if (financial.faturamento_atual_mes === 0) {
      recommendations.push('Sem faturamento registrado este mês. Verifique lançamentos.')
    }
  }

  // Recomendações de documentos
  if (documents) {
    if (documents.documentos_pendentes > 5) {
      recommendations.push('Muitos documentos pendentes. Priorize o processamento.')
    }
    if (documents.documentos_mes_atual === 0) {
      recommendations.push('Nenhum documento processado este mês. Mantenha em dia.')
    }
  }

  // Recomendações de obrigações
  if (obligations) {
    if (obligations.alertas_criticos.length > 0) {
      recommendations.push('Há alertas fiscais críticos que requerem atenção.')
    }
    if (obligations.das_valor_estimado > 0) {
      recommendations.push(`DAS estimado: R$ ${obligations.das_valor_estimado.toFixed(2)}. Mantenha reserva.`)
    }
  }

  // Recomendação geral
  if (empresa.regime_tributario === 'Não definido') {
    recommendations.push('Configure o regime tributário para cálculos mais precisos.')
  }

  return recommendations.slice(0, 5) // Máximo 5 recomendações
}

/**
 * 🎯 Função principal - Processar contexto da empresa
 */
async function processEmpresaContext(request: EmpresaContextRequest): Promise<EmpresaContextResponse> {
  const startTime = Date.now()
  const {
    empresa_id,
    user_id,
    include_financial = true,
    include_documents = true,
    include_obligations = true,
    period_months = 12
  } = request

  console.log(`🏢 Processando contexto da empresa: ${empresa_id}`)

  // 1. Verificar cache primeiro
  const cacheKey = `empresa_context:${empresa_id}:${user_id}:${include_financial ? 'f' : ''}${include_documents ? 'd' : ''}${include_obligations ? 'o' : ''}`

  try {
    const cachedData = await intelligentCache.get(cacheKey, user_id)
    if (cachedData) {
      console.log(`🎯 Cache HIT para empresa ${empresa_id}`)
      return {
        ...cachedData,
        cached: true
      }
    }
  } catch (error) {
    console.warn('Erro no cache, continuando:', error)
  }

  // 2. Buscar dados básicos da empresa
  const empresa = await getEmpresaData(empresa_id, user_id)

  // 3. Buscar dados opcionais em paralelo
  const promises = []

  if (include_financial) {
    promises.push(getFinancialSummary(empresa_id, period_months))
  }

  if (include_documents) {
    promises.push(getDocumentsSummary(empresa_id))
  }

  if (include_obligations) {
    promises.push(getObligationsSummary(empresa_id, empresa))
  }

  const results = await Promise.allSettled(promises)

  let resultIndex = 0
  const financial_summary = include_financial && results[resultIndex++]?.status === 'fulfilled'
    ? results[resultIndex - 1].value as FinancialSummary
    : undefined

  const documents_summary = include_documents && results[resultIndex++]?.status === 'fulfilled'
    ? results[resultIndex - 1].value as DocumentsSummary
    : undefined

  const obligations_summary = include_obligations && results[resultIndex++]?.status === 'fulfilled'
    ? results[resultIndex - 1].value as ObligationsSummary
    : undefined

  // 4. Gerar recomendações
  const recommendations = generateRecommendations(
    empresa,
    financial_summary,
    documents_summary,
    obligations_summary
  )

  const response: EmpresaContextResponse = {
    success: true,
    empresa,
    financial_summary,
    documents_summary,
    obligations_summary,
    recommendations,
    cached: false,
    generated_at: new Date().toISOString()
  }

  // 5. Salvar no cache (15 minutos)
  try {
    await intelligentCache.set(cacheKey, user_id, response, undefined, 15 * 60 * 1000)
  } catch (error) {
    console.warn('Erro ao salvar no cache:', error)
  }

  console.log(`✅ Contexto da empresa processado em ${Date.now() - startTime}ms`)
  return response
}

// Função principal do servidor
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json() as EmpresaContextRequest

    if (!body.empresa_id || !body.user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'empresa_id e user_id são obrigatórios'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await processEmpresaContext(body)

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Erro no empresa-context-service:', error)

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