# 🔐 SECURITY SERVICE - MIGRATION MAPPING

## 📋 Resumo da Unificação

Este documento mapeia as interfaces das funções originais para a nova `security-service` unificada.

### **Funções Unificadas:**
- ✅ **auth-security-monitor** → security-service
- ✅ **mfa-enrollment-handler** → security-service

---

## 🔄 Mapeamento de Operações

### **1. AUTH-SECURITY-MONITOR → SECURITY-SERVICE**

#### **1.1 log_security_event**
```typescript
// ANTES (auth-security-monitor)
POST /functions/v1/auth-security-monitor
{
  "action": "log_security_event",
  "user_id": "uuid",
  "event_type": "login_attempt",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "success": true,
  "failure_reason": "string",
  "metadata": {}
}

// DEPOIS (security-service)
POST /functions/v1/security-service
{
  "operation": "log_security_event",
  "user_id": "uuid",
  "event_type": "login_attempt",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "success": true,
  "failure_reason": "string",
  "metadata": {}
}
```

#### **1.2 analyze_threat**
```typescript
// ANTES
{
  "action": "analyze_threat",
  "user_id": "uuid",
  "ip_address": "192.168.1.1",
  "event_type": "login_failed"
}

// DEPOIS
{
  "operation": "analyze_threat",
  "user_id": "uuid",
  "ip_address": "192.168.1.1",
  "event_type": "login_failed"
}
```

#### **1.3 check_user_security**
```typescript
// ANTES
{
  "action": "check_user_security",
  "user_id": "uuid"
}

// DEPOIS
{
  "operation": "check_user_security",
  "user_id": "uuid"
}
```

#### **1.4 get_security_dashboard**
```typescript
// ANTES
{
  "action": "get_security_dashboard",
  "user_id": "uuid",
  "days": 7
}

// DEPOIS
{
  "operation": "get_security_dashboard",
  "user_id": "uuid",
  "days": 7
}
```

### **2. MFA-ENROLLMENT-HANDLER → SECURITY-SERVICE**

#### **2.1 enroll_mfa**
```typescript
// ANTES (mfa-enrollment-handler)
POST /functions/v1/mfa-enrollment-handler
{
  "action": "enroll_mfa",
  "user_id": "uuid",
  "factor_type": "totp",
  "phone_number": "+5511999999999"
}

// DEPOIS (security-service)
POST /functions/v1/security-service
{
  "operation": "enroll_mfa",
  "user_id": "uuid",
  "factor_type": "totp",
  "phone_number": "+5511999999999"
}
```

#### **2.2 verify_mfa**
```typescript
// ANTES
{
  "action": "verify_mfa",
  "user_id": "uuid",
  "factor_id": "uuid",
  "code": "123456"
}

// DEPOIS
{
  "operation": "verify_mfa",
  "user_id": "uuid",
  "factor_id": "uuid",
  "code": "123456"
}
```

#### **2.3 unenroll_mfa**
```typescript
// ANTES
{
  "action": "unenroll_mfa",
  "user_id": "uuid",
  "factor_id": "uuid"
}

// DEPOIS
{
  "operation": "unenroll_mfa",
  "user_id": "uuid",
  "factor_id": "uuid"
}
```

#### **2.4 generate_backup_codes**
```typescript
// ANTES
{
  "action": "generate_backup_codes",
  "user_id": "uuid"
}

// DEPOIS
{
  "operation": "generate_backup_codes",
  "user_id": "uuid"
}
```

#### **2.5 verify_backup_code**
```typescript
// ANTES
{
  "action": "verify_backup_code",
  "user_id": "uuid",
  "code": "ABCD1234"
}

// DEPOIS
{
  "operation": "verify_backup_code",
  "user_id": "uuid",
  "code": "ABCD1234"
}
```

#### **2.6 get_mfa_status**
```typescript
// ANTES
{
  "action": "get_mfa_status",
  "user_id": "uuid"
}

// DEPOIS
{
  "operation": "get_mfa_status",
  "user_id": "uuid"
}
```

---

## 🆕 Novas Operações Unificadas

### **3.1 get_security_overview**
```typescript
// NOVA OPERAÇÃO - Combina MFA + Security Status
POST /functions/v1/security-service
{
  "operation": "get_security_overview",
  "user_id": "uuid"
}

// RESPOSTA
{
  "success": true,
  "overview": {
    "security_score": 85,
    "mfa_status": { /* dados MFA */ },
    "security_status": { /* dados segurança */ },
    "recent_events": [ /* eventos recentes */ ],
    "recommendations": [
      "Suas configurações estão bem configuradas"
    ]
  }
}
```

### **3.2 update_security_preferences**
```typescript
// NOVA OPERAÇÃO - Atualizar preferências unificadas
POST /functions/v1/security-service
{
  "operation": "update_security_preferences",
  "user_id": "uuid",
  "preferences": {
    "session_timeout_minutes": 480,
    "require_mfa_for_sensitive_ops": true,
    "notify_login_attempts": true,
    "max_failed_attempts": 5
  }
}
```

---

## 📊 Compatibilidade com Frontend

### **Hook use-mfa.ts - Mudanças Necessárias:**

```typescript
// ANTES - Múltiplas chamadas
const { data: mfaData } = await supabase.functions.invoke('mfa-enrollment-handler', {
  body: { action: 'get_mfa_status', user_id }
})

const { data: securityData } = await supabase.functions.invoke('auth-security-monitor', {
  body: { action: 'check_user_security', user_id }
})

// DEPOIS - Chamada unificada
const { data: mfaData } = await supabase.functions.invoke('security-service', {
  body: { operation: 'get_mfa_status', user_id }
})

const { data: securityData } = await supabase.functions.invoke('security-service', {
  body: { operation: 'check_user_security', user_id }
})

// OU usar nova operação unificada
const { data: overview } = await supabase.functions.invoke('security-service', {
  body: { operation: 'get_security_overview', user_id }
})
```

---

## 🎯 Estratégia de Cache

### **Operações com Cache:**
```typescript
const CACHE_CONFIG = {
  'get_mfa_status': { ttl: 300 }, // 5 minutos
  'check_user_security': { ttl: 180 }, // 3 minutos
  'get_security_dashboard': { ttl: 600 }, // 10 minutos
  'get_security_overview': { ttl: 300 }, // 5 minutos
}
```

### **Invalidação de Cache:**
- ✅ **Automática** após operações que modificam dados
- ✅ **Manual** via `update_security_preferences`
- ✅ **TTL** para expiração automática

---

## 🔄 Backward Compatibility

### **100% Compatível:**
- ✅ Todas as interfaces originais mantidas
- ✅ Apenas mudança: `action` → `operation`
- ✅ Mesmos parâmetros de entrada
- ✅ Mesmas respostas de saída
- ✅ Mesmo comportamento funcional

### **Melhorias Adicionadas:**
- ✅ **Cache inteligente** para operações de leitura
- ✅ **Logging unificado** de eventos de segurança
- ✅ **Operações combinadas** para melhor UX
- ✅ **Invalidação automática** de cache

---

## 📋 Checklist de Migração

### **Frontend (use-mfa.ts):**
- [ ] Trocar `mfa-enrollment-handler` → `security-service`
- [ ] Trocar `auth-security-monitor` → `security-service`
- [ ] Trocar `action` → `operation` em todas as chamadas
- [ ] Testar todas as operações MFA
- [ ] Testar todas as operações de segurança

### **Componentes:**
- [ ] Atualizar `security-settings.tsx`
- [ ] Atualizar `edge-function-monitor.tsx`
- [ ] Testar interfaces de usuário

### **Validação:**
- [ ] Testar cadastro de MFA
- [ ] Testar verificação de MFA
- [ ] Testar códigos de backup
- [ ] Testar logs de segurança
- [ ] Testar dashboard de segurança

---

**A migração mantém 100% de compatibilidade, apenas consolidando as funções em uma arquitetura mais eficiente e performática!** 🚀
