/**
 * Testes unitários para utilitários críticos - ContabilidadePRO
 * Foco em validações fiscais brasileiras
 */

import { validateCNPJ, validateCPF, formatCurrency, formatCNPJ, formatCPF } from './utils'

describe('Validação de CNPJ', () => {
  describe('CNPJs válidos', () => {
    const cnpjsValidos = [
      '11.222.333/0001-81', // Formatado
      '11222333000181',     // Sem formatação
      '11.444.777/0001-61', // Outro válido
      '11444777000161',     // Sem formatação
    ]

    test.each(cnpjsValidos)('deve validar CNPJ válido: %s', (cnpj) => {
      expect(validateCNPJ(cnpj)).toBe(true)
    })
  })

  describe('CNPJs inválidos', () => {
    const cnpjsInvalidos = [
      '',                    // Vazio
      '123',                 // Muito curto
      '11111111111111',      // Todos iguais
      '00000000000000',      // Zeros
      '11.222.333/0001-80',  // Dígito verificador errado
      '11.222.333/0001-82',  // Dígito verificador errado
      '11222333000180',      // Sem formatação, dígito errado
      'abc.def.ghi/jklm-no', // Caracteres inválidos
      '11.222.333/0001',     // Incompleto
      '11.222.333/0001-8',   // Incompleto
    ]

    test.each(cnpjsInvalidos)('deve invalidar CNPJ inválido: %s', (cnpj) => {
      expect(validateCNPJ(cnpj)).toBe(false)
    })
  })

  describe('Casos edge', () => {
    test('deve lidar com null/undefined', () => {
      expect(validateCNPJ(null as any)).toBe(false)
      expect(validateCNPJ(undefined as any)).toBe(false)
    })

    test('deve lidar com espaços', () => {
      expect(validateCNPJ(' 11.222.333/0001-81 ')).toBe(true)
      expect(validateCNPJ('11 222 333 0001 81')).toBe(true)
    })

    test('deve lidar com caracteres especiais extras', () => {
      expect(validateCNPJ('11.222.333/0001-81.')).toBe(true)
      expect(validateCNPJ('(11.222.333/0001-81)')).toBe(true)
    })
  })
})

describe('Validação de CPF', () => {
  describe('CPFs válidos', () => {
    const cpfsValidos = [
      '111.444.777-35',  // Formatado
      '11144477735',     // Sem formatação
      '123.456.789-09',  // Outro válido
      '12345678909',     // Sem formatação
    ]

    test.each(cpfsValidos)('deve validar CPF válido: %s', (cpf) => {
      expect(validateCPF(cpf)).toBe(true)
    })
  })

  describe('CPFs inválidos', () => {
    const cpfsInvalidos = [
      '',                // Vazio
      '123',             // Muito curto
      '11111111111',     // Todos iguais
      '00000000000',     // Zeros
      '111.444.777-34',  // Dígito verificador errado
      '111.444.777-36',  // Dígito verificador errado
      '11144477734',     // Sem formatação, dígito errado
      'abc.def.ghi-jk',  // Caracteres inválidos
      '111.444.777',     // Incompleto
      '111.444.777-3',   // Incompleto
    ]

    test.each(cpfsInvalidos)('deve invalidar CPF inválido: %s', (cpf) => {
      expect(validateCPF(cpf)).toBe(false)
    })
  })

  describe('Casos edge', () => {
    test('deve lidar com null/undefined', () => {
      expect(validateCPF(null as any)).toBe(false)
      expect(validateCPF(undefined as any)).toBe(false)
    })

    test('deve lidar com espaços', () => {
      expect(validateCPF(' 111.444.777-35 ')).toBe(true)
      expect(validateCPF('111 444 777 35')).toBe(true)
    })
  })
})

describe('Formatação de moeda', () => {
  test('deve formatar valores monetários corretamente', () => {
    // Usar toMatch para lidar com diferenças sutis de formatação
    expect(formatCurrency(1234.56)).toMatch(/R\$\s*1\.234,56/)
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/)
    expect(formatCurrency(1000000)).toMatch(/R\$\s*1\.000\.000,00/)
    expect(formatCurrency(0.99)).toMatch(/R\$\s*0,99/)
  })

  test('deve lidar com valores negativos', () => {
    expect(formatCurrency(-1234.56)).toMatch(/-R\$\s*1\.234,56/)
  })

  test('deve lidar com valores nulos/indefinidos', () => {
    expect(formatCurrency(null as any)).toMatch(/R\$\s*0,00/)
    expect(formatCurrency(undefined as any)).toMatch(/R\$\s*0,00/)
  })
})

describe('Formatação de CNPJ', () => {
  test('deve formatar CNPJ corretamente', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })

  test('deve lidar com valores inválidos', () => {
    expect(formatCNPJ('')).toBe('')
    expect(formatCNPJ('123')).toBe('123')
    expect(formatCNPJ(null as any)).toBe('')
  })
})

describe('Formatação de CPF', () => {
  test('deve formatar CPF corretamente', () => {
    expect(formatCPF('11144477735')).toBe('111.444.777-35')
    expect(formatCPF('111.444.777-35')).toBe('111.444.777-35')
  })

  test('deve lidar com valores inválidos', () => {
    expect(formatCPF('')).toBe('')
    expect(formatCPF('123')).toBe('123')
    expect(formatCPF(null as any)).toBe('')
  })
})
