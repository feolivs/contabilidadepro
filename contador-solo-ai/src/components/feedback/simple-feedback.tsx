/**
 * Widget de Feedback Simplificado
 * Versão pragmática do sistema de feedback
 */

'use client'

import React, { useState } from 'react'
import { MessageSquare, Send, X, ThumbsUp, ThumbsDown, Bug, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useSimpleAnalytics } from '@/lib/analytics/simple-analytics'
import { useAccessibility } from '@/lib/accessibility/simple-accessibility'
import { cn } from '@/lib/utils'

// =====================================================
// TIPOS SIMPLES
// =====================================================

type FeedbackType = 'bug' | 'feature' | 'general'
type FeedbackRating = 'positive' | 'negative' | null

interface SimpleFeedback {
  type: FeedbackType
  rating: FeedbackRating
  message: string
  page: string
  timestamp: Date
}

interface SimpleFeedbackWidgetProps {
  className?: string
  position?: 'bottom-right' | 'bottom-left'
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function SimpleFeedbackWidget({ 
  className, 
  position = 'bottom-right' 
}: SimpleFeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('general')
  const [rating, setRating] = useState<FeedbackRating>(null)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const { track } = useSimpleAnalytics()
  const { announce } = useAccessibility()

  // Posicionamento
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  // Tipos de feedback
  const feedbackTypes = [
    { id: 'bug' as const, name: 'Bug', icon: Bug, color: 'text-red-600' },
    { id: 'feature' as const, name: 'Sugestão', icon: Lightbulb, color: 'text-yellow-600' },
    { id: 'general' as const, name: 'Geral', icon: MessageSquare, color: 'text-blue-600' }
  ]

  // Handlers
  const handleOpen = () => {
    setIsOpen(true)
    track({ name: 'feedback_widget_opened' })
    announce('Widget de feedback aberto')
  }

  const handleClose = () => {
    setIsOpen(false)
    setType('general')
    setRating(null)
    setMessage('')
    setIsSubmitted(false)
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      announce('Por favor, digite uma mensagem', 'assertive')
      return
    }

    setIsSubmitting(true)

    try {
      const feedback: SimpleFeedback = {
        type,
        rating,
        message: message.trim(),
        page: window.location.pathname,
        timestamp: new Date()
      }

      // Track no analytics
      track({
        name: 'feedback_submitted',
        properties: {
          type,
          rating,
          messageLength: message.length,
          page: feedback.page
        }
      })

      // Simular envio (em produção, enviar para API)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Feedback enviado:', feedback)

      setIsSubmitted(true)
      announce('Feedback enviado com sucesso!')

      // Fechar automaticamente após 2 segundos
      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (error) {
      console.error('Erro ao enviar feedback:', error)
      announce('Erro ao enviar feedback. Tente novamente.', 'assertive')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    if (isSubmitted) {
      return (
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <ThumbsUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Obrigado!</h3>
            <p className="text-sm text-green-700">Seu feedback foi enviado.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Tipo de feedback */}
        <div>
          <label className="text-sm font-medium mb-2 block">Tipo de feedback</label>
          <div className="flex gap-2">
            {feedbackTypes.map((feedbackType) => (
              <button
                key={feedbackType.id}
                onClick={() => setType(feedbackType.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                  type === feedbackType.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                )}
              >
                <feedbackType.icon className={cn("h-4 w-4", feedbackType.color)} />
                {feedbackType.name}
              </button>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">Como foi sua experiência?</label>
          <div className="flex gap-2">
            <button
              onClick={() => setRating('positive')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                rating === 'positive'
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-border hover:bg-accent"
              )}
            >
              <ThumbsUp className="h-4 w-4" />
              Positiva
            </button>
            <button
              onClick={() => setRating('negative')}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
                rating === 'negative'
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-border hover:bg-accent"
              )}
            >
              <ThumbsDown className="h-4 w-4" />
              Negativa
            </button>
          </div>
        </div>

        {/* Mensagem */}
        <div>
          <label htmlFor="feedback-message" className="text-sm font-medium mb-2 block">
            Mensagem
          </label>
          <Textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Descreva sua experiência, problema ou sugestão..."
            className="min-h-[80px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length}/500 caracteres
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("fixed z-50", positionClasses[position], className)}>
      {!isOpen ? (
        <Button
          onClick={handleOpen}
          className="rounded-full w-12 h-12 shadow-lg"
          aria-label="Abrir feedback"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      ) : (
        <Card className="w-80 shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Feedback</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0"
                aria-label="Fechar feedback"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
