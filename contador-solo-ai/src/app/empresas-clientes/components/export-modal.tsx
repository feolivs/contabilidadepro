'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Download,
  FileSpreadsheet,
  FileText,
  File,
  Settings,
  Filter,
  Users,
  Calendar,
  Building2,
  MapPin,
  Phone,
  Mail,
  Hash,
  DollarSign,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { EmpresaUnified } from '@/types/empresa-unified.types'
import { toast } from 'sonner'

interface ExportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  empresas: EmpresaUnified[]
  selectedEmpresas?: EmpresaUnified[]
}

type ExportFormat = 'excel' | 'csv' | 'pdf'
type ExportScope = 'all' | 'selected' | 'filtered'

interface ExportField {
  key: keyof EmpresaUnified | string
  label: string
  icon: React.ReactNode
  category: 'basic' | 'contact' | 'financial' | 'operational'
  enabled: boolean
}

const EXPORT_FIELDS: ExportField[] = [
  // Básicos
  { key: 'nome', label: 'Nome da Empresa', icon: <Building2 className="h-4 w-4" />, category: 'basic', enabled: true },
  { key: 'nome_fantasia', label: 'Nome Fantasia', icon: <Building2 className="h-4 w-4" />, category: 'basic', enabled: true },
  { key: 'cnpj', label: 'CNPJ', icon: <Hash className="h-4 w-4" />, category: 'basic', enabled: true },
  { key: 'regime_tributario', label: 'Regime Tributário', icon: <FileText className="h-4 w-4" />, category: 'basic', enabled: true },
  { key: 'ativa', label: 'Status', icon: <CheckCircle className="h-4 w-4" />, category: 'basic', enabled: true },
  
  // Contato
  { key: 'telefone', label: 'Telefone', icon: <Phone className="h-4 w-4" />, category: 'contact', enabled: true },
  { key: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, category: 'contact', enabled: true },
  { key: 'endereco', label: 'Endereço', icon: <MapPin className="h-4 w-4" />, category: 'contact', enabled: false },
  { key: 'endereco_completo.cidade', label: 'Cidade', icon: <MapPin className="h-4 w-4" />, category: 'contact', enabled: false },
  { key: 'endereco_completo.uf', label: 'UF', icon: <MapPin className="h-4 w-4" />, category: 'contact', enabled: false },
  { key: 'endereco_completo.cep', label: 'CEP', icon: <MapPin className="h-4 w-4" />, category: 'contact', enabled: false },
  
  // Operacional
  { key: 'atividade_principal', label: 'Atividade Principal', icon: <Building2 className="h-4 w-4" />, category: 'operational', enabled: false },
  { key: 'data_abertura', label: 'Data de Abertura', icon: <Calendar className="h-4 w-4" />, category: 'operational', enabled: false },
  { key: 'created_at', label: 'Data de Cadastro', icon: <Clock className="h-4 w-4" />, category: 'operational', enabled: false },
  { key: 'updated_at', label: 'Última Atualização', icon: <Clock className="h-4 w-4" />, category: 'operational', enabled: false },
  { key: 'observacoes', label: 'Observações', icon: <FileText className="h-4 w-4" />, category: 'operational', enabled: false },
  
  // Financeiro
  { key: 'receita_anual_estimada', label: 'Receita Anual Estimada', icon: <DollarSign className="h-4 w-4" />, category: 'financial', enabled: false },
]

const EXPORT_TEMPLATES = [
  {
    id: 'basic',
    name: 'Informações Básicas',
    description: 'Nome, CNPJ, regime tributário e status',
    fields: ['nome', 'cnpj', 'regime_tributario', 'ativa']
  },
  {
    id: 'contact',
    name: 'Dados de Contato',
    description: 'Informações básicas + contato completo',
    fields: ['nome', 'cnpj', 'telefone', 'email', 'endereco_completo.cidade', 'endereco_completo.uf']
  },
  {
    id: 'complete',
    name: 'Relatório Completo',
    description: 'Todos os campos disponíveis',
    fields: EXPORT_FIELDS.map(f => f.key)
  },
  {
    id: 'custom',
    name: 'Personalizado',
    description: 'Selecione os campos manualmente',
    fields: []
  }
]

export function ExportModal({ 
  open, 
  onOpenChange, 
  empresas, 
  selectedEmpresas = [] 
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('excel')
  const [scope, setScope] = useState<ExportScope>('all')
  const [template, setTemplate] = useState('basic')
  const [fields, setFields] = useState<ExportField[]>(EXPORT_FIELDS)
  const [isExporting, setIsExporting] = useState(false)

  const getExportData = () => {
    let dataToExport: EmpresaUnified[] = []
    
    switch (scope) {
      case 'selected':
        dataToExport = selectedEmpresas
        break
      case 'all':
        dataToExport = empresas
        break
      case 'filtered':
        // Implementar lógica de filtros aplicados
        dataToExport = empresas
        break
    }
    
    return dataToExport
  }

  const getSelectedFields = () => {
    if (template === 'custom') {
      return fields.filter(f => f.enabled)
    }
    
    const selectedTemplate = EXPORT_TEMPLATES.find(t => t.id === template)
    return fields.filter(f => selectedTemplate?.fields.includes(f.key as string))
  }

  const handleTemplateChange = (templateId: string) => {
    setTemplate(templateId)
    
    if (templateId !== 'custom') {
      const selectedTemplate = EXPORT_TEMPLATES.find(t => t.id === templateId)
      const updatedFields = fields.map(field => ({
        ...field,
        enabled: selectedTemplate?.fields.includes(field.key as string) || false
      }))
      setFields(updatedFields)
    }
  }

  const handleFieldToggle = (fieldKey: string, enabled: boolean) => {
    setFields(prev => prev.map(field => 
      field.key === fieldKey ? { ...field, enabled } : field
    ))
    
    // Se não é template personalizado, muda para personalizado
    if (template !== 'custom') {
      setTemplate('custom')
    }
  }

  const handleCategoryToggle = (category: string, enabled: boolean) => {
    setFields(prev => prev.map(field => 
      field.category === category ? { ...field, enabled } : field
    ))
    setTemplate('custom')
  }

  const exportData = async () => {
    setIsExporting(true)
    
    try {
      const dataToExport = getExportData()
      const selectedFields = getSelectedFields()
      
      if (dataToExport.length === 0) {
        toast.error('Nenhuma empresa para exportar')
        return
      }
      
      if (selectedFields.length === 0) {
        toast.error('Selecione pelo menos um campo para exportar')
        return
      }

      // Preparar dados para exportação
      const exportData = dataToExport.map(empresa => {
        const row: Record<string, any> = {}
        
        selectedFields.forEach(field => {
          const value = getFieldValue(empresa, field.key)
          row[field.label] = formatFieldValue(value, field.key)
        })
        
        return row
      })

      // Executar exportação baseada no formato
      switch (format) {
        case 'excel':
          await exportToExcel(exportData, selectedFields)
          break
        case 'csv':
          await exportToCSV(exportData, selectedFields)
          break
        case 'pdf':
          await exportToPDF(exportData, selectedFields)
          break
      }

      toast.success(`${dataToExport.length} empresas exportadas com sucesso!`)
      onOpenChange(false)
      
    } catch (error) {
      console.error('Erro na exportação:', error)
      toast.error('Erro ao exportar dados')
    } finally {
      setIsExporting(false)
    }
  }

  const getFieldValue = (empresa: EmpresaUnified, fieldKey: string): any => {
    if (fieldKey.includes('.')) {
      const keys = fieldKey.split('.')
      let value: any = empresa
      for (const key of keys) {
        value = value?.[key]
      }
      return value
    }
    return (empresa as any)[fieldKey]
  }

  const formatFieldValue = (value: any, fieldKey: string): string => {
    if (value === null || value === undefined) return ''
    
    // Formatações específicas
    if (fieldKey === 'cnpj' && typeof value === 'string') {
      return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
    
    if (fieldKey === 'ativa') {
      return value ? 'Ativa' : 'Inativa'
    }
    
    if (fieldKey.includes('data') || fieldKey.includes('_at')) {
      return new Date(value).toLocaleDateString('pt-BR')
    }
    
    if (fieldKey.includes('receita') && typeof value === 'number') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    }
    
    return String(value)
  }

  const exportToExcel = async (data: Record<string, any>[], fields: ExportField[]) => {
    // Implementação da exportação Excel
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas')
    
    const fileName = `empresas_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const exportToCSV = async (data: Record<string, any>[], fields: ExportField[]) => {
    // Implementação da exportação CSV
    const headers = fields.map(f => f.label).join(',')
    const rows = data.map(row => 
      fields.map(f => `"${row[f.label] || ''}"`).join(',')
    ).join('\n')
    
    const csvContent = `${headers}\n${rows}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `empresas_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = async (data: Record<string, any>[], fields: ExportField[]) => {
    // Implementação da exportação PDF
    const jsPDF = await import('jspdf')
    const autoTable = await import('jspdf-autotable')
    
    const doc = new jsPDF.default()
    
    doc.setFontSize(16)
    doc.text('Relatório de Empresas', 14, 22)
    
    doc.setFontSize(10)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30)
    doc.text(`Total de empresas: ${data.length}`, 14, 36)
    
    const tableColumns = fields.map(f => f.label)
    const tableRows = data.map(row => fields.map(f => row[f.label] || ''))
    
    ;(doc as any).autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    })
    
    const fileName = `empresas_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  const dataCount = getExportData().length
  const selectedFieldsCount = getSelectedFields().length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Empresas
          </DialogTitle>
          <DialogDescription>
            Configure as opções de exportação e selecione os campos desejados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formato de Exportação */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato de Exportação</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2">
                  <File className="h-4 w-4 text-blue-600" />
                  CSV (.csv)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-600" />
                  PDF (.pdf)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Escopo da Exportação */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Empresas para Exportar</Label>
            <RadioGroup value={scope} onValueChange={(value) => setScope(value as ExportScope)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Todas as empresas ({empresas.length})
                </Label>
              </div>
              {selectedEmpresas.length > 0 && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="selected" id="selected" />
                  <Label htmlFor="selected" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Empresas selecionadas ({selectedEmpresas.length})
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="filtered" id="filtered" />
                <Label htmlFor="filtered" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Empresas filtradas ({empresas.length})
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Template de Campos */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Template de Exportação</Label>
            <Select value={template} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_TEMPLATES.map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    <div>
                      <div className="font-medium">{tmpl.name}</div>
                      <div className="text-xs text-muted-foreground">{tmpl.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Campos */}
          {template === 'custom' && (
            <div className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Campos Personalizados
              </Label>
              
              {/* Controles por categoria */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['basic', 'contact', 'operational', 'financial'].map((category) => {
                  const categoryFields = fields.filter(f => f.category === category)
                  const enabledCount = categoryFields.filter(f => f.enabled).length
                  const isAllEnabled = enabledCount === categoryFields.length
                  const isPartialEnabled = enabledCount > 0 && enabledCount < categoryFields.length
                  
                  return (
                    <Button
                      key={category}
                      variant={isAllEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCategoryToggle(category, !isAllEnabled)}
                      className="justify-start"
                    >
                      {isPartialEnabled && <Badge variant="secondary" className="mr-1 h-4 w-4 p-0 text-xs">
                        {enabledCount}
                      </Badge>}
                      {category === 'basic' && 'Básicos'}
                      {category === 'contact' && 'Contato'}
                      {category === 'operational' && 'Operacional'}
                      {category === 'financial' && 'Financeiro'}
                    </Button>
                  )
                })}
              </div>
              
              {/* Lista de campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3">
                {fields.map((field) => (
                  <div key={field.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.key}
                      checked={field.enabled}
                      onCheckedChange={(checked) => 
                        handleFieldToggle(field.key, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={field.key} 
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      {field.icon}
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo da Exportação */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Resumo da Exportação</span>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <div>• <strong>{dataCount}</strong> empresas serão exportadas</div>
              <div>• <strong>{selectedFieldsCount}</strong> campos selecionados</div>
              <div>• Formato: <strong>{format.toUpperCase()}</strong></div>
              <div>• Template: <strong>{EXPORT_TEMPLATES.find(t => t.id === template)?.name}</strong></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={exportData} 
            disabled={isExporting || dataCount === 0 || selectedFieldsCount === 0}
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar {dataCount} Empresas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
