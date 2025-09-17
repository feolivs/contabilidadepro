import { z } from 'zod'

// Validador de CNPJ
const cnpjValidator = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
  
  if (cleanCNPJ.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false // Todos iguais
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  
  const digits = cleanCNPJ.split('').map(Number)
  
  // Primeiro dígito
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += (digits[i] || 0) * (weights1[i] || 0)
  }
  const remainder1 = sum % 11
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1
  
  // Segundo dígito
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += (digits[i] || 0) * (weights2[i] || 0)
  }
  const remainder2 = sum % 11
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2
  
  return digits[12] === digit1 && digits[13] === digit2
}

// Validador de CPF
const cpfValidator = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '')
  
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false // Todos iguais
  
  const digits = cleanCPF.split('').map(Number)
  
  // Primeiro dígito
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += (digits[i] || 0) * (10 - i)
  }
  const remainder1 = sum % 11
  const digit1 = remainder1 < 2 ? 0 : 11 - remainder1
  
  // Segundo dígito
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += (digits[i] || 0) * (11 - i)
  }
  const remainder2 = sum % 11
  const digit2 = remainder2 < 2 ? 0 : 11 - remainder2
  
  return digits[9] === digit1 && digits[10] === digit2
}

// Validador de chave NFe (44 dígitos)
const nfeKeyValidator = (key: string): boolean => {
  const cleanKey = key.replace(/[^\d]/g, '')
  if (cleanKey.length !== 44) return false
  
  // Validações básicas da estrutura
  const uf = parseInt(cleanKey.substring(0, 2))
  const ano = parseInt(cleanKey.substring(2, 4))
  const mes = parseInt(cleanKey.substring(4, 6))
  
  return uf >= 11 && uf <= 53 && // UF válida
         ano >= 8 && ano <= 99 && // Ano 2008-2099
         mes >= 1 && mes <= 12    // Mês válido
}

// Schema base para documentos
const BaseDocumentSchema = z.object({
  tipo_documento: z.enum(['NFe', 'NFCe', 'NFSe', 'CTe', 'Recibo', 'Contrato', 'Boleto', 'Extrato', 'Pró-labore', 'Outro']),
  numero_documento: z.string().optional(),
  data_emissao: z.string().datetime().optional(),
  data_vencimento: z.string().datetime().optional(),
  valor_total: z.number().min(0).optional(),
  valor_liquido: z.number().min(0).optional(),
  empresa_emitente: z.string().optional(),
  empresa_destinatario: z.string().optional(),
  cnpj_emitente: z.string().refine(cnpj => !cnpj || cnpjValidator(cnpj), {
    message: "CNPJ emitente inválido"
  }).optional(),
  cnpj_destinatario: z.string().refine(cnpj => !cnpj || cnpjValidator(cnpj), {
    message: "CNPJ destinatário inválido"
  }).optional(),
  descricao: z.string().optional(),
  observacoes: z.string().optional(),
  confidence: z.number().min(0).max(1)
})

// Schema específico para NFe
export const NFESchema = BaseDocumentSchema.extend({
  tipo_documento: z.literal('NFe'),
  serie: z.string().optional(),
  chave_acesso: z.string().refine(key => !key || nfeKeyValidator(key), {
    message: "Chave de acesso NFe inválida (deve ter 44 dígitos)"
  }).optional(),
  inscricao_estadual: z.string().optional(),
  natureza_operacao: z.string().optional(),
  cfop: z.string().regex(/^\d{4}$/, "CFOP deve ter 4 dígitos").optional(),
  impostos: z.object({
    icms: z.number().min(0).optional(),
    ipi: z.number().min(0).optional(),
    pis: z.number().min(0).optional(),
    cofins: z.number().min(0).optional()
  }).optional()
}).refine(data => {
  // Validação cruzada: se tem chave de acesso, deve ter número e série
  if (data.chave_acesso && (!data.numero_documento || !data.serie)) {
    return false
  }
  return true
}, {
  message: "NFe com chave de acesso deve ter número e série"
})

// Schema específico para Pró-labore
export const ProlaboreSchema = BaseDocumentSchema.extend({
  tipo_documento: z.literal('Pró-labore'),
  beneficiario: z.string().min(1, "Beneficiário é obrigatório para pró-labore").optional(),
  cpf_beneficiario: z.string().refine(cpf => !cpf || cpfValidator(cpf), {
    message: "CPF do beneficiário inválido"
  }).optional(),
  cargo: z.enum(['Administrador', 'Diretor', 'Sócio', 'Sócio-Administrador']).optional(),
  periodo_referencia: z.string().regex(/^\d{2}\/\d{4}$/, "Período deve estar no formato MM/YYYY").optional(),
  descontos: z.object({
    inss: z.number().min(0).optional(),
    irrf: z.number().min(0).optional(),
    outros: z.number().min(0).optional()
  }).optional()
}).refine(data => {
  // Validação: valor líquido deve ser menor que valor total
  if (data.valor_total && data.valor_liquido && data.valor_liquido > data.valor_total) {
    return false
  }
  return true
}, {
  message: "Valor líquido não pode ser maior que valor total"
})

// Schema específico para Recibo
export const ReciboSchema = BaseDocumentSchema.extend({
  tipo_documento: z.literal('Recibo'),
  valor_extenso: z.string().optional(),
  pagador: z.string().optional(),
  beneficiario: z.string().optional(),
  cpf_cnpj_pagador: z.string().optional(),
  cpf_cnpj_beneficiario: z.string().optional(),
  motivo_pagamento: z.string().optional()
})

// Schema específico para Boleto
export const BoletoSchema = BaseDocumentSchema.extend({
  tipo_documento: z.literal('Boleto'),
  banco: z.string().optional(),
  cedente: z.string().optional(),
  sacado: z.string().optional(),
  linha_digitavel: z.string().regex(/^\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d{1}\s+\d{14}$/, 
    "Linha digitável inválida").optional(),
  nosso_numero: z.string().optional(),
  codigo_barras: z.string().optional()
}).refine(data => {
  // Validação: data de vencimento deve ser posterior à emissão
  if (data.data_emissao && data.data_vencimento) {
    return new Date(data.data_vencimento) >= new Date(data.data_emissao)
  }
  return true
}, {
  message: "Data de vencimento deve ser posterior à data de emissão"
})

// Schema genérico para outros documentos
export const GenericDocumentSchema = BaseDocumentSchema

// Função para validar documento baseado no tipo
export function validateDocumentByType(data: any) {
  const tipo = data.tipo_documento

  try {
    switch (tipo) {
      case 'NFe':
      case 'NFCe':
        return NFESchema.parse(data)
      case 'Pró-labore':
        return ProlaboreSchema.parse(data)
      case 'Recibo':
        return ReciboSchema.parse(data)
      case 'Boleto':
        return BoletoSchema.parse(data)
      default:
        return GenericDocumentSchema.parse(data)
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validação falhou: ${error.issues.map(e => e.message).join(', ')}`)
    }
    throw error
  }
}

// Tipos TypeScript derivados dos schemas
export type NFEData = z.infer<typeof NFESchema>
export type ProlaboreData = z.infer<typeof ProlaboreSchema>
export type ReciboData = z.infer<typeof ReciboSchema>
export type BoletoData = z.infer<typeof BoletoSchema>
export type GenericDocumentData = z.infer<typeof GenericDocumentSchema>

export type ValidatedDocumentData = NFEData | ProlaboreData | ReciboData | BoletoData | GenericDocumentData
