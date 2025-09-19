'use client'

import { useState, useEffect } from 'react'

export interface ServiceStatus {
  name: string
  status: 'online' | 'offline' | 'degraded'
  responseTime?: number
  lastCheck: Date
  errorMessage?: string
}

export interface AIServicesStatus {
  openai: ServiceStatus
  contextEngine: ServiceStatus
  overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  lastUpdate: Date
}

export function useAIServicesStatus() {
  const [status, setStatus] = useState<AIServicesStatus>({
    openai: {
      name: 'OpenAI GPT-4o',
      status: 'online',
      responseTime: 850,
      lastCheck: new Date()
    },
    contextEngine: {
      name: 'Context Engine',
      status: 'online',
      responseTime: 120,
      lastCheck: new Date()
    },
    overallStatus: 'healthy',
    lastUpdate: new Date()
  })

  const [loading, setLoading] = useState(false)

  const checkServicesHealth = async () => {
    if (loading) return

    setLoading(true)
    try {
      // Simular verificação de saúde dos serviços essenciais
      const healthChecks = await Promise.allSettled([
        checkOpenAIStatus(),
        checkContextEngineStatus()
      ])

      const newStatus: AIServicesStatus = {
        openai: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : {
          name: 'OpenAI GPT-4o',
          status: 'offline',
          lastCheck: new Date(),
          errorMessage: 'Connection failed'
        },
        contextEngine: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : {
          name: 'Context Engine',
          status: 'offline',
          lastCheck: new Date(),
          errorMessage: 'Service unavailable'
        },
        overallStatus: 'healthy',
        lastUpdate: new Date()
      }

      // Calcular status geral
      const services = [newStatus.openai, newStatus.contextEngine]
      const onlineCount = services.filter(s => s.status === 'online').length
      const degradedCount = services.filter(s => s.status === 'degraded').length

      if (onlineCount === services.length) {
        newStatus.overallStatus = 'healthy'
      } else if (onlineCount >= services.length / 2) {
        newStatus.overallStatus = 'degraded'
      } else {
        newStatus.overallStatus = 'unhealthy'
      }

      setStatus(newStatus)
    } catch (error) {
      console.error('Error checking services health:', error)
    } finally {
      setLoading(false)
    }
  }

  // Verificar status a cada 30 segundos
  useEffect(() => {
    checkServicesHealth()

    const interval = setInterval(() => {
      checkServicesHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return { status, loading, refresh: checkServicesHealth }
}

// Funções para verificar cada serviço
async function checkOpenAIStatus(): Promise<ServiceStatus> {
  const start = Date.now()

  try {
    // Verificar se a chave está configurada
    const hasKey = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY

    if (!hasKey) {
      return {
        name: 'OpenAI GPT-4o',
        status: 'offline',
        lastCheck: new Date(),
        errorMessage: 'API key not configured'
      }
    }

    // Simular verificação (em produção, fazer uma chamada real)
    const responseTime = Date.now() - start + Math.random() * 500 + 500

    return {
      name: 'OpenAI GPT-4o',
      status: responseTime < 2000 ? 'online' : 'degraded',
      responseTime: Math.round(responseTime),
      lastCheck: new Date()
    }
  } catch (error) {
    return {
      name: 'OpenAI GPT-4o',
      status: 'offline',
      lastCheck: new Date(),
      errorMessage: 'Connection failed'
    }
  }
}

async function checkContextEngineStatus(): Promise<ServiceStatus> {
  const start = Date.now()

  try {
    // Verificar se o Context Engine está funcionando
    // Em produção, fazer uma chamada para o endpoint de health check
    const responseTime = Date.now() - start + Math.random() * 200 + 100

    return {
      name: 'Context Engine',
      status: 'online',
      responseTime: Math.round(responseTime),
      lastCheck: new Date()
    }
  } catch (error) {
    return {
      name: 'Context Engine',
      status: 'offline',
      lastCheck: new Date(),
      errorMessage: 'Service unavailable'
    }
  }
}



// Hook para verificar status de uma empresa específica
export function useCompanyContext(empresaId?: string) {
  const [context, setContext] = useState<{
    hasRecentActivity: boolean
    pendingTasks: number
    nextDeadline?: Date
    suggestedActions: string[]
  }>({
    hasRecentActivity: false,
    pendingTasks: 0,
    suggestedActions: []
  })

  useEffect(() => {
    if (!empresaId) return

    // Simular busca de contexto da empresa
    const fetchContext = async () => {
      try {
        // Em produção, buscar dados reais da empresa
        const mockContext = {
          hasRecentActivity: Math.random() > 0.5,
          pendingTasks: Math.floor(Math.random() * 5),
          nextDeadline: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
          suggestedActions: generateSuggestedActions()
        }

        setContext(mockContext)
      } catch (error) {
        console.error('Error fetching company context:', error)
      }
    }

    fetchContext()
  }, [empresaId])

  return context
}

function generateSuggestedActions(): string[] {
  const allActions = [
    'Calcular DAS de Janeiro',
    'Verificar vencimento DEFIS',
    'Atualizar dados cadastrais',
    'Processar documentos pendentes',
    'Validar situação fiscal',
    'Revisar classificação tributária',
    'Conferir obrigações acessórias',
    'Analisar oportunidades de economia'
  ]

  // Retornar 2-4 ações aleatórias
  const count = Math.floor(Math.random() * 3) + 2
  return allActions
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
}