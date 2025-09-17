// Validation Schemas for ContabilidadePRO
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// =====================================================
// COMMON SCHEMAS
// =====================================================

export const UUIDSchema = z.string().uuid('ID deve ser um UUID válido')

export const CNPJSchema = z.string()
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX')
  .refine((cnpj) => {
    // Remove formatting
    const digits = cnpj.replace(/\D/g, '')
    
    // Basic CNPJ validation
    if (digits.length !== 14) return false
    if (/^(\d)\1+$/.test(digits)) return false // All same digits
    
    // Calculate check digits
    let sum = 0
    let weight = 5
    for (let i = 0; i < 12; i++) {
      sum += parseInt(digits[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    
    const firstCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (parseInt(digits[12]) !== firstCheck) return false
    
    sum = 0
    weight = 6
    for (let i = 0; i < 13; i++) {
      sum += parseInt(digits[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    
    const secondCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return parseInt(digits[13]) === secondCheck
  }, 'CNPJ inválido')

export const CPFSchema = z.string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato XXX.XXX.XXX-XX')
  .refine((cpf) => {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return false
    if (/^(\d)\1+$/.test(digits)) return false
    
    // Calculate check digits
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i)
    }
    const firstCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (parseInt(digits[9]) !== firstCheck) return false
    
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i)
    }
    const secondCheck = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    return parseInt(digits[10]) === secondCheck
  }, 'CPF inválido')

export const EmailSchema = z.string().email('Email inválido')

export const PhoneSchema = z.string()
  .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone deve estar no formato (XX) XXXXX-XXXX')

export const MoneySchema = z.number()
  .min(0, 'Valor não pode ser negativo')
  .max(999999999.99, 'Valor muito alto')
  .multipleOf(0.01, 'Valor deve ter no máximo 2 casas decimais')

export const DateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  .refine((date) => !isNaN(Date.parse(date)), 'Data inválida')

export const CompetenciaSchema = z.string()
  .regex(/^\d{4}-\d{2}$/, 'Competência deve estar no formato YYYY-MM')

// =====================================================
// EMPRESA SCHEMAS
// =====================================================

export const RegimeTributarioSchema = z.enum([
  'MEI',
  'Simples Nacional',
  'Lucro Presumido',
  'Lucro Real'
], { errorMap: () => ({ message: 'Regime tributário inválido' }) })

export const SimplesAnexoSchema = z.enum(['I', 'II', 'III', 'IV', 'V'], {
  errorMap: () => ({ message: 'Anexo do Simples Nacional deve ser I, II, III, IV ou V' })
})

export const EmpresaCreateSchema = z.object({
  razao_social: z.string().min(1, 'Razão social é obrigatória').max(255),
  nome_fantasia: z.string().max(255).optional(),
  cnpj: CNPJSchema,
  inscricao_estadual: z.string().max(20).optional(),
  inscricao_municipal: z.string().max(20).optional(),
  regime_tributario: RegimeTributarioSchema,
  anexo_simples: SimplesAnexoSchema.optional(),
  email: EmailSchema.optional(),
  telefone: PhoneSchema.optional(),
  endereco: z.object({
    logradouro: z.string().min(1, 'Logradouro é obrigatório'),
    numero: z.string().min(1, 'Número é obrigatório'),
    complemento: z.string().optional(),
    bairro: z.string().min(1, 'Bairro é obrigatório'),
    cidade: z.string().min(1, 'Cidade é obrigatória'),
    uf: z.string().length(2, 'UF deve ter 2 caracteres'),
    cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP deve estar no formato XXXXX-XXX')
  }),
  ativo: z.boolean().default(true)
})

export const EmpresaUpdateSchema = EmpresaCreateSchema.partial()

// =====================================================
// CÁLCULO DAS SCHEMAS
// =====================================================

export const DASCalculationInputSchema = z.object({
  empresa_id: UUIDSchema,
  receita_mensal: MoneySchema,
  receita_anual: MoneySchema,
  anexo: SimplesAnexoSchema,
  competencia: CompetenciaSchema,
  fator_r: z.number().min(0).max(1).optional()
})

export const DASCalculationResultSchema = z.object({
  valor_das: MoneySchema,
  aliquota_efetiva: z.number().min(0).max(100),
  detalhamento: z.object({
    irpj: MoneySchema,
    csll: MoneySchema,
    pis: MoneySchema,
    cofins: MoneySchema,
    icms: MoneySchema.optional(),
    iss: MoneySchema.optional(),
    cpp: MoneySchema
  }),
  data_vencimento: DateStringSchema,
  codigo_barras: z.string().length(47, 'Código de barras deve ter 47 dígitos')
})

// =====================================================
// DOCUMENTO SCHEMAS
// =====================================================

export const TipoDocumentoSchema = z.enum([
  'NFe',
  'NFCe',
  'NFSe',
  'CTe',
  'MDFe',
  'Recibo',
  'Contrato',
  'Boleto',
  'Extrato',
  'Outros'
])

export const StatusDocumentoSchema = z.enum([
  'pendente',
  'processando',
  'processado',
  'erro',
  'rejeitado'
])

export const DocumentoCreateSchema = z.object({
  empresa_id: UUIDSchema,
  tipo: TipoDocumentoSchema,
  numero: z.string().min(1, 'Número do documento é obrigatório'),
  data_emissao: DateStringSchema,
  valor: MoneySchema,
  emissor: z.string().min(1, 'Emissor é obrigatório'),
  descricao: z.string().max(500).optional(),
  arquivo_url: z.string().url('URL do arquivo inválida').optional(),
  metadata: z.record(z.any()).optional()
})

// =====================================================
// USUÁRIO SCHEMAS
// =====================================================

export const UserRoleSchema = z.enum(['admin', 'contador', 'cliente', 'viewer'])

export const UserCreateSchema = z.object({
  email: EmailSchema,
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  role: UserRoleSchema.default('cliente'),
  empresa_id: UUIDSchema.optional(),
  ativo: z.boolean().default(true)
})

export const UserUpdateSchema = UserCreateSchema.partial()

// =====================================================
// ANALYTICS SCHEMAS
// =====================================================

export const PeriodoAnalyticsSchema = z.enum(['mensal', 'trimestral', 'anual'])

export const AnalyticsRequestSchema = z.object({
  empresa_id: UUIDSchema,
  periodo: PeriodoAnalyticsSchema,
  data_inicio: DateStringSchema,
  data_fim: DateStringSchema,
  incluir_detalhes: z.boolean().default(false)
})

// =====================================================
// API RESPONSE SCHEMAS
// =====================================================

export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  timestamp: z.string().datetime()
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }),
  timestamp: z.string().datetime()
})

// =====================================================
// HEALTH CHECK SCHEMAS
// =====================================================

export const HealthCheckRequestSchema = z.object({
  action: z.enum(['check', 'metrics', 'performance', 'status', 'detailed', 'reset']),
  component: z.enum(['database', 'storage', 'functions', 'cache', 'external']).optional(),
  include_details: z.boolean().default(false),
  reset_metrics: z.boolean().default(false)
})

// =====================================================
// VALIDATION HELPERS
// =====================================================

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: string[]
} {
  try {
    const validatedData = schema.parse(data)
    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }
    }
    
    return {
      success: false,
      errors: ['Erro de validação desconhecido']
    }
  }
}

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = validateSchema(schema, data)
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors?.join(', ')}`)
    }
    return result.data!
  }
}

// =====================================================
// EXPORT ALL SCHEMAS
// =====================================================

export const schemas = {
  // Common
  UUID: UUIDSchema,
  CNPJ: CNPJSchema,
  CPF: CPFSchema,
  Email: EmailSchema,
  Phone: PhoneSchema,
  Money: MoneySchema,
  DateString: DateStringSchema,
  Competencia: CompetenciaSchema,
  
  // Empresa
  RegimeTributario: RegimeTributarioSchema,
  SimplesAnexo: SimplesAnexoSchema,
  EmpresaCreate: EmpresaCreateSchema,
  EmpresaUpdate: EmpresaUpdateSchema,
  
  // DAS
  DASCalculationInput: DASCalculationInputSchema,
  DASCalculationResult: DASCalculationResultSchema,
  
  // Documento
  TipoDocumento: TipoDocumentoSchema,
  StatusDocumento: StatusDocumentoSchema,
  DocumentoCreate: DocumentoCreateSchema,
  
  // User
  UserRole: UserRoleSchema,
  UserCreate: UserCreateSchema,
  UserUpdate: UserUpdateSchema,
  
  // Analytics
  PeriodoAnalytics: PeriodoAnalyticsSchema,
  AnalyticsRequest: AnalyticsRequestSchema,
  
  // API
  SuccessResponse: SuccessResponseSchema,
  ErrorResponse: ErrorResponseSchema,
  
  // Health
  HealthCheckRequest: HealthCheckRequestSchema
}
