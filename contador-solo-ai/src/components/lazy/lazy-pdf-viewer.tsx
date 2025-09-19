'use client'

import { lazy, Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

// Lazy load the PDF viewer
const PDFJSViewer = lazy(() => import('@/components/documentos/pdf-js-viewer').then(module => ({
  default: module.PDFJSViewer
})))

interface LazyPDFViewerProps {
  url: string
  fileName: string
}

function PDFViewerSkeleton() {
  return (
    <Card className="w-full h-96">
      <CardContent className="p-6">
        <div className="flex items-center justify-center h-full space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Carregando visualizador PDF...</span>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

export function LazyPDFViewer({ url, fileName }: LazyPDFViewerProps) {
  return (
    <Suspense fallback={<PDFViewerSkeleton />}>
      <PDFJSViewer url={url} fileName={fileName} />
    </Suspense>
  )
}