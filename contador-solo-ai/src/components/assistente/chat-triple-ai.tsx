'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAssistenteContabilIA } from '@/hooks/use-supabase'
import { useAuth } from '@/hooks/use-auth'
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Brain, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp
} from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    usedTripleAI?: boolean
    processingInfo?: any
    explanation?: any
    nextSteps?: any[]
    alerts?: any[]
    resources?: any
  }
}

interface ChatTripleAIProps {
  empresaId?: string
  initialMode?: 'simple' | 'smart' | 'auto'
}

export function ChatTripleAI({ empresaId, initialMode = 'auto' }: ChatTripleAIProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'simple' | 'smart' | 'auto'>(initialMode)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  
  const assistenteIA = useAssistenteContabilIA()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || assistenteIA.isPending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')

    try {
      const response = await assistenteIA.mutateAsync({
        question: input.trim(),
        context: 'chat-interface',
        empresaId,
        userId: user?.id,
        useTripleAI: mode === 'smart',
        complexityThreshold: mode
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.resposta,
        timestamp: new Date(),
        metadata: {
          usedTripleAI: !!response.processing_info,
          processingInfo: response.processing_info,
          explanation: response.explicacao,
          nextSteps: response.proximos_passos,
          alerts: response.alertas,
          resources: response.recursos
        }
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const getModeIcon = (currentMode: string) => {
    switch (currentMode) {
      case 'simple': return <Zap className="h-4 w-4" />
      case 'smart': return <Brain className="h-4 w-4" />
      case 'auto': return <TrendingUp className="h-4 w-4" />
      default: return <Bot className="h-4 w-4" />
    }
  }

  const getModeDescription = (currentMode: string) => {
    switch (currentMode) {
      case 'simple': return 'Respostas rápidas e diretas'
      case 'smart': return 'Análise completa com Triple AI'
      case 'auto': return 'Inteligência adaptativa'
      default: return 'Modo padrão'
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Assistente Contábil IA
          </CardTitle>
          
          {/* Seletor de Modo */}
          <div className="flex gap-1">
            {(['simple', 'auto', 'smart'] as const).map((modeOption) => (
              <Button
                key={modeOption}
                variant={mode === modeOption ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(modeOption)}
                className="flex items-center gap-1"
                title={getModeDescription(modeOption)}
              >
                {getModeIcon(modeOption)}
                <span className="hidden sm:inline">
                  {modeOption === 'simple' ? 'Rápido' : 
                   modeOption === 'smart' ? 'Inteligente' : 'Auto'}
                </span>
              </Button>
            ))}
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {getModeDescription(mode)}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Área de Mensagens */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Olá! Sou seu assistente contábil IA.</p>
                <p className="text-sm">Faça uma pergunta sobre contabilidade, impostos ou sua empresa.</p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : message.metadata?.usedTripleAI 
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                          : 'bg-muted text-muted-foreground'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : message.metadata?.usedTripleAI ? (
                        <Brain className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className={`rounded-lg p-3 ${
                      message.type === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Metadados do Triple AI */}
                      {message.metadata?.usedTripleAI && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <Badge variant="secondary" className="mb-2">
                            <Brain className="h-3 w-3 mr-1" />
                            Triple AI
                          </Badge>
                          
                          {/* Próximos Passos */}
                          {message.metadata.nextSteps && message.metadata.nextSteps.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Próximos Passos:
                              </h4>
                              <ul className="text-sm space-y-1">
                                {message.metadata.nextSteps.map((step: any, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-xs bg-primary/20 text-primary px-1 rounded">
                                      {index + 1}
                                    </span>
                                    <span>{step.acao || step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Alertas */}
                          {message.metadata.alerts && message.metadata.alerts.length > 0 && (
                            <div className="mt-2">
                              <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Alertas:
                              </h4>
                              <div className="space-y-1">
                                {message.metadata.alerts.map((alert: any, index: number) => (
                                  <Badge 
                                    key={index} 
                                    variant={alert.urgencia === 'alta' ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {alert.mensagem || alert}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.metadata?.processingInfo && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {message.metadata.processingInfo.execution_time_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {assistenteIA.isPending && (
              <div className="flex gap-3 justify-start">
                <div className="flex gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      {mode === 'smart' ? 'Analisando com Triple AI...' : 'Processando...'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <Separator />

        {/* Input de Mensagem */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta sobre contabilidade..."
              disabled={assistenteIA.isPending}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!input.trim() || assistenteIA.isPending}
              size="icon"
            >
              {assistenteIA.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
