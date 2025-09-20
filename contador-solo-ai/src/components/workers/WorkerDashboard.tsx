'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Play, 
  Square, 
  RefreshCw,
  Settings,
  TrendingUp,
  Zap
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface WorkerStats {
  name: string
  queueName: string
  isRunning: boolean
  registeredProcessors: string[]
  config: {
    concurrency: number
    pollInterval: number
    maxRetries: number
    visibilityTimeout: number
  }
}

interface WorkerManagerStats {
  totalWorkers: number
  runningWorkers: number
  workers: WorkerStats[]
  healthCheckActive: boolean
  config: {
    autoStart: boolean
    healthCheckInterval: number
    restartOnError: boolean
    maxRestartAttempts: number
  }
}

export function WorkerDashboard() {
  const [stats, setStats] = useState<WorkerManagerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Simular dados dos workers (em produção, viria de uma API)
  const fetchWorkerStats = async (): Promise<WorkerManagerStats> => {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return {
      totalWorkers: 5,
      runningWorkers: 4,
      healthCheckActive: true,
      config: {
        autoStart: true,
        healthCheckInterval: 30000,
        restartOnError: true,
        maxRestartAttempts: 3
      },
      workers: [
        {
          name: 'calculo-fiscal',
          queueName: 'calculo_fiscal',
          isRunning: true,
          registeredProcessors: ['calculo_fiscal'],
          config: {
            concurrency: 2,
            pollInterval: 5000,
            maxRetries: 3,
            visibilityTimeout: 300
          }
        },
        {
          name: 'processamento-documentos',
          queueName: 'processamento_documentos',
          isRunning: true,
          registeredProcessors: ['processamento_documento'],
          config: {
            concurrency: 1,
            pollInterval: 10000,
            maxRetries: 2,
            visibilityTimeout: 600
          }
        },
        {
          name: 'notificacoes',
          queueName: 'notificacoes',
          isRunning: true,
          registeredProcessors: ['notificacao'],
          config: {
            concurrency: 5,
            pollInterval: 2000,
            maxRetries: 5,
            visibilityTimeout: 60
          }
        },
        {
          name: 'integracoes-externas',
          queueName: 'integracoes_externas',
          isRunning: true,
          registeredProcessors: ['consulta_cnpj', 'consulta_cep', 'webhook_receita'],
          config: {
            concurrency: 3,
            pollInterval: 5000,
            maxRetries: 3,
            visibilityTimeout: 180
          }
        },
        {
          name: 'geracao-relatorios',
          queueName: 'geracao_relatorios',
          isRunning: false,
          registeredProcessors: ['gerar_relatorio', 'exportar_dados'],
          config: {
            concurrency: 1,
            pollInterval: 15000,
            maxRetries: 2,
            visibilityTimeout: 900
          }
        }
      ]
    }
  }

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await fetchWorkerStats()
      setStats(data)
      setLastUpdate(new Date())
    } catch (error) {
      toast.error('Erro ao carregar estatísticas dos workers')
      console.error('Erro ao carregar stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleWorkerAction = async (workerName: string, action: 'start' | 'stop' | 'restart') => {
    try {
      // Em produção, chamaria API para controlar workers
      toast.success(`Worker ${workerName} ${action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado'}`)
      await loadStats()
    } catch (error) {
      toast.error(`Erro ao ${action} worker ${workerName}`)
    }
  }

  const getWorkerStatusColor = (isRunning: boolean) => {
    return isRunning ? 'bg-green-500' : 'bg-red-500'
  }

  const getWorkerStatusIcon = (isRunning: boolean) => {
    return isRunning ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />
  }

  const formatInterval = (ms: number) => {
    return `${ms / 1000}s`
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Carregando workers...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Workers</p>
                <p className="text-2xl font-bold">{stats?.totalWorkers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Rodando</p>
                <p className="text-2xl font-bold text-green-600">{stats?.runningWorkers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Parados</p>
                <p className="text-2xl font-bold text-red-600">
                  {(stats?.totalWorkers || 0) - (stats?.runningWorkers || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Health Check</p>
                <Badge variant={stats?.healthCheckActive ? "default" : "destructive"}>
                  {stats?.healthCheckActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Workers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stats?.workers.map((worker) => (
          <Card key={worker.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getWorkerStatusColor(worker.isRunning)}`} />
                  <CardTitle className="text-lg">{worker.name}</CardTitle>
                  {getWorkerStatusIcon(worker.isRunning)}
                </div>
                <div className="flex space-x-2">
                  {!worker.isRunning && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWorkerAction(worker.name, 'start')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Iniciar
                    </Button>
                  )}
                  {worker.isRunning && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWorkerAction(worker.name, 'restart')}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reiniciar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleWorkerAction(worker.name, 'stop')}
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Parar
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <CardDescription>
                Fila: <code className="bg-muted px-1 rounded">{worker.queueName}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Configurações */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    <span>Concorrência: {worker.config.concurrency}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>Poll: {formatInterval(worker.config.pollInterval)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-green-500" />
                    <span>Max Retry: {worker.config.maxRetries}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Settings className="h-4 w-4 text-purple-500" />
                    <span>Timeout: {formatInterval(worker.config.visibilityTimeout * 1000)}</span>
                  </div>
                </div>

                {/* Processadores */}
                <div>
                  <p className="text-sm font-medium mb-2">Processadores:</p>
                  <div className="flex flex-wrap gap-1">
                    {worker.registeredProcessors.map((processor) => (
                      <Badge key={processor} variant="secondary" className="text-xs">
                        {processor}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer com informações de atualização */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Última atualização: {lastUpdate.toLocaleTimeString()}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
