import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { MainLayout } from '@/components/layout/main-layout'
import { RelatoriosContent } from '@/components/relatorios/relatorios-content'
import { RelatoriosStats } from '@/components/relatorios/relatorios-stats'
import { RelatoriosStatsLoading } from './loading'

// ISR: Revalidar a cada 1 hora (3600 segundos)
export const revalidate = 3600

interface RelatorioData {
  id: string
  tipo_calculo: string
  competencia: string
  valor_total: number
  status: string
  data_vencimento: string
  created_at: string
  empresa: {
    nome: string
    cnpj: string
    regime_tributario: string
  }
}

interface RelatorioStats {
  total_calculos: number
  valor_total_periodo: number
  calculos_pendentes: number
  empresas_ativas: number
  crescimento_mensal: number
  insights_ia?: Array<{
    id: string
    tipo: string
    titulo: string
    prioridade: string
  }>
  alertas_compliance?: Array<{
    id: string
    severidade: string
    titulo: string
  }>
}

// Server Component para buscar dados dos relatórios
async function getRelatorios(): Promise<RelatorioData[]> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  try {
    const { data, error } = await supabase
      .from('calculos_fiscais')
      .select(`
        id,
        tipo_calculo,
        competencia,
        valor_total,
        status,
        data_vencimento,
        created_at,
        empresas!inner(
          nome,
          cnpj,
          regime_tributario
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {

      return []
    }

    return data?.map((item: any) => ({
      id: item.id,
      tipo_calculo: item.tipo_calculo,
      competencia: item.competencia,
      valor_total: item.valor_total,
      status: item.status,
      data_vencimento: item.data_vencimento,
      created_at: item.created_at,
      empresa: Array.isArray(item.empresas) ? item.empresas[0] : item.empresas
    })) || []
  } catch (error) {

    return []
  }
}

// Server Component para buscar estatísticas
async function getRelatoriosStats(): Promise<RelatorioStats> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  try {
    // Buscar estatísticas em paralelo
    const [calculosResult, empresasResult] = await Promise.all([
      supabase
        .from('calculos_fiscais')
        .select('valor_total, status, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      
      supabase
        .from('empresas')
        .select('id, ativa')
        .eq('ativa', true)
    ])

    const calculos = calculosResult.data || []
    const empresas = empresasResult.data || []

    const total_calculos = calculos.length
    const valor_total_periodo = calculos.reduce((sum, calc) => sum + (calc.valor_total || 0), 0)
    const calculos_pendentes = calculos.filter(calc => calc.status === 'pendente').length
    const empresas_ativas = empresas.length

    // Calcular crescimento mensal (simplificado)
    const mesPassado = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const calculosMesPassado = calculos.filter(calc => 
      new Date(calc.created_at) < mesPassado
    ).length
    
    const crescimento_mensal = calculosMesPassado > 0 
      ? ((total_calculos - calculosMesPassado) / calculosMesPassado) * 100 
      : 0

    return {
      total_calculos,
      valor_total_periodo,
      calculos_pendentes,
      empresas_ativas,
      crescimento_mensal
    }
  } catch (error) {

    return {
      total_calculos: 0,
      valor_total_periodo: 0,
      calculos_pendentes: 0,
      empresas_ativas: 0,
      crescimento_mensal: 0
    }
  }
}

export default async function RelatoriosPage() {
  // Buscar dados em paralelo no servidor
  const [relatorios, stats] = await Promise.all([
    getRelatorios(),
    getRelatoriosStats()
  ])

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">
              Análise consolidada de cálculos fiscais e performance
            </p>
          </div>
        </div>

        {/* Estatísticas - Server Component */}
        <Suspense fallback={<RelatoriosStatsLoading />}>
          <RelatoriosStats stats={stats} />
        </Suspense>

        {/* Conteúdo principal - Client Component para interatividade */}
        <Suspense fallback={<RelatoriosStatsLoading />}>
          <RelatoriosContent relatoriosIniciais={relatorios} />
        </Suspense>
      </div>
    </MainLayout>
  )
}

// Metadados para SEO
export const metadata = {
  title: 'Relatórios | ContabilidadePRO',
  description: 'Relatórios consolidados de cálculos fiscais, análise de performance e estatísticas contábeis',
  keywords: 'relatórios, cálculos fiscais, análise contábil, performance, estatísticas'
}
