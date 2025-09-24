'use client'

import '@/styles/chat-animations.css'
import { useState, useRef, useEffect, useCallback } from 'react'
import { CleanLayout } from '@/components/layout/clean-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAIQuery, useSupabase } from '@/hooks/use-supabase'
// Removido: Enhanced AI Query hooks - Fase 2 simplificação
// import { useEnhancedAIQuery, useEmpresaAIQuery, useAIQueryStats, type EnhancedAIQueryResponse } from '@/hooks/use-enhanced-ai-query'
// import type { ContextualData } from '@/services/ai-context-service'
import { EstatisticasIA } from '@/components/assistente/estatisticas-ia'
import { HistoricoConversas } from '@/components/assistente/historico-conversas'
import { ChatMessage } from '@/components/assistente/chat-message'
import { VoiceInput } from '@/components/assistente/voice-input'
import { VoiceInputEnhanced } from '@/components/assistente/voice-input-enhanced'
import { TypingIndicator } from '@/components/assistente/typing-indicator'
// Removido: ConversationContextService - Fase 2 simplificação
// import { ConversationContextService, type ConversationMessage } from '@/services/conversation-context'
import { useAuthStore } from '@/store/auth-store'
import { useRouter } from 'next/navigation'
import {
  Bot,
  Send,
  Calculator,
  FileText,
  Calendar,
  TrendingUp,
  Lightbulb,
  Clock,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

// Interfaces simplificadas para Fase 2
interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Message extends ConversationMessage {
  response_time?: number;
  type?: 'text' | 'calculation' | 'analysis' | 'suggestion';
  tokens_used?: number;
  model?: string;
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  prompt: string
  category: 'calculation' | 'analysis' | 'compliance' | 'general'
}

const quickActions: QuickAction[] = [
  {
    id: 'das-calculation',
    title: 'Calcular DAS',
    description: 'Calcule o DAS do Simples Nacional',
    icon: Calculator,
    prompt: 'Como calcular o DAS para uma empresa do Simples Nacional com faturamento de R$ 50.000 no mês?',
    category: 'calculation'
  },
  {
    id: 'fiscal-deadlines',
    title: 'Prazos Fiscais',
    description: 'Consulte os próximos vencimentos',
    icon: Calendar,
    prompt: 'Quais são os principais prazos fiscais para este mês?',
    category: 'compliance'
  },
  {
    id: 'financial-analysis',
    title: 'Análise Financeira',
    description: 'Analise a situação financeira',
    icon: TrendingUp,
    prompt: 'Faça uma análise da situação financeira das minhas empresas ativas',
    category: 'analysis'
  },
  {
    id: 'document-classification',
    title: 'Classificar Documentos',
    description: 'Ajuda com classificação contábil',
    icon: FileText,
    prompt: 'Como classificar contabilmente uma despesa com material de escritório?',
    category: 'general'
  },
  {
    id: 'tax-optimization',
    title: 'Otimização Tributária',
    description: 'Sugestões para reduzir impostos',
    icon: Lightbulb,
    prompt: 'Quais estratégias posso usar para otimizar a carga tributária dos meus clientes?',
    category: 'analysis'
  },
  {
    id: 'compliance-check',
    title: 'Verificar Conformidade',
    description: 'Verifique obrigações pendentes',
    icon: CheckCircle,
    prompt: 'Verifique se há alguma obrigação fiscal pendente ou em atraso',
    category: 'compliance'
  }
]

export default function AssistentePage() {
  const { user, isLoading, isInitialized } = useAuthStore()
  const router = useRouter()

  // Hook básico para consulta AI (simplificado) - SEMPRE no topo
  const aiQuery = useAIQuery()
  const supabase = useSupabase()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Olá! Sou seu assistente contábil especializado em contabilidade brasileira. Posso ajudar com cálculos fiscais, orientações tributárias e análises básicas. Como posso ajudá-la hoje?',
      role: 'assistant',
      timestamp: new Date(),
      type: 'text'
    },
  ])
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState('chat')
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null)

  // Estado para empresas do usuário
  const [empresas, setEmpresas] = useState<Array<{id: string, nome: string}>>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // TODOS OS HOOKS DEVEM ESTAR NO TOPO - ANTES DE QUALQUER RETURN
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const carregarEmpresas = useCallback(async () => {
    if (!user?.id) return

    setLoadingEmpresas(true)
    try {
      const { data: empresasData, error } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('user_id', user.id)
        .eq('ativa', true)
        .order('nome')

      if (error) {
        console.error('Erro ao carregar empresas:', error)
        return
      }

      setEmpresas(empresasData || [])
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
    } finally {
      setLoadingEmpresas(false)
    }
  }, [user?.id, supabase])

  // Verificar autenticação
  useEffect(() => {
    if (isInitialized && !isLoading && !user) {
      router.push('/login?redirect=/assistente')
    }
  }, [user, isLoading, isInitialized, router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Carregar empresas do usuário quando autenticado
  useEffect(() => {
    if (user?.id) {
      carregarEmpresas()
    }
  }, [user?.id, carregarEmpresas])

  // Debug logs
  console.log('🔍 Assistente Estado:', {
    isInitialized,
    isLoading,
    hasUser: !!user,
    userEmail: user?.email
  })

  // Mostrar loading enquanto verifica autenticação
  if (!isInitialized || isLoading) {
    console.log('⏳ Assistente: Mostrando loading...', { isInitialized, isLoading })
    return (
      <CleanLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verificando autenticação...</p>
          </div>
        </div>
      </CleanLayout>
    )
  }

  // Redirecionar se não autenticado
  if (!user) {
    console.log('🚫 Assistente: Usuário não autenticado, aguardando redirecionamento...')
    return null // O useEffect já fará o redirecionamento
  }

  console.log('✅ Assistente: Renderizando página para usuário autenticado:', user.email)

  const handleRegenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex > 0) {
      const userMessage = messages[messageIndex - 1]
      if (userMessage && userMessage.role === 'user') {
        setMessages(prev => prev.slice(0, messageIndex))
        await handleSend(userMessage.content)
      }
    }
  }

  const handleMessageFeedback = async (messageId: string, isPositive: boolean) => {
    console.log('Feedback:', messageId, isPositive)
    toast.success(isPositive ? 'Obrigado pelo feedback positivo!' : 'Obrigado pelo feedback. Vamos melhorar!')
  }

  const handleVoiceTranscript = (transcript: string) => {
    setInput(prev => prev + transcript)
  }

  const handleVoiceResponse = (response: string) => {
    // Resposta de voz foi processada - já aparece no áudio
    // Opcionalmente pode ser adicionada ao chat também
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      content: response,
      role: 'assistant',
      timestamp: new Date(),
      type: 'text',
      model: 'Voice + GPT-4o'
    }
    setMessages((prev) => [...prev, assistantMessage])
  }

  const handleSend = async (customPrompt?: string) => {
    const messageText = customPrompt || input
    const isQueryPending = aiQuery.isPending

    if (!messageText.trim() || isQueryPending) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      role: 'user',
      timestamp: new Date(),
      type: 'text'
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    if (!customPrompt) setInput('')

    try {
      if (!user?.id) {
        throw new Error('Por favor, faça login para usar o assistente contábil.')
      }

      // Consulta com contexto inteligente
      const response = await aiQuery.mutateAsync({
        question: messageText,
        context: 'assistente-contabil',
        userId: user.id,
        empresaId: selectedEmpresa || undefined // 🏢 Contexto da empresa selecionada
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.resposta || 'Desculpe, não consegui processar sua solicitação.',
        role: 'assistant',
        timestamp: new Date(),
        type: determineMessageType(messageText),
        tokens_used: response.tokens_usados,
        model: response.context_used ? 'GPT-4o + Contexto' : (response.modelo || 'GPT-4o')
      }

      setMessages((prev) => [...prev, assistantMessage])

    } catch (error) {
      console.error('Erro ao processar mensagem:', error)

      const errorContent = error instanceof Error
        ? error.message.includes('login')
          ? error.message
          : `Erro: ${error.message}`
        : 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.'

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: errorContent,
        role: 'assistant',
        timestamp: new Date(),
        type: 'text'
      }

      setMessages((prev) => [...prev, errorMessage])
    }
  }

  const determineMessageType = (message: string): Message['type'] => {
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('calcul') || lowerMessage.includes('das') || lowerMessage.includes('imposto')) {
      return 'calculation'
    }
    if (lowerMessage.includes('analis') || lowerMessage.includes('comparar') || lowerMessage.includes('dre')) {
      return 'analysis'
    }
    if (lowerMessage.includes('sugest') || lowerMessage.includes('otimiz') || lowerMessage.includes('estratégia')) {
      return 'suggestion'
    }
    return 'text'
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getCategoryColor = (category: QuickAction['category']) => {
    switch (category) {
      case 'calculation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'analysis':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'compliance':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <CleanLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Assistente IA
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Seu assistente contábil especializado em contabilidade brasileira
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              IA Contextual
            </Badge>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center space-x-2">
              <Label htmlFor="basic-mode" className="text-sm font-medium">
                Modo Básico Ativo
              </Label>
              <Badge variant="secondary" className="text-xs">
                Simplificado
              </Badge>
            </div>

            <div className="flex-1 max-w-sm">
              <Label htmlFor="empresa-select" className="text-sm font-medium mb-2 block">
                Empresa em Foco (Opcional)
              </Label>
              <Select value={selectedEmpresa || 'all'} onValueChange={(value) => setSelectedEmpresa(value === 'all' ? null : value)}>
                <SelectTrigger id="empresa-select" disabled={loadingEmpresas}>
                  <SelectValue placeholder={loadingEmpresas ? "Carregando..." : "Todas as empresas"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                  {empresas.length === 0 && !loadingEmpresas && (
                    <SelectItem value="no-empresas" disabled>
                      Nenhuma empresa encontrada
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  IA Contextual
                </div>
                {selectedEmpresa && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Contexto ativo
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">Chat Inteligente</TabsTrigger>
            <TabsTrigger value="actions">Ações Rápidas</TabsTrigger>
            <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <Card className="h-[700px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Conversa com IA
                    {aiQuery.isPending && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 animate-spin" />
                        Processando...
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col p-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-6 chat-scroll">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onRegenerate={handleRegenerateMessage}
                      onFeedback={handleMessageFeedback}
                    />
                  ))}

                  {aiQuery.isPending && (
                    <TypingIndicator
                      isEnhanced={false}
                      message="Processando sua pergunta..."
                      contextMessageCount={0}
                      contextTokenCount={0}
                    />
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-border p-4">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Digite sua pergunta sobre contabilidade..."
                      disabled={aiQuery.isPending}
                      className="flex-1"
                    />
                    <VoiceInputEnhanced
                      empresaId={selectedEmpresa || undefined}
                      onTranscript={handleVoiceTranscript}
                      onResponse={handleVoiceResponse}
                      disabled={aiQuery.isPending}
                      showTextInput={process.env.NODE_ENV === 'development'}
                    />
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || aiQuery.isPending}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Card key={action.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Icon className="h-6 w-6 text-primary" />
                        <Badge className={getCategoryColor(action.category)}>
                          {action.category}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {action.description}
                      </p>
                      <Button
                        onClick={() => {
                          setActiveTab('chat')
                          setTimeout(() => handleSend(action.prompt), 100)
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        Usar Ação
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <EstatisticasIA />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <HistoricoConversas
              onSelectConversa={(conversa) => {
                const userMessage: Message = {
                  id: `history-${Date.now()}`,
                  content: conversa.pergunta,
                  role: 'user',
                  timestamp: new Date(conversa.created_at),
                  type: 'text'
                }

                const assistantMessage: Message = {
                  id: `history-${Date.now() + 1}`,
                  content: conversa.resposta,
                  role: 'assistant',
                  timestamp: new Date(conversa.created_at),
                  type: conversa.tipo_consulta as Message['type']
                }

                setMessages(prev => [...prev, userMessage, assistantMessage])
                setActiveTab('chat')
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </CleanLayout>
  )
}