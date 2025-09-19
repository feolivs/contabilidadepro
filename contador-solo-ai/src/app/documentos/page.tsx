'use client'

import { useState, useMemo } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Upload,
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Shield
} from 'lucide-react'
import { useDocumentos, useDocumentosStats, useDownloadDocumento } from '@/hooks/use-documentos'
import { useEmpresas } from '@/hooks/use-empresas'
import { DocumentProcessingStatus } from '@/components/documentos/document-processing-status'
import { DocumentViewerModal } from '@/components/documentos/document-viewer-modal'
import { DocumentVerificationModal } from '@/components/documentos/document-verification-modal'
import { UploadDocumentoModal } from '@/components/documentos/upload-documento-modal'
import { DeleteDocumentoModal } from '@/components/documentos/delete-documento-modal'
import {
  Documento,
  TipoDocumento,
  StatusProcessamento,
  TIPOS_DOCUMENTO_LABELS,
  STATUS_PROCESSAMENTO_LABELS,
  TIPOS_DOCUMENTO_COLORS
} from '@/types/documento'
import { useDebounce } from 'use-debounce'
import { useSearchParams } from 'next/navigation'

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) {
    return <FileText className="h-4 w-4 text-primary" />
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileText className="h-4 w-4 text-green-500" />
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />
}


export default function DocumentosPage() {
  const searchParams = useSearchParams()
  const empresaIdFromUrl = searchParams.get('empresa')

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>(empresaIdFromUrl || 'all')
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumento | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<StatusProcessamento | 'all'>('all')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [viewerModalOpen, setViewerModalOpen] = useState(false)
  const [verificationModalOpen, setVerificationModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null)

  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)

  // Hooks para dados
  const { data: empresas = [] } = useEmpresas()
  const { data: stats } = useDocumentosStats()
  
  const documentFilter = useMemo(() => ({
    searchTerm: debouncedSearchTerm,
    empresaId: selectedEmpresa === 'all' ? undefined : selectedEmpresa,
    tipoDocumento: selectedTipo === 'all' ? undefined : selectedTipo,
    statusProcessamento: selectedStatus === 'all' ? undefined : selectedStatus
  }), [debouncedSearchTerm, selectedEmpresa, selectedTipo, selectedStatus])

  const { data: documentos = [], isLoading } = useDocumentos(documentFilter)
  const downloadMutation = useDownloadDocumento()

  const handleDownload = (documento: Documento) => {
    downloadMutation.mutate(documento)
  }

  const handleDelete = (documento: Documento) => {
    setSelectedDocument(documento)
    setDeleteModalOpen(true)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedEmpresa('all')
    setSelectedTipo('all')
    setSelectedStatus('all')
  }

  const handleViewDocument = (documento: Documento) => {
    setSelectedDocument(documento)
    setViewerModalOpen(true)
  }

  const handleVerifyDocument = (documento: Documento) => {
    setSelectedDocument(documento)
    setVerificationModalOpen(true)
  }

  const handleApproveDocument = async (documentId: string, correctedData: any) => {
    // TODO: Implementar aprovação do documento com dados corrigidos
    console.log('Approving document:', documentId, correctedData)
    // Aqui você faria uma chamada para atualizar o documento no banco
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
            <p className="text-muted-foreground">Gerencie todos os documentos das suas empresas</p>
          </div>
          <Button onClick={() => setUploadModalOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Documento
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Processados</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.processados}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 dark:text-green-400" />
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendentes}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Com Erro</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.erros}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTipo} onValueChange={(value) => setSelectedTipo(value as TipoDocumento | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(TIPOS_DOCUMENTO_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as StatusProcessamento | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(STATUS_PROCESSAMENTO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-card rounded-lg shadow-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : documentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || selectedEmpresa !== 'all' || selectedTipo !== 'all' || selectedStatus !== 'all'
                        ? 'Nenhum documento encontrado com os filtros aplicados'
                        : 'Nenhum documento encontrado'
                      }
                    </p>
                    <Button onClick={() => setUploadModalOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Fazer primeiro upload
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                documentos.map((documento) => (
                  <TableRow key={documento.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(documento.arquivo_tipo)}
                        <div>
                          <p className="font-medium text-foreground">{documento.arquivo_nome}</p>
                          {documento.numero_documento && (
                            <p className="text-sm text-muted-foreground">
                              Nº {documento.numero_documento}
                              {documento.serie && ` - Série ${documento.serie}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{documento.empresa?.nome || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={TIPOS_DOCUMENTO_COLORS[documento.tipo_documento]}>
                        {TIPOS_DOCUMENTO_LABELS[documento.tipo_documento]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DocumentProcessingStatus
                        status={documento.status_processamento}
                        confidence={documento.dados_extraidos?.confidence}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatFileSize(documento.arquivo_tamanho)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(documento.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(documento)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewDocument(documento)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {documento.status_processamento === 'requer_verificacao' && (
                            <DropdownMenuItem onClick={() => handleVerifyDocument(documento)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Verificar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(documento)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal de Upload */}
      <UploadDocumentoModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        empresaIdPadrao={selectedEmpresa === 'all' ? undefined : selectedEmpresa}
      />

      {/* Modal de Visualização */}
      <DocumentViewerModal
        documento={selectedDocument}
        isOpen={viewerModalOpen}
        onClose={() => {
          setViewerModalOpen(false)
          setSelectedDocument(null)
        }}
      />

      {/* Modal de Verificação */}
      <DocumentVerificationModal
        documento={selectedDocument}
        isOpen={verificationModalOpen}
        onClose={() => {
          setVerificationModalOpen(false)
          setSelectedDocument(null)
        }}
        onApprove={handleApproveDocument}
      />

      {/* Modal de Exclusão */}
      <DeleteDocumentoModal
        documento={selectedDocument}
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onSuccess={() => {
          setSelectedDocument(null)
        }}
      />
    </MainLayout>
  )
}
