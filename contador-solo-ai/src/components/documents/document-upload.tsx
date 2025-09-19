'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Eye,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { useDocumentOCR, DocumentType } from '@/hooks/use-document-ocr'
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
  NFE: 'bg-blue-100 text-blue-800',
  RECIBO: 'bg-green-100 text-green-800',
  CONTRATO: 'bg-purple-100 text-purple-800',
  COMPROVANTE: 'bg-orange-100 text-orange-800',
  BOLETO: 'bg-red-100 text-red-800',
  EXTRATO: 'bg-gray-100 text-gray-800'
}

interface DocumentUploadProps {
  onUploadComplete?: (documents: any[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
}

export function DocumentUpload({ 
  onUploadComplete, 
  maxFiles = 10,
  acceptedTypes = ['image/*', 'application/pdf']
}: DocumentUploadProps) {
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>()
  const [showResults, setShowResults] = useState(false)
  
  const {
    processMultipleFiles,
    uploadProgress,
    isProcessing,
    clearProgress,
    removeProgressItem,
    error
  } = useDocumentOCR()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    try {
      const results = await processMultipleFiles(acceptedFiles, selectedDocumentType)
      setShowResults(true)
      onUploadComplete?.(results)
    } catch (error) {
      console.error('Erro no upload:', error)
    }
  }, [processMultipleFiles, selectedDocumentType, onUploadComplete])

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections
  } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isProcessing
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'uploading':
        return '📤 Enviando para Storage...'
      case 'processing':
        return '🧠 Processando com IA...'
      case 'completed':
        return '✅ Processado com sucesso!'
      case 'error':
        return '❌ Erro no processamento'
      default:
        return '⏳ Aguardando...'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploading':
        return '📤 Upload rápido'
      case 'processing':
        return '🧠 OCR inteligente'
      case 'completed':
        return '✅ Processado'
      case 'error':
        return '❌ Erro'
      default:
        return '⏳ Aguardando'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-6">
      {/* Seletor de tipo de documento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tipo de Documento (Opcional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedDocumentType}
            onValueChange={(value) => setSelectedDocumentType(value as DocumentType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Detectar automaticamente" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", DOCUMENT_TYPE_COLORS[key as DocumentType])}>
                      {key}
                    </Badge>
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Área de upload */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive && !isDragReject && "border-blue-500 bg-blue-50",
              isDragReject && "border-red-500 bg-red-50",
              isProcessing && "cursor-not-allowed opacity-50",
              !isDragActive && !isDragReject && "border-gray-300 hover:border-gray-400"
            )}
          >
            <input {...getInputProps()} />
            
            <Upload className={cn(
              "h-12 w-12 mx-auto mb-4",
              isDragActive && !isDragReject && "text-blue-500",
              isDragReject && "text-red-500",
              !isDragActive && !isDragReject && "text-gray-400"
            )} />
            
            {isDragActive ? (
              isDragReject ? (
                <p className="text-red-600">Alguns arquivos não são suportados</p>
              ) : (
                <p className="text-blue-600">Solte os arquivos aqui...</p>
              )
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Arraste documentos aqui ou clique para selecionar
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  📱 Mobile otimizado • 🚀 Upload rápido • 🧠 OCR inteligente
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Suporta imagens (JPG, PNG) e PDFs até 10MB
                </p>
                <Button variant="outline" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Selecionar Arquivos
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Erros de validação */}
          {fileRejections.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                <AlertCircle className="h-4 w-4" />
                Arquivos rejeitados:
              </div>
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name} className="text-sm text-red-700">
                  <strong>{file.name}</strong>: {errors.map(e => e.message).join(', ')}
                </div>
              ))}
            </div>
          )}

          {/* Erro geral */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progresso dos uploads */}
      {uploadProgress.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Progresso do Processamento</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearProgress}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadProgress.map((item) => {
              const fileKey = `${item.file.name}-${item.file.size}`
              return (
                <div key={fileKey} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusIcon(item.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(item.file.size)} • {getStatusText(item.status)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.result && (
                        <Badge className={cn(
                          "text-xs",
                          DOCUMENT_TYPE_COLORS[item.result.document_type]
                        )}>
                          {item.result.document_type}
                        </Badge>
                      )}
                      
                      {item.status === 'completed' && item.result && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Abrir modal com detalhes do documento
                            console.log('Ver detalhes:', item.result)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProgressItem(fileKey)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {item.status !== 'completed' && item.status !== 'error' && (
                    <Progress value={item.progress} className="h-2" />
                  )}
                  
                  {item.error && (
                    <p className="text-xs text-red-600">{item.error}</p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
