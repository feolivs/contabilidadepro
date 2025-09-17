// Sistema inteligente de classificação de documentos

export interface DocumentClassification {
  type: string
  confidence: number
  indicators: string[]
}

export class DocumentClassifier {
  
  // Padrões para identificação de NFe/NFCe
  private static NFE_PATTERNS = [
    /chave\s+de\s+acesso/i,
    /nota\s+fiscal\s+eletr[ôo]nica/i,
    /danfe/i,
    /nf-?e/i,
    /nfc-?e/i,
    /\d{44}/, // Chave de acesso (44 dígitos)
    /s[éê]rie\s*:\s*\d+/i,
    /n[úu]mero\s*:\s*\d+/i,
    /cfop\s*:\s*\d{4}/i,
    /natureza\s+da\s+opera[çc][ãa]o/i
  ]

  // Padrões para identificação de Pró-labore
  private static PROLABORE_PATTERNS = [
    /pr[óo][\s-]?labore/i,
    /remunera[çc][ãa]o\s+de\s+(s[óo]cio|administrador|diretor)/i,
    /administrador/i,
    /s[óo]cio[\s-]administrador/i,
    /diretor/i,
    /cargo\s*:\s*(administrador|diretor|s[óo]cio)/i,
    /per[íi]odo\s+de\s+refer[êe]ncia/i,
    /valor\s+bruto/i,
    /valor\s+l[íi]quido/i,
    /desconto\s+inss/i
  ]

  // Padrões para identificação de Recibo
  private static RECIBO_PATTERNS = [
    /^recibo/i,
    /recibo\s+de\s+pagamento/i,
    /recebi\s+de/i,
    /valor\s+por\s+extenso/i,
    /pagador/i,
    /benefici[áa]rio/i,
    /motivo\s+do\s+pagamento/i,
    /assinatura/i
  ]

  // Padrões para identificação de Boleto
  private static BOLETO_PATTERNS = [
    /boleto\s+banc[áa]rio/i,
    /linha\s+digit[áa]vel/i,
    /c[óo]digo\s+de\s+barras/i,
    /cedente/i,
    /sacado/i,
    /nosso\s+n[úu]mero/i,
    /vencimento/i,
    /banco\s+\d{3}/i,
    /\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}/ // Padrão linha digitável
  ]

  // Padrões para identificação de Contrato
  private static CONTRATO_PATTERNS = [
    /contrato/i,
    /contratante/i,
    /contratado/i,
    /cl[áa]usula/i,
    /objeto\s+do\s+contrato/i,
    /prazo\s+de\s+vig[êe]ncia/i,
    /partes\s+contratantes/i
  ]

  // Padrões para identificação de Extrato
  private static EXTRATO_PATTERNS = [
    /extrato/i,
    /saldo\s+anterior/i,
    /saldo\s+atual/i,
    /movimenta[çc][ãa]o/i,
    /per[íi]odo\s*:/i,
    /ag[êe]ncia/i,
    /conta\s+corrente/i
  ]

  /**
   * Classifica o tipo de documento baseado no conteúdo
   */
  static classifyDocument(content: string, fileName: string): DocumentClassification {
    const classifications: DocumentClassification[] = []

    // Análise por padrões de conteúdo
    classifications.push(this.analyzeNFe(content))
    classifications.push(this.analyzeProlabore(content))
    classifications.push(this.analyzeRecibo(content))
    classifications.push(this.analyzeBoleto(content))
    classifications.push(this.analyzeContrato(content))
    classifications.push(this.analyzeExtrato(content))

    // Análise por nome do arquivo
    const fileNameClassification = this.analyzeFileName(fileName)
    if (fileNameClassification.confidence > 0) {
      classifications.push(fileNameClassification)
    }

    // Retorna a classificação com maior confiança
    const bestClassification = classifications.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    )

    return bestClassification.confidence > 0.3 ? bestClassification : {
      type: 'Outro',
      confidence: 0.1,
      indicators: ['Documento não classificado automaticamente']
    }
  }

  private static analyzeNFe(content: string): DocumentClassification {
    const indicators: string[] = []
    let score = 0

    this.NFE_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        if (pattern.source.includes('chave')) {
          indicators.push('Chave de acesso identificada')
          score += 0.3
        } else if (pattern.source.includes('nota.*fiscal')) {
          indicators.push('Cabeçalho NFe identificado')
          score += 0.25
        } else if (pattern.source.includes('\\d{44}')) {
          indicators.push('Sequência de 44 dígitos (chave)')
          score += 0.2
        } else if (pattern.source.includes('serie')) {
          indicators.push('Série identificada')
          score += 0.1
        } else if (pattern.source.includes('cfop')) {
          indicators.push('CFOP identificado')
          score += 0.15
        } else {
          indicators.push('Padrão NFe detectado')
          score += 0.05
        }
      }
    })

    return {
      type: score > 0.4 ? 'NFe' : 'NFCe',
      confidence: Math.min(score, 1.0),
      indicators
    }
  }

  private static analyzeProlabore(content: string): DocumentClassification {
    const indicators: string[] = []
    let score = 0

    this.PROLABORE_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        if (pattern.source.includes('pr[óo]')) {
          indicators.push('Termo "pró-labore" identificado')
          score += 0.4
        } else if (pattern.source.includes('administrador')) {
          indicators.push('Cargo de administrador identificado')
          score += 0.2
        } else if (pattern.source.includes('remunera')) {
          indicators.push('Contexto de remuneração identificado')
          score += 0.15
        } else if (pattern.source.includes('valor.*bruto')) {
          indicators.push('Valor bruto identificado')
          score += 0.1
        } else {
          indicators.push('Padrão pró-labore detectado')
          score += 0.05
        }
      }
    })

    return {
      type: 'Pró-labore',
      confidence: Math.min(score, 1.0),
      indicators
    }
  }

  private static analyzeRecibo(content: string): DocumentClassification {
    const indicators: string[] = []
    let score = 0

    this.RECIBO_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        if (pattern.source.includes('^recibo')) {
          indicators.push('Cabeçalho "RECIBO" identificado')
          score += 0.3
        } else if (pattern.source.includes('recebi')) {
          indicators.push('Frase "recebi de" identificada')
          score += 0.25
        } else if (pattern.source.includes('extenso')) {
          indicators.push('Valor por extenso identificado')
          score += 0.2
        } else {
          indicators.push('Padrão recibo detectado')
          score += 0.05
        }
      }
    })

    return {
      type: 'Recibo',
      confidence: Math.min(score, 1.0),
      indicators
    }
  }

  private static analyzeBoleto(content: string): DocumentClassification {
    const indicators: string[] = []
    let score = 0

    this.BOLETO_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        if (pattern.source.includes('boleto')) {
          indicators.push('Termo "boleto bancário" identificado')
          score += 0.3
        } else if (pattern.source.includes('linha.*digit')) {
          indicators.push('Linha digitável identificada')
          score += 0.25
        } else if (pattern.source.includes('cedente')) {
          indicators.push('Cedente identificado')
          score += 0.15
        } else if (pattern.source.includes('\\d{5}')) {
          indicators.push('Padrão linha digitável detectado')
          score += 0.2
        } else {
          indicators.push('Padrão boleto detectado')
          score += 0.05
        }
      }
    })

    return {
      type: 'Boleto',
      confidence: Math.min(score, 1.0),
      indicators
    }
  }

  private static analyzeContrato(content: string): DocumentClassification {
    const indicators: string[] = []
    let score = 0

    this.CONTRATO_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        if (pattern.source.includes('contrato')) {
          indicators.push('Termo "contrato" identificado')
          score += 0.2
        } else if (pattern.source.includes('clausula')) {
          indicators.push('Cláusulas identificadas')
          score += 0.15
        } else {
          indicators.push('Padrão contrato detectado')
          score += 0.05
        }
      }
    })

    return {
      type: 'Contrato',
      confidence: Math.min(score, 1.0),
      indicators
    }
  }

  private static analyzeExtrato(content: string): DocumentClassification {
    const indicators: string[] = []
    let score = 0

    this.EXTRATO_PATTERNS.forEach(pattern => {
      if (pattern.test(content)) {
        if (pattern.source.includes('extrato')) {
          indicators.push('Termo "extrato" identificado')
          score += 0.25
        } else if (pattern.source.includes('saldo')) {
          indicators.push('Informações de saldo identificadas')
          score += 0.15
        } else {
          indicators.push('Padrão extrato detectado')
          score += 0.05
        }
      }
    })

    return {
      type: 'Extrato',
      confidence: Math.min(score, 1.0),
      indicators
    }
  }

  private static analyzeFileName(fileName: string): DocumentClassification {
    const lowerFileName = fileName.toLowerCase()
    
    if (lowerFileName.includes('nfe') || lowerFileName.includes('nota_fiscal')) {
      return {
        type: 'NFe',
        confidence: 0.6,
        indicators: ['Nome do arquivo sugere NFe']
      }
    }
    
    if (lowerFileName.includes('prolabore') || lowerFileName.includes('pro_labore')) {
      return {
        type: 'Pró-labore',
        confidence: 0.7,
        indicators: ['Nome do arquivo sugere pró-labore']
      }
    }
    
    if (lowerFileName.includes('recibo')) {
      return {
        type: 'Recibo',
        confidence: 0.6,
        indicators: ['Nome do arquivo sugere recibo']
      }
    }
    
    if (lowerFileName.includes('boleto')) {
      return {
        type: 'Boleto',
        confidence: 0.6,
        indicators: ['Nome do arquivo sugere boleto']
      }
    }
    
    if (lowerFileName.includes('contrato')) {
      return {
        type: 'Contrato',
        confidence: 0.6,
        indicators: ['Nome do arquivo sugere contrato']
      }
    }
    
    if (lowerFileName.includes('extrato')) {
      return {
        type: 'Extrato',
        confidence: 0.6,
        indicators: ['Nome do arquivo sugere extrato']
      }
    }

    return {
      type: 'Outro',
      confidence: 0,
      indicators: []
    }
  }
}
