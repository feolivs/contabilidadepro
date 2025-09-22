/**
 * Testes unitários para JSON Validation Service
 * Foco em validações de estruturas de dados fiscais
 */

// Mock da classe JSONValidationService para teste
class JSONValidationService {
  validateCNPJ(cnpj: string): { isValid: boolean; errors: string[] } {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
    
    if (cleanCNPJ.length !== 14) {
      return { isValid: false, errors: ['CNPJ deve ter 14 dígitos'] }
    }

    // Validação dos dígitos verificadores
    const digits = cleanCNPJ.split('').map(Number)
    
    // Primeiro dígito verificador
    let sum = 0
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    for (let i = 0; i < 12; i++) {
      sum += digits[i]! * weights1[i]!
    }
    const remainder1 = sum % 11
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1

    if (digits[12]! !== digit1) {
      return { isValid: false, errors: ['CNPJ inválido - primeiro dígito verificador'] }
    }

    // Segundo dígito verificador
    sum = 0
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    for (let i = 0; i < 13; i++) {
      sum += digits[i]! * weights2[i]!
    }
    const remainder2 = sum % 11
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2

    if (digits[13]! !== digit2) {
      return { isValid: false, errors: ['CNPJ inválido - segundo dígito verificador'] }
    }

    return { isValid: true, errors: [] }
  }

  validateCPF(cpf: string): { isValid: boolean; errors: string[] } {
    const cleanCPF = cpf.replace(/[^\d]/g, '')
    
    if (cleanCPF.length !== 11) {
      return { isValid: false, errors: ['CPF deve ter 11 dígitos'] }
    }

    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return { isValid: false, errors: ['CPF não pode ter todos os dígitos iguais'] }
    }

    const digits = cleanCPF.split('').map(Number)
    
    // Primeiro dígito verificador
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += digits[i]! * (10 - i)
    }
    const remainder1 = sum % 11
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1

    if (digits[9]! !== digit1) {
      return { isValid: false, errors: ['CPF inválido - primeiro dígito verificador'] }
    }

    // Segundo dígito verificador
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += digits[i]! * (11 - i)
    }
    const remainder2 = sum % 11
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2

    if (digits[10]! !== digit2) {
      return { isValid: false, errors: ['CPF inválido - segundo dígito verificador'] }
    }

    return { isValid: true, errors: [] }
  }

  validateEmpresaData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.cnpj) {
      errors.push('CNPJ é obrigatório')
    } else {
      const cnpjValidation = this.validateCNPJ(data.cnpj)
      if (!cnpjValidation.isValid) {
        errors.push(...cnpjValidation.errors)
      }
    }

    if (!data.razao_social || data.razao_social.trim().length === 0) {
      errors.push('Razão social é obrigatória')
    }

    if (!data.regime_tributario) {
      errors.push('Regime tributário é obrigatório')
    } else {
      const regimesValidos = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']
      if (!regimesValidos.includes(data.regime_tributario)) {
        errors.push('Regime tributário inválido')
      }
    }

    if (!data.atividade_principal || data.atividade_principal.trim().length === 0) {
      errors.push('Atividade principal é obrigatória')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  validateCalculoDAS(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.empresa_id) {
      errors.push('ID da empresa é obrigatório')
    }

    if (typeof data.faturamento_12_meses !== 'number' || data.faturamento_12_meses <= 0) {
      errors.push('Faturamento dos últimos 12 meses deve ser um número positivo')
    }

    if (typeof data.faturamento_mes !== 'number' || data.faturamento_mes <= 0) {
      errors.push('Faturamento do mês deve ser um número positivo')
    }

    if (data.faturamento_12_meses > 4800000) {
      errors.push('Faturamento anual excede limite do Simples Nacional (R$ 4.800.000)')
    }

    if (!data.anexo_simples) {
      errors.push('Anexo do Simples Nacional é obrigatório')
    } else {
      const anexosValidos = ['I', 'II', 'III', 'IV', 'V']
      if (!anexosValidos.includes(data.anexo_simples)) {
        errors.push('Anexo do Simples Nacional inválido')
      }
    }

    if (!data.competencia || !/^\d{4}-\d{2}$/.test(data.competencia)) {
      errors.push('Competência deve estar no formato YYYY-MM')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

describe('JSONValidationService', () => {
  let service: JSONValidationService

  beforeEach(() => {
    service = new JSONValidationService()
  })

  describe('validateCNPJ', () => {
    test('deve validar CNPJ correto', () => {
      const result = service.validateCNPJ('11.222.333/0001-81')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('deve invalidar CNPJ com tamanho incorreto', () => {
      const result = service.validateCNPJ('123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('CNPJ deve ter 14 dígitos')
    })

    test('deve invalidar CNPJ com dígito verificador incorreto', () => {
      const result = service.validateCNPJ('11.222.333/0001-80')
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('CNPJ inválido')
    })
  })

  describe('validateCPF', () => {
    test('deve validar CPF correto', () => {
      const result = service.validateCPF('111.444.777-35')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('deve invalidar CPF com tamanho incorreto', () => {
      const result = service.validateCPF('123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('CPF deve ter 11 dígitos')
    })

    test('deve invalidar CPF com todos os dígitos iguais', () => {
      const result = service.validateCPF('11111111111')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('CPF não pode ter todos os dígitos iguais')
    })

    test('deve invalidar CPF com dígito verificador incorreto', () => {
      const result = service.validateCPF('111.444.777-34')
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('CPF inválido')
    })
  })

  describe('validateEmpresaData', () => {
    const empresaValida = {
      cnpj: '11.222.333/0001-81',
      razao_social: 'Empresa Teste LTDA',
      regime_tributario: 'Simples Nacional',
      atividade_principal: 'Consultoria em TI'
    }

    test('deve validar dados de empresa corretos', () => {
      const result = service.validateEmpresaData(empresaValida)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('deve invalidar empresa sem CNPJ', () => {
      const empresaInvalida = { ...empresaValida, cnpj: '' }
      const result = service.validateEmpresaData(empresaInvalida)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('CNPJ é obrigatório')
    })

    test('deve invalidar empresa com regime tributário inválido', () => {
      const empresaInvalida = { ...empresaValida, regime_tributario: 'Regime Inválido' }
      const result = service.validateEmpresaData(empresaInvalida)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Regime tributário inválido')
    })
  })

  describe('validateCalculoDAS', () => {
    const calculoValido = {
      empresa_id: 'uuid-123',
      faturamento_12_meses: 1000000,
      faturamento_mes: 100000,
      anexo_simples: 'I',
      competencia: '2024-01'
    }

    test('deve validar dados de cálculo DAS corretos', () => {
      const result = service.validateCalculoDAS(calculoValido)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('deve invalidar cálculo com faturamento acima do limite', () => {
      const calculoInvalido = { ...calculoValido, faturamento_12_meses: 5000000 }
      const result = service.validateCalculoDAS(calculoInvalido)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Faturamento anual excede limite do Simples Nacional (R$ 4.800.000)')
    })

    test('deve invalidar cálculo com anexo inválido', () => {
      const calculoInvalido = { ...calculoValido, anexo_simples: 'VI' }
      const result = service.validateCalculoDAS(calculoInvalido)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Anexo do Simples Nacional inválido')
    })

    test('deve invalidar cálculo com competência em formato incorreto', () => {
      const calculoInvalido = { ...calculoValido, competencia: '2024/01' }
      const result = service.validateCalculoDAS(calculoInvalido)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Competência deve estar no formato YYYY-MM')
    })
  })
})
