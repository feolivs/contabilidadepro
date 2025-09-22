/**
 * Testes unitários para schemas de validação de documentos
 * Foco em validações fiscais brasileiras
 */

import { z } from 'zod'

// Importar os validadores do utils
import { validateCNPJ, validateCPF } from '../utils'
// Usar as funções do utils.ts

// Schemas para teste
const CNPJSchema = z.string().refine(validateCNPJ, {
  message: 'CNPJ inválido'
})

const CPFSchema = z.string().refine(validateCPF, {
  message: 'CPF inválido'
})

const EmpresaSchema = z.object({
  cnpj: CNPJSchema,
  razao_social: z.string().min(1, 'Razão social é obrigatória'),
  nome_fantasia: z.string().optional(),
  regime_tributario: z.enum(['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']),
  atividade_principal: z.string().min(1, 'Atividade principal é obrigatória'),
})

const ClienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  documento: z.string().refine((doc) => {
    const clean = doc.replace(/[^\d]/g, '')
    return clean.length === 11 ? validateCPF(doc) : validateCNPJ(doc)
  }, 'Documento inválido (CPF ou CNPJ)'),
  email: z.string().email('Email inválido').optional(),
  telefone: z.string().optional(),
})

describe('Validação de CNPJ Schema', () => {
  test('deve validar CNPJs corretos', () => {
    const cnpjsValidos = [
      '11.222.333/0001-81',
      '11222333000181',
      '11.444.777/0001-61',
    ]

    cnpjsValidos.forEach(cnpj => {
      expect(() => CNPJSchema.parse(cnpj)).not.toThrow()
    })
  })

  test('deve rejeitar CNPJs inválidos', () => {
    const cnpjsInvalidos = [
      '11111111111111',
      '11.222.333/0001-80',
      '123',
      '',
    ]

    cnpjsInvalidos.forEach(cnpj => {
      expect(() => CNPJSchema.parse(cnpj)).toThrow('CNPJ inválido')
    })
  })
})

describe('Validação de CPF Schema', () => {
  test('deve validar CPFs corretos', () => {
    const cpfsValidos = [
      '111.444.777-35',
      '11144477735',
      '123.456.789-09',
    ]

    cpfsValidos.forEach(cpf => {
      expect(() => CPFSchema.parse(cpf)).not.toThrow()
    })
  })

  test('deve rejeitar CPFs inválidos', () => {
    const cpfsInvalidos = [
      '11111111111',
      '111.444.777-34',
      '123',
      '',
    ]

    cpfsInvalidos.forEach(cpf => {
      expect(() => CPFSchema.parse(cpf)).toThrow('CPF inválido')
    })
  })
})

describe('Schema de Empresa', () => {
  const empresaValida = {
    cnpj: '11.222.333/0001-81',
    razao_social: 'Empresa Teste LTDA',
    nome_fantasia: 'Teste',
    regime_tributario: 'Simples Nacional' as const,
    atividade_principal: 'Consultoria em TI',
  }

  test('deve validar empresa com dados corretos', () => {
    expect(() => EmpresaSchema.parse(empresaValida)).not.toThrow()
  })

  test('deve rejeitar empresa com CNPJ inválido', () => {
    const empresaInvalida = {
      ...empresaValida,
      cnpj: '11111111111111'
    }

    expect(() => EmpresaSchema.parse(empresaInvalida)).toThrow()
  })

  test('deve rejeitar empresa sem razão social', () => {
    const empresaInvalida = {
      ...empresaValida,
      razao_social: ''
    }

    expect(() => EmpresaSchema.parse(empresaInvalida)).toThrow('Razão social é obrigatória')
  })

  test('deve rejeitar regime tributário inválido', () => {
    const empresaInvalida = {
      ...empresaValida,
      regime_tributario: 'Regime Inválido' as any
    }

    expect(() => EmpresaSchema.parse(empresaInvalida)).toThrow()
  })

  test('deve aceitar nome fantasia opcional', () => {
    const empresaSemFantasia = {
      ...empresaValida,
      nome_fantasia: undefined
    }

    expect(() => EmpresaSchema.parse(empresaSemFantasia)).not.toThrow()
  })
})

describe('Schema de Cliente', () => {
  test('deve validar cliente com CPF', () => {
    const clienteCPF = {
      nome: 'João Silva',
      documento: '111.444.777-35',
      email: 'joao@example.com',
      telefone: '(11) 99999-9999'
    }

    expect(() => ClienteSchema.parse(clienteCPF)).not.toThrow()
  })

  test('deve validar cliente com CNPJ', () => {
    const clienteCNPJ = {
      nome: 'Empresa Cliente LTDA',
      documento: '11.222.333/0001-81',
      email: 'contato@empresa.com'
    }

    expect(() => ClienteSchema.parse(clienteCNPJ)).not.toThrow()
  })

  test('deve rejeitar documento inválido', () => {
    const clienteInvalido = {
      nome: 'Cliente Teste',
      documento: '12345678901',  // CPF inválido
    }

    expect(() => ClienteSchema.parse(clienteInvalido)).toThrow('Documento inválido')
  })

  test('deve rejeitar email inválido', () => {
    const clienteInvalido = {
      nome: 'Cliente Teste',
      documento: '111.444.777-35',
      email: 'email-invalido'
    }

    expect(() => ClienteSchema.parse(clienteInvalido)).toThrow('Email inválido')
  })

  test('deve aceitar campos opcionais vazios', () => {
    const clienteMinimo = {
      nome: 'Cliente Mínimo',
      documento: '111.444.777-35'
    }

    expect(() => ClienteSchema.parse(clienteMinimo)).not.toThrow()
  })
})
