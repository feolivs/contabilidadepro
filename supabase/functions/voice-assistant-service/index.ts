/**
 * 🎤 VOICE ASSISTANT SERVICE - ContabilidadePRO
 * Edge Function para assistente de voz com OpenAI (Whisper + TTS)
 * Reutiliza 100% do assistente-contabil-ia existente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Configuração OpenAI
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1'

// Configuração Supabase para chamar outras functions
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Interfaces
interface VoiceRequest {
  audio_blob?: string           // Base64 do áudio (Whisper)
  text_input?: string          // Para debug/desenvolvimento
  empresa_id?: string          // Contexto da empresa
  user_id: string             // Usuário autenticado
  voice_settings?: {
    voice_type?: 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer'
    speed?: number             // 0.25 - 4.0
    response_format?: 'mp3' | 'opus' | 'aac' | 'flac'
  }
}

interface VoiceResponse {
  success: boolean
  transcript: string
  response_text: string
  response_audio_url: string
  processing_time_ms: number
  cached: boolean
  context_used: boolean
  error?: string
}

/**
 * 🎙️ Converter áudio para texto usando Whisper
 */
async function transcribeAudio(audioBase64: string): Promise<string> {
  console.log('🎙️ Iniciando transcrição com Whisper...')

  try {
    // Converter base64 para Blob
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))

    // Criar FormData para o Whisper
    const formData = new FormData()
    formData.append('file', new Blob([audioBytes], { type: 'audio/webm' }), 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'pt') // Português brasileiro
    formData.append('response_format', 'json')
    formData.append('temperature', '0.2') // Mais preciso para contabilidade

    const response = await fetch(`${OPENAI_API_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Whisper API Error:', response.status, errorText)
      throw new Error(`Whisper API error: ${response.status}`)
    }

    const data = await response.json()
    const transcript = data.text?.trim() || ''

    console.log('✅ Transcrição concluída:', transcript.substring(0, 100) + '...')
    return transcript

  } catch (error) {
    console.error('❌ Erro na transcrição:', error)
    throw new Error(`Erro na transcrição: ${error.message}`)
  }
}

/**
 * 🤖 Processar consulta usando assistente-contabil-ia existente
 */
async function processWithAI(transcript: string, userId: string, empresaId?: string): Promise<any> {
  console.log('🤖 Processando consulta com assistente-contabil-ia...')

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/assistente-contabil-ia`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'chat',
        pergunta: transcript,
        user_id: userId,
        empresa_id: empresaId
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Assistente IA Error:', response.status, errorText)
      throw new Error(`Assistente IA error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Erro no assistente IA')
    }

    console.log('✅ Resposta do assistente obtida')
    return result.data || result

  } catch (error) {
    console.error('❌ Erro no assistente IA:', error)
    throw new Error(`Erro no assistente IA: ${error.message}`)
  }
}

/**
 * 🔊 Converter texto para áudio usando OpenAI TTS
 */
async function synthesizeAudio(text: string, voiceSettings: any = {}): Promise<string> {
  console.log('🔊 Iniciando síntese de áudio com TTS...')

  try {
    const {
      voice_type = 'nova',
      speed = 1.0,
      response_format = 'mp3'
    } = voiceSettings

    // Limitar tamanho do texto (máximo ~4000 caracteres para TTS)
    const truncatedText = text.length > 4000 ? text.substring(0, 4000) + '...' : text

    const response = await fetch(`${OPENAI_API_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: truncatedText,
        voice: voice_type,
        speed: Math.max(0.25, Math.min(4.0, speed)), // Validar range
        response_format
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TTS API Error:', response.status, errorText)
      throw new Error(`TTS API error: ${response.status}`)
    }

    // Converter resposta para base64 data URL
    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
    const audioDataUrl = `data:audio/${response_format};base64,${audioBase64}`

    console.log('✅ Síntese de áudio concluída')
    return audioDataUrl

  } catch (error) {
    console.error('❌ Erro na síntese de áudio:', error)
    throw new Error(`Erro na síntese de áudio: ${error.message}`)
  }
}

/**
 * 🎯 Função principal de processamento
 */
async function processVoiceRequest(request: VoiceRequest): Promise<VoiceResponse> {
  const startTime = Date.now()

  console.log('🎤 Iniciando processamento de voz...')
  console.log('📊 Request info:', {
    hasAudio: !!request.audio_blob,
    hasText: !!request.text_input,
    userId: request.user_id,
    empresaId: request.empresa_id
  })

  try {
    let transcript = ''

    // 1. Transcrição (se áudio fornecido)
    if (request.audio_blob) {
      transcript = await transcribeAudio(request.audio_blob)
    } else if (request.text_input) {
      transcript = request.text_input
      console.log('📝 Usando texto direto para desenvolvimento:', transcript)
    } else {
      throw new Error('Áudio ou texto é obrigatório')
    }

    if (!transcript.trim()) {
      throw new Error('Transcrição vazia - tente falar mais claramente')
    }

    // 2. Processar com IA (reutiliza assistente existente)
    const aiResponse = await processWithAI(transcript, request.user_id, request.empresa_id)

    const responseText = aiResponse.resposta || aiResponse.response_text || 'Desculpe, não consegui processar sua solicitação.'

    // 3. Síntese de áudio
    const audioUrl = await synthesizeAudio(responseText, request.voice_settings)

    const processingTime = Date.now() - startTime

    const response: VoiceResponse = {
      success: true,
      transcript,
      response_text: responseText,
      response_audio_url: audioUrl,
      processing_time_ms: processingTime,
      cached: aiResponse.cached || false,
      context_used: aiResponse.context_used || false
    }

    console.log('✅ Processamento concluído em', processingTime, 'ms')
    return response

  } catch (error) {
    console.error('❌ Erro no processamento de voz:', error)

    return {
      success: false,
      transcript: '',
      response_text: '',
      response_audio_url: '',
      processing_time_ms: Date.now() - startTime,
      cached: false,
      context_used: false,
      error: error.message
    }
  }
}

/**
 * 🚀 Servidor principal
 */
serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validar OpenAI API key
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI API key não configurada'
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Método não permitido'
        }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse da requisição
    const requestData = await req.json() as VoiceRequest

    // Validação básica
    if (!requestData.user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'user_id é obrigatório'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!requestData.audio_blob && !requestData.text_input) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'audio_blob ou text_input é obrigatório'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Processar requisição
    const result = await processVoiceRequest(requestData)

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('[VOICE_ASSISTANT_ERROR]', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno do servidor',
        transcript: '',
        response_text: '',
        response_audio_url: '',
        processing_time_ms: 0,
        cached: false,
        context_used: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})