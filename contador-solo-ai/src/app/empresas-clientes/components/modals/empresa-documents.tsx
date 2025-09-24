'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FolderOpen,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Search,
  Calendar,
  File,
  Image,
  FileSpreadsheet,
  Plus,
} from 'lucide-react'
import { EmpresaUnified } from '@/types/empresa-unified.types'

// Mock data para documentos (será substituído por dados reais)
interface DocumentoEmpresa {
  id: string
  nome: string
  tipo: 'pdf' | 'image' | 'excel' | 'word' | 'other'
  categoria: 'fiscal' | 'contrato' | 'certidao' | 'outros'
  tamanho: number
  dataUpload: Date
  url?: string
}

const mockDocumentos: DocumentoEmpresa[] = [
  {
    id: '1',
    nome: 'Contrato Social.pdf',
    tipo: 'pdf',
    categoria: 'contrato',
    tamanho: 2048000,
    dataUpload: new Date('2024-01-15'),
  },
  {
    id: '2',
    nome: 'Certidão Negativa Federal.pdf',
    tipo: 'pdf',
    categoria: 'certidao',
    tamanho: 512000,
    dataUpload: new Date('2024-02-10'),
  },
  {
    id: '3',
    nome: 'DAS Janeiro 2024.pdf',
    tipo: 'pdf',
    categoria: 'fiscal',
    tamanho: 256000,
    dataUpload: new Date('2024-02-05'),
  },
]

interface EmpresaDocumentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresa: EmpresaUnified | null
}

export function EmpresaDocumentsModal({
  open,
  onOpenChange,
  empresa,
}: EmpresaDocumentsModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('todos')
  const [documentos] = useState<DocumentoEmpresa[]>(mockDocumentos)

  if (!empresa) return null

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (tipo: string) => {
    switch (tipo) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'image':
        return <Image className="h-4 w-4 text-green-500" />
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  const getCategoryBadge = (categoria: string) => {
    const colors = {
      fiscal: 'bg-blue-100 text-blue-800',
      contrato: 'bg-green-100 text-green-800',
      certidao: 'bg-yellow-100 text-yellow-800',
      outros: 'bg-gray-100 text-gray-800',
    }

    const labels = {
      fiscal: 'Fiscal',
      contrato: 'Contrato',
      certidao: 'Certidão',
      outros: 'Outros',
    }

    return (
      <Badge className={colors[categoria as keyof typeof colors] || colors.outros}>
        {labels[categoria as keyof typeof labels] || 'Outros'}
      </Badge>
    )
  }

  const filteredDocumentos = documentos.filter((doc) => {
    const matchesSearch = doc.nome.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'todos' || doc.categoria === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Documentos da Empresa
          </DialogTitle>
          <DialogDescription>
            Gerencie os documentos de {empresa.nome}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Barra de ações */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="todos">Todas as categorias</option>
                <option value="fiscal">Fiscal</option>
                <option value="contrato">Contratos</option>
                <option value="certidao">Certidões</option>
                <option value="outros">Outros</option>
              </select>

              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          <Separator />

          {/* Lista de documentos */}
          <div className="space-y-2">
            {filteredDocumentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum documento encontrado</p>
                <p className="text-sm">
                  {searchTerm || selectedCategory !== 'todos'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Adicione documentos para esta empresa'}
                </p>
              </div>
            ) : (
              filteredDocumentos.map((documento) => (
                <div
                  key={documento.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(documento.tipo)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {documento.nome}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {documento.dataUpload.toLocaleDateString('pt-BR')}
                        <span>•</span>
                        {formatFileSize(documento.tamanho)}
                      </div>
                    </div>
                    {getCategoryBadge(documento.categoria)}
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Estatísticas */}
          {filteredDocumentos.length > 0 && (
            <>
              <Separator />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {filteredDocumentos.length} documento{filteredDocumentos.length !== 1 ? 's' : ''}
                </span>
                <span>
                  Total: {formatFileSize(
                    filteredDocumentos.reduce((acc, doc) => acc + doc.tamanho, 0)
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
