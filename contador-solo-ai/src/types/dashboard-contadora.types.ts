/**
 * Tipos específicos para dashboard da contadora
 * Focado em informações práticas e acionáveis
 */

// =====================================================
// TIPOS PARA OBRIGAÇÕES E PRAZOS FISCAIS
// =====================================================

export interface ObrigacaoFiscal {
  id: string
  empresa_id: string
  empresa_nome: string
  tipo_obrigacao: string
  nome: string
  descricao: string
  data_vencimento: string
  valor: number | null
  status: 'pendente' | 'entregue' | 'vencida' | 'nao_se_aplica'
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  situacao: 'vencida' | 'proxima' | 'futura'
  created_at: string
}

export interface PrazoFiscal {
  empresa_id: string
  empresa_nome: string
  tipo_obrigacao: string
  data_vencimento: string
  status: string
  situacao: string
  total_obrigacoes: number
  valor_total: number
}

// =====================================================
// TIPOS PARA EMPRESAS E CLIENTES
// =====================================================

export interface EmpresaResumo {
  id: string
  nome: string
  nome_fantasia: string | null
  cnpj: string
  regime_tributario: string
  status: string
  ativa: boolean
  proximos_vencimentos: number
  valor_pendente: number
  ultima_atividade: string
}

// =====================================================
// TIPOS PARA CÁLCULOS FISCAIS
// =====================================================

export interface CalculoFiscal {
  id: string
  empresa_id: string
  empresa_nome: string
  tipo_calculo: string
  competencia: string
  valor_total: number
  data_vencimento: string | null
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado'
  created_at: string
}

// =====================================================
// TIPOS PARA DOCUMENTOS
// =====================================================

export interface DocumentoResumo {
  id: string
  empresa_id: string
  empresa_nome: string
  tipo_documento: string
  arquivo_nome: string
  status_processamento: 'pendente' | 'processando' | 'processado' | 'erro'
  valor_total: number | null
  data_emissao: string | null
  created_at: string
}

// =====================================================
// TIPOS PARA RESUMOS DA DASHBOARD
// =====================================================

export interface ResumoObrigacoes {
  total: number
  vencendo_hoje: number
  vencendo_semana: number
  vencidas: number
  valor_total_pendente: number
}

export interface ResumoEmpresas {
  total_ativas: number
  com_pendencias: number
  em_dia: number
  inativas: number
}

export interface ResumoDocumentos {
  total_mes: number
  processados_hoje: number
  pendentes: number
  com_erro: number
}

export interface ResumoCalculos {
  realizados_mes: number
  pendentes_pagamento: number
  vencidos: number
  valor_total_mes: number
}

// =====================================================
// TIPOS PARA CALENDÁRIO FISCAL
// =====================================================

export interface EventoCalendario {
  id: string
  titulo: string
  descricao: string
  data: string
  tipo: 'obrigacao' | 'vencimento' | 'feriado' | 'lembrete'
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  empresa_nome?: string
  valor?: number
  status: string
}

// =====================================================
// TIPOS PARA ALERTAS E NOTIFICAÇÕES
// =====================================================

export interface AlertaFiscal {
  id: string
  tipo: 'vencimento' | 'atraso' | 'documento' | 'calculo' | 'sistema'
  titulo: string
  mensagem: string
  prioridade: 'baixa' | 'media' | 'alta' | 'critica'
  data_criacao: string
  data_vencimento?: string
  empresa_nome?: string
  valor?: number
  lido: boolean
  acao_sugerida?: string
}

// =====================================================
// TIPOS PARA ATIVIDADES RECENTES
// =====================================================

export interface AtividadeRecente {
  id: string
  tipo: 'calculo' | 'documento' | 'obrigacao' | 'empresa'
  descricao: string
  empresa_nome: string
  valor?: number
  data: string
  status: string
  icone: string
}

// =====================================================
// TIPOS PARA MÉTRICAS PRÁTICAS
// =====================================================

export interface MetricasPraticas {
  // Financeiro
  faturamento_clientes_mes: number
  impostos_calculados_mes: number
  impostos_pagos_mes: number
  
  // Operacional
  documentos_processados_mes: number
  calculos_realizados_mes: number
  obrigacoes_entregues_mes: number
  
  // Compliance
  taxa_pontualidade: number // % de obrigações entregues no prazo
  empresas_em_dia: number
  alertas_ativos: number
}

// =====================================================
// TIPOS PARA FILTROS
// =====================================================

export interface FiltrosDashboard {
  periodo: 'hoje' | 'semana' | 'mes' | 'trimestre'
  empresa_id?: string
  regime_tributario?: string
  status?: string[]
  prioridade?: string[]
}

// =====================================================
// TIPOS PARA DADOS CONSOLIDADOS
// =====================================================

export interface DadosDashboard {
  resumo_obrigacoes: ResumoObrigacoes
  resumo_empresas: ResumoEmpresas
  resumo_documentos: ResumoDocumentos
  resumo_calculos: ResumoCalculos
  metricas_praticas: MetricasPraticas
  obrigacoes_proximas: ObrigacaoFiscal[]
  atividades_recentes: AtividadeRecente[]
  alertas_ativos: AlertaFiscal[]
  eventos_calendario: EventoCalendario[]
}
