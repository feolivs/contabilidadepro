'use client'

import { useState, useEffect } from 'react'
import { createDocumentSignedUrl } from '@/lib/storage-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DocumentProcessingDetails } from './document-processing-status'
import { PDFViewer } from './pdf-viewer'
import { OCRInfoPanel } from './ocr-info-panel'
import { Documento } from '@/types/documento'
import { TIPOS_DOCUMENTO_LABELS, TIPOS_DOCUMENTO_COLORS } from '@/types/documento'
import { 
  FileText, 
  Download, 
  Eye, 
  Building2, 
  Calendar, 
  DollarSign, 
  Hash,
  FileImage,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react'

interface DocumentViewerModalProps {
  documento: Documento | null
  isOpen: boolean
  onClose: () => void
}

export function DocumentViewerModal({ documento, isOpen, onClose }: DocumentViewerModalProps) {
  const [imageScale, setImageScale] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    const getSignedUrl = async () => {
      if (documento?.arquivo_path) {
        try {
          const url = await createDocumentSignedUrl(documento.arquivo_path)
          if (url) {
            setSignedUrl(url)
          } else {
            // Fallback para URL direta se houver erro
            setSignedUrl(documento.arquivo_url || null)
          }
        } catch (error) {
          console.error('Erro ao gerar URL assinada:', error)
          // Fallback para URL direta
          setSignedUrl(documento.arquivo_url || null)
        }
      }
    }

    getSignedUrl()
  }, [documento?.arquivo_path, documento?.arquivo_url])

  if (!documento) return null

  const isImage = documento.arquivo_tipo.startsWith('image/')
  const isPDF = documento.arquivo_tipo === 'application/pdf'

  const handleZoomIn = () => setImageScale(prev => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setImageScale(prev => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setImageRotation(prev => (prev + 90) % 360)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="modal-content max-w-[900px] w-full max-h-[98vh] h-[98vh] overflow-hidden p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {documento.arquivo_nome}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="modal-body flex gap-6 overflow-hidden h-full">
          {/* Visualização do Documento */}
          <div className="coluna-visualizacao flex-1 space-y-4 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Visualização</h3>
              {isImage && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(imageScale * 100)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900 min-h-[600px] h-[70vh]">
              {isImage ? (
                <div className="overflow-auto max-h-[65vh] w-full flex justify-center items-center h-full">
                  <img
                    src={signedUrl || documento.arquivo_url}
                    alt={documento.arquivo_nome}
                    className="max-w-full h-auto"
                    style={{
                      transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                      transformOrigin: 'center'
                    }}
                  />
                </div>
              ) : isPDF ? (
                <PDFViewer
                  url={signedUrl || documento.arquivo_url}
                  fileName={documento.arquivo_nome}
                  filePath={documento.arquivo_path}
                />
              ) : (
                <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                  <FileImage className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Tipo de arquivo não suportado para visualização
                  </p>
                  <Button asChild>
                    <a href={signedUrl || documento.arquivo_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Arquivo
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Informações e Dados Extraídos */}
          <div className="coluna-dados flex-1 min-w-[350px] space-y-6 overflow-y-auto max-h-[75vh]">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações do Documento</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <div className="mt-1">
                    <Badge className={TIPOS_DOCUMENTO_COLORS[documento.tipo_documento]}>
                      {TIPOS_DOCUMENTO_LABELS[documento.tipo_documento]}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">
                    <DocumentProcessingDetails 
                      status={documento.status_processamento}
                      confidence={documento.dados_extraidos?.confidence}
                      dadosExtraidos={documento.dados_extraidos}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Empresa</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{documento.empresa?.nome}</span>
                  </div>
                  {documento.empresa?.cnpj && (
                    <p className="text-xs text-muted-foreground mt-1">
                      CNPJ: {documento.empresa.cnpj}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tamanho</label>
                  <p className="text-sm mt-1">
                    {(documento.arquivo_tamanho / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados Extraídos pela IA */}
            {documento.dados_extraidos && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados Extraídos pela IA</h3>
                
                <div className="grid gap-4">
                  {documento.dados_extraidos.numero_documento && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Número do Documento
                      </label>
                      <p className="text-sm mt-1 font-mono">
                        {documento.dados_extraidos.numero_documento}
                      </p>
                    </div>
                  )}

                  {documento.dados_extraidos.valor_total && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Valor Total
                      </label>
                      <p className="text-sm mt-1 font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(documento.dados_extraidos.valor_total)}
                      </p>
                    </div>
                  )}

                  {documento.dados_extraidos.data_emissao && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data de Emissão
                      </label>
                      <p className="text-sm mt-1">
                        {formatDate(documento.dados_extraidos.data_emissao)}
                      </p>
                    </div>
                  )}

                  {documento.dados_extraidos.empresa_emitente && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Empresa Emitente
                      </label>
                      <p className="text-sm mt-1">
                        {documento.dados_extraidos.empresa_emitente}
                      </p>
                    </div>
                  )}

                  {documento.dados_extraidos.cnpj_emitente && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        CNPJ Emitente
                      </label>
                      <p className="text-sm mt-1 font-mono">
                        {documento.dados_extraidos.cnpj_emitente}
                      </p>
                    </div>
                  )}

                  {documento.dados_extraidos.descricao && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Descrição
                      </label>
                      <p className="text-sm mt-1 text-muted-foreground">
                        {documento.dados_extraidos.descricao}
                      </p>
                    </div>
                  )}

                  {documento.dados_extraidos.confidence && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Confiança da IA
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${documento.dados_extraidos.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round(documento.dados_extraidos.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Informações de OCR */}
            {documento.arquivo_tipo === 'application/pdf' && (
              <>
                <OCRInfoPanel documento={documento} />
                <Separator />
              </>
            )}

            {/* Ações */}
            <div className="flex gap-2">
              <Button asChild>
                <a href={signedUrl || documento.arquivo_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={signedUrl || documento.arquivo_url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  Abrir em Nova Aba
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
