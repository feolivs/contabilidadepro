/**
 * 📊 ANALYTICS SERVICE - Core Service Consolidado
 * ContábilPro ERP - Serviço unificado para analytics e relatórios
 * 
 * CONSOLIDA:
 * - gerar-relatorio-pdf
 * - agendador-relatorios
 * - metrics-dashboard
 * - get-client-dashboard-metrics
 * - accounting-reports-generator
 */ import { withValidation, createSuccessResponse } from '../_shared/validation-middleware.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getOptimizedConnection } from '../_shared/connection-pool.ts';
import { withAPM, monitorDatabase, recordCustomMetric } from '../_shared/apm-monitor.ts';
// =====================================================
// SCHEMAS DE VALIDAÇÃO
// =====================================================
const AnalyticsServiceSchema = z.object({
  action: z.enum([
    'dashboard',
    'report',
    'schedule',
    'export',
    'metrics',
    'insights'
  ]),
  // Para dashboard metrics
  period: z.enum([
    'today',
    'week',
    'month',
    'quarter',
    'year',
    'custom'
  ]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  empresa_id: z.string().uuid().optional(),
  // Para relatórios
  report_type: z.enum([
    'financial',
    'tax',
    'compliance',
    'performance'
  ]).optional(),
  format: z.enum([
    'pdf',
    'excel',
    'csv',
    'json'
  ]).optional(),
  template_id: z.string().optional(),
  // Para agendamento
  schedule_config: z.object({
    frequency: z.enum([
      'daily',
      'weekly',
      'monthly',
      'quarterly'
    ]),
    day_of_week: z.number().min(0).max(6).optional(),
    day_of_month: z.number().min(1).max(31).optional(),
    time: z.string().optional(),
    recipients: z.array(z.string().email()).optional()
  }).optional(),
  // Para filtros
  filters: z.object({
    empresas: z.array(z.string().uuid()).optional(),
    tipos_documento: z.array(z.string()).optional(),
    status: z.array(z.string()).optional()
  }).optional()
});
// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
export default withValidation({
  schema: AnalyticsServiceSchema,
  context: 'analytics-service',
  requireAuth: true,
  requireUserId: true
}, async (data, metadata)=>{
  return await withAPM('analytics-service', async (traceId)=>{
    const { action } = data;
    const supabaseClient = await getOptimizedConnection('analytics-service');
    console.log(`[ANALYTICS_SERVICE] Ação: ${action}, User: ${metadata.user_id}`);
    recordCustomMetric('analytics_service_request', 1, {
      action
    });
    switch(action){
      case 'dashboard':
        return await handleDashboardMetrics(supabaseClient, data, metadata, traceId);
      case 'report':
        return await handleGenerateReport(supabaseClient, data, metadata, traceId);
      case 'schedule':
        return await handleScheduleReport(supabaseClient, data, metadata, traceId);
      case 'export':
        return await handleExportData(supabaseClient, data, metadata, traceId);
      case 'metrics':
        return await handleCustomMetrics(supabaseClient, data, metadata, traceId);
      case 'insights':
        return await handleBusinessInsights(supabaseClient, data, metadata, traceId);
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }
  }, {
    action: data.action,
    user_id: metadata.user_id
  });
});
// =====================================================
// HANDLERS ESPECÍFICOS
// =====================================================
/**
 * Handle Dashboard Metrics - Métricas otimizadas para dashboard
 */ async function handleDashboardMetrics(supabase, data, metadata, traceId) {
  const { period = 'month', start_date, end_date, empresa_id } = data;
  try {
    // Calcular período
    const dateRange = calculateDateRange(period, start_date, end_date);
    // Buscar métricas usando materialized view se disponível
    const metrics = await getDashboardMetrics(supabase, metadata.user_id, dateRange, empresa_id, traceId);
    recordCustomMetric('dashboard_metrics_success', 1, {
      period
    });
    return createSuccessResponse({
      success: true,
      metrics,
      period: dateRange,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DASHBOARD_METRICS_ERROR]', error);
    recordCustomMetric('dashboard_metrics_error', 1);
    throw error;
  }
}
/**
 * Handle Generate Report - Gerar relatórios em diferentes formatos
 */ async function handleGenerateReport(supabase, data, metadata, traceId) {
  const { report_type, format = 'pdf', filters = {} } = data;
  try {
    // Buscar dados para o relatório
    const reportData = await getReportData(supabase, report_type, filters, metadata.user_id, traceId);
    // Gerar relatório no formato solicitado
    const report = await generateReport(reportData, format, report_type);
    // Salvar relatório
    const { data: savedReport, error } = await monitorDatabase(traceId, 'Save generated report', ()=>supabase.from('relatorios_gerados').insert({
        user_id: metadata.user_id,
        tipo: report_type,
        formato: format,
        dados: reportData,
        arquivo_url: report.file_url,
        created_at: new Date().toISOString()
      }).select().single());
    if (error) throw error;
    recordCustomMetric('report_generation_success', 1, {
      type: report_type,
      format
    });
    return createSuccessResponse({
      success: true,
      report: savedReport,
      download_url: report.file_url
    });
  } catch (error) {
    console.error('[GENERATE_REPORT_ERROR]', error);
    recordCustomMetric('report_generation_error', 1);
    throw error;
  }
}
// =====================================================
// FUNÇÕES DE MÉTRICAS OTIMIZADAS
// =====================================================
/**
 * Obter métricas do dashboard usando queries otimizadas
 */ async function getDashboardMetrics(supabase, userId, dateRange, empresaId, traceId) {
  // Query otimizada para empresas
  const empresasQuery = supabase.from('empresas').select('id, status, created_at').eq('user_id', userId);
  if (empresaId) {
    empresasQuery.eq('id', empresaId);
  }
  const { data: empresas } = await monitorDatabase(traceId, 'Fetch empresas metrics', ()=>empresasQuery);
  // Query otimizada para documentos
  const documentosQuery = supabase.from('documentos_fiscais').select('id, status, created_at, valor_total').gte('created_at', dateRange.start).lte('created_at', dateRange.end);
  if (empresaId) {
    documentosQuery.eq('empresa_id', empresaId);
  } else {
    // Filtrar por empresas do usuário
    const empresaIds = empresas?.map((e)=>e.id) || [];
    if (empresaIds.length > 0) {
      documentosQuery.in('empresa_id', empresaIds);
    }
  }
  const { data: documentos } = await monitorDatabase(traceId, 'Fetch documentos metrics', ()=>documentosQuery);
  // Calcular métricas
  const hoje = new Date().toDateString();
  const metrics = {
    empresas: {
      total: empresas?.length || 0,
      ativas: empresas?.filter((e)=>e.status === 'saudavel').length || 0,
      inativas: empresas?.filter((e)=>e.status !== 'saudavel').length || 0,
      novas_mes: empresas?.filter((e)=>new Date(e.created_at).getMonth() === new Date().getMonth()).length || 0
    },
    documentos: {
      total: documentos?.length || 0,
      processados: documentos?.filter((d)=>d.status === 'processado').length || 0,
      pendentes: documentos?.filter((d)=>d.status === 'pendente').length || 0,
      erros: documentos?.filter((d)=>d.status === 'erro').length || 0,
      processados_hoje: documentos?.filter((d)=>d.status === 'processado' && new Date(d.created_at).toDateString() === hoje).length || 0
    },
    financeiro: {
      receita_mensal: 0,
      receita_anual: 0,
      ticket_medio: 0,
      crescimento_mes: 0
    },
    compliance: {
      das_pendentes: 0,
      obrigacoes_vencidas: 0,
      alertas_criticos: 0,
      score_compliance: 95
    }
  };
  return metrics;
}
/**
 * Calcular período de datas
 */ function calculateDateRange(period, startDate, endDate) {
  const now = new Date();
  switch(period){
    case 'today':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
      };
    case 'week':
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      return {
        start: weekStart.toISOString(),
        end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
      };
    case 'custom':
      return {
        start: startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        end: endDate || new Date().toISOString()
      };
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        end: new Date().toISOString()
      };
  }
}
/**
 * Buscar dados para relatório
 */ async function getReportData(supabase, reportType, filters, userId, traceId) {
  switch(reportType){
    case 'financial':
      return await getFinancialReportData(supabase, filters, userId, traceId);
    case 'tax':
      return await getTaxReportData(supabase, filters, userId, traceId);
    case 'compliance':
      return await getComplianceReportData(supabase, filters, userId, traceId);
    case 'performance':
      return await getPerformanceReportData(supabase, filters, userId, traceId);
    default:
      throw new Error(`Tipo de relatório não suportado: ${reportType}`);
  }
}
/**
 * Gerar relatório no formato especificado
 */ async function generateReport(data, format, type) {
  switch(format){
    case 'pdf':
      return await generatePDFReport(data, type);
    case 'excel':
      return await generateExcelReport(data, type);
    case 'csv':
      return await generateCSVReport(data, type);
    case 'json':
      return {
        data,
        format: 'json'
      };
    default:
      throw new Error(`Formato não suportado: ${format}`);
  }
}
/**
 * Gerar relatório PDF
 */ async function generatePDFReport(data, type) {
  // Implementação simplificada - expandir conforme necessário
  console.log(`[PDF_GENERATION] Gerando PDF para ${type}`);
  // Na implementação real, usaria biblioteca como Puppeteer ou jsPDF
  const mockPdfUrl = `https://storage.supabase.co/reports/${type}-${Date.now()}.pdf`;
  return {
    file_url: mockPdfUrl,
    format: 'pdf',
    size: '2.5MB'
  };
}
/**
 * Buscar dados do relatório financeiro
 */ async function getFinancialReportData(supabase, filters, userId, traceId) {
  // Query otimizada para dados financeiros
  const { data: empresas } = await supabase.from('empresas').select('id, nome, regime_tributario').eq('user_id', userId);
  const empresaIds = empresas?.map((e)=>e.id) || [];
  if (empresaIds.length === 0) {
    return {
      empresas: [],
      documentos: [],
      resumo: {}
    };
  }
  const { data: documentos } = await monitorDatabase(traceId, 'Fetch financial documents', ()=>supabase.from('documentos_fiscais').select('empresa_id, tipo_documento, valor_total, data_documento, status').in('empresa_id', empresaIds).eq('status', 'processado').order('data_documento', {
      ascending: false
    }));
  // Calcular resumo financeiro
  const resumo = {
    total_documentos: documentos?.length || 0,
    valor_total: documentos?.reduce((sum, doc)=>sum + (doc.valor_total || 0), 0) || 0,
    por_tipo: {},
    por_empresa: {}
  };
  return {
    empresas,
    documentos,
    resumo,
    generated_at: new Date().toISOString()
  };
}
