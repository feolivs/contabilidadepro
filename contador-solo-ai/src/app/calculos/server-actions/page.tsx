import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase'
import { cachedCalculosStats, cachedEmpresasList } from '@/lib/server-cache'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CalculoDASForm } from '@/components/calculos/calculo-das-form'
import { CalculoIRPJForm } from '@/components/calculos/calculo-irpj-form'
import { CalculosListServer } from '@/components/calculos/calculos-list-server'
import { PerformanceComparison } from '@/components/calculos/performance-comparison'
import { 
  Calculator, 
  Building2, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Zap
} from 'lucide-react'
import type { CalculoFiscal } from '@/types/calculo'

// =====================================================
// CACHED DATA FUNCTIONS
// =====================================================

const getCalculos = unstable_cache(
  async (): Promise<CalculoFiscal[]> => {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('calculos_fiscais')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {

      return []
    }

    return data as CalculoFiscal[]
  },
  ['calculos-list'],
  {
    tags: ['calculos'],
    revalidate: 300 // 5 minutos
  }
)

// Usando a nova função de cache
const getEstatisticas = () => cachedCalculosStats()

// Usando a nova função de cache
const getEmpresas = () => cachedEmpresasList()

// =====================================================
// COMPONENTS
// =====================================================

function EstatisticasCard() {
  return (
    <Suspense fallback={<EstatisticasSkeleton />}>
      <EstatisticasContent />
    </Suspense>
  )
}

async function EstatisticasContent() {
  const stats = await getEstatisticas()

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Calculator className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">Calculados</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">Pagos</p>
              <p className="text-2xl font-bold">{stats.pagos}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-sm font-medium">Vencidos</p>
              <p className="text-2xl font-bold">{stats.pendentes}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Valor Total</p>
              <p className="text-lg font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(stats.valorTotal)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EstatisticasSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CalculosList() {
  return (
    <Suspense fallback={<CalculosListSkeleton />}>
      <CalculosListContent />
    </Suspense>
  )
}

async function CalculosListContent() {
  const calculos = await getCalculos()

  return <CalculosListServer calculos={calculos} />
}

function CalculosListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// =====================================================
// MAIN PAGE COMPONENT
// =====================================================

export default async function CalculosServerActionsPage() {
  const empresas = await getEmpresas()
  const empresaPadrao = empresas[0]?.id || ''

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Cálculos Fiscais com Server Actions
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistema otimizado com Server Actions do Next.js para máxima performance
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          <Zap className="mr-1 h-3 w-3" />
          Server Actions Ativo
        </Badge>
      </div>

      {/* Estatísticas */}
      <EstatisticasCard />

      {/* Tabs Principal */}
      <Tabs defaultValue="calculos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculos" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Cálculos
          </TabsTrigger>
          <TabsTrigger value="das" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Novo DAS
          </TabsTrigger>
          <TabsTrigger value="irpj" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Novo IRPJ
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Lista de Cálculos */}
        <TabsContent value="calculos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cálculos Realizados</CardTitle>
              <CardDescription>
                Gerencie todos os cálculos fiscais com ações otimizadas do servidor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CalculosList />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Formulário DAS */}
        <TabsContent value="das">
          {empresaPadrao ? (
            <CalculoDASForm
              empresaId={empresaPadrao}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                <p className="text-muted-foreground">
                  Cadastre uma empresa primeiro para realizar cálculos fiscais.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Formulário IRPJ */}
        <TabsContent value="irpj">
          {empresaPadrao ? (
            <CalculoIRPJForm
              empresaId={empresaPadrao}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                <p className="text-muted-foreground">
                  Cadastre uma empresa primeiro para realizar cálculos fiscais.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Comparação de Performance */}
        <TabsContent value="performance">
          <PerformanceComparison />
        </TabsContent>
      </Tabs>
    </div>
  )
}
