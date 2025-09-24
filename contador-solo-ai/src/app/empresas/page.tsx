import { Suspense } from 'react'
import { CleanLayout } from '@/components/layout/clean-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, 
  Plus, 
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail
} from 'lucide-react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'

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
      console.error('Erro ao buscar empresas:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Erro ao buscar empresas:', error)
    return []
  }
}

// Componente de Loading
function EmpresasLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Componente de Card da Empresa
function EmpresaCard({ empresa }: { empresa: Empresa }) {
  const getRegimeColor = (regime?: string) => {
    switch (regime?.toLowerCase()) {
      case 'simples nacional':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'lucro presumido':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'lucro real':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'mei':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {empresa.nome}
            </CardTitle>
            {empresa.nome_fantasia && (
              <p className="text-sm text-muted-foreground">
                {empresa.nome_fantasia}
              </p>
            )}
          </div>
          <Badge 
            variant={empresa.ativa ? 'default' : 'secondary'}
            className={empresa.ativa ? 'bg-green-100 text-green-800' : ''}
          >
            {empresa.ativa ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* CNPJ */}
        {empresa.cnpj && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{empresa.cnpj}</span>
          </div>
        )}

        {/* Regime Tributário */}
        {empresa.regime_tributario && (
          <div className="flex items-center gap-2">
            <Badge className={getRegimeColor(empresa.regime_tributario)}>
              {empresa.regime_tributario}
            </Badge>
          </div>
        )}

        {/* Contato */}
        <div className="space-y-1">
          {empresa.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span className="truncate">{empresa.email}</span>
            </div>
          )}
          {empresa.telefone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{empresa.telefone}</span>
            </div>
          )}
          {empresa.endereco && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{empresa.endereco}</span>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            <Link href={`/empresa/${empresa.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>
            </Link>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente principal
async function EmpresasContent() {
  const empresas = await getEmpresas()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            Empresas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as empresas do seu portfólio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{empresas.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-600">
                  {empresas.filter(e => e.ativa).length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Simples Nacional</p>
                <p className="text-2xl font-bold text-blue-600">
                  {empresas.filter(e => e.regime_tributario?.toLowerCase().includes('simples')).length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Este Mês</p>
                <p className="text-2xl font-bold text-purple-600">
                  {empresas.filter(e => {
                    const created = new Date(e.created_at)
                    const now = new Date()
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                  }).length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Plus className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Empresas */}
      {empresas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Nenhuma Empresa Cadastrada
            </h3>
            <p className="text-muted-foreground mb-4">
              Comece cadastrando sua primeira empresa para gerenciar seus clientes.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeira Empresa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {empresas.map((empresa) => (
            <EmpresaCard key={empresa.id} empresa={empresa} />
          ))}
        </div>
      )}
    </div>
  )
}

// Página principal
export default function EmpresasPage() {
  return (
    <CleanLayout>
      <Suspense fallback={<EmpresasLoading />}>
        <EmpresasContent />
      </Suspense>
    </CleanLayout>
  )
}
