'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Star,
  MessageSquare,
  Send,
  ThumbsUp,
  ThumbsDown,
  Meh,
  Smile,
  Frown,
  X,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserFeedback, FeedbackType, SatisfactionRating } from '@/hooks/use-user-feedback'
import { toast } from 'sonner'

interface FeedbackWidgetProps {
  feedbackType?: FeedbackType
  contextData?: any
  trigger?: React.ReactNode
  onFeedbackSubmitted?: () => void
  className?: string
}

const RATING_ICONS = {
  VERY_DISSATISFIED: { icon: Frown, color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100' },
  DISSATISFIED: { icon: Frown, color: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100' },
  NEUTRAL: { icon: Meh, color: 'text-gray-500', bgColor: 'bg-gray-50 hover:bg-gray-100' },
  SATISFIED: { icon: Smile, color: 'text-blue-500', bgColor: 'bg-blue-50 hover:bg-blue-100' },
  VERY_SATISFIED: { icon: Smile, color: 'text-green-500', bgColor: 'bg-green-50 hover:bg-green-100' }
}

// Fallback local definition
const LOCAL_RATING_LABELS: Record<SatisfactionRating, string> = {
  VERY_DISSATISFIED: 'Muito Insatisfeito',
  DISSATISFIED: 'Insatisfeito',
  NEUTRAL: 'Neutro',
  SATISFIED: 'Satisfeito',
  VERY_SATISFIED: 'Muito Satisfeito'
}

export function FeedbackWidget({
  feedbackType = 'GENERAL_SYSTEM',
  contextData = {},
  trigger,
  onFeedbackSubmitted,
  className
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRating, setSelectedRating] = useState<SatisfactionRating | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFeedbackType, setSelectedFeedbackType] = useState<FeedbackType>(feedbackType)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    submitFeedback,
    isSubmittingFeedback,
    FEEDBACK_TYPE_LABELS,
    RATING_LABELS
  } = useUserFeedback()

  // Use fallback if RATING_LABELS is not available
  const ratingLabels = RATING_LABELS || LOCAL_RATING_LABELS

  const handleSubmit = async () => {
    if (!selectedRating) {
      toast.error('Por favor, selecione uma avaliação')
      return
    }

    try {
      await submitFeedback({
        feedbackType: selectedFeedbackType,
        rating: selectedRating,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        contextData
      })

      setIsSubmitted(true)
      toast.success('Feedback enviado com sucesso!')
      
      // Reset form after delay
      setTimeout(() => {
        setIsOpen(false)
        setIsSubmitted(false)
        setSelectedRating(null)
        setTitle('')
        setDescription('')
        onFeedbackSubmitted?.()
      }, 2000)

    } catch (error) {
      console.error('Erro ao enviar feedback:', error)
      toast.error('Erro ao enviar feedback. Tente novamente.')
    }
  }

  const handleQuickRating = async (rating: SatisfactionRating) => {
    try {
      await submitFeedback({
        feedbackType: selectedFeedbackType,
        rating,
        contextData
      })
      
      toast.success('Obrigado pelo seu feedback!')
      onFeedbackSubmitted?.()
    } catch (error) {
      console.error('Erro ao enviar feedback rápido:', error)
      toast.error('Erro ao enviar feedback')
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="flex items-center gap-2">
      <MessageSquare className="h-4 w-4" />
      Feedback
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Seu Feedback
          </DialogTitle>
        </DialogHeader>

        {isSubmitted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Feedback Enviado!</h3>
            <p className="text-gray-600">
              Obrigado por nos ajudar a melhorar o sistema.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tipo de Feedback */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tipo de Feedback
              </label>
              <Select 
                value={selectedFeedbackType} 
                onValueChange={(value) => setSelectedFeedbackType(value as FeedbackType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rating */}
            <div>
              <label className="text-sm font-medium mb-3 block">
                Como você avalia esta experiência?
              </label>
              <div className="flex justify-between gap-2">
                {Object.entries(RATING_ICONS).map(([rating, config]) => {
                  const Icon = config.icon
                  const isSelected = selectedRating === rating
                  
                  return (
                    <button
                      key={rating}
                      onClick={() => setSelectedRating(rating as SatisfactionRating)}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                        isSelected 
                          ? `border-current ${config.color} ${config.bgColor}` 
                          : "border-gray-200 hover:border-gray-300",
                        config.bgColor
                      )}
                      title={ratingLabels[rating as SatisfactionRating]}
                    >
                      <Icon className={cn("h-6 w-6 mb-1", 
                        isSelected ? config.color : "text-gray-400"
                      )} />
                      <span className={cn("text-xs font-medium",
                        isSelected ? config.color : "text-gray-500"
                      )}>
                        {rating === 'VERY_DISSATISFIED' ? '1' :
                         rating === 'DISSATISFIED' ? '2' :
                         rating === 'NEUTRAL' ? '3' :
                         rating === 'SATISFIED' ? '4' : '5'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Título (opcional) */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Título (opcional)
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Resumo do seu feedback"
                maxLength={100}
              />
            </div>

            {/* Descrição (opcional) */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Detalhes (opcional)
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Conte-nos mais sobre sua experiência..."
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {description.length}/500 caracteres
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmittingFeedback}
              >
                Cancelar
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={!selectedRating || isSubmittingFeedback}
                className="flex items-center gap-2"
              >
                {isSubmittingFeedback ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Componente para feedback rápido (apenas rating)
interface QuickFeedbackProps {
  feedbackType: FeedbackType
  contextData?: any
  onFeedbackSubmitted?: () => void
  className?: string
}

export function QuickFeedback({
  feedbackType,
  contextData = {},
  onFeedbackSubmitted,
  className
}: QuickFeedbackProps) {
  const { quickFeedback } = useUserFeedback()

  const handleQuickRating = async (rating: SatisfactionRating) => {
    try {
      await quickFeedback(feedbackType, rating, contextData)
      toast.success('Obrigado pelo seu feedback!')
      onFeedbackSubmitted?.()
    } catch (error) {
      console.error('Erro ao enviar feedback rápido:', error)
      toast.error('Erro ao enviar feedback')
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-gray-600">Como foi esta experiência?</span>
      
      <div className="flex gap-1">
        {Object.entries(RATING_ICONS).map(([rating, config]) => {
          const Icon = config.icon
          
          return (
            <button
              key={rating}
              onClick={() => handleQuickRating(rating as SatisfactionRating)}
              className={cn(
                "p-2 rounded-lg transition-all",
                config.bgColor,
                "hover:scale-110"
              )}
              title={LOCAL_RATING_LABELS[rating as SatisfactionRating]}
            >
              <Icon className={cn("h-4 w-4", config.color)} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Componente para exibir estatísticas de feedback
export function FeedbackStats({ className }: { className?: string }) {
  const { useSatisfactionStats } = useUserFeedback()
  const { data: stats = [] } = useSatisfactionStats()

  if (stats.length === 0) {
    return null
  }

  const overallStats = stats.reduce((acc, stat) => ({
    totalFeedback: acc.totalFeedback + stat.total_feedback,
    avgRating: acc.avgRating + stat.average_rating,
    avgSatisfaction: acc.avgSatisfaction + stat.satisfaction_score
  }), { totalFeedback: 0, avgRating: 0, avgSatisfaction: 0 })

  const avgRating = overallStats.avgRating / stats.length
  const avgSatisfaction = overallStats.avgSatisfaction / stats.length

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">Feedback Geral</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total de Avaliações:</span>
          <Badge variant="outline">{overallStats.totalFeedback}</Badge>
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Nota Média:</span>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{avgRating.toFixed(1)}/5</span>
          </div>
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Satisfação:</span>
          <span className="font-medium text-green-600">
            {avgSatisfaction.toFixed(0)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
