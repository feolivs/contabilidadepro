'use client'

/**
 * 📄 RELATÓRIO GENERATOR - ContabilidadePRO
 * Componente para geração automatizada de relatórios em PDF
 * Especializado em dados financeiros, compliance e recomendações
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, Download, Calendar, Building2, BarChart3, 
  CheckCircle, AlertTriangle, Settings, Eye, RefreshCw,
  FileDown, Mail, Share2, Clock
} from 'lucide-react'
import { toast } from 'sonner'

// Interfaces
interface RelatorioConfig {
  empresa_id: string
  tipo_relatorio: 'completo' | 'financeiro' | 'compliance' | 'comparativo' | 'personalizado'
  periodo: {
    inicio: string
    fim: string
  }
  secoes: {
    resumo_executivo: boolean
    metricas_financeiras: boolean
    analise_compliance: boolean
    insights_ia: boolean
    recomendacoes: boolean
    graficos: boolean
    dados_detalhados: boolean
    anexos: boolean
  }
  formato: 'pdf' | 'excel' | 'word'
  template: 'padrao' | 'executivo' | 'tecnico' | 'apresentacao'
  personalizacao: {
    logo_empresa?: string
    cores_personalizadas?: boolean
    cabecalho_personalizado?: string
    rodape_personalizado?: string
  }
  agendamento?: {
    ativo: boolean
    frequencia: 'semanal' | 'mensal' | 'trimestral'
    dia_envio: number
    email_destinatarios: string[]
  }
}

interface RelatorioStatus {
  id: string
  status: 'gerando' | 'concluido' | 'erro' | 'agendado'
  progresso: number
  arquivo_url?: string
  erro_mensagem?: string
  data_geracao: string
  tamanho_arquivo?: number
}

interface RelatorioGeneratorProps {
  empresas: Array<{
    id: string
    nome: string
    cnpj: string
  }>
  onRelatorioGerado?: (relatorio: RelatorioStatus) => void
}

const TIPOS_RELATORIO = [
  {
    id: 'completo',
    nome: 'Relatório Completo',
    descricao: 'Análise abrangente com todas as seções',
    icone: FileText,
    tempo_estimado: '5-8 min'
  },
  {
    id: 'financeiro',
    nome: 'Relatório Financeiro',
    descricao: 'Foco em métricas e análises financeiras',
    icone: BarChart3,
    tempo_estimado: '3-5 min'
  },
  {
    id: 'compliance',
    nome: 'Relatório de Compliance',
    descricao: 'Análise de conformidade e riscos',
    icone: CheckCircle,
    tempo_estimado: '2-4 min'
  },
  {
    id: 'comparativo',
    nome: 'Relatório Comparativo',
    descricao: 'Comparação entre múltiplas empresas',
    icone: Building2,
    tempo_estimado: '4-7 min'
  },
  {
    id: 'personalizado',
    nome: 'Relatório Personalizado',
    descricao: 'Configure seções e conteúdo específico',
    icone: Settings,
    tempo_estimado: 'Variável'
  }
]

const TEMPLATES = [
  {
    id: 'padrao',
    nome: 'Padrão',
    descricao: 'Layout limpo e profissional'
  },
  {
    id: 'executivo',
    nome: 'Executivo',
    descricao: 'Foco em resumos e insights estratégicos'
  },
  {
    id: 'tecnico',
    nome: 'Técnico',
    descricao: 'Detalhado com dados e análises aprofundadas'
  },
  {
    id: 'apresentacao',
    nome: 'Apresentação',
    descricao: 'Otimizado para apresentações e reuniões'
  }
]

export function RelatorioGenerator({ empresas, onRelatorioGerado }: RelatorioGeneratorProps) {
  const [config, setConfig] = useState<RelatorioConfig>({
    empresa_id: '',
    tipo_relatorio: 'completo',
    periodo: {
      inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fim: new Date().toISOString().split('T')[0]
    },
    secoes: {
      resumo_executivo: true,
      metricas_financeiras: true,
      analise_compliance: true,
      insights_ia: true,
      recomendacoes: true,
      graficos: true,
      dados_detalhados: false,
      anexos: false
    },
    formato: 'pdf',
    template: 'padrao',
    personalizacao: {
      cores_personalizadas: false
    }
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [relatoriosGerados, setRelatoriosGerados] = useState<RelatorioStatus[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleGerarRelatorio = async () => {
    if (!config.empresa_id) {
      toast.error('Selecione uma empresa para gerar o relatório')
      return
    }

    setIsGenerating(true)

    try {
      // Simular geração de relatório
      const novoRelatorio: RelatorioStatus = {
        id: `rel_${Date.now()}`,
        status: 'gerando',
        progresso: 0,
        data_geracao: new Date().toISOString()
      }

      setRelatoriosGerados(prev => [novoRelatorio, ...prev])

      // Simular progresso
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setRelatoriosGerados(prev => 
          prev.map(rel => 
            rel.id === novoRelatorio.id 
              ? { ...rel, progresso: i }
              : rel
          )
        )
      }

      // Finalizar
      const relatorioFinalizado: RelatorioStatus = {
        ...novoRelatorio,
        status: 'concluido',
        progresso: 100,
        arquivo_url: `/relatorios/${novoRelatorio.id}.pdf`,
        tamanho_arquivo: Math.floor(Math.random() * 5000) + 1000 // KB
      }

      setRelatoriosGerados(prev => 
        prev.map(rel => 
          rel.id === novoRelatorio.id 
            ? relatorioFinalizado
            : rel
        )
      )

      onRelatorioGerado?.(relatorioFinalizado)
      toast.success('Relatório gerado com sucesso!')

    } catch (error) {
      toast.error('Erro ao gerar relatório')
      console.error('Erro na geração:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadRelatorio = (relatorio: RelatorioStatus) => {
    if (relatorio.arquivo_url) {
      // Simular download
      toast.success('Download iniciado')
      console.log('Downloading:', relatorio.arquivo_url)
    }
  }

  const formatarTamanhoArquivo = (tamanhoKB: number) => {
    if (tamanhoKB < 1024) {
      return `${tamanhoKB} KB`
    }
    return `${(tamanhoKB / 1024).toFixed(1)} MB`
  }

  const formatarDataHora = (dataISO: string) => {
    return new Date(dataISO).toLocaleString('pt-BR')
  }

  const tipoSelecionado = TIPOS_RELATORIO.find(t => t.id === config.tipo_relatorio)

  return (
    <div className="space-y-6">
      {/* Configuração do Relatório */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Configurar Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seleção de Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="empresa">Empresa</Label>
              <Select
                value={config.empresa_id}
                onValueChange={(value) => setConfig(prev => ({ ...prev, empresa_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      <div>
                        <div className="font-medium">{empresa.nome}</div>
                        <div className="text-sm text-muted-foreground">{empresa.cnpj}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo de Relatório</Label>
              <Select
                value={config.tipo_relatorio}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, tipo_relatorio: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_RELATORIO.map((tipo) => (
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
          </div>

          {/* Período */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inicio">Data Início</Label>
              <Input
                id="inicio"
                type="date"
                value={config.periodo.inicio}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  periodo: { ...prev.periodo, inicio: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="fim">Data Fim</Label>
              <Input
                id="fim"
                type="date"
                value={config.periodo.fim}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  periodo: { ...prev.periodo, fim: e.target.value }
                }))}
              />
            </div>
          </div>

          {/* Formato e Template */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="formato">Formato</Label>
              <Select
                value={config.formato}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, formato: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="word">Word</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="template">Template</Label>
              <Select
                value={config.template}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, template: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.nome}</div>
                        <div className="text-sm text-muted-foreground">{template.descricao}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seções do Relatório */}
          <div>
            <Label className="text-base font-medium">Seções do Relatório</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {Object.entries(config.secoes).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        secoes: { ...prev.secoes, [key]: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor={key} className="text-sm">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Informações do Tipo Selecionado */}
          {tipoSelecionado && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <tipoSelecionado.icone className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">{tipoSelecionado.nome}</span>
                <Badge variant="outline" className="text-blue-600">
                  <Clock className="h-3 w-3 mr-1" />
                  {tipoSelecionado.tempo_estimado}
                </Badge>
              </div>
              <p className="text-sm text-blue-700">{tipoSelecionado.descricao}</p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showAdvanced ? 'Ocultar' : 'Mostrar'} Avançado
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // Preview do relatório
                  toast.info('Funcionalidade de preview em desenvolvimento')
                }}
                disabled={!config.empresa_id}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleGerarRelatorio}
                disabled={isGenerating || !config.empresa_id}
              >
                {isGenerating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                {isGenerating ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Avançadas */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Configurações Avançadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personalização */}
            <div>
              <Label className="text-base font-medium">Personalização</Label>
              <div className="space-y-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cores_personalizadas"
                    checked={config.personalizacao.cores_personalizadas}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        personalizacao: { ...prev.personalizacao, cores_personalizadas: !!checked }
                      }))
                    }
                  />
                  <Label htmlFor="cores_personalizadas">Usar cores personalizadas da empresa</Label>
                </div>

                <div>
                  <Label htmlFor="cabecalho">Cabeçalho Personalizado</Label>
                  <Input
                    id="cabecalho"
                    placeholder="Ex: Relatório Mensal - Janeiro 2025"
                    value={config.personalizacao.cabecalho_personalizado || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      personalizacao: { ...prev.personalizacao, cabecalho_personalizado: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="rodape">Rodapé Personalizado</Label>
                  <Textarea
                    id="rodape"
                    placeholder="Ex: Documento confidencial - Uso interno"
                    value={config.personalizacao.rodape_personalizado || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      personalizacao: { ...prev.personalizacao, rodape_personalizado: e.target.value }
                    }))}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Agendamento */}
            <div>
              <Label className="text-base font-medium">Agendamento Automático</Label>
              <div className="space-y-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="agendamento_ativo"
                    checked={config.agendamento?.ativo || false}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        agendamento: {
                          ...prev.agendamento,
                          ativo: !!checked,
                          frequencia: 'mensal',
                          dia_envio: 1,
                          email_destinatarios: []
                        }
                      }))
                    }
                  />
                  <Label htmlFor="agendamento_ativo">Ativar geração automática</Label>
                </div>

                {config.agendamento?.ativo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div>
                      <Label htmlFor="frequencia">Frequência</Label>
                      <Select
                        value={config.agendamento.frequencia}
                        onValueChange={(value: any) => setConfig(prev => ({
                          ...prev,
                          agendamento: { ...prev.agendamento!, frequencia: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                          <SelectItem value="trimestral">Trimestral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="dia_envio">Dia do Envio</Label>
                      <Input
                        id="dia_envio"
                        type="number"
                        min="1"
                        max="31"
                        value={config.agendamento.dia_envio}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          agendamento: { ...prev.agendamento!, dia_envio: parseInt(e.target.value) }
                        }))}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="emails">E-mails para Envio (separados por vírgula)</Label>
                      <Input
                        id="emails"
                        placeholder="email1@empresa.com, email2@empresa.com"
                        value={config.agendamento.email_destinatarios.join(', ')}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          agendamento: {
                            ...prev.agendamento!,
                            email_destinatarios: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                          }
                        }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relatórios Gerados */}
      {relatoriosGerados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              Relatórios Gerados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {relatoriosGerados.map((relatorio) => (
                <div
                  key={relatorio.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {relatorio.status === 'gerando' && (
                        <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                      )}
                      {relatorio.status === 'concluido' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {relatorio.status === 'erro' && (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                      <FileText className="h-4 w-4 text-gray-600" />
                    </div>

                    <div>
                      <div className="font-medium">
                        Relatório {config.tipo_relatorio} - {formatarDataHora(relatorio.data_geracao)}
                      </div>
                      <div className="text-sm text-muted-foreground">
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
                          onClick={() => handleDownloadRelatorio(relatorio)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast.info('Funcionalidade de compartilhamento em desenvolvimento')
                          }}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Compartilhar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações e Dicas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dicas para Relatórios Eficazes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • <strong>Relatório Completo:</strong> Ideal para análises mensais e apresentações executivas
          </p>
          <p>
            • <strong>Relatório Financeiro:</strong> Foque em métricas de performance e projeções
          </p>
          <p>
            • <strong>Relatório de Compliance:</strong> Essencial para auditorias e conformidade
          </p>
          <p>
            • <strong>Agendamento:</strong> Configure envios automáticos para manter stakeholders informados
          </p>
          <p>
            • <strong>Templates:</strong> Use o template "Executivo" para reuniões de diretoria
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
