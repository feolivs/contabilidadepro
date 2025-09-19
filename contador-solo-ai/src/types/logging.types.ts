/**
 * Tipos específicos para sistema de logging
 * Substitui 'any' por tipos estruturados e seguros
 */

// =====================================================
// TIPOS BASE PARA LOGGING
// =====================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface BaseLogData {
  timestamp?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  requestId?: string;
}

// =====================================================
// TIPOS PARA DIFERENTES CONTEXTOS DE LOG
// =====================================================

export interface FiscalLogData extends BaseLogData {
  operation: string;
  empresaId?: string;
  tipoCalculo?: 'DAS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS' | 'ISS' | 'ICMS';
  competencia?: string;
  valorCalculado?: number;
  aliquotaAplicada?: number;
  regimeTributario?: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
  success: boolean;
  errorCode?: string;
  executionTime?: number;
}

export interface OCRLogData extends BaseLogData {
  operation: string;
  documentId?: string;
  documentType?: string;
  fileSize?: number;
  fileName?: string;
  extractionMethod?: 'tesseract' | 'openai' | 'google_vision' | 'aws_textract';
  confidence?: number;
  processingTime?: number;
  pagesProcessed?: number;
  success: boolean;
  errorType?: 'file_error' | 'processing_error' | 'api_error' | 'validation_error';
}

export interface APILogData extends BaseLogData {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  statusCode: number;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
  userAgent?: string;
  ipAddress?: string;
  errorMessage?: string;
}

export interface PerformanceLogData extends BaseLogData {
  operation: string;
  duration: number;
  memoryUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  cacheHit?: boolean;
  queryCount?: number;
  slowQuery?: boolean;
  component?: string;
  route?: string;
}

export interface SecurityLogData extends BaseLogData {
  event: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'permission_denied' | 'suspicious_activity';
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  riskScore?: number;
  mfaUsed?: boolean;
  failureReason?: string;
  blockedAction?: string;
}

export interface BusinessLogData extends BaseLogData {
  event: 'empresa_created' | 'empresa_updated' | 'calculo_executed' | 'documento_processed' | 'prazo_vencido';
  empresaId?: string;
  entityId?: string;
  entityType?: string;
  oldValue?: unknown;
  newValue?: unknown;
  impact?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorLogData extends BaseLogData {
  errorType: 'validation' | 'business' | 'system' | 'external' | 'network' | 'database';
  errorCode?: string;
  errorMessage: string;
  stackTrace?: string;
  component?: string;
  function?: string;
  lineNumber?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  userImpact?: string;
  resolution?: string;
}

// =====================================================
// UNION TYPE PARA TODOS OS TIPOS DE LOG DATA
// =====================================================

export type LogData = 
  | FiscalLogData
  | OCRLogData
  | APILogData
  | PerformanceLogData
  | SecurityLogData
  | BusinessLogData
  | ErrorLogData
  | BaseLogData
  | Record<string, unknown>;

// =====================================================
// INTERFACE PRINCIPAL PARA LOG ENTRY
// =====================================================

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: LogData;
  context?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  environment?: 'development' | 'staging' | 'production';
}

// =====================================================
// TIPOS PARA CONFIGURAÇÃO DE LOGGING
// =====================================================

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableFile: boolean;
  remoteEndpoint?: string;
  fileLocation?: string;
  maxFileSize?: number;
  maxFiles?: number;
  enableStructuredLogging: boolean;
  enableSensitiveDataMasking: boolean;
  sensitiveFields: string[];
}

// =====================================================
// TIPOS PARA MÉTRICAS DE LOGGING
// =====================================================

export interface LoggingMetrics {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  logsByContext: Record<string, number>;
  averageLogSize: number;
  errorsPerMinute: number;
  warningsPerMinute: number;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurrence: Date;
  }>;
  performanceImpact: {
    averageLogTime: number;
    maxLogTime: number;
    totalLogTime: number;
  };
}

// =====================================================
// HELPERS PARA TYPE GUARDS
// =====================================================

export function isFiscalLogData(data: LogData): data is FiscalLogData {
  return typeof data === 'object' && data !== null && 'operation' in data && 'success' in data;
}

export function isOCRLogData(data: LogData): data is OCRLogData {
  return typeof data === 'object' && data !== null && 'operation' in data && 'documentId' in data;
}

export function isAPILogData(data: LogData): data is APILogData {
  return typeof data === 'object' && data !== null && 'method' in data && 'url' in data && 'statusCode' in data;
}

export function isErrorLogData(data: LogData): data is ErrorLogData {
  return typeof data === 'object' && data !== null && 'errorType' in data && 'errorMessage' in data;
}

// =====================================================
// CONSTANTES PARA LOGGING
// =====================================================

export const LOG_CONTEXTS = {
  FISCAL: 'fiscal',
  OCR: 'ocr',
  API: 'api',
  PERFORMANCE: 'performance',
  SECURITY: 'security',
  BUSINESS: 'business',
  ERROR: 'error',
  SYSTEM: 'system',
  DATABASE: 'database',
  CACHE: 'cache',
  AUTH: 'auth',
  UPLOAD: 'upload',
  EXPORT: 'export'
} as const;

export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'cnpj',
  'cpf',
  'email',
  'phone',
  'address',
  'credit_card',
  'bank_account'
] as const;
