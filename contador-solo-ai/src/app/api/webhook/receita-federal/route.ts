/**
 * Webhook para receber atualizações da Receita Federal
 * Otimização Next.js: Route Handler para integrações externas
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { revalidateTag, revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

// ============================================
// TIPOS E INTERFACES
// ============================================

interface ReceitaFederalWebhookData {
  tipo: 'empresa_atualizada' | 'tabela_atualizada' | 'prazo_alterado'
  cnpj?: string
  dados?: {
    situacao_cadastral?: string
    regime_tributario?: string
    atividade_principal?: string
    endereco?: any
  }
  tabela?: {
    tipo: 'simples_nacional' | 'irpj' | 'csll'
    vigencia_inicio: string
    dados: any
  }
  prazo?: {
    tipo_tributo: string
    competencia: string
    data_vencimento: string
  }
}

// ============================================
// POST - Receber webhook da Receita Federal
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação do webhook
    const headersList = await headers()
    const signature = headersList.get('x-receita-signature')
    const timestamp = headersList.get('x-receita-timestamp')

    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: 'Headers de autenticação obrigatórios' },
        { status: 401 }
      )
    }

    // Verificar se o timestamp não é muito antigo (5 minutos)
    const now = Date.now()
    const requestTime = parseInt(timestamp) * 1000
    if (now - requestTime > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Timestamp muito antigo' },
        { status: 401 }
      )
    }

    // TODO: Verificar assinatura HMAC
    // const expectedSignature = generateHMAC(body, process.env.RECEITA_WEBHOOK_SECRET)
    // if (signature !== expectedSignature) {
    //   return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })
    // }

    const data: ReceitaFederalWebhookData = await request.json()

    // Processar diferentes tipos de webhook
    switch (data.tipo) {
      case 'empresa_atualizada':
        await processarEmpresaAtualizada(data)
        break
      
      case 'tabela_atualizada':
        await processarTabelaAtualizada(data)
        break
      
      case 'prazo_alterado':
        await processarPrazoAlterado(data)
        break
      
      default:

        return NextResponse.json(
          { error: 'Tipo de webhook não suportado' },
          { status: 400 }
        )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processado com sucesso',
      timestamp: new Date().toISOString()
    })

  } catch (error) {

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// ============================================
// PROCESSADORES DE WEBHOOK
// ============================================

async function processarEmpresaAtualizada(data: ReceitaFederalWebhookData) {
  if (!data.cnpj || !data.dados) {
    throw new Error('CNPJ e dados são obrigatórios para atualização de empresa')
  }

  const supabase = createClient()

  // Buscar empresa pelo CNPJ
  const { data: empresa, error: fetchError } = await supabase
    .from('empresas')
    .select('id, cnpj')
    .eq('cnpj', data.cnpj)
    .single()

  if (fetchError || !empresa) {

    return
  }

  // Atualizar dados da empresa
  const updateData: Record<string, any> = {}
  
  if (data.dados.situacao_cadastral) {
    updateData.situacao_cadastral = data.dados.situacao_cadastral
  }
  
  if (data.dados.regime_tributario) {
    updateData.regime_tributario = data.dados.regime_tributario
  }
  
  if (data.dados.atividade_principal) {
    updateData.atividade_principal = data.dados.atividade_principal
  }
  
  if (data.dados.endereco) {
    updateData.endereco = data.dados.endereco
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('empresas')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', empresa.id)

    if (updateError) {
      throw new Error(`Erro ao atualizar empresa: ${updateError.message}`)
    }

    // Invalidar cache
    revalidateTag('empresas')
    revalidateTag(`empresa-${empresa.id}`)
    revalidatePath('/clientes')
    revalidatePath(`/clientes/${empresa.id}`)

  }
}

async function processarTabelaAtualizada(data: ReceitaFederalWebhookData) {
  if (!data.tabela) {
    throw new Error('Dados da tabela são obrigatórios')
  }

  const supabase = createClient()

  // Salvar nova tabela
  const { error: insertError } = await supabase
    .from('tabelas_tributarias')
    .insert({
      tipo: data.tabela.tipo,
      vigencia_inicio: data.tabela.vigencia_inicio,
      dados: data.tabela.dados,
      ativa: true,
      created_at: new Date().toISOString()
    })

  if (insertError) {
    throw new Error(`Erro ao salvar tabela: ${insertError.message}`)
  }

  // Desativar tabelas anteriores do mesmo tipo
  const { error: updateError } = await supabase
    .from('tabelas_tributarias')
    .update({ ativa: false })
    .eq('tipo', data.tabela.tipo)
    .neq('vigencia_inicio', data.tabela.vigencia_inicio)

  if (updateError) {

  }

  // Invalidar cache de cálculos
  revalidateTag('calculos')
  revalidateTag('tabelas-tributarias')
  revalidatePath('/calculos')

}

async function processarPrazoAlterado(data: ReceitaFederalWebhookData) {
  if (!data.prazo) {
    throw new Error('Dados do prazo são obrigatórios')
  }

  const supabase = createClient()

  // Salvar alteração de prazo
  const { error: insertError } = await supabase
    .from('prazos_fiscais')
    .insert({
      tipo_tributo: data.prazo.tipo_tributo,
      competencia: data.prazo.competencia,
      data_vencimento: data.prazo.data_vencimento,
      origem: 'receita_federal',
      created_at: new Date().toISOString()
    })

  if (insertError) {
    throw new Error(`Erro ao salvar prazo: ${insertError.message}`)
  }

  // Atualizar cálculos afetados
  const { error: updateError } = await supabase
    .from('calculos_fiscais')
    .update({ 
      data_vencimento: data.prazo.data_vencimento,
      updated_at: new Date().toISOString()
    })
    .eq('tipo_calculo', data.prazo.tipo_tributo)
    .eq('competencia', data.prazo.competencia)
    .eq('status', 'pendente')

  if (updateError) {

  }

  // Invalidar cache
  revalidateTag('calculos')
  revalidateTag('prazos-fiscais')
  revalidatePath('/calculos')
  revalidatePath('/dashboard')

}

// ============================================
// GET - Verificar status do webhook
// ============================================

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'receita-federal-webhook',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    supported_events: [
      'empresa_atualizada',
      'tabela_atualizada', 
      'prazo_alterado'
    ]
  })
}
