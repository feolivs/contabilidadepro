'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { OCRPerformanceDashboard } from '@/components/documentos/ocr-performance-dashboard'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DocumentosPerformancePage() {
  const router = useRouter()

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Performance de OCR</h1>
            <p className="text-muted-foreground">
              Análise detalhada da performance do processamento de documentos
            </p>
          </div>
        </div>

        {/* Dashboard */}
        <OCRPerformanceDashboard />
      </div>
    </MainLayout>
  )
}