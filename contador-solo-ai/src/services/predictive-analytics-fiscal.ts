'use client'

import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA PREDICTIVE ANALYTICS FISCAL
// =====================================================

export interface FiscalPrediction {
  id: string
  type: 'tax_liability' | 'cash_flow' | 'compliance_risk' | 'regime_optimization' | 'seasonal_trend'
  timeframe: 'next_month' | 'next_quarter' | 'next_year' | 'custom'
  prediction: {
    value: number
    confidence: number // 0-1
    range: {
      min: number
      max: number
    }
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  }
  factors: PredictionFactor[]
  recommendations: PredictionRecommendation[]
  metadata: {
    model: string
    dataPoints: number
    accuracy: number
    lastUpdate: Date
  }
  context: {
    empresaId: string
    regimeTributario: string
    atividade: string
    periodo: {
      start: Date
      end: Date
    }
  }
}

export interface PredictionFactor {
  name: string
  impact: number // -1 a 1
  confidence: number
  description: string
  category: 'internal' | 'external' | 'regulatory' | 'seasonal'
}

export interface PredictionRecommendation {
  type: 'action' | 'monitoring' | 'preparation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  expectedImpact: number
  timeToImplement: string
  resources: string[]
}

export interface TaxProjection {
  periodo: string
  impostos: {
    das?: number
    irpj?: number
    csll?: number
    pis?: number
    cofins?: number
    icms?: number
    iss?: number
    total: number
  }
  aliquotaEfetiva: number
  economiaOportunidades: number
  riscosIdentificados: string[]
}

export interface ComplianceRiskAssessment {
  overall: number // 0-100
  categories: {
    fiscal: number
    trabalhista: number
    ambiental: number
    regulatorio: number
  }
  criticalIssues: string[]
  upcomingDeadlines: {
    obrigacao: string
    prazo: Date
    risco: number
  }[]
  recommendations: string[]
}

export interface SeasonalAnalysis {
  pattern: 'seasonal' | 'cyclical' | 'irregular' | 'trend'
  seasonality: {
    month: number
    factor: number // Multiplicador sazonal
    confidence: number
  }[]
  peakPeriods: {
    start: string
    end: string
    intensity: number
  }[]
  recommendations: {
    cashFlow: string[]
    taxPlanning: string[]
    compliance: string[]
  }
}

// =====================================================
// PREDICTIVE ANALYTICS FISCAL SERVICE
// =====================================================

export class PredictiveAnalyticsFiscalService {
  private predictionCache = new Map<string, FiscalPrediction[]>()
  private modelAccuracy = new Map<string, number>()
  private readonly CACHE_TTL = 60 * 60 * 1000 // 1 hora
  private readonly MIN_DATA_POINTS = 6 // Mínimo 6 meses de dados

  /**
   * Gera projeções fiscais para uma empresa
   */
  async generateTaxProjections(
    empresaId: string,
    regimeTributario: string,
    historicalData: any[],
    timeframe: 'next_month' | 'next_quarter' | 'next_year' = 'next_quarter'
  ): Promise<Result<TaxProjection[], ContextError>> {
    const operationContext = createOperationContext('generate_tax_projections', 'system', {
      empresaId,
      timeframe
    })

    return await measureOperation('generateTaxProjections', async () => {
      try {
        // Validar dados históricos
        if (historicalData.length < this.MIN_DATA_POINTS) {
          return {
            success: false,
            error: new ContextErrorClass(
              'Dados históricos insuficientes para projeção',
              ERROR_CODES.VALIDATION_FAILED,
              { empresaId, dataPoints: historicalData.length, required: this.MIN_DATA_POINTS }
            )
          }
        }

        // Analisar tendências históricas
        const trends = this.analyzeTrends(historicalData)
        
        // Aplicar sazonalidade
        const seasonalFactors = this.calculateSeasonalFactors(historicalData)
        
        // Gerar projeções por período
        const projections = this.generateProjectionPeriods(
          historicalData,
          trends,
          seasonalFactors,
          regimeTributario,
          timeframe
        )

        // Calcular oportunidades de economia
        const optimizations = this.identifyOptimizationOpportunities(
          projections,
          regimeTributario,
          historicalData
        )

        // Enriquecer projeções com otimizações
        const enrichedProjections = projections.map(projection => ({
          ...projection,
          economiaOportunidades: optimizations.find(opt => 
            opt.periodo === projection.periodo
          )?.economia || 0,
          riscosIdentificados: this.identifyRisks(projection, regimeTributario)
        }))

        logger.info('Tax projections generated successfully', {
          empresaId,
          timeframe,
          projectionCount: enrichedProjections.length,
          traceId: operationContext.traceId
        })

        return { success: true, data: enrichedProjections }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to generate tax projections',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { empresaId, timeframe },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Avalia riscos de compliance
   */
  async assessComplianceRisk(
    empresaId: string,
    contextData: {
      empresa: any
      calculos: any[]
      obrigacoes: any[]
      documentos: any[]
    }
  ): Promise<Result<ComplianceRiskAssessment, ContextError>> {
    const operationContext = createOperationContext('assess_compliance_risk', 'system', {
      empresaId
    })

    return await measureOperation('assessComplianceRisk', async () => {
      try {
        // Analisar riscos fiscais
        const fiscalRisk = this.calculateFiscalRisk(contextData.calculos, contextData.obrigacoes)
        
        // Analisar riscos trabalhistas
        const trabalhistaRisk = this.calculateTrabalhistaRisk(contextData.empresa, contextData.documentos)
        
        // Analisar riscos regulatórios
        const regulatorioRisk = this.calculateRegulatorioRisk(contextData.empresa)
        
        // Analisar riscos ambientais (se aplicável)
        const ambientalRisk = this.calculateAmbientalRisk(contextData.empresa)

        // Calcular risco geral
        const overallRisk = this.calculateOverallRisk({
          fiscal: fiscalRisk,
          trabalhista: trabalhistaRisk,
          regulatorio: regulatorioRisk,
          ambiental: ambientalRisk
        })

        // Identificar questões críticas
        const criticalIssues = this.identifyCriticalIssues(contextData)
        
        // Analisar prazos próximos
        const upcomingDeadlines = this.analyzeUpcomingDeadlines(contextData.obrigacoes)
        
        // Gerar recomendações
        const recommendations = this.generateComplianceRecommendations(
          overallRisk,
          criticalIssues,
          upcomingDeadlines
        )

        const assessment: ComplianceRiskAssessment = {
          overall: overallRisk,
          categories: {
            fiscal: fiscalRisk,
            trabalhista: trabalhistaRisk,
            ambiental: ambientalRisk,
            regulatorio: regulatorioRisk
          },
          criticalIssues,
          upcomingDeadlines,
          recommendations
        }

        logger.info('Compliance risk assessment completed', {
          empresaId,
          overallRisk,
          criticalIssuesCount: criticalIssues.length,
          traceId: operationContext.traceId
        })

        return { success: true, data: assessment }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to assess compliance risk',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { empresaId },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Analisa padrões sazonais
   */
  async analyzeSeasonalPatterns(
    empresaId: string,
    historicalData: any[],
    dataType: 'revenue' | 'taxes' | 'expenses' = 'revenue'
  ): Promise<Result<SeasonalAnalysis, ContextError>> {
    const operationContext = createOperationContext('analyze_seasonal_patterns', 'system', {
      empresaId,
      dataType
    })

    return await measureOperation('analyzeSeasonalPatterns', async () => {
      try {
        if (historicalData.length < 12) {
          return {
            success: false,
            error: new ContextErrorClass(
              'Dados insuficientes para análise sazonal (mínimo 12 meses)',
              ERROR_CODES.VALIDATION_FAILED,
              { empresaId, dataPoints: historicalData.length }
            )
          }
        }

        // Detectar padrão geral
        const pattern = this.detectPattern(historicalData)
        
        // Calcular fatores sazonais por mês
        const seasonality = this.calculateMonthlySeasonality(historicalData, dataType)
        
        // Identificar períodos de pico
        const peakPeriods = this.identifyPeakPeriods(seasonality)
        
        // Gerar recomendações baseadas na sazonalidade
        const recommendations = this.generateSeasonalRecommendations(
          pattern,
          seasonality,
          peakPeriods
        )

        const analysis: SeasonalAnalysis = {
          pattern,
          seasonality,
          peakPeriods,
          recommendations
        }

        logger.info('Seasonal analysis completed', {
          empresaId,
          pattern,
          peakPeriodsCount: peakPeriods.length,
          traceId: operationContext.traceId
        })

        return { success: true, data: analysis }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to analyze seasonal patterns',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { empresaId, dataType },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Identifica oportunidades de otimização de regime tributário
   */
  async analyzeRegimeOptimization(
    empresaId: string,
    currentRegime: string,
    projectedRevenue: number,
    businessData: any
  ): Promise<Result<{
    currentRegime: string
    recommendedRegime: string
    potentialSavings: number
    analysisDetails: any
    migrationPlan?: any
  }, ContextError>> {
    const operationContext = createOperationContext('analyze_regime_optimization', 'system', {
      empresaId,
      currentRegime
    })

    return await measureOperation('analyzeRegimeOptimization', async () => {
      try {
        // Simular cálculos para diferentes regimes
        const regimeComparisons = await this.compareRegimes(
          projectedRevenue,
          businessData,
          currentRegime
        )

        // Encontrar regime mais vantajoso
        const optimalRegime = this.findOptimalRegime(regimeComparisons)
        
        // Calcular economia potencial
        const potentialSavings = this.calculatePotentialSavings(
          regimeComparisons,
          currentRegime,
          optimalRegime.regime
        )

        // Gerar plano de migração se necessário
        const migrationPlan = currentRegime !== optimalRegime.regime
          ? this.generateMigrationPlan(currentRegime, optimalRegime.regime, businessData)
          : undefined

        const analysis = {
          currentRegime,
          recommendedRegime: optimalRegime.regime,
          potentialSavings,
          analysisDetails: {
            comparisons: regimeComparisons,
            factors: optimalRegime.factors,
            risks: optimalRegime.risks
          },
          migrationPlan
        }

        logger.info('Regime optimization analysis completed', {
          empresaId,
          currentRegime,
          recommendedRegime: optimalRegime.regime,
          potentialSavings,
          traceId: operationContext.traceId
        })

        return { success: true, data: analysis }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to analyze regime optimization',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { empresaId, currentRegime },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Métodos privados para análise
   */
  private analyzeTrends(data: any[]): { slope: number; r2: number; direction: string } {
    if (data.length < 2) return { slope: 0, r2: 0, direction: 'stable' }

    // Implementação simplificada de regressão linear
    const n = data.length
    const x = data.map((_, i) => i)
    const y = data.map(d => d.valor_total || 0)

    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    
    // Calcular R²
    const yMean = sumY / n
    const ssRes = y.reduce((sum, yi, i) => {
      const xValue = x[i]
      if (xValue === undefined) return sum
      const predicted = slope * xValue + (sumY - slope * sumX) / n
      return sum + Math.pow(yi - predicted, 2)
    }, 0)
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
    const r2 = 1 - (ssRes / ssTot)

    const direction = slope > 0.05 ? 'increasing' : slope < -0.05 ? 'decreasing' : 'stable'

    return { slope, r2, direction }
  }

  private calculateSeasonalFactors(data: any[]): number[] {
    const monthlyData = new Array(12).fill(0).map(() => ({ sum: 0, count: 0 }))
    
    data.forEach(item => {
      const date = new Date(item.competencia || item.data_emissao || item.created_at)
      const month = date.getMonth()
      const value = item.valor_total || 0
      
      if (monthlyData[month]) {
        monthlyData[month].sum += value
        monthlyData[month].count += 1
      }
    })

    const monthlyAverages = monthlyData.map(m => m.count > 0 ? m.sum / m.count : 0)
    const overallAverage = monthlyAverages.reduce((a, b) => a + b, 0) / 12

    return monthlyAverages.map(avg => overallAverage > 0 ? avg / overallAverage : 1)
  }

  private generateProjectionPeriods(
    historicalData: any[],
    trends: any,
    seasonalFactors: number[],
    regimeTributario: string,
    timeframe: string
  ): TaxProjection[] {
    const projections: TaxProjection[] = []
    const periodsToProject = timeframe === 'next_month' ? 1 : timeframe === 'next_quarter' ? 3 : 12
    
    const lastValue = historicalData[historicalData.length - 1]?.valor_total || 0
    const baseValue = lastValue * (1 + trends.slope * 0.1) // Ajuste baseado na tendência

    for (let i = 0; i < periodsToProject; i++) {
      const currentDate = new Date()
      currentDate.setMonth(currentDate.getMonth() + i + 1)
      const month = currentDate.getMonth()
      
      const seasonalAdjustment = seasonalFactors[month] || 1
      const projectedRevenue = baseValue * seasonalAdjustment

      const impostos = this.calculateTaxesByRegime(projectedRevenue, regimeTributario)

      projections.push({
        periodo: currentDate.toISOString().slice(0, 7), // YYYY-MM
        impostos,
        aliquotaEfetiva: impostos.total / projectedRevenue,
        economiaOportunidades: 0, // Será preenchido depois
        riscosIdentificados: []
      })
    }

    return projections
  }

  private calculateTaxesByRegime(revenue: number, regime: string): TaxProjection['impostos'] {
    const impostos: TaxProjection['impostos'] = { total: 0 }

    switch (regime) {
      case 'Simples Nacional':
        // Simplificação - usar alíquota média do Simples
        const aliquotaSimples = 0.06 // 6% - seria calculado baseado no anexo e faturamento
        impostos.das = revenue * aliquotaSimples
        impostos.total = impostos.das
        break

      case 'Lucro Presumido':
        impostos.irpj = revenue * 0.015 * 0.25 // 1.5% de presunção * 25% de IRPJ
        impostos.csll = revenue * 0.12 * 0.09 // 12% de presunção * 9% de CSLL
        impostos.pis = revenue * 0.0065
        impostos.cofins = revenue * 0.03
        impostos.total = (impostos.irpj || 0) + (impostos.csll || 0) + (impostos.pis || 0) + (impostos.cofins || 0)
        break

      case 'Lucro Real':
        // Simplificação - seria necessário lucro real para cálculo preciso
        impostos.irpj = revenue * 0.02 // Estimativa
        impostos.csll = revenue * 0.01 // Estimativa
        impostos.pis = revenue * 0.0165
        impostos.cofins = revenue * 0.076
        impostos.total = (impostos.irpj || 0) + (impostos.csll || 0) + (impostos.pis || 0) + (impostos.cofins || 0)
        break

      default:
        impostos.total = revenue * 0.05 // Estimativa genérica
    }

    return impostos
  }

  private identifyOptimizationOpportunities(
    projections: TaxProjection[],
    regimeTributario: string,
    historicalData: any[]
  ): { periodo: string; economia: number }[] {
    // Implementação simplificada de identificação de oportunidades
    return projections.map(projection => ({
      periodo: projection.periodo,
      economia: projection.impostos.total * 0.05 // 5% de economia potencial estimada
    }))
  }

  private identifyRisks(projection: TaxProjection, regimeTributario: string): string[] {
    const risks = []

    if (projection.aliquotaEfetiva > 0.15) {
      risks.push('Alta carga tributária - considerar otimização')
    }

    if (regimeTributario === 'Simples Nacional' && projection.impostos.total > 50000) {
      risks.push('Possível proximidade do limite do Simples Nacional')
    }

    return risks
  }

  private calculateFiscalRisk(calculos: any[], obrigacoes: any[]): number {
    let risk = 0

    // Analisar cálculos em atraso
    const calculosAtrasados = calculos.filter(c => c.status === 'pendente' || c.status === 'atrasado')
    risk += (calculosAtrasados.length / Math.max(calculos.length, 1)) * 40

    // Analisar obrigações vencidas
    const obrigacoesVencidas = obrigacoes.filter(o => o.situacao === 'vencida')
    risk += (obrigacoesVencidas.length / Math.max(obrigacoes.length, 1)) * 60

    return Math.min(risk, 100)
  }

  private calculateTrabalhistaRisk(empresa: any, documentos: any[]): number {
    // Implementação simplificada
    let risk = 0

    // Verificar se há funcionários (simplificado)
    if (empresa.regime_tributario !== 'MEI') {
      risk += 20 // Risco base para empresas com funcionários
    }

    // Analisar documentos trabalhistas
    const docsTrabalhistas = documentos.filter(d => 
      d.tipo_documento?.includes('FGTS') || 
      d.tipo_documento?.includes('INSS') ||
      d.tipo_documento?.includes('eSocial')
    )

    if (docsTrabalhistas.length === 0 && empresa.regime_tributario !== 'MEI') {
      risk += 30 // Falta de documentos trabalhistas
    }

    return Math.min(risk, 100)
  }

  private calculateRegulatorioRisk(empresa: any): number {
    let risk = 0

    // Verificar atividade de alto risco
    const atividadesAltoRisco = ['financeira', 'saude', 'educacao', 'construcao']
    if (atividadesAltoRisco.some(ativ => 
      empresa.atividade_principal?.toLowerCase().includes(ativ)
    )) {
      risk += 25
    }

    return Math.min(risk, 100)
  }

  private calculateAmbientalRisk(empresa: any): number {
    let risk = 0

    // Verificar atividades com impacto ambiental
    const atividadesAmbientais = ['industrial', 'quimica', 'mineracao', 'construcao']
    if (atividadesAmbientais.some(ativ => 
      empresa.atividade_principal?.toLowerCase().includes(ativ)
    )) {
      risk += 30
    }

    return Math.min(risk, 100)
  }

  private calculateOverallRisk(risks: { fiscal: number; trabalhista: number; regulatorio: number; ambiental: number }): number {
    // Média ponderada dos riscos
    return Math.round(
      risks.fiscal * 0.4 +
      risks.trabalhista * 0.3 +
      risks.regulatorio * 0.2 +
      risks.ambiental * 0.1
    )
  }

  private identifyCriticalIssues(contextData: any): string[] {
    const issues = []

    // Verificar obrigações vencidas
    const vencidas = contextData.obrigacoes?.filter((o: any) => o.situacao === 'vencida') || []
    if (vencidas.length > 0) {
      issues.push(`${vencidas.length} obrigação(ões) vencida(s)`)
    }

    // Verificar cálculos pendentes
    const pendentes = contextData.calculos?.filter((c: any) => c.status === 'pendente') || []
    if (pendentes.length > 2) {
      issues.push(`${pendentes.length} cálculos pendentes`)
    }

    return issues
  }

  private analyzeUpcomingDeadlines(obrigacoes: any[]): ComplianceRiskAssessment['upcomingDeadlines'] {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    return obrigacoes
      .filter(o => {
        const vencimento = new Date(o.data_vencimento)
        return vencimento >= now && vencimento <= thirtyDaysFromNow
      })
      .map(o => ({
        obrigacao: o.nome || 'Obrigação sem nome',
        prazo: new Date(o.data_vencimento),
        risco: this.calculateDeadlineRisk(new Date(o.data_vencimento), now)
      }))
      .sort((a, b) => a.prazo.getTime() - b.prazo.getTime())
  }

  private calculateDeadlineRisk(deadline: Date, now: Date): number {
    const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    
    if (daysUntilDeadline <= 3) return 90
    if (daysUntilDeadline <= 7) return 70
    if (daysUntilDeadline <= 15) return 50
    return 30
  }

  private generateComplianceRecommendations(
    overallRisk: number,
    criticalIssues: string[],
    upcomingDeadlines: any[]
  ): string[] {
    const recommendations = []

    if (overallRisk > 70) {
      recommendations.push('Implementar revisão urgente de compliance')
    }

    if (criticalIssues.length > 0) {
      recommendations.push('Resolver questões críticas identificadas imediatamente')
    }

    if (upcomingDeadlines.length > 3) {
      recommendations.push('Criar cronograma de cumprimento de obrigações')
    }

    if (overallRisk > 50) {
      recommendations.push('Considerar consultoria especializada em compliance')
    }

    return recommendations
  }

  private detectPattern(data: any[]): SeasonalAnalysis['pattern'] {
    // Implementação simplificada de detecção de padrão
    const values = data.map(d => d.valor_total || 0)
    const variance = this.calculateVariance(values)
    const mean = values.reduce((a, b) => a + b, 0) / values.length

    const coefficientOfVariation = variance > 0 ? Math.sqrt(variance) / mean : 0

    if (coefficientOfVariation > 0.5) return 'irregular'
    if (this.hasSeasonalPattern(values)) return 'seasonal'
    if (this.hasCyclicalPattern(values)) return 'cyclical'
    return 'trend'
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length
  }

  private hasSeasonalPattern(values: number[]): boolean {
    // Implementação simplificada - verificar se há padrão repetitivo
    if (values.length < 12) return false
    
    const monthlyAverages = []
    for (let i = 0; i < 12; i++) {
      const monthValues = values.filter((_, index) => index % 12 === i)
      monthlyAverages.push(monthValues.reduce((a, b) => a + b, 0) / monthValues.length)
    }

    const variance = this.calculateVariance(monthlyAverages)
    const mean = monthlyAverages.reduce((a, b) => a + b, 0) / 12
    
    return variance > (mean * 0.1) // Se a variância mensal for significativa
  }

  private hasCyclicalPattern(values: number[]): boolean {
    // Implementação simplificada - detectar ciclos mais longos que sazonais
    return false // Placeholder
  }

  private calculateMonthlySeasonality(data: any[], dataType: string): SeasonalAnalysis['seasonality'] {
    const monthlyData = new Array(12).fill(0).map(() => ({ values: [] as number[], confidence: 0 }))
    
    data.forEach(item => {
      const date = new Date(item.competencia || item.data_emissao || item.created_at)
      const month = date.getMonth()
      const value = item.valor_total || 0
      
      if (monthlyData[month]) {
        monthlyData[month].values.push(value)
      }
    })

    return monthlyData.map((monthData, month) => {
      const average = monthData.values.length > 0 
        ? monthData.values.reduce((a, b) => a + b, 0) / monthData.values.length 
        : 0
      
      const overallAverage = data.reduce((sum, item) => sum + (item.valor_total || 0), 0) / data.length
      const factor = overallAverage > 0 ? average / overallAverage : 1
      const confidence = Math.min(monthData.values.length / 3, 1) // Confiança baseada na quantidade de dados

      return {
        month: month + 1,
        factor,
        confidence
      }
    })
  }

  private identifyPeakPeriods(seasonality: SeasonalAnalysis['seasonality']): SeasonalAnalysis['peakPeriods'] {
    const peaks = []
    const threshold = 1.2 // 20% acima da média

    let currentPeak: { start: number; end: number; intensity: number } | null = null

    seasonality.forEach((season, index) => {
      if (season.factor > threshold && season.confidence > 0.5) {
        if (!currentPeak) {
          currentPeak = { start: index + 1, end: index + 1, intensity: season.factor }
        } else {
          currentPeak.end = index + 1
          currentPeak.intensity = Math.max(currentPeak.intensity, season.factor)
        }
      } else if (currentPeak) {
        peaks.push({
          start: this.getMonthName(currentPeak.start),
          end: this.getMonthName(currentPeak.end),
          intensity: currentPeak.intensity
        })
        currentPeak = null
      }
    })

    // Adicionar último pico se existir
    if (currentPeak && typeof currentPeak === 'object' && 'start' in currentPeak && 'end' in currentPeak && 'intensity' in currentPeak) {
      const peak = currentPeak as { start: number; end: number; intensity: number }
      peaks.push({
        start: this.getMonthName(peak.start),
        end: this.getMonthName(peak.end),
        intensity: peak.intensity
      })
    }

    return peaks
  }

  private getMonthName(month: number): string {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return months[month - 1] || 'Mês inválido'
  }

  private generateSeasonalRecommendations(
    pattern: SeasonalAnalysis['pattern'],
    seasonality: SeasonalAnalysis['seasonality'],
    peakPeriods: SeasonalAnalysis['peakPeriods']
  ): SeasonalAnalysis['recommendations'] {
    const recommendations = {
      cashFlow: [] as string[],
      taxPlanning: [] as string[],
      compliance: [] as string[]
    }

    if (pattern === 'seasonal' && peakPeriods.length > 0) {
      recommendations.cashFlow.push('Preparar reserva de caixa para períodos de baixa receita')
      recommendations.taxPlanning.push('Planejar recolhimento de impostos considerando sazonalidade')
      
      peakPeriods.forEach(peak => {
        recommendations.compliance.push(`Atenção especial às obrigações durante ${peak.start}-${peak.end}`)
      })
    }

    if (pattern === 'irregular') {
      recommendations.cashFlow.push('Manter reserva de emergência maior devido à irregularidade')
      recommendations.taxPlanning.push('Considerar regime de caixa para melhor controle')
    }

    return recommendations
  }

  private async compareRegimes(
    projectedRevenue: number,
    businessData: any,
    currentRegime: string
  ): Promise<any[]> {
    const regimes = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']
    const comparisons = []

    for (const regime of regimes) {
      if (this.isRegimeApplicable(regime, projectedRevenue, businessData)) {
        const taxes = this.calculateTaxesByRegime(projectedRevenue, regime)
        comparisons.push({
          regime,
          totalTax: taxes.total,
          effectiveRate: taxes.total / projectedRevenue,
          applicable: true,
          restrictions: this.getRegimeRestrictions(regime, businessData)
        })
      }
    }

    return comparisons
  }

  private isRegimeApplicable(regime: string, revenue: number, businessData: any): boolean {
    switch (regime) {
      case 'MEI':
        return revenue <= 81000 && businessData.employees === 0
      case 'Simples Nacional':
        return revenue <= 4800000
      case 'Lucro Presumido':
        return revenue <= 78000000
      case 'Lucro Real':
        return true // Sempre aplicável
      default:
        return false
    }
  }

  private findOptimalRegime(comparisons: any[]): { regime: string; factors: string[]; risks: string[] } {
    const optimal = comparisons.reduce((best, current) => 
      current.totalTax < best.totalTax ? current : best
    )

    return {
      regime: optimal.regime,
      factors: [`Menor carga tributária: ${(optimal.effectiveRate * 100).toFixed(2)}%`],
      risks: optimal.restrictions || []
    }
  }

  private calculatePotentialSavings(
    comparisons: any[],
    currentRegime: string,
    recommendedRegime: string
  ): number {
    const current = comparisons.find(c => c.regime === currentRegime)
    const recommended = comparisons.find(c => c.regime === recommendedRegime)
    
    if (!current || !recommended) return 0
    
    return Math.max(0, current.totalTax - recommended.totalTax)
  }

  private generateMigrationPlan(
    fromRegime: string,
    toRegime: string,
    businessData: any
  ): any {
    return {
      steps: [
        'Analisar viabilidade da mudança',
        'Preparar documentação necessária',
        'Solicitar alteração junto aos órgãos competentes',
        'Ajustar processos internos',
        'Monitorar primeiros meses'
      ],
      timeline: '3-6 meses',
      requirements: this.getMigrationRequirements(fromRegime, toRegime),
      risks: this.getMigrationRisks(fromRegime, toRegime)
    }
  }

  private getRegimeRestrictions(regime: string, businessData: any): string[] {
    const restrictions: Record<string, string[]> = {
      'MEI': ['Máximo 1 funcionário', 'Atividades específicas permitidas'],
      'Simples Nacional': ['Limite de faturamento', 'Restrições por atividade'],
      'Lucro Presumido': ['Margem de lucro presumida', 'Limitações de dedução'],
      'Lucro Real': ['Complexidade contábil', 'Maior controle fiscal']
    }

    return restrictions[regime] || []
  }

  private getMigrationRequirements(fromRegime: string, toRegime: string): string[] {
    return [
      'Regularidade fiscal',
      'Documentação contábil atualizada',
      'Análise de viabilidade',
      'Aprovação dos sócios'
    ]
  }

  private getMigrationRisks(fromRegime: string, toRegime: string): string[] {
    return [
      'Aumento temporário da carga tributária',
      'Complexidade adicional',
      'Necessidade de adaptação de processos'
    ]
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStatistics() {
    return {
      predictionsGenerated: this.predictionCache.size,
      averageAccuracy: Array.from(this.modelAccuracy.values()).reduce((a, b) => a + b, 0) / this.modelAccuracy.size || 0,
      cacheHitRate: 0.75 // Placeholder
    }
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    this.predictionCache.clear()
    this.modelAccuracy.clear()
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const predictiveAnalyticsFiscalService = new PredictiveAnalyticsFiscalService()
