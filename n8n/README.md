# 🤖 n8n Workflows - ContabilidadePRO

Este diretório contém a documentação e configurações dos workflows n8n para automação contábil do sistema ContabilidadePRO.

## 📊 Workflows Ativos (v5 - Gmail Nativo)

### 1. 📊 Relatórios IA Pro v5 - Gmail Nativo
- **ID**: `CsuR6V8jPbV75ZHk`
- **Trigger**: Mensal (dia 1, 9h)
- **Função**: Gera relatórios mensais inteligentes com análise de IA
- **Integração**: Supabase + OpenAI GPT-4o + Gmail API
- **Status**: ✅ Ativo

### 2. 🚨 Alertas Fiscais IA Pro v5 - Gmail Nativo
- **ID**: `Xe3NPBraCT11o8GS`
- **Trigger**: Diário (8h)
- **Função**: Monitora prazos fiscais e envia alertas inteligentes
- **Integração**: Supabase + OpenAI GPT-4o + Gmail API
- **Status**: ✅ Ativo

### 3. 📊 Relatórios Estratégicos IA Pro v5 - Gmail Nativo
- **ID**: `ueWtcmLTk2cPRwGZ`
- **Trigger**: Mensal (dia 1, 9h)
- **Função**: Relatórios executivos estratégicos com insights avançados
- **Integração**: Supabase + OpenAI GPT-4o + Gmail API
- **Status**: ✅ Ativo

## 🔧 Configurações Necessárias

### Credenciais Configuradas
- **Supabase**: `Z1duNws8VXU74YbQ` (Supabase account)
- **OpenAI**: `cxdYbudGSeASHNl8` (OpenAi account)
- **Gmail**: `gmail-oauth` (Google account OAuth2)

### Permissões Gmail API
- Scope: `https://www.googleapis.com/auth/gmail.send`
- OAuth2 configurado no Google Cloud Console
- Client ID e Client Secret configurados

## 🚀 Funcionalidades

### Análise de IA Avançada
- **Modelo**: GPT-4o (OpenAI)
- **Especialização**: Contabilidade brasileira
- **Prompts**: Otimizados para legislação fiscal BR
- **Fallbacks**: Lógica tradicional se IA falhar

### Templates HTML Responsivos
- Design profissional e moderno
- Compatível com todos os clientes de email
- Headers dinâmicos baseados em urgência
- Gradientes e cores personalizadas

### Logging Completo
- Tabela: `communication_log`
- Metadata detalhada de cada envio
- Tracking de performance e entrega
- Auditoria completa de comunicações

## 📈 Métricas e Monitoramento

### KPIs Principais
- Taxa de entrega de emails
- Tempo de processamento por workflow
- Precisão da análise de IA
- Satisfação do cliente

### Logs Estruturados
```json
{
  "empresa_id": "uuid",
  "tipo": "relatorio_mensal_ia_v5",
  "canal": "gmail",
  "status": "enviado",
  "metadata": {
    "ia_usado": true,
    "modelo_ia": "gpt-4o",
    "gmail_nativo": true,
    "versao": "v5"
  }
}
```

## 🔄 Versionamento

### Histórico de Versões
- **v1-v2**: Versões iniciais com SMTP básico
- **v3**: Introdução de IA especializada
- **v4**: Templates HTML avançados
- **v5**: Gmail API nativa (atual)

### Próximas Versões
- **v6**: Integração com WhatsApp Business
- **v7**: Dashboards em tempo real
- **v8**: Automação de documentos fiscais

## 📚 Documentação Técnica

- [Configuração de Credenciais](./docs/credentials.md)
- [Estrutura dos Workflows](./docs/workflow-structure.md)
- [Templates de Email](./docs/email-templates.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 🛠️ Manutenção

### Atualizações Regulares
- Prompts de IA (mensalmente)
- Templates HTML (trimestralmente)
- Credenciais OAuth (anualmente)
- Logs de auditoria (contínuo)

### Backup e Recuperação
- Workflows exportados em JSON
- Credenciais documentadas
- Configurações versionadas
- Rollback automático disponível

---

**Última atualização**: 19/09/2025
**Versão atual**: v5 (Gmail Nativo)
**Próxima revisão**: 19/10/2025
