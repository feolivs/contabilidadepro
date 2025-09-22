'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, 
  MapPin, 
  Calendar,
  ExternalLink,
  Edit,
  Settings
} from 'lucide-react'

/**
 * Interface para dados da empresa
 */
interface EmpresaData {
  id: string
  nome: string
  cnpj: string
  regime_tributario: string
  atividade_principal: string
  created_at: string
}

/**
 * Props do componente EmpresaHeader
 */
export interface EmpresaHeaderProps {
  empresa?: EmpresaData
  loading?: boolean
  showActions?: boolean
  onEdit?: () => void
  onSettings?: () => void
  onViewDetails?: () => void
}

/**
 * Componente de cabeçalho da empresa com informações principais
 */
export function EmpresaHeader({ 
  empresa, 
  loading = false,
  showActions = true,
  onEdit,
  onSettings,
  onViewDetails
}: EmpresaHeaderProps) {
  
  // Loading state
  if (loading || !empresa) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </div>
            {showActions && (
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-24" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Formatação de dados
  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return ''
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getRegimeTributarioColor = (regime: string) => {
    switch (regime?.toLowerCase()) {
      case 'mei':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'simples nacional':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'lucro presumido':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'lucro real':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAtividadeResumo = (atividade: string) => {
    if (!atividade) return 'Não informado'
    
    // Extrair código CNAE se presente
    const cnaeMatch = atividade.match(/(\d{4}-\d{1}\/\d{2})/)
    if (cnaeMatch) {
      return `CNAE ${cnaeMatch[1]}`
    }
    
    // Truncar descrição longa
    if (atividade.length > 50) {
      return `${atividade.substring(0, 50)}...`
    }
    
    return atividade
  }

  return (
    <Card className="w-full border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Informações Principais */}
          <div className="flex items-start gap-4">
            {/* Ícone da Empresa */}
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
              <Building2 className="h-8 w-8" />
            </div>

            {/* Dados da Empresa */}
            <div className="space-y-3">
              {/* Nome e CNPJ */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {empresa.nome}
                </h1>
                <p className="text-sm text-muted-foreground font-mono">
                  CNPJ: {formatCNPJ(empresa.cnpj)}
                </p>
              </div>

              {/* Badges de Informações */}
              <div className="flex flex-wrap gap-2">
                {/* Regime Tributário */}
                <Badge 
                  variant="outline" 
                  className={getRegimeTributarioColor(empresa.regime_tributario)}
                >
                  {empresa.regime_tributario || 'Não informado'}
                </Badge>

                {/* Atividade Principal */}
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  <MapPin className="h-3 w-3 mr-1" />
                  {getAtividadeResumo(empresa.atividade_principal)}
                </Badge>

                {/* Data de Cadastro */}
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  <Calendar className="h-3 w-3 mr-1" />
                  Cliente desde {formatDate(empresa.created_at)}
                </Badge>
              </div>

              {/* Informações Adicionais */}
              <div className="text-xs text-muted-foreground">
                <p>ID: {empresa.id}</p>
              </div>
            </div>
          </div>

          {/* Ações */}
          {showActions && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
              )}

              {onSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSettings}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configurar
                </Button>
              )}

              {onViewDetails && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onViewDetails}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver Detalhes
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Informações Expandidas (se necessário) */}
        {empresa.atividade_principal && empresa.atividade_principal.length > 50 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Atividade Principal:
              </h4>
              <p className="text-sm text-muted-foreground">
                {empresa.atividade_principal}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Componente simplificado para uso em listas
 */
export function EmpresaHeaderCompact({ 
  empresa, 
  loading = false,
  onClick
}: {
  empresa?: EmpresaData
  loading?: boolean
  onClick?: () => void
}) {
  if (loading || !empresa) {
    return (
      <div className="flex items-center gap-3 p-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    )
  }

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return ''
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        onClick ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      {/* Ícone Compacto */}
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
        <Building2 className="h-5 w-5" />
      </div>

      {/* Informações Básicas */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {empresa.nome}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {formatCNPJ(empresa.cnpj)}
        </p>
      </div>

      {/* Badge do Regime */}
      <Badge 
        variant="outline" 
        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
      >
        {empresa.regime_tributario}
      </Badge>
    </div>
  )
}
