// Simple Error Handler for Edge Functions
import { corsHeaders } from './cors.ts'

export function createErrorResponse(message: string, status = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  )
}

export function createSuccessResponse(data: any, status = 200): Response {
  return new Response(
    JSON.stringify({
      success: true,
      ...data
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    }
  )
}

export function handleError(error: any): Response {
  console.error('Function error:', error)

  const message = error.message || 'Erro interno do servidor'
  const status = error.status || 500

  return createErrorResponse(message, status)
}