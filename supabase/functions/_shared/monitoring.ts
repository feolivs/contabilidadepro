// Monitoring and Health Check System for Edge Functions
import { logger } from './structured-logger.ts'
import { circuitBreakerManager } from './circuit-breaker-manager.ts'
import { getCacheStats } from './cache-service.ts'
import { getPoolStats } from './connection-pool.ts'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  uptime: number
  version: string
  environment: string
}

export interface ComponentHealth {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  lastCheck: Date
  error?: string
  metadata?: Record<string, any>
}

export interface SystemMetrics {
  memory: {
    used: number
    total: number
    percentage: number
  }
  performance: {
    averageResponseTime: number
    requestCount: number
    errorRate: number
  }
  database: {
    connectionPool: any
    queryPerformance: number
  }
  cache: {
    hitRate: number
    size: number
  }
  circuitBreakers: Record<string, any>
}

export interface MonitoringConfig {
  healthCheckInterval: number
  metricsRetentionPeriod: number
  alertThresholds: {
    responseTime: number
    errorRate: number
    memoryUsage: number
  }
}

class MonitoringService {
  private static instance: MonitoringService
  private startTime: Date = new Date()
  private healthChecks: Map<string, ComponentHealth> = new Map()
  private metrics: SystemMetrics[] = []
  private config: MonitoringConfig

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      healthCheckInterval: 30000, // 30 seconds
      metricsRetentionPeriod: 3600000, // 1 hour
      alertThresholds: {
        responseTime: 5000, // 5 seconds
        errorRate: 0.05, // 5%
        memoryUsage: 0.8 // 80%
      },
      ...config
    }
  }

  static getInstance(config?: Partial<MonitoringConfig>): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService(config)
    }
    return MonitoringService.instance
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const uptime = Date.now() - this.startTime.getTime()
    const overallStatus = this.calculateOverallHealth()

    return {
      status: overallStatus,
      timestamp: new Date(),
      uptime,
      version: Deno.env.get('APP_VERSION') || '1.0.0',
      environment: Deno.env.get('NODE_ENV') || 'development'
    }
  }

  async checkComponentHealth(name: string, healthCheck: () => Promise<boolean>): Promise<ComponentHealth> {
    const startTime = performance.now()
    let status: ComponentHealth['status'] = 'healthy'
    let error: string | undefined

    try {
      const isHealthy = await Promise.race([
        healthCheck(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        )
      ])

      status = isHealthy ? 'healthy' : 'degraded'
    } catch (err) {
      status = 'unhealthy'
      error = err instanceof Error ? err.message : 'Unknown error'
    }

    const responseTime = performance.now() - startTime
    const componentHealth: ComponentHealth = {
      name,
      status,
      responseTime,
      lastCheck: new Date(),
      error
    }

    this.healthChecks.set(name, componentHealth)
    
    // Log health check result
    logger.debug(`Health check for ${name}`, {
      status,
      responseTime,
      error
    })

    return componentHealth
  }

  async checkDatabaseHealth(): Promise<ComponentHealth> {
    return this.checkComponentHealth('database', async () => {
      try {
        // Simple database connectivity check
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Database configuration missing')
        }

        // Try a simple query
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          }
        })

        return response.ok
      } catch {
        return false
      }
    })
  }

  async checkExternalAPIHealth(name: string, url: string): Promise<ComponentHealth> {
    return this.checkComponentHealth(`external-api-${name}`, async () => {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        })
        return response.ok
      } catch {
        return false
      }
    })
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const metrics: SystemMetrics = {
      memory: await this.getMemoryMetrics(),
      performance: await this.getPerformanceMetrics(),
      database: {
        connectionPool: getPoolStats(),
        queryPerformance: 0 // TODO: Implement query performance tracking
      },
      cache: getCacheStats(),
      circuitBreakers: circuitBreakerManager.getAllStats()
    }

    // Store metrics with timestamp
    this.metrics.push(metrics)
    
    // Clean old metrics
    const cutoff = Date.now() - this.config.metricsRetentionPeriod
    this.metrics = this.metrics.filter(m => m.timestamp && m.timestamp.getTime() > cutoff)

    return metrics
  }

  private async getMemoryMetrics(): Promise<SystemMetrics['memory']> {
    try {
      // Deno memory usage (if available)
      const memoryUsage = (Deno as any).memoryUsage?.() || { rss: 0, heapUsed: 0, heapTotal: 0 }
      
      return {
        used: memoryUsage.heapUsed || 0,
        total: memoryUsage.heapTotal || 0,
        percentage: memoryUsage.heapTotal > 0 ? (memoryUsage.heapUsed / memoryUsage.heapTotal) : 0
      }
    } catch {
      return { used: 0, total: 0, percentage: 0 }
    }
  }

  private async getPerformanceMetrics(): Promise<SystemMetrics['performance']> {
    // TODO: Implement actual performance tracking
    return {
      averageResponseTime: 0,
      requestCount: 0,
      errorRate: 0
    }
  }

  private calculateOverallHealth(): HealthStatus['status'] {
    const healthyCount = Array.from(this.healthChecks.values())
      .filter(h => h.status === 'healthy').length
    const totalCount = this.healthChecks.size

    if (totalCount === 0) return 'healthy'
    
    const healthyRatio = healthyCount / totalCount
    
    if (healthyRatio >= 0.8) return 'healthy'
    if (healthyRatio >= 0.5) return 'degraded'
    return 'unhealthy'
  }

  getAllHealthChecks(): ComponentHealth[] {
    return Array.from(this.healthChecks.values())
  }

  getMetricsHistory(minutes = 60): SystemMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    return this.metrics.filter(m => m.timestamp && m.timestamp.getTime() > cutoff)
  }

  // Alert system
  checkAlerts(metrics: SystemMetrics): string[] {
    const alerts: string[] = []

    // Response time alert
    if (metrics.performance.averageResponseTime > this.config.alertThresholds.responseTime) {
      alerts.push(`High response time: ${metrics.performance.averageResponseTime}ms`)
    }

    // Error rate alert
    if (metrics.performance.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push(`High error rate: ${(metrics.performance.errorRate * 100).toFixed(2)}%`)
    }

    // Memory usage alert
    if (metrics.memory.percentage > this.config.alertThresholds.memoryUsage) {
      alerts.push(`High memory usage: ${(metrics.memory.percentage * 100).toFixed(2)}%`)
    }

    // Circuit breaker alerts
    for (const [name, stats] of Object.entries(metrics.circuitBreakers)) {
      if (stats.state === 'OPEN') {
        alerts.push(`Circuit breaker ${name} is OPEN`)
      }
    }

    return alerts
  }

  // Start monitoring
  startMonitoring(): void {
    setInterval(async () => {
      try {
        // Run health checks
        await this.checkDatabaseHealth()
        
        // Collect metrics
        const metrics = await this.collectMetrics()
        
        // Check for alerts
        const alerts = this.checkAlerts(metrics)
        
        if (alerts.length > 0) {
          logger.warn('System alerts detected', { alerts })
        }
        
        logger.debug('Monitoring cycle completed', {
          healthChecks: this.healthChecks.size,
          metricsCollected: true,
          alertsCount: alerts.length
        })
        
      } catch (error) {
        logger.error('Monitoring cycle failed', error as Error)
      }
    }, this.config.healthCheckInterval)
  }

  // Reset all monitoring data
  reset(): void {
    this.healthChecks.clear()
    this.metrics = []
    this.startTime = new Date()
  }
}

// Global monitoring instance
export const monitoring = MonitoringService.getInstance()

// Convenience functions
export async function getHealthStatus(): Promise<HealthStatus> {
  return monitoring.getHealthStatus()
}

export async function checkDatabaseHealth(): Promise<ComponentHealth> {
  return monitoring.checkDatabaseHealth()
}

export async function collectMetrics(): Promise<SystemMetrics> {
  return monitoring.collectMetrics()
}

export function getAllHealthChecks(): ComponentHealth[] {
  return monitoring.getAllHealthChecks()
}

export function getMetricsHistory(minutes = 60): SystemMetrics[] {
  return monitoring.getMetricsHistory(minutes)
}

export function startMonitoring(): void {
  monitoring.startMonitoring()
}

// Health check endpoint helper
export async function createHealthResponse(): Promise<Response> {
  try {
    const health = await getHealthStatus()
    const healthChecks = getAllHealthChecks()
    const metrics = await collectMetrics()

    const response = {
      ...health,
      components: healthChecks,
      metrics: {
        memory: metrics.memory,
        performance: metrics.performance,
        cache: metrics.cache
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    logger.error('Failed to create health response', error as Error)
    
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: 'Health check failed'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
