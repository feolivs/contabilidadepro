/**
 * Testes unitários para Processador de Cálculos Fiscais
 * Foco em validação e processamento de jobs de cálculo
 */

import { CalculoFiscalProcessor, CalculoFiscalJob, CalculoFiscalResult } from './calculo-fiscal-processor'

// Mock simples do Supabase para este teste
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}

// Mock local do logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}

describe('CalculoFiscalProcessor', () => {
  let processor: CalculoFiscalProcessor

  beforeEach(() => {
    processor = new CalculoFiscalProcessor()
    jest.clearAllMocks()
  })

  describe('validate', () => {
    const jobValido: CalculoFiscalJob = {
      type: 'calculo_fiscal',
      empresaId: 'empresa-123',
      tipoCalculo: 'DAS',
      periodoApuracao: '2024-01',
      dadosEntrada: {
        receitaBruta: 100000,
        regimeTributario: 'Simples Nacional',
        anexoSimples: 'I',
      },
      timestamp: '2024-01-15T10:00:00Z'
    }

    test('deve validar job com dados corretos', () => {
      expect(processor.validate(jobValido)).toBe(true)
    })

    test('deve invalidar job sem empresaId', () => {
      const jobInvalido = { ...jobValido, empresaId: '' }
      expect(processor.validate(jobInvalido)).toBe(false)
    })

    test('deve invalidar job sem tipoCalculo', () => {
      const jobInvalido = { ...jobValido, tipoCalculo: '' as any }
      expect(processor.validate(jobInvalido)).toBe(false)
    })

    test('deve invalidar job sem periodoApuracao', () => {
      const jobInvalido = { ...jobValido, periodoApuracao: '' }
      expect(processor.validate(jobInvalido)).toBe(false)
    })

    test('deve invalidar job sem receitaBruta', () => {
      const jobInvalido = {
        ...jobValido,
        dadosEntrada: { ...jobValido.dadosEntrada, receitaBruta: undefined as any }
      }
      expect(processor.validate(jobInvalido)).toBe(false)
    })

    test('deve invalidar job sem regimeTributario', () => {
      const jobInvalido = {
        ...jobValido,
        dadosEntrada: { ...jobValido.dadosEntrada, regimeTributario: '' }
      }
      expect(processor.validate(jobInvalido)).toBe(false)
    })

    test('deve invalidar job com dadosEntrada nulo', () => {
      const jobInvalido = { ...jobValido, dadosEntrada: null as any }
      expect(processor.validate(jobInvalido)).toBe(false)
    })
  })

  describe('process', () => {
    test('deve processar cálculo DAS corretamente', async () => {
      const jobDAS: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: 'empresa-123',
        tipoCalculo: 'DAS',
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: 100000,
          regimeTributario: 'Simples Nacional',
          anexoSimples: 'I',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      // Mock do método calcularDAS
      const mockCalcularDAS = jest.spyOn(processor as any, 'calcularDAS')
      const resultadoEsperado: CalculoFiscalResult = {
        valorImposto: 4000,
        aliquotaEfetiva: 4.0,
        dataVencimento: '2024-02-20',
        detalhesCalculo: {
          baseCalculo: 100000,
          aliquota: 4.0,
          deducoes: 0,
          valorFinal: 4000
        }
      }
      mockCalcularDAS.mockResolvedValue(resultadoEsperado)

      const resultado = await processor.process(jobDAS)

      expect(mockCalcularDAS).toHaveBeenCalledWith(jobDAS)
      expect(resultado).toEqual(resultadoEsperado)
    })

    test('deve processar cálculo IRPJ corretamente', async () => {
      const jobIRPJ: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: 'empresa-123',
        tipoCalculo: 'IRPJ',
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: 200000,
          regimeTributario: 'Lucro Presumido',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      // Mock do método calcularIRPJ
      const mockCalcularIRPJ = jest.spyOn(processor as any, 'calcularIRPJ')
      const resultadoEsperado: CalculoFiscalResult = {
        valorImposto: 2400,
        aliquotaEfetiva: 15.0,
        dataVencimento: '2024-01-31',
        detalhesCalculo: {
          baseCalculo: 16000,
          aliquota: 15.0,
          deducoes: 0,
          valorFinal: 2400
        }
      }
      mockCalcularIRPJ.mockResolvedValue(resultadoEsperado)

      const resultado = await processor.process(jobIRPJ)

      expect(mockCalcularIRPJ).toHaveBeenCalledWith(jobIRPJ)
      expect(resultado).toEqual(resultadoEsperado)
    })

    test('deve processar cálculo CSLL corretamente', async () => {
      const jobCSLL: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: 'empresa-123',
        tipoCalculo: 'CSLL',
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: 200000,
          regimeTributario: 'Lucro Presumido',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      // Mock do método calcularCSLL
      const mockCalcularCSLL = jest.spyOn(processor as any, 'calcularCSLL')
      const resultadoEsperado: CalculoFiscalResult = {
        valorImposto: 1440,
        aliquotaEfetiva: 9.0,
        dataVencimento: '2024-01-31',
        detalhesCalculo: {
          baseCalculo: 16000,
          aliquota: 9.0,
          deducoes: 0,
          valorFinal: 1440
        }
      }
      mockCalcularCSLL.mockResolvedValue(resultadoEsperado)

      const resultado = await processor.process(jobCSLL)

      expect(mockCalcularCSLL).toHaveBeenCalledWith(jobCSLL)
      expect(resultado).toEqual(resultadoEsperado)
    })

    test('deve rejeitar tipo de cálculo não suportado', async () => {
      const jobInvalido: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: 'empresa-123',
        tipoCalculo: 'TIPO_INEXISTENTE' as any,
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: 100000,
          regimeTributario: 'Simples Nacional',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      await expect(processor.process(jobInvalido))
        .rejects
        .toThrow('Tipo de cálculo não suportado: TIPO_INEXISTENTE')
    })

    test('deve propagar erros de cálculo', async () => {
      const jobDAS: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: 'empresa-123',
        tipoCalculo: 'DAS',
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: 100000,
          regimeTributario: 'Simples Nacional',
          anexoSimples: 'I',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      // Mock do método calcularDAS para lançar erro
      const mockCalcularDAS = jest.spyOn(processor as any, 'calcularDAS')
      const erroEsperado = new Error('Erro no cálculo DAS')
      mockCalcularDAS.mockRejectedValue(erroEsperado)

      await expect(processor.process(jobDAS))
        .rejects
        .toThrow('Erro no cálculo DAS')
    })
  })

  describe('Integração com logging', () => {
    test('deve fazer log do início do processamento', async () => {
      const { logger } = require('@/lib/simple-logger')
      
      const job: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: 'empresa-123',
        tipoCalculo: 'DAS',
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: 100000,
          regimeTributario: 'Simples Nacional',
          anexoSimples: 'I',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      // Mock do método calcularDAS
      const mockCalcularDAS = jest.spyOn(processor as any, 'calcularDAS')
      mockCalcularDAS.mockResolvedValue({
        valorImposto: 4000,
        aliquotaEfetiva: 4.0,
        dataVencimento: '2024-02-20',
        detalhesCalculo: {
          baseCalculo: 100000,
          aliquota: 4.0,
          deducoes: 0,
          valorFinal: 4000
        }
      })

      await processor.process(job)

      expect(logger.info).toHaveBeenCalledWith('Iniciando cálculo fiscal', {
        empresaId: 'empresa-123',
        tipoCalculo: 'DAS',
        periodoApuracao: '2024-01'
      })
    })

    test('deve fazer log de erros', async () => {
      const { logger } = require('@/lib/simple-logger')
      
      const job: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: 'empresa-123',
        tipoCalculo: 'DAS',
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: 100000,
          regimeTributario: 'Simples Nacional',
          anexoSimples: 'I',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      // Mock do método calcularDAS para lançar erro
      const mockCalcularDAS = jest.spyOn(processor as any, 'calcularDAS')
      const erro = new Error('Erro de teste')
      mockCalcularDAS.mockRejectedValue(erro)

      try {
        await processor.process(job)
      } catch (e) {
        // Esperado
      }

      expect(logger.error).toHaveBeenCalledWith('Erro no cálculo fiscal', {
        empresaId: 'empresa-123',
        tipoCalculo: 'DAS',
        error: erro
      })
    })
  })

  describe('Casos edge', () => {
    test('deve lidar com dados de entrada nulos', () => {
      const jobInvalido = {
        type: 'calculo_fiscal' as const,
        empresaId: 'empresa-123',
        tipoCalculo: 'DAS' as const,
        periodoApuracao: '2024-01',
        dadosEntrada: null as any, // Explicitamente testando validação
        timestamp: '2024-01-15T10:00:00Z'
      }

      expect(processor.validate(jobInvalido)).toBe(false)
    })

    test('deve lidar com valores numéricos inválidos', () => {
      const jobInvalido: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: 'empresa-123',
        tipoCalculo: 'DAS',
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: NaN,
          regimeTributario: 'Simples Nacional',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      expect(processor.validate(jobInvalido)).toBe(false)
    })

    test('deve lidar com strings vazias', () => {
      const jobInvalido: CalculoFiscalJob = {
        type: 'calculo_fiscal',
        empresaId: '',
        tipoCalculo: 'DAS',
        periodoApuracao: '2024-01',
        dadosEntrada: {
          receitaBruta: 100000,
          regimeTributario: '',
        },
        timestamp: '2024-01-15T10:00:00Z'
      }

      expect(processor.validate(jobInvalido)).toBe(false)
    })
  })
})
