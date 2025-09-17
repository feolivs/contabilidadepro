'use client'

import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA ANOMALY DETECTION
// =====================================================

export interface ComplianceAnomaly {
  id: string
  type: 'fiscal' | 'trabalhista' | 'contabil' | 'regulatorio' | 'temporal'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  detectedAt: Date
  confidence: number // 0-1
  impact: {
    financial: number // Impacto financeiro estimado
    legal: number // Risco legal (0-100)
    operational: number // Impacto operacional (0-100)
  }
  evidence: AnomalyEvidence[]
  recommendations: AnomalyRecommendation[]
  status: 'detected' | 'investigating' | 'resolved' | 'false_positive'
  context: {
    empresaId: string
    periodo: string
    dataSource: string[]
    relatedEntities: string[]
  }
  metadata: {
    detectionModel: string
    threshold: number
    historicalComparison: boolean
    peerComparison: boolean
  }
}

export interface AnomalyEvidence {
  type: 'statistical' | 'pattern' | 'rule_violation' | 'temporal' | 'comparative'
  description: string
  value: number
  expectedRange: { min: number; max: number }
  deviation: number
  significance: number
  dataPoints: any[]
}

export interface AnomalyRecommendation {
  priority: 'immediate' | 'short_term' | 'medium_term' | 'monitoring'
  action: string
  description: string
  estimatedEffort: string
  expectedOutcome: string
  resources: string[]
  deadline?: Date
}

export interface DetectionRule {
  id: string
  name: string
  category: 'fiscal' | 'trabalhista' | 'contabil' | 'regulatorio'
  description: string
  condition: (data: any) => boolean
  threshold: number
  severity: ComplianceAnomaly['severity']
  enabled: boolean
  lastUpdated: Date
}

export interface AnomalyPattern {
  id: string
  name: string
  description: string
  indicators: string[]
  frequency: number
  confidence: number
  examples: string[]
  mitigation: string[]
}

export interface ComplianceBaseline {
  empresaId: string
  regimeTributario: string
  porte: string
  setor: string
  metrics: {
    [key: string]: {
      mean: number
      stdDev: number
      min: number
      max: number
      trend: 'increasing' | 'decreasing' | 'stable'
      seasonality?: number[]
    }
  }
  lastUpdate: Date
  dataPoints: number
}

// =====================================================
// ANOMALY DETECTION SERVICE
// =====================================================

export class AnomalyDetectionComplianceService {
  private detectionRules: DetectionRule[] = []
  private knownPatterns: AnomalyPattern[] = []
  private complianceBaselines = new Map<string, ComplianceBaseline>()
  private detectedAnomalies = new Map<string, ComplianceAnomaly[]>()
  private readonly CONFIDENCE_THRESHOLD = 0.7
  private readonly STATISTICAL_THRESHOLD = 2.5 // Desvios padrão

  constructor() {
    this.initializeDetectionRules()
    this.initializeKnownPatterns()
  }

  /**
   * Detecta anomalias em dados de compliance
   */
  async detectAnomalies(
    empresaId: string,
    contextData: {
      empresa: any
      calculos: any[]
      obrigacoes: any[]
      documentos: any[]
      historico?: any[]
    }
  ): Promise<Result<ComplianceAnomaly[], ContextError>> {
    const operationContext = createOperationContext('detect_anomalies', 'system', {
      empresaId
    })

    return await measureOperation('detectAnomalies', async () => {
      try {
        const anomalies: ComplianceAnomaly[] = []

        // Obter ou criar baseline para a empresa
        const baseline = await this.getOrCreateBaseline(empresaId, contextData)

        // Detectar anomalias estatísticas
        const statisticalAnomalies = this.detectStatisticalAnomalies(contextData, baseline)
        anomalies.push(...statisticalAnomalies)

        // Detectar violações de regras
        const ruleViolations = this.detectRuleViolations(contextData)
        anomalies.push(...ruleViolations)

        // Detectar padrões suspeitos
        const patternAnomalies = this.detectPatternAnomalies(contextData)
        anomalies.push(...patternAnomalies)

        // Detectar anomalias temporais
        const temporalAnomalies = this.detectTemporalAnomalies(contextData)
        anomalies.push(...temporalAnomalies)

        // Detectar anomalias comparativas (peer comparison)
        const comparativeAnomalies = await this.detectComparativeAnomalies(contextData, baseline)
        anomalies.push(...comparativeAnomalies)

        // Filtrar por confiança e relevância
        const filteredAnomalies = anomalies
          .filter(anomaly => anomaly.confidence >= this.CONFIDENCE_THRESHOLD)
          .sort((a, b) => {
            // Ordenar por severidade e confiança
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
            const aSeverity = severityOrder[a.severity]
            const bSeverity = severityOrder[b.severity]
            
            if (aSeverity !== bSeverity) return aSeverity - bSeverity
            return b.confidence - a.confidence
          })

        // Armazenar anomalias detectadas
        this.detectedAnomalies.set(empresaId, filteredAnomalies)

        // Atualizar baseline com novos dados
        await this.updateBaseline(baseline, contextData)

        logger.info('Anomaly detection completed', {
          empresaId,
          totalAnomalies: filteredAnomalies.length,
          criticalAnomalies: filteredAnomalies.filter(a => a.severity === 'critical').length,
          highAnomalies: filteredAnomalies.filter(a => a.severity === 'high').length,
          traceId: operationContext.traceId
        })

        return { success: true, data: filteredAnomalies }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to detect anomalies',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { empresaId },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        logger.error('Anomaly detection failed', {
          error: contextError.toJSON(),
          empresaId,
          traceId: operationContext.traceId
        })

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Analisa tendências de anomalias
   */
  async analyzeAnomalyTrends(
    empresaId: string,
    timeframe: 'last_month' | 'last_quarter' | 'last_year' = 'last_quarter'
  ): Promise<Result<{
    trends: {
      type: string
      frequency: number
      severity: string
      trend: 'increasing' | 'decreasing' | 'stable'
    }[]
    patterns: {
      pattern: string
      occurrences: number
      lastSeen: Date
      riskLevel: number
    }[]
    recommendations: string[]
  }, ContextError>> {
    const operationContext = createOperationContext('analyze_anomaly_trends', 'system', {
      empresaId,
      timeframe
    })

    return await measureOperation('analyzeAnomalyTrends', async () => {
      try {
        const historicalAnomalies = await this.getHistoricalAnomalies(empresaId, timeframe)
        
        // Analisar tendências por tipo
        const trends = this.analyzeTrendsByType(historicalAnomalies)
        
        // Identificar padrões recorrentes
        const patterns = this.identifyRecurringPatterns(historicalAnomalies)
        
        // Gerar recomendações baseadas nas tendências
        const recommendations = this.generateTrendRecommendations(trends, patterns)

        return {
          success: true,
          data: {
            trends,
            patterns,
            recommendations
          }
        }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to analyze anomaly trends',
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
   * Valida se uma anomalia é um falso positivo
   */
  async validateAnomaly(
    anomalyId: string,
    validationData: {
      userFeedback?: 'true_positive' | 'false_positive' | 'uncertain'
      additionalContext?: any
      expertReview?: boolean
    }
  ): Promise<Result<{
    isValid: boolean
    confidence: number
    reasoning: string
    updatedRecommendations?: AnomalyRecommendation[]
  }, ContextError>> {
    const operationContext = createOperationContext('validate_anomaly', 'system', {
      anomalyId
    })

    return await measureOperation('validateAnomaly', async () => {
      try {
        // Encontrar a anomalia
        const anomaly = this.findAnomalyById(anomalyId)
        if (!anomaly) {
          return {
            success: false,
            error: new ContextErrorClass(
              'Anomaly not found',
              ERROR_CODES.VALIDATION_FAILED,
              { anomalyId }
            )
          }
        }

        // Validar usando múltiplos critérios
        const validation = this.performAnomalyValidation(anomaly, validationData)
        
        // Atualizar status da anomalia
        if (validation.isValid) {
          anomaly.status = 'investigating'
        } else {
          anomaly.status = 'false_positive'
        }

        // Aprender com o feedback para melhorar detecção futura
        this.learnFromValidation(anomaly, validationData, validation)

        return { success: true, data: validation }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to validate anomaly',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { anomalyId },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Métodos privados para detecção
   */
  private detectStatisticalAnomalies(
    contextData: any,
    baseline: ComplianceBaseline
  ): ComplianceAnomaly[] {
    const anomalies: ComplianceAnomaly[] = []

    // Analisar valores de impostos
    if (contextData.calculos && contextData.calculos.length > 0) {
      const currentTaxes = contextData.calculos.map((c: any) => c.valor_total || 0)
      const avgTax = currentTaxes.reduce((a: number, b: number) => a + b, 0) / currentTaxes.length

      const taxBaseline = baseline.metrics['tax_amount']
      if (taxBaseline) {
        const zScore = Math.abs(avgTax - taxBaseline.mean) / taxBaseline.stdDev
        
        if (zScore > this.STATISTICAL_THRESHOLD) {
          anomalies.push(this.createStatisticalAnomaly(
            'fiscal',
            'Valor de impostos fora do padrão',
            `Valor médio de impostos (R$ ${avgTax.toFixed(2)}) está ${zScore.toFixed(1)} desvios padrão da média histórica`,
            avgTax,
            { min: taxBaseline.mean - 2 * taxBaseline.stdDev, max: taxBaseline.mean + 2 * taxBaseline.stdDev },
            zScore,
            contextData.empresa.id
          ))
        }
      }
    }

    // Analisar frequência de obrigações
    if (contextData.obrigacoes) {
      const pendingObligations = contextData.obrigacoes.filter((o: any) => o.status === 'pendente').length
      const obligationBaseline = baseline.metrics['pending_obligations']
      
      if (obligationBaseline) {
        const zScore = Math.abs(pendingObligations - obligationBaseline.mean) / obligationBaseline.stdDev
        
        if (zScore > this.STATISTICAL_THRESHOLD) {
          anomalies.push(this.createStatisticalAnomaly(
            'regulatorio',
            'Número anômalo de obrigações pendentes',
            `${pendingObligations} obrigações pendentes está fora do padrão histórico`,
            pendingObligations,
            { min: 0, max: obligationBaseline.mean + 2 * obligationBaseline.stdDev },
            zScore,
            contextData.empresa.id
          ))
        }
      }
    }

    return anomalies
  }

  private detectRuleViolations(contextData: any): ComplianceAnomaly[] {
    const anomalies: ComplianceAnomaly[] = []

    for (const rule of this.detectionRules.filter(r => r.enabled)) {
      try {
        if (rule.condition(contextData)) {
          anomalies.push({
            id: `rule-violation-${rule.id}-${Date.now()}`,
            type: rule.category,
            severity: rule.severity,
            title: `Violação: ${rule.name}`,
            description: rule.description,
            detectedAt: new Date(),
            confidence: 0.9, // Regras têm alta confiança
            impact: this.calculateRuleViolationImpact(rule),
            evidence: [{
              type: 'rule_violation',
              description: `Regra ${rule.name} foi violada`,
              value: 1,
              expectedRange: { min: 0, max: 0 },
              deviation: 1,
              significance: 1,
              dataPoints: []
            }],
            recommendations: this.generateRuleViolationRecommendations(rule),
            status: 'detected',
            context: {
              empresaId: contextData.empresa?.id || '',
              periodo: new Date().toISOString().slice(0, 7),
              dataSource: ['rule_engine'],
              relatedEntities: []
            },
            metadata: {
              detectionModel: 'rule_based',
              threshold: rule.threshold,
              historicalComparison: false,
              peerComparison: false
            }
          })
        }
      } catch (error) {
        logger.warn('Rule evaluation failed', {
          ruleId: rule.id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    return anomalies
  }

  private detectPatternAnomalies(contextData: any): ComplianceAnomaly[] {
    const anomalies: ComplianceAnomaly[] = []

    for (const pattern of this.knownPatterns) {
      const matches = this.evaluatePattern(pattern, contextData)
      
      if (matches.confidence > this.CONFIDENCE_THRESHOLD) {
        anomalies.push({
          id: `pattern-${pattern.id}-${Date.now()}`,
          type: 'contabil',
          severity: this.calculatePatternSeverity(pattern, matches),
          title: `Padrão suspeito: ${pattern.name}`,
          description: `${pattern.description}. Confiança: ${(matches.confidence * 100).toFixed(1)}%`,
          detectedAt: new Date(),
          confidence: matches.confidence,
          impact: this.calculatePatternImpact(pattern),
          evidence: [{
            type: 'pattern',
            description: `Padrão ${pattern.name} detectado`,
            value: matches.confidence,
            expectedRange: { min: 0, max: this.CONFIDENCE_THRESHOLD },
            deviation: matches.confidence - this.CONFIDENCE_THRESHOLD,
            significance: matches.confidence,
            dataPoints: matches.indicators
          }],
          recommendations: pattern.mitigation.map(m => ({
            priority: 'short_term' as const,
            action: m,
            description: `Implementar: ${m}`,
            estimatedEffort: '1-2 semanas',
            expectedOutcome: 'Redução do risco identificado',
            resources: ['Equipe contábil', 'Sistema']
          })),
          status: 'detected',
          context: {
            empresaId: contextData.empresa?.id || '',
            periodo: new Date().toISOString().slice(0, 7),
            dataSource: ['pattern_analysis'],
            relatedEntities: matches.relatedEntities
          },
          metadata: {
            detectionModel: 'pattern_matching',
            threshold: this.CONFIDENCE_THRESHOLD,
            historicalComparison: true,
            peerComparison: false
          }
        })
      }
    }

    return anomalies
  }

  private detectTemporalAnomalies(contextData: any): ComplianceAnomaly[] {
    const anomalies: ComplianceAnomaly[] = []

    // Detectar atrasos em obrigações
    if (contextData.obrigacoes) {
      const now = new Date()
      const overdueObligations = contextData.obrigacoes.filter((o: any) => {
        const dueDate = new Date(o.data_vencimento)
        return dueDate < now && o.status !== 'cumprida'
      })

      if (overdueObligations.length > 0) {
        const avgDelay = overdueObligations.reduce((sum: number, o: any) => {
          const delay = Math.floor((now.getTime() - new Date(o.data_vencimento).getTime()) / (24 * 60 * 60 * 1000))
          return sum + delay
        }, 0) / overdueObligations.length

        anomalies.push({
          id: `temporal-overdue-${Date.now()}`,
          type: 'temporal',
          severity: avgDelay > 30 ? 'critical' : avgDelay > 15 ? 'high' : 'medium',
          title: 'Obrigações em atraso',
          description: `${overdueObligations.length} obrigação(ões) em atraso com média de ${avgDelay.toFixed(0)} dias`,
          detectedAt: new Date(),
          confidence: 1.0,
          impact: {
            financial: overdueObligations.length * 1000, // Estimativa de multa
            legal: Math.min(avgDelay * 2, 100),
            operational: Math.min(overdueObligations.length * 10, 100)
          },
          evidence: [{
            type: 'temporal',
            description: 'Obrigações vencidas detectadas',
            value: overdueObligations.length,
            expectedRange: { min: 0, max: 0 },
            deviation: overdueObligations.length,
            significance: 1,
            dataPoints: overdueObligations
          }],
          recommendations: [{
            priority: 'immediate',
            action: 'Regularizar obrigações em atraso',
            description: 'Cumprir imediatamente as obrigações vencidas para evitar penalidades',
            estimatedEffort: '1-3 dias',
            expectedOutcome: 'Redução de riscos legais e financeiros',
            resources: ['Equipe contábil', 'Documentação'],
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 dias
          }],
          status: 'detected',
          context: {
            empresaId: contextData.empresa?.id || '',
            periodo: new Date().toISOString().slice(0, 7),
            dataSource: ['temporal_analysis'],
            relatedEntities: overdueObligations.map((o: any) => o.id)
          },
          metadata: {
            detectionModel: 'temporal_analysis',
            threshold: 0,
            historicalComparison: false,
            peerComparison: false
          }
        })
      }
    }

    return anomalies
  }

  private async detectComparativeAnomalies(
    contextData: any,
    baseline: ComplianceBaseline
  ): Promise<ComplianceAnomaly[]> {
    const anomalies: ComplianceAnomaly[] = []

    // Comparar com empresas similares (peer comparison)
    const peerBaselines = await this.getPeerBaselines(baseline)
    
    if (peerBaselines.length > 0) {
      // Comparar carga tributária
      if (contextData.calculos && contextData.calculos.length > 0) {
        const currentTaxRate = this.calculateEffectiveTaxRate(contextData)
        const peerAvgTaxRate = peerBaselines.reduce((sum, peer) => 
          sum + (peer.metrics['effective_tax_rate']?.mean || 0), 0) / peerBaselines.length

        const deviation = Math.abs(currentTaxRate - peerAvgTaxRate) / peerAvgTaxRate

        if (deviation > 0.3) { // 30% de desvio
          anomalies.push({
            id: `comparative-tax-rate-${Date.now()}`,
            type: 'fiscal',
            severity: deviation > 0.5 ? 'high' : 'medium',
            title: 'Carga tributária fora do padrão do setor',
            description: `Carga tributária efetiva (${(currentTaxRate * 100).toFixed(1)}%) difere significativamente da média do setor (${(peerAvgTaxRate * 100).toFixed(1)}%)`,
            detectedAt: new Date(),
            confidence: 0.8,
            impact: {
              financial: Math.abs(currentTaxRate - peerAvgTaxRate) * 100000, // Estimativa
              legal: 20,
              operational: 30
            },
            evidence: [{
              type: 'comparative',
              description: 'Comparação com empresas similares',
              value: currentTaxRate,
              expectedRange: { 
                min: peerAvgTaxRate * 0.8, 
                max: peerAvgTaxRate * 1.2 
              },
              deviation,
              significance: 0.8,
              dataPoints: peerBaselines.map(p => p.metrics['effective_tax_rate']?.mean || 0)
            }],
            recommendations: [{
              priority: 'medium_term',
              action: 'Revisar estratégia tributária',
              description: 'Analisar oportunidades de otimização tributária baseado em benchmarks do setor',
              estimatedEffort: '2-4 semanas',
              expectedOutcome: 'Alinhamento com padrões do setor',
              resources: ['Consultor tributário', 'Análise comparativa']
            }],
            status: 'detected',
            context: {
              empresaId: contextData.empresa?.id || '',
              periodo: new Date().toISOString().slice(0, 7),
              dataSource: ['peer_comparison'],
              relatedEntities: []
            },
            metadata: {
              detectionModel: 'peer_comparison',
              threshold: 0.3,
              historicalComparison: false,
              peerComparison: true
            }
          })
        }
      }
    }

    return anomalies
  }

  private async getOrCreateBaseline(empresaId: string, contextData: any): Promise<ComplianceBaseline> {
    let baseline = this.complianceBaselines.get(empresaId)
    
    if (!baseline) {
      // Carregar do cache
      baseline = await unifiedCacheService.get<ComplianceBaseline>(
        `baseline:${empresaId}`,
        'compliance-baselines'
      ) || undefined
      
      if (!baseline) {
        // Criar novo baseline
        baseline = this.createInitialBaseline(empresaId, contextData)
      }
      
      this.complianceBaselines.set(empresaId, baseline)
    }
    
    return baseline
  }

  private createInitialBaseline(empresaId: string, contextData: any): ComplianceBaseline {
    const baseline: ComplianceBaseline = {
      empresaId,
      regimeTributario: contextData.empresa?.regime_tributario || 'Simples Nacional',
      porte: this.determineCompanySize(contextData.empresa),
      setor: contextData.empresa?.atividade_principal || 'Geral',
      metrics: {},
      lastUpdate: new Date(),
      dataPoints: 0
    }

    // Inicializar métricas básicas
    if (contextData.calculos && contextData.calculos.length > 0) {
      const taxValues = contextData.calculos.map((c: any) => c.valor_total || 0)
      baseline.metrics['tax_amount'] = this.calculateMetricStats(taxValues)
    }

    if (contextData.obrigacoes) {
      const pendingCount = contextData.obrigacoes.filter((o: any) => o.status === 'pendente').length
      baseline.metrics['pending_obligations'] = this.calculateMetricStats([pendingCount])
    }

    return baseline
  }

  private calculateMetricStats(values: number[]): ComplianceBaseline['metrics'][string] {
    if (values.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0, trend: 'stable' }
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    return {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      trend: 'stable' // Seria calculado com dados históricos
    }
  }

  private createStatisticalAnomaly(
    type: ComplianceAnomaly['type'],
    title: string,
    description: string,
    value: number,
    expectedRange: { min: number; max: number },
    zScore: number,
    empresaId: string
  ): ComplianceAnomaly {
    return {
      id: `statistical-${type}-${Date.now()}`,
      type,
      severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
      title,
      description,
      detectedAt: new Date(),
      confidence: Math.min(zScore / 5, 1), // Normalizar z-score para confiança
      impact: {
        financial: Math.abs(value - (expectedRange.min + expectedRange.max) / 2),
        legal: Math.min(zScore * 10, 100),
        operational: Math.min(zScore * 15, 100)
      },
      evidence: [{
        type: 'statistical',
        description: 'Análise estatística dos dados históricos',
        value,
        expectedRange,
        deviation: zScore,
        significance: Math.min(zScore / 3, 1),
        dataPoints: []
      }],
      recommendations: [{
        priority: zScore > 3 ? 'immediate' : 'short_term',
        action: 'Investigar causa da anomalia',
        description: 'Analisar os fatores que levaram a este desvio estatístico',
        estimatedEffort: '1-2 dias',
        expectedOutcome: 'Identificação da causa raiz',
        resources: ['Equipe de análise', 'Dados históricos']
      }],
      status: 'detected',
      context: {
        empresaId,
        periodo: new Date().toISOString().slice(0, 7),
        dataSource: ['statistical_analysis'],
        relatedEntities: []
      },
      metadata: {
        detectionModel: 'statistical',
        threshold: this.STATISTICAL_THRESHOLD,
        historicalComparison: true,
        peerComparison: false
      }
    }
  }

  private initializeDetectionRules(): void {
    this.detectionRules = [
      {
        id: 'high-tax-burden',
        name: 'Carga tributária elevada',
        category: 'fiscal',
        description: 'Detecta quando a carga tributária está acima de 20%',
        condition: (data) => {
          if (!data.calculos || data.calculos.length === 0) return false
          const totalTax = data.calculos.reduce((sum: number, c: any) => sum + (c.valor_total || 0), 0)
          const revenue = data.empresa?.receita_anual || 1
          return (totalTax / revenue) > 0.2
        },
        threshold: 0.2,
        severity: 'high',
        enabled: true,
        lastUpdated: new Date()
      },
      {
        id: 'missing-obligations',
        name: 'Obrigações não cumpridas',
        category: 'regulatorio',
        description: 'Detecta obrigações fiscais não cumpridas há mais de 30 dias',
        condition: (data) => {
          if (!data.obrigacoes) return false
          const now = new Date()
          return data.obrigacoes.some((o: any) => {
            const dueDate = new Date(o.data_vencimento)
            const daysDiff = (now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)
            return daysDiff > 30 && o.status !== 'cumprida'
          })
        },
        threshold: 30,
        severity: 'critical',
        enabled: true,
        lastUpdated: new Date()
      }
    ]
  }

  private initializeKnownPatterns(): void {
    this.knownPatterns = [
      {
        id: 'round-number-pattern',
        name: 'Valores arredondados suspeitos',
        description: 'Muitos valores exatamente arredondados podem indicar estimativas ou manipulação',
        indicators: ['valores_arredondados', 'frequencia_alta'],
        frequency: 0.1,
        confidence: 0.7,
        examples: ['R$ 1.000,00', 'R$ 5.000,00', 'R$ 10.000,00'],
        mitigation: [
          'Revisar documentação de suporte',
          'Verificar cálculos detalhados',
          'Implementar controles de validação'
        ]
      },
      {
        id: 'seasonal-inconsistency',
        name: 'Inconsistência sazonal',
        description: 'Padrões que não seguem a sazonalidade típica do setor',
        indicators: ['sazonalidade_atipica', 'desvio_setor'],
        frequency: 0.05,
        confidence: 0.8,
        examples: ['Vendas altas em período de baixa do setor'],
        mitigation: [
          'Analisar fatores externos',
          'Verificar estratégias de marketing',
          'Comparar com concorrentes'
        ]
      }
    ]
  }

  private calculateRuleViolationImpact(rule: DetectionRule): ComplianceAnomaly['impact'] {
    const baseImpact = {
      fiscal: { financial: 5000, legal: 60, operational: 40 },
      trabalhista: { financial: 10000, legal: 80, operational: 60 },
      contabil: { financial: 2000, legal: 40, operational: 30 },
      regulatorio: { financial: 15000, legal: 90, operational: 70 }
    }

    return baseImpact[rule.category] || { financial: 1000, legal: 30, operational: 20 }
  }

  private generateRuleViolationRecommendations(rule: DetectionRule): AnomalyRecommendation[] {
    const baseRecommendations: Record<string, AnomalyRecommendation[]> = {
      'high-tax-burden': [{
        priority: 'short_term',
        action: 'Revisar regime tributário',
        description: 'Analisar se o regime atual é o mais vantajoso',
        estimatedEffort: '1-2 semanas',
        expectedOutcome: 'Possível redução da carga tributária',
        resources: ['Consultor tributário', 'Análise comparativa']
      }],
      'missing-obligations': [{
        priority: 'immediate',
        action: 'Cumprir obrigações pendentes',
        description: 'Regularizar imediatamente as obrigações em atraso',
        estimatedEffort: '1-3 dias',
        expectedOutcome: 'Regularização fiscal',
        resources: ['Equipe contábil', 'Documentação']
      }]
    }

    return baseRecommendations[rule.id] || [{
      priority: 'short_term',
      action: 'Investigar violação',
      description: 'Analisar e corrigir a violação detectada',
      estimatedEffort: '1 semana',
      expectedOutcome: 'Conformidade restaurada',
      resources: ['Equipe responsável']
    }]
  }

  private evaluatePattern(pattern: AnomalyPattern, contextData: any): {
    confidence: number
    indicators: any[]
    relatedEntities: string[]
  } {
    // Implementação simplificada de avaliação de padrões
    let confidence = 0
    const indicators: any[] = []
    const relatedEntities: string[] = []

    if (pattern.id === 'round-number-pattern' && contextData.calculos) {
      const roundNumbers = contextData.calculos.filter((c: any) => {
        const value = c.valor_total || 0
        return value > 0 && value % 1000 === 0
      })

      if (roundNumbers.length > contextData.calculos.length * 0.5) {
        confidence = 0.8
        indicators.push(...roundNumbers)
        relatedEntities.push(...roundNumbers.map((r: any) => r.id))
      }
    }

    return { confidence, indicators, relatedEntities }
  }

  private calculatePatternSeverity(pattern: AnomalyPattern, matches: any): ComplianceAnomaly['severity'] {
    if (matches.confidence > 0.9) return 'high'
    if (matches.confidence > 0.8) return 'medium'
    return 'low'
  }

  private calculatePatternImpact(pattern: AnomalyPattern): ComplianceAnomaly['impact'] {
    // Impacto baseado no tipo de padrão
    const impacts: Record<string, ComplianceAnomaly['impact']> = {
      'round-number-pattern': { financial: 2000, legal: 30, operational: 20 },
      'seasonal-inconsistency': { financial: 5000, legal: 40, operational: 30 }
    }

    return impacts[pattern.id] || { financial: 1000, legal: 20, operational: 15 }
  }

  private calculateEffectiveTaxRate(contextData: any): number {
    if (!contextData.calculos || contextData.calculos.length === 0) return 0
    
    const totalTax = contextData.calculos.reduce((sum: number, c: any) => sum + (c.valor_total || 0), 0)
    const revenue = contextData.empresa?.receita_anual || 1
    
    return totalTax / revenue
  }

  private async getPeerBaselines(baseline: ComplianceBaseline): Promise<ComplianceBaseline[]> {
    // Implementação simplificada - em produção buscaria do banco de dados
    return []
  }

  private determineCompanySize(empresa: any): string {
    const revenue = empresa?.receita_anual || 0
    
    if (revenue <= 81000) return 'mei'
    if (revenue <= 4800000) return 'pequena'
    if (revenue <= 300000000) return 'media'
    return 'grande'
  }

  private async updateBaseline(baseline: ComplianceBaseline, contextData: any): Promise<void> {
    baseline.lastUpdate = new Date()
    baseline.dataPoints++
    
    // Salvar baseline atualizado
    await unifiedCacheService.set(`baseline:${baseline.empresaId}`, baseline, 'compliance-baselines')
    this.complianceBaselines.set(baseline.empresaId, baseline)
  }

  private async getHistoricalAnomalies(empresaId: string, timeframe: string): Promise<ComplianceAnomaly[]> {
    // Implementação simplificada - retornar anomalias armazenadas
    return this.detectedAnomalies.get(empresaId) || []
  }

  private analyzeTrendsByType(anomalies: ComplianceAnomaly[]): any[] {
    const typeGroups = anomalies.reduce((groups, anomaly) => {
      const key = `${anomaly.type}-${anomaly.severity}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(anomaly)
      return groups
    }, {} as Record<string, ComplianceAnomaly[]>)

    return Object.entries(typeGroups).map(([key, group]) => {
      const [type, severity] = key.split('-')
      return {
        type,
        frequency: group.length,
        severity,
        trend: 'stable' as const // Simplificado
      }
    })
  }

  private identifyRecurringPatterns(anomalies: ComplianceAnomaly[]): any[] {
    // Implementação simplificada
    return []
  }

  private generateTrendRecommendations(trends: any[], patterns: any[]): string[] {
    const recommendations = []
    
    if (trends.some(t => t.frequency > 5)) {
      recommendations.push('Implementar monitoramento proativo para anomalias recorrentes')
    }
    
    if (trends.some(t => t.severity === 'critical')) {
      recommendations.push('Revisar processos de compliance para prevenir anomalias críticas')
    }
    
    return recommendations
  }

  private findAnomalyById(anomalyId: string): ComplianceAnomaly | null {
    for (const anomalies of this.detectedAnomalies.values()) {
      const found = anomalies.find(a => a.id === anomalyId)
      if (found) return found
    }
    return null
  }

  private performAnomalyValidation(anomaly: ComplianceAnomaly, validationData: any): {
    isValid: boolean
    confidence: number
    reasoning: string
    updatedRecommendations?: AnomalyRecommendation[]
  } {
    let confidence = anomaly.confidence
    let isValid = true
    let reasoning = 'Anomalia confirmada pelos critérios de detecção'

    // Ajustar baseado no feedback do usuário
    if (validationData.userFeedback === 'false_positive') {
      confidence *= 0.3
      isValid = false
      reasoning = 'Marcada como falso positivo pelo usuário'
    } else if (validationData.userFeedback === 'true_positive') {
      confidence = Math.min(confidence * 1.2, 1)
      reasoning = 'Confirmada pelo usuário como anomalia válida'
    }

    // Ajustar baseado em revisão especializada
    if (validationData.expertReview) {
      confidence = Math.min(confidence * 1.1, 1)
      reasoning += ' - Revisada por especialista'
    }

    return {
      isValid: confidence > this.CONFIDENCE_THRESHOLD && isValid,
      confidence,
      reasoning
    }
  }

  private learnFromValidation(anomaly: ComplianceAnomaly, validationData: any, validation: any): void {
    // Implementar aprendizado para melhorar detecção futura
    // Por exemplo, ajustar thresholds de regras baseado no feedback
    
    if (validationData.userFeedback === 'false_positive') {
      // Reduzir sensibilidade para este tipo de anomalia
      const relatedRule = this.detectionRules.find(r => r.category === anomaly.type)
      if (relatedRule) {
        relatedRule.threshold *= 1.1 // Aumentar threshold para reduzir falsos positivos
      }
    }
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStatistics() {
    const totalAnomalies = Array.from(this.detectedAnomalies.values())
      .reduce((sum, anomalies) => sum + anomalies.length, 0)
    
    return {
      totalAnomaliesDetected: totalAnomalies,
      activeRules: this.detectionRules.filter(r => r.enabled).length,
      knownPatterns: this.knownPatterns.length,
      complianceBaselines: this.complianceBaselines.size,
      averageConfidence: 0.82 // Placeholder
    }
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    this.detectedAnomalies.clear()
    this.complianceBaselines.clear()
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const anomalyDetectionComplianceService = new AnomalyDetectionComplianceService()
