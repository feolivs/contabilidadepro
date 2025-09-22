/**
 * Sistema de Cálculo de Métricas Financeiras
 *
 * Este módulo implementa cálculos avançados de métricas financeiras baseadas
 * nos dados estruturados extraídos dos documentos fiscais
 */

import type { DadosEstruturados, DadosNFe, DadosNFSe, DadosRecibo, DadosBoleto, DadosExtrato } from './dados-estruturados-processor'

/**
 * Interface para métricas financeiras mensais
 */
export interface MetricasFinanceirasMensais {
  mes: string // YYYY-MM
  receitas: {
    total: number
    nfe: number
    nfse: number
    recibos: number
    quantidade_documentos: number
  }
  despesas: {
    total: number
    boletos: number
    extratos_debitos: number
    quantidade_documentos: number
  }
  saldo_liquido: number
  margem_liquida: number
  crescimento_receita: number // % em relação ao mês anterior
  crescimento_despesa: number // % em relação ao mês anterior
  ticket_medio: number
  documentos_processados: number
}

/**
 * Interface para métricas por tipo de documento
 */
export interface MetricasPorTipo {
  tipo: string
  total_valor: number
  quantidade: number
  valor_medio: number
  valor_maximo: number
  valor_minimo: number
  participacao_percentual: number
  crescimento_mensal: number
  tendencia: 'crescente' | 'estavel' | 'decrescente'
}

/**
 * Interface para projeções financeiras
 */
export interface ProjecoesFinanceiras {
  proximo_mes: {
    receita_projetada: number
    despesa_projetada: number
    saldo_projetado: number
    confianca_projecao: number
  }
  proximos_3_meses: {
    receita_projetada: number
    despesa_projetada: number
    saldo_projetado: number
    confianca_projecao: number
  }
  proximos_6_meses: {
    receita_projetada: number
    despesa_projetada: number
    saldo_projetado: number
    confianca_projecao: number
  }
  tendencias: {
    receita: 'crescente' | 'estavel' | 'decrescente'
    despesa: 'crescente' | 'estavel' | 'decrescente'
    margem: 'melhorando' | 'estavel' | 'piorando'
  }
  sazonalidade: {
    mes_maior_receita: string
    mes_menor_receita: string
    variacao_sazonal: number
  }
}

/**
 * Interface para análise de fluxo de caixa
 */
export interface AnaliseFluxoCaixa {
  periodo: {
    inicio: string
    fim: string
  }
  entradas: {
    total: number
    por_fonte: Record<string, number>
    media_mensal: number
  }
  saidas: {
    total: number
    por_categoria: Record<string, number>
    media_mensal: number
  }
  saldo_periodo: number
  dias_caixa: number // Quantos dias a empresa consegue operar com o saldo atual
  ponto_equilibrio: number
  liquidez: {
    corrente: number
    rapida: number
    imediata: number
  }
}

/**
 * Interface para indicadores de performance
 */
export interface IndicadoresPerformance {
  faturamento: {
    atual: number
    anterior: number
    crescimento: number
    meta_mensal?: number
    percentual_meta?: number
  }
  lucratividade: {
    margem_bruta: number
    margem_liquida: number
    roi: number // Return on Investment
    ebitda?: number
  }
  eficiencia: {
    ticket_medio: number
    frequencia_vendas: number
    tempo_medio_recebimento: number
    inadimplencia: number
  }
  qualidade_dados: {
    documentos_processados: number
    confianca_media: number
    erros_estruturacao: number
    completude_dados: number
  }
}

/**
 * Classe principal para cálculo de métricas financeiras
 */
export class CalculadoraMetricasFinanceiras {
  private dadosEstruturados: DadosEstruturados[]

  constructor(dadosEstruturados: DadosEstruturados[]) {
    this.dadosEstruturados = dadosEstruturados
  }

  /**
   * Calcular métricas financeiras mensais
   */
  calcularMetricasMensais(): MetricasFinanceirasMensais[] {
    const metricasPorMes = new Map<string, MetricasFinanceirasMensais>()

    // Agrupar dados por mês
    for (const documento of this.dadosEstruturados) {
      const mes = this.extrairMesDocumento(documento)
      if (!mes) continue

      if (!metricasPorMes.has(mes)) {
        metricasPorMes.set(mes, this.inicializarMetricasMes(mes))
      }

      const metricas = metricasPorMes.get(mes)!
      this.adicionarDocumentoAMetricas(documento, metricas)
    }

    // Converter para array e calcular crescimentos
    const metricasArray = Array.from(metricasPorMes.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))

    // Calcular crescimentos mês a mês
    for (let i = 1; i < metricasArray.length; i++) {
      const atual = metricasArray[i]
      const anterior = metricasArray[i - 1]

      atual.crescimento_receita = this.calcularCrescimento(
        atual.receitas.total,
        anterior.receitas.total
      )

      atual.crescimento_despesa = this.calcularCrescimento(
        atual.despesas.total,
        anterior.despesas.total
      )
    }

    return metricasArray
  }

  /**
   * Calcular métricas por tipo de documento
   */
  calcularMetricasPorTipo(): MetricasPorTipo[] {
    const metricasPorTipo = new Map<string, {
      valores: number[]
      quantidade: number
      total: number
      porMes: Map<string, number>
    }>()

    // Agrupar por tipo
    for (const documento of this.dadosEstruturados) {
      const tipo = documento.tipo_documento
      const valor = this.extrairValorDocumento(documento)
      const mes = this.extrairMesDocumento(documento)

      if (valor <= 0 || !mes) continue

      if (!metricasPorTipo.has(tipo)) {
        metricasPorTipo.set(tipo, {
          valores: [],
          quantidade: 0,
          total: 0,
          porMes: new Map()
        })
      }

      const metricas = metricasPorTipo.get(tipo)!
      metricas.valores.push(valor)
      metricas.quantidade++
      metricas.total += valor

      const valorMes = metricas.porMes.get(mes) || 0
      metricas.porMes.set(mes, valorMes + valor)
    }

    // Calcular total geral para percentuais
    const totalGeral = Array.from(metricasPorTipo.values())
      .reduce((sum, m) => sum + m.total, 0)

    // Converter para resultado final
    const resultado: MetricasPorTipo[] = []

    for (const [tipo, dados] of metricasPorTipo) {
      const valores = dados.valores.sort((a, b) => a - b)
      const crescimentoMensal = this.calcularCrescimentoMensal(dados.porMes)
      const tendencia = this.determinarTendencia(dados.porMes)

      resultado.push({
        tipo,
        total_valor: dados.total,
        quantidade: dados.quantidade,
        valor_medio: dados.total / dados.quantidade,
        valor_maximo: Math.max(...valores),
        valor_minimo: Math.min(...valores),
        participacao_percentual: totalGeral > 0 ? (dados.total / totalGeral) * 100 : 0,
        crescimento_mensal: crescimentoMensal,
        tendencia
      })
    }

    return resultado.sort((a, b) => b.total_valor - a.total_valor)
  }

  /**
   * Gerar projeções financeiras
   */
  gerarProjecoes(): ProjecoesFinanceiras {
    const metricasMensais = this.calcularMetricasMensais()

    if (metricasMensais.length < 3) {
      // Dados insuficientes para projeções confiáveis
      return this.projecoesVazias()
    }

    // Calcular tendências
    const ultimosMeses = metricasMensais.slice(-6) // Últimos 6 meses
    const receitas = ultimosMeses.map(m => m.receitas.total)
    const despesas = ultimosMeses.map(m => m.despesas.total)

    // Regressão linear simples para projeções
    const tendenciaReceita = this.calcularTendenciaLinearSimples(receitas)
    const tendenciaDespesa = this.calcularTendenciaLinearSimples(despesas)

    // Projeções
    const proximoMes = {
      receita_projetada: Math.max(0, tendenciaReceita.proximo),
      despesa_projetada: Math.max(0, tendenciaDespesa.proximo),
      saldo_projetado: 0,
      confianca_projecao: Math.min(tendenciaReceita.confianca, tendenciaDespesa.confianca)
    }
    proximoMes.saldo_projetado = proximoMes.receita_projetada - proximoMes.despesa_projetada

    const proximos3Meses = {
      receita_projetada: Math.max(0, tendenciaReceita.proximos3),
      despesa_projetada: Math.max(0, tendenciaDespesa.proximos3),
      saldo_projetado: 0,
      confianca_projecao: Math.min(tendenciaReceita.confianca, tendenciaDespesa.confianca) * 0.8
    }
    proximos3Meses.saldo_projetado = proximos3Meses.receita_projetada - proximos3Meses.despesa_projetada

    const proximos6Meses = {
      receita_projetada: Math.max(0, tendenciaReceita.proximos6),
      despesa_projetada: Math.max(0, tendenciaDespesa.proximos6),
      saldo_projetado: 0,
      confianca_projecao: Math.min(tendenciaReceita.confianca, tendenciaDespesa.confianca) * 0.6
    }
    proximos6Meses.saldo_projetado = proximos6Meses.receita_projetada - proximos6Meses.despesa_projetada

    // Análise de sazonalidade
    const sazonalidade = this.analisarSazonalidade(metricasMensais)

    return {
      proximo_mes: proximoMes,
      proximos_3_meses: proximos3Meses,
      proximos_6_meses: proximos6Meses,
      tendencias: {
        receita: tendenciaReceita.direcao,
        despesa: tendenciaDespesa.direcao,
        margem: this.analisarTendenciaMargem(metricasMensais)
      },
      sazonalidade
    }
  }

  /**
   * Analisar fluxo de caixa
   */
  analisarFluxoCaixa(): AnaliseFluxoCaixa {
    const metricasMensais = this.calcularMetricasMensais()

    if (metricasMensais.length === 0) {
      return this.fluxoCaixaVazio()
    }

    const periodo = {
      inicio: metricasMensais[0].mes,
      fim: metricasMensais[metricasMensais.length - 1].mes
    }

    const totalEntradas = metricasMensais.reduce((sum, m) => sum + m.receitas.total, 0)
    const totalSaidas = metricasMensais.reduce((sum, m) => sum + m.despesas.total, 0)
    const mediaEntradas = totalEntradas / metricasMensais.length
    const mediaSaidas = totalSaidas / metricasMensais.length

    // Análise por fonte/categoria
    const porFonte = this.agruparPorFonte()
    const porCategoria = this.agruparPorCategoria()

    // Cálculos de liquidez (simplificados)
    const saldoAtual = totalEntradas - totalSaidas
    const diasCaixa = mediaSaidas > 0 ? (saldoAtual / mediaSaidas) * 30 : 0

    return {
      periodo,
      entradas: {
        total: totalEntradas,
        por_fonte: porFonte,
        media_mensal: mediaEntradas
      },
      saidas: {
        total: totalSaidas,
        por_categoria: porCategoria,
        media_mensal: mediaSaidas
      },
      saldo_periodo: saldoAtual,
      dias_caixa: Math.max(0, diasCaixa),
      ponto_equilibrio: mediaSaidas,
      liquidez: {
        corrente: totalEntradas > 0 ? totalEntradas / totalSaidas : 0,
        rapida: totalEntradas > 0 ? (totalEntradas * 0.8) / totalSaidas : 0,
        imediata: totalEntradas > 0 ? (totalEntradas * 0.6) / totalSaidas : 0
      }
    }
  }

  /**
   * Calcular indicadores de performance
   */
  calcularIndicadoresPerformance(): IndicadoresPerformance {
    const metricasMensais = this.calcularMetricasMensais()

    if (metricasMensais.length === 0) {
      return this.indicadoresVazios()
    }

    const ultimoMes = metricasMensais[metricasMensais.length - 1]
    const mesAnterior = metricasMensais.length > 1 ? metricasMensais[metricasMensais.length - 2] : ultimoMes

    if (!ultimoMes || !mesAnterior) {
      return this.indicadoresVazios()
    }

    // Faturamento
    const faturamento = {
      atual: ultimoMes.receitas.total,
      anterior: mesAnterior.receitas.total,
      crescimento: this.calcularCrescimento(ultimoMes.receitas.total, mesAnterior.receitas.total),
      meta_mensal: undefined,
      percentual_meta: undefined
    }

    // Lucratividade
    const lucratividade = {
      margem_bruta: ultimoMes.receitas.total > 0 ? (ultimoMes.saldo_liquido / ultimoMes.receitas.total) * 100 : 0,
      margem_liquida: ultimoMes.margem_liquida,
      roi: this.calcularROI(metricasMensais),
      ebitda: undefined
    }

    // Eficiência
    const eficiencia = {
      ticket_medio: ultimoMes.ticket_medio,
      frequencia_vendas: ultimoMes.receitas.quantidade_documentos,
      tempo_medio_recebimento: this.calcularTempoMedioRecebimento(),
      inadimplencia: this.calcularTaxaInadimplencia()
    }

    // Qualidade dos dados
    const qualidadeDados = {
      documentos_processados: this.dadosEstruturados.length,
      confianca_media: this.calcularConfiancaMedia(),
      erros_estruturacao: this.contarErrosEstruturacao(),
      completude_dados: this.calcularCompletudeDados()
    }

    return {
      faturamento,
      lucratividade,
      eficiencia,
      qualidade_dados: qualidadeDados
    }
  }
  /**
   * Métodos auxiliares privados
   */

  private extrairMesDocumento(documento: DadosEstruturados): string | null {
    let dataEmissao: string | null = null

    switch (documento.tipo_documento) {
      case 'NFE':
        dataEmissao = (documento as DadosNFe).data_emissao
        break
      case 'NFSE':
        dataEmissao = (documento as DadosNFSe).data_emissao
        break
      case 'RECIBO':
        dataEmissao = (documento as DadosRecibo).data_emissao
        break
      case 'BOLETO':
        dataEmissao = (documento as DadosBoleto).data_emissao
        break
      case 'EXTRATO':
        dataEmissao = (documento as DadosExtrato).data_inicio
        break
    }

    if (!dataEmissao) return null

    try {
      const data = new Date(dataEmissao)
      return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    } catch {
      return null
    }
  }

  private extrairValorDocumento(documento: DadosEstruturados): number {
    switch (documento.tipo_documento) {
      case 'NFE':
        return (documento as DadosNFe).valor_total_nota || 0
      case 'NFSE':
        return (documento as DadosNFSe).valor_liquido || 0
      case 'RECIBO':
        return (documento as DadosRecibo).valor_total || 0
      case 'BOLETO':
        return (documento as DadosBoleto).valor_nominal || 0
      case 'EXTRATO':
        return Math.abs((documento as DadosExtrato).saldo_final || 0)
      default:
        return 0
    }
  }

  private inicializarMetricasMes(mes: string): MetricasFinanceirasMensais {
    return {
      mes,
      receitas: {
        total: 0,
        nfe: 0,
        nfse: 0,
        recibos: 0,
        quantidade_documentos: 0
      },
      despesas: {
        total: 0,
        boletos: 0,
        extratos_debitos: 0,
        quantidade_documentos: 0
      },
      saldo_liquido: 0,
      margem_liquida: 0,
      crescimento_receita: 0,
      crescimento_despesa: 0,
      ticket_medio: 0,
      documentos_processados: 0
    }
  }

  private adicionarDocumentoAMetricas(documento: DadosEstruturados, metricas: MetricasFinanceirasMensais): void {
    const valor = this.extrairValorDocumento(documento)
    if (valor <= 0) return

    metricas.documentos_processados++

    if (this.isReceita(documento)) {
      metricas.receitas.total += valor
      metricas.receitas.quantidade_documentos++

      switch (documento.tipo_documento) {
        case 'NFE':
          metricas.receitas.nfe += valor
          break
        case 'NFSE':
          metricas.receitas.nfse += valor
          break
        case 'RECIBO':
          metricas.receitas.recibos += valor
          break
      }
    } else {
      metricas.despesas.total += valor
      metricas.despesas.quantidade_documentos++

      switch (documento.tipo_documento) {
        case 'BOLETO':
          metricas.despesas.boletos += valor
          break
        case 'EXTRATO':
          metricas.despesas.extratos_debitos += valor
          break
      }
    }

    metricas.saldo_liquido = metricas.receitas.total - metricas.despesas.total
    metricas.margem_liquida = metricas.receitas.total > 0
      ? (metricas.saldo_liquido / metricas.receitas.total) * 100
      : 0
    metricas.ticket_medio = metricas.receitas.quantidade_documentos > 0
      ? metricas.receitas.total / metricas.receitas.quantidade_documentos
      : 0
  }

  private isReceita(documento: DadosEstruturados): boolean {
    return ['NFE', 'NFSE', 'RECIBO'].includes(documento.tipo_documento)
  }

  private calcularCrescimento(valorAtual: number, valorAnterior: number): number {
    if (valorAnterior === 0) return valorAtual > 0 ? 100 : 0
    return ((valorAtual - valorAnterior) / valorAnterior) * 100
  }

  private calcularCrescimentoMensal(porMes: Map<string, number>): number {
    const meses = Array.from(porMes.keys()).sort()
    if (meses.length < 2) return 0

    const ultimoMesKey = meses[meses.length - 1]
    const penultimoMesKey = meses[meses.length - 2]

    if (!ultimoMesKey || !penultimoMesKey) return 0

    const ultimoMes = porMes.get(ultimoMesKey) || 0
    const penultimoMes = porMes.get(penultimoMesKey) || 0

    return this.calcularCrescimento(ultimoMes, penultimoMes)
  }

  private determinarTendencia(porMes: Map<string, number>): 'crescente' | 'estavel' | 'decrescente' {
    const valores = Array.from(porMes.values())
    if (valores.length < 3) return 'estavel'

    const ultimos3 = valores.slice(-3)
    const crescimentos = []

    for (let i = 1; i < ultimos3.length; i++) {
      const atual = ultimos3[i]
      const anterior = ultimos3[i - 1]
      if (atual !== undefined && anterior !== undefined) {
        crescimentos.push(this.calcularCrescimento(atual, anterior))
      }
    }

    const crescimentoMedio = crescimentos.reduce((sum, c) => sum + c, 0) / crescimentos.length

    if (crescimentoMedio > 5) return 'crescente'
    if (crescimentoMedio < -5) return 'decrescente'
    return 'estavel'
  }

  // Métodos auxiliares que precisam ser implementados
  private projecoesVazias(): ProjecoesFinanceiras {
    return {
      proximo_mes: { receita_projetada: 0, despesa_projetada: 0, saldo_projetado: 0, confianca_projecao: 0 },
      proximos_3_meses: { receita_projetada: 0, despesa_projetada: 0, saldo_projetado: 0, confianca_projecao: 0 },
      proximos_6_meses: { receita_projetada: 0, despesa_projetada: 0, saldo_projetado: 0, confianca_projecao: 0 },
      tendencias: { receita: 'estavel', despesa: 'estavel', margem: 'estavel' },
      sazonalidade: { mes_maior_receita: '', mes_menor_receita: '', variacao_sazonal: 0 }
    }
  }

  private analisarSazonalidade(metricas: MetricasFinanceirasMensais[]): any {
    if (metricas.length < 12) {
      return { mes_maior_receita: '', mes_menor_receita: '', variacao_sazonal: 0 }
    }

    const receitasPorMes = metricas.map(m => ({ mes: m.mes, receita: m.receitas.total }))
    receitasPorMes.sort((a, b) => b.receita - a.receita)

    const maior = receitasPorMes[0]
    const menor = receitasPorMes[receitasPorMes.length - 1]

    if (!maior || !menor) {
      return { mes_maior_receita: '', mes_menor_receita: '', variacao_sazonal: 0 }
    }

    const variacao = maior.receita > 0 ? ((maior.receita - menor.receita) / maior.receita) * 100 : 0

    return {
      mes_maior_receita: maior.mes,
      mes_menor_receita: menor.mes,
      variacao_sazonal: variacao
    }
  }

  private analisarTendenciaMargem(metricas: MetricasFinanceirasMensais[]): 'melhorando' | 'estavel' | 'piorando' {
    if (metricas.length < 3) return 'estavel'

    const ultimas3Margens = metricas.slice(-3).map(m => m.margem_liquida)

    if (ultimas3Margens.length < 3) return 'estavel'

    const margemInicial = ultimas3Margens[0]
    const margemFinal = ultimas3Margens[2]

    if (margemInicial === undefined || margemFinal === undefined) return 'estavel'

    const crescimentoMargem = this.calcularCrescimento(margemFinal, margemInicial)

    if (crescimentoMargem > 2) return 'melhorando'
    if (crescimentoMargem < -2) return 'piorando'
    return 'estavel'
  }

  private fluxoCaixaVazio(): AnaliseFluxoCaixa {
    return {
      periodo: { inicio: '', fim: '' },
      entradas: { total: 0, por_fonte: {}, media_mensal: 0 },
      saidas: { total: 0, por_categoria: {}, media_mensal: 0 },
      saldo_periodo: 0,
      dias_caixa: 0,
      ponto_equilibrio: 0,
      liquidez: { corrente: 0, rapida: 0, imediata: 0 }
    }
  }

  private agruparPorFonte(): Record<string, number> {
    const porFonte: Record<string, number> = {}

    for (const doc of this.dadosEstruturados) {
      if (this.isReceita(doc)) {
        const valor = this.extrairValorDocumento(doc)
        const fonte = doc.tipo_documento
        porFonte[fonte] = (porFonte[fonte] || 0) + valor
      }
    }

    return porFonte
  }

  private agruparPorCategoria(): Record<string, number> {
    const porCategoria: Record<string, number> = {}

    for (const doc of this.dadosEstruturados) {
      if (!this.isReceita(doc)) {
        const valor = this.extrairValorDocumento(doc)
        const categoria = doc.tipo_documento
        porCategoria[categoria] = (porCategoria[categoria] || 0) + valor
      }
    }

    return porCategoria
  }

  private indicadoresVazios(): IndicadoresPerformance {
    return {
      faturamento: { atual: 0, anterior: 0, crescimento: 0 },
      lucratividade: { margem_bruta: 0, margem_liquida: 0, roi: 0 },
      eficiencia: { ticket_medio: 0, frequencia_vendas: 0, tempo_medio_recebimento: 0, inadimplencia: 0 },
      qualidade_dados: { documentos_processados: 0, confianca_media: 0, erros_estruturacao: 0, completude_dados: 0 }
    }
  }

  private calcularROI(metricas: MetricasFinanceirasMensais[]): number {
    if (metricas.length === 0) return 0
    const totalReceitas = metricas.reduce((sum, m) => sum + m.receitas.total, 0)
    const totalDespesas = metricas.reduce((sum, m) => sum + m.despesas.total, 0)
    return totalDespesas > 0 ? ((totalReceitas - totalDespesas) / totalDespesas) * 100 : 0
  }

  private calcularTempoMedioRecebimento(): number {
    // Implementação simplificada - seria necessário dados de vencimento vs pagamento
    return 30 // dias
  }

  private calcularTaxaInadimplencia(): number {
    // Implementação simplificada - seria necessário dados de inadimplência
    return 0
  }

  private calcularConfiancaMedia(): number {
    if (this.dadosEstruturados.length === 0) return 0
    const somaConfianca = this.dadosEstruturados.reduce((sum, doc) => sum + doc.confianca_extracao, 0)
    return somaConfianca / this.dadosEstruturados.length
  }

  private contarErrosEstruturacao(): number {
    return this.dadosEstruturados.filter(doc => doc.erros_validacao.length > 0).length
  }

  private calcularCompletudeDados(): number {
    if (this.dadosEstruturados.length === 0) return 0
    const documentosCompletos = this.dadosEstruturados.filter(doc => doc.campos_extraidos.length >= 5).length
    return (documentosCompletos / this.dadosEstruturados.length) * 100
  }

  private calcularTendenciaLinearSimples(valores: number[]): { proximo: number; confianca: number } {
    if (valores.length < 2) return { proximo: 0, confianca: 0 }

    const n = valores.length
    const x = Array.from({ length: n }, (_, i) => i + 1)
    const y = valores

    // Calcular médias
    const xMean = x.reduce((sum, val) => sum + val, 0) / n
    const yMean = y.reduce((sum, val) => sum + val, 0) / n

    // Calcular coeficientes da regressão linear
    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean)
      denominator += (x[i] - xMean) ** 2
    }

    const slope = denominator === 0 ? 0 : numerator / denominator
    const intercept = yMean - slope * xMean

    // Projeção para próximo período
    const proximo = Math.max(0, slope * (n + 1) + intercept)

    // Calcular R² para confiança
    let ssRes = 0
    let ssTot = 0

    for (let i = 0; i < n; i++) {
      const predicted = slope * x[i] + intercept
      ssRes += (y[i] - predicted) ** 2
      ssTot += (y[i] - yMean) ** 2
    }

    const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot)
    const confianca = Math.max(0, Math.min(100, rSquared * 100))

    return { proximo, confianca }
  }
}
