import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import type { TipoDocumento } from '@/types/documento'

/**
 * Interface para dados financeiros extraídos
 */
export interface DadosFinanceirosExtraidos {
  // Resumo geral
  resumo: {
    total_documentos: number
    valor_total_extraido: number
    periodo_inicio: string
    periodo_fim: string
    ultima_atualizacao: string
  }
  
  // Receitas (NFe, NFSe, Recibos de entrada)
  receitas: {
    total: number
    por_tipo: Array<{
      tipo: TipoDocumento
      quantidade: number
      valor_total: number
      percentual: number
    }>
    por_mes: Array<{
      mes: string
      valor: number
      quantidade: number
    }>
    maiores_receitas: Array<{
      documento_id: string
      tipo: TipoDocumento
      valor: number
      data: string
      descricao?: string
      cliente?: string
    }>
  }
  
  // Despesas (Boletos, Recibos de saída, Extratos)
  despesas: {
    total: number
    por_tipo: Array<{
      tipo: TipoDocumento
      quantidade: number
      valor_total: number
      percentual: number
    }>
    por_categoria: Array<{
      categoria: string
      valor: number
      percentual: number
    }>
    por_mes: Array<{
      mes: string
      valor: number
      quantidade: number
    }>
    maiores_despesas: Array<{
      documento_id: string
      tipo: TipoDocumento
      valor: number
      data: string
      descricao?: string
      fornecedor?: string
    }>
  }
  
  // Fluxo de caixa
  fluxo_caixa: {
    por_mes: Array<{
      mes: string
      receitas: number
      despesas: number
      saldo: number
      margem: number
    }>
    saldo_acumulado: number
    margem_media: number
    melhor_mes: {
      mes: string
      saldo: number
    }
    pior_mes: {
      mes: string
      saldo: number
    }
  }
  
  // Análise de tributos
  tributos: {
    total_tributos: number
    por_tipo: Array<{
      tipo: string // ICMS, IPI, PIS, COFINS, ISS, etc.
      valor: number
      percentual_sobre_receita: number
    }>
    carga_tributaria_efetiva: number
    economia_potencial: number
  }
  
  // Clientes e fornecedores
  relacionamentos: {
    principais_clientes: Array<{
      nome: string
      cnpj?: string
      valor_total: number
      quantidade_documentos: number
      ticket_medio: number
    }>
    principais_fornecedores: Array<{
      nome: string
      cnpj?: string
      valor_total: number
      quantidade_documentos: number
      ticket_medio: number
    }>
  }
  
  // Métricas de qualidade dos dados
  qualidade: {
    documentos_com_valor: number
    documentos_sem_valor: number
    taxa_extracao_valor: number
    confianca_media_valores: number
    documentos_validados: number
    documentos_com_inconsistencia: number
  }
}

/**
 * Opções para filtrar dados financeiros
 */
export interface DadosFinanceirosOptions {
  periodo_meses?: number // Últimos N meses (padrão: 12)
  incluir_tipos?: TipoDocumento[] // Tipos específicos a incluir
  excluir_tipos?: TipoDocumento[] // Tipos específicos a excluir
  valor_minimo?: number // Valor mínimo para considerar
  apenas_processados?: boolean // Apenas documentos processados
}

/**
 * Hook para buscar dados financeiros extraídos de uma empresa
 */
export function useDadosFinanceirosExtraidos(
  empresaId: string, 
  options: DadosFinanceirosOptions = {},
  queryOptions?: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  }
) {
  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  const {
    periodo_meses = 12,
    incluir_tipos,
    excluir_tipos,
    valor_minimo = 0,
    apenas_processados = true
  } = options

  return useQuery({
    queryKey: ['dados-financeiros-extraidos', empresaId, options],
    queryFn: async (): Promise<DadosFinanceirosExtraidos> => {
      if (!user) throw new Error('Usuário não autenticado')
      if (!empresaId) throw new Error('ID da empresa é obrigatório')

      // Calcular período
      const dataFim = new Date()
      const dataInicio = new Date()
      dataInicio.setMonth(dataInicio.getMonth() - periodo_meses)

      // Construir query base
      let query = supabase
        .from('documentos')
        .select(`
          id,
          tipo_documento,
          status_processamento,
          valor_total,
          data_emissao,
          created_at,
          dados_extraidos,
          arquivo_nome
        `)
        .eq('empresa_id', empresaId)
        .gte('created_at', dataInicio.toISOString())
        .lte('created_at', dataFim.toISOString())

      // Aplicar filtros
      if (apenas_processados) {
        query = query.eq('status_processamento', 'processado')
      }

      if (incluir_tipos && incluir_tipos.length > 0) {
        query = query.in('tipo_documento', incluir_tipos)
      }

      if (excluir_tipos && excluir_tipos.length > 0) {
        query = query.not('tipo_documento', 'in', `(${excluir_tipos.join(',')})`)
      }

      const { data: documentos, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Filtrar por valor mínimo
      const documentosComValor = (documentos || []).filter(d => 
        d.valor_total && d.valor_total >= valor_minimo
      )

      // Classificar documentos como receita ou despesa
      const tiposReceita: TipoDocumento[] = ['NFE', 'NFSE', 'RECIBO']
      const tiposDespesa: TipoDocumento[] = ['BOLETO', 'EXTRATO', 'COMPROVANTE']

      const documentosReceita = documentosComValor.filter(d => 
        tiposReceita.includes(d.tipo_documento as TipoDocumento)
      )
      const documentosDespesa = documentosComValor.filter(d => 
        tiposDespesa.includes(d.tipo_documento as TipoDocumento)
      )

      // Calcular receitas
      const totalReceitas = documentosReceita.reduce((sum, d) => sum + (d.valor_total || 0), 0)
      
      const receitasPorTipo = tiposReceita.map(tipo => {
        const docs = documentosReceita.filter(d => d.tipo_documento === tipo)
        const valor = docs.reduce((sum, d) => sum + (d.valor_total || 0), 0)
        return {
          tipo,
          quantidade: docs.length,
          valor_total: valor,
          percentual: totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0
        }
      }).filter(r => r.quantidade > 0)

      // Calcular despesas
      const totalDespesas = documentosDespesa.reduce((sum, d) => sum + (d.valor_total || 0), 0)
      
      const despesasPorTipo = tiposDespesa.map(tipo => {
        const docs = documentosDespesa.filter(d => d.tipo_documento === tipo)
        const valor = docs.reduce((sum, d) => sum + (d.valor_total || 0), 0)
        return {
          tipo,
          quantidade: docs.length,
          valor_total: valor,
          percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0
        }
      }).filter(d => d.quantidade > 0)

      // Categorizar despesas (baseado na descrição/nome do arquivo)
      const categorizarDespesa = (documento: any): string => {
        const nome = documento.arquivo_nome?.toLowerCase() || ''
        const dados = documento.dados_extraidos as any
        const descricao = dados?.descricao?.toLowerCase() || ''
        
        if (nome.includes('energia') || nome.includes('luz') || descricao.includes('energia')) return 'Energia Elétrica'
        if (nome.includes('agua') || nome.includes('saneamento') || descricao.includes('água')) return 'Água e Saneamento'
        if (nome.includes('telefone') || nome.includes('internet') || descricao.includes('telecom')) return 'Telecomunicações'
        if (nome.includes('aluguel') || nome.includes('locacao') || descricao.includes('aluguel')) return 'Aluguel'
        if (nome.includes('combustivel') || nome.includes('gasolina') || descricao.includes('combustível')) return 'Combustível'
        if (nome.includes('material') || nome.includes('fornecedor') || descricao.includes('material')) return 'Material/Fornecedores'
        if (nome.includes('servico') || nome.includes('consultoria') || descricao.includes('serviço')) return 'Serviços'
        return 'Outras Despesas'
      }

      const despesasPorCategoria = documentosDespesa.reduce((acc, doc) => {
        const categoria = categorizarDespesa(doc)
        acc[categoria] = (acc[categoria] || 0) + (doc.valor_total || 0)
        return acc
      }, {} as Record<string, number>)

      const despesasCategorizadas = Object.entries(despesasPorCategoria)
        .map(([categoria, valor]) => ({
          categoria,
          valor,
          percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0
        }))
        .sort((a, b) => b.valor - a.valor)

      // Calcular dados por mês
      const calcularPorMes = (docs: any[], meses: number) => {
        const resultado = []
        for (let i = meses - 1; i >= 0; i--) {
          const mesData = new Date()
          mesData.setMonth(mesData.getMonth() - i)
          const mesStr = mesData.toISOString().slice(0, 7)
          
          const docsDoMes = docs.filter(d => {
            const dataDoc = d.data_emissao || d.created_at
            return dataDoc.startsWith(mesStr)
          })
          
          resultado.push({
            mes: mesStr,
            valor: docsDoMes.reduce((sum, d) => sum + (d.valor_total || 0), 0),
            quantidade: docsDoMes.length
          })
        }
        return resultado
      }

      const receitasPorMes = calcularPorMes(documentosReceita, periodo_meses)
      const despesasPorMes = calcularPorMes(documentosDespesa, periodo_meses)

      // Calcular fluxo de caixa
      const fluxoPorMes = receitasPorMes.map((receita, index) => {
        const despesa = despesasPorMes[index]
        const saldo = receita.valor - despesa.valor
        const margem = receita.valor > 0 ? (saldo / receita.valor) * 100 : 0
        
        return {
          mes: receita.mes,
          receitas: receita.valor,
          despesas: despesa.valor,
          saldo,
          margem
        }
      })

      const saldoAcumulado = fluxoPorMes.reduce((acc, mes) => acc + mes.saldo, 0)
      const margemMedia = fluxoPorMes.length > 0 
        ? fluxoPorMes.reduce((sum, mes) => sum + mes.margem, 0) / fluxoPorMes.length 
        : 0

      const melhorMes = fluxoPorMes.reduce((melhor, atual) => 
        atual.saldo > melhor.saldo ? atual : melhor, fluxoPorMes[0] || { mes: '', saldo: 0 }
      )
      const piorMes = fluxoPorMes.reduce((pior, atual) => 
        atual.saldo < pior.saldo ? atual : pior, fluxoPorMes[0] || { mes: '', saldo: 0 }
      )

      // Extrair informações de tributos
      const extrairTributos = (documentos: any[]) => {
        const tributos: Record<string, number> = {}
        
        documentos.forEach(doc => {
          const dados = doc.dados_extraidos as any
          if (dados) {
            // NFe
            if (dados.valorIcms) tributos['ICMS'] = (tributos['ICMS'] || 0) + dados.valorIcms
            if (dados.valorIpi) tributos['IPI'] = (tributos['IPI'] || 0) + dados.valorIpi
            if (dados.valorPis) tributos['PIS'] = (tributos['PIS'] || 0) + dados.valorPis
            if (dados.valorCofins) tributos['COFINS'] = (tributos['COFINS'] || 0) + dados.valorCofins
            
            // NFSe
            if (dados.valorIss) tributos['ISS'] = (tributos['ISS'] || 0) + dados.valorIss
            if (dados.valorInss) tributos['INSS'] = (tributos['INSS'] || 0) + dados.valorInss
            if (dados.valorIr) tributos['IR'] = (tributos['IR'] || 0) + dados.valorIr
          }
        })
        
        return tributos
      }

      const tributosExtraidos = extrairTributos(documentosReceita)
      const totalTributos = Object.values(tributosExtraidos).reduce((sum, valor) => sum + valor, 0)
      const cargaTributaria = totalReceitas > 0 ? (totalTributos / totalReceitas) * 100 : 0

      const tributosPorTipo = Object.entries(tributosExtraidos).map(([tipo, valor]) => ({
        tipo,
        valor,
        percentual_sobre_receita: totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0
      }))

      // Extrair clientes e fornecedores
      const extrairRelacionamentos = (documentos: any[], tipo: 'cliente' | 'fornecedor') => {
        const relacionamentos: Record<string, { nome: string; cnpj?: string; valor: number; docs: number }> = {}
        
        documentos.forEach(doc => {
          const dados = doc.dados_extraidos as any
          if (dados) {
            const nome = tipo === 'cliente' 
              ? dados.nomeDestinatario || dados.nomeTomador || dados.pagador
              : dados.nomeEmitente || dados.nomePrestador || dados.beneficiario || dados.cedente
            
            const cnpj = tipo === 'cliente'
              ? dados.cnpjDestinatario || dados.cnpjTomador
              : dados.cnpjEmitente || dados.cnpjPrestador
            
            if (nome) {
              const key = cnpj || nome
              if (!relacionamentos[key]) {
                relacionamentos[key] = { nome, cnpj, valor: 0, docs: 0 }
              }
              relacionamentos[key].valor += doc.valor_total || 0
              relacionamentos[key].docs += 1
            }
          }
        })
        
        return Object.values(relacionamentos)
          .map(r => ({
            nome: r.nome,
            cnpj: r.cnpj,
            valor_total: r.valor,
            quantidade_documentos: r.docs,
            ticket_medio: r.docs > 0 ? r.valor / r.docs : 0
          }))
          .sort((a, b) => b.valor_total - a.valor_total)
          .slice(0, 10)
      }

      const principaisClientes = extrairRelacionamentos(documentosReceita, 'cliente')
      const principaisFornecedores = extrairRelacionamentos(documentosDespesa, 'fornecedor')

      // Calcular qualidade dos dados
      const totalDocumentos = documentos?.length || 0
      const documentosComValorTotal = documentosComValor.length
      const taxaExtracaoValor = totalDocumentos > 0 ? (documentosComValorTotal / totalDocumentos) * 100 : 0

      const confiancas = documentosComValor
        .map(d => {
          const dados = d.dados_extraidos as any
          return dados?.confidence || dados?.confianca || 0
        })
        .filter(c => c > 0)

      const confiancaMediaValores = confiancas.length > 0 
        ? confiancas.reduce((sum, c) => sum + c, 0) / confiancas.length 
        : 0

      return {
        resumo: {
          total_documentos: totalDocumentos,
          valor_total_extraido: totalReceitas + totalDespesas,
          periodo_inicio: dataInicio.toISOString().split('T')[0],
          periodo_fim: dataFim.toISOString().split('T')[0],
          ultima_atualizacao: new Date().toISOString()
        },
        receitas: {
          total: totalReceitas,
          por_tipo: receitasPorTipo,
          por_mes: receitasPorMes,
          maiores_receitas: documentosReceita
            .sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
            .slice(0, 10)
            .map(d => ({
              documento_id: d.id,
              tipo: d.tipo_documento as TipoDocumento,
              valor: d.valor_total || 0,
              data: d.data_emissao || d.created_at,
              descricao: (d.dados_extraidos as any)?.descricao,
              cliente: (d.dados_extraidos as any)?.nomeDestinatario || (d.dados_extraidos as any)?.nomeTomador
            }))
        },
        despesas: {
          total: totalDespesas,
          por_tipo: despesasPorTipo,
          por_categoria: despesasCategorizadas,
          por_mes: despesasPorMes,
          maiores_despesas: documentosDespesa
            .sort((a, b) => (b.valor_total || 0) - (a.valor_total || 0))
            .slice(0, 10)
            .map(d => ({
              documento_id: d.id,
              tipo: d.tipo_documento as TipoDocumento,
              valor: d.valor_total || 0,
              data: d.data_emissao || d.created_at,
              descricao: (d.dados_extraidos as any)?.descricao,
              fornecedor: (d.dados_extraidos as any)?.nomeEmitente || (d.dados_extraidos as any)?.cedente
            }))
        },
        fluxo_caixa: {
          por_mes: fluxoPorMes,
          saldo_acumulado: saldoAcumulado,
          margem_media: margemMedia,
          melhor_mes: melhorMes,
          pior_mes: piorMes
        },
        tributos: {
          total_tributos: totalTributos,
          por_tipo: tributosPorTipo,
          carga_tributaria_efetiva: cargaTributaria,
          economia_potencial: totalTributos * 0.1 // Estimativa de 10% de economia potencial
        },
        relacionamentos: {
          principais_clientes: principaisClientes,
          principais_fornecedores: principaisFornecedores
        },
        qualidade: {
          documentos_com_valor: documentosComValorTotal,
          documentos_sem_valor: totalDocumentos - documentosComValorTotal,
          taxa_extracao_valor: taxaExtracaoValor,
          confianca_media_valores: confiancaMediaValores,
          documentos_validados: documentosComValor.filter(d => d.status_processamento === 'processado').length,
          documentos_com_inconsistencia: documentosComValor.filter(d => {
            const dados = d.dados_extraidos as any
            return dados && (dados.confidence || dados.confianca || 1) < 0.5
          }).length
        }
      }
    },
    enabled: !!user && !!empresaId && (queryOptions?.enabled !== false),
    staleTime: queryOptions?.staleTime || 10 * 60 * 1000, // 10 minutos
    refetchInterval: queryOptions?.refetchInterval || 15 * 60 * 1000, // 15 minutos
    retry: 2
  })
}
