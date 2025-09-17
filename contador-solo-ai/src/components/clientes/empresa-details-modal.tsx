'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Empresa {
  id: string
  nome: string
  nome_fantasia?: string
  cnpj?: string
  regime_tributario?: string
  atividade_principal?: string
  status?: string
  email?: string
  telefone?: string
  endereco?: string
  created_at: string
  updated_at: string
}

interface EmpresaDetailsModalProps {
  empresa: Empresa | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const regimeTributarioLabels = {
  'simples': 'Simples Nacional',
  'lucro_presumido': 'Lucro Presumido',
  'lucro_real': 'Lucro Real',
  'mei': 'MEI'
}

const statusLabels = {
  'ativa': 'Ativa',
  'inativa': 'Inativa',
  'suspensa': 'Suspensa'
}

const statusColors = {
  'ativa': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  'inativa': 'bg-muted text-muted-foreground',
  'suspensa': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
}

export function EmpresaDetailsModal({ 
  empresa, 
  open, 
  onOpenChange 
}: EmpresaDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [documentos, setDocumentos] = useState<any[]>([])
  const [calculos, setCalculos] = useState<any[]>([])

  const loadRelatedData = useCallback(async () => {
    if (!empresa) return

    setLoading(true)
    try {
      // Simular carregamento de documentos e cálculos
      // Em produção, fazer queries reais para as tabelas relacionadas
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data
      setDocumentos([
        { id: 1, nome: 'Contrato Social', tipo: 'PDF', data: '2024-01-15' },
        { id: 2, nome: 'Cartão CNPJ', tipo: 'PDF', data: '2024-01-20' },
      ])
      
      setCalculos([
        { id: 1, tipo: 'DAS', valor: 1250.00, mes: '2024-08', status: 'pago' },
        { id: 2, tipo: 'DAS', valor: 1180.00, mes: '2024-07', status: 'pago' },
      ])
    } catch (error) {

      toast.error('Erro ao carregar dados relacionados')
    } finally {
      setLoading(false)
    }
  }, [empresa])

  // Carregar dados relacionados quando o modal abrir
  useEffect(() => {
    if (open && empresa) {
      loadRelatedData()
    }
  }, [open, empresa, loadRelatedData])

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return ''
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '')
    return cleanCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  if (!empresa) return null

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Detalhes da Empresa
          </ModalTitle>
          <ModalDescription>
            Informações completas e dados relacionados da empresa
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Razão Social
                  </label>
                  <p className="font-medium">{empresa.nome}</p>
                </div>
                
                {empresa.nome_fantasia && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Nome Fantasia
                    </label>
                    <p className="font-medium">{empresa.nome_fantasia}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    CNPJ
                  </label>
                  <p className="font-mono">{formatCNPJ(empresa.cnpj || '')}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge className={statusColors[empresa.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
                      {statusLabels[empresa.status as keyof typeof statusLabels] || empresa.status}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Regime Tributário
                  </label>
                  <p className="font-medium">
                    {regimeTributarioLabels[empresa.regime_tributario as keyof typeof regimeTributarioLabels] || empresa.regime_tributario}
                  </p>
                </div>
                
                {empresa.atividade_principal && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Atividade Principal
                    </label>
                    <p>{empresa.atividade_principal}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {empresa.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <p>{empresa.email}</p>
                    </div>
                  </div>
                )}
                
                {empresa.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Telefone
                      </label>
                      <p>{empresa.telefone}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {empresa.endereco && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Endereço
                    </label>
                    <p>{empresa.endereco}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Data de Cadastro
                    </label>
                    <p>{formatDate(empresa.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Última Atualização
                    </label>
                    <p>{formatDate(empresa.updated_at)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados Relacionados */}
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Carregando dados relacionados...
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Documentos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documentos ({documentos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documentos.length > 0 ? (
                    <div className="space-y-2">
                      {documentos.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <p className="font-medium text-sm">{doc.nome}</p>
                            <p className="text-xs text-muted-foreground">{doc.tipo} • {formatDate(doc.data)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum documento cadastrado</p>
                  )}
                </CardContent>
              </Card>

              {/* Cálculos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Cálculos Recentes ({calculos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calculos.length > 0 ? (
                    <div className="space-y-2">
                      {calculos.map((calc) => (
                        <div key={calc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <p className="font-medium text-sm">{calc.tipo} - {calc.mes}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {calc.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <Badge variant={calc.status === 'pago' ? 'default' : 'secondary'}>
                            {calc.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhum cálculo realizado</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
