'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Database,
  Trash2,
  RefreshCw,
  Activity,
  Clock,
  HardDrive,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Settings
} from 'lucide-react'

// Hooks
import { useCacheManager } from '@/hooks/use-cached-query'
import { cacheManager, CacheStats } from '@/lib/cache/cache-manager'

/**
 * Props do componente CacheMonitor
 */
export interface CacheMonitorProps {
  className?: string
  showAdvanced?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

/**
 * Componente para monitorar o sistema de cache
 */
export function CacheMonitor({ 
  className = '',
  showAdvanced = false,
  autoRefresh = true,
  refreshInterval = 5000
}: CacheMonitorProps) {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { clearAllCache, invalidateByTags, getStats, cleanup } = useCacheManager()

  // Atualizar estatísticas
  const updateStats = async () => {
    setIsRefreshing(true)
    try {
      const newStats = getStats()
      setStats(newStats)
    } catch (error) {
      console.error('Erro ao obter estatísticas do cache:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto refresh
  useEffect(() => {
    updateStats()
    
    if (autoRefresh) {
      const interval = setInterval(updateStats, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  // Handlers
  const handleClearAll = async () => {
    if (confirm('Tem certeza que deseja limpar todo o cache?')) {
      clearAllCache()
      await updateStats()
    }
  }

  const handleCleanup = async () => {
    cleanup()
    await updateStats()
  }

  const handleInvalidateByTag = async (tag: string) => {
    invalidateByTags([tag])
    await updateStats()
  }

  // Calcular métricas
  const hitRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const sizePercentage = stats ? (stats.totalSize / (50 * 1024)) * 100 : 0 // 50MB max
  const entriesPercentage = stats ? (stats.totalEntries / 1000) * 100 : 0 // 1000 max

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando estatísticas...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Monitor de Cache</h2>
          {autoRefresh && (
            <Badge variant="secondary" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Auto-refresh
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={updateStats}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
          >
            <Settings className="h-4 w-4 mr-2" />
            Limpeza
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAll}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hit Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hit Rate</p>
                <p className={`text-2xl font-bold ${hitRateColor(stats.hitRate)}`}>
                  {stats.hitRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Miss: {stats.missRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${hitRateColor(stats.hitRate)}`} />
            </div>
          </CardContent>
        </Card>

        {/* Total de Entradas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold">{stats.totalEntries}</p>
                <p className="text-xs text-muted-foreground">
                  {entriesPercentage.toFixed(1)}% do limite
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Tamanho Total */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tamanho</p>
                <p className="text-2xl font-bold">
                  {(stats.totalSize / 1024).toFixed(1)} MB
                </p>
                <p className="text-xs text-muted-foreground">
                  {sizePercentage.toFixed(1)}% do limite
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Evictions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Evictions</p>
                <p className="text-2xl font-bold">{stats.evictions}</p>
                <p className="text-xs text-muted-foreground">
                  Última limpeza: {new Date(stats.lastCleanup).toLocaleTimeString('pt-BR')}
                </p>
              </div>
              <Trash2 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Uso de Memória</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usado: {(stats.totalSize / 1024).toFixed(1)} MB</span>
                <span>Limite: 50 MB</span>
              </div>
              <Progress value={sizePercentage} className="h-2" />
              {sizePercentage > 80 && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Cache próximo do limite. Considere fazer limpeza.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Número de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Entradas: {stats.totalEntries}</span>
                <span>Limite: 1000</span>
              </div>
              <Progress value={entriesPercentage} className="h-2" />
              {entriesPercentage > 80 && (
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Muitas entradas no cache. Considere fazer limpeza.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Avançadas */}
      {showAdvanced && (
        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="management">Gerenciamento</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Métricas de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Hit Rate</p>
                    <p className={`text-xl font-bold ${hitRateColor(stats.hitRate)}`}>
                      {stats.hitRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Miss Rate</p>
                    <p className="text-xl font-bold text-red-600">
                      {stats.missRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Recomendações</h4>
                  {stats.hitRate < 60 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Hit rate baixo. Considere ajustar TTL das estratégias de cache.
                      </AlertDescription>
                    </Alert>
                  )}
                  {stats.hitRate >= 80 && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm text-green-800">
                        Excelente performance de cache!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gerenciamento por Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['empresa', 'financeiro', 'compliance', 'ia', 'documentos'].map(tag => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      onClick={() => handleInvalidateByTag(tag)}
                      className="justify-start"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      {tag}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configurações do Cache</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Tamanho Máximo</p>
                    <p className="text-muted-foreground">50 MB</p>
                  </div>
                  <div>
                    <p className="font-medium">Máximo de Entradas</p>
                    <p className="text-muted-foreground">1000</p>
                  </div>
                  <div>
                    <p className="font-medium">Compressão</p>
                    <p className="text-muted-foreground">Habilitada</p>
                  </div>
                  <div>
                    <p className="font-medium">Persistência</p>
                    <p className="text-muted-foreground">LocalStorage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
