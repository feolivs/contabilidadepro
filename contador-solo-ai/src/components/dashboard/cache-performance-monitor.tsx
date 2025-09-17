'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Database,
  Zap,
  TrendingUp,
  RefreshCw,
  Trash2,
  Activity,
  BarChart3,
  Clock,
  HardDrive
} from 'lucide-react'
import { useIntelligentCache } from '@/hooks/use-intelligent-cache'

export function CachePerformanceMonitor() {
  const {
    stats,
    clear,
    predictivePreload,
    invalidateByTag
  } = useIntelligentCache()

  const getHitRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHitRateBadge = (rate: number) => {
    if (rate >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    if (rate >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  }

  const getPerformanceStatus = () => {
    if (stats.hitRate >= 80) return { status: 'Excelente', color: 'text-green-600' }
    if (stats.hitRate >= 60) return { status: 'Bom', color: 'text-yellow-600' }
    if (stats.hitRate >= 40) return { status: 'Regular', color: 'text-orange-600' }
    return { status: 'Ruim', color: 'text-red-600' }
  }

  const performance = getPerformanceStatus()

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Cache Inteligente
            <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              <Activity className="h-3 w-3 mr-1 animate-pulse" />
              Monitoramento
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={predictivePreload}
              className="h-8 w-8 p-0"
              title="Preload inteligente"
            >
              <Zap className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => invalidateByTag('auto')}
              className="h-8 w-8 p-0"
              title="Invalidar cache automático"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="h-8 w-8 p-0"
              title="Limpar cache"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Status Geral */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Performance do Cache</h3>
              <p className={`text-2xl font-bold ${performance.color}`}>
                {performance.status}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {stats.hitRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Taxa de Acerto</div>
            </div>
          </div>

          <div className="mt-3">
            <Progress
              value={stats.hitRate}
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Métricas Detalhadas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <HardDrive className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-600">{stats.totalEntries}</div>
            <div className="text-xs text-muted-foreground">Entradas</div>
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <div className={`text-lg font-bold ${getHitRateColor(stats.hitRate)}`}>
              {stats.hitRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Taxa de Acerto</div>
          </div>

          <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
            <BarChart3 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-purple-600">{stats.invalidations}</div>
            <div className="text-xs text-muted-foreground">Invalidações</div>
          </div>

          <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <HardDrive className="h-6 w-6 text-orange-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-orange-600">{stats.memoryUsage}</div>
            <div className="text-xs text-muted-foreground">Memória</div>
          </div>
        </div>

        {/* Indicadores de Performance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Taxa de Acerto</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`text-xs ${getHitRateBadge(stats.hitRate)}`}>
                {stats.hitRate.toFixed(1)}%
              </Badge>
              <div className="w-24">
                <Progress value={stats.hitRate} className="h-2" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Taxa de Erro</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {stats.missRate.toFixed(1)}%
              </Badge>
              <div className="w-24">
                <Progress value={stats.missRate} className="h-2" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Database className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Eficiência do Cache</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                {stats.totalEntries > 0 ?
                  ((stats.totalEntries / 1000) * 100).toFixed(1) : '0'}% Usado
              </Badge>
              <div className="w-24">
                <Progress
                  value={stats.totalEntries > 0 ? (stats.totalEntries / 1000) * 100 : 0}
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Insights Inteligentes */}
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Zap className="h-4 w-4 mr-2 text-yellow-600" />
            Insights do Cache
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            {stats.hitRate >= 80 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Cache funcionando com excelente performance!</span>
              </div>
            )}

            {stats.hitRate < 60 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span>Cache pode ser otimizado. Considere executar preload.</span>
              </div>
            )}

            {stats.totalEntries > 800 && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Cache próximo do limite. Limpeza automática ativa.</span>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Invalidação automática ativa baseada em mudanças do banco.</span>
            </div>
          </div>
        </div>

        {/* Sistema de status em tempo real */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Cache inteligente ativo</span>
            </div>

            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Atualização a cada 5s</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Indicador de atividade */}
      <div className="absolute top-2 right-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      </div>
    </Card>
  )
}