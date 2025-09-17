'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Bot,
  User,
  Copy,
  Share2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Calculator,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  type?: 'text' | 'calculation' | 'analysis' | 'suggestion'
  tokens_used?: number
  response_time?: number
  model?: string
}

interface ChatMessageProps {
  message: Message
  onRegenerate?: (messageId: string) => void
  onFeedback?: (messageId: string, isPositive: boolean) => void
  showActions?: boolean
}

export function ChatMessage({
  message,
  onRegenerate,
  onFeedback,
  showActions = true
}: ChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      toast.success('Mensagem copiada!')
    } catch (error) {
      toast.error('Erro ao copiar mensagem')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Conversa com Assistente IA',
          text: message.content,
          url: window.location.href
        })
      } catch (error) {
        // Fallback para copy
        handleCopy()
      }
    } else {
      handleCopy()
      toast.success('Link copiado para área de transferência')
    }
  }

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'calculation':
        return <Calculator className="h-4 w-4 text-blue-500" />
      case 'analysis':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-yellow-500" />
      default:
        return <Bot className="h-4 w-4" />
    }
  }

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'calculation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'analysis':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'suggestion':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const shouldTruncate = message.content.length > 500
  const displayContent = shouldTruncate && !isExpanded
    ? message.content.substring(0, 500) + '...'
    : message.content

  return (
    <TooltipProvider>
      <div className={cn(
        'flex gap-3 group',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}>
        {message.role === 'assistant' && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/10">
              {getMessageIcon(message.type)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 relative',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/50 border border-border'
        )}>
          {/* Message Header */}
          {message.role === 'assistant' && message.type && (
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className={cn('text-xs', getTypeColor(message.type))}>
                {message.type === 'calculation' && 'Cálculo'}
                {message.type === 'analysis' && 'Análise'}
                {message.type === 'suggestion' && 'Sugestão'}
                {message.type === 'text' && 'Resposta'}
              </Badge>
              {message.model && (
                <Badge variant="outline" className="text-xs">
                  {message.model}
                </Badge>
              )}
            </div>
          )}

          {/* Message Content */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {message.role === 'assistant' ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                  code({ node, className, children, ...props }: any) {
                    const inline = !className?.includes('language-')
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-border rounded-md">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border px-3 py-2 bg-muted/50 font-semibold text-left">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-3 py-2">
                      {children}
                    </td>
                  )
                }}
              >
                {displayContent}
              </ReactMarkdown>
            ) : (
              <div className="whitespace-pre-wrap">{displayContent}</div>
            )}
          </div>

          {/* Expand/Collapse for long messages */}
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 h-6 px-2 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Mostrar mais
                </>
              )}
            </Button>
          )}

          {/* Message Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {message.timestamp.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>

              {/* Metadata toggle for assistant messages */}
              {message.role === 'assistant' && (message.tokens_used || message.response_time) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMetadata(!showMetadata)}
                  className="h-5 px-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showMetadata ? 'Ocultar detalhes' : 'Ver detalhes'}
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            {showActions && (
              <div className={cn(
                'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                'md:opacity-0 md:group-hover:opacity-100' // Hide on mobile, show on hover on desktop
              )}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copiar mensagem</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShare}
                      className="h-6 w-6 p-0"
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Compartilhar</TooltipContent>
                </Tooltip>

                {message.role === 'assistant' && onRegenerate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRegenerate(message.id)}
                        className="h-6 w-6 p-0"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerar resposta</TooltipContent>
                  </Tooltip>
                )}

                {message.role === 'assistant' && onFeedback && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFeedback(message.id, true)}
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Útil</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFeedback(message.id, false)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Não útil</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Metadata Details */}
          {showMetadata && message.role === 'assistant' && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {message.tokens_used && (
                  <div>
                    <span className="font-medium">Tokens:</span> {message.tokens_used.toLocaleString()}
                  </div>
                )}
                {message.response_time && (
                  <div>
                    <span className="font-medium">Tempo:</span> {(message.response_time / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {message.role === 'user' && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/10">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </TooltipProvider>
  )
}