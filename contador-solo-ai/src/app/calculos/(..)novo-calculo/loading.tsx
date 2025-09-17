import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function NovoCalculoModalLoading() {
  return (
    <Dialog open={true}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-2" />
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-2" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Skeleton para seleção de tipo */}
          <Card>
            <CardHeader>
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 border-2 border-border rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          {i === 0 && (
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          )}
                        </div>
                        <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skeleton para tabs */}
          <div className="space-y-4">
            <div className="grid w-full grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>

            {/* Skeleton para formulário */}
            <Card>
              <CardHeader>
                <div className="flex items-center">
                  <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mr-2" />
                  <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Skeleton para campos do formulário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>

                {/* Skeleton para botões */}
                <div className="flex items-center justify-end space-x-2">
                  <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skeleton para footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex items-center space-x-2">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
