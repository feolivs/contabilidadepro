// CNPJ Consultation - Optimized Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7/dist/module/index.js';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Connection pool singleton
let supabaseClient = null;
const getClient = ()=>{
  if (!supabaseClient) {
    supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  }
  return supabaseClient;
};
const consultarCNPJ = async (cnpj)=>{
  try {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      return {
        success: false,
        error: 'CNPJ deve ter 14 dígitos'
      };
    }
    const supabase = getClient();
    // Verificar cache primeiro
    const { data: cached } = await supabase.from('cnpj_cache').select('dados, created_at').eq('cnpj', cnpjLimpo).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).single();
    if (cached) {
      return {
        success: true,
        data: cached.dados,
        cached: true
      };
    }
    // Consultar ReceitaWS
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, {
      headers: {
        'User-Agent': 'ContabilPro/2.0'
      }
    });
    if (!response.ok) {
      throw new Error(`ReceitaWS error: ${response.status}`);
    }
    const data = await response.json();
    if (data.status === 'ERROR') {
      return {
        success: false,
        error: data.message || 'CNPJ não encontrado'
      };
    }
    // Salvar no cache
    await supabase.from('cnpj_cache').upsert({
      cnpj: cnpjLimpo,
      dados: data,
      created_at: new Date().toISOString()
    });
    return {
      success: true,
      data,
      cached: false
    };
  } catch (error) {
    console.error('[CNPJ_ERROR]', error);
    return {
      success: false,
      error: 'Erro ao consultar CNPJ'
    };
  }
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { cnpj } = await req.json();
    if (!cnpj) {
      return new Response(JSON.stringify({
        success: false,
        error: 'CNPJ é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const result = await consultarCNPJ(cnpj);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[FUNCTION_ERROR]', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno do servidor'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
