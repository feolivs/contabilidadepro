'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Building, 
  User, 
  CheckCircle,
  AlertTriangle,
  Edit,
  Download,
  Eye
} from 'lucide-react'
import { ProcessedDocument, DocumentType } from '@/hooks/use-document-ocr'
import { cn } from '@/lib/utils'

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  NFE: 'Nota Fiscal Eletrônica',
  RECIBO: 'Recibo',
  CONTRATO: 'Contrato',
  COMPROVANTE: 'Comprovante de Pagamento',
  BOLETO: 'Boleto Bancário',
  EXTRATO: 'Extrato Bancário'
}

const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  NFE: 'bg-blue-100 text-blue-800 border-blue-200',
  RECIBO: 'bg-green-100 text-green-800 border-green-200',
  CONTRATO: 'bg-purple-100 text-purple-800 border-purple-200',
  COMPROVANTE: 'bg-orange-100 text-orange-800 border-orange-200',
  BOLETO: 'bg-red-100 text-red-800 border-red-200',
  EXTRATO: 'bg-gray-100 text-gray-800 border-gray-200'
}

interface DocumentViewerProps {
  document: ProcessedDocument
  onEdit?: (document: ProcessedDocument) => void
  onValidate?: (document: ProcessedDocument) => void
  onDownload?: (document: ProcessedDocument) => void
}

export function DocumentViewer({ 
  document, 
  onEdit, 
  onValidate, 
  onDownload 
}: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const formatCurrency = (value: number | string | null | undefined) => {
    if (!value) return 'N/A'
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue)
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('pt-BR')
    } catch {
      return dateString
    }
  }

  const formatDocument = (doc: string | null | undefined) => {
    if (!doc) return 'N/A'
    // Formatar CNPJ/CPF
    if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return doc
  }

  const renderNFEData = () => {
    const data = document.extracted_data
    return (
      <div className="space-y-6">
        {/* Informações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Informações da Nota Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Número</label>
              <p className="text-lg font-semibold">{data.numero || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Série</label>
              <p className="text-lg font-semibold">{data.serie || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data de Emissão</label>
              <p className="text-lg font-semibold">{formatDate(data.dataEmissao)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Emitente e Destinatário */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Emitente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Razão Social</label>
                <p className="font-medium">{data.emitente?.razaoSocial || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">CNPJ</label>
                <p className="font-mono">{formatDocument(data.emitente?.cnpj)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Endereço</label>
                <p className="text-sm text-gray-600">{data.emitente?.endereco || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Destinatário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Razão Social</label>
                <p className="font-medium">{data.destinatario?.razaoSocial || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">CNPJ/CPF</label>
                <p className="font-mono">{formatDocument(data.destinatario?.cnpjCpf)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Valores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Valores e Impostos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(data.valores?.valorTotal)}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Base ICMS</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(data.valores?.baseCalculoICMS)}
                </p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">ICMS</p>
                <p className="text-lg font-bold text-yellow-600">
                  {formatCurrency(data.valores?.valorICMS)}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">IPI</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(data.valores?.valorIPI)}
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">PIS</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(data.valores?.valorPIS)}
                </p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">COFINS</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatCurrency(data.valores?.valorCOFINS)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itens */}
        {data.itens && data.itens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Itens da Nota Fiscal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Descrição</th>
                      <th className="text-right p-2">Qtd</th>
                      <th className="text-right p-2">Valor Unit.</th>
                      <th className="text-right p-2">Valor Total</th>
                      <th className="text-center p-2">NCM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.itens.map((item: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{item.descricao || 'N/A'}</td>
                        <td className="text-right p-2">{item.quantidade || 'N/A'}</td>
                        <td className="text-right p-2">{formatCurrency(item.valorUnitario)}</td>
                        <td className="text-right p-2 font-semibold">{formatCurrency(item.valorTotal)}</td>
                        <td className="text-center p-2 font-mono text-xs">{item.ncm || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderReciboData = () => {
    const data = document.extracted_data
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Recibo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Número</label>
                <p className="text-lg font-semibold">{data.numero || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Data de Emissão</label>
                <p className="text-lg font-semibold">{formatDate(data.dataEmissao)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Valor</label>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(data.valor)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Partes Envolvidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Pagador</label>
                <p className="font-medium">{data.pagador?.nome || 'N/A'}</p>
                <p className="text-sm text-gray-600 font-mono">{formatDocument(data.pagador?.documento)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Recebedor</label>
                <p className="font-medium">{data.recebedor?.nome || 'N/A'}</p>
                <p className="text-sm text-gray-600 font-mono">{formatDocument(data.recebedor?.documento)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Descrição</label>
              <p className="text-gray-800">{data.descricao || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Forma de Pagamento</label>
              <p className="text-gray-800">{data.formaPagamento || 'N/A'}</p>
            </div>
            {data.observacoes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Observações</label>
                <p className="text-gray-800">{data.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderGenericData = () => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados Extraídos</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-auto">
            {JSON.stringify(document.extracted_data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold">{document.file_name}</h2>
                <p className="text-gray-500">
                  Processado em {formatDate(document.created_at)}
                </p>
              </div>
              <Badge className={cn("text-sm", DOCUMENT_TYPE_COLORS[document.document_type])}>
                {DOCUMENT_TYPE_LABELS[document.document_type]}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {document.manually_validated ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Validado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Não Validado
                </Badge>
              )}
              
              {document.confidence_score && (
                <Badge variant="outline">
                  {Math.round(document.confidence_score * 100)}% confiança
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(document)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            
            {onValidate && !document.manually_validated && (
              <Button variant="outline" size="sm" onClick={() => onValidate(document)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Validar
              </Button>
            )}
            
            {onDownload && (
              <Button variant="outline" size="sm" onClick={() => onDownload(document)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="raw">Dados Brutos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          {document.document_type === 'NFE' && renderNFEData()}
          {document.document_type === 'RECIBO' && renderReciboData()}
          {!['NFE', 'RECIBO'].includes(document.document_type) && renderGenericData()}
        </TabsContent>
        
        <TabsContent value="raw" className="mt-6">
          {renderGenericData()}
        </TabsContent>
      </Tabs>
    </div>
  )
}
