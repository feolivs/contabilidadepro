'use client'

import { Suspense } from 'react'
import { UploadPrazoFiscal } from '@/components/prazos/upload-prazo-fiscal'
import { Card, CardContent } from '@/components/ui/card'

// =====================================================
// SLOT DE UPLOAD - PARALLEL ROUTE
// =====================================================

export default function UploadSlot() {
  return (
    <Suspense fallback={<UploadLoadingSkeleton />}>
      <UploadContent />
    </Suspense>
  )
}

// =====================================================
// COMPONENTE DE UPLOAD
// =====================================================

function UploadContent() {
  const handleUploadComplete = (result: any) => {
    console.log('Upload concluído:', result)
    // Aqui podemos adicionar lógica adicional se necessário
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <UploadPrazoFiscal onUploadComplete={handleUploadComplete} />
      </div>
    </div>
  )
}



// =====================================================
// LOADING SKELETON
// =====================================================

function UploadLoadingSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 animate-pulse">
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-4"></div>
              <div className="h-5 bg-muted rounded w-32 mx-auto mb-2"></div>
              <div className="h-4 bg-muted rounded w-48 mx-auto mb-4"></div>
              <div className="flex justify-center gap-2 mb-4">
                <div className="h-5 bg-muted rounded w-12"></div>
                <div className="h-5 bg-muted rounded w-16"></div>
              </div>
              <div className="h-9 bg-muted rounded w-full"></div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-32 mb-3"></div>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-40 mb-3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
