import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, FileText, TrendingUp, Calculator } from 'lucide-react'

export default function RelatoriosLoading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Loading */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>

      {/* Stats Cards Loading */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Calculator, label: 'Total de Cálculos' },
          { icon: TrendingUp, label: 'Valor Total' },
          { icon: FileText, label: 'Pendentes' },
          { icon: BarChart3, label: 'Empresas Ativas' }
        ].map((item, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <div className="p-2 rounded-md bg-blue-100">
                <item.icon className="h-4 w-4 text-blue-600 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
            
            {/* Loading animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </Card>
        ))}
      </div>

      {/* Filters Loading */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Table Loading */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-6 gap-4 pb-2 border-b">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
            
            {/* Table Rows */}
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-6 gap-4 py-2">
                {Array.from({ length: 6 }).map((_, colIndex) => (
                  <Skeleton 
                    key={colIndex} 
                    className={`h-4 ${
                      colIndex === 0 ? 'w-24' : 
                      colIndex === 1 ? 'w-32' : 
                      colIndex === 2 ? 'w-20' : 
                      colIndex === 3 ? 'w-24' : 
                      colIndex === 4 ? 'w-16' : 'w-20'
                    }`} 
                  />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Loading */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className={`h-6 ${
                    i === 0 ? 'w-32' : 
                    i === 1 ? 'w-24' : 
                    i === 2 ? 'w-28' : 
                    i === 3 ? 'w-20' : 'w-16'
                  }`} />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  className={`w-6 ${
                    Math.random() > 0.5 ? 'h-32' : 
                    Math.random() > 0.5 ? 'h-24' : 'h-16'
                  }`} 
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading indicator */}
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <BarChart3 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando relatórios...</span>
        </div>
      </div>
    </div>
  )
}

export function RelatoriosStatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </Card>
      ))}
    </div>
  )
}
