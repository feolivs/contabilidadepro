/**
 * 🚀 DOCUMENT PROCESSOR UNIFIED - ContabilidadePRO
 * Componente para processamento unificado de documentos com IA avançada
 */

'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Download,
  RefreshCw,
  Zap,
  BarChart3
} from 'lucide-react'
import { useDocumentProcessorUnified } from '@/hooks/use-document-processor-unified'
import { cn } from '@/lib/utils'

interface DocumentProcessorUnifiedProps {
  onDocumentProcessed?: (result: any) => void
  className?: string
}

export function DocumentProcessorUnified({ 
  onDocumentProcessed, 
  className 
}: DocumentProcessorUnifiedProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [processingResult, setProcessingResult] = useState<any>(null)

  const {
    uploadAndProcess,
    processOCR,
    extractData,
    classifyDocument,
    analyzeDocument,
    reprocessDocument,
    processingStatus,
    isProcessing,
    error
  } = useDocumentProcessorUnified()

  // Handlers para drag & drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setSelectedFile(files[0])
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }, [])

  const handleProcessDocument = useCallback(async () => {
    if (!selectedFile) return

    try {
      const result = await uploadAndProcess.mutateAsync({
        file: selectedFile,
        documentType: 'AUTO_DETECT',
        extractionMode: 'complete',
        enableAI: true
      })

      setProcessingResult(result)
      onDocumentProcessed?.(result)
    } catch (error) {
      console.error('Erro no processamento:', error)
    }
  }, [selectedFile, uploadAndProcess, onDocumentProcessed])

  const getFileTypeIcon = (file: File) => {
    if (file.type.includes('pdf')) return '📄'
    if (file.type.includes('image')) return '🖼️'
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return '📊'
    if (file.type.includes('word') || file.type.includes('document')) return '📝'
    return '📎'
  }

  const getDocumentTypeColor = (type: string) => {
    const colors = {
      'NFE': 'bg-green-100 text-green-800',
      'NFCE': 'bg-blue-100 text-blue-800',
      'RECIBO': 'bg-purple-100 text-purple-800',
      'CONTRATO': 'bg-orange-100 text-orange-800',
      'BOLETO': 'bg-red-100 text-red-800',
      'OUTROS': 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || colors.OUTROS
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Processamento Unificado de Documentos
          </CardTitle>
          <CardDescription>
            Upload e processamento inteligente com extração universal de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300',
              'hover:border-primary hover:bg-primary/5'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-4">
                <div className="text-4xl">{getFileTypeIcon(selectedFile)}</div>
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button 
                    onClick={handleProcessDocument}
                    disabled={isProcessing}
                    className="flex items-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        Processar com IA
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedFile(null)}
                    disabled={isProcessing}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium">
                    Arraste um arquivo aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-gray-500">
                    Suporte: PDF, Imagens, Excel, Word (até 10MB)
                  </p>
                </div>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv,.doc,.docx,.txt"
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Selecionar Arquivo
                  </label>
                </Button>
              </div>
            )}
          </div>

          {/* Status de Processamento */}
          {processingStatus && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {processingStatus.message}
                </span>
                <span className="text-sm text-gray-500">
                  {processingStatus.progress}%
                </span>
              </div>
              <Progress value={processingStatus.progress} className="w-full" />
              <p className="text-xs text-gray-500">
                Estágio: {processingStatus.stage}
              </p>
            </div>
          )}

          {/* Erro */}
          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultados do Processamento */}
      {processingResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Processamento Concluído
            </CardTitle>
            <CardDescription>
              Confiança: {(processingResult.confidence * 100).toFixed(1)}% | 
              Tempo: {(processingResult.processingTime / 1000).toFixed(1)}s
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="entities">Entidades</TabsTrigger>
                <TabsTrigger value="financial">Financeiro</TabsTrigger>
                <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
                <TabsTrigger value="raw">Texto Bruto</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Badge className={getDocumentTypeColor(processingResult.extractedData.document_type)}>
                      {processingResult.extractedData.document_type}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">Tipo</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">
                      {processingResult.extractedData.entities?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500">Entidades</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">
                      {processingResult.extractedData.financial_data?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500">Valores</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">
                      {(processingResult.confidence * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">Confiança</p>
                  </div>
                </div>

                {processingResult.extractedData.insights && (
                  <div>
                    <h4 className="font-medium mb-2">💡 Insights</h4>
                    <ul className="space-y-1">
                      {processingResult.extractedData.insights.map((insight: string, index: number) => (
                        <li key={index} className="text-sm text-gray-600">
                          • {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="entities" className="space-y-4">
                {processingResult.extractedData.entities?.length > 0 ? (
                  <div className="space-y-2">
                    {processingResult.extractedData.entities.map((entity: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{entity.value}</p>
                          <p className="text-sm text-gray-500">{entity.context}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{entity.type}</Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {(entity.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Nenhuma entidade identificada
                  </p>
                )}
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                {processingResult.extractedData.financial_data?.length > 0 ? (
                  <div className="space-y-2">
                    {processingResult.extractedData.financial_data.map((financial: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">
                            {financial.currency} {financial.value.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                          <p className="text-sm text-gray-500">{financial.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{financial.type}</Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {(financial.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum dado financeiro identificado
                  </p>
                )}
              </TabsContent>

              <TabsContent value="fiscal" className="space-y-4">
                {processingResult.extractedData.fiscal_data ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(processingResult.extractedData.fiscal_data).map(([key, value]) => (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="font-medium">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum dado fiscal identificado
                  </p>
                )}
              </TabsContent>

              <TabsContent value="raw" className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {processingResult.extractedData.raw_text}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>

            {/* Ações Adicionais */}
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => reprocessDocument.mutate({ 
                  documentId: processingResult.documentId 
                })}
                disabled={reprocessDocument.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reprocessar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => analyzeDocument.mutate({ 
                  documentId: processingResult.documentId 
                })}
                disabled={analyzeDocument.isPending}
              >
                <Brain className="h-4 w-4 mr-2" />
                Análise IA
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const data = JSON.stringify(processingResult, null, 2)
                  const blob = new Blob([data], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `documento-${processingResult.documentId}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
