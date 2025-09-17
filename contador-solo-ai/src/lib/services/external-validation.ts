// Serviços de validação externa

export interface CNPJValidationResult {
  isValid: boolean
  companyName?: string
  fantasyName?: string
  situation?: string
  activity?: string
  address?: {
    street: string
    number: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  error?: string
}

export interface ValidationFlags {
  cnpjValid: boolean
  companyNameMatch: boolean
  addressConsistent: boolean
  situationActive: boolean
}

export class ExternalValidationService {
  
  /**
   * Consulta CNPJ na Receita Federal (via API pública)
   */
  static async validateCNPJWithReceitaFederal(cnpj: string): Promise<CNPJValidationResult> {
    try {
      const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
      
      if (cleanCNPJ.length !== 14) {
        return {
          isValid: false,
          error: 'CNPJ deve ter 14 dígitos'
        }
      }

      // Usando API pública da Receita Federal (via BrasilAPI)
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ContabilidadePRO/1.0'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return {
            isValid: false,
            error: 'CNPJ não encontrado na Receita Federal'
          }
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      return {
        isValid: true,
        companyName: data.razao_social || data.nome_fantasia,
        fantasyName: data.nome_fantasia,
        situation: data.descricao_situacao_cadastral,
        activity: data.cnae_fiscal_descricao,
        address: {
          street: data.logradouro,
          number: data.numero,
          neighborhood: data.bairro,
          city: data.municipio,
          state: data.uf,
          zipCode: data.cep
        }
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error)
      return {
        isValid: false,
        error: `Erro na consulta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  }

  /**
   * Valida consistência entre dados extraídos e dados da Receita Federal
   */
  static validateDocumentConsistency(
    extractedData: any, 
    cnpjData: CNPJValidationResult
  ): ValidationFlags {
    const flags: ValidationFlags = {
      cnpjValid: cnpjData.isValid,
      companyNameMatch: false,
      addressConsistent: false,
      situationActive: false
    }

    if (!cnpjData.isValid) {
      return flags
    }

    // Verificar se nome da empresa bate
    if (extractedData.empresa_emitente && cnpjData.companyName) {
      const extractedName = this.normalizeCompanyName(extractedData.empresa_emitente)
      const officialName = this.normalizeCompanyName(cnpjData.companyName)
      const fantasyName = cnpjData.fantasyName ? this.normalizeCompanyName(cnpjData.fantasyName) : ''
      
      flags.companyNameMatch = Boolean(
        extractedName.includes(officialName) ||
        officialName.includes(extractedName) ||
        (fantasyName && (extractedName.includes(fantasyName) || fantasyName.includes(extractedName)))
      )
    }

    // Verificar se endereço é consistente (se extraído)
    if (extractedData.endereco_emitente && cnpjData.address) {
      const extractedAddress = this.normalizeAddress(extractedData.endereco_emitente)
      const officialAddress = this.normalizeAddress(
        `${cnpjData.address.street} ${cnpjData.address.neighborhood} ${cnpjData.address.city} ${cnpjData.address.state}`
      )
      
      flags.addressConsistent = 
        extractedAddress.includes(cnpjData.address.city.toLowerCase()) ||
        extractedAddress.includes(cnpjData.address.state.toLowerCase()) ||
        extractedAddress.includes(cnpjData.address.neighborhood.toLowerCase())
    }

    // Verificar se empresa está ativa
    flags.situationActive = cnpjData.situation?.toLowerCase().includes('ativa') || false

    return flags
  }

  /**
   * Normaliza nome de empresa para comparação
   */
  private static normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .replace(/\b(ltda|eireli|me|epp|sa|s\/a)\b/g, '') // Remove sufixos
      .trim()
  }

  /**
   * Normaliza endereço para comparação
   */
  private static normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Calcula score de confiança baseado nas validações externas
   */
  static calculateExternalValidationScore(flags: ValidationFlags): number {
    let score = 0
    let maxScore = 0

    // CNPJ válido (peso 40%)
    maxScore += 0.4
    if (flags.cnpjValid) score += 0.4

    // Nome da empresa bate (peso 30%)
    maxScore += 0.3
    if (flags.companyNameMatch) score += 0.3

    // Empresa ativa (peso 20%)
    maxScore += 0.2
    if (flags.situationActive) score += 0.2

    // Endereço consistente (peso 10%)
    maxScore += 0.1
    if (flags.addressConsistent) score += 0.1

    return maxScore > 0 ? score / maxScore : 0
  }

  /**
   * Gera relatório de validação externa
   */
  static generateValidationReport(
    extractedData: any,
    cnpjData: CNPJValidationResult,
    flags: ValidationFlags
  ): {
    score: number
    issues: string[]
    warnings: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    if (!flags.cnpjValid) {
      issues.push('CNPJ não foi validado na Receita Federal')
      recommendations.push('Verificar se o CNPJ foi extraído corretamente')
    }

    if (flags.cnpjValid && !flags.companyNameMatch) {
      warnings.push('Nome da empresa não confere com dados da Receita Federal')
      recommendations.push('Verificar se a razão social foi extraída corretamente')
    }

    if (flags.cnpjValid && !flags.situationActive) {
      issues.push('Empresa não está ativa na Receita Federal')
      recommendations.push('Verificar situação cadastral da empresa')
    }

    if (extractedData.endereco_emitente && !flags.addressConsistent) {
      warnings.push('Endereço não confere com dados da Receita Federal')
      recommendations.push('Verificar se o endereço foi extraído corretamente')
    }

    const score = this.calculateExternalValidationScore(flags)

    return {
      score,
      issues,
      warnings,
      recommendations
    }
  }
}
