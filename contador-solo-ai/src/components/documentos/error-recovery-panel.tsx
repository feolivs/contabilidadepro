'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  RefreshCw,
  Download,
  Eye,
  Clock,
  FileText,
  ExternalLink,
  Trash2,
  CheckCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { Documento } from '@/types/documento'
import { useUpdateDocumentoStatus, useDeleteDocumento } from '@/hooks/use-documentos'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ErrorRecoveryPanelProps {
  documento: Documento
  isOpen: boolean
  onClose: () => void
  onRetry?: () => Promise<void>
  onMarkAsManual?: () => Promise<void>
}

interface ErrorInfo {
  type: 'ocr_failed' | 'ai_analysis_failed' | 'validation_failed' | 'upload_failed' | 'timeout' | 'unknown'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  technicalDetails?: string
  suggestions: string[]
  canRetry: boolean
  canMarkAsManual: boolean
}

function analyzeError(documento: Documento): ErrorInfo {
  const observacoes = documento.observacoes || ''
  const status = documento.status_processamento

  // Análise baseada no status e observações
  if (status === 'erro') {
    if (observacoes.includes('OCR')) {
      return {
        type: 'ocr_failed',
        severity: 'high',
        message: 'Falha no processamento OCR do documento',
        technicalDetails: observacoes,
        suggestions: [
          'Verifique se o documento está legível',
          'Tente usar uma versão com maior qualidade',
          'Documento pode estar corrompido ou em formato não suportado',
          'Considere processar manualmente'
        ],
        canRetry: true,
        canMarkAsManual: true
      }
    }

    if (observacoes.includes('timeout') || observacoes.includes('Timeout')) {
      return {
        type: 'timeout',
        severity: 'medium',
        message: 'Tempo limite excedido durante o processamento',
        technicalDetails: observacoes,
        suggestions: [
          'Documento muito grande ou complexo',
          'Tente novamente em horário de menor demanda',
          'Considere dividir documento em partes menores',
          'Verifique a conexão com a internet'
        ],
        canRetry: true,
        canMarkAsManual: false
      }
    }

    if (observacoes.includes('IA') || observacoes.includes('AI')) {
      return {
        type: 'ai_analysis_failed',
        severity: 'medium',
        message: 'Falha na análise inteligente do documento',
        technicalDetails: observacoes,
        suggestions: [
          'Documento pode ter formato não reconhecido',
          'Conteúdo pode estar em idioma não suportado',
          'Tente ajustar o tipo de documento manualmente',
          'Processe manualmente se necessário'
        ],
        canRetry: true,
        canMarkAsManual: true
      }
    }

    return {
      type: 'unknown',
      severity: 'high',
      message: 'Erro desconhecido no processamento',
      technicalDetails: observacoes,
      suggestions: [
        'Entre em contato com o suporte técnico',
        'Tente fazer upload novamente',
        'Verifique se o arquivo não está corrompido',
        'Considere usar um formato diferente'
      ],
      canRetry: true,
      canMarkAsManual: true
    }
  }

  if (status === 'rejeitado') {
    return {
      type: 'validation_failed',
      severity: 'low',
      message: 'Documento rejeitado pela validação',
      technicalDetails: observacoes,
      suggestions: [
        'Verifique se o tipo de documento está correto',
        'Confirme se os dados extraídos fazem sentido',
        'Revise as informações manualmente',
        'Considere reenviar com tipo correto'
      ],
      canRetry: false,
      canMarkAsManual: true
    }
  }

  return {
    type: 'unknown',
    severity: 'low',
    message: 'Status inesperado',
    technicalDetails: `Status: ${status}`,
    suggestions: ['Entre em contato com o suporte'],
    canRetry: false,
    canMarkAsManual: false
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400'
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
  }
}

export function ErrorRecoveryPanel({
  documento,
  isOpen,
  onClose,
  onRetry,
  onMarkAsManual
}: ErrorRecoveryPanelProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [isMarkingAsManual, setIsMarkingAsManual] = useState(false)

  const updateStatusMutation = useUpdateDocumentoStatus()
  const deleteMutation = useDeleteDocumento()

  const errorInfo = analyzeError(documento)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      if (onRetry) {
        await onRetry()
      } else {
        // Retry padrão: atualizar status para pendente para reprocessar
        await updateStatusMutation.mutateAsync({
          id: documento.id,
          status: 'pendente'
        })
        toast.success('Documento enviado para reprocessamento')
        onClose()
      }
    } catch (error) {
      toast.error('Erro ao tentar reprocessar documento')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleMarkAsManual = async () => {
    setIsMarkingAsManual(true)
    try {
      if (onMarkAsManual) {
        await onMarkAsManual()
      } else {
        // Marcar como requer verificação manual
        await updateStatusMutation.mutateAsync({
          id: documento.id,
          status: 'requer_verificacao'
        })
        toast.success('Documento marcado para processamento manual')
        onClose()
      }
    } catch (error) {
      toast.error('Erro ao marcar documento para processamento manual')
    } finally {
      setIsMarkingAsManual(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.')) {
      try {
        await deleteMutation.mutateAsync(documento.id)
        toast.success('Documento excluído com sucesso')
        onClose()
      } catch (error) {
        toast.error('Erro ao excluir documento')
      }
    }
  }

  const handleDownload = () => {
    if (documento.arquivo_url) {
      window.open(documento.arquivo_url, '_blank')
    } else {
      toast.error('URL do arquivo não disponível')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Recuperação de Erro
          </DialogTitle>
          <DialogDescription>
            Análise do erro e opções de recuperação para o documento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Documento */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{documento.arquivo_nome}</span>
                </div>
                <Badge className={getSeverityColor(errorInfo.severity)}>
                  {errorInfo.severity.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="ml-2">{documento.tipo_documento}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2">{documento.status_processamento}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tamanho:</span>
                  <span className="ml-2">{(documento.arquivo_tamanho / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Criado:</span>
                  <span className="ml-2">
                    {formatDistanceToNow(new Date(documento.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Análise do Erro */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-medium">Análise do Erro</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Descrição:</h4>
                <p className="text-sm text-muted-foreground">{errorInfo.message}</p>
              </div>

              {errorInfo.technicalDetails && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Detalhes Técnicos:</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <code className="text-xs">{errorInfo.technicalDetails}</code>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium mb-2">Sugestões de Resolução:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {errorInfo.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Ações de Recuperação */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-medium">Ações Disponíveis</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {/* Primeira linha */}
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="justify-start"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Arquivo
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.open(documento.arquivo_url, '_blank')}
                  className="justify-start"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>

                {/* Segunda linha */}
                {errorInfo.canRetry && (
                  <Button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="justify-start"
                  >
                    {isRetrying ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Tentar Novamente
                  </Button>
                )}

                {errorInfo.canMarkAsManual && (
                  <Button
                    variant="outline"
                    onClick={handleMarkAsManual}
                    disabled={isMarkingAsManual}
                    className="justify-start"
                  >
                    {isMarkingAsManual ? (
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Processar Manualmente
                  </Button>
                )}

                {/* Terceira linha - ação destrutiva */}
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="justify-start col-span-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Documento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}