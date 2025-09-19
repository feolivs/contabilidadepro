/**
 * 💰 FISCAL SERVICE - Otimizado
 * ContabilidadePRO - Cálculos fiscais essenciais para contadores solo
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createErrorResponse, createSuccessResponse } from '../_shared/error-handler.ts'
import { validateRequired } from '../_shared/validation-middleware.ts'

// ⚡ OTIMIZAÇÃO: Client singleton
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// ⚡ OTIMIZAÇÃO: Tabela DAS em constante para evitar recriação
const TABELA_DAS_2024 = [
  { limite: 180000, aliquota: 4.0 },
  { limite: 360000, aliquota: 7.3 },
  { limite: 720000, aliquota: 9.5 },
  { limite: 1800000, aliquota: 10.7 },
  { limite: 3600000, aliquota: 14.3 },
  { limite: 4800000, aliquota: 19.0 }
] as const

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 🔒 SEGURANÇA: Validar método
    if (req.method !== 'POST') {
      return createErrorResponse('Método não permitido', 405)
    }

    // ⚡ OTIMIZAÇÃO: Parse com timeout
    const parseTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), 5000)
    )

    const requestData = await Promise.race([
      req.json(),
      parseTimeout
    ]) as any

    const {
      action,
      empresa_id,
      user_id,
      // Company service parameters
      cnpj,
      empresa_data,
      filters = {},
      // Reports service parameters
      tipo_relatorio,
      calculo_id,
      periodo
    } = requestData

    // 🔒 VALIDAÇÃO: Campos básicos obrigatórios
    const validation = validateRequired(requestData, ['action'])
    if (validation) {
      return createErrorResponse(validation)
    }

    let result
    switch (action) {
      // Fiscal actions
      case 'calculate_das':
        result = await calcularDAS(requestData)
        break
      case 'get_obligations':
        result = await getObrigacoes(empresa_id, user_id)
        break

      // Company actions (consolidadas do company-service)
      case 'cnpj':
        result = await handleCNPJConsultation(cnpj)
        break
      case 'create':
        result = await handleCreateEmpresa(empresa_data, user_id)
        break
      case 'update':
        result = await handleUpdateEmpresa(empresa_id, empresa_data, user_id)
        break
      case 'delete':
        result = await handleDeleteEmpresa(empresa_id, user_id)
        break
      case 'list':
        result = await handleListEmpresas(filters, user_id)
        break
      case 'get':
        result = await handleGetEmpresa(empresa_id, user_id)
        break

      // Reports actions (consolidadas do reports-service)
      case 'gerar_relatorio':
        result = await gerarRelatorio(tipo_relatorio, empresa_id, user_id, periodo)
        break
      case 'gerar_guia_das':
        result = await gerarGuiaDAS(calculo_id, user_id)
        break

      default:
        return createErrorResponse(`Ação não suportada: ${action}`)
    }

    return createSuccessResponse(result)

  } catch (error) {
    console.error('[FISCAL_SERVICE_ERROR]', error)

    if (error.message.includes('timeout')) {
      return createErrorResponse('Timeout - tente novamente', 408)
    }

    return createErrorResponse('Erro interno do servidor', 500)
  }
})

async function calcularDAS(data: any) {
  const { empresa_id, user_id, competencia, faturamento_12_meses, faturamento_mes } = data

  // 🔒 VALIDAÇÃO: Campos obrigatórios
  const validation = validateRequired(data, ['empresa_id', 'user_id', 'faturamento_12_meses', 'faturamento_mes'])
  if (validation) {
    throw new Error(validation)
  }

  // 🔒 VALIDAÇÃO: Valores numéricos
  if (faturamento_12_meses <= 0 || faturamento_mes <= 0) {
    throw new Error('Faturamentos devem ser maiores que zero')
  }

  if (faturamento_12_meses > 4800000) {
    throw new Error('Faturamento anual excede limite do Simples Nacional (R$ 4.8M)')
  }

  // 🔒 SEGURANÇA: Verificar ownership da empresa
  const { data: empresa, error } = await supabase
    .from('empresas')
    .select('nome, regime_tributario')
    .eq('id', empresa_id)
    .eq('user_id', user_id)
    .single()

  if (error || !empresa) {
    throw new Error('Empresa não encontrada ou sem permissão')
  }

  if (empresa.regime_tributario !== 'simples') {
    throw new Error('DAS aplicável apenas para Simples Nacional')
  }

  // ⚡ OTIMIZAÇÃO: Cálculo otimizado da alíquota
  let aliquota = 19.0 // Última faixa por padrão
  for (const faixa of TABELA_DAS_2024) {
    if (faturamento_12_meses <= faixa.limite) {
      aliquota = faixa.aliquota
      break
    }
  }

  const valor_das = Math.round((faturamento_mes * aliquota) / 100 * 100) / 100

  // ⚡ OTIMIZAÇÃO: Cálculo de vencimento otimizado
  const vencimento = new Date()
  vencimento.setMonth(vencimento.getMonth() + 1, 20)

  try {
    // Salvar cálculo
    const { data: calculo } = await supabase
      .from('calculos_das')
      .insert({
        empresa_id,
        user_id,
        competencia: competencia || new Date().toISOString().slice(0, 7),
        faturamento_12_meses,
        faturamento_mes,
        valor_das,
        aliquota,
        vencimento: vencimento.toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    return {
      calculo_id: calculo.id,
      valor_das,
      aliquota,
      vencimento: vencimento.toISOString().split('T')[0],
      faixa_faturamento: getFaixaFaturamento(faturamento_12_meses)
    }
  } catch (error) {
    console.error('Erro ao salvar cálculo DAS:', error)
    throw new Error('Erro ao salvar cálculo DAS')
  }
}

async function getObrigacoes(empresa_id: string, user_id: string) {
  if (!empresa_id || !user_id) {
    throw new Error('Empresa ID e User ID são obrigatórios')
  }

  try {
    // 🔒 SEGURANÇA: Verificar ownership
    const { data: obrigacoes } = await supabase
      .from('obrigacoes_fiscais')
      .select('id, descricao, vencimento, status, valor')
      .eq('empresa_id', empresa_id)
      .eq('user_id', user_id)
      .order('vencimento', { ascending: true })

    if (!obrigacoes) {
      return {
        obrigacoes: [],
        resumo: { total: 0, pendentes: 0, vencidas: 0 }
      }
    }

    // ⚡ OTIMIZAÇÃO: Cálculo de resumo em uma única passada
    const now = new Date()
    let pendentes = 0
    let vencidas = 0

    obrigacoes.forEach(o => {
      if (o.status === 'pendente') {
        pendentes++
        if (new Date(o.vencimento) < now) {
          vencidas++
        }
      }
    })

    return {
      obrigacoes,
      resumo: {
        total: obrigacoes.length,
        pendentes,
        vencidas
      }
    }
  } catch (error) {
    console.error('Erro ao buscar obrigações:', error)
    throw new Error('Erro ao buscar obrigações fiscais')
  }
}

// ⚡ OTIMIZAÇÃO: Função utilitária otimizada
function getFaixaFaturamento(faturamento: number): string {
  if (faturamento <= 180000) return '1ª Faixa (até R$ 180.000)'
  if (faturamento <= 360000) return '2ª Faixa (até R$ 360.000)'
  if (faturamento <= 720000) return '3ª Faixa (até R$ 720.000)'
  if (faturamento <= 1800000) return '4ª Faixa (até R$ 1.800.000)'
  if (faturamento <= 3600000) return '5ª Faixa (até R$ 3.600.000)'
  return '6ª Faixa (até R$ 4.800.000)'
}

// =====================================================
// FUNÇÕES DE COMPANY (consolidadas do company-service)
// =====================================================

// 🔄 RETRY LOGIC: APIs múltiplas para CNPJ
const CNPJ_APIS = [
  { name: 'receitaws', url: 'https://receitaws.com.br/v1/cnpj/', headers: { 'User-Agent': 'ContabilidadePRO/2.0' } },
  { name: 'brasilapi', url: 'https://brasilapi.com.br/api/cnpj/v1/', headers: {} },
  { name: 'cnpjws', url: 'https://www.cnpjws.com/api/cnpj/', headers: {} }
] as const

async function handleCNPJConsultation(cnpj: string) {
  if (!cnpj) {
    throw new Error('CNPJ é obrigatório')
  }

  // Limpar CNPJ (remover pontuação)
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '')

  if (cleanCNPJ.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos')
  }

  // Tentar APIs em sequência
  for (const api of CNPJ_APIS) {
    try {
      console.log(`Tentando API: ${api.name}`)

      const response = await fetch(`${api.url}${cleanCNPJ}`, {
        headers: api.headers,
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      })

      if (response.ok) {
        const data = await response.json()

        // Normalizar resposta
        return {
          cnpj: cleanCNPJ,
          razao_social: data.nome || data.company?.name,
          nome_fantasia: data.fantasia || data.alias,
          situacao: data.situacao || data.status,
          endereco: {
            logradouro: data.logradouro || data.address?.street,
            numero: data.numero || data.address?.number,
            bairro: data.bairro || data.address?.district,
            cidade: data.municipio || data.address?.city,
            uf: data.uf || data.address?.state,
            cep: data.cep || data.address?.zip
          },
          atividade_principal: data.atividade_principal?.[0]?.text || data.main_activity?.text,
          api_source: api.name,
          consultado_em: new Date().toISOString()
        }
      }
    } catch (error) {
      console.warn(`API ${api.name} falhou:`, error.message)
      continue
    }
  }

  throw new Error('Todas as APIs de CNPJ falharam')
}

async function handleCreateEmpresa(empresa_data: any, user_id: string) {
  if (!user_id) {
    throw new Error('User ID é obrigatório')
  }

  if (!empresa_data) {
    throw new Error('Dados da empresa são obrigatórios')
  }

  const validation = validateRequired(empresa_data, ['nome', 'cnpj'])
  if (validation) {
    throw new Error(validation)
  }

  try {
    const { data, error } = await supabase
      .from('empresas')
      .insert({
        ...empresa_data,
        user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar empresa:', error)
      throw new Error('Erro ao criar empresa')
    }

    return data
  } catch (error) {
    console.error('Erro ao criar empresa:', error)
    throw new Error('Erro ao criar empresa')
  }
}

async function handleUpdateEmpresa(empresa_id: string, empresa_data: any, user_id: string) {
  if (!empresa_id || !user_id) {
    throw new Error('ID da empresa e User ID são obrigatórios')
  }

  try {
    const { data, error } = await supabase
      .from('empresas')
      .update({
        ...empresa_data,
        updated_at: new Date().toISOString()
      })
      .eq('id', empresa_id)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar empresa:', error)
      throw new Error('Erro ao atualizar empresa')
    }

    if (!data) {
      throw new Error('Empresa não encontrada ou sem permissão')
    }

    return data
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    throw new Error('Erro ao atualizar empresa')
  }
}

async function handleDeleteEmpresa(empresa_id: string, user_id: string) {
  if (!empresa_id || !user_id) {
    throw new Error('ID da empresa e User ID são obrigatórios')
  }

  try {
    const { error } = await supabase
      .from('empresas')
      .update({ ativa: false, updated_at: new Date().toISOString() })
      .eq('id', empresa_id)
      .eq('user_id', user_id)

    if (error) {
      console.error('Erro ao deletar empresa:', error)
      throw new Error('Erro ao deletar empresa')
    }

    return { success: true, message: 'Empresa desativada com sucesso' }
  } catch (error) {
    console.error('Erro ao deletar empresa:', error)
    throw new Error('Erro ao deletar empresa')
  }
}

async function handleListEmpresas(filters: any, user_id: string) {
  if (!user_id) {
    throw new Error('User ID é obrigatório')
  }

  try {
    let query = supabase
      .from('empresas')
      .select('*')
      .eq('user_id', user_id)
      .eq('ativa', true)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters.regime_tributario) {
      query = query.eq('regime_tributario', filters.regime_tributario)
    }

    if (filters.search) {
      query = query.or(`nome.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao listar empresas:', error)
      throw new Error('Erro ao listar empresas')
    }

    return data || []
  } catch (error) {
    console.error('Erro ao listar empresas:', error)
    throw new Error('Erro ao listar empresas')
  }
}

async function handleGetEmpresa(empresa_id: string, user_id: string) {
  if (!empresa_id || !user_id) {
    throw new Error('ID da empresa e User ID são obrigatórios')
  }

  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresa_id)
      .eq('user_id', user_id)
      .single()

    if (error) {
      console.error('Erro ao buscar empresa:', error)
      throw new Error('Erro ao buscar empresa')
    }

    if (!data) {
      throw new Error('Empresa não encontrada')
    }

    return data
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    throw new Error('Erro ao buscar empresa')
  }
}

// =====================================================
// FUNÇÕES DE REPORTS (consolidadas do reports-service)
// =====================================================

async function gerarRelatorio(tipo: string, empresa_id: string, user_id: string, periodo: any) {
  if (!user_id) {
    throw new Error('User ID é obrigatório')
  }

  let dados = []
  let titulo = ''

  try {
    switch (tipo) {
      case 'dre':
        titulo = 'Demonstração do Resultado do Exercício (DRE)'
        dados = await gerarDRE(empresa_id, user_id, periodo)
        break
      case 'balancete':
        titulo = 'Balancete de Verificação'
        dados = await gerarBalancete(empresa_id, user_id, periodo)
        break
      case 'obrigacoes':
        titulo = 'Relatório de Obrigações Fiscais'
        dados = await gerarRelatorioObrigacoes(empresa_id, user_id, periodo)
        break
      default:
        throw new Error(`Tipo de relatório não suportado: ${tipo}`)
    }

    return {
      tipo,
      titulo,
      dados,
      periodo,
      gerado_em: new Date().toISOString(),
      empresa_id,
      user_id
    }
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    throw new Error('Erro ao gerar relatório')
  }
}

async function gerarGuiaDAS(calculo_id: string, user_id: string) {
  if (!calculo_id || !user_id) {
    throw new Error('ID do cálculo e User ID são obrigatórios')
  }

  try {
    const { data: calculo, error } = await supabase
      .from('calculos_fiscais')
      .select('*')
      .eq('id', calculo_id)
      .single()

    if (error || !calculo) {
      throw new Error('Cálculo não encontrado')
    }

    // Gerar dados da guia DAS
    const guia = {
      codigo_receita: '6906',
      competencia: calculo.competencia,
      vencimento: calculo.data_vencimento,
      valor_principal: calculo.valor_das,
      valor_multa: 0,
      valor_juros: 0,
      valor_total: calculo.valor_das,
      codigo_barras: gerarCodigoBarras(calculo.valor_das, calculo.data_vencimento),
      linha_digitavel: gerarLinhaDigitavel(calculo.valor_das, calculo.data_vencimento)
    }

    return {
      tipo: 'GUIA_DAS',
      calculo_id,
      guia,
      gerado_em: new Date().toISOString()
    }
  } catch (error) {
    console.error('Erro ao gerar guia DAS:', error)
    throw new Error('Erro ao gerar guia DAS')
  }
}

async function gerarDRE(empresa_id: string, user_id: string, periodo: any) {
  // Implementação simplificada da DRE
  const { data: documentos } = await supabase
    .from('documentos_fiscais')
    .select('*')
    .eq('empresa_id', empresa_id)

  return {
    receita_bruta: documentos?.reduce((acc, doc) => acc + (doc.valor_total || 0), 0) || 0,
    impostos: 0,
    receita_liquida: 0,
    custos: 0,
    lucro_bruto: 0,
    despesas_operacionais: 0,
    lucro_operacional: 0,
    resultado_liquido: 0
  }
}

async function gerarBalancete(empresa_id: string, user_id: string, periodo: any) {
  // Implementação simplificada do balancete
  return {
    ativo_circulante: 0,
    ativo_nao_circulante: 0,
    passivo_circulante: 0,
    passivo_nao_circulante: 0,
    patrimonio_liquido: 0
  }
}

async function gerarRelatorioObrigacoes(empresa_id: string, user_id: string, periodo: any) {
  const { data: obrigacoes } = await supabase
    .from('obrigacoes_fiscais')
    .select('*')
    .eq('empresa_id', empresa_id)
    .order('vencimento', { ascending: true })

  return obrigacoes || []
}

function gerarCodigoBarras(valor: number, vencimento: string): string {
  // Implementação simplificada - em produção usar biblioteca específica
  return `03399${Math.floor(valor * 100).toString().padStart(10, '0')}${vencimento.replace(/-/g, '')}`
}

function gerarLinhaDigitavel(valor: number, vencimento: string): string {
  // Implementação simplificada - em produção usar biblioteca específica
  const codigo = gerarCodigoBarras(valor, vencimento)
  return `${codigo.substring(0, 5)}.${codigo.substring(5, 10)} ${codigo.substring(10, 15)}.${codigo.substring(15, 21)} ${codigo.substring(21, 26)}.${codigo.substring(26, 32)} ${codigo.substring(32, 33)} ${codigo.substring(33)}`
}