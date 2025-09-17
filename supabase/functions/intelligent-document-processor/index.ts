import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}


const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface DocumentProcessRequest {
  documentId: string
  filePath: string
  fileName: string
  fileType: string
  empresaId?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[INTELLIGENT_PROCESSOR] Iniciando processamento...')

    const body = await req.json()
    console.log('[INTELLIGENT_PROCESSOR] Body recebido:', body)

    // Teste simples para verificar se a função está funcionando
    if (body.test) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Intelligent Document Processor funcionando!',
          env_check: {
            supabase_url: !!supabaseUrl,
            service_key: !!supabaseServiceKey,
            openai_key: !!openAIApiKey
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Processamento real do documento
    const { documentId, filePath, fileName, fileType, empresaId }: DocumentProcessRequest = body

    if (!documentId || !filePath || !fileName) {
      throw new Error('Parâmetros obrigatórios não fornecidos')
    }

    console.log(`[INTELLIGENT_PROCESSOR] Processando documento: ${fileName}`)

    // Simular processamento por enquanto
    const result = {
      success: true,
      documentId,
      fileName,
      extractedData: {
        tipo_documento: 'Documento',
        confidence: 0.8,
        method: 'simplified'
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('[INTELLIGENT_PROCESSOR] Erro:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
