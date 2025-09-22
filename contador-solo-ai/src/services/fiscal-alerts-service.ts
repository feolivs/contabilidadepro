'use client'

import { createBrowserSupabaseClient } from '@/lib/supabase'
import type { AlertType, AlertPriority, AlertStatus, NotificationFrequency } from '@/hooks/use-fiscal-alerts'

// =====================================================
// TIPOS ESPECÍFICOS PARA REGRAS DE NEGÓCIO
// =====================================================

export interface FiscalRule {
  alert_type: AlertType
  name: string
  description: string
  default_days_before: number
  default_priority: AlertPriority
  calculation_method: 'fixed_date' | 'relative_date' | 'document_based'
  required_data: string[]
  suggested_actions: string[]
}

export interface AlertCalculationResult {
  due_date: Date
  alert_date: Date
  priority: AlertPriority
  title: string
  description: string
  suggested_actions: string[]
  context_data: Record<string, any>
}

// =====================================================
// REGRAS FISCAIS BRASILEIRAS
// =====================================================

export const FISCAL_RULES: Record<AlertType, FiscalRule> = {
  DAS_VENCIMENTO: {
    alert_type: 'DAS_VENCIMENTO',
    name: 'Vencimento DAS',
    description: 'Documento de Arrecadação do Simples Nacional',
    default_days_before: 7,
    default_priority: 'HIGH',
    calculation_method: 'fixed_date',
    required_data: ['competencia', 'regime_tributario'],
    suggested_actions: [
      'Calcular valor do DAS',
      'Gerar boleto de pagamento',
      'Verificar saldo em conta',
      'Agendar pagamento'
    ]
  },

  IRPJ_VENCIMENTO: {
    alert_type: 'IRPJ_VENCIMENTO',
    name: 'Vencimento IRPJ',
    description: 'Imposto de Renda Pessoa Jurídica',
    default_days_before: 10,
    default_priority: 'HIGH',
    calculation_method: 'fixed_date',
    required_data: ['regime_tributario', 'trimestre'],
    suggested_actions: [
      'Calcular IRPJ trimestral',
      'Verificar base de cálculo',
      'Gerar DARF',
      'Efetuar pagamento'
    ]
  },

  CSLL_VENCIMENTO: {
    alert_type: 'CSLL_VENCIMENTO',
    name: 'Vencimento CSLL',
    description: 'Contribuição Social sobre o Lucro Líquido',
    default_days_before: 10,
    default_priority: 'HIGH',
    calculation_method: 'fixed_date',
    required_data: ['regime_tributario', 'trimestre'],
    suggested_actions: [
      'Calcular CSLL trimestral',
      'Verificar base de cálculo',
      'Gerar DARF',
      'Efetuar pagamento'
    ]
  },

  DEFIS_PRAZO: {
    alert_type: 'DEFIS_PRAZO',
    name: 'Prazo DEFIS',
    description: 'Declaração de Informações Socioeconômicas e Fiscais',
    default_days_before: 15,
    default_priority: 'CRITICAL',
    calculation_method: 'fixed_date',
    required_data: ['ano_calendario'],
    suggested_actions: [
      'Reunir documentos necessários',
      'Acessar portal da Receita Federal',
      'Preencher DEFIS',
      'Transmitir declaração'
    ]
  },

  SPED_PRAZO: {
    alert_type: 'SPED_PRAZO',
    name: 'Prazo SPED',
    description: 'Sistema Público de Escrituração Digital',
    default_days_before: 10,
    default_priority: 'HIGH',
    calculation_method: 'fixed_date',
    required_data: ['mes_referencia', 'tipo_sped'],
    suggested_actions: [
      'Validar escrituração contábil',
      'Gerar arquivo SPED',
      'Transmitir via PVA',
      'Verificar recibo'
    ]
  },

  DCTF_PRAZO: {
    alert_type: 'DCTF_PRAZO',
    name: 'Prazo DCTF',
    description: 'Declaração de Débitos e Créditos Tributários Federais',
    default_days_before: 10,
    default_priority: 'HIGH',
    calculation_method: 'fixed_date',
    required_data: ['mes_referencia'],
    suggested_actions: [
      'Consolidar débitos e créditos',
      'Preencher DCTF',
      'Transmitir declaração',
      'Guardar recibo'
    ]
  },

  GFIP_PRAZO: {
    alert_type: 'GFIP_PRAZO',
    name: 'Prazo GFIP',
    description: 'Guia de Recolhimento do FGTS e Informações à Previdência',
    default_days_before: 5,
    default_priority: 'HIGH',
    calculation_method: 'fixed_date',
    required_data: ['mes_referencia', 'funcionarios'],
    suggested_actions: [
      'Calcular FGTS e INSS',
      'Preencher GFIP',
      'Gerar GPS',
      'Efetuar pagamentos'
    ]
  },

  RAIS_PRAZO: {
    alert_type: 'RAIS_PRAZO',
    name: 'Prazo RAIS',
    description: 'Relação Anual de Informações Sociais',
    default_days_before: 30,
    default_priority: 'CRITICAL',
    calculation_method: 'fixed_date',
    required_data: ['ano_calendario', 'funcionarios'],
    suggested_actions: [
      'Reunir dados dos funcionários',
      'Preencher RAIS',
      'Validar informações',
      'Transmitir declaração'
    ]
  },

  DIRF_PRAZO: {
    alert_type: 'DIRF_PRAZO',
    name: 'Prazo DIRF',
    description: 'Declaração do Imposto de Renda Retido na Fonte',
    default_days_before: 20,
    default_priority: 'HIGH',
    calculation_method: 'fixed_date',
    required_data: ['ano_calendario', 'retencoes'],
    suggested_actions: [
      'Consolidar retenções do ano',
      'Preencher DIRF',
      'Validar dados',
      'Transmitir declaração'
    ]
  },

  DOCUMENTO_VENCIDO: {
    alert_type: 'DOCUMENTO_VENCIDO',
    name: 'Documento Vencendo',
    description: 'Documento com data de vencimento próxima',
    default_days_before: 7,
    default_priority: 'MEDIUM',
    calculation_method: 'document_based',
    required_data: ['data_vencimento', 'tipo_documento'],
    suggested_actions: [
      'Verificar documento',
      'Renovar se necessário',
      'Atualizar registros'
    ]
  },

  RECEITA_LIMITE: {
    alert_type: 'RECEITA_LIMITE',
    name: 'Limite de Receita',
    description: 'Receita próxima do limite do regime tributário',
    default_days_before: 30,
    default_priority: 'HIGH',
    calculation_method: 'relative_date',
    required_data: ['receita_acumulada', 'regime_atual', 'limite_regime'],
    suggested_actions: [
      'Analisar receita acumulada',
      'Avaliar mudança de regime',
      'Planejar tributação',
      'Consultar contador'
    ]
  },

  REGIME_MUDANCA: {
    alert_type: 'REGIME_MUDANCA',
    name: 'Mudança de Regime',
    description: 'Prazo para opção de regime tributário',
    default_days_before: 45,
    default_priority: 'CRITICAL',
    calculation_method: 'fixed_date',
    required_data: ['regime_atual', 'ano_calendario'],
    suggested_actions: [
      'Analisar opções de regime',
      'Calcular impacto tributário',
      'Fazer opção no portal',
      'Documentar mudança'
    ]
  },

  CERTIFICADO_VENCIMENTO: {
    alert_type: 'CERTIFICADO_VENCIMENTO',
    name: 'Certificado Digital Vencendo',
    description: 'Certificado digital próximo do vencimento',
    default_days_before: 30,
    default_priority: 'HIGH',
    calculation_method: 'document_based',
    required_data: ['data_vencimento', 'tipo_certificado'],
    suggested_actions: [
      'Renovar certificado digital',
      'Instalar novo certificado',
      'Testar funcionamento',
      'Atualizar sistemas'
    ]
  },

  CUSTOM: {
    alert_type: 'CUSTOM',
    name: 'Alerta Personalizado',
    description: 'Alerta criado pelo usuário',
    default_days_before: 7,
    default_priority: 'MEDIUM',
    calculation_method: 'relative_date',
    required_data: [],
    suggested_actions: [
      'Verificar detalhes',
      'Tomar ação necessária'
    ]
  }
}

// =====================================================
// SERVIÇO DE ALERTAS FISCAIS
// =====================================================

export class FiscalAlertsService {
  private supabase = createBrowserSupabaseClient()

  /**
   * Calcular alerta baseado no tipo e dados fornecidos
   */
  async calculateAlert(
    alertType: AlertType,
    data: Record<string, any>,
    userConfig?: { days_before?: number; priority?: AlertPriority }
  ): Promise<AlertCalculationResult> {
    const rule = FISCAL_RULES[alertType]
    const daysBefore = userConfig?.days_before ?? rule.default_days_before
    const priority = userConfig?.priority ?? rule.default_priority

    switch (rule.calculation_method) {
      case 'fixed_date':
        return this.calculateFixedDateAlert(alertType, data, daysBefore, priority)
      
      case 'document_based':
        return this.calculateDocumentBasedAlert(alertType, data, daysBefore, priority)
      
      case 'relative_date':
        return this.calculateRelativeDateAlert(alertType, data, daysBefore, priority)
      
      default:
        throw new Error(`Método de cálculo não implementado: ${rule.calculation_method}`)
    }
  }

  /**
   * Calcular alertas com datas fixas (DAS, DEFIS, etc.)
   */
  private calculateFixedDateAlert(
    alertType: AlertType,
    data: Record<string, any>,
    daysBefore: number,
    priority: AlertPriority
  ): AlertCalculationResult {
    const rule = FISCAL_RULES[alertType]
    let dueDate: Date
    let title: string
    let description: string
    let contextData: Record<string, any> = { ...data }

    switch (alertType) {
      case 'DAS_VENCIMENTO':
        // DAS vence no dia 20 do mês seguinte
        const today = new Date()
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, 20)
        title = `DAS vence em ${daysBefore} dias`
        description = `O DAS referente ao mês ${today.getMonth() + 1}/${today.getFullYear()} vence no dia 20/${dueDate.getMonth() + 1}/${dueDate.getFullYear()}.`
        contextData.competencia = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
        break

      case 'DEFIS_PRAZO':
        // DEFIS vence em 31 de março
        const currentYear = new Date().getFullYear()
        dueDate = new Date(currentYear, 2, 31) // Março é mês 2 (0-indexed)
        if (dueDate < new Date()) {
          dueDate.setFullYear(currentYear + 1)
        }
        title = `DEFIS ${dueDate.getFullYear()} vence em ${daysBefore} dias`
        description = `A DEFIS referente ao ano ${dueDate.getFullYear() - 1} deve ser entregue até 31/03/${dueDate.getFullYear()}.`
        contextData.ano_calendario = dueDate.getFullYear() - 1
        break

      case 'IRPJ_VENCIMENTO':
      case 'CSLL_VENCIMENTO':
        // IRPJ/CSLL vencem no último dia útil do mês seguinte ao trimestre
        const trimestre = data.trimestre || Math.ceil((new Date().getMonth() + 1) / 3)
        const anoTrimestre = data.ano || new Date().getFullYear()
        const mesVencimento = trimestre * 3 + 1 // Mês seguinte ao fim do trimestre
        dueDate = new Date(anoTrimestre, mesVencimento - 1, 0) // Último dia do mês
        title = `${alertType === 'IRPJ_VENCIMENTO' ? 'IRPJ' : 'CSLL'} ${trimestre}º trimestre vence em ${daysBefore} dias`
        description = `O ${alertType === 'IRPJ_VENCIMENTO' ? 'IRPJ' : 'CSLL'} do ${trimestre}º trimestre de ${anoTrimestre} vence em ${dueDate.toLocaleDateString('pt-BR')}.`
        contextData.trimestre = trimestre
        contextData.ano = anoTrimestre
        break

      default:
        throw new Error(`Cálculo de data fixa não implementado para: ${alertType}`)
    }

    const alertDate = new Date(dueDate)
    alertDate.setDate(dueDate.getDate() - daysBefore)

    return {
      due_date: dueDate,
      alert_date: alertDate,
      priority,
      title,
      description,
      suggested_actions: rule.suggested_actions,
      context_data: contextData
    }
  }

  /**
   * Calcular alertas baseados em documentos
   */
  private calculateDocumentBasedAlert(
    alertType: AlertType,
    data: Record<string, any>,
    daysBefore: number,
    priority: AlertPriority
  ): AlertCalculationResult {
    const rule = FISCAL_RULES[alertType]
    
    if (!data.data_vencimento) {
      throw new Error('Data de vencimento é obrigatória para alertas baseados em documento')
    }

    const dueDate = new Date(data.data_vencimento)
    const alertDate = new Date(dueDate)
    alertDate.setDate(dueDate.getDate() - daysBefore)

    let title: string
    let description: string

    switch (alertType) {
      case 'DOCUMENTO_VENCIDO':
        const nomeDocumento = data.nome_documento || 'Documento'
        title = `${nomeDocumento} vence em ${daysBefore} dias`
        description = `O documento ${nomeDocumento} vence em ${dueDate.toLocaleDateString('pt-BR')}.`
        break

      case 'CERTIFICADO_VENCIMENTO':
        const tipoCertificado = data.tipo_certificado || 'Certificado Digital'
        title = `${tipoCertificado} vence em ${daysBefore} dias`
        description = `O ${tipoCertificado} vence em ${dueDate.toLocaleDateString('pt-BR')}. Renove com antecedência para evitar interrupções.`
        break

      default:
        title = `${rule.name} vence em ${daysBefore} dias`
        description = `${rule.description} vence em ${dueDate.toLocaleDateString('pt-BR')}.`
    }

    return {
      due_date: dueDate,
      alert_date: alertDate,
      priority,
      title,
      description,
      suggested_actions: rule.suggested_actions,
      context_data: data
    }
  }

  /**
   * Calcular alertas com datas relativas
   */
  private calculateRelativeDateAlert(
    alertType: AlertType,
    data: Record<string, any>,
    daysBefore: number,
    priority: AlertPriority
  ): AlertCalculationResult {
    const rule = FISCAL_RULES[alertType]
    
    // Para alertas relativos, a data de vencimento é calculada baseada em outros fatores
    const today = new Date()
    let dueDate = new Date(today)
    dueDate.setDate(today.getDate() + daysBefore)

    const alertDate = new Date(today)

    let title: string
    let description: string

    switch (alertType) {
      case 'RECEITA_LIMITE':
        const receitaAtual = data.receita_acumulada || 0
        const limiteRegime = data.limite_regime || 4800000 // Limite Simples Nacional
        const percentualUtilizado = (receitaAtual / limiteRegime) * 100
        
        title = `Receita em ${percentualUtilizado.toFixed(1)}% do limite`
        description = `A receita acumulada (R$ ${receitaAtual.toLocaleString('pt-BR')}) está próxima do limite do regime tributário.`
        break

      case 'CUSTOM':
        title = data.titulo || 'Alerta Personalizado'
        description = data.descricao || 'Alerta criado pelo usuário'
        dueDate = data.data_vencimento ? new Date(data.data_vencimento) : dueDate
        break

      default:
        title = `${rule.name} - Verificação necessária`
        description = rule.description
    }

    return {
      due_date: dueDate,
      alert_date: alertDate,
      priority,
      title,
      description,
      suggested_actions: rule.suggested_actions,
      context_data: data
    }
  }

  /**
   * Criar alerta fiscal no banco de dados
   */
  async createFiscalAlert(
    userId: string,
    alertType: AlertType,
    data: Record<string, any>,
    userConfig?: { days_before?: number; priority?: AlertPriority }
  ) {
    const calculation = await this.calculateAlert(alertType, data, userConfig)

    const { data: alert, error } = await this.supabase
      .from('fiscal_alerts')
      .insert({
        user_id: userId,
        alert_type: alertType,
        title: calculation.title,
        description: calculation.description,
        priority: calculation.priority,
        due_date: calculation.due_date.toISOString().split('T')[0],
        alert_date: calculation.alert_date.toISOString().split('T')[0],
        suggested_actions: calculation.suggested_actions,
        context_data: calculation.context_data
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao criar alerta fiscal: ${error.message}`)
    }

    return alert
  }

  /**
   * Obter regra fiscal por tipo
   */
  getFiscalRule(alertType: AlertType): FiscalRule {
    return FISCAL_RULES[alertType]
  }

  /**
   * Listar todos os tipos de alerta disponíveis
   */
  getAvailableAlertTypes(): AlertType[] {
    return Object.keys(FISCAL_RULES) as AlertType[]
  }

  /**
   * Validar dados necessários para um tipo de alerta
   */
  validateAlertData(alertType: AlertType, data: Record<string, any>): { valid: boolean; missing: string[] } {
    const rule = FISCAL_RULES[alertType]
    const missing: string[] = []

    for (const requiredField of rule.required_data) {
      if (!data[requiredField]) {
        missing.push(requiredField)
      }
    }

    return {
      valid: missing.length === 0,
      missing
    }
  }
}
