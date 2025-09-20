/**
 * Adaptador para cache de CNPJ usando o sistema unificado
 * Integra consultas CNPJ com invalidação inteligente
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CNPJData {
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  situacao: string
  dataAbertura: string
  naturezaJuridica: string
  endereco: {
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    municipio: string
    uf: string
    cep: string
  }
  telefone?: string
  email?: string
  capitalSocial?: number
  porte: string
  atividadePrincipal: {
    codigo: string
    descricao: string
  }
  atividadesSecundarias?: Array<{
    codigo: string
    descricao: string
  }>
  situacaoEspecial?: string
  dataConsulta: string
  fonte: 'receita_federal' | 'serpro' | 'outros'
}

interface LegacyCNPJCacheInterface {
  get(cnpj: string): Promise<CNPJData | null>
  set(cnpj: string, data: CNPJData): Promise<void>
  invalidate(cnpj: string): Promise<void>
  invalidateAll(): Promise<number>
  isValid(cnpj: string): Promise<boolean>
  getStats(): Promise<any>
}

/**
 * Adaptador para cache de CNPJ unificado
 */
export class CNPJCacheAdapter implements LegacyCNPJCacheInterface {
  private supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  private readonly DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000 // 30 dias
  private readonly ACTIVE_COMPANY_TTL = 7 * 24 * 60 * 60 * 1000 // 7 dias para empresas ativas
  private readonly INACTIVE_COMPANY_TTL = 90 * 24 * 60 * 60 * 1000 // 90 dias para inativas

  /**
   * Gerar chave de cache para CNPJ
   */
  private generateCacheKey(cnpj: string): string {
    // Normalizar CNPJ removendo formatação
    const normalizedCNPJ = cnpj.replace(/[^\d]/g, '')
    return `cnpj:${normalizedCNPJ}`
  }

  /**
   * Validar formato de CNPJ
   */
  private isValidCNPJFormat(cnpj: string): boolean {
    const normalizedCNPJ = cnpj.replace(/[^\d]/g, '')
    
    if (normalizedCNPJ.length !== 14) return false
    
    // Verificar se não são todos dígitos iguais
    if (/^(\d)\1{13}$/.test(normalizedCNPJ)) return false
    
    // Validar dígitos verificadores
    return this.validateCNPJChecksum(normalizedCNPJ)
  }

  /**
   * Validar dígitos verificadores do CNPJ
   */
  private validateCNPJChecksum(cnpj: string): boolean {
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    
    // Primeiro dígito
    let sum = 0
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weights1[i]
    }
    let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    
    // Segundo dígito
    sum = 0
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weights2[i]
    }
    let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    
    return digit1 === parseInt(cnpj[12]) && digit2 === parseInt(cnpj[13])
  }

  /**
   * Determinar TTL baseado na situação da empresa
   */
  private getTTLBySituation(data: CNPJData): number {
    if (data.situacao === 'ATIVA') {
      return this.ACTIVE_COMPANY_TTL
    } else if (data.situacao === 'BAIXADA' || data.situacao === 'SUSPENSA') {
      return this.INACTIVE_COMPANY_TTL
    }
    return this.DEFAULT_TTL
  }

  /**
   * Buscar dados de CNPJ do cache
   */
  async get(cnpj: string): Promise<CNPJData | null> {
    if (!this.isValidCNPJFormat(cnpj)) {
      console.warn(`[CNPJ_CACHE] CNPJ inválido: ${cnpj}`)
      return null
    }

    try {
      const cacheKey = this.generateCacheKey(cnpj)
      
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('value, created_at, expires_at')
        .eq('key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        console.log(`🔍 CNPJ Cache MISS: ${cnpj}`)
        return null
      }

      // Incrementar hit count
      await this.incrementHitCount(cacheKey)

      console.log(`🎯 CNPJ Cache HIT: ${cnpj}`)
      return JSON.parse(data.value) as CNPJData
    } catch (error) {
      console.warn('CNPJ Cache get error:', error)
      return null
    }
  }

  /**
   * Armazenar dados de CNPJ no cache
   */
  async set(cnpj: string, data: CNPJData): Promise<void> {
    if (!this.isValidCNPJFormat(cnpj)) {
      console.warn(`[CNPJ_CACHE] CNPJ inválido para cache: ${cnpj}`)
      return
    }

    try {
      const cacheKey = this.generateCacheKey(cnpj)
      const ttl = this.getTTLBySituation(data)
      const expiresAt = new Date(Date.now() + ttl).toISOString()
      
      // Adicionar metadados de consulta
      const enrichedData = {
        ...data,
        dataConsulta: new Date().toISOString(),
        cacheInfo: {
          ttl,
          situacao: data.situacao,
          fonte: data.fonte || 'receita_federal'
        }
      }

      await this.supabase
        .from('unified_cache')
        .upsert({
          key: cacheKey,
          value: JSON.stringify(enrichedData),
          expires_at: expiresAt,
          tags: ['cnpj', `situacao:${data.situacao.toLowerCase()}`, `uf:${data.endereco.uf}`],
          priority: data.situacao === 'ATIVA' ? 'high' : 'normal',
          size_bytes: JSON.stringify(enrichedData).length,
          created_at: new Date().toISOString()
        })

      console.log(`💾 CNPJ Cache SET: ${cnpj} (TTL: ${Math.round(ttl / (24 * 60 * 60 * 1000))} dias)`)

      // Registrar métricas de consulta CNPJ
      await this.recordCNPJMetrics(cnpj, data)
    } catch (error) {
      console.warn('CNPJ Cache set error:', error)
    }
  }

  /**
   * Invalidar cache de CNPJ específico
   */
  async invalidate(cnpj: string): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(cnpj)
      
      await this.supabase
        .from('unified_cache')
        .delete()
        .eq('key', cacheKey)

      console.log(`🗑️ CNPJ Cache INVALIDATE: ${cnpj}`)
    } catch (error) {
      console.warn('CNPJ Cache invalidate error:', error)
    }
  }

  /**
   * Invalidar todo cache de CNPJ
   */
  async invalidateAll(): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('unified_cache')
        .delete()
        .contains('tags', ['cnpj'])
        .select('*', { count: 'exact', head: true })

      console.log(`🗑️ CNPJ Cache INVALIDATE ALL: ${count} items removed`)
      return count || 0
    } catch (error) {
      console.warn('CNPJ Cache invalidate all error:', error)
      return 0
    }
  }

  /**
   * Verificar se CNPJ tem cache válido
   */
  async isValid(cnpj: string): Promise<boolean> {
    if (!this.isValidCNPJFormat(cnpj)) return false

    try {
      const cacheKey = this.generateCacheKey(cnpj)
      
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('expires_at')
        .eq('key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      return !error && !!data
    } catch {
      return false
    }
  }

  /**
   * Obter estatísticas do cache de CNPJ
   */
  async getStats(): Promise<{
    totalEntries: number
    activeEntries: number
    expiredEntries: number
    situacaoDistribution: Record<string, number>
    ufDistribution: Record<string, number>
    avgCacheAge: number
    hitRate: number
  }> {
    try {
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('value, created_at, expires_at, hit_count, tags')
        .contains('tags', ['cnpj'])

      if (error || !data) {
        return this.getEmptyStats()
      }

      const now = new Date()
      const activeEntries = data.filter(item => new Date(item.expires_at) > now)
      const expiredEntries = data.filter(item => new Date(item.expires_at) <= now)

      // Analisar distribuições
      const situacaoDistribution: Record<string, number> = {}
      const ufDistribution: Record<string, number> = {}
      let totalHits = 0

      for (const item of data) {
        totalHits += item.hit_count || 0

        // Extrair situação das tags
        const situacaoTag = item.tags?.find((tag: string) => tag.startsWith('situacao:'))
        if (situacaoTag) {
          const situacao = situacaoTag.replace('situacao:', '').toUpperCase()
          situacaoDistribution[situacao] = (situacaoDistribution[situacao] || 0) + 1
        }

        // Extrair UF das tags
        const ufTag = item.tags?.find((tag: string) => tag.startsWith('uf:'))
        if (ufTag) {
          const uf = ufTag.replace('uf:', '')
          ufDistribution[uf] = (ufDistribution[uf] || 0) + 1
        }
      }

      // Calcular idade média do cache
      const avgCacheAge = data.length > 0
        ? data.reduce((sum, item) => {
            const age = now.getTime() - new Date(item.created_at).getTime()
            return sum + age
          }, 0) / data.length / (24 * 60 * 60 * 1000) // em dias
        : 0

      // Hit rate aproximado
      const hitRate = data.length > 0 ? totalHits / data.length : 0

      return {
        totalEntries: data.length,
        activeEntries: activeEntries.length,
        expiredEntries: expiredEntries.length,
        situacaoDistribution,
        ufDistribution,
        avgCacheAge: Math.round(avgCacheAge * 100) / 100,
        hitRate: Math.round(hitRate * 100) / 100
      }
    } catch (error) {
      console.warn('Error getting CNPJ cache stats:', error)
      return this.getEmptyStats()
    }
  }

  /**
   * Migrar dados do cache legado de CNPJ
   */
  async migrateLegacyData(): Promise<{ migrated: number; errors: number }> {
    let migrated = 0
    let errors = 0

    try {
      // Verificar se existe tabela cnpj_cache legada
      const { data: tableExists } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'cnpj_cache')
        .single()

      if (!tableExists) {
        console.log('No legacy CNPJ cache table found')
        return { migrated: 0, errors: 0 }
      }

      // Buscar dados do cnpj_cache legado
      const { data: legacyData, error } = await this.supabase
        .from('cnpj_cache')
        .select('*')
        .gt('expires_at', new Date().toISOString())

      if (error || !legacyData) {
        console.log('No legacy CNPJ cache data to migrate')
        return { migrated: 0, errors: 0 }
      }

      // Migrar cada item
      for (const item of legacyData) {
        try {
          const unifiedKey = this.generateCacheKey(item.cnpj)
          
          await this.supabase
            .from('unified_cache')
            .upsert({
              key: unifiedKey,
              value: item.dados_receita,
              expires_at: item.expires_at,
              tags: ['cnpj', 'migrated'],
              priority: 'normal',
              size_bytes: JSON.stringify(item.dados_receita).length,
              created_at: item.created_at
            })

          migrated++
        } catch (itemError) {
          console.warn('Error migrating CNPJ item:', itemError)
          errors++
        }
      }

      console.log(`✅ CNPJ Cache migration completed: ${migrated} migrated, ${errors} errors`)
      return { migrated, errors }
    } catch (error) {
      console.error('CNPJ Cache migration failed:', error)
      return { migrated, errors: errors + 1 }
    }
  }

  // Métodos privados
  private async incrementHitCount(cacheKey: string): Promise<void> {
    try {
      await this.supabase.rpc('increment_cache_hit', { cache_key: cacheKey })
    } catch (error) {
      // Ignorar erros de hit count - não é crítico
    }
  }

  private async recordCNPJMetrics(cnpj: string, data: CNPJData): Promise<void> {
    try {
      // Registrar métricas de consulta CNPJ se a tabela existir
      await this.supabase
        .from('cnpj_consultation_metrics')
        .insert({
          cnpj: cnpj.replace(/[^\d]/g, ''),
          situacao: data.situacao,
          uf: data.endereco.uf,
          porte: data.porte,
          fonte: data.fonte || 'receita_federal',
          consulta_em: new Date().toISOString()
        })
    } catch (error) {
      // Ignorar erros de métricas - não é crítico
    }
  }

  private getEmptyStats() {
    return {
      totalEntries: 0,
      activeEntries: 0,
      expiredEntries: 0,
      situacaoDistribution: {},
      ufDistribution: {},
      avgCacheAge: 0,
      hitRate: 0
    }
  }
}

// Instância singleton
export const cnpjCache = new CNPJCacheAdapter()

// Exportar para compatibilidade
export default cnpjCache
