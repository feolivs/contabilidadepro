import { Card, CardContent } from '@/components/ui/card'

// =====================================================
// LOADING STATE PARA SLOT DE ESTATÍSTICAS
// =====================================================

export default function StatsLoading() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-muted rounded mb-2 w-20"></div>
                <div className="h-8 bg-muted rounded w-12"></div>
              </div>
              <div className="w-10 h-10 bg-muted rounded-lg"></div>
            </div>
            <div className="mt-2">
              <div className="h-5 bg-muted rounded w-16"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
