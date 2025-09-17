'use client'

import '@/styles/chat-animations.css'
import { useState, useRef, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAIQuery, useSupabase } from '@/hooks/use-supabase'
import { useEnhancedAIQuery, useEmpresaAIQuery, useAIQueryStats, type EnhancedAIQueryResponse } from '@/hooks/use-enhanced-ai-query'
import type { ContextualData } from '@/services/ai-context-service'
import { EstatisticasIA } from '@/components/assistente/estatisticas-ia'
import { HistoricoConversas } from '@/components/assistente/historico-conversas'
import { ContextInfoPanel } from '@/components/assistente/context-info-panel'
import { ChatMessage } from '@/components/assistente/chat-message'
import { VoiceInput } from '@/components/assistente/voice-input'
import { TypingIndicator } from '@/components/assistente/typing-indicator'
import { ConversationContextService, type ConversationMessage } from '@/services/conversation-context'
import { useAuthStore } from '@/store/auth-store'
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

interface Message extends ConversationMessage {
  response_time?: number
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
  },
  {
    id: 'regime-comparison',
    title: 'Comparar Regimes',
    description: 'Compare regimes tributários',
    icon: TrendingUp,
    prompt: 'Compare os regimes tributários (Simples Nacional, Lucro Presumido e Lucro Real) para uma empresa com faturamento anual de R$ 2 milhões',
    category: 'analysis'
  },
  {
    id: 'sped-obligations',
    title: 'Obrigações SPED',
    description: 'Consulte obrigações do SPED',
    icon: FileText,
    prompt: 'Quais são as principais obrigações do SPED (ECD, ECF, EFD-Contribuições) e seus prazos?',
    category: 'compliance'
  },
  {
    id: 'mei-guidance',
    title: 'Orientações MEI',
    description: 'Dúvidas sobre MEI',
    icon: Lightbulb,
    prompt: 'Explique as regras do MEI, limites de faturamento e obrigações para 2024',
    category: 'general'
  }
]

export default function AssistentePage() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Olá! Sou seu assistente contábil inteligente especializado em contabilidade brasileira com acesso completo aos seus dados. Posso analisar suas empresas, cálculos fiscais, obrigações pendentes e fornecer insights personalizados. Como posso ajudá-la hoje?',
      role: 'assistant',
      timestamp: new Date(),
      type: 'text'
    },
  ])
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState('chat')
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null)
  const [useEnhancedMode, setUseEnhancedMode] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Hooks para diferentes tipos de consulta
  const aiQuery = useAIQuery()
  const enhancedQuery = useEnhancedAIQuery()
  const empresaQuery = useEmpresaAIQuery()
  const aiStats = useAIQueryStats()
  const supabase = useSupabase()

  // Estado para dados contextuais da última consulta
  const [lastContextData, setLastContextData] = useState<ContextualData | null>(null)

  // Estado para empresas do usuário
  const [empresas, setEmpresas] = useState<Array<{id: string, nome: string}>>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)

  // Estado para contexto de conversa
  const [contextTokenCount, setContextTokenCount] = useState<number>(0)

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

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Carregar empresas do usuário quando autenticado
  useEffect(() => {
    if (user?.id) {
      carregarEmpresas()
    }
  }, [user?.id, carregarEmpresas])

  const handleRegenerateMessage = async (messageId: string) => {
    // Find the user message that triggered this assistant response
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex > 0) {
      const userMessage = messages[messageIndex - 1]
      if (userMessage && userMessage.role === 'user') {
        // Remove the assistant message and regenerate
        setMessages(prev => prev.slice(0, messageIndex))
        await handleSend(userMessage.content)
      }
    }
  }

  const handleMessageFeedback = async (messageId: string, isPositive: boolean) => {
    // TODO: Implement feedback storage
    console.log('Feedback:', messageId, isPositive)
    toast.success(isPositive ? 'Obrigado pelo feedback positivo!' : 'Obrigado pelo feedback. Vamos melhorar!')
  }

  const handleVoiceTranscript = (transcript: string) => {
    setInput(prev => prev + transcript)
  }

  const handleSend = async (customPrompt?: string) => {
    const messageText = customPrompt || input
    const isQueryPending = aiQuery.isPending || enhancedQuery.isPending || empresaQuery.isPending

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

    // Preparar contexto de conversa
    const conversationData = ConversationContextService.prepareConversationContext(
      updatedMessages,
      true
    )

    setContextTokenCount(conversationData.totalEstimatedTokens)

    try {
      let response: EnhancedAIQueryResponse

      // Verificar se usuário está autenticado
      if (!user?.id) {
        throw new Error('Usuário não autenticado')
      }

      // Escolher o tipo de consulta baseado no contexto
      if (useEnhancedMode && selectedEmpresa) {
        // Consulta específica de empresa com contexto rico
        response = await empresaQuery.mutateAsync({
          question: messageText,
          userId: user.id,
          empresaId: selectedEmpresa,
          includeFullContext: true
        })
      } else if (useEnhancedMode) {
        // Consulta geral com contexto rico
        response = await enhancedQuery.mutateAsync({
          question: messageText,
          context: 'assistente-contabil',
          enhancedContext: {
            userId: user.id,
            includeFinancialData: true,
            includeObligations: true,
            includeDocuments: false,
            timeRange: 'last_3_months'
          },
          useCache: true
        })
      } else {
        // Consulta tradicional (fallback)
        response = await aiQuery.mutateAsync({
          question: messageText,
          context: 'assistente-contabil'
        })
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.resposta || 'Desculpe, não consegui processar sua solicitação.',
        role: 'assistant',
        timestamp: new Date(),
        type: determineMessageType(messageText),
        tokens_used: response.tokens_usados,
        response_time: Date.now() - Date.now(), // Will be calculated properly
        model: response.modelo
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Salvar dados contextuais da última consulta
      if (response.contexto_usado) {
        setLastContextData(response.contexto_usado)
      }

      // Log de sucesso com métricas
      if (response.insights_gerados && response.insights_gerados.length > 0) {

      }

    } catch (error) {
      console.error('Erro ao processar mensagem:', error)

      const errorContent = error instanceof Error
        ? error.message === 'Usuário não autenticado'
          ? 'Por favor, faça login para usar o assistente.'
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
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Assistente IA
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Seu assistente contábil inteligente especializado em contabilidade brasileira
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {useEnhancedMode ? 'GPT-4o Enhanced' : 'GPT-4o'}
            </Badge>
            {useEnhancedMode && (
              <Badge variant="outline" className="text-xs">
                Contexto Rico
              </Badge>
            )}
          </div>
        </div>

        {/* Controles de Configuração */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center space-x-2">
              <Switch
                id="enhanced-mode"
                checked={useEnhancedMode}
                onCheckedChange={setUseEnhancedMode}
              />
              <Label htmlFor="enhanced-mode" className="text-sm font-medium">
                Modo Contexto Rico
              </Label>
              {useEnhancedMode && (
                <Badge variant="secondary" className="text-xs">
                  IA Avançada
                </Badge>
              )}
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
              {useEnhancedMode ? (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Análise contextual ativa
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  Modo tradicional
                </div>
              )}
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="chat">Chat Inteligente</TabsTrigger>
            <TabsTrigger value="actions">Ações Rápidas</TabsTrigger>
            <TabsTrigger value="context">Contexto IA</TabsTrigger>
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
                    {(aiQuery.isPending || enhancedQuery.isPending || empresaQuery.isPending) && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 animate-spin" />
                        {useEnhancedMode ? 'Analisando contexto...' : 'Processando...'}
                      </div>
                    )}
                  </div>

                  {/* Indicador de Contexto */}
                  <div className="flex items-center gap-2 text-xs">
                    {messages.length > 1 && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 cursor-help"
                        title={`O assistente considera as últimas ${Math.min(messages.length - 1, 10)} mensagens da conversa para fornecer respostas contextualizadas. Total estimado: ~${contextTokenCount} tokens.`}
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        {Math.min(messages.length - 1, 10)} msg no contexto
                      </Badge>
                    )}
                    {contextTokenCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="text-xs cursor-help"
                        title="Estimativa de tokens utilizados para o contexto da conversa"
                      >
                        ~{contextTokenCount} tokens
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 chat-scroll">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      onRegenerate={handleRegenerateMessage}
                      onFeedback={handleMessageFeedback}
                    />
                  ))}
                  
                  {(aiQuery.isPending || enhancedQuery.isPending || empresaQuery.isPending) && (
                    <TypingIndicator
                      isEnhanced={useEnhancedMode}
                      message={useEnhancedMode ? 'Analisando contexto empresarial...' : 'Processando sua pergunta...'}
                      contextMessageCount={Math.min(messages.length - 1, 10)}
                      contextTokenCount={contextTokenCount}
                    />
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border p-4">
                  {/* Context Status Bar */}
                  {messages.length > 1 && (
                    <div className="mb-3 p-2 bg-muted/30 rounded-md flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span>
                          Contexto ativo: {Math.min(messages.length - 1, 10)} mensagem(s) •
                          ~{contextTokenCount} tokens estimados
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs">Modo:</span>
                        <Badge variant="secondary" className="text-xs px-1 py-0">
                          {useEnhancedMode ? 'Enhanced' : 'Básico'}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Digite ou fale sua pergunta sobre contabilidade..."
                      disabled={aiQuery.isPending || enhancedQuery.isPending || empresaQuery.isPending}
                      className="flex-1"
                    />
                    <VoiceInput
                      onTranscript={handleVoiceTranscript}
                      disabled={aiQuery.isPending || enhancedQuery.isPending || empresaQuery.isPending}
                    />
                    <Button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || aiQuery.isPending || enhancedQuery.isPending || empresaQuery.isPending}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="context" className="space-y-4">
            <ContextInfoPanel
              isEnhanced={useEnhancedMode}
              selectedEmpresa={selectedEmpresa}
              contextData={lastContextData as Record<string, unknown> | null}
              onClearCache={aiStats.clearCache}
              cacheStats={aiStats.getCacheStats()}
            />
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
                // Adicionar conversa selecionada ao chat
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
    </MainLayout>
  )
}
