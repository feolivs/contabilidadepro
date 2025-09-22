'use client'

/**
 * 📄 USE RELATÓRIO GENERATOR - ContabilidadePRO
 * Hook para gerenciar geração automatizada de relatórios
 * Integrado com Edge Functions e sistema de cache
 */

import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/simple-logger'
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
  config_utilizada: Partial<RelatorioConfig>
}

interface RelatorioTemplate {
  id: string
  nome: string
  descricao: string
  config_padrao: Partial<RelatorioConfig>
  preview_url?: string
}

/**
 * Hook principal para geração de relatórios
 */
export function useRelatorioGenerator() {
  const { user } = useAuth()
  const [relatoriosAtivos, setRelatoriosAtivos] = useState<Map<string, RelatorioStatus>>(new Map())

  // Buscar templates disponíveis
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['relatorio-templates'],
    queryFn: fetchRelatorioTemplates,
    staleTime: 30 * 60 * 1000, // 30 minutos
  })

  // Buscar histórico de relatórios
  const { data: historicoRelatorios, isLoading: loadingHistorico, refetch: refetchHistorico } = useQuery({
    queryKey: ['relatorio-historico', user?.id],
    queryFn: () => fetchHistoricoRelatorios(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // Mutation para gerar relatório
  const gerarRelatorioMutation = useMutation({
    mutationFn: (config: RelatorioConfig) => gerarRelatorio(config, user?.id || ''),
    onMutate: (config) => {
      // Criar status inicial
      const relatorioId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const statusInicial: RelatorioStatus = {
        id: relatorioId,
        status: 'gerando',
        progresso: 0,
        data_geracao: new Date().toISOString(),
        config_utilizada: config
      }

      setRelatoriosAtivos(prev => new Map(prev.set(relatorioId, statusInicial)))
      return { relatorioId }
    },
    onSuccess: (resultado, config, context) => {
      if (context?.relatorioId) {
        setRelatoriosAtivos(prev => {
          const updated = new Map(prev)
          const relatorio = updated.get(context.relatorioId)
          if (relatorio) {
            updated.set(context.relatorioId, {
              ...relatorio,
              status: 'concluido',
              progresso: 100,
              arquivo_url: resultado.arquivo_url,
              tamanho_arquivo: resultado.tamanho_arquivo
            })
          }
          return updated
        })
      }
      refetchHistorico()
      toast.success('Relatório gerado com sucesso!')
    },
    onError: (error, config, context) => {
      if (context?.relatorioId) {
        setRelatoriosAtivos(prev => {
          const updated = new Map(prev)
          const relatorio = updated.get(context.relatorioId)
          if (relatorio) {
            updated.set(context.relatorioId, {
              ...relatorio,
              status: 'erro',
              erro_mensagem: error instanceof Error ? error.message : 'Erro desconhecido'
            })
          }
          return updated
        })
      }
      toast.error('Erro ao gerar relatório')
      logger.error('Erro na geração de relatório:', error)
    }
  })

  // Função para atualizar progresso
  const atualizarProgresso = useCallback((relatorioId: string, progresso: number) => {
    setRelatoriosAtivos(prev => {
      const updated = new Map(prev)
      const relatorio = updated.get(relatorioId)
      if (relatorio && relatorio.status === 'gerando') {
        updated.set(relatorioId, { ...relatorio, progresso })
      }
      return updated
    })
  }, [])

  // Função para download de relatório
  const downloadRelatorio = useCallback(async (relatorio: RelatorioStatus) => {
    if (!relatorio.arquivo_url) {
      toast.error('URL do arquivo não disponível')
      return
    }

    try {
      // Implementar download real
      const response = await fetch(relatorio.arquivo_url)
      if (!response.ok) throw new Error('Erro ao baixar arquivo')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `relatorio_${relatorio.id}.${getExtensaoArquivo(relatorio.config_utilizada.formato || 'pdf')}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Download iniciado')
    } catch (error) {
      toast.error('Erro ao fazer download do relatório')
      logger.error('Erro no download:', error)
    }
  }, [])

  // Função para compartilhar relatório
  const compartilharRelatorio = useCallback(async (relatorio: RelatorioStatus, emails: string[]) => {
    try {
      const { error } = await supabase.functions.invoke('email-service', {
        body: {
          to: emails,
          subject: `Relatório ${relatorio.config_utilizada.tipo_relatorio} - ${new Date(relatorio.data_geracao).toLocaleDateString('pt-BR')}`,
          template: 'relatorio-compartilhamento',
          data: {
            relatorio_id: relatorio.id,
            arquivo_url: relatorio.arquivo_url,
            data_geracao: relatorio.data_geracao,
            tipo_relatorio: relatorio.config_utilizada.tipo_relatorio
          }
        }
      })

      if (error) throw error

      toast.success('Relatório compartilhado com sucesso')
    } catch (error) {
      toast.error('Erro ao compartilhar relatório')
      logger.error('Erro no compartilhamento:', error)
    }
  }, [])

  // Função para agendar relatório
  const agendarRelatorio = useCallback(async (config: RelatorioConfig) => {
    if (!config.agendamento?.ativo) return

    try {
      const { error } = await supabase
        .from('relatorios_agendados')
        .insert({
          user_id: user?.id,
          empresa_id: config.empresa_id,
          config: config,
          frequencia: config.agendamento.frequencia,
          dia_envio: config.agendamento.dia_envio,
          email_destinatarios: config.agendamento.email_destinatarios,
          ativo: true
        })

      if (error) throw error

      toast.success('Relatório agendado com sucesso')
    } catch (error) {
      toast.error('Erro ao agendar relatório')
      logger.error('Erro no agendamento:', error)
    }
  }, [user?.id])

  return {
    // Dados
    templates: templates || [],
    historicoRelatorios: historicoRelatorios || [],
    relatoriosAtivos: Array.from(relatoriosAtivos.values()),

    // Estados
    isGenerating: gerarRelatorioMutation.isPending,
    loadingTemplates,
    loadingHistorico,

    // Ações
    gerarRelatorio: gerarRelatorioMutation.mutate,
    downloadRelatorio,
    compartilharRelatorio,
    agendarRelatorio,
    atualizarProgresso,

    // Utilitários
    limparRelatoriosAtivos: () => setRelatoriosAtivos(new Map()),
    removerRelatorioAtivo: (id: string) => {
      setRelatoriosAtivos(prev => {
        const updated = new Map(prev)
        updated.delete(id)
        return updated
      })
    }
  }
}

/**
 * Buscar templates de relatório disponíveis
 */
async function fetchRelatorioTemplates(): Promise<RelatorioTemplate[]> {
  // Templates padrão do sistema
  return [
    {
      id: 'padrao',
      nome: 'Padrão',
      descricao: 'Layout limpo e profissional para uso geral',
      config_padrao: {
        formato: 'pdf',
        template: 'padrao',
        secoes: {
          resumo_executivo: true,
          metricas_financeiras: true,
          analise_compliance: true,
          insights_ia: true,
          recomendacoes: true,
          graficos: true,
          dados_detalhados: false,
          anexos: false
        }
      }
    },
    {
      id: 'executivo',
      nome: 'Executivo',
      descricao: 'Foco em resumos e insights estratégicos para diretoria',
      config_padrao: {
        formato: 'pdf',
        template: 'executivo',
        secoes: {
          resumo_executivo: true,
          metricas_financeiras: true,
          analise_compliance: false,
          insights_ia: true,
          recomendacoes: true,
          graficos: true,
          dados_detalhados: false,
          anexos: false
        }
      }
    },
    {
      id: 'tecnico',
      nome: 'Técnico',
      descricao: 'Detalhado com dados e análises aprofundadas',
      config_padrao: {
        formato: 'pdf',
        template: 'tecnico',
        secoes: {
          resumo_executivo: false,
          metricas_financeiras: true,
          analise_compliance: true,
          insights_ia: true,
          recomendacoes: true,
          graficos: true,
          dados_detalhados: true,
          anexos: true
        }
      }
    }
  ]
}

/**
 * Buscar histórico de relatórios do usuário
 */
async function fetchHistoricoRelatorios(userId: string): Promise<RelatorioStatus[]> {
  try {
    const { data, error } = await supabase
      .from('relatorios_gerados')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return data?.map(item => ({
      id: item.id,
      status: item.status,
      progresso: 100,
      arquivo_url: item.arquivo_url,
      data_geracao: item.created_at,
      tamanho_arquivo: item.tamanho_arquivo,
      config_utilizada: item.config || {}
    })) || []

  } catch (error) {
    logger.error('Erro ao buscar histórico de relatórios:', error)
    return []
  }
}

/**
 * Gerar relatório via Edge Function
 */
async function gerarRelatorio(config: RelatorioConfig, userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('relatorio-generator-service', {
      body: {
        user_id: userId,
        config: config
      }
    })

    if (error) throw error

    return {
      arquivo_url: data.arquivo_url,
      tamanho_arquivo: data.tamanho_arquivo
    }

  } catch (error) {
    logger.error('Erro ao gerar relatório:', error)
    throw error
  }
}

/**
 * Obter extensão do arquivo baseada no formato
 */
function getExtensaoArquivo(formato: string): string {
  switch (formato) {
    case 'pdf': return 'pdf'
    case 'excel': return 'xlsx'
    case 'word': return 'docx'
    default: return 'pdf'
  }
}
