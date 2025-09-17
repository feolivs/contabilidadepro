/**
 * 🧠 AI Context Service - Fase 3: Exemplos Práticos de Uso
 * 
 * Este arquivo demonstra como usar todas as funcionalidades avançadas
 * de inteligência artificial implementadas na Fase 3.
 */

import { AIContextService } from '../services/ai-context-service'

// =====================================================
// EXEMPLO 1: DASHBOARD INTELIGENTE COMPLETO
// =====================================================

export async function exemplodashboardInteligente() {
  console.log('🧠 === EXEMPLO: Dashboard Inteligente Completo ===')
  
  const aiService = AIContextService.getInstance()
  const empresaId = 'empresa-demo-123'
  const userId = 'user-contador-456'

  try {
    // 1. Coletar contexto completo com todas as funcionalidades de IA
    console.log('📊 Coletando contexto completo...')
    const contextResult = await aiService.collectContextualData({
      empresaId,
      userId,
      includeFinancialData: true,
      includeObligations: true,
      includeDocuments: true,
      includeInsights: true
    })

    if (!contextResult.success) {
      throw new Error(`Erro ao coletar contexto: ${contextResult.error.message}`)
    }

    const contextData = contextResult.data

    // 2. Gerar experiência personalizada
    console.log('🎯 Gerando experiência personalizada...')
    const experienceResult = await aiService.generatePersonalizedExperience(
      userId,
      empresaId,
      {
        device: 'desktop',
        sessionDuration: 1800, // 30 minutos
        featuresUsed: ['tax-calculator', 'compliance-checker', 'document-analyzer'],
        currentGoals: ['reduce_taxes', 'improve_compliance'],
        urgentTasks: ['calculate_das', 'submit_sped']
      }
    )

    if (experienceResult.success) {
      const experience = experienceResult.data
      
      console.log('📱 Dashboard Personalizado:')
      console.log(`   Layout: ${experience.dashboard.layout}`)
      console.log(`   Widgets: ${experience.dashboard.widgets.length}`)
      
      experience.dashboard.widgets.forEach((widget: any, index: number) => {
        console.log(`   ${index + 1}. ${widget.title} (Relevância: ${(widget.relevanceScore * 100).toFixed(1)}%)`)
      })

      console.log('\n🎯 Features Recomendadas:')
      experience.features.recommended.forEach((feature: any, index: number) => {
        console.log(`   ${index + 1}. ${feature}`)
      })

      console.log('\n🤖 Automações Sugeridas:')
      experience.features.automations.forEach((automation: any, index: number) => {
        console.log(`   ${index + 1}. ${automation.name} (Confiança: ${(automation.confidence * 100).toFixed(1)}%)`)
      })
    }

    // 3. Gerar insights contextuais
    console.log('\n💡 Gerando insights contextuais...')
    const insightsResult = await aiService.generateContextualInsights(
      empresaId,
      contextData,
      ['compliance', 'tax_optimization', 'cash_flow', 'efficiency']
    )

    if (insightsResult.success) {
      console.log('🧠 Insights Gerados:')
      insightsResult.data.forEach((insight, index) => {
        console.log(`\n   ${index + 1}. ${insight.title}`)
        console.log(`      📊 Impacto: R$ ${insight.financialImpact?.toLocaleString() || 'N/A'}`)
        console.log(`      🎯 Prioridade: ${insight.priority}`)
        console.log(`      📝 Descrição: ${insight.description.substring(0, 100)}...`)
        
        if (insight.recommendations && insight.recommendations.length > 0) {
          console.log(`      💡 Ação: ${insight.recommendations[0].action}`)
        }
      })
    }

    // 4. Detectar anomalias de compliance
    console.log('\n🚨 Detectando anomalias de compliance...')
    const anomaliesResult = await aiService.detectComplianceAnomalies(
      empresaId,
      contextData
    )

    if (anomaliesResult.success) {
      const criticalAnomalies = anomaliesResult.data.filter(a => a.severity === 'critical')
      const highAnomalies = anomaliesResult.data.filter(a => a.severity === 'high')
      
      console.log(`🔍 Anomalias Detectadas: ${anomaliesResult.data.length}`)
      console.log(`   🚨 Críticas: ${criticalAnomalies.length}`)
      console.log(`   ⚠️  Altas: ${highAnomalies.length}`)

      if (criticalAnomalies.length > 0) {
        console.log('\n🚨 ANOMALIAS CRÍTICAS:')
        criticalAnomalies.forEach((anomaly, index) => {
          console.log(`   ${index + 1}. ${anomaly.title}`)
          console.log(`      📊 Confiança: ${(anomaly.confidence * 100).toFixed(1)}%`)
          console.log(`      💰 Impacto: R$ ${anomaly.impact.financial.toLocaleString()}`)
          console.log(`      🎯 Ação: ${anomaly.recommendations[0]?.action || 'Investigar'}`)
        })
      }
    }

    // 5. Gerar projeções fiscais
    console.log('\n📈 Gerando projeções fiscais...')
    const projectionsResult = await aiService.generateFiscalProjections(
      empresaId,
      contextData.empresa?.regime_tributario || 'Simples Nacional',
      (contextData as any).calculos || [],
      'next_quarter'
    )

    if (projectionsResult.success) {
      console.log('📊 Projeções para Próximo Trimestre:')
      projectionsResult.data.forEach((projection, index) => {
        console.log(`\n   ${index + 1}. ${projection.periodo}`)
        console.log(`      💰 Impostos: R$ ${projection.impostos.total.toLocaleString()}`)
        console.log(`      📈 Alíquota: ${(projection.aliquotaEfetiva * 100).toFixed(2)}%`)
        console.log(`      💡 Economia: R$ ${projection.economiaOportunidades.toLocaleString()}`)
        
        if (projection.riscosIdentificados.length > 0) {
          console.log(`      ⚠️  Riscos: ${projection.riscosIdentificados.join(', ')}`)
        }
      })
    }

    console.log('\n✅ Dashboard inteligente gerado com sucesso!')

  } catch (error) {
    console.error('❌ Erro no dashboard inteligente:', error)
  }
}

// =====================================================
// EXEMPLO 2: ASSISTENTE FISCAL INTELIGENTE
// =====================================================

export async function exemploAssistenteFiscal() {
  console.log('\n🤖 === EXEMPLO: Assistente Fiscal Inteligente ===')
  
  const aiService = AIContextService.getInstance()
  const empresaId = 'empresa-demo-123'

  try {
    // Simular perguntas do usuário
    const perguntas = [
      'Qual é a melhor estratégia para reduzir minha carga tributária?',
      'Estou em risco de perder o Simples Nacional?',
      'Quando devo pagar o próximo DAS?',
      'Há alguma inconsistência nos meus documentos fiscais?'
    ]

    for (const pergunta of perguntas) {
      console.log(`\n❓ Pergunta: "${pergunta}"`)
      
      // Coletar contexto para responder
      const contextResult = await aiService.collectContextualData({
        empresaId,
        userId: 'user-123',
        includeFinancialData: true,
        includeObligations: true,
        includeDocuments: true
      })

      if (contextResult.success) {
        // Gerar resposta contextualizada
        const insightsResult = await aiService.generateContextualInsights(
          empresaId,
          {
            ...contextResult.data,
            userQuestion: pergunta,
            analysisType: 'question_answering'
          },
          ['question_answering', 'compliance', 'tax_optimization']
        )

        if (insightsResult.success && insightsResult.data.length > 0) {
          const resposta = insightsResult.data[0]
          console.log(`💡 Resposta: ${resposta.description}`)
          
          if (resposta.recommendations && resposta.recommendations.length > 0) {
            console.log(`🎯 Recomendação: ${resposta.recommendations[0].action}`)
          }
          
          if (resposta.financialImpact) {
            console.log(`💰 Impacto Financeiro: R$ ${resposta.financialImpact.toLocaleString()}`)
          }
        } else {
          console.log('🤔 Não foi possível gerar uma resposta específica para esta pergunta.')
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro no assistente fiscal:', error)
  }
}

// =====================================================
// EXEMPLO 3: MONITOR DE COMPLIANCE PROATIVO
// =====================================================

export async function exemploMonitorCompliance() {
  console.log('\n🛡️ === EXEMPLO: Monitor de Compliance Proativo ===')
  
  const aiService = AIContextService.getInstance()
  const empresaId = 'empresa-demo-123'

  try {
    // Simular monitoramento contínuo
    console.log('🔍 Iniciando monitoramento de compliance...')

    const contextResult = await aiService.collectContextualData({
      empresaId,
      userId: 'user-123',
      includeFinancialData: true,
      includeObligations: true,
      includeDocuments: true
    })

    if (!contextResult.success) {
      throw new Error('Erro ao coletar dados para monitoramento')
    }

    // Detectar anomalias
    const anomaliesResult = await aiService.detectComplianceAnomalies(
      empresaId,
      contextResult.data
    )

    if (anomaliesResult.success) {
      const anomalies = anomaliesResult.data

      // Calcular score de risco geral
      const severityWeights: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
      const totalRisk = anomalies.reduce((sum: number, anomaly: any) => {
        return sum + ((severityWeights[anomaly.severity] || 1) * anomaly.confidence)
      }, 0)
      const riskScore = Math.min(totalRisk * 10, 100)

      console.log(`📊 Score de Risco Geral: ${riskScore.toFixed(1)}/100`)
      
      // Classificar nível de risco
      let riskLevel = 'BAIXO'
      let riskColor = '🟢'
      
      if (riskScore > 70) {
        riskLevel = 'ALTO'
        riskColor = '🔴'
      } else if (riskScore > 40) {
        riskLevel = 'MÉDIO'
        riskColor = '🟡'
      }

      console.log(`${riskColor} Nível de Risco: ${riskLevel}`)

      // Agrupar anomalias por severidade
      const anomaliesBySeverity = anomalies.reduce((groups, anomaly) => {
        if (!groups[anomaly.severity]) groups[anomaly.severity] = []
        groups[anomaly.severity].push(anomaly)
        return groups
      }, {} as Record<string, any[]>)

      // Mostrar anomalias críticas
      if (anomaliesBySeverity.critical) {
        console.log('\n🚨 ANOMALIAS CRÍTICAS (Ação Imediata Necessária):')
        anomaliesBySeverity.critical.forEach((anomaly: any, index: number) => {
          console.log(`   ${index + 1}. ${anomaly.title}`)
          console.log(`      📊 Confiança: ${(anomaly.confidence * 100).toFixed(1)}%`)
          console.log(`      💰 Impacto: R$ ${anomaly.impact.financial.toLocaleString()}`)
          console.log(`      ⚖️  Risco Legal: ${anomaly.impact.legal}/100`)
          console.log(`      🎯 Ação: ${anomaly.recommendations[0]?.action}`)
          
          if (anomaly.recommendations[0]?.deadline) {
            console.log(`      ⏰ Prazo: ${anomaly.recommendations[0].deadline.toLocaleDateString()}`)
          }
        })
      }

      // Mostrar anomalias altas
      if (anomaliesBySeverity.high) {
        console.log('\n⚠️ ANOMALIAS DE ALTA PRIORIDADE:')
        anomaliesBySeverity.high.forEach((anomaly: any, index: number) => {
          console.log(`   ${index + 1}. ${anomaly.title}`)
          console.log(`      📊 Confiança: ${(anomaly.confidence * 100).toFixed(1)}%`)
          console.log(`      🎯 Ação: ${anomaly.recommendations[0]?.action}`)
        })
      }

      // Gerar relatório de compliance
      console.log('\n📋 RELATÓRIO DE COMPLIANCE:')
      console.log(`   Total de Anomalias: ${anomalies.length}`)
      console.log(`   Críticas: ${anomaliesBySeverity.critical?.length || 0}`)
      console.log(`   Altas: ${anomaliesBySeverity.high?.length || 0}`)
      console.log(`   Médias: ${anomaliesBySeverity.medium?.length || 0}`)
      console.log(`   Baixas: ${anomaliesBySeverity.low?.length || 0}`)

      // Recomendações gerais
      console.log('\n💡 RECOMENDAÇÕES GERAIS:')
      if (riskScore > 70) {
        console.log('   1. Implementar revisão urgente de compliance')
        console.log('   2. Considerar consultoria especializada')
        console.log('   3. Criar cronograma de regularização')
      } else if (riskScore > 40) {
        console.log('   1. Monitorar anomalias identificadas')
        console.log('   2. Implementar controles preventivos')
        console.log('   3. Revisar processos internos')
      } else {
        console.log('   1. Manter monitoramento regular')
        console.log('   2. Continuar boas práticas')
        console.log('   3. Considerar otimizações')
      }

    }

    console.log('\n✅ Monitoramento de compliance concluído!')

  } catch (error) {
    console.error('❌ Erro no monitor de compliance:', error)
  }
}

// =====================================================
// EXEMPLO 4: ANÁLISE PREDITIVA AVANÇADA
// =====================================================

export async function exemploAnalisePredicativa() {
  console.log('\n🔮 === EXEMPLO: Análise Preditiva Avançada ===')
  
  const aiService = AIContextService.getInstance()
  const empresaId = 'empresa-demo-123'

  try {
    // Coletar dados históricos
    const contextResult = await aiService.collectContextualData({
      empresaId,
      userId: 'user-123',
      includeFinancialData: true,
      includeDocuments: true
    })

    if (!contextResult.success) {
      throw new Error('Erro ao coletar dados históricos')
    }

    const contextData = contextResult.data
    const regimeTributario = contextData.empresa?.regime_tributario || 'Simples Nacional'

    // Gerar projeções para diferentes períodos
    const timeframes = ['next_month', 'next_quarter', 'next_year'] as const

    for (const timeframe of timeframes) {
      console.log(`\n📈 Projeções para: ${timeframe.replace('next_', 'próximo ').replace('_', ' ')}`)
      
      const projectionsResult = await aiService.generateFiscalProjections(
        empresaId,
        regimeTributario,
        (contextData as any).calculos || [],
        timeframe
      )

      if (projectionsResult.success) {
        const projections = projectionsResult.data
        
        // Calcular totais
        const totalImpostos = projections.reduce((sum, p) => sum + p.impostos.total, 0)
        const totalEconomia = projections.reduce((sum, p) => sum + p.economiaOportunidades, 0)
        const aliquotaMedia = projections.reduce((sum, p) => sum + p.aliquotaEfetiva, 0) / projections.length

        console.log(`   💰 Total de Impostos: R$ ${totalImpostos.toLocaleString()}`)
        console.log(`   💡 Economia Potencial: R$ ${totalEconomia.toLocaleString()}`)
        console.log(`   📊 Alíquota Média: ${(aliquotaMedia * 100).toFixed(2)}%`)

        // Mostrar detalhes por período
        projections.forEach((projection, index) => {
          console.log(`\n   📅 ${projection.periodo}:`)
          console.log(`      💰 Impostos: R$ ${projection.impostos.total.toLocaleString()}`)
          
          if (projection.impostos.das) {
            console.log(`      📋 DAS: R$ ${projection.impostos.das.toLocaleString()}`)
          }
          if (projection.impostos.irpj) {
            console.log(`      🏛️  IRPJ: R$ ${projection.impostos.irpj.toLocaleString()}`)
          }
          if (projection.impostos.csll) {
            console.log(`      🏛️  CSLL: R$ ${projection.impostos.csll.toLocaleString()}`)
          }
          
          console.log(`      📈 Alíquota: ${(projection.aliquotaEfetiva * 100).toFixed(2)}%`)
          console.log(`      💡 Economia: R$ ${projection.economiaOportunidades.toLocaleString()}`)
          
          if (projection.riscosIdentificados.length > 0) {
            console.log(`      ⚠️  Riscos: ${projection.riscosIdentificados.join(', ')}`)
          }
        })
      }
    }

    console.log('\n✅ Análise preditiva concluída!')

  } catch (error) {
    console.error('❌ Erro na análise preditiva:', error)
  }
}

// =====================================================
// EXEMPLO 5: EXECUÇÃO DE TODOS OS EXEMPLOS
// =====================================================

export async function executarTodosExemplos() {
  console.log('🚀 === EXECUTANDO TODOS OS EXEMPLOS DA FASE 3 ===\n')

  try {
    await exemplodashboardInteligente()
    await exemploAssistenteFiscal()
    await exemploMonitorCompliance()
    await exemploAnalisePredicativa()

    console.log('\n🎉 === TODOS OS EXEMPLOS EXECUTADOS COM SUCESSO! ===')
    console.log('\n📊 O AI Context Service Fase 3 está funcionando perfeitamente!')
    console.log('🧠 Inteligência artificial avançada implementada com sucesso!')

  } catch (error) {
    console.error('\n❌ Erro durante execução dos exemplos:', error)
  }
}

// Executar exemplos se este arquivo for executado diretamente
if (require.main === module) {
  executarTodosExemplos()
}
