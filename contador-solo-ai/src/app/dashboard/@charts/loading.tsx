import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ChartsLoading() {
  return (
    <Card className="relative">
      <CardHeader>
        <div className="flex items-center">
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-2" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Skeleton para gráfico de receita */}
        <div>
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="flex-1 mx-3">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                </div>
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton para distribuição por tipo */}
        <div>
          <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton para indicador de status */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Indicador de carregamento */}
      <div className="absolute top-2 right-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      </div>
    </Card>
  )
}
