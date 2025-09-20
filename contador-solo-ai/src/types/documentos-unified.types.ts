/**
 * Tipos TypeScript para a tabela documentos_unified
 * Gerado automaticamente baseado no schema do banco
 */

export type DocumentCategory = 'fiscal' | 'contabil' | 'societario' | 'bancario'

export type UnifiedProcessingStatus = 'pendente' | 'processando' | 'processado' | 'erro' | 'rejeitado'

export interface DocumentoUnified {
  id: string
  empresa_id?: string
  user_id?: string
  
  // Categorização
  categoria: DocumentCategory
  tipo_documento: string
  subtipo_documento?: string
  
  // Metadados do arquivo
  arquivo_nome: string
  arquivo_tamanho?: number
  arquivo_tipo?: string
  arquivo_url?: string
  arquivo_path?: string
  arquivo_hash?: string
  
  // Identificação do documento
  numero_documento?: string
  serie?: string
  chave_acesso?: string
  codigo_barras?: string
  
  // Processamento
  status_processamento: UnifiedProcessingStatus
  data_processamento?: string
  metodo_processamento?: string
  
  // Dados extraídos
  dados_extraidos: Record<string, any>
  confianca_extracao?: number
  
  // Campos calculados automaticamente
  valor_total?: number
  data_documento?: string
  ano_fiscal?: number
  mes_fiscal?: number
  competencia_fiscal?: string
  
  // Validação manual
  validado_manualmente: boolean
  validado_por?: string
  validado_em?: string
  observacoes_validacao?: string
  
  // Metadados
  tags: string[]
  observacoes?: string
  prioridade: number
  
  // Auditoria
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  
  // Soft delete
  deleted_at?: string
  deleted_by?: string
}

export interface DocumentoUnifiedInsert {
  empresa_id?: string
  user_id?: string
  categoria: DocumentCategory
  tipo_documento: string
  subtipo_documento?: string
  arquivo_nome: string
  arquivo_tamanho?: number
  arquivo_tipo?: string
  arquivo_url?: string
  arquivo_path?: string
  arquivo_hash?: string
  numero_documento?: string
  serie?: string
  chave_acesso?: string
  codigo_barras?: string
  status_processamento?: UnifiedProcessingStatus
  data_processamento?: string
  metodo_processamento?: string
  dados_extraidos?: Record<string, any>
  confianca_extracao?: number
  competencia_fiscal?: string
  validado_manualmente?: boolean
  validado_por?: string
  validado_em?: string
  observacoes_validacao?: string
  tags?: string[]
  observacoes?: string
  prioridade?: number
  created_by?: string
}

export interface DocumentoUnifiedUpdate {
  categoria?: DocumentCategory
  tipo_documento?: string
  subtipo_documento?: string
  arquivo_nome?: string
  arquivo_tamanho?: number
  arquivo_tipo?: string
  arquivo_url?: string
  arquivo_path?: string
  arquivo_hash?: string
  numero_documento?: string
  serie?: string
  chave_acesso?: string
  codigo_barras?: string
  status_processamento?: UnifiedProcessingStatus
  data_processamento?: string
  metodo_processamento?: string
  dados_extraidos?: Record<string, any>
  confianca_extracao?: number
  competencia_fiscal?: string
  validado_manualmente?: boolean
  validado_por?: string
  validado_em?: string
  observacoes_validacao?: string
  tags?: string[]
  observacoes?: string
  prioridade?: number
  updated_by?: string
}

export interface DocumentoSearchParams {
  user_id?: string
  empresa_id?: string
  search_term?: string
  categoria?: DocumentCategory
  tipo_documento?: string
  status?: UnifiedProcessingStatus
  ano_fiscal?: number
  mes_fiscal?: number
  limit?: number
  offset?: number
}

export interface DocumentoSearchResult {
  id: string
  arquivo_nome: string
  tipo_documento: string
  categoria: DocumentCategory
  status_processamento: UnifiedProcessingStatus
  valor_total?: number
  data_documento?: string
  created_at: string
  relevance: number
}

export interface DocumentoStats {
  owner_id: string
  categoria: DocumentCategory
  tipo_documento: string
  status_processamento: UnifiedProcessingStatus
  document_count: number
  avg_confidence?: number
  total_value?: number
  first_document: string
  last_document: string
  validated_count: number
  processed_count: number
  error_count: number
}

// Utilitários de validação
export const isValidDocumentCategory = (category: string): category is DocumentCategory => {
  return ['fiscal', 'contabil', 'societario', 'bancario'].includes(category)
}

export const isValidProcessingStatus = (status: string): status is UnifiedProcessingStatus => {
  return ['pendente', 'processando', 'processado', 'erro', 'rejeitado'].includes(status)
}

// Mapeamento de categorias por tipo de documento
export const getCategoryByTipoDocumento = (tipoDocumento: string): DocumentCategory => {
  const tipo = tipoDocumento.toLowerCase()
  
  if (tipo.includes('nf') || tipo.includes('fiscal') || tipo.includes('das') || tipo.includes('irpj')) {
    return 'fiscal'
  }
  
  if (tipo.includes('contrato') || tipo.includes('ata') || tipo.includes('estatuto')) {
    return 'societario'
  }
  
  if (tipo.includes('extrato') || tipo.includes('boleto') || tipo.includes('transferencia')) {
    return 'bancario'
  }
  
  return 'contabil'
}

// Formatadores
export const formatDocumentValue = (value?: number): string => {
  if (!value) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const formatDocumentDate = (date?: string): string => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export const getStatusColor = (status: UnifiedProcessingStatus): string => {
  const colors = {
    pendente: 'yellow',
    processando: 'blue',
    processado: 'green',
    erro: 'red',
    rejeitado: 'gray'
  }
  return colors[status] || 'gray'
}

export const getCategoryIcon = (categoria: DocumentCategory): string => {
  const icons = {
    fiscal: '📊',
    contabil: '📋',
    societario: '🏢',
    bancario: '🏦'
  }
  return icons[categoria] || '📄'
}

// Constantes
export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'fiscal', label: 'Fiscal' },
  { value: 'contabil', label: 'Contábil' },
  { value: 'societario', label: 'Societário' },
  { value: 'bancario', label: 'Bancário' }
]

export const PROCESSING_STATUSES: { value: UnifiedProcessingStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'processando', label: 'Processando' },
  { value: 'processado', label: 'Processado' },
  { value: 'erro', label: 'Erro' },
  { value: 'rejeitado', label: 'Rejeitado' }
]

export const COMMON_DOCUMENT_TYPES = [
  'NFe', 'NFCe', 'NFSe', 'CTe', 'Recibo', 'Contrato', 'Boleto', 
  'Extrato', 'DAS', 'IRPJ', 'CSLL', 'PIS', 'COFINS', 'Outro'
]
