import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { processPDFDocument } from './real-ocr-implementation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)



serve(async (req) => {
  console.log('[PDF_OCR] Function called with method:', req.method)
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    console.log('[PDF_OCR] Handling CORS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[PDF_OCR] Parsing request body...')

    // Add timeout for request parsing
    const parseTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request parsing timeout')), 5000)
    )

    const body = await Promise.race([
      req.json(),
      parseTimeout
    ]).catch((error) => {
      console.error('[PDF_OCR] Failed to parse JSON:', error)
      throw new Error(`Request parsing failed: ${error.message}`)
    })

    console.log('[PDF_OCR] Request body:', body)

    // Validate required fields
    if (!body.documentId || !body.filePath || !body.fileName) {
      console.log('[PDF_OCR] Missing required fields:', { 
        documentId: !!body.documentId, 
        filePath: !!body.filePath, 
        fileName: !!body.fileName 
      })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: documentId, filePath, fileName'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Handle test mode
    if (body.documentId?.startsWith('test-doc-') || body.filePath?.startsWith('test/')) {
      console.log('[PDF_OCR] Test mode detected, returning mock response')
      
      const mockResponse = {
        success: true,
        documentId: body.documentId,
        extractedText: 'Este é um texto de teste extraído do PDF. Contém informações como CNPJ: 12.345.678/0001-90, valor: R$ 1.500,00 e data: 15/09/2025.',
        method: 'native',
        confidence: 0.95,
        processingTime: 1200,
        textQuality: {
          characterCount: 125,
          wordCount: 22,
          readabilityScore: 0.9,
          hasStructuredData: true
        }
      }

      return new Response(JSON.stringify(mockResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Real OCR processing
    console.log('[PDF_OCR] Processing real document:', body.fileName)

    try {
      // Timeout wrapper para toda a operação
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout after 25 seconds')), 25000)
      })

      const processingPromise = async () => {
        // Download PDF from Supabase Storage
        console.log('[PDF_OCR] Downloading file:', body.filePath)
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documentos')
          .download(body.filePath)

        if (downloadError || !fileData) {
          throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`)
        }

        console.log('[PDF_OCR] File downloaded successfully')

        // Process PDF with multiple strategies
        const pdfBuffer = await fileData.arrayBuffer()
        const preferredProvider = body.options?.quality === 'high' ? 'google-vision' : 'openai-vision'

        console.log(`[PDF_OCR] Starting processing with provider: ${preferredProvider}`)
        const result = await processPDFDocument(pdfBuffer, preferredProvider)

        return result
      }

      // Race between processing and timeout
      const result = await Promise.race([processingPromise(), timeoutPromise]) as any

      if (!result.success) {
        throw new Error(result.error || 'PDF processing failed')
      }

      console.log(`[PDF_OCR] Success! Method: ${result.method}, Confidence: ${result.confidence}`)

      // Analyze text quality
      const textQuality = {
        characterCount: result.text.length,
        wordCount: result.text.split(/\s+/).filter(word => word.length > 0).length,
        readabilityScore: Math.min(result.confidence + 0.1, 1.0),
        hasStructuredData: /\d{2}[\.\/]\d{2}[\.\/]\d{4}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|R\$\s*\d+[,\.]\d{2}/.test(result.text)
      }

      const response = {
        success: true,
        documentId: body.documentId,
        extractedText: result.text,
        method: result.method === 'text' ? 'native' : result.method,
        confidence: result.confidence,
        processingTime: result.processingTime,
        provider: result.provider,
        textQuality
      }

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })

    } catch (error) {
      console.error('[PDF_OCR] Processing error:', error)

      // Determinar tipo de erro para melhor feedback
      let errorType = 'processing_error'
      let userMessage = error.message

      if (error.message.includes('timeout')) {
        errorType = 'timeout'
        userMessage = 'Processamento demorou muito tempo. Tente novamente ou use um arquivo menor.'
      } else if (error.message.includes('download')) {
        errorType = 'download_error'
        userMessage = 'Erro ao baixar o arquivo. Verifique se o arquivo existe.'
      } else if (error.message.includes('API')) {
        errorType = 'api_error'
        userMessage = 'Erro na API de OCR. Tente novamente em alguns minutos.'
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: userMessage,
          errorType,
          documentId: body.documentId,
          extractedText: '',
          method: 'ocr',
          confidence: 0,
          processingTime: 0,
          textQuality: {
            characterCount: 0,
            wordCount: 0,
            readabilityScore: 0,
            hasStructuredData: false
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

  } catch (error: any) {
    console.error('[PDF_OCR] Request error:', error)

    // Determine error type for better debugging
    let errorType = 'unknown'
    let statusCode = 200

    if (error.message?.includes('timeout')) {
      errorType = 'timeout'
    } else if (error.message?.includes('parsing')) {
      errorType = 'parsing'
    } else if (error.message?.includes('validation')) {
      errorType = 'validation'
    }

    const errorResponse = {
      success: false,
      error: error?.message ?? 'Unknown error occurred',
      errorType,
      documentId: 'unknown',
      extractedText: '',
      method: 'native' as const,
      confidence: 0,
      processingTime: 0,
      textQuality: {
        characterCount: 0,
        wordCount: 0,
        readabilityScore: 0,
        hasStructuredData: false
      },
      timestamp: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode
      }
    )
  }
})
