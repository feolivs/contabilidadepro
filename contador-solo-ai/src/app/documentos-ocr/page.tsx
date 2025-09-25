'use client'

import { useState } from 'react'
import { CleanLayout } from '@/components/layout/clean-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Upload, 
  FileText, 
  Eye, 
  BarChart3,
  Plus,
  Settings
} from 'lucide-react'
import { DocumentList } from '@/components/documents/document-list'
import { DocumentViewer } from '@/components/documents/document-viewer'
import { UnifiedUploadModal } from '@/components/documentos/unified-upload-modal'
import { useDocumentProcessorUnified } from '@/hooks/use-document-processor-unified'

export default function DocumentosOCRPage() {
  const [activeTab, setActiveTab] = useState('upload')
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [showDocumentViewer, setShowDocumentViewer] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  
  const { processingStatus } = useDocumentProcessorUnified()
  
  // Dados mockados para demonstração
  const documents: any[] = []
  const selectedDocument = documents.find(d => d.id === selectedDocumentId)

  // Estatísticas mockadas
  const stats: any[] = []

  const handleViewDocument = (documentId: string) => {
    setSelectedDocumentId(documentId)
    setShowDocumentViewer(true)
  }

  const handleEditDocument = (document: any) => {
    // TODO: Implementar edição de documento
    console.log('Editar documento:', document.id)
  }

  const handleDownloadDocument = (document: any) => {
    // TODO: Implementar download de documento
    console.log('Download documento:', document.id)
  }

  const handleUploadComplete = (results: any[]) => {
    console.log('Upload concluído:', results)
    // Mudar para aba de lista após upload
    setActiveTab('list')
  }

  const renderStats = () => {
    const totalDocuments = stats?.reduce((sum, stat) => sum + stat.document_count, 0) || 0
    const completedDocuments = stats
      ?.filter(stat => stat.status === 'completed')
      ?.reduce((sum, stat) => sum + stat.document_count, 0) || 0
    const avgConfidence = stats && stats.length > 0
      ? stats.reduce((sum, stat) => sum + (stat.avg_confidence || 0), 0) / stats.length
      : 0

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">{totalDocuments}</div>
            <div className="text-sm text-gray-500">Total de Documentos</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Eye className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">{completedDocuments}</div>
            <div className="text-sm text-gray-500">Processados</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(avgConfidence * 100)}%
            </div>
            <div className="text-sm text-gray-500">Confiança Média</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 text-center">
            <Settings className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {stats?.filter(s => s.status === 'completed').length || 0}
            </div>
            <div className="text-sm text-gray-500">Tipos Processados</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <CleanLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos OCR</h1>
          <p className="text-gray-600 mt-2">
            Processe e gerencie seus documentos fiscais com inteligência artificial
          </p>
        </div>
        
        <Button 
          onClick={() => setActiveTab('upload')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      {/* Estatísticas */}
      {renderStats()}

      {/* Conteúdo Principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Processar Novos Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Button
                  onClick={() => setShowUpload(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload de Documentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-8">
          <DocumentList
            onViewDocument={handleViewDocument}
            onEditDocument={handleEditDocument}
            onDownloadDocument={handleDownloadDocument}
          />
        </TabsContent>

        <TabsContent value="analytics" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats && stats.length > 0 ? stats.map((stat) => (
                    <div key={`${stat.document_type}-${stat.status}`} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">{stat.document_type}</span>
                        <span className="text-xs text-gray-500">({stat.status})</span>
                      </div>
                      <div className="text-sm font-semibold">{stat.document_count}</div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">
                      Nenhuma estatística disponível
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confiança por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats && stats.length > 0 ? stats
                    .filter(stat => stat.avg_confidence > 0)
                    .map((stat) => (
                      <div key={`${stat.document_type}-confidence`} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{stat.document_type}</span>
                          <span>{Math.round(stat.avg_confidence * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${stat.avg_confidence * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )) : (
                    <div className="text-center text-gray-500 py-4">
                      Nenhuma estatística de confiança disponível
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Resumo de Processamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats ? stats.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.document_count, 0) : 0}
                    </div>
                    <div className="text-sm text-gray-600">Processados</div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats ? stats.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.document_count, 0) : 0}
                    </div>
                    <div className="text-sm text-gray-600">Pendentes</div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats ? stats.reduce((sum, s) => sum + s.validated_count, 0) : 0}
                    </div>
                    <div className="text-sm text-gray-600">Validados</div>
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {stats ? stats.filter(s => s.status === 'failed').reduce((sum, s) => sum + s.document_count, 0) : 0}
                    </div>
                    <div className="text-sm text-gray-600">Falharam</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Visualização de Documento */}
      <Dialog open={showDocumentViewer} onOpenChange={setShowDocumentViewer}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Documento</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <DocumentViewer
              document={selectedDocument}
              onEdit={handleEditDocument}
              onDownload={handleDownloadDocument}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Upload Unificado */}
      <UnifiedUploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        mode="batch"
        onUploadComplete={(results) => {
          console.log('Upload concluído:', results)
          setActiveTab('list')
        }}
      />
      </div>
    </CleanLayout>
  )
}
