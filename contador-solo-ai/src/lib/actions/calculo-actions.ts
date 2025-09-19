'use server'

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cacheUtils } from '@/lib/simple-cache'
import { logger } from '@/lib/simple-logger'
import { z } from 'zod'
import type {
  DadosCalculoDAS,
  DadosCalculoIRPJ,
  ResultadoCalculo,
  CalculoFiscal
} from '@/types/calculo'

// =====================================================
// SCHEMAS DE VALIDAÇÃO
// =====================================================

const DASInputSchema = z.object({
  empresa_id: z.string().uuid('ID da empresa deve ser UUID válido'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve estar no formato YYYY-MM'),
  faturamento_bruto: z.number()
    .min(0, 'Faturamento não pode ser negativo')
    .max(999999999.99, 'Faturamento acima do limite máximo'),
  faturamento_12_meses: z.number()
    .min(0, 'Faturamento 12 meses não pode ser negativo')
    .max(4800000, 'Faturamento excede limite do Simples Nacional'),
  anexo_simples: z.enum(['I', 'II', 'III', 'IV', 'V'], {
    message: 'Anexo deve ser I, II, III, IV ou V'
  }),
  deducoes: z.number().min(0).optional().default(0)
})

const IRPJInputSchema = z.object({
  empresa_id: z.string().uuid('ID da empresa deve ser UUID válido'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve estar no formato YYYY-MM'),
  receita_bruta: z.number()
    .min(0, 'Receita não pode ser negativa')
    .max(999999999.99, 'Receita acima do limite máximo'),
  atividade_principal: z.string().min(1, 'Atividade principal é obrigatória'),
  deducoes: z.number().min(0).optional().default(0),
  incentivos_fiscais: z.number().min(0).optional().default(0)
})

const MEIInputSchema = z.object({
  empresa_id: z.string().uuid('ID da empresa deve ser UUID válido'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Competência deve estar no formato YYYY-MM'),
  receita_bruta: z.number()
    .min(0, 'Receita não pode ser negativa')
    .max(6750, 'Receita mensal MEI não pode exceder R$ 6.750,00'),
  atividade: z.enum(['comercio', 'servicos', 'comercio_servicos'], {
    message: 'Atividade deve ser comércio, serviços ou comércio e serviços'
  })
})

// =====================================================
// TABELAS FISCAIS 2024
// =====================================================

const TABELAS_SIMPLES_2024 = {
  'I': [
    { ate: 180000, aliquota: 4.0, deducao: 0, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 360000, aliquota: 7.3, deducao: 5940, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 720000, aliquota: 9.5, deducao: 13860, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 1800000, aliquota: 10.7, deducao: 22500, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 3600000, aliquota: 14.3, deducao: 87300, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 4800000, aliquota: 19.0, deducao: 378000, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 }
  ],
  'II': [
    { ate: 180000, aliquota: 4.5, deducao: 0, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 360000, aliquota: 7.8, deducao: 5940, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 720000, aliquota: 10.0, deducao: 13860, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 1800000, aliquota: 11.2, deducao: 22500, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 3600000, aliquota: 14.8, deducao: 85500, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 },
    { ate: 4800000, aliquota: 30.0, deducao: 720000, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, icms: 34.0 }
  ],
  'III': [
    { ate: 180000, aliquota: 6.0, deducao: 0, irpj: 4.0, csll: 3.5, pis: 0.65, cofins: 3.0, cpp: 28.85, iss: 60.0 },
    { ate: 360000, aliquota: 11.2, deducao: 9360, irpj: 4.0, csll: 3.5, pis: 0.65, cofins: 3.0, cpp: 28.85, iss: 60.0 },
    { ate: 720000, aliquota: 13.5, deducao: 17640, irpj: 4.0, csll: 3.5, pis: 0.65, cofins: 3.0, cpp: 28.85, iss: 60.0 },
    { ate: 1800000, aliquota: 16.0, deducao: 35640, irpj: 4.0, csll: 3.5, pis: 0.65, cofins: 3.0, cpp: 28.85, iss: 60.0 },
    { ate: 3600000, aliquota: 21.0, deducao: 125640, irpj: 4.0, csll: 3.5, pis: 0.65, cofins: 3.0, cpp: 28.85, iss: 60.0 },
    { ate: 4800000, aliquota: 33.0, deducao: 648000, irpj: 4.0, csll: 3.5, pis: 0.65, cofins: 3.0, cpp: 28.85, iss: 60.0 }
  ],
  'IV': [
    { ate: 180000, aliquota: 4.5, deducao: 0, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, iss: 46.0 },
    { ate: 360000, aliquota: 9.0, deducao: 8100, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, iss: 46.0 },
    { ate: 720000, aliquota: 10.2, deducao: 12420, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, iss: 46.0 },
    { ate: 1800000, aliquota: 14.0, deducao: 39780, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, iss: 46.0 },
    { ate: 3600000, aliquota: 22.0, deducao: 183780, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, iss: 46.0 },
    { ate: 4800000, aliquota: 33.0, deducao: 828000, irpj: 5.5, csll: 3.4, pis: 0.65, cofins: 3.0, cpp: 41.5, iss: 46.0 }
  ],
  'V': [
    { ate: 180000, aliquota: 15.5, deducao: 0, irpj: 25.0, csll: 15.0, cpp: 28.85, iss: 31.15 },
    { ate: 360000, aliquota: 18.0, deducao: 4500, irpj: 23.0, csll: 15.0, cpp: 28.85, iss: 33.15 },
    { ate: 720000, aliquota: 19.5, deducao: 9900, irpj: 24.0, csll: 15.0, cpp: 28.85, iss: 32.15 },
    { ate: 1800000, aliquota: 20.5, deducao: 17100, irpj: 21.0, csll: 15.0, cpp: 28.85, iss: 35.15 },
    { ate: 3600000, aliquota: 23.0, deducao: 62100, irpj: 23.0, csll: 12.0, cpp: 28.85, iss: 36.15 },
    { ate: 4800000, aliquota: 30.5, deducao: 540000, irpj: 35.0, csll: 15.0, cpp: 28.85, iss: 21.15 }
  ]
} as const

// =====================================================
// UTILITÁRIOS
// =====================================================

function calcularDataVencimento(competencia: string, tipo: 'DAS' | 'IRPJ'): string {
  const [anoStr, mesStr] = competencia.split('-')
  const ano = parseInt(anoStr || '2024', 10)
  const mes = parseInt(mesStr || '1', 10)

  if (tipo === 'DAS') {
    // DAS vence no dia 20 do mês seguinte
    const proximoMes = mes === 12 ? 1 : mes + 1
    const proximoAno = mes === 12 ? ano + 1 : ano
    return `${proximoAno}-${proximoMes.toString().padStart(2, '0')}-20`
  } else {
    // IRPJ vence no último dia útil do mês seguinte ao trimestre
    const ultimoDia = new Date(ano, mes, 0).getDate()
    return `${ano}-${mes.toString().padStart(2, '0')}-${ultimoDia}`
  }
}

function gerarCodigoBarras(): string {
  // Gerar código de barras simulado (47 dígitos)
  return Array.from({ length: 47 }, () => Math.floor(Math.random() * 10)).join('')
}

function formatarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100
}

// =====================================================
// SERVER ACTIONS
// =====================================================

interface ActionState {
  success: boolean;
  data?: ResultadoCalculo;
  error?: string;
}

interface FaixaComPIS {
  pis?: number;
}

interface FaixaComCOFINS {
  cofins?: number;
}

export async function calcularDASAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // Extrair dados do FormData
    const rawData = {
      empresa_id: formData.get('empresa_id') as string,
      competencia: formData.get('competencia') as string,
      faturamento_bruto: Number(formData.get('faturamento_bruto')),
      faturamento_12_meses: Number(formData.get('faturamento_12_meses')),
      anexo_simples: formData.get('anexo_simples') as 'I' | 'II' | 'III' | 'IV' | 'V',
      deducoes: Number(formData.get('deducoes')) || 0
    }

    // Validar dados
    const validatedData = DASInputSchema.parse(rawData)

    // Cache é gerenciado automaticamente pelo Next.js via unstable_cache
    // Não precisamos verificar cache manualmente aqui

    // Buscar tabela do anexo
    const tabela = TABELAS_SIMPLES_2024[validatedData.anexo_simples]
    const faixa = tabela.find(f => validatedData.faturamento_12_meses <= f.ate)
    
    if (!faixa) {
      throw new Error('Faturamento excede limite do Simples Nacional (R$ 4.800.000)')
    }

    // Calcular alíquota efetiva
    const aliquotaEfetiva = validatedData.faturamento_12_meses > 0 
      ? Math.max(0, ((validatedData.faturamento_12_meses * faixa.aliquota / 100) - faixa.deducao) / validatedData.faturamento_12_meses * 100)
      : faixa.aliquota

    // Calcular valor do DAS
    const valorDAS = formatarMoeda(validatedData.faturamento_bruto * (aliquotaEfetiva / 100))

    // Calcular detalhamento por imposto
    const detalhamento = {
      irpj: formatarMoeda(valorDAS * (faixa.irpj / 100)),
      csll: formatarMoeda(valorDAS * (faixa.csll / 100)),
      pis: formatarMoeda(valorDAS * ((faixa as FaixaComPIS).pis || 0) / 100),
      cofins: formatarMoeda(valorDAS * ((faixa as FaixaComCOFINS).cofins || 0) / 100),
      cpp: formatarMoeda(valorDAS * (faixa.cpp / 100)),
      ...(validatedData.anexo_simples === 'I' || validatedData.anexo_simples === 'II' ? {
        icms: formatarMoeda(valorDAS * ((faixa as any).icms || 0) / 100)
      } : {}),
      ...(validatedData.anexo_simples === 'III' || validatedData.anexo_simples === 'IV' || validatedData.anexo_simples === 'V' ? {
        iss: formatarMoeda(valorDAS * ((faixa as any).iss || 0) / 100)
      } : {})
    }

    const resultado: ResultadoCalculo = {
      base_calculo: validatedData.faturamento_bruto,
      aliquota_nominal: faixa.aliquota,
      aliquota_efetiva: formatarMoeda(aliquotaEfetiva),
      valor_imposto: valorDAS,
      valor_total: valorDAS,
      data_vencimento: calcularDataVencimento(validatedData.competencia, 'DAS'),
      detalhamento
    }

    // Salvar no banco de dados
    const supabase = createClient()
    const { data: calculoSalvo, error: dbError } = await supabase
      .from('calculos_fiscais')
      .insert({
        empresa_id: validatedData.empresa_id,
        tipo_calculo: 'DAS',
        competencia: validatedData.competencia,
        regime_tributario: 'Simples Nacional',
        faturamento_bruto: validatedData.faturamento_bruto,
        faturamento_12_meses: validatedData.faturamento_12_meses,
        anexo_simples: validatedData.anexo_simples,
        deducoes: validatedData.deducoes,
        base_calculo: resultado.base_calculo,
        aliquota_nominal: resultado.aliquota_nominal,
        aliquota_efetiva: resultado.aliquota_efetiva,
        valor_imposto: resultado.valor_imposto,
        valor_total: resultado.valor_total,
        data_vencimento: resultado.data_vencimento,
        codigo_barras: gerarCodigoBarras(),
        status: 'calculado',
        calculado_automaticamente: true,
        irpj: detalhamento.irpj || 0,
        csll: detalhamento.csll || 0,
        pis: detalhamento.pis || 0,
        cofins: detalhamento.cofins || 0,
        cpp: detalhamento.cpp || 0,
        icms: detalhamento.icms || 0,
        iss: detalhamento.iss || 0
      })
      .select()
      .single()

    if (dbError) {

      throw new Error('Erro ao salvar cálculo no banco de dados')
    }

    // Revalidar cache do Next.js
    cacheUtils.invalidateEmpresa(validatedData.empresa_id)
    revalidateTag('calculos')
    revalidateTag(`calculos-empresa-${validatedData.empresa_id}`)
    revalidatePath('/calculos')
    revalidatePath('/dashboard')

    return { success: true, data: resultado }

  } catch (error) {
    logger.error('Erro no cálculo DAS', { error })

    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return { success: false, error: `Dados inválidos: ${errorMessages}` }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no cálculo DAS'
    }
  }
}

export async function calcularIRPJAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; data?: ResultadoCalculo; error?: string }> {
  try {
    // Extrair dados do FormData
    const rawData = {
      empresa_id: formData.get('empresa_id') as string,
      competencia: formData.get('competencia') as string,
      receita_bruta: Number(formData.get('receita_bruta')),
      atividade_principal: formData.get('atividade_principal') as string,
      deducoes: Number(formData.get('deducoes')) || 0,
      incentivos_fiscais: Number(formData.get('incentivos_fiscais')) || 0
    }

    // Validar dados
    const validatedData = IRPJInputSchema.parse(rawData)

    // Cache é gerenciado automaticamente pelo Next.js via unstable_cache
    // Não precisamos verificar cache manualmente aqui

    // Determinar percentual de presunção baseado na atividade
    const percentualPresuncao = determinarPercentualPresuncao(validatedData.atividade_principal)

    // Calcular base de cálculo
    const baseCalculo = formatarMoeda((validatedData.receita_bruta - validatedData.deducoes) * (percentualPresuncao / 100))

    // Calcular IRPJ
    const irpjNormal = formatarMoeda(baseCalculo * 0.15) // 15% sobre a base
    const irpjAdicional = formatarMoeda(Math.max(0, (baseCalculo - 20000) * 0.10)) // 10% sobre o que exceder R$ 20.000/mês
    const totalIRPJ = irpjNormal + irpjAdicional

    // Calcular CSLL
    const csll = formatarMoeda(baseCalculo * 0.09) // 9% sobre a base

    // Aplicar incentivos fiscais
    const valorComIncentivos = Math.max(0, totalIRPJ + csll - validatedData.incentivos_fiscais)

    const resultado: ResultadoCalculo = {
      base_calculo: baseCalculo,
      aliquota_nominal: 24.0, // 15% IRPJ + 9% CSLL
      aliquota_efetiva: formatarMoeda((valorComIncentivos / validatedData.receita_bruta) * 100),
      valor_imposto: valorComIncentivos,
      valor_total: valorComIncentivos,
      data_vencimento: calcularDataVencimento(validatedData.competencia, 'IRPJ'),
      detalhamento: {
        irpj: totalIRPJ,
        csll: csll
      }
    }

    // Salvar no banco de dados
    const supabase = createClient()
    const { data: calculoSalvo, error: dbError } = await supabase
      .from('calculos_fiscais')
      .insert({
        empresa_id: validatedData.empresa_id,
        tipo_calculo: 'IRPJ',
        competencia: validatedData.competencia,
        regime_tributario: 'Lucro Presumido',
        faturamento_bruto: validatedData.receita_bruta,
        deducoes: validatedData.deducoes,
        base_calculo: resultado.base_calculo,
        aliquota_nominal: resultado.aliquota_nominal,
        aliquota_efetiva: resultado.aliquota_efetiva,
        valor_imposto: resultado.valor_imposto,
        valor_total: resultado.valor_total,
        data_vencimento: resultado.data_vencimento,
        codigo_barras: gerarCodigoBarras(),
        status: 'calculado',
        calculado_automaticamente: true,
        irpj: resultado.detalhamento.irpj || 0,
        csll: resultado.detalhamento.csll || 0
      })
      .select()
      .single()

    if (dbError) {

      throw new Error('Erro ao salvar cálculo no banco de dados')
    }

    // Revalidar cache do Next.js
    cacheUtils.invalidateEmpresa(validatedData.empresa_id)
    revalidateTag('calculos')
    revalidateTag(`calculos-empresa-${validatedData.empresa_id}`)
    revalidatePath('/calculos')
    revalidatePath('/dashboard')

    return { success: true, data: resultado }

  } catch (error) {
    logger.error('Erro no cálculo IRPJ', { error })

    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      return { success: false, error: `Dados inválidos: ${errorMessages}` }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no cálculo IRPJ'
    }
  }
}

function determinarPercentualPresuncao(atividade: string): number {
  const atividadeLower = atividade.toLowerCase()

  // Atividades com 32% de presunção
  if (atividadeLower.includes('serviço') ||
      atividadeLower.includes('consultoria') ||
      atividadeLower.includes('advocacia') ||
      atividadeLower.includes('contabilidade') ||
      atividadeLower.includes('engenharia') ||
      atividadeLower.includes('medicina') ||
      atividadeLower.includes('odontologia')) {
    return 32.0
  }

  // Atividades com 16% de presunção
  if (atividadeLower.includes('transporte') ||
      atividadeLower.includes('construção') ||
      atividadeLower.includes('intermediação')) {
    return 16.0
  }

  // Atividades com 1.6% de presunção
  if (atividadeLower.includes('revenda') ||
      atividadeLower.includes('combustível')) {
    return 1.6
  }

  // Padrão: 8% para atividades em geral
  return 8.0
}

// =====================================================
// ACTIONS DE GERENCIAMENTO
// =====================================================

export async function marcarComoPagoAction(
  calculoId: string,
  dataPagamento: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Validar data de pagamento
    const dataValidacao = z.string().datetime().safeParse(dataPagamento)
    if (!dataValidacao.success) {
      throw new Error('Data de pagamento inválida')
    }

    const { data, error } = await supabase
      .from('calculos_fiscais')
      .update({
        status: 'pago',
        data_pagamento: dataPagamento,
        updated_at: new Date().toISOString()
      })
      .eq('id', calculoId)
      .select()
      .single()

    if (error) {

      throw new Error('Erro ao atualizar status do cálculo')
    }

    // Invalidar cache
    revalidateTag('calculos')
    revalidateTag(`calculos-empresa-${data.empresa_id}`)
    revalidatePath('/calculos')
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    logger.error('Erro ao marcar cálculo como pago', { error, calculoId, dataPagamento })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }
  }
}

export async function excluirCalculoAction(
  calculoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Buscar dados do cálculo antes de excluir (para invalidar cache)
    const { data: calculo } = await supabase
      .from('calculos_fiscais')
      .select('empresa_id, competencia, tipo_calculo')
      .eq('id', calculoId)
      .single()

    const { error } = await supabase
      .from('calculos_fiscais')
      .delete()
      .eq('id', calculoId)

    if (error) {

      throw new Error('Erro ao excluir cálculo')
    }

    // Invalidar cache específico se temos os dados
    if (calculo) {
      if (calculo.tipo_calculo === 'DAS') {
        cacheUtils.invalidateEmpresa(calculo.empresa_id)
      } else if (calculo.tipo_calculo === 'IRPJ') {
        cacheUtils.invalidateEmpresa(calculo.empresa_id)
      }

      revalidateTag('calculos')
      revalidateTag(`calculos-empresa-${calculo.empresa_id}`)
    }

    revalidatePath('/calculos')
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    logger.error('Erro ao excluir cálculo', { error, calculoId })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }
  }
}

export async function recalcularAction(
  calculoId: string
): Promise<{ success: boolean; data?: ResultadoCalculo; error?: string }> {
  try {
    const supabase = createClient()

    // Buscar dados do cálculo original
    const { data: calculoOriginal, error: fetchError } = await supabase
      .from('calculos_fiscais')
      .select('*')
      .eq('id', calculoId)
      .single()

    if (fetchError || !calculoOriginal) {
      throw new Error('Cálculo não encontrado')
    }

    // Invalidar cache antes de recalcular
    if (calculoOriginal.tipo_calculo === 'DAS') {
      cacheUtils.invalidateEmpresa(calculoOriginal.empresa_id)
    } else if (calculoOriginal.tipo_calculo === 'IRPJ') {
      cacheUtils.invalidateEmpresa(calculoOriginal.empresa_id)
    }

    // Recalcular baseado no tipo
    if (calculoOriginal.tipo_calculo === 'DAS') {
      const formData = new FormData()
      formData.append('empresa_id', calculoOriginal.empresa_id)
      formData.append('competencia', calculoOriginal.competencia)
      formData.append('faturamento_bruto', calculoOriginal.faturamento_bruto.toString())
      formData.append('faturamento_12_meses', calculoOriginal.faturamento_12_meses.toString())
      formData.append('anexo_simples', calculoOriginal.anexo_simples || 'I')
      formData.append('deducoes', (calculoOriginal.deducoes || 0).toString())

      // Excluir cálculo antigo
      await supabase.from('calculos_fiscais').delete().eq('id', calculoId)

      // Recalcular
      return await calcularDASAction({ success: true }, formData)

    } else if (calculoOriginal.tipo_calculo === 'IRPJ') {
      const formData = new FormData()
      formData.append('empresa_id', calculoOriginal.empresa_id)
      formData.append('competencia', calculoOriginal.competencia)
      formData.append('receita_bruta', calculoOriginal.faturamento_bruto.toString())
      formData.append('atividade_principal', 'Atividade Geral') // Valor padrão
      formData.append('deducoes', (calculoOriginal.deducoes || 0).toString())

      // Excluir cálculo antigo
      await supabase.from('calculos_fiscais').delete().eq('id', calculoId)

      // Recalcular
      return await calcularIRPJAction({ success: true }, formData)
    }

    throw new Error('Tipo de cálculo não suportado para recálculo')

  } catch (error) {
    logger.error('Erro no recálculo', { error, calculoId })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no recálculo'
    }
  }
}

// =====================================================
// TABELAS MEI 2025
// =====================================================

const MEI_VALUES_2025 = {
  comercio: {
    valor: 66.60,
    inss: 61.60,
    icms: 5.00,
    iss: 0.00
  },
  servicos: {
    valor: 70.60,
    inss: 61.60,
    icms: 0.00,
    iss: 9.00
  },
  comercio_servicos: {
    valor: 71.60,
    inss: 61.60,
    icms: 5.00,
    iss: 5.00
  }
}

const MEI_LIMITE_ANUAL = 81000

// =====================================================
// ACTION: CALCULAR MEI
// =====================================================

export async function calcularMEIAction(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Converter FormData para objeto
    const rawData = {
      empresa_id: formData.get('empresa_id') as string,
      competencia: formData.get('competencia') as string,
      receita_bruta: parseFloat(formData.get('receita_bruta') as string || '0'),
      atividade: formData.get('atividade') as string
    }

    // Validar dados
    const validatedData = MEIInputSchema.parse(rawData)

    const supabase = createClient()

    // Obter dados do MEI para atividade
    const meiData = MEI_VALUES_2025[validatedData.atividade as keyof typeof MEI_VALUES_2025]
    if (!meiData) {
      throw new Error('Atividade MEI não encontrada')
    }

    // Verificar limite anual
    const receitaAnualProjetada = validatedData.receita_bruta * 12
    const limitesExcedidos = receitaAnualProjetada > MEI_LIMITE_ANUAL

    // Calcular data de vencimento (dia 20 do mês seguinte)
    const [ano, mes] = validatedData.competencia.split('-').map(Number)

    if (!ano || !mes) {
      throw new Error('Competência inválida')
    }

    const proximoMes = mes === 12 ? 1 : mes + 1
    const proximoAno = mes === 12 ? ano + 1 : ano
    const dataVencimento = new Date(proximoAno, proximoMes - 1, 20)

    // Preparar resultado
    const resultado = {
      tipo_calculo: 'MEI',
      competencia: validatedData.competencia,
      atividade: validatedData.atividade,
      receita_bruta: validatedData.receita_bruta,
      valor_mensal: meiData.valor,
      limites_excedidos: limitesExcedidos,
      data_vencimento: dataVencimento.toISOString(),
      detalhamento: {
        inss: meiData.inss,
        icms: meiData.icms,
        iss: meiData.iss
      },
      observacoes: limitesExcedidos
        ? 'ATENÇÃO: Limite anual MEI excedido. Considere migrar para outro regime tributário.'
        : 'Cálculo dentro dos limites MEI.'
    }

    // Salvar no banco de dados
    const { data: calculo, error: dbError } = await supabase
      .from('calculos_fiscais')
      .insert({
        empresa_id: validatedData.empresa_id,
        tipo_calculo: 'MEI',
        competencia: validatedData.competencia,
        valor_total: meiData.valor,
        base_calculo: validatedData.receita_bruta,
        aliquota_efetiva: 0, // MEI é valor fixo
        data_vencimento: dataVencimento.toISOString(),
        detalhamento: resultado.detalhamento,
        observacoes: resultado.observacoes,
        status: 'pendente',
        receita_bruta: validatedData.receita_bruta,
        atividade_principal: validatedData.atividade,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Erro ao salvar cálculo MEI', { error: dbError, data: validatedData })
      throw new Error('Erro ao salvar cálculo no banco de dados')
    }

    // Invalidar cache
    revalidateTag('calculos')
    revalidateTag(`calculos-empresa-${validatedData.empresa_id}`)
    revalidatePath('/calculos')
    revalidatePath('/dashboard')

    // Log de sucesso
    logger.info('Cálculo MEI realizado com sucesso', {
      empresaId: validatedData.empresa_id,
      competencia: validatedData.competencia,
      atividade: validatedData.atividade,
      valor: meiData.valor,
      limitesExcedidos
    })

    return {
      success: true,
      data: resultado
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ')
      logger.error('Erro de validação no cálculo MEI', { errors: error.issues })

      return {
        success: false,
        error: `Dados inválidos: ${fieldErrors}`
      }
    }

    logger.error('Erro no cálculo MEI', { error })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno no cálculo MEI'
    }
  }
}
