# 📋 **PLANO DE IMPLEMENTAÇÃO: AI Agent + MCP Server + ContabilidadePRO**

## 🎯 **VISÃO GERAL DO PROJETO**

### **Objetivo Principal:**
Implementar uma arquitetura híbrida que combine:
- **AI Agent n8n** com contexto contábil brasileiro
- **MCP Server personalizado** com ferramentas especializadas
- **Integração seamless** com ContabilidadePRO existente

### **Benefícios Esperados:**
- 🚀 **Produtividade**: +300% na velocidade de consultas contábeis
- 🎯 **Precisão**: 99.9% de acurácia em cálculos fiscais
- 🔄 **Automação**: 80% das tarefas repetitivas automatizadas
- 📊 **Insights**: Análises preditivas em tempo real

---

## 📅 **CRONOGRAMA DE IMPLEMENTAÇÃO**

### **FASE 1: Preparação e Setup (Semana 1-2)**
- [ ] Setup do ambiente de desenvolvimento
- [ ] Configuração do MCP Server base
- [ ] Preparação do n8n com nós LangChain

### **FASE 2: Desenvolvimento do MCP Server (Semana 3-4)**
- [ ] Implementação das ferramentas contábeis
- [ ] Integração com Supabase
- [ ] Testes unitários e validação

### **FASE 3: Configuração do AI Agent (Semana 5-6)**
- [ ] Setup do workflow n8n
- [ ] Configuração do Vector Store
- [ ] Integração MCP Client Tool

### **FASE 4: Integração com ContabilidadePRO (Semana 7-8)**
- [ ] Atualização do TripleAIService
- [ ] Testes de integração
- [ ] Otimização de performance

### **FASE 5: Deploy e Monitoramento (Semana 9-10)**
- [ ] Deploy em produção
- [ ] Monitoramento e métricas
- [ ] Documentação final

---

## 🛠️ **FASE 1: PREPARAÇÃO E SETUP**

### **1.1 Configuração do Ambiente**

#### **Dependências Necessárias:**
```bash
# Instalar dependências do MCP Server
npm install @modelcontextprotocol/sdk
npm install @modelcontextprotocol/server-stdio
npm install @supabase/supabase-js
npm install zod
npm install decimal.js

# Dependências do n8n (se não estiver instalado)
npm install -g n8n
```

#### **Estrutura de Diretórios:**
```
ContabilidadePRO/
├── mcp-server/                    # 🆕 Novo MCP Server
│   ├── src/
│   │   ├── tools/                 # Ferramentas contábeis
│   │   │   ├── das-calculator.ts
│   │   │   ├── irpj-calculator.ts
│   │   │   ├── receita-consultor.ts
│   │   │   └── relatorio-generator.ts
│   │   ├── services/              # Serviços de integração
│   │   │   ├── supabase-client.ts
│   │   │   └── validation-service.ts
│   │   ├── types/                 # Tipos TypeScript
│   │   │   └── contabilidade.types.ts
│   │   └── server.ts              # Servidor MCP principal
│   ├── package.json
│   └── tsconfig.json
├── n8n-workflows/                 # 🔄 Workflows atualizados
│   ├── ai-agent-contabil.json     # 🆕 Workflow principal
│   └── mcp-integration.json       # 🆕 Integração MCP
├── contador-solo-ai/              # ✅ Existente
└── supabase/                      # ✅ Existente
```

### **1.2 Configuração de Variáveis de Ambiente**

#### **Atualizar `.env.local`:**
```bash
# Configurações existentes...

# 🆕 MCP Server Configuration
MCP_SERVER_URL=http://localhost:3001
MCP_SERVER_AUTH_TOKEN=your_secure_token_here

# 🆕 AI Agent Configuration
N8N_AI_AGENT_WEBHOOK=http://localhost:5678/webhook/ai-agent-contabil
N8N_MCP_CLIENT_ENDPOINT=http://localhost:3001/mcp

# 🆕 Vector Store Configuration
SUPABASE_VECTOR_TABLE=documentos_embeddings
OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small
```

---

## 🔧 **FASE 2: DESENVOLVIMENTO DO MCP SERVER**

### **2.1 Estrutura Base do MCP Server**

#### **`mcp-server/src/server.ts`:**
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DASCalculatorTool } from './tools/das-calculator.js';
import { IRPJCalculatorTool } from './tools/irpj-calculator.js';
import { ReceitaConsultorTool } from './tools/receita-consultor.js';
import { RelatorioGeneratorTool } from './tools/relatorio-generator.js';

class ContabilidadeMCPServer {
  private server: Server;
  private tools: Map<string, any>;

  constructor() {
    this.server = new Server(
      {
        name: 'contabilidade-pro-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.tools = new Map([
      ['calcular_das', new DASCalculatorTool()],
      ['calcular_irpj', new IRPJCalculatorTool()],
      ['consultar_receitas', new ReceitaConsultorTool()],
      ['gerar_relatorio', new RelatorioGeneratorTool()],
    ]);

    this.setupHandlers();
  }

  private setupHandlers() {
    // Listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.entries()).map(([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Executar ferramenta
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Ferramenta não encontrada: ${name}`);
      }

      try {
        const result = await tool.execute(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(`Erro ao executar ${name}: ${error.message}`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🚀 ContabilidadePRO MCP Server iniciado');
  }
}

// Iniciar servidor
const server = new ContabilidadeMCPServer();
server.start().catch(console.error);
```

### **2.2 Implementação das Ferramentas Contábeis**

#### **`mcp-server/src/tools/das-calculator.ts`:**
```typescript
import { z } from 'zod';
import Decimal from 'decimal.js';
import { SupabaseClient } from './services/supabase-client.js';

const DASInputSchema = z.object({
  empresa_id: z.string().uuid(),
  periodo_apuracao: z.string().regex(/^\d{4}-\d{2}$/),
  receita_bruta: z.number().positive(),
  anexo_simples: z.enum(['I', 'II', 'III', 'IV', 'V']),
  deducoes: z.number().optional().default(0),
});

export class DASCalculatorTool {
  description = 'Calcula DAS (Documento de Arrecadação do Simples Nacional) com precisão fiscal';
  
  inputSchema = {
    type: 'object',
    properties: {
      empresa_id: { type: 'string', description: 'ID da empresa' },
      periodo_apuracao: { type: 'string', description: 'Período no formato YYYY-MM' },
      receita_bruta: { type: 'number', description: 'Receita bruta do período' },
      anexo_simples: { type: 'string', enum: ['I', 'II', 'III', 'IV', 'V'] },
      deducoes: { type: 'number', description: 'Deduções aplicáveis' },
    },
    required: ['empresa_id', 'periodo_apuracao', 'receita_bruta', 'anexo_simples'],
  };

  private supabase = new SupabaseClient();

  async execute(args: unknown) {
    // Validar entrada
    const input = DASInputSchema.parse(args);
    
    // Buscar dados da empresa
    const empresa = await this.supabase.getEmpresa(input.empresa_id);
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    // Buscar receita acumulada dos últimos 12 meses
    const receitaAcumulada = await this.supabase.getReceitaAcumulada(
      input.empresa_id,
      input.periodo_apuracao
    );

    // Calcular alíquota baseada na tabela do Simples Nacional
    const aliquota = this.calcularAliquota(
      input.anexo_simples,
      receitaAcumulada
    );

    // Calcular valor do DAS
    const receitaBruta = new Decimal(input.receita_bruta);
    const deducoes = new Decimal(input.deducoes);
    const baseCalculo = receitaBruta.minus(deducoes);
    const valorDAS = baseCalculo.times(aliquota).dividedBy(100);

    // Calcular data de vencimento
    const dataVencimento = this.calcularDataVencimento(input.periodo_apuracao);

    // Gerar código de barras
    const codigoBarras = await this.gerarCodigoBarras({
      cnpj: empresa.cnpj,
      valor: valorDAS.toNumber(),
      vencimento: dataVencimento,
    });

    const resultado = {
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        cnpj: empresa.cnpj,
      },
      calculo: {
        periodo_apuracao: input.periodo_apuracao,
        receita_bruta: receitaBruta.toNumber(),
        deducoes: deducoes.toNumber(),
        base_calculo: baseCalculo.toNumber(),
        receita_acumulada_12m: receitaAcumulada,
        anexo_simples: input.anexo_simples,
        aliquota_efetiva: aliquota,
        valor_das: valorDAS.toNumber(),
        data_vencimento: dataVencimento,
        codigo_barras: codigoBarras,
      },
      metadata: {
        calculado_em: new Date().toISOString(),
        legislacao: 'Lei Complementar 123/2006',
        observacoes: this.gerarObservacoes(input.anexo_simples, aliquota),
      },
    };

    // Salvar cálculo no banco
    await this.supabase.salvarCalculoDAS(resultado);

    return resultado;
  }

  private calcularAliquota(anexo: string, receitaAcumulada: number): number {
    // Tabela do Simples Nacional 2025 - Anexo I (exemplo)
    const tabelaAnexoI = [
      { faixa: 180000, aliquota: 4.0 },
      { faixa: 360000, aliquota: 7.3 },
      { faixa: 720000, aliquota: 9.5 },
      { faixa: 1800000, aliquota: 10.7 },
      { faixa: 3600000, aliquota: 14.3 },
      { faixa: 4800000, aliquota: 19.0 },
    ];

    // Implementar lógica para todos os anexos
    const tabela = this.obterTabelaPorAnexo(anexo);
    
    for (const faixa of tabela) {
      if (receitaAcumulada <= faixa.faixa) {
        return faixa.aliquota;
      }
    }

    throw new Error('Receita acumulada excede limite do Simples Nacional');
  }

  private calcularDataVencimento(periodoApuracao: string): string {
    // DAS vence no dia 20 do mês seguinte
    const [ano, mes] = periodoApuracao.split('-').map(Number);
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const proximoAno = mes === 12 ? ano + 1 : ano;
    
    return `${proximoAno}-${proximoMes.toString().padStart(2, '0')}-20`;
  }

  private async gerarCodigoBarras(dados: {
    cnpj: string;
    valor: number;
    vencimento: string;
  }): Promise<string> {
    // Implementar geração de código de barras DARF
    // Código simplificado para exemplo
    const valorCentavos = Math.round(dados.valor * 100);
    return `23790.00000 00000.000000 00000.000000 0 ${dados.vencimento.replace(/-/g, '')}${valorCentavos.toString().padStart(11, '0')}`;
  }

  private gerarObservacoes(anexo: string, aliquota: number): string[] {
    const observacoes = [
      `Cálculo baseado no Anexo ${anexo} do Simples Nacional`,
      `Alíquota efetiva aplicada: ${aliquota}%`,
      'Verificar se há débitos em aberto antes do pagamento',
    ];

    if (aliquota > 15) {
      observacoes.push('⚠️ Alíquota elevada - considerar análise de enquadramento');
    }

    return observacoes;
  }

  private obterTabelaPorAnexo(anexo: string) {
    // Implementar tabelas para todos os anexos
    // Retorna tabela do Anexo I como exemplo
    return [
      { faixa: 180000, aliquota: 4.0 },
      { faixa: 360000, aliquota: 7.3 },
      { faixa: 720000, aliquota: 9.5 },
      { faixa: 1800000, aliquota: 10.7 },
      { faixa: 3600000, aliquota: 14.3 },
      { faixa: 4800000, aliquota: 19.0 },
    ];
  }
}
```

### **2.3 Serviço de Integração com Supabase**

#### **`mcp-server/src/services/supabase-client.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';

export class SupabaseClient {
  private client;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async getEmpresa(empresaId: string) {
    const { data, error } = await this.client
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single();

    if (error) throw error;
    return data;
  }

  async getReceitaAcumulada(empresaId: string, periodoApuracao: string) {
    // Implementar consulta de receita acumulada dos últimos 12 meses
    const { data, error } = await this.client
      .rpc('calcular_receita_acumulada_12m', {
        p_empresa_id: empresaId,
        p_periodo_referencia: periodoApuracao
      });

    if (error) throw error;
    return data || 0;
  }

  async salvarCalculoDAS(calculo: any) {
    const { error } = await this.client
      .from('calculos_das')
      .insert({
        empresa_id: calculo.empresa.id,
        periodo_apuracao: calculo.calculo.periodo_apuracao,
        receita_bruta: calculo.calculo.receita_bruta,
        valor_das: calculo.calculo.valor_das,
        aliquota_efetiva: calculo.calculo.aliquota_efetiva,
        data_vencimento: calculo.calculo.data_vencimento,
        codigo_barras: calculo.calculo.codigo_barras,
        detalhes_calculo: calculo,
        calculado_em: new Date().toISOString(),
      });

    if (error) throw error;
  }
}
```

---

## 🤖 **FASE 3: CONFIGURAÇÃO DO AI AGENT**

### **3.1 Workflow n8n Principal**

#### **`n8n-workflows/ai-agent-contabil.json`:**
```json
{
  "name": "AI Agent Contábil - ContabilidadePRO",
  "nodes": [
    {
      "parameters": {
        "path": "ai-agent-contabil",
        "authentication": "bearerAuth"
      },
      "id": "mcp-server-trigger",
      "name": "MCP Server Trigger",
      "type": "@n8n/n8n-nodes-langchain.mcpTrigger",
      "typeVersion": 1,
      "position": [240, 300]
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "Você é um assistente contábil especializado em legislação brasileira. Você tem acesso a ferramentas especializadas para cálculos fiscais, consultas de dados e geração de relatórios. Sempre forneça respostas precisas e cite a legislação aplicável.",
        "hasOutputParser": false,
        "options": {
          "systemMessage": "Contexto: Sistema ContabilidadePRO para contadores brasileiros.\nEspecialidades: DAS, IRPJ, CSLL, Simples Nacional, Lucro Presumido.\nSempre valide dados antes de calcular e explique os resultados."
        }
      },
      "id": "ai-agent",
      "name": "AI Agent",
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 2.2,
      "position": [460, 300]
    },
    {
      "parameters": {
        "model": "gpt-4o",
        "temperature": 0.1,
        "maxTokens": 4000
      },
      "id": "openai-model",
      "name": "OpenAI Chat Model",
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      "typeVersion": 1,
      "position": [460, 120]
    },
    {
      "parameters": {
        "endpointUrl": "http://localhost:3001/mcp",
        "authentication": "bearerAuth",
        "include": "selected",
        "includeTools": [
          "calcular_das",
          "calcular_irpj",
          "consultar_receitas",
          "gerar_relatorio"
        ]
      },
      "id": "mcp-client-tool",
      "name": "MCP Client Tool",
      "type": "@n8n/n8n-nodes-langchain.mcpClientTool",
      "typeVersion": 1.1,
      "position": [680, 300]
    },
    {
      "parameters": {
        "connectionString": "postgresql://postgres:password@localhost:54322/postgres",
        "tableName": "documentos_embeddings",
        "embeddingDimension": 1536
      },
      "id": "supabase-vector-store",
      "name": "Supabase Vector Store",
      "type": "@n8n/n8n-nodes-langchain.vectorStorePGVector",
      "typeVersion": 1,
      "position": [680, 120]
    },
    {
      "parameters": {
        "model": "text-embedding-3-small"
      },
      "id": "openai-embeddings",
      "name": "OpenAI Embeddings",
      "type": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
      "typeVersion": 1,
      "position": [680, 40]
    }
  ],
  "connections": {
    "MCP Server Trigger": {
      "main": [
        [
          {
            "node": "AI Agent",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Chat Model": {
      "ai_languageModel": [
        [
          {
            "node": "AI Agent",
            "type": "ai_languageModel",
            "index": 0
          }
        ]
      ]
    },
    "MCP Client Tool": {
      "ai_tool": [
        [
          {
            "node": "AI Agent",
            "type": "ai_tool",
            "index": 0
          }
        ]
      ]
    },
    "Supabase Vector Store": {
      "ai_vectorStore": [
        [
          {
            "node": "AI Agent",
            "type": "ai_vectorStore",
            "index": 0
          }
        ]
      ]
    },
    "OpenAI Embeddings": {
      "ai_embedding": [
        [
          {
            "node": "Supabase Vector Store",
            "type": "ai_embedding",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### **3.2 Preparação do Vector Store**

#### **Script para Popular Embeddings:**
```sql
-- Criar tabela de embeddings se não existir
CREATE TABLE IF NOT EXISTS documentos_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca por similaridade
CREATE INDEX IF NOT EXISTS documentos_embeddings_embedding_idx
ON documentos_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Inserir conhecimento contábil base
INSERT INTO documentos_embeddings (content, metadata) VALUES
('DAS - Documento de Arrecadação do Simples Nacional: Tributo unificado para empresas do Simples Nacional, calculado com base na receita bruta mensal e alíquotas progressivas por anexo.',
 '{"tipo": "definicao", "assunto": "das", "legislacao": "LC 123/2006"}'),

('Anexo I do Simples Nacional: Comércio - Alíquotas de 4% a 19% conforme faixas de receita. Atividades: revenda de mercadorias, representação comercial.',
 '{"tipo": "tabela", "assunto": "simples_nacional", "anexo": "I"}'),

('IRPJ - Imposto de Renda Pessoa Jurídica: Tributo federal sobre lucro das empresas. Regimes: Lucro Real, Presumido ou Arbitrado. Alíquota básica 15% + adicional 10%.',
 '{"tipo": "definicao", "assunto": "irpj", "legislacao": "Lei 9.249/95"}');
```

---

## 🔗 **FASE 4: INTEGRAÇÃO COM CONTABILIDADEPRO**

### **4.1 Atualização do TripleAIService**

#### **`contador-solo-ai/src/services/ai-agent-service.ts`:**
```typescript
import { TripleAIService, TripleAIRequest, TripleAIResponse } from './triple-ai-service';

export interface AIAgentRequest extends TripleAIRequest {
  use_mcp_tools?: boolean;
  preferred_tools?: string[];
  context_depth?: 'shallow' | 'medium' | 'deep';
}

export interface AIAgentResponse extends TripleAIResponse {
  mcp_tools_used?: string[];
  context_sources?: string[];
  confidence_score?: number;
}

export class AIAgentService extends TripleAIService {
  constructor(config: Partial<TripleAIConfig> = {}) {
    super({
      ...config,
      n8nWebhookUrl: config.n8nWebhookUrl || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook',
    });
  }

  /**
   * Query usando AI Agent com MCP Tools
   */
  async queryWithAgent(request: AIAgentRequest): Promise<AIAgentResponse> {
    const enhancedRequest = {
      ...request,
      mcp_config: {
        use_tools: request.use_mcp_tools ?? true,
        preferred_tools: request.preferred_tools || ['calcular_das', 'consultar_receitas'],
        context_depth: request.context_depth || 'medium',
      },
      agent_config: {
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 4000,
        use_vector_store: true,
      }
    };

    try {
      const response = await this.makeRequest(enhancedRequest);

      return {
        ...response,
        mcp_tools_used: response.processing_info?.tools_executed || [],
        context_sources: response.processing_info?.context_sources || [],
        confidence_score: this.calculateConfidenceScore(response),
      };
    } catch (error) {
      console.error('❌ AI Agent Error:', error);

      // Fallback para TripleAI original
      return await super.query(request);
    }
  }

  /**
   * Query especializada para cálculos fiscais
   */
  async calculateTax(params: {
    tipo_calculo: 'DAS' | 'IRPJ' | 'CSLL';
    empresa_id: string;
    periodo: string;
    dados_adicionais?: any;
  }): Promise<AIAgentResponse> {
    const query = this.buildTaxCalculationQuery(params);

    return await this.queryWithAgent({
      query,
      empresa_id: params.empresa_id,
      context: 'calculo-fiscal',
      complexity_hint: 'complex',
      use_mcp_tools: true,
      preferred_tools: [`calcular_${params.tipo_calculo.toLowerCase()}`],
      context_depth: 'deep',
    });
  }

  /**
   * Query para análise de documentos
   */
  async analyzeDocument(params: {
    documento_id: string;
    empresa_id: string;
    tipo_analise: 'classificacao' | 'extracao' | 'validacao';
  }): Promise<AIAgentResponse> {
    const query = `Analisar documento ${params.documento_id} para ${params.tipo_analise}`;

    return await this.queryWithAgent({
      query,
      empresa_id: params.empresa_id,
      context: 'analise-documento',
      complexity_hint: 'medium',
      use_mcp_tools: true,
      preferred_tools: ['consultar_receitas', 'gerar_relatorio'],
    });
  }

  private buildTaxCalculationQuery(params: any): string {
    const templates = {
      DAS: `Calcular DAS para empresa ${params.empresa_id} referente ao período ${params.periodo}. Dados: ${JSON.stringify(params.dados_adicionais)}`,
      IRPJ: `Calcular IRPJ para empresa ${params.empresa_id} referente ao período ${params.periodo}. Dados: ${JSON.stringify(params.dados_adicionais)}`,
      CSLL: `Calcular CSLL para empresa ${params.empresa_id} referente ao período ${params.periodo}. Dados: ${JSON.stringify(params.dados_adicionais)}`,
    };

    return templates[params.tipo_calculo] || `Calcular ${params.tipo_calculo} para empresa ${params.empresa_id}`;
  }

  private calculateConfidenceScore(response: TripleAIResponse): number {
    let score = 0.5; // Base score

    // Aumentar confiança baseado em fatores
    if (response.processing_info?.tools_executed > 0) score += 0.2;
    if (response.explanation?.como_chegamos) score += 0.1;
    if (response.processing_info?.strategy_used === 'paralela') score += 0.1;
    if (response.alerts?.length === 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Health check específico para AI Agent
   */
  async healthCheckAgent(): Promise<{
    status: 'ok' | 'error';
    message: string;
    components: {
      mcp_server: boolean;
      vector_store: boolean;
      ai_model: boolean;
    };
  }> {
    try {
      const testResponse = await this.queryWithAgent({
        query: 'health check - teste de conectividade',
        context: 'system-test',
        use_mcp_tools: true,
        preferred_tools: ['calcular_das'],
      });

      return {
        status: 'ok',
        message: 'AI Agent funcionando corretamente',
        components: {
          mcp_server: testResponse.mcp_tools_used?.length > 0,
          vector_store: testResponse.context_sources?.length > 0,
          ai_model: testResponse.success,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        components: {
          mcp_server: false,
          vector_store: false,
          ai_model: false,
        },
      };
    }
  }
}
```

---

## 🚀 **FASE 5: DEPLOY E MONITORAMENTO**

### **5.1 Scripts de Deploy**

#### **`scripts/deploy-mcp-server.sh`:**
```bash
#!/bin/bash
set -e

echo "🚀 Deploying ContabilidadePRO MCP Server..."

# Build MCP Server
cd mcp-server
npm run build

# Deploy usando PM2
pm2 stop contabilidade-mcp-server || true
pm2 delete contabilidade-mcp-server || true
pm2 start dist/server.js --name contabilidade-mcp-server

# Verificar saúde
sleep 5
curl -f http://localhost:3001/health || exit 1

echo "✅ MCP Server deployed successfully"
```

#### **`scripts/deploy-n8n-workflows.sh`:**
```bash
#!/bin/bash
set -e

echo "🚀 Deploying n8n Workflows..."

# Importar workflows via API
for workflow in n8n-workflows/*.json; do
  echo "Importing $(basename $workflow)..."
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $N8N_API_KEY" \
    -d @"$workflow" \
    "$N8N_INSTANCE_URL/api/v1/workflows/import"
done

echo "✅ Workflows deployed successfully"
```

### **5.2 Monitoramento e Métricas**

#### **`contador-solo-ai/src/lib/monitoring/ai-agent-monitor.ts`:**
```typescript
export class AIAgentMonitor {
  private metrics = {
    queries_total: 0,
    queries_success: 0,
    queries_error: 0,
    tools_used: new Map<string, number>(),
    avg_response_time: 0,
    confidence_scores: [],
  };

  logQuery(request: AIAgentRequest, response: AIAgentResponse, duration: number) {
    this.metrics.queries_total++;

    if (response.success) {
      this.metrics.queries_success++;
    } else {
      this.metrics.queries_error++;
    }

    // Registrar ferramentas usadas
    response.mcp_tools_used?.forEach(tool => {
      const current = this.metrics.tools_used.get(tool) || 0;
      this.metrics.tools_used.set(tool, current + 1);
    });

    // Atualizar tempo médio de resposta
    this.metrics.avg_response_time =
      (this.metrics.avg_response_time + duration) / 2;

    // Registrar score de confiança
    if (response.confidence_score) {
      this.metrics.confidence_scores.push(response.confidence_score);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      success_rate: this.metrics.queries_total > 0
        ? (this.metrics.queries_success / this.metrics.queries_total) * 100
        : 0,
      avg_confidence: this.metrics.confidence_scores.length > 0
        ? this.metrics.confidence_scores.reduce((a, b) => a + b) / this.metrics.confidence_scores.length
        : 0,
      most_used_tools: Array.from(this.metrics.tools_used.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
    };
  }
}
```

---

## 📊 **MÉTRICAS DE SUCESSO**

### **KPIs Principais:**
- ✅ **Taxa de Sucesso**: > 95%
- ⚡ **Tempo de Resposta**: < 5 segundos
- 🎯 **Precisão de Cálculos**: 99.9%
- 🔧 **Uso de Ferramentas MCP**: > 80% das consultas
- 📈 **Satisfação do Usuário**: > 4.5/5

### **Monitoramento Contínuo:**
- Dashboard em tempo real no n8n
- Alertas automáticos para falhas
- Relatórios semanais de performance
- Análise de padrões de uso

---

## 🎯 **PRÓXIMOS PASSOS**

### **Após Implementação:**
1. **Treinamento**: Documentação e treinamento da equipe
2. **Otimização**: Ajustes baseados em feedback real
3. **Expansão**: Novas ferramentas MCP (NFe, SPED, etc.)
4. **Integração**: APIs governamentais (Receita Federal, SEFAZ)
5. **IA Avançada**: Modelos especializados em contabilidade

---

## 📝 **CHECKLIST DE IMPLEMENTAÇÃO**

### **Fase 1 - Preparação:**
- [ ] Instalar dependências MCP
- [ ] Configurar estrutura de diretórios
- [ ] Atualizar variáveis de ambiente
- [ ] Configurar n8n com nós LangChain

### **Fase 2 - MCP Server:**
- [ ] Implementar servidor base
- [ ] Criar ferramenta DAS Calculator
- [ ] Criar ferramenta IRPJ Calculator
- [ ] Implementar Supabase Client
- [ ] Testes unitários das ferramentas

### **Fase 3 - AI Agent:**
- [ ] Criar workflow n8n
- [ ] Configurar MCP Server Trigger
- [ ] Configurar AI Agent com OpenAI
- [ ] Configurar MCP Client Tool
- [ ] Configurar Vector Store
- [ ] Popular embeddings iniciais

### **Fase 4 - Integração:**
- [ ] Criar AIAgentService
- [ ] Atualizar interface do assistente
- [ ] Implementar health checks
- [ ] Testes de integração

### **Fase 5 - Deploy:**
- [ ] Scripts de deploy
- [ ] Monitoramento e métricas
- [ ] Documentação final
- [ ] Treinamento da equipe

---

Este plano fornece uma roadmap completa para implementar a arquitetura AI Agent + MCP Server + ContabilidadePRO, transformando o sistema em uma plataforma de automação contábil verdadeiramente inteligente e contextual.
