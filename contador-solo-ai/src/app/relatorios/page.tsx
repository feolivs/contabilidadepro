'use client'

/**
 * 📄 PÁGINA DE RELATÓRIOS - ContabilidadePRO
 * Página dedicada para geração e gerenciamento de relatórios automatizados
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RelatorioGenerator } from '@/components/relatorios/relatorio-generator'
import { useRelatorioGenerator } from '@/hooks/use-relatorio-generator'
import { useAuth } from '@/hooks/use-auth'
import {
  FileText, BarChart3, Calendar, Clock, Download,
  RefreshCw, AlertCircle, CheckCircle, ArrowLeft,
  TrendingUp, Building2, Settings, Eye
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

// Dados mock para demonstração
const EMPRESAS_MOCK = [
  {
    id: '1',
    nome: 'Tech Solutions Ltda',
    cnpj: '12.345.678/0001-90'
  },
  {
    id: '2',
    nome: 'Comércio Brasil S.A.',
    cnpj: '98.765.432/0001-10'
  },
  {
    id: '3',
    nome: 'Startup Inovação ME',
    cnpj: '11.222.333/0001-44'
  },
  {
    id: '4',
    nome: 'Indústria Metalúrgica Ltda',
    cnpj: '55.666.777/0001-88'
  }
]

export default function RelatoriosPage() {
  const { user } = useAuth()
  const [abaSelecionada, setAbaSelecionada] = useState('gerar')

  const {
    templates,
    historicoRelatorios,
    relatoriosAtivos,
    isGenerating,
    loadingTemplates,
    loadingHistorico,
    gerarRelatorio,
    downloadRelatorio,
    compartilharRelatorio
  } = useRelatorioGenerator()

  const handleRelatorioGerado = (relatorio: any) => {
    console.log('Relatório gerado:', relatorio)
    toast.success('Relatório gerado com sucesso!')
    setAbaSelecionada('historico')
  }

  const formatarDataHora = (dataISO: string) => {
    return new Date(dataISO).toLocaleString('pt-BR')
  }

  const formatarTamanhoArquivo = (tamanhoKB: number) => {
    if (tamanhoKB < 1024) {
      return `${tamanhoKB} KB`
    }
    return `${(tamanhoKB / 1024).toFixed(1)} MB`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'gerando':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      case 'concluido':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'erro':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'gerando': return 'text-blue-600'
      case 'concluido': return 'text-green-600'
      case 'erro': return 'text-red-600'
      default: return 'text-gray-600'
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
              <FileText className="h-8 w-8 text-blue-600" />
              Relatórios Automatizados
            </h1>
            <p className="text-muted-foreground mt-1">
              Gere relatórios profissionais com dados financeiros e insights de IA
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
                  Relatórios Gerados
                </p>
                <p className="text-2xl font-bold">{historicoRelatorios.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
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
                <p className="text-2xl font-bold">{relatoriosAtivos.filter(r => r.status === 'gerando').length}</p>
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
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Empresas Cadastradas
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
          <TabsTrigger value="gerar">Gerar Relatório</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="agendados">Agendados</TabsTrigger>
        </TabsList>

        {/* Aba: Gerar Relatório */}
        <TabsContent value="gerar" className="space-y-6">
          <RelatorioGenerator
            empresas={EMPRESAS_MOCK}
            onRelatorioGerado={handleRelatorioGerado}
          />
        </TabsContent>

        {/* Aba: Histórico */}
        <TabsContent value="historico" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Histórico de Relatórios
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
                  {/* Relatórios Ativos */}
                  {relatoriosAtivos.map((relatorio) => (
                    <div
                      key={relatorio.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(relatorio.status)}
                        <div>
                          <div className="font-medium">
                            Relatório {relatorio.config_utilizada.tipo_relatorio} - {formatarDataHora(relatorio.data_geracao)}
                          </div>
                          <div className={`text-sm ${getStatusColor(relatorio.status)}`}>
                            {relatorio.status === 'gerando' && `Gerando... ${relatorio.progresso}%`}
                            {relatorio.status === 'concluido' && relatorio.tamanho_arquivo &&
                              `Concluído - ${formatarTamanhoArquivo(relatorio.tamanho_arquivo)}`
                            }
                            {relatorio.status === 'erro' && relatorio.erro_mensagem}
                          </div>
                          {relatorio.status === 'gerando' && (
                            <div className="w-48 bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${relatorio.progresso}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {relatorio.status === 'concluido' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadRelatorio(relatorio)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast.info('Funcionalidade de visualização em desenvolvimento')
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Histórico de Relatórios */}
                  {historicoRelatorios.map((relatorio) => (
                    <div
                      key={relatorio.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="font-medium">
                            Relatório {relatorio.config_utilizada.tipo_relatorio} - {formatarDataHora(relatorio.data_geracao)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {relatorio.tamanho_arquivo && formatarTamanhoArquivo(relatorio.tamanho_arquivo)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadRelatorio(relatorio)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}

                  {relatoriosAtivos.length === 0 && historicoRelatorios.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum relatório encontrado
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Gere seu primeiro relatório para começar
                      </p>
                      <Button onClick={() => setAbaSelecionada('gerar')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Gerar Relatório
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba: Agendados */}
        <TabsContent value="agendados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Relatórios Agendados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Funcionalidade em Desenvolvimento
                </h3>
                <p className="text-gray-500 mb-4">
                  Em breve você poderá agendar relatórios automáticos
                </p>
                <Badge variant="outline">
                  Próxima Atualização
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sobre os Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Relatórios Completos:</strong> Incluem análise financeira, compliance e insights de IA
          </p>
          <p>
            • <strong>Formatos Disponíveis:</strong> PDF para apresentações, Excel para análises, Word para edição
          </p>
          <p>
            • <strong>Templates Profissionais:</strong> Layouts otimizados para diferentes audiências
          </p>
          <p>
            • <strong>Dados em Tempo Real:</strong> Informações sempre atualizadas do seu sistema
          </p>
          <p>
            • <strong>Personalização:</strong> Adicione logo, cores e textos personalizados
          </p>
        </CardContent>
      </Card>
    </div>
  )
}