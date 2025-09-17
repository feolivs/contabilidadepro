/**
 * Monitor de Compliance em Tempo Real
 * ContábilPro ERP - Automação de Alertas Fiscais
 */ import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withValidation, createSuccessResponse } from '../_shared/validation-middleware.ts';
import { createAppError } from '../_shared/error-handler.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Schema para configuração do monitor
const ComplianceMonitorSchema = z.object({
  mode: z.enum([
    'check_all',
    'check_empresa',
    'check_urgent'
  ]).default('check_all'),
  empresa_id: z.string().uuid().optional(),
  days_ahead: z.number().min(1).max(90).default(30),
  send_alerts: z.boolean().default(true),
  alert_channels: z.array(z.enum([
    'email',
    'sms',
    'webhook',
    'dashboard'
  ])).default([
    'email',
    'dashboard'
  ])
});
export default withValidation({
  schema: ComplianceMonitorSchema,
  context: 'compliance-monitor',
  requireAuth: false
}, async (data, metadata)=>{
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const startTime = Date.now();
  console.log(`[COMPLIANCE_MONITOR] Iniciando verificação:`, {
    mode: data.mode,
    empresa_id: data.empresa_id,
    days_ahead: data.days_ahead,
    trace_id: metadata.trace_id
  });
  const report = await executeComplianceCheck(supabase, data);
  if (data.send_alerts && report.alertas.length > 0) {
    await sendComplianceAlerts(supabase, report.alertas, data.alert_channels);
  }
  const endTime = Date.now();
  report.tempo_processamento_ms = endTime - startTime;
  console.log(`[COMPLIANCE_MONITOR] Verificação concluída:`, {
    empresas_verificadas: report.total_empresas_verificadas,
    alertas_encontrados: report.alertas.length,
    tempo_ms: report.tempo_processamento_ms,
    trace_id: metadata.trace_id
  });
  return createSuccessResponse(report, {
    trace_id: metadata.trace_id,
    execution_time_ms: report.tempo_processamento_ms
  });
});
/**
 * Executa a verificação de compliance
 */ async function executeComplianceCheck(supabase, config) {
  // 1. Buscar empresas ativas
  const empresas = await getEmpresasAtivas(supabase, config.empresa_id);
  const report = {
    total_empresas_verificadas: empresas.length,
    total_obrigacoes_pendentes: 0,
    alertas_criticos: 0,
    alertas_altos: 0,
    alertas_medios: 0,
    alertas_baixos: 0,
    alertas_enviados: 0,
    tempo_processamento_ms: 0,
    alertas: []
  };
  // 2. Verificar cada empresa
  for (const empresa of empresas){
    const alertasEmpresa = await checkEmpresaCompliance(supabase, empresa, config.days_ahead);
    report.alertas.push(...alertasEmpresa);
    report.total_obrigacoes_pendentes += alertasEmpresa.length;
    // Contar por severidade
    alertasEmpresa.forEach((alerta)=>{
      switch(alerta.severidade){
        case 'critica':
          report.alertas_criticos++;
          break;
        case 'alta':
          report.alertas_altos++;
          break;
        case 'media':
          report.alertas_medios++;
          break;
        case 'baixa':
          report.alertas_baixos++;
          break;
      }
    });
  }
  // 3. Ordenar alertas por severidade e data
  report.alertas.sort((a, b)=>{
    const severidadeOrder = {
      critica: 0,
      alta: 1,
      media: 2,
      baixa: 3
    };
    const severidadeDiff = severidadeOrder[a.severidade] - severidadeOrder[b.severidade];
    if (severidadeDiff !== 0) return severidadeDiff;
    return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime();
  });
  return report;
}
/**
 * Busca empresas ativas para verificação
 */ async function getEmpresasAtivas(supabase, empresaId) {
  let query = supabase.from('empresas').select(`
      id,
      nome,
      cnpj,
      regime_tributario,
      status,
      configuracoes_compliance
    `).eq('status', 'ATIVA');
  if (empresaId) {
    query = query.eq('id', empresaId);
  }
  const { data, error } = await query;
  if (error) {
    throw createAppError('DATABASE_ERROR', 'Erro ao buscar empresas ativas', {
      error
    }, 'get-empresas');
  }
  return data || [];
}
/**
 * Verifica compliance de uma empresa específica
 */ async function checkEmpresaCompliance(supabase, empresa, daysAhead) {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() + daysAhead);
  // Buscar obrigações pendentes
  const { data: obrigacoes, error } = await supabase.from('prazos_fiscais').select(`
      id,
      titulo,
      descricao,
      tipo_obrigacao,
      data_vencimento,
      status,
      valor_estimado,
      penalidades
    `).eq('empresa_id', empresa.id).eq('status', 'pendente').gte('data_vencimento', new Date().toISOString()).lte('data_vencimento', dataLimite.toISOString()).order('data_vencimento', {
    ascending: true
  });
  if (error) {
    console.error(`[COMPLIANCE_CHECK_ERROR] Empresa ${empresa.id}:`, error);
    return [];
  }
  const alertas = [];
  for (const obrigacao of obrigacoes || []){
    const diasRestantes = Math.ceil((new Date(obrigacao.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const severidade = calculateSeveridade(diasRestantes, obrigacao.tipo_obrigacao);
    const consequencias = getConsequencias(obrigacao.tipo_obrigacao, obrigacao.penalidades);
    alertas.push({
      id: obrigacao.id,
      empresa_id: empresa.id,
      empresa_nome: empresa.nome,
      tipo_obrigacao: obrigacao.tipo_obrigacao,
      titulo: obrigacao.titulo,
      data_vencimento: obrigacao.data_vencimento,
      dias_restantes: diasRestantes,
      severidade,
      status: obrigacao.status,
      valor_estimado: obrigacao.valor_estimado,
      consequencias
    });
  }
  return alertas;
}
/**
 * Calcula severidade baseada nos dias restantes e tipo de obrigação
 */ function calculateSeveridade(diasRestantes, tipoObrigacao) {
  // Obrigações críticas (DAS, DARF, etc.)
  const obrigacoesCriticas = [
    'das',
    'darf',
    'gps',
    'fgts'
  ];
  const isCritica = obrigacoesCriticas.some((tipo)=>tipoObrigacao.toLowerCase().includes(tipo));
  if (isCritica) {
    if (diasRestantes <= 3) return 'critica';
    if (diasRestantes <= 7) return 'alta';
    if (diasRestantes <= 15) return 'media';
    return 'baixa';
  }
  // Obrigações regulares
  if (diasRestantes <= 1) return 'critica';
  if (diasRestantes <= 5) return 'alta';
  if (diasRestantes <= 10) return 'media';
  return 'baixa';
}
/**
 * Define consequências do não cumprimento
 */ function getConsequencias(tipoObrigacao, penalidades) {
  const consequenciasBase = [
    'Multa por atraso',
    'Juros de mora',
    'Possível autuação fiscal'
  ];
  const tipo = tipoObrigacao.toLowerCase();
  if (tipo.includes('das')) {
    return [
      ...consequenciasBase,
      'Exclusão do Simples Nacional',
      'Impedimento para participar de licitações'
    ];
  }
  if (tipo.includes('sped')) {
    return [
      ...consequenciasBase,
      'Multa de R$ 500,00 por mês',
      'Impossibilidade de emitir CND'
    ];
  }
  if (tipo.includes('darf')) {
    return [
      ...consequenciasBase,
      'Inscrição em dívida ativa',
      'Protesto do nome da empresa'
    ];
  }
  return consequenciasBase;
}
/**
 * Envia alertas de compliance
 */ async function sendComplianceAlerts(supabase, alertas, channels) {
  const alertasCriticos = alertas.filter((a)=>a.severidade === 'critica');
  const alertasAltos = alertas.filter((a)=>a.severidade === 'alta');
  // Enviar apenas alertas críticos e altos para não sobrecarregar
  const alertasParaEnvio = [
    ...alertasCriticos,
    ...alertasAltos
  ];
  if (alertasParaEnvio.length === 0) return;
  for (const channel of channels){
    try {
      switch(channel){
        case 'email':
          await sendEmailAlerts(supabase, alertasParaEnvio);
          break;
        case 'dashboard':
          await saveDashboardAlerts(supabase, alertasParaEnvio);
          break;
        case 'webhook':
          await sendWebhookAlerts(alertasParaEnvio);
          break;
        case 'sms':
          await sendSMSAlerts(alertasCriticos); // Apenas críticos por SMS
          break;
      }
    } catch (error) {
      console.error(`[ALERT_SEND_ERROR] Channel ${channel}:`, error);
    }
  }
}
/**
 * Envia alertas por email
 */ async function sendEmailAlerts(supabase, alertas) {
  // Agrupar por empresa
  const alertasPorEmpresa = alertas.reduce((acc, alerta)=>{
    if (!acc[alerta.empresa_id]) {
      acc[alerta.empresa_id] = [];
    }
    acc[alerta.empresa_id].push(alerta);
    return acc;
  }, {});
  for (const [empresaId, alertasEmpresa] of Object.entries(alertasPorEmpresa)){
    // Buscar contatos da empresa
    const { data: contatos } = await supabase.from('empresa_contatos').select('email, nome, tipo').eq('empresa_id', empresaId).eq('ativo', true);
    if (!contatos || contatos.length === 0) continue;
    const emailData = {
      destinatarios: contatos.map((c)=>c.email),
      assunto: `🚨 Alertas de Compliance - ${alertasEmpresa[0].empresa_nome}`,
      corpo_html: generateComplianceEmailHTML(alertasEmpresa),
      remetente_nome: 'ContábilPro - Monitor de Compliance',
      remetente_email: 'compliance@contabilpro.com',
      prioridade: 'alta'
    };
    // Enviar via Edge Function de email
    await supabase.functions.invoke('enviar-email', {
      body: emailData
    });
  }
}
/**
 * Salva alertas no dashboard
 */ async function saveDashboardAlerts(supabase, alertas) {
  const notificacoes = alertas.map((alerta)=>({
      empresa_id: alerta.empresa_id,
      tipo: 'compliance_alert',
      titulo: `${alerta.tipo_obrigacao.toUpperCase()} - ${alerta.dias_restantes} dias`,
      mensagem: alerta.titulo,
      severidade: alerta.severidade,
      data_vencimento: alerta.data_vencimento,
      metadados: {
        obrigacao_id: alerta.id,
        consequencias: alerta.consequencias,
        valor_estimado: alerta.valor_estimado
      },
      lida: false,
      created_at: new Date().toISOString()
    }));
  const { error } = await supabase.from('notificacoes').insert(notificacoes);
  if (error) {
    console.error('[DASHBOARD_ALERTS_ERROR]', error);
  }
}
/**
 * Envia alertas via webhook
 */ async function sendWebhookAlerts(alertas) {
  const webhookUrl = Deno.env.get('COMPLIANCE_WEBHOOK_URL');
  if (!webhookUrl) return;
  const payload = {
    timestamp: new Date().toISOString(),
    source: 'contabil-pro-compliance-monitor',
    alertas_criticos: alertas.filter((a)=>a.severidade === 'critica').length,
    alertas_altos: alertas.filter((a)=>a.severidade === 'alta').length,
    alertas: alertas.slice(0, 10)
  };
  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
/**
 * Envia alertas críticos por SMS
 */ async function sendSMSAlerts(alertasCriticos) {
  // Implementar integração com provedor de SMS
  console.log(`[SMS_ALERTS] ${alertasCriticos.length} alertas críticos para envio por SMS`);
}
/**
 * Gera HTML para email de compliance
 */ function generateComplianceEmailHTML(alertas) {
  const alertasCriticos = alertas.filter((a)=>a.severidade === 'critica');
  const alertasAltos = alertas.filter((a)=>a.severidade === 'alta');
  return `
    <h2>🚨 Alertas de Compliance - ${alertas[0].empresa_nome}</h2>
    
    ${alertasCriticos.length > 0 ? `
      <h3 style="color: #dc2626;">⚠️ Alertas Críticos (${alertasCriticos.length})</h3>
      <ul>
        ${alertasCriticos.map((a)=>`
          <li style="margin-bottom: 10px;">
            <strong>${a.titulo}</strong><br>
            Vencimento: ${new Date(a.data_vencimento).toLocaleDateString('pt-BR')}<br>
            Dias restantes: <span style="color: #dc2626; font-weight: bold;">${a.dias_restantes}</span>
          </li>
        `).join('')}
      </ul>
    ` : ''}
    
    ${alertasAltos.length > 0 ? `
      <h3 style="color: #f59e0b;">⚠️ Alertas de Alta Prioridade (${alertasAltos.length})</h3>
      <ul>
        ${alertasAltos.map((a)=>`
          <li style="margin-bottom: 10px;">
            <strong>${a.titulo}</strong><br>
            Vencimento: ${new Date(a.data_vencimento).toLocaleDateString('pt-BR')}<br>
            Dias restantes: ${a.dias_restantes}
          </li>
        `).join('')}
      </ul>
    ` : ''}
    
    <p><small>Este é um alerta automático do ContábilPro. Acesse o sistema para mais detalhes.</small></p>
  `;
}
