/**
 * Serviço de Criptografia - ContabilidadePRO
 * Utiliza extensão pgsodium para criptografia moderna
 */

import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/simple-logger'

export interface EncryptionResult {
  encrypted: string
  keyId?: string
  algorithm: string
}

export interface DecryptionResult {
  decrypted: string
  success: boolean
}

export class EncryptionService {
  private supabase = createClient()

  /**
   * Criptografa dados sensíveis usando pgsodium
   */
  async encrypt(
    data: string,
    keyId?: string
  ): Promise<EncryptionResult> {
    try {
      const { data: result, error } = await this.supabase.rpc('encrypt_data', {
        plaintext: data,
        key_id: keyId
      })

      if (error) throw error

      logger.info('Dados criptografados com sucesso', { 
        dataLength: data.length,
        keyId: keyId || 'default'
      })

      return {
        encrypted: result.encrypted,
        keyId: result.key_id,
        algorithm: result.algorithm || 'aead-det'
      }
    } catch (error) {
      logger.error('Erro na criptografia', { error })
      throw new Error('Falha na criptografia de dados')
    }
  }

  /**
   * Descriptografa dados usando pgsodium
   */
  async decrypt(
    encryptedData: string,
    keyId?: string
  ): Promise<DecryptionResult> {
    try {
      const { data: result, error } = await this.supabase.rpc('decrypt_data', {
        ciphertext: encryptedData,
        key_id: keyId
      })

      if (error) throw error

      logger.info('Dados descriptografados com sucesso', { keyId: keyId || 'default' })

      return {
        decrypted: result,
        success: true
      }
    } catch (error) {
      logger.error('Erro na descriptografia', { error })
      return {
        decrypted: '',
        success: false
      }
    }
  }

  /**
   * Gera hash seguro para senhas
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('hash_password', {
        password
      })

      if (error) throw error

      logger.info('Senha hasheada com sucesso')
      return data
    } catch (error) {
      logger.error('Erro ao hashear senha', { error })
      throw new Error('Falha no hash da senha')
    }
  }

  /**
   * Verifica senha contra hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('verify_password', {
        password,
        hash
      })

      if (error) throw error

      return data === true
    } catch (error) {
      logger.error('Erro na verificação de senha', { error })
      return false
    }
  }

  /**
   * Gera chave de criptografia
   */
  async generateKey(keyName: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('generate_encryption_key', {
        key_name: keyName
      })

      if (error) throw error

      logger.info('Chave de criptografia gerada', { keyName })
      return data
    } catch (error) {
      logger.error('Erro ao gerar chave', { keyName, error })
      throw new Error('Falha na geração de chave')
    }
  }

  /**
   * Criptografa dados financeiros sensíveis
   */
  async encryptFinancialData(data: {
    valor?: number
    conta?: string
    documento?: string
    observacoes?: string
  }): Promise<Record<string, string>> {
    const encrypted: Record<string, string> = {}

    try {
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null) {
          const result = await this.encrypt(String(value), 'financial_data')
          encrypted[key] = result.encrypted
        }
      }

      return encrypted
    } catch (error) {
      logger.error('Erro na criptografia de dados financeiros', { error })
      throw new Error('Falha na criptografia de dados financeiros')
    }
  }

  /**
   * Descriptografa dados financeiros
   */
  async decryptFinancialData(
    encryptedData: Record<string, string>
  ): Promise<Record<string, string>> {
    const decrypted: Record<string, string> = {}

    try {
      for (const [key, value] of Object.entries(encryptedData)) {
        if (value) {
          const result = await this.decrypt(value, 'financial_data')
          if (result.success) {
            decrypted[key] = result.decrypted
          }
        }
      }

      return decrypted
    } catch (error) {
      logger.error('Erro na descriptografia de dados financeiros', { error })
      throw new Error('Falha na descriptografia de dados financeiros')
    }
  }

  /**
   * Criptografa CNPJ/CPF
   */
  async encryptDocument(document: string): Promise<string> {
    try {
      const result = await this.encrypt(document, 'documents')
      return result.encrypted
    } catch (error) {
      logger.error('Erro na criptografia de documento', { error })
      throw new Error('Falha na criptografia de documento')
    }
  }

  /**
   * Descriptografa CNPJ/CPF
   */
  async decryptDocument(encryptedDocument: string): Promise<string> {
    try {
      const result = await this.decrypt(encryptedDocument, 'documents')
      return result.success ? result.decrypted : ''
    } catch (error) {
      logger.error('Erro na descriptografia de documento', { error })
      return ''
    }
  }

  /**
   * Gera token seguro para APIs
   */
  async generateSecureToken(length: number = 32): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('generate_secure_token', {
        token_length: length
      })

      if (error) throw error

      return data
    } catch (error) {
      logger.error('Erro ao gerar token seguro', { error })
      throw new Error('Falha na geração de token')
    }
  }

  /**
   * Criptografa dados para armazenamento em cache
   */
  async encryptCacheData(data: any): Promise<string> {
    try {
      const jsonData = JSON.stringify(data)
      const result = await this.encrypt(jsonData, 'cache_data')
      return result.encrypted
    } catch (error) {
      logger.error('Erro na criptografia de cache', { error })
      throw new Error('Falha na criptografia de cache')
    }
  }

  /**
   * Descriptografa dados do cache
   */
  async decryptCacheData<T>(encryptedData: string): Promise<T | null> {
    try {
      const result = await this.decrypt(encryptedData, 'cache_data')
      if (result.success) {
        return JSON.parse(result.decrypted)
      }
      return null
    } catch (error) {
      logger.error('Erro na descriptografia de cache', { error })
      return null
    }
  }

  /**
   * Valida integridade de dados criptografados
   */
  async validateIntegrity(
    originalData: string,
    encryptedData: string,
    keyId?: string
  ): Promise<boolean> {
    try {
      const decryptResult = await this.decrypt(encryptedData, keyId)
      return decryptResult.success && decryptResult.decrypted === originalData
    } catch (error) {
      logger.error('Erro na validação de integridade', { error })
      return false
    }
  }
}

export const encryptionService = new EncryptionService()
