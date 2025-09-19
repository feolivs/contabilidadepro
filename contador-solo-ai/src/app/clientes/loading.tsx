import { Users, Search } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ClientesLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <Skeleton className="h-7 w-32 mb-1" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filtros e busca */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            'Total de Clientes',
            'Clientes Ativos',
            'Novos este Mês',
            'Pendências'
          ].map((label, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Lista de clientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Header da tabela */}
              <div className="grid grid-cols-12 gap-4 pb-3 border-b text-sm font-medium">
                <div className="col-span-4">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="col-span-3">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="col-span-1">
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>

              {/* Linhas da tabela */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 py-3 border-b border-gray-100 hover:bg-gray-50 animate-pulse">
                  <div className="col-span-4">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3 flex items-center">
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span className="text-sm">Carregando clientes...</span>
        </div>
      </div>
    </div>
  )
}
