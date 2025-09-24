/**
 * 🧪 UNIT TESTS - Circuit Breaker
 * Testes para validar funcionalidade do circuit breaker
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  CircuitBreaker,
  createCircuitBreaker,
  createOpenAICircuitBreaker,
  CircuitBreakerError,
  circuitBreakerUtils
} from '../circuit-breaker.ts'

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker<string>
  let mockFunction: jest.Mock

  beforeEach(() => {
    mockFunction = jest.fn()
    circuitBreaker = createCircuitBreaker('test-cb', {
      failureThreshold: 3,
      recoveryTimeout: 1000, // 1 second for tests
      monitoringPeriod: 500,
      halfOpenMaxCalls: 2,
      successThreshold: 2
    })
  })

  afterEach(() => {
    circuitBreaker.destroy()
  })

  describe('CLOSED State', () => {
    it('should start in CLOSED state', () => {
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.state).toBe('CLOSED')
    })

    it('should execute function successfully in CLOSED state', async () => {
      mockFunction.mockResolvedValue('success')

      const result = await circuitBreaker.execute(mockFunction)

      expect(result).toBe('success')
      expect(mockFunction).toHaveBeenCalledTimes(1)
    })

    it('should track successful calls', async () => {
      mockFunction.mockResolvedValue('success')

      await circuitBreaker.execute(mockFunction)
      await circuitBreaker.execute(mockFunction)

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.successes).toBe(2)
      expect(metrics.totalCalls).toBe(2)
    })

    it('should track failed calls', async () => {
      mockFunction.mockRejectedValue(new Error('test error'))

      try {
        await circuitBreaker.execute(mockFunction)
      } catch (error) {
        // Expected to throw
      }

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.failures).toBe(1)
      expect(metrics.totalCalls).toBe(1)
    })

    it('should transition to OPEN after failure threshold', async () => {
      mockFunction.mockRejectedValue(new Error('failure'))

      // Trigger failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction)
        } catch (error) {
          // Expected
        }
      }

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.state).toBe('OPEN')
      expect(metrics.failures).toBe(3)
    })
  })

  describe('OPEN State', () => {
    beforeEach(async () => {
      // Force circuit to OPEN
      mockFunction.mockRejectedValue(new Error('failure'))
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction)
        } catch (error) {
          // Expected
        }
      }
    })

    it('should reject calls immediately in OPEN state', async () => {
      mockFunction.mockResolvedValue('success')

      await expect(circuitBreaker.execute(mockFunction))
        .rejects
        .toThrow(CircuitBreakerError)

      expect(mockFunction).not.toHaveBeenCalled()
    })

    it('should provide time until retry in error message', async () => {
      try {
        await circuitBreaker.execute(mockFunction)
      } catch (error) {
        expect(error).toBeInstanceOf(CircuitBreakerError)
        expect(error.message).toContain('Next attempt in')
      }
    })

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 1100))

      mockFunction.mockResolvedValue('recovery test')

      // This should transition to HALF_OPEN and execute
      const result = await circuitBreaker.execute(mockFunction)

      expect(result).toBe('recovery test')
      const metrics = circuitBreaker.getMetrics()
      expect(metrics.state).toBe('HALF_OPEN')
    })
  })

  describe('HALF_OPEN State', () => {
    beforeEach(async () => {
      // Force to OPEN then wait for HALF_OPEN
      mockFunction.mockRejectedValue(new Error('failure'))
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction)
        } catch (error) {
          // Expected
        }
      }

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Trigger transition to HALF_OPEN
      mockFunction.mockResolvedValue('test')
      await circuitBreaker.execute(mockFunction)
    })

    it('should limit calls in HALF_OPEN state', async () => {
      mockFunction.mockResolvedValue('success')

      // Should allow up to halfOpenMaxCalls
      await circuitBreaker.execute(mockFunction)

      // This should be rejected
      await expect(circuitBreaker.execute(mockFunction))
        .rejects
        .toThrow(CircuitBreakerError)
    })

    it('should transition to CLOSED after success threshold', async () => {
      mockFunction.mockResolvedValue('success')

      // One more success to reach threshold (we already had one)
      await circuitBreaker.execute(mockFunction)

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.state).toBe('CLOSED')
      expect(metrics.failures).toBe(0) // Should be reset
    })

    it('should transition back to OPEN on any failure', async () => {
      mockFunction.mockRejectedValue(new Error('failure in half-open'))

      try {
        await circuitBreaker.execute(mockFunction)
      } catch (error) {
        // Expected
      }

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.state).toBe('OPEN')
    })
  })

  describe('Manual Controls', () => {
    it('should reset to CLOSED state manually', async () => {
      // Force to OPEN
      mockFunction.mockRejectedValue(new Error('failure'))
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction)
        } catch (error) {
          // Expected
        }
      }

      circuitBreaker.reset()

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.state).toBe('CLOSED')
      expect(metrics.failures).toBe(0)
    })

    it('should force OPEN state manually', () => {
      circuitBreaker.forceOpen()

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.state).toBe('OPEN')
    })
  })

  describe('Events', () => {
    it('should call event handlers', async () => {
      const onStateChange = jest.fn()
      const onFailure = jest.fn()
      const onSuccess = jest.fn()

      const cb = createCircuitBreaker('event-test', {
        failureThreshold: 1
      }, {
        onStateChange,
        onFailure,
        onSuccess
      })

      mockFunction.mockResolvedValue('success')
      await cb.execute(mockFunction)
      expect(onSuccess).toHaveBeenCalled()

      mockFunction.mockRejectedValue(new Error('failure'))
      try {
        await cb.execute(mockFunction)
      } catch (error) {
        // Expected
      }

      expect(onFailure).toHaveBeenCalled()
      expect(onStateChange).toHaveBeenCalledWith('CLOSED', 'OPEN')

      cb.destroy()
    })
  })

  describe('Metrics and Statistics', () => {
    it('should track comprehensive metrics', async () => {
      mockFunction.mockResolvedValue('success')
      await circuitBreaker.execute(mockFunction)

      mockFunction.mockRejectedValue(new Error('failure'))
      try {
        await circuitBreaker.execute(mockFunction)
      } catch (error) {
        // Expected
      }

      const metrics = circuitBreaker.getMetrics()

      expect(metrics.totalCalls).toBe(2)
      expect(metrics.successes).toBe(1)
      expect(metrics.failures).toBe(1)
      expect(metrics.lastSuccessTime).toBeGreaterThan(0)
      expect(metrics.lastFailureTime).toBeGreaterThan(0)
    })

    it('should update state changes counter', async () => {
      // Force state transition
      mockFunction.mockRejectedValue(new Error('failure'))
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction)
        } catch (error) {
          // Expected
        }
      }

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.stateChanges).toBeGreaterThan(0)
    })
  })
})

describe('OpenAI Circuit Breaker', () => {
  it('should create with OpenAI-specific configuration', () => {
    const cb = createOpenAICircuitBreaker()
    const config = cb.getConfig()

    expect(config.failureThreshold).toBe(3)
    expect(config.recoveryTimeout).toBe(30000)

    cb.destroy()
  })
})

describe('Circuit Breaker Utils', () => {
  describe('createMultiple', () => {
    it('should create multiple circuit breakers', () => {
      const configs = [
        { name: 'api1', config: { failureThreshold: 5 } },
        { name: 'api2', config: { failureThreshold: 3 } }
      ]

      const breakers = circuitBreakerUtils.createMultiple(configs)

      expect(breakers.size).toBe(2)
      expect(breakers.has('api1')).toBe(true)
      expect(breakers.has('api2')).toBe(true)

      // Cleanup
      breakers.forEach(cb => cb.destroy())
    })
  })

  describe('aggregateMetrics', () => {
    it('should aggregate metrics from multiple circuit breakers', () => {
      const cb1 = createCircuitBreaker('test1')
      const cb2 = createCircuitBreaker('test2')

      const aggregated = circuitBreakerUtils.aggregateMetrics([cb1, cb2])

      expect(aggregated.totalCalls).toBe(0)
      expect(aggregated.totalFailures).toBe(0)
      expect(aggregated.averageFailureRate).toBe(0)
      expect(aggregated.openCircuits).toBe(0)

      cb1.destroy()
      cb2.destroy()
    })
  })

  describe('healthCheck', () => {
    it('should report healthy status for all closed circuits', () => {
      const cb1 = createCircuitBreaker('test1')
      const cb2 = createCircuitBreaker('test2')

      const health = circuitBreakerUtils.healthCheck([cb1, cb2])

      expect(health.healthy).toBe(true)
      expect(health.issues).toHaveLength(0)

      cb1.destroy()
      cb2.destroy()
    })

    it('should report issues for open circuits', () => {
      const cb = createCircuitBreaker('test', { failureThreshold: 1 })
      cb.forceOpen()

      const health = circuitBreakerUtils.healthCheck([cb])

      expect(health.healthy).toBe(false)
      expect(health.issues).toContain('1 circuit breaker(s) open')

      cb.destroy()
    })
  })
})