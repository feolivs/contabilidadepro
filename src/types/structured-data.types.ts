/**
 * Tipos estruturados para substituir 'any' no sistema
 * Criado para melhorar type safety e manutenibilidade
 */

// =====================================================
// TIPOS PARA DADOS OCR
// =====================================================

export interface ValorMonetario {
  valor: number;
  descricao: string;
  confidence: number;
  posicao?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DataVencimento {
  data: Date;
  descricao: string;
  confidence: number;
  tipo: 'vencimento' | 'competencia' | 'emissao';
}

export interface InfoEmpresa {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  endereco?: string;
  confidence: number;
}

export interface PrazoFiscalDetectado {
  tipo_obrigacao: string;
  descricao: string;
  data_vencimento: Date;
  valor_estimado?: number;
  competencia?: string;
  codigo_receita?: string;
  confidence: number;
}

export interface DadosEstruturadosOCR {
  valores_monetarios?: ValorMonetario[];
  datas_vencimento?: DataVencimento[];
  informacoes_empresa?: InfoEmpresa;
  prazos_fiscais?: PrazoFiscalDetectado[];
  texto_extraido: string;
  confidence_geral: number;
}

export interface DocumentoMetadata {
  tamanho_arquivo: number;
  tipo_mime: string;
  data_upload: Date;
  usuario_id: string;
  nome_original: string;
  hash_arquivo?: string;
}

export interface DocumentoProcessamento {
  id: string;
  nome: string;
  tipo: string;
  status_processamento: 'pending' | 'processing' | 'completed' | 'error';
  confianca_ocr?: number;
  dados_extraidos?: DadosEstruturadosOCR;
  metadata: DocumentoMetadata;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// TIPOS PARA CONTEXTO IA
// =====================================================

export interface CalculoRecente {
  id: string;
  tipo: 'DAS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS';
  valor: number;
  competencia: string;
  data_calculo: Date;
  status: 'calculado' | 'pago' | 'vencido';
}

export interface DocumentoPendente {
  id: string;
  nome: string;
  tipo: string;
  data_vencimento?: Date;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  status: 'pendente' | 'em_analise' | 'aprovado' | 'rejeitado';
}

export interface PrazoFiscalProximo {
  id: string;
  descricao: string;
  data_vencimento: Date;
  tipo_obrigacao: string;
  valor_estimado?: number;
  status: 'pendente' | 'cumprido' | 'vencido';
  dias_restantes: number;
}

export interface EmpresaContextData {
  id: string;
  nome: string;
  cnpj: string;
  regime_tributario: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
  calculos_recentes: CalculoRecente[];
  documentos_pendentes: DocumentoPendente[];
  prazos_proximos: PrazoFiscalProximo[];
  situacao_fiscal: 'regular' | 'irregular' | 'suspensa';
  ultima_atualizacao: Date;
}

export interface UsuarioContextData {
  id: string;
  nome: string;
  email: string;
  tipo: 'contador' | 'cliente' | 'admin';
  empresas_vinculadas: string[];
  preferencias: {
    tema: 'light' | 'dark' | 'system';
    notificacoes: boolean;
    idioma: string;
  };
  ultima_atividade: Date;
}

export interface SistemaContextData {
  versao: string;
  ambiente: 'development' | 'staging' | 'production';
  features_ativas: string[];
  manutencao_programada?: Date;
  status_servicos: {
    ocr: 'online' | 'offline' | 'degraded';
    ia: 'online' | 'offline' | 'degraded';
    banco_dados: 'online' | 'offline' | 'degraded';
  };
}

export interface ContextDataIA {
  empresa?: EmpresaContextData;
  usuario?: UsuarioContextData;
  sistema?: SistemaContextData;
  sessao: {
    id: string;
    inicio: Date;
    ultima_interacao: Date;
    mensagens_count: number;
  };
}

// =====================================================
// TIPOS PARA FILTROS E CONSULTAS
// =====================================================

export interface DocumentoFiltros {
  periodo?: 'current_month' | 'last_3_months' | 'last_6_months' | 'current_year';
  tipos?: string[];
  categorias?: ('fiscal' | 'contabil' | 'societario' | 'bancario')[];
  status?: string[];
  valorMinimo?: number;
  valorMaximo?: number;
  empresaId?: string;
}

export interface ConsultaParametros {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filtros?: DocumentoFiltros;
}

// =====================================================
// TIPOS PARA RESPOSTAS DE API
// =====================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface ProcessingResult {
  success: boolean;
  processingTime: number;
  confidence: number;
  warnings?: string[];
  errors?: string[];
}
