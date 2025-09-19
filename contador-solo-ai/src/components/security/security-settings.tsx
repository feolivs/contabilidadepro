// 🔐 SECURITY SETTINGS
// Componente para gerenciar configurações de segurança
// Integrado ao sistema ContabilidadePRO

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Smartphone, 
  Key, 
  AlertTriangle, 
  Clock, 
  Globe,
  Activity,
  Settings,
  Trash2,
  Plus
} from 'lucide-react'
import { useMFA, useSecurityEvents, useSecurityDashboard } from '@/hooks/use-mfa'
import { MFASetupWizard } from './mfa-setup-wizard'
import { SecurityAuditLog } from './security-audit-log'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function SecuritySettings() {
  const [showMFAWizard, setShowMFAWizard] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)

  const { 
    mfaStatus, 
    isLoadingStatus, 
    unenrollMFA,
    generateBackupCodes,
    isMFAEnabled,
    hasVerifiedFactor,
    availableBackupCodes
  } = useMFA()

  const { data: securityDashboard } = useSecurityDashboard(30)

  if (isLoadingStatus) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Configurações de Segurança
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Gerencie a segurança da sua conta e monitore atividades
        </p>
      </div>

      {/* Status de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Status de Segurança</span>
          </CardTitle>
          <CardDescription>
            Visão geral da segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                isMFAEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">MFA</p>
                <p className="text-sm text-gray-600">
                  {isMFAEnabled ? 'Ativado' : 'Desativado'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Atividade</p>
                <p className="text-sm text-gray-600">
                  {securityDashboard?.dashboard?.total_events || 0} eventos (30d)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                (securityDashboard?.dashboard?.high_risk_events || 0) === 0 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-yellow-100 text-yellow-600'
              }`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Alertas</p>
                <p className="text-sm text-gray-600">
                  {securityDashboard?.dashboard?.high_risk_events || 0} alto risco
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autenticação de Dois Fatores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Autenticação de Dois Fatores (MFA)</span>
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                isMFAEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">
                  {isMFAEnabled ? 'MFA Ativado' : 'MFA Desativado'}
                </p>
                <p className="text-sm text-gray-600">
                  {isMFAEnabled 
                    ? `${mfaStatus?.factors?.length || 0} método(s) configurado(s)`
                    : 'Configure para maior segurança'
                  }
                </p>
              </div>
            </div>
            
            {!isMFAEnabled ? (
              <Button onClick={() => setShowMFAWizard(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Configurar MFA
              </Button>
            ) : (
              <Badge variant="secondary">Configurado</Badge>
            )}
          </div>

          {isMFAEnabled && (
            <>
              <Separator />
              
              {/* Fatores MFA */}
              <div className="space-y-3">
                <h4 className="font-medium">Métodos configurados</h4>
                {mfaStatus?.factors?.map((factor) => (
                  <div key={factor.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-medium">{factor.friendly_name}</p>
                        <p className="text-sm text-gray-600">
                          Configurado em {format(new Date(factor.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={factor.status === 'verified' ? 'default' : 'secondary'}>
                        {factor.status === 'verified' ? 'Verificado' : 'Pendente'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unenrollMFA.mutate(factor.id)}
                        disabled={unenrollMFA.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Códigos de Backup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Key className="h-4 w-4 text-gray-600" />
                    <div>
                      <p className="font-medium">Códigos de backup</p>
                      <p className="text-sm text-gray-600">
                        {availableBackupCodes} códigos disponíveis
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateBackupCodes.mutate()}
                    disabled={generateBackupCodes.isPending}
                  >
                    Gerar novos códigos
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preferências de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Preferências de Segurança</span>
          </CardTitle>
          <CardDescription>
            Configure como e quando aplicar medidas de segurança
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">MFA para operações financeiras</p>
                <p className="text-sm text-gray-600">
                  Exigir MFA para cálculos e operações sensíveis
                </p>
              </div>
              <Switch 
                checked={mfaStatus?.preferences?.require_mfa_for_sensitive_ops || false}
                disabled={!isMFAEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notificações de login</p>
                <p className="text-sm text-gray-600">
                  Receber alertas sobre tentativas de login
                </p>
              </div>
              <Switch 
                checked={mfaStatus?.preferences?.notify_login_attempts || false}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Log de atividades</p>
                <p className="text-sm text-gray-600">
                  Registrar todas as atividades da conta
                </p>
              </div>
              <Switch 
                checked={mfaStatus?.preferences?.log_all_activities || false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Atividade Recente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Atividade Recente</span>
          </CardTitle>
          <CardDescription>
            Últimas atividades de segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {securityDashboard?.dashboard && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {securityDashboard.dashboard.successful_logins}
                  </p>
                  <p className="text-sm text-gray-600">Logins bem-sucedidos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {securityDashboard.dashboard.failed_attempts}
                  </p>
                  <p className="text-sm text-gray-600">Tentativas falhadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {securityDashboard.dashboard.mfa_events}
                  </p>
                  <p className="text-sm text-gray-600">Eventos MFA</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {securityDashboard.dashboard.unique_ips}
                  </p>
                  <p className="text-sm text-gray-600">IPs únicos</p>
                </div>
              </div>
            )}

            <Separator />

            <Button
              variant="outline"
              onClick={() => setShowAuditLog(true)}
              className="w-full"
            >
              Ver log completo de auditoria
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <MFASetupWizard
        isOpen={showMFAWizard}
        onClose={() => setShowMFAWizard(false)}
        onComplete={() => {
          setShowMFAWizard(false)
          // Refresh data
        }}
      />

      <SecurityAuditLog
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </div>
  )
}
