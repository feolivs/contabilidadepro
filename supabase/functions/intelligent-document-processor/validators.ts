// Sistema de validação de dados extraídos

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  confidence_adjustment: number // Ajuste na confiança baseado na validação
}

export class DocumentValidators {
  
  /**
   * Valida CNPJ usando algoritmo de dígito verificador
   */
  static validateCNPJ(cnpj: string): ValidationResult {
    if (!cnpj) {
      return { isValid: true, errors: [], warnings: [], confidence_adjustment: 0 }
    }

    // Remove formatação
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
    
    if (cleanCNPJ.length !== 14) {
      return {
        isValid: false,
        errors: ['CNPJ deve ter 14 dígitos'],
        warnings: [],
        confidence_adjustment: -0.2
      }
    }

    // Algoritmo de validação CNPJ
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    
    const digits = cleanCNPJ.split('').map(Number)
    
    // Primeiro dígito verificador
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * weights1[i]
    }
    const remainder1 = sum % 11
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1
    
    // Segundo dígito verificador
    sum = 0
    for (let i = 0; i < 13; i++) {
      sum += digits[i] * weights2[i]
    }
    const remainder2 = sum % 11
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2
    
    const isValid = digits[12] === digit1 && digits[13] === digit2
    
    return {
      isValid,
      errors: isValid ? [] : ['CNPJ com dígitos verificadores inválidos'],
      warnings: [],
      confidence_adjustment: isValid ? 0.1 : -0.3
    }
  }

  /**
   * Valida CPF usando algoritmo de dígito verificador
   */
  static validateCPF(cpf: string): ValidationResult {
    if (!cpf) {
      return { isValid: true, errors: [], warnings: [], confidence_adjustment: 0 }
    }

    const cleanCPF = cpf.replace(/[^\d]/g, '')
    
    if (cleanCPF.length !== 11) {
      return {
        isValid: false,
        errors: ['CPF deve ter 11 dígitos'],
        warnings: [],
        confidence_adjustment: -0.2
      }
    }

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) {
      return {
        isValid: false,
        errors: ['CPF com todos os dígitos iguais é inválido'],
        warnings: [],
        confidence_adjustment: -0.3
      }
    }

    const digits = cleanCPF.split('').map(Number)
    
    // Primeiro dígito verificador
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i)
    }
    const remainder1 = sum % 11
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1
    
    // Segundo dígito verificador
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * (11 - i)
    }
    const remainder2 = sum % 11
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2
    
    const isValid = digits[9] === digit1 && digits[10] === digit2
    
    return {
      isValid,
      errors: isValid ? [] : ['CPF com dígitos verificadores inválidos'],
      warnings: [],
      confidence_adjustment: isValid ? 0.1 : -0.3
    }
  }

  /**
   * Valida datas e sua lógica
   */
  static validateDates(dataEmissao?: string, dataVencimento?: string): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let confidenceAdjustment = 0

    if (dataEmissao) {
      const emissao = new Date(dataEmissao)
      const hoje = new Date()
      
      if (isNaN(emissao.getTime())) {
        errors.push('Data de emissão inválida')
        confidenceAdjustment -= 0.2
      } else if (emissao > hoje) {
        warnings.push('Data de emissão é futura')
        confidenceAdjustment -= 0.1
      } else if (emissao < new Date('2000-01-01')) {
        warnings.push('Data de emissão muito antiga')
        confidenceAdjustment -= 0.05
      }
    }

    if (dataVencimento) {
      const vencimento = new Date(dataVencimento)
      
      if (isNaN(vencimento.getTime())) {
        errors.push('Data de vencimento inválida')
        confidenceAdjustment -= 0.2
      }
      
      if (dataEmissao && !isNaN(new Date(dataEmissao).getTime()) && !isNaN(vencimento.getTime())) {
        if (vencimento < new Date(dataEmissao)) {
          errors.push('Data de vencimento anterior à data de emissão')
          confidenceAdjustment -= 0.3
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence_adjustment: confidenceAdjustment
    }
  }

  /**
   * Valida valores monetários
   */
  static validateMonetaryValues(valorTotal?: number, valorLiquido?: number): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let confidenceAdjustment = 0

    if (valorTotal !== undefined) {
      if (valorTotal < 0) {
        errors.push('Valor total não pode ser negativo')
        confidenceAdjustment -= 0.3
      } else if (valorTotal === 0) {
        warnings.push('Valor total é zero')
        confidenceAdjustment -= 0.1
      } else if (valorTotal > 999999999) {
        warnings.push('Valor total muito alto')
        confidenceAdjustment -= 0.05
      }
    }

    if (valorLiquido !== undefined) {
      if (valorLiquido < 0) {
        errors.push('Valor líquido não pode ser negativo')
        confidenceAdjustment -= 0.3
      }
      
      if (valorTotal !== undefined && valorLiquido > valorTotal) {
        warnings.push('Valor líquido maior que valor total')
        confidenceAdjustment -= 0.2
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence_adjustment: confidenceAdjustment
    }
  }

  /**
   * Valida chave de acesso NFe (44 dígitos)
   */
  static validateNFeKey(chaveAcesso?: string): ValidationResult {
    if (!chaveAcesso) {
      return { isValid: true, errors: [], warnings: [], confidence_adjustment: 0 }
    }

    const cleanKey = chaveAcesso.replace(/[^\d]/g, '')
    
    if (cleanKey.length !== 44) {
      return {
        isValid: false,
        errors: ['Chave de acesso NFe deve ter 44 dígitos'],
        warnings: [],
        confidence_adjustment: -0.4
      }
    }

    // Validações básicas da estrutura da chave
    const uf = cleanKey.substring(0, 2)
    const ano = cleanKey.substring(2, 4)
    const mes = cleanKey.substring(4, 6)
    
    const ufValida = parseInt(uf) >= 11 && parseInt(uf) <= 53
    const anoValido = parseInt(ano) >= 8 && parseInt(ano) <= 99 // 2008-2099
    const mesValido = parseInt(mes) >= 1 && parseInt(mes) <= 12
    
    const errors: string[] = []
    let confidenceAdjustment = 0.2 // Bonus por ter chave de acesso
    
    if (!ufValida) {
      errors.push('Código UF inválido na chave de acesso')
      confidenceAdjustment -= 0.1
    }
    
    if (!anoValido) {
      errors.push('Ano inválido na chave de acesso')
      confidenceAdjustment -= 0.1
    }
    
    if (!mesValido) {
      errors.push('Mês inválido na chave de acesso')
      confidenceAdjustment -= 0.1
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
      confidence_adjustment: confidenceAdjustment
    }
  }

  /**
   * Validação completa de um documento extraído
   */
  static validateExtractedDocument(data: any): ValidationResult {
    const allErrors: string[] = []
    const allWarnings: string[] = []
    let totalConfidenceAdjustment = 0

    // Validar CNPJ emitente
    if (data.cnpj_emitente) {
      const cnpjResult = this.validateCNPJ(data.cnpj_emitente)
      allErrors.push(...cnpjResult.errors)
      allWarnings.push(...cnpjResult.warnings)
      totalConfidenceAdjustment += cnpjResult.confidence_adjustment
    }

    // Validar CNPJ destinatário
    if (data.cnpj_destinatario) {
      const cnpjResult = this.validateCNPJ(data.cnpj_destinatario)
      allErrors.push(...cnpjResult.errors)
      allWarnings.push(...cnpjResult.warnings)
      totalConfidenceAdjustment += cnpjResult.confidence_adjustment
    }

    // Validar CPF (para pró-labore)
    if (data.cpf_beneficiario) {
      const cpfResult = this.validateCPF(data.cpf_beneficiario)
      allErrors.push(...cpfResult.errors)
      allWarnings.push(...cpfResult.warnings)
      totalConfidenceAdjustment += cpfResult.confidence_adjustment
    }

    // Validar datas
    const dateResult = this.validateDates(data.data_emissao, data.data_vencimento)
    allErrors.push(...dateResult.errors)
    allWarnings.push(...dateResult.warnings)
    totalConfidenceAdjustment += dateResult.confidence_adjustment

    // Validar valores
    const valueResult = this.validateMonetaryValues(data.valor_total, data.valor_liquido)
    allErrors.push(...valueResult.errors)
    allWarnings.push(...valueResult.warnings)
    totalConfidenceAdjustment += valueResult.confidence_adjustment

    // Validar chave NFe
    if (data.chave_acesso) {
      const keyResult = this.validateNFeKey(data.chave_acesso)
      allErrors.push(...keyResult.errors)
      allWarnings.push(...keyResult.warnings)
      totalConfidenceAdjustment += keyResult.confidence_adjustment
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      confidence_adjustment: totalConfidenceAdjustment
    }
  }
}
