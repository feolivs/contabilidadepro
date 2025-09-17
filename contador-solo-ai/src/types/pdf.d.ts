// Tipos para PDF.js
declare module 'pdfjs-dist' {
  export interface PDFDocumentProxy {
    numPages: number
    getPage(pageNumber: number): Promise<PDFPageProxy>
  }

  export interface PDFPageProxy {
    getViewport(params: { scale: number; rotation?: number }): PDFPageViewport
    render(renderContext: PDFRenderContext): PDFRenderTask
  }

  export interface PDFPageViewport {
    width: number
    height: number
  }

  export interface PDFRenderContext {
    canvasContext: CanvasRenderingContext2D
    viewport: PDFPageViewport
  }

  export interface PDFRenderTask {
    promise: Promise<void>
  }

  export interface PDFLoadingTask {
    promise: Promise<PDFDocumentProxy>
  }

  export interface GlobalWorkerOptions {
    workerSrc: string
  }

  export const GlobalWorkerOptions: GlobalWorkerOptions
  export const version: string

  export function getDocument(params: {
    url: string
    cMapUrl?: string
    cMapPacked?: boolean
  }): PDFLoadingTask
}

// Extensão para Window com PDF.js
declare global {
  interface Window {
    pdfjsLib?: any
  }
}
