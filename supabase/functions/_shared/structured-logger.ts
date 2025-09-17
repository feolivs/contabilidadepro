// Structured Logger for Edge Functions
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  metadata?: Record<string, any>
  userId?: string
  requestId?: string
  functionName?: string
  executionTime?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  context?: string
  includeStack?: boolean
}

class StructuredLogger {
  private static instance: StructuredLogger
  private config: LoggerConfig
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 100

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      includeStack: false,
      ...config
    }
  }

  static getInstance(config?: Partial<LoggerConfig>): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger(config)
    }
    return StructuredLogger.instance
  }

  debug(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log(LogLevel.DEBUG, message, metadata, context)
  }

  info(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log(LogLevel.INFO, message, metadata, context)
  }

  warn(message: string, metadata?: Record<string, any>, context?: string): void {
    this.log(LogLevel.WARN, message, metadata, context)
  }

  error(message: string, error?: Error, metadata?: Record<string, any>, context?: string): void {
    const errorMetadata = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: this.config.includeStack ? error.stack : undefined
      },
      ...metadata
    } : metadata

    this.log(LogLevel.ERROR, message, errorMetadata, context)
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>, context?: string): void {
    const errorMetadata = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack // Always include stack for fatal errors
      },
      ...metadata
    } : metadata

    this.log(LogLevel.FATAL, message, errorMetadata, context)
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, context?: string): void {
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || this.config.context,
      metadata,
      requestId: this.getRequestId(),
      functionName: this.getFunctionName()
    }

    // Add to buffer
    this.logBuffer.push(entry)
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift()
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(entry)
    }

    // Remote logging (if configured)
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.sendToRemote(entry).catch(err => {
        console.error('Failed to send log to remote endpoint:', err)
      })
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level]
    const timestamp = entry.timestamp
    const context = entry.context ? `[${entry.context}]` : ''
    const requestId = entry.requestId ? `[${entry.requestId}]` : ''
    
    const logMessage = `${timestamp} ${levelName} ${context}${requestId} ${entry.message}`
    
    if (entry.metadata) {
      const metadataStr = JSON.stringify(entry.metadata, null, 2)
      console.log(`${logMessage}\nMetadata: ${metadataStr}`)
    } else {
      console.log(logMessage)
    }

    // Use appropriate console method based on level
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage)
        break
      case LogLevel.INFO:
        console.info(logMessage)
        break
      case LogLevel.WARN:
        console.warn(logMessage)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logMessage)
        break
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      })
    } catch (error) {
      // Silently fail to avoid infinite logging loops
    }
  }

  private getRequestId(): string | undefined {
    // Try to get request ID from various sources
    try {
      // From Deno environment or headers
      return Deno.env.get('REQUEST_ID') || crypto.randomUUID()
    } catch {
      return undefined
    }
  }

  private getFunctionName(): string | undefined {
    try {
      // Try to get function name from environment
      return Deno.env.get('FUNCTION_NAME')
    } catch {
      return undefined
    }
  }

  // Performance logging
  startTimer(operation: string, metadata?: Record<string, any>): () => void {
    const startTime = performance.now()
    const requestId = this.getRequestId()
    
    this.debug(`Starting operation: ${operation}`, { 
      operation, 
      startTime,
      ...metadata 
    })

    return () => {
      const executionTime = performance.now() - startTime
      this.info(`Completed operation: ${operation}`, {
        operation,
        executionTime: Math.round(executionTime * 100) / 100, // Round to 2 decimal places
        ...metadata
      })
    }
  }

  // Audit logging
  audit(action: string, userId?: string, metadata?: Record<string, any>): void {
    this.info(`AUDIT: ${action}`, {
      audit: true,
      action,
      userId,
      ...metadata
    })
  }

  // Security logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>): void {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO

    this.log(level, `SECURITY: ${event}`, {
      security: true,
      event,
      severity,
      ...metadata
    })
  }

  // Get recent logs
  getRecentLogs(count = 50): LogEntry[] {
    return this.logBuffer.slice(-count)
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel, count = 50): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.level === level)
      .slice(-count)
  }

  // Clear buffer
  clearBuffer(): void {
    this.logBuffer = []
  }

  // Update configuration
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  // Get current configuration
  getConfig(): LoggerConfig {
    return { ...this.config }
  }
}

// Global logger instance
export const logger = StructuredLogger.getInstance({
  level: LogLevel.INFO,
  enableConsole: true,
  enableRemote: false,
  includeStack: true
})

// Convenience functions
export function debug(message: string, metadata?: Record<string, any>, context?: string): void {
  logger.debug(message, metadata, context)
}

export function info(message: string, metadata?: Record<string, any>, context?: string): void {
  logger.info(message, metadata, context)
}

export function warn(message: string, metadata?: Record<string, any>, context?: string): void {
  logger.warn(message, metadata, context)
}

export function error(message: string, err?: Error, metadata?: Record<string, any>, context?: string): void {
  logger.error(message, err, metadata, context)
}

export function fatal(message: string, err?: Error, metadata?: Record<string, any>, context?: string): void {
  logger.fatal(message, err, metadata, context)
}

export function startTimer(operation: string, metadata?: Record<string, any>): () => void {
  return logger.startTimer(operation, metadata)
}

export function audit(action: string, userId?: string, metadata?: Record<string, any>): void {
  logger.audit(action, userId, metadata)
}

export function security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>): void {
  logger.security(event, severity, metadata)
}
