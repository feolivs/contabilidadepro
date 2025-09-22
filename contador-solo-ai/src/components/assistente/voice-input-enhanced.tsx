'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  StopCircle,
  Play,
  Pause,
  Send,
  Loader2,
  Settings,
  MessageSquare
} from 'lucide-react'
import { useVoiceAssistant } from '@/hooks/use-voice-assistant'
import { cn } from '@/lib/utils'

interface VoiceInputEnhancedProps {
  empresaId?: string
  onTranscript?: (text: string) => void
  onResponse?: (response: string) => void
  disabled?: boolean
  className?: string
  showTextInput?: boolean // Para desenvolvimento/debug
  autoPlay?: boolean
}

export function VoiceInputEnhanced({
  empresaId,
  onTranscript,
  onResponse,
  disabled = false,
  className,
  showTextInput = false,
  autoPlay = true
}: VoiceInputEnhancedProps) {
  const [textInput, setTextInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)

  const {
    isListening,
    isProcessing,
    currentTranscript,
    currentAudio,
    lastResponse,
    startListening,
    stopListening,
    processTextInput,
    replayLastResponse,
    stopAudio,
    clearState,
    voiceSettings
  } = useVoiceAssistant({
    empresaId,
    autoPlay,
    voiceSettings: {
      voice_type: 'nova',
      speed: 0.9,
      response_format: 'mp3'
    }
  })

  // Notificar componente pai sobre transcrição e resposta
  if (currentTranscript && onTranscript) {
    onTranscript(currentTranscript)
  }

  if (lastResponse?.response_text && onResponse) {
    onResponse(lastResponse.response_text)
  }

  const handleStartListening = async () => {
    if (!disabled) {
      await startListening()
    }
  }

  const handleStopListening = () => {
    stopListening()
  }

  const handleTextSubmit = async () => {
    if (textInput.trim() && !isProcessing) {
      await processTextInput(textInput.trim())
      setTextInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }

  const isAudioPlaying = currentAudio && !currentAudio.paused

  return (
    <TooltipProvider>
      <div className={cn('voice-input-enhanced', className)}>
        {/* Interface Principal de Voz */}
        <div className="flex items-center gap-2">
          {/* Botão Principal de Microfone */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isListening ? "destructive" : isProcessing ? "secondary" : "ghost"}
                size="sm"
                onMouseDown={handleStartListening}
                onMouseUp={handleStopListening}
                onTouchStart={handleStartListening}
                onTouchEnd={handleStopListening}
                disabled={disabled || isProcessing}
                className={cn(
                  'h-9 w-9 p-0 transition-all duration-200',
                  isListening && 'animate-pulse shadow-lg',
                  isProcessing && 'cursor-not-allowed'
                )}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isListening ? (
                  <StopCircle className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isProcessing
                ? 'Processando...'
                : isListening
                ? 'Solte para parar gravação'
                : 'Segure para gravar'
              }
            </TooltipContent>
          </Tooltip>

          {/* Indicador de Status */}
          {isListening && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs animate-pulse">
                <Volume2 className="h-3 w-3 mr-1" />
                Ouvindo...
              </Badge>

              {/* Animação de Ondas Sonoras */}
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

          {/* Indicador de Processamento */}
          {isProcessing && (
            <Badge variant="outline" className="text-xs">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processando...
            </Badge>
          )}

          {/* Controles de Áudio */}
          {lastResponse?.response_audio_url && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isAudioPlaying ? stopAudio : replayLastResponse}
                    className="h-7 w-7 p-0"
                  >
                    {isAudioPlaying ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAudioPlaying ? 'Pausar áudio' : 'Reproduzir resposta'}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Configurações */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="h-7 w-7 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Configurações de voz
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Transcrição Atual */}
        {currentTranscript && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs max-w-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              {currentTranscript.length > 50
                ? `${currentTranscript.substring(0, 50)}...`
                : currentTranscript
              }
            </Badge>
          </div>
        )}

        {/* Entrada de Texto para Debug */}
        {showTextInput && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite para testar (desenvolvimento)"
              className="text-xs"
              disabled={isProcessing}
            />
            <Button
              size="sm"
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || isProcessing}
              className="h-8"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Configurações de Voz */}
        {showSettings && (
          <Card className="mt-2">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="text-xs font-medium">Configurações de Voz</div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Voz:</span>
                    <span className="ml-1 font-medium">{voiceSettings.voice_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Velocidade:</span>
                    <span className="ml-1 font-medium">{voiceSettings.speed}x</span>
                  </div>
                </div>

                {lastResponse && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground">Última resposta:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Tempo:</span>
                        <span className="ml-1 font-medium">{lastResponse.processing_time_ms}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cache:</span>
                        <span className="ml-1 font-medium">{lastResponse.cached ? 'Sim' : 'Não'}</span>
                      </div>
                    </div>
                    <div className="mt-1">
                      <span className="text-muted-foreground">Contexto:</span>
                      <span className="ml-1 font-medium">{lastResponse.context_used ? 'Usado' : 'Não usado'}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-1 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearState}
                    className="h-6 text-xs"
                  >
                    Limpar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSettings(false)}
                    className="h-6 text-xs"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}