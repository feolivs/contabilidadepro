/**
 * Processador de Cálculos Fiscais - ContabilidadePRO
 * Processa cálculos de impostos em background
 */

import { JobProcessor } from '../queue-worker'
import { logger } from '@/lib/simple-logger'
import { createClient } from '@/lib/supabase'

export interface CalculoFiscalJob {
  type: 'calculo_fiscal'
  empresaId: string
  tipoCalculo: 'DAS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS' | 'ICMS'
  periodoApuracao: string
  dadosEntrada: {
    receitaBruta: number
    regimeTributario: string
    anexoSimples?: string
    fatorR?: number
    deducoes?: {
      exportacao?: number
      st?: number
      outros?: number
    }
  }
  timestamp: string
}

export interface CalculoFiscalResult {
  valorImposto: number
  aliquotaEfetiva: number
  dataVencimento: string
  codigoBarras?: string
  detalhesCalculo: {
    baseCalculo: number
    aliquota: number
    deducoes: number
    valorFinal: number
  }
}

export class CalculoFiscalProcessor implements JobProcessor<CalculoFiscalJob> {
  private supabase = createClient()

  validate(data: CalculoFiscalJob): boolean {
    return !!(
      data.empresaId &&
      data.tipoCalculo &&
      data.periodoApuracao &&
      data.dadosEntrada?.receitaBruta !== undefined &&
      data.dadosEntrada?.regimeTributario
    )
  }

  async process(data: CalculoFiscalJob): Promise<CalculoFiscalResult> {
    logger.info('Iniciando cálculo fiscal', {
      empresaId: data.empresaId,
      tipoCalculo: data.tipoCalculo,
      periodoApuracao: data.periodoApuracao
    })

    try {
      switch (data.tipoCalculo) {
        case 'DAS':
          return await this.calcularDAS(data)
        case 'IRPJ':
          return await this.calcularIRPJ(data)
        case 'CSLL':
          return await this.calcularCSLL(data)
        case 'PIS':
          return await this.calcularPIS(data)
        case 'COFINS':
          return await this.calcularCOFINS(data)
        case 'ICMS':
          return await this.calcularICMS(data)
        default:
          throw new Error(`Tipo de cálculo não suportado: ${data.tipoCalculo}`)
      }
    } catch (error) {
      logger.error('Erro no cálculo fiscal', {
        empresaId: data.empresaId,
        tipoCalculo: data.tipoCalculo,
        error
      })
      throw error
    }
  }

  async onSuccess(result: CalculoFiscalResult, data: CalculoFiscalJob): Promise<void> {
    // Salvar resultado no banco
    try {
      const { error } = await this.supabase
        .from('calculos_fiscais')
        .insert({
          empresa_id: data.empresaId,
          tipo_calculo: data.tipoCalculo,
          periodo_apuracao: data.periodoApuracao,
          dados_entrada: data.dadosEntrada,
          resultado: result,
          status: 'concluido',
          processado_em: new Date().toISOString()
        })

      if (error) throw error

      logger.info('Resultado do cálculo salvo', {
        empresaId: data.empresaId,
        tipoCalculo: data.tipoCalculo,
        valorImposto: result.valorImposto
      })
    } catch (error) {
      logger.error('Erro ao salvar resultado do cálculo', {
        empresaId: data.empresaId,
        tipoCalculo: data.tipoCalculo,
        error
      })
    }
  }

  async onError(error: Error, data: CalculoFiscalJob): Promise<void> {
    // Salvar erro no banco
    try {
      const { error: dbError } = await this.supabase
        .from('calculos_fiscais')
        .insert({
          empresa_id: data.empresaId,
          tipo_calculo: data.tipoCalculo,
          periodo_apuracao: data.periodoApuracao,
          dados_entrada: data.dadosEntrada,
          status: 'erro',
          erro_detalhes: error.message,
          processado_em: new Date().toISOString()
        })

      if (dbError) throw dbError
    } catch (dbError) {
      logger.error('Erro ao salvar erro do cálculo', {
        empresaId: data.empresaId,
        tipoCalculo: data.tipoCalculo,
        error: dbError
      })
    }
  }

  private async calcularDAS(data: CalculoFiscalJob): Promise<CalculoFiscalResult> {
    const { receitaBruta, regimeTributario, anexoSimples, fatorR } = data.dadosEntrada

    // Validar regime
    if (regimeTributario !== 'Simples Nacional' && regimeTributario !== 'MEI') {
      throw new Error('DAS só se aplica ao Simples Nacional e MEI')
    }

    // Calcular para MEI
    if (regimeTributario === 'MEI') {
      const valorFixo = 66.60 // Valor 2025
      return {
        valorImposto: valorFixo,
        aliquotaEfetiva: 0,
        dataVencimento: this.calcularDataVencimento(data.periodoApuracao),
        detalhesCalculo: {
          baseCalculo: 0,
          aliquota: 0,
          deducoes: 0,
          valorFinal: valorFixo
        }
      }
    }

    // Calcular para Simples Nacional
    const anexo = anexoSimples || 'I'
    const aliquota = this.obterAliquotaSimples(receitaBruta, anexo, fatorR)
    
    const baseCalculo = receitaBruta
    const deducoes = this.calcularDeducoes(data.dadosEntrada.deducoes || {})
    const valorImposto = (baseCalculo - deducoes) * (aliquota / 100)

    return {
      valorImposto: Math.round(valorImposto * 100) / 100,
      aliquotaEfetiva: aliquota,
      dataVencimento: this.calcularDataVencimento(data.periodoApuracao),
      codigoBarras: this.gerarCodigoBarras(valorImposto, data.periodoApuracao),
      detalhesCalculo: {
        baseCalculo,
        aliquota,
        deducoes,
        valorFinal: valorImposto
      }
    }
  }

  private async calcularIRPJ(data: CalculoFiscalJob): Promise<CalculoFiscalResult> {
    const { receitaBruta, regimeTributario } = data.dadosEntrada

    if (regimeTributario === 'Lucro Presumido') {
      const percentualPresuncao = 0.08 // 8% para atividades em geral
      const lucroPresumido = receitaBruta * percentualPresuncao
      const irpjNormal = lucroPresumido * 0.15 // 15%
      const irpjAdicional = lucroPresumido > 20000 ? (lucroPresumido - 20000) * 0.10 : 0
      const totalIRPJ = irpjNormal + irpjAdicional

      return {
        valorImposto: Math.round(totalIRPJ * 100) / 100,
        aliquotaEfetiva: (totalIRPJ / receitaBruta) * 100,
        dataVencimento: this.calcularDataVencimento(data.periodoApuracao),
        detalhesCalculo: {
          baseCalculo: lucroPresumido,
          aliquota: 15,
          deducoes: 0,
          valorFinal: totalIRPJ
        }
      }
    }

    throw new Error(`IRPJ não implementado para regime: ${regimeTributario}`)
  }

  private async calcularCSLL(data: CalculoFiscalJob): Promise<CalculoFiscalResult> {
    // Implementação similar ao IRPJ
    throw new Error('CSLL não implementado ainda')
  }

  private async calcularPIS(data: CalculoFiscalJob): Promise<CalculoFiscalResult> {
    // Implementação PIS
    throw new Error('PIS não implementado ainda')
  }

  private async calcularCOFINS(data: CalculoFiscalJob): Promise<CalculoFiscalResult> {
    // Implementação COFINS
    throw new Error('COFINS não implementado ainda')
  }

  private async calcularICMS(data: CalculoFiscalJob): Promise<CalculoFiscalResult> {
    // Implementação ICMS
    throw new Error('ICMS não implementado ainda')
  }

  private obterAliquotaSimples(receita: number, anexo: string, fatorR?: number): number {
    // Tabela simplificada do Simples Nacional 2025
    const tabelas = {
      'I': [
        { ate: 180000, aliquota: 4.0 },
        { ate: 360000, aliquota: 7.3 },
        { ate: 720000, aliquota: 9.5 },
        { ate: 1800000, aliquota: 10.7 },
        { ate: 3600000, aliquota: 14.3 },
        { ate: 4800000, aliquota: 19.0 }
      ],
      'II': [
        { ate: 180000, aliquota: 4.5 },
        { ate: 360000, aliquota: 7.8 },
        { ate: 720000, aliquota: 10.0 },
        { ate: 1800000, aliquota: 11.2 },
        { ate: 3600000, aliquota: 14.8 },
        { ate: 4800000, aliquota: 30.0 }
      ]
    }

    const tabela = tabelas[anexo as keyof typeof tabelas] || tabelas['I']
    const faixa = tabela.find(f => receita <= f.ate)
    
    return faixa?.aliquota || tabela[tabela.length - 1].aliquota
  }

  private calcularDeducoes(deducoes: any): number {
    return (deducoes.exportacao || 0) + (deducoes.st || 0) + (deducoes.outros || 0)
  }

  private calcularDataVencimento(periodo: string): string {
    // Formato: YYYY-MM
    const [ano, mes] = periodo.split('-')
    const proximoMes = parseInt(mes!) + 1
    const proximoAno = proximoMes > 12 ? parseInt(ano!) + 1 : parseInt(ano!)
    const mesVencimento = proximoMes > 12 ? 1 : proximoMes
    
    // DAS vence no dia 20 do mês seguinte
    return `${proximoAno}-${mesVencimento.toString().padStart(2, '0')}-20`
  }

  private gerarCodigoBarras(valor: number, periodo: string): string {
    // Código de barras simplificado (em produção usar biblioteca específica)
    const valorCentavos = Math.round(valor * 100).toString().padStart(10, '0')
    const periodoNumerico = periodo.replace('-', '')
    return `85800000000${valorCentavos}${periodoNumerico}`
  }
}
