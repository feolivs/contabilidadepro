import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import type { TipoDocumento, StatusProcessamento } from '@/types/documento'

/**
 * Interface para estatísticas de documentos
 */
export interface DocumentosStats {
  // Visão geral
  overview: {
    total_documentos: number
    documentos_hoje: number
    documentos_semana: number
    documentos_mes: number
    crescimento_mensal: number
    media_diaria: number
  }
  
  // Status de processamento
  status: {
    pendentes: number
    processando: number
    processados: number
    com_erro: number
    rejeitados: number
    taxa_sucesso: number
    tempo_medio_processamento: number
  }
  
  // Distribuição por tipo
  tipos: Array<{
    tipo: TipoDocumento
    quantidade: number
    percentual: number
    processados: number
    taxa_sucesso_tipo: number
    valor_medio: number
    ultimo_upload: string
  }>
  
  // Análise temporal
  temporal: {
    por_dia: Array<{
      data: string
      quantidade: number
      processados: number
      valor_total: number
    }>
    por_semana: Array<{
      semana: string
      quantidade: number
      processados: number
      valor_total: number
    }>
    por_mes: Array<{
      mes: string
      quantidade: number
      processados: number
      valor_total: number
    }>
    horarios_pico: Array<{
      hora: number
      quantidade: number
      percentual: number
    }>
  }
  
  // Qualidade e performance
  qualidade: {
    confianca_media: number
    documentos_alta_qualidade: number // confiança > 0.8
    documentos_baixa_qualidade: number // confiança < 0.5
    taxa_reprocessamento: number
    documentos_com_dados_extraidos: number
    taxa_extracao_dados: number
  }
  
  // Tamanhos e formatos
  arquivos: {
    tamanho_medio: number
    tamanho_total: number
    maior_arquivo: number
    menor_arquivo: number
    por_formato: Array<{
      formato: string
      quantidade: number
      percentual: number
      tamanho_medio: number
    }>
    distribuicao_tamanho: Array<{
      faixa: string
      quantidade: number
      percentual: number
    }>
  }
  
  // Análise de erros
  erros: {
    total_erros: number
    tipos_erro: Array<{
      tipo_erro: string
      quantidade: number
      percentual: number
      documentos_afetados: string[]
    }>
    erros_recorrentes: Array<{
      erro: string
      frequencia: number
      ultima_ocorrencia: string
    }>
    taxa_erro_por_tipo: Array<{
      tipo_documento: TipoDocumento
      taxa_erro: number
      erros_comuns: string[]
    }>
  }
  
  // Métricas de produtividade
  produtividade: {
    documentos_por_usuario: number
    pico_processamento: {
      data: string
      quantidade: number
    }
    eficiencia_semanal: number // % de documentos processados na semana
    backlog_atual: number
    tempo_medio_fila: number
  }
  
  // Comparações e benchmarks
  comparacoes: {
    vs_mes_anterior: {
      total: number
      crescimento_percentual: number
      processados: number
      taxa_sucesso: number
    }
    vs_media_historica: {
      total: number
      desvio_percentual: number
      performance: 'acima' | 'dentro' | 'abaixo'
    }
  }
}

/**
 * Opções para filtrar estatísticas
 */
export interface DocumentosStatsOptions {
  periodo_dias?: number // Período em dias (padrão: 30)
  incluir_tipos?: TipoDocumento[]
  excluir_tipos?: TipoDocumento[]
  apenas_processados?: boolean
  incluir_detalhes_erro?: boolean
}

/**
 * Hook para buscar estatísticas detalhadas de documentos de uma empresa
 */
export function useDocumentosStats(
  empresaId: string,
  options: DocumentosStatsOptions = {},
  queryOptions?: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  }
) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  const {
    periodo_dias = 30,
    incluir_tipos,
    excluir_tipos,
    apenas_processados = false,
    incluir_detalhes_erro = true
  } = options

  return useQuery({
    queryKey: ['documentos-stats', empresaId, options],
    queryFn: async (): Promise<DocumentosStats> => {
      if (!user) throw new Error('Usuário não autenticado')
      if (!empresaId) throw new Error('ID da empresa é obrigatório')

      // Calcular períodos
      const agora = new Date()
      const inicioPeríodo = new Date()
      inicioPeríodo.setDate(inicioPeríodo.getDate() - periodo_dias)
      
      const inicioHoje = new Date()
      inicioHoje.setHours(0, 0, 0, 0)
      
      const inicioSemana = new Date()
      inicioSemana.setDate(inicioSemana.getDate() - 7)
      
      const inicioMes = new Date()
      inicioMes.setMonth(inicioMes.getMonth() - 1)

      // Construir query base
      let query = supabase
        .from('documentos')
        .select(`
          id,
          tipo_documento,
          status_processamento,
          valor_total,
          arquivo_tamanho,
          arquivo_tipo,
          dados_extraidos,
          created_at,
          updated_at,
          data_processamento,
          observacoes
        `)
        .eq('empresa_id', empresaId)
        .gte('created_at', inicioPeríodo.toISOString())

      // Aplicar filtros
      if (incluir_tipos && incluir_tipos.length > 0) {
        query = query.in('tipo_documento', incluir_tipos)
      }

      if (excluir_tipos && excluir_tipos.length > 0) {
        query = query.not('tipo_documento', 'in', `(${excluir_tipos.join(',')})`)
      }

      if (apenas_processados) {
        query = query.eq('status_processamento', 'processado')
      }

      const { data: documentos, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      const docs = documentos || []

      // 1. Calcular overview
      const totalDocumentos = docs.length
      const documentosHoje = docs.filter(d => new Date(d.created_at) >= inicioHoje).length
      const documentosSemana = docs.filter(d => new Date(d.created_at) >= inicioSemana).length
      const documentosMes = docs.filter(d => new Date(d.created_at) >= inicioMes).length

      // Buscar dados do mês anterior para comparação
      const inicioMesAnterior = new Date()
      inicioMesAnterior.setMonth(inicioMesAnterior.getMonth() - 2)
      const fimMesAnterior = new Date()
      fimMesAnterior.setMonth(fimMesAnterior.getMonth() - 1)

      const { data: docsMesAnterior } = await supabase
        .from('documentos')
        .select('id')
        .eq('empresa_id', empresaId)
        .gte('created_at', inicioMesAnterior.toISOString())
        .lt('created_at', fimMesAnterior.toISOString())

      const documentosMesAnterior = docsMesAnterior?.length || 0
      const crescimentoMensal = documentosMesAnterior > 0 
        ? ((documentosMes - documentosMesAnterior) / documentosMesAnterior) * 100 
        : 0

      const mediaDiaria = periodo_dias > 0 ? totalDocumentos / periodo_dias : 0

      // 2. Calcular status
      const statusCount = docs.reduce((acc, doc) => {
        acc[doc.status_processamento] = (acc[doc.status_processamento] || 0) + 1
        return acc
      }, {} as Record<StatusProcessamento, number>)

      const pendentes = statusCount['pendente'] || 0
      const processando = statusCount['processando'] || 0
      const processados = statusCount['processado'] || 0
      const comErro = statusCount['erro'] || 0
      const rejeitados = statusCount['rejeitado'] || 0

      const taxaSucesso = totalDocumentos > 0 ? (processados / totalDocumentos) * 100 : 0

      // Calcular tempo médio de processamento
      const docsComTempo = docs.filter(d => d.data_processamento && d.created_at)
      const tempoMedioProcessamento = docsComTempo.length > 0
        ? docsComTempo.reduce((sum, d) => {
            const inicio = new Date(d.created_at).getTime()
            const fim = new Date(d.data_processamento!).getTime()
            return sum + (fim - inicio)
          }, 0) / docsComTempo.length
        : 0

      // 3. Distribuição por tipo
      const tiposCount = docs.reduce((acc, doc) => {
        const tipo = doc.tipo_documento as TipoDocumento
        if (!acc[tipo]) {
          acc[tipo] = {
            total: 0,
            processados: 0,
            valores: [],
            ultimoUpload: doc.created_at
          }
        }
        acc[tipo].total += 1
        if (doc.status_processamento === 'processado') {
          acc[tipo].processados += 1
        }
        if (doc.valor_total) {
          acc[tipo].valores.push(doc.valor_total)
        }
        if (new Date(doc.created_at) > new Date(acc[tipo].ultimoUpload)) {
          acc[tipo].ultimoUpload = doc.created_at
        }
        return acc
      }, {} as Record<TipoDocumento, any>)

      const tipos = Object.entries(tiposCount).map(([tipo, data]) => ({
        tipo: tipo as TipoDocumento,
        quantidade: data.total,
        percentual: totalDocumentos > 0 ? (data.total / totalDocumentos) * 100 : 0,
        processados: data.processados,
        taxa_sucesso_tipo: data.total > 0 ? (data.processados / data.total) * 100 : 0,
        valor_medio: data.valores.length > 0 
          ? data.valores.reduce((sum: number, v: number) => sum + v, 0) / data.valores.length 
          : 0,
        ultimo_upload: data.ultimoUpload
      }))

      // 4. Análise temporal
      const calcularPorPeriodo = (dias: number) => {
        const resultado = []
        for (let i = dias - 1; i >= 0; i--) {
          const data = new Date()
          data.setDate(data.getDate() - i)
          const dataStr = data.toISOString().split('T')[0]
          
          const docsData = docs.filter(d => d.created_at.startsWith(dataStr))
          const processadosData = docsData.filter(d => d.status_processamento === 'processado')
          const valorTotal = docsData
            .filter(d => d.valor_total)
            .reduce((sum, d) => sum + (d.valor_total || 0), 0)
          
          resultado.push({
            data: dataStr,
            quantidade: docsData.length,
            processados: processadosData.length,
            valor_total: valorTotal
          })
        }
        return resultado
      }

      const porDia = calcularPorPeriodo(Math.min(periodo_dias, 30))

      // Agrupar por semana
      const porSemana = []
      for (let i = 0; i < Math.min(Math.ceil(periodo_dias / 7), 12); i++) {
        const inicioSem = new Date()
        inicioSem.setDate(inicioSem.getDate() - (i + 1) * 7)
        const fimSem = new Date()
        fimSem.setDate(fimSem.getDate() - i * 7)
        
        const docsSemana = docs.filter(d => {
          const dataDoc = new Date(d.created_at)
          return dataDoc >= inicioSem && dataDoc < fimSem
        })
        
        porSemana.unshift({
          semana: `${inicioSem.toISOString().split('T')[0]} - ${fimSem.toISOString().split('T')[0]}`,
          quantidade: docsSemana.length,
          processados: docsSemana.filter(d => d.status_processamento === 'processado').length,
          valor_total: docsSemana
            .filter(d => d.valor_total)
            .reduce((sum, d) => sum + (d.valor_total || 0), 0)
        })
      }

      // Horários de pico
      const horarios = docs.reduce((acc, doc) => {
        const hora = new Date(doc.created_at).getHours()
        acc[hora] = (acc[hora] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      const horariosPico = Object.entries(horarios)
        .map(([hora, quantidade]) => ({
          hora: parseInt(hora),
          quantidade,
          percentual: totalDocumentos > 0 ? (quantidade / totalDocumentos) * 100 : 0
        }))
        .sort((a, b) => b.quantidade - a.quantidade)

      // 5. Qualidade
      const docsComDados = docs.filter(d => d.dados_extraidos)
      const confiancas = docsComDados
        .map(d => {
          const dados = d.dados_extraidos as any
          return dados?.confidence || dados?.confianca || dados?.extraction_confidence || 0
        })
        .filter(c => c > 0)

      const confiancaMedia = confiancas.length > 0 
        ? confiancas.reduce((sum, c) => sum + c, 0) / confiancas.length 
        : 0

      const documentosAltaQualidade = confiancas.filter(c => c > 0.8).length
      const documentosBaixaQualidade = confiancas.filter(c => c < 0.5).length
      const taxaExtracaoDados = totalDocumentos > 0 ? (docsComDados.length / totalDocumentos) * 100 : 0

      // 6. Arquivos
      const tamanhos = docs.filter(d => d.arquivo_tamanho).map(d => d.arquivo_tamanho!)
      const tamanhoMedio = tamanhos.length > 0 
        ? tamanhos.reduce((sum, t) => sum + t, 0) / tamanhos.length 
        : 0
      const tamanhoTotal = tamanhos.reduce((sum, t) => sum + t, 0)
      const maiorArquivo = tamanhos.length > 0 ? Math.max(...tamanhos) : 0
      const menorArquivo = tamanhos.length > 0 ? Math.min(...tamanhos) : 0

      // Distribuição por formato
      const formatosCount = docs.reduce((acc, doc) => {
        const formato = doc.arquivo_tipo || 'unknown'
        if (!acc[formato]) {
          acc[formato] = { count: 0, tamanhos: [] }
        }
        acc[formato].count += 1
        if (doc.arquivo_tamanho) {
          acc[formato].tamanhos.push(doc.arquivo_tamanho)
        }
        return acc
      }, {} as Record<string, { count: number; tamanhos: number[] }>)

      const porFormato = Object.entries(formatosCount).map(([formato, data]) => ({
        formato,
        quantidade: data.count,
        percentual: totalDocumentos > 0 ? (data.count / totalDocumentos) * 100 : 0,
        tamanho_medio: data.tamanhos.length > 0 
          ? data.tamanhos.reduce((sum, t) => sum + t, 0) / data.tamanhos.length 
          : 0
      }))

      // 7. Análise de erros
      const docsComErro = docs.filter(d => d.status_processamento === 'erro')
      const tiposErro = docsComErro.reduce((acc, doc) => {
        const erro = doc.observacoes || 'Erro desconhecido'
        acc[erro] = (acc[erro] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const errosDetalhados = Object.entries(tiposErro).map(([erro, quantidade]) => ({
        tipo_erro: erro,
        quantidade,
        percentual: docsComErro.length > 0 ? (quantidade / docsComErro.length) * 100 : 0,
        documentos_afetados: docsComErro
          .filter(d => d.observacoes === erro)
          .map(d => d.id)
          .slice(0, 5)
      }))

      return {
        overview: {
          total_documentos: totalDocumentos,
          documentos_hoje: documentosHoje,
          documentos_semana: documentosSemana,
          documentos_mes: documentosMes,
          crescimento_mensal: crescimentoMensal,
          media_diaria: mediaDiaria
        },
        status: {
          pendentes,
          processando,
          processados,
          com_erro: comErro,
          rejeitados,
          taxa_sucesso: taxaSucesso,
          tempo_medio_processamento: tempoMedioProcessamento
        },
        tipos,
        temporal: {
          por_dia: porDia,
          por_semana: porSemana,
          por_mes: [], // TODO: implementar se necessário
          horarios_pico: horariosPico
        },
        qualidade: {
          confianca_media: confiancaMedia,
          documentos_alta_qualidade: documentosAltaQualidade,
          documentos_baixa_qualidade: documentosBaixaQualidade,
          taxa_reprocessamento: 0, // TODO: implementar
          documentos_com_dados_extraidos: docsComDados.length,
          taxa_extracao_dados: taxaExtracaoDados
        },
        arquivos: {
          tamanho_medio: tamanhoMedio,
          tamanho_total: tamanhoTotal,
          maior_arquivo: maiorArquivo,
          menor_arquivo: menorArquivo,
          por_formato: porFormato,
          distribuicao_tamanho: [] // TODO: implementar se necessário
        },
        erros: {
          total_erros: comErro,
          tipos_erro: errosDetalhados,
          erros_recorrentes: [], // TODO: implementar
          taxa_erro_por_tipo: tipos.map(t => ({
            tipo_documento: t.tipo,
            taxa_erro: 100 - t.taxa_sucesso_tipo,
            erros_comuns: []
          }))
        },
        produtividade: {
          documentos_por_usuario: totalDocumentos, // Assumindo 1 usuário
          pico_processamento: {
            data: porDia.reduce((max, dia) => dia.quantidade > max.quantidade ? dia : max, porDia[0] || { data: '', quantidade: 0 }).data,
            quantidade: Math.max(...porDia.map(d => d.quantidade))
          },
          eficiencia_semanal: documentosSemana > 0 ? (docs.filter(d => 
            new Date(d.created_at) >= inicioSemana && d.status_processamento === 'processado'
          ).length / documentosSemana) * 100 : 0,
          backlog_atual: pendentes + processando,
          tempo_medio_fila: tempoMedioProcessamento / 1000 / 60 // em minutos
        },
        comparacoes: {
          vs_mes_anterior: {
            total: documentosMes,
            crescimento_percentual: crescimentoMensal,
            processados: docs.filter(d => 
              new Date(d.created_at) >= inicioMes && d.status_processamento === 'processado'
            ).length,
            taxa_sucesso: taxaSucesso
          },
          vs_media_historica: {
            total: documentosMes,
            desvio_percentual: 0, // TODO: calcular com dados históricos
            performance: 'dentro' as const
          }
        }
      }
    },
    enabled: !!user && !!empresaId && (queryOptions?.enabled !== false),
    staleTime: queryOptions?.staleTime || 5 * 60 * 1000, // 5 minutos
    refetchInterval: queryOptions?.refetchInterval || 10 * 60 * 1000, // 10 minutos
    retry: 2
  })
}
