/**
 * 🧠 CONVERSATION CONTEXT SERVICE
 *
 * Gerencia o contexto de conversa para o assistente de IA,
 * mantendo um histórico inteligente das últimas mensagens
 * para proporcionar conversas mais fluidas e contextuais.
 */

export interface ConversationMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  type?: 'text' | 'calculation' | 'analysis' | 'suggestion'
  tokens_used?: number
  model?: string
}

export interface ConversationContext {
  messages: ConversationMessage[]
  totalTokens: number
  sessionId: string
  lastActivity: Date
}

export class ConversationContextService {
  private static readonly MAX_CONTEXT_MESSAGES = 10
  private static readonly MAX_CONTEXT_TOKENS = 4000 // Deixar espaço para resposta
  private static readonly TOKEN_ESTIMATION_FACTOR = 0.75 // pt-BR usa menos tokens

  /**
   * Prepara o contexto de conversa para enviar à IA
   */
  static prepareConversationContext(
    messages: ConversationMessage[],
    includeSystemContext: boolean = true
  ): {
    contextMessages: Array<{ role: string; content: string }>
    contextInfo: string
    totalEstimatedTokens: number
  } {
    // Filtrar e limitar mensagens
    const relevantMessages = this.selectRelevantMessages(messages)

    // Construir array de mensagens para a IA
    const contextMessages = relevantMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    // Calcular tokens estimados
    const totalEstimatedTokens = this.estimateTokenCount(contextMessages)

    // Criar informação de contexto
    const contextInfo = this.buildContextInfo(relevantMessages)

    return {
      contextMessages,
      contextInfo,
      totalEstimatedTokens
    }
  }

  /**
   * Seleciona mensagens relevantes respeitando limites
   */
  private static selectRelevantMessages(
    messages: ConversationMessage[]
  ): ConversationMessage[] {
    if (messages.length <= this.MAX_CONTEXT_MESSAGES) {
      return messages
    }

    // Pegar sempre a primeira mensagem (contexto inicial) se existir
    const firstMessage = messages[0]
    const isFirstMessageSystem = firstMessage?.role === 'assistant' &&
      firstMessage?.content.includes('Olá! Sou seu assistente')

    // Pegar as últimas mensagens
    const recentMessages = messages.slice(-this.MAX_CONTEXT_MESSAGES)

    // Se a primeira mensagem é do sistema e não está nas recentes, incluí-la
    if (isFirstMessageSystem && !recentMessages.includes(firstMessage)) {
      // Remover uma mensagem recente para dar espaço à primeira
      recentMessages.shift()
      return [firstMessage, ...recentMessages]
    }

    return recentMessages
  }

  /**
   * Estima o número de tokens baseado no conteúdo
   */
  private static estimateTokenCount(
    messages: Array<{ role: string; content: string }>
  ): number {
    const totalChars = messages.reduce((sum, msg) =>
      sum + msg.content.length + msg.role.length, 0
    )

    // Estimativa: ~4 caracteres por token em português
    return Math.ceil(totalChars / 4 * this.TOKEN_ESTIMATION_FACTOR)
  }

  /**
   * Constrói informação contextual sobre a conversa
   */
  private static buildContextInfo(messages: ConversationMessage[]): string {
    if (messages.length === 0) return ''

    const userMessages = messages.filter(m => m.role === 'user').length
    const assistantMessages = messages.filter(m => m.role === 'assistant').length

    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .slice(-1)[0]

    const conversationDuration = messages.length > 1 && messages[0]?.timestamp && messages[messages.length - 1]?.timestamp
      ? this.getTimeDifferenceText(messages[0]!.timestamp, messages[messages.length - 1]!.timestamp)
      : 'Nova conversa'

    let contextInfo = `📚 CONTEXTO DA CONVERSA:
• Mensagens do usuário: ${userMessages}
• Respostas do assistente: ${assistantMessages}
• Duração da conversa: ${conversationDuration}
• Total de mensagens no contexto: ${messages.length}`

    // Adicionar informação sobre tipos de consulta
    const consultaTypes = this.extractConsultationTypes(messages)
    if (consultaTypes.length > 0) {
      contextInfo += `\n• Tipos de consulta: ${consultaTypes.join(', ')}`
    }

    // Adicionar tópicos recorrentes
    const topics = this.extractTopics(messages)
    if (topics.length > 0) {
      contextInfo += `\n• Tópicos discutidos: ${topics.join(', ')}`
    }

    contextInfo += '\n\n💡 INSTRUÇÃO: Continue a conversa considerando todo este contexto anterior.'

    return contextInfo
  }

  /**
   * Extrai tipos de consulta da conversa
   */
  private static extractConsultationTypes(messages: ConversationMessage[]): string[] {
    const types = new Set<string>()

    messages.forEach(msg => {
      if (msg.type && msg.role === 'assistant') {
        switch (msg.type) {
          case 'calculation':
            types.add('Cálculos')
            break
          case 'analysis':
            types.add('Análises')
            break
          case 'suggestion':
            types.add('Sugestões')
            break
        }
      }
    })

    return Array.from(types)
  }

  /**
   * Extrai tópicos principais da conversa
   */
  private static extractTopics(messages: ConversationMessage[]): string[] {
    const topics = new Set<string>()
    const keywords = [
      'DAS', 'IRPJ', 'CSLL', 'PIS', 'COFINS', 'ICMS', 'ISS',
      'Simples Nacional', 'Lucro Presumido', 'Lucro Real',
      'MEI', 'DEFIS', 'DASN', 'ECF', 'ECD', 'SPED',
      'obrigação', 'prazo', 'vencimento', 'multa',
      'balanço', 'DRE', 'fluxo de caixa',
      'empresa', 'CNPJ', 'regime tributário'
    ]

    const allText = messages
      .map(m => m.content.toLowerCase())
      .join(' ')

    keywords.forEach(keyword => {
      if (allText.includes(keyword.toLowerCase())) {
        topics.add(keyword)
      }
    })

    return Array.from(topics).slice(0, 5) // Limitar a 5 tópicos principais
  }

  /**
   * Calcula diferença de tempo em formato legível
   */
  private static getTimeDifferenceText(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Menos de 1 minuto'
    if (diffMins < 60) return `${diffMins} minuto${diffMins > 1 ? 's' : ''}`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hora${diffHours > 1 ? 's' : ''}`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} dia${diffDays > 1 ? 's' : ''}`
  }

  /**
   * Limpa contexto antigo baseado em critérios
   */
  static shouldClearContext(messages: ConversationMessage[]): boolean {
    if (messages.length === 0) return false

    const lastMessage = messages[messages.length - 1]
    const hoursSinceLastMessage = lastMessage?.timestamp
      ? (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60)
      : 0

    // Limpar contexto se:
    // - Mais de 2 horas desde a última mensagem
    // - Mais de 50 mensagens total
    return hoursSinceLastMessage > 2 || messages.length > 50
  }

  /**
   * Cria um resumo da conversa para preservar contexto essencial
   */
  static createConversationSummary(messages: ConversationMessage[]): string {
    const userQuestions = messages
      .filter(m => m.role === 'user')
      .slice(-5) // Últimas 5 perguntas
      .map(m => m.content)

    const topics = this.extractTopics(messages)
    const consultationTypes = this.extractConsultationTypes(messages)

    return `Resumo da conversa anterior:
- Tópicos: ${topics.join(', ')}
- Tipos de consulta: ${consultationTypes.join(', ')}
- Últimas perguntas: ${userQuestions.slice(-3).join('; ')}
- Total de mensagens: ${messages.length}`
  }

  /**
   * Valida se uma mensagem deve ser incluída no contexto
   */
  static shouldIncludeMessage(message: ConversationMessage): boolean {
    // Excluir mensagens muito antigas (mais de 24h)
    const hoursOld = (Date.now() - message.timestamp.getTime()) / (1000 * 60 * 60)
    if (hoursOld > 24) return false

    // Excluir mensagens muito curtas que não agregam contexto
    if (message.content.length < 10) return false

    // Excluir mensagens de erro
    if (message.content.includes('Erro') || message.content.includes('Desculpe')) {
      return false
    }

    return true
  }
}