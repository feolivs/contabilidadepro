/**
 * 📊 MONITORING DASHBOARD
 * Dashboard simples para monitorar Edge Functions e métricas do sistema
 * - Agregação de logs estruturados
 * - Métricas de performance
 * - Status de circuit breakers
 * - Alertas básicos
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createRequestLogger, logMiddleware } from '../_shared/structured-logger.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

interface DashboardMetrics {
  system: {
    uptime: string
    timestamp: string
    status: 'healthy' | 'degraded' | 'critical'
  }
  functions: {
    totalRequests: number
    errorRate: number
    avgResponseTime: number
    activeCircuitBreakers: number
  }
  cache: {
    hitRate: number
    memoryUsage: number
    evictions: number
  }
  errors: {
    last24h: number
    criticalErrors: number
    trends: Array<{ hour: number; count: number }>
  }
  alerts: Array<{
    id: string
    severity: 'info' | 'warning' | 'critical'
    message: string
    timestamp: string
    resolved: boolean
  }>
}

/**
 * 📊 Agregar métricas do sistema
 */
async function aggregateSystemMetrics(timeRange: string = '24h'): Promise<DashboardMetrics> {
  const now = new Date()
  const startTime = getTimeRangeStart(timeRange, now)

  // Buscar métricas de IA
  const { data: aiMetrics } = await supabase
    .from('ai_metrics')
    .select('*')
    .gte('created_at', startTime.toISOString())

  // Buscar logs de erro (se houver tabela de logs)
  const { data: errorLogs } = await supabase
    .from('function_logs')
    .select('*')
    .eq('level', 'ERROR')
    .gte('created_at', startTime.toISOString())
    .catch(() => ({ data: [] })) // Fallback se tabela não existir

  // Calcular métricas agregadas
  const totalRequests = aiMetrics?.length || 0
  const errorCount = errorLogs?.length || 0
  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0

  const avgResponseTime = aiMetrics?.length > 0
    ? aiMetrics.reduce((sum, m) => sum + (m.total_time_ms || 0), 0) / aiMetrics.length
    : 0

  const cacheHitRate = aiMetrics?.length > 0
    ? (aiMetrics.filter(m => m.cache_hit).length / aiMetrics.length) * 100
    : 0

  // Tendências de erro por hora
  const errorTrends = calculateHourlyTrends(errorLogs || [], 24)

  // Alertas baseados em métricas
  const alerts = generateAlerts({
    errorRate,
    avgResponseTime,
    cacheHitRate,
    totalRequests
  })

  // Status geral do sistema
  const systemStatus = determineSystemStatus({
    errorRate,
    avgResponseTime,
    alerts
  })

  return {
    system: {
      uptime: calculateUptime(),
      timestamp: now.toISOString(),
      status: systemStatus
    },
    functions: {
      totalRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      activeCircuitBreakers: 0 // TODO: Integrar com circuit breaker metrics
    },
    cache: {
      hitRate: Math.round(cacheHitRate * 100) / 100,
      memoryUsage: 0, // TODO: Integrar com cache metrics
      evictions: 0
    },
    errors: {
      last24h: errorCount,
      criticalErrors: errorLogs?.filter(log => log.level === 'FATAL').length || 0,
      trends: errorTrends
    },
    alerts
  }
}

/**
 * 🚨 Gerar alertas baseados em métricas
 */
function generateAlerts(metrics: {
  errorRate: number
  avgResponseTime: number
  cacheHitRate: number
  totalRequests: number
}): DashboardMetrics['alerts'] {
  const alerts: DashboardMetrics['alerts'] = []
  const now = new Date().toISOString()

  // Alert: Taxa de erro alta
  if (metrics.errorRate > 10) {
    alerts.push({
      id: `error-rate-${Date.now()}`,
      severity: metrics.errorRate > 25 ? 'critical' : 'warning',
      message: `Taxa de erro alta: ${metrics.errorRate.toFixed(1)}%`,
      timestamp: now,
      resolved: false
    })
  }

  // Alert: Tempo de resposta alto
  if (metrics.avgResponseTime > 5000) {
    alerts.push({
      id: `response-time-${Date.now()}`,
      severity: metrics.avgResponseTime > 10000 ? 'critical' : 'warning',
      message: `Tempo de resposta alto: ${metrics.avgResponseTime}ms`,
      timestamp: now,
      resolved: false
    })
  }

  // Alert: Cache hit rate baixo
  if (metrics.cacheHitRate < 50 && metrics.totalRequests > 10) {
    alerts.push({
      id: `cache-hit-${Date.now()}`,
      severity: 'warning',
      message: `Cache hit rate baixo: ${metrics.cacheHitRate.toFixed(1)}%`,
      timestamp: now,
      resolved: false
    })
  }

  // Alert: Baixo volume de requests (possível problema)
  if (metrics.totalRequests < 5) {
    alerts.push({
      id: `low-traffic-${Date.now()}`,
      severity: 'info',
      message: 'Volume de requests baixo nas últimas 24h',
      timestamp: now,
      resolved: false
    })
  }

  return alerts
}

/**
 * 📈 Calcular tendências por hora
 */
function calculateHourlyTrends(logs: any[], hours: number): Array<{ hour: number; count: number }> {
  const trends: Array<{ hour: number; count: number }> = []
  const now = new Date()

  for (let i = hours - 1; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

    const count = logs.filter(log => {
      const logTime = new Date(log.created_at)
      return logTime >= hourStart && logTime < hourEnd
    }).length

    trends.push({
      hour: hourStart.getHours(),
      count
    })
  }

  return trends
}

/**
 * 🏥 Determinar status geral do sistema
 */
function determineSystemStatus(metrics: {
  errorRate: number
  avgResponseTime: number
  alerts: DashboardMetrics['alerts']
}): 'healthy' | 'degraded' | 'critical' {
  const criticalAlerts = metrics.alerts.filter(a => a.severity === 'critical').length
  const warningAlerts = metrics.alerts.filter(a => a.severity === 'warning').length

  if (criticalAlerts > 0 || metrics.errorRate > 25) {
    return 'critical'
  }

  if (warningAlerts > 0 || metrics.errorRate > 10 || metrics.avgResponseTime > 5000) {
    return 'degraded'
  }

  return 'healthy'
}

/**
 * ⏰ Utilitários de tempo
 */
function getTimeRangeStart(range: string, now: Date): Date {
  switch (range) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000)
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000)
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }
}

function calculateUptime(): string {
  // Simplified uptime calculation
  const start = new Date()
  start.setHours(0, 0, 0, 0) // Midnight today
  const now = new Date()
  const uptimeMs = now.getTime() - start.getTime()
  const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60))
  const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60))

  return `${uptimeHours}h ${uptimeMinutes}m`
}

/**
 * 🎨 Gerar HTML dashboard
 */
function generateDashboardHTML(metrics: DashboardMetrics): string {
  const statusColor = {
    healthy: '#10b981',
    degraded: '#f59e0b',
    critical: '#ef4444'
  }[metrics.system.status]

  const statusIcon = {
    healthy: '✅',
    degraded: '⚠️',
    critical: '🚨'
  }[metrics.system.status]

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ContabilidadePRO - Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 18px;
            font-weight: 600;
            color: ${statusColor};
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .card h3 { margin-bottom: 16px; color: #374151; }
        .metric {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .metric:last-child { border-bottom: none; margin-bottom: 0; }
        .metric-value { font-weight: 600; color: #1e293b; }
        .alert {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .alert.critical { background: #fef2f2; border-left: 4px solid #ef4444; }
        .alert.warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
        .alert.info { background: #eff6ff; border-left: 4px solid #3b82f6; }
        .trends {
            display: flex;
            align-items: end;
            gap: 4px;
            height: 60px;
            margin-top: 16px;
        }
        .trend-bar {
            background: #3b82f6;
            min-height: 4px;
            width: 20px;
            border-radius: 2px;
            opacity: 0.7;
        }
        .refresh-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }
        .timestamp { color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>📊 ContabilidadePRO - Monitoring</h1>
                <div class="timestamp">Última atualização: ${new Date(metrics.system.timestamp).toLocaleString('pt-BR')}</div>
            </div>
            <div>
                <div class="status">${statusIcon} ${metrics.system.status.toUpperCase()}</div>
                <button class="refresh-btn" onclick="location.reload()">🔄 Atualizar</button>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>🚀 Sistema</h3>
                <div class="metric">
                    <span>Status</span>
                    <span class="metric-value" style="color: ${statusColor}">${metrics.system.status}</span>
                </div>
                <div class="metric">
                    <span>Uptime</span>
                    <span class="metric-value">${metrics.system.uptime}</span>
                </div>
            </div>

            <div class="card">
                <h3>⚡ Edge Functions</h3>
                <div class="metric">
                    <span>Total Requests (24h)</span>
                    <span class="metric-value">${metrics.functions.totalRequests}</span>
                </div>
                <div class="metric">
                    <span>Taxa de Erro</span>
                    <span class="metric-value">${metrics.functions.errorRate}%</span>
                </div>
                <div class="metric">
                    <span>Tempo Resposta Médio</span>
                    <span class="metric-value">${metrics.functions.avgResponseTime}ms</span>
                </div>
            </div>

            <div class="card">
                <h3>🧠 Cache</h3>
                <div class="metric">
                    <span>Hit Rate</span>
                    <span class="metric-value">${metrics.cache.hitRate}%</span>
                </div>
                <div class="metric">
                    <span>Uso de Memória</span>
                    <span class="metric-value">${metrics.cache.memoryUsage}%</span>
                </div>
                <div class="metric">
                    <span>Evictions</span>
                    <span class="metric-value">${metrics.cache.evictions}</span>
                </div>
            </div>

            <div class="card">
                <h3>🚨 Erros</h3>
                <div class="metric">
                    <span>Últimas 24h</span>
                    <span class="metric-value">${metrics.errors.last24h}</span>
                </div>
                <div class="metric">
                    <span>Críticos</span>
                    <span class="metric-value">${metrics.errors.criticalErrors}</span>
                </div>
                <div>
                    <span>Tendência (24h)</span>
                    <div class="trends">
                        ${metrics.errors.trends.map(trend =>
                          `<div class="trend-bar" style="height: ${Math.max(4, trend.count * 10)}px"></div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>⚠️ Alertas Ativos</h3>
            ${metrics.alerts.length === 0
              ? '<p style="color: #10b981;">✅ Nenhum alerta ativo</p>'
              : metrics.alerts.map(alert => `
                <div class="alert ${alert.severity}">
                    <span>${alert.message}</span>
                    <span class="timestamp">${new Date(alert.timestamp).toLocaleTimeString('pt-BR')}</span>
                </div>
              `).join('')
            }
        </div>
    </div>

    <script>
        // Auto-refresh a cada 30 segundos
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`
}

/**
 * 🎯 Handler principal
 */
serve(logMiddleware('monitoring-dashboard')(async (req, logger) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const timeRange = url.searchParams.get('range') || '24h'
    const format = url.searchParams.get('format') || 'html'

    logger.info('Dashboard request', { timeRange, format })

    const metrics = await aggregateSystemMetrics(timeRange)

    if (format === 'json') {
      return new Response(JSON.stringify(metrics, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const html = generateDashboardHTML(metrics)
    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    logger.error('Dashboard error', error as Error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro ao gerar dashboard'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}))