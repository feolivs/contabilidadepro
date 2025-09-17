'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { createDocumentSignedUrl } from '@/lib/storage-utils'
import { PDFJSViewer } from './pdf-js-viewer'
import {
  ExternalLink,
  Download,
  Loader2,
  AlertCircle,
  FileText,
  RefreshCw,
  Eye
} from 'lucide-react'

interface PDFViewerProps {
  url: string
  fileName: string
  filePath?: string // Para regenerar URL se necessário
}

export function PDFViewer({ url, fileName, filePath }: PDFViewerProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [currentUrl, setCurrentUrl] = useState<string>(url)
  const [retryCount, setRetryCount] = useState<number>(0)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [usePDFJS, setUsePDFJS] = useState<boolean>(false)
  const [showFallbackOption, setShowFallbackOption] = useState<boolean>(false)

  // Função para regenerar URL assinada
  const refreshUrl = useCallback(async () => {
    if (!filePath) return false

    setIsRefreshing(true)
    try {
      const newUrl = await createDocumentSignedUrl(filePath, 3600) // 1 hora
      if (newUrl) {
        setCurrentUrl(newUrl)
        setError(false)
        setErrorMessage('')
        setRetryCount(0)
        return true
      }
    } catch (err) {
      console.error('Erro ao regenerar URL:', err)
    } finally {
      setIsRefreshing(false)
    }
    return false
  }, [filePath])

  const handleLoad = () => {
    setLoading(false)
    setError(false)
    setErrorMessage('')
  }

  const handleError = useCallback(async () => {
    setLoading(false)

    // Detectar tipo de erro
    const iframe = document.querySelector('iframe[title*="Visualização do PDF"]') as HTMLIFrameElement
    let errorType = 'unknown'

    try {
      // Tentar acessar o conteúdo do iframe para detectar erro
      if (iframe?.contentWindow) {
        errorType = 'auth' // Provavelmente erro de autenticação/JWT
      }
    } catch (e) {
      errorType = 'cors' // Erro de CORS ou X-Frame-Options
    }

    // Se for erro de autenticação e temos filePath, tentar regenerar URL
    if ((errorType === 'auth' || retryCount === 0) && filePath && retryCount < 2) {
      console.log(`Tentativa ${retryCount + 1} de regenerar URL para ${fileName}`)
      setRetryCount(prev => prev + 1)

      const success = await refreshUrl()
      if (success) {
        setLoading(true) // Recarregar
        return
      }
    }

    // Se chegou aqui, erro definitivo - mostrar opção de fallback
    setError(true)
    setShowFallbackOption(true)
    setErrorMessage(
      errorType === 'auth'
        ? 'Erro de autenticação. A sessão pode ter expirado.'
        : errorType === 'cors'
        ? 'Erro de segurança (X-Frame-Options). Use o visualizador alternativo.'
        : 'Erro desconhecido ao carregar o PDF.'
    )
  }, [filePath, fileName, retryCount, refreshUrl])

  // Função para usar PDF.js como fallback
  const handleUsePDFJS = () => {
    setUsePDFJS(true)
    setError(false)
    setShowFallbackOption(false)
  }

  // Auto-retry quando URL muda
  useEffect(() => {
    if (currentUrl !== url) {
      setLoading(true)
      setError(false)
      setUsePDFJS(false) // Reset PDF.js fallback
    }
  }, [currentUrl, url])

  // Se deve usar PDF.js, renderizar o componente alternativo
  if (usePDFJS) {
    return <PDFJSViewer url={currentUrl} fileName={fileName} />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar PDF</h3>
        <p className="text-muted-foreground mb-2">
          {errorMessage || 'Não foi possível carregar o documento PDF no navegador.'}
        </p>
        {retryCount > 0 && (
          <p className="text-xs text-muted-foreground mb-4">
            Tentativas de recarregamento: {retryCount}/3
          </p>
        )}
        <div className="flex gap-2 flex-wrap justify-center">
          {showFallbackOption && (
            <Button
              variant="default"
              onClick={handleUsePDFJS}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Usar Visualizador Alternativo
            </Button>
          )}
          {filePath && retryCount < 2 && !showFallbackOption && (
            <Button
              variant="outline"
              onClick={refreshUrl}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Tentar Novamente
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => window.open(currentUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir em nova aba
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const link = document.createElement('a')
              link.href = currentUrl
              link.download = fileName
              link.click()
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controles do PDF */}
      <div className="pdf-controls flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir em nova aba
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const link = document.createElement('a')
              link.href = url
              link.download = fileName
              link.click()
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar
          </Button>
        </div>
      </div>

      {/* Visualizador do PDF */}
      <div className="flex-1 relative bg-gray-100 dark:bg-gray-800">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-10">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Carregando PDF...</p>
          </div>
        )}

        <iframe
          key={currentUrl} // Force re-render when URL changes
          src={`${currentUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
          className="w-full h-full border-0"
          title={`Visualização do PDF: ${fileName}`}
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  )
}
