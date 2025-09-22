/**
 * 📊 DATA EXPORT SERVICE - ContabilidadePRO
 * Edge Function para exportação de dados agregados em Excel/CSV/JSON
 * Com filtros avançados e agrupamentos personalizados
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Interfaces
interface ExportConfig {
  formato: 'excel' | 'csv' | 'json'
  tipo_dados: 'empresas' | 'documentos' | 'metricas' | 'compliance' | 'comparativo' | 'personalizado'
  periodo: {
    inicio: string | null
    fim: string | null
  }
  filtros: {
    empresas_selecionadas: string[]
    regimes_tributarios: string[]
    status_documentos: string[]
    tipos_documento: string[]
    faixa_faturamento: {
      min: number | null
      max: number | null
    }
    compliance_score: {
      min: number | null
      max: number | null
    }
  }
  campos: {
    dados_empresa: boolean
    metricas_financeiras: boolean
    dados_documentos: boolean
    analise_compliance: boolean
    insights_ia: boolean
    dados_mensais: boolean
    comparativos: boolean
  }
  agrupamento: {
    por_empresa: boolean
    por_regime: boolean
    por_mes: boolean
    por_tipo_documento: boolean
    por_status: boolean
  }
  opcoes: {
    incluir_cabecalhos: boolean
    incluir_totalizadores: boolean
    incluir_graficos: boolean
    incluir_metadados: boolean
    compactar_arquivo: boolean
  }
}

interface ExportData {
  empresas: any[]
  documentos: any[]
  metricas: any[]
  compliance: any[]
  insights: any[]
}

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, config, operation }: { 
      user_id: string
      config: ExportConfig
      operation: 'export' | 'estimate'
    } = await req.json()

    if (!user_id || !config) {
      return new Response(
        JSON.stringify({ error: 'user_id e config são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔄 Iniciando ${operation} de dados para usuário ${user_id}`)

    if (operation === 'estimate') {
      // Estimar tamanho da exportação
      const estimativa = await estimarExportacao(config, user_id)
      
      return new Response(
        JSON.stringify({
          success: true,
          total_registros: estimativa.total_registros,
          tamanho_estimado_kb: estimativa.tamanho_estimado_kb
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Processar exportação completa
    const dados = await coletarDados(config, user_id)
    const arquivoGerado = await gerarArquivo(dados, config)
    const arquivoUrl = await salvarArquivo(arquivoGerado, config, user_id)
    
    // Registrar no histórico
    await registrarExportacao(user_id, config, arquivoUrl, arquivoGerado.tamanho, dados.total_registros)

    console.log(`✅ Exportação concluída: ${arquivoUrl}`)

    return new Response(
      JSON.stringify({
        success: true,
        arquivo_url: arquivoUrl,
        nome_arquivo: arquivoGerado.nome,
        tamanho_arquivo: arquivoGerado.tamanho,
        total_registros: dados.total_registros,
        data_exportacao: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erro na exportação de dados:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno na exportação de dados',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Estimar tamanho da exportação
 */
async function estimarExportacao(config: ExportConfig, userId: string) {
  console.log('📊 Estimando tamanho da exportação...')

  let totalRegistros = 0
  let tamanhoEstimadoKB = 0

  // Estimar baseado no tipo de dados
  switch (config.tipo_dados) {
    case 'empresas':
      const { count: empresasCount } = await supabase
        .from('empresas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      
      totalRegistros = empresasCount || 0
      tamanhoEstimadoKB = totalRegistros * 2 // 2KB por empresa base
      break

    case 'documentos':
      const { count: documentosCount } = await supabase
        .from('documentos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
      
      totalRegistros = documentosCount || 0
      tamanhoEstimadoKB = totalRegistros * 1.5 // 1.5KB por documento
      break

    case 'metricas':
      totalRegistros = config.filtros.empresas_selecionadas.length || 10
      tamanhoEstimadoKB = totalRegistros * 3 // 3KB por empresa com métricas
      break

    default:
      totalRegistros = 100
      tamanhoEstimadoKB = 200
  }

  // Ajustar baseado nos campos selecionados
  const camposSelecionados = Object.values(config.campos).filter(Boolean).length
  tamanhoEstimadoKB = tamanhoEstimadoKB * (camposSelecionados / 7) // 7 campos total

  return {
    total_registros: totalRegistros,
    tamanho_estimado_kb: Math.round(tamanhoEstimadoKB)
  }
}

/**
 * Coletar dados baseado na configuração
 */
async function coletarDados(config: ExportConfig, userId: string): Promise<ExportData & { total_registros: number }> {
  console.log('📊 Coletando dados para exportação...')

  const dados: ExportData = {
    empresas: [],
    documentos: [],
    metricas: [],
    compliance: [],
    insights: []
  }

  // Coletar dados de empresas
  if (config.campos.dados_empresa || config.tipo_dados === 'empresas') {
    let query = supabase
      .from('empresas')
      .select('id, nome, cnpj, regime_tributario, ativa, created_at')
      .eq('user_id', userId)

    // Aplicar filtros
    if (config.filtros.empresas_selecionadas.length > 0) {
      query = query.in('id', config.filtros.empresas_selecionadas)
    }

    if (config.filtros.regimes_tributarios.length > 0) {
      query = query.in('regime_tributario', config.filtros.regimes_tributarios)
    }

    const { data: empresas, error } = await query
    if (!error && empresas) {
      dados.empresas = empresas
    }
  }

  // Coletar dados de documentos
  if (config.campos.dados_documentos || config.tipo_dados === 'documentos') {
    let query = supabase
      .from('documentos')
      .select('id, nome_arquivo, tipo_documento, status_processamento, tamanho_arquivo, created_at, empresa_id')
      .eq('user_id', userId)

    // Aplicar filtros de período
    if (config.periodo.inicio) {
      query = query.gte('created_at', config.periodo.inicio)
    }
    if (config.periodo.fim) {
      query = query.lte('created_at', config.periodo.fim)
    }

    // Aplicar filtros de status
    if (config.filtros.status_documentos.length > 0) {
      query = query.in('status_processamento', config.filtros.status_documentos)
    }

    // Aplicar filtros de tipo
    if (config.filtros.tipos_documento.length > 0) {
      query = query.in('tipo_documento', config.filtros.tipos_documento)
    }

    const { data: documentos, error } = await query.limit(10000) // Limite para performance
    if (!error && documentos) {
      dados.documentos = documentos
    }
  }

  // Coletar métricas financeiras
  if (config.campos.metricas_financeiras || config.tipo_dados === 'metricas') {
    // Buscar métricas via outras Edge Functions
    for (const empresaId of config.filtros.empresas_selecionadas.slice(0, 50)) { // Limite para performance
      try {
        const { data: metricas } = await supabase.functions.invoke('documentos-analytics-service', {
          body: {
            empresa_id: empresaId,
            user_id: userId,
            operation: 'calculate_metrics'
          }
        })

        if (metricas?.result) {
          dados.metricas.push({
            empresa_id: empresaId,
            ...metricas.result
          })
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar métricas para empresa ${empresaId}:`, error)
      }
    }
  }

  // Coletar análise de compliance
  if (config.campos.analise_compliance || config.tipo_dados === 'compliance') {
    for (const empresaId of config.filtros.empresas_selecionadas.slice(0, 50)) {
      try {
        const { data: compliance } = await supabase.functions.invoke('documentos-analytics-service', {
          body: {
            empresa_id: empresaId,
            user_id: userId,
            operation: 'analyze_compliance'
          }
        })

        if (compliance?.result) {
          dados.compliance.push({
            empresa_id: empresaId,
            ...compliance.result
          })
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar compliance para empresa ${empresaId}:`, error)
      }
    }
  }

  // Coletar insights de IA
  if (config.campos.insights_ia) {
    for (const empresaId of config.filtros.empresas_selecionadas.slice(0, 20)) { // Limite menor para IA
      try {
        const { data: insights } = await supabase.functions.invoke('documentos-analytics-service', {
          body: {
            empresa_id: empresaId,
            user_id: userId,
            operation: 'generate_insights'
          }
        })

        if (insights?.result) {
          dados.insights.push({
            empresa_id: empresaId,
            ...insights.result
          })
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar insights para empresa ${empresaId}:`, error)
      }
    }
  }

  // Calcular total de registros
  const totalRegistros = dados.empresas.length + dados.documentos.length + 
                         dados.metricas.length + dados.compliance.length + dados.insights.length

  return { ...dados, total_registros: totalRegistros }
}

/**
 * Gerar arquivo no formato solicitado
 */
async function gerarArquivo(dados: ExportData & { total_registros: number }, config: ExportConfig) {
  console.log(`📄 Gerando arquivo ${config.formato.toUpperCase()}...`)

  let conteudo: string
  let extensao: string

  switch (config.formato) {
    case 'json':
      conteudo = JSON.stringify(dados, null, 2)
      extensao = 'json'
      break

    case 'csv':
      conteudo = gerarCSV(dados, config)
      extensao = 'csv'
      break

    case 'excel':
      // Por enquanto, gerar como CSV (em produção, usar biblioteca Excel)
      conteudo = gerarCSV(dados, config)
      extensao = 'csv' // Seria 'xlsx' com biblioteca Excel
      break

    default:
      throw new Error(`Formato não suportado: ${config.formato}`)
  }

  const encoder = new TextEncoder()
  const dadosArquivo = encoder.encode(conteudo)

  return {
    dados: dadosArquivo,
    tamanho: dadosArquivo.length,
    nome: `export_${config.tipo_dados}_${Date.now()}.${extensao}`,
    conteudo
  }
}

/**
 * Gerar conteúdo CSV
 */
function gerarCSV(dados: ExportData, config: ExportConfig): string {
  const linhas: string[] = []

  // Cabeçalhos
  if (config.opcoes.incluir_cabecalhos) {
    const cabecalhos = []
    
    if (config.campos.dados_empresa) {
      cabecalhos.push('Empresa ID', 'Nome', 'CNPJ', 'Regime Tributário', 'Ativa', 'Data Cadastro')
    }
    
    if (config.campos.metricas_financeiras) {
      cabecalhos.push('Faturamento Total', 'Crescimento %', 'Projeção Anual')
    }
    
    if (config.campos.dados_documentos) {
      cabecalhos.push('Total Documentos', 'Documentos Processados', 'Taxa Processamento %')
    }
    
    if (config.campos.analise_compliance) {
      cabecalhos.push('Score Compliance', 'Áreas Conformes', 'Áreas Não Conformes')
    }

    linhas.push(cabecalhos.join(','))
  }

  // Dados das empresas
  dados.empresas.forEach(empresa => {
    const linha = []
    
    if (config.campos.dados_empresa) {
      linha.push(
        empresa.id,
        `"${empresa.nome}"`,
        empresa.cnpj,
        `"${empresa.regime_tributario}"`,
        empresa.ativa ? 'Sim' : 'Não',
        new Date(empresa.created_at).toLocaleDateString('pt-BR')
      )
    }

    // Buscar métricas correspondentes
    const metricas = dados.metricas.find(m => m.empresa_id === empresa.id)
    if (config.campos.metricas_financeiras && metricas) {
      linha.push(
        metricas.faturamento_total || 0,
        metricas.crescimento_percentual || 0,
        metricas.projecao_anual || 0
      )
    }

    // Buscar compliance correspondente
    const compliance = dados.compliance.find(c => c.empresa_id === empresa.id)
    if (config.campos.analise_compliance && compliance) {
      linha.push(
        compliance.score_geral || 0,
        compliance.areas_conformes?.length || 0,
        compliance.areas_nao_conformes?.length || 0
      )
    }

    if (linha.length > 0) {
      linhas.push(linha.join(','))
    }
  })

  return linhas.join('\n')
}

/**
 * Salvar arquivo no Supabase Storage
 */
async function salvarArquivo(arquivo: any, config: ExportConfig, userId: string) {
  console.log('💾 Salvando arquivo no storage...')

  const caminhoArquivo = `exports/${userId}/${arquivo.nome}`

  const { data, error } = await supabase.storage
    .from('documentos')
    .upload(caminhoArquivo, arquivo.dados, {
      contentType: getContentType(config.formato),
      upsert: true
    })

  if (error) throw new Error(`Erro ao salvar arquivo: ${error.message}`)

  // Gerar URL pública
  const { data: urlData } = supabase.storage
    .from('documentos')
    .getPublicUrl(caminhoArquivo)

  return urlData.publicUrl
}

/**
 * Registrar exportação no histórico
 */
async function registrarExportacao(
  userId: string, 
  config: ExportConfig, 
  arquivoUrl: string, 
  tamanho: number, 
  totalRegistros: number
) {
  const { error } = await supabase
    .from('data_exports')
    .insert({
      user_id: userId,
      nome_arquivo: `export_${config.tipo_dados}_${Date.now()}.${config.formato}`,
      formato: config.formato,
      tipo_dados: config.tipo_dados,
      config: config,
      arquivo_url: arquivoUrl,
      tamanho_arquivo: tamanho,
      total_registros: totalRegistros,
      status: 'concluido'
    })

  if (error) {
    console.warn('⚠️ Erro ao registrar histórico de exportação:', error)
  }
}

/**
 * Obter content type baseado no formato
 */
function getContentType(formato: string): string {
  switch (formato) {
    case 'json': return 'application/json'
    case 'csv': return 'text/csv'
    case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    default: return 'application/octet-stream'
  }
}
