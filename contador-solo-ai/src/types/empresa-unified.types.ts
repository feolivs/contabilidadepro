// Tipos unificados para a página Empresas & Clientes
// Elimina duplicação entre /clientes e /empresas

// Enums para melhor tipagem
export type RegimeTributario = 
  | 'MEI' 
  | 'Simples Nacional' 
  | 'Lucro Presumido' 
  | 'Lucro Real'

export type StatusEmpresa = 
  | 'ativa' 
  | 'inativa' 
  | 'suspensa'

export type ViewMode = 'table' | 'cards'

export type SimplesAnnex = 'I' | 'II' | 'III' | 'IV' | 'V'

// Interface principal unificada da empresa
export interface EmpresaUnified {
  id: string
  nome: string
  nome_fantasia?: string
  cnpj?: string
  regime_tributario?: RegimeTributario
  atividade_principal?: string
  status?: StatusEmpresa
  ativa: boolean
  email?: string
  telefone?: string
  endereco?: string
  created_at: string
  updated_at: string
  
  // Campos relacionados para a visão unificada (joins otimizados)
  documentos_count?: number
  calculos_count?: number
  prazos_pendentes_count?: number
  
  // Campos adicionais do schema completo
  razao_social?: string
  inscricao_estadual?: string
  inscricao_municipal?: string
  anexo_simples?: SimplesAnnex
  atividades_secundarias?: string[]
  
  // Dados estruturados (JSONB)
  endereco_completo?: {
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    uf?: string
    cep?: string
  }
  
  contato?: {
    email?: string
    telefone?: string
    responsavel?: string
  }
  
  dados_bancarios?: Array<{
    banco?: string
    agencia?: string
    conta?: string
    tipo?: string
  }>

  // Campo de observações
  observacoes?: string
}

// Estatísticas unificadas e melhoradas
export interface EmpresasStats {
  // Estatísticas básicas
  total: number
  ativas: number
  inativas: number
  
  // Por regime tributário
  simplesNacional: number
  lucroPresumido: number
  lucroReal: number
  mei: number
  
  // Percentuais
  percentualSimplesNacional: number
  percentualLucroPresumido: number
  percentualLucroReal: number
  percentualMEI: number
  
  // Temporais
  novasEsteMes: number
  novasEsteAno: number
  crescimentoMensal: number
  crescimentoAnual: number
  
  // Operacionais
  documentosPendentes: number
  calculosPendentes: number
  prazosPendentes: number
  
  // Métricas de engajamento
  empresasComCalculosRecentes: number
  empresasComDocumentosRecentes: number
  
  // Última atualização
  ultimaAtualizacao: string
}

// Filtros avançados unificados
export interface EmpresaFilters {
  // Filtros básicos
  regime: 'all' | RegimeTributario
  status: 'all' | StatusEmpresa
  atividade: 'all' | string
  
  // Filtros temporais
  periodo: 'all' | 'mes' | 'trimestre' | 'semestre' | 'ano'
  dataInicio?: Date
  dataFim?: Date
  
  // Filtros operacionais
  comDocumentosPendentes?: boolean
  comCalculosPendentes?: boolean
  comPrazosPendentes?: boolean
  
  // Filtros de localização
  uf?: string
  cidade?: string
  
  // Busca textual
  busca?: string
  
  // Filtros avançados
  anexoSimples?: SimplesAnnex[]
  faixaReceita?: {
    min?: number
    max?: number
  }
}

// Tipos para ordenação
export type SortField = 'nome' | 'created_at' | 'regime_tributario' | 'ativa'
export type SortDirection = 'asc' | 'desc'

// Opções de ordenação
export interface EmpresaSortOptions {
  field: keyof EmpresaUnified
  direction: 'asc' | 'desc'
}

// Aliases para compatibilidade
export type SortOption = SortField
export type FilterOptions = EmpresaFilters

// Opções de paginação
export interface EmpresaPaginationOptions {
  page: number
  limit: number
  total?: number
}

// Opções de query unificadas
export interface EmpresasQueryOptions {
  filters?: EmpresaFilters
  search?: string
  sort?: EmpresaSortOptions
  pagination?: EmpresaPaginationOptions
  viewMode?: ViewMode
  includeRelated?: boolean
}

// Resultado de query paginado
export interface EmpresasQueryResult {
  data: EmpresaUnified[]
  total: number
  page: number
  limit: number
  hasMore: boolean
  stats?: EmpresasStats
}

// Tipos para formulários
export interface EmpresaFormData {
  nome: string
  nome_fantasia?: string
  cnpj?: string
  regime_tributario: RegimeTributario
  atividade_principal?: string
  status: StatusEmpresa
  email?: string
  telefone?: string
  endereco?: string
  observacoes?: string
}

// Tipos para exportação
export interface EmpresaExportOptions {
  format: 'excel' | 'pdf' | 'csv'
  fields: (keyof EmpresaUnified)[]
  filters?: EmpresaFilters
  includeStats?: boolean
}

// Tipos para validação
export interface EmpresaValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

// Tipos para operações CRUD
export interface CreateEmpresaInput extends Omit<EmpresaFormData, 'status'> {
  ativa?: boolean
}

export interface UpdateEmpresaInput extends Partial<Omit<EmpresaFormData, 'status'>> {
  ativa?: boolean
}

// Tipos para hooks
export interface UseEmpresasOptions extends EmpresasQueryOptions {
  enabled?: boolean
  refetchInterval?: number
}

export interface UseEmpresasResult {
  data: EmpresaUnified[]
  stats: EmpresasStats
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  hasMore: boolean
  loadMore: () => void
}

// Tipos para componentes
export interface EmpresaCardProps {
  empresa: EmpresaUnified
  onEdit?: (empresa: EmpresaUnified) => void
  onDelete?: (empresa: EmpresaUnified) => void
  onView?: (empresa: EmpresaUnified) => void
}

export interface EmpresaTableProps {
  empresas: EmpresaUnified[]
  loading?: boolean
  onSort?: (sort: EmpresaSortOptions) => void
  onEdit?: (empresa: EmpresaUnified) => void
  onDelete?: (empresa: EmpresaUnified) => void
  onView?: (empresa: EmpresaUnified) => void
}

// Tipos para modais
export interface EmpresaModalProps {
  empresa?: EmpresaUnified
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// Constantes tipadas
export const REGIMES_TRIBUTARIOS: Record<RegimeTributario, string> = {
  'MEI': 'Microempreendedor Individual',
  'Simples Nacional': 'Simples Nacional',
  'Lucro Presumido': 'Lucro Presumido',
  'Lucro Real': 'Lucro Real'
}

export const STATUS_EMPRESA: Record<StatusEmpresa, string> = {
  'ativa': 'Ativa',
  'inativa': 'Inativa',
  'suspensa': 'Suspensa'
}

export const ANEXOS_SIMPLES: Record<SimplesAnnex, string> = {
  'I': 'Anexo I - Comércio',
  'II': 'Anexo II - Indústria',
  'III': 'Anexo III - Serviços',
  'IV': 'Anexo IV - Serviços',
  'V': 'Anexo V - Serviços'
}

// Mapeamento de compatibilidade para valores antigos
export const REGIME_MAPPING: Record<string, RegimeTributario> = {
  'simples': 'Simples Nacional',
  'lucro_presumido': 'Lucro Presumido',
  'lucro_real': 'Lucro Real',
  'mei': 'MEI',
  'Simples Nacional': 'Simples Nacional',
  'Lucro Presumido': 'Lucro Presumido',
  'Lucro Real': 'Lucro Real',
  'MEI': 'MEI'
}

// Função utilitária para normalizar regime tributário
export function normalizeRegimeTributario(regime?: string): RegimeTributario | undefined {
  if (!regime) return undefined
  return REGIME_MAPPING[regime] || regime as RegimeTributario
}

// Mapeamento reverso para compatibilidade com código existente
export const REGIME_REVERSE_MAPPING: Record<RegimeTributario, string> = {
  'Simples Nacional': 'simples',
  'Lucro Presumido': 'lucro_presumido',
  'Lucro Real': 'lucro_real',
  'MEI': 'mei'
}
