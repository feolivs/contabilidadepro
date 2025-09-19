'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Star,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Calendar,
  Users,
  ThumbsUp,
  Target,
  Award,
  Smile
} from 'lucide-react'
import { FeedbackWidget, QuickFeedback, FeedbackStats } from '@/components/feedback/feedback-widget'
import { useUserFeedback } from '@/hooks/use-user-feedback'

export default function SatisfacaoPage() {
  const [timeRange, setTimeRange] = useState('30d')
  const [summaryStats, setSummaryStats] = useState<any>(null)

  const { 
    useUserFeedbackHistory, 
    useSatisfactionStats, 
    getSummaryStats,
    FEEDBACK_TYPE_LABELS,
    RATING_LABELS 
  } = useUserFeedback()

  const { data: feedbackHistory = [] } = useUserFeedbackHistory(20)
  const { data: satisfactionStats = [] } = useSatisfactionStats()

  // Carregar estatísticas resumidas
  useEffect(() => {
    const loadSummaryStats = async () => {
      try {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365
        const stats = await getSummaryStats(days)
        setSummaryStats(stats)
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      }
    }

    loadSummaryStats()
  }, [timeRange, getSummaryStats])

  const timeRangeLabels = {
    '7d': 'Últimos 7 dias',
    '30d': 'Últimos 30 dias',
    '90d': 'Últimos 90 dias',
    '1y': 'Último ano'
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'VERY_SATISFIED': return 'text-green-600 bg-green-50'
      case 'SATISFIED': return 'text-blue-600 bg-blue-50'
      case 'NEUTRAL': return 'text-gray-600 bg-gray-50'
      case 'DISSATISFIED': return 'text-orange-600 bg-orange-50'
      case 'VERY_DISSATISFIED': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'text-green-600 bg-green-50'
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-50'
      case 'REVIEWED': return 'text-purple-600 bg-purple-50'
      case 'PENDING': return 'text-orange-600 bg-orange-50'
      case 'DISMISSED': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics de Satisfação</h1>
          <p className="text-gray-600 mt-2">
            Análise detalhada do feedback e satisfação dos usuários
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(timeRangeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <FeedbackWidget
            feedbackType="GENERAL_SYSTEM"
            trigger={
              <Button className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Dar Feedback
              </Button>
            }
          />
        </div>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats?.totalFeedback || 0}
            </div>
            <div className="text-sm text-gray-500">Total de Feedbacks</div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {summaryStats?.feedbackRate?.toFixed(1) || 0}% taxa de resposta
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Star className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-600">
              {summaryStats?.averageRating?.toFixed(1) || 0}/5
            </div>
            <div className="text-sm text-gray-500">Avaliação Média</div>
            <div className="mt-2">
              <div className="flex justify-center">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < Math.round(summaryStats?.averageRating || 0)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <ThumbsUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {summaryStats?.satisfactionScore?.toFixed(0) || 0}%
            </div>
            <div className="text-sm text-gray-500">Taxa de Satisfação</div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                Satisfeitos + Muito Satisfeitos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats?.totalInteractions || 0}
            </div>
            <div className="text-sm text-gray-500">Total de Interações</div>
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                Base para análise
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="by-type" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Por Tipo
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição de Ratings */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Avaliações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(RATING_LABELS).reverse().map(([rating, label]) => {
                    const count = feedbackHistory.filter(f => f.rating === rating).length
                    const percentage = feedbackHistory.length > 0 ? (count / feedbackHistory.length) * 100 : 0
                    
                    return (
                      <div key={rating} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Smile className="h-4 w-4" />
                            <span className="font-medium">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{count}</span>
                            <Badge variant="outline" className="text-xs">
                              {percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance por Funcionalidade */}
            <Card>
              <CardHeader>
                <CardTitle>Performance por Funcionalidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {satisfactionStats.slice(0, 5).map((stat) => (
                    <div key={stat.feedback_type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {FEEDBACK_TYPE_LABELS[stat.feedback_type]}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {stat.total_feedback} feedbacks
                          </Badge>
                          <span className="text-sm font-medium">
                            {stat.satisfaction_score.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${stat.satisfaction_score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="by-type" className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {satisfactionStats.map((stat) => (
              <Card key={stat.feedback_type}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {FEEDBACK_TYPE_LABELS[stat.feedback_type]}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {stat.total_feedback}
                      </div>
                      <div className="text-xs text-gray-500">Feedbacks</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {stat.satisfaction_score.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">Satisfação</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Nota Média:</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {stat.average_rating.toFixed(1)}/5
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Feedback:</span>
                      <span className="font-medium">
                        {stat.feedback_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <QuickFeedback
                    feedbackType={stat.feedback_type}
                    className="pt-4 border-t"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Feedbacks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedbackHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum feedback encontrado</p>
                  </div>
                ) : (
                  feedbackHistory.map((feedback) => (
                    <div key={feedback.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getRatingColor(feedback.rating)}>
                            {RATING_LABELS[feedback.rating]}
                          </Badge>
                          <Badge variant="outline">
                            {FEEDBACK_TYPE_LABELS[feedback.feedback_type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(feedback.status)}>
                            {feedback.status}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      
                      {feedback.title && (
                        <h4 className="font-medium mb-2">{feedback.title}</h4>
                      )}
                      
                      {feedback.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {feedback.description}
                        </p>
                      )}
                      
                      {feedback.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {feedback.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Tendências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Pontos Fortes</span>
                    </div>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Alta satisfação com processamento de documentos</li>
                      <li>• Boa avaliação do assistente de IA</li>
                      <li>• Sistema de alertas bem aceito</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-800">Oportunidades</span>
                    </div>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Melhorar performance geral do sistema</li>
                      <li>• Aprimorar interface de usuário</li>
                      <li>• Expandir funcionalidades de relatórios</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Metas de Satisfação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Meta de Satisfação</span>
                      <span className="text-sm text-gray-500">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-600 h-3 rounded-full" 
                        style={{ width: `${Math.min((summaryStats?.satisfactionScore || 0) / 85 * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Atual: {summaryStats?.satisfactionScore?.toFixed(0) || 0}%
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Meta de Avaliação</span>
                      <span className="text-sm text-gray-500">4.5/5</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-yellow-600 h-3 rounded-full" 
                        style={{ width: `${Math.min((summaryStats?.averageRating || 0) / 4.5 * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Atual: {summaryStats?.averageRating?.toFixed(1) || 0}/5
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Meta de Engajamento</span>
                      <span className="text-sm text-gray-500">15%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full" 
                        style={{ width: `${Math.min((summaryStats?.feedbackRate || 0) / 15 * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Atual: {summaryStats?.feedbackRate?.toFixed(1) || 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
