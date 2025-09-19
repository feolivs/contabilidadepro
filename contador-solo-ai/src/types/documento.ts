export type TipoDocumento =
  | 'NFe'
  | 'NFCe'
  | 'NFSe'
  | 'CTe'
  | 'Recibo'
  | 'Contrato'
  | 'Boleto'
  | 'Extrato'
  | 'Pró-labore'
  | 'Outro'

export type StatusProcessamento =
  | 'pendente'
  | 'processando'
  | 'processado'
  | 'erro'
  | 'rejeitado'
  | 'requer_verificacao'

export interface Documento {
  id: string
  empresa_id: string
  tipo_documento: TipoDocumento
  arquivo_nome: string
  arquivo_tipo: string
  arquivo_tamanho: number
  arquivo_url: string
  arquivo_path: string
  numero_documento?: string
  serie?: string
  data_emissao?: string
  valor_total?: number
  dados_extraidos?: DadosExtraidos
  status_processamento: StatusProcessamento
  data_processamento?: string
  observacoes?: string
  created_at: string
  updated_at: string
  
  // Relacionamentos
  empresa?: {
    id: string
    nome: string
    cnpj?: string
  }
}

export interface DocumentoUpload {
  empresa_id: string
  tipo_documento: TipoDocumento
  arquivo: File
  numero_documento?: string
  serie?: string
  data_emissao?: string
  valor_total?: number
  observacoes?: string
}

export interface DocumentoFilter {
  empresaId?: string
  tipoDocumento?: TipoDocumento
  statusProcessamento?: StatusProcessamento
  searchTerm?: string
  dataInicio?: string
  dataFim?: string
}

export interface DocumentoStats {
  total: number
  processados: number
  pendentes: number
  processando: number
  erros: number
  rejeitados: number
}

// Labels para exibição
export const TIPOS_DOCUMENTO_LABELS: Record<TipoDocumento, string> = {
  'NFe': 'Nota Fiscal Eletrônica',
  'NFCe': 'NFC-e (Cupom Fiscal)',
  'NFSe': 'Nota Fiscal de Serviços',
  'CTe': 'Conhecimento de Transporte',
  'Recibo': 'Recibo',
  'Contrato': 'Contrato',
  'Boleto': 'Boleto Bancário',
  'Extrato': 'Extrato Bancário',
  'Pró-labore': 'Pró-labore',
  'Outro': 'Outro Documento'
}

export const STATUS_PROCESSAMENTO_LABELS: Record<StatusProcessamento, string> = {
  'pendente': 'Pendente',
  'processando': 'Processando',
  'processado': 'Processado',
  'erro': 'Erro',
  'rejeitado': 'Rejeitado',
  'requer_verificacao': 'Requer Verificação'
}

export const STATUS_PROCESSAMENTO_COLORS: Record<StatusProcessamento, string> = {
  'pendente': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30',
  'processando': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30',
  'processado': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30',
  'erro': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
  'rejeitado': 'bg-muted text-muted-foreground border-border',
  'requer_verificacao': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30'
}

export const TIPOS_DOCUMENTO_COLORS: Record<TipoDocumento, string> = {
  'NFe': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30',
  'NFCe': 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/30',
  'NFSe': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30',
  'CTe': 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/30',
  'Recibo': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30',
  'Contrato': 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30',
  'Boleto': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
  'Extrato': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800/30',
  'Pró-labore': 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/30',
  'Outro': 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800/30'
}

// Tipos MIME aceitos para upload
export const TIPOS_ARQUIVO_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]

// Extensões de arquivo aceitas
export const EXTENSOES_ACEITAS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.xls',
  '.xlsx',
  '.csv',
  '.doc',
  '.docx',
  '.txt'
]

// Tamanho máximo do arquivo (10MB)
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024

// Validação de arquivo
export const validarArquivo = (arquivo: File): { valido: boolean; erro?: string } => {
  // Verificar tamanho
  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    return {
      valido: false,
      erro: `Arquivo muito grande. Tamanho máximo permitido: ${Math.round(TAMANHO_MAXIMO_ARQUIVO / 1024 / 1024)}MB`
    }
  }

  // Verificar tipo MIME
  if (!TIPOS_ARQUIVO_ACEITOS.includes(arquivo.type)) {
    return {
      valido: false,
      erro: 'Tipo de arquivo não permitido. Tipos aceitos: PDF, imagens, planilhas, documentos de texto'
    }
  }

  // Verificar extensão
  const extensao = '.' + arquivo.name.split('.').pop()?.toLowerCase()
  if (!EXTENSOES_ACEITAS.includes(extensao)) {
    return {
      valido: false,
      erro: 'Extensão de arquivo não permitida'
    }
  }

  return { valido: true }
}

// Função para detectar tipo de documento baseado no nome do arquivo
export const detectarTipoDocumento = (nomeArquivo: string): TipoDocumento => {
  const nome = nomeArquivo.toLowerCase()

  if (nome.includes('nfe') || nome.includes('nota fiscal eletronica')) {
    return 'NFe'
  }
  if (nome.includes('nfce') || nome.includes('cupom fiscal')) {
    return 'NFCe'
  }
  if (nome.includes('nfse') || nome.includes('nota fiscal servico')) {
    return 'NFSe'
  }
  if (nome.includes('cte') || nome.includes('conhecimento transporte')) {
    return 'CTe'
  }
  if (nome.includes('recibo')) {
    return 'Recibo'
  }
  if (nome.includes('contrato')) {
    return 'Contrato'
  }
  if (nome.includes('boleto')) {
    return 'Boleto'
  }
  if (nome.includes('extrato')) {
    return 'Extrato'
  }
  if (nome.includes('pro labore') || nome.includes('pró-labore') || nome.includes('prolabore') ||
      nome.includes('pro-labore') || nome.includes('administrador') || nome.includes('socio')) {
    return 'Pró-labore'
  }

  return 'Outro'
}

// Interface base para dados extraídos (propriedades comuns)
export interface DadosExtraidosBase {
  confidence?: number;
  numero_documento?: string;
  valor_total?: number;
  data_emissao?: string;
  empresa_emitente?: string;
  cnpj_emitente?: string;
  descricao?: string;
  extraction_method?: string;
  extraction_confidence?: number;
  text_quality?: number;
  processingTime?: number;
  ocr_method?: string;
  ocr_confidence?: number;
  text_extraction_quality?: number;
}

// Interface para dados extraídos de NFe
export interface DadosNFe {
  chaveAcesso: string
  numeroNota: string
  serie: string
  dataEmissao: string
  valorTotal: number
  valorIcms?: number
  valorIpi?: number
  valorPis?: number
  valorCofins?: number
  cnpjEmitente: string
  nomeEmitente: string
  cnpjDestinatario?: string
  nomeDestinatario?: string
  itens?: Array<{
    codigo: string
    descricao: string
    quantidade: number
    valorUnitario: number
    valorTotal: number
  }>
}

// Interface para dados extraídos de NFSe
export interface DadosNFSe {
  numeroRps: string
  serieRps: string
  numeroNfse?: string
  dataEmissao: string
  valorServicos: number
  valorIss?: number
  valorPis?: number
  valorCofins?: number
  valorInss?: number
  valorIr?: number
  cnpjPrestador: string
  nomePrestador: string
  cnpjTomador?: string
  nomeTomador?: string
  discriminacaoServicos: string
}

// Interface para dados extraídos de Recibo
export interface DadosRecibo {
  numero?: string
  dataEmissao: string
  valor: number
  pagador: string
  beneficiario: string
  descricao: string
  formaPagamento?: string
}

// Interface para dados extraídos de Boleto
export interface DadosBoleto {
  codigoBarras?: string
  linhaDigitavel?: string
  dataVencimento: string
  valor: number
  cedente: string
  sacado: string
  nossoNumero?: string
  numeroDocumento?: string
}

// Interface para dados extraídos de Extrato
export interface DadosExtrato {
  banco: string
  agencia: string
  conta: string
  periodo: {
    inicio: string
    fim: string
  }
  saldoInicial: number
  saldoFinal: number
  movimentacoes: Array<{
    data: string
    descricao: string
    valor: number
    tipo: 'credito' | 'debito'
  }>
}

// Union type para todos os tipos de dados extraídos
export type DadosExtraidos =
  | (DadosNFe & DadosExtraidosBase)
  | (DadosNFSe & DadosExtraidosBase)
  | (DadosRecibo & DadosExtraidosBase)
  | (DadosBoleto & DadosExtraidosBase)
  | (DadosExtrato & DadosExtraidosBase)
  | (DadosExtraidosBase & Record<string, unknown>);
