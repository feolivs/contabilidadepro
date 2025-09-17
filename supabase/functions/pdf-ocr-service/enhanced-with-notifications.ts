// Enhanced PDF OCR Service with Real-time Notifications
// This shows how RLS fix enables real-time progress updates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Initialize Supabase client for notifications
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Function to send real-time notifications
async function sendProgressNotification(
  userId: string, 
  documentId: string, 
  progress: number, 
  message: string,
  status: 'processing' | 'completed' | 'error' = 'processing'
) {
  try {
    // Now this works because we fixed RLS policies!
    const { error } = await supabase.rpc('create_realtime_notification', {
      p_user_id: userId,
      p_title: 'Processamento OCR',
      p_message: message,
      p_notification_type: 'ocr_progress',
      p_payload: {
        documentId,
        progress,
        status
      },
      p_priority: 'normal'
    })

    if (error) {
      console.error('[NOTIFICATION_ERROR]', error)
    } else {
      console.log(`[NOTIFICATION_SENT] Progress: ${progress}% - ${message}`)
    }
  } catch (error) {
    console.error('[NOTIFICATION_FAILED]', error)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { documentId, filePath, fileName, userId } = body

    // Validate required fields
    if (!documentId || !filePath || !fileName) {
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

    // Send initial notification
    if (userId) {
      await sendProgressNotification(
        userId, 
        documentId, 
        0, 
        'Iniciando processamento OCR...'
      )
    }

    // Handle test mode with progress notifications
    if (documentId?.startsWith('test-doc-') || filePath?.startsWith('test/')) {
      console.log('[PDF_OCR] Test mode with notifications')

      // Simulate progress updates
      if (userId) {
        await sendProgressNotification(userId, documentId, 25, 'Analisando documento...')
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        await sendProgressNotification(userId, documentId, 50, 'Extraindo texto...')
        
        await new Promise(resolve => setTimeout(resolve, 500))
        
        await sendProgressNotification(userId, documentId, 75, 'Analisando qualidade...')
        
        await new Promise(resolve => setTimeout(resolve, 200))
        
        await sendProgressNotification(
          userId, 
          documentId, 
          100, 
          'OCR concluído com sucesso!', 
          'completed'
        )
      }

      const mockResponse = {
        success: true,
        documentId,
        extractedText: `Documento de teste processado com sucesso!\n\nEste é um exemplo de texto extraído via OCR.\nO processamento foi realizado com notificações em tempo real.\n\nData: ${new Date().toLocaleDateString('pt-BR')}\nHorário: ${new Date().toLocaleTimeString('pt-BR')}`,
        method: 'native' as const,
        confidence: 0.95,
        processingTime: 1200,
        textQuality: {
          characterCount: 125,
          wordCount: 22,
          readabilityScore: 0.90,
          hasStructuredData: true
        }
      }

      return new Response(JSON.stringify(mockResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // For real documents, you would implement actual OCR processing here
    // with progress notifications at each step
    
    if (userId) {
      await sendProgressNotification(
        userId, 
        documentId, 
        100, 
        'Processamento real não implementado ainda', 
        'error'
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Real OCR processing not implemented yet',
        documentId,
        extractedText: '',
        method: 'native',
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

  } catch (error: any) {
    console.error('[PDF_OCR] Request error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message ?? 'Unknown error',
        documentId: 'unknown',
        extractedText: '',
        method: 'native',
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
})
