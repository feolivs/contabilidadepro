'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { createDocumentSignedUrl } from '@/lib/storage-utils'
import { useDocumentProcessorUnified } from '@/hooks/use-document-processor-unified'
import { 
  Bug, 
  RefreshCw, 
  Link, 
  FileText, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Eye
} from 'lucide-react'

interface PDFDebugPanelProps {
  documento: {
    id: string
    arquivo_nome: string
    arquivo_caminho: string
    arquivo_url: string
    arquivo_tipo: string
  }
}

export function PDFDebugPanel({ documento }: PDFDebugPanelProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isDebugging, setIsDebugging] = useState(false)
  const { processOCR, isProcessing } = useDocumentProcessorUnified()

  const runDebugTests = async () => {
    setIsDebugging(true)
    const results: any = {
      timestamp: new Date().toISOString(),
      documento: {
        id: documento.id,
        nome: documento.arquivo_nome,
        caminho: documento.arquivo_caminho,
        tipo: documento.arquivo_tipo
      },
      tests: {}
    }

    try {
      // Test 1: URL Assinada
      console.log('🔍 Testando geração de URL assinada...')
      const startUrl = Date.now()
      const signedUrl = await createDocumentSignedUrl(documento.arquivo_caminho)
      const urlTime = Date.now() - startUrl
      
      results.tests.signedUrl = {
        success: !!signedUrl,
        url: signedUrl,
        time: urlTime,
        error: signedUrl ? null : 'Falha ao gerar URL assinada'
      }

      // Test 2: Acesso direto ao arquivo
      if (signedUrl) {
        console.log('🔍 Testando acesso ao arquivo...')
        const startAccess = Date.now()
        try {
          const response = await fetch(signedUrl, { method: 'HEAD' })
          const accessTime = Date.now() - startAccess
          
          results.tests.fileAccess = {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            time: accessTime,
            error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
          }
        } catch (error: any) {
          results.tests.fileAccess = {
            success: false,
            error: error.message,
            time: Date.now() - startAccess
          }
        }
      }

      // Test 3: OCR Processing
      console.log('🔍 Testando processamento OCR...')
      const startOcr = Date.now()
      try {
        const ocrResult = await processPDF({
          documentId: documento.id,
          filePath: documento.arquivo_caminho,
          fileName: documento.arquivo_nome,
          options: {
            language: 'por',
            quality: 'medium',
            enableCache: false
          }
        })
        const ocrTime = Date.now() - startOcr

        results.tests.ocrProcessing = {
          success: ocrResult.success,
          result: ocrResult,
          time: ocrTime,
          error: ocrResult.success ? null : ocrResult.error
        }
      } catch (error: any) {
        results.tests.ocrProcessing = {
          success: false,
          error: error.message,
          errorType: error.errorType,
          time: Date.now() - startOcr
        }
      }

      // Test 4: Browser compatibility
      results.tests.browserInfo = {
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        language: navigator.language,
        platform: navigator.platform
      }

    } catch (error: any) {
      results.error = error.message
    } finally {
      setDebugInfo(results)
      setIsDebugging(false)
    }
  }

  const getStatusIcon = (success: boolean | undefined) => {
    if (success === undefined) return <Clock className="h-4 w-4 text-gray-500" />
    return success ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  const getStatusColor = (success: boolean | undefined) => {
    if (success === undefined) return 'bg-gray-100 text-gray-800'
    return success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5 text-blue-500" />
          Debug Panel - PDF & OCR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações do Documento */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Documento</h4>
          <div className="text-sm space-y-1">
            <div><strong>Nome:</strong> {documento.arquivo_nome}</div>
            <div><strong>Caminho:</strong> {documento.arquivo_caminho}</div>
            <div><strong>Tipo:</strong> {documento.arquivo_tipo}</div>
            <div><strong>ID:</strong> {documento.id}</div>
          </div>
        </div>

        {/* Botão de Debug */}
        <Button 
          onClick={runDebugTests} 
          disabled={isDebugging || isProcessing}
          className="w-full"
        >
          {isDebugging ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Executando Testes...
            </>
          ) : (
            <>
              <Bug className="h-4 w-4 mr-2" />
              Executar Debug Completo
            </>
          )}
        </Button>

        {/* Resultados do Debug */}
        {debugInfo && (
          <div className="space-y-4">
            <h4 className="font-medium">Resultados dos Testes</h4>
            
            {/* URL Assinada */}
            {debugInfo.tests.signedUrl && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(debugInfo.tests.signedUrl.success)}
                  <span className="font-medium">URL Assinada</span>
                  <Badge className={getStatusColor(debugInfo.tests.signedUrl.success)}>
                    {debugInfo.tests.signedUrl.time}ms
                  </Badge>
                </div>
                {debugInfo.tests.signedUrl.error && (
                  <p className="text-sm text-red-600">{debugInfo.tests.signedUrl.error}</p>
                )}
                {debugInfo.tests.signedUrl.url && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(debugInfo.tests.signedUrl.url, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Testar URL
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Acesso ao Arquivo */}
            {debugInfo.tests.fileAccess && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(debugInfo.tests.fileAccess.success)}
                  <span className="font-medium">Acesso ao Arquivo</span>
                  <Badge className={getStatusColor(debugInfo.tests.fileAccess.success)}>
                    {debugInfo.tests.fileAccess.time}ms
                  </Badge>
                </div>
                {debugInfo.tests.fileAccess.status && (
                  <p className="text-sm">Status: {debugInfo.tests.fileAccess.status} {debugInfo.tests.fileAccess.statusText}</p>
                )}
                {debugInfo.tests.fileAccess.error && (
                  <p className="text-sm text-red-600">{debugInfo.tests.fileAccess.error}</p>
                )}
              </div>
            )}

            {/* OCR Processing */}
            {debugInfo.tests.ocrProcessing && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(debugInfo.tests.ocrProcessing.success)}
                  <span className="font-medium">Processamento OCR</span>
                  <Badge className={getStatusColor(debugInfo.tests.ocrProcessing.success)}>
                    {debugInfo.tests.ocrProcessing.time}ms
                  </Badge>
                </div>
                {debugInfo.tests.ocrProcessing.error && (
                  <p className="text-sm text-red-600">{debugInfo.tests.ocrProcessing.error}</p>
                )}
                {debugInfo.tests.ocrProcessing.result && (
                  <div className="mt-2 text-sm">
                    <p><strong>Método:</strong> {debugInfo.tests.ocrProcessing.result.method}</p>
                    <p><strong>Confiança:</strong> {Math.round((debugInfo.tests.ocrProcessing.result.confidence || 0) * 100)}%</p>
                    <p><strong>Caracteres:</strong> {debugInfo.tests.ocrProcessing.result.extractedText?.length || 0}</p>
                  </div>
                )}
              </div>
            )}

            {/* Raw Debug Data */}
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Dados Completos do Debug</summary>
              <Textarea
                value={JSON.stringify(debugInfo, null, 2)}
                readOnly
                className="mt-2 h-40 font-mono text-xs"
              />
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
