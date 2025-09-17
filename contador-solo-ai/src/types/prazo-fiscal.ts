// =====================================================
// TIPOS PARA PRAZOS FISCAIS - NEXT.JS 15 OPTIMIZED
// =====================================================

export type StatusPrazo = 
  | 'pendente' 
  | 'entregue' 
  | 'vencida' 
  | 'nao_se_aplica'

export type PrioridadePrazo = 
  | 'baixa' 
  | 'media' 
  | 'alta' 
  | 'critica'

export type SituacaoPrazo = 
  | 'vencida' 
  | 'proxima' 
  | 'futura'

export type TipoObrigacao = 
  | 'DAS' 
  | 'DCTF' 
  | 'ECF' 
  | 'SPED' 
  | 'DEFIS' 
  | 'DIRF' 
  | 'RAIS' 
  | 'CAGED' 
  | 'GPS' 
  | 'FGTS'
  | 'ICMS'
  | 'ISS'
  | 'IRPJ'
  | 'CSLL'
  | 'PIS'
  | 'COFINS'

export type FrequenciaPrazo = 
  | 'mensal' 
  | 'trimestral' 
  | 'semestral' 
  | 'anual'

export type EsferaPrazo = 
  | 'federal' 
  | 'estadual' 
  | 'municipal'

export type CategoriaObrigacao = 
  | 'declaracao' 
  | 'pagamento' 
  | 'informativa' 
  | 'escrituracao'

// =====================================================
// INTERFACES PRINCIPAIS
// =====================================================

export interface PrazoFiscal {
  id: string
  empresa_id: string
  obligation_type: TipoObrigacao
  category: CategoriaObrigacao
  name: string
  description?: string
  code?: string
  due_date: string // ISO date string
  frequency: FrequenciaPrazo
  next_due_date?: string
  status: StatusPrazo
  priority: PrioridadePrazo
  estimated_amount?: number
  penalty_amount?: number
  interest_rate?: number
  alert_days_before: number
  alert_sent: boolean
  alert_sent_at?: string
  completed_at?: string
  completed_by?: string
  completion_notes?: string
  obligation_data: Record<string, any>
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  
  // Campos adicionais para cálculos
  tax_amount?: number
  document_url?: string
  document_number?: string
  bar_code?: string
  generated_at?: string
  gross_revenue?: number
  
  // Relacionamentos
  empresa?: {
    id: string
    nome: string
    cnpj?: string
    regime_tributario?: string
  }
  
  // Campos calculados
  situacao?: SituacaoPrazo
  dias_para_vencimento?: number
  valor_total?: number
}

// =====================================================
// INTERFACES PARA VIEWS AGREGADAS
// =====================================================

export interface ObrigacaoFiscalView {
  id: string
  empresa_id: string
  empresa_nome: string
  tipo_obrigacao: TipoObrigacao
  nome: string
  descricao?: string
  data_vencimento: string
  valor?: number
  status: StatusPrazo
  prioridade: PrioridadePrazo
  created_at: string
  situacao: SituacaoPrazo
}

export interface PrazoFiscalAgregado {
  empresa_id: string
  empresa_nome: string
  tipo_obrigacao: TipoObrigacao
  data_vencimento: string
  status: StatusPrazo
  situacao: SituacaoPrazo
  total_obrigacoes: number
  valor_total: number
}

// =====================================================
// INTERFACES PARA FORMULÁRIOS
// =====================================================

export interface CriarPrazoFiscalInput {
  empresa_id: string
  obligation_type: TipoObrigacao
  category: CategoriaObrigacao
  name: string
  description?: string
  code?: string
  due_date: string
  frequency: FrequenciaPrazo
  priority: PrioridadePrazo
  estimated_amount?: number
  alert_days_before?: number
  obligation_data?: Record<string, any>
  metadata?: Record<string, any>
}

export interface AtualizarPrazoFiscalInput {
  name?: string
  description?: string
  due_date?: string
  priority?: PrioridadePrazo
  estimated_amount?: number
  alert_days_before?: number
  status?: StatusPrazo
  completion_notes?: string
  obligation_data?: Record<string, any>
  metadata?: Record<string, any>
}

// =====================================================
// INTERFACES PARA UPLOAD E PROCESSAMENTO
// =====================================================

export interface DocumentoUploadPrazo {
  arquivo: File
  empresa_id: string
  tipo_documento: string
  numero_documento?: string
  data_emissao?: string
  valor_total?: number
  observacoes?: string
  auto_extract_prazo?: boolean
}

export interface ResultadoExtracao {
  success: boolean
  extracted_data: {
    tipo_obrigacao?: TipoObrigacao
    data_vencimento?: string
    valor?: number
    codigo_barras?: string
    numero_documento?: string
    confidence_score: number
  }
  prazos_identificados: PrazoFiscalDetectado[]
  errors?: string[]
}

export interface PrazoFiscalDetectado {
  tipo_obrigacao: TipoObrigacao
  data_vencimento: string
  valor?: number
  confidence: number
  source_text: string
  position: {
    x: number
    y: number
    width: number
    height: number
  }
}

// =====================================================
// INTERFACES PARA FILTROS E BUSCA
// =====================================================

export interface FiltrosPrazos {
  empresa_id?: string
  status?: StatusPrazo[]
  priority?: PrioridadePrazo[]
  situacao?: SituacaoPrazo[]
  tipo_obrigacao?: TipoObrigacao[]
  data_inicio?: string
  data_fim?: string
  search?: string
}

export interface OrdenacaoPrazos {
  campo: 'due_date' | 'priority' | 'estimated_amount' | 'created_at'
  direcao: 'asc' | 'desc'
}

// =====================================================
// INTERFACES PARA ESTATÍSTICAS
// =====================================================

export interface EstatisticasPrazos {
  total_prazos: number
  prazos_vencidos: number
  prazos_proximos: number
  prazos_futuros: number
  valor_total_estimado: number
  valor_vencido: number
  valor_proximo: number
  por_tipo: Record<string, {
    total: number
    valor: number
    vencidos: number
  }>
  por_empresa: Record<string, {
    nome: string
    total: number
    valor: number
    vencidos: number
  }>
  por_mes: Record<string, {
    total: number
    valor: number
  }>
}

// =====================================================
// INTERFACES PARA NOTIFICAÇÕES
// =====================================================

export interface ConfiguracaoAlerta {
  id: string
  user_id: string
  empresa_id?: string
  tipo_obrigacao?: TipoObrigacao[]
  dias_antecedencia: number
  email_enabled: boolean
  push_enabled: boolean
  sms_enabled: boolean
  horario_envio: string // HH:mm format
  dias_semana: number[] // 0-6, Sunday = 0
  ativo: boolean
  created_at: string
  updated_at: string
}

export interface NotificacaoPrazo {
  id: string
  prazo_fiscal_id: string
  user_id: string
  tipo: 'email' | 'push' | 'sms'
  titulo: string
  mensagem: string
  enviado_em?: string
  lido_em?: string
  acao_tomada?: string
  metadata: Record<string, any>
  created_at: string
}

// =====================================================
// INTERFACES PARA CALENDÁRIO
// =====================================================

export interface EventoCalendario {
  id: string
  title: string
  date: string
  type: 'prazo' | 'vencimento' | 'alerta'
  priority: PrioridadePrazo
  status: StatusPrazo
  empresa: string
  valor?: number
  description?: string
  color: string
  prazo_fiscal: PrazoFiscal
}

export interface VisaoCalendario {
  mes: number
  ano: number
  eventos: EventoCalendario[]
  estatisticas: {
    total_eventos: number
    eventos_criticos: number
    valor_total: number
  }
}

// =====================================================
// TYPES PARA HOOKS E QUERIES
// =====================================================

export interface UsePrazosOptions {
  filtros?: FiltrosPrazos
  ordenacao?: OrdenacaoPrazos
  limite?: number
  pagina?: number
  enabled?: boolean
}

export interface UsePrazosResult {
  prazos: PrazoFiscal[]
  total: number
  isLoading: boolean
  error: Error | null
  refetch: () => void
  hasNextPage: boolean
  fetchNextPage: () => void
}

// =====================================================
// CONSTANTS
// =====================================================

export const TIPOS_OBRIGACAO_LABELS: Record<TipoObrigacao, string> = {
  'DAS': 'DAS - Simples Nacional',
  'DCTF': 'DCTF - Declaração de Débitos e Créditos Tributários Federais',
  'ECF': 'ECF - Escrituração Contábil Fiscal',
  'SPED': 'SPED - Sistema Público de Escrituração Digital',
  'DEFIS': 'DEFIS - Declaração de Informações Socioeconômicas e Fiscais',
  'DIRF': 'DIRF - Declaração do Imposto de Renda Retido na Fonte',
  'RAIS': 'RAIS - Relação Anual de Informações Sociais',
  'CAGED': 'CAGED - Cadastro Geral de Empregados e Desempregados',
  'GPS': 'GPS - Guia da Previdência Social',
  'FGTS': 'FGTS - Fundo de Garantia do Tempo de Serviço',
  'ICMS': 'ICMS - Imposto sobre Circulação de Mercadorias e Serviços',
  'ISS': 'ISS - Imposto sobre Serviços',
  'IRPJ': 'IRPJ - Imposto de Renda Pessoa Jurídica',
  'CSLL': 'CSLL - Contribuição Social sobre o Lucro Líquido',
  'PIS': 'PIS - Programa de Integração Social',
  'COFINS': 'COFINS - Contribuição para o Financiamento da Seguridade Social'
}

export const STATUS_PRAZO_LABELS: Record<StatusPrazo, string> = {
  'pendente': 'Pendente',
  'entregue': 'Entregue',
  'vencida': 'Vencida',
  'nao_se_aplica': 'Não se Aplica'
}

export const PRIORIDADE_PRAZO_LABELS: Record<PrioridadePrazo, string> = {
  'baixa': 'Baixa',
  'media': 'Média',
  'alta': 'Alta',
  'critica': 'Crítica'
}

export const SITUACAO_PRAZO_LABELS: Record<SituacaoPrazo, string> = {
  'vencida': 'Vencida',
  'proxima': 'Próxima (7 dias)',
  'futura': 'Futura'
}
