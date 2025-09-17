'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Brain, 
  Clock, 
  FileText, 
  Zap, 
  RotateCcw, 
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { usePDFOCR, useDocumentOCRHistory, ocrUtils } from '@/hooks/use-pdf-ocr'
import { Documento } from '@/types/documento'

interface OCRInfoPanelProps {
  documento: Documento
  className?: string
}

export function OCRInfoPanel({ documento, className = '' }: OCRInfoPanelProps) {
  const [showHistory, setShowHistory] = useState(false)
  const { reprocessDocument, isProcessing } = usePDFOCR()
  const { data: ocrHistory, isLoading: historyLoading } = useDocumentOCRHistory(documento.id)

  // Extrair informações de OCR dos dados extraídos
  const ocrData = documento.dados_extraidos
  const ocrMethod = ocrData?.extraction_method || (documento as any).ocr_method
  const ocrConfidence = ocrData?.extraction_confidence || (documento as any).ocr_confidence || ocrData?.confidence
  const textQuality = ocrData?.text_quality || (documento as any).text_extraction_quality

  const handleReprocess = async () => {
    if (!documento.arquivo_path) return

    try {
      console.log('Iniciando reprocessamento de:', documento.arquivo_nome)
      await reprocessDocument({
        documentId: documento.id,
        filePath: documento.arquivo_path,
        fileName: documento.arquivo_nome,
        forceOCR: true,
        quality: 'high'
      })
    } catch (error) {
      console.error('Erro ao reprocessar documento:', error)
    }
  }

  if (!ocrMethod && !ocrConfidence) {
    return (
      <div className={`p-4 bg-gray-50 dark:bg-gray-900 rounded-lg ${className}`}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          <span className="text-sm">Informações de OCR não disponíveis</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Processamento OCR
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReprocess}
          disabled={isProcessing}
          className="text-xs"
        >
          {isProcessing ? (
            <>
              <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
              Reprocessando...
            </>
          ) : (
            <>
              <RotateCcw className="h-3 w-3 mr-1" />
              Reprocessar
            </>
          )}
        </Button>
      </div>

      {/* Método e Confiança */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Método</label>
          <div className="mt-1">
            <Badge 
              variant="outline" 
              className={`${ocrUtils.getMethodColor(ocrMethod)} border-current`}
            >
              {ocrUtils.getMethodLabel(ocrMethod)}
            </Badge>
          </div>
        </div>
        
        {ocrConfidence && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Confiança</label>
            <div className="mt-1 flex items-center gap-2">
              <Progress 
                value={ocrConfidence * 100} 
                className="flex-1 h-2"
              />
              <span className={`text-xs font-medium ${ocrUtils.getConfidenceColor(ocrConfidence)}`}>
                {ocrUtils.formatConfidence(ocrConfidence)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Qualidade do Texto */}
      {textQuality && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Qualidade do Texto</label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {textQuality.character_count && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span>{textQuality.character_count.toLocaleString()} caracteres</span>
              </div>
            )}
            
            {textQuality.has_structured_data !== undefined && (
              <div className="flex items-center gap-1">
                {textQuality.has_structured_data ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                )}
                <span>
                  {textQuality.has_structured_data ? 'Dados estruturados' : 'Sem estrutura'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tempo de Processamento */}
      {ocrData?.processingTime && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tempo de Processamento</label>
          <div className="mt-1 flex items-center gap-1 text-sm">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{ocrUtils.formatProcessingTime(ocrData.processingTime)}</span>
          </div>
        </div>
      )}

      {/* Histórico */}
      {ocrHistory && ocrHistory.length > 1 && (
        <>
          <Separator />
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs p-0 h-auto"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {showHistory ? 'Ocultar' : 'Ver'} Histórico ({ocrHistory.length} processamentos)
            </Button>

            {showHistory && (
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                {historyLoading ? (
                  <div className="text-xs text-muted-foreground">Carregando histórico...</div>
                ) : (
                  ocrHistory.map((entry, index) => (
                    <div 
                      key={entry.id} 
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {ocrUtils.getMethodLabel(entry.method)}
                        </Badge>
                        <span className={ocrUtils.getConfidenceColor(entry.confidence)}>
                          {ocrUtils.formatConfidence(entry.confidence)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Avisos e Sugestões */}
      {ocrConfidence && ocrConfidence < 0.7 && (
        <>
          <Separator />
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Baixa confiança na extração
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  O texto pode conter erros. Considere reprocessar com qualidade alta ou verificar manualmente.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {ocrMethod === 'fallback' && (
        <>
          <Separator />
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Processamento com fallback
                </p>
                <p className="text-red-700 dark:text-red-300 mt-1">
                  O OCR nativo falhou. Os dados podem estar incompletos ou incorretos.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {ocrMethod === 'native' && ocrConfidence && ocrConfidence > 0.9 && (
        <>
          <Separator />
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-green-800 dark:text-green-200">
                  Extração de alta qualidade
                </p>
                <p className="text-green-700 dark:text-green-300 mt-1">
                  Texto extraído diretamente do PDF com alta confiança.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
