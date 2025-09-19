import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase'

export const cachedCalculosStats = unstable_cache(
  async (userId?: string) => {
    const supabase = createClient()

    let query = supabase
      .from('calculos_fiscais')
      .select('id, valor_total, status, created_at')

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data } = await query

    if (!data) return {
      total_calculos: 0,
      valor_total_periodo: 0,
      calculos_pendentes: 0
    }

    return {
      total_calculos: data.length,
      valor_total_periodo: data.reduce((sum, calc) => sum + Number(calc.valor_total || 0), 0),
      calculos_pendentes: data.filter(calc => calc.status === 'pendente').length
    }
  },
  ['calculos-stats'],
  { revalidate: 300 } // 5 minutes
)

export const cachedEmpresasList = unstable_cache(
  async (userId?: string) => {
    const supabase = createClient()

    let query = supabase
      .from('empresas')
      .select('id, nome, cnpj, regime_tributario, ativa')
      .eq('ativa', true)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data } = await query

    return data || []
  },
  ['empresas-list'],
  { revalidate: 600 } // 10 minutes
)

// Alias for backwards compatibility
export const cachedEmpresaData = cachedEmpresasList