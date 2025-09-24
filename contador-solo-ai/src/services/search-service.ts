/**
 * Serviço de Busca Global - ContabilidadePRO
 * Sistema de busca inteligente com cache e performance otimizada
 */

import { useSupabase } from '@/hooks/use-supabase'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type SearchType = 'clientes' | 'documentos' | 'calculos' | 'prazos' | 'relatorios' | 'all'

export interface SearchResult {
  id: string
  type: SearchType
  title: string
  subtitle?: string
  description?: string
  url: string
  metadata?: Record<string, any>
  relevance: number
  createdAt?: string
  updatedAt?: string
}

export interface SearchOptions {
  query: string
  types?: SearchType[]
  limit?: number
  offset?: number
  userId?: string
  filters?: Record<string, any>
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  hasMore: boolean
  query: string
  executionTime: number
}

// =====================================================
// CLASSE DE SERVIÇO DE BUSCA
// =====================================================

export class SearchService {
  private supabase: any
  private cache = new Map<string, { data: SearchResponse; timestamp: number }>()
  private readonly CACHE_TTL = 2 * 60 * 1000 // 2 minutos

  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * Busca global no sistema
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = performance.now()
    
    try {
      // Verificar cache primeiro
      const cacheKey = this.generateCacheKey(options)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }

      // Validar entrada
      if (!options.query || options.query.trim().length < 2) {
        return this.createEmptyResponse(options.query, performance.now() - startTime)
      }

      // Executar busca
      const results = await this.executeSearch(options)
      
      // Calcular relevância e ordenar
      const sortedResults = this.calculateRelevance(results, options.query)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(options.offset || 0, (options.offset || 0) + (options.limit || 10))

      const response: SearchResponse = {
        results: sortedResults,
        total: results.length,
        hasMore: results.length > (options.offset || 0) + (options.limit || 10),
        query: options.query,
        executionTime: performance.now() - startTime
      }

      // Armazenar no cache
      this.setCache(cacheKey, response)

      return response
    } catch (error) {
      console.error('Erro na busca:', error)
      return this.createEmptyResponse(options.query, performance.now() - startTime)
    }
  }

  /**
   * Executa a busca nos diferentes tipos de dados
   */
  private async executeSearch(options: SearchOptions): Promise<SearchResult[]> {
    const { query, types = ['all'], userId } = options
    const searchTerm = `%${query.toLowerCase()}%`
    
    const promises: Promise<SearchResult[]>[] = []

    // Determinar quais tipos buscar
    const searchTypes = types.includes('all') 
      ? ['clientes', 'documentos', 'calculos', 'prazos', 'relatorios'] as SearchType[]
      : types.filter(t => t !== 'all') as SearchType[]

    // Buscar em cada tipo
    if (searchTypes.includes('clientes')) {
      promises.push(this.searchClientes(searchTerm, userId))
    }
    
    if (searchTypes.includes('documentos')) {
      promises.push(this.searchDocumentos(searchTerm, userId))
    }
    
    if (searchTypes.includes('calculos')) {
      promises.push(this.searchCalculos(searchTerm, userId))
    }
    
    if (searchTypes.includes('prazos')) {
      promises.push(this.searchPrazos(searchTerm, userId))
    }
    
    if (searchTypes.includes('relatorios')) {
      promises.push(this.searchRelatorios(searchTerm, userId))
    }

    // Executar todas as buscas em paralelo
    const results = await Promise.all(promises)
    
    // Combinar resultados
    return results.flat()
  }

  /**
   * Busca em clientes/empresas
   */
  private async searchClientes(searchTerm: string, userId?: string): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('empresas')
        .select('id, razao_social, nome_fantasia, cnpj, created_at, updated_at')
        .or(`razao_social.ilike.${searchTerm},nome_fantasia.ilike.${searchTerm},cnpj.ilike.${searchTerm}`)
        .limit(20)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        type: 'clientes' as SearchType,
        title: item.razao_social || item.nome_fantasia,
        subtitle: item.nome_fantasia && item.razao_social !== item.nome_fantasia ? item.nome_fantasia : undefined,
        description: `CNPJ: ${item.cnpj}`,
        url: `/clientes/${item.id}`,
        metadata: { cnpj: item.cnpj },
        relevance: 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      return []
    }
  }

  /**
   * Busca em documentos
   */
  private async searchDocumentos(searchTerm: string, userId?: string): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('documentos')
        .select('id, nome, tipo, status, created_at, updated_at')
        .or(`nome.ilike.${searchTerm},tipo.ilike.${searchTerm}`)
        .limit(20)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        type: 'documentos' as SearchType,
        title: item.nome,
        subtitle: item.tipo,
        description: `Status: ${item.status}`,
        url: `/documentos/${item.id}`,
        metadata: { tipo: item.tipo, status: item.status },
        relevance: 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
      return []
    }
  }

  /**
   * Busca em cálculos
   */
  private async searchCalculos(searchTerm: string, userId?: string): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('calculos')
        .select('id, nome, tipo, status, valor_calculado, created_at, updated_at')
        .or(`nome.ilike.${searchTerm},tipo.ilike.${searchTerm}`)
        .limit(20)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        type: 'calculos' as SearchType,
        title: item.nome,
        subtitle: item.tipo,
        description: `Valor: R$ ${item.valor_calculado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`,
        url: `/calculos/${item.id}`,
        metadata: { tipo: item.tipo, status: item.status, valor: item.valor_calculado },
        relevance: 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    } catch (error) {
      console.error('Erro ao buscar cálculos:', error)
      return []
    }
  }

  /**
   * Busca em prazos fiscais
   */
  private async searchPrazos(searchTerm: string, userId?: string): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('prazos_fiscais')
        .select('id, nome, descricao, data_vencimento, status, created_at, updated_at')
        .or(`nome.ilike.${searchTerm},descricao.ilike.${searchTerm}`)
        .limit(20)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        type: 'prazos' as SearchType,
        title: item.nome,
        subtitle: new Date(item.data_vencimento).toLocaleDateString('pt-BR'),
        description: item.descricao,
        url: `/prazos/${item.id}`,
        metadata: { dataVencimento: item.data_vencimento, status: item.status },
        relevance: 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    } catch (error) {
      console.error('Erro ao buscar prazos:', error)
      return []
    }
  }

  /**
   * Busca em relatórios
   */
  private async searchRelatorios(searchTerm: string, userId?: string): Promise<SearchResult[]> {
    try {
      let query = this.supabase
        .from('relatorios')
        .select('id, nome, tipo, status, created_at, updated_at')
        .or(`nome.ilike.${searchTerm},tipo.ilike.${searchTerm}`)
        .limit(20)

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((item: any) => ({
        id: item.id,
        type: 'relatorios' as SearchType,
        title: item.nome,
        subtitle: item.tipo,
        description: `Status: ${item.status}`,
        url: `/relatorios/${item.id}`,
        metadata: { tipo: item.tipo, status: item.status },
        relevance: 0,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error)
      return []
    }
  }

  /**
   * Calcula relevância dos resultados
   */
  private calculateRelevance(results: SearchResult[], query: string): SearchResult[] {
    const queryLower = query.toLowerCase()
    
    return results.map(result => {
      let relevance = 0
      
      // Título exato = maior relevância
      if (result.title.toLowerCase() === queryLower) {
        relevance += 100
      } else if (result.title.toLowerCase().includes(queryLower)) {
        relevance += 50
      }
      
      // Início do título = alta relevância
      if (result.title.toLowerCase().startsWith(queryLower)) {
        relevance += 30
      }
      
      // Subtitle match
      if (result.subtitle?.toLowerCase().includes(queryLower)) {
        relevance += 20
      }
      
      // Description match
      if (result.description?.toLowerCase().includes(queryLower)) {
        relevance += 10
      }
      
      // Boost para itens recentes
      if (result.updatedAt) {
        const daysSinceUpdate = (Date.now() - new Date(result.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceUpdate < 7) {
          relevance += 5
        }
      }
      
      return { ...result, relevance }
    })
  }

  /**
   * Gera chave de cache
   */
  private generateCacheKey(options: SearchOptions): string {
    return JSON.stringify({
      query: options.query.toLowerCase().trim(),
      types: options.types?.sort(),
      limit: options.limit,
      offset: options.offset,
      userId: options.userId
    })
  }

  /**
   * Obtém dados do cache
   */
  private getFromCache(key: string): SearchResponse | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data
    }
    
    if (cached) {
      this.cache.delete(key)
    }
    
    return null
  }

  /**
   * Armazena no cache
   */
  private setCache(key: string, data: SearchResponse): void {
    // Limitar tamanho do cache
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Cria resposta vazia
   */
  private createEmptyResponse(query: string, executionTime: number): SearchResponse {
    return {
      results: [],
      total: 0,
      hasMore: false,
      query,
      executionTime
    }
  }

  /**
   * Limpa cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// =====================================================
// INSTÂNCIA SINGLETON
// =====================================================

let searchServiceInstance: SearchService | null = null

export const getSearchService = (supabase: any): SearchService => {
  if (!searchServiceInstance) {
    searchServiceInstance = new SearchService(supabase)
  }
  return searchServiceInstance
}
