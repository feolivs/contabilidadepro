import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SimulacaoInput {
  receitaAnual: number
  atividadePrincipal: string
  folhaSalarial?: number
  despesasOperacionais?: number
  regimesParaComparar: ('Simples Nacional' | 'Lucro Presumido' | 'Lucro Real')[]
}

interface ResultadoSimulacao {
  regime: string
  impostoTotal: number
  aliquotaEfetiva: number
  detalhamento: any
  vantagens: string[]
  desvantagens: string[]
  aplicavel: boolean
  motivoNaoAplicavel?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { 
      receitaAnual, 
      atividadePrincipal, 
      folhaSalarial = 0, 
      despesasOperacionais = 0,
      regimesParaComparar 
    }: SimulacaoInput = await req.json()

    // Validações
    if (!receitaAnual || receitaAnual <= 0) {
      throw new Error('Receita anual deve ser maior que zero')
    }

    if (!regimesParaComparar || regimesParaComparar.length === 0) {
      throw new Error('Pelo menos um regime deve ser selecionado para comparação')
    }

    const resultados: ResultadoSimulacao[] = []

    // Simular cada regime solicitado
    for (const regime of regimesParaComparar) {
      let resultado: ResultadoSimulacao

      switch (regime) {
        case 'Simples Nacional':
          resultado = await simularSimplesNacional(supabaseClient, receitaAnual, atividadePrincipal)
          break
        case 'Lucro Presumido':
          resultado = simularLucroPresumido(receitaAnual, atividadePrincipal, folhaSalarial)
          break
        case 'Lucro Real':
          resultado = simularLucroReal(receitaAnual, despesasOperacionais, folhaSalarial)
          break
        default:
          throw new Error(`Regime ${regime} não suportado`)
      }

      resultados.push(resultado)
    }

    // Ordenar por menor imposto
    resultados.sort((a, b) => a.impostoTotal - b.impostoTotal)

    // Gerar recomendação
    const melhorRegime = resultados.find(r => r.aplicavel) || resultados[0]
    const economiaAnual = resultados[resultados.length - 1].impostoTotal - melhorRegime.impostoTotal

    const recomendacao = {
      regimeRecomendado: melhorRegime.regime,
      economiaAnual,
      economiaPercentual: (economiaAnual / resultados[resultados.length - 1].impostoTotal) * 100,
      justificativa: gerarJustificativa(melhorRegime, resultados)
    }

    return new Response(
      JSON.stringify({
        simulacoes: resultados,
        recomendacao,
        parametros: {
          receitaAnual,
          atividadePrincipal,
          folhaSalarial,
          despesasOperacionais
        },
        dataSimulacao: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Erro na simulação:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

async function simularSimplesNacional(supabaseClient: any, receitaAnual: number, atividade: string): Promise<ResultadoSimulacao> {
  // Verificar se é aplicável
  if (receitaAnual > 4800000) {
    return {
      regime: 'Simples Nacional',
      impostoTotal: 0,
      aliquotaEfetiva: 0,
      detalhamento: {},
      vantagens: [],
      desvantagens: [],
      aplicavel: false,
      motivoNaoAplicavel: 'Receita anual excede R$ 4.800.000'
    }
  }

  // Determinar anexo baseado na atividade (simplificado)
  const anexo = determinarAnexo(atividade)

  // Buscar tabela fiscal
  const { data: tabela } = await supabaseClient
    .from('tabelas_fiscais')
    .select('*')
    .eq('anexo', anexo)
    .lte('receita_minima', receitaAnual)
    .gte('receita_maxima', receitaAnual)
    .single()

  if (!tabela) {
    throw new Error('Tabela fiscal não encontrada')
  }

  const aliquotaEfetiva = ((receitaAnual * tabela.aliquota / 100) - tabela.deducao) / receitaAnual * 100
  const impostoTotal = receitaAnual * aliquotaEfetiva / 100

  return {
    regime: 'Simples Nacional',
    impostoTotal,
    aliquotaEfetiva,
    detalhamento: {
      anexo,
      aliquotaNominal: tabela.aliquota,
      deducao: tabela.deducao,
      irpj: impostoTotal * (tabela.irpj_percentual || 0) / 100,
      csll: impostoTotal * (tabela.csll_percentual || 0) / 100,
      pis: impostoTotal * (tabela.pis_percentual || 0) / 100,
      cofins: impostoTotal * (tabela.cofins_percentual || 0) / 100,
      cpp: impostoTotal * (tabela.cpp_percentual || 0) / 100
    },
    vantagens: [
      'Tributação simplificada em guia única',
      'Menor burocracia',
      'Dispensa de algumas obrigações acessórias',
      'Alíquotas reduzidas'
    ],
    desvantagens: [
      'Limitação de receita anual',
      'Restrições de atividades',
      'Não permite aproveitamento de créditos'
    ],
    aplicavel: true
  }
}

function simularLucroPresumido(receitaAnual: number, atividade: string, folhaSalarial: number): ResultadoSimulacao {
  // Verificar aplicabilidade
  if (receitaAnual > 78000000) {
    return {
      regime: 'Lucro Presumido',
      impostoTotal: 0,
      aliquotaEfetiva: 0,
      detalhamento: {},
      vantagens: [],
      desvantagens: [],
      aplicavel: false,
      motivoNaoAplicavel: 'Receita anual excede R$ 78.000.000'
    }
  }

  // Percentuais de presunção (simplificado)
  const percentualPresuncao = atividade.includes('serviço') ? 32 : 8
  const lucroPresumido = receitaAnual * percentualPresuncao / 100

  // Cálculo dos impostos
  const irpj = lucroPresumido * 0.15 + Math.max(0, (lucroPresumido - 240000) * 0.10)
  const csll = lucroPresumido * 0.09
  const pis = receitaAnual * 0.0065
  const cofins = receitaAnual * 0.03
  const cpp = folhaSalarial * 0.20

  const impostoTotal = irpj + csll + pis + cofins + cpp

  return {
    regime: 'Lucro Presumido',
    impostoTotal,
    aliquotaEfetiva: (impostoTotal / receitaAnual) * 100,
    detalhamento: {
      percentualPresuncao,
      lucroPresumido,
      irpj,
      csll,
      pis,
      cofins,
      cpp
    },
    vantagens: [
      'Simplicidade no cálculo',
      'Tributação sobre lucro presumido',
      'Menor complexidade contábil'
    ],
    desvantagens: [
      'Tributação mesmo com prejuízo',
      'Não permite aproveitamento total de créditos',
      'Limitação de receita'
    ],
    aplicavel: true
  }
}

function simularLucroReal(receitaAnual: number, despesas: number, folhaSalarial: number): ResultadoSimulacao {
  // Lucro real = receita - despesas (simplificado)
  const lucroReal = Math.max(0, receitaAnual - despesas)

  // Cálculo dos impostos
  const irpj = lucroReal * 0.15 + Math.max(0, (lucroReal - 240000) * 0.10)
  const csll = lucroReal * 0.09
  const pis = receitaAnual * 0.0165 // Alíquota não cumulativa
  const cofins = receitaAnual * 0.076 // Alíquota não cumulativa
  const cpp = folhaSalarial * 0.20

  const impostoTotal = irpj + csll + pis + cofins + cpp

  return {
    regime: 'Lucro Real',
    impostoTotal,
    aliquotaEfetiva: (impostoTotal / receitaAnual) * 100,
    detalhamento: {
      lucroReal,
      irpj,
      csll,
      pis,
      cofins,
      cpp,
      despesasConsideradas: despesas
    },
    vantagens: [
      'Tributação sobre lucro efetivo',
      'Aproveitamento integral de créditos',
      'Sem limitação de receita',
      'Compensação de prejuízos'
    ],
    desvantagens: [
      'Maior complexidade contábil',
      'Mais obrigações acessórias',
      'Custos contábeis maiores'
    ],
    aplicavel: true
  }
}

function determinarAnexo(atividade: string): string {
  if (atividade.includes('comércio') || atividade.includes('indústria')) {
    return 'I'
  } else if (atividade.includes('serviço')) {
    return 'III'
  } else {
    return 'I' // Default
  }
}

function gerarJustificativa(melhorRegime: ResultadoSimulacao, todos: ResultadoSimulacao[]): string {
  const economia = todos[todos.length - 1].impostoTotal - melhorRegime.impostoTotal
  const economiaPerc = (economia / todos[todos.length - 1].impostoTotal) * 100

  return `O regime ${melhorRegime.regime} apresenta a menor carga tributária, ` +
         `resultando em uma economia de R$ ${economia.toFixed(2)} (${economiaPerc.toFixed(1)}%) ` +
         `em comparação com a opção mais onerosa. ${melhorRegime.vantagens[0]}.`
}
