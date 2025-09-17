'use client'

import { Suspense } from 'react'
import { StreamingList, StreamingListSkeleton } from '@/components/ui/streaming-list'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OptimizedImage, DocumentImage } from '@/components/ui/optimized-image'
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  Building2,
  User
} from 'lucide-react'

interface Documento {
  id: string
  nome: string
  tipo: string
  tamanho: number
  data_upload: string
  empresa: {
    nome: string
    cnpj: string
  }
  usuario: {
    nome: string
    email: string
  }
  url_preview?: string
  status: 'processando' | 'concluido' | 'erro'
}

interface DocumentosStreamingProps {
  documentos: Documento[]
  searchTerm?: string
  filtroTipo?: string
  filtroStatus?: string
}

export function DocumentosStreaming({
  documentos,
  searchTerm = '',
  filtroTipo = 'todos',
  filtroStatus = 'todos'
}: DocumentosStreamingProps) {
  // Função de filtro
  const filterDocumentos = (documento: Documento, search: string) => {
    const searchLower = search.toLowerCase()
    return (
      documento.nome.toLowerCase().includes(searchLower) ||
      documento.empresa.nome.toLowerCase().includes(searchLower) ||
      documento.empresa.cnpj.includes(search) ||
      documento.tipo.toLowerCase().includes(searchLower)
    )
  }

  // Função de ordenação (mais recentes primeiro)
  const sortDocumentos = (a: Documento, b: Documento) => {
    return new Date(b.data_upload).getTime() - new Date(a.data_upload).getTime()
  }

  // Aplicar filtros adicionais
  const documentosFiltrados = documentos.filter(doc => {
    const matchTipo = filtroTipo === 'todos' || doc.tipo === filtroTipo
    const matchStatus = filtroStatus === 'todos' || doc.status === filtroStatus
    return matchTipo && matchStatus
  })

  const renderDocumento = (documento: Documento, index: number) => (
    <DocumentoCard key={documento.id} documento={documento} />
  )

  const emptyComponent = (
    <div className="text-center py-12">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">Nenhum documento encontrado</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm 
          ? `Nenhum documento corresponde à busca "${searchTerm}"`
          : 'Nenhum documento foi encontrado com os filtros aplicados'
        }
      </p>
      <Button variant="outline">
        <FileText className="h-4 w-4 mr-2" />
        Fazer upload de documento
      </Button>
    </div>
  )

  return (
    <Suspense fallback={<StreamingListSkeleton items={8} />}>
      <StreamingList
        data={documentosFiltrados}
        renderItem={renderDocumento}
        itemsPerPage={15}
        searchTerm={searchTerm}
        filterFn={filterDocumentos}
        sortFn={sortDocumentos}
        emptyComponent={emptyComponent}
        title="Documentos"
        showStats={true}
        className="w-full"
      />
    </Suspense>
  )
}

// Componente individual do documento
function DocumentoCard({ documento }: { documento: Documento }) {
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

  const getStatusBadge = (status: string) => {
    const variants = {
      'processando': { variant: 'secondary' as const, label: 'Processando' },
      'concluido': { variant: 'default' as const, label: 'Concluído' },
      'erro': { variant: 'destructive' as const, label: 'Erro' }
    }

    const config = variants[status as keyof typeof variants] || variants.concluido

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    )
  }

  const getTipoIcon = (tipo: string) => {
    const icons = {
      'PDF': FileText,
      'XML': FileText,
      'TXT': FileText,
      'DOC': FileText,
      'DOCX': FileText,
      'XLS': FileText,
      'XLSX': FileText
    }

    const Icon = icons[tipo as keyof typeof icons] || FileText
    return <Icon className="h-4 w-4" />
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Preview da imagem ou ícone */}
          <div className="flex-shrink-0">
            {documento.url_preview ? (
              <DocumentImage
                src={documento.url_preview}
                alt={documento.nome}
                className="w-16 h-20"
                aspectRatio="document"
                showOverlay={false}
              />
            ) : (
              <div className="w-16 h-20 bg-muted rounded-lg flex items-center justify-center">
                {getTipoIcon(documento.tipo)}
              </div>
            )}
          </div>

          {/* Informações do documento */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-sm truncate pr-2">
                  {documento.nome}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {documento.tipo}
                  </Badge>
                  {getStatusBadge(documento.status)}
                </div>
              </div>
            </div>

            {/* Metadados */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Building2 className="h-3 w-3" />
                <span className="truncate">
                  {documento.empresa.nome} • {documento.empresa.cnpj}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span className="truncate">
                  {documento.usuario.nome}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(documento.data_upload)}</span>
                </div>
                <span>{formatFileSize(documento.tamanho)}</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col space-y-1">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading específico para documentos
export function DocumentosStreamingLoading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-20 bg-muted rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-4 bg-muted rounded w-48 animate-pulse" />
                    <div className="flex space-x-2">
                      <div className="h-5 bg-muted rounded w-12 animate-pulse" />
                      <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-muted rounded w-64 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-32 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-40 animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
