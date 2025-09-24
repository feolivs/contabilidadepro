'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { EmpresaUnified } from '@/types/empresa-unified.types'

export interface ExportOptions {
  format: 'excel' | 'csv' | 'pdf'
  fields: string[]
  fileName?: string
  includeHeaders?: boolean
  dateFormat?: 'iso' | 'br' | 'us'
  currencyFormat?: 'br' | 'us'
}

export interface ExportProgress {
  current: number
  total: number
  status: 'preparing' | 'processing' | 'generating' | 'complete' | 'error'
  message: string
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState<ExportProgress | null>(null)

  const formatValue = useCallback((value: any, field: string, options: ExportOptions): string => {
    if (value === null || value === undefined) return ''

    // Formatação de CNPJ
    if (field === 'cnpj' && typeof value === 'string') {
      return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }

    // Formatação de telefone
    if (field === 'telefone' && typeof value === 'string') {
      const numbers = value.replace(/\D/g, '')
      if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      } else if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
      }
      return value
    }

    // Formatação de status
    if (field === 'ativa') {
      return value ? 'Ativa' : 'Inativa'
    }

    // Formatação de datas
    if (field.includes('data') || field.includes('_at')) {
      const date = new Date(value)
      switch (options.dateFormat) {
        case 'br':
          return date.toLocaleDateString('pt-BR')
        case 'us':
          return date.toLocaleDateString('en-US')
        case 'iso':
        default:
          return date.toISOString().split('T')[0]
      }
    }

    // Formatação de valores monetários
    if (field.includes('receita') || field.includes('valor') && typeof value === 'number') {
      switch (options.currencyFormat) {
        case 'br':
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(value)
        case 'us':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(value)
        default:
          return value.toString()
      }
    }

    return String(value)
  }, [])

  const getFieldValue = useCallback((empresa: EmpresaUnified, fieldPath: string): any => {
    if (fieldPath.includes('.')) {
      const keys = fieldPath.split('.')
      let value: any = empresa
      for (const key of keys) {
        value = value?.[key]
        if (value === undefined || value === null) break
      }
      return value
    }
    return (empresa as any)[fieldPath]
  }, [])

  const exportToExcel = useCallback(async (
    data: EmpresaUnified[], 
    options: ExportOptions
  ): Promise<void> => {
    try {
      setProgress({
        current: 0,
        total: data.length,
        status: 'preparing',
        message: 'Preparando exportação Excel...'
      })

      // Importação dinâmica do XLSX
      const XLSX = await import('xlsx')
      
      setProgress(prev => prev ? {
        ...prev,
        status: 'processing',
        message: 'Processando dados...'
      } : null)

      // Preparar dados
      const processedData = data.map((empresa, index) => {
        const row: Record<string, any> = {}
        
        options.fields.forEach(field => {
          const value = getFieldValue(empresa, field)
          row[field] = formatValue(value, field, options)
        })

        setProgress(prev => prev ? {
          ...prev,
          current: index + 1,
          message: `Processando empresa ${index + 1} de ${data.length}...`
        } : null)

        return row
      })

      setProgress(prev => prev ? {
        ...prev,
        status: 'generating',
        message: 'Gerando arquivo Excel...'
      } : null)

      // Criar workbook
      const ws = XLSX.utils.json_to_sheet(processedData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Empresas')

      // Aplicar formatação
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // Largura das colunas
      const colWidths = options.fields.map(field => {
        if (field === 'nome' || field === 'nome_fantasia') return { wch: 30 }
        if (field === 'cnpj') return { wch: 18 }
        if (field === 'endereco') return { wch: 40 }
        if (field === 'observacoes') return { wch: 50 }
        return { wch: 15 }
      })
      ws['!cols'] = colWidths

      // Salvar arquivo
      const fileName = options.fileName || `empresas_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)

      setProgress(prev => prev ? {
        ...prev,
        status: 'complete',
        message: 'Exportação concluída!'
      } : null)

    } catch (error) {
      console.error('Erro na exportação Excel:', error)
      setProgress(prev => prev ? {
        ...prev,
        status: 'error',
        message: 'Erro ao gerar arquivo Excel'
      } : null)
      throw error
    }
  }, [getFieldValue, formatValue])

  const exportToCSV = useCallback(async (
    data: EmpresaUnified[], 
    options: ExportOptions
  ): Promise<void> => {
    try {
      setProgress({
        current: 0,
        total: data.length,
        status: 'preparing',
        message: 'Preparando exportação CSV...'
      })

      // Preparar cabeçalhos
      const headers = options.includeHeaders !== false ? options.fields.join(',') : ''
      
      setProgress(prev => prev ? {
        ...prev,
        status: 'processing',
        message: 'Processando dados...'
      } : null)

      // Processar linhas
      const rows: string[] = []
      
      for (let i = 0; i < data.length; i++) {
        const empresa = data[i]
        const values = options.fields.map(field => {
          const value = getFieldValue(empresa, field)
          const formatted = formatValue(value, field, options)
          // Escapar aspas e envolver em aspas se necessário
          return `"${formatted.replace(/"/g, '""')}"`
        })
        
        rows.push(values.join(','))
        
        setProgress(prev => prev ? {
          ...prev,
          current: i + 1,
          message: `Processando empresa ${i + 1} de ${data.length}...`
        } : null)
      }

      setProgress(prev => prev ? {
        ...prev,
        status: 'generating',
        message: 'Gerando arquivo CSV...'
      } : null)

      // Criar conteúdo CSV
      const csvContent = [headers, ...rows].filter(Boolean).join('\n')
      
      // Criar e baixar arquivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      link.setAttribute('href', url)
      link.setAttribute('download', options.fileName || `empresas_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setProgress(prev => prev ? {
        ...prev,
        status: 'complete',
        message: 'Exportação concluída!'
      } : null)

    } catch (error) {
      console.error('Erro na exportação CSV:', error)
      setProgress(prev => prev ? {
        ...prev,
        status: 'error',
        message: 'Erro ao gerar arquivo CSV'
      } : null)
      throw error
    }
  }, [getFieldValue, formatValue])

  const exportToPDF = useCallback(async (
    data: EmpresaUnified[], 
    options: ExportOptions
  ): Promise<void> => {
    try {
      setProgress({
        current: 0,
        total: data.length,
        status: 'preparing',
        message: 'Preparando exportação PDF...'
      })

      // Importação dinâmica do jsPDF
      const jsPDF = await import('jspdf')
      const autoTable = await import('jspdf-autotable')
      
      setProgress(prev => prev ? {
        ...prev,
        status: 'processing',
        message: 'Processando dados...'
      } : null)

      const doc = new jsPDF.default('l', 'mm', 'a4') // Paisagem para mais colunas
      
      // Cabeçalho do documento
      doc.setFontSize(16)
      doc.text('Relatório de Empresas', 14, 22)
      
      doc.setFontSize(10)
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30)
      doc.text(`Total de empresas: ${data.length}`, 14, 36)
      doc.text(`Campos exportados: ${options.fields.length}`, 14, 42)

      // Preparar dados da tabela
      const tableColumns = options.fields
      const tableRows: string[][] = []

      for (let i = 0; i < data.length; i++) {
        const empresa = data[i]
        const row = options.fields.map(field => {
          const value = getFieldValue(empresa, field)
          return formatValue(value, field, options)
        })
        tableRows.push(row)

        setProgress(prev => prev ? {
          ...prev,
          current: i + 1,
          message: `Processando empresa ${i + 1} de ${data.length}...`
        } : null)
      }

      setProgress(prev => prev ? {
        ...prev,
        status: 'generating',
        message: 'Gerando arquivo PDF...'
      } : null)

      // Gerar tabela
      ;(doc as any).autoTable({
        head: [tableColumns],
        body: tableRows,
        startY: 50,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { top: 50, right: 14, bottom: 20, left: 14 },
        didDrawPage: (data: any) => {
          // Rodapé
          doc.setFontSize(8)
          doc.text(
            `Página ${data.pageNumber} - ContabilidadePRO`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 10
          )
        }
      })

      // Salvar arquivo
      const fileName = options.fileName || `empresas_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

      setProgress(prev => prev ? {
        ...prev,
        status: 'complete',
        message: 'Exportação concluída!'
      } : null)

    } catch (error) {
      console.error('Erro na exportação PDF:', error)
      setProgress(prev => prev ? {
        ...prev,
        status: 'error',
        message: 'Erro ao gerar arquivo PDF'
      } : null)
      throw error
    }
  }, [getFieldValue, formatValue])

  const exportData = useCallback(async (
    data: EmpresaUnified[],
    options: ExportOptions
  ): Promise<void> => {
    if (data.length === 0) {
      toast.error('Nenhuma empresa para exportar')
      return
    }

    if (options.fields.length === 0) {
      toast.error('Selecione pelo menos um campo para exportar')
      return
    }

    setIsExporting(true)
    setProgress(null)

    try {
      switch (options.format) {
        case 'excel':
          await exportToExcel(data, options)
          break
        case 'csv':
          await exportToCSV(data, options)
          break
        case 'pdf':
          await exportToPDF(data, options)
          break
        default:
          throw new Error(`Formato não suportado: ${options.format}`)
      }

      toast.success(`${data.length} empresas exportadas com sucesso!`)
      
    } catch (error) {
      console.error('Erro na exportação:', error)
      toast.error('Erro ao exportar dados')
      throw error
    } finally {
      setIsExporting(false)
      // Limpar progresso após 3 segundos
      setTimeout(() => setProgress(null), 3000)
    }
  }, [exportToExcel, exportToCSV, exportToPDF])

  const cancelExport = useCallback(() => {
    setIsExporting(false)
    setProgress(null)
    toast.info('Exportação cancelada')
  }, [])

  return {
    exportData,
    isExporting,
    progress,
    cancelExport,
    formatValue,
    getFieldValue
  }
}
