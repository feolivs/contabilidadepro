/**
 * 🧪 UNIT TESTS - Structured Logger
 * Testes para validar funcionalidade do logging estruturado
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  StructuredLogger,
  createLogger,
  createRequestLogger,
  logMiddleware,
  logAnalytics
} from '../structured-logger'

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}

describe('StructuredLogger', () => {
  let logger: StructuredLogger
  let consoleSpy: any

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(mockConsole.log)
    jest.spyOn(console, 'error').mockImplementation(mockConsole.error)
    jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn)

    logger = new StructuredLogger('test-service')
    jest.clearAllMocks()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  describe('Basic Logging', () => {
    it('should log INFO messages with correct structure', () => {
      const message = 'Test info message'
      const metadata = { key: 'value' }

      logger.info(message, metadata)

      expect(mockConsole.log).toHaveBeenCalledTimes(1)
      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe('INFO')
      expect(logEntry.message).toBe(message)
      expect(logEntry.service).toBe('test-service')
      expect(logEntry.metadata).toEqual(metadata)
      expect(logEntry.timestamp).toBeDefined()
      expect(logEntry.traceId).toBeDefined()
    })

    it('should log ERROR messages with error details', () => {
      const message = 'Test error message'
      const error = new Error('Test error')
      error.stack = 'Error stack trace'

      logger.error(message, error)

      expect(mockConsole.log).toHaveBeenCalledTimes(1)
      expect(mockConsole.error).toHaveBeenCalledTimes(1)

      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe('ERROR')
      expect(logEntry.message).toBe(message)
      expect(logEntry.error).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: 'Error stack trace',
        code: undefined
      })
    })

    it('should not log DEBUG messages when log level is INFO', () => {
      // Mock Deno.env.get to return INFO level
      const originalMock = Deno.env.get as any
      ;(Deno.env.get as any) = jest.fn((key: string) => {
        if (key === 'LOG_LEVEL') return 'INFO'
        return originalMock(key)
      })

      logger.debug('Debug message')

      expect(mockConsole.log).not.toHaveBeenCalled()

      // Restore original mock
      ;(Deno.env.get as any) = originalMock
    })

    it('should log WARN and FATAL messages', () => {
      logger.warn('Warning message')
      logger.fatal('Fatal message')

      expect(mockConsole.log).toHaveBeenCalledTimes(2)

      const warnLog = JSON.parse(mockConsole.log.mock.calls[0][0] as string)
      const fatalLog = JSON.parse(mockConsole.log.mock.calls[1][0] as string)

      expect(warnLog.level).toBe('WARN')
      expect(fatalLog.level).toBe('FATAL')
    })
  })

  describe('Context Management', () => {
    it('should set and use context', () => {
      logger.setContext('userId', 'user123')
      logger.setContext('sessionId', 'session456')

      logger.info('Test message')

      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context.userId).toBe('user123')
      expect(logEntry.context.sessionId).toBe('session456')
    })

    it('should set user context', () => {
      logger.setUserContext('user123', 'session456')

      logger.info('Test message')

      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context.userId).toBe('user123')
      expect(logEntry.context.sessionId).toBe('session456')
    })

    it('should extract request context', () => {
      const mockRequest = new Request('https://example.com/test', {
        method: 'POST',
        headers: {
          'user-agent': 'Test Browser',
          'x-forwarded-for': '192.168.1.1'
        }
      })

      logger.setRequestContext(mockRequest)
      logger.info('Test message')

      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.context.method).toBe('POST')
      expect(logEntry.context.url).toBe('https://example.com/test')
      expect(logEntry.context.userAgent).toBe('Test Browser')
      expect(logEntry.context.ipAddress).toBe('192.168.1.1')
    })
  })

  describe('Performance Tracking', () => {
    it('should track performance metrics', () => {
      logger.startPerformanceTracking('test-operation')

      logger.trackCacheHit()
      logger.trackCacheMiss()
      logger.trackDBQuery()
      logger.trackAPICall()

      // Simulate time passing
      jest.advanceTimersByTime(10)

      const metrics = logger.finishPerformanceTracking(true)

      expect(metrics.duration).toBeGreaterThan(0)
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting operation: test-operation')
      )
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Operation completed: test-operation')
      )
    })

    it('should calculate performance metrics correctly', () => {
      logger.startPerformanceTracking('metric-test')

      // Simulate some operations
      logger.trackCacheHit()
      logger.trackCacheHit()
      logger.trackCacheMiss()
      logger.trackDBQuery()

      // Simulate time passing
      jest.advanceTimersByTime(10)

      const metrics = logger.finishPerformanceTracking(true)

      // Should be available in the log entry
      logger.info('Test with metrics')

      const logCall = mockConsole.log.mock.calls[mockConsole.log.mock.calls.length - 1][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.performance).toBeDefined()
      expect(logEntry.performance.duration).toBeGreaterThan(0)
    })
  })

  describe('Specialized Logging Methods', () => {
    it('should log API calls', () => {
      logger.logAPICall('/api/test', 'GET', 150, 200)

      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe('INFO')
      expect(logEntry.message).toBe('API call completed')
      expect(logEntry.metadata.endpoint).toBe('/api/test')
      expect(logEntry.metadata.method).toBe('GET')
      expect(logEntry.metadata.duration).toBe(150)
      expect(logEntry.metadata.status).toBe(200)
      expect(logEntry.metadata.success).toBe(true)
    })

    it('should log cache operations', () => {
      logger.logCacheOperation('hit', 'test-key', 5)

      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe('DEBUG')
      expect(logEntry.message).toBe('Cache hit')
      expect(logEntry.metadata.key).toBe('test-key')
      expect(logEntry.metadata.duration).toBe(5)
    })

    it('should log business events', () => {
      logger.logBusinessEvent('user-registered', { userId: 'user123' })

      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe('INFO')
      expect(logEntry.message).toBe('Business event: user-registered')
      expect(logEntry.metadata.businessEvent).toBe(true)
      expect(logEntry.metadata.userId).toBe('user123')
    })

    it('should log security events', () => {
      logger.logSecurityEvent('suspicious-login', { ip: '192.168.1.1' })

      const logCall = mockConsole.log.mock.calls[0][0] as string
      const logEntry = JSON.parse(logCall)

      expect(logEntry.level).toBe('WARN')
      expect(logEntry.message).toBe('Security event: suspicious-login')
      expect(logEntry.metadata.securityEvent).toBe(true)
      expect(logEntry.metadata.requiresAttention).toBe(true)
      expect(logEntry.metadata.ip).toBe('192.168.1.1')
    })
  })
})

describe('Factory Functions', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should create logger with service name', () => {
    const logger = createLogger('test-service')

    logger.info('Test message')

    expect(console.log).toHaveBeenCalled()
  })

  it('should create request logger with request context', () => {
    const mockRequest = new Request('https://example.com/test')
    const logger = createRequestLogger('test-service', mockRequest)

    logger.info('Test message')

    expect(console.log).toHaveBeenCalled()
  })
})

describe('Log Analytics', () => {
  const sampleLogs = [
    {
      timestamp: '2024-01-01T10:00:00Z',
      level: 'INFO' as const,
      message: 'Request completed',
      service: 'api',
      performance: { duration: 100 }
    },
    {
      timestamp: '2024-01-01T10:01:00Z',
      level: 'ERROR' as const,
      message: 'Request failed',
      service: 'api',
      performance: { duration: 200 }
    },
    {
      timestamp: '2024-01-01T10:02:00Z',
      level: 'INFO' as const,
      message: 'Cache hit',
      service: 'cache',
      performance: { duration: 5, cacheHit: true }
    }
  ]

  it('should parse log entries', () => {
    const jsonLine = JSON.stringify(sampleLogs[0])
    const parsed = logAnalytics.parseLogEntry(jsonLine)

    expect(parsed).toEqual(sampleLogs[0])
  })

  it('should handle invalid JSON gracefully', () => {
    const invalidJson = 'not json'
    const parsed = logAnalytics.parseLogEntry(invalidJson)

    expect(parsed).toBeNull()
  })

  it('should filter logs by criteria', () => {
    const filtered = logAnalytics.filterLogs(sampleLogs, {
      level: 'INFO',
      service: 'api'
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].message).toBe('Request completed')
  })

  it('should filter logs by time range', () => {
    const filtered = logAnalytics.filterLogs(sampleLogs, {
      timeRange: {
        start: '2024-01-01T10:00:30Z',
        end: '2024-01-01T10:01:30Z'
      }
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0].message).toBe('Request failed')
  })

  it('should calculate metrics correctly', () => {
    const metrics = logAnalytics.calculateMetrics(sampleLogs)

    expect(metrics.totalRequests).toBe(3)
    expect(metrics.errorRate).toBeCloseTo(33.33, 1) // 1 error out of 3 requests
    expect(metrics.avgDuration).toBe(102) // (100 + 200 + 5) / 3
    expect(metrics.cacheHitRate).toBe(100) // 1 cache hit out of 1 cache operation
  })

  it('should handle empty logs gracefully', () => {
    const metrics = logAnalytics.calculateMetrics([])

    expect(metrics.totalRequests).toBe(0)
    expect(metrics.errorRate).toBe(0)
    expect(metrics.avgDuration).toBe(0)
    expect(metrics.cacheHitRate).toBe(0)
  })
})