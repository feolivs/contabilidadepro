/**
 * 🤖 ASSISTENTE CONTÁBIL IA - Versão Completa 2025
 * ContabilidadePRO - Chat IA com cache inteligente e contexto empresarial
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Configuração Supabase
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// 🧠 Cache Inteligente com TTL dinâmico baseado no tipo de pergunta
interface CacheEntry {
  data: any
  expires: number
  queryType: string
  hitCount: number
  lastUsed: number
}

const intelligentCache = new Map<string, CacheEntry>()
const MAX_CACHE_SIZE = 1000

// TTLs diferentes por tipo de pergunta (em ms)
const CACHE_TTLS = {
  'legal': 24 * 60 * 60 * 1000,      // 24h - Informações legais mudam pouco
  'calculation': 12 * 60 * 60 * 1000, // 12h - Cálculos podem ter mudanças de alíquotas
  'company_specific': 30 * 60 * 1000,  // 30min - Dados específicos da empresa
  'general': 2 * 60 * 60 * 1000,      // 2h - Perguntas gerais
  'procedural': 6 * 60 * 60 * 1000    // 6h - Procedimentos administrativos
}

// 🔍 Classificação inteligente de perguntas
function classifyQuery(pergunta: string): string {
  const query = pergunta.toLowerCase()

  // Perguntas legais/regulamentares
  if (/\b(lei|decreto|resolução|cfc|receita federal|legislação|norma|regulamento)\b/i.test(query)) {
    return 'legal'
  }

  // Cálculos e alíquotas
  if (/\b(calcul|aliquota|percentual|das|simples nacional|imposto|tributo|%)\b/i.test(query)) {
    return 'calculation'
  }

  // Informações específicas da empresa
  if (/\b(minha empresa|esta empresa|nossa empresa|empresa atual|cnpj|faturamento|regime)\b/i.test(query)) {
    return 'company_specific'
  }

  // Procedimentos
  if (/\b(como|passo a passo|procedimento|processo|fazer|emitir|gerar)\b/i.test(query)) {
    return 'procedural'
  }

  return 'general'
}

// 🚀 Gerenciamento inteligente de cache
function getCached(key: string): any | null {
  const entry = intelligentCache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expires) {
    intelligentCache.delete(key)
    return null
  }

  // Atualizar estatísticas de uso
  entry.hitCount++
  entry.lastUsed = Date.now()

  return entry.data
}

function setCache(key: string, data: any, queryType: string): void {
  // Limpeza inteligente do cache quando cheio
  if (intelligentCache.size >= MAX_CACHE_SIZE) {
    cleanCache()
  }

  const ttl = CACHE_TTLS[queryType] || CACHE_TTLS.general

  intelligentCache.set(key, {
    data,
    expires: Date.now() + ttl,
    queryType,
    hitCount: 0,
    lastUsed: Date.now()
  })
}

// 🧹 Limpeza inteligente - remove itens menos usados primeiro
function cleanCache(): void {
  const entries = Array.from(intelligentCache.entries())

  // Ordenar por relevância (hitCount + recência)
  entries.sort(([,a], [,b]) => {
    const scoreA = a.hitCount * 1000 + (Date.now() - a.lastUsed)
    const scoreB = b.hitCount * 1000 + (Date.now() - b.lastUsed)
    return scoreA - scoreB
  })

  // Remove 25% dos menos relevantes
  const toRemove = Math.floor(entries.length * 0.25)
  for (let i = 0; i < toRemove; i++) {
    intelligentCache.delete(entries[i][0])
  }

  console.log(`🧹 Cache cleaned: removed ${toRemove} entries, ${intelligentCache.size} remaining`)
}

// 🏢 Contexto empresarial inteligente
async function fetchEmpresaContext(empresaId: string, userId: string): Promise<any> {
  try {
    console.log('🏢 Fetching company context for:', empresaId)

    // Dados básicos da empresa
    const { data: empresa } = await supabase
      .from('empresas')
      .select('nome, cnpj, regime_tributario, situacao_fiscal, ativa, created_at')
      .eq('id', empresaId)
      .eq('user_id', userId)
      .single()

    if (!empresa) {
      console.log('❌ Company not found')
      return null
    }

    // Dados financeiros recentes (últimos 3 meses)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data: documentos } = await supabase
      .from('documentos_fiscais')
      .select('valor_total, tipo_documento, created_at')
      .eq('empresa_id', empresaId)
      .gte('created_at', threeMonthsAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    // Cálculos financeiros
    const faturamentoTotal = documentos?.reduce((sum, doc) => sum + (doc.valor_total || 0), 0) || 0
    const documentosPorTipo = documentos?.reduce((acc, doc) => {
      acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Último mês para comparação
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const faturamentoUltimoMes = documentos?.filter(doc =>
      new Date(doc.created_at) >= lastMonth
    ).reduce((sum, doc) => sum + (doc.valor_total || 0), 0) || 0

    // Verificar obrigações pendentes (se existir a tabela)
    let obrigacoesPendentes = 0
    try {
      const { count } = await supabase
        .from('obrigacoes_fiscais')
        .select('*', { count: 'exact', head: true })
        .eq('empresa_id', empresaId)
        .eq('status', 'pendente')
        .gte('vencimento', new Date().toISOString())

      obrigacoesPendentes = count || 0
    } catch (error) {
      // Tabela pode não existir ainda
      console.log('📋 Obligations table not found, skipping')
    }

    const context = {
      success: true,
      empresa: {
        ...empresa,
        idade_empresa: Math.floor((Date.now() - new Date(empresa.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      },
      financeiro: {
        faturamento_3_meses: faturamentoTotal,
        faturamento_ultimo_mes: faturamentoUltimoMes,
        media_mensal: faturamentoTotal / 3,
        documentos_por_tipo: documentosPorTipo,
        total_documentos: documentos?.length || 0
      },
      compliance: {
        obrigacoes_pendentes: obrigacoesPendentes,
        status_geral: obrigacoesPendentes > 0 ? 'Atenção necessária' : 'Em dia'
      },
      timestamp: new Date().toISOString()
    }

    console.log('✅ Company context fetched successfully')
    return context

  } catch (error) {
    console.error('❌ Error fetching company context:', error)
    return { success: false, error: error.message }
  }
}

// 📝 Construção do prompt contextual
function buildContextualPrompt(basePrompt: string, empresaContext?: any): string {
  if (!empresaContext?.success) {
    return basePrompt
  }

  const { empresa, financeiro, compliance } = empresaContext

  return `${basePrompt}

🏢 CONTEXTO DA EMPRESA ATUAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Nome: ${empresa.nome}
• CNPJ: ${empresa.cnpj}
• Regime Tributário: ${empresa.regime_tributario}
• Situação Fiscal: ${empresa.situacao_fiscal}
• Idade da Empresa: ${empresa.idade_empresa} anos

💰 SITUAÇÃO FINANCEIRA (últimos 3 meses):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Faturamento Total: R$ ${financeiro.faturamento_3_meses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Faturamento Último Mês: R$ ${financeiro.faturamento_ultimo_mes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Média Mensal: R$ ${financeiro.media_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Total de Documentos: ${financeiro.total_documentos}

📋 COMPLIANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Obrigações Pendentes: ${compliance.obrigacoes_pendentes}
• Status Geral: ${compliance.status_geral}

⚠️ INSTRUÇÕES IMPORTANTES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• SEMPRE use estes dados reais ao responder sobre "empresa", "minha empresa" ou "nossa empresa"
• Seja específico com os números e valores apresentados
• Mencione detalhes relevantes do contexto empresarial nas suas respostas
• Se perguntado sobre situação da empresa, use os dados fornecidos acima`
}

const basePrompt = `Você é um assistente contábil especializado em contabilidade brasileira.

CONHECIMENTOS ESPECIALISTAS:
• Simples Nacional, Lucro Presumido, Lucro Real, MEI
• DAS, DARF, GPS, GFIP e demais obrigações fiscais
• Prazos, alíquotas, cálculos tributários e fiscais
• Legislação tributária brasileira atualizada
• Contabilidade digital e eSocial

DIRETRIZES DE RESPOSTA:
• Seja preciso, técnico mas acessível
• Cite base legal quando relevante
• Use dados específicos fornecidos no contexto
• Mantenha respostas objetivas e bem estruturadas
• Se não souber algo específico, seja transparente

Responda sempre em português brasileiro com foco prático.`

Deno.serve(async (req: Request) => {
  console.log('🚀 Function started, method:', req.method)

  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )
  }

  try {
    const body = await req.json()
    const { action = 'chat', user_id, pergunta, empresa_id } = body

    // Validações básicas
    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Health check + cache stats
    if (action === 'health') {
      const cacheStats = {
        size: intelligentCache.size,
        maxSize: MAX_CACHE_SIZE,
        usage: `${((intelligentCache.size / MAX_CACHE_SIZE) * 100).toFixed(1)}%`,
        typeDistribution: {}
      }

      // Estatísticas por tipo de query
      for (const [, entry] of intelligentCache) {
        cacheStats.typeDistribution[entry.queryType] =
          (cacheStats.typeDistribution[entry.queryType] || 0) + 1
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            openai_configured: !!Deno.env.get('OPENAI_API_KEY'),
            cache: cacheStats
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Cache stats detalhadas
    if (action === 'cache-stats') {
      const entries = Array.from(intelligentCache.entries())
      const stats = {
        total_entries: entries.length,
        total_hits: entries.reduce((sum, [, entry]) => sum + entry.hitCount, 0),
        by_type: {}
      }

      for (const [, entry] of entries) {
        if (!stats.by_type[entry.queryType]) {
          stats.by_type[entry.queryType] = { count: 0, hits: 0, avg_ttl: 0 }
        }
        stats.by_type[entry.queryType].count++
        stats.by_type[entry.queryType].hits += entry.hitCount
        stats.by_type[entry.queryType].avg_ttl += (entry.expires - entry.lastUsed)
      }

      return new Response(
        JSON.stringify({ success: true, data: stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Chat com cache inteligente e contexto empresarial
    if (action === 'chat') {
      if (!pergunta?.trim()) {
        return new Response(
          JSON.stringify({ success: false, error: 'Pergunta é obrigatória' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }

      const startTime = Date.now()

      // 🔍 Classificar pergunta para cache inteligente
      const queryType = classifyQuery(pergunta)
      console.log('🔍 Query classified as:', queryType)

      // 🚀 Verificar cache (considerando empresa_id se presente)
      const cacheKey = empresa_id
        ? `${queryType}:${pergunta}:${empresa_id}:${user_id}`
        : `${queryType}:${pergunta}:${user_id}`

      const cached = getCached(cacheKey)
      if (cached) {
        console.log('⚡ Cache HIT for query type:', queryType)
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              ...cached,
              cached: true,
              cache_type: queryType,
              response_time_ms: Date.now() - startTime
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }

      console.log('💭 Cache MISS, processing query...')

      // 🏢 Buscar contexto empresarial se necessário
      let empresaContext = null
      let contextUsed = false

      if (empresa_id && (queryType === 'company_specific' || /empresa|cnpj|faturamento|regime/i.test(pergunta))) {
        console.log('🏢 Fetching company context...')
        empresaContext = await fetchEmpresaContext(empresa_id, user_id)
        contextUsed = !!empresaContext?.success
      }

      // 🤖 Construir prompt contextual
      const contextualPrompt = buildContextualPrompt(basePrompt, empresaContext)

      // 🔑 Chamada para OpenAI
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
      if (!OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              resposta: 'OpenAI API Key não configurada. Configure a variável OPENAI_API_KEY.',
              cached: false,
              context_used: contextUsed,
              timestamp: new Date().toISOString(),
              ai_method: 'error'
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }

      try {
        console.log('🤖 Making OpenAI request...')
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: contextualPrompt },
              { role: 'user', content: pergunta }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        })

        if (!openAIResponse.ok) {
          const errorText = await openAIResponse.text()
          throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`)
        }

        const openAIData = await openAIResponse.json()
        const resposta = openAIData.choices[0]?.message?.content

        if (!resposta) {
          throw new Error('Resposta vazia da OpenAI')
        }

        const responseData = {
          resposta,
          cached: false,
          context_used: contextUsed,
          query_type: queryType,
          response_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          ai_method: 'openai'
        }

        // 💾 Salvar no cache inteligente
        setCache(cacheKey, responseData, queryType)
        console.log(`💾 Response cached with TTL: ${CACHE_TTLS[queryType] / 1000 / 60} minutes`)

        return new Response(
          JSON.stringify({ success: true, data: responseData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )

      } catch (openaiError) {
        console.error('💥 OpenAI call failed:', openaiError)
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              resposta: `Erro na chamada OpenAI: ${openaiError.message}. Tente novamente em alguns momentos.`,
              cached: false,
              context_used: contextUsed,
              timestamp: new Date().toISOString(),
              ai_method: 'error'
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
        )
      }
    }

    // Ação não suportada
    return new Response(
      JSON.stringify({ success: false, error: `Ação não suportada: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
    )

  } catch (error) {
    console.error('💥 Function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno: ' + error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})