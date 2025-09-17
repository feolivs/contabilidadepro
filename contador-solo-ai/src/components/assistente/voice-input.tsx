'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Volume2, StopCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

export function VoiceInput({ onTranscript, disabled = false, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSupported(true)

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'pt-BR'
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListening(true)
        toast.success('Começando a escutar...')
      }

      recognition.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result && result[0]) {
            const transcript = result[0].transcript
            if (result.isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }
        }

        setTranscript(prev => prev + finalTranscript)
        setInterimTranscript(interimTranscript)

        if (finalTranscript) {
          onTranscript(finalTranscript)
        }
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)

        switch (event.error) {
          case 'network':
            toast.error('Erro de rede. Verifique sua conexão.')
            break
          case 'not-allowed':
            toast.error('Permissão de microfone negada. Habilite o microfone nas configurações.')
            break
          case 'no-speech':
            toast.warning('Nenhuma fala detectada. Tente falar mais próximo do microfone.')
            break
          default:
            toast.error('Erro no reconhecimento de voz.')
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        setInterimTranscript('')
        toast.info('Gravação finalizada')
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onTranscript])

  const startListening = async () => {
    if (!isSupported) {
      toast.error('Reconhecimento de voz não é suportado neste navegador.')
      return
    }

    if (disabled) return

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true })

      if (recognitionRef.current) {
        setTranscript('')
        setInterimTranscript('')
        recognitionRef.current.start()
      }
    } catch (error) {
      console.error('Microphone permission error:', error)
      toast.error('Erro ao acessar o microfone. Verifique as permissões.')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }

  if (!isSupported) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled
              className={cn('h-9 w-9 p-0', className)}
            >
              <MicOff className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Reconhecimento de voz não suportado
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Voice Input Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isListening ? "destructive" : "ghost"}
              size="sm"
              onClick={isListening ? stopListening : startListening}
              disabled={disabled}
              className={cn(
                'h-9 w-9 p-0 transition-all duration-200',
                isListening && 'animate-pulse',
                className
              )}
            >
              {isListening ? (
                <StopCircle className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isListening ? 'Parar gravação' : 'Iniciar gravação de voz'}
          </TooltipContent>
        </Tooltip>

        {/* Listening Indicator */}
        {isListening && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs animate-pulse">
              <Volume2 className="h-3 w-3 mr-1" />
              Escutando...
            </Badge>

            {/* Sound Wave Animation */}
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-1 bg-primary rounded-full animate-pulse',
                    i === 0 && 'h-2',
                    i === 1 && 'h-4',
                    i === 2 && 'h-2'
                  )}
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '0.8s'
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Interim Transcript Preview */}
        {interimTranscript && (
          <div className="max-w-xs">
            <Badge variant="outline" className="text-xs">
              {interimTranscript.length > 30
                ? `${interimTranscript.substring(0, 30)}...`
                : interimTranscript
              }
            </Badge>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// Extend the Window interface to include SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare const SpeechRecognition: {
  prototype: SpeechRecognition
  new(): SpeechRecognition
}