/**
 * APM (Application Performance Monitoring) para Edge Functions
 * ContábilPro ERP - Monitoramento Avançado de Performance
 */ // Interfaces para APM
// Configurações por ambiente
const APM_CONFIGS = {
  development: {
    enabled: true,
    sample_rate: 1.0,
    max_traces_per_minute: 1000,
    enable_database_monitoring: true,
    enable_external_monitoring: true,
    enable_memory_monitoring: true,
    enable_custom_metrics: true,
    trace_timeout_ms: 30000,
    batch_size: 10,
    flush_interval_ms: 5000
  },
  production: {
    enabled: true,
    sample_rate: 0.1,
    max_traces_per_minute: 500,
    enable_database_monitoring: true,
    enable_external_monitoring: true,
    enable_memory_monitoring: false,
    enable_custom_metrics: true,
    trace_timeout_ms: 60000,
    batch_size: 50,
    flush_interval_ms: 10000
  },
  test: {
    enabled: false,
    sample_rate: 0.0,
    max_traces_per_minute: 0,
    enable_database_monitoring: false,
    enable_external_monitoring: false,
    enable_memory_monitoring: false,
    enable_custom_metrics: false,
    trace_timeout_ms: 5000,
    batch_size: 1,
    flush_interval_ms: 1000
  }
};
// Classe principal do APM
export class APMMonitor {
  static instance;
  config;
  activeTraces = new Map();
  metricsBuffer = [];
  tracesBuffer = [];
  flushTimer;
  requestCount = 0;
  startTime = Date.now();
  constructor(){
    const env = Deno.env.get('ENVIRONMENT') || 'production';
    this.config = APM_CONFIGS[env] || APM_CONFIGS.production;
    if (this.config.enabled) {
      this.startFlushTimer();
      console.log(`[APM] Inicializado para ambiente: ${env}`);
    }
  }
  static getInstance() {
    if (!APMMonitor.instance) {
      APMMonitor.instance = new APMMonitor();
    }
    return APMMonitor.instance;
  }
  /**
   * Iniciar um novo trace
   */ startTrace(operationName, parentSpanId, tags = {}) {
    if (!this.config.enabled || !this.shouldSample()) {
      return '';
    }
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();
    const trace = {
      trace_id: traceId,
      span_id: spanId,
      parent_span_id: parentSpanId,
      operation_name: operationName,
      start_time: Date.now(),
      status: 'success',
      tags: {
        function_name: this.getFunctionName(),
        environment: Deno.env.get('ENVIRONMENT') || 'production',
        cold_start: this.isColdStart(),
        ...tags
      },
      logs: []
    };
    this.activeTraces.set(traceId, trace);
    console.log(`[APM_TRACE_START] ${operationName} [${traceId}]`);
    return traceId;
  }
  /**
   * Finalizar um trace
   */ finishTrace(traceId, status = 'success', error, tags = {}) {
    if (!this.config.enabled || !traceId) {
      return;
    }
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      return;
    }
    const endTime = Date.now();
    trace.end_time = endTime;
    trace.duration_ms = endTime - trace.start_time;
    trace.status = status;
    // Adicionar tags finais
    Object.assign(trace.tags, tags);
    // Adicionar erro se houver
    if (error) {
      trace.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    // Remover da lista ativa e adicionar ao buffer
    this.activeTraces.delete(traceId);
    this.tracesBuffer.push(trace);
    console.log(`[APM_TRACE_FINISH] ${trace.operation_name} [${traceId}] ${trace.duration_ms}ms`);
    // Flush se buffer estiver cheio
    if (this.tracesBuffer.length >= this.config.batch_size) {
      this.flush();
    }
  }
  /**
   * Adicionar log a um trace
   */ addTraceLog(traceId, level, message, fields) {
    if (!this.config.enabled || !traceId) {
      return;
    }
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      return;
    }
    trace.logs.push({
      timestamp: Date.now(),
      level,
      message,
      fields
    });
  }
  /**
   * Adicionar tags a um trace
   */ addTraceTags(traceId, tags) {
    if (!this.config.enabled || !traceId) {
      return;
    }
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      return;
    }
    Object.assign(trace.tags, tags);
  }
  /**
   * Registrar métricas de performance
   */ recordMetrics(metrics) {
    if (!this.config.enabled) {
      return;
    }
    const fullMetrics = {
      function_name: this.getFunctionName(),
      operation: 'unknown',
      timestamp: Date.now(),
      duration_ms: 0,
      memory_used_mb: this.getMemoryUsage(),
      cpu_time_ms: 0,
      cold_start: this.isColdStart(),
      request_size_bytes: 0,
      response_size_bytes: 0,
      database_queries: 0,
      database_time_ms: 0,
      external_calls: 0,
      external_time_ms: 0,
      cache_hits: 0,
      cache_misses: 0,
      error_count: 0,
      status_code: 200,
      ...metrics
    };
    this.metricsBuffer.push(fullMetrics);
    // Flush se buffer estiver cheio
    if (this.metricsBuffer.length >= this.config.batch_size) {
      this.flush();
    }
  }
  /**
   * Wrapper para operações com APM automático
   */ async withAPM(operationName, operation, tags = {}) {
    const traceId = this.startTrace(operationName, undefined, tags);
    const startTime = Date.now();
    try {
      const result = await operation(traceId);
      const duration = Date.now() - startTime;
      this.finishTrace(traceId, 'success', undefined, {
        duration_ms: duration
      });
      // Registrar métricas
      this.recordMetrics({
        operation: operationName,
        duration_ms: duration,
        status_code: 200
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.finishTrace(traceId, 'error', error, {
        duration_ms: duration
      });
      // Registrar métricas de erro
      this.recordMetrics({
        operation: operationName,
        duration_ms: duration,
        error_count: 1,
        status_code: 500
      });
      throw error;
    }
  }
  /**
   * Monitorar chamada de banco de dados
   */ async monitorDatabase(traceId, query, operation) {
    if (!this.config.enable_database_monitoring) {
      return operation();
    }
    const startTime = Date.now();
    this.addTraceLog(traceId, 'debug', `Database query: ${query.substring(0, 100)}...`);
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.addTraceTags(traceId, {
        db_query_duration_ms: duration,
        db_query: query.substring(0, 200)
      });
      this.addTraceLog(traceId, 'info', `Database query completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addTraceTags(traceId, {
        db_query_duration_ms: duration,
        db_query_error: error.message
      });
      this.addTraceLog(traceId, 'error', `Database query failed: ${error.message}`);
      throw error;
    }
  }
  /**
   * Monitorar chamada externa
   */ async monitorExternalCall(traceId, url, method, operation) {
    if (!this.config.enable_external_monitoring) {
      return operation();
    }
    const startTime = Date.now();
    this.addTraceLog(traceId, 'debug', `External call: ${method} ${url}`);
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.addTraceTags(traceId, {
        external_call_duration_ms: duration,
        external_url: url,
        external_method: method
      });
      this.addTraceLog(traceId, 'info', `External call completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addTraceTags(traceId, {
        external_call_duration_ms: duration,
        external_call_error: error.message
      });
      this.addTraceLog(traceId, 'error', `External call failed: ${error.message}`);
      throw error;
    }
  }
  /**
   * Registrar métrica customizada
   */ recordCustomMetric(name, value, tags = {}) {
    if (!this.config.enable_custom_metrics) {
      return;
    }
    this.recordMetrics({
      operation: 'custom_metric',
      custom_metrics: {
        [name]: value
      },
      ...tags
    });
  }
  /**
   * Obter estatísticas do APM
   */ getStats() {
    return {
      active_traces: this.activeTraces.size,
      traces_buffer_size: this.tracesBuffer.length,
      metrics_buffer_size: this.metricsBuffer.length,
      total_requests: this.requestCount,
      uptime_ms: Date.now() - this.startTime,
      config: this.config
    };
  }
  /**
   * Verificar se deve fazer sampling
   */ shouldSample() {
    this.requestCount++;
    // Rate limiting
    const requestsPerMinute = this.requestCount / ((Date.now() - this.startTime) / 60000);
    if (requestsPerMinute > this.config.max_traces_per_minute) {
      return false;
    }
    // Sample rate
    return Math.random() < this.config.sample_rate;
  }
  /**
   * Gerar trace ID único
   */ generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }
  /**
   * Gerar span ID único
   */ generateSpanId() {
    return `span_${Math.random().toString(36).substr(2, 8)}`;
  }
  /**
   * Obter nome da function
   */ getFunctionName() {
    return Deno.env.get('FUNCTION_NAME') || 'unknown-function';
  }
  /**
   * Verificar se é cold start
   */ isColdStart() {
    return this.requestCount <= 1;
  }
  /**
   * Obter uso de memória
   */ getMemoryUsage() {
    try {
      const memInfo = performance.memory;
      return memInfo ? Math.round(memInfo.usedJSHeapSize / 1024 / 1024) : 0;
    } catch  {
      return 0;
    }
  }
  /**
   * Iniciar timer de flush
   */ startFlushTimer() {
    this.flushTimer = setInterval(()=>{
      this.flush();
    }, this.config.flush_interval_ms);
  }
  /**
   * Flush dados para storage/endpoint
   */ async flush() {
    if (this.tracesBuffer.length === 0 && this.metricsBuffer.length === 0) {
      return;
    }
    const traces = [
      ...this.tracesBuffer
    ];
    const metrics = [
      ...this.metricsBuffer
    ];
    this.tracesBuffer = [];
    this.metricsBuffer = [];
    try {
      // Em produção, enviar para sistema de APM (Datadog, New Relic, etc.)
      await this.sendToAPMBackend(traces, metrics);
      console.log(`[APM_FLUSH] Enviados ${traces.length} traces e ${metrics.length} métricas`);
    } catch (error) {
      console.error('[APM_FLUSH_ERROR]', error);
      // Re-adicionar ao buffer em caso de erro
      this.tracesBuffer.unshift(...traces);
      this.metricsBuffer.unshift(...metrics);
    }
  }
  /**
   * Enviar dados para backend de APM
   */ async sendToAPMBackend(traces, metrics) {
    // Simular envio para backend de APM
    const apmData = {
      timestamp: new Date().toISOString(),
      function_name: this.getFunctionName(),
      environment: Deno.env.get('ENVIRONMENT'),
      traces,
      metrics
    };
    // Em produção, isso seria enviado para Datadog, New Relic, etc.
    console.log('[APM_DATA]', JSON.stringify(apmData, null, 2));
  }
  /**
   * Cleanup para shutdown
   */ async cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush final
    await this.flush();
    console.log('[APM] Cleanup completed');
  }
}
// Instância singleton
const apmMonitor = APMMonitor.getInstance();
// Funções de conveniência
export function startTrace(operationName, parentSpanId, tags) {
  return apmMonitor.startTrace(operationName, parentSpanId, tags);
}
export function finishTrace(traceId, status, error, tags) {
  apmMonitor.finishTrace(traceId, status, error, tags);
}
export function addTraceLog(traceId, level, message, fields) {
  apmMonitor.addTraceLog(traceId, level, message, fields);
}
export function addTraceTags(traceId, tags) {
  apmMonitor.addTraceTags(traceId, tags);
}
export function recordMetrics(metrics) {
  apmMonitor.recordMetrics(metrics);
}
export function recordCustomMetric(name, value, tags) {
  apmMonitor.recordCustomMetric(name, value, tags);
}
export async function withAPM(operationName, operation, tags) {
  return apmMonitor.withAPM(operationName, operation, tags);
}
export async function monitorDatabase(traceId, query, operation) {
  return apmMonitor.monitorDatabase(traceId, query, operation);
}
export async function monitorExternalCall(traceId, url, method, operation) {
  return apmMonitor.monitorExternalCall(traceId, url, method, operation);
}
export function getAPMStats() {
  return apmMonitor.getStats();
}
// Export da instância para casos especiais
export { apmMonitor };
