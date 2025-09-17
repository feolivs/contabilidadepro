/**
 * Sistema de Monitoramento Avançado
 * ContábilPro ERP - Fase 2
 */ export class MonitoringService {
  supabase;
  functionName;
  sessionId;
  startTime;
  metrics = new Map();
  constructor(supabase, functionName){
    this.supabase = supabase;
    this.functionName = functionName;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }
  /**
   * Gera ID único para a sessão
   */ generateSessionId() {
    return `${this.functionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Inicia monitoramento da função
   */ async startFunction(userId, metadata) {
    await this.log('info', 'function_start', 'Função iniciada', userId, metadata);
  }
  /**
   * Finaliza monitoramento da função
   */ async endFunction(userId, metadata) {
    const executionTime = Date.now() - this.startTime;
    const performance = {
      function_name: this.functionName,
      execution_time_ms: executionTime,
      ...this.getPerformanceMetrics()
    };
    await this.log('info', 'function_end', 'Função finalizada', userId, {
      ...metadata,
      execution_time_ms: executionTime
    }, performance);
    // Salvar métricas de performance
    await this.savePerformanceMetrics(performance, userId);
  }
  /**
   * Registra erro na função
   */ async logError(error, userId, context) {
    const errorDetails = {
      error_type: error.constructor.name,
      error_message: error.message,
      stack_trace: error.stack,
      context
    };
    await this.log('error', 'function_error', 'Erro na função', userId, context, undefined, errorDetails);
    // Incrementar contador de erros
    this.incrementMetric('error_count');
  }
  /**
   * Registra evento de cache
   */ async logCacheEvent(hit, userId, metadata) {
    const eventType = hit ? 'cache_hit' : 'cache_miss';
    const message = hit ? 'Cache hit - dados retornados do cache' : 'Cache miss - dados gerados novamente';
    await this.log('info', eventType, message, userId, metadata);
    // Atualizar métricas de cache
    this.incrementMetric(hit ? 'cache_hits' : 'cache_misses');
  }
  /**
   * Registra evento de email
   */ async logEmailEvent(success, recipientCount, userId, metadata) {
    const eventType = success ? 'email_sent' : 'email_failed';
    const message = success ? `Email enviado com sucesso para ${recipientCount} destinatários` : `Falha no envio de email para ${recipientCount} destinatários`;
    await this.log(success ? 'info' : 'error', eventType, message, userId, {
      ...metadata,
      recipient_count: recipientCount
    });
    // Atualizar métricas de email
    this.incrementMetric(success ? 'emails_sent' : 'emails_failed');
    this.addToMetric('total_recipients', recipientCount);
  }
  /**
   * Registra evento de geração de PDF
   */ async logPdfEvent(success, fileSizeBytes, userId, metadata) {
    const eventType = success ? 'pdf_generated' : 'pdf_failed';
    const message = success ? `PDF gerado com sucesso${fileSizeBytes ? ` (${this.formatBytes(fileSizeBytes)})` : ''}` : 'Falha na geração de PDF';
    await this.log(success ? 'info' : 'error', eventType, message, userId, {
      ...metadata,
      file_size_bytes: fileSizeBytes
    });
    // Atualizar métricas de PDF
    this.incrementMetric(success ? 'pdfs_generated' : 'pdfs_failed');
    if (fileSizeBytes) {
      this.addToMetric('total_pdf_size', fileSizeBytes);
    }
  }
  /**
   * Registra warning de performance
   */ async logPerformanceWarning(metric, value, threshold, userId) {
    const message = `Performance warning: ${metric} (${value}) excedeu threshold (${threshold})`;
    await this.log('warn', 'performance_warning', message, userId, {
      metric,
      value,
      threshold,
      execution_time_ms: Date.now() - this.startTime
    });
  }
  /**
   * Log genérico estruturado
   */ async log(level, eventType, message, userId, metadata, performance, errorDetails) {
    const logEvent = {
      timestamp: new Date().toISOString(),
      level,
      event_type: eventType,
      function_name: this.functionName,
      user_id: userId,
      session_id: this.sessionId,
      message,
      metadata,
      performance,
      error_details: errorDetails
    };
    // Log no console para desenvolvimento
    if (Deno.env.get('ENVIRONMENT') !== 'production') {
      console.log(`[${level.toUpperCase()}] ${this.functionName}:`, logEvent);
    }
    // Salvar no banco de dados
    try {
      await this.supabase.from('monitoring_logs').insert(logEvent);
    } catch (error) {
      console.error('[MONITORING_LOG_ERROR]', error);
    }
    // Enviar alertas críticos
    if (level === 'critical' || level === 'error') {
      await this.sendAlert(logEvent);
    }
  }
  /**
   * Salva métricas de performance
   */ async savePerformanceMetrics(metrics, userId) {
    try {
      await this.supabase.from('performance_metrics').insert({
        ...metrics,
        user_id: userId,
        session_id: this.sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[PERFORMANCE_METRICS_ERROR]', error);
    }
  }
  /**
   * Obtém métricas de performance atuais
   */ getPerformanceMetrics() {
    const cacheHits = this.getMetric('cache_hits') || 0;
    const cacheMisses = this.getMetric('cache_misses') || 0;
    const totalCache = cacheHits + cacheMisses;
    const errorsCount = this.getMetric('error_count') || 0;
    const totalOperations = Math.max(1, totalCache + errorsCount);
    return {
      cache_hit_rate: totalCache > 0 ? cacheHits / totalCache * 100 : 0,
      error_rate: errorsCount / totalOperations * 100
    };
  }
  /**
   * Incrementa métrica
   */ incrementMetric(key) {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }
  /**
   * Adiciona valor à métrica
   */ addToMetric(key, value) {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }
  /**
   * Obtém valor da métrica
   */ getMetric(key) {
    return this.metrics.get(key) || 0;
  }
  /**
   * Formata bytes para formato legível
   */ formatBytes(bytes) {
    const units = [
      'B',
      'KB',
      'MB',
      'GB'
    ];
    let size = bytes;
    let unitIndex = 0;
    while(size >= 1024 && unitIndex < units.length - 1){
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
  /**
   * Envia alerta para eventos críticos
   */ async sendAlert(logEvent) {
    try {
      // Em produção, integrar com serviço de alertas (Slack, Discord, etc.)
      const alertMessage = `🚨 ALERTA ${logEvent.level.toUpperCase()}\n` + `Função: ${logEvent.function_name}\n` + `Mensagem: ${logEvent.message}\n` + `Usuário: ${logEvent.user_id || 'N/A'}\n` + `Timestamp: ${logEvent.timestamp}`;
      console.error('[ALERT]', alertMessage);
      // Salvar alerta no banco
      await this.supabase.from('system_alerts').insert({
        level: logEvent.level,
        function_name: logEvent.function_name,
        message: logEvent.message,
        user_id: logEvent.user_id,
        metadata: logEvent.metadata,
        created_at: logEvent.timestamp
      });
    } catch (error) {
      console.error('[ALERT_SEND_ERROR]', error);
    }
  }
  /**
   * Obtém estatísticas de performance da função
   */ static async getPerformanceStats(supabase, functionName, horasAtras = 24) {
    try {
      const dataLimite = new Date(Date.now() - horasAtras * 60 * 60 * 1000).toISOString();
      const { data: stats } = await supabase.from('performance_metrics').select('*').eq('function_name', functionName).gte('timestamp', dataLimite);
      if (!stats?.length) {
        return {
          total_executions: 0,
          avg_execution_time: 0,
          max_execution_time: 0,
          min_execution_time: 0,
          avg_cache_hit_rate: 0,
          avg_error_rate: 0
        };
      }
      const executionTimes = stats.map((s)=>s.execution_time_ms);
      const cacheHitRates = stats.map((s)=>s.cache_hit_rate || 0);
      const errorRates = stats.map((s)=>s.error_rate || 0);
      return {
        total_executions: stats.length,
        avg_execution_time: executionTimes.reduce((a, b)=>a + b, 0) / executionTimes.length,
        max_execution_time: Math.max(...executionTimes),
        min_execution_time: Math.min(...executionTimes),
        avg_cache_hit_rate: cacheHitRates.reduce((a, b)=>a + b, 0) / cacheHitRates.length,
        avg_error_rate: errorRates.reduce((a, b)=>a + b, 0) / errorRates.length,
        period_hours: horasAtras
      };
    } catch (error) {
      console.error('[PERFORMANCE_STATS_ERROR]', error);
      return null;
    }
  }
}
