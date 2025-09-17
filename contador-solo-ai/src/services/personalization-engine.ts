'use client'

import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import { predictiveCacheService } from './predictive-cache-service'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA PERSONALIZATION ENGINE
// =====================================================

export interface UserProfile {
  userId: string
  demographics: {
    role: 'contador' | 'empresario' | 'gestor' | 'assistente'
    experience: 'iniciante' | 'intermediario' | 'avancado' | 'especialista'
    companySize: 'mei' | 'pequena' | 'media' | 'grande'
    industry: string
    location: {
      state: string
      city: string
    }
  }
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'tecnico' | 'didatico'
    detailLevel: 1 | 2 | 3 | 4 | 5 // 1=básico, 5=muito detalhado
    priorityAreas: string[]
    dashboardLayout: 'compact' | 'detailed' | 'visual' | 'custom'
    notificationFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly'
    language: 'pt-BR' | 'en-US'
  }
  behavior: {
    loginFrequency: number // vezes por semana
    averageSessionDuration: number // minutos
    mostUsedFeatures: string[]
    peakUsageHours: number[] // horas do dia
    preferredDevices: ('desktop' | 'mobile' | 'tablet')[]
    interactionPatterns: {
      feature: string
      frequency: number
      lastUsed: Date
    }[]
  }
  goals: {
    primary: string[]
    secondary: string[]
    timeline: 'short' | 'medium' | 'long'
  }
  learningStyle: {
    preferredContentType: 'text' | 'video' | 'interactive' | 'mixed'
    learningPace: 'slow' | 'normal' | 'fast'
    feedbackPreference: 'immediate' | 'summary' | 'minimal'
  }
}

export interface PersonalizationContext {
  userId: string
  currentSession: {
    device: string
    location?: string
    timeOfDay: number
    dayOfWeek: number
    sessionDuration: number
    featuresUsed: string[]
  }
  recentActivity: {
    actions: string[]
    timestamp: Date
    context: any
  }[]
  currentGoals: string[]
  urgentTasks: string[]
}

export interface PersonalizedExperience {
  dashboard: {
    layout: string
    widgets: PersonalizedWidget[]
    priorityOrder: string[]
    hiddenElements: string[]
  }
  content: {
    communicationTone: string
    detailLevel: number
    preferredFormats: string[]
    customizedMessages: Record<string, string>
  }
  features: {
    recommended: string[]
    hidden: string[]
    shortcuts: string[]
    automations: PersonalizedAutomation[]
  }
  notifications: {
    channels: string[]
    frequency: string
    customRules: NotificationRule[]
  }
  insights: {
    focusAreas: string[]
    analysisDepth: number
    reportingStyle: string
    kpiPreferences: string[]
  }
}

export interface PersonalizedWidget {
  id: string
  type: string
  title: string
  priority: number
  size: 'small' | 'medium' | 'large'
  position: { x: number; y: number }
  config: Record<string, any>
  relevanceScore: number
}

export interface PersonalizedAutomation {
  id: string
  name: string
  trigger: string
  action: string
  conditions: Record<string, any>
  enabled: boolean
  confidence: number
}

export interface NotificationRule {
  id: string
  condition: string
  channel: 'email' | 'push' | 'sms' | 'in-app'
  priority: 'low' | 'medium' | 'high' | 'critical'
  template: string
  enabled: boolean
}

export interface LearningInsight {
  userId: string
  insight: string
  confidence: number
  source: 'behavior' | 'feedback' | 'performance' | 'comparison'
  actionable: boolean
  recommendations: string[]
  timestamp: Date
}

// =====================================================
// PERSONALIZATION ENGINE SERVICE
// =====================================================

export class PersonalizationEngineService {
  private userProfiles = new Map<string, UserProfile>()
  private personalizationCache = new Map<string, PersonalizedExperience>()
  private learningInsights = new Map<string, LearningInsight[]>()
  private readonly PROFILE_UPDATE_THRESHOLD = 10 // Ações para atualizar perfil
  private readonly CACHE_TTL = 60 * 60 * 1000 // 1 hora

  /**
   * Obtém ou cria perfil do usuário
   */
  async getUserProfile(userId: string): Promise<Result<UserProfile, ContextError>> {
    const operationContext = createOperationContext('get_user_profile', userId)

    return await measureOperation('getUserProfile', async () => {
      try {
        // Verificar cache primeiro
        let profile = this.userProfiles.get(userId)
        
        if (!profile) {
          // Carregar do cache persistente
          const cachedProfile = await unifiedCacheService.get<UserProfile>(`profile:${userId}`, 'user-profiles')
          profile = cachedProfile || undefined

          if (!profile) {
            // Criar perfil inicial
            profile = await this.createInitialProfile(userId)
          }
          
          this.userProfiles.set(userId, profile)
        }

        return { success: true, data: profile }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to get user profile',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { userId },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Gera experiência personalizada para o usuário
   */
  async generatePersonalizedExperience(
    userId: string,
    context: PersonalizationContext
  ): Promise<Result<PersonalizedExperience, ContextError>> {
    const operationContext = createOperationContext('generate_personalized_experience', userId, {
      device: context.currentSession.device,
      timeOfDay: context.currentSession.timeOfDay
    })

    return await measureOperation('generatePersonalizedExperience', async () => {
      try {
        // Obter perfil do usuário
        const profileResult = await this.getUserProfile(userId)
        if (!profileResult.success) {
          return { success: false, error: profileResult.error }
        }

        const profile = profileResult.data

        // Verificar cache de personalização
        const cacheKey = this.generatePersonalizationCacheKey(userId, context)
        let experience = await unifiedCacheService.get<PersonalizedExperience>(
          cacheKey, 
          'personalized-experiences'
        )

        if (!experience) {
          // Gerar nova experiência personalizada
          experience = await this.buildPersonalizedExperience(profile, context)
          
          // Armazenar no cache
          await unifiedCacheService.set(cacheKey, experience, 'personalized-experiences')
        }

        // Registrar interação para aprendizado
        this.recordInteraction(userId, context)

        logger.info('Personalized experience generated', {
          userId,
          device: context.currentSession.device,
          widgetCount: experience.dashboard.widgets.length,
          recommendedFeatures: experience.features.recommended.length,
          traceId: operationContext.traceId
        })

        return { success: true, data: experience }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to generate personalized experience',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { userId, context },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Atualiza perfil baseado no comportamento
   */
  async updateProfileFromBehavior(
    userId: string,
    behaviorData: {
      action: string
      feature: string
      duration: number
      success: boolean
      context: any
    }
  ): Promise<Result<void, ContextError>> {
    const operationContext = createOperationContext('update_profile_from_behavior', userId)

    return await measureOperation('updateProfileFromBehavior', async () => {
      try {
        const profileResult = await this.getUserProfile(userId)
        if (!profileResult.success) {
          return { success: false, error: profileResult.error }
        }

        const profile = profileResult.data

        // Atualizar padrões de comportamento
        this.updateBehaviorPatterns(profile, behaviorData)
        
        // Atualizar preferências baseadas no uso
        this.updatePreferencesFromUsage(profile, behaviorData)
        
        // Identificar novos insights de aprendizado
        const insights = this.generateLearningInsights(profile, behaviorData)
        if (insights.length > 0) {
          const existingInsights = this.learningInsights.get(userId) || []
          this.learningInsights.set(userId, [...existingInsights, ...insights])
        }

        // Salvar perfil atualizado
        this.userProfiles.set(userId, profile)
        await unifiedCacheService.set(`profile:${userId}`, profile, 'user-profiles')

        // Invalidar cache de personalização
        await this.invalidatePersonalizationCache(userId)

        logger.debug('Profile updated from behavior', {
          userId,
          action: behaviorData.action,
          feature: behaviorData.feature,
          insightsGenerated: insights.length,
          traceId: operationContext.traceId
        })

        return { success: true, data: undefined }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to update profile from behavior',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { userId, behaviorData },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Obtém recomendações personalizadas
   */
  async getPersonalizedRecommendations(
    userId: string,
    category: 'features' | 'content' | 'optimizations' | 'learning' = 'features'
  ): Promise<Result<{
    recommendations: Array<{
      id: string
      type: string
      title: string
      description: string
      relevanceScore: number
      reasoning: string
      actionUrl?: string
    }>
    insights: string[]
  }, ContextError>> {
    const operationContext = createOperationContext('get_personalized_recommendations', userId, {
      category
    })

    return await measureOperation('getPersonalizedRecommendations', async () => {
      try {
        const profileResult = await this.getUserProfile(userId)
        if (!profileResult.success) {
          return { success: false, error: profileResult.error }
        }

        const profile = profileResult.data
        const recommendations = this.generateRecommendations(profile, category)
        const insights = this.getRelevantInsights(userId, category)

        return {
          success: true,
          data: {
            recommendations,
            insights
          }
        }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to get personalized recommendations',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { userId, category },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Métodos privados
   */
  private async createInitialProfile(userId: string): Promise<UserProfile> {
    // Criar perfil inicial com valores padrão
    const profile: UserProfile = {
      userId,
      demographics: {
        role: 'empresario', // Padrão
        experience: 'intermediario',
        companySize: 'pequena',
        industry: 'geral',
        location: {
          state: 'SP',
          city: 'São Paulo'
        }
      },
      preferences: {
        communicationStyle: 'didatico',
        detailLevel: 3,
        priorityAreas: ['compliance', 'tax_optimization'],
        dashboardLayout: 'detailed',
        notificationFrequency: 'daily',
        language: 'pt-BR'
      },
      behavior: {
        loginFrequency: 3,
        averageSessionDuration: 15,
        mostUsedFeatures: [],
        peakUsageHours: [9, 14, 16],
        preferredDevices: ['desktop'],
        interactionPatterns: []
      },
      goals: {
        primary: ['compliance', 'cost_reduction'],
        secondary: ['growth', 'efficiency'],
        timeline: 'medium'
      },
      learningStyle: {
        preferredContentType: 'mixed',
        learningPace: 'normal',
        feedbackPreference: 'summary'
      }
    }

    // Salvar perfil inicial
    await unifiedCacheService.set(`profile:${userId}`, profile, 'user-profiles')

    return profile
  }

  private async buildPersonalizedExperience(
    profile: UserProfile,
    context: PersonalizationContext
  ): Promise<PersonalizedExperience> {
    return {
      dashboard: this.buildPersonalizedDashboard(profile, context),
      content: this.buildPersonalizedContent(profile),
      features: this.buildPersonalizedFeatures(profile, context),
      notifications: this.buildPersonalizedNotifications(profile),
      insights: this.buildPersonalizedInsights(profile)
    }
  }

  private buildPersonalizedDashboard(
    profile: UserProfile,
    context: PersonalizationContext
  ): PersonalizedExperience['dashboard'] {
    const widgets: PersonalizedWidget[] = []

    // Widget de compliance (sempre importante)
    widgets.push({
      id: 'compliance-status',
      type: 'compliance',
      title: 'Status de Compliance',
      priority: 1,
      size: 'large',
      position: { x: 0, y: 0 },
      config: {
        showDetails: profile.preferences.detailLevel >= 3,
        alertsOnly: profile.demographics.role === 'empresario'
      },
      relevanceScore: 0.9
    })

    // Widget financeiro baseado no perfil
    if (profile.preferences.priorityAreas.includes('cash_flow') || 
        profile.demographics.role === 'gestor') {
      widgets.push({
        id: 'financial-overview',
        type: 'financial',
        title: 'Visão Financeira',
        priority: 2,
        size: 'medium',
        position: { x: 1, y: 0 },
        config: {
          showProjections: profile.preferences.detailLevel >= 4,
          focusOnCashFlow: true
        },
        relevanceScore: 0.8
      })
    }

    // Widget de cálculos para contadores
    if (profile.demographics.role === 'contador') {
      widgets.push({
        id: 'calculations-queue',
        type: 'calculations',
        title: 'Fila de Cálculos',
        priority: 1,
        size: 'medium',
        position: { x: 0, y: 1 },
        config: {
          showTechnicalDetails: true,
          groupByType: true
        },
        relevanceScore: 0.95
      })
    }

    // Widget de insights baseado no horário
    if (context.currentSession.timeOfDay >= 8 && context.currentSession.timeOfDay <= 18) {
      widgets.push({
        id: 'daily-insights',
        type: 'insights',
        title: 'Insights do Dia',
        priority: 3,
        size: 'small',
        position: { x: 2, y: 0 },
        config: {
          maxInsights: profile.preferences.detailLevel <= 2 ? 3 : 5
        },
        relevanceScore: 0.7
      })
    }

    return {
      layout: profile.preferences.dashboardLayout,
      widgets: widgets.sort((a, b) => b.relevanceScore - a.relevanceScore),
      priorityOrder: widgets.map(w => w.id),
      hiddenElements: this.getHiddenElements(profile)
    }
  }

  private buildPersonalizedContent(profile: UserProfile): PersonalizedExperience['content'] {
    const toneMap = {
      'formal': 'Utilize linguagem formal e técnica',
      'casual': 'Use linguagem descontraída e acessível',
      'tecnico': 'Empregue terminologia técnica precisa',
      'didatico': 'Explique conceitos de forma educativa'
    }

    return {
      communicationTone: toneMap[profile.preferences.communicationStyle],
      detailLevel: profile.preferences.detailLevel,
      preferredFormats: this.getPreferredFormats(profile),
      customizedMessages: this.generateCustomMessages(profile)
    }
  }

  private buildPersonalizedFeatures(
    profile: UserProfile,
    context: PersonalizationContext
  ): PersonalizedExperience['features'] {
    const allFeatures = [
      'tax-calculator', 'compliance-checker', 'document-analyzer',
      'financial-projections', 'regime-optimizer', 'deadline-tracker',
      'report-generator', 'audit-trail', 'integration-manager'
    ]

    const recommended = this.rankFeaturesByRelevance(allFeatures, profile, context)
    const hidden = this.getHiddenFeatures(profile)
    const shortcuts = this.generateShortcuts(profile)
    const automations = this.generateAutomations(profile)

    return {
      recommended: recommended.slice(0, 6),
      hidden,
      shortcuts,
      automations
    }
  }

  private buildPersonalizedNotifications(profile: UserProfile): PersonalizedExperience['notifications'] {
    const channels = this.getPreferredChannels(profile)
    const customRules = this.generateNotificationRules(profile)

    return {
      channels,
      frequency: profile.preferences.notificationFrequency,
      customRules
    }
  }

  private buildPersonalizedInsights(profile: UserProfile): PersonalizedExperience['insights'] {
    return {
      focusAreas: profile.preferences.priorityAreas,
      analysisDepth: profile.preferences.detailLevel,
      reportingStyle: this.getReportingStyle(profile),
      kpiPreferences: this.getKPIPreferences(profile)
    }
  }

  private updateBehaviorPatterns(profile: UserProfile, behaviorData: any): void {
    // Atualizar features mais usadas
    const existingPattern = profile.behavior.interactionPatterns.find(
      p => p.feature === behaviorData.feature
    )

    if (existingPattern) {
      existingPattern.frequency++
      existingPattern.lastUsed = new Date()
    } else {
      profile.behavior.interactionPatterns.push({
        feature: behaviorData.feature,
        frequency: 1,
        lastUsed: new Date()
      })
    }

    // Atualizar features mais usadas
    const mostUsed = profile.behavior.interactionPatterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(p => p.feature)

    profile.behavior.mostUsedFeatures = mostUsed

    // Atualizar duração média da sessão
    profile.behavior.averageSessionDuration = 
      (profile.behavior.averageSessionDuration + behaviorData.duration) / 2
  }

  private updatePreferencesFromUsage(profile: UserProfile, behaviorData: any): void {
    // Ajustar nível de detalhe baseado no comportamento
    if (behaviorData.action === 'view_details' && behaviorData.success) {
      const newLevel = Math.min(5, profile.preferences.detailLevel + 0.1)
      profile.preferences.detailLevel = Math.round(newLevel) as 1 | 2 | 3 | 4 | 5
    } else if (behaviorData.action === 'skip_details') {
      const newLevel = Math.max(1, profile.preferences.detailLevel - 0.1)
      profile.preferences.detailLevel = Math.round(newLevel) as 1 | 2 | 3 | 4 | 5
    }

    // Ajustar áreas prioritárias baseado no uso
    if (behaviorData.success && behaviorData.duration > 60) { // Sessão longa e bem-sucedida
      const featureCategory = this.mapFeatureToCategory(behaviorData.feature)
      if (featureCategory && !profile.preferences.priorityAreas.includes(featureCategory)) {
        profile.preferences.priorityAreas.push(featureCategory)
      }
    }
  }

  private generateLearningInsights(profile: UserProfile, behaviorData: any): LearningInsight[] {
    const insights: LearningInsight[] = []

    // Insight sobre eficiência
    if (behaviorData.duration < 30 && behaviorData.success) {
      insights.push({
        userId: profile.userId,
        insight: 'Usuário está se tornando mais eficiente com a ferramenta',
        confidence: 0.7,
        source: 'performance',
        actionable: true,
        recommendations: ['Oferecer features mais avançadas', 'Sugerir automações'],
        timestamp: new Date()
      })
    }

    // Insight sobre dificuldades
    if (behaviorData.duration > 300 && !behaviorData.success) {
      insights.push({
        userId: profile.userId,
        insight: 'Usuário pode estar enfrentando dificuldades',
        confidence: 0.8,
        source: 'behavior',
        actionable: true,
        recommendations: ['Oferecer tutorial', 'Simplificar interface', 'Suporte proativo'],
        timestamp: new Date()
      })
    }

    return insights
  }

  private generateRecommendations(profile: UserProfile, category: string): any[] {
    const recommendations = []

    if (category === 'features') {
      // Recomendar features baseado no perfil
      if (profile.demographics.role === 'contador' && 
          !profile.behavior.mostUsedFeatures.includes('audit-trail')) {
        recommendations.push({
          id: 'audit-trail-rec',
          type: 'feature',
          title: 'Trilha de Auditoria',
          description: 'Mantenha registro completo de todas as alterações',
          relevanceScore: 0.9,
          reasoning: 'Essencial para contadores profissionais',
          actionUrl: '/features/audit-trail'
        })
      }

      if (profile.preferences.priorityAreas.includes('tax_optimization') &&
          profile.preferences.detailLevel >= 4) {
        recommendations.push({
          id: 'regime-optimizer-rec',
          type: 'feature',
          title: 'Otimizador de Regime',
          description: 'Analise qual regime tributário é mais vantajoso',
          relevanceScore: 0.85,
          reasoning: 'Baseado no seu interesse em otimização tributária',
          actionUrl: '/tools/regime-optimizer'
        })
      }
    }

    return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  private getRelevantInsights(userId: string, category: string): string[] {
    const userInsights = this.learningInsights.get(userId) || []
    return userInsights
      .filter(insight => insight.confidence > 0.6)
      .slice(0, 3)
      .map(insight => insight.insight)
  }

  private generatePersonalizationCacheKey(userId: string, context: PersonalizationContext): string {
    const keyData = {
      userId,
      device: context.currentSession.device,
      timeOfDay: Math.floor(context.currentSession.timeOfDay / 4), // Agrupar por período do dia
      dayType: context.currentSession.dayOfWeek < 5 ? 'weekday' : 'weekend'
    }
    
    return `personalization:${Buffer.from(JSON.stringify(keyData)).toString('base64').slice(0, 32)}`
  }

  private recordInteraction(userId: string, context: PersonalizationContext): void {
    // Registrar para cache preditivo
    predictiveCacheService.recordAccess(
      userId,
      'personalized-experience',
      userId,
      {
        sessionDuration: context.currentSession.sessionDuration,
        previousAccess: context.recentActivity.map(a => a.actions[0]).filter(Boolean) as string[]
      }
    )
  }

  private async invalidatePersonalizationCache(userId: string): Promise<void> {
    // Invalidar cache de personalização para forçar regeneração
    const pattern = `personalization:*${userId}*`
    unifiedCacheService.invalidatePattern(pattern)
  }

  // Métodos auxiliares
  private getHiddenElements(profile: UserProfile): string[] {
    const hidden = []
    
    if (profile.demographics.role === 'empresario') {
      hidden.push('technical-details', 'audit-logs')
    }
    
    if (profile.preferences.detailLevel <= 2) {
      hidden.push('advanced-metrics', 'detailed-breakdowns')
    }
    
    return hidden
  }

  private getPreferredFormats(profile: UserProfile): string[] {
    const formats = ['text']
    
    if (profile.learningStyle.preferredContentType === 'interactive' ||
        profile.learningStyle.preferredContentType === 'mixed') {
      formats.push('charts', 'graphs')
    }
    
    if (profile.learningStyle.preferredContentType === 'interactive' ||
        profile.learningStyle.preferredContentType === 'mixed') {
      formats.push('interactive-widgets')
    }
    
    return formats
  }

  private generateCustomMessages(profile: UserProfile): Record<string, string> {
    const messages: Record<string, string> = {}
    
    if (profile.demographics.role === 'contador') {
      messages.welcome = 'Bem-vindo(a) de volta! Vamos otimizar a gestão dos seus clientes hoje.'
    } else {
      messages.welcome = 'Olá! Vamos cuidar da parte fiscal da sua empresa hoje.'
    }
    
    return messages
  }

  private rankFeaturesByRelevance(features: string[], profile: UserProfile, context: PersonalizationContext): string[] {
    return features.map(feature => ({
      feature,
      score: this.calculateFeatureRelevance(feature, profile, context)
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.feature)
  }

  private calculateFeatureRelevance(feature: string, profile: UserProfile, context: PersonalizationContext): number {
    let score = 0.5 // Base score

    // Boost baseado no uso anterior
    if (profile.behavior.mostUsedFeatures.includes(feature)) {
      score += 0.3
    }

    // Boost baseado no papel
    const roleBoosts: Record<string, Record<string, number>> = {
      'contador': {
        'audit-trail': 0.2,
        'compliance-checker': 0.2,
        'report-generator': 0.15
      },
      'empresario': {
        'financial-projections': 0.2,
        'tax-calculator': 0.15,
        'deadline-tracker': 0.1
      }
    }

    const roleBoost = roleBoosts[profile.demographics.role]?.[feature] || 0
    score += roleBoost

    // Boost baseado nas áreas prioritárias
    const categoryBoosts: Record<string, Record<string, number>> = {
      'compliance': {
        'compliance-checker': 0.15,
        'deadline-tracker': 0.1
      },
      'tax_optimization': {
        'regime-optimizer': 0.15,
        'tax-calculator': 0.1
      }
    }

    profile.preferences.priorityAreas.forEach(area => {
      const areaBoost = categoryBoosts[area]?.[feature] || 0
      score += areaBoost
    })

    return Math.min(score, 1)
  }

  private getHiddenFeatures(profile: UserProfile): string[] {
    const hidden = []
    
    if (profile.demographics.experience === 'iniciante') {
      hidden.push('advanced-analytics', 'custom-reports')
    }
    
    return hidden
  }

  private generateShortcuts(profile: UserProfile): string[] {
    return profile.behavior.mostUsedFeatures.slice(0, 4)
  }

  private generateAutomations(profile: UserProfile): PersonalizedAutomation[] {
    const automations: PersonalizedAutomation[] = []
    
    if (profile.behavior.loginFrequency >= 5) { // Usuário ativo
      automations.push({
        id: 'daily-compliance-check',
        name: 'Verificação Diária de Compliance',
        trigger: 'daily_login',
        action: 'run_compliance_check',
        conditions: { time: '09:00' },
        enabled: true,
        confidence: 0.8
      })
    }
    
    return automations
  }

  private generateNotificationRules(profile: UserProfile): NotificationRule[] {
    const rules: NotificationRule[] = []
    
    // Regra para prazos críticos
    rules.push({
      id: 'critical-deadlines',
      condition: 'deadline_within_3_days',
      channel: 'push',
      priority: 'critical',
      template: 'critical_deadline_template',
      enabled: true
    })
    
    return rules
  }

  private getPreferredChannels(profile: UserProfile): string[] {
    const channels = ['in-app']
    
    if (profile.preferences.notificationFrequency !== 'realtime') {
      channels.push('email')
    }
    
    if (profile.behavior.preferredDevices.includes('mobile')) {
      channels.push('push')
    }
    
    return channels
  }

  private getReportingStyle(profile: UserProfile): string {
    if (profile.demographics.role === 'contador') {
      return 'technical'
    } else if (profile.preferences.detailLevel >= 4) {
      return 'detailed'
    } else {
      return 'executive'
    }
  }

  private getKPIPreferences(profile: UserProfile): string[] {
    const kpis = ['compliance_score']
    
    if (profile.preferences.priorityAreas.includes('cash_flow')) {
      kpis.push('cash_flow_health', 'payment_delays')
    }
    
    if (profile.preferences.priorityAreas.includes('tax_optimization')) {
      kpis.push('tax_efficiency', 'savings_opportunities')
    }
    
    return kpis
  }

  private mapFeatureToCategory(feature: string): string | null {
    const mapping: Record<string, string> = {
      'tax-calculator': 'tax_optimization',
      'compliance-checker': 'compliance',
      'financial-projections': 'cash_flow',
      'deadline-tracker': 'compliance'
    }
    
    return mapping[feature] || null
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStatistics() {
    return {
      activeProfiles: this.userProfiles.size,
      cachedExperiences: this.personalizationCache.size,
      totalInsights: Array.from(this.learningInsights.values()).reduce((sum, insights) => sum + insights.length, 0),
      averagePersonalizationScore: 0.85 // Placeholder
    }
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    this.userProfiles.clear()
    this.personalizationCache.clear()
    this.learningInsights.clear()
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const personalizationEngineService = new PersonalizationEngineService()
