import { Metadata } from 'next'
import { Suspense } from 'react'
import { CleanLayout } from '@/components/layout/clean-layout'
import { SistemaAlertasStatus } from '@/components/prazos/sistema-alertas-status'
import { AlertasIntegration } from '@/components/prazos/alertas-integration'

// =====================================================
// LAYOUT PARA PRAZOS FISCAIS - PARALLEL ROUTES
// =====================================================

export const metadata: Metadata = {
  title: 'Prazos Fiscais | ContabilidadePRO',
  description: 'Gerencie todos os prazos fiscais das suas empresas em um só lugar. Upload automático, OCR inteligente e alertas personalizados.',
  keywords: ['prazos fiscais', 'obrigações fiscais', 'DAS', 'DCTF', 'ECF', 'SPED', 'contabilidade'],
}

interface PrazosLayoutProps {
  children: React.ReactNode
  calendar?: React.ReactNode
  list?: React.ReactNode
  upload?: React.ReactNode
  stats?: React.ReactNode
}

export default function PrazosLayout({
  children,
  calendar,
  list,
  upload,
  stats
}: PrazosLayoutProps) {
  return (
    <CleanLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Prazos Fiscais</h1>
            <p className="text-muted-foreground">
              Gerencie obrigações fiscais, upload de documentos e alertas automáticos
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Sistema ativo</span>
            </div>
          </div>
        </div>

        {/* Sistema de Alertas Status */}
        <div className="mb-6">
          <SistemaAlertasStatus />
        </div>

        {/* Integração de Alertas Fiscais */}
        <div className="mb-6">
          <Suspense fallback={<AlertasLoadingSkeleton />}>
            <AlertasIntegration showOnlyFiscal={true} maxItems={15} />
          </Suspense>
        </div>

        {/* Stats Row - Always visible */}
        <Suspense fallback={<StatsLoadingSkeleton />}>
          {stats}
        </Suspense>

        {/* Calendar Section - Full Width */}
        <div className="bg-card border rounded-lg">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Calendário</h2>
            <p className="text-sm text-muted-foreground">
              Visualização mensal dos prazos fiscais
            </p>
          </div>
          <div className="p-0">
            <Suspense fallback={<CalendarLoadingSkeleton />}>
              {calendar}
            </Suspense>
          </div>
        </div>

        {/* Bottom Section - Upload and List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="bg-card border rounded-lg">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Upload de Documentos</h2>
              <p className="text-sm text-muted-foreground">
                Arraste documentos para extração automática
              </p>
            </div>
            <div className="p-0">
              <Suspense fallback={<UploadLoadingSkeleton />}>
                {upload}
              </Suspense>
            </div>
          </div>

          {/* List Section */}
          <div className="bg-card border rounded-lg flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Lista de Prazos</h2>
              <p className="text-sm text-muted-foreground">
                Todos os prazos fiscais organizados e filtráveis
              </p>
            </div>
            <div className="flex-1 min-h-[600px] overflow-hidden">
              <Suspense fallback={<ListLoadingSkeleton />}>
                {list}
              </Suspense>
            </div>
          </div>
        </div>

        {/* Fallback content for direct access */}
        <div className="hidden">
          {children}
        </div>
      </div>
    </CleanLayout>
  )
}

// =====================================================
// LOADING SKELETONS
// =====================================================

function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-20 animate-pulse" />
              <div className="h-8 bg-muted rounded w-16 animate-pulse" />
            </div>
            <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="h-5 bg-muted rounded w-12 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarLoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-muted rounded w-32 animate-pulse" />
        <div className="flex space-x-1">
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          <div className="h-8 w-8 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function ListLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="p-4 border-b">
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 w-20 bg-muted rounded animate-pulse" />
          <div className="h-10 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 bg-muted rounded w-32 animate-pulse" />
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UploadLoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="border-2 border-dashed rounded-lg p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-muted rounded-full mx-auto animate-pulse" />
          <div className="h-6 bg-muted rounded w-40 mx-auto animate-pulse" />
          <div className="h-4 bg-muted rounded w-32 mx-auto animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-2">
            <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertasLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                <div className="h-6 bg-muted rounded w-8 animate-pulse" />
              </div>
              <div className="w-8 h-8 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Alertas panel skeleton */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted rounded w-32 animate-pulse" />
            <div className="h-8 bg-muted rounded w-24 animate-pulse" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border rounded">
              <div className="w-4 h-4 bg-muted rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
              </div>
              <div className="h-5 bg-muted rounded w-16 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
