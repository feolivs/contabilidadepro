/**
 * Middleware de Validação Padronizado para Edge Functions
 * ContábilPro ERP - Eliminação de Código Duplicado
 */ import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { corsHeaders } from './cors.ts';
import { validarSchema, CommonSchemas } from './schemas.ts';
// Função de sanitização básica
function sanitizeInput(data) {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  const sanitized = Array.isArray(data) ? [] : {};
  for (const [key, value] of Object.entries(data)){
    // Remover propriedades perigosas
    if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
import { createAppError, createErrorResponse, handleUncaughtError } from './error-handler.ts';
/**
 * Middleware principal de validação
 */ export async function validateRequest(req, config) {
  const traceId = crypto.randomUUID();
  try {
    // 1. Verificar método HTTP
    if (req.method === 'OPTIONS') {
      return {
        success: false,
        error: createAppError('VALIDATION_ERROR', 'OPTIONS method handled by CORS', undefined, config.context, traceId)
      };
    }
    // 2. Extrair e sanitizar dados
    let dadosBrutos;
    try {
      dadosBrutos = await req.json();
    } catch (_error) {
      console.error(`[VALIDATION_JSON_ERROR] ${config.context}:`, error);
      return {
        success: false,
        error: createAppError('VALIDATION_ERROR', 'Dados JSON inválidos', {
          originalError: error
        }, config.context, traceId)
      };
    }
    // Sanitização básica (remover propriedades perigosas)
    const dadosSanitizados = sanitizeInput(dadosBrutos);
    // 3. Validar autenticação se necessário
    if (config.requireAuth) {
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: createAppError('AUTHENTICATION_ERROR', 'Token de autorização obrigatório', undefined, config.context, traceId)
        };
      }
    }
    // 4. Validar empresa_id se necessário
    if (config.requireEmpresaId) {
      const empresaValidation = validarSchema(z.object({
        empresa_id: CommonSchemas.empresaId
      }), dadosSanitizados, `${config.context}-empresa_id`);
      if (!empresaValidation.sucesso) {
        return {
          success: false,
          error: createAppError('VALIDATION_ERROR', 'empresa_id obrigatório e deve ser um UUID válido', {
            validationErrors: empresaValidation.erros
          }, config.context, traceId)
        };
      }
    }
    // 5. Validar user_id se necessário
    if (config.requireUserId) {
      const userValidation = validarSchema(z.object({
        user_id: CommonSchemas.userId
      }), dadosSanitizados, `${config.context}-user_id`);
      if (!userValidation.sucesso) {
        return {
          success: false,
          error: createAppError('VALIDATION_ERROR', 'user_id obrigatório e deve ser um UUID válido', {
            validationErrors: userValidation.erros
          }, config.context, traceId)
        };
      }
    }
    // 6. Validar schema principal
    const validacao = validarSchema(config.schema, dadosSanitizados, config.context);
    if (!validacao.sucesso) {
      console.error(`[VALIDATION_FAILED] ${config.context}:`, validacao.erros);
      return {
        success: false,
        error: createAppError('VALIDATION_ERROR', 'Dados de entrada inválidos', {
          validationErrors: validacao.erros
        }, config.context, traceId)
      };
    }
    // 7. Extrair metadados
    const data = validacao.dados;
    const metadata = {
      empresa_id: data.empresa_id,
      user_id: data.user_id,
      _trace_id: traceId
    };
    console.log(`[VALIDATION_SUCCESS] ${config.context}:`, {
      _trace_id: traceId,
      empresa_id: metadata.empresa_id,
      user_id: metadata.user_id
    });
    return {
      success: true,
      data: validacao.dados,
      metadata
    };
  } catch (_error) {
    console.error(`[VALIDATION_UNEXPECTED_ERROR] ${config.context}:`, error);
    return {
      success: false,
      error: createAppError('INTERNAL_SERVER_ERROR', 'Erro interno de validação', {
        originalError: error
      }, config.context, traceId)
    };
  }
}
/**
 * Função helper para criar resposta de erro padronizada
 * Agora usa o sistema unificado de error handling
 */ export function createValidationErrorResponse(error1) {
  return createErrorResponse(error1.error);
}
/**
 * Função helper para criar resposta de sucesso padronizada
 */ export function createSuccessResponse(data, metadata) {
  return new Response(JSON.stringify({
    success: true,
    data,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString()
    }
  }), {
    _status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
/**
 * Decorator para Edge Functions com validação automática
 */ export function withValidation(config, handler) {
  return async (req)=>{
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders
      });
    }
    // Validar request
    const validation = await validateRequest(req, config);
    if (!validation.success) {
      return createValidationErrorResponse(validation);
    }
    try {
      // Executar handler principal
      return await handler(validation.data, validation.metadata);
    } catch (_error) {
      console.error(`[HANDLER_ERROR] ${config.context}:`, error);
      // Usar o sistema unificado de error handling
      return handleUncaughtError(error, config.context);
    }
  };
}
