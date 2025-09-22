'use client'

/**
 * 📊 DATA EXPORT - ContabilidadePRO
 * Componente para exportação de dados agregados em Excel/CSV
 * Com filtros personalizados e agrupamentos avançados
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { 
  Download, FileSpreadsheet, FileText, Calendar, Filter,
  Building2, BarChart3, CheckCircle, Settings, RefreshCw,
  Eye, Trash2, Plus, X
} from 'lucide-react'
import { toast } from 'sonner'

// Interfaces
interface ExportConfig {
  formato: 'excel' | 'csv' | 'json'
  tipo_dados: 'empresas' | 'documentos' | 'metricas' | 'compliance' | 'comparativo' | 'personalizado'
  periodo: {
    inicio: Date | null
    fim: Date | null
  }
  filtros: {
    empresas_selecionadas: string[]
    regimes_tributarios: string[]
    status_documentos: string[]
    tipos_documento: string[]
    faixa_faturamento: {
      min: number | null
      max: number | null
    }
    compliance_score: {
      min: number | null
      max: number | null
    }
  }
  campos: {
    dados_empresa: boolean
    metricas_financeiras: boolean
    dados_documentos: boolean
    analise_compliance: boolean
    insights_ia: boolean
    dados_mensais: boolean
    comparativos: boolean
  }
  agrupamento: {
    por_empresa: boolean
    por_regime: boolean
    por_mes: boolean
    por_tipo_documento: boolean
    por_status: boolean
  }
  opcoes: {
    incluir_cabecalhos: boolean
    incluir_totalizadores: boolean
    incluir_graficos: boolean
    incluir_metadados: boolean
    compactar_arquivo: boolean
  }
}

interface ExportPreview {
  total_registros: number
  tamanho_estimado: string
  campos_incluidos: string[]
  agrupamentos_aplicados: string[]
  filtros_ativos: string[]
}

interface DataExportProps {
  empresas: Array<{
    id: string
    nome: string
    cnpj: string
    regime_tributario: string
  }>
  onExportComplete?: (arquivo: { url: string; nome: string; tamanho: number }) => void
}

const TIPOS_DADOS = [
  {
    id: 'empresas',
    nome: 'Dados de Empresas',
    descricao: 'Informações cadastrais e métricas das empresas',
    icone: Building2
  },
  {
    id: 'documentos',
    nome: 'Documentos Fiscais',
    descricao: 'Dados de documentos processados e status',
    icone: FileText
  },
  {
    id: 'metricas',
    nome: 'Métricas Financeiras',
    descricao: 'Faturamento, crescimento e projeções',
    icone: BarChart3
  },
  {
    id: 'compliance',
    nome: 'Análise de Compliance',
    descricao: 'Scores e análises de conformidade',
    icone: CheckCircle
  },
  {
    id: 'comparativo',
    nome: 'Dados Comparativos',
    descricao: 'Comparação entre múltiplas empresas',
    icone: BarChart3
  },
  {
    id: 'personalizado',
    nome: 'Exportação Personalizada',
    descricao: 'Configure campos e filtros específicos',
    icone: Settings
  }
]

const REGIMES_TRIBUTARIOS = ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Lucro Real']
const STATUS_DOCUMENTOS = ['pending', 'processing', 'completed', 'error']
const TIPOS_DOCUMENTO = ['NFe', 'NFCe', 'CTe', 'MDFe', 'NFSe', 'Recibo', 'Outros']

export function DataExport({ empresas, onExportComplete }: DataExportProps) {
  const [config, setConfig] = useState<ExportConfig>({
    formato: 'excel',
    tipo_dados: 'empresas',
    periodo: {
      inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      fim: new Date()
    },
    filtros: {
      empresas_selecionadas: [],
      regimes_tributarios: [],
      status_documentos: [],
      tipos_documento: [],
      faixa_faturamento: { min: null, max: null },
      compliance_score: { min: null, max: null }
    },
    campos: {
      dados_empresa: true,
      metricas_financeiras: true,
      dados_documentos: false,
      analise_compliance: false,
      insights_ia: false,
      dados_mensais: false,
      comparativos: false
    },
    agrupamento: {
      por_empresa: true,
      por_regime: false,
      por_mes: false,
      por_tipo_documento: false,
      por_status: false
    },
    opcoes: {
      incluir_cabecalhos: true,
      incluir_totalizadores: true,
      incluir_graficos: false,
      incluir_metadados: true,
      compactar_arquivo: false
    }
  })

  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Preview dos dados de exportação
  const preview = useMemo((): ExportPreview => {
    let totalRegistros = empresas.length

    // Aplicar filtros para estimar registros
    if (config.filtros.empresas_selecionadas.length > 0) {
      totalRegistros = config.filtros.empresas_selecionadas.length
    }

    if (config.filtros.regimes_tributarios.length > 0) {
      totalRegistros = Math.floor(totalRegistros * 0.7) // Estimativa
    }

    // Estimar tamanho do arquivo
    let tamanhoEstimado = totalRegistros * 2 // KB base por registro
    
    if (config.campos.metricas_financeiras) tamanhoEstimado += totalRegistros * 1
    if (config.campos.dados_documentos) tamanhoEstimado += totalRegistros * 3
    if (config.campos.analise_compliance) tamanhoEstimado += totalRegistros * 1.5
    if (config.campos.insights_ia) tamanhoEstimado += totalRegistros * 2
    if (config.campos.dados_mensais) tamanhoEstimado += totalRegistros * 5

    const tamanhoFormatado = tamanhoEstimado < 1024 
      ? `${Math.round(tamanhoEstimado)} KB`
      : `${(tamanhoEstimado / 1024).toFixed(1)} MB`

    // Campos incluídos
    const camposIncluidos = Object.entries(config.campos)
      .filter(([_, incluido]) => incluido)
      .map(([campo, _]) => campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))

    // Agrupamentos aplicados
    const agrupamentosAplicados = Object.entries(config.agrupamento)
      .filter(([_, aplicado]) => aplicado)
      .map(([agrupamento, _]) => agrupamento.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))

    // Filtros ativos
    const filtrosAtivos = []
    if (config.filtros.empresas_selecionadas.length > 0) {
      filtrosAtivos.push(`${config.filtros.empresas_selecionadas.length} empresas selecionadas`)
    }
    if (config.filtros.regimes_tributarios.length > 0) {
      filtrosAtivos.push(`Regimes: ${config.filtros.regimes_tributarios.join(', ')}`)
    }
    if (config.periodo.inicio && config.periodo.fim) {
      filtrosAtivos.push(`Período: ${config.periodo.inicio.toLocaleDateString()} - ${config.periodo.fim.toLocaleDateString()}`)
    }

    return {
      total_registros: totalRegistros,
      tamanho_estimado: tamanhoFormatado,
      campos_incluidos: camposIncluidos,
      agrupamentos_aplicados: agrupamentosAplicados,
      filtros_ativos: filtrosAtivos
    }
  }, [config, empresas])

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Simular exportação
      await new Promise(resolve => setTimeout(resolve, 2000))

      const nomeArquivo = `export_${config.tipo_dados}_${Date.now()}.${config.formato}`
      const tamanhoArquivo = Math.floor(Math.random() * 5000) + 1000 // KB

      const arquivo = {
        url: `/exports/${nomeArquivo}`,
        nome: nomeArquivo,
        tamanho: tamanhoArquivo
      }

      onExportComplete?.(arquivo)
      toast.success('Exportação concluída com sucesso!')

    } catch (error) {
      toast.error('Erro na exportação de dados')
      console.error('Erro na exportação:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const tipoSelecionado = TIPOS_DADOS.find(t => t.id === config.tipo_dados)

  return (
    <div className="space-y-6">
      {/* Configuração Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-6 w-6 text-blue-600" />
            Configurar Exportação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de Dados e Formato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo_dados">Tipo de Dados</Label>
              <Select
                value={config.tipo_dados}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, tipo_dados: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DADOS.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      <div className="flex items-center gap-2">
                        <tipo.icone className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{tipo.nome}</div>
                          <div className="text-sm text-muted-foreground">{tipo.descricao}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="formato">Formato de Exportação</Label>
              <Select
                value={config.formato}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, formato: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      Excel (.xlsx)
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      CSV (.csv)
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      JSON (.json)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Período */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <DatePicker
                date={config.periodo.inicio}
                onDateChange={(date) => setConfig(prev => ({
                  ...prev,
                  periodo: { ...prev.periodo, inicio: date }
                }))}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <DatePicker
                date={config.periodo.fim}
                onDateChange={(date) => setConfig(prev => ({
                  ...prev,
                  periodo: { ...prev.periodo, fim: date }
                }))}
              />
            </div>
          </div>

          {/* Informações do Tipo Selecionado */}
          {tipoSelecionado && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <tipoSelecionado.icone className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">{tipoSelecionado.nome}</span>
              </div>
              <p className="text-sm text-blue-700">{tipoSelecionado.descricao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros Avançados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-purple-600" />
            Filtros e Seleções
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Empresas */}
          <div>
            <Label className="text-base font-medium">Empresas</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
              {empresas.map((empresa) => (
                <div key={empresa.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`empresa-${empresa.id}`}
                    checked={config.filtros.empresas_selecionadas.includes(empresa.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfig(prev => ({
                          ...prev,
                          filtros: {
                            ...prev.filtros,
                            empresas_selecionadas: [...prev.filtros.empresas_selecionadas, empresa.id]
                          }
                        }))
                      } else {
                        setConfig(prev => ({
                          ...prev,
                          filtros: {
                            ...prev.filtros,
                            empresas_selecionadas: prev.filtros.empresas_selecionadas.filter(id => id !== empresa.id)
                          }
                        }))
                      }
                    }}
                  />
                  <Label htmlFor={`empresa-${empresa.id}`} className="text-sm">
                    {empresa.nome}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfig(prev => ({
                  ...prev,
                  filtros: {
                    ...prev.filtros,
                    empresas_selecionadas: empresas.map(e => e.id)
                  }
                }))}
              >
                Selecionar Todas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfig(prev => ({
                  ...prev,
                  filtros: {
                    ...prev.filtros,
                    empresas_selecionadas: []
                  }
                }))}
              >
                Limpar Seleção
              </Button>
            </div>
          </div>

          {/* Regimes Tributários */}
          <div>
            <Label className="text-base font-medium">Regimes Tributários</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {REGIMES_TRIBUTARIOS.map((regime) => (
                <div key={regime} className="flex items-center space-x-2">
                  <Checkbox
                    id={`regime-${regime}`}
                    checked={config.filtros.regimes_tributarios.includes(regime)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfig(prev => ({
                          ...prev,
                          filtros: {
                            ...prev.filtros,
                            regimes_tributarios: [...prev.filtros.regimes_tributarios, regime]
                          }
                        }))
                      } else {
                        setConfig(prev => ({
                          ...prev,
                          filtros: {
                            ...prev.filtros,
                            regimes_tributarios: prev.filtros.regimes_tributarios.filter(r => r !== regime)
                          }
                        }))
                      }
                    }}
                  />
                  <Label htmlFor={`regime-${regime}`} className="text-sm">
                    {regime}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Faixa de Faturamento */}
          <div>
            <Label className="text-base font-medium">Faixa de Faturamento (R$)</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="faturamento_min" className="text-sm">Mínimo</Label>
                <Input
                  id="faturamento_min"
                  type="number"
                  placeholder="0"
                  value={config.filtros.faixa_faturamento.min || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    filtros: {
                      ...prev.filtros,
                      faixa_faturamento: {
                        ...prev.filtros.faixa_faturamento,
                        min: e.target.value ? parseFloat(e.target.value) : null
                      }
                    }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="faturamento_max" className="text-sm">Máximo</Label>
                <Input
                  id="faturamento_max"
                  type="number"
                  placeholder="Sem limite"
                  value={config.filtros.faixa_faturamento.max || ''}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    filtros: {
                      ...prev.filtros,
                      faixa_faturamento: {
                        ...prev.filtros.faixa_faturamento,
                        max: e.target.value ? parseFloat(e.target.value) : null
                      }
                    }
                  }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campos e Agrupamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campos para Exportação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Campos para Exportação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(config.campos).map(([campo, incluido]) => (
                <div key={campo} className="flex items-center space-x-2">
                  <Checkbox
                    id={`campo-${campo}`}
                    checked={incluido}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        campos: { ...prev.campos, [campo]: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor={`campo-${campo}`} className="text-sm">
                    {campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agrupamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Agrupamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(config.agrupamento).map(([agrupamento, aplicado]) => (
                <div key={agrupamento} className="flex items-center space-x-2">
                  <Checkbox
                    id={`agrupamento-${agrupamento}`}
                    checked={aplicado}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        agrupamento: { ...prev.agrupamento, [agrupamento]: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor={`agrupamento-${agrupamento}`} className="text-sm">
                    {agrupamento.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opções Avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            Opções Avançadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(config.opcoes).map(([opcao, ativo]) => (
              <div key={opcao} className="flex items-center space-x-2">
                <Checkbox
                  id={`opcao-${opcao}`}
                  checked={ativo}
                  onCheckedChange={(checked) =>
                    setConfig(prev => ({
                      ...prev,
                      opcoes: { ...prev.opcoes, [opcao]: !!checked }
                    }))
                  }
                />
                <Label htmlFor={`opcao-${opcao}`} className="text-sm">
                  {opcao.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview e Ações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-orange-600" />
              Preview da Exportação
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Ocultar' : 'Mostrar'} Preview
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showPreview && (
            <div className="space-y-4">
              {/* Estatísticas do Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{preview.total_registros}</div>
                  <div className="text-sm text-muted-foreground">Registros</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{preview.tamanho_estimado}</div>
                  <div className="text-sm text-muted-foreground">Tamanho Estimado</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{preview.campos_incluidos.length}</div>
                  <div className="text-sm text-muted-foreground">Campos</div>
                </div>
              </div>

              {/* Detalhes do Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Campos Incluídos:</h4>
                  <div className="space-y-1">
                    {preview.campos_incluidos.map((campo, index) => (
                      <Badge key={index} variant="outline" className="mr-1 mb-1">
                        {campo}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Agrupamentos:</h4>
                  <div className="space-y-1">
                    {preview.agrupamentos_aplicados.length > 0 ? (
                      preview.agrupamentos_aplicados.map((agrupamento, index) => (
                        <Badge key={index} variant="outline" className="mr-1 mb-1">
                          {agrupamento}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Nenhum agrupamento</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Filtros Ativos */}
              {preview.filtros_ativos.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Filtros Ativos:</h4>
                  <div className="space-y-1">
                    {preview.filtros_ativos.map((filtro, index) => (
                      <Badge key={index} variant="secondary" className="mr-1 mb-1">
                        {filtro}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Reset configurações
                  setConfig({
                    formato: 'excel',
                    tipo_dados: 'empresas',
                    periodo: {
                      inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                      fim: new Date()
                    },
                    filtros: {
                      empresas_selecionadas: [],
                      regimes_tributarios: [],
                      status_documentos: [],
                      tipos_documento: [],
                      faixa_faturamento: { min: null, max: null },
                      compliance_score: { min: null, max: null }
                    },
                    campos: {
                      dados_empresa: true,
                      metricas_financeiras: true,
                      dados_documentos: false,
                      analise_compliance: false,
                      insights_ia: false,
                      dados_mensais: false,
                      comparativos: false
                    },
                    agrupamento: {
                      por_empresa: true,
                      por_regime: false,
                      por_mes: false,
                      por_tipo_documento: false,
                      por_status: false
                    },
                    opcoes: {
                      incluir_cabecalhos: true,
                      incluir_totalizadores: true,
                      incluir_graficos: false,
                      incluir_metadados: true,
                      compactar_arquivo: false
                    }
                  })
                  toast.success('Configurações resetadas')
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resetar
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  toast.info('Funcionalidade de preview detalhado em desenvolvimento')
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Detalhado
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting || preview.total_registros === 0}
              >
                {isExporting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {isExporting ? 'Exportando...' : 'Exportar Dados'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações e Dicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dicas para Exportação Eficiente</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Excel:</strong> Melhor para análises e gráficos, suporta múltiplas planilhas
          </p>
          <p>
            • <strong>CSV:</strong> Formato universal, ideal para importação em outros sistemas
          </p>
          <p>
            • <strong>JSON:</strong> Formato estruturado, perfeito para integrações e APIs
          </p>
          <p>
            • <strong>Filtros:</strong> Use filtros para reduzir o tamanho do arquivo e focar nos dados relevantes
          </p>
          <p>
            • <strong>Agrupamentos:</strong> Organize os dados por critérios específicos para facilitar análises
          </p>
          <p>
            • <strong>Performance:</strong> Exportações grandes podem levar alguns minutos para processar
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
