/**
 * Testes unitários para ações de cálculo fiscal
 * Foco em precisão dos cálculos DAS e IRPJ
 */

// Mock das tabelas do Simples Nacional 2024
const TABELAS_SIMPLES_2024 = {
  'I': [
    { ate: 180000, aliquota: 4.0, deducao: 0 },
    { ate: 360000, aliquota: 7.3, deducao: 5940 },
    { ate: 720000, aliquota: 9.5, deducao: 13860 },
    { ate: 1800000, aliquota: 10.7, deducao: 22500 },
    { ate: 3600000, aliquota: 14.3, deducao: 87300 },
    { ate: 4800000, aliquota: 19.0, deducao: 378000 },
  ],
  'II': [
    { ate: 180000, aliquota: 4.5, deducao: 0 },
    { ate: 360000, aliquota: 7.8, deducao: 5940 },
    { ate: 720000, aliquota: 10.0, deducao: 13860 },
    { ate: 1800000, aliquota: 11.2, deducao: 22500 },
    { ate: 3600000, aliquota: 14.8, deducao: 87300 },
    { ate: 4800000, aliquota: 30.0, deducao: 378000 },
  ]
}

// Mock da função de cálculo DAS
function calcularDAS(dados: {
  faturamento_12_meses: number
  faturamento_bruto: number
  anexo_simples: keyof typeof TABELAS_SIMPLES_2024
  competencia: string
}) {
  const { faturamento_12_meses, faturamento_bruto, anexo_simples, competencia } = dados

  // Validações
  if (faturamento_12_meses <= 0) {
    throw new Error('Faturamento dos últimos 12 meses deve ser maior que zero')
  }

  if (faturamento_12_meses > 4800000) {
    throw new Error('Faturamento excede limite do Simples Nacional (R$ 4.800.000)')
  }

  if (faturamento_bruto <= 0) {
    throw new Error('Faturamento bruto deve ser maior que zero')
  }

  // Buscar tabela do anexo
  const tabela = TABELAS_SIMPLES_2024[anexo_simples]
  if (!tabela) {
    throw new Error(`Anexo ${anexo_simples} não encontrado`)
  }

  const faixa = tabela.find(f => faturamento_12_meses <= f.ate)
  if (!faixa) {
    throw new Error('Faturamento excede limite do Simples Nacional')
  }

  // Calcular alíquota efetiva
  const aliquotaEfetiva = faturamento_12_meses > 0 
    ? Math.max(0, ((faturamento_12_meses * faixa.aliquota / 100) - faixa.deducao) / faturamento_12_meses * 100)
    : faixa.aliquota

  // Calcular valor do imposto
  const valorImposto = faturamento_bruto * aliquotaEfetiva / 100

  // Data de vencimento: dia 20 do mês seguinte
  const [ano, mes] = competencia.split('-')
  const proximoMes = new Date(parseInt(ano!), parseInt(mes!) - 1 + 1, 20)
  const dataVencimento = proximoMes.toISOString().split('T')[0]!

  return {
    valor_imposto: Math.round(valorImposto * 100) / 100,
    aliquota_efetiva: Math.round(aliquotaEfetiva * 10000) / 10000,
    data_vencimento: dataVencimento,
    base_calculo: faturamento_bruto,
    faixa_utilizada: faixa,
    detalhamento: {
      faturamento_12_meses,
      anexo_utilizado: anexo_simples,
      aliquota_nominal: faixa.aliquota,
      deducao_aplicada: faixa.deducao
    }
  }
}

// Mock da função de cálculo IRPJ
function calcularIRPJ(dados: {
  receita_bruta: number
  deducoes: number
  atividade_principal: string
  competencia: string
}) {
  const { receita_bruta, deducoes, atividade_principal, competencia } = dados

  // Validações
  if (receita_bruta <= 0) {
    throw new Error('Receita bruta deve ser maior que zero')
  }

  if (deducoes < 0) {
    throw new Error('Deduções não podem ser negativas')
  }

  // Determinar percentual de presunção baseado na atividade
  const percentualPresuncao = atividade_principal.includes('serviços') ? 32 : 8

  // Calcular base de cálculo
  const baseCalculo = (receita_bruta - deducoes) * (percentualPresuncao / 100)

  // Calcular IRPJ (15% + 10% adicional sobre o que exceder R$ 20.000/mês)
  const irpjNormal = baseCalculo * 0.15
  const irpjAdicional = Math.max(0, (baseCalculo - 20000) * 0.10)
  const totalIRPJ = irpjNormal + irpjAdicional

  // Data de vencimento: último dia útil do mês seguinte ao trimestre
  const [ano, mes] = competencia.split('-')
  const ultimoDia = new Date(parseInt(ano!), parseInt(mes!), 0)
  const dataVencimento = ultimoDia.toISOString().split('T')[0]!

  return {
    valor_total: Math.round(totalIRPJ * 100) / 100,
    base_calculo: Math.round(baseCalculo * 100) / 100,
    irpj_normal: Math.round(irpjNormal * 100) / 100,
    irpj_adicional: Math.round(irpjAdicional * 100) / 100,
    percentual_presuncao: percentualPresuncao,
    data_vencimento: dataVencimento,
    detalhamento: {
      receita_bruta,
      deducoes,
      receita_liquida: receita_bruta - deducoes,
      atividade_principal
    }
  }
}

describe('Cálculo DAS - Simples Nacional', () => {
  describe('Validações de entrada', () => {
    test('deve rejeitar faturamento 12 meses zero ou negativo', () => {
      expect(() => calcularDAS({
        faturamento_12_meses: 0,
        faturamento_bruto: 10000,
        anexo_simples: 'I',
        competencia: '2024-01'
      })).toThrow('Faturamento dos últimos 12 meses deve ser maior que zero')
    })

    test('deve rejeitar faturamento acima do limite do Simples Nacional', () => {
      expect(() => calcularDAS({
        faturamento_12_meses: 5000000,
        faturamento_bruto: 10000,
        anexo_simples: 'I',
        competencia: '2024-01'
      })).toThrow('Faturamento excede limite do Simples Nacional (R$ 4.800.000)')
    })

    test('deve rejeitar faturamento bruto zero ou negativo', () => {
      expect(() => calcularDAS({
        faturamento_12_meses: 100000,
        faturamento_bruto: 0,
        anexo_simples: 'I',
        competencia: '2024-01'
      })).toThrow('Faturamento bruto deve ser maior que zero')
    })
  })

  describe('Cálculos Anexo I', () => {
    test('deve calcular corretamente para primeira faixa (até R$ 180.000)', () => {
      const resultado = calcularDAS({
        faturamento_12_meses: 100000,
        faturamento_bruto: 10000,
        anexo_simples: 'I',
        competencia: '2024-01'
      })

      expect(resultado.aliquota_efetiva).toBe(4.0)
      expect(resultado.valor_imposto).toBe(400) // 10000 * 4% = 400
      expect(resultado.faixa_utilizada.aliquota).toBe(4.0)
      expect(resultado.faixa_utilizada.deducao).toBe(0)
    })

    test('deve calcular corretamente para segunda faixa (R$ 180.001 a R$ 360.000)', () => {
      const resultado = calcularDAS({
        faturamento_12_meses: 300000,
        faturamento_bruto: 25000,
        anexo_simples: 'I',
        competencia: '2024-01'
      })

      // Alíquota efetiva = ((300000 * 7.3% - 5940) / 300000) * 100 = 5.32%
      const aliquotaEsperada = ((300000 * 0.073 - 5940) / 300000) * 100
      expect(resultado.aliquota_efetiva).toBeCloseTo(aliquotaEsperada, 4)
      
      const valorEsperado = 25000 * (aliquotaEsperada / 100)
      expect(resultado.valor_imposto).toBeCloseTo(valorEsperado, 2)
    })

    test('deve calcular corretamente para última faixa (R$ 3.600.001 a R$ 4.800.000)', () => {
      const resultado = calcularDAS({
        faturamento_12_meses: 4500000,
        faturamento_bruto: 400000,
        anexo_simples: 'I',
        competencia: '2024-01'
      })

      // Alíquota efetiva = ((4500000 * 19% - 378000) / 4500000) * 100 = 10.6%
      const aliquotaEsperada = ((4500000 * 0.19 - 378000) / 4500000) * 100
      expect(resultado.aliquota_efetiva).toBeCloseTo(aliquotaEsperada, 4)
    })
  })

  describe('Cálculos Anexo II', () => {
    test('deve calcular corretamente para Anexo II primeira faixa', () => {
      const resultado = calcularDAS({
        faturamento_12_meses: 150000,
        faturamento_bruto: 12000,
        anexo_simples: 'II',
        competencia: '2024-01'
      })

      expect(resultado.aliquota_efetiva).toBe(4.5)
      expect(resultado.valor_imposto).toBe(540) // 12000 * 4.5% = 540
    })
  })

  describe('Data de vencimento', () => {
    test('deve calcular data de vencimento corretamente', () => {
      const resultado = calcularDAS({
        faturamento_12_meses: 100000,
        faturamento_bruto: 10000,
        anexo_simples: 'I',
        competencia: '2024-01'
      })

      expect(resultado.data_vencimento).toBe('2024-02-20')
    })

    test('deve calcular data de vencimento para dezembro', () => {
      const resultado = calcularDAS({
        faturamento_12_meses: 100000,
        faturamento_bruto: 10000,
        anexo_simples: 'I',
        competencia: '2024-12'
      })

      expect(resultado.data_vencimento).toBe('2025-01-20')
    })
  })

  describe('Precisão dos cálculos', () => {
    test('deve manter precisão de 2 casas decimais no valor do imposto', () => {
      const resultado = calcularDAS({
        faturamento_12_meses: 100000,
        faturamento_bruto: 10001.99,
        anexo_simples: 'I',
        competencia: '2024-01'
      })

      // Valor esperado: 10001.99 * 4% = 400.0796, arredondado para 400.08
      expect(resultado.valor_imposto).toBe(400.08)
    })

    test('deve manter precisão de 4 casas decimais na alíquota efetiva', () => {
      const resultado = calcularDAS({
        faturamento_12_meses: 250000,
        faturamento_bruto: 20000,
        anexo_simples: 'I',
        competencia: '2024-01'
      })

      // Verificar se a alíquota tem no máximo 4 casas decimais
      const aliquotaStr = resultado.aliquota_efetiva.toString()
      const decimais = aliquotaStr.split('.')[1]
      if (decimais) {
        expect(decimais.length).toBeLessThanOrEqual(4)
      }
    })
  })
})

describe('Cálculo IRPJ - Lucro Presumido', () => {
  describe('Validações de entrada', () => {
    test('deve rejeitar receita bruta zero ou negativa', () => {
      expect(() => calcularIRPJ({
        receita_bruta: 0,
        deducoes: 0,
        atividade_principal: 'comércio',
        competencia: '2024-01'
      })).toThrow('Receita bruta deve ser maior que zero')
    })

    test('deve rejeitar deduções negativas', () => {
      expect(() => calcularIRPJ({
        receita_bruta: 100000,
        deducoes: -1000,
        atividade_principal: 'comércio',
        competencia: '2024-01'
      })).toThrow('Deduções não podem ser negativas')
    })
  })

  describe('Percentuais de presunção', () => {
    test('deve aplicar 8% para atividades de comércio', () => {
      const resultado = calcularIRPJ({
        receita_bruta: 100000,
        deducoes: 0,
        atividade_principal: 'comércio',
        competencia: '2024-01'
      })

      expect(resultado.percentual_presuncao).toBe(8)
      expect(resultado.base_calculo).toBe(8000) // 100000 * 8%
    })

    test('deve aplicar 32% para atividades de serviços', () => {
      const resultado = calcularIRPJ({
        receita_bruta: 100000,
        deducoes: 0,
        atividade_principal: 'serviços de consultoria',
        competencia: '2024-01'
      })

      expect(resultado.percentual_presuncao).toBe(32)
      expect(resultado.base_calculo).toBe(32000) // 100000 * 32%
    })
  })

  describe('Cálculo do IRPJ', () => {
    test('deve calcular IRPJ sem adicional (base até R$ 20.000)', () => {
      const resultado = calcularIRPJ({
        receita_bruta: 100000,
        deducoes: 0,
        atividade_principal: 'comércio',
        competencia: '2024-01'
      })

      // Base: 100000 * 8% = 8000
      // IRPJ normal: 8000 * 15% = 1200
      // IRPJ adicional: 0 (base < 20000)
      expect(resultado.base_calculo).toBe(8000)
      expect(resultado.irpj_normal).toBe(1200)
      expect(resultado.irpj_adicional).toBe(0)
      expect(resultado.valor_total).toBe(1200)
    })

    test('deve calcular IRPJ com adicional (base acima de R$ 20.000)', () => {
      const resultado = calcularIRPJ({
        receita_bruta: 300000,
        deducoes: 0,
        atividade_principal: 'serviços',
        competencia: '2024-01'
      })

      // Base: 300000 * 32% = 96000
      // IRPJ normal: 96000 * 15% = 14400
      // IRPJ adicional: (96000 - 20000) * 10% = 7600
      // Total: 14400 + 7600 = 22000
      expect(resultado.base_calculo).toBe(96000)
      expect(resultado.irpj_normal).toBe(14400)
      expect(resultado.irpj_adicional).toBe(7600)
      expect(resultado.valor_total).toBe(22000)
    })

    test('deve aplicar deduções corretamente', () => {
      const resultado = calcularIRPJ({
        receita_bruta: 100000,
        deducoes: 10000,
        atividade_principal: 'comércio',
        competencia: '2024-01'
      })

      // Base: (100000 - 10000) * 8% = 7200
      // IRPJ: 7200 * 15% = 1080
      expect(resultado.base_calculo).toBe(7200)
      expect(resultado.valor_total).toBe(1080)
      expect(resultado.detalhamento.receita_liquida).toBe(90000)
    })
  })

  describe('Precisão dos cálculos', () => {
    test('deve manter precisão de 2 casas decimais', () => {
      const resultado = calcularIRPJ({
        receita_bruta: 100001.99,
        deducoes: 1.99,
        atividade_principal: 'comércio',
        competencia: '2024-01'
      })

      // Verificar se todos os valores monetários têm no máximo 2 casas decimais
      expect(resultado.valor_total).toBe(Math.round(resultado.valor_total * 100) / 100)
      expect(resultado.base_calculo).toBe(Math.round(resultado.base_calculo * 100) / 100)
      expect(resultado.irpj_normal).toBe(Math.round(resultado.irpj_normal * 100) / 100)
      expect(resultado.irpj_adicional).toBe(Math.round(resultado.irpj_adicional * 100) / 100)
    })
  })
})
