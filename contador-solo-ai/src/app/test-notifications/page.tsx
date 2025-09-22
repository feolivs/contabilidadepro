import { Metadata } from 'next'
import { MainLayout } from '@/components/layout/main-layout'
import { NotificationTest } from '@/components/notifications/notification-test'

export const metadata: Metadata = {
  title: 'Teste de Notificações | ContabilidadePRO',
  description: 'Página de teste para o sistema de notificações em tempo real',
}

export default function TestNotificationsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Teste do Sistema de Notificações
          </h1>
          <p className="text-muted-foreground mt-2">
            Teste todas as funcionalidades do sistema de notificações em tempo real implementado na Fase 1.
          </p>
        </div>
        
        <NotificationTest />
      </div>
    </MainLayout>
  )
}
