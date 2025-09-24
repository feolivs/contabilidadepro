// 📊 DASHBOARD PRINCIPAL PARA CONTADORA - VERSÃO LIMPA
// Dashboard com sidebar limpa e moderna usando shadcn/ui

import { CleanLayout } from '@/components/layout/clean-layout'

// Dashboard limpo e moderno
function DashboardDebug() {

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          📊 Dashboard ContabilidadePRO
        </h1>
        <p className="text-muted-foreground text-base">
          Sidebar limpa e moderna com shadcn/ui • Dark Mode • Responsivo ✨
        </p>
      </div>

      {/* Cards de resumo limpos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">
            📋 Obrigações Fiscais
          </h3>
          <p className="text-3xl font-bold text-green-600 mb-2">
            12
          </p>
          <p className="text-sm text-muted-foreground">
            Próximas nos próximos 30 dias
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">
            🏢 Empresas Ativas
          </h3>
          <p className="text-3xl font-bold text-blue-600 mb-2">
            8
          </p>
          <p className="text-sm text-muted-foreground">
            Empresas sob sua gestão
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">
            📄 Documentos Pendentes
          </h3>
          <p className="text-3xl font-bold text-red-600 mb-2">
            5
          </p>
          <p className="text-sm text-muted-foreground">
            Aguardando processamento
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">
            💰 Faturamento Mensal
          </h3>
          <p className="text-3xl font-bold text-emerald-600 mb-2">
            R$ 45.280
          </p>
          <p className="text-sm text-muted-foreground">
            Crescimento de 12% vs mês anterior
          </p>
        </div>
      </div>

      {/* Seção de atividades recentes */}
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h3 className="text-xl font-semibold mb-6">
          📋 Atividades Recentes
        </h3>

        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-md border-l-4 border-emerald-600">
            <p className="text-sm font-semibold mb-1">
              ✅ DAS enviado - Empresa ABC Ltda
            </p>
            <p className="text-xs text-muted-foreground">
              Há 2 horas • Valor: R$ 1.250,00
            </p>
          </div>

          <div className="p-4 bg-muted/30 rounded-md border-l-4 border-blue-600">
            <p className="text-sm font-semibold mb-1">
              📄 Nota fiscal processada - Empresa XYZ S.A.
            </p>
            <p className="text-xs text-muted-foreground">
              Há 4 horas • OCR: 98% precisão
            </p>
          </div>

          <div className="p-4 bg-muted/30 rounded-md border-l-4 border-red-600">
            <p className="text-sm font-semibold mb-1">
              ⚠️ Vencimento próximo - ICMS Empresa DEF
            </p>
            <p className="text-xs text-muted-foreground">
              Vence em 3 dias • Valor: R$ 2.850,00
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <CleanLayout>
      <DashboardDebug />
    </CleanLayout>
  )
}

// Skeleton para loading do dashboard
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Cards de Resumo Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>

        {/* Conteúdo Principal Skeleton */}
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  )
}
