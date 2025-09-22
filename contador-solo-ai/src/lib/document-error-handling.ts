import { toast } from 'sonner'
import type { StatusProcessamento } from '@/types/documento'

/**
 * Tipos de erro específicos para processamento de documentos
 */
export enum DocumentErrorType {
  // Upload errors
  UPLOAD_FAILED = 'upload_failed',
  FILE_TOO_LARGE = 'file_too_large',
  INVALID_FILE_TYPE = 'invalid_file_type',
  STORAGE_QUOTA_EXCEEDED = 'storage_quota_exceeded',
  
  // Processing errors
  OCR_FAILED = 'ocr_failed',
  AI_ANALYSIS_FAILED = 'ai_analysis_failed',
  VALIDATION_FAILED = 'validation_failed',
  TIMEOUT = 'timeout',
  
  // Network errors
  NETWORK_ERROR = 'network_error',
  API_RATE_LIMIT = 'api_rate_limit',
  AUTHENTICATION_ERROR = 'authentication_error',
  
  // System errors
  INSUFFICIENT_CREDITS = 'insufficient_credits',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Severidade do erro
 */
export enum ErrorSeverity {
  LOW = 'low',           // Erro menor, usuário pode continuar
  MEDIUM = 'medium',     // Erro que afeta funcionalidade mas não bloqueia
  HIGH = 'high',         // Erro que bloqueia funcionalidade importante
  CRITICAL = 'critical'  // Erro que bloqueia completamente o sistema
}

/**
 * Interface para erro de documento estruturado
 */
export interface DocumentError {
  type: DocumentErrorType
  severity: ErrorSeverity
  message: string
  userMessage: string
  technicalDetails?: string
  suggestions: string[]
  canRetry: boolean
  retryDelay?: number // em segundos
  maxRetries?: number
  context?: {
    documentId?: string
    fileName?: string
    fileSize?: number
    processingStage?: string
    userId?: string
    timestamp: string
  }
}

/**
 * Configuração de retry para diferentes tipos de erro
 */
const RETRY_CONFIG: Record<DocumentErrorType, { canRetry: boolean; maxRetries: number; delay: number }> = {
  [DocumentErrorType.UPLOAD_FAILED]: { canRetry: true, maxRetries: 3, delay: 2 },
  [DocumentErrorType.FILE_TOO_LARGE]: { canRetry: false, maxRetries: 0, delay: 0 },
  [DocumentErrorType.INVALID_FILE_TYPE]: { canRetry: false, maxRetries: 0, delay: 0 },
  [DocumentErrorType.STORAGE_QUOTA_EXCEEDED]: { canRetry: false, maxRetries: 0, delay: 0 },
  [DocumentErrorType.OCR_FAILED]: { canRetry: true, maxRetries: 2, delay: 5 },
  [DocumentErrorType.AI_ANALYSIS_FAILED]: { canRetry: true, maxRetries: 2, delay: 3 },
  [DocumentErrorType.VALIDATION_FAILED]: { canRetry: true, maxRetries: 1, delay: 1 },
  [DocumentErrorType.TIMEOUT]: { canRetry: true, maxRetries: 2, delay: 10 },
  [DocumentErrorType.NETWORK_ERROR]: { canRetry: true, maxRetries: 3, delay: 5 },
  [DocumentErrorType.API_RATE_LIMIT]: { canRetry: true, maxRetries: 1, delay: 60 },
  [DocumentErrorType.AUTHENTICATION_ERROR]: { canRetry: true, maxRetries: 1, delay: 2 },
  [DocumentErrorType.INSUFFICIENT_CREDITS]: { canRetry: false, maxRetries: 0, delay: 0 },
  [DocumentErrorType.SERVICE_UNAVAILABLE]: { canRetry: true, maxRetries: 2, delay: 30 },
  [DocumentErrorType.UNKNOWN_ERROR]: { canRetry: true, maxRetries: 1, delay: 5 }
}

/**
 * Analisa um erro e retorna informações estruturadas
 */
export function analyzeDocumentError(
  error: Error | string,
  context?: Partial<DocumentError['context']>
): DocumentError {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorStack = typeof error === 'string' ? undefined : error.stack
  
  // Detectar tipo de erro baseado na mensagem
  const errorType = detectErrorType(errorMessage)
  const retryConfig = RETRY_CONFIG[errorType]
  
  return {
    type: errorType,
    severity: getErrorSeverity(errorType),
    message: errorMessage,
    userMessage: getUserFriendlyMessage(errorType, errorMessage),
    technicalDetails: errorStack,
    suggestions: getErrorSuggestions(errorType),
    canRetry: retryConfig.canRetry,
    retryDelay: retryConfig.delay,
    maxRetries: retryConfig.maxRetries,
    context: {
      ...context,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Detecta o tipo de erro baseado na mensagem
 */
function detectErrorType(message: string): DocumentErrorType {
  const lowerMessage = message.toLowerCase()
  
  // Upload errors
  if (lowerMessage.includes('file too large') || lowerMessage.includes('arquivo muito grande')) {
    return DocumentErrorType.FILE_TOO_LARGE
  }
  if (lowerMessage.includes('invalid file type') || lowerMessage.includes('tipo de arquivo inválido')) {
    return DocumentErrorType.INVALID_FILE_TYPE
  }
  if (lowerMessage.includes('storage quota') || lowerMessage.includes('cota de armazenamento')) {
    return DocumentErrorType.STORAGE_QUOTA_EXCEEDED
  }
  if (lowerMessage.includes('upload') && lowerMessage.includes('failed')) {
    return DocumentErrorType.UPLOAD_FAILED
  }
  
  // Processing errors
  if (lowerMessage.includes('ocr') && (lowerMessage.includes('failed') || lowerMessage.includes('falhou'))) {
    return DocumentErrorType.OCR_FAILED
  }
  if (lowerMessage.includes('ai analysis') || lowerMessage.includes('análise ia')) {
    return DocumentErrorType.AI_ANALYSIS_FAILED
  }
  if (lowerMessage.includes('validation') || lowerMessage.includes('validação')) {
    return DocumentErrorType.VALIDATION_FAILED
  }
  if (lowerMessage.includes('timeout') || lowerMessage.includes('tempo esgotado')) {
    return DocumentErrorType.TIMEOUT
  }
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('rede')) {
    return DocumentErrorType.NETWORK_ERROR
  }
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('limite de taxa')) {
    return DocumentErrorType.API_RATE_LIMIT
  }
  if (lowerMessage.includes('authentication') || lowerMessage.includes('autenticação')) {
    return DocumentErrorType.AUTHENTICATION_ERROR
  }
  
  // System errors
  if (lowerMessage.includes('insufficient credits') || lowerMessage.includes('créditos insuficientes')) {
    return DocumentErrorType.INSUFFICIENT_CREDITS
  }
  if (lowerMessage.includes('service unavailable') || lowerMessage.includes('serviço indisponível')) {
    return DocumentErrorType.SERVICE_UNAVAILABLE
  }
  
  return DocumentErrorType.UNKNOWN_ERROR
}

/**
 * Determina a severidade do erro
 */
function getErrorSeverity(errorType: DocumentErrorType): ErrorSeverity {
  switch (errorType) {
    case DocumentErrorType.FILE_TOO_LARGE:
    case DocumentErrorType.INVALID_FILE_TYPE:
      return ErrorSeverity.LOW
      
    case DocumentErrorType.UPLOAD_FAILED:
    case DocumentErrorType.VALIDATION_FAILED:
    case DocumentErrorType.NETWORK_ERROR:
      return ErrorSeverity.MEDIUM
      
    case DocumentErrorType.OCR_FAILED:
    case DocumentErrorType.AI_ANALYSIS_FAILED:
    case DocumentErrorType.TIMEOUT:
    case DocumentErrorType.API_RATE_LIMIT:
      return ErrorSeverity.HIGH
      
    case DocumentErrorType.STORAGE_QUOTA_EXCEEDED:
    case DocumentErrorType.INSUFFICIENT_CREDITS:
    case DocumentErrorType.SERVICE_UNAVAILABLE:
    case DocumentErrorType.AUTHENTICATION_ERROR:
      return ErrorSeverity.CRITICAL
      
    default:
      return ErrorSeverity.MEDIUM
  }
}

/**
 * Gera mensagem amigável para o usuário
 */
function getUserFriendlyMessage(errorType: DocumentErrorType, originalMessage: string): string {
  switch (errorType) {
    case DocumentErrorType.FILE_TOO_LARGE:
      return 'O arquivo é muito grande. O tamanho máximo permitido é 10MB.'
      
    case DocumentErrorType.INVALID_FILE_TYPE:
      return 'Tipo de arquivo não suportado. Use apenas PDF, PNG, JPG ou JPEG.'
      
    case DocumentErrorType.STORAGE_QUOTA_EXCEEDED:
      return 'Cota de armazenamento excedida. Entre em contato com o suporte para aumentar seu limite.'
      
    case DocumentErrorType.UPLOAD_FAILED:
      return 'Falha no upload do arquivo. Verifique sua conexão e tente novamente.'
      
    case DocumentErrorType.OCR_FAILED:
      return 'Não foi possível extrair texto do documento. O arquivo pode estar corrompido ou com baixa qualidade.'
      
    case DocumentErrorType.AI_ANALYSIS_FAILED:
      return 'Falha na análise inteligente do documento. Tente novamente em alguns minutos.'
      
    case DocumentErrorType.VALIDATION_FAILED:
      return 'Os dados extraídos não passaram na validação. Verifique se o documento está legível.'
      
    case DocumentErrorType.TIMEOUT:
      return 'O processamento demorou mais que o esperado. Tente novamente.'
      
    case DocumentErrorType.NETWORK_ERROR:
      return 'Erro de conexão. Verifique sua internet e tente novamente.'
      
    case DocumentErrorType.API_RATE_LIMIT:
      return 'Muitas solicitações em pouco tempo. Aguarde um minuto e tente novamente.'
      
    case DocumentErrorType.AUTHENTICATION_ERROR:
      return 'Erro de autenticação. Faça login novamente.'
      
    case DocumentErrorType.INSUFFICIENT_CREDITS:
      return 'Créditos insuficientes para processar o documento. Verifique seu plano.'
      
    case DocumentErrorType.SERVICE_UNAVAILABLE:
      return 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.'
      
    default:
      return 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.'
  }
}

/**
 * Gera sugestões de solução para o erro
 */
function getErrorSuggestions(errorType: DocumentErrorType): string[] {
  switch (errorType) {
    case DocumentErrorType.FILE_TOO_LARGE:
      return [
        'Comprima o arquivo PDF ou reduza a qualidade da imagem',
        'Divida documentos grandes em partes menores',
        'Use ferramentas online para reduzir o tamanho do arquivo'
      ]
      
    case DocumentErrorType.INVALID_FILE_TYPE:
      return [
        'Converta o arquivo para PDF, PNG, JPG ou JPEG',
        'Verifique se a extensão do arquivo está correta',
        'Tire uma foto do documento se for um arquivo físico'
      ]
      
    case DocumentErrorType.OCR_FAILED:
      return [
        'Verifique se o documento está legível e bem iluminado',
        'Tente escanear o documento em maior resolução',
        'Certifique-se de que o texto não está muito pequeno ou borrado'
      ]
      
    case DocumentErrorType.NETWORK_ERROR:
      return [
        'Verifique sua conexão com a internet',
        'Tente usar uma rede mais estável',
        'Aguarde alguns minutos e tente novamente'
      ]
      
    case DocumentErrorType.TIMEOUT:
      return [
        'Tente processar um arquivo menor primeiro',
        'Aguarde alguns minutos antes de tentar novamente',
        'Verifique se sua conexão está estável'
      ]
      
    default:
      return [
        'Tente novamente em alguns minutos',
        'Verifique sua conexão com a internet',
        'Entre em contato com o suporte se o problema persistir'
      ]
  }
}

/**
 * Exibe notificação de erro apropriada
 */
export function showErrorNotification(error: DocumentError): void {
  const duration = error.severity === ErrorSeverity.CRITICAL ? 10000 : 5000
  
  switch (error.severity) {
    case ErrorSeverity.LOW:
      toast.warning(error.userMessage, { duration })
      break
      
    case ErrorSeverity.MEDIUM:
      toast.error(error.userMessage, { duration })
      break
      
    case ErrorSeverity.HIGH:
    case ErrorSeverity.CRITICAL:
      toast.error(error.userMessage, {
        duration,
        description: error.suggestions[0] // Primeira sugestão como descrição
      })
      break
  }
}

/**
 * Determina se deve atualizar o status do documento para erro
 */
export function shouldUpdateDocumentStatus(error: DocumentError): StatusProcessamento | null {
  switch (error.type) {
    case DocumentErrorType.FILE_TOO_LARGE:
    case DocumentErrorType.INVALID_FILE_TYPE:
      return 'rejeitado'
      
    case DocumentErrorType.OCR_FAILED:
    case DocumentErrorType.AI_ANALYSIS_FAILED:
    case DocumentErrorType.VALIDATION_FAILED:
    case DocumentErrorType.TIMEOUT:
      return 'erro'
      
    case DocumentErrorType.STORAGE_QUOTA_EXCEEDED:
    case DocumentErrorType.INSUFFICIENT_CREDITS:
    case DocumentErrorType.SERVICE_UNAVAILABLE:
      return 'erro'
      
    default:
      return null // Não atualizar status para erros temporários
  }
}

/**
 * Gera delay exponencial para retry
 */
export function calculateRetryDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt - 1), 300) // Max 5 minutos
}
