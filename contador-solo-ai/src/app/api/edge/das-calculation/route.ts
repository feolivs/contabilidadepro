import { NextRequest, NextResponse } from 'next/server'

// Edge Runtime para cálculos DAS básicos
export const runtime = 'edge'

interface DASCalculationInput {
  receita: number
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V'
  competencia: string
  fatorR?: number
}

interface DASCalculationResult {
  valorDAS: number
  aliquotaEfetiva: number
  anexo: string
  competencia: string
  dataVencimento: string
  detalhes: {
    receitaBruta: number
    fatorR?: number
    aliquotaNominal: number
    reducaoFatorR?: number
  }
}

// Tabelas do Simples Nacional 2024 (embeddadas no Edge)
const TABELAS_SIMPLES = {
  'I': [ // Comércio
    { faixa: 180000, aliquota: 4.0 },
    { faixa: 360000, aliquota: 7.3 },
    { faixa: 720000, aliquota: 9.5 },
    { faixa: 1800000, aliquota: 10.7 },
    { faixa: 3600000, aliquota: 14.3 },
    { faixa: 4800000, aliquota: 19.0 }
  ],
  'II': [ // Indústria
    { faixa: 180000, aliquota: 4.5 },
    { faixa: 360000, aliquota: 7.8 },
    { faixa: 720000, aliquota: 10.0 },
    { faixa: 1800000, aliquota: 11.2 },
    { faixa: 3600000, aliquota: 14.8 },
    { faixa: 4800000, aliquota: 30.0 }
  ],
  'III': [ // Serviços
    { faixa: 180000, aliquota: 6.0 },
    { faixa: 360000, aliquota: 11.2 },
    { faixa: 720000, aliquota: 13.5 },
    { faixa: 1800000, aliquota: 16.0 },
    { faixa: 3600000, aliquota: 21.0 },
    { faixa: 4800000, aliquota: 33.0 }
  ],
  'IV': [ // Serviços
    { faixa: 180000, aliquota: 4.5 },
    { faixa: 360000, aliquota: 9.0 },
    { faixa: 720000, aliquota: 10.2 },
    { faixa: 1800000, aliquota: 14.0 },
    { faixa: 3600000, aliquota: 22.0 },
    { faixa: 4800000, aliquota: 33.0 }
  ],
  'V': [ // Serviços
    { faixa: 180000, aliquota: 15.5 },
    { faixa: 360000, aliquota: 18.0 },
    { faixa: 720000, aliquota: 19.5 },
    { faixa: 1800000, aliquota: 20.5 },
    { faixa: 3600000, aliquota: 23.0 },
    { faixa: 4800000, aliquota: 30.5 }
  ]
}

function calculateDAS(input: DASCalculationInput): DASCalculationResult {
  const { receita, anexo, competencia, fatorR } = input
  
  // Validações básicas
  if (receita <= 0) {
    throw new Error('Receita deve ser maior que zero')
  }
  
  if (receita > 4800000) {
    throw new Error('Receita excede o limite do Simples Nacional (R$ 4.800.000)')
  }
  
  // Buscar alíquota na tabela
  const tabela = TABELAS_SIMPLES[anexo]
  if (!tabela) {
    throw new Error(`Anexo ${anexo} não encontrado`)
  }
  
  let aliquotaNominal = 0
  for (const faixa of tabela) {
    if (receita <= faixa.faixa) {
      aliquotaNominal = faixa.aliquota
      break
    }
  }
  
  if (aliquotaNominal === 0) {
    throw new Error('Não foi possível determinar a alíquota')
  }
  
  // Aplicar Fator R se fornecido (Anexos III, IV, V)
  let aliquotaEfetiva = aliquotaNominal
  let reducaoFatorR = 0
  
  if (fatorR !== undefined && ['III', 'IV', 'V'].includes(anexo)) {
    if (fatorR < 0.28) {
      // Aplica redução por Fator R
      const reducaoPercentual = anexo === 'III' ? 0.4 : 
                               anexo === 'IV' ? 0.32 : 0.25 // Anexo V
      reducaoFatorR = aliquotaNominal * reducaoPercentual
      aliquotaEfetiva = aliquotaNominal - reducaoFatorR
    }
  }
  
  // Calcular valor do DAS
  const valorDAS = Math.round((receita * aliquotaEfetiva / 100) * 100) / 100
  
  // Calcular data de vencimento (20 do mês seguinte)
  const [ano, mes] = competencia.split('-').map(Number)
  if (!ano || !mes) {
    throw new Error('Competência inválida')
  }
  const proximoMes = mes === 12 ? 1 : mes + 1
  const proximoAno = mes === 12 ? ano + 1 : ano
  const dataVencimento = `${proximoAno}-${proximoMes.toString().padStart(2, '0')}-20`
  
  return {
    valorDAS,
    aliquotaEfetiva,
    anexo,
    competencia,
    dataVencimento,
    detalhes: {
      receitaBruta: receita,
      fatorR,
      aliquotaNominal,
      reducaoFatorR: reducaoFatorR > 0 ? reducaoFatorR : undefined
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const input: DASCalculationInput = await request.json()
    
    // Validações de entrada
    if (!input.receita || !input.anexo || !input.competencia) {
      return NextResponse.json(
        { error: 'Receita, anexo e competência são obrigatórios' },
        { status: 400 }
      )
    }
    
    if (typeof input.receita !== 'number' || input.receita <= 0) {
      return NextResponse.json(
        { error: 'Receita deve ser um número positivo' },
        { status: 400 }
      )
    }
    
    if (!['I', 'II', 'III', 'IV', 'V'].includes(input.anexo)) {
      return NextResponse.json(
        { error: 'Anexo deve ser I, II, III, IV ou V' },
        { status: 400 }
      )
    }
    
    const result = calculateDAS(input)
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // Cache por 5 minutos
        'CDN-Cache-Control': 'public, max-age=1800', // Cache CDN por 30 minutos
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const receita = parseFloat(searchParams.get('receita') || '0')
  const anexo = searchParams.get('anexo') as 'I' | 'II' | 'III' | 'IV' | 'V'
  const competencia = searchParams.get('competencia') || ''
  const fatorR = searchParams.get('fatorR') ? parseFloat(searchParams.get('fatorR')!) : undefined
  
  if (!receita || !anexo || !competencia) {
    return NextResponse.json(
      { error: 'Parâmetros receita, anexo e competencia são obrigatórios' },
      { status: 400 }
    )
  }
  
  try {
    const result = calculateDAS({ receita, anexo, competencia, fatorR })
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'CDN-Cache-Control': 'public, max-age=1800',
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
