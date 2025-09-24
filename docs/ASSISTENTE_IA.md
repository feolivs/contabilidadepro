# 🤖 Assistente de IA Contábil - ContabilidadePRO

## Visão Geral

O Assistente de IA Contábil é uma funcionalidade avançada do ContabilidadePRO que utiliza o modelo GPT-4o da OpenAI para fornecer suporte inteligente e especializado para contadoras brasileiras. O assistente é treinado especificamente para lidar com questões contábeis, fiscais e tributárias do Brasil.

## 🚀 Funcionalidades Principais

### 1. Chat Inteligente
- **Modelo**: GPT-4o (mais avançado da OpenAI)
- **Especialização**: Contabilidade brasileira
- **Contexto**: Mantém contexto das empresas do usuário
- **Tempo de resposta**: Média de 2-3 segundos

### 2. Tipos de Consulta Suportados

#### 📊 Cálculo Fiscal
- Cálculo de DAS (Simples Nacional)
- IRPJ e CSLL (Lucro Presumido/Real)
- PIS/COFINS
- ICMS e ISS
- Análise de alíquotas e anexos

#### 📈 Análise Financeira
- Interpretação de DRE
- Análise de indicadores financeiros
- Comparações entre períodos
- Identificação de tendências

#### 📅 Prazos e Obrigações
- Calendário fiscal brasileiro
- Alertas de vencimentos
- Obrigações acessórias (SPED, DEFIS, etc.)
- Penalidades por atraso

#### 📋 Classificação Contábil
- Plano de contas brasileiro
- Lançamentos contábeis
- Natureza de débito/crédito
- Históricos padronizados

#### ✅ Conformidade Fiscal
- Análise de riscos fiscais
- Verificação de conformidade
- Sugestões de regularização
- Auditoria preventiva

#### 💡 Otimização Tributária
- Estratégias legais de redução
- Comparação de regimes tributários
- Planejamento tributário
- Aproveitamento de incentivos

### 3. Ações Rápidas

O assistente oferece ações pré-configuradas para consultas comuns:

- **Calcular DAS**: Cálculo automático do Simples Nacional
- **Prazos Fiscais**: Consulta de vencimentos próximos
- **Análise Financeira**: Avaliação da situação das empresas
- **Classificar Documentos**: Ajuda com classificação contábil
- **Otimização Tributária**: Sugestões de economia fiscal
- **Verificar Conformidade**: Checklist de obrigações
- **Comparar Regimes**: Análise comparativa de regimes
- **Obrigações SPED**: Informações sobre SPED
- **Orientações MEI**: Dúvidas sobre MEI

### 4. Estatísticas e Analytics

#### Métricas Principais
- Total de conversas realizadas
- Tokens utilizados (controle de custos)
- Tempo médio de resposta
- Conversas por período

#### Distribuição por Tipo
- Gráfico de tipos de consulta mais frequentes
- Análise de padrões de uso
- Identificação de necessidades recorrentes

### 5. Histórico de Conversas

- **Armazenamento**: Todas as conversas são salvas
- **Busca**: Localização rápida de conversas anteriores
- **Reutilização**: Possibilidade de continuar conversas
- **Contexto**: Manutenção do contexto entre sessões

## 🛠️ Arquitetura Técnica

### Frontend (Next.js 15)
```
src/app/assistente/
├── page.tsx                 # Página principal do assistente
└── components/
    ├── estatisticas-ia.tsx  # Componente de estatísticas
    └── historico-conversas.tsx # Histórico de conversas
```

### Backend (Supabase Edge Functions)
```
supabase/functions/
├── assistente-contabil-ia/  # Function principal (GPT-4o)
├── consulta-ia/            # Function de compatibilidade
└── _shared/
    ├── cors.ts             # Configurações CORS
    └── specialized-prompts.ts # Prompts especializados
```

### Banco de Dados (PostgreSQL)
```sql
-- Tabelas principais
conversas_ia              # Histórico de conversas
consultas_ia             # Compatibilidade com função antiga
prompts_especializados   # Templates de prompts
metricas_assistente_ia   # Analytics e métricas
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Migração do Banco de Dados

```bash
# Executar migração para criar tabelas do assistente
supabase db push
```

### 3. Deploy da Edge Function

```bash
# Deploy da função do assistente
supabase functions deploy assistente-contabil-ia
```

## 📊 Prompts Especializados

O assistente utiliza prompts especializados para cada tipo de consulta:

### Sistema Base
```
Você é um assistente contábil especializado em contabilidade brasileira, com conhecimento profundo sobre:
- Código Tributário Nacional (CTN)
- Lei das S.A. (Lei 6.404/76)
- Normas Brasileiras de Contabilidade (NBC)
- SPED (Sistema Público de Escrituração Digital)
- Regimes Tributários (Simples, Presumido, Real, MEI)
```

### Prompts Específicos
- **Cálculo Fiscal**: Foco em precisão matemática e legislação
- **Análise Financeira**: Interpretação de demonstrativos
- **Prazos**: Calendário fiscal e penalidades
- **Classificação**: Plano de contas e lançamentos
- **Conformidade**: Riscos e regularização
- **Otimização**: Estratégias legais de economia

## 🔒 Segurança e Privacidade

### Row Level Security (RLS)
- Usuários só acessam suas próprias conversas
- Isolamento completo entre contas
- Políticas de segurança no banco de dados

### Controle de Acesso
- Autenticação obrigatória via Supabase Auth
- Middleware de proteção de rotas
- Validação de permissões em todas as operações

### Dados Sensíveis
- Conversas criptografadas em trânsito
- Não armazenamento de dados sensíveis da OpenAI
- Logs estruturados sem informações pessoais

## 📈 Monitoramento e Observabilidade

### Métricas Coletadas
- Tempo de resposta por consulta
- Tokens consumidos por usuário
- Taxa de erro das APIs
- Tipos de consulta mais frequentes

### Alertas Configurados
- Falhas na API da OpenAI
- Tempo de resposta elevado (>5s)
- Consumo excessivo de tokens
- Erros de autenticação

## 🚀 Roadmap Futuro

### Versão 2.0 (Q2 2024)
- [ ] Integração com documentos (RAG)
- [ ] Análise de imagens (OCR + IA)
- [ ] Geração de relatórios automáticos
- [ ] Assistente por voz

### Versão 2.1 (Q3 2024)
- [ ] Integração com APIs governamentais
- [ ] Previsões e projeções financeiras
- [ ] Alertas proativos personalizados
- [ ] Dashboard executivo com IA

### Versão 3.0 (Q4 2024)
- [ ] Agente autônomo para tarefas
- [ ] Integração com ERPs externos
- [ ] Marketplace de prompts especializados
- [ ] IA multimodal (texto, voz, imagem)

## 🤝 Contribuição

Para contribuir com o desenvolvimento do assistente:

1. **Issues**: Reporte bugs ou sugira melhorias
2. **Prompts**: Contribua com prompts especializados
3. **Testes**: Ajude a testar novas funcionalidades
4. **Documentação**: Melhore a documentação existente

## 📞 Suporte

- **Email**: suporte@contabilidadepro.com.br
- **Discord**: [Link do servidor]
- **Documentação**: [Link da documentação completa]
- **Status**: [Link do status das APIs]

---

*Desenvolvido com ❤️ para contadoras brasileiras*
