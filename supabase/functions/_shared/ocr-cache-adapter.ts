/**
 * Adaptador para cache de OCR usando o sistema unificado
 * Migra pdf_ocr_cache para unified_cache mantendo compatibilidade
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface OCRResult {
  text: string
  confidence: number
  pages?: number
  method: 'native' | 'ocr' | 'hybrid'
  processing_time: number
  structured_data?: any
  metadata?: {
    file_size: number
    file_type: string
    language?: string
    readability_score?: number
  }
}

interface LegacyOCRCacheInterface {
  get(filePath: string): Promise<OCRResult | null>
  set(filePath: string, result: OCRResult): Promise<void>
  invalidate(filePath: string): Promise<void>
  cleanup(): Promise<number>
  getStats(): Promise<any>
}

/**
 * Adaptador para cache de OCR unificado
 */
export class OCRCacheAdapter implements LegacyOCRCacheInterface {
  private supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000 // 7 dias

  /**
   * Gerar chave de cache para OCR
   */
  private generateCacheKey(filePath: string): string {
    return `ocr:${filePath}`
  }

  /**
   * Buscar resultado de OCR do cache
   */
  async get(filePath: string): Promise<OCRResult | null> {
    try {
      const cacheKey = this.generateCacheKey(filePath)
      
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('value, created_at')
        .eq('key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) {
        console.log(`🔍 OCR Cache MISS: ${filePath}`)
        return null
      }

      // Incrementar hit count
      await this.incrementHitCount(cacheKey)

      console.log(`🎯 OCR Cache HIT: ${filePath}`)
      return JSON.parse(data.value) as OCRResult
    } catch (error) {
      console.warn('OCR Cache get error:', error)
      return null
    }
  }

  /**
   * Armazenar resultado de OCR no cache
   */
  async set(filePath: string, result: OCRResult): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(filePath)
      const expiresAt = new Date(Date.now() + this.DEFAULT_TTL).toISOString()
      
      // Calcular tamanho aproximado
      const sizeBytes = JSON.stringify(result).length

      await this.supabase
        .from('unified_cache')
        .upsert({
          key: cacheKey,
          value: JSON.stringify(result),
          expires_at: expiresAt,
          tags: ['ocr', 'documents'],
          priority: 'normal',
          size_bytes: sizeBytes,
          created_at: new Date().toISOString()
        })

      console.log(`💾 OCR Cache SET: ${filePath}`)

      // Registrar métricas de OCR
      await this.recordOCRMetrics(filePath, result)
    } catch (error) {
      console.warn('OCR Cache set error:', error)
    }
  }

  /**
   * Invalidar cache de OCR específico
   */
  async invalidate(filePath: string): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(filePath)
      
      await this.supabase
        .from('unified_cache')
        .delete()
        .eq('key', cacheKey)

      console.log(`🗑️ OCR Cache INVALIDATE: ${filePath}`)
    } catch (error) {
      console.warn('OCR Cache invalidate error:', error)
    }
  }

  /**
   * Limpeza automática de cache expirado
   */
  async cleanup(): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('unified_cache')
        .delete()
        .contains('tags', ['ocr'])
        .lt('expires_at', new Date().toISOString())
        .select('*', { count: 'exact', head: true })

      console.log(`🧹 OCR Cache cleanup: ${count} items removed`)
      return count || 0
    } catch (error) {
      console.warn('OCR Cache cleanup error:', error)
      return 0
    }
  }

  /**
   * Obter estatísticas do cache de OCR
   */
  async getStats(): Promise<{
    totalEntries: number
    activeEntries: number
    expiredEntries: number
    totalSizeMB: number
    avgConfidence: number
    methodDistribution: Record<string, number>
    avgProcessingTime: number
  }> {
    try {
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('value, size_bytes, expires_at, created_at')
        .contains('tags', ['ocr'])

      if (error || !data) {
        return this.getEmptyStats()
      }

      const now = new Date()
      const activeEntries = data.filter(item => new Date(item.expires_at) > now)
      const expiredEntries = data.filter(item => new Date(item.expires_at) <= now)
      
      const totalSizeBytes = data.reduce((sum, item) => sum + (item.size_bytes || 0), 0)
      
      // Analisar resultados de OCR
      const ocrResults = data.map(item => {
        try {
          return JSON.parse(item.value) as OCRResult
        } catch {
          return null
        }
      }).filter(Boolean) as OCRResult[]

      const avgConfidence = ocrResults.length > 0 
        ? ocrResults.reduce((sum, result) => sum + result.confidence, 0) / ocrResults.length
        : 0

      const avgProcessingTime = ocrResults.length > 0
        ? ocrResults.reduce((sum, result) => sum + result.processing_time, 0) / ocrResults.length
        : 0

      // Distribuição por método
      const methodDistribution = ocrResults.reduce((acc, result) => {
        acc[result.method] = (acc[result.method] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        totalEntries: data.length,
        activeEntries: activeEntries.length,
        expiredEntries: expiredEntries.length,
        totalSizeMB: Math.round(totalSizeBytes / 1024 / 1024 * 100) / 100,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        methodDistribution,
        avgProcessingTime: Math.round(avgProcessingTime)
      }
    } catch (error) {
      console.warn('Error getting OCR cache stats:', error)
      return this.getEmptyStats()
    }
  }

  /**
   * Migrar dados do cache legado de OCR
   */
  async migrateLegacyData(): Promise<{ migrated: number; errors: number }> {
    let migrated = 0
    let errors = 0

    try {
      // Buscar dados do pdf_ocr_cache legado
      const { data: legacyData, error } = await this.supabase
        .from('pdf_ocr_cache')
        .select('*')
        .gt('expires_at', new Date().toISOString())

      if (error || !legacyData) {
        console.log('No legacy OCR cache data to migrate')
        return { migrated: 0, errors: 0 }
      }

      // Migrar cada item
      for (const item of legacyData) {
        try {
          const unifiedKey = this.generateCacheKey(item.file_path)
          
          await this.supabase
            .from('unified_cache')
            .upsert({
              key: unifiedKey,
              value: item.result,
              expires_at: item.expires_at,
              tags: ['ocr', 'migrated'],
              priority: 'normal',
              size_bytes: JSON.stringify(item.result).length,
              created_at: item.created_at
            })

          migrated++
        } catch (itemError) {
          console.warn('Error migrating OCR item:', itemError)
          errors++
        }
      }

      console.log(`✅ OCR Cache migration completed: ${migrated} migrated, ${errors} errors`)
      return { migrated, errors }
    } catch (error) {
      console.error('OCR Cache migration failed:', error)
      return { migrated, errors: errors + 1 }
    }
  }

  /**
   * Buscar arquivos similares processados
   */
  async findSimilarFiles(filePath: string, limit: number = 5): Promise<Array<{
    filePath: string
    confidence: number
    method: string
    processingTime: number
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('unified_cache')
        .select('key, value')
        .contains('tags', ['ocr'])
        .gt('expires_at', new Date().toISOString())
        .limit(limit * 2) // Buscar mais para filtrar

      if (error || !data) return []

      const results = data
        .map(item => {
          try {
            const result = JSON.parse(item.value) as OCRResult
            const itemFilePath = item.key.replace('ocr:', '')
            
            // Calcular similaridade simples baseada no nome do arquivo
            const similarity = this.calculateFileSimilarity(filePath, itemFilePath)
            
            return {
              filePath: itemFilePath,
              confidence: result.confidence,
              method: result.method,
              processingTime: result.processing_time,
              similarity
            }
          } catch {
            return null
          }
        })
        .filter(Boolean)
        .sort((a, b) => b!.similarity - a!.similarity)
        .slice(0, limit)
        .map(item => ({
          filePath: item!.filePath,
          confidence: item!.confidence,
          method: item!.method,
          processingTime: item!.processingTime
        }))

      return results
    } catch (error) {
      console.warn('Error finding similar files:', error)
      return []
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

  private async recordOCRMetrics(filePath: string, result: OCRResult): Promise<void> {
    try {
      // Registrar métricas detalhadas se a tabela existir
      await this.supabase
        .from('pdf_ocr_metrics')
        .insert({
          document_id: this.generateDocumentId(filePath),
          method: result.method,
          confidence: result.confidence,
          processing_time: result.processing_time,
          character_count: result.text.length,
          word_count: result.text.split(/\s+/).length,
          readability_score: result.metadata?.readability_score || null,
          has_structured_data: !!result.structured_data,
          success: true
        })
    } catch (error) {
      // Ignorar erros de métricas - não é crítico
    }
  }

  private generateDocumentId(filePath: string): string {
    // Gerar ID consistente baseado no caminho do arquivo
    let hash = 0
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `doc_${Math.abs(hash).toString(36)}`
  }

  private calculateFileSimilarity(file1: string, file2: string): number {
    // Similaridade simples baseada em substring comum
    const name1 = file1.split('/').pop()?.split('.')[0] || ''
    const name2 = file2.split('/').pop()?.split('.')[0] || ''
    
    if (name1 === name2) return 1.0
    
    const longer = name1.length > name2.length ? name1 : name2
    const shorter = name1.length > name2.length ? name2 : name1
    
    if (longer.length === 0) return 0.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  private getEmptyStats() {
    return {
      totalEntries: 0,
      activeEntries: 0,
      expiredEntries: 0,
      totalSizeMB: 0,
      avgConfidence: 0,
      methodDistribution: {},
      avgProcessingTime: 0
    }
  }
}

// Instância singleton
export const ocrCache = new OCRCacheAdapter()

// Exportar para compatibilidade
export default ocrCache
