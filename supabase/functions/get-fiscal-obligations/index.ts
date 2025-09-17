import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
Deno.serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[GET_FISCAL_OBLIGATIONS] No authorization header');
      throw new Error('Authorization header required');
    }
    const token = authHeader.replace('Bearer ', '');
    console.log('[GET_FISCAL_OBLIGATIONS] Token length:', token.length);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.error('[GET_FISCAL_OBLIGATIONS] Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    if (!user) {
      console.error('[GET_FISCAL_OBLIGATIONS] No user found');
      throw new Error('No user found');
    }
    // Parse request
    let action = 'get_obligations';
    let requestData = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
        action = requestData.action || 'get_obligations';
      } catch (_parseError) {
        console.error('[GET_FISCAL_OBLIGATIONS] JSON parse error:', parseError);
        requestData = {};
      }
    } else {
      const url = new URL(req.url);
      action = url.searchParams.get('action') || 'get_obligations';
    }
    console.log('[GET_FISCAL_OBLIGATIONS] Action:', action, 'User:', user.id, 'Data:', requestData);
    switch(action){
      case 'get_obligations':
        return await getObligations(supabase, user.id, requestData);
      case 'get_stats':
        return await getObligationStats(supabase, user.id);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (_error) {
    console.error('[GET_FISCAL_OBLIGATIONS] Error:', error);
    return new Response(JSON.stringify({
      _success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
/**
 * Buscar obrigações fiscais
 */ async function getObligations(supabase, userId, requestData) {
  const clientId = requestData.clientId;
  const status = requestData.status;
  const type = requestData.type;
  const limit = parseInt(requestData.limit || '50');
  console.log('[GET_OBLIGATIONS] Filters:', {
    clientId,
    status,
    type,
    limit
  });
  // Build query
  let query = supabase.from('fiscal_obligations').select(`
      *,
      empresas!client_id (
        nome,
        cnpj
      )
    `).eq('user_id', userId).order('due_date', {
    ascending: true
  });
  // Apply filters
  if (clientId) {
    query = query.eq('client_id', clientId);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (type) {
    query = query.eq('type', type);
  }
  if (limit) {
    query = query.limit(limit);
  }
  const { data, error: error1 } = await query;
  if (error1) {
    console.error('[GET_OBLIGATIONS] Database error:', error1);
    throw new Error('Erro ao buscar obrigações fiscais');
  }
  // Format data for frontend compatibility
  const formattedData = data?.map((obligation)=>({
      ...obligation,
      // Mapeamento para compatibilidade com interface existente
      client_id: obligation.client_id,
      client_name: obligation.empresas?.nome,
      title: obligation.title,
      reference_period: obligation.reference_period,
      tax_amount: parseFloat(obligation.tax_amount || '0'),
      due_date: obligation.due_date,
      type: obligation.type,
      // Mapear status para compatibilidade
      status: mapStatus(obligation.status)
    })) || [];
  console.log('[GET_OBLIGATIONS] Found', formattedData.length, 'obligations');
  return new Response(JSON.stringify({
    _success: true,
    data: formattedData
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    status: 200
  });
}
/**
 * Calcular estatísticas de obrigações
 */ async function getObligationStats(supabase, userId) {
  console.log('[GET_STATS] Calculating stats for user:', userId);
  const { data, error: error1 } = await supabase.from('fiscal_obligations').select('status, tax_amount, due_date').eq('user_id', userId);
  if (error1) {
    console.error('[GET_STATS] Database error:', error1);
    throw new Error('Erro ao calcular estatísticas');
  }
  const today = new Date().toISOString().split('T')[0];
  const stats = {
    total_pending: 0,
    total_overdue: 0,
    total_paid: 0,
    total_amount_pending: 0,
    total_amount_overdue: 0
  };
  data?.forEach((obligation)=>{
    const amount = parseFloat(obligation.tax_amount || '0');
    const isOverdue = obligation.due_date < today;
    switch(obligation.status){
      case 'pending':
        if (isOverdue) {
          stats.total_overdue++;
          stats.total_amount_overdue += amount;
        } else {
          stats.total_pending++;
          stats.total_amount_pending += amount;
        }
        break;
      case 'completed':
      case 'paid':
        stats.total_paid++;
        break;
    }
  });
  console.log('[GET_STATS] Calculated stats:', stats);
  return new Response(JSON.stringify({
    _success: true,
    data: stats
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    },
    status: 200
  });
}
/**
 * Mapear status para compatibilidade com frontend
 */ function mapStatus(status) {
  switch(status){
    case 'generated':
      return 'in_progress';
    case 'paid':
      return 'delivered';
    case 'pending':
      return 'pending';
    case 'overdue':
      return 'overdue';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}
