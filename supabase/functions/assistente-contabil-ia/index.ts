/**
 * 🤖 ASSISTENTE CONTÁBIL IA - ContabilidadePRO
 * 
 * Edge Function especializada para assistente de IA focado em contabilidade brasileira
 * Utiliza GPT-4o para fornecer respostas precisas e contextualizadas
 * 
 * FUNCIONALIDADES:
 * - Chat conversacional especializado em contabilidade brasileira
 * - Cálculos fiscais automatizados (DAS, IRPJ, CSLL, etc.)
 * - Análise de conformidade fiscal
 * - Sugestões de otimização tributária
 * - Classificação contábil de documentos
 * - Análise de prazos e obrigações
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// =====================================================
// CONFIGURAÇÕES
// =====================================================
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY não configurada')
}

// =====================================================
// PROMPTS ESPECIALIZADOS
// =====================================================
const SYSTEM_PROMPT = `Você é um assistente contábil especializado em contabilidade brasileira, com conhecimento profundo sobre:

LEGISLAÇÃO E NORMAS:
- Código Tributário Nacional (CTN)
- Lei das S.A. (Lei 6.404/76)
- Normas Brasileiras de Contabilidade (NBC)
- Princípios Fundamentais de Contabilidade
- SPED (Sistema Público de Escrituração Digital)

REGIMES TRIBUTÁRIOS:
- Simples Nacional (LC 123/2006 e atualizações)
- Lucro Presumido
- Lucro Real
- MEI (Microempreendedor Individual)

OBRIGAÇÕES FISCAIS:
- DAS (Documento de Arrecadação do Simples Nacional)
- DARF (Documento de Arrecadação de Receitas Federais)
- GPS (Guia da Previdência Social)
- FGTS
- DEFIS, DASN-SIMEI, ECF, ECD, EFD-Contribuições

CARACTERÍSTICAS DO SEU ATENDIMENTO:
- Sempre forneça respostas precisas e atualizadas
- Use linguagem técnica mas acessível
- Cite a legislação aplicável quando relevante
- Forneça exemplos práticos quando possível
- Alerte sobre prazos e penalidades
- Sugira otimizações tributárias legais
- Mantenha foco na realidade brasileira

FORMATO DAS RESPOSTAS:
- Use markdown para formatação
- Organize informações em tópicos quando apropriado
- Destaque valores monetários, datas e percentuais
- Inclua alertas importantes com emojis (⚠️, 💡, ✅)
- Seja conciso mas completo`

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { pergunta, empresa_id, contexto, user_id, conversationHistory, conversationContext } = await req.json()

    if (!pergunta || pergunta.trim().length === 0) {
      return Response.json({
        success: false,
        error: 'Pergunta é obrigatória'
      }, {
        status: 400,
        headers: corsHeaders
      })
    }

    const startTime = Date.now()

    // Buscar contexto das empresas do usuário
    let contextualInfo = ''
    if (user_id) {
      const { data: empresas } = await supabase
        .from('empresas')
        .select('id, nome, cnpj, regime_tributario, atividade_principal')
        .eq('user_id', user_id)
        .eq('ativa', true)

      if (empresas && empresas.length > 0) {
        contextualInfo = `\n\nCONTEXTO DAS EMPRESAS DO USUÁRIO:\n${empresas.map(e => 
          `- ${e.nome} (${e.cnpj}) - ${e.regime_tributario} - ${e.atividade_principal}`
        ).join('\n')}`
      }
    }

    // Determinar tipo de consulta e ajustar prompt
    const tipoConsulta = determinarTipoConsulta(pergunta)
    const promptEspecializado = construirPromptEspecializado(pergunta, tipoConsulta, contextualInfo)

    // Preparar mensagens incluindo histórico de conversa
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ]

    // Adicionar histórico de conversa se disponível (limitado a 5 para função básica)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-5).forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content
        })
      })
    }

    // Adicionar contexto de conversa se disponível
    if (conversationContext) {
      promptEspecializado = `${conversationContext}\n\n${promptEspecializado}`
    }

    // Adicionar a pergunta atual
    messages.push({
      role: 'user',
      content: promptEspecializado
    })

    // Chamar OpenAI GPT-4o
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages,
        temperature: 0.3,
        max_tokens: 2000,
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

    // Salvar conversa no histórico
    try {
      await supabase.from('conversas_ia').insert({
        user_id,
        empresa_id,
        pergunta,
        resposta,
        tipo_consulta: tipoConsulta,
        modelo_usado: 'gpt-4o',
        tokens_usados: data.usage?.total_tokens || 0,
        tempo_resposta: tempoResposta,
        contexto,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.warn('Erro ao salvar conversa:', error)
    }

    return Response.json({
      success: true,
      resposta,
      tipo_consulta: tipoConsulta,
      tempo_resposta: tempoResposta,
      tokens_usados: data.usage?.total_tokens || 0,
      modelo: 'gpt-4o'
    }, {
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Erro no assistente contábil:', error)
    return Response.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, {
      status: 500,
      headers: corsHeaders
    })
  }
})

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function determinarTipoConsulta(pergunta: string): string {
  const perguntaLower = pergunta.toLowerCase()

  // Cálculos fiscais
  if (perguntaLower.includes('das') || perguntaLower.includes('calcul') || 
      perguntaLower.includes('imposto') || perguntaLower.includes('aliquota')) {
    return 'calculo_fiscal'
  }

  // Prazos e obrigações
  if (perguntaLower.includes('prazo') || perguntaLower.includes('vencimento') || 
      perguntaLower.includes('obrigação') || perguntaLower.includes('entrega')) {
    return 'prazos_obrigacoes'
  }

  // Análise financeira
  if (perguntaLower.includes('dre') || perguntaLower.includes('balanço') || 
      perguntaLower.includes('análise') || perguntaLower.includes('indicador')) {
    return 'analise_financeira'
  }

  // Classificação contábil
  if (perguntaLower.includes('classificar') || perguntaLower.includes('conta') || 
      perguntaLower.includes('plano de conta') || perguntaLower.includes('lançamento')) {
    return 'classificacao_contabil'
  }

  // Conformidade fiscal
  if (perguntaLower.includes('conformidade') || perguntaLower.includes('auditoria') || 
      perguntaLower.includes('risco') || perguntaLower.includes('irregularidade')) {
    return 'conformidade_fiscal'
  }

  // Otimização tributária
  if (perguntaLower.includes('otimiz') || perguntaLower.includes('reduz') || 
      perguntaLower.includes('estratégia') || perguntaLower.includes('planejamento')) {
    return 'otimizacao_tributaria'
  }

  return 'consulta_geral'
}

function construirPromptEspecializado(pergunta: string, tipo: string, contexto: string): string {
  let promptBase = pergunta + contexto

  switch (tipo) {
    case 'calculo_fiscal':
      return `${promptBase}\n\nPor favor, forneça um cálculo detalhado incluindo:
- Base de cálculo
- Alíquotas aplicáveis
- Valores de cada tributo
- Data de vencimento
- Código de barras (se aplicável)
- Legislação de referência`

    case 'prazos_obrigacoes':
      return `${promptBase}\n\nPor favor, liste:
- Prazos específicos com datas
- Penalidades por atraso
- Documentos necessários
- Procedimentos para cumprimento
- Alertas importantes`

    case 'analise_financeira':
      return `${promptBase}\n\nPor favor, forneça:
- Análise dos indicadores
- Comparações com períodos anteriores
- Pontos de atenção
- Recomendações de melhoria
- Gráficos ou tabelas (em texto)`

    case 'classificacao_contabil':
      return `${promptBase}\n\nPor favor, indique:
- Conta contábil apropriada
- Código do plano de contas
- Natureza do lançamento (débito/crédito)
- Histórico padrão
- Documentação necessária`

    case 'conformidade_fiscal':
      return `${promptBase}\n\nPor favor, analise:
- Status de conformidade
- Riscos identificados
- Ações corretivas necessárias
- Prazos para regularização
- Impactos potenciais`

    case 'otimizacao_tributaria':
      return `${promptBase}\n\nPor favor, sugira:
- Estratégias legais de otimização
- Mudanças de regime tributário
- Aproveitamento de incentivos
- Planejamento tributário
- Análise custo-benefício`

    default:
      return promptBase
  }
}
