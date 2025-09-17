import { PDFOCRTest } from '@/components/documentos/pdf-ocr-test'

export default function TestOCRPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Teste do Serviço PDF OCR</h1>
        <PDFOCRTest />
      </div>
    </div>
  )
}
