// Validation middleware for Edge Functions
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

export interface ValidationResult {
  success: boolean
  data?: any
  error?: string
}

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult {
  try {
    const validatedData = schema.parse(data)
    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      }
    }
    
    return {
      success: false,
      error: 'Unknown validation error'
    }
  }
}

export function createErrorResponse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

export function createSuccessResponse(data: any, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

export interface ValidationConfig {
  schema: z.ZodSchema<any>
  context: string
  requireAuth?: boolean
  requireUserId?: boolean
}

export interface RequestMetadata {
  userId?: string
  userRole?: string
  timestamp: Date
  requestId: string
}

export function withValidation(
  config: ValidationConfig,
  handler: (data: any, metadata: RequestMetadata) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    try {
      // Handle CORS
      if (request.method === 'OPTIONS') {
        return new Response('ok', {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          }
        })
      }

      // Parse request data
      let requestData = {}
      if (request.method !== 'GET') {
        const contentType = request.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          requestData = await request.json()
        }
      } else {
        const url = new URL(request.url)
        requestData = Object.fromEntries(url.searchParams.entries())
      }

      // Validate data
      const validation = validateRequest(config.schema, requestData)
      if (!validation.success) {
        return createErrorResponse(validation.error || 'Validation failed', 400)
      }

      // Create metadata
      const metadata: RequestMetadata = {
        timestamp: new Date(),
        requestId: crypto.randomUUID()
      }

      // Call handler
      const response = await handler(validation.data, metadata)

      // Add CORS headers to response
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

      return response

    } catch (error) {
      console.error(`[${config.context}] Error:`, error)
      return createErrorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      )
    }
  }
}
