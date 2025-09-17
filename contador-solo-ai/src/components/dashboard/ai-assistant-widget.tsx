'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Calculator,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAIServicesStatus, useCompanyContext } from '@/hooks/use-ai-services-status'

interface AIAssistantWidgetProps {
  className?: string
}

export function AIAssistantWidget({ className }: AIAssistantWidgetProps) {
  const router = useRouter()
  const { status, loading, refresh } = useAIServicesStatus()
  const companyContext = useCompanyContext('empresa-123') // TODO: usar empresa real do usuário

  const handleNavigate = (path: string) => {
    router.push(path)
  }

  const quickActions = [
    {
      id: 'calculate-das',
      label: 'Calcular DAS',
      icon: Calculator,
      action: () => handleNavigate('/assistente?action=calculate-das'),
      description: 'Calcule DAS do Simples Nacional'
    },
    {
      id: 'validate-cnpj',
      label: 'Validar CNPJ',
      icon: FileText,
      action: () => handleNavigate('/assistente?action=validate-cnpj'),
      description: 'Verificar situação fiscal'
    },
    {
      id: 'check-deadlines',
      label: 'Ver Prazos',
      icon: Calendar,
      action: () => handleNavigate('/assistente?action=check-deadlines'),
      description: 'Próximos vencimentos'
    },
    {
      id: 'tax-analysis',
      label: 'Análise Fiscal',
      icon: TrendingUp,
      action: () => handleNavigate('/assistente?action=tax-analysis'),
      description: 'Otimização tributária'
    },
    {
      id: 'document-ocr',
      label: 'OCR Docs',
      icon: FileText,
      action: () => handleNavigate('/assistente?action=document-ocr'),
      description: 'Extrair dados de documentos'
    },
    {
      id: 'compliance-check',
      label: 'Conformidade',
      icon: CheckCircle,
      action: () => handleNavigate('/assistente?action=compliance-check'),
      description: 'Verificar obrigações'
    }
  ]

  const services = [
    {
      name: status.openai.name,
      status: status.openai.status,
      responseTime: status.openai.responseTime,
      errorMessage: status.openai.errorMessage
    },
    {
      name: status.contextEngine.name,
      status: status.contextEngine.status,
      responseTime: status.contextEngine.responseTime,
      errorMessage: status.contextEngine.errorMessage
    },
    {
      name: status.predictiveCache.name,
      status: status.predictiveCache.status,
      responseTime: status.predictiveCache.responseTime,
      errorMessage: status.predictiveCache.errorMessage
    },
    {
      name: status.governmentAPIs.name,
      status: status.governmentAPIs.status,
      responseTime: status.governmentAPIs.responseTime,
      errorMessage: status.governmentAPIs.errorMessage
    }
  ]

  const getOverallStatusColor = () => {
    switch (status.overallStatus) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'unhealthy':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getOverallStatusText = () => {
    switch (status.overallStatus) {
      case 'healthy':
        return 'Online'
      case 'degraded':
        return 'Degradado'
      case 'unhealthy':
        return 'Offline'
      default:
        return 'Verificando...'
    }
  }

  const getAverageResponseTime = () => {
    if (loading) return '...'
    const validServices = services.filter(s => s.responseTime && s.responseTime > 0)
    if (validServices.length === 0) return '2s'
    const avgMs = validServices.reduce((acc, s) => acc + (s.responseTime || 0), 0) / validServices.length
    return `${Math.round(avgMs / 1000)}s`
  }

  return (
    <Card className={`relative border-blue-200 dark:border-blue-800 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Assistente IA
            <Badge className={`ml-2 ${getOverallStatusColor()}`}>
              {loading ? 'Verificando...' : getOverallStatusText()}
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={() => handleNavigate('/assistente')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Abrir Chat
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status do Sistema */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Status dos Serviços</span>
              <div className="flex items-center space-x-1">
                {loading ? (
                  <AlertCircle className="h-3 w-3 text-gray-500 animate-spin" />
                ) : status.overallStatus === 'healthy' ? (
                  <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                )}
                <span className="text-xs text-muted-foreground">
                  {loading ? 'Verificando...' :
                   status.overallStatus === 'healthy' ? 'Todos operacionais' :
                   status.overallStatus === 'degraded' ? 'Alguns com problemas' :
                   'Problemas detectados'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1"
                  onClick={refresh}
                  disabled={loading}
                >
                  <TrendingUp className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {services.map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'online' ? 'bg-green-500' :
                      service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="truncate">{service.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    {service.responseTime && (
                      <span>{service.responseTime}ms</span>
                    )}
                    {service.errorMessage && (
                      <span className="text-red-500 truncate max-w-20" title={service.errorMessage}>
                        {service.errorMessage}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Ações Rápidas</h4>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.slice(0, 4).map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 flex flex-col items-center space-y-1 group relative"
                  onClick={action.action}
                  title={action.description}
                >
                  <action.icon className="h-4 w-4" />
                  <span className="text-xs">{action.label}</span>
                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-popover px-2 py-1 rounded shadow-md z-10">
                    {action.description}
                  </span>
                </Button>
              ))}
            </div>
            {quickActions.length > 4 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => handleNavigate('/assistente')}
              >
                Ver mais ações ({quickActions.length - 4}+) →
              </Button>
            )}
          </div>

          {/* Smart Suggestions */}
          {companyContext.suggestedActions.length > 0 && (
            <div className="border-t pt-3">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Sugestões Inteligentes
                  </h4>
                  {companyContext.hasRecentActivity && (
                    <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Ativo
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {companyContext.suggestedActions.slice(0, 2).map((suggestion, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
                      <span className="text-muted-foreground">{suggestion}</span>
                    </div>
                  ))}
                </div>
                {companyContext.nextDeadline && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Próximo prazo: {companyContext.nextDeadline.toLocaleDateString('pt-BR')}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs mt-2"
                  onClick={() => handleNavigate('/assistente?context=suggestions')}
                >
                  Ver todas as sugestões →
                </Button>
              </div>
            </div>
          )}

          {/* Mini Chat Preview - só mostra se não tiver sugestões */}
          {companyContext.suggestedActions.length === 0 && (
            <div className="border-t pt-3">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-3 w-3 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Olá! Sou seu assistente fiscal inteligente. Como posso ajudar você hoje?
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => handleNavigate('/assistente')}
                >
                  Iniciar conversa completa →
                </Button>
              </div>
            </div>
          )}

          {/* Stats Rápidas */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {status.overallStatus === 'healthy' ? '98%' :
                 status.overallStatus === 'degraded' ? '85%' : '0%'}
              </div>
              <div className="text-xs text-muted-foreground">Precisão</div>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {status.overallStatus !== 'unhealthy' ? '24/7' : 'Off'}
              </div>
              <div className="text-xs text-muted-foreground">Disponível</div>
            </div>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/20 rounded">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {getAverageResponseTime()}
              </div>
              <div className="text-xs text-muted-foreground">Resposta</div>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Status Indicator */}
      <div className="absolute top-2 right-2">
        <div className={`w-2 h-2 rounded-full ${
          loading ? 'bg-gray-400 animate-pulse' :
          status.overallStatus === 'healthy' ? 'bg-green-500 animate-pulse' :
          status.overallStatus === 'degraded' ? 'bg-yellow-500 animate-pulse' :
          'bg-red-500 animate-pulse'
        }`} />
      </div>
    </Card>
  )
}