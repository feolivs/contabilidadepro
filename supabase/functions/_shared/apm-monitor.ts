// Application Performance Monitoring for Edge Functions
export interface PerformanceMetrics {
  functionName: string
  executionTime: number
  timestamp: Date
  success: boolean
  error?: string
}

export class APMMonitor {
  private static instance: APMMonitor
  private metrics: PerformanceMetrics[] = []

  static getInstance(): APMMonitor {
    if (!APMMonitor.instance) {
      APMMonitor.instance = new APMMonitor()
    }
    return APMMonitor.instance
  }

  startTimer(functionName: string) {
    return {
      functionName,
      startTime: performance.now(),
      end: (success: boolean, error?: string) => {
        const executionTime = performance.now() - this.startTime
        this.recordMetric({
          functionName,
          executionTime,
          timestamp: new Date(),
          success,
          error
        })
      }
    }
  }

  private recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
    
    // Log performance metric
    console.log(`[APM] ${metric.functionName}: ${metric.executionTime.toFixed(2)}ms - ${metric.success ? 'SUCCESS' : 'ERROR'}`)
    
    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  getAverageExecutionTime(functionName: string): number {
    const functionMetrics = this.metrics.filter(m => m.functionName === functionName)
    if (functionMetrics.length === 0) return 0
    
    const totalTime = functionMetrics.reduce((sum, m) => sum + m.executionTime, 0)
    return totalTime / functionMetrics.length
  }
}

export const apmMonitor = APMMonitor.getInstance()
