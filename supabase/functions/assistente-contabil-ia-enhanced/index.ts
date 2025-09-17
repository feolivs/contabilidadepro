/**
 * 🚀 ASSISTENTE CONTÁBIL IA ENHANCED - ContabilidadePRO
 * 
 * Edge Function aprimorada com contexto rico para assistente de IA
 * Versão 2.0 com análise contextual completa e insights inteligentes
 * 
 * FUNCIONALIDADES AVANÇADAS:
 * - Contexto rico com dados completos das empresas
 * - Análise de cálculos fiscais históricos
 * - Monitoramento de obrigações em tempo real
 * - Insights automáticos e sugestões proativas
 * - Personalização baseada em preferências do usuário
 * - Cache inteligente para performance otimizada
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// Prompt base aprimorado com contexto rico
const ENHANCED_SYSTEM_PROMPT = `
Você é um ASSISTENTE CONTÁBIL ESPECIALIZADO EM CONTABILIDADE BRASILEIRA com acesso a dados contextuais completos.

SUAS CAPACIDADES AVANÇADAS:
- Análise de dados financeiros em tempo real
- Monitoramento de obrigações fiscais
- Cálculos tributários precisos
- Insights baseados em histórico da empresa
- Sugestões proativas de otimização
- Alertas de conformidade fiscal

DADOS CONTEXTUAIS DISPONÍVEIS:
- Informações completas das empresas
- Histórico de cálculos fiscais
- Obrigações pendentes e vencimentos
- Documentos fiscais processados
- Tendências e análises automáticas
- Score de conformidade fiscal

REGRAS DE ATENDIMENTO:
1. SEMPRE use os dados contextuais fornecidos
2. Forneça respostas específicas baseadas nos dados reais
3. Identifique oportunidades de otimização
4. Alerte sobre riscos e não conformidades
5. Sugira ações práticas e próximos passos
6. Cite valores e datas específicas quando disponível
7. Mantenha foco na legislação brasileira atual

FORMATO DE RESPOSTA:
- Resposta direta e objetiva
- Dados específicos da empresa quando relevante
- Alertas importantes destacados
- Sugestões de ação quando aplicável
- Base legal quando necessário

Responda sempre considerando o contexto completo fornecido.
`

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================

serve(async (req) => {
  // Verificar método
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      pergunta,
      contexto,
      dados_contextuais,
      enhanced_context,
      timestamp,
      conversationHistory,
      conversationContext
    } = await req.json()

    // Validações
    if (!pergunta?.trim()) {
      return Response.json({
        success: false,
        error: 'Pergunta é obrigatória'
      }, {
        status: 400,
        headers: corsHeaders
      })
    }

    if (!OPENAI_API_KEY) {
      return Response.json({
        success: false,
        error: 'OpenAI API key não configurada'
      }, {
        status: 500,
        headers: corsHeaders
      })
    }

    const startTime = Date.now()

    // Construir prompt contextual rico com histórico de conversa
    const promptContextual = construirPromptContextualRico(
      pergunta,
      dados_contextuais,
      enhanced_context,
      conversationContext
    )

    // Determinar tipo de consulta avançado
    const tipoConsulta = determinarTipoConsultaAvancado(pergunta, dados_contextuais)

    console.log(`🤖 Processando consulta: ${tipoConsulta}`)
    console.log(`📊 Contexto: ${Object.keys(dados_contextuais || {}).join(', ')}`)

    // Preparar mensagens incluindo histórico de conversa
    const messages = [
      {
        role: 'system',
        content: ENHANCED_SYSTEM_PROMPT
      }
    ]

    // Adicionar histórico de conversa se disponível
    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Adicionar mensagens do histórico (máximo 10)
      conversationHistory.slice(-10).forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      })
    }

    // Adicionar a pergunta atual
    messages.push({
      role: 'user',
      content: promptContextual
    })

    // Chamar OpenAI GPT-4o com contexto rico e histórico
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.2, // Mais determinístico para dados financeiros
        max_tokens: 3000, // Mais tokens para respostas detalhadas
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const resposta = data.choices[0]?.message?.content

    if (!resposta) {
      throw new Error('Resposta vazia da OpenAI')
    }

    const tempoResposta = Date.now() - startTime

    // Gerar insights adicionais baseados no contexto
    const insightsGerados = gerarInsightsAdicionais(dados_contextuais, pergunta)

    // Salvar conversa aprimorada no histórico
    try {
      await supabase.from('conversas_ia').insert({
        user_id: enhanced_context?.userId,
        empresa_id: enhanced_context?.empresaId,
        pergunta,
        resposta,
        tipo_consulta: tipoConsulta,
        modelo_usado: 'gpt-4o-enhanced',
        tokens_usados: data.usage?.total_tokens || 0,
        tempo_resposta: tempoResposta,
        contexto: {
          ...dados_contextuais,
          enhanced_context,
          insights_gerados: insightsGerados,
          timestamp
        },
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.warn('⚠️ Erro ao salvar conversa:', error)
    }

    // Log de métricas
    console.log(`✅ Consulta processada em ${tempoResposta}ms`)
    console.log(`📈 Tokens: ${data.usage?.total_tokens || 0}`)
    console.log(`🎯 Insights gerados: ${insightsGerados.length}`)

    return Response.json({
      success: true,
      resposta,
      tipo_consulta: tipoConsulta,
      tempo_resposta: tempoResposta,
      tokens_usados: data.usage?.total_tokens || 0,
      modelo: 'gpt-4o-enhanced',
      insights_gerados: insightsGerados,
      contexto_processado: {
        empresas_analisadas: dados_contextuais?.empresas?.length || (dados_contextuais?.empresa ? 1 : 0),
        calculos_considerados: dados_contextuais?.empresa?.calculos_recentes?.length || 0,
        obrigacoes_verificadas: dados_contextuais?.empresa?.obrigacoes_pendentes?.length || 0,
        documentos_analisados: dados_contextuais?.empresa?.documentos_recentes?.length || 0
      }
    }, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('❌ Erro no assistente contábil enhanced:', error)
    
    return Response.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: corsHeaders
    })
  }
})

// =====================================================
// FUNÇÕES AUXILIARES APRIMORADAS
// =====================================================

/**
 * Constrói prompt contextual rico com todos os dados disponíveis
 */
function construirPromptContextualRico(
  pergunta: string,
  dadosContextuais: any,
  enhancedContext: any,
  conversationContext?: string
): string {
  let prompt = `PERGUNTA DO USUÁRIO: ${pergunta}\n\n`

  // Adicionar contexto de conversa se disponível
  if (conversationContext) {
    prompt += `${conversationContext}\n\n`
  }

  // Adicionar contexto da empresa específica
  if (dadosContextuais?.empresa) {
    const empresa = dadosContextuais.empresa
    prompt += `📊 EMPRESA EM FOCO:\n`
    prompt += `• Nome: ${empresa.nome}\n`
    prompt += `• CNPJ: ${empresa.cnpj}\n`
    prompt += `• Regime: ${empresa.regime_tributario}\n`
    prompt += `• Atividade: ${empresa.atividade_principal}\n`
    prompt += `• Status: ${empresa.status}\n`

    // Insights da empresa
    if (empresa.insights) {
      prompt += `\n🎯 INSIGHTS AUTOMÁTICOS:\n`
      prompt += `• Carga Tributária Média: ${empresa.insights.carga_tributaria_media.toFixed(2)}%\n`
      prompt += `• Tendência: ${empresa.insights.tendencia_faturamento}\n`
      prompt += `• Obrigações Críticas: ${empresa.insights.obrigacoes_criticas}\n`
      prompt += `• Score Conformidade: ${empresa.insights.score_conformidade}/100\n`
      
      if (empresa.insights.alertas_importantes.length > 0) {
        prompt += `• Alertas: ${empresa.insights.alertas_importantes.join('; ')}\n`
      }
    }

    // Cálculos recentes
    if (empresa.calculos_recentes?.length > 0) {
      prompt += `\n💰 CÁLCULOS RECENTES:\n`
      empresa.calculos_recentes.slice(0, 5).forEach((calc: any) => {
        prompt += `• ${calc.tipo_calculo} ${calc.competencia}: R$ ${calc.valor_total.toLocaleString('pt-BR')} (${calc.status})\n`
      })
    }

    // Obrigações pendentes
    if (empresa.obrigacoes_pendentes?.length > 0) {
      prompt += `\n📋 OBRIGAÇÕES PENDENTES:\n`
      empresa.obrigacoes_pendentes.slice(0, 5).forEach((obr: any) => {
        prompt += `• ${obr.nome} - Vence: ${obr.data_vencimento} (${obr.situacao})\n`
      })
    }
  }

  // Adicionar contexto de múltiplas empresas
  if (dadosContextuais?.empresas?.length > 0) {
    prompt += `\n🏢 EMPRESAS DO USUÁRIO (${dadosContextuais.empresas.length}):\n`
    dadosContextuais.empresas.slice(0, 5).forEach((emp: any) => {
      prompt += `• ${emp.nome} (${emp.regime_tributario}) - ${emp.obrigacoes_pendentes?.length || 0} obrigações pendentes\n`
    })
  }

  // Adicionar resumo geral
  if (dadosContextuais?.resumo_geral) {
    const resumo = dadosContextuais.resumo_geral
    prompt += `\n📈 RESUMO GERAL:\n`
    prompt += `• Total de Empresas: ${resumo.total_empresas} (${resumo.empresas_ativas} ativas)\n`
    prompt += `• Próximos Vencimentos: ${resumo.proximos_vencimentos?.length || 0}\n`
  }

  // Adicionar configurações do usuário
  if (dadosContextuais?.configuracoes_usuario) {
    const config = dadosContextuais.configuracoes_usuario
    prompt += `\n⚙️ PREFERÊNCIAS DO USUÁRIO:\n`
    prompt += `• Estilo: ${config.communication_style}\n`
    prompt += `• Nível de Detalhamento: ${config.detail_level}/5\n`
    prompt += `• Focos: ${config.focus_areas?.join(', ')}\n`
    
    if (config.custom_prompt) {
      prompt += `• Instruções Personalizadas: ${config.custom_prompt}\n`
    }
  }

  prompt += `\n🎯 RESPONDA CONSIDERANDO TODOS OS DADOS CONTEXTUAIS ACIMA.`

  return prompt
}

/**
 * Determina tipo de consulta de forma mais avançada
 */
function determinarTipoConsultaAvancado(pergunta: string, dadosContextuais: any): string {
  const perguntaLower = pergunta.toLowerCase()

  // Análise contextual baseada nos dados disponíveis
  if (dadosContextuais?.empresa?.calculos_recentes?.length > 0) {
    if (perguntaLower.includes('calcul') || perguntaLower.includes('das') || perguntaLower.includes('imposto')) {
      return 'calculo_fiscal_contextual'
    }
  }

  if (dadosContextuais?.empresa?.obrigacoes_pendentes?.length > 0) {
    if (perguntaLower.includes('prazo') || perguntaLower.includes('vencimento') || perguntaLower.includes('obrigação')) {
      return 'obrigacoes_contextuais'
    }
  }

  // Tipos tradicionais
  if (perguntaLower.includes('otimiz') || perguntaLower.includes('economia') || perguntaLower.includes('reduz')) {
    return 'otimizacao_tributaria'
  }

  if (perguntaLower.includes('analis') || perguntaLower.includes('comparar') || perguntaLower.includes('tendencia')) {
    return 'analise_financeira'
  }

  if (perguntaLower.includes('conformidade') || perguntaLower.includes('compliance') || perguntaLower.includes('risco')) {
    return 'conformidade_fiscal'
  }

  return 'consulta_contextual_geral'
}

/**
 * Gera insights adicionais baseados no contexto
 */
function gerarInsightsAdicionais(dadosContextuais: any, pergunta: string): string[] {
  const insights: string[] = []

  if (dadosContextuais?.empresa) {
    const empresa = dadosContextuais.empresa

    // Insights de obrigações
    if (empresa.obrigacoes_pendentes?.length > 0) {
      const vencidas = empresa.obrigacoes_pendentes.filter((o: any) => o.situacao === 'vencida').length
      if (vencidas > 0) {
        insights.push(`⚠️ ${vencidas} obrigação(ões) vencida(s) requer atenção imediata`)
      }

      const proximas = empresa.obrigacoes_pendentes.filter((o: any) => o.situacao === 'proxima').length
      if (proximas > 0) {
        insights.push(`📅 ${proximas} obrigação(ões) vencendo nos próximos 7 dias`)
      }
    }

    // Insights de cálculos
    if (empresa.calculos_recentes?.length > 0) {
      const valorTotal = empresa.calculos_recentes.reduce((sum: number, calc: any) => sum + calc.valor_total, 0)
      if (valorTotal > 0) {
        insights.push(`💰 Total em impostos nos últimos meses: R$ ${valorTotal.toLocaleString('pt-BR')}`)
      }
    }

    // Insights de conformidade
    if (empresa.insights?.score_conformidade < 70) {
      insights.push(`🚨 Score de conformidade baixo (${empresa.insights.score_conformidade}/100) - revisar processos`)
    }

    // Insights de otimização
    if (empresa.insights?.economia_potencial > 1000) {
      insights.push(`💡 Economia potencial identificada: R$ ${empresa.insights.economia_potencial.toLocaleString('pt-BR')}`)
    }
  }

  return insights
}
