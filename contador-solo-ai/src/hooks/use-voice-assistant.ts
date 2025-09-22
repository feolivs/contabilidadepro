'use client'

import { useState, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'

interface VoiceAssistantResponse {
  success: boolean
  transcript: string
  response_text: string
  response_audio_url: string
  processing_time_ms: number
  cached: boolean
  context_used: boolean
  error?: string
}

interface VoiceSettings {
  voice_type: 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer'
  speed: number
  response_format: 'mp3' | 'opus' | 'aac' | 'flac'
}

interface UseVoiceAssistantOptions {
  empresaId?: string
  voiceSettings?: Partial<VoiceSettings>
  autoPlay?: boolean
}

/**
 * 🎤 Hook para assistente de voz com OpenAI Whisper + TTS
 * Reutiliza toda a infraestrutura existente do sistema
 */
export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const { user } = useAuthStore()

  // Estados
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [lastResponse, setLastResponse] = useState<VoiceAssistantResponse | null>(null)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const {
    empresaId,
    voiceSettings = {
      voice_type: 'nova',
      speed: 0.9,
      response_format: 'mp3'
    },
    autoPlay = true
  } = options

  /**
   * 🎙️ Converter Blob para Base64
   */
  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove o prefixo "data:audio/webm;base64,"
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }, [])

  /**
   * 🔊 Reproduzir áudio
   */
  const playAudio = useCallback(async (audioUrl: string): Promise<void> => {
    try {
      // Parar áudio atual se existir
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }

      const audio = new Audio(audioUrl)
      setCurrentAudio(audio)

      // Aguardar o áudio carregar e reproduzir
      await new Promise<void>((resolve, reject) => {
        audio.onloadeddata = () => {
          audio.play()
            .then(() => resolve())
            .catch(reject)
        }
        audio.onerror = reject
        audio.onended = () => {
          setCurrentAudio(null)
          resolve()
        }
      })

    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error)
      toast.error('Erro ao reproduzir resposta em áudio')
    }
  }, [currentAudio])

  /**
   * 🎤 Iniciar gravação
   */
  const startListening = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado')
      return
    }

    if (isListening || isProcessing) {
      return
    }

    try {
      // Solicitar permissão do microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000 // Otimizado para Whisper
        }
      })

      // Configurar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Parar stream
        stream.getTracks().forEach(track => track.stop())

        // Processar áudio gravado
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          await processVoiceInput(audioBlob)
        }
      }

      mediaRecorder.onerror = (error) => {
        console.error('Erro no MediaRecorder:', error)
        toast.error('Erro na gravação de áudio')
        setIsListening(false)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsListening(true)
      toast.success('Gravação iniciada - fale agora')

    } catch (error) {
      console.error('Erro ao acessar microfone:', error)

      if (error.name === 'NotAllowedError') {
        toast.error('Permissão de microfone negada. Habilite nas configurações do navegador.')
      } else if (error.name === 'NotFoundError') {
        toast.error('Microfone não encontrado')
      } else {
        toast.error('Erro ao acessar microfone')
      }
    }
  }, [user?.id, isListening, isProcessing])

  /**
   * 🛑 Parar gravação
   */
  const stopListening = useCallback((): void => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop()
      setIsListening(false)
      toast.info('Processando áudio...')
    }
  }, [isListening])

  /**
   * 🎯 Processar entrada de voz
   */
  const processVoiceInput = useCallback(async (audioBlob: Blob): Promise<VoiceAssistantResponse | null> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado')
      return null
    }

    setIsProcessing(true)
    setCurrentTranscript('')
    setLastResponse(null)

    try {
      // Converter áudio para base64
      const audioBase64 = await blobToBase64(audioBlob)

      // Chamar voice-assistant-service
      const response = await fetch('/functions/v1/voice-assistant-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_blob: audioBase64,
          user_id: user.id,
          empresa_id: empresaId,
          voice_settings: voiceSettings
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const result: VoiceAssistantResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro no processamento de voz')
      }

      // Atualizar estados
      setCurrentTranscript(result.transcript)
      setLastResponse(result)

      // Reproduzir áudio automaticamente se habilitado
      if (autoPlay && result.response_audio_url) {
        await playAudio(result.response_audio_url)
      }

      // Feedback para o usuário
      toast.success(
        `Processado em ${result.processing_time_ms}ms${result.cached ? ' (cache)' : ''}${result.context_used ? ' (contexto)' : ''}`
      )

      return result

    } catch (error) {
      console.error('Erro no processamento de voz:', error)

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro: ${errorMessage}`)

      return null
    } finally {
      setIsProcessing(false)
    }
  }, [user?.id, empresaId, voiceSettings, autoPlay, blobToBase64, playAudio])

  /**
   * 🔊 Reproduzir última resposta
   */
  const replayLastResponse = useCallback(async (): Promise<void> => {
    if (lastResponse?.response_audio_url) {
      await playAudio(lastResponse.response_audio_url)
    } else {
      toast.warning('Nenhuma resposta em áudio disponível')
    }
  }, [lastResponse, playAudio])

  /**
   * 🛑 Parar áudio atual
   */
  const stopAudio = useCallback((): void => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      setCurrentAudio(null)
    }
  }, [currentAudio])

  /**
   * 🧹 Limpar estado
   */
  const clearState = useCallback((): void => {
    stopListening()
    stopAudio()
    setCurrentTranscript('')
    setLastResponse(null)
  }, [stopListening, stopAudio])

  /**
   * 📝 Processar entrada de texto (para desenvolvimento/debug)
   */
  const processTextInput = useCallback(async (text: string): Promise<VoiceAssistantResponse | null> => {
    if (!user?.id) {
      toast.error('Usuário não autenticado')
      return null
    }

    if (!text.trim()) {
      toast.error('Texto não pode estar vazio')
      return null
    }

    setIsProcessing(true)
    setCurrentTranscript(text)
    setLastResponse(null)

    try {
      const response = await fetch('/functions/v1/voice-assistant-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_input: text,
          user_id: user.id,
          empresa_id: empresaId,
          voice_settings: voiceSettings
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`)
      }

      const result: VoiceAssistantResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro no processamento de texto')
      }

      setLastResponse(result)

      if (autoPlay && result.response_audio_url) {
        await playAudio(result.response_audio_url)
      }

      toast.success(`Processado em ${result.processing_time_ms}ms`)
      return result

    } catch (error) {
      console.error('Erro no processamento de texto:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro: ${errorMessage}`)
      return null
    } finally {
      setIsProcessing(false)
    }
  }, [user?.id, empresaId, voiceSettings, autoPlay, playAudio])

  return {
    // Estados
    isListening,
    isProcessing,
    currentTranscript,
    currentAudio,
    lastResponse,

    // Ações principais
    startListening,
    stopListening,
    processVoiceInput,
    processTextInput,

    // Controle de áudio
    playAudio,
    replayLastResponse,
    stopAudio,

    // Utilitários
    clearState,

    // Configurações
    voiceSettings,
    empresaId
  }
}