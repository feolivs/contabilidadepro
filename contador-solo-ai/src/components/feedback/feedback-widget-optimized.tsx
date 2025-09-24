/**
 * Widget de Feedback Otimizado - Fase 3
 * Sistema de coleta de feedback com acessibilidade completa WCAG 2.1 AA
 */

'use client'

import React from 'react'
import { 
  MessageSquare, 
  Star, 
  Send, 
  X, 
  ThumbsUp, 
  ThumbsDown,
  Bug,
  Lightbulb,
  Heart,
  Frown,
  Meh,
  Smile,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useAccessibility } from '@/lib/accessibility/accessibility-manager'
import { useUXAnalytics } from '@/lib/analytics/ux-analytics'
import { cn } from '@/lib/utils'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface FeedbackData {
  id: string
  type: 'bug' | 'feature' | 'general' | 'accessibility' | 'performance'
  rating?: number
  sentiment?: 'positive' | 'neutral' | 'negative'
  message: string
  page: string
  timestamp: Date
  userId?: string
  sessionId: string
  metadata: {
    userAgent: string
    viewport: { width: number; height: number }
    accessibility: {
      screenReader: boolean
      highContrast: boolean
      reducedMotion: boolean
    }
  }
}

interface FeedbackWidgetOptimizedProps {
  className?: string
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  trigger?: 'button' | 'auto' | 'manual'
  autoTriggerDelay?: number
  onFeedbackSubmit?: (feedback: FeedbackData) => void
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const FeedbackWidgetOptimized: React.FC<FeedbackWidgetOptimizedProps> = ({
  className,
  position = 'bottom-right',
  trigger = 'button',
  autoTriggerDelay = 30000,
  onFeedbackSubmit
}) => {
  const { settings, announce } = useAccessibility()
  const { trackEvent } = useUXAnalytics()
  const [isOpen, setIsOpen] = React.useState(false)
  const [step, setStep] = React.useState<'type' | 'rating' | 'message' | 'success'>('type')
  const [feedbackType, setFeedbackType] = React.useState<FeedbackData['type']>('general')
  const [rating, setRating] = React.useState<number>(0)
  const [sentiment, setSentiment] = React.useState<FeedbackData['sentiment']>('neutral')
  const [message, setMessage] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Auto-trigger
  React.useEffect(() => {
    if (trigger === 'auto') {
      const timer = setTimeout(() => {
        setIsOpen(true)
        announce('Widget de feedback aberto automaticamente')
      }, autoTriggerDelay)

      return () => clearTimeout(timer)
    }
  }, [trigger, autoTriggerDelay, announce])

  // Posicionamento
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }

  // Tipos de feedback
  const feedbackTypes = [
    {
      id: 'bug' as const,
      name: 'Reportar Bug',
      description: 'Algo não está funcionando corretamente',
      icon: Bug,
      color: 'text-red-600'
    },
    {
      id: 'feature' as const,
      name: 'Sugerir Funcionalidade',
      description: 'Ideia para melhorar o sistema',
      icon: Lightbulb,
      color: 'text-yellow-600'
    },
    {
      id: 'accessibility' as const,
      name: 'Acessibilidade',
      description: 'Problemas de acessibilidade',
      icon: Heart,
      color: 'text-purple-600'
    },
    {
      id: 'performance' as const,
      name: 'Performance',
      description: 'Sistema lento ou travando',
      icon: ThumbsDown,
      color: 'text-orange-600'
    },
    {
      id: 'general' as const,
      name: 'Feedback Geral',
      description: 'Comentários gerais sobre o sistema',
      icon: MessageSquare,
      color: 'text-blue-600'
    }
  ]

  // Sentimentos
  const sentiments = [
    { id: 'positive' as const, name: 'Positivo', icon: Smile, color: 'text-green-600' },
    { id: 'neutral' as const, name: 'Neutro', icon: Meh, color: 'text-gray-600' },
    { id: 'negative' as const, name: 'Negativo', icon: Frown, color: 'text-red-600' }
  ]

  // Handlers
  const handleOpen = () => {
    setIsOpen(true)
    trackEvent({
      type: 'click',
      element: 'feedback-widget-open',
      data: { trigger }
    })
    announce('Widget de feedback aberto')
  }

  const handleClose = () => {
    setIsOpen(false)
    setStep('type')
    setRating(0)
    setMessage('')
    setSentiment('neutral')
    announce('Widget de feedback fechado')
  }

  const handleTypeSelect = (type: FeedbackData['type']) => {
    setFeedbackType(type)
    setStep(type === 'general' ? 'rating' : 'message')
    trackEvent({
      type: 'click',
      element: 'feedback-type-select',
      data: { feedbackType: type }
    })
  }

  const handleRatingSelect = (newRating: number) => {
    setRating(newRating)
    setStep('message')
    trackEvent({
      type: 'click',
      element: 'feedback-rating',
      data: { rating: newRating }
    })
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      announce('Por favor, digite uma mensagem', { priority: 'assertive' })
      return
    }

    setIsSubmitting(true)

    try {
      const feedback: FeedbackData = {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: feedbackType,
        rating: rating > 0 ? rating : undefined,
        sentiment,
        message: message.trim(),
        page: window.location.pathname,
        timestamp: new Date(),
        sessionId: `session_${Date.now()}`, // Em produção, usar sessionId real
        metadata: {
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          accessibility: {
            screenReader: settings.screenReader,
            highContrast: settings.highContrast,
            reducedMotion: settings.reducedMotion
          }
        }
      }

      // Enviar feedback
      if (onFeedbackSubmit) {
        await onFeedbackSubmit(feedback)
      } else {
        // Fallback: log no console
        console.log('Feedback submitted:', feedback)
      }

      trackEvent({
        type: 'click',
        element: 'feedback-submit',
        data: { 
          feedbackType,
          rating,
          sentiment,
          messageLength: message.length
        }
      })

      setStep('success')
      announce('Feedback enviado com sucesso!')

      // Fechar automaticamente após 3 segundos
      setTimeout(() => {
        handleClose()
      }, 3000)

    } catch (error) {
      console.error('Erro ao enviar feedback:', error)
      announce('Erro ao enviar feedback. Tente novamente.', { priority: 'assertive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderizar conteúdo baseado no step
  const renderContent = () => {
    switch (step) {
      case 'type':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Que tipo de feedback você gostaria de dar?</h3>
              <div className="space-y-2">
                {feedbackTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={cn(
                      "w-full p-3 text-left rounded-lg border transition-colors",
                      "hover:bg-accent hover:border-accent-foreground/20",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <type.icon className={cn("h-5 w-5 mt-0.5", type.color)} />
                      <div>
                        <div className="font-medium">{type.name}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Obrigado pelo seu feedback!</h3>
              <p className="text-sm text-green-700 mt-1">
                Sua opinião é muito importante para melhorarmos o sistema.
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Conte-nos mais detalhes</h3>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva sua experiência, problema ou sugestão..."
                className="min-h-[100px]"
                maxLength={1000}
                aria-describedby="message-help"
              />
              <p id="message-help" className="text-xs text-muted-foreground mt-1">
                {message.length}/1000 caracteres
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('type')}
                className="flex-1"
              >
                Voltar
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
  }

  if (trigger === 'manual' && !isOpen) {
    return null
  }

  return (
    <div className={cn("fixed z-50", positionClasses[position], className)}>
      {!isOpen ? (
        <Button
          onClick={handleOpen}
          className="rounded-full w-12 h-12 shadow-lg"
          aria-label="Abrir widget de feedback"
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
                {step !== 'type' && step !== 'success' && (
                  <Badge variant="secondary" className="text-xs">
                    {step === 'rating' ? '2/3' : '3/3'}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0"
                aria-label="Fechar widget de feedback"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Ajude-nos a melhorar sua experiência
            </CardDescription>
          </CardHeader>

          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
