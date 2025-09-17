/**
 * 🛡️ CORS SEGURO POR AMBIENTE - ContábilPRO ERP
 *
 * Configuração de CORS restrita por ambiente para máxima segurança.
 * Remove o wildcard '*' perigoso e implementa origins específicos.
 */ // Função para obter origins permitidos baseado no ambiente
const getAllowedOrigins = ()=>{
  const env = Deno.env.get('ENVIRONMENT') || Deno.env.get('DENO_ENV') || 'development';
  switch(env.toLowerCase()){
    case 'production':
    case 'prod':
      return [
        'https://contabilpro.vercel.app',
        'https://lobely.com.br',
        'https://www.lobely.com.br',
        'https://app.lobely.com.br'
      ];
    case 'staging':
    case 'stage':
      return [
        'https://contabilpro-staging.vercel.app',
        'https://staging.lobely.com.br',
        'https://preview.lobely.com.br'
      ];
    case 'development':
    case 'dev':
    default:
      return [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:4173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:4173'
      ];
  }
};
// Função para gerar headers CORS seguros baseados no origin da requisição
export const getCorsHeaders = (origin)=>{
  const allowedOrigins = getAllowedOrigins();
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  // Log para auditoria de segurança
  if (origin && !isAllowedOrigin) {
    console.warn(`[CORS_SECURITY] Blocked origin: ${origin}`);
  }
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
};
// Headers CORS padrão (para compatibilidade com código existente)
export const corsHeaders = getCorsHeaders();
// Função para validar origin de forma mais rigorosa
export const isValidOrigin = (origin)=>{
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
};
// Middleware para aplicar CORS em Edge Functions
export const applyCors = (request)=>{
  const origin = request.headers.get('origin');
  return getCorsHeaders(origin || undefined);
};
// Headers para requisições OPTIONS (preflight)
export const getPreflightHeaders = (origin)=>{
  return {
    ...getCorsHeaders(origin),
    'Access-Control-Max-Age': '86400'
  };
};
// Função para log de auditoria CORS
export const logCorsRequest = (request, allowed)=>{
  const origin = request.headers.get('origin');
  const userAgent = request.headers.get('user-agent');
  const method = request.method;
  console.log(`[CORS_AUDIT] ${method} from ${origin} - ${allowed ? 'ALLOWED' : 'BLOCKED'} - UA: ${userAgent?.substring(0, 50)}`);
};
// Export para compatibilidade (DEPRECATED - usar getCorsHeaders)
export const _corsHeaders = corsHeaders;
