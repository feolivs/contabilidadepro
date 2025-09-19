/**
 * Sistema de Logging para ContabilidadePRO
 *
 * Substitui console statements por um sistema estruturado
 * que funciona adequadamente em desenvolvimento e produção
 */

import {
  LogLevel,
  LogEntry,
  LogData,
  FiscalLogData,
  OCRLogData,
  APILogData,
  PerformanceLogData,
  ErrorLogData,
  LoggerConfig,
  LOG_CONTEXTS,
  SENSITIVE_FIELDS
} from '@/types/logging.types';

class Logger {
  private isDev = process.env.NODE_ENV === 'development';
  private isClient = typeof window !== 'undefined';

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: LogData,
    context?: string
  ): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      message,
      data: this.sanitizeLogData(data),
      context,
      environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
      // TODO: Adicionar userId e sessionId quando disponíveis
    };
  }

  private sanitizeLogData(data?: LogData): LogData | undefined {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Remove campos sensíveis
    SENSITIVE_FIELDS.forEach(field => {
      if (field in sanitized) {
        (sanitized as Record<string, unknown>)[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private shouldLog(level: LogLevel): boolean {
    // Em desenvolvimento, logar tudo
    if (this.isDev) return true;

    // Em produção, apenas warn e error
    return level === 'warn' || level === 'error';
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    const message = `${prefix}${contextStr} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        console.debug(message, entry.data);
        break;
      case 'info':
        console.info(message, entry.data);
        break;
      case 'warn':
        console.warn(message, entry.data);
        break;
      case 'error':
        console.error(message, entry.data);
        break;
    }
  }

  private async logToService(entry: LogEntry): Promise<void> {
    // Em produção, enviar logs críticos para serviço de monitoramento
    if (!this.isDev && (entry.level === 'error' || entry.level === 'warn')) {
      try {
        // TODO: Implementar envio para Sentry, LogRocket, etc.
        // await fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(entry)
        // });
      } catch (error) {
        // Fallback para console se serviço falhar
        console.error('Failed to send log to service:', error);
      }
    }
  }

  private log(level: LogLevel, message: string, data?: LogData, context?: string): void {
    const entry = this.createLogEntry(level, message, data, context);

    this.logToConsole(entry);

    // Não bloquear execução com logging assíncrono
    this.logToService(entry).catch(() => {
      // Silently fail - logging shouldn't break the app
    });
  }

  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug(message: string, data?: LogData, context?: string): void {
    this.log('debug', message, data, context);
  }

  /**
   * Log informativo
   */
  info(message: string, data?: LogData, context?: string): void {
    this.log('info', message, data, context);
  }

  /**
   * Log de warning
   */
  warn(message: string, data?: LogData, context?: string): void {
    this.log('warn', message, data, context);
  }

  /**
   * Log de erro
   */
  error(message: string, error?: ErrorLogData | Error | string, context?: string): void {
    let errorData: ErrorLogData;

    if (error instanceof Error) {
      errorData = {
        errorType: 'system',
        errorMessage: error.message,
        stackTrace: error.stack,
        severity: 'high',
        recoverable: false
      };
    } else if (typeof error === 'string') {
      errorData = {
        errorType: 'system',
        errorMessage: error,
        severity: 'medium',
        recoverable: true
      };
    } else if (error && typeof error === 'object') {
      errorData = error as ErrorLogData;
    } else {
      errorData = {
        errorType: 'system',
        errorMessage: 'Unknown error',
        severity: 'low',
        recoverable: true
      };
    }

    this.log('error', message, errorData, context || LOG_CONTEXTS.ERROR);
  }

  /**
   * Log específico para cálculos fiscais
   */
  fiscal(operation: string, input: any, result: any, context?: string): void {
    this.info(`Fiscal calculation: ${operation}`, {
      input,
      result,
      success: !(result instanceof Error)
    }, context || 'fiscal');
  }

  /**
   * Log específico para OCR
   */
  ocr(operation: string, data: any, context?: string): void {
    this.info(`OCR operation: ${operation}`, data, context || 'ocr');
  }

  /**
   * Log específico para API calls
   */
  api(method: string, url: string, status: number, data?: any): void {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(level, `API ${method} ${url} - ${status}`, data, 'api');
  }

  /**
   * Log específico para performance
   */
  performance(operation: string, duration: number, data?: any): void {
    const level = duration > 5000 ? 'warn' : 'info';
    this.log(level, `Performance: ${operation} took ${duration}ms`, data, 'performance');
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logFiscal = logger.fiscal.bind(logger);
export const logOcr = logger.ocr.bind(logger);
export const logApi = logger.api.bind(logger);
export const logPerformance = logger.performance.bind(logger);

// Wrapper para medir performance
export const measurePerformance = async <T>(
  operation: string,
  fn: () => Promise<T>,
  context?: string
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.performance(operation, duration, undefined);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`${operation} failed after ${duration}ms`, error as Error, context);
    throw error;
  }
};

export default logger;
