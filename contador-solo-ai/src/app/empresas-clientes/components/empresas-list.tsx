'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  FileText,
  Calculator,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'
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
import { EmpresaUnified, ViewMode } from '@/types/empresa-unified.types'
import { formatCNPJ } from '@/lib/utils'

// Função utilitária para formatar telefone
const formatPhone = (phone?: string) => {
  if (!phone) return ''
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '')

  // Formata conforme o tamanho
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  } else if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }

  return phone
}

interface EmpresasListProps {
  empresas: EmpresaUnified[]
  viewMode: ViewMode
  isLoading?: boolean
  selectedEmpresas?: EmpresaUnified[]
  onSelectionChange?: (empresas: EmpresaUnified[]) => void
  onEdit?: (empresa: EmpresaUnified) => void
  onDelete?: (empresa: EmpresaUnified) => void
  onView?: (empresa: EmpresaUnified) => void
  onViewDocuments?: (empresa: EmpresaUnified) => void
  onViewCalculations?: (empresa: EmpresaUnified) => void
}

export function EmpresasList({
  empresas,
  viewMode,
  isLoading = false,
  selectedEmpresas = [],
  onSelectionChange,
  onEdit,
  onDelete,
  onView,
  onViewDocuments,
  onViewCalculations
}: EmpresasListProps) {
  // Funções de seleção múltipla
  const isSelected = (empresa: EmpresaUnified) => {
    return selectedEmpresas.some(selected => selected.id === empresa.id)
  }

  const toggleSelection = (empresa: EmpresaUnified) => {
    if (!onSelectionChange) return

    const isCurrentlySelected = isSelected(empresa)
    if (isCurrentlySelected) {
      onSelectionChange(selectedEmpresas.filter(selected => selected.id !== empresa.id))
    } else {
      onSelectionChange([...selectedEmpresas, empresa])
    }
  }

  const toggleSelectAll = () => {
    if (!onSelectionChange) return

    if (selectedEmpresas.length === empresas.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(empresas)
    }
  }

  const isAllSelected = empresas.length > 0 && selectedEmpresas.length === empresas.length
  const isIndeterminate = selectedEmpresas.length > 0 && selectedEmpresas.length < empresas.length

  // Função para obter cor do regime tributário
  const getRegimeColor = (regime?: string) => {
    switch (regime) {
      case 'Simples Nacional':
      case 'simples':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
      case 'Lucro Presumido':
      case 'lucro_presumido':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'
      case 'Lucro Real':
      case 'lucro_real':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
      case 'MEI':
      case 'mei':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  // Função para obter nome amigável do regime
  const getRegimeName = (regime?: string) => {
    switch (regime) {
      case 'simples':
        return 'Simples Nacional'
      case 'lucro_presumido':
        return 'Lucro Presumido'
      case 'lucro_real':
        return 'Lucro Real'
      case 'mei':
        return 'MEI'
      default:
        return regime || 'Não informado'
    }
  }

  // Função para formatar endereço
  const formatAddress = (endereco?: string) => {
    if (!endereco) return 'Não informado'
    return endereco.length > 50 ? `${endereco.substring(0, 50)}...` : endereco
  }

  // Componente de ações da empresa
  const EmpresaActions = ({ empresa }: { empresa: EmpresaUnified }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {onView && (
          <DropdownMenuItem onClick={() => onView(empresa)}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </DropdownMenuItem>
        )}

        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(empresa)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onViewDocuments && (
          <DropdownMenuItem onClick={() => onViewDocuments(empresa)}>
            <FileText className="mr-2 h-4 w-4" />
            Documentos
          </DropdownMenuItem>
        )}

        {onViewCalculations && (
          <DropdownMenuItem onClick={() => onViewCalculations(empresa)}>
            <Calculator className="mr-2 h-4 w-4" />
            Cálculos
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {onDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(empresa)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (empresas.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building2 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Nenhuma empresa encontrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Não há empresas que correspondam aos critérios de busca atuais.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Renderização em modo tabela
  if (viewMode === 'table') {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Regime</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((empresa) => (
                <TableRow key={empresa.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {empresa.nome}
                        </div>
                        {empresa.nome_fantasia && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {empresa.nome_fantasia}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-mono text-sm">
                      {formatCNPJ(empresa.cnpj)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge className={getRegimeColor(empresa.regime_tributario)}>
                      {getRegimeName(empresa.regime_tributario)}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {empresa.ativa ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-600 text-sm">Ativa</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-red-600 text-sm">Inativa</span>
                        </>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span>{formatAddress(empresa.endereco)}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {empresa.telefone && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="h-3 w-3" />
                          <span>{formatPhone(empresa.telefone)}</span>
                        </div>
                      )}
                      {empresa.email && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                          <Mail className="h-3 w-3" />
                          <span>{empresa.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <EmpresaActions empresa={empresa} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )
  }

  // Renderização em modo grid/cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {empresas.map((empresa) => (
        <Card key={empresa.id} className="hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {empresa.nome}
                  </h3>
                  {empresa.nome_fantasia && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {empresa.nome_fantasia}
                    </p>
                  )}
                </div>
              </div>
              <EmpresaActions empresa={empresa} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                  {formatCNPJ(empresa.cnpj)}
                </span>
                <div className="flex items-center space-x-1">
                  {empresa.ativa ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-xs ${empresa.ativa ? 'text-green-600' : 'text-red-600'}`}>
                    {empresa.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>

              <Badge className={getRegimeColor(empresa.regime_tributario)}>
                {getRegimeName(empresa.regime_tributario)}
              </Badge>

              {empresa.endereco && (
                <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{formatAddress(empresa.endereco)}</span>
                </div>
              )}

              {empresa.telefone && (
                <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <span>{formatPhone(empresa.telefone)}</span>
                </div>
              )}

              {empresa.email && (
                <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{empresa.email}</span>
                </div>
              )}

              {empresa.created_at && (
                <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Criada em {new Date(empresa.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            {/* Indicadores de atividade */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                {empresa.documentos_count !== undefined && (
                  <div className="flex items-center space-x-1">
                    <FileText className="h-3 w-3" />
                    <span>{empresa.documentos_count} docs</span>
                  </div>
                )}

                {empresa.calculos_count !== undefined && (
                  <div className="flex items-center space-x-1">
                    <Calculator className="h-3 w-3" />
                    <span>{empresa.calculos_count} cálculos</span>
                  </div>
                )}

                {empresa.prazos_pendentes_count !== undefined && empresa.prazos_pendentes_count > 0 && (
                  <div className="flex items-center space-x-1 text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{empresa.prazos_pendentes_count} prazos</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
