/**
 * Route Handler para cálculos de uma empresa específica
 * Otimização Next.js: Route Handlers com cache nativo
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cachedCalculosByEmpresa } from '@/lib/server-cache'
import { revalidateTag } from 'next/cache'

// ============================================
// GET - Buscar cálculos da empresa
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empresaId } = await params
    
    if (!empresaId) {
      return NextResponse.json(
        { error: 'ID da empresa é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar cálculos usando cache
    const calculos = await cachedCalculosByEmpresa(empresaId)

    return NextResponse.json(calculos, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache-Tags': `calculos,empresa-${empresaId}`,
      }
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
// POST - Criar novo cálculo
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empresaId } = await params
    const body = await request.json()

    if (!empresaId) {
      return NextResponse.json(
        { error: 'ID da empresa é obrigatório' },
        { status: 400 }
      )
    }

    // Validar dados básicos
    const { tipo_calculo, competencia, valor_total, detalhes_calculo } = body

    if (!tipo_calculo || !competencia || !valor_total) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: tipo_calculo, competencia, valor_total' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase
    const supabase = createClient()

    // Inserir novo cálculo
    const { data, error } = await supabase
      .from('calculos_fiscais')
      .insert({
        empresa_id: empresaId,
        tipo_calculo,
        competencia,
        valor_total,
        detalhes_calculo: detalhes_calculo || {},
        status: 'pendente',
        data_vencimento: new Date(body.data_vencimento || Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .select()
      .single()

    if (error) {

      return NextResponse.json(
        { error: 'Erro ao criar cálculo', details: error.message },
        { status: 500 }
      )
    }

    // Invalidar cache
    revalidateTag('calculos')
    revalidateTag(`empresa-${empresaId}`)

    return NextResponse.json(data, { status: 201 })

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
// DELETE - Excluir cálculo específico
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empresaId } = await params
    const { searchParams } = new URL(request.url)
    const calculoId = searchParams.get('calculo_id')

    if (!empresaId || !calculoId) {
      return NextResponse.json(
        { error: 'ID da empresa e ID do cálculo são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase
    const supabase = createClient()

    // Verificar se o cálculo pertence à empresa
    const { data: calculo, error: fetchError } = await supabase
      .from('calculos_fiscais')
      .select('id, empresa_id')
      .eq('id', calculoId)
      .eq('empresa_id', empresaId)
      .single()

    if (fetchError || !calculo) {
      return NextResponse.json(
        { error: 'Cálculo não encontrado ou não pertence à empresa' },
        { status: 404 }
      )
    }

    // Excluir cálculo
    const { error: deleteError } = await supabase
      .from('calculos_fiscais')
      .delete()
      .eq('id', calculoId)

    if (deleteError) {

      return NextResponse.json(
        { error: 'Erro ao excluir cálculo', details: deleteError.message },
        { status: 500 }
      )
    }

    // Invalidar cache
    revalidateTag('calculos')
    revalidateTag(`empresa-${empresaId}`)

    return NextResponse.json({ success: true })

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
// PATCH - Atualizar cálculo específico
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empresaId } = await params
    const { searchParams } = new URL(request.url)
    const calculoId = searchParams.get('calculo_id')
    const body = await request.json()

    if (!empresaId || !calculoId) {
      return NextResponse.json(
        { error: 'ID da empresa e ID do cálculo são obrigatórios' },
        { status: 400 }
      )
    }

    // Criar cliente Supabase
    const supabase = createClient()

    // Verificar se o cálculo pertence à empresa
    const { data: calculo, error: fetchError } = await supabase
      .from('calculos_fiscais')
      .select('id, empresa_id')
      .eq('id', calculoId)
      .eq('empresa_id', empresaId)
      .single()

    if (fetchError || !calculo) {
      return NextResponse.json(
        { error: 'Cálculo não encontrado ou não pertence à empresa' },
        { status: 404 }
      )
    }

    // Campos permitidos para atualização
    const allowedFields = ['status', 'valor_total', 'data_vencimento', 'detalhes_calculo', 'observacoes']
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido para atualização fornecido' },
        { status: 400 }
      )
    }

    // Atualizar cálculo
    const { data, error: updateError } = await supabase
      .from('calculos_fiscais')
      .update(updateData)
      .eq('id', calculoId)
      .select()
      .single()

    if (updateError) {

      return NextResponse.json(
        { error: 'Erro ao atualizar cálculo', details: updateError.message },
        { status: 500 }
      )
    }

    // Invalidar cache
    revalidateTag('calculos')
    revalidateTag(`empresa-${empresaId}`)

    return NextResponse.json(data)

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
