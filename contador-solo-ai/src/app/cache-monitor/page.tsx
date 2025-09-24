'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Database,
  ArrowLeft,
  Settings,
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// Componentes
import { CacheMonitor } from '@/components/cache/cache-monitor'

// Hooks
import { useCache, useCachePerformance, useCacheAlerts } from '@/providers/cache-provider'

/**
 * Página do Monitor de Cache
 */
export default function CacheMonitorPage() {
  const router = useRouter()
  const { isInitialized } = useCache()
  const performance = useCachePerformance()
  const alerts = useCacheAlerts()
  
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  if (!isInitialized) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <h2 className="text-lg font-semibold mb-2">Inicializando Cache</h2>
            <p className="text-muted-foreground">Aguarde enquanto o sistema de cache é inicializado...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-blue-600" />
              Monitor de Cache
            </h1>
            <p className="text-muted-foreground">
              Sistema de cache inteligente do ContabilidadePRO
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <label htmlFor="auto-refresh" className="text-sm">
              Auto-refresh
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            <Switch
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
              id="show-advanced"
            />
            <label htmlFor="show-advanced" className="text-sm">
              Avançado
            </label>
          </div>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert 
              key={index}
              className={
                alert.type === 'error' ? 'border-red-200 bg-red-50' :
                alert.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                alert.type === 'success' ? 'border-green-200 bg-green-50' :
                'border-blue-200 bg-blue-50'
              }
            >
              {alert.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
              {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
              {alert.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
              <AlertDescription>
                <div className="space-y-1">
                  <p className={`font-medium ${
                    alert.type === 'error' ? 'text-red-800' :
                    alert.type === 'warning' ? 'text-yellow-800' :
                    alert.type === 'success' ? 'text-green-800' :
                    'text-blue-800'
                  }`}>
                    {alert.message}
                  </p>
                  <p className={`text-sm ${
                    alert.type === 'error' ? 'text-red-700' :
                    alert.type === 'warning' ? 'text-yellow-700' :
                    alert.type === 'success' ? 'text-green-700' :
                    'text-blue-700'
                  }`}>
                    {alert.suggestion}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Resumo de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Eficiência</p>
                <p className={`text-2xl font-bold ${
                  performance.efficiency === 'excellent' ? 'text-green-600' :
                  performance.efficiency === 'good' ? 'text-blue-600' :
                  performance.efficiency === 'fair' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {performance.efficiency === 'excellent' ? 'Excelente' :
                   performance.efficiency === 'good' ? 'Boa' :
                   performance.efficiency === 'fair' ? 'Regular' :
                   performance.efficiency === 'poor' ? 'Ruim' : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Hit Rate: {performance.hitRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className={`h-8 w-8 ${
                performance.efficiency === 'excellent' ? 'text-green-600' :
                performance.efficiency === 'good' ? 'text-blue-600' :
                performance.efficiency === 'fair' ? 'text-yellow-600' :
                'text-red-600'
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold">{performance.totalEntries}</p>
                <p className="text-xs text-muted-foreground">
                  {((performance.totalEntries / 1000) * 100).toFixed(1)}% do limite
                </p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tamanho</p>
                <p className="text-2xl font-bold">
                  {(performance.totalSize / 1024).toFixed(1)} MB
                </p>
                <p className="text-xs text-muted-foreground">
                  {((performance.totalSize / (50 * 1024)) * 100).toFixed(1)}% do limite
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Evictions</p>
                <p className="text-2xl font-bold">{performance.evictions}</p>
                <p className="text-xs text-muted-foreground">
                  {performance.evictions > 50 ? 'Alto' : 
                   performance.evictions > 10 ? 'Médio' : 'Baixo'}
                </p>
              </div>
              <Settings className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações sobre o Sistema de Cache */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-blue-800">Sistema de Cache Inteligente</h3>
              <p className="text-sm text-blue-700">
                O ContabilidadePRO utiliza um sistema de cache multicamadas com invalidação automática, 
                compressão de dados e persistência no localStorage. O cache é otimizado especificamente 
                para dados contábeis brasileiros, com estratégias diferenciadas por tipo de conteúdo.
              </p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  Cache multicamadas
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  Invalidação inteligente
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  Compressão automática
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <CheckCircle className="h-3 w-3" />
                  Persistência local
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitor Principal */}
      <CacheMonitor 
        showAdvanced={showAdvanced}
        autoRefresh={autoRefresh}
        refreshInterval={autoRefresh ? 5000 : undefined}
      />

      {/* Tabs Adicionais */}
      <Tabs defaultValue="strategies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="strategies">Estratégias</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="troubleshooting">Solução de Problemas</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estratégias de Cache</CardTitle>
              <CardDescription>
                Configurações otimizadas para diferentes tipos de dados contábeis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Insights de Empresa</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>TTL: 10 minutos</p>
                    <p>Prioridade: Alta</p>
                    <p>Compressão: Sim</p>
                    <p>Persistência: Sim</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Métricas Financeiras</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>TTL: 5 minutos</p>
                    <p>Prioridade: Alta</p>
                    <p>Compressão: Sim</p>
                    <p>Persistência: Sim</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Análise de Compliance</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>TTL: 15 minutos</p>
                    <p>Prioridade: Média</p>
                    <p>Compressão: Sim</p>
                    <p>Persistência: Sim</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Insights de IA</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>TTL: 8 minutos</p>
                    <p>Prioridade: Alta</p>
                    <p>Compressão: Sim</p>
                    <p>Persistência: Não</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise de Performance</CardTitle>
              <CardDescription>
                Métricas detalhadas do sistema de cache
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Hit Rate</p>
                  <p className={`text-xl font-bold ${
                    performance.hitRate >= 80 ? 'text-green-600' :
                    performance.hitRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {performance.hitRate.toFixed(1)}%
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Miss Rate</p>
                  <p className="text-xl font-bold text-red-600">
                    {performance.missRate.toFixed(1)}%
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Eficiência</p>
                  <p className={`text-xl font-bold ${
                    performance.efficiency === 'excellent' ? 'text-green-600' :
                    performance.efficiency === 'good' ? 'text-blue-600' :
                    performance.efficiency === 'fair' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {performance.efficiency === 'excellent' ? 'A+' :
                     performance.efficiency === 'good' ? 'B' :
                     performance.efficiency === 'fair' ? 'C' : 'D'}
                  </p>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={`text-xl font-bold ${
                    performance.efficiency === 'excellent' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {performance.efficiency === 'excellent' ? '🚀' : '⚡'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Solução de Problemas</CardTitle>
              <CardDescription>
                Guia para resolver problemas comuns do cache
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Hit Rate Baixo (&lt; 50%)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Possíveis causas: TTL muito baixo, dados sendo invalidados frequentemente, 
                    ou padrões de acesso não otimizados.
                  </p>
                  <p className="text-sm font-medium">Soluções:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Aumentar TTL das estratégias mais usadas</li>
                    <li>Revisar lógica de invalidação</li>
                    <li>Implementar pre-loading de dados críticos</li>
                  </ul>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Muitas Evictions</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Cache está removendo entradas frequentemente devido a limites de memória.
                  </p>
                  <p className="text-sm font-medium">Soluções:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Aumentar limite de memória do cache</li>
                    <li>Habilitar compressão para mais tipos de dados</li>
                    <li>Revisar prioridades das estratégias</li>
                  </ul>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">Cache Não Funcionando</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Dados não estão sendo armazenados ou recuperados do cache.
                  </p>
                  <p className="text-sm font-medium">Soluções:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    <li>Verificar se localStorage está disponível</li>
                    <li>Limpar cache corrompido</li>
                    <li>Reinicializar o CacheProvider</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
