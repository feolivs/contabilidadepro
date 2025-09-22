'use client'

/**
 * 📊 PÁGINA DE EXPORTAÇÃO DE DADOS - ContabilidadePRO
 * Página dedicada para exportação de dados agregados com filtros avançados
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataExport } from '@/components/export/data-export'
import { useDataExport, useQuickExport } from '@/hooks/use-data-export'
import { useAuth } from '@/hooks/use-auth'
import { 
  Download, FileSpreadsheet, FileText, Clock, 
  RefreshCw, AlertCircle, CheckCircle, ArrowLeft,
  Building2, BarChart3, Zap, History
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Dados mock para demonstração
const EMPRESAS_MOCK = [
  {
    id: '1',
    nome: 'Tech Solutions Ltda',
    cnpj: '12.345.678/0001-90',
    regime_tributario: 'Simples Nacional'
  },
  {
    id: '2',
    nome: 'Comércio Brasil S.A.',
    cnpj: '98.765.432/0001-10',
    regime_tributario: 'Lucro Presumido'
  },
  {
    id: '3',
    nome: 'Startup Inovação ME',
    cnpj: '11.222.333/0001-44',
    regime_tributario: 'MEI'
  },
  {
    id: '4',
    nome: 'Indústria Metalúrgica Ltda',
    cnpj: '55.666.777/0001-88',
    regime_tributario: 'Lucro Real'
  }
]

export default function ExportPage() {
  const { user } = useAuth()
  const [abaSelecionada, setAbaSelecionada] = useState('exportar')

  const {
    historicoExportacoes,
    exportProgress,
    templates,
    isExporting,
    loadingHistorico,
    downloadExport,
    formatFileSize
  } = useDataExport()

  const { exportWithTemplate } = useQuickExport()

  const handleExportComplete = (arquivo: { url: string; nome: string; tamanho: number }) => {
    console.log('Exportação concluída:', arquivo)
    toast.success('Exportação concluída com sucesso!')
    setAbaSelecionada('historico')
  }

  const handleQuickExport = async (templateId: string, formato: 'excel' | 'csv' | 'json' = 'excel') => {
    const empresasSelecionadas = EMPRESAS_MOCK.slice(0, 2).map(e => e.id) // Primeiras 2 empresas
    await exportWithTemplate(templateId, empresasSelecionadas, formato)
  }

  const formatarDataHora = (dataISO: string) => {
    return new Date(dataISO).toLocaleString('pt-BR')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'erro':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Você precisa estar logado para acessar esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Download className="h-8 w-8 text-blue-600" />
              Exportação de Dados
            </h1>
            <p className="text-muted-foreground mt-1">
              Exporte dados agregados em Excel, CSV ou JSON com filtros personalizados
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Exportações Realizadas
                </p>
                <p className="text-2xl font-bold">{historicoExportacoes.length}</p>
              </div>
              <Download className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Em Processamento
                </p>
                <p className="text-2xl font-bold">{exportProgress.length}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Templates Disponíveis
                </p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Empresas Disponíveis
                </p>
                <p className="text-2xl font-bold">{EMPRESAS_MOCK.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="exportar">Exportar Dados</TabsTrigger>
          <TabsTrigger value="templates">Templates Rápidos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Aba: Exportar Dados */}
        <TabsContent value="exportar" className="space-y-6">
          <DataExport
            empresas={EMPRESAS_MOCK}
            onExportComplete={handleExportComplete}
          />
        </TabsContent>

        {/* Aba: Templates Rápidos */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                Templates de Exportação Rápida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="border-2 hover:border-blue-300 transition-colors">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{template.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">{template.descricao}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Campos incluídos */}
                        <div>
                          <p className="text-sm font-medium mb-1">Campos incluídos:</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(template.config.campos || {})
                              .filter(([_, incluido]) => incluido)
                              .slice(0, 3)
                              .map(([campo, _]) => (
                                <Badge key={campo} variant="outline" className="text-xs">
                                  {campo.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            {Object.values(template.config.campos || {}).filter(Boolean).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{Object.values(template.config.campos || {}).filter(Boolean).length - 3} mais
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Botões de exportação */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleQuickExport(template.id, 'excel')}
                            disabled={isExporting}
                            className="flex-1"
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-1" />
                            Excel
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickExport(template.id, 'csv')}
                            disabled={isExporting}
                            className="flex-1"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            CSV
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Histórico */}
        <TabsContent value="historico" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Histórico de Exportações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistorico ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2">Carregando histórico...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Exportações em Progresso */}
                  {exportProgress.map(([exportId, progress]) => (
                    <div
                      key={exportId}
                      className="flex items-center justify-between p-4 border rounded-lg bg-blue-50"
                    >
                      <div className="flex items-center gap-4">
                        <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                        <div>
                          <div className="font-medium">Exportação em andamento</div>
                          <div className="text-sm text-blue-600">
                            Processando... {progress}%
                          </div>
                          <div className="w-48 bg-blue-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Histórico de Exportações */}
                  {historicoExportacoes.map((exportacao) => (
                    <div
                      key={exportacao.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(exportacao.status)}
                        <div>
                          <div className="font-medium">
                            {exportacao.nome_arquivo}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatarDataHora(exportacao.data_exportacao)} • {' '}
                            {formatFileSize(exportacao.tamanho_arquivo)} • {' '}
                            {exportacao.total_registros} registros
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {exportacao.status === 'concluido' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadExport(exportacao)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                        <Badge variant={exportacao.status === 'concluido' ? 'default' : 'destructive'}>
                          {exportacao.formato.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {exportProgress.length === 0 && historicoExportacoes.length === 0 && (
                    <div className="text-center py-8">
                      <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhuma exportação encontrada
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Faça sua primeira exportação para começar
                      </p>
                      <Button onClick={() => setAbaSelecionada('exportar')}>
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Dados
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sobre a Exportação de Dados</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Excel:</strong> Ideal para análises avançadas, gráficos e relatórios executivos
          </p>
          <p>
            • <strong>CSV:</strong> Formato universal, compatível com qualquer sistema ou planilha
          </p>
          <p>
            • <strong>JSON:</strong> Perfeito para integrações, APIs e processamento automatizado
          </p>
          <p>
            • <strong>Filtros Avançados:</strong> Personalize exatamente quais dados exportar
          </p>
          <p>
            • <strong>Templates Rápidos:</strong> Configurações pré-definidas para casos comuns
          </p>
          <p>
            • <strong>Histórico:</strong> Todos os arquivos ficam disponíveis para download posterior
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
