import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AlertsLoading() {
  return (
    <div className="space-y-6">
      {/* Skeleton para Alertas */}
      <Card className="relative">
        <CardHeader>
          <div className="flex items-center">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-2" />
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="p-3 border-l-4 border-l-gray-200 dark:border-l-gray-700 rounded-r-lg bg-gray-50 dark:bg-gray-900/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="h-9 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </CardContent>
        
        {/* Indicador de carregamento */}
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
      </Card>

      {/* Skeleton para AI Chat */}
      <Card className="relative">
        <CardHeader>
          <div className="flex items-center">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-2" />
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-b-lg flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mx-auto" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
        
        {/* Indicador de carregamento */}
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
        </div>
      </Card>
    </div>
  )
}
