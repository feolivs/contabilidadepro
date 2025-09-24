# 🚨 ALERTS SERVICE - Mapeamento de Migração

## Visão Geral
Este documento mapeia como as 3 funções originais foram unificadas na nova `alerts-service`.

## Funções Unificadas

### 1. **alert-escalation-service** → `operation: 'escalate_alerts'`
### 2. **notification-service** → `operation: 'process_notifications'`  
### 3. **compliance-monitor** → `operation: 'check_compliance'`

---

## Mapeamento de Interfaces

### **ALERT-ESCALATION-SERVICE**

#### Interface Original:
```typescript
interface EscalationRequest {
  action: 'check_escalations' | 'escalate_alert' | 'process_overdue'
  alert_id?: string
  escalation_rules?: EscalationRule[]
}
```

#### Nova Interface:
```typescript
{
  operation: 'escalate_alerts',
  escalation_config: {
    action: 'check_escalations' | 'escalate_alert' | 'process_overdue'
    alert_id?: string
    escalation_rules?: EscalationRule[]
  }
}
```

#### Mapeamento de Chamadas:
- `check_escalations` → `escalation_config.action: 'check_escalations'`
- `escalate_alert` → `escalation_config.action: 'escalate_alert'`
- `process_overdue` → `escalation_config.action: 'process_overdue'`

---

### **NOTIFICATION-SERVICE**

#### Interface Original:
```typescript
interface NotificationRequest {
  action: 'check_deadlines' | 'send_notification' | 'process_alerts'
  check_config?: {
    days_ahead: number[]
    send_notifications: boolean
    user_id?: string
  }
  notification_data?: {
    user_id: string
    title: string
    message: string
    type: string
    priority: string
    action_url?: string
  }
}
```

#### Nova Interface:
```typescript
{
  operation: 'process_notifications',
  notification_config: {
    action: 'check_deadlines' | 'send_notification' | 'process_alerts'
    check_config?: { ... }
    notification_data?: { ... }
  }
}
```

#### Mapeamento de Chamadas:
- `check_deadlines` → `notification_config.action: 'check_deadlines'`
- `send_notification` → `notification_config.action: 'send_notification'`
- `process_alerts` → `notification_config.action: 'process_alerts'`

---

### **COMPLIANCE-MONITOR**

#### Interface Original:
```typescript
interface ComplianceRequest {
  mode: 'check_all' | 'check_user' | 'check_type'
  user_id?: string
  alert_type?: string
  days_ahead?: number
  send_alerts?: boolean
  alert_channels?: string[]
}
```

#### Nova Interface:
```typescript
{
  operation: 'check_compliance',
  compliance_config: {
    mode: 'check_all' | 'check_user' | 'check_type'
    user_id?: string
    alert_type?: string
    days_ahead?: number
    send_alerts?: boolean
    alert_channels?: string[]
  }
}
```

#### Mapeamento de Chamadas:
- `check_all` → `compliance_config.mode: 'check_all'`
- `check_user` → `compliance_config.mode: 'check_user'`
- `check_type` → `compliance_config.mode: 'check_type'`

---

## Novas Operações Adicionais

### **SEND_NOTIFICATION** (Simplificada)
```typescript
{
  operation: 'send_notification',
  notification_config: {
    notification_data: {
      user_id: string
      title: string
      message: string
      type: string
      priority: string
      action_url?: string
    }
  }
}
```

### **PROCESS_OVERDUE** (Dedicada)
```typescript
{
  operation: 'process_overdue'
  // Sem parâmetros adicionais necessários
}
```

---

## Dependências Identificadas

### **Cron Jobs (2 arquivos):**
1. `supabase/migrations/20250116000001_activate_fiscal_alerts.sql`
   - `compliance-monitor-daily` → Atualizar para `alerts-service`
   - `intelligent-alerts-scheduler` → Atualizar para `alerts-service`

2. `supabase/migrations/20250120000002_activate_alert_escalation.sql`
   - `alert-escalation-monitor` → Atualizar para `alerts-service`
   - `overdue-alerts-processor` → Atualizar para `alerts-service`

### **Frontend (0 chamadas diretas identificadas)**
- As funções são chamadas apenas via cron jobs
- Não há chamadas diretas do frontend

### **Outras Edge Functions (0 chamadas identificadas)**
- Funções independentes, chamadas apenas por cron

---

## Cache Strategy

### **TTL por Operação:**
- `check_compliance`: 15 minutos
- `process_notifications`: 5 minutos  
- `escalate_alerts`: 10 minutos
- `send_notification`: Sem cache (operação única)
- `process_overdue`: 30 minutos

### **Cache Key Pattern:**
```
alerts_service:{operation}:{hash_of_config}
```

---

## Compatibilidade

### **100% Backward Compatible**
- Todas as interfaces originais são suportadas
- Mesmos resultados esperados
- Mesma estrutura de resposta

### **Melhorias Adicionais:**
- Cache unificado e inteligente
- Logs estruturados centralizados
- Métricas de performance unificadas
- Error handling robusto
- Operações otimizadas

---

## Plano de Migração

### **Fase 1: ✅ Implementação**
- [x] Criar nova função unificada
- [x] Implementar todas as operações
- [x] Manter compatibilidade total

### **Fase 2: 🔄 Atualização de Dependências**
- [ ] Atualizar cron jobs (4 jobs)
- [ ] Testar todas as operações
- [ ] Validar funcionamento

### **Fase 3: 🧹 Cleanup**
- [ ] Remover funções antigas
- [ ] Limpar cron jobs antigos
- [ ] Documentar mudanças

---

## Benefícios Esperados

### **Redução de Complexidade:**
- **3 funções → 1 função** (67% redução)
- **4 cron jobs → 4 cron jobs** (mesma quantidade, mas unificados)
- **Código duplicado eliminado**

### **Performance:**
- **Cache unificado** mais eficiente
- **Menos cold starts** (1 função vs 3)
- **Otimizações compartilhadas**

### **Manutenção:**
- **Código centralizado** para alertas
- **Logs unificados** para debugging
- **Testes simplificados**
- **Deploy único** para mudanças

### **Funcionalidades:**
- **Operações mais granulares** disponíveis
- **Cache inteligente** por operação
- **Error handling** melhorado
- **Métricas detalhadas** de performance
