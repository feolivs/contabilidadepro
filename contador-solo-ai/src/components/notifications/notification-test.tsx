'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNotifications } from '@/providers/notification-provider'
import { useAuthStore } from '@/store/auth-store'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Bell, 
  TestTube, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle,
  Zap,
  Database,
  Volume2
} from 'lucide-react'

/**
 * Componente de teste para o sistema de notificações
 * Permite testar todas as funcionalidades implementadas na Fase 1
 */
export function NotificationTest() {
  const { user } = useAuthStore()
  const {
    notifications,
    unreadCount,
    isConnected,
    showAlert,
    playNotificationSound
  } = useNotifications()
  
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createBrowserSupabaseClient()

  // Teste 1: Inserir notificação diretamente no banco
  const testDatabaseNotification = async () => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    console.log('🧪 Testando inserção de notificação para usuário:', user.id)
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Teste de Notificação Database',
          message: 'Esta é uma notificação de teste inserida diretamente no banco de dados.',
          type: 'info',
          category: 'test',
          priority: 'MEDIUM',
          status: 'unread',
          source: 'notification_test',
          fiscal_data: {
            test_type: 'database_insert',
            timestamp: new Date().toISOString()
          }
        })
        .select()

      console.log('📊 Resultado da inserção:', { data, error })

      if (error) {
        console.error('❌ Erro ao inserir notificação:', error)
        toast.error(`Erro ao criar notificação: ${error.message}`)
      } else {
        console.log('✅ Notificação criada com sucesso:', data)
        toast.success('Notificação de teste criada com sucesso!')
      }
    } catch (error) {
      console.error('❌ Erro catch ao inserir notificação:', error)
      toast.error('Erro ao criar notificação de teste')
    } finally {
      setIsLoading(false)
    }
  }

  // Teste 2: Inserir alerta fiscal
  const testFiscalAlert = async () => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    console.log('🧪 Testando inserção de alerta fiscal para usuário:', user.id)
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('fiscal_alerts')
        .insert({
          user_id: user.id,
          alert_type: 'DAS_VENCIMENTO',
          title: 'DAS Vencendo em 3 dias',
          description: 'O DAS da empresa TESTE LTDA vence em 3 dias (20/01/2025). Valor: R$ 1.234,56',
          priority: 'HIGH',
          status: 'ACTIVE',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          days_before: 3,
          notification_frequency: 'ONCE',
          metadata: {
            empresa_id: 'test-empresa-123',
            empresa_nome: 'TESTE LTDA',
            valor_das: 1234.56,
            competencia: '12/2024',
            action_url: '/calculos/das'
          },
          related_entity_type: 'empresa',
          related_entity_id: 'test-empresa-123'
        })
        .select()

      console.log('📊 Resultado da inserção de alerta fiscal:', { data, error })

      if (error) {
        console.error('❌ Erro ao inserir alerta fiscal:', error)
        toast.error(`Erro ao criar alerta fiscal: ${error.message}`)
      } else {
        console.log('✅ Alerta fiscal criado com sucesso:', data)
        toast.success('Alerta fiscal de teste criado com sucesso!')
      }
    } catch (error) {
      console.error('Erro ao inserir alerta fiscal:', error)
      toast.error('Erro ao criar alerta fiscal de teste')
    } finally {
      setIsLoading(false)
    }
  }

  // Teste 3: Notificação crítica
  const testCriticalNotification = async () => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return
    }

    console.log('🧪 Testando inserção de notificação crítica para usuário:', user.id)
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: '🚨 ALERTA CRÍTICO - Prazo Vencendo HOJE',
          message: 'DEFIS 2024 vence HOJE às 23:59. Multa por atraso: R$ 500,00 + juros.',
          type: 'fiscal_alert',
          category: 'compliance',
          priority: 'CRITICAL',
          status: 'unread',
          source: 'fiscal_system',
          action_url: '/prazos',
          action_label: 'Entregar DEFIS Agora',
          fiscal_data: {
            alert_type: 'DEFIS_PRAZO',
            deadline: new Date().toISOString(),
            fine_amount: 500.00,
            urgency_level: 'IMMEDIATE'
          }
        })
        .select()

      console.log('📊 Resultado da inserção de notificação crítica:', { data, error })

      if (error) {
        console.error('❌ Erro ao inserir notificação crítica:', error)
        toast.error(`Erro ao criar notificação crítica: ${error.message}`)
      } else {
        console.log('✅ Notificação crítica criada com sucesso:', data)
        toast.success('Notificação crítica criada!')
      }
    } catch (error) {
      console.error('Erro ao inserir notificação crítica:', error)
      toast.error('Erro ao criar notificação crítica')
    } finally {
      setIsLoading(false)
    }
  }

  // Teste 4: Sons de notificação
  const testNotificationSounds = () => {
    toast.info('Testando sons de notificação...')
    
    setTimeout(() => {
      playNotificationSound('info')
      toast.info('Som: Info')
    }, 500)
    
    setTimeout(() => {
      playNotificationSound('warning')
      toast.warning('Som: Warning')
    }, 2000)
    
    setTimeout(() => {
      playNotificationSound('critical')
      toast.error('Som: Critical')
    }, 4000)
  }

  // Teste 5: Alerta direto (sem banco)
  const testDirectAlert = () => {
    const mockAlert = {
      id: 'test-alert-' + Date.now(),
      user_id: user?.id || 'test',
      alert_type: 'SYSTEM_TEST',
      title: 'Teste de Alerta Direto',
      description: 'Este alerta foi criado diretamente no frontend para testar o sistema de exibição.',
      priority: 'HIGH' as const,
      status: 'ACTIVE' as const,
      alert_date: new Date().toISOString(),
      suggested_actions: ['Verificar sistema', 'Confirmar funcionamento'],
      context_data: {
        test_mode: true,
        direct_alert: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    showAlert(mockAlert)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Sistema de Notificações - Testes Fase 1
        </CardTitle>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
          </div>
          <Badge variant="outline">
            {notifications.length} notificações
          </Badge>
          <Badge variant="outline">
            {unreadCount} não lidas
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Teste 1: Notificação Database */}
          <Button
            onClick={testDatabaseNotification}
            disabled={isLoading || !user}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Database className="h-4 w-4" />
            Teste Database
          </Button>

          {/* Teste 2: Alerta Fiscal */}
          <Button
            onClick={testFiscalAlert}
            disabled={isLoading || !user}
            className="flex items-center gap-2"
            variant="outline"
          >
            <AlertTriangle className="h-4 w-4" />
            Alerta Fiscal
          </Button>

          {/* Teste 3: Notificação Crítica */}
          <Button
            onClick={testCriticalNotification}
            disabled={isLoading || !user}
            className="flex items-center gap-2"
            variant="destructive"
          >
            <XCircle className="h-4 w-4" />
            Crítica
          </Button>

          {/* Teste 4: Sons */}
          <Button
            onClick={testNotificationSounds}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Volume2 className="h-4 w-4" />
            Testar Sons
          </Button>

          {/* Teste 5: Alerta Direto */}
          <Button
            onClick={testDirectAlert}
            className="flex items-center gap-2"
            variant="secondary"
          >
            <Zap className="h-4 w-4" />
            Alerta Direto
          </Button>
        </div>

        {/* Status do Sistema */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Status do Sistema
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Usuário:</span>
              <span className="ml-2">{user ? user.email : 'Não autenticado'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Conexão Realtime:</span>
              <span className="ml-2">{isConnected ? '✅ Ativa' : '❌ Inativa'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Notificações:</span>
              <span className="ml-2">{notifications.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Não Lidas:</span>
              <span className="ml-2">{unreadCount}</span>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
          <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
            Como testar:
          </h4>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>1. Clique nos botões para criar notificações de teste</li>
            <li>2. Observe o ícone de notificação no header (sino)</li>
            <li>3. Verifique se o contador de não lidas atualiza</li>
            <li>4. Teste os sons de notificação</li>
            <li>5. Abra o centro de notificações e interaja com elas</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
