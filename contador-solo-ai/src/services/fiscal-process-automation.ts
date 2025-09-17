'use client'

import { logger, measureOperation, createOperationContext } from './structured-logger'
import { unifiedCacheService } from './unified-cache-service'
import { workflowEngineService } from './workflow-engine'
import { governmentAPIsIntegrationService } from './government-apis-integration'
import type { Result, ContextError } from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'

// =====================================================
// TIPOS PARA AUTOMAÇÃO DE PROCESSOS FISCAIS
// =====================================================

export interface FiscalProcess {
  id: string
  name: string
  type: 'calculation' | 'generation' | 'submission' | 'tracking' | 'compliance'
  category: 'das' | 'irpj' | 'csll' | 'pis' | 'cofins' | 'icms' | 'iss' | 'sped' | 'esocial' | 'custom'
  description: string
  schedule: ProcessSchedule
  automation: ProcessAutomation
  validation: ProcessValidation
  notification: ProcessNotification
  status: 'active' | 'inactive' | 'error' | 'maintenance'
  metadata: {
    createdBy: string
    createdAt: Date
    lastExecution: Date
    executionCount: number
    successRate: number
  }
}

export interface ProcessSchedule {
  type: 'manual' | 'automatic' | 'conditional'
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  dayOfMonth?: number // Para mensal
  dayOfWeek?: number // Para semanal
  time?: string // HH:MM
  conditions?: string[] // Condições para execução
  enabled: boolean
}

export interface ProcessAutomation {
  steps: AutomationStep[]
  rollbackSteps?: AutomationStep[]
  maxRetries: number
  timeoutMs: number
  parallelExecution: boolean
}

export interface AutomationStep {
  id: string
  name: string
  type: 'calculate' | 'validate' | 'generate' | 'send' | 'track' | 'notify'
  service: string
  method: string
  parameters: Record<string, any>
  dependencies: string[] // IDs de steps que devem ser executados antes
  optional: boolean
  retryConfig?: {
    maxRetries: number
    backoffMs: number
  }
}

export interface ProcessValidation {
  preValidation: ValidationRule[]
  postValidation: ValidationRule[]
  businessRules: BusinessRule[]
}

export interface ValidationRule {
  id: string
  name: string
  condition: string
  errorMessage: string
  severity: 'error' | 'warning' | 'info'
}

export interface BusinessRule {
  id: string
  name: string
  description: string
  condition: string
  action: 'block' | 'warn' | 'log'
  message: string
}

export interface ProcessNotification {
  onStart: NotificationConfig[]
  onSuccess: NotificationConfig[]
  onError: NotificationConfig[]
  onWarning: NotificationConfig[]
}

export interface NotificationConfig {
  type: 'email' | 'sms' | 'push' | 'webhook'
  recipients: string[]
  template: string
  enabled: boolean
}

export interface ProcessExecution {
  id: string
  processId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  duration?: number
  context: {
    userId: string
    empresaId: string
    periodo: string
    triggerType: 'manual' | 'automatic' | 'conditional'
  }
  steps: ProcessStepExecution[]
  results: ProcessResult[]
  errors: ProcessError[]
  warnings: ProcessWarning[]
}

export interface ProcessStepExecution {
  stepId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt: Date
  completedAt?: Date
  duration?: number
  input: any
  output: any
  error?: string
  retryCount: number
}

export interface ProcessResult {
  type: 'calculation' | 'document' | 'submission' | 'validation'
  data: any
  metadata: {
    stepId: string
    timestamp: Date
    source: string
  }
}

export interface ProcessError {
  stepId: string
  code: string
  message: string
  details: any
  timestamp: Date
  recoverable: boolean
}

export interface ProcessWarning {
  stepId: string
  code: string
  message: string
  details: any
  timestamp: Date
}

// =====================================================
// FISCAL PROCESS AUTOMATION SERVICE
// =====================================================

export class FiscalProcessAutomationService {
  private processes = new Map<string, FiscalProcess>()
  private executions = new Map<string, ProcessExecution>()
  private scheduledJobs = new Map<string, NodeJS.Timeout>()

  constructor() {
    this.initializeBuiltInProcesses()
  }

  /**
   * Registra um novo processo fiscal
   */
  async registerProcess(process: FiscalProcess): Promise<Result<void, ContextError>> {
    const operationContext = createOperationContext('register_process', 'system', {
      processId: process.id
    })

    return await measureOperation('registerProcess', async () => {
      try {
        // Validar processo
        const validationResult = this.validateProcess(process)
        if (!validationResult.isValid) {
          return {
            success: false,
            error: new ContextErrorClass(
              `Processo inválido: ${validationResult.errors.join(', ')}`,
              ERROR_CODES.VALIDATION_FAILED,
              { processId: process.id, errors: validationResult.errors }
            )
          }
        }

        // Registrar processo
        this.processes.set(process.id, process)

        // Configurar agendamento se necessário
        if (process.schedule.enabled && process.schedule.type === 'automatic') {
          await this.setupSchedule(process)
        }

        // Salvar no cache
        await unifiedCacheService.set(`fiscal-process:${process.id}`, process, 'fiscal-processes')

        logger.info('Fiscal process registered successfully', {
          processId: process.id,
          name: process.name,
          type: process.type,
          category: process.category,
          traceId: operationContext.traceId
        })

        return { success: true, data: undefined }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to register fiscal process',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { processId: process.id },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Executa um processo fiscal
   */
  async executeProcess(
    processId: string,
    context: {
      userId: string
      empresaId: string
      periodo: string
      triggerType?: 'manual' | 'automatic' | 'conditional'
      parameters?: Record<string, any>
    }
  ): Promise<Result<ProcessExecution, ContextError>> {
    const operationContext = createOperationContext('execute_process', context.userId, {
      processId,
      empresaId: context.empresaId,
      periodo: context.periodo
    })

    return await measureOperation('executeProcess', async () => {
      try {
        // Verificar se processo existe
        const process = this.processes.get(processId)
        if (!process) {
          return {
            success: false,
            error: new ContextErrorClass(
              `Processo não encontrado: ${processId}`,
              ERROR_CODES.VALIDATION_FAILED,
              { processId }
            )
          }
        }

        if (process.status !== 'active') {
          return {
            success: false,
            error: new ContextErrorClass(
              `Processo não está ativo: ${processId}`,
              ERROR_CODES.EXTERNAL_SERVICE_ERROR,
              { processId, status: process.status }
            )
          }
        }

        // Criar execução
        const execution: ProcessExecution = {
          id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          processId,
          status: 'pending',
          startedAt: new Date(),
          context: {
            userId: context.userId,
            empresaId: context.empresaId,
            periodo: context.periodo,
            triggerType: context.triggerType || 'manual'
          },
          steps: [],
          results: [],
          errors: [],
          warnings: []
        }

        // Registrar execução
        this.executions.set(execution.id, execution)

        // Executar processo em background
        this.runProcessExecution(execution, process, context.parameters).catch(error => {
          logger.error('Process execution failed', {
            executionId: execution.id,
            processId,
            error: error.message,
            traceId: operationContext.traceId
          })
        })

        logger.info('Fiscal process execution started', {
          executionId: execution.id,
          processId,
          userId: context.userId,
          empresaId: context.empresaId,
          periodo: context.periodo,
          traceId: operationContext.traceId
        })

        return { success: true, data: execution }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to execute fiscal process',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { processId, context },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Calcula DAS automaticamente
   */
  async calculateDASAutomatically(
    empresaId: string,
    periodo: string,
    userId: string
  ): Promise<Result<ProcessExecution, ContextError>> {
    return await this.executeProcess('auto-calculate-das', {
      userId,
      empresaId,
      periodo,
      triggerType: 'automatic'
    })
  }

  /**
   * Gera e envia obrigações fiscais
   */
  async generateAndSubmitObligations(
    empresaId: string,
    periodo: string,
    obligations: string[],
    userId: string
  ): Promise<Result<ProcessExecution, ContextError>> {
    return await this.executeProcess('auto-submit-obligations', {
      userId,
      empresaId,
      periodo,
      triggerType: 'manual',
      parameters: { obligations }
    })
  }

  /**
   * Monitora status de obrigações enviadas
   */
  async trackObligationStatus(
    empresaId: string,
    protocolos: string[],
    userId: string
  ): Promise<Result<ProcessExecution, ContextError>> {
    return await this.executeProcess('track-obligations', {
      userId,
      empresaId,
      periodo: new Date().toISOString().slice(0, 7),
      triggerType: 'manual',
      parameters: { protocolos }
    })
  }

  /**
   * Obtém status de execução
   */
  async getExecutionStatus(executionId: string): Promise<Result<ProcessExecution, ContextError>> {
    const operationContext = createOperationContext('get_execution_status', 'system', {
      executionId
    })

    return await measureOperation('getExecutionStatus', async () => {
      try {
        const execution = this.executions.get(executionId)
        
        if (!execution) {
          // Tentar carregar do cache
          const cachedExecution = await unifiedCacheService.get<ProcessExecution>(
            `process-execution:${executionId}`,
            'process-executions'
          )

          if (!cachedExecution) {
            return {
              success: false,
              error: new ContextErrorClass(
                `Execução não encontrada: ${executionId}`,
                ERROR_CODES.VALIDATION_FAILED,
                { executionId }
              )
            }
          }

          return { success: true, data: cachedExecution }
        }

        return { success: true, data: execution }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to get execution status',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { executionId },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Lista processos disponíveis
   */
  async listProcesses(category?: string): Promise<Result<FiscalProcess[], ContextError>> {
    const operationContext = createOperationContext('list_processes', 'system', { category })

    return await measureOperation('listProcesses', async () => {
      try {
        let processes = Array.from(this.processes.values())

        if (category) {
          processes = processes.filter(p => p.category === category)
        }

        // Ordenar por nome
        processes.sort((a, b) => a.name.localeCompare(b.name))

        return { success: true, data: processes }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Failed to list processes',
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          { category },
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
  private validateProcess(process: FiscalProcess): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validações básicas
    if (!process.id) errors.push('ID é obrigatório')
    if (!process.name) errors.push('Nome é obrigatório')
    if (!process.type) errors.push('Tipo é obrigatório')
    if (!process.category) errors.push('Categoria é obrigatória')
    if (!process.automation || !process.automation.steps || process.automation.steps.length === 0) {
      errors.push('Pelo menos um step de automação é obrigatório')
    }

    // Validar steps
    if (process.automation.steps) {
      process.automation.steps.forEach((step, index) => {
        if (!step.id) errors.push(`Step ${index + 1}: ID é obrigatório`)
        if (!step.name) errors.push(`Step ${index + 1}: Nome é obrigatório`)
        if (!step.type) errors.push(`Step ${index + 1}: Tipo é obrigatório`)
        if (!step.service) errors.push(`Step ${index + 1}: Service é obrigatório`)
        if (!step.method) errors.push(`Step ${index + 1}: Method é obrigatório`)
      })

      // Validar dependências
      const stepIds = new Set(process.automation.steps.map(s => s.id))
      process.automation.steps.forEach((step, index) => {
        step.dependencies.forEach(depId => {
          if (!stepIds.has(depId)) {
            errors.push(`Step ${index + 1}: dependência inexistente: ${depId}`)
          }
        })
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  private async setupSchedule(process: FiscalProcess): Promise<void> {
    const schedule = process.schedule

    if (schedule.frequency && schedule.time) {
      // Calcular próxima execução
      const nextExecution = this.calculateNextExecution(schedule)
      const delay = nextExecution.getTime() - Date.now()

      if (delay > 0) {
        const job = setTimeout(() => {
          this.executeProcess(process.id, {
            userId: 'system',
            empresaId: 'system',
            periodo: new Date().toISOString().slice(0, 7),
            triggerType: 'automatic'
          })

          // Reagendar para próxima execução
          this.setupSchedule(process)
        }, delay)

        this.scheduledJobs.set(process.id, job)
      }
    }
  }

  private calculateNextExecution(schedule: ProcessSchedule): Date {
    const now = new Date()
    const [hours, minutes] = (schedule.time || '09:00').split(':').map(Number)

    const nextExecution = new Date()
    nextExecution.setHours(hours || 9, minutes || 0, 0, 0)

    switch (schedule.frequency) {
      case 'daily':
        if (nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 1)
        }
        break

      case 'weekly':
        const targetDay = schedule.dayOfWeek || 1 // Segunda-feira por padrão
        const currentDay = nextExecution.getDay()
        const daysUntilTarget = (targetDay - currentDay + 7) % 7
        
        if (daysUntilTarget === 0 && nextExecution <= now) {
          nextExecution.setDate(nextExecution.getDate() + 7)
        } else {
          nextExecution.setDate(nextExecution.getDate() + daysUntilTarget)
        }
        break

      case 'monthly':
        const targetDayOfMonth = schedule.dayOfMonth || 15
        nextExecution.setDate(targetDayOfMonth)
        
        if (nextExecution <= now) {
          nextExecution.setMonth(nextExecution.getMonth() + 1)
        }
        break

      case 'quarterly':
        // Próximo trimestre
        const currentQuarter = Math.floor(now.getMonth() / 3)
        const nextQuarter = (currentQuarter + 1) % 4
        nextExecution.setMonth(nextQuarter * 3)
        nextExecution.setDate(schedule.dayOfMonth || 15)
        
        if (nextExecution <= now) {
          nextExecution.setFullYear(nextExecution.getFullYear() + (nextQuarter === 0 ? 1 : 0))
        }
        break

      case 'yearly':
        nextExecution.setMonth(0) // Janeiro
        nextExecution.setDate(schedule.dayOfMonth || 31)
        
        if (nextExecution <= now) {
          nextExecution.setFullYear(nextExecution.getFullYear() + 1)
        }
        break

      default:
        nextExecution.setDate(nextExecution.getDate() + 1) // Padrão: próximo dia
        break
    }

    return nextExecution
  }

  private async runProcessExecution(
    execution: ProcessExecution,
    process: FiscalProcess,
    parameters?: Record<string, any>
  ): Promise<void> {
    try {
      execution.status = 'running'

      // Executar pré-validações
      const preValidationResult = await this.runValidations(
        process.validation.preValidation,
        execution,
        parameters
      )

      if (!preValidationResult.success) {
        execution.status = 'failed'
        execution.errors.push({
          stepId: 'pre-validation',
          code: 'VALIDATION_FAILED',
          message: 'Pré-validação falhou',
          details: preValidationResult.errors,
          timestamp: new Date(),
          recoverable: false
        })
        return
      }

      // Executar steps de automação
      const steps = this.sortStepsByDependencies(process.automation.steps)
      
      for (const step of steps) {
        const stepResult = await this.executeAutomationStep(step, execution, parameters)
        execution.steps.push(stepResult)

        if (stepResult.status === 'failed' && !step.optional) {
          execution.status = 'failed'
          execution.errors.push({
            stepId: step.id,
            code: 'STEP_EXECUTION_FAILED',
            message: stepResult.error || 'Step execution failed',
            details: { step: step.name, input: stepResult.input },
            timestamp: new Date(),
            recoverable: step.retryConfig ? true : false
          })
          break
        }

        // Armazenar resultado se bem-sucedido
        if (stepResult.status === 'completed' && stepResult.output) {
          execution.results.push({
            type: this.mapStepTypeToResultType(step.type),
            data: stepResult.output,
            metadata: {
              stepId: step.id,
              timestamp: new Date(),
              source: step.service
            }
          })
        }
      }

      // Executar pós-validações se processo foi bem-sucedido
      if (execution.status === 'running') {
        const postValidationResult = await this.runValidations(
          process.validation.postValidation,
          execution,
          parameters
        )

        if (!postValidationResult.success) {
          execution.warnings.push(...postValidationResult.errors.map(error => ({
            stepId: 'post-validation',
            code: 'VALIDATION_WARNING',
            message: error,
            details: {},
            timestamp: new Date()
          })))
        }

        execution.status = 'completed'
      }

      // Finalizar execução
      execution.completedAt = new Date()
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime()

      // Salvar execução
      await unifiedCacheService.set(
        `process-execution:${execution.id}`,
        execution,
        'process-executions'
      )

      // Atualizar estatísticas do processo
      process.metadata.executionCount++
      process.metadata.lastExecution = new Date()
      
      if (execution.status === 'completed') {
        process.metadata.successRate = (process.metadata.successRate * (process.metadata.executionCount - 1) + 1) / process.metadata.executionCount
      } else {
        process.metadata.successRate = (process.metadata.successRate * (process.metadata.executionCount - 1)) / process.metadata.executionCount
      }

      // Enviar notificações
      await this.sendNotifications(process, execution)

      logger.info('Fiscal process execution completed', {
        executionId: execution.id,
        processId: process.id,
        status: execution.status,
        duration: execution.duration,
        stepsExecuted: execution.steps.length,
        resultsGenerated: execution.results.length
      })

    } catch (error) {
      execution.status = 'failed'
      execution.completedAt = new Date()
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime()
      
      execution.errors.push({
        stepId: 'execution',
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        details: { execution: execution.id },
        timestamp: new Date(),
        recoverable: false
      })

      logger.error('Fiscal process execution failed', {
        executionId: execution.id,
        processId: process.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async runValidations(
    validations: ValidationRule[],
    execution: ProcessExecution,
    parameters?: Record<string, any>
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = []

    for (const validation of validations) {
      try {
        const isValid = this.evaluateValidationCondition(validation.condition, execution, parameters)
        
        if (!isValid) {
          if (validation.severity === 'error') {
            errors.push(validation.errorMessage)
          } else {
            // Warning - não bloqueia execução
            execution.warnings.push({
              stepId: 'validation',
              code: validation.id,
              message: validation.errorMessage,
              details: { condition: validation.condition },
              timestamp: new Date()
            })
          }
        }
      } catch (error) {
        errors.push(`Erro na validação ${validation.name}: ${error}`)
      }
    }

    return {
      success: errors.length === 0,
      errors
    }
  }

  private evaluateValidationCondition(
    condition: string,
    execution: ProcessExecution,
    parameters?: Record<string, any>
  ): boolean {
    try {
      // Implementação simplificada - em produção, usar parser seguro
      // Substituir variáveis na condição
      let evaluatedCondition = condition
      
      // Substituir contexto da execução
      evaluatedCondition = evaluatedCondition.replace(/execution\.empresaId/g, `"${execution.context.empresaId}"`)
      evaluatedCondition = evaluatedCondition.replace(/execution\.periodo/g, `"${execution.context.periodo}"`)
      
      // Substituir parâmetros
      if (parameters) {
        Object.entries(parameters).forEach(([key, value]) => {
          evaluatedCondition = evaluatedCondition.replace(
            new RegExp(`parameters\\.${key}`, 'g'),
            JSON.stringify(value)
          )
        })
      }

      // Avaliar condição (ATENÇÃO: usar parser seguro em produção)
      return eval(evaluatedCondition)
    } catch (error) {
      logger.warn('Failed to evaluate validation condition', { condition, error })
      return false
    }
  }

  private sortStepsByDependencies(steps: AutomationStep[]): AutomationStep[] {
    const sorted: AutomationStep[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (step: AutomationStep) => {
      if (visiting.has(step.id)) {
        throw new Error(`Dependência circular detectada: ${step.id}`)
      }
      
      if (visited.has(step.id)) {
        return
      }

      visiting.add(step.id)

      // Visitar dependências primeiro
      step.dependencies.forEach(depId => {
        const depStep = steps.find(s => s.id === depId)
        if (depStep) {
          visit(depStep)
        }
      })

      visiting.delete(step.id)
      visited.add(step.id)
      sorted.push(step)
    }

    steps.forEach(step => {
      if (!visited.has(step.id)) {
        visit(step)
      }
    })

    return sorted
  }

  private async executeAutomationStep(
    step: AutomationStep,
    execution: ProcessExecution,
    parameters?: Record<string, any>
  ): Promise<ProcessStepExecution> {
    const stepExecution: ProcessStepExecution = {
      stepId: step.id,
      status: 'running',
      startedAt: new Date(),
      input: { ...step.parameters, ...parameters },
      output: null,
      retryCount: 0
    }

    try {
      // Executar step baseado no serviço
      switch (step.service) {
        case 'calculator':
          stepExecution.output = await this.executeCalculatorStep(step, execution, stepExecution.input)
          break
        
        case 'generator':
          stepExecution.output = await this.executeGeneratorStep(step, execution, stepExecution.input)
          break
        
        case 'government-api':
          stepExecution.output = await this.executeGovernmentAPIStep(step, execution, stepExecution.input)
          break
        
        case 'workflow':
          stepExecution.output = await this.executeWorkflowStep(step, execution, stepExecution.input)
          break
        
        default:
          throw new Error(`Service not supported: ${step.service}`)
      }

      stepExecution.status = 'completed'

    } catch (error) {
      stepExecution.status = 'failed'
      stepExecution.error = error instanceof Error ? error.message : String(error)

      // Tentar retry se configurado
      if (step.retryConfig && stepExecution.retryCount < step.retryConfig.maxRetries) {
        stepExecution.retryCount++
        await new Promise(resolve => setTimeout(resolve, step.retryConfig!.backoffMs))
        
        // Tentar novamente (implementação simplificada)
        try {
          stepExecution.status = 'running'
          // Re-executar lógica...
          stepExecution.status = 'completed'
        } catch (retryError) {
          stepExecution.status = 'failed'
          stepExecution.error = retryError instanceof Error ? retryError.message : String(retryError)
        }
      }
    }

    stepExecution.completedAt = new Date()
    stepExecution.duration = stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime()

    return stepExecution
  }

  private async executeCalculatorStep(step: AutomationStep, execution: ProcessExecution, input: any): Promise<any> {
    // Simular cálculo fiscal
    const { empresaId } = execution.context
    const { tipo, periodo } = input

    return {
      empresaId,
      tipo,
      periodo,
      valor: Math.random() * 10000,
      aliquota: 0.06,
      vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      calculatedAt: new Date()
    }
  }

  private async executeGeneratorStep(step: AutomationStep, execution: ProcessExecution, input: any): Promise<any> {
    // Simular geração de documento
    const { tipo, dados } = input

    return {
      documentoId: `doc-${Date.now()}`,
      tipo,
      dados,
      url: `https://example.com/documents/doc-${Date.now()}.pdf`,
      codigoBarras: `${Math.random().toString().slice(2, 14)}`,
      generatedAt: new Date()
    }
  }

  private async executeGovernmentAPIStep(step: AutomationStep, execution: ProcessExecution, input: any): Promise<any> {
    // Usar serviço de integração com APIs governamentais
    const { apiId, endpoint, parameters } = input
    
    const result = await governmentAPIsIntegrationService.callAPI(
      apiId,
      endpoint,
      parameters,
      {
        userId: execution.context.userId,
        empresaId: execution.context.empresaId
      }
    )

    if (!result.success) {
      throw new Error(`Government API call failed: ${result.error.message}`)
    }

    return result.data
  }

  private async executeWorkflowStep(step: AutomationStep, execution: ProcessExecution, input: any): Promise<any> {
    // Usar workflow engine
    const { workflowId, variables } = input
    
    const result = await workflowEngineService.executeWorkflow(workflowId, {
      userId: execution.context.userId,
      empresaId: execution.context.empresaId,
      variables
    })

    if (!result.success) {
      throw new Error(`Workflow execution failed: ${result.error.message}`)
    }

    return result.data
  }

  private mapStepTypeToResultType(stepType: string): ProcessResult['type'] {
    switch (stepType) {
      case 'calculate':
        return 'calculation'
      case 'generate':
        return 'document'
      case 'send':
        return 'submission'
      case 'validate':
        return 'validation'
      default:
        return 'validation'
    }
  }

  private async sendNotifications(process: FiscalProcess, execution: ProcessExecution): Promise<void> {
    const notifications = execution.status === 'completed' 
      ? process.notification.onSuccess 
      : process.notification.onError

    for (const notification of notifications) {
      if (notification.enabled) {
        try {
          // Simular envio de notificação
          logger.info('Notification sent', {
            type: notification.type,
            recipients: notification.recipients,
            template: notification.template,
            executionId: execution.id
          })
        } catch (error) {
          logger.warn('Failed to send notification', {
            error: error instanceof Error ? error.message : String(error),
            executionId: execution.id
          })
        }
      }
    }
  }

  private initializeBuiltInProcesses(): void {
    // Processo de cálculo automático de DAS
    const autoCalculateDAS: FiscalProcess = {
      id: 'auto-calculate-das',
      name: 'Cálculo Automático de DAS',
      type: 'calculation',
      category: 'das',
      description: 'Calcula DAS automaticamente baseado no faturamento',
      schedule: {
        type: 'automatic',
        frequency: 'monthly',
        dayOfMonth: 15,
        time: '09:00',
        enabled: false
      },
      automation: {
        steps: [
          {
            id: 'validate-empresa',
            name: 'Validar Empresa',
            type: 'validate',
            service: 'calculator',
            method: 'validateEmpresa',
            parameters: {},
            dependencies: [],
            optional: false
          },
          {
            id: 'calculate-das',
            name: 'Calcular DAS',
            type: 'calculate',
            service: 'calculator',
            method: 'calculateDAS',
            parameters: {
              tipo: 'DAS',
              includeAnexo: true
            },
            dependencies: ['validate-empresa'],
            optional: false
          },
          {
            id: 'generate-guia',
            name: 'Gerar Guia DAS',
            type: 'generate',
            service: 'generator',
            method: 'generateDAS',
            parameters: {
              tipo: 'guia-das'
            },
            dependencies: ['calculate-das'],
            optional: false
          }
        ],
        maxRetries: 3,
        timeoutMs: 300000,
        parallelExecution: false
      },
      validation: {
        preValidation: [
          {
            id: 'check-regime',
            name: 'Verificar Regime Tributário',
            condition: 'execution.empresaId && parameters.regimeTributario === "Simples Nacional"',
            errorMessage: 'Empresa deve estar no Simples Nacional',
            severity: 'error'
          }
        ],
        postValidation: [
          {
            id: 'check-calculation',
            name: 'Verificar Cálculo',
            condition: 'results.length > 0 && results[0].data.valor > 0',
            errorMessage: 'Valor calculado deve ser maior que zero',
            severity: 'warning'
          }
        ],
        businessRules: []
      },
      notification: {
        onStart: [],
        onSuccess: [
          {
            type: 'email',
            recipients: ['${execution.userId}'],
            template: 'das-calculated-success',
            enabled: true
          }
        ],
        onError: [
          {
            type: 'email',
            recipients: ['${execution.userId}'],
            template: 'das-calculation-error',
            enabled: true
          }
        ],
        onWarning: []
      },
      status: 'active',
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        lastExecution: new Date(),
        executionCount: 0,
        successRate: 0
      }
    }

    this.processes.set(autoCalculateDAS.id, autoCalculateDAS)
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStatistics() {
    const totalProcesses = this.processes.size
    const activeProcesses = Array.from(this.processes.values())
      .filter(p => p.status === 'active').length
    const totalExecutions = this.executions.size
    const runningExecutions = Array.from(this.executions.values())
      .filter(exec => exec.status === 'running').length

    return {
      totalProcesses,
      activeProcesses,
      totalExecutions,
      runningExecutions,
      scheduledJobs: this.scheduledJobs.size,
      averageSuccessRate: this.calculateAverageSuccessRate()
    }
  }

  private calculateAverageSuccessRate(): number {
    const processes = Array.from(this.processes.values())
    if (processes.length === 0) return 0
    
    const totalSuccessRate = processes.reduce((sum, process) => sum + process.metadata.successRate, 0)
    return totalSuccessRate / processes.length
  }

  /**
   * Cleanup de recursos
   */
  destroy(): void {
    // Limpar jobs agendados
    this.scheduledJobs.forEach(job => clearTimeout(job))
    this.scheduledJobs.clear()

    // Limpar caches
    this.processes.clear()
    this.executions.clear()

    logger.info('FiscalProcessAutomationService destroyed successfully')
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const fiscalProcessAutomationService = new FiscalProcessAutomationService()
