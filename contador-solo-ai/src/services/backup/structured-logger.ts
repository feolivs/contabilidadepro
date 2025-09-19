'use client'

import type { Logger, LogEntry } from '@/types/ai-context.types'

// =====================================================
// STRUCTURED LOGGER IMPLEMENTATION
// =====================================================

class StructuredLogger implements Logger {
  private logs: LogEntry[] = []
  private readonly maxLogs = 1000
  private readonly isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Gera um trace ID único para rastreamento
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cria entrada de log estruturada
   */
  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: any
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      traceId: context?.traceId || this.generateTraceId()
    }

    // Adicionar informações do usuário se disponível
    if (context?.userId) {
      entry.userId = context.userId
    }

    if (context?.operation) {
      entry.operation = context.operation
    }

    return entry
  }

  /**
   * Armazena log na memória (limitado)
   */
  private storeLog(entry: LogEntry): void {
    this.logs.push(entry)
    
    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  /**
   * Formata log para console
   */
  private formatForConsole(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const traceId = entry.traceId ? `[${entry.traceId}]` : ''
    const operation = entry.operation ? `[${entry.operation}]` : ''
    
    let formatted = `${timestamp} ${level} ${traceId} ${operation} ${entry.message}`
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      formatted += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
    }
    
    return formatted
  }

  /**
   * Envia log para console baseado no nível
   */
  private logToConsole(entry: LogEntry): void {
    const formatted = this.formatForConsole(entry)
    
    switch (entry.level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formatted)
        }
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(message: string, context?: any): void {
    const entry = this.createLogEntry('debug', message, context)
    this.storeLog(entry)
    this.logToConsole(entry)
  }

  /**
   * Log de informação
   */
  info(message: string, context?: any): void {
    const entry = this.createLogEntry('info', message, context)
    this.storeLog(entry)
    this.logToConsole(entry)
  }

  /**
   * Log de aviso
   */
  warn(message: string, context?: any): void {
    const entry = this.createLogEntry('warn', message, context)
    this.storeLog(entry)
    this.logToConsole(entry)
  }

  /**
   * Log de erro
   */
  error(message: string, context?: any): void {
    const entry = this.createLogEntry('error', message, context)
    this.storeLog(entry)
    this.logToConsole(entry)

    // Em produção, poderia enviar para serviço de monitoramento
    if (!this.isDevelopment) {
      this.sendToMonitoringService(entry).catch(err => 
        console.error('Failed to send log to monitoring service:', err)
      )
    }
  }

  /**
   * Busca logs por filtros
   */
  getLogs(filters?: {
    level?: LogEntry['level']
    traceId?: string
    userId?: string
    operation?: string
    since?: Date
  }): LogEntry[] {
    let filteredLogs = [...this.logs]

    if (filters) {
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level)
      }
      
      if (filters.traceId) {
        filteredLogs = filteredLogs.filter(log => log.traceId === filters.traceId)
      }
      
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
      }
      
      if (filters.operation) {
        filteredLogs = filteredLogs.filter(log => log.operation === filters.operation)
      }
      
      if (filters.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.since!)
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Limpa logs antigos
   */
  clearOldLogs(olderThan: Date): void {
    this.logs = this.logs.filter(log => log.timestamp >= olderThan)
  }

  /**
   * Obtém estatísticas dos logs
   */
  getLogStats(): {
    total: number
    byLevel: Record<LogEntry['level'], number>
    oldestLog?: Date
    newestLog?: Date
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0
      } as Record<LogEntry['level'], number>,
      oldestLog: undefined as Date | undefined,
      newestLog: undefined as Date | undefined
    }

    if (this.logs.length > 0) {
      const firstLog = this.logs[0]
      const lastLog = this.logs[this.logs.length - 1]
      if (firstLog) stats.oldestLog = firstLog.timestamp
      if (lastLog) stats.newestLog = lastLog.timestamp

      this.logs.forEach(log => {
        stats.byLevel[log.level]++
      })
    }

    return stats
  }

  /**
   * Envia log crítico para serviço de monitoramento (placeholder)
   */
  private async sendToMonitoringService(entry: LogEntry): Promise<void> {
    // TODO: Implementar integração com serviço de monitoramento
    // Por exemplo: Sentry, LogRocket, DataDog, etc.
    
    // Por enquanto, apenas simula o envio
    if (entry.level === 'error') {
      // console.log('Would send to monitoring service:', entry)
    }
  }

  /**
   * Exporta logs para análise
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2)
    }
    
    // CSV format
    const headers = 'timestamp,level,message,traceId,userId,operation'
    const rows = this.logs.map(log => 
      `${log.timestamp.toISOString()},${log.level},"${log.message}",${log.traceId || ''},${log.userId || ''},${log.operation || ''}`
    )
    
    return [headers, ...rows].join('\n')
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const logger = new StructuredLogger()

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Cria um contexto de operação para logging
 */
export function createOperationContext(
  operation: string,
  userId: string,
  additionalContext?: any
): any {
  return {
    operation,
    userId,
    traceId: logger.generateTraceId(),
    startTime: Date.now(),
    ...additionalContext
  }
}

/**
 * Mede performance de uma operação com logging automático
 */
export async function measureOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: any
): Promise<T> {
  const startTime = Date.now()
  const traceId = context?.traceId || logger.generateTraceId()
  
  logger.info(`Starting operation: ${operation}`, { 
    ...context, 
    traceId,
    startTime 
  })

  try {
    const result = await fn()
    const duration = Date.now() - startTime
    
    logger.info(`Operation completed: ${operation}`, {
      ...context,
      traceId,
      duration,
      success: true
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    logger.error(`Operation failed: ${operation}`, {
      ...context,
      traceId,
      duration,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    throw error
  }
}
