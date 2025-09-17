/**
 * Sistema Unificado de Error Handling para Edge Functions
 * ContábilPro ERP - Padronização de Tratamento de Erros
 */ import { corsHeaders } from './cors.ts';
/**
 * Mapeamento de códigos de erro para status HTTP e mensagens
 */ const ERROR_CONFIG = {
  VALIDATION_ERROR: {
    status: 400,
    userMessage: 'Dados fornecidos são inválidos. Verifique os campos e tente novamente.'
  },
  AUTHENTICATION_ERROR: {
    status: 401,
    userMessage: 'Acesso não autorizado. Faça login novamente.'
  },
  AUTHORIZATION_ERROR: {
    status: 403,
    userMessage: 'Você não tem permissão para realizar esta ação.'
  },
  NOT_FOUND_ERROR: {
    status: 404,
    userMessage: 'Recurso não encontrado.'
  },
  BUSINESS_RULE_ERROR: {
    status: 422,
    userMessage: 'Operação não permitida pelas regras de negócio.'
  },
  DATABASE_ERROR: {
    status: 500,
    userMessage: 'Erro interno do sistema. Nossa equipe foi notificada.'
  },
  EXTERNAL_API_ERROR: {
    status: 502,
    userMessage: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.'
  },
  RATE_LIMIT_ERROR: {
    status: 429,
    userMessage: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    userMessage: 'Erro interno do servidor. Nossa equipe foi notificada.'
  },
  TIMEOUT_ERROR: {
    status: 504,
    userMessage: 'Operação demorou muito para ser concluída. Tente novamente.'
  }
};
/**
 * Cria um erro padronizado
 */ export function createAppError(code, message, details, context, traceId) {
  const config = ERROR_CONFIG[code];
  return {
    code,
    message,
    details,
    userMessage: config.userMessage,
    statusCode: config.status,
    timestamp: new Date().toISOString(),
    traceId: traceId || crypto.randomUUID(),
    context
  };
}
/**
 * Converte erros nativos em AppError
 */ export function normalizeError(error, context, traceId) {
  // Se já é um AppError, retorna como está
  if (isAppError(error)) {
    return error;
  }
  // Se é um Error nativo
  if (error instanceof Error) {
    // Detectar tipo de erro baseado na mensagem
    const message = error.message.toLowerCase();
    if (message.includes('unauthorized') || message.includes('não autenticado')) {
      return createAppError('AUTHENTICATION_ERROR', error.message, {
        originalError: error.name
      }, context, traceId);
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return createAppError('AUTHORIZATION_ERROR', error.message, {
        originalError: error.name
      }, context, traceId);
    }
    if (message.includes('not found') || message.includes('não encontrado')) {
      return createAppError('NOT_FOUND_ERROR', error.message, {
        originalError: error.name
      }, context, traceId);
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return createAppError('TIMEOUT_ERROR', error.message, {
        originalError: error.name
      }, context, traceId);
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return createAppError('RATE_LIMIT_ERROR', error.message, {
        originalError: error.name
      }, context, traceId);
    }
    // Erro genérico
    return createAppError('INTERNAL_SERVER_ERROR', error.message, {
      originalError: error.name,
      stack: error.stack
    }, context, traceId);
  }
  // Se é um objeto com propriedades de erro
  if (typeof error === 'object' && error !== null) {
    const errorObj = error;
    if (errorObj.code && errorObj.message) {
      return createAppError(errorObj.code || 'INTERNAL_SERVER_ERROR', errorObj.message, errorObj.details, context, traceId);
    }
  }
  // Fallback para erros desconhecidos
  return createAppError('INTERNAL_SERVER_ERROR', 'Erro desconhecido', {
    originalError: String(error)
  }, context, traceId);
}
/**
 * Verifica se um objeto é um AppError
 */ export function isAppError(error) {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error && 'statusCode' in error && 'timestamp' in error;
}
/**
 * Cria uma resposta HTTP padronizada para erros
 */ export function createErrorResponse(error) {
  // Log estruturado do erro
  console.error(`[ERROR_${error.code}]`, {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    traceId: error.traceId,
    context: error.context,
    details: error.details,
    timestamp: error.timestamp
  });
  // Resposta para o cliente (sem informações sensíveis)
  const responseBody = {
    success: false,
    error: {
      code: error.code,
      message: error.userMessage,
      traceId: error.traceId,
      timestamp: error.timestamp
    },
    // Incluir detalhes apenas em desenvolvimento
    ...Deno.env.get('ENVIRONMENT') === 'development' && {
      debug: {
        originalMessage: error.message,
        details: error.details,
        context: error.context
      }
    }
  };
  return new Response(JSON.stringify(responseBody), {
    status: error.statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
/**
 * Wrapper para funções que podem gerar erros
 */ export function withErrorHandling(fn, context) {
  return async (...args)=>{
    const traceId = crypto.randomUUID();
    try {
      return await fn(...args);
    } catch (error) {
      const appError = normalizeError(error, context, traceId);
      throw appError;
    }
  };
}
/**
 * Middleware para capturar erros não tratados
 */ export function handleUncaughtError(error, context = 'unknown') {
  const appError = normalizeError(error, context);
  return createErrorResponse(appError);
}
/**
 * Utilitário para validar e lançar erros de negócio
 */ export function assertBusinessRule(condition, message, details, context) {
  if (!condition) {
    throw createAppError('BUSINESS_RULE_ERROR', message, details, context);
  }
}
/**
 * Utilitário para validar autenticação
 */ export function assertAuthenticated(user, context) {
  if (!user) {
    throw createAppError('AUTHENTICATION_ERROR', 'Usuário não autenticado', undefined, context);
  }
}
/**
 * Utilitário para validar autorização
 */ export function assertAuthorized(hasPermission, message = 'Acesso negado', context) {
  if (!hasPermission) {
    throw createAppError('AUTHORIZATION_ERROR', message, undefined, context);
  }
}
