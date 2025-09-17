import { Calculator, TrendingUp, FileText, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function CalculosLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calculator className="h-8 w-8 text-green-600" />
            <div>
              <Skeleton className="h-7 w-40 mb-1" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Cards de tipos de cálculo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'DAS - Simples Nacional', color: 'bg-blue-100' },
            { label: 'IRPJ - Lucro Presumido', color: 'bg-green-100' },
            { label: 'ICMS - Substituição', color: 'bg-purple-100' },
            { label: 'Folha de Pagamento', color: 'bg-orange-100' }
          ].map((item, index) => (
            <Card key={index} className="animate-pulse hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-12 w-12 ${item.color} rounded-lg flex items-center justify-center`}>
                    <Calculator className="h-6 w-6 text-gray-600" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Estatísticas de cálculos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>

          <Card className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-28" />
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>

          <Card className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        </div>

        {/* Histórico de cálculos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-48" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Header da tabela */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b">
                <div className="col-span-3">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="col-span-1">
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>

              {/* Linhas da tabela */}
              {[...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 py-3 border-b border-gray-100 animate-pulse">
                  <div className="col-span-3">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading indicator específico para cálculos */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <Calculator className="h-4 w-4 animate-pulse" />
          <span className="text-sm">Processando cálculos...</span>
        </div>
      </div>
    </div>
  )
}
