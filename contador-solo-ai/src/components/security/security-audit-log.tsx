// 🔐 SECURITY AUDIT LOG
// Componente para visualizar logs de auditoria de segurança
// Integrado ao sistema ContabilidadePRO

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Search,
  Filter,
  Download,
  Globe,
  Smartphone
} from 'lucide-react'
import { useSecurityEvents } from '@/hooks/use-mfa'

interface SecurityAuditLogProps {
  isOpen: boolean
  onClose: () => void
}

export function SecurityAuditLog({ isOpen, onClose }: SecurityAuditLogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')

  const { securityEvents, isLoading } = useSecurityEvents()

  // Filtrar eventos
  const filteredEvents = securityEvents?.filter(event => {
    const matchesSearch = event.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.ip_address?.includes(searchTerm) ||
                         event.user_agent?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesEventType = eventTypeFilter === 'all' || event.event_type.includes(eventTypeFilter)
    
    const matchesRisk = riskFilter === 'all' || 
                       (riskFilter === 'high' && event.risk_score >= 70) ||
                       (riskFilter === 'medium' && event.risk_score >= 30 && event.risk_score < 70) ||
                       (riskFilter === 'low' && event.risk_score < 30)

    return matchesSearch && matchesEventType && matchesRisk
  }) || []

  const getEventIcon = (eventType: string, success: boolean) => {
    if (eventType.includes('login')) {
      return success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />
    }
    if (eventType.includes('mfa')) {
      return <Shield className="h-4 w-4 text-blue-600" />
    }
    return <Globe className="h-4 w-4 text-gray-600" />
  }

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'login_attempt': 'Tentativa de Login',
      'login_success': 'Login Bem-sucedido',
      'login_failed': 'Login Falhado',
      'mfa_setup': 'Configuração MFA',
      'mfa_verify_success': 'MFA Verificado',
      'mfa_verify_failed': 'MFA Falhado',
      'password_change': 'Mudança de Senha',
      'account_locked': 'Conta Bloqueada',
      'suspicious_activity': 'Atividade Suspeita'
    }
    return labels[eventType] || eventType
  }

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 70) {
      return <Badge variant="destructive">Alto Risco</Badge>
    }
    if (riskScore >= 30) {
      return <Badge variant="secondary">Médio Risco</Badge>
    }
    return <Badge variant="outline">Baixo Risco</Badge>
  }

  const exportLogs = () => {
    const csvContent = [
      ['Data/Hora', 'Evento', 'Sucesso', 'IP', 'Risco', 'Detalhes'].join(','),
      ...filteredEvents.map(event => [
        format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
        getEventTypeLabel(event.event_type),
        event.success ? 'Sim' : 'Não',
        event.ip_address || 'N/A',
        event.risk_score,
        event.failure_reason || 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `security-audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Log de Auditoria de Segurança</span>
          </DialogTitle>
          <DialogDescription>
            Histórico completo de eventos de segurança da sua conta
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por tipo, IP ou dispositivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="mfa">MFA</SelectItem>
                <SelectItem value="password">Senha</SelectItem>
                <SelectItem value="suspicious">Suspeito</SelectItem>
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="medium">Médio</SelectItem>
                <SelectItem value="low">Baixo</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Lista de Eventos */}
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                  <div className="mt-1">
                    {getEventIcon(event.event_type, event.success)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">
                        {getEventTypeLabel(event.event_type)}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {getRiskBadge(event.risk_score)}
                        <span className="text-xs text-gray-500">
                          {format(new Date(event.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-600">
                      {event.ip_address && (
                        <div className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span>IP: {event.ip_address}</span>
                        </div>
                      )}
                      
                      {event.user_agent && (
                        <div className="flex items-center space-x-1">
                          <Smartphone className="h-3 w-3" />
                          <span className="truncate">
                            {event.user_agent.length > 50 
                              ? `${event.user_agent.substring(0, 50)}...` 
                              : event.user_agent
                            }
                          </span>
                        </div>
                      )}
                      
                      {event.failure_reason && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{event.failure_reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            {filteredEvents.length} evento(s) encontrado(s)
          </p>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
