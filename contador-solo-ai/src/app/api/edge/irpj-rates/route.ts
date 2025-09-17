import { NextRequest, NextResponse } from 'next/server'

// Edge Runtime para consulta de alíquotas IRPJ
export const runtime = 'edge'

interface IRPJRatesQuery {
  atividade?: string
  ano?: number
}

interface IRPJRatesResult {
  atividade: string
  percentualPresuncao: number
  aliquotaIRPJ: number
  aliquotaAdicional: number
  limiteAdicional: number
  ano: number
  descricao: string
}

// Tabela de percentuais de presunção IRPJ (embeddada no Edge)
const PERCENTUAIS_PRESUNCAO = {
  'comercio': {
    percentual: 8.0,
    descricao: 'Comércio em geral, indústria e atividades equiparadas'
  },
  'industria': {
    percentual: 8.0,
    descricao: 'Atividade industrial e equiparadas'
  },
  'servicos': {
    percentual: 32.0,
    descricao: 'Prestação de serviços em geral'
  },
  'consultoria': {
    percentual: 32.0,
    descricao: 'Consultoria, assessoria e similares'
  },
  'advocacia': {
    percentual: 32.0,
    descricao: 'Advocacia, contabilidade, auditoria'
  },
  'contabilidade': {
    percentual: 32.0,
    descricao: 'Contabilidade, auditoria, consultoria'
  },
  'engenharia': {
    percentual: 32.0,
    descricao: 'Engenharia, arquitetura, medicina'
  },
  'medicina': {
    percentual: 32.0,
    descricao: 'Medicina, odontologia, veterinária'
  },
  'transporte': {
    percentual: 16.0,
    descricao: 'Transporte de cargas e passageiros'
  },
  'construcao': {
    percentual: 16.0,
    descricao: 'Construção civil e atividades imobiliárias'
  },
  'revenda_combustivel': {
    percentual: 1.6,
    descricao: 'Revenda de combustíveis e gás natural'
  },
  'financeira': {
    percentual: 16.0,
    descricao: 'Atividades financeiras e seguros'
  },
  'factoring': {
    percentual: 32.0,
    descricao: 'Factoring e atividades similares'
  },
  'intermediacao': {
    percentual: 32.0,
    descricao: 'Intermediação de negócios'
  },
  'administracao': {
    percentual: 32.0,
    descricao: 'Administração de bens e negócios'
  }
}

// Alíquotas IRPJ (fixas por lei)
const ALIQUOTAS_IRPJ = {
  normal: 15.0, // Alíquota normal
  adicional: 10.0, // Alíquota adicional
  limiteAdicional: 20000 // Limite mensal para adicional (R$ 20.000/mês = R$ 240.000/ano)
}

function getIRPJRates(query: IRPJRatesQuery): IRPJRatesResult[] {
  const { atividade, ano = 2024 } = query
  
  if (atividade) {
    // Buscar atividade específica
    const atividadeKey = atividade.toLowerCase().replace(/[^a-z]/g, '_')
    const presuncao = PERCENTUAIS_PRESUNCAO[atividadeKey as keyof typeof PERCENTUAIS_PRESUNCAO]
    
    if (!presuncao) {
      throw new Error(`Atividade '${atividade}' não encontrada`)
    }
    
    return [{
      atividade: atividade,
      percentualPresuncao: presuncao.percentual,
      aliquotaIRPJ: ALIQUOTAS_IRPJ.normal,
      aliquotaAdicional: ALIQUOTAS_IRPJ.adicional,
      limiteAdicional: ALIQUOTAS_IRPJ.limiteAdicional,
      ano,
      descricao: presuncao.descricao
    }]
  }
  
  // Retornar todas as atividades
  return Object.entries(PERCENTUAIS_PRESUNCAO).map(([key, value]) => ({
    atividade: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    percentualPresuncao: value.percentual,
    aliquotaIRPJ: ALIQUOTAS_IRPJ.normal,
    aliquotaAdicional: ALIQUOTAS_IRPJ.adicional,
    limiteAdicional: ALIQUOTAS_IRPJ.limiteAdicional,
    ano,
    descricao: value.descricao
  }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const atividade = searchParams.get('atividade') || undefined
    const ano = searchParams.get('ano') ? parseInt(searchParams.get('ano')!) : 2024
    
    // Validar ano
    if (ano < 2020 || ano > 2030) {
      return NextResponse.json(
        { error: 'Ano deve estar entre 2020 e 2030' },
        { status: 400 }
      )
    }
    
    const result = getIRPJRates({ atividade, ano })
    
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        total: result.length,
        ano,
        fonte: 'Lei 9.249/95 e RIR/99',
        atualizadoEm: '2024-01-01'
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache por 24 horas
        'CDN-Cache-Control': 'public, max-age=604800', // Cache CDN por 7 dias
        'Vary': 'Accept-Encoding',
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const query: IRPJRatesQuery = await request.json()
    
    const result = getIRPJRates(query)
    
    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        total: result.length,
        ano: query.ano || 2024,
        fonte: 'Lei 9.249/95 e RIR/99',
        atualizadoEm: '2024-01-01'
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'CDN-Cache-Control': 'public, max-age=604800',
        'Vary': 'Accept-Encoding',
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro interno'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    )
  }
}
