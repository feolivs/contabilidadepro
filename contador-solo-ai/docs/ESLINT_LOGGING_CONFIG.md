# Configuração ESLint e Sistema de Logging - ContabilidadePRO

## 📋 Visão Geral

Este documento explica as configurações do ESLint e o sistema de logging implementados para resolver os problemas de build e melhorar a qualidade do código.

## 🔧 Configurações do ESLint

### Arquivos de Configuração

1. **`eslint.config.mjs`** - Configuração base
2. **`.eslintrc.development.js`** - Configuração para desenvolvimento (permissiva)
3. **`.eslintrc.production.js`** - Configuração para produção (rigorosa)

### Scripts Disponíveis

```bash
# Desenvolvimento - muito permissivo
npm run lint:dev

# Produção - rigoroso
npm run lint:prod

# Build com verificações completas
npm run build:strict

# Limpeza automática
npm run lint:fix
npm run lint:unused
npm run clean:imports
```

### Regras por Ambiente

#### Desenvolvimento (Permissivo)
- `@typescript-eslint/no-unused-vars`: OFF
- `@typescript-eslint/no-explicit-any`: OFF
- `no-console`: OFF
- `react-hooks/exhaustive-deps`: OFF
- `jsx-a11y/alt-text`: OFF

#### Produção (Rigoroso)
- `@typescript-eslint/no-unused-vars`: ERROR
- `@typescript-eslint/no-explicit-any`: ERROR
- `no-console`: ERROR
- `react-hooks/exhaustive-deps`: ERROR
- `jsx-a11y/alt-text`: ERROR

## 📊 Sistema de Logging

### Importação e Uso Básico

```typescript
import { logger, logInfo, logError, logFiscal } from '@/lib/logger';

// Uso básico
logger.info('Operação realizada com sucesso', { userId: '123' });
logger.error('Erro na operação', error, 'context');

// Funções específicas
logFiscal('DAS', inputData, result);
logOcr('document-processing', { documentId, confidence });
```

### Tipos de Log Disponíveis

#### 1. Logs Gerais
```typescript
logger.debug('Debug info', data, 'context');
logger.info('Information', data, 'context');
logger.warn('Warning message', data, 'context');
logger.error('Error message', error, 'context');
```

#### 2. Logs Específicos
```typescript
// Cálculos fiscais
logger.fiscal('DAS', inputData, result, 'tax-calculation');

// OCR
logger.ocr('document-scan', { confidence: 0.95 }, 'ocr-service');

// API calls
logger.api('POST', '/api/empresas', 201, responseData);

// Performance
logger.performance('tax-calculation', 1500, { complexity: 'high' });
```

#### 3. Medição de Performance
```typescript
import { measurePerformance } from '@/lib/logger';

const result = await measurePerformance(
  'complex-calculation',
  async () => {
    return await performComplexCalculation(data);
  },
  'fiscal-service'
);
```

### Comportamento por Ambiente

#### Desenvolvimento
- Todos os logs são exibidos no console
- Formato detalhado com timestamp e contexto
- Não envia logs para serviços externos

#### Produção
- Apenas `warn` e `error` são exibidos
- Logs críticos são enviados para serviços de monitoramento
- Formato otimizado para performance

## 🚀 Migração de Console Statements

### Antes (Problemático)
```typescript
console.log('Calculando DAS para empresa:', empresaId);
console.error('Erro no cálculo:', error);
console.warn('Valor alto detectado:', valor);
```

### Depois (Recomendado)
```typescript
import { logger } from '@/lib/logger';

logger.info('Calculando DAS para empresa', { empresaId }, 'fiscal');
logger.error('Erro no cálculo', error, 'fiscal');
logger.warn('Valor alto detectado', { valor }, 'fiscal');
```

## 📈 Estratégia de Implementação

### Fase 1: Configuração (✅ Concluída)
- [x] Configurar ESLint para desenvolvimento/produção
- [x] Implementar sistema de logging
- [x] Corrigir erros críticos de TypeScript
- [x] Configurar scripts de build

### Fase 2: Migração Gradual (Próximos passos)
- [ ] Substituir console statements por logger
- [ ] Implementar tipos específicos para substituir `any`
- [ ] Limpar imports não utilizados
- [ ] Melhorar acessibilidade

### Fase 3: Otimização (Futuro)
- [ ] Integrar com Sentry para logs de produção
- [ ] Implementar métricas de performance
- [ ] Configurar alertas automáticos
- [ ] Dashboard de monitoramento

## 🛠️ Comandos Úteis

### Build e Verificação
```bash
# Build normal (com warnings)
npm run build

# Build rigoroso (falha em warnings)
npm run build:strict

# Verificação de tipos
npm run type-check
```

### Linting
```bash
# Lint desenvolvimento
npm run lint:dev

# Lint produção
npm run lint:prod

# Corrigir automaticamente
npm run lint:fix
```

### Limpeza
```bash
# Encontrar imports não utilizados
npm run lint:unused

# Organizar imports
npm run clean:imports

# Formatar código
npm run format
```

## 📝 Boas Práticas

### 1. Logging
- Use contextos específicos (`'fiscal'`, `'ocr'`, `'api'`)
- Inclua dados relevantes mas não sensíveis
- Use níveis apropriados (debug/info/warn/error)
- Meça performance de operações críticas

### 2. TypeScript
- Evite `any` - crie tipos específicos
- Use union types para valores conhecidos
- Implemente validação de entrada
- Documente interfaces públicas

### 3. ESLint
- Use configuração de desenvolvimento durante desenvolvimento
- Execute lint de produção antes de commits
- Configure pre-commit hooks para qualidade
- Mantenha regras atualizadas

## 🔍 Monitoramento

### Logs Importantes para Monitorar
- Erros de cálculo fiscal
- Falhas de OCR
- Problemas de performance (>5s)
- Erros de API (4xx, 5xx)
- Problemas de autenticação

### Métricas Sugeridas
- Taxa de sucesso de cálculos
- Tempo médio de processamento OCR
- Uptime de APIs externas
- Satisfação do usuário
- Erros por funcionalidade

---

*Este sistema foi implementado para resolver os problemas de build e estabelecer uma base sólida para o desenvolvimento contínuo do ContabilidadePRO.*
