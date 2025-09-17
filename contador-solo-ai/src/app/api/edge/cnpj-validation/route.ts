import { NextRequest, NextResponse } from 'next/server'

// Edge Runtime para validação de CNPJ
export const runtime = 'edge'

interface CNPJValidationResult {
  valid: boolean
  formatted?: string
  error?: string
}

// Função para validar CNPJ (executada no Edge)
function validateCNPJ(cnpj: string): CNPJValidationResult {
  try {
    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
    
    // Verifica se tem 14 dígitos
    if (cleanCNPJ.length !== 14) {
      return { valid: false, error: 'CNPJ deve ter 14 dígitos' }
    }
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cleanCNPJ)) {
      return { valid: false, error: 'CNPJ inválido - todos os dígitos são iguais' }
    }
    
    // Validação dos dígitos verificadores
    const digits = cleanCNPJ.split('').map(Number)
    
    // Primeiro dígito verificador
    let sum = 0
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    for (let i = 0; i < 12; i++) {
      const digit = digits[i]
      const weight = weights1[i]
      if (digit !== undefined && weight !== undefined) {
        sum += digit * weight
      }
    }
    const remainder1 = sum % 11
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1

    if (digits[12] !== digit1) {
      return { valid: false, error: 'CNPJ inválido - primeiro dígito verificador incorreto' }
    }

    // Segundo dígito verificador
    sum = 0
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    for (let i = 0; i < 13; i++) {
      const digit = digits[i]
      const weight = weights2[i]
      if (digit !== undefined && weight !== undefined) {
        sum += digit * weight
      }
    }
    const remainder2 = sum % 11
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2

    if (digits[13] !== digit2) {
      return { valid: false, error: 'CNPJ inválido - segundo dígito verificador incorreto' }
    }
    
    // Formatar CNPJ
    const formatted = `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2, 5)}.${cleanCNPJ.slice(5, 8)}/${cleanCNPJ.slice(8, 12)}-${cleanCNPJ.slice(12, 14)}`
    
    return { valid: true, formatted }
  } catch (error) {
    return { valid: false, error: 'Erro interno na validação do CNPJ' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { cnpj } = await request.json()
    
    if (!cnpj || typeof cnpj !== 'string') {
      return NextResponse.json(
        { error: 'CNPJ é obrigatório e deve ser uma string' },
        { status: 400 }
      )
    }
    
    const result = validateCNPJ(cnpj)
    
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache por 1 hora
        'CDN-Cache-Control': 'public, max-age=86400', // Cache CDN por 24 horas
        'Vary': 'Accept-Encoding',
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cnpj = searchParams.get('cnpj')
  
  if (!cnpj) {
    return NextResponse.json(
      { error: 'Parâmetro CNPJ é obrigatório' },
      { status: 400 }
    )
  }
  
  const result = validateCNPJ(cnpj)
  
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'CDN-Cache-Control': 'public, max-age=86400',
      'Vary': 'Accept-Encoding',
    }
  })
}
