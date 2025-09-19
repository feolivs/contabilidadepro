/**
 * 📝 LOGGER SIMPLES
 * ContabilidadePRO - Logging básico para contador solo
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
}

/**
 * Logger simplificado para desenvolvimento
 */
class SimpleLogger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    }

    if (this.isDevelopment) {
      const prefix = `[${level.toUpperCase()}] ${entry.timestamp}`

      switch (level) {
        case 'error':
          console.error(prefix, message, data || '')
          break
        case 'warn':
          console.warn(prefix, message, data || '')
          break
        case 'info':
          console.info(prefix, message, data || '')
          break
        case 'debug':
          console.debug(prefix, message, data || '')
          break
      }
    }
  }

  error(message: string, data?: any): void {
    this.log('error', message, data)
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data)
  }

  info(message: string, data?: any): void {
    this.log('info', message, data)
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data)
  }
}

// Instância singleton
export const logger = new SimpleLogger()