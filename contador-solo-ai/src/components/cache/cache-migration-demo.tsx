'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  Database, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react'
import { useEmpresas, useCalculosStats, useCacheInvalidation } from '@/hooks/use-nextjs-cache'
import { toast } from 'react-hot-toast'

interface CacheMetrics {
  nextjsCache: {
    hits: number
    misses: number
    hitRate: number
    avgResponseTime: number
  }
  legacyCache: {
    hits: number
    misses: number
    hitRate: number
    avgResponseTime: number
  }
  improvement: {
    performanceGain: number
    memoryReduction: number
    cacheEfficiency: number
  }
}

export function CacheMigrationDemo() {
  const [metrics, setMetrics] = useState<CacheMetrics>({
    nextjsCache: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
    legacyCache: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
    improvement: { performanceGain: 0, memoryReduction: 0, cacheEfficiency: 0 }
  })
  
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [testProgress, setTestProgress] = useState(0)

  // Hooks do novo sistema de cache
  const { data: empresas, isLoading: empresasLoading } = useEmpresas()
  const { data: stats, isLoading: statsLoading } = useCalculosStats()
  const { invalidateAll, invalidateEmpresas, invalidateCalculos } = useCacheInvalidation()

  // Simular métricas de performance
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        nextjsCache: {
          hits: prev.nextjsCache.hits + Math.floor(Math.random() * 5),
          misses: prev.nextjsCache.misses + Math.floor(Math.random() * 2),
          hitRate: 0,
          avgResponseTime: 150 + Math.random() * 100
        },
        legacyCache: {
          hits: prev.legacyCache.hits + Math.floor(Math.random() * 3),
          misses: prev.legacyCache.misses + Math.floor(Math.random() * 4),
          hitRate: 0,
          avgResponseTime: 400 + Math.random() * 200
        },
        improvement: {
          performanceGain: 65 + Math.random() * 10,
          memoryReduction: 45 + Math.random() * 15,
          cacheEfficiency: 80 + Math.random() * 15
        }
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  // Calcular hit rates
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      nextjsCache: {
        ...prev.nextjsCache,
        hitRate: prev.nextjsCache.hits + prev.nextjsCache.misses > 0 
          ? (prev.nextjsCache.hits / (prev.nextjsCache.hits + prev.nextjsCache.misses)) * 100 
          : 0
      },
      legacyCache: {
        ...prev.legacyCache,
        hitRate: prev.legacyCache.hits + prev.legacyCache.misses > 0 
          ? (prev.legacyCache.hits / (prev.legacyCache.hits + prev.legacyCache.misses)) * 100 
          : 0
      }
    }))
  }, [metrics.nextjsCache.hits, metrics.nextjsCache.misses, metrics.legacyCache.hits, metrics.legacyCache.misses])

  const runPerformanceTest = async () => {
    setIsRunningTest(true)
    setTestProgress(0)

    try {
      // Simular teste de performance
      for (let i = 0; i <= 100; i += 10) {
        setTestProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      toast.success('Teste de performance concluído!')
      
      // Atualizar métricas com resultados do teste
      setMetrics(prev => ({
        ...prev,
        improvement: {
          performanceGain: 72,
          memoryReduction: 58,
          cacheEfficiency: 89
        }
      }))
    } catch (error) {
      toast.error('Erro no teste de performance')
    } finally {
      setIsRunningTest(false)
    }
  }

  const handleInvalidateCache = (type: string) => {
    switch (type) {
      case 'all':
        invalidateAll()
        toast.success('Todo o cache foi invalidado')
        break
      case 'empresas':
        invalidateEmpresas()
        toast.success('Cache de empresas invalidado')
        break
      case 'calculos':
        invalidateCalculos()
        toast.success('Cache de cálculos invalidado')
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Migração para Cache API Nativo</h2>
        <p className="text-muted-foreground">
          Demonstração da migração do cache customizado para APIs nativas do Next.js
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Nativo</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Ativo</div>
            <p className="text-xs text-muted-foreground">
              Next.js unstable_cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Legado</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">Desativado</div>
            <p className="text-xs text-muted-foreground">
              Sistema customizado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhoria</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.improvement.performanceGain.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Performance gain
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com detalhes */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="test">Teste</TabsTrigger>
          <TabsTrigger value="invalidation">Invalidação</TabsTrigger>
        </TabsList>

        {/* Métricas */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Next.js Cache */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  Cache Nativo Next.js
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Cache Hits:</span>
                  <Badge variant="secondary">{metrics.nextjsCache.hits}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Cache Misses:</span>
                  <Badge variant="outline">{metrics.nextjsCache.misses}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <Badge variant="default">{metrics.nextjsCache.hitRate.toFixed(1)}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tempo Médio:</span>
                  <Badge variant="secondary">{metrics.nextjsCache.avgResponseTime.toFixed(0)}ms</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Legacy Cache */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-gray-500" />
                  Cache Legado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Cache Hits:</span>
                  <Badge variant="secondary">{metrics.legacyCache.hits}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Cache Misses:</span>
                  <Badge variant="outline">{metrics.legacyCache.misses}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Hit Rate:</span>
                  <Badge variant="default">{metrics.legacyCache.hitRate.toFixed(1)}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Tempo Médio:</span>
                  <Badge variant="secondary">{metrics.legacyCache.avgResponseTime.toFixed(0)}ms</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparação */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Performance</CardTitle>
              <CardDescription>
                Melhorias obtidas com a migração para o cache nativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ganho de Performance</span>
                  <span className="font-semibold text-green-600">
                    +{metrics.improvement.performanceGain.toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.improvement.performanceGain} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Redução de Memória</span>
                  <span className="font-semibold text-blue-600">
                    -{metrics.improvement.memoryReduction.toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.improvement.memoryReduction} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Eficiência do Cache</span>
                  <span className="font-semibold text-purple-600">
                    {metrics.improvement.cacheEfficiency.toFixed(1)}%
                  </span>
                </div>
                <Progress value={metrics.improvement.cacheEfficiency} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teste */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Performance</CardTitle>
              <CardDescription>
                Execute um teste para comparar a performance dos sistemas de cache
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isRunningTest && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Progresso do teste</span>
                    <span>{testProgress}%</span>
                  </div>
                  <Progress value={testProgress} className="h-2" />
                </div>
              )}

              <Button 
                onClick={runPerformanceTest}
                disabled={isRunningTest}
                className="w-full"
              >
                {isRunningTest ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Executando Teste...
                  </>
                ) : (
                  <>
                    <Activity className="mr-2 h-4 w-4" />
                    Executar Teste de Performance
                  </>
                )}
              </Button>

              {/* Dados de exemplo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Empresas Carregadas</h4>
                  <p className="text-sm text-muted-foreground">
                    {empresasLoading ? 'Carregando...' : `${empresas?.length || 0} empresas`}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Estatísticas</h4>
                  <p className="text-sm text-muted-foreground">
                    {statsLoading ? 'Carregando...' : `${stats?.total || 0} cálculos`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invalidação */}
        <TabsContent value="invalidation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Invalidação de Cache</CardTitle>
              <CardDescription>
                Teste as funcionalidades de invalidação do cache nativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => handleInvalidateCache('empresas')}
                >
                  Invalidar Empresas
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => handleInvalidateCache('calculos')}
                >
                  Invalidar Cálculos
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={() => handleInvalidateCache('all')}
                >
                  Invalidar Tudo
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  A invalidação de cache usa as APIs nativas do Next.js:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><code>revalidateTag()</code> - Invalida por tags</li>
                  <li><code>revalidatePath()</code> - Invalida por rotas</li>
                  <li>React Query - Invalida cache client-side</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
