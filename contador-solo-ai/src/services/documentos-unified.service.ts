/**
 * Service para gerenciar documentos unificados
 * Substitui os services separados de documentos, documentos_fiscais e processed_documents
 */

import { supabase } from '@/lib/supabase'
import { 
  DocumentoUnified, 
  DocumentoUnifiedInsert, 
  DocumentoUnifiedUpdate,
  DocumentoSearchParams,
  DocumentoSearchResult,
  DocumentoStats,
  DocumentCategory,
  UnifiedProcessingStatus
} from '@/types/documentos-unified.types'

export class DocumentosUnifiedService {
  private static readonly TABLE_NAME = 'documentos_unified'

  /**
   * Buscar documentos com filtros avançados
   */
  static async searchDocumentos(params: DocumentoSearchParams): Promise<{
    data: DocumentoSearchResult[]
    error: string | null
  }> {
    try {
      const { data, error } = await supabase.rpc('search_documentos_unified', {
        p_user_id: params.user_id || null,
        p_empresa_id: params.empresa_id || null,
        p_search_term: params.search_term || null,
        p_categoria: params.categoria || null,
        p_tipo_documento: params.tipo_documento || null,
        p_status: params.status || null,
        p_ano_fiscal: params.ano_fiscal || null,
        p_mes_fiscal: params.mes_fiscal || null,
        p_limit: params.limit || 20,
        p_offset: params.offset || 0
      })

      if (error) {
        console.error('Erro ao buscar documentos:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Erro na busca de documentos:', error)
      return { data: [], error: 'Erro interno na busca' }
    }
  }

  /**
   * Listar documentos com paginação
   */
  static async listDocumentos(
    empresaId?: string,
    userId?: string,
    page = 1,
    limit = 20
  ): Promise<{
    data: DocumentoUnified[]
    count: number
    error: string | null
  }> {
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const offset = (page - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        console.error('Erro ao listar documentos:', error)
        return { data: [], count: 0, error: error.message }
      }

      return { data: data || [], count: count || 0, error: null }
    } catch (error) {
      console.error('Erro na listagem de documentos:', error)
      return { data: [], count: 0, error: 'Erro interno na listagem' }
    }
  }

  /**
   * Buscar documento por ID
   */
  static async getDocumento(id: string): Promise<{
    data: DocumentoUnified | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      if (error) {
        console.error('Erro ao buscar documento:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Erro na busca do documento:', error)
      return { data: null, error: 'Erro interno na busca' }
    }
  }

  /**
   * Criar novo documento
   */
  static async createDocumento(documento: DocumentoUnifiedInsert): Promise<{
    data: DocumentoUnified | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          ...documento,
          dados_extraidos: documento.dados_extraidos || {},
          tags: documento.tags || [],
          validado_manualmente: documento.validado_manualmente || false,
          prioridade: documento.prioridade || 0
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar documento:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Erro na criação do documento:', error)
      return { data: null, error: 'Erro interno na criação' }
    }
  }

  /**
   * Atualizar documento
   */
  static async updateDocumento(
    id: string, 
    updates: DocumentoUnifiedUpdate
  ): Promise<{
    data: DocumentoUnified | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar documento:', error)
        return { data: null, error: error.message }
      }

      return { data, error: null }
    } catch (error) {
      console.error('Erro na atualização do documento:', error)
      return { data: null, error: 'Erro interno na atualização' }
    }
  }

  /**
   * Soft delete de documento
   */
  static async deleteDocumento(id: string): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)

      if (error) {
        console.error('Erro ao deletar documento:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Erro na deleção do documento:', error)
      return { success: false, error: 'Erro interno na deleção' }
    }
  }

  /**
   * Validar documento manualmente
   */
  static async validarDocumento(
    id: string,
    observacoes?: string
  ): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const user = (await supabase.auth.getUser()).data.user

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          validado_manualmente: true,
          validado_por: user?.id,
          validado_em: new Date().toISOString(),
          observacoes_validacao: observacoes
        })
        .eq('id', id)

      if (error) {
        console.error('Erro ao validar documento:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Erro na validação do documento:', error)
      return { success: false, error: 'Erro interno na validação' }
    }
  }

  /**
   * Atualizar status de processamento
   */
  static async updateStatus(
    id: string,
    status: UnifiedProcessingStatus,
    dadosExtraidos?: Record<string, any>
  ): Promise<{
    success: boolean
    error: string | null
  }> {
    try {
      const updates: any = {
        status_processamento: status,
        data_processamento: new Date().toISOString()
      }

      if (dadosExtraidos) {
        updates.dados_extraidos = dadosExtraidos
      }

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('Erro ao atualizar status:', error)
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (error) {
      console.error('Erro na atualização de status:', error)
      return { success: false, error: 'Erro interno na atualização' }
    }
  }

  /**
   * Obter estatísticas de documentos
   */
  static async getStats(
    empresaId?: string,
    userId?: string
  ): Promise<{
    data: DocumentoStats[]
    error: string | null
  }> {
    try {
      let query = supabase
        .from('documentos_unified_stats')
        .select('*')

      if (empresaId) {
        query = query.eq('owner_id', empresaId)
      } else if (userId) {
        query = query.eq('owner_id', userId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar estatísticas:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Erro nas estatísticas:', error)
      return { data: [], error: 'Erro interno nas estatísticas' }
    }
  }

  /**
   * Buscar documentos por categoria
   */
  static async getByCategoria(
    categoria: DocumentCategory,
    empresaId?: string,
    userId?: string
  ): Promise<{
    data: DocumentoUnified[]
    error: string | null
  }> {
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('categoria', categoria)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar por categoria:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Erro na busca por categoria:', error)
      return { data: [], error: 'Erro interno na busca' }
    }
  }

  /**
   * Buscar documentos pendentes de processamento
   */
  static async getPendentes(
    empresaId?: string,
    userId?: string
  ): Promise<{
    data: DocumentoUnified[]
    error: string | null
  }> {
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('status_processamento', 'pendente')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar pendentes:', error)
        return { data: [], error: error.message }
      }

      return { data: data || [], error: null }
    } catch (error) {
      console.error('Erro na busca de pendentes:', error)
      return { data: [], error: 'Erro interno na busca' }
    }
  }

  /**
   * Upload de arquivo para storage
   */
  static async uploadFile(
    file: File,
    empresaId: string,
    categoria: DocumentCategory
  ): Promise<{
    url: string | null
    path: string | null
    error: string | null
  }> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `documentos/${empresaId}/${categoria}/${fileName}`

      const { data, error } = await supabase.storage
        .from('documentos')
        .upload(filePath, file)

      if (error) {
        console.error('Erro no upload:', error)
        return { url: null, path: null, error: error.message }
      }

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(filePath)

      return {
        url: urlData.publicUrl,
        path: filePath,
        error: null
      }
    } catch (error) {
      console.error('Erro no upload de arquivo:', error)
      return { url: null, path: null, error: 'Erro interno no upload' }
    }
  }
}
