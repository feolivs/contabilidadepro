/**
 * 🏢 COMPANY SERVICE - Simplificado para Contadora Única
 * ContábilPRO ERP - Gestão de empresas otimizada
 *
 * FASE 2: Consolidação e simplificação
 * - Removida complexidade multi-tenant
 * - Simplificadas validações
 * - Otimizado para contadora única
 */ import { withValidation, createSuccessResponse } from '../_shared/validation-middleware.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
// =====================================================
// SCHEMAS SIMPLIFICADOS PARA CONTADORA ÚNICA
// =====================================================
const CompanyServiceSchema = z.object({
  action: z.enum([
    'cnpj',
    'create',
    'update',
    'delete',
    'list',
    'get'
  ]),
  // Para consulta CNPJ (com validação oficial)
  cnpj: z.string().optional().refine((cnpj)=>{
    if (!cnpj) return true; // Opcional
    return validateCNPJ(cnpj);
  }, {
    message: 'CNPJ inválido'
  }),
  // Para CRUD de empresas (simplificado)
  empresa_id: z.string().uuid().optional(),
  empresa_data: z.object({
    nome: z.string().min(3).optional(),
    nome_fantasia: z.string().optional(),
    cnpj: z.string().optional().refine((cnpj)=>{
      if (!cnpj) return true; // Opcional
      return validateCNPJ(cnpj);
    }, {
      message: 'CNPJ inválido'
    }),
    regime_tributario: z.enum([
      'simples',
      'presumido',
      'real',
      'mei'
    ]).default('simples'),
    email: z.string().email().optional(),
    telefone: z.string().optional(),
    endereco: z.string().optional(),
    observacoes: z.string().optional()
  }).optional(),
  // Filtros básicos
  filters: z.object({
    search: z.string().optional(),
    regime: z.string().optional(),
    ativa: z.boolean().optional()
  }).optional().default({})
});
// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================
export default withValidation({
  _schema: CompanyServiceSchema,
  context: 'company-service',
  _requireAuth: true,
  _requireUserId: true
}, async (data, metadata)=>{
  return await withAPM('company-service', async (traceId)=>{
    const { action } = data;
    const supabaseClient = await getOptimizedConnection('company-service');
    console.log(`[COMPANY_SERVICE] Ação: ${action}, User: ${metadata.user_id}`);
    recordCustomMetric('company_service_request', 1, {
      action
    });
    switch(action){
      case 'cnpj':
        return await handleCNPJConsultation(supabaseClient, data, metadata, traceId);
      case 'create':
        return await handleCreateEmpresa(supabaseClient, data, metadata, traceId);
      case 'update':
        return await handleUpdateEmpresa(supabaseClient, data, metadata, traceId);
      case 'delete':
        return await handleDeleteEmpresa(supabaseClient, data, metadata, traceId);
      case 'list':
        return await handleListEmpresas(supabaseClient, data, metadata, traceId);
      case 'get':
        return await handleGetEmpresa(supabaseClient, data, metadata, traceId);
      case 'validate':
        return await handleValidateEmpresa(supabaseClient, data, metadata, traceId);
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
 * Handle CNPJ Consultation - Reutiliza lógica da função unificada
 */ async function handleCNPJConsultation(supabase, data, metadata, traceId) {
  const { cnpj, advanced, include_suggestions } = data;
  try {
    // Limpar CNPJ
    const cnpjLimpo = cnpj.replace(/[^0-9]/g, '');
    if (cnpjLimpo.length !== 14) {
      throw new Error('CNPJ deve conter 14 dígitos');
    }
    // Verificar cache
    const cacheResult = await checkCNPJCache(supabase, cnpjLimpo, 24);
    if (cacheResult) {
      recordCustomMetric('cnpj_cache_hit', 1);
      return createSuccessResponse({
        success: true,
        data: cacheResult.data,
        _cached: true,
        suggestions: include_suggestions ? await generateSuggestions(cacheResult.data) : undefined
      });
    }
    // Consultar API externa
    const cnpjData = await consultarCNPJExterno(cnpjLimpo, advanced);
    // Salvar no cache
    await saveCNPJCache(supabase, cnpjLimpo, cnpjData, 24);
    // Log da consulta
    await logCNPJConsulta(supabase, cnpjLimpo, advanced, traceId);
    recordCustomMetric('cnpj_consultation_success', 1);
    return createSuccessResponse({
      success: true,
      data: cnpjData,
      _cached: false,
      suggestions: include_suggestions ? await generateSuggestions(cnpjData) : undefined
    });
  } catch (_error) {
    console.error('[CNPJ_CONSULTATION_ERROR]', error);
    recordCustomMetric('cnpj_consultation_error', 1);
    throw error;
  }
}
/**
 * Handle Create Empresa - 🔒 CORREÇÃO CRÍTICA 1.2: Validação Server-Side
 */ async function handleCreateEmpresa(supabase, data, metadata, traceId) {
  const { empresa_data } = data;
  try {
    // 🔒 VALIDAÇÃO SERVER-SIDE OBRIGATÓRIA
    checkRateLimit(metadata.user_id, 10, 60000); // 10 empresas por minuto
    // Validar dados completos server-side
    validateEmpresaData(empresa_data);
    // Verificar CNPJ duplicado no servidor
    const { data: existing } = await monitorDatabase(traceId, 'Check duplicate CNPJ', ()=>supabase.from('empresas').select('id').eq('cnpj', empresa_data.cnpj.replace(/\D/g, '')).eq('user_id', metadata.user_id).single());
    if (existing) {
      throw new Error('CNPJ já cadastrado para este usuário');
    }
    // Sanitizar dados antes de inserir
    const sanitizedData = sanitizeEmpresaData(empresa_data, metadata.user_id);
    // Criar empresa com dados sanitizados
    const { data: empresa, error: error1 } = await monitorDatabase(traceId, 'Create empresa', ()=>supabase.from('empresas').insert({
        ...sanitizedData,
        status: 'saudavel'
      }).select().single());
    if (error1) {
      console.error('[CREATE_EMPRESA_DB_ERROR]', error1);
      if (error1.code === '23505') {
        throw new Error('CNPJ já cadastrado');
      }
      throw new Error('Erro ao criar empresa');
    }
    // Log da criação (dados seguros)
    await supabase.from('audit_logs').insert({
      user_id: metadata.user_id,
      action: 'EMPRESA_CREATED',
      resource_type: 'empresa',
      resource_id: empresa.id,
      metadata: {
        _trace_id: traceId,
        cnpj_masked: empresa.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.***.***/****-$5')
      }
    });
    recordCustomMetric('empresa_created', 1);
    return createSuccessResponse({
      success: true,
      empresa,
      message: 'Empresa criada com sucesso'
    });
  } catch (_error) {
    console.error('[CREATE_EMPRESA_ERROR]', {
      message: error.message,
      userId: metadata.user_id,
      traceId
    });
    recordCustomMetric('empresa_creation_error', 1);
    throw error;
  }
}
/**
 * Handle List Empresas com filtros
 */ async function handleListEmpresas(supabase, data, metadata, traceId) {
  const { filters = {} } = data;
  try {
    let query = supabase.from('empresas').select('*').eq('user_id', metadata.user_id).order('created_at', {
      ascending: false
    });
    // Aplicar filtros
    if (filters.search) {
      query = query.or(`nome.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%`);
    }
    if (filters.regime && filters.regime !== 'all') {
      query = query.eq('regime_tributario', filters.regime);
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.cidade && filters.cidade !== 'all') {
      query = query.eq('endereco->cidade', filters.cidade);
    }
    const { data: empresas, error: error1 } = await monitorDatabase(traceId, 'List empresas with filters', ()=>query);
    if (error1) throw error1;
    recordCustomMetric('empresa_list_success', 1, {
      count: empresas.length,
      has_filters: Object.keys(filters).length > 0
    });
    return createSuccessResponse({
      success: true,
      empresas,
      total: empresas.length,
      _filters_applied: filters
    });
  } catch (_error) {
    console.error('[LIST_EMPRESAS_ERROR]', error);
    recordCustomMetric('empresa_list_error', 1);
    throw error;
  }
}
// =====================================================
// FUNÇÕES AUXILIARES REUTILIZADAS
// =====================================================
async function checkCNPJCache(supabase, cnpj, ttlHours) {
  const { data, error: error1 } = await supabase.from('cnpj_cache').select('*').eq('cnpj', cnpj).gte('created_at', new Date(Date.now() - ttlHours * 60 * 60 * 1000).toISOString()).order('created_at', {
    ascending: false
  }).limit(1).single();
  return error1 ? null : data;
}
async function consultarCNPJExterno(cnpj, advanced) {
  // Reutilizar lógica da função unificada existente
  const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
  const data = await response.json();
  if (data.status === 'ERROR') {
    throw new Error(data.message || 'CNPJ não encontrado');
  }
  return {
    cnpj: data.cnpj,
    razao_social: data.nome,
    nome_fantasia: data.fantasia,
    situacao: data.situacao,
    endereco: {
      logradouro: data.logradouro,
      numero: data.numero,
      bairro: data.bairro,
      cidade: data.municipio,
      uf: data.uf,
      cep: data.cep
    },
    atividade_principal: {
      codigo: data.atividade_principal?.[0]?.code || '',
      descricao: data.atividade_principal?.[0]?.text || ''
    },
    capital_social: parseFloat(data.capital_social || '0'),
    data_abertura: data.abertura
  };
}
async function saveCNPJCache(supabase, cnpj, data, ttlHours) {
  await supabase.from('cnpj_cache').upsert({
    cnpj,
    data,
    fonte: 'receitaws',
    _ttl_hours: ttlHours,
    created_at: new Date().toISOString()
  }, {
    onConflict: 'cnpj'
  });
}
async function generateSuggestions(data) {
  const suggestions = [];
  // Sugestão de regime baseado no porte
  if (data.capital_social < 360000) {
    suggestions.push({
      type: 'regime_tributario',
      title: 'Simples Nacional Recomendado',
      description: 'Baseado no capital social, o Simples Nacional pode ser vantajoso',
      priority: 'high'
    });
  }
  return suggestions;
}
async function logCNPJConsulta(supabase, cnpj, advanced, traceId) {
  await supabase.from('audit_logs').insert({
    action: 'CNPJ_CONSULTATION',
    resource_type: 'cnpj',
    _resource_id: cnpj,
    metadata: {
      _advanced_mode: advanced,
      _trace_id: traceId
    }
  });
}
// 🔒 CORREÇÃO CRÍTICA 1.2: Função validateCNPJ substituída por validateCNPJSecure
// Esta função foi mantida para compatibilidade, mas usa a versão segura
async function validateCNPJ(cnpj) {
  return validateCNPJSecure(cnpj);
}
/**
 * Handle Update Empresa - 🔒 CORREÇÃO CRÍTICA 1.2: Validação Server-Side
 */ async function handleUpdateEmpresa(supabase, data, metadata, traceId) {
  const { empresa_id, empresa_data } = data;
  try {
    // 🔒 VALIDAÇÃO SERVER-SIDE OBRIGATÓRIA
    checkRateLimit(metadata.user_id, 20, 60000); // 20 updates por minuto
    if (!empresa_id) {
      throw new Error('ID da empresa é obrigatório');
    }
    // Validar dados de atualização
    validateEmpresaUpdateData(empresa_data);
    // Verificar se empresa pertence ao usuário
    const { data: existing } = await monitorDatabase(traceId, 'Check empresa ownership', ()=>supabase.from('empresas').select('id, cnpj').eq('id', empresa_id).eq('user_id', metadata.user_id).single());
    if (!existing) {
      throw new Error('Empresa não encontrada ou sem permissão');
    }
    // Se CNPJ está sendo alterado, verificar duplicata
    if (empresa_data.cnpj && empresa_data.cnpj !== existing.cnpj) {
      const { data: duplicate } = await monitorDatabase(traceId, 'Check duplicate CNPJ on update', ()=>supabase.from('empresas').select('id').eq('cnpj', empresa_data.cnpj.replace(/\D/g, '')).eq('user_id', metadata.user_id).neq('id', empresa_id).single());
      if (duplicate) {
        throw new Error('CNPJ já cadastrado para outra empresa');
      }
    }
    // Sanitizar dados de atualização
    const sanitizedData = {
      ...empresa_data,
      updated_at: new Date().toISOString()
    };
    // Sanitizar campos específicos se fornecidos
    if (empresa_data.nome) sanitizedData.nome = empresa_data.nome.trim();
    if (empresa_data.cnpj) sanitizedData.cnpj = empresa_data.cnpj.replace(/\D/g, '');
    if (empresa_data.email) sanitizedData.email = empresa_data.email.trim().toLowerCase();
    // Atualizar empresa
    const { data: empresa, error: error1 } = await monitorDatabase(traceId, 'Update empresa', ()=>supabase.from('empresas').update(sanitizedData).eq('id', empresa_id).eq('user_id', metadata.user_id).select().single());
    if (error1) {
      console.error('[UPDATE_EMPRESA_DB_ERROR]', error1);
      throw new Error('Erro ao atualizar empresa');
    }
    // Log da atualização
    await supabase.from('audit_logs').insert({
      user_id: metadata.user_id,
      action: 'EMPRESA_UPDATED',
      resource_type: 'empresa',
      _resource_id: empresa_id,
      metadata: {
        _trace_id: traceId,
        fields_updated: Object.keys(empresa_data)
      }
    });
    recordCustomMetric('empresa_updated', 1);
    return createSuccessResponse({
      success: true,
      empresa,
      message: 'Empresa atualizada com sucesso'
    });
  } catch (_error) {
    console.error('[UPDATE_EMPRESA_ERROR]', {
      message: error.message,
      userId: metadata.user_id,
      _empresaId: empresa_id,
      traceId
    });
    recordCustomMetric('empresa_update_error', 1);
    throw error;
  }
}
/**
 * Handle Delete Empresa - 🔒 CORREÇÃO CRÍTICA 1.2: Validação Server-Side
 */ async function handleDeleteEmpresa(supabase, data, metadata, traceId) {
  const { empresa_id } = data;
  try {
    // 🔒 VALIDAÇÃO SERVER-SIDE OBRIGATÓRIA
    checkRateLimit(metadata.user_id, 5, 60000); // 5 deletes por minuto
    if (!empresa_id) {
      throw new Error('ID da empresa é obrigatório');
    }
    // Verificar se empresa pertence ao usuário
    const { data: existing } = await monitorDatabase(traceId, 'Check empresa ownership for delete', ()=>supabase.from('empresas').select('id, nome').eq('id', empresa_id).eq('user_id', metadata.user_id).single());
    if (!existing) {
      throw new Error('Empresa não encontrada ou sem permissão');
    }
    // Soft delete (marcar como inativa)
    const { error: error1 } = await monitorDatabase(traceId, 'Soft delete empresa', ()=>supabase.from('empresas').update({
        ativa: false,
        status: 'inativa',
        updated_at: new Date().toISOString()
      }).eq('id', empresa_id).eq('user_id', metadata.user_id));
    if (error1) {
      console.error('[DELETE_EMPRESA_DB_ERROR]', error1);
      throw new Error('Erro ao excluir empresa');
    }
    // Log da exclusão
    await supabase.from('audit_logs').insert({
      user_id: metadata.user_id,
      action: 'EMPRESA_DELETED',
      resource_type: 'empresa',
      _resource_id: empresa_id,
      metadata: {
        _trace_id: traceId,
        empresa_nome: existing.nome
      }
    });
    recordCustomMetric('empresa_deleted', 1);
    return createSuccessResponse({
      success: true,
      message: 'Empresa excluída com sucesso'
    });
  } catch (_error) {
    console.error('[DELETE_EMPRESA_ERROR]', {
      message: error.message,
      userId: metadata.user_id,
      _empresaId: empresa_id,
      traceId
    });
    recordCustomMetric('empresa_delete_error', 1);
    throw error;
  }
}
