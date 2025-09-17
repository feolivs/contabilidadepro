'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Documento } from '@/types/documento'
import { validateDocumentByType } from '@/lib/validation/document-schemas'
import { ExternalValidationService, ValidationFlags } from '@/lib/services/external-validation'
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  Save, 
  X,
  Building2,
  FileText,
  DollarSign,
  Calendar,
  Hash,
  Shield,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface DocumentVerificationModalProps {
  documento: Documento | null
  isOpen: boolean
  onClose: () => void
  onApprove: (documentId: string, correctedData: any) => void
}

interface ValidationState {
  schemaValid: boolean
  schemaErrors: string[]
  externalValidation?: {
    flags: ValidationFlags
    score: number
    issues: string[]
    warnings: string[]
    recommendations: string[]
  }
  isValidating: boolean
}

export function DocumentVerificationModal({ 
  documento, 
  isOpen, 
  onClose, 
  onApprove 
}: DocumentVerificationModalProps) {
  const [editedData, setEditedData] = useState<any>({})
  const [validation, setValidation] = useState<ValidationState>({
    schemaValid: false,
    schemaErrors: [],
    isValidating: false
  })
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (documento?.dados_extraidos) {
      setEditedData(documento.dados_extraidos)
      validateDocument(documento.dados_extraidos)
    }
  }, [documento])

  const validateDocument = async (data: any) => {
    setValidation(prev => ({ ...prev, isValidating: true }))

    try {
      // Validação de schema
      const validatedData = validateDocumentByType(data)
      
      let externalValidation
      
      // Validação externa se tiver CNPJ
      if (data.cnpj_emitente) {
        const cnpjData = await ExternalValidationService.validateCNPJWithReceitaFederal(data.cnpj_emitente)
        const flags = ExternalValidationService.validateDocumentConsistency(data, cnpjData)
        const report = ExternalValidationService.generateValidationReport(data, cnpjData, flags)
        
        externalValidation = {
          flags,
          score: report.score,
          issues: report.issues,
          warnings: report.warnings,
          recommendations: report.recommendations
        }
      }

      setValidation({
        schemaValid: true,
        schemaErrors: [],
        externalValidation,
        isValidating: false
      })
    } catch (error) {
      setValidation({
        schemaValid: false,
        schemaErrors: [error instanceof Error ? error.message : 'Erro de validação'],
        isValidating: false
      })
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    const newData = { ...editedData, [field]: value }
    setEditedData(newData)
    
    // Re-validar após mudança
    validateDocument(newData)
  }

  const handleApprove = () => {
    if (documento && validation.schemaValid) {
      onApprove(documento.id, editedData)
      onClose()
    }
  }

  const getValidationIcon = (field: string) => {
    if (validation.isValidating) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    }
    
    if (validation.schemaErrors.some(error => error.toLowerCase().includes(field.toLowerCase()))) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    
    if (editedData[field]) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
    
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  if (!documento) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[98vh] h-[98vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Verificação de Documento
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? 'Visualizar' : 'Editar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
          {/* Lado Esquerdo: Documento Original */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5" />
                  Documento Original
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                  {documento.arquivo_tipo.startsWith('image/') ? (
                    <img
                      src={documento.arquivo_url}
                      alt={documento.arquivo_nome}
                      className="max-w-full max-h-[400px] object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {documento.arquivo_nome}
                      </p>
                      <Button asChild variant="outline">
                        <a href={documento.arquivo_url} target="_blank" rel="noopener noreferrer">
                          Abrir Documento
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lado Direito: Dados Extraídos e Validação */}
          <div className="space-y-4 overflow-y-auto max-h-[600px]">
            {/* Status de Validação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Status de Validação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Confiança da IA */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confiança da IA:</span>
                  <Badge className={getConfidenceColor(editedData.confidence || 0)}>
                    {Math.round((editedData.confidence || 0) * 100)}%
                  </Badge>
                </div>

                {/* Validação de Schema */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Validação de Formato:</span>
                  {validation.isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : validation.schemaValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>

                {/* Validação Externa */}
                {validation.externalValidation && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Validação Externa:</span>
                    <Badge className={getConfidenceColor(validation.externalValidation.score)}>
                      {Math.round(validation.externalValidation.score * 100)}%
                    </Badge>
                  </div>
                )}

                {/* Erros de Validação */}
                {validation.schemaErrors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {validation.schemaErrors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600">
                            • {error}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Avisos de Validação Externa */}
                {validation.externalValidation?.warnings && validation.externalValidation.warnings.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {validation.externalValidation.warnings.map((warning, index) => (
                          <div key={index} className="text-sm text-yellow-600">
                            • {warning}
                          </div>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Dados Extraídos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Dados Extraídos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campos principais */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Tipo de Documento */}
                  <div>
                    <Label className="flex items-center gap-2">
                      Tipo de Documento
                      {getValidationIcon('tipo_documento')}
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editedData.tipo_documento || ''}
                        onChange={(e) => handleFieldChange('tipo_documento', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm font-medium">{editedData.tipo_documento}</p>
                    )}
                  </div>

                  {/* Número do Documento */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Número do Documento
                      {getValidationIcon('numero_documento')}
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editedData.numero_documento || ''}
                        onChange={(e) => handleFieldChange('numero_documento', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm">{editedData.numero_documento || 'Não identificado'}</p>
                    )}
                  </div>

                  {/* Valor Total */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor Total
                      {getValidationIcon('valor_total')}
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editedData.valor_total || ''}
                        onChange={(e) => handleFieldChange('valor_total', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-green-600">
                        {editedData.valor_total ? 
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                            .format(editedData.valor_total) : 
                          'Não identificado'
                        }
                      </p>
                    )}
                  </div>

                  {/* Empresa Emitente */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Empresa Emitente
                      {getValidationIcon('empresa_emitente')}
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editedData.empresa_emitente || ''}
                        onChange={(e) => handleFieldChange('empresa_emitente', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm">{editedData.empresa_emitente || 'Não identificado'}</p>
                    )}
                  </div>

                  {/* CNPJ Emitente */}
                  <div>
                    <Label className="flex items-center gap-2">
                      CNPJ Emitente
                      {getValidationIcon('cnpj_emitente')}
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editedData.cnpj_emitente || ''}
                        onChange={(e) => handleFieldChange('cnpj_emitente', e.target.value)}
                        className="mt-1"
                        placeholder="XX.XXX.XXX/XXXX-XX"
                      />
                    ) : (
                      <p className="mt-1 text-sm font-mono">{editedData.cnpj_emitente || 'Não identificado'}</p>
                    )}
                  </div>

                  {/* Data de Emissão */}
                  <div>
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data de Emissão
                      {getValidationIcon('data_emissao')}
                    </Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedData.data_emissao?.split('T')[0] || ''}
                        onChange={(e) => handleFieldChange('data_emissao', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 text-sm">
                        {editedData.data_emissao ? 
                          new Date(editedData.data_emissao).toLocaleDateString('pt-BR') : 
                          'Não identificado'
                        }
                      </p>
                    )}
                  </div>

                  {/* Descrição */}
                  <div>
                    <Label>Descrição</Label>
                    {isEditing ? (
                      <Textarea
                        value={editedData.descricao || ''}
                        onChange={(e) => handleFieldChange('descricao', e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {editedData.descricao || 'Não identificado'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleApprove}
                disabled={!validation.schemaValid || validation.isValidating}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Aprovar e Salvar
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
