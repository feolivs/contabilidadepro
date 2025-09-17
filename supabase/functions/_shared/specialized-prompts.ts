// Specialized AI Prompts for ContabilidadePRO
export interface PromptTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: string[]
  category: 'fiscal' | 'analysis' | 'document' | 'consultation' | 'automation'
}

export const FISCAL_PROMPTS: PromptTemplate[] = [
  {
    id: 'das_calculation_explanation',
    name: 'Explicação de Cálculo DAS',
    description: 'Explica detalhadamente como foi calculado o DAS',
    template: `
Baseado nos dados da empresa:
- Receita Mensal: R$ {receitaMensal}
- Receita Anual: R$ {receitaAnual}
- Anexo: {anexo}
- Competência: {competencia}

O cálculo do DAS foi realizado da seguinte forma:

1. **Determinação da Alíquota**: Com base na receita anual de R$ {receitaAnual} e anexo {anexo}, a alíquota aplicável é {aliquota}%.

2. **Cálculo Base**: R$ {receitaMensal} × {aliquota}% = R$ {valorBase}

3. **Distribuição por Imposto**:
   - IRPJ: R$ {irpj}
   - CSLL: R$ {csll}
   - PIS: R$ {pis}
   - COFINS: R$ {cofins}
   - CPP: R$ {cpp}
   {impostoEspecifico}

4. **Valor Total**: R$ {valorTotal}
5. **Vencimento**: {dataVencimento}

Esta é uma simulação baseada na legislação vigente do Simples Nacional.
`,
    variables: ['receitaMensal', 'receitaAnual', 'anexo', 'competencia', 'aliquota', 'valorBase', 'irpj', 'csll', 'pis', 'cofins', 'cpp', 'impostoEspecifico', 'valorTotal', 'dataVencimento'],
    category: 'fiscal'
  },
  {
    id: 'tax_regime_comparison',
    name: 'Comparação de Regimes Tributários',
    description: 'Compara diferentes regimes tributários para uma empresa',
    template: `
Análise comparativa de regimes tributários para sua empresa:

**Dados da Empresa:**
- Receita Anual: R$ {receitaAnual}
- Atividade: {atividade}
- Número de Funcionários: {funcionarios}

**Comparação de Regimes:**

1. **MEI** (até R$ 81.000/ano):
   {meiAnalysis}

2. **Simples Nacional** (até R$ 4.800.000/ano):
   - Anexo aplicável: {anexoSimples}
   - Alíquota média: {aliquotaSimples}%
   - Valor estimado anual: R$ {valorSimples}

3. **Lucro Presumido**:
   - IRPJ + CSLL: R$ {irpjCsllPresumido}
   - PIS + COFINS: R$ {pisCofinsPresumido}
   - Valor estimado anual: R$ {valorPresumido}

4. **Lucro Real**:
   - Tributação sobre lucro efetivo
   - Valor estimado anual: R$ {valorReal}

**Recomendação:** {recomendacao}

**Economia Potencial:** R$ {economia} por ano
`,
    variables: ['receitaAnual', 'atividade', 'funcionarios', 'meiAnalysis', 'anexoSimples', 'aliquotaSimples', 'valorSimples', 'irpjCsllPresumido', 'pisCofinsPresumido', 'valorPresumido', 'valorReal', 'recomendacao', 'economia'],
    category: 'analysis'
  }
]

export const DOCUMENT_PROMPTS: PromptTemplate[] = [
  {
    id: 'document_classification',
    name: 'Classificação de Documento',
    description: 'Classifica automaticamente documentos fiscais',
    template: `
Analisando o documento fornecido:

**Tipo de Documento Identificado:** {tipoDocumento}
**Confiança:** {confianca}%

**Informações Extraídas:**
- Emissor: {emissor}
- Data: {data}
- Valor: R$ {valor}
- Número: {numero}

**Classificação Contábil Sugerida:**
- Conta Débito: {contaDebito}
- Conta Crédito: {contaCredito}
- Centro de Custo: {centroCusto}

**Ações Recomendadas:**
{acoesRecomendadas}

**Observações:**
{observacoes}
`,
    variables: ['tipoDocumento', 'confianca', 'emissor', 'data', 'valor', 'numero', 'contaDebito', 'contaCredito', 'centroCusto', 'acoesRecomendadas', 'observacoes'],
    category: 'document'
  }
]

export const CONSULTATION_PROMPTS: PromptTemplate[] = [
  {
    id: 'fiscal_consultation',
    name: 'Consulta Fiscal Especializada',
    description: 'Responde dúvidas fiscais específicas',
    template: `
**Consulta Fiscal - ContabilidadePRO**

**Sua Pergunta:** {pergunta}

**Resposta Especializada:**

{respostaDetalhada}

**Base Legal:**
{baseLegal}

**Aplicação Prática:**
{aplicacaoPratica}

**Recomendações:**
{recomendacoes}

**Atenção:** Esta resposta é baseada na legislação vigente e deve ser validada com seu contador para casos específicos.
`,
    variables: ['pergunta', 'respostaDetalhada', 'baseLegal', 'aplicacaoPratica', 'recomendacoes'],
    category: 'consultation'
  }
]

export class PromptManager {
  private static instance: PromptManager
  private prompts: Map<string, PromptTemplate> = new Map()

  constructor() {
    this.loadPrompts()
  }

  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager()
    }
    return PromptManager.instance
  }

  private loadPrompts(): void {
    const allPrompts = [
      ...FISCAL_PROMPTS,
      ...DOCUMENT_PROMPTS,
      ...CONSULTATION_PROMPTS
    ]

    for (const prompt of allPrompts) {
      this.prompts.set(prompt.id, prompt)
    }
  }

  getPrompt(id: string): PromptTemplate | undefined {
    return this.prompts.get(id)
  }

  renderPrompt(id: string, variables: Record<string, string>): string {
    const prompt = this.getPrompt(id)
    if (!prompt) {
      throw new Error(`Prompt with id '${id}' not found`)
    }

    let rendered = prompt.template
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{${key}}`, 'g'), value)
    }

    return rendered
  }

  getPromptsByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return Array.from(this.prompts.values()).filter(p => p.category === category)
  }

  getAllPrompts(): PromptTemplate[] {
    return Array.from(this.prompts.values())
  }
}

export const promptManager = PromptManager.getInstance()

export function renderPrompt(id: string, variables: Record<string, string>): string {
  return promptManager.renderPrompt(id, variables)
}

export function getPrompt(id: string): PromptTemplate | undefined {
  return promptManager.getPrompt(id)
}
