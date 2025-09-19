'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Zap, Clock, User, Bot } from 'lucide-react'
import { useAssistenteContabilIAStreaming } from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  cached?: boolean
  streaming?: boolean
}

export function StreamingChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const {
    streamQuery,
    isStreaming,
    streamedResponse,
    isCached,
    error,
    reset
  } = useAssistenteContabilIAStreaming()

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamedResponse])

  // Atualizar mensagem em streaming
  useEffect(() => {
    if (isStreaming && streamedResponse) {
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        
        if (lastMessage && lastMessage.type === 'assistant' && lastMessage.streaming) {
          lastMessage.content = streamedResponse
          lastMessage.cached = isCached
        } else {
          newMessages.push({
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            content: streamedResponse,
            timestamp: new Date(),
            cached: isCached,
            streaming: true
          })
        }
        
        return newMessages
      })
    }
  }, [streamedResponse, isStreaming, isCached])

  // Finalizar streaming
  useEffect(() => {
    if (!isStreaming && streamedResponse) {
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        
        if (lastMessage && lastMessage.streaming) {
          lastMessage.streaming = false
        }
        
        return newMessages
      })
    }
  }, [isStreaming, streamedResponse])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    reset()

    try {
      await streamQuery(userMessage.content)
    } catch (err) {
      console.error('Erro no streaming:', err)
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.',
        timestamp: new Date()
      }])
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          Assistente Contábil IA
          <Badge variant="secondary" className="ml-auto">
            <Zap className="h-3 w-3 mr-1" />
            Streaming
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 p-4">
        {/* Área de mensagens */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-blue-600/50" />
              <p className="text-lg font-medium mb-2">Olá! Sou seu assistente contábil</p>
              <p className="text-sm">
                Faça perguntas sobre contabilidade, impostos, DAS, MEI e muito mais!
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 max-w-[85%]",
                message.type === 'user' ? "ml-auto" : "mr-auto"
              )}
            >
              {message.type === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              )}
              
              <div
                className={cn(
                  "rounded-lg px-4 py-2 max-w-full",
                  message.type === 'user'
                    ? "bg-blue-600 text-white ml-auto"
                    : "bg-muted"
                )}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                  {message.streaming && (
                    <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                  <Clock className="h-3 w-3" />
                  {formatTime(message.timestamp)}
                  
                  {message.cached && (
                    <Badge variant="outline" className="text-xs py-0 px-1">
                      <Zap className="h-2 w-2 mr-1" />
                      Cache
                    </Badge>
                  )}
                  
                  {message.streaming && (
                    <Badge variant="outline" className="text-xs py-0 px-1">
                      <Loader2 className="h-2 w-2 mr-1 animate-spin" />
                      Digitando...
                    </Badge>
                  )}
                </div>
              </div>
              
              {message.type === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Formulário de input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta sobre contabilidade..."
            disabled={isStreaming}
            className="flex-1"
            maxLength={500}
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isStreaming}
            size="icon"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {/* Indicadores de status */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {isCached ? 'Carregando resposta do cache...' : 'Consultando IA...'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
