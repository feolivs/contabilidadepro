# Workers de Processamento Assíncrono - ContabilidadePRO

Sistema de workers para processamento em background usando filas PGMQ (PostgreSQL Message Queue).

## 🏗️ Arquitetura

### Componentes Principais

1. **QueueWorker** - Classe base para workers
2. **WorkerManager** - Gerenciador central de todos os workers
3. **Processadores** - Lógica específica para cada tipo de job
4. **Filas PGMQ** - Sistema de mensageria nativo do PostgreSQL

### Workers Disponíveis

| Worker | Fila | Processadores | Concorrência |
|--------|------|---------------|--------------|
| **calculo-fiscal** | `calculo_fiscal` | `calculo_fiscal` | 2 |
| **processamento-documentos** | `processamento_documentos` | `processamento_documento` | 1 |
| **notificacoes** | `notificacoes` | `notificacao` | 5 |
| **integracoes-externas** | `integracoes_externas` | `consulta_cnpj`, `consulta_cep`, `webhook_receita` | 3 |
| **geracao-relatorios** | `geracao_relatorios` | `gerar_relatorio`, `exportar_dados` | 1 |

## 🚀 Como Usar

### Iniciar Workers

```bash
# Produção
npm run workers:start

# Desenvolvimento (com hot reload)
npm run workers:dev

# Ou diretamente
tsx scripts/start-workers.ts
```

### Enfileirar Jobs

```typescript
import { queueService } from '@/services/queue-service'

// Cálculo fiscal
await queueService.enqueueCalculoFiscal({
  empresaId: "123",
  tipoCalculo: "DAS",
  periodoApuracao: "2025-01",
  dadosEntrada: {
    receitaBruta: 10000,
    regimeTributario: "Simples Nacional"
  }
})

// Processamento de documento
await queueService.enqueueProcessamentoDocumento({
  documentoId: "doc-456",
  empresaId: "123",
  tipoDocumento: "NFe",
  arquivoUrl: "https://storage.supabase.co/...",
  processarOCR: true,
  validarSchema: true,
  extrairDados: true
})

// Notificação
await queueService.enqueueNotificacao({
  tipo: "email",
  destinatario: "contador@empresa.com",
  template: "vencimento_das",
  dados: {
    empresa_nome: "Empresa XYZ",
    valor: "150.00",
    data_vencimento: "2025-02-20"
  }
})
```

### Monitoramento

Acesse `/extensoes-demo` para ver o dashboard completo dos workers.

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (para notificações)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# SMS (opcional - Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Push Notifications (opcional - Firebase)
FCM_SERVER_KEY=your_fcm_server_key
```

### Configuração dos Workers

```typescript
const workerManager = getWorkerManager({
  autoStart: true,              // Iniciar automaticamente
  healthCheckInterval: 30000,   // Health check a cada 30s
  restartOnError: true,         // Reiniciar workers com erro
  maxRestartAttempts: 3         // Máximo 3 tentativas de restart
})
```

## 📊 Processadores

### CalculoFiscalProcessor

Processa cálculos de impostos em background:

- **DAS** - Simples Nacional e MEI
- **IRPJ** - Lucro Presumido
- **CSLL** - Contribuição Social
- **PIS/COFINS** - Contribuições
- **ICMS** - Imposto estadual

**Entrada:**
```typescript
{
  type: 'calculo_fiscal',
  empresaId: string,
  tipoCalculo: 'DAS' | 'IRPJ' | 'CSLL' | 'PIS' | 'COFINS' | 'ICMS',
  periodoApuracao: string,
  dadosEntrada: {
    receitaBruta: number,
    regimeTributario: string,
    anexoSimples?: string,
    fatorR?: number
  }
}
```

**Saída:**
```typescript
{
  valorImposto: number,
  aliquotaEfetiva: number,
  dataVencimento: string,
  codigoBarras?: string,
  detalhesCalculo: {
    baseCalculo: number,
    aliquota: number,
    deducoes: number,
    valorFinal: number
  }
}
```

### DocumentoProcessor

Processa documentos fiscais com OCR e validação:

- **OCR** - Extração de texto de PDFs
- **Classificação** - Identificação automática do tipo
- **Validação** - Schema validation para NFe/DAS
- **Extração** - Dados estruturados (CNPJ, valores, datas)

### NotificacaoProcessor

Envia notificações multi-canal:

- **Email** - Templates HTML personalizáveis
- **SMS** - Integração com Twilio
- **Push** - Firebase Cloud Messaging

## 🔍 Monitoramento e Logs

### Dashboard Web

Acesse `/extensoes-demo` para:

- Status em tempo real dos workers
- Estatísticas de processamento
- Controles de start/stop/restart
- Configurações de cada worker

### Logs Estruturados

```typescript
// Logs automáticos para cada job
logger.info('Processando job', {
  queueName: 'calculo_fiscal',
  jobId: 'msg_123',
  jobType: 'calculo_fiscal',
  empresaId: '456'
})
```

### Health Checks

- Verificação automática a cada 30 segundos
- Restart automático em caso de falha
- Limite de tentativas configurável
- Alertas em logs estruturados

## 🛠️ Desenvolvimento

### Criar Novo Processador

1. Implemente a interface `JobProcessor`:

```typescript
export class MeuProcessor implements JobProcessor<MeuJobType> {
  validate(data: MeuJobType): boolean {
    // Validar dados de entrada
    return true
  }

  async process(data: MeuJobType): Promise<MeuResultType> {
    // Lógica de processamento
    return resultado
  }

  async onSuccess(result: MeuResultType, data: MeuJobType): Promise<void> {
    // Callback de sucesso
  }

  async onError(error: Error, data: MeuJobType): Promise<void> {
    // Callback de erro
  }
}
```

2. Registre no WorkerManager:

```typescript
const worker = new QueueWorker(config)
worker.registerProcessor('meu_job_type', new MeuProcessor())
```

### Adicionar Nova Fila

1. Crie a fila no Supabase:

```sql
SELECT pgmq.create('minha_nova_fila');
```

2. Adicione ao QueueService:

```typescript
export type QueueName = 'calculo_fiscal' | 'minha_nova_fila' | ...

async enqueueMeuJob(data: MeuJobData) {
  return this.enqueue('minha_nova_fila', {
    type: 'meu_job_type',
    ...data,
    timestamp: new Date().toISOString()
  })
}
```

## 🚨 Troubleshooting

### Worker não inicia

1. Verifique conexão com Supabase
2. Confirme que as extensões PGMQ estão ativas
3. Verifique logs de erro no console

### Jobs não são processados

1. Confirme que o worker está rodando
2. Verifique se o processador está registrado
3. Analise logs de validação de dados

### Performance lenta

1. Ajuste concorrência dos workers
2. Otimize processadores específicos
3. Monitore uso de CPU/memória

### Falhas frequentes

1. Aumente `maxRetries` se necessário
2. Implemente retry exponential backoff
3. Adicione circuit breakers para APIs externas

## 📈 Métricas

O sistema coleta automaticamente:

- **Jobs processados** por minuto/hora
- **Taxa de sucesso/erro** por processador
- **Tempo médio** de processamento
- **Tamanho das filas** em tempo real
- **Status dos workers** (rodando/parado)

Todas as métricas são visíveis no dashboard web em `/extensoes-demo`.
