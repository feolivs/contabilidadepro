'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  RefreshCw,
  Trash2,
  Edit,
  ExternalLink,
  FileDown,
  Copy,
  Settings
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth-store'
import type { TipoDocumento, StatusProcessamento } from '@/types/documento'

/**
 * Interface para documento recente
 */
interface DocumentoRecente {
  id: string
  tipo_documento: TipoDocumento
  status_processamento: StatusProcessamento
  arquivo_nome: string
  valor_total?: number
  created_at: string
  updated_at: string
  dados_extraidos?: any
}

/**
 * Props do componente DocumentosRecentesTable
 */
export interface DocumentosRecentesTableProps {
  empresaId: string
  limit?: number
  className?: string
  title?: string
  description?: string
  showSearch?: boolean
  showFilters?: boolean
  showActions?: boolean
  showExport?: boolean
  showRefresh?: boolean
  onDocumentClick?: (documento: DocumentoRecente) => void
  onDocumentAction?: (action: string, documento: DocumentoRecente) => void
}

/**
 * Componente de tabela de documentos recentes
 */
export function DocumentosRecentesTable({
  empresaId,
  limit = 10,
  className = '',
  title = 'Documentos Recentes',
  description = 'Últimos documentos processados',
  showSearch = true,
  showFilters = true,
  showActions = true,
  showExport = true,
  showRefresh = true,
  onDocumentClick,
  onDocumentAction
}: DocumentosRecentesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tipoFilter, setTipoFilter] = useState<string>('all')

  const supabase = createBrowserSupabaseClient()
  const { user } = useAuthStore()

  // Query para buscar documentos recentes
  const {
    data: documentos = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['documentos-recentes', empresaId, limit, statusFilter, tipoFilter],
    queryFn: async (): Promise<DocumentoRecente[]> => {
      if (!user || !empresaId) return []

      let query = supabase
        .from('documentos')
        .select(`
          id,
          tipo_documento,
          status_processamento,
          arquivo_nome,
          valor_total,
          created_at,
          updated_at,
          dados_extraidos
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Aplicar filtros
      if (statusFilter !== 'all') {
        query = query.eq('status_processamento', statusFilter)
      }

      if (tipoFilter !== 'all') {
        query = query.eq('tipo_documento', tipoFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: !!user && !!empresaId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000 // 5 minutos
  })

  // Filtrar por termo de busca
  const documentosFiltrados = documentos.filter(doc =>
    searchTerm === '' ||
    doc.arquivo_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.tipo_documento.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Função de exportação
  const exportData = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const dataToExport = documentosFiltrados.map(doc => ({
        'Nome do Arquivo': doc.arquivo_nome,
        'Tipo': getTipoDisplayName(doc.tipo_documento),
        'Status': getStatusDisplayName(doc.status_processamento),
        'Valor Total': doc.valor_total ? formatCurrency(doc.valor_total) : '-',
        'Data de Upload': formatDate(doc.created_at),
        'Hora': formatTime(doc.created_at),
        'ID': doc.id
      }))

      if (format === 'csv') {
        downloadCSV(dataToExport, `documentos-${empresaId}-${new Date().toISOString().split('T')[0]}`)
      } else if (format === 'excel') {
        // Implementar exportação Excel
        console.log('Exportação Excel em desenvolvimento')
      } else if (format === 'pdf') {
        // Implementar exportação PDF
        console.log('Exportação PDF em desenvolvimento')
      }
    } catch (error) {
      console.error('Erro na exportação:', error)
    }
  }

  // Função para download CSV
  const downloadCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Função para lidar com ações do documento
  const handleDocumentAction = (action: string, documento: DocumentoRecente) => {
    if (onDocumentAction) {
      onDocumentAction(action, documento)
    } else {
      // Ações padrão
      switch (action) {
        case 'view':
          console.log('Visualizar documento:', documento.id)
          break
        case 'download':
          console.log('Download documento:', documento.id)
          break
        case 'reprocess':
          console.log('Reprocessar documento:', documento.id)
          break
        case 'delete':
          console.log('Deletar documento:', documento.id)
          break
        case 'copy-id':
          navigator.clipboard.writeText(documento.id)
          break
        default:
          console.log('Ação não reconhecida:', action)
      }
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500 opacity-50" />
            <p className="text-muted-foreground mb-4">Erro ao carregar documentos</p>
            <Button onClick={() => refetch()} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Empty state
  if (documentos.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-2">Nenhum documento encontrado</p>
            <p className="text-sm text-muted-foreground">
              Documentos aparecerão aqui após o upload e processamento
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {documentosFiltrados.length} de {documentos.length}
            </Badge>

            {showRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            )}

            {showExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Formato de Exportação</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => exportData('csv')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('excel')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('pdf')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Filtros e Busca */}
        {(showSearch || showFilters) && (
          <div className="flex flex-col sm:flex-row gap-4">
            {showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {showFilters && (
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="processado">Processado</SelectItem>
                    <SelectItem value="processando">Processando</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="erro">Com Erro</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="NFE">NFe</SelectItem>
                    <SelectItem value="NFSE">NFSe</SelectItem>
                    <SelectItem value="RECIBO">Recibo</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="EXTRATO">Extrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                {showActions && <TableHead className="w-12">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentosFiltrados.map((documento) => (
                <TableRow key={documento.id}>
                  <TableCell>
                    <StatusBadge status={documento.status_processamento} />
                  </TableCell>
                  
                  <TableCell>
                    <div className="max-w-48">
                      <p className="font-medium truncate" title={documento.arquivo_nome}>
                        {documento.arquivo_nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: {documento.id.slice(0, 8)}...
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <TipoBadge tipo={documento.tipo_documento} />
                  </TableCell>
                  
                  <TableCell>
                    {documento.valor_total ? (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="font-medium">
                          {formatCurrency(documento.valor_total)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {formatDate(documento.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(documento.created_at)}
                    </p>
                  </TableCell>
                  
                  {showActions && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => onDocumentClick ? onDocumentClick(documento) : handleDocumentAction('view', documento)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleDocumentAction('download', documento)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => handleDocumentAction('copy-id', documento)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar ID
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {documento.status_processamento === 'erro' && (
                            <DropdownMenuItem onClick={() => handleDocumentAction('reprocess', documento)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reprocessar
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem onClick={() => handleDocumentAction('edit', documento)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar Dados
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleDocumentAction('delete', documento)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Paginação/Load More */}
        {documentos.length >= limit && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => refetch()}>
              Carregar Mais
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Componente de badge de status
 */
function StatusBadge({ status }: { status: StatusProcessamento }) {
  const statusConfig = {
    processado: {
      icon: CheckCircle,
      className: 'text-green-700 bg-green-100 border-green-200',
      label: 'Processado'
    },
    processando: {
      icon: Clock,
      className: 'text-blue-700 bg-blue-100 border-blue-200',
      label: 'Processando'
    },
    pendente: {
      icon: Clock,
      className: 'text-yellow-700 bg-yellow-100 border-yellow-200',
      label: 'Pendente'
    },
    erro: {
      icon: XCircle,
      className: 'text-red-700 bg-red-100 border-red-200',
      label: 'Erro'
    },
    rejeitado: {
      icon: XCircle,
      className: 'text-red-700 bg-red-100 border-red-200',
      label: 'Rejeitado'
    },
    requer_verificacao: {
      icon: AlertTriangle,
      className: 'text-orange-700 bg-orange-100 border-orange-200',
      label: 'Requer Verificação'
    }
  }

  const config = statusConfig[status] || statusConfig.pendente
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`${config.className} text-xs`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

/**
 * Componente de badge de tipo
 */
function TipoBadge({ tipo }: { tipo: TipoDocumento }) {
  const tipoConfig = {
    NFE: { className: 'text-green-700 bg-green-100 border-green-200', label: 'NFe' },
    NFCE: { className: 'text-emerald-700 bg-emerald-100 border-emerald-200', label: 'NFCe' },
    NFSE: { className: 'text-blue-700 bg-blue-100 border-blue-200', label: 'NFSe' },
    CTE: { className: 'text-indigo-700 bg-indigo-100 border-indigo-200', label: 'CTe' },
    RECIBO: { className: 'text-yellow-700 bg-yellow-100 border-yellow-200', label: 'Recibo' },
    CONTRATO: { className: 'text-orange-700 bg-orange-100 border-orange-200', label: 'Contrato' },
    BOLETO: { className: 'text-red-700 bg-red-100 border-red-200', label: 'Boleto' },
    EXTRATO: { className: 'text-purple-700 bg-purple-100 border-purple-200', label: 'Extrato' },
    COMPROVANTE: { className: 'text-cyan-700 bg-cyan-100 border-cyan-200', label: 'Comprovante' },
    OUTROS: { className: 'text-gray-700 bg-gray-100 border-gray-200', label: 'Outros' }
  }

  const config = tipoConfig[tipo] || { 
    className: 'text-gray-700 bg-gray-100 border-gray-200', 
    label: tipo 
  }

  return (
    <Badge variant="outline" className={`${config.className} text-xs`}>
      {config.label}
    </Badge>
  )
}

/**
 * Utilitários de formatação
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getTipoDisplayName(tipo: string): string {
  const displayNames: Record<string, string> = {
    'NFE': 'Nota Fiscal Eletrônica',
    'NFSE': 'Nota Fiscal de Serviço',
    'RECIBO': 'Recibo',
    'BOLETO': 'Boleto',
    'EXTRATO': 'Extrato Bancário',
    'COMPROVANTE': 'Comprovante',
    'CONTRATO': 'Contrato',
    'OUTROS': 'Outros'
  }

  return displayNames[tipo] || tipo
}

function getStatusDisplayName(status: string): string {
  const displayNames: Record<string, string> = {
    'processado': 'Processado',
    'processando': 'Processando',
    'pendente': 'Pendente',
    'erro': 'Erro',
    'rejeitado': 'Rejeitado'
  }

  return displayNames[status] || status
}
