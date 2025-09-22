/**
 * Gerador de Insights com IA
 * 
 * Este módulo utiliza OpenAI GPT-4 para analisar dados financeiros e de compliance
 * de empresas brasileiras, gerando insights personalizados e recomendações acionáveis
 */

import OpenAI from 'openai'
import type { DadosEstruturados } from './dados-estruturados-processor'
import type { ComplianceAnalysis } from './compliance-analyzer'
import type { ResultadoMetricas } from '@/hooks/use-metricas-financeiras'

/**
 * Interface para configuração de insights
 */
export interface InsightsConfig {
  empresa: {
    nome: string
    cnpj: string
    regime_tributario: string
    porte: string
    atividade_principal: string
    estado: string
    municipio: string
  }
  periodo_analise: {
    inicio: string
    fim: string
    meses: number
  }
  contexto_adicional?: string
  foco_analise?: 'financeiro' | 'compliance' | 'operacional' | 'estrategico' | 'completo'
  nivel_detalhamento?: 'executivo' | 'gerencial' | 'operacional'
}

/**
 * Interface para insights gerados
 */
export interface AIInsights {
  resumo_executivo: {
    situacao_geral: string
    pontos_fortes: string[]
    areas_atencao: string[]
    score_saude_financeira: number // 0-100
  }
  
  analise_financeira: {
    tendencias: {
      receitas: string
      despesas: string
      lucratividade: string
    }
    oportunidades: string[]
    riscos: string[]
    recomendacoes: Array<{
      categoria: string
      acao: string
      impacto_esperado: string
      prazo_implementacao: string
      prioridade: 'alta' | 'media' | 'baixa'
    }>
  }
  
  analise_compliance: {
    nivel_conformidade: string
    principais_gaps: string[]
    acoes_corretivas: Array<{
      problema: string
      solucao: string
      prazo: string
      criticidade: 'alta' | 'media' | 'baixa'
    }>
    proximo_vencimento_critico: string | null
  }
  
  insights_operacionais: {
    eficiencia_processos: string
    qualidade_dados: string
    automacao_oportunidades: string[]
    melhorias_sugeridas: string[]
  }
  
  projecoes_estrategicas: {
    cenario_otimista: string
    cenario_realista: string
    cenario_pessimista: string
    fatores_criticos: string[]
    recomendacoes_estrategicas: string[]
  }
  
  alertas_prioritarios: Array<{
    tipo: 'financeiro' | 'fiscal' | 'operacional' | 'estrategico'
    urgencia: 'imediata' | 'curto_prazo' | 'medio_prazo'
    titulo: string
    descricao: string
    acao_recomendada: string
  }>
  
  benchmarking: {
    comparacao_setor: string
    posicionamento_mercado: string
    oportunidades_crescimento: string[]
  }
  
  metadata: {
    data_geracao: string
    versao_modelo: string
    confianca_analise: number // 0-100
    limitacoes: string[]
    proxima_revisao_sugerida: string
  }
}

/**
 * Classe principal para geração de insights com IA
 */
export class AIInsightsGenerator {
  private openai: OpenAI
  private config: InsightsConfig

  constructor(config: InsightsConfig) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    this.config = config
  }

  /**
   * Gerar insights completos baseados nos dados
   */
  async gerarInsights(
    dadosEstruturados: DadosEstruturados[],
    metricas: ResultadoMetricas,
    compliance: ComplianceAnalysis
  ): Promise<AIInsights> {
    try {
      // Preparar contexto para a IA
      const contexto = this.prepararContexto(dadosEstruturados, metricas, compliance)
      
      // Gerar prompt estruturado
      const prompt = this.construirPrompt(contexto)
      
      // Chamar OpenAI
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: this.obterSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })

      const insightsRaw = response.choices[0]?.message?.content
      if (!insightsRaw) {
        throw new Error('Resposta vazia da OpenAI')
      }

      // Parsear e validar resposta
      const insights = JSON.parse(insightsRaw) as AIInsights
      
      // Adicionar metadata
      insights.metadata = {
        data_geracao: new Date().toISOString(),
        versao_modelo: 'gpt-4o',
        confianca_analise: this.calcularConfiancaAnalise(dadosEstruturados, metricas),
        limitacoes: this.obterLimitacoes(),
        proxima_revisao_sugerida: this.calcularProximaRevisao()
      }

      return insights
    } catch (error) {
      console.error('Erro ao gerar insights:', error)
      throw new Error(`Falha na geração de insights: ${error.message}`)
    }
  }

  /**
   * Preparar contexto estruturado para a IA
   */
  private prepararContexto(
    dadosEstruturados: DadosEstruturados[],
    metricas: ResultadoMetricas,
    compliance: ComplianceAnalysis
  ) {
    return {
      empresa: this.config.empresa,
      periodo: this.config.periodo_analise,
      
      dados_financeiros: {
        total_receitas: metricas.resumo.total_receitas,
        total_despesas: metricas.resumo.total_despesas,
        saldo_liquido: metricas.resumo.saldo_liquido,
        margem_media: metricas.resumo.margem_media,
        crescimento_receita: metricas.resumo.crescimento_receita,
        crescimento_despesa: metricas.resumo.crescimento_despesa,
        documentos_analisados: metricas.resumo.documentos_analisados,
        
        metricas_mensais: metricas.metricas_mensais.slice(-6), // Últimos 6 meses
        projecoes: metricas.projecoes,
        indicadores: metricas.indicadores
      },
      
      compliance_status: {
        score_geral: compliance.score_geral,
        nivel: compliance.nivel,
        problemas_consistencia: compliance.consistencia_dados.problemas,
        atrasos: compliance.prazos_fiscais.atrasos,
        obrigacoes_pendentes: compliance.obrigacoes_fiscais.pendentes,
        alertas_urgentes: compliance.alertas_urgentes,
        riscos: compliance.riscos_identificados
      },
      
      qualidade_dados: {
        total_documentos: dadosEstruturados.length,
        tipos_documento: this.contarTiposDocumento(dadosEstruturados),
        confianca_media: dadosEstruturados.reduce((sum, d) => sum + d.confianca_extracao, 0) / dadosEstruturados.length,
        documentos_com_erros: dadosEstruturados.filter(d => d.erros_validacao.length > 0).length
      },
      
      contexto_setorial: {
        regime_tributario: this.config.empresa.regime_tributario,
        porte_empresa: this.config.empresa.porte,
        atividade: this.config.empresa.atividade_principal,
        localizacao: `${this.config.empresa.municipio}, ${this.config.empresa.estado}`
      }
    }
  }

  /**
   * Construir prompt estruturado para a IA
   */
  private construirPrompt(contexto: any): string {
    const foco = this.config.foco_analise || 'completo'
    const nivel = this.config.nivel_detalhamento || 'gerencial'
    
    return `
Analise os dados financeiros e de compliance da empresa ${contexto.empresa.nome} (CNPJ: ${contexto.empresa.cnpj}) 
e gere insights acionáveis para o período de ${contexto.periodo.inicio} a ${contexto.periodo.fim}.

DADOS PARA ANÁLISE:
${JSON.stringify(contexto, null, 2)}

CONFIGURAÇÕES DA ANÁLISE:
- Foco: ${foco}
- Nível de detalhamento: ${nivel}
- Regime tributário: ${contexto.empresa.regime_tributario}
- Porte da empresa: ${contexto.empresa.porte}

INSTRUÇÕES ESPECÍFICAS:
1. Considere as particularidades da legislação brasileira
2. Foque em insights acionáveis e práticos
3. Priorize recomendações com maior impacto
4. Considere o contexto do regime tributário específico
5. Identifique oportunidades de otimização fiscal
6. Avalie riscos de compliance e suas consequências
7. Sugira melhorias operacionais baseadas nos dados

FORMATO DE RESPOSTA:
Retorne um JSON válido seguindo exatamente a estrutura da interface AIInsights, 
com todos os campos preenchidos de forma consistente e útil.

${this.config.contexto_adicional ? `CONTEXTO ADICIONAL: ${this.config.contexto_adicional}` : ''}
`
  }

  /**
   * Obter prompt do sistema
   */
  private obterSystemPrompt(): string {
    return `
Você é um especialista em contabilidade brasileira e análise financeira com mais de 20 anos de experiência. 
Sua especialidade inclui:

- Legislação tributária brasileira (Simples Nacional, Lucro Presumido, Lucro Real, MEI)
- Análise financeira e projeções
- Compliance fiscal e obrigações acessórias
- Otimização tributária
- Gestão financeira para PMEs
- Benchmarking setorial

DIRETRIZES PARA ANÁLISE:
1. Seja preciso e baseado em dados
2. Considere sempre o contexto brasileiro
3. Priorize ações com maior ROI
4. Identifique riscos fiscais e financeiros
5. Sugira melhorias práticas e implementáveis
6. Use linguagem técnica mas acessível
7. Considere sazonalidades e ciclos econômicos
8. Avalie impactos de mudanças regulatórias

FORMATO DE RESPOSTA:
- Sempre retorne JSON válido
- Seja específico nas recomendações
- Inclua prazos e prioridades
- Quantifique impactos quando possível
- Considere limitações dos dados disponíveis
`
  }

  /**
   * Contar tipos de documento
   */
  private contarTiposDocumento(dados: DadosEstruturados[]): Record<string, number> {
    const contagem: Record<string, number> = {}
    
    for (const doc of dados) {
      contagem[doc.tipo_documento] = (contagem[doc.tipo_documento] || 0) + 1
    }
    
    return contagem
  }

  /**
   * Calcular confiança da análise
   */
  private calcularConfiancaAnalise(
    dadosEstruturados: DadosEstruturados[],
    metricas: ResultadoMetricas
  ): number {
    let confianca = 100

    // Penalizar por poucos dados
    if (dadosEstruturados.length < 10) {
      confianca -= 20
    }

    // Penalizar por baixa confiança na extração
    const confiancaMedia = dadosEstruturados.reduce((sum, d) => sum + d.confianca_extracao, 0) / dadosEstruturados.length
    if (confiancaMedia < 0.8) {
      confianca -= (0.8 - confiancaMedia) * 50
    }

    // Penalizar por período curto
    if (metricas.resumo.periodo_analise.meses < 3) {
      confianca -= 15
    }

    // Penalizar por muitos erros
    const documentosComErros = dadosEstruturados.filter(d => d.erros_validacao.length > 0).length
    const percentualErros = documentosComErros / dadosEstruturados.length
    if (percentualErros > 0.1) {
      confianca -= percentualErros * 30
    }

    return Math.max(0, Math.min(100, confianca))
  }

  /**
   * Obter limitações da análise
   */
  private obterLimitacoes(): string[] {
    const limitacoes = [
      'Análise baseada apenas em dados estruturados extraídos',
      'Não considera fatores macroeconômicos externos',
      'Projeções baseadas em tendências históricas'
    ]

    if (this.config.periodo_analise.meses < 6) {
      limitacoes.push('Período de análise limitado pode afetar precisão das tendências')
    }

    return limitacoes
  }

  /**
   * Calcular próxima revisão sugerida
   */
  private calcularProximaRevisao(): string {
    const proximaRevisao = new Date()
    proximaRevisao.setMonth(proximaRevisao.getMonth() + 1)
    return proximaRevisao.toISOString().split('T')[0]
  }
}

/**
 * Função utilitária para gerar insights
 */
export async function gerarInsightsIA(
  dadosEstruturados: DadosEstruturados[],
  metricas: ResultadoMetricas,
  compliance: ComplianceAnalysis,
  config: InsightsConfig
): Promise<AIInsights> {
  const generator = new AIInsightsGenerator(config)
  return await generator.gerarInsights(dadosEstruturados, metricas, compliance)
}

/**
 * Configuração padrão para insights
 */
export const INSIGHTS_CONFIG_DEFAULT: Partial<InsightsConfig> = {
  foco_analise: 'completo',
  nivel_detalhamento: 'gerencial'
}
