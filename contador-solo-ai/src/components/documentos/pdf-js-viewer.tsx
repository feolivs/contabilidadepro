'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react'

interface PDFJSViewerProps {
  url: string
  fileName: string
}

export function PDFJSViewer({ url, fileName }: PDFJSViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdf, setPdf] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)

  const loadPDF = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Importar PDF.js dinamicamente
      const pdfjsLib = await import('pdfjs-dist')
      
      // Configurar worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

      console.log('Carregando PDF:', url)
      
      // Carregar PDF
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
      })

      const pdfDoc = await loadingTask.promise
      setPdf(pdfDoc)
      setTotalPages(pdfDoc.numPages)
      setCurrentPage(1)
      
      console.log(`PDF carregado: ${pdfDoc.numPages} páginas`)
      
    } catch (err: any) {
      console.error('Erro ao carregar PDF:', err)
      setError(`Erro ao carregar PDF: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [url])

  const renderPage = useCallback(async () => {
    if (!pdf || !canvasRef.current) return

    try {
      const page = await pdf.getPage(currentPage)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      // Calcular viewport
      const viewport = page.getViewport({ 
        scale: scale,
        rotation: rotation 
      })

      // Configurar canvas
      canvas.height = viewport.height
      canvas.width = viewport.width

      // Renderizar página
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      await page.render(renderContext).promise
      
    } catch (err: any) {
      console.error('Erro ao renderizar página:', err)
      setError(`Erro ao renderizar página: ${err.message}`)
    }
  }, [pdf, currentPage, scale, rotation])

  useEffect(() => {
    loadPDF()
  }, [loadPDF])

  useEffect(() => {
    if (pdf && currentPage) {
      renderPage()
    }
  }, [pdf, currentPage, scale, rotation, renderPage])

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360)
  }

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Carregando PDF...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar PDF</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPDF}>
            Tentar Novamente
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir em nova aba
          </Button>
          <Button
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
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controles */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {fileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegação de páginas */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Controles de zoom e rotação */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm px-2">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 3.0}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
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
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Visualizador */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 dark:border-gray-600 shadow-lg bg-white"
            style={{
              maxWidth: '100%',
              height: 'auto'
            }}
          />
        </div>
      </div>
    </div>
  )
}
