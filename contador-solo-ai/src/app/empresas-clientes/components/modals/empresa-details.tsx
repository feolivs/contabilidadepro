'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Calculator,
  FolderOpen,
} from 'lucide-react'
import { EmpresaUnified } from '@/types/empresa-unified.types'
import { cn } from '@/lib/utils'

// Função para formatar telefone
function formatPhone(phone: string): string {
  if (!phone) return ''

  const numbers = phone.replace(/\D/g, '')

  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  return phone
}

interface EmpresaDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresa: EmpresaUnified | null
  onEdit?: () => void
  onDelete?: () => void
  onCalculos?: () => void
  onDocumentos?: () => void
}

export function EmpresaDetailsModal({
  open,
  onOpenChange,
  empresa,
  onEdit,
  onDelete,
  onCalculos,
  onDocumentos,
}: EmpresaDetailsModalProps) {
  if (!empresa) return null

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return 'Não informado'
    const numbers = cnpj.replace(/\D/g, '')
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatDate = (date: string | Date) => {
    if (!date) return 'Não informado'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getRegimeBadgeColor = (regime: string) => {
    switch (regime) {
      case 'MEI':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'Simples Nacional':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      case 'Lucro Presumido':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
      case 'Lucro Real':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Detalhes da Empresa
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre {empresa.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com nome e status */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{empresa.nome}</h3>
              {empresa.nome_fantasia && (
                <p className="text-sm text-muted-foreground">
                  Nome Fantasia: {empresa.nome_fantasia}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getRegimeBadgeColor(empresa.regime_tributario || '')}>
                {empresa.regime_tributario}
              </Badge>
              <Badge variant={empresa.ativa ? 'default' : 'secondary'}>
                {empresa.ativa ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <XCircle className="w-3 h-3 mr-1" />
                )}
                {empresa.ativa ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Informações básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Informações Básicas
              </h4>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">CNPJ</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCNPJ(empresa.cnpj || '')}
                    </p>
                  </div>
                </div>

                {empresa.atividade_principal && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Atividade Principal</p>
                      <p className="text-sm text-muted-foreground">
                        {empresa.atividade_principal}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data de Cadastro</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(empresa.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Contato
              </h4>

              <div className="space-y-3">
                {empresa.telefone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Telefone</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPhone(empresa.telefone)}
                      </p>
                    </div>
                  </div>
                )}

                {empresa.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {empresa.email}
                      </p>
                    </div>
                  </div>
                )}

                {empresa.endereco && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Endereço</p>
                      <p className="text-sm text-muted-foreground">
                        {empresa.endereco}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          {empresa.observacoes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Observações
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {empresa.observacoes}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            {onEdit && (
              <Button onClick={onEdit} size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}

            {onCalculos && (
              <Button onClick={onCalculos} variant="outline" size="sm">
                <Calculator className="w-4 h-4 mr-2" />
                Cálculos
              </Button>
            )}

            {onDocumentos && (
              <Button onClick={onDocumentos} variant="outline" size="sm">
                <FolderOpen className="w-4 h-4 mr-2" />
                Documentos
              </Button>
            )}

            {onDelete && (
              <Button onClick={onDelete} variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
