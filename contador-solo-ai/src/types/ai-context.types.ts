'use client'

// =====================================================
// TIPOS PARA RESULT PATTERN E ERROR HANDLING
// =====================================================

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export class ContextError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any,
    public readonly originalError?: Error,
    public readonly traceId?: string
  ) {
    super(message);
    this.name = 'ContextError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      traceId: this.traceId,
      stack: this.stack,
      originalError: this.originalError?.message
    };
  }
}

// =====================================================
// TIPOS PARA CACHE STRATEGIES
// =====================================================

export interface CacheStrategy {
  ttl: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  invalidationRules: string[];
  maxSize?: number;
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  strategy: string;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  averageResponseTime: number;
  cacheSize: number;
  evictions: number;
}

// =====================================================
// TIPOS PARA PERFORMANCE MONITORING
// =====================================================

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  memoryUsed?: number;
  cacheHit?: boolean;
  errorMessage?: string;
  timestamp: Date;
  traceId?: string;
}

export interface OperationContext {
  userId: string;
  empresaId?: string;
  operation: string;
  startTime: number;
  traceId: string;
}

// =====================================================
// TIPOS PARA LOGGING ESTRUTURADO
// =====================================================

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
  timestamp: Date;
  traceId?: string;
  userId?: string;
  operation?: string;
}

export interface Logger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
}

// =====================================================
// TIPOS PARA RESOURCE MANAGEMENT
// =====================================================

export interface ResourceManager {
  isDestroyed: boolean;
  cleanup(): Promise<void>;
  getResourceUsage(): ResourceUsage;
}

export interface ResourceUsage {
  memoryUsage: number;
  cacheSize: number;
  activeConnections: number;
  uptime: number;
}

// =====================================================
// TIPOS EXISTENTES REEXPORTADOS
// =====================================================

export interface EnhancedAIContext {
  empresaId?: string;
  userId: string;
  includeFinancialData?: boolean;
  includeObligations?: boolean;
  includeDocuments?: boolean;
  includeInsights?: boolean;
  timeRange?: 'current_month' | 'last_3_months' | 'last_year';
}

export interface ContextualData {
  empresa?: any;
  empresas?: any[];
  resumo_geral?: any;
  configuracoes_usuario?: any;
}

// =====================================================
// CONSTANTES PARA CACHE STRATEGIES
// =====================================================

export const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  'empresa-completa': {
    ttl: 15 * 60 * 1000, // 15 min
    priority: 'high',
    invalidationRules: ['empresa-update', 'calculo-new'],
    maxSize: 100
  },
  'calculos-recentes': {
    ttl: 5 * 60 * 1000, // 5 min
    priority: 'critical',
    invalidationRules: ['calculo-new', 'calculo-update'],
    maxSize: 200
  },
  'documentos-insights': {
    ttl: 30 * 60 * 1000, // 30 min
    priority: 'medium',
    invalidationRules: ['documento-new', 'documento-processed'],
    maxSize: 50
  },
  'obrigacoes-pendentes': {
    ttl: 10 * 60 * 1000, // 10 min
    priority: 'high',
    invalidationRules: ['obrigacao-update', 'obrigacao-new'],
    maxSize: 150
  },
  'resumo-geral': {
    ttl: 20 * 60 * 1000, // 20 min
    priority: 'medium',
    invalidationRules: ['empresa-update', 'calculo-new', 'obrigacao-update'],
    maxSize: 50
  }
};

// =====================================================
// ERROR CODES
// =====================================================

export const ERROR_CODES = {
  CONTEXT_COLLECTION_FAILED: 'CONTEXT_COLLECTION_FAILED',
  EMPRESA_FETCH_FAILED: 'EMPRESA_FETCH_FAILED',
  CALCULOS_FETCH_FAILED: 'CALCULOS_FETCH_FAILED',
  OBRIGACOES_FETCH_FAILED: 'OBRIGACOES_FETCH_FAILED',
  DOCUMENTOS_FETCH_FAILED: 'DOCUMENTOS_FETCH_FAILED',
  INSIGHTS_GENERATION_FAILED: 'INSIGHTS_GENERATION_FAILED',
  CACHE_OPERATION_FAILED: 'CACHE_OPERATION_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
