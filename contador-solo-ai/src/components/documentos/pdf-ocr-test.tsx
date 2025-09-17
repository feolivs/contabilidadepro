'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { usePDFOCR } from '@/hooks/use-pdf-ocr'
import { toast } from 'sonner'

export function PDFOCRTest() {
  const [testData, setTestData] = useState({
    documentId: 'test-doc-' + Date.now(),
    filePath: 'test/sample.pdf',
    fileName: 'sample.pdf'
  })
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const { processPDF, isProcessing } = usePDFOCR()

  const handleTest = async () => {
    try {
      setError(null)
      setResult(null)

      console.log('Iniciando teste do PDF OCR com dados:', testData)

      const ocrResult = await processPDF({
        documentId: testData.documentId,
        filePath: testData.filePath,
        fileName: testData.fileName,
        options: {
          language: 'por',
          quality: 'medium',
          enableCache: true
        }
      })

      console.log('Resultado do OCR:', ocrResult)
      setResult(ocrResult)

    } catch (err: any) {
      console.error('Erro no teste:', err)
      setError(err.message || 'Erro desconhecido')
    }
  }

  const handleDirectTest = async () => {
    try {
      setError(null)
      setResult(null)

      console.log('Testando chamada direta para Edge Function...')

      const response = await fetch('https://selnwgpyjctpjzdrfrey.supabase.co/functions/v1/pdf-ocr-service', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbG53Z3B5amN0cGp6ZHJmcmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE5NzEsImV4cCI6MjA2NDcxNzk3MX0.x2GdGtvLbslKMBE2u3EWuwMijDg0_CAxp6McwjUei6k',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: testData.documentId,
          filePath: testData.filePath,
          fileName: testData.fileName
        })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)

      const responseText = await response.text()
      console.log('Response text:', responseText)

      const data = JSON.parse(responseText)
      console.log('Parsed data:', data)

      setResult(data)

    } catch (err: any) {
      console.error('Erro no teste direto:', err)
      setError(err.message || 'Erro desconhecido no teste direto')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Teste do Serviço PDF OCR
          </CardTitle>
          <CardDescription>
            Teste a funcionalidade de OCR para documentos PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="documentId">Document ID</Label>
              <Input
                id="documentId"
                value={testData.documentId}
                onChange={(e) => setTestData(prev => ({ ...prev, documentId: e.target.value }))}
                placeholder="ID do documento"
              />
            </div>
            <div>
              <Label htmlFor="filePath">Caminho do Arquivo</Label>
              <Input
                id="filePath"
                value={testData.filePath}
                onChange={(e) => setTestData(prev => ({ ...prev, filePath: e.target.value }))}
                placeholder="Caminho no storage"
              />
            </div>
            <div>
              <Label htmlFor="fileName">Nome do Arquivo</Label>
              <Input
                id="fileName"
                value={testData.fileName}
                onChange={(e) => setTestData(prev => ({ ...prev, fileName: e.target.value }))}
                placeholder="Nome do arquivo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleTest}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Testar OCR (via Supabase Client)
                </>
              )}
            </Button>

            <Button
              onClick={handleDirectTest}
              disabled={isProcessing}
              variant="outline"
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              Testar OCR (Chamada Direta)
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Erro no Teste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={error}
              readOnly
              className="bg-red-100 border-red-200 text-red-800"
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Resultado do OCR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={result.success ? "default" : "destructive"}>
                  {result.success ? 'Sucesso' : 'Falha'}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Método</Label>
                <Badge variant="outline">{result.method}</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Confiança</Label>
                <Badge variant="outline">{Math.round(result.confidence * 100)}%</Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Tempo</Label>
                <Badge variant="outline">{result.processingTime}ms</Badge>
              </div>
            </div>

            {result.textQuality && (
              <div>
                <Label className="text-sm font-medium">Qualidade do Texto</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <div className="text-sm">
                    <span className="font-medium">Caracteres:</span> {result.textQuality.characterCount}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Palavras:</span> {result.textQuality.wordCount}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Legibilidade:</span> {Math.round(result.textQuality.readabilityScore * 100)}%
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Dados Estruturados:</span> {result.textQuality.hasStructuredData ? 'Sim' : 'Não'}
                  </div>
                </div>
              </div>
            )}

            {result.extractedText && (
              <div>
                <Label className="text-sm font-medium">Texto Extraído</Label>
                <Textarea
                  value={result.extractedText}
                  readOnly
                  className="mt-2 bg-gray-50"
                  rows={6}
                />
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Resposta Completa (JSON)</Label>
              <Textarea
                value={JSON.stringify(result, null, 2)}
                readOnly
                className="mt-2 bg-gray-50 font-mono text-xs"
                rows={8}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
