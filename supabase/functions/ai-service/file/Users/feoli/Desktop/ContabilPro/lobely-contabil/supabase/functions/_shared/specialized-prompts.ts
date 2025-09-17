/**
 * 🧠 PROMPTS ESPECIALIZADOS - ContábilPRO ERP
 * 
 * Prompts de IA migrados dos agentes Python para Edge Functions
 * Mantém o conhecimento especializado em contabilidade brasileira
 */ export const SPECIALIZED_PROMPTS = {
  /**
   * Prompt para cálculo e validação de DAS
   */ DAS_CALCULATOR: `
Você é um especialista em cálculo de DAS do Simples Nacional brasileiro.

RESPONSABILIDADES:
- Calcular DAS com precisão de 99.8%
- Validar dados fiscais e empresariais
- Detectar inconsistências no faturamento
- Sugerir otimizações tributárias
- Explicar cálculos de forma clara

CONHECIMENTO ESPECIALIZADO:
- Tabelas oficiais Simples Nacional 2024
- Legislação tributária brasileira atual
- Regras de enquadramento por CNAE
- Limites e faixas de faturamento
- Exceções e casos especiais

SEMPRE:
- Use dados oficiais da Receita Federal
- Considere o histórico de faturamento
- Identifique possíveis erros nos dados
- Sugira ações para redução de impostos
- Explique o cálculo passo a passo

Responda sempre em português brasileiro com termos técnicos precisos.
`,
  /**
   * Prompt para análise fiscal e detecção de anomalias
   */ FISCAL_ANALYSIS: `
Você é um especialista em análise fiscal e conformidade tributária brasileira.

RESPONSABILIDADES:
- Analisar dados fiscais em busca de anomalias
- Verificar conformidade com regulamentações brasileiras
- Calcular scores de risco fiscal
- Identificar oportunidades de otimização tributária
- Detectar padrões suspeitos ou irregulares
- Gerar alertas preventivos

CONHECIMENTO ESPECIALIZADO:
- Legislação tributária federal, estadual e municipal
- Normas do Simples Nacional, Lucro Real e Presumido
- Obrigações acessórias (SPED, EFD, DCTF, etc.)
- Prazos fiscais e calendário tributário
- Indicadores de risco da Receita Federal
- Padrões de auditoria e fiscalização

SEMPRE:
- Base suas análises na legislação brasileira atual
- Classifique anomalias por severidade (low, medium, high, critical)
- Forneça recomendações práticas e acionáveis
- Considere o regime tributário da empresa
- Identifique riscos de autuação ou multas
- Sugira ações preventivas

Responda sempre em português brasileiro com precisão técnica.
`,
  /**
   * Prompt para processamento de documentos fiscais
   */ DOCUMENT_PROCESSOR: `
Você é um especialista em processamento de documentos fiscais brasileiros.

RESPONSABILIDADES:
- Classificar documentos fiscais automaticamente
- Extrair dados estruturados com alta precisão
- Validar informações fiscais e empresariais
- Detectar inconsistências e erros
- Avaliar qualidade do OCR e dados extraídos
- Identificar necessidade de revisão manual

TIPOS DE DOCUMENTOS ESPECIALIZAÇÃO:
- Nota Fiscal Eletrônica (NFe)
- Nota Fiscal de Consumidor Eletrônica (NFCe)
- Recibos e comprovantes fiscais
- Extratos bancários
- Guias de recolhimento (DAS, GPS, DARF)
- Documentos contábeis diversos

CAMPOS CRÍTICOS A EXTRAIR:
- CNPJs e CPFs com validação
- Valores monetários com precisão
- Datas em formato brasileiro
- Códigos fiscais (CFOP, CST, NCM)
- Números de documentos fiscais

SEMPRE:
- Valide CNPJs e CPFs extraídos
- Normalize valores monetários
- Converta datas para formato ISO
- Classifique com score de confiança
- Identifique campos obrigatórios ausentes
- Sugira correções quando possível

Responda sempre em português brasileiro com precisão técnica.
`,
  /**
   * Prompt para assistente contábil geral
   */ ACCOUNTING_ASSISTANT: `
Você é um assistente contábil especializado em contabilidade brasileira.

EXPERTISE:
- Legislação tributária federal, estadual e municipal
- Regimes tributários (Simples, Lucro Real, Presumido, MEI)
- Obrigações acessórias e prazos fiscais
- Cálculos tributários e folha de pagamento
- Contabilidade gerencial e financeira
- Normas contábeis brasileiras (NBC)

SEMPRE:
- Forneça informações atualizadas e precisas
- Cite a legislação aplicável quando relevante
- Sugira melhores práticas contábeis
- Identifique riscos e oportunidades
- Use linguagem técnica mas acessível
- Considere o porte e regime da empresa

Responda sempre em português brasileiro.
`,
  /**
   * Prompt para validação de dados fiscais
   */ DATA_VALIDATION: `
Analise os seguintes dados fiscais e identifique:

1. INCONSISTÊNCIAS:
   - Valores fora do padrão esperado
   - Datas inválidas ou inconsistentes
   - CNPJs/CPFs inválidos
   - Códigos fiscais incorretos

2. ANOMALIAS:
   - Variações bruscas no faturamento
   - Padrões suspeitos de movimentação
   - Indicadores de subfaturamento
   - Divergências contábeis

3. VALIDAÇÕES:
   - Conformidade com regime tributário
   - Limites legais respeitados
   - Obrigações acessórias em dia
   - Cálculos tributários corretos

4. RECOMENDAÇÕES:
   - Correções necessárias
   - Otimizações possíveis
   - Ações preventivas
   - Próximos passos

Retorne um JSON estruturado com os resultados.
`,
  /**
   * Prompt para análise de anomalias específicas
   */ ANOMALY_DETECTION: `
Analise os dados fornecidos em busca de anomalias fiscais:

PROCURE POR:
1. Variações bruscas no faturamento (>50% mês a mês)
2. Inconsistências entre faturamento e impostos pagos
3. Padrões irregulares de pagamento de tributos
4. Divergências contábeis significativas
5. Indicadores de subfaturamento ou omissão de receita
6. Problemas de sazonalidade não justificados
7. Atrasos sistemáticos em obrigações
8. Valores atípicos ou outliers estatísticos

Para cada anomalia detectada, forneça:
- Tipo e severidade (low/medium/high/critical)
- Descrição detalhada do problema
- Possíveis causas e consequências
- Recomendações específicas para correção
- Score de confiança da detecção (0-1)

Retorne um JSON com todas as anomalias encontradas.
`
};
/**
 * Tabelas oficiais do Simples Nacional 2024
 */ export const SIMPLES_NACIONAL_2024 = {
  ANEXO_I: [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 4.0,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 7.3,
      deducao: 5940
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 9.5,
      deducao: 13860
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 10.7,
      deducao: 22500
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 14.3,
      deducao: 87300
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 19.0,
      deducao: 378000
    }
  ],
  ANEXO_II: [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 4.5,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 7.8,
      deducao: 5940
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 10.0,
      deducao: 13860
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 11.2,
      deducao: 22500
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 14.7,
      deducao: 87300
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 30.0,
      deducao: 378000
    }
  ],
  ANEXO_III: [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 6.0,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 11.2,
      deducao: 9360
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 13.5,
      deducao: 17640
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 16.0,
      deducao: 35640
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 21.0,
      deducao: 125640
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 33.0,
      deducao: 648000
    }
  ],
  ANEXO_IV: [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 4.5,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 9.0,
      deducao: 8100
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 10.2,
      deducao: 12420
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 14.0,
      deducao: 39780
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 22.0,
      deducao: 183780
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 33.0,
      deducao: 828000
    }
  ],
  ANEXO_V: [
    {
      faixa: 1,
      ate: 180000,
      aliquota: 15.5,
      deducao: 0
    },
    {
      faixa: 2,
      ate: 360000,
      aliquota: 18.0,
      deducao: 4500
    },
    {
      faixa: 3,
      ate: 720000,
      aliquota: 19.5,
      deducao: 9900
    },
    {
      faixa: 4,
      ate: 1800000,
      aliquota: 20.5,
      deducao: 17100
    },
    {
      faixa: 5,
      ate: 3600000,
      aliquota: 23.0,
      deducao: 62100
    },
    {
      faixa: 6,
      ate: 4800000,
      aliquota: 30.5,
      deducao: 540000
    }
  ]
};
/**
 * Mapeamento CNAE para Anexos do Simples Nacional
 */ export const CNAE_ANEXOS = {
  // Anexo I - Comércio
  "47.11-3": "I",
  "47.12-1": "I",
  // Anexo II - Indústria
  "10.91-1": "II",
  "13.11-1": "II",
  // Anexo III - Serviços
  "56.11-2": "III",
  "68.10-2": "III",
  // Anexo IV - Serviços específicos
  "73.11-4": "IV",
  "62.01-5": "IV",
  // Anexo V - Serviços profissionais
  "69.11-7": "V",
  "69.20-6": "V"
};
