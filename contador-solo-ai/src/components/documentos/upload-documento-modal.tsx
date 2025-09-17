'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

import {
  Upload,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { useUploadDocumento } from '@/hooks/use-documentos'
import { useEmpresas } from '@/hooks/use-empresas'
import {
  TipoDocumento,
  TIPOS_DOCUMENTO_LABELS,
  validarArquivo,
  detectarTipoDocumento
} from '@/types/documento'

const uploadSchema = z.object({
  empresa_id: z.string().min(1, 'Selecione uma empresa'),
  tipo_documento: z.string().min(1, 'Selecione o tipo de documento'),
  numero_documento: z.string().optional(),
  serie: z.string().optional(),
  data_emissao: z.string().optional(),
  valor_total: z.string().optional(),
  observacoes: z.string().optional(),
})

type UploadFormData = z.infer<typeof uploadSchema>

interface UploadDocumentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresaIdPadrao?: string
}

interface ArquivoSelecionado {
  arquivo: File
  preview: string
  erro?: string
  tipoDetectado: TipoDocumento
}

export function UploadDocumentoModal({
  open,
  onOpenChange,
  empresaIdPadrao
}: UploadDocumentoModalProps) {
  const [arquivosSelecionados, setArquivosSelecionados] = useState<ArquivoSelecionado[]>([])
  const [uploadAtivo, setUploadAtivo] = useState(false)

  const { data: empresas = [] } = useEmpresas()
  const uploadMutation = useUploadDocumento()

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      empresa_id: empresaIdPadrao || '',
      tipo_documento: '',
      numero_documento: '',
      serie: '',
      data_emissao: '',
      valor_total: '',
      observacoes: '',
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const novosArquivos: ArquivoSelecionado[] = acceptedFiles.map(arquivo => {
      const validacao = validarArquivo(arquivo)
      const tipoDetectado = detectarTipoDocumento(arquivo.name)
      
      return {
        arquivo,
        preview: URL.createObjectURL(arquivo),
        erro: validacao.valido ? undefined : validacao.erro,
        tipoDetectado
      }
    })

    setArquivosSelecionados(prev => [...prev, ...novosArquivos])

    // Auto-detectar tipo do primeiro arquivo válido
    const primeiroArquivoValido = novosArquivos.find(a => !a.erro)
    if (primeiroArquivoValido && !form.getValues('tipo_documento')) {
      form.setValue('tipo_documento', primeiroArquivoValido.tipoDetectado)
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
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  })

  const removerArquivo = (index: number) => {
    setArquivosSelecionados(prev => {
      const novo = [...prev]
      if (novo[index]?.preview) {
        URL.revokeObjectURL(novo[index].preview)
      }
      novo.splice(index, 1)
      return novo
    })
  }

  const onSubmit = async (data: UploadFormData) => {
    const arquivosValidos = arquivosSelecionados.filter(a => !a.erro)
    
    if (arquivosValidos.length === 0) {
      return
    }

    setUploadAtivo(true)

    try {
      // Upload de cada arquivo
      for (const arquivoInfo of arquivosValidos) {
        const uploadData = {
          empresa_id: data.empresa_id,
          tipo_documento: data.tipo_documento as TipoDocumento,
          arquivo: arquivoInfo.arquivo,
          numero_documento: data.numero_documento || undefined,
          serie: data.serie || undefined,
          data_emissao: data.data_emissao || undefined,
          valor_total: data.valor_total ? parseFloat(data.valor_total) : undefined,
          observacoes: data.observacoes || undefined,
        }

        await uploadMutation.mutateAsync(uploadData)
      }

      // Limpar formulário e fechar modal
      form.reset()
      setArquivosSelecionados([])
      onOpenChange(false)
    } catch (error) {

    } finally {
      setUploadAtivo(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const arquivosValidos = arquivosSelecionados.filter(a => !a.erro)
  const arquivosComErro = arquivosSelecionados.filter(a => a.erro)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Documentos
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Área de Drop */}
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600">Solte os arquivos aqui...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-sm text-gray-500">
                  PDF, imagens, planilhas, documentos (máx. 10MB cada)
                </p>
              </div>
            )}
          </div>

          {/* Arquivos Selecionados */}
          {arquivosSelecionados.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">
                Arquivos Selecionados ({arquivosSelecionados.length})
              </h3>
              
              {/* Arquivos Válidos */}
              {arquivosValidos.map((arquivoInfo, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">{arquivoInfo.arquivo.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{formatFileSize(arquivoInfo.arquivo.size)}</span>
                        <Badge variant="outline" className="text-xs">
                          {TIPOS_DOCUMENTO_LABELS[arquivoInfo.tipoDetectado]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerArquivo(arquivosSelecionados.indexOf(arquivoInfo))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Arquivos com Erro */}
              {arquivosComErro.map((arquivoInfo, index) => (
                <div key={`erro-${index}`} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-gray-900">{arquivoInfo.arquivo.name}</p>
                      <p className="text-sm text-red-600">{arquivoInfo.erro}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removerArquivo(arquivosSelecionados.indexOf(arquivoInfo))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Formulário de Metadados */}
          {arquivosValidos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="empresa_id">Empresa *</Label>
                <Select
                  value={form.watch('empresa_id')}
                  onValueChange={(value) => form.setValue('empresa_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome}
                        {empresa.cnpj && ` - ${empresa.cnpj}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.empresa_id && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.empresa_id.message}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
                <Select
                  value={form.watch('tipo_documento')}
                  onValueChange={(value) => form.setValue('tipo_documento', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS_DOCUMENTO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.tipo_documento && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.tipo_documento.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="numero_documento">Número do Documento</Label>
                <Input
                  {...form.register('numero_documento')}
                  placeholder="Ex: 123456"
                />
              </div>

              <div>
                <Label htmlFor="serie">Série</Label>
                <Input
                  {...form.register('serie')}
                  placeholder="Ex: 1"
                />
              </div>

              <div>
                <Label htmlFor="data_emissao">Data de Emissão</Label>
                <Input
                  {...form.register('data_emissao')}
                  type="date"
                />
              </div>

              <div>
                <Label htmlFor="valor_total">Valor Total (R$)</Label>
                <Input
                  {...form.register('valor_total')}
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  {...form.register('observacoes')}
                  placeholder="Observações adicionais sobre o documento..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-3">
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
            >
              {uploadAtivo ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar {arquivosValidos.length} arquivo(s)
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
