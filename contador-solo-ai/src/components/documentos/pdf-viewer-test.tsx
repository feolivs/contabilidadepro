'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PDFViewer } from './pdf-viewer'
import { PDFJSViewer } from './pdf-js-viewer'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Eye, 
  Monitor,
  Zap
} from 'lucide-react'

export function PDFViewerTest() {
  const [viewerType, setViewerType] = useState<'iframe' | 'pdfjs'>('iframe')
  
  // URL de teste - você pode substituir por uma URL real
  const testPdfUrl = 'https://selnwgpyjctpjzdrfrey.supabase.co/storage/v1/object/sign/documentos/test.pdf?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJkb2N1bWVudG9zL3Rlc3QucGRmIiwiaWF0IjoxNzM3MDU5NzI4LCJleHAiOjE3MzcwNjMzMjh9.example'
  const testFileName = 'Documento de Teste.pdf'
  const testFilePath = 'test/documento-teste.pdf'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Teste de Visualizadores PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Visualizador */}
          <div className="flex gap-2">
            <Button
              variant={viewerType === 'iframe' ? 'default' : 'outline'}
              onClick={() => setViewerType('iframe')}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              Iframe (Padrão)
              <Badge variant="secondary" className="ml-1">
                Pode falhar
              </Badge>
            </Button>
            <Button
              variant={viewerType === 'pdfjs' ? 'default' : 'outline'}
              onClick={() => setViewerType('pdfjs')}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              PDF.js (Fallback)
              <Badge variant="secondary" className="ml-1">
                Sempre funciona
              </Badge>
            </Button>
          </div>

          {/* Informações */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Como funciona:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Iframe:</strong> Usa o visualizador nativo do navegador (pode ser bloqueado por X-Frame-Options)</li>
              <li>• <strong>PDF.js:</strong> Renderiza o PDF usando JavaScript (sempre funciona, mas pode ser mais lento)</li>
              <li>• O sistema automaticamente oferece o fallback quando o iframe falha</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Visualizador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-green-500" />
            Visualizador Ativo: {viewerType === 'iframe' ? 'Iframe' : 'PDF.js'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] border rounded-lg overflow-hidden">
            {viewerType === 'iframe' ? (
              <PDFViewer
                url={testPdfUrl}
                fileName={testFileName}
                filePath={testFilePath}
              />
            ) : (
              <PDFJSViewer
                url={testPdfUrl}
                fileName={testFileName}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções de Teste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Para testar com documento real:
            </h4>
            <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>1. Substitua <code>testPdfUrl</code> pela URL real do seu documento</li>
              <li>2. Atualize <code>testFilePath</code> com o caminho correto no Supabase Storage</li>
              <li>3. Teste primeiro com iframe - se falhar, aparecerá botão para usar PDF.js</li>
              <li>4. O PDF.js deve sempre funcionar, mesmo com X-Frame-Options</li>
            </ol>
          </div>

          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
              ✅ Funcionalidades implementadas:
            </h4>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
              <li>• Auto-retry com regeneração de URL quando JWT expira</li>
              <li>• Fallback automático para PDF.js quando iframe falha</li>
              <li>• Cache de URLs assinadas para melhor performance</li>
              <li>• Controles de zoom, rotação e navegação no PDF.js</li>
              <li>• Timeout de 25s na Edge Function para evitar travamento</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
