import { FileText, Upload, FolderOpen, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DocumentosLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-purple-600" />
            <div>
              <Skeleton className="h-7 w-36 mb-1" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Estatísticas de documentos */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total de Documentos', icon: FileText },
            { label: 'Enviados Hoje', icon: Upload },
            { label: 'Pendentes', icon: Clock },
            { label: 'Categorias', icon: FolderOpen }
          ].map((item, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros e busca */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Área de upload */}
        <Card className="border-2 border-dashed border-gray-300 animate-pulse">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <Skeleton className="h-6 w-48 mx-auto mb-2" />
              <Skeleton className="h-4 w-64 mx-auto mb-4" />
              <Skeleton className="h-10 w-32 mx-auto" />
            </div>
          </CardContent>
        </Card>

        {/* Lista de documentos */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar com categorias */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  'Notas Fiscais',
                  'Contratos',
                  'Relatórios',
                  'Comprovantes',
                  'Declarações'
                ].map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 animate-pulse">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Lista principal */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-gray-50 animate-pulse">
                      <Skeleton className="h-10 w-10 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-1" />
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                <div className="flex items-center justify-between pt-4 border-t mt-6">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex items-center space-x-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-8 w-8" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-4 right-4">
        <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span className="text-sm">Carregando documentos...</span>
        </div>
      </div>
    </div>
  )
}
