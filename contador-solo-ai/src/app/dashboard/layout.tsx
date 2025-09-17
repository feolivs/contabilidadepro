import { MainLayout } from '@/components/layout/main-layout'
import { Suspense } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  stats: React.ReactNode
  charts: React.ReactNode
  recent: React.ReactNode
  alerts: React.ReactNode
}

export default function DashboardLayout({
  children,
  stats,
  charts,
  recent,
  alerts,
}: DashboardLayoutProps) {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Bem-vindo de volta! Aqui está um resumo do seu trabalho hoje.
          </p>
        </div>

        {/* Parallel Routes - Metrics Cards */}
        <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>}>
          {stats}
        </Suspense>

        {/* Main Content Grid with Parallel Routes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-6">
            <Suspense fallback={<div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
              {charts}
            </Suspense>
            
            <Suspense fallback={<div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
              {recent}
            </Suspense>
          </div>

          {/* Alerts/AI Chat Section */}
          <div>
            <Suspense fallback={<div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
              {alerts}
            </Suspense>
          </div>
        </div>

        {/* Children removido - usando apenas parallel routes */}
      </div>
    </MainLayout>
  )
}
