'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  Download,
  Edit
} from 'lucide-react'
import { useDocumentProcessorUnified } from '@/hooks/use-document-processor-unified'
import { cn } from '@/lib/utils'

// Tipos locais
type DocumentType = 'NFE' | 'RECIBO' | 'CONTRATO' | 'COMPROVANTE' | 'BOLETO' | 'EXTRATO'
type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  NFE: 'Nota Fiscal Eletrônica',
  RECIBO: 'Recibo',
  CONTRATO: 'Contrato',
  COMPROVANTE: 'Comprovante de Pagamento',
  BOLETO: 'Boleto Bancário',
  EXTRATO: 'Extrato Bancário'
}

const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  NFE: 'bg-blue-100 text-blue-800',
  RECIBO: 'bg-green-100 text-green-800',
  CONTRATO: 'bg-purple-100 text-purple-800',
  COMPROVANTE: 'bg-orange-100 text-orange-800',
  BOLETO: 'bg-red-100 text-red-800',
  EXTRATO: 'bg-gray-100 text-gray-800'
}

const STATUS_COLORS: Record<ProcessingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
}

const STATUS_LABELS: Record<ProcessingStatus, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  completed: 'Concluído',
  failed: 'Falhou'
}

interface DocumentListProps {
  onViewDocument?: (documentId: string) => void
  onEditDocument?: (documentId: string) => void
  onDownloadDocument?: (documentId: string) => void
}

export function DocumentList({ 
  onViewDocument, 
  onEditDocument, 
  onDownloadDocument 
}: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<ProcessingStatus | 'all'>('all')

  // Dados mockados para demonstração
  const documents: any[] = []
  const isLoading = false
  const error = null

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'N/A'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const filteredDocuments = documents.filter(doc => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      doc.file_name.toLowerCase().includes(searchLower) ||
      JSON.stringify(doc.extracted_data).toLowerCase().includes(searchLower)
    )
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando documentos...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Erro ao carregar documentos: {error?.message || 'Erro desconhecido'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as DocumentType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ProcessingStatus | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos Processados ({filteredDocuments.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm ? 'Nenhum documento encontrado para a busca.' : 'Nenhum documento processado ainda.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{document.file_name}</h3>
                          <Badge className={cn("text-xs", DOCUMENT_TYPE_COLORS[document.document_type])}>
                            {document.document_type}
                          </Badge>
                          <Badge className={cn("text-xs", STATUS_COLORS[document.status])}>
                            {STATUS_LABELS[document.status]}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(document.created_at)}
                          </span>
                          
                          {document.total_value && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(document.total_value)}
                            </span>
                          )}
                          
                          {document.manually_validated ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Validado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <AlertTriangle className="h-3 w-3" />
                              Não validado
                            </span>
                          )}
                          
                          {document.confidence_score && (
                            <span className="text-xs">
                              {Math.round(document.confidence_score * 100)}% confiança
                            </span>
                          )}
                        </div>
                        
                        {/* Preview dos dados extraídos */}
                        <div className="mt-2 text-xs text-gray-600">
                          {document.document_type === 'NFE' && document.extracted_data.emitente && (
                            <span>Emitente: {document.extracted_data.emitente.razaoSocial}</span>
                          )}
                          {document.document_type === 'RECIBO' && document.extracted_data.descricao && (
                            <span>Descrição: {document.extracted_data.descricao}</span>
                          )}
                          {document.document_type === 'COMPROVANTE' && document.extracted_data.tipoTransacao && (
                            <span>Tipo: {document.extracted_data.tipoTransacao}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {onViewDocument && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDocument(document.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {onEditDocument && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditDocument(document.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {onDownloadDocument && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownloadDocument(document.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {documents.filter(d => d.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">Processados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {documents.filter(d => d.manually_validated).length}
            </div>
            <div className="text-sm text-gray-500">Validados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(documents.reduce((sum, d) => sum + (d.total_value || 0), 0))}
            </div>
            <div className="text-sm text-gray-500">Valor Total</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {documents.length > 0 
                ? Math.round(documents.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / documents.length * 100)
                : 0}%
            </div>
            <div className="text-sm text-gray-500">Confiança Média</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
