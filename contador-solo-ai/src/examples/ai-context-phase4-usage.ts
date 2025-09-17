/**
 * 🚀 AI Context Service - FASE 4: Exemplos de Uso
 * Integração e Automação Completa
 */

import { AIContextService } from '@/services/ai-context-service'
import { workflowEngineService } from '@/services/workflow-engine'
import { governmentAPIsIntegrationService } from '@/services/government-apis-integration'
import { fiscalProcessAutomationService } from '@/services/fiscal-process-automation'
import { orchestrationMonitoringService } from '@/services/orchestration-monitoring'

// =====================================================
// 🔄 EXEMPLOS DE WORKFLOW ENGINE
// =====================================================

/**
 * Exemplo 1: Executar workflow de cálculo de DAS
 */
export async function exemploWorkflowDAS() {
  console.log('🔄 Executando Workflow de Cálculo DAS...')

  try {
    const result = await AIContextService.getInstance().executeWorkflow('calculate-das', {
      userId: 'contador123',
      empresaId: 'empresa456',
      variables: {
        periodo: '2024-01',
        regimeTributario: 'Simples Nacional',
        receitaBruta: 50000,
        anexoSimples: 'I'
      }
    })

    if (result.success) {
      console.log('✅ Workflow executado com sucesso!')
      console.log('📊 Resultado:', {
        executionId: result.data.id,
        status: result.data.status,
        startedAt: result.data.startedAt
      })
    } else {
      console.error('❌ Erro na execução:', result.error.message)
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error)
  }
}

/**
 * Exemplo 2: Monitorar execução de workflow
 */
export async function exemploMonitorarWorkflow() {
  console.log('👀 Monitorando execuções de workflow...')

  try {
    const executions = await AIContextService.getInstance().getActiveExecutions('contador123')

    if (executions.success) {
      console.log('📈 Estatísticas de Execução:')
      console.log('- Workflows:', executions.data.workflows)
      console.log('- Processos Fiscais:', executions.data.fiscalProcesses)
      console.log('- Orquestração:', executions.data.orchestration)
      console.log('- Integrações:', executions.data.integrations)
    }
  } catch (error) {
    console.error('💥 Erro ao monitorar:', error)
  }
}

// =====================================================
// 🏛️ EXEMPLOS DE INTEGRAÇÃO COM APIS GOVERNAMENTAIS
// =====================================================

/**
 * Exemplo 3: Consultar CNPJ na Receita Federal
 */
export async function exemploConsultarCNPJ() {
  console.log('🏛️ Consultando CNPJ na Receita Federal...')

  try {
    const result = await AIContextService.getInstance().consultarCNPJAutomatico(
      '12345678000195',
      'contador123'
    )

    if (result.success) {
      console.log('✅ CNPJ consultado com sucesso!')
      console.log('🏢 Dados da empresa:', {
        cnpj: result.data.data.cnpj,
        razaoSocial: result.data.data.razaoSocial,
        situacao: result.data.data.situacao,
        dataAbertura: result.data.data.dataAbertura
      })
    } else {
      console.error('❌ Erro na consulta:', result.error.message)
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error)
  }
}

/**
 * Exemplo 4: Integração com múltiplas APIs
 */
export async function exemploIntegracaoMultipla() {
  console.log('🔗 Integrando com múltiplas APIs governamentais...')

  const empresaId = '12345678000195'
  const userId = 'contador123'

  try {
    // Consultar Receita Federal
    const cnpjResult = await AIContextService.getInstance().callGovernmentAPI(
      'receita-federal',
      'consultar-cnpj',
      { cnpj: empresaId },
      { userId, empresaId }
    )

    // Consultar SEFAZ
    const sefazResult = await AIContextService.getInstance().callGovernmentAPI(
      'sefaz',
      'situacao-fiscal',
      { cnpj: empresaId, estado: 'SP' },
      { userId, empresaId }
    )

    console.log('📊 Resultados das integrações:')
    console.log('- Receita Federal:', cnpjResult.success ? '✅' : '❌')
    console.log('- SEFAZ:', sefazResult.success ? '✅' : '❌')

    if (cnpjResult.success && sefazResult.success) {
      console.log('🎉 Todas as integrações foram bem-sucedidas!')
    }
  } catch (error) {
    console.error('💥 Erro na integração:', error)
  }
}

// =====================================================
// ⚙️ EXEMPLOS DE AUTOMAÇÃO DE PROCESSOS FISCAIS
// =====================================================

/**
 * Exemplo 5: Calcular DAS automaticamente
 */
export async function exemploCalcularDASAutomatico() {
  console.log('⚙️ Calculando DAS automaticamente...')

  try {
    const result = await AIContextService.getInstance().calculateDASAutomatico(
      'empresa456',
      '2024-01',
      'contador123'
    )

    if (result.success) {
      console.log('✅ DAS calculado automaticamente!')
      console.log('📋 Detalhes da execução:', {
        executionId: result.data.id,
        status: result.data.status,
        steps: result.data.steps?.length || 0
      })

      // Monitorar progresso
      setTimeout(async () => {
        const status = await fiscalProcessAutomationService.getExecutionStatus(result.data.id)
        if (status.success) {
          console.log('📊 Status atualizado:', status.data.status)
          console.log('📈 Resultados:', status.data.results?.length || 0)
        }
      }, 5000)
    } else {
      console.error('❌ Erro no cálculo:', result.error.message)
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error)
  }
}

/**
 * Exemplo 6: Processo fiscal completo com validações
 */
export async function exemploProcessoFiscalCompleto() {
  console.log('🔄 Executando processo fiscal completo...')

  try {
    const result = await AIContextService.getInstance().executeFiscalProcess('auto-calculate-das', {
      userId: 'contador123',
      empresaId: 'empresa456',
      periodo: '2024-01',
      triggerType: 'manual',
      parameters: {
        regimeTributario: 'Simples Nacional',
        anexoSimples: 'I',
        receitaBruta: 75000,
        includeValidations: true,
        generateDocuments: true,
        sendNotifications: true
      }
    })

    if (result.success) {
      console.log('✅ Processo fiscal iniciado!')
      console.log('🎯 Acompanhe o progresso:', {
        executionId: result.data.id,
        processId: result.data.processId,
        status: result.data.status
      })

      // Simular acompanhamento em tempo real
      const monitorExecution = async () => {
        const status = await fiscalProcessAutomationService.getExecutionStatus(result.data.id)
        if (status.success) {
          console.log(`📊 Status: ${status.data.status}`)
          
          if (status.data.status === 'running') {
            setTimeout(monitorExecution, 2000) // Verificar novamente em 2s
          } else {
            console.log('🎉 Processo finalizado!')
            console.log('📋 Resultados:', status.data.results)
            console.log('⚠️ Avisos:', status.data.warnings)
            console.log('❌ Erros:', status.data.errors)
          }
        }
      }

      setTimeout(monitorExecution, 1000)
    } else {
      console.error('❌ Erro no processo:', result.error.message)
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error)
  }
}

// =====================================================
// 🎼 EXEMPLOS DE ORQUESTRAÇÃO E MONITORAMENTO
// =====================================================

/**
 * Exemplo 7: Automação fiscal completa
 */
export async function exemploAutomacaoFiscalCompleta() {
  console.log('🎼 Executando automação fiscal completa...')

  try {
    const result = await AIContextService.getInstance().executeFullFiscalAutomation(
      'empresa456',
      '2024-01',
      'contador123'
    )

    if (result.success) {
      console.log('✅ Automação fiscal iniciada!')
      console.log('🚀 Plano de execução:', {
        executionId: result.data.id,
        planId: result.data.planId,
        tasks: result.data.tasks?.length || 0
      })

      // Monitorar execução da orquestração
      const monitorOrchestration = async () => {
        const status = await orchestrationMonitoringService.getExecutionStatus(result.data.id)
        if (status.success) {
          console.log(`🎯 Status da orquestração: ${status.data.status}`)
          console.log(`📊 Tasks concluídas: ${status.data.tasks?.filter(t => t.status === 'completed').length || 0}`)
          
          if (status.data.status === 'running') {
            setTimeout(monitorOrchestration, 3000) // Verificar novamente em 3s
          } else {
            console.log('🎉 Automação fiscal concluída!')
            console.log('📈 Métricas:', status.data.metrics)
            console.log('🚨 Alertas:', status.data.alerts)
          }
        }
      }

      setTimeout(monitorOrchestration, 2000)
    } else {
      console.error('❌ Erro na automação:', result.error.message)
    }
  } catch (error) {
    console.error('💥 Erro inesperado:', error)
  }
}

/**
 * Exemplo 8: Monitoramento avançado com alertas
 */
export async function exemploMonitoramentoAvancado() {
  console.log('📊 Configurando monitoramento avançado...')

  try {
    // Obter métricas de monitoramento
    const metricsResult = await orchestrationMonitoringService.getMonitoringMetrics()
    
    if (metricsResult.success) {
      console.log('📈 Métricas coletadas:', Object.keys(metricsResult.data).length)
    }

    // Obter alertas ativos
    const alertsResult = await orchestrationMonitoringService.getActiveAlerts()
    
    if (alertsResult.success) {
      console.log('🚨 Alertas ativos:', alertsResult.data.length)
      
      alertsResult.data.forEach(alert => {
        console.log(`- ${alert.severity.toUpperCase()}: ${alert.message}`)
      })
    }

    // Obter estatísticas gerais
    const stats = orchestrationMonitoringService.getStatistics()
    console.log('📊 Estatísticas do sistema:', {
      totalPlans: stats.totalPlans,
      activePlans: stats.activePlans,
      runningExecutions: stats.runningExecutions,
      activeAlerts: stats.activeAlerts,
      successRate: `${(stats.averageSuccessRate * 100).toFixed(1)}%`
    })

  } catch (error) {
    console.error('💥 Erro no monitoramento:', error)
  }
}

// =====================================================
// 🎯 EXEMPLOS DE CASOS DE USO AVANÇADOS
// =====================================================

/**
 * Exemplo 9: Workflow personalizado para cliente específico
 */
export async function exemploWorkflowPersonalizado() {
  console.log('🎯 Criando workflow personalizado...')

  try {
    // Definir workflow personalizado
    const customWorkflow = {
      id: 'custom-monthly-automation',
      name: 'Automação Mensal Personalizada',
      description: 'Workflow específico para cliente com necessidades especiais',
      version: '1.0.0',
      category: 'fiscal' as const,
      trigger: {
        type: 'manual' as const,
        config: {},
        enabled: true
      },
      steps: [
        {
          id: 'validate-data',
          name: 'Validar Dados',
          type: 'condition' as const,
          condition: 'variables.empresaId && variables.periodo',
          onSuccess: 'calculate-taxes',
          onFailure: 'notify-error',
          enabled: true
        },
        {
          id: 'calculate-taxes',
          name: 'Calcular Impostos',
          type: 'action' as const,
          action: {
            type: 'calculate' as const,
            service: 'calculator',
            method: 'calculateAllTaxes',
            parameters: {
              includeOptionalTaxes: true,
              applyOptimizations: true
            }
          },
          onSuccess: 'generate-reports',
          onFailure: 'notify-error',
          enabled: true
        },
        {
          id: 'generate-reports',
          name: 'Gerar Relatórios',
          type: 'action' as const,
          action: {
            type: 'generate' as const,
            service: 'generator',
            method: 'generateCustomReports',
            parameters: {
              includeGraphics: true,
              format: 'pdf'
            }
          },
          onSuccess: 'notify-success',
          onFailure: 'notify-error',
          enabled: true
        },
        {
          id: 'notify-success',
          name: 'Notificar Sucesso',
          type: 'action' as const,
          action: {
            type: 'notify' as const,
            service: 'notifier',
            method: 'sendCustomNotification',
            parameters: {
              template: 'monthly-automation-success'
            }
          },
          enabled: true
        },
        {
          id: 'notify-error',
          name: 'Notificar Erro',
          type: 'action' as const,
          action: {
            type: 'notify' as const,
            service: 'notifier',
            method: 'sendErrorNotification',
            parameters: {
              template: 'monthly-automation-error'
            }
          },
          enabled: true
        }
      ],
      conditions: [],
      settings: {
        maxExecutionTime: 600000, // 10 minutos
        maxRetries: 2,
        enableLogging: true,
        enableNotifications: true,
        priority: 'high' as const,
        tags: ['custom', 'monthly', 'automation']
      },
      metadata: {
        createdBy: 'contador123',
        createdAt: new Date(),
        lastModified: new Date(),
        executionCount: 0,
        successRate: 0
      }
    }

    // Registrar workflow
    const registerResult = await workflowEngineService.registerWorkflow(customWorkflow)
    
    if (registerResult.success) {
      console.log('✅ Workflow personalizado registrado!')
      
      // Executar workflow
      const executeResult = await AIContextService.getInstance().executeWorkflow(customWorkflow.id, {
        userId: 'contador123',
        empresaId: 'empresa456',
        variables: {
          periodo: '2024-01',
          clienteEspecial: true,
          includeAnalytics: true
        }
      })

      if (executeResult.success) {
        console.log('🚀 Workflow personalizado executado!')
        console.log('📋 ID da execução:', executeResult.data.id)
      }
    }

  } catch (error) {
    console.error('💥 Erro no workflow personalizado:', error)
  }
}

/**
 * Exemplo 10: Demonstração completa do sistema
 */
export async function exemploSistemaCompleto() {
  console.log('🎉 Demonstração completa do AI Context Service - Fase 4')
  console.log('=' .repeat(60))

  try {
    // 1. Consultar dados da empresa
    console.log('\n1️⃣ Consultando dados da empresa...')
    await exemploConsultarCNPJ()

    // 2. Executar cálculo automático
    console.log('\n2️⃣ Executando cálculo automático...')
    await exemploCalcularDASAutomatico()

    // 3. Executar automação completa
    console.log('\n3️⃣ Executando automação fiscal completa...')
    await exemploAutomacaoFiscalCompleta()

    // 4. Monitorar sistema
    console.log('\n4️⃣ Monitorando sistema...')
    await exemploMonitoramentoAvancado()

    console.log('\n🎉 Demonstração concluída com sucesso!')
    console.log('✨ O AI Context Service Fase 4 está funcionando perfeitamente!')

  } catch (error) {
    console.error('💥 Erro na demonstração:', error)
  }
}

// =====================================================
// 🚀 FUNÇÃO PRINCIPAL PARA TESTES
// =====================================================

/**
 * Função principal para executar todos os exemplos
 */
export async function executarExemplosFase4() {
  console.log('🚀 Iniciando exemplos da Fase 4 - Integração e Automação')
  console.log('=' .repeat(80))

  const exemplos = [
    { nome: 'Workflow DAS', funcao: exemploWorkflowDAS },
    { nome: 'Monitorar Workflow', funcao: exemploMonitorarWorkflow },
    { nome: 'Consultar CNPJ', funcao: exemploConsultarCNPJ },
    { nome: 'Integração Múltipla', funcao: exemploIntegracaoMultipla },
    { nome: 'Calcular DAS Automático', funcao: exemploCalcularDASAutomatico },
    { nome: 'Processo Fiscal Completo', funcao: exemploProcessoFiscalCompleto },
    { nome: 'Automação Fiscal Completa', funcao: exemploAutomacaoFiscalCompleta },
    { nome: 'Monitoramento Avançado', funcao: exemploMonitoramentoAvancado },
    { nome: 'Workflow Personalizado', funcao: exemploWorkflowPersonalizado }
  ]

  for (const exemplo of exemplos) {
    try {
      console.log(`\n🔄 Executando: ${exemplo.nome}`)
      console.log('-'.repeat(40))
      await exemplo.funcao()
      console.log(`✅ ${exemplo.nome} concluído!`)
    } catch (error) {
      console.error(`❌ Erro em ${exemplo.nome}:`, error)
    }
  }

  console.log('\n🎉 Todos os exemplos da Fase 4 foram executados!')
  console.log('🚀 O sistema está pronto para automação fiscal completa!')
}

// Exportar função principal para uso externo
export default executarExemplosFase4
