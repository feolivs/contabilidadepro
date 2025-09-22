/**
 * Serviço de Validação JSON Schema - ContabilidadePRO
 * Utiliza extensão pg_jsonschema para validação de documentos fiscais
 */

import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/simple-logger'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

export interface DocumentSchema {
  name: string
  version: string
  schema: object
  description?: string
}

export class JsonValidationService {
  private supabase = createClient()

  // Schemas para documentos fiscais brasileiros
  private readonly schemas = {
    nfe: {
      name: 'NFe',
      version: '4.00',
      schema: {
        type: 'object',
        required: ['infNFe', 'Signature'],
        properties: {
          infNFe: {
            type: 'object',
            required: ['ide', 'emit', 'dest', 'det', 'total', 'transp', 'infAdic'],
            properties: {
              ide: {
                type: 'object',
                required: ['cUF', 'cNF', 'natOp', 'mod', 'serie', 'nNF', 'dhEmi', 'tpNF', 'idDest', 'cMunFG', 'tpImp', 'tpEmis', 'cDV', 'tpAmb', 'finNFe', 'indFinal', 'indPres', 'procEmi', 'verProc'],
                properties: {
                  cUF: { type: 'string', pattern: '^[0-9]{2}$' },
                  cNF: { type: 'string', pattern: '^[0-9]{8}$' },
                  natOp: { type: 'string', maxLength: 60 },
                  mod: { type: 'string', enum: ['55', '65'] },
                  serie: { type: 'string', pattern: '^[0-9]{1,3}$' },
                  nNF: { type: 'string', pattern: '^[0-9]{1,9}$' },
                  dhEmi: { type: 'string', format: 'date-time' },
                  tpNF: { type: 'string', enum: ['0', '1'] },
                  idDest: { type: 'string', enum: ['1', '2', '3'] },
                  cMunFG: { type: 'string', pattern: '^[0-9]{7}$' },
                  tpImp: { type: 'string', enum: ['0', '1', '2', '3', '4', '5'] },
                  tpEmis: { type: 'string', enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] },
                  cDV: { type: 'string', pattern: '^[0-9]{1}$' },
                  tpAmb: { type: 'string', enum: ['1', '2'] },
                  finNFe: { type: 'string', enum: ['1', '2', '3', '4'] },
                  indFinal: { type: 'string', enum: ['0', '1'] },
                  indPres: { type: 'string', enum: ['0', '1', '2', '3', '4', '5', '9'] },
                  procEmi: { type: 'string', enum: ['0', '1', '2', '3'] },
                  verProc: { type: 'string', maxLength: 20 }
                }
              },
              emit: {
                type: 'object',
                required: ['CNPJ', 'xNome', 'enderEmit', 'IE', 'CRT'],
                properties: {
                  CNPJ: { type: 'string', pattern: '^[0-9]{14}$' },
                  xNome: { type: 'string', maxLength: 60 },
                  xFant: { type: 'string', maxLength: 60 },
                  enderEmit: {
                    type: 'object',
                    required: ['xLgr', 'nro', 'xBairro', 'cMun', 'xMun', 'UF', 'CEP', 'cPais', 'xPais'],
                    properties: {
                      xLgr: { type: 'string', maxLength: 60 },
                      nro: { type: 'string', maxLength: 60 },
                      xCpl: { type: 'string', maxLength: 60 },
                      xBairro: { type: 'string', maxLength: 60 },
                      cMun: { type: 'string', pattern: '^[0-9]{7}$' },
                      xMun: { type: 'string', maxLength: 60 },
                      UF: { type: 'string', pattern: '^[A-Z]{2}$' },
                      CEP: { type: 'string', pattern: '^[0-9]{8}$' },
                      cPais: { type: 'string', pattern: '^[0-9]{1,4}$' },
                      xPais: { type: 'string', maxLength: 60 },
                      fone: { type: 'string', maxLength: 14 }
                    }
                  },
                  IE: { type: 'string', maxLength: 14 },
                  IEST: { type: 'string', maxLength: 14 },
                  IM: { type: 'string', maxLength: 15 },
                  CNAE: { type: 'string', pattern: '^[0-9]{7}$' },
                  CRT: { type: 'string', enum: ['1', '2', '3'] }
                }
              }
            }
          }
        }
      }
    },
    das: {
      name: 'DAS',
      version: '1.0',
      schema: {
        type: 'object',
        required: ['cnpj', 'periodoApuracao', 'receitaBruta', 'regimeTributario'],
        properties: {
          cnpj: { type: 'string', pattern: '^[0-9]{14}$' },
          periodoApuracao: { type: 'string', pattern: '^[0-9]{4}-[0-9]{2}$' },
          receitaBruta: { type: 'number', minimum: 0, maximum: 4800000 },
          regimeTributario: { type: 'string', enum: ['MEI', 'Simples Nacional'] },
          anexoSimples: { type: 'string', enum: ['I', 'II', 'III', 'IV', 'V'] },
          fatorR: { type: 'number', minimum: 0, maximum: 1 },
          receitaBruta12Meses: { type: 'number', minimum: 0 },
          deducoes: {
            type: 'object',
            properties: {
              exportacao: { type: 'number', minimum: 0 },
              st: { type: 'number', minimum: 0 },
              outros: { type: 'number', minimum: 0 }
            }
          }
        }
      }
    }
  }

  /**
   * Valida documento usando schema específico
   */
  async validateDocument(
    document: any,
    schemaType: keyof typeof this.schemas
  ): Promise<ValidationResult> {
    try {
      const schema = this.schemas[schemaType]
      if (!schema) {
        throw new Error(`Schema não encontrado: ${schemaType}`)
      }

      const { data, error } = await this.supabase.rpc('validate_json_schema', {
        schema: schema.schema,
        instance: document
      })

      if (error) throw error

      const isValid = data === true
      const errors: string[] = []

      if (!isValid) {
        // Se não é válido, obter detalhes dos erros
        const { data: errorDetails } = await this.supabase.rpc('get_json_validation_errors', {
          schema: schema.schema,
          instance: document
        })

        if (errorDetails) {
          errors.push(...errorDetails)
        }
      }

      logger.info('Validação de documento', { schemaType, isValid, errorCount: errors.length })

      return { isValid, errors }
    } catch (error) {
      logger.error('Erro na validação de documento', { schemaType, error })
      return {
        isValid: false,
        errors: [`Erro interno na validação: ${error}`]
      }
    }
  }

  /**
   * Valida NFe
   */
  async validateNFe(nfeData: any): Promise<ValidationResult> {
    return this.validateDocument(nfeData, 'nfe')
  }

  /**
   * Valida dados do DAS
   */
  async validateDAS(dasData: any): Promise<ValidationResult> {
    return this.validateDocument(dasData, 'das')
  }

  /**
   * Valida documento com schema customizado
   */
  async validateWithCustomSchema(
    document: any,
    schema: object
  ): Promise<ValidationResult> {
    try {
      const { data, error } = await this.supabase.rpc('validate_json_schema', {
        schema,
        instance: document
      })

      if (error) throw error

      const isValid = data === true
      const errors: string[] = []

      if (!isValid) {
        const { data: errorDetails } = await this.supabase.rpc('get_json_validation_errors', {
          schema,
          instance: document
        })

        if (errorDetails) {
          errors.push(...errorDetails)
        }
      }

      return { isValid, errors }
    } catch (error) {
      logger.error('Erro na validação com schema customizado', { error })
      return {
        isValid: false,
        errors: [`Erro interno na validação: ${error}`]
      }
    }
  }

  /**
   * Obtém schema disponível
   */
  getSchema(schemaType: keyof typeof this.schemas): DocumentSchema | null {
    return this.schemas[schemaType] || null
  }

  /**
   * Lista todos os schemas disponíveis
   */
  getAvailableSchemas(): DocumentSchema[] {
    return Object.values(this.schemas)
  }

  /**
   * Valida estrutura básica de CNPJ
   */
  validateCNPJ(cnpj: string): ValidationResult {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
    
    if (cleanCNPJ.length !== 14) {
      return { isValid: false, errors: ['CNPJ deve ter 14 dígitos'] }
    }

    // Validação dos dígitos verificadores
    const digits = cleanCNPJ.split('').map(Number)
    
    // Primeiro dígito verificador
    let sum = 0
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    for (let i = 0; i < 12; i++) {
      sum += digits[i]! * weights1[i]!
    }
    const remainder1 = sum % 11
    const digit1 = remainder1 < 2 ? 0 : 11 - remainder1

    if (digits[12]! !== digit1) {
      return { isValid: false, errors: ['CNPJ inválido - primeiro dígito verificador'] }
    }

    // Segundo dígito verificador
    sum = 0
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    for (let i = 0; i < 13; i++) {
      sum += digits[i]! * weights2[i]!
    }
    const remainder2 = sum % 11
    const digit2 = remainder2 < 2 ? 0 : 11 - remainder2

    if (digits[13]! !== digit2) {
      return { isValid: false, errors: ['CNPJ inválido - segundo dígito verificador'] }
    }

    return { isValid: true, errors: [] }
  }
}

export const jsonValidationService = new JsonValidationService()
