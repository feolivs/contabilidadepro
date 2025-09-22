/**
 * Sistema de Análise de Compliance Fiscal
 *
 * Este módulo implementa análise automática de conformidade fiscal baseada
 * nos dados estruturados dos documentos, verificando consistência, prazos
 * e obrigações fiscais brasileiras
 */

import type { DadosEstruturados, DadosNFe, DadosNFSe, DadosBoleto } from './dados-estruturados-processor'

/**
 * Interface para análise de compliance
 */
export interface ComplianceAnalysis {
  score_geral: number // 0-100
  nivel: 'critico' | 'baixo' | 'medio' | 'alto' | 'excelente'

  // Análises específicas
  consistencia_dados: {
    score: number
    problemas: string[]
    recomendacoes: string[]
  }

  prazos_fiscais: {
    score: number
    vencimentos_proximos: Array<{
      tipo: string
      descricao: string
      data_vencimento: string
      dias_restantes: number
      criticidade: 'baixa' | 'media' | 'alta'
    }>
    atrasos: Array<{
      tipo: string
      descricao: string
      dias_atraso: number
      multa_estimada?: number
    }>
  }

  obrigacoes_fiscais: {
    score: number
    pendentes: Array<{
      obrigacao: string
      descricao: string
      prazo: string
      status: 'pendente' | 'atrasada' | 'em_dia'
    }>
    cumpridas: string[]
  }

  qualidade_documentacao: {
    score: number
    documentos_incompletos: number
    campos_faltantes: string[]
    confianca_media: number
  }

  riscos_identificados: Array<{
    tipo: 'fiscal' | 'contabil' | 'operacional'
    descricao: string
    impacto: 'baixo' | 'medio' | 'alto'
    probabilidade: 'baixa' | 'media' | 'alta'
    recomendacao: string
  }>

  alertas_urgentes: Array<{
    tipo: string
    mensagem: string
    acao_requerida: string
    prazo_limite?: string
  }>

  historico_compliance: {
    evolucao_score: Array<{
      mes: string
      score: number
    }>
    melhorias: string[]
    deterioracoes: string[]
  }
}

/**
 * Interface para configuração de compliance
 */
export interface ComplianceConfig {
  regime_tributario: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  porte_empresa: 'MEI' | 'Micro' | 'Pequena' | 'Media' | 'Grande'
  atividade_principal: string
  estado: string
  municipio: string

  // Configurações de alertas
  dias_antecedencia_vencimento: number
  score_minimo_aceitavel: number

  // Pesos para cálculo do score
  pesos: {
    consistencia_dados: number
    prazos_fiscais: number
    obrigacoes_fiscais: number
    qualidade_documentacao: number
  }
}

/**
 * Classe principal para análise de compliance
 */
export class ComplianceAnalyzer {
  private dadosEstruturados: DadosEstruturados[]
  private config: ComplianceConfig
  private dataAnalise: Date

  constructor(
    dadosEstruturados: DadosEstruturados[],
    config: ComplianceConfig,
    dataAnalise: Date = new Date()
  ) {
    this.dadosEstruturados = dadosEstruturados
    this.config = config
    this.dataAnalise = dataAnalise
  }

  /**
   * Executar análise completa de compliance
   */
  async analisarCompliance(): Promise<ComplianceAnalysis> {
    // Análises específicas
    const consistenciaDados = this.analisarConsistenciaDados()
    const prazosFiscais = this.analisarPrazosFiscais()
    const obrigacoesFiscais = this.analisarObrigacoesFiscais()
    const qualidadeDocumentacao = this.analisarQualidadeDocumentacao()

    // Calcular score geral
    const scoreGeral = this.calcularScoreGeral({
      consistenciaDados,
      prazosFiscais,
      obrigacoesFiscais,
      qualidadeDocumentacao
    })

    // Identificar riscos
    const riscosIdentificados = this.identificarRiscos({
      consistenciaDados,
      prazosFiscais,
      obrigacoesFiscais,
      qualidadeDocumentacao
    })

    // Gerar alertas urgentes
    const alertasUrgentes = this.gerarAlertasUrgentes({
      prazosFiscais,
      obrigacoesFiscais,
      riscosIdentificados
    })

    // Analisar histórico
    const historicoCompliance = this.analisarHistoricoCompliance()

    return {
      score_geral: scoreGeral,
      nivel: this.determinarNivelCompliance(scoreGeral),
      consistencia_dados: consistenciaDados,
      prazos_fiscais: prazosFiscais,
      obrigacoes_fiscais: obrigacoesFiscais,
      qualidade_documentacao: qualidadeDocumentacao,
      riscos_identificados: riscosIdentificados,
      alertas_urgentes: alertasUrgentes,
      historico_compliance: historicoCompliance
    }
  }

  /**
   * Analisar consistência dos dados
   */
  private analisarConsistenciaDados() {
    const problemas: string[] = []
    const recomendacoes: string[] = []
    let pontuacao = 100

    // Verificar consistência entre documentos
    const nfes = this.dadosEstruturados.filter(d => d.tipo_documento === 'NFE') as DadosNFe[]
    const nfses = this.dadosEstruturados.filter(d => d.tipo_documento === 'NFSE') as DadosNFSe[]

    // Verificar CNPJs consistentes
    const cnpjsEmitentes = new Set()
    for (const nfe of nfes) {
      cnpjsEmitentes.add(nfe.emitente.cnpj)
    }
    for (const nfse of nfses) {
      cnpjsEmitentes.add(nfse.prestador.cnpj)
    }

    if (cnpjsEmitentes.size > 1) {
      problemas.push('Múltiplos CNPJs emitentes encontrados nos documentos')
      recomendacoes.push('Verificar se todos os documentos pertencem à mesma empresa')
      pontuacao -= 15
    }

    // Verificar sequência de numeração
    const numerosNFe = nfes
      .map(nfe => parseInt(nfe.numero_nf))
      .filter(num => !isNaN(num))
      .sort((a, b) => a - b)

    if (numerosNFe.length > 1) {
      const gaps = this.encontrarGapsNumeracao(numerosNFe)
      if (gaps.length > 0) {
        problemas.push(`Gaps na numeração de NFe: ${gaps.join(', ')}`)
        recomendacoes.push('Verificar se há notas canceladas ou inutilizadas')
        pontuacao -= 10
      }
    }

    // Verificar valores inconsistentes
    const valoresInconsistentes = this.verificarValoresInconsistentes()
    if (valoresInconsistentes.length > 0) {
      problemas.push(...valoresInconsistentes)
      recomendacoes.push('Revisar cálculos e valores dos documentos')
      pontuacao -= 20
    }

    // Verificar datas inconsistentes
    const datasInconsistentes = this.verificarDatasInconsistentes()
    if (datasInconsistentes.length > 0) {
      problemas.push(...datasInconsistentes)
      recomendacoes.push('Verificar datas de emissão e vencimento')
      pontuacao -= 15
    }

    return {
      score: Math.max(0, pontuacao),
      problemas,
      recomendacoes
    }
  }

  /**
   * Analisar prazos fiscais
   */
  private analisarPrazosFiscais() {
    const vencimentosProximos: any[] = []
    const atrasos: any[] = []
    let pontuacao = 100

    // Verificar vencimentos de boletos
    const boletos = this.dadosEstruturados.filter(d => d.tipo_documento === 'BOLETO') as DadosBoleto[]

    for (const boleto of boletos) {
      const dataVencimento = new Date(boleto.data_vencimento)
      const diasRestantes = Math.ceil((dataVencimento.getTime() - this.dataAnalise.getTime()) / (1000 * 60 * 60 * 24))

      if (diasRestantes < 0) {
        // Vencido
        atrasos.push({
          tipo: 'Boleto',
          descricao: `Boleto ${boleto.numero_documento || 'sem número'} vencido`,
          dias_atraso: Math.abs(diasRestantes),
          multa_estimada: this.calcularMultaEstimada(boleto.valor_nominal, Math.abs(diasRestantes))
        })
        pontuacao -= 20
      } else if (diasRestantes <= this.config.dias_antecedencia_vencimento) {
        // Próximo do vencimento
        vencimentosProximos.push({
          tipo: 'Boleto',
          descricao: `Boleto ${boleto.numero_documento || 'sem número'}`,
          data_vencimento: boleto.data_vencimento,
          dias_restantes: diasRestantes,
          criticidade: diasRestantes <= 3 ? 'alta' : diasRestantes <= 7 ? 'media' : 'baixa'
        })
      }
    }

    // Verificar prazos de obrigações mensais
    const obrigacoesMensais = this.obterObrigacoesMensais()
    for (const obrigacao of obrigacoesMensais) {
      const diasRestantes = this.calcularDiasRestantesObrigacao(obrigacao)

      if (diasRestantes < 0) {
        atrasos.push({
          tipo: 'Obrigação Fiscal',
          descricao: obrigacao.descricao,
          dias_atraso: Math.abs(diasRestantes)
        })
        pontuacao -= 25
      } else if (diasRestantes <= this.config.dias_antecedencia_vencimento) {
        vencimentosProximos.push({
          tipo: 'Obrigação Fiscal',
          descricao: obrigacao.descricao,
          data_vencimento: obrigacao.prazo,
          dias_restantes: diasRestantes,
          criticidade: diasRestantes <= 5 ? 'alta' : 'media'
        })
      }
    }

    return {
      score: Math.max(0, pontuacao),
      vencimentos_proximos: vencimentosProximos,
      atrasos
    }
  }

  /**
   * Analisar obrigações fiscais
   */
  private analisarObrigacoesFiscais() {
    const pendentes: any[] = []
    const cumpridas: string[] = []
    let pontuacao = 100

    const obrigacoes = this.obterObrigacoesPorRegime()

    for (const obrigacao of obrigacoes) {
      const status = this.verificarStatusObrigacao(obrigacao)

      if (status === 'cumprida') {
        cumpridas.push(obrigacao.nome)
      } else {
        pendentes.push({
          obrigacao: obrigacao.nome,
          descricao: obrigacao.descricao,
          prazo: obrigacao.prazo,
          status
        })

        if (status === 'atrasada') {
          pontuacao -= 30
        } else {
          pontuacao -= 10
        }
      }
    }

    return {
      score: Math.max(0, pontuacao),
      pendentes,
      cumpridas
    }
  }

  /**
   * Analisar qualidade da documentação
   */
  private analisarQualidadeDocumentacao() {
    let pontuacao = 100
    let documentosIncompletos = 0
    const camposFaltantes: string[] = []

    const confiancas = this.dadosEstruturados.map(d => d.confianca_extracao)
    const confiancaMedia = confiancas.length > 0
      ? confiancas.reduce((sum, c) => sum + c, 0) / confiancas.length
      : 0

    // Penalizar por baixa confiança
    if (confiancaMedia < 0.8) {
      pontuacao -= (0.8 - confiancaMedia) * 100
    }

    // Verificar completude dos documentos
    for (const documento of this.dadosEstruturados) {
      const camposObrigatorios = this.obterCamposObrigatorios(documento.tipo_documento)
      const camposFaltantesDoc = this.verificarCamposFaltantes(documento, camposObrigatorios)

      if (camposFaltantesDoc.length > 0) {
        documentosIncompletos++
        camposFaltantes.push(...camposFaltantesDoc)
        pontuacao -= 5
      }
    }

    return {
      score: Math.max(0, pontuacao),
      documentos_incompletos: documentosIncompletos,
      campos_faltantes: [...new Set(camposFaltantes)],
      confianca_media: confiancaMedia
    }
  }

  /**
   * Calcular score geral ponderado
   */
  private calcularScoreGeral(analises: any): number {
    const { pesos } = this.config
    const totalPesos = Object.values(pesos).reduce((sum, peso) => sum + peso, 0)

    const scoreGeral = (
      analises.consistenciaDados.score * pesos.consistencia_dados +
      analises.prazosFiscais.score * pesos.prazos_fiscais +
      analises.obrigacoesFiscais.score * pesos.obrigacoes_fiscais +
      analises.qualidadeDocumentacao.score * pesos.qualidade_documentacao
    ) / totalPesos

    return Math.round(scoreGeral)
  }

  /**
   * Determinar nível de compliance baseado no score
   */
  private determinarNivelCompliance(score: number): 'critico' | 'baixo' | 'medio' | 'alto' | 'excelente' {
    if (score >= 90) return 'excelente'
    if (score >= 75) return 'alto'
    if (score >= 60) return 'medio'
    if (score >= 40) return 'baixo'
    return 'critico'
  }
  /**
   * Métodos auxiliares privados
   */

  private encontrarGapsNumeracao(numeros: number[]): number[] {
    const gaps: number[] = []

    for (let i = 1; i < numeros.length; i++) {
      const atual = numeros[i]
      const anterior = numeros[i - 1]

      if (atual - anterior > 1) {
        for (let gap = anterior + 1; gap < atual; gap++) {
          gaps.push(gap)
        }
      }
    }

    return gaps
  }

  private verificarValoresInconsistentes(): string[] {
    const inconsistencias: string[] = []

    // Verificar NFes com valores zerados
    const nfes = this.dadosEstruturados.filter(d => d.tipo_documento === 'NFE') as DadosNFe[]
    for (const nfe of nfes) {
      if (nfe.valor_total_nota <= 0) {
        inconsistencias.push(`NFe ${nfe.numero_nf} com valor total zerado`)
      }

      if (nfe.valor_total_produtos > nfe.valor_total_nota) {
        inconsistencias.push(`NFe ${nfe.numero_nf}: valor produtos maior que total`)
      }
    }

    // Verificar NFSes com valores inconsistentes
    const nfses = this.dadosEstruturados.filter(d => d.tipo_documento === 'NFSE') as DadosNFSe[]
    for (const nfse of nfses) {
      if (nfse.valor_servicos <= 0) {
        inconsistencias.push(`NFSe ${nfse.numero_nfse} com valor de serviços zerado`)
      }

      if (nfse.valor_liquido > nfse.valor_servicos) {
        inconsistencias.push(`NFSe ${nfse.numero_nfse}: valor líquido maior que serviços`)
      }
    }

    return inconsistencias
  }

  private verificarDatasInconsistentes(): string[] {
    const inconsistencias: string[] = []

    // Verificar datas futuras
    const hoje = new Date()

    for (const documento of this.dadosEstruturados) {
      let dataEmissao: Date | null = null
      let identificador = ''

      switch (documento.tipo_documento) {
        case 'NFE':
          const nfe = documento as DadosNFe
          dataEmissao = new Date(nfe.data_emissao)
          identificador = `NFe ${nfe.numero_nf}`
          break
        case 'NFSE':
          const nfse = documento as DadosNFSe
          dataEmissao = new Date(nfse.data_emissao)
          identificador = `NFSe ${nfse.numero_nfse}`
          break
        case 'BOLETO':
          const boleto = documento as DadosBoleto
          dataEmissao = new Date(boleto.data_emissao)
          identificador = `Boleto ${boleto.numero_documento || 'sem número'}`

          // Verificar se vencimento é anterior à emissão
          const dataVencimento = new Date(boleto.data_vencimento)
          if (dataVencimento < dataEmissao) {
            inconsistencias.push(`${identificador}: vencimento anterior à emissão`)
          }
          break
      }

      if (dataEmissao && dataEmissao > hoje) {
        inconsistencias.push(`${identificador}: data de emissão futura`)
      }
    }

    return inconsistencias
  }

  private calcularMultaEstimada(valor: number, diasAtraso: number): number {
    // Cálculo simplificado: 2% + 0.033% por dia de atraso
    const multaFixa = valor * 0.02
    const jurosDiarios = valor * 0.00033 * diasAtraso
    return multaFixa + jurosDiarios
  }

  private obterObrigacoesMensais() {
    const obrigacoes = []
    const mesAtual = new Date().getMonth() + 1
    const anoAtual = new Date().getFullYear()

    // Obrigações baseadas no regime tributário
    switch (this.config.regime_tributario) {
      case 'Simples Nacional':
        obrigacoes.push({
          nome: 'DAS',
          descricao: 'Documento de Arrecadação do Simples Nacional',
          prazo: `${anoAtual}-${String(mesAtual).padStart(2, '0')}-20`
        })
        break

      case 'Lucro Presumido':
      case 'Lucro Real':
        obrigacoes.push({
          nome: 'DARF PIS',
          descricao: 'Recolhimento PIS',
          prazo: `${anoAtual}-${String(mesAtual).padStart(2, '0')}-25`
        })
        obrigacoes.push({
          nome: 'DARF COFINS',
          descricao: 'Recolhimento COFINS',
          prazo: `${anoAtual}-${String(mesAtual).padStart(2, '0')}-25`
        })
        break
    }

    // Obrigações gerais
    if (this.config.porte_empresa !== 'MEI') {
      obrigacoes.push({
        nome: 'DEFIS',
        descricao: 'Declaração de Informações Socioeconômicas e Fiscais',
        prazo: `${anoAtual}-08-31` // Até 31 de agosto
      })
    }

    return obrigacoes
  }

  private calcularDiasRestantesObrigacao(obrigacao: any): number {
    const dataPrazo = new Date(obrigacao.prazo)
    return Math.ceil((dataPrazo.getTime() - this.dataAnalise.getTime()) / (1000 * 60 * 60 * 24))
  }

  private obterObrigacoesPorRegime() {
    const obrigacoes = []

    // Obrigações baseadas no regime
    switch (this.config.regime_tributario) {
      case 'MEI':
        obrigacoes.push({
          nome: 'DASN-SIMEI',
          descricao: 'Declaração Anual do MEI',
          prazo: 'Até 31 de maio',
          periodicidade: 'anual'
        })
        break

      case 'Simples Nacional':
        obrigacoes.push({
          nome: 'DEFIS',
          descricao: 'Declaração de Informações Socioeconômicas e Fiscais',
          prazo: 'Até 31 de agosto',
          periodicidade: 'anual'
        })
        obrigacoes.push({
          nome: 'DAS Mensal',
          descricao: 'Documento de Arrecadação do Simples Nacional',
          prazo: 'Até o dia 20',
          periodicidade: 'mensal'
        })
        break

      case 'Lucro Presumido':
      case 'Lucro Real':
        obrigacoes.push({
          nome: 'ECD',
          descricao: 'Escrituração Contábil Digital',
          prazo: 'Até 31 de maio',
          periodicidade: 'anual'
        })
        obrigacoes.push({
          nome: 'ECF',
          descricao: 'Escrituração Contábil Fiscal',
          prazo: 'Até 31 de julho',
          periodicidade: 'anual'
        })
        break
    }

    return obrigacoes
  }

  private verificarStatusObrigacao(obrigacao: any): 'cumprida' | 'pendente' | 'atrasada' {
    // Implementação simplificada - em produção seria necessário
    // integração com sistemas da Receita Federal

    const hoje = new Date()
    const mesAtual = hoje.getMonth() + 1

    // Verificações básicas baseadas na periodicidade
    if (obrigacao.periodicidade === 'mensal') {
      // Para obrigações mensais, verificar se há documentos do mês
      const documentosDoMes = this.dadosEstruturados.filter(doc => {
        const dataDoc = this.extrairDataDocumento(doc)
        return dataDoc && dataDoc.getMonth() + 1 === mesAtual
      })

      return documentosDoMes.length > 0 ? 'cumprida' : 'pendente'
    }

    // Para obrigações anuais, assumir pendente por padrão
    return 'pendente'
  }

  private obterCamposObrigatorios(tipoDocumento: string): string[] {
    const campos: Record<string, string[]> = {
      'NFE': ['emitente.cnpj', 'destinatario.cnpj_cpf', 'numero_nf', 'valor_total_nota'],
      'NFSE': ['prestador.cnpj', 'tomador.cnpj_cpf', 'numero_nfse', 'valor_servicos'],
      'RECIBO': ['emitente.nome', 'pagador.nome', 'valor_total', 'descricao_servico'],
      'BOLETO': ['cedente.cnpj', 'sacado.cpf_cnpj', 'valor_nominal', 'data_vencimento'],
      'EXTRATO': ['conta.banco', 'conta.numero_conta', 'saldo_inicial', 'saldo_final']
    }

    return campos[tipoDocumento] || []
  }

  private verificarCamposFaltantes(documento: DadosEstruturados, camposObrigatorios: string[]): string[] {
    const faltantes: string[] = []

    for (const campo of camposObrigatorios) {
      const valor = this.obterValorCampo(documento, campo)
      if (!valor || valor === '' || valor === 0) {
        faltantes.push(campo)
      }
    }

    return faltantes
  }

  private obterValorCampo(obj: any, caminho: string): any {
    return caminho.split('.').reduce((atual, chave) => {
      return atual && atual[chave] !== undefined ? atual[chave] : null
    }, obj)
  }

  private extrairDataDocumento(documento: DadosEstruturados): Date | null {
    try {
      switch (documento.tipo_documento) {
        case 'NFE':
          return new Date((documento as DadosNFe).data_emissao)
        case 'NFSE':
          return new Date((documento as DadosNFSe).data_emissao)
        case 'RECIBO':
          return new Date((documento as any).data_emissao)
        case 'BOLETO':
          return new Date((documento as DadosBoleto).data_emissao)
        default:
          return null
      }
    } catch {
      return null
    }
  }

  private identificarRiscos(analises: any): any[] {
    const riscos: any[] = []

    // Riscos baseados em consistência
    if (analises.consistenciaDados.score < 70) {
      riscos.push({
        tipo: 'contabil',
        descricao: 'Inconsistências nos dados contábeis',
        impacto: 'alto',
        probabilidade: 'alta',
        recomendacao: 'Revisar e corrigir inconsistências identificadas'
      })
    }

    // Riscos baseados em prazos
    if (analises.prazosFiscais.atrasos.length > 0) {
      riscos.push({
        tipo: 'fiscal',
        descricao: 'Atrasos em obrigações fiscais',
        impacto: 'alto',
        probabilidade: 'alta',
        recomendacao: 'Regularizar pendências em atraso imediatamente'
      })
    }

    // Riscos baseados em qualidade
    if (analises.qualidadeDocumentacao.confianca_media < 0.8) {
      riscos.push({
        tipo: 'operacional',
        descricao: 'Baixa qualidade na extração de dados',
        impacto: 'medio',
        probabilidade: 'media',
        recomendacao: 'Melhorar qualidade dos documentos digitalizados'
      })
    }

    return riscos
  }

  private gerarAlertasUrgentes(dados: any): any[] {
    const alertas: any[] = []

    // Alertas para atrasos
    for (const atraso of dados.prazosFiscais.atrasos) {
      if (atraso.dias_atraso > 30) {
        alertas.push({
          tipo: 'Atraso Crítico',
          mensagem: `${atraso.descricao} em atraso há ${atraso.dias_atraso} dias`,
          acao_requerida: 'Regularizar imediatamente para evitar maiores penalidades',
          prazo_limite: 'Urgente'
        })
      }
    }

    // Alertas para vencimentos próximos críticos
    for (const vencimento of dados.prazosFiscais.vencimentos_proximos) {
      if (vencimento.criticidade === 'alta') {
        alertas.push({
          tipo: 'Vencimento Iminente',
          mensagem: `${vencimento.descricao} vence em ${vencimento.dias_restantes} dias`,
          acao_requerida: 'Providenciar pagamento ou cumprimento da obrigação',
          prazo_limite: vencimento.data_vencimento
        })
      }
    }

    return alertas
  }

  private analisarHistoricoCompliance(): any {
    // Implementação simplificada - em produção seria necessário
    // histórico armazenado de análises anteriores

    return {
      evolucao_score: [],
      melhorias: [],
      deterioracoes: []
    }
  }
}

/**
 * Configuração padrão para análise de compliance
 */
export const COMPLIANCE_CONFIG_DEFAULT: ComplianceConfig = {
  regime_tributario: 'Simples Nacional',
  porte_empresa: 'Micro',
  atividade_principal: '',
  estado: 'SP',
  municipio: 'São Paulo',
  dias_antecedencia_vencimento: 15,
  score_minimo_aceitavel: 75,
  pesos: {
    consistencia_dados: 0.3,
    prazos_fiscais: 0.3,
    obrigacoes_fiscais: 0.25,
    qualidade_documentacao: 0.15
  }
}

/**
 * Função utilitária para criar análise de compliance
 */
export async function criarAnaliseCompliance(
  dadosEstruturados: DadosEstruturados[],
  config: Partial<ComplianceConfig> = {}
): Promise<ComplianceAnalysis> {
  const configCompleta = { ...COMPLIANCE_CONFIG_DEFAULT, ...config }
  const analyzer = new ComplianceAnalyzer(dadosEstruturados, configCompleta)
  return await analyzer.analisarCompliance()
}
