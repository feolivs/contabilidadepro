// Centralized Error Handler for Edge Functions
import { logger } from './structured-logger.ts'

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_API = 'EXTERNAL_API',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  functionName?: string
  userId?: string
  requestId?: string
  timestamp?: Date
  metadata?: Record<string, any>
}

export class AppError extends Error {
  public readonly type: ErrorType
  public readonly severity: ErrorSeverity
  public readonly statusCode: number
  public readonly context: ErrorContext
  public readonly isOperational: boolean

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    context: ErrorContext = {},
    isOperational: boolean = true
  ) {
    super(message)
    
    this.name = 'AppError'
    this.type = type
    this.severity = severity
    this.statusCode = statusCode
    this.context = {
      timestamp: new Date(),
      ...context
    }
    this.isOperational = isOperational

    // Capture stack trace
    Error.captureStackTrace(this, AppError)
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      statusCode: this.statusCode,
      context: this.context,
      isOperational: this.isOperational,
      stack: this.stack
    }
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorType.VALIDATION, ErrorSeverity.LOW, 400, context)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context: ErrorContext = {}) {
    super(message, ErrorType.AUTHENTICATION, ErrorSeverity.MEDIUM, 401, context)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context: ErrorContext = {}) {
    super(message, ErrorType.AUTHORIZATION, ErrorSeverity.MEDIUM, 403, context)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context: ErrorContext = {}) {
    super(message, ErrorType.NOT_FOUND, ErrorSeverity.LOW, 404, context)
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorType.BUSINESS_LOGIC, ErrorSeverity.MEDIUM, 422, context)
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorType.EXTERNAL_API, ErrorSeverity.HIGH, 502, context)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, ErrorType.DATABASE, ErrorSeverity.HIGH, 500, context)
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Operation timed out', context: ErrorContext = {}) {
    super(message, ErrorType.TIMEOUT, ErrorSeverity.MEDIUM, 408, context)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context: ErrorContext = {}) {
    super(message, ErrorType.RATE_LIMIT, ErrorSeverity.MEDIUM, 429, context)
  }
}

// Error Handler Class
export class ErrorHandler {
  private static instance: ErrorHandler

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  handleError(error: Error, context: ErrorContext = {}): Response {
    // Determine if it's an operational error
    const isAppError = error instanceof AppError
    const appError = isAppError ? error : this.convertToAppError(error, context)

    // Log the error
    this.logError(appError)

    // Create response
    return this.createErrorResponse(appError)
  }

  private convertToAppError(error: Error, context: ErrorContext): AppError {
    // Convert common errors to AppError
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, context)
    }
    
    if (error.message.includes('timeout')) {
      return new TimeoutError(error.message, context)
    }
    
    if (error.message.includes('not found')) {
      return new NotFoundError(error.message, context)
    }
    
    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return new AuthenticationError(error.message, context)
    }
    
    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return new AuthorizationError(error.message, context)
    }

    // Default to internal error
    return new AppError(
      error.message || 'Internal server error',
      ErrorType.INTERNAL,
      ErrorSeverity.HIGH,
      500,
      context,
      false // Non-operational since it's unexpected
    )
  }

  private logError(error: AppError): void {
    const logMetadata = {
      errorType: error.type,
      severity: error.severity,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      context: error.context,
      stack: error.stack
    }

    switch (error.severity) {
      case ErrorSeverity.LOW:
        logger.info(`Error: ${error.message}`, logMetadata)
        break
      case ErrorSeverity.MEDIUM:
        logger.warn(`Error: ${error.message}`, logMetadata)
        break
      case ErrorSeverity.HIGH:
        logger.error(`Error: ${error.message}`, error, logMetadata)
        break
      case ErrorSeverity.CRITICAL:
        logger.fatal(`Critical Error: ${error.message}`, error, logMetadata)
        break
    }

    // Security logging for authentication/authorization errors
    if (error.type === ErrorType.AUTHENTICATION || error.type === ErrorType.AUTHORIZATION) {
      logger.security(
        `Security event: ${error.type}`,
        error.severity === ErrorSeverity.CRITICAL ? 'critical' : 'medium',
        {
          userId: error.context.userId,
          requestId: error.context.requestId,
          message: error.message
        }
      )
    }
  }

  private createErrorResponse(error: AppError): Response {
    const isDevelopment = Deno.env.get('NODE_ENV') === 'development'
    
    const errorResponse: any = {
      error: {
        message: error.message,
        type: error.type,
        code: error.statusCode
      }
    }

    // Include additional details in development
    if (isDevelopment) {
      errorResponse.error.severity = error.severity
      errorResponse.error.context = error.context
      errorResponse.error.stack = error.stack
    }

    // Include request ID for tracking
    if (error.context.requestId) {
      errorResponse.requestId = error.context.requestId
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      }
    )
  }

  // Async error wrapper
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context: ErrorContext = {}
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      throw this.convertToAppError(error as Error, context)
    }
  }

  // Sync error wrapper
  wrapSync<T>(
    operation: () => T,
    context: ErrorContext = {}
  ): T {
    try {
      return operation()
    } catch (error) {
      throw this.convertToAppError(error as Error, context)
    }
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance()

// Convenience functions
export function handleError(error: Error, context: ErrorContext = {}): Response {
  return errorHandler.handleError(error, context)
}

export async function wrapAsync<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T> {
  return errorHandler.wrapAsync(operation, context)
}

export function wrapSync<T>(
  operation: () => T,
  context: ErrorContext = {}
): T {
  return errorHandler.wrapSync(operation, context)
}

// Error boundary for Edge Functions
export function withErrorHandling(
  handler: (request: Request) => Promise<Response>,
  context: Partial<ErrorContext> = {}
) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request)
    } catch (error) {
      const errorContext: ErrorContext = {
        requestId: crypto.randomUUID(),
        timestamp: new Date(),
        ...context
      }
      
      return errorHandler.handleError(error as Error, errorContext)
    }
  }
}
