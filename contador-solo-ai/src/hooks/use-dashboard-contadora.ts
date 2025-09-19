/**
 * Hook para dashboard da contadora com dados reais do Supabase
 * Focado em informações práticas e acionáveis
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import {
  DadosDashboard,
  ObrigacaoFiscal,
  EmpresaResumo,
  CalculoFiscal,
  DocumentoResumo,
  AtividadeRecente,
  AlertaFiscal,
  EventoCalendario,
  FiltrosDashboard
} from '@/types/dashboard-contadora.types'

export function useDashboardContadora(filtros: FiltrosDashboard = { periodo: 'mes' }) {
  const { user } = useAuth()

  const {
    data: dadosDashboard,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboard-contadora', user?.id, filtros],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const dados = await buscarDadosDashboard(user.id, filtros)
      return dados
    },
    enabled: !!user?.id,
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
    staleTime: 2 * 60 * 1000 // Considerar dados frescos por 2 minutos
  })

  return {
    dados: dadosDashboard,
    isLoading,
    error,
    refetch
  }
}

// =====================================================
// FUNÇÃO PRINCIPAL PARA BUSCAR DADOS
// =====================================================

async function buscarDadosDashboard(userId: string, filtros: FiltrosDashboard): Promise<DadosDashboard> {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimSemana = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Buscar dados em paralelo para melhor performance
  const [
    obrigacoes,
    empresas,
    calculos,
    documentos
  ] = await Promise.all([
    buscarObrigacoesFiscais(userId),
    buscarEmpresas(userId),
    buscarCalculosFiscais(userId, inicioMes),
    buscarDocumentos(userId, inicioMes)
  ])

  // Processar dados para resumos
  const resumo_obrigacoes = processarResumoObrigacoes(obrigacoes, hoje, fimSemana)
  const resumo_empresas = processarResumoEmpresas(empresas, obrigacoes)
  const resumo_documentos = processarResumoDocumentos(documentos, hoje)
  const resumo_calculos = processarResumoCalculos(calculos)

  // Gerar atividades recentes
  const atividades_recentes = gerarAtividadesRecentes(calculos, documentos, obrigacoes)

  // Gerar alertas
  const alertas_ativos = gerarAlertas(obrigacoes, calculos, documentos, hoje)

  // Gerar eventos do calendário
  const eventos_calendario = gerarEventosCalendario(obrigacoes, calculos, hoje, fimSemana)

  // Calcular métricas práticas
  const metricas_praticas = calcularMetricasPraticas(
    calculos,
    documentos,
    obrigacoes,
    empresas,
    inicioMes
  )

  return {
    resumo_obrigacoes,
    resumo_empresas,
    resumo_documentos,
    resumo_calculos,
    metricas_praticas,
    obrigacoes_proximas: obrigacoes.filter(o => 
      new Date(o.data_vencimento) <= fimSemana && o.status === 'pendente'
    ).slice(0, 10),
    atividades_recentes: atividades_recentes.slice(0, 10),
    alertas_ativos: alertas_ativos.slice(0, 5),
    eventos_calendario: eventos_calendario.slice(0, 20)
  }
}

// =====================================================
// FUNÇÕES DE BUSCA DE DADOS
// =====================================================

async function buscarObrigacoesFiscais(userId: string): Promise<ObrigacaoFiscal[]> {
  const { data, error } = await supabase
    .from('obrigacoes_fiscais')
    .select('*')
    .order('data_vencimento', { ascending: true })
    .limit(100)

  if (error) {
    console.error('Erro ao buscar obrigações fiscais:', error)
    return []
  }

  return data || []
}

async function buscarEmpresas(userId: string): Promise<EmpresaResumo[]> {
  const { data, error } = await supabase
    .from('empresas')
    .select(`
      id,
      nome,
      nome_fantasia,
      cnpj,
      regime_tributario,
      status,
      ativa,
      created_at
    `)
    .eq('user_id', userId)
    .eq('ativa', true)
    .order('nome')

  if (error) {
    console.error('Erro ao buscar empresas:', error)
    return []
  }

  // Enriquecer dados das empresas com informações de vencimentos
  const empresasEnriquecidas = await Promise.all(
    (data || []).map(async (empresa) => {
      const { data: obrigacoes } = await supabase
        .from('obrigacoes_fiscais')
        .select('valor, data_vencimento, status')
        .eq('empresa_id', empresa.id)
        .eq('status', 'pendente')

      const proximosVencimentos = obrigacoes?.filter(o => 
        new Date(o.data_vencimento) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ).length || 0

      const valorPendente = obrigacoes?.reduce((sum, o) => sum + (o.valor || 0), 0) || 0

      return {
        ...empresa,
        proximos_vencimentos: proximosVencimentos,
        valor_pendente: valorPendente,
        ultima_atividade: empresa.created_at
      }
    })
  )

  return empresasEnriquecidas
}

async function buscarCalculosFiscais(userId: string, dataInicio: Date): Promise<CalculoFiscal[]> {
  const { data, error } = await supabase
    .from('calculos_fiscais')
    .select(`
      id,
      empresa_id,
      tipo_calculo,
      competencia,
      valor_total,
      data_vencimento,
      status,
      created_at,
      empresas!inner(nome, user_id)
    `)
    .eq('empresas.user_id', userId)
    .gte('created_at', dataInicio.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar cálculos fiscais:', error)
    return []
  }

  return (data || []).map(calc => ({
    id: calc.id,
    empresa_id: calc.empresa_id,
    empresa_nome: (calc.empresas as any)?.nome || 'N/A',
    tipo_calculo: calc.tipo_calculo,
    competencia: calc.competencia,
    valor_total: calc.valor_total,
    data_vencimento: calc.data_vencimento,
    status: calc.status,
    created_at: calc.created_at
  }))
}

async function buscarDocumentos(userId: string, dataInicio: Date): Promise<DocumentoResumo[]> {
  const { data, error } = await supabase
    .from('documentos')
    .select(`
      id,
      empresa_id,
      tipo_documento,
      arquivo_nome,
      status_processamento,
      valor_total,
      data_emissao,
      created_at,
      empresas!inner(nome, user_id)
    `)
    .eq('empresas.user_id', userId)
    .gte('created_at', dataInicio.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Erro ao buscar documentos:', error)
    return []
  }

  return (data || []).map(doc => ({
    id: doc.id,
    empresa_id: doc.empresa_id,
    empresa_nome: (doc.empresas as any)?.nome || 'N/A',
    tipo_documento: doc.tipo_documento,
    arquivo_nome: doc.arquivo_nome,
    status_processamento: doc.status_processamento,
    valor_total: doc.valor_total,
    data_emissao: doc.data_emissao,
    created_at: doc.created_at
  }))
}

// =====================================================
// FUNÇÕES DE PROCESSAMENTO DE DADOS
// =====================================================

function processarResumoObrigacoes(obrigacoes: ObrigacaoFiscal[], hoje: Date, fimSemana: Date) {
  const vencendoHoje = obrigacoes.filter(o =>
    new Date(o.data_vencimento).toDateString() === hoje.toDateString() &&
    o.status === 'pendente'
  ).length

  const vencendoSemana = obrigacoes.filter(o =>
    new Date(o.data_vencimento) <= fimSemana &&
    new Date(o.data_vencimento) >= hoje &&
    o.status === 'pendente'
  ).length

  const vencidas = obrigacoes.filter(o =>
    new Date(o.data_vencimento) < hoje &&
    o.status === 'pendente'
  ).length

  const valorTotalPendente = obrigacoes
    .filter(o => o.status === 'pendente')
    .reduce((sum, o) => sum + (o.valor || 0), 0)

  return {
    total: obrigacoes.length,
    vencendo_hoje: vencendoHoje,
    vencendo_semana: vencendoSemana,
    vencidas,
    valor_total_pendente: valorTotalPendente
  }
}

function processarResumoEmpresas(empresas: EmpresaResumo[], obrigacoes: ObrigacaoFiscal[]) {
  const comPendencias = empresas.filter(e => e.proximos_vencimentos > 0).length
  const emDia = empresas.length - comPendencias

  return {
    total_ativas: empresas.length,
    com_pendencias: comPendencias,
    em_dia: emDia,
    inativas: 0 // Já filtrado apenas ativas
  }
}

function processarResumoDocumentos(documentos: DocumentoResumo[], hoje: Date) {
  const processadosHoje = documentos.filter(d =>
    new Date(d.created_at).toDateString() === hoje.toDateString()
  ).length

  const pendentes = documentos.filter(d =>
    d.status_processamento === 'pendente' || d.status_processamento === 'processando'
  ).length

  const comErro = documentos.filter(d =>
    d.status_processamento === 'erro'
  ).length

  return {
    total_mes: documentos.length,
    processados_hoje: processadosHoje,
    pendentes,
    com_erro: comErro
  }
}

function processarResumoCalculos(calculos: CalculoFiscal[]) {
  const pendentesPagamento = calculos.filter(c => c.status === 'pendente').length
  const vencidos = calculos.filter(c =>
    c.status === 'pendente' &&
    c.data_vencimento &&
    new Date(c.data_vencimento) < new Date()
  ).length

  const valorTotalMes = calculos.reduce((sum, c) => sum + (c.valor_total || 0), 0)

  return {
    realizados_mes: calculos.length,
    pendentes_pagamento: pendentesPagamento,
    vencidos,
    valor_total_mes: valorTotalMes
  }
}

function gerarAtividadesRecentes(
  calculos: CalculoFiscal[],
  documentos: DocumentoResumo[],
  obrigacoes: ObrigacaoFiscal[]
): AtividadeRecente[] {
  const atividades: AtividadeRecente[] = []

  // Adicionar cálculos recentes
  calculos.slice(0, 5).forEach(calc => {
    atividades.push({
      id: calc.id,
      tipo: 'calculo',
      descricao: `${calc.tipo_calculo} - ${calc.competencia}`,
      empresa_nome: calc.empresa_nome,
      valor: calc.valor_total,
      data: calc.created_at,
      status: calc.status,
      icone: 'Calculator'
    })
  })

  // Adicionar documentos recentes
  documentos.slice(0, 5).forEach(doc => {
    atividades.push({
      id: doc.id,
      tipo: 'documento',
      descricao: `${doc.tipo_documento} processado`,
      empresa_nome: doc.empresa_nome,
      valor: doc.valor_total || undefined,
      data: doc.created_at,
      status: doc.status_processamento,
      icone: 'FileText'
    })
  })

  // Ordenar por data mais recente
  return atividades.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
}

function gerarAlertas(
  obrigacoes: ObrigacaoFiscal[],
  calculos: CalculoFiscal[],
  documentos: DocumentoResumo[],
  hoje: Date
): AlertaFiscal[] {
  const alertas: AlertaFiscal[] = []

  // Alertas de vencimentos próximos
  obrigacoes.forEach(obr => {
    const diasParaVencimento = Math.ceil(
      (new Date(obr.data_vencimento).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diasParaVencimento <= 3 && diasParaVencimento >= 0 && obr.status === 'pendente') {
      alertas.push({
        id: `venc-${obr.id}`,
        tipo: 'vencimento',
        titulo: 'Vencimento Próximo',
        mensagem: `${obr.tipo_obrigacao} vence em ${diasParaVencimento} dia(s)`,
        prioridade: diasParaVencimento === 0 ? 'critica' : 'alta',
        data_criacao: hoje.toISOString(),
        data_vencimento: obr.data_vencimento,
        empresa_nome: obr.empresa_nome,
        valor: obr.valor || undefined,
        lido: false,
        acao_sugerida: 'Verificar documentação necessária'
      })
    }
  })

  // Alertas de documentos com erro
  documentos.forEach(doc => {
    if (doc.status_processamento === 'erro') {
      alertas.push({
        id: `doc-${doc.id}`,
        tipo: 'documento',
        titulo: 'Erro no Processamento',
        mensagem: `Erro ao processar ${doc.tipo_documento}`,
        prioridade: 'media',
        data_criacao: hoje.toISOString(),
        empresa_nome: doc.empresa_nome,
        lido: false,
        acao_sugerida: 'Reenviar documento ou verificar formato'
      })
    }
  })

  return alertas.sort((a, b) => {
    const prioridadeOrder = { critica: 4, alta: 3, media: 2, baixa: 1 }
    return prioridadeOrder[b.prioridade] - prioridadeOrder[a.prioridade]
  })
}

function gerarEventosCalendario(
  obrigacoes: ObrigacaoFiscal[],
  calculos: CalculoFiscal[],
  hoje: Date,
  fimPeriodo: Date
): EventoCalendario[] {
  const eventos: EventoCalendario[] = []

  // Adicionar obrigações como eventos
  obrigacoes.forEach(obr => {
    const dataVencimento = new Date(obr.data_vencimento)
    if (dataVencimento >= hoje && dataVencimento <= fimPeriodo) {
      eventos.push({
        id: `obr-${obr.id}`,
        titulo: obr.tipo_obrigacao,
        descricao: obr.descricao || obr.nome,
        data: obr.data_vencimento,
        tipo: 'obrigacao',
        prioridade: obr.prioridade,
        empresa_nome: obr.empresa_nome,
        valor: obr.valor || undefined,
        status: obr.status
      })
    }
  })

  // Adicionar vencimentos de cálculos
  calculos.forEach(calc => {
    if (calc.data_vencimento) {
      const dataVencimento = new Date(calc.data_vencimento)
      if (dataVencimento >= hoje && dataVencimento <= fimPeriodo && calc.status === 'pendente') {
        eventos.push({
          id: `calc-${calc.id}`,
          titulo: `Vencimento ${calc.tipo_calculo}`,
          descricao: `${calc.tipo_calculo} - ${calc.competencia}`,
          data: calc.data_vencimento,
          tipo: 'vencimento',
          prioridade: 'media',
          empresa_nome: calc.empresa_nome,
          valor: calc.valor_total,
          status: calc.status
        })
      }
    }
  })

  return eventos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
}

function calcularMetricasPraticas(
  calculos: CalculoFiscal[],
  documentos: DocumentoResumo[],
  obrigacoes: ObrigacaoFiscal[],
  empresas: EmpresaResumo[],
  inicioMes: Date
) {
  const faturamentoClientesMes = calculos
    .filter(c => c.tipo_calculo.includes('DAS') || c.tipo_calculo.includes('Faturamento'))
    .reduce((sum, c) => sum + (c.valor_total || 0), 0)

  const impostosCalculadosMes = calculos.reduce((sum, c) => sum + (c.valor_total || 0), 0)
  const impostosPagosMes = calculos
    .filter(c => c.status === 'pago')
    .reduce((sum, c) => sum + (c.valor_total || 0), 0)

  const obrigacoesEntreguesMes = obrigacoes.filter(o => o.status === 'entregue').length
  const obrigacoesTotalMes = obrigacoes.length

  const taxaPontualidade = obrigacoesTotalMes > 0
    ? (obrigacoesEntreguesMes / obrigacoesTotalMes) * 100
    : 100

  const empresasEmDia = empresas.filter(e => e.proximos_vencimentos === 0).length
  const alertasAtivos = obrigacoes.filter(o =>
    o.status === 'pendente' && new Date(o.data_vencimento) <= new Date()
  ).length

  return {
    faturamento_clientes_mes: faturamentoClientesMes,
    impostos_calculados_mes: impostosCalculadosMes,
    impostos_pagos_mes: impostosPagosMes,
    documentos_processados_mes: documentos.length,
    calculos_realizados_mes: calculos.length,
    obrigacoes_entregues_mes: obrigacoesEntreguesMes,
    taxa_pontualidade: taxaPontualidade,
    empresas_em_dia: empresasEmDia,
    alertas_ativos: alertasAtivos
  }
}
