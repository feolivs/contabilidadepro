import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  console.log('[TEST_OCR] Function called with method:', req.method)
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('[TEST_OCR] Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[TEST_OCR] Processing request...')
    
    const body = await req.json().catch((error) => {
      console.error('[TEST_OCR] Failed to parse JSON:', error)
      return {}
    })

    console.log('[TEST_OCR] Request body:', body)

    const response = {
      success: true,
      message: 'Test OCR function is working!',
      timestamp: new Date().toISOString(),
      body: body
    }

    console.log('[TEST_OCR] Sending response:', response)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error: any) {
    console.error('[TEST_OCR] Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message ?? 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})
