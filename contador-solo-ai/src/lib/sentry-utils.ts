import * as Sentry from '@sentry/nextjs';

/**
 * Utilitários para integração com Sentry no ContabilidadePRO
 * Focado em capturar erros críticos para contabilidade
 */

export interface ContabilidadeError {
  type: 'calculation' | 'document' | 'api' | 'auth' | 'database' | 'general';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  userImpact?: string;
}

/**
 * Captura erros específicos do sistema contábil
 */
export function captureContabilidadeError(
  error: Error,
  errorInfo: ContabilidadeError
) {
  // Só capturar em produção ou quando explicitamente habilitado
  if (process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_SENTRY_DEBUG !== 'true') {
    console.error('ContabilidadeError:', error, errorInfo);
    return;
  }

  Sentry.withScope((scope) => {
    // Adicionar contexto específico do ContabilidadePRO
    scope.setTag('error_type', errorInfo.type);
    scope.setLevel(mapSeverityToSentryLevel(errorInfo.severity));
    
    // Adicionar contexto adicional
    if (errorInfo.context) {
      Object.entries(errorInfo.context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }

    // Adicionar informações sobre impacto no usuário
    if (errorInfo.userImpact) {
      scope.setTag('user_impact', errorInfo.userImpact);
    }

    // Adicionar fingerprint para agrupamento inteligente
    scope.setFingerprint([
      errorInfo.type,
      error.name,
      error.message.substring(0, 100)
    ]);

    Sentry.captureException(error);
  });
}

/**
 * Captura erros de cálculos fiscais (críticos)
 */
export function captureCalculationError(
  error: Error,
  calculationType: string,
  inputData?: any
) {
  captureContabilidadeError(error, {
    type: 'calculation',
    severity: 'critical',
    context: {
      calculation_type: calculationType,
      input_data: inputData ? JSON.stringify(inputData) : undefined
    },
    userImpact: 'Cálculo fiscal incorreto pode gerar multas'
  });
}

/**
 * Captura erros de processamento de documentos
 */
export function captureDocumentError(
  error: Error,
  documentType?: string,
  documentId?: string
) {
  captureContabilidadeError(error, {
    type: 'document',
    severity: 'high',
    context: {
      document_type: documentType,
      document_id: documentId
    },
    userImpact: 'Documento não processado corretamente'
  });
}

/**
 * Captura erros de APIs externas (Receita Federal, etc.)
 */
export function captureAPIError(
  error: Error,
  apiName: string,
  endpoint?: string
) {
  captureContabilidadeError(error, {
    type: 'api',
    severity: 'medium',
    context: {
      api_name: apiName,
      endpoint: endpoint
    },
    userImpact: 'Integração com órgão governamental indisponível'
  });
}

/**
 * Wrapper para operações críticas com captura automática de erro
 */
export async function withErrorCapture<T>(
  operation: () => Promise<T>,
  errorInfo: Omit<ContabilidadeError, 'severity'> & { severity?: ContabilidadeError['severity'] }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    captureContabilidadeError(
      error instanceof Error ? error : new Error(String(error)),
      {
        ...errorInfo,
        severity: errorInfo.severity || 'medium'
      }
    );
    throw error;
  }
}

/**
 * Adiciona contexto do usuário para debugging
 */
export function setUserContext(userId: string, email?: string, role?: string) {
  Sentry.setUser({
    id: userId,
    email: email,
    role: role
  });
}

/**
 * Adiciona contexto da empresa para debugging
 */
export function setCompanyContext(companyId: string, cnpj?: string, regime?: string) {
  Sentry.setContext('company', {
    id: companyId,
    cnpj: cnpj,
    tax_regime: regime
  });
}

/**
 * Mapeia severidade para níveis do Sentry
 */
function mapSeverityToSentryLevel(severity: ContabilidadeError['severity']): Sentry.SeverityLevel {
  switch (severity) {
    case 'low': return 'info';
    case 'medium': return 'warning';
    case 'high': return 'error';
    case 'critical': return 'fatal';
    default: return 'error';
  }
}

/**
 * Adiciona breadcrumb para rastreamento de ações do usuário
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    timestamp: Date.now() / 1000
  });
}

/**
 * Performance monitoring para operações críticas
 */
export function startTransaction(name: string, operation: string) {
  return Sentry.startSpan({
    name,
    op: operation,
    attributes: {
      system: 'contabilidadepro'
    }
  }, (span) => span);
}
