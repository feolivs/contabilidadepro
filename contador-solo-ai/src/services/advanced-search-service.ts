/**
 * Serviço de Busca Avançada - ContabilidadePRO
 * Utiliza extensões PostgreSQL: unaccent, fuzzystrmatch, pg_trgm
 */

import { createClient } from '@/lib/supabase'
import { logger } from '@/lib/simple-logger'

export interface SearchResult<T = any> {
  data: T
  score: number
  match_type: 'exact' | 'fuzzy' | 'trigram' | 'unaccent'
}

export interface SearchOptions {
  limit?: number
  threshold?: number
  includeInactive?: boolean
  sortBy?: 'relevance' | 'name' | 'created_at'
}

export class AdvancedSearchService {
  private supabase = createClient()

  /**
   * Busca empresas com suporte a acentos e similaridade
   */
  async searchEmpresas(
    query: string, 
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = 20, threshold = 0.3 } = options

    try {
      // Busca combinada: exata, sem acentos, fuzzy e trigram
      const { data, error } = await this.supabase.rpc('search_empresas_advanced', {
        search_query: query,
        similarity_threshold: threshold,
        result_limit: limit
      })

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Erro na busca avançada de empresas', { query, error })
      throw new Error('Falha na busca de empresas')
    }
  }

  /**
   * Busca clientes com normalização de texto
   */
  async searchClientes(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = 20, threshold = 0.3 } = options

    try {
      const { data, error } = await this.supabase.rpc('search_clientes_advanced', {
        search_query: query,
        similarity_threshold: threshold,
        result_limit: limit
      })

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Erro na busca avançada de clientes', { query, error })
      throw new Error('Falha na busca de clientes')
    }
  }

  /**
   * Busca documentos fiscais por conteúdo
   */
  async searchDocumentos(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { limit = 20, threshold = 0.2 } = options

    try {
      const { data, error } = await this.supabase.rpc('search_documentos_advanced', {
        search_query: query,
        similarity_threshold: threshold,
        result_limit: limit
      })

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Erro na busca avançada de documentos', { query, error })
      throw new Error('Falha na busca de documentos')
    }
  }

  /**
   * Busca global em todas as entidades
   */
  async searchGlobal(
    query: string,
    options: SearchOptions = {}
  ): Promise<{
    empresas: SearchResult[]
    clientes: SearchResult[]
    documentos: SearchResult[]
  }> {
    const { limit = 10 } = options

    try {
      const [empresas, clientes, documentos] = await Promise.all([
        this.searchEmpresas(query, { ...options, limit }),
        this.searchClientes(query, { ...options, limit }),
        this.searchDocumentos(query, { ...options, limit })
      ])

      return { empresas, clientes, documentos }
    } catch (error) {
      logger.error('Erro na busca global', { query, error })
      throw new Error('Falha na busca global')
    }
  }

  /**
   * Sugestões de busca baseadas em similaridade
   */
  async getSuggestions(
    query: string,
    type: 'empresas' | 'clientes' | 'documentos' = 'empresas',
    limit: number = 5
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_search_suggestions', {
        search_query: query,
        search_type: type,
        result_limit: limit
      })

      if (error) throw error

      return data?.map((item: any) => item.suggestion) || []
    } catch (error) {
      logger.error('Erro ao obter sugestões', { query, type, error })
      return []
    }
  }

  /**
   * Busca por CNPJ com validação e normalização
   */
  async searchByCNPJ(cnpj: string): Promise<SearchResult[]> {
    try {
      // Normalizar CNPJ (remover pontuação)
      const normalizedCNPJ = cnpj.replace(/[^\d]/g, '')

      const { data, error } = await this.supabase.rpc('search_by_cnpj', {
        cnpj_query: normalizedCNPJ
      })

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Erro na busca por CNPJ', { cnpj, error })
      throw new Error('Falha na busca por CNPJ')
    }
  }

  /**
   * Busca hierárquica no plano de contas (usando ltree)
   */
  async searchPlanoContas(
    query: string,
    parentPath?: string
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase.rpc('search_plano_contas', {
        search_query: query,
        parent_path: parentPath
      })

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Erro na busca do plano de contas', { query, parentPath, error })
      throw new Error('Falha na busca do plano de contas')
    }
  }

  /**
   * Busca com filtros de metadados (usando hstore)
   */
  async searchWithMetadata(
    query: string,
    metadata: Record<string, string>,
    table: string
  ): Promise<SearchResult[]> {
    try {
      const { data, error } = await this.supabase.rpc('search_with_metadata', {
        search_query: query,
        metadata_filters: metadata,
        target_table: table
      })

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Erro na busca com metadados', { query, metadata, table, error })
      throw new Error('Falha na busca com metadados')
    }
  }
}

export const advancedSearchService = new AdvancedSearchService()
