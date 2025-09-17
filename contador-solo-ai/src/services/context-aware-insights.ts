'use client'

import OpenAI from 'openai'
import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA CONTEXT-AWARE INSIGHTS
// =====================================================

export interface ContextualInsight {
  id: string
  type: 'financial' | 'compliance' | 'optimization' | 'alert' | 'recommendation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  impact: {
    financial: number // Impacto financeiro estimado
    compliance: number // Risco de compliance (0-100)
    urgency: number // Urgência (0-100)
  }
  actionable: boolean
  actions: InsightAction[]
  confidence: number // Confiança da IA (0-1)
  context: {
    empresaId: string
    userId: string
    dataSource: string[]
    analysisDate: Date
  }
  metadata: {
    aiModel: string
    processingTime: number
    dataQuality: number
  }
}

export interface InsightAction {
  id: string
  type: 'immediate' | 'scheduled' | 'monitoring'
  description: string
  estimatedTime: string
  difficulty: 'easy' | 'medium' | 'hard'
  resources: string[]
  expectedOutcome: string
}

export interface ContextAnalysisRequest {
  empresaId: string
  userId: string
  contextData: {
    empresa: any
    calculos: any[]
    obrigacoes: any[]
    documentos: any[]
    historico?: any[]
  }
  analysisType: 'comprehensive' | 'focused' | 'quick'
  focusAreas?: string[]
  userPreferences?: {
    detailLevel: number
    communicationStyle: string
    priorityAreas: string[]
  }
}

export interface AIAnalysisPrompt {
  systemPrompt: string
  userPrompt: string
  context: string
  constraints: string[]
  outputFormat: string
}

// =====================================================
// CONTEXT-AWARE INSIGHTS SERVICE
// =====================================================

export class ContextAwareInsightsService {
  private openai: OpenAI
  private insightCache = new Map<string, ContextualInsight[]>()
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutos
  private readonly MAX_TOKENS = 4000
  private readonly MODEL = 'gpt-4o-mini'

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Para uso no cliente
    })
  }

  /**
   * Gera insights contextuais usando OpenAI
   */
  async generateContextualInsights(
    request: ContextAnalysisRequest
  ): Promise<Result<ContextualInsight[], ContextError>> {
    const operationContext = createOperationContext('generate_contextual_insights', request.userId, {
      empresaId: request.empresaId,
      analysisType: request.analysisType
    })

    return await measureOperation('generateContextualInsights', async () => {
      try {
        // Verificar cache primeiro
        const cacheKey = this.generateCacheKey(request)
        const cachedInsights = await this.getCachedInsights(cacheKey)
        if (cachedInsights) {
          return { success: true, data: cachedInsights }
        }

        // Preparar dados para análise
        const analysisPrompt = this.buildAnalysisPrompt(request)
        
        // Chamar OpenAI para análise
        const aiResponse = await this.callOpenAI(analysisPrompt)
        
        // Processar resposta da IA
        const insights = this.processAIResponse(aiResponse, request)
        
        // Enriquecer insights com dados contextuais
        const enrichedInsights = await this.enrichInsights(insights, request)
        
        // Validar e filtrar insights
        const validatedInsights = this.validateInsights(enrichedInsights)
        
        // Armazenar no cache
        await this.cacheInsights(cacheKey, validatedInsights)

        logger.info('Contextual insights generated successfully', {
          empresaId: request.empresaId,
          userId: request.userId,
          insightCount: validatedInsights.length,
          analysisType: request.analysisType,
          traceId: operationContext.traceId
        })

        return { success: true, data: validatedInsights }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to generate contextual insights',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { request },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        logger.error('Contextual insights generation failed', {
          error: contextError.toJSON(),
          request,
          traceId: operationContext.traceId
        })

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Gera insights específicos para uma área
   */
  async generateFocusedInsights(
    empresaId: string,
    userId: string,
    focusArea: 'tax_optimization' | 'compliance_risk' | 'cash_flow' | 'growth_opportunities',
    contextData: any
  ): Promise<Result<ContextualInsight[], ContextError>> {
    const request: ContextAnalysisRequest = {
      empresaId,
      userId,
      contextData,
      analysisType: 'focused',
      focusAreas: [focusArea]
    }

    return await this.generateContextualInsights(request)
  }

  /**
   * Gera insights rápidos para dashboard
   */
  async generateQuickInsights(
    empresaId: string,
    userId: string,
    contextData: any
  ): Promise<Result<ContextualInsight[], ContextError>> {
    const request: ContextAnalysisRequest = {
      empresaId,
      userId,
      contextData,
      analysisType: 'quick'
    }

    return await this.generateContextualInsights(request)
  }

  /**
   * Métodos privados
   */
  private buildAnalysisPrompt(request: ContextAnalysisRequest): AIAnalysisPrompt {
    const { contextData, analysisType, focusAreas, userPreferences } = request

    const systemPrompt = this.buildSystemPrompt(analysisType, userPreferences)
    const contextString = this.buildContextString(contextData)
    const userPrompt = this.buildUserPrompt(analysisType, focusAreas)
    const constraints = this.buildConstraints(analysisType)
    const outputFormat = this.buildOutputFormat()

    return {
      systemPrompt,
      userPrompt,
      context: contextString,
      constraints,
      outputFormat
    }
  }

  private buildSystemPrompt(analysisType: string, userPreferences?: any): string {
    const basePrompt = `Você é um especialista em contabilidade brasileira e análise fiscal com mais de 20 anos de experiência. 
    Sua especialidade é analisar dados contábeis e fiscais para gerar insights acionáveis e recomendações precisas.

    EXPERTISE:
    - Legislação tributária brasileira (Simples Nacional, Lucro Presumido, Lucro Real)
    - Análise de compliance fiscal e trabalhista
    - Otimização tributária e planejamento fiscal
    - Análise de fluxo de caixa e projeções financeiras
    - Identificação de riscos e oportunidades

    CONTEXTO BRASILEIRO:
    - Considere sempre a legislação brasileira atual
    - Leve em conta prazos fiscais e obrigações acessórias
    - Considere impactos de mudanças na legislação
    - Analise regime tributário mais adequado`

    const styleAdjustment = userPreferences?.communicationStyle === 'technical' 
      ? '\nUSE LINGUAGEM TÉCNICA E DETALHADA.'
      : '\nUSE LINGUAGEM CLARA E ACESSÍVEL PARA EMPRESÁRIOS.'

    const detailAdjustment = analysisType === 'comprehensive'
      ? '\nFORNEÇA ANÁLISE DETALHADA E ABRANGENTE.'
      : analysisType === 'quick'
      ? '\nSEJA CONCISO E DIRETO AO PONTO.'
      : '\nFOQUE NA ÁREA ESPECÍFICA SOLICITADA.'

    return basePrompt + styleAdjustment + detailAdjustment
  }

  private buildContextString(contextData: any): string {
    const { empresa, calculos, obrigacoes, documentos } = contextData

    let context = `DADOS DA EMPRESA:
    Nome: ${empresa?.nome || 'N/A'}
    CNPJ: ${empresa?.cnpj || 'N/A'}
    Regime Tributário: ${empresa?.regime_tributario || 'N/A'}
    Atividade Principal: ${empresa?.atividade_principal || 'N/A'}
    Status: ${empresa?.status || 'N/A'}`

    if (empresa?.anexo_simples) {
      context += `\nAnexo Simples Nacional: ${empresa.anexo_simples}`
    }

    if (calculos && calculos.length > 0) {
      context += `\n\nCÁLCULOS RECENTES (${calculos.length}):`
      calculos.slice(0, 5).forEach((calc: any, index: number) => {
        context += `\n${index + 1}. ${calc.tipo_calculo || 'N/A'} - Competência: ${calc.competencia || 'N/A'} - Valor: R$ ${calc.valor_total || 0} - Status: ${calc.status || 'N/A'}`
      })
    }

    if (obrigacoes && obrigacoes.length > 0) {
      context += `\n\nOBRIGAÇÕES FISCAIS (${obrigacoes.length}):`
      obrigacoes.slice(0, 5).forEach((obr: any, index: number) => {
        context += `\n${index + 1}. ${obr.nome || 'N/A'} - Vencimento: ${obr.data_vencimento || 'N/A'} - Status: ${obr.status || 'N/A'} - Situação: ${obr.situacao || 'N/A'}`
      })
    }

    if (documentos && documentos.length > 0) {
      context += `\n\nDOCUMENTOS RECENTES (${documentos.length}):`
      const docTypes = documentos.reduce((acc: any, doc: any) => {
        const type = doc.tipo_documento || 'outros'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})
      
      Object.entries(docTypes).forEach(([type, count]) => {
        context += `\n- ${type}: ${count} documento(s)`
      })
    }

    return context
  }

  private buildUserPrompt(analysisType: string, focusAreas?: string[]): string {
    let prompt = 'Analise os dados fornecidos e gere insights acionáveis para esta empresa brasileira.'

    if (analysisType === 'focused' && focusAreas) {
      const areaMap = {
        'tax_optimization': 'otimização tributária',
        'compliance_risk': 'riscos de compliance',
        'cash_flow': 'fluxo de caixa',
        'growth_opportunities': 'oportunidades de crescimento'
      }
      
      const areas = focusAreas.map(area => areaMap[area as keyof typeof areaMap] || area).join(', ')
      prompt += ` Foque especificamente em: ${areas}.`
    }

    prompt += `

    IDENTIFIQUE:
    1. Problemas críticos que precisam de ação imediata
    2. Oportunidades de otimização tributária
    3. Riscos de compliance e como mitigá-los
    4. Tendências financeiras e projeções
    5. Recomendações específicas e acionáveis

    Para cada insight, forneça:
    - Impacto financeiro estimado (em R$)
    - Nível de risco de compliance (0-100)
    - Urgência da ação (0-100)
    - Ações específicas recomendadas
    - Tempo estimado para implementação`

    return prompt
  }

  private buildConstraints(analysisType: string): string[] {
    const baseConstraints = [
      'Considere apenas a legislação brasileira vigente',
      'Forneça valores em Reais (R$)',
      'Use datas no formato brasileiro (DD/MM/AAAA)',
      'Considere prazos fiscais brasileiros',
      'Mantenha confidencialidade dos dados'
    ]

    if (analysisType === 'quick') {
      baseConstraints.push('Limite a resposta a no máximo 3 insights principais')
    } else if (analysisType === 'comprehensive') {
      baseConstraints.push('Forneça análise detalhada com até 8 insights')
    }

    return baseConstraints
  }

  private buildOutputFormat(): string {
    return `Responda APENAS com um JSON válido no seguinte formato:
    {
      "insights": [
        {
          "type": "financial|compliance|optimization|alert|recommendation",
          "priority": "low|medium|high|critical",
          "title": "Título conciso do insight",
          "description": "Descrição detalhada do insight",
          "impact": {
            "financial": 0,
            "compliance": 0,
            "urgency": 0
          },
          "actionable": true|false,
          "actions": [
            {
              "type": "immediate|scheduled|monitoring",
              "description": "Descrição da ação",
              "estimatedTime": "Tempo estimado",
              "difficulty": "easy|medium|hard",
              "resources": ["recurso1", "recurso2"],
              "expectedOutcome": "Resultado esperado"
            }
          ],
          "confidence": 0.0
        }
      ]
    }`
  }

  private async callOpenAI(prompt: AIAnalysisPrompt): Promise<string> {
    const messages = [
      { role: 'system' as const, content: prompt.systemPrompt },
      { 
        role: 'user' as const, 
        content: `${prompt.userPrompt}\n\nCONTEXTO:\n${prompt.context}\n\nRESTRIÇÕES:\n${prompt.constraints.join('\n')}\n\nFORMATO DE SAÍDA:\n${prompt.outputFormat}`
      }
    ]

    const response = await this.openai.chat.completions.create({
      model: this.MODEL,
      messages,
      max_tokens: this.MAX_TOKENS,
      temperature: 0.3, // Baixa temperatura para respostas mais consistentes
      response_format: { type: 'json_object' }
    })

    return response.choices[0]?.message?.content || ''
  }

  private processAIResponse(aiResponse: string, request: ContextAnalysisRequest): ContextualInsight[] {
    try {
      const parsed = JSON.parse(aiResponse)
      const insights: ContextualInsight[] = []

      if (parsed.insights && Array.isArray(parsed.insights)) {
        parsed.insights.forEach((insight: any, index: number) => {
          insights.push({
            id: `insight-${request.empresaId}-${Date.now()}-${index}`,
            type: insight.type || 'recommendation',
            priority: insight.priority || 'medium',
            title: insight.title || 'Insight sem título',
            description: insight.description || '',
            impact: {
              financial: insight.impact?.financial || 0,
              compliance: insight.impact?.compliance || 0,
              urgency: insight.impact?.urgency || 0
            },
            actionable: insight.actionable !== false,
            actions: insight.actions || [],
            confidence: insight.confidence || 0.7,
            context: {
              empresaId: request.empresaId,
              userId: request.userId,
              dataSource: ['openai_analysis'],
              analysisDate: new Date()
            },
            metadata: {
              aiModel: this.MODEL,
              processingTime: 0, // Será preenchido depois
              dataQuality: this.assessDataQuality(request.contextData)
            }
          })
        })
      }

      return insights
    } catch (error) {
      logger.error('Failed to parse AI response', {
        error: error instanceof Error ? error.message : String(error),
        aiResponse
      })
      return []
    }
  }

  private async enrichInsights(
    insights: ContextualInsight[], 
    request: ContextAnalysisRequest
  ): Promise<ContextualInsight[]> {
    // Enriquecer insights com dados adicionais, validações, etc.
    return insights.map(insight => ({
      ...insight,
      // Adicionar validações específicas do contexto brasileiro
      actions: insight.actions.map(action => ({
        ...action,
        resources: this.addBrazilianResources(action.resources, insight.type)
      }))
    }))
  }

  private validateInsights(insights: ContextualInsight[]): ContextualInsight[] {
    return insights.filter(insight => {
      // Validações básicas
      if (!insight.title || !insight.description) return false
      if (insight.confidence < 0.3) return false // Muito baixa confiança
      if (insight.impact.financial < 0 && insight.type === 'optimization') return false
      
      return true
    }).sort((a, b) => {
      // Ordenar por prioridade e impacto
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      const aPriority = priorityOrder[a.priority]
      const bPriority = priorityOrder[b.priority]
      
      if (aPriority !== bPriority) return aPriority - bPriority
      return b.impact.urgency - a.impact.urgency
    })
  }

  private assessDataQuality(contextData: any): number {
    let quality = 0
    let factors = 0

    // Avaliar qualidade dos dados da empresa
    if (contextData.empresa) {
      factors++
      if (contextData.empresa.nome && contextData.empresa.cnpj && contextData.empresa.regime_tributario) {
        quality += 0.3
      }
    }

    // Avaliar qualidade dos cálculos
    if (contextData.calculos && contextData.calculos.length > 0) {
      factors++
      const validCalculos = contextData.calculos.filter((c: any) => c.valor_total && c.competencia)
      quality += (validCalculos.length / contextData.calculos.length) * 0.3
    }

    // Avaliar qualidade das obrigações
    if (contextData.obrigacoes && contextData.obrigacoes.length > 0) {
      factors++
      const validObrigacoes = contextData.obrigacoes.filter((o: any) => o.data_vencimento && o.status)
      quality += (validObrigacoes.length / contextData.obrigacoes.length) * 0.2
    }

    // Avaliar qualidade dos documentos
    if (contextData.documentos && contextData.documentos.length > 0) {
      factors++
      quality += Math.min(contextData.documentos.length / 10, 1) * 0.2
    }

    return factors > 0 ? Math.min(quality, 1) : 0
  }

  private addBrazilianResources(resources: string[], insightType: string): string[] {
    const brazilianResources = {
      compliance: ['Receita Federal', 'Simples Nacional', 'eSocial', 'SPED'],
      financial: ['Banco Central', 'CVM', 'Serasa', 'SPC'],
      optimization: ['Simples Nacional', 'Regime Tributário', 'Planejamento Fiscal']
    }

    const typeResources = brazilianResources[insightType as keyof typeof brazilianResources] || []
    return [...new Set([...resources, ...typeResources])]
  }

  private generateCacheKey(request: ContextAnalysisRequest): string {
    const dataHash = JSON.stringify({
      empresaId: request.empresaId,
      analysisType: request.analysisType,
      focusAreas: request.focusAreas,
      dataSignature: this.generateDataSignature(request.contextData)
    })
    
    return `contextual-insights:${Buffer.from(dataHash).toString('base64').slice(0, 32)}`
  }

  private generateDataSignature(contextData: any): string {
    // Gerar assinatura dos dados para cache
    return JSON.stringify({
      empresaStatus: contextData.empresa?.status,
      calculosCount: contextData.calculos?.length || 0,
      obrigacoesCount: contextData.obrigacoes?.length || 0,
      documentosCount: contextData.documentos?.length || 0,
      lastUpdate: new Date().toDateString()
    })
  }

  private async getCachedInsights(cacheKey: string): Promise<ContextualInsight[] | null> {
    return await unifiedCacheService.get<ContextualInsight[]>(cacheKey, 'contextual-insights')
  }

  private async cacheInsights(cacheKey: string, insights: ContextualInsight[]): Promise<void> {
    await unifiedCacheService.set(cacheKey, insights, 'contextual-insights')
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStatistics() {
    return {
      cacheSize: this.insightCache.size,
      totalInsightsGenerated: 0, // Implementar contador
      averageConfidence: 0, // Implementar cálculo
      mostCommonInsightType: 'recommendation' // Implementar análise
    }
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    this.insightCache.clear()
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const contextAwareInsightsService = new ContextAwareInsightsService()
