'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Image as ImageIcon, Zap, CheckCircle, AlertCircle, X, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUploadPrazoFiscal } from '@/hooks/use-upload-prazo-fiscal'
import { useEmpresas } from '@/hooks/use-empresas'
import { toast } from 'sonner'
import type { DocumentoUploadPrazo } from '@/types/prazo-fiscal'

// =====================================================
// INTERFACES
// =====================================================

interface ArquivoSelecionado {
  arquivo: File
  preview: string
  erro?: string
  tipoDetectado: string
}

interface UploadPrazoFiscalProps {
  empresaIdPadrao?: string
  onUploadComplete?: (result: any) => void
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function UploadPrazoFiscal({ empresaIdPadrao, onUploadComplete }: UploadPrazoFiscalProps) {
  const [arquivosSelecionados, setArquivosSelecionados] = useState<ArquivoSelecionado[]>([])
  const [formData, setFormData] = useState({
    empresa_id: empresaIdPadrao || '',
    numero_documento: '',
    data_emissao: '',
    valor_total: '',
    observacoes: '',
    auto_extract_prazo: true
  })

  const { data: empresas = [] } = useEmpresas()
  const { upload, uploadStatus, isUploading, error, reset } = useUploadPrazoFiscal()

  /**
   * Detecta tipo de documento baseado no nome
   */
  const detectarTipoDocumento = (fileName: string): string => {
    const name = fileName.toLowerCase()
    
    if (name.includes('das')) return 'DAS'
    if (name.includes('gps')) return 'GPS'
    if (name.includes('darf')) return 'DARF'
    if (name.includes('gare')) return 'GARE'
    if (name.includes('gnre')) return 'GNRE'
    if (name.includes('nfe') || name.includes('danfe')) return 'NFe'
    if (name.includes('nfse') || name.includes('danfse')) return 'NFSe'
    if (name.includes('cte') || name.includes('dacte')) return 'CTe'
    if (name.includes('esocial')) return 'ESOCIAL'
    if (name.includes('sped')) return 'SPED_FISCAL'
    if (name.includes('dirf')) return 'DIRF'
    if (name.includes('defis')) return 'DEFIS'
    if (name.includes('ecf')) return 'ECF'
    if (name.includes('extrato')) return 'EXTRATO_BANCARIO'
    
    return 'DOCUMENTO_FISCAL'
  }

  /**
   * Valida arquivo selecionado
   */
  const validarArquivo = (arquivo: File) => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']

    if (arquivo.size > maxSize) {
      return { valido: false, erro: 'Arquivo muito grande (máx. 10MB)' }
    }

    if (!allowedTypes.includes(arquivo.type)) {
      return { valido: false, erro: 'Tipo de arquivo não suportado' }
    }

    return { valido: true }
  }

  /**
   * Handler para drop de arquivos
   */
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
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  })

  /**
   * Remove arquivo da lista
   */
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

  /**
   * Processa upload dos arquivos
   */
  const handleUpload = async () => {
    if (arquivosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um arquivo')
      return
    }

    if (!formData.empresa_id) {
      toast.error('Selecione uma empresa')
      return
    }

    const arquivosValidos = arquivosSelecionados.filter(a => !a.erro)
    if (arquivosValidos.length === 0) {
      toast.error('Nenhum arquivo válido selecionado')
      return
    }

    try {
      for (const arquivoInfo of arquivosValidos) {
        const uploadData: DocumentoUploadPrazo = {
          arquivo: arquivoInfo.arquivo,
          empresa_id: formData.empresa_id,
          tipo_documento: arquivoInfo.tipoDetectado,
          numero_documento: formData.numero_documento || undefined,
          data_emissao: formData.data_emissao || undefined,
          valor_total: formData.valor_total ? parseFloat(formData.valor_total) : undefined,
          observacoes: formData.observacoes || undefined,
          auto_extract_prazo: formData.auto_extract_prazo
        }

        const result = await upload(uploadData)
        
        if (onUploadComplete) {
          onUploadComplete(result)
        }
      }

      // Limpar formulário após sucesso
      setArquivosSelecionados([])
      setFormData({
        empresa_id: empresaIdPadrao || '',
        numero_documento: '',
        data_emissao: '',
        valor_total: '',
        observacoes: '',
        auto_extract_prazo: true
      })

    } catch (error: any) {
      console.error('Erro no upload:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Área de Upload */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer ${isDragActive ? 'opacity-75' : ''}`}
          >
            <input {...getInputProps()} />
            
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Upload de Documentos Fiscais
            </h3>
            
            <p className="text-sm text-muted-foreground mb-4">
              {isDragActive 
                ? 'Solte os arquivos aqui...' 
                : 'Arraste arquivos aqui ou clique para selecionar'
              }
            </p>
            
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                PDF
              </Badge>
              <Badge variant="outline" className="text-xs">
                <ImageIcon className="h-3 w-3 mr-1" />
                JPG/PNG
              </Badge>
            </div>
          </div>

          {/* Features do OCR */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span>OCR automático com IA</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Detecção de prazos e valores</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 text-blue-500" />
              <span>Validação automática</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Arquivos Selecionados */}
      {arquivosSelecionados.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">Arquivos Selecionados</h4>
            <div className="space-y-2">
              {arquivosSelecionados.map((arquivo, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-muted/50 rounded">
                  <div className="w-8 h-8 bg-background rounded flex items-center justify-center flex-shrink-0">
                    {arquivo.arquivo.type === 'application/pdf' ? (
                      <FileText className="h-4 w-4 text-red-500" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{arquivo.arquivo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(arquivo.arquivo.size / 1024 / 1024).toFixed(2)} MB • {arquivo.tipoDetectado}
                    </p>
                    {arquivo.erro && (
                      <p className="text-xs text-red-600">{arquivo.erro}</p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removerArquivo(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulário */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h4 className="text-sm font-medium">Informações do Documento</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Select
                value={formData.empresa_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, empresa_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_documento">Número do Documento</Label>
              <Input
                id="numero_documento"
                value={formData.numero_documento}
                onChange={(e) => setFormData(prev => ({ ...prev, numero_documento: e.target.value }))}
                placeholder="Ex: 123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_emissao">Data de Emissão</Label>
              <Input
                id="data_emissao"
                type="date"
                value={formData.data_emissao}
                onChange={(e) => setFormData(prev => ({ ...prev, data_emissao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor_total">Valor Total</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => setFormData(prev => ({ ...prev, valor_total: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto_extract"
              checked={formData.auto_extract_prazo}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_extract_prazo: checked }))}
            />
            <Label htmlFor="auto_extract" className="text-sm">
              Extrair prazos automaticamente
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Status do Upload */}
      {uploadStatus.status !== 'idle' && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{uploadStatus.message}</span>
                {uploadStatus.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {uploadStatus.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                {['uploading', 'processing', 'extracting'].includes(uploadStatus.status) && (
                  <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                )}
              </div>
              
              <Progress value={uploadStatus.progress} className="h-2" />
              
              {uploadStatus.currentStep && (
                <p className="text-xs text-muted-foreground">
                  Etapa: {uploadStatus.currentStep}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botões de Ação */}
      <div className="flex space-x-2">
        <Button
          onClick={handleUpload}
          disabled={isUploading || arquivosSelecionados.length === 0 || !formData.empresa_id}
          className="flex-1"
        >
          {isUploading ? 'Processando...' : 'Processar Documentos'}
        </Button>
        
        {(uploadStatus.status === 'error' || uploadStatus.status === 'completed') && (
          <Button variant="outline" onClick={reset}>
            Limpar
          </Button>
        )}
      </div>
    </div>
  )
}
