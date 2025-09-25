'use client'

import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import {
  Upload,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  Zap,
  Eye,
  Trash2,
  Settings,
  Info
} from 'lucide-react'

import { useDocumentProcessorUnified } from '@/hooks/use-document-processor-unified'
import { useEmpresas } from '@/hooks/use-empresas'
import {
  TipoDocumento,
  TIPOS_DOCUMENTO_LABELS,
  validarArquivo,
  detectarTipoDocumento,
  EXTENSOES_ACEITAS,
  TAMANHO_MAXIMO_ARQUIVO
} from '@/types/documento'

// Interfaces
interface ArquivoSelecionado {
  id: string
  arquivo: File
  preview: string
  erro?: string
  tipoDetectado: TipoDocumento
  status: 'waiting' | 'uploading' | 'processing' | 'success' | 'error'
  progress: number
  resultado?: any
}

interface UnifiedUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresaIdPadrao?: string
  mode?: 'single' | 'batch'
  onUploadComplete?: (results: any[]) => void
}

// Schema de validação
const uploadSchema = z.object({
  empresa_id: z.string().min(1, 'Selecione uma empresa'),
  modo_lote: z.boolean().default(false),
  tipo_documento_global: z.string().optional(),
  processamento_avancado: z.boolean().default(true),
  observacoes: z.string().optional(),
})

type UploadFormData = z.infer<typeof uploadSchema>

export function UnifiedUploadModal({
  open,
  onOpenChange,
  empresaIdPadrao,
  mode = 'single',
  onUploadComplete
}: UnifiedUploadModalProps) {
  const [arquivosSelecionados, setArquivosSelecionados] = useState<ArquivoSelecionado[]>([])
  const [uploadAtivo, setUploadAtivo] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  const { data: empresas = [] } = useEmpresas()
  const queryClient = useQueryClient()
  
  const {
    uploadAndProcess,
    processingStatus,
    isLoading: isProcessing
  } = useDocumentProcessorUnified()

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      empresa_id: empresaIdPadrao || '',
      modo_lote: mode === 'batch',
      processamento_avancado: true,
      observacoes: '',
    }
  })

  // Limpar arquivos quando modal fecha
  useEffect(() => {
    if (!open) {
      arquivosSelecionados.forEach(arquivo => {
        if (arquivo.preview) {
          URL.revokeObjectURL(arquivo.preview)
        }
      })
      setArquivosSelecionados([])
      setUploadAtivo(false)
      form.reset()
    }
  }, [open, form])

  // Configuração do dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('📁 Arquivos recebidos:', acceptedFiles.length)
    
    const novosArquivos: ArquivoSelecionado[] = acceptedFiles.map(arquivo => {
      const validacao = validarArquivo(arquivo)
      const tipoDetectado = detectarTipoDocumento(arquivo.name)
      
      console.log('🔍 Processando arquivo:', {
        nome: arquivo.name,
        tipo: arquivo.type,
        tamanho: arquivo.size,
        validacao,
        tipoDetectado
      })
      
      return {
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        arquivo,
        preview: URL.createObjectURL(arquivo),
        erro: validacao.valido ? undefined : validacao.erro,
        tipoDetectado,
        status: validacao.valido ? 'waiting' : 'error',
        progress: 0
      }
    })

    setArquivosSelecionados(prev => [...prev, ...novosArquivos])

    // Feedback para o usuário
    const arquivosValidos = novosArquivos.filter(a => !a.erro)
    const arquivosInvalidos = novosArquivos.filter(a => a.erro)

    if (arquivosValidos.length > 0) {
      toast.success(`${arquivosValidos.length} arquivo(s) adicionado(s) com sucesso`)
    }
    
    if (arquivosInvalidos.length > 0) {
      toast.error(`${arquivosInvalidos.length} arquivo(s) rejeitado(s) - verifique os erros`)
    }

    // Auto-detectar tipo se apenas um arquivo válido
    if (arquivosValidos.length === 1 && !form.getValues('tipo_documento_global')) {
      form.setValue('tipo_documento_global', arquivosValidos[0].tipoDetectado)
    }
  }, [form])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxSize: TAMANHO_MAXIMO_ARQUIVO,
    multiple: true,
    disabled: uploadAtivo
  })

  // Remover arquivo
  const removerArquivo = (id: string) => {
    setArquivosSelecionados(prev => {
      const arquivo = prev.find(a => a.id === id)
      if (arquivo?.preview) {
        URL.revokeObjectURL(arquivo.preview)
      }
      return prev.filter(a => a.id !== id)
    })
  }

  // Processar uploads
  const processarUploads = async (data: UploadFormData) => {
    const arquivosValidos = arquivosSelecionados.filter(a => !a.erro && a.status === 'waiting')
    
    if (arquivosValidos.length === 0) {
      toast.error('Nenhum arquivo válido para upload')
      return
    }

    setUploadAtivo(true)
    const resultados = []

    try {
      for (let i = 0; i < arquivosValidos.length; i++) {
        const arquivo = arquivosValidos[i]
        
        // Atualizar status
        setArquivosSelecionados(prev => 
          prev.map(a => a.id === arquivo.id ? { ...a, status: 'uploading', progress: 10 } : a)
        )

        try {
          const resultado = await uploadAndProcess.mutateAsync({
            file: arquivo.arquivo,
            documentType: data.tipo_documento_global || arquivo.tipoDetectado,
            extractionMode: data.processamento_avancado ? 'complete' : 'basic',
            enableAI: data.processamento_avancado
          })

          // Sucesso
          setArquivosSelecionados(prev => 
            prev.map(a => a.id === arquivo.id ? { 
              ...a, 
              status: 'success', 
              progress: 100,
              resultado 
            } : a)
          )

          resultados.push(resultado)
          
        } catch (error) {
          console.error(`Erro no upload de ${arquivo.arquivo.name}:`, error)
          
          // Erro
          setArquivosSelecionados(prev => 
            prev.map(a => a.id === arquivo.id ? { 
              ...a, 
              status: 'error', 
              progress: 0,
              erro: error instanceof Error ? error.message : 'Erro desconhecido'
            } : a)
          )
        }
      }

      // Invalidar queries para atualizar listas
      queryClient.invalidateQueries({ queryKey: ['documentos'] })
      queryClient.invalidateQueries({ queryKey: ['documentos-stats'] })

      // Callback de conclusão
      onUploadComplete?.(resultados)

      // Feedback final
      const sucessos = resultados.length
      const erros = arquivosValidos.length - sucessos

      if (sucessos > 0) {
        toast.success(`${sucessos} documento(s) processado(s) com sucesso!`)
      }
      
      if (erros > 0) {
        toast.error(`${erros} documento(s) falharam no processamento`)
      }

      // Fechar modal se todos foram processados com sucesso
      if (erros === 0) {
        setTimeout(() => onOpenChange(false), 2000)
      }

    } finally {
      setUploadAtivo(false)
    }
  }

  // Utilitários
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <FileText className="h-4 w-4 text-gray-400" />
      case 'uploading': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'processing': return <Zap className="h-4 w-4 text-orange-500" />
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const arquivosValidos = arquivosSelecionados.filter(a => !a.erro)
  const arquivosComErro = arquivosSelecionados.filter(a => a.erro)
  const progressoGeral = arquivosSelecionados.length > 0 
    ? Math.round(arquivosSelecionados.reduce((acc, a) => acc + a.progress, 0) / arquivosSelecionados.length)
    : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Unificado de Documentos
            <Badge variant="outline" className="ml-2">
              {mode === 'batch' ? 'Modo Lote' : 'Modo Individual'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processarUploads)} className="h-full flex flex-col gap-6">
              {/* Área de Drop */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
                  ${isDragActive 
                    ? 'border-blue-400 bg-blue-50 scale-105' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }
                  ${uploadAtivo ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input {...getInputProps()} />
                <Upload className={`h-12 w-12 mx-auto mb-4 transition-colors ${
                  isDragActive ? 'text-blue-500' : 'text-gray-400'
                }`} />
                
                {isDragActive ? (
                  <p className="text-blue-600 font-medium">Solte os arquivos aqui...</p>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2 font-medium">
                      Arraste arquivos aqui ou clique para selecionar
                    </p>
                    <p className="text-sm text-gray-500 mb-3">
                      Suporta: {EXTENSOES_ACEITAS.join(', ')}
                    </p>
                    <p className="text-xs text-gray-400">
                      Tamanho máximo: {Math.round(TAMANHO_MAXIMO_ARQUIVO / 1024 / 1024)}MB por arquivo
                    </p>
                  </div>
                )}
              </div>

              {/* Lista de Arquivos */}
              {arquivosSelecionados.length > 0 && (
                <div className="flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">
                      Arquivos Selecionados ({arquivosSelecionados.length})
                    </h3>
                    {uploadAtivo && (
                      <div className="flex items-center gap-2">
                        <Progress value={progressoGeral} className="w-24" />
                        <span className="text-sm text-gray-500">{progressoGeral}%</span>
                      </div>
                    )}
                  </div>

                  <ScrollArea className="h-48 border rounded-lg p-3">
                    <div className="space-y-2">
                      {/* Arquivos Válidos */}
                      {arquivosValidos.map((arquivo) => (
                        <div key={arquivo.id} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex-shrink-0">
                            {getStatusIcon(arquivo.status)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{arquivo.arquivo.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span>{formatFileSize(arquivo.arquivo.size)}</span>
                              <Badge variant="outline" className="text-xs">
                                {TIPOS_DOCUMENTO_LABELS[arquivo.tipoDetectado]}
                              </Badge>
                              {arquivo.progress > 0 && arquivo.progress < 100 && (
                                <span className="text-blue-600">{arquivo.progress}%</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {arquivo.resultado && (
                              <Button variant="ghost" size="sm" title="Ver resultado">
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removerArquivo(arquivo.id)}
                              disabled={uploadAtivo}
                              title="Remover arquivo"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Arquivos com Erro */}
                      {arquivosComErro.map((arquivo) => (
                        <div key={arquivo.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{arquivo.arquivo.name}</p>
                            <p className="text-sm text-red-600">{arquivo.erro}</p>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removerArquivo(arquivo.id)}
                            title="Remover arquivo"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Separator />

              {/* Configurações */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Configurações</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {showAdvancedOptions ? 'Ocultar' : 'Mostrar'} Avançadas
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Empresa */}
                  <FormField
                    control={form.control}
                    name="empresa_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma empresa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {empresas.map((empresa) => (
                              <SelectItem key={empresa.id} value={empresa.id}>
                                {empresa.nome_fantasia || empresa.razao_social}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tipo Global (para lote) */}
                  {(mode === 'batch' || form.watch('modo_lote')) && (
                    <FormField
                      control={form.control}
                      name="tipo_documento_global"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Global (Opcional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Auto-detectar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(TIPOS_DOCUMENTO_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Opções Avançadas */}
                {showAdvancedOptions && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <FormLabel>Processamento Avançado</FormLabel>
                        <p className="text-sm text-gray-500">Inclui IA e extração completa de dados</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="processamento_avancado"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Observações sobre este lote de documentos..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {arquivosValidos.length > 0 && (
                    <span>{arquivosValidos.length} arquivo(s) pronto(s) para upload</span>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={uploadAtivo}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={arquivosValidos.length === 0 || uploadAtivo}
                    className="min-w-32"
                  >
                    {uploadAtivo ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Processar {arquivosValidos.length} arquivo(s)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
