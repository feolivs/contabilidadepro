'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bot, Sparkles, Brain, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  isEnhanced?: boolean
  message?: string
  className?: string
  contextMessageCount?: number
  contextTokenCount?: number
}

export function TypingIndicator({
  isEnhanced = false,
  message = 'Pensando...',
  className,
  contextMessageCount = 0,
  contextTokenCount = 0
}: TypingIndicatorProps) {
  return (
    <div className={cn('flex gap-3 justify-start animate-fade-in', className)}>
      <Avatar className="h-8 w-8 animate-pulse">
        <AvatarFallback className="bg-primary/10">
          {isEnhanced ? (
            <Sparkles className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Bot className="h-4 w-4 text-primary" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 max-w-[80%]">
        <div className="flex items-center gap-3">
          {/* Enhanced Mode Badge */}
          {isEnhanced && (
            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 animate-pulse">
              <Brain className="h-3 w-3 mr-1" />
              Enhanced
            </Badge>
          )}

          {/* Typing Animation */}
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
            </div>

            <span className="text-sm text-muted-foreground animate-pulse">
              {message}
            </span>
          </div>
        </div>

        {/* Enhanced Mode Progress Indicator */}
        {isEnhanced && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calculator className="h-3 w-3" />
              <span>Analisando contexto empresarial...</span>
              <div className="ml-auto">
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-loading-bar" />
                </div>
              </div>
            </div>

            {/* Context Information */}
            {contextMessageCount > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  <span>Contexto: {contextMessageCount} mensagem(s)</span>
                </div>
                {contextTokenCount > 0 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    ~{contextTokenCount} tokens
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* Add these animations to your global CSS */
const styles = `
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes loading-bar {
  0% {
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 100%;
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.animate-loading-bar {
  animation: loading-bar 2s ease-in-out infinite;
}
`