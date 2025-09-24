import { Suspense } from 'react'
import { CleanLayout } from '@/components/layout/clean-layout'
import { ClientesContent } from '@/components/clientes/clientes-content'
import { ClientesStats } from '@/components/clientes/clientes-stats'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Tipos
export interface Empresa {
  id: string
  nome: string
  nome_fantasia?: string
  cnpj?: string
  regime_tributario?: string
  atividade_principal?: string
  status?: string
  ativa: boolean
  email?: string
  telefone?: string
  endereco?: string
  created_at: string
  updated_at: string
}

export interface EmpresasStats {
  total: number
  ativas: number
  simplesNacional: number
  lucroPresumido: number
  lucroReal: number
  mei: number
  novasEsteMes: number
  percentualSimplesNacional: number
  percentualLucroPresumido: number
}

// Server Component para buscar dados
async function getEmpresas(): Promise<Empresa[]> {
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
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {

      return []
    }

    return data || []
  } catch (_error) {

    return []
  }
}

// Função para calcular estatísticas no servidor
function calculateStats(empresas: Empresa[]): EmpresasStats {
  const total = empresas.length
  const ativas = empresas.filter(e => e.ativa).length
  const simplesNacional = empresas.filter(e => e.regime_tributario === 'simples').length
  const lucroPresumido = empresas.filter(e => e.regime_tributario === 'lucro_presumido').length
  const lucroReal = empresas.filter(e => e.regime_tributario === 'lucro_real').length
  const mei = empresas.filter(e => e.regime_tributario === 'mei').length

  const now = new Date()
  const novasEsteMes = empresas.filter(e => {
    const created = new Date(e.created_at)
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length

  return {
    total,
    ativas,
    simplesNacional,
    lucroPresumido,
    lucroReal,
    mei,
    novasEsteMes,
    percentualSimplesNacional: total > 0 ? Math.round((simplesNacional / total) * 100) : 0,
    percentualLucroPresumido: total > 0 ? Math.round((lucroPresumido / total) * 100) : 0,
  }
}

// Componente de Loading para as estatísticas
function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20 mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Componente de Loading para o conteúdo
function ContentLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-20" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Server Component principal
export default async function ClientesPage() {
  // Buscar dados no servidor
  const empresas = await getEmpresas()
  const stats = calculateStats(empresas)

  return (
    <CleanLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie suas empresas clientes e suas informações
            </p>
          </div>
        </div>

        {/* Estatísticas com Suspense */}
        <Suspense fallback={<StatsLoading />}>
          <ClientesStats stats={stats} />
        </Suspense>

        {/* Conteúdo principal com Suspense */}
        <Suspense fallback={<ContentLoading />}>
          <ClientesContent initialEmpresas={empresas} initialStats={stats} />
        </Suspense>
      </div>
    </CleanLayout>
  )
}

