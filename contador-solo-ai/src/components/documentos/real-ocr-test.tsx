'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePDFOCR } from '@/hooks/use-pdf-ocr'
import { FileText, Eye, Zap, Clock, Target, DollarSign } from 'lucide-react'

export function RealOCRTest() {
  const [selectedProvider, setSelectedProvider] = useState<'openai-vision' | 'google-vision' | 'auto'>('auto')
  const [selectedQuality, setSelectedQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const { processPDF, isProcessing } = usePDFOCR()

  // Test data for different document types
  const testDocuments = [
    {
      id: 'real-invoice-001',
      name: 'Nota Fiscal Real',
      documentId: 'real-doc-invoice-001',
      filePath: 'documentos/test-invoice.pdf',
      fileName: 'nota-fiscal-exemplo.pdf',
      type: 'invoice',
      description: 'Teste com nota fiscal real'
    },
    {
      id: 'real-receipt-001',
      name: 'Cupom Fiscal Real',
      documentId: 'real-doc-receipt-001',
      filePath: 'documentos/test-receipt.pdf',
      fileName: 'cupom-fiscal-exemplo.pdf',
      type: 'receipt',
      description: 'Teste com cupom fiscal real'
    },
    {
      id: 'real-contract-001',
      name: 'Contrato Real',
      documentId: 'real-doc-contract-001',
      filePath: 'documentos/test-contract.pdf',
      fileName: 'contrato-exemplo.pdf',
      type: 'contract',
      description: 'Teste com contrato real'
    }
  ]

  const [selectedDocument, setSelectedDocument] = useState(testDocuments[0])

  const handleTest = async () => {
    try {
      setError(null)
      setResult(null)

      console.log('Iniciando teste OCR real com:', {
        document: selectedDocument,
        provider: selectedProvider,
        quality: selectedQuality
      })

      if (!selectedDocument) {
        throw new Error('Nenhum documento selecionado');
      }

      const ocrResult = await processPDF({
        documentId: selectedDocument.documentId,
        filePath: selectedDocument.filePath,
        fileName: selectedDocument.fileName,
        options: {
          language: 'por',
          quality: selectedQuality,
          enableCache: false, // Always fresh for testing
          forceOCR: true
        }
      })

      console.log('Resultado do OCR real:', ocrResult)
      setResult(ocrResult)

    } catch (err: any) {
      console.error('Erro no teste OCR real:', err)
      setError(err.message || 'Erro desconhecido')
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai-vision':
        return '🤖'
      case 'google-vision':
        return '🔍'
      case 'tesseract':
        return '📝'
      default:
        return '🔧'
    }
  }

  const getMethodBadgeColor = (method: string) => {
    switch (method) {
      case 'native':
        return 'bg-green-100 text-green-800'
      case 'ocr':
        return 'bg-blue-100 text-blue-800'
      case 'hybrid':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Teste OCR Real - Múltiplos Provedores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Documento de Teste</label>
            <Select
              value={selectedDocument?.id || ''}
              onValueChange={(value) => {
                const doc = testDocuments.find(d => d.id === value)
                if (doc) setSelectedDocument(doc)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {testDocuments.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{doc.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {doc.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">{selectedDocument?.description || ''}</p>
          </div>

          {/* Provider Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Provedor OCR</label>
            <Select
              value={selectedProvider}
              onValueChange={(value: any) => setSelectedProvider(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">🎯 Automático (Melhor para o documento)</SelectItem>
                <SelectItem value="openai-vision">🤖 OpenAI Vision API (Recomendado)</SelectItem>
                <SelectItem value="google-vision">🔍 Google Vision API</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quality Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Qualidade</label>
            <Select
              value={selectedQuality}
              onValueChange={(value: any) => setSelectedQuality(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">⚡ Baixa (Rápido e barato)</SelectItem>
                <SelectItem value="medium">⚖️ Média (Balanceado)</SelectItem>
                <SelectItem value="high">🎯 Alta (Máxima precisão)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Test Button */}
          <Button 
            onClick={handleTest} 
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processando OCR...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Testar OCR Real
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Resultado do OCR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {getProviderIcon(result.provider)} {result.provider || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Provedor</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((result.confidence || 0) * 100)}%
                </div>
                <div className="text-sm text-gray-500">Confiança</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {result.processingTime || 0}ms
                </div>
                <div className="text-sm text-gray-500">Tempo</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <Badge className={getMethodBadgeColor(result.method)}>
                  {result.method || 'unknown'}
                </Badge>
                <div className="text-sm text-gray-500 mt-1">Método</div>
              </div>
            </div>

            {/* Text Quality */}
            {result.textQuality && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-semibold text-blue-700">
                    {result.textQuality.characterCount}
                  </div>
                  <div className="text-xs text-blue-600">Caracteres</div>
                </div>
                
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-semibold text-green-700">
                    {result.textQuality.wordCount}
                  </div>
                  <div className="text-xs text-green-600">Palavras</div>
                </div>
                
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-semibold text-purple-700">
                    {Math.round((result.textQuality.readabilityScore || 0) * 100)}%
                  </div>
                  <div className="text-xs text-purple-600">Legibilidade</div>
                </div>
                
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="font-semibold text-orange-700">
                    {result.textQuality.hasStructuredData ? '✅' : '❌'}
                  </div>
                  <div className="text-xs text-orange-600">Dados Estruturados</div>
                </div>
              </div>
            )}

            {/* Extracted Text */}
            <div>
              <label className="text-sm font-medium mb-2 block">Texto Extraído</label>
              <Textarea
                value={result.extractedText || ''}
                readOnly
                className="min-h-[200px] font-mono text-sm"
                placeholder="Nenhum texto extraído"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Erro no Processamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 bg-red-50 p-3 rounded">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
