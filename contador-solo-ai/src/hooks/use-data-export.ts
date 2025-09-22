'use client'

/**
 * 📊 USE DATA EXPORT - ContabilidadePRO
 * Hook para gerenciar exportação de dados agregados
 * Suporte para Excel, CSV e JSON com filtros avançados
 */

import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/simple-logger'
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

interface ExportResult {
  arquivo_url: string
  nome_arquivo: string
  tamanho_arquivo: number
  total_registros: number
  formato: string
  data_exportacao: string
}

interface ExportHistory {
  id: string
  nome_arquivo: string
  formato: string
  tamanho_arquivo: number
  total_registros: number
  config_utilizada: Partial<ExportConfig>
  data_exportacao: string
  status: 'concluido' | 'erro'
  arquivo_url?: string
}

/**
 * Hook principal para exportação de dados
 */
export function useDataExport() {
  const { user } = useAuth()
  const [exportProgress, setExportProgress] = useState<Map<string, number>>(new Map())

  // Buscar histórico de exportações
  const { data: historicoExportacoes, isLoading: loadingHistorico, refetch: refetchHistorico } = useQuery({
    queryKey: ['export-history', user?.id],
    queryFn: () => fetchExportHistory(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })

  // Mutation para exportar dados
  const exportDataMutation = useMutation({
    mutationFn: (config: ExportConfig) => exportData(config, user?.id || ''),
    onMutate: (config) => {
      const exportId = `export_${Date.now()}`
      setExportProgress(prev => new Map(prev.set(exportId, 0)))
      return { exportId }
    },
    onSuccess: (resultado, config, context) => {
      if (context?.exportId) {
        setExportProgress(prev => {
          const updated = new Map(prev)
          updated.delete(context.exportId)
          return updated
        })
      }
      refetchHistorico()
      toast.success('Exportação concluída com sucesso!')
    },
    onError: (error, config, context) => {
      if (context?.exportId) {
        setExportProgress(prev => {
          const updated = new Map(prev)
          updated.delete(context.exportId)
          return updated
        })
      }
      toast.error('Erro na exportação de dados')
      logger.error('Erro na exportação:', error)
    }
  })

  // Função para atualizar progresso
  const updateProgress = useCallback((exportId: string, progress: number) => {
    setExportProgress(prev => new Map(prev.set(exportId, progress)))
  }, [])

  // Função para download de arquivo exportado
  const downloadExport = useCallback(async (exportacao: ExportHistory) => {
    if (!exportacao.arquivo_url) {
      toast.error('URL do arquivo não disponível')
      return
    }

    try {
      const response = await fetch(exportacao.arquivo_url)
      if (!response.ok) throw new Error('Erro ao baixar arquivo')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = exportacao.nome_arquivo
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Download iniciado')
    } catch (error) {
      toast.error('Erro ao fazer download do arquivo')
      logger.error('Erro no download:', error)
    }
  }, [])

  // Função para validar configuração de exportação
  const validateConfig = useCallback((config: ExportConfig): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Validar período
    if (config.periodo.inicio && config.periodo.fim) {
      if (config.periodo.inicio > config.periodo.fim) {
        errors.push('Data de início deve ser anterior à data de fim')
      }
    }

    // Validar campos selecionados
    const camposSelecionados = Object.values(config.campos).some(campo => campo)
    if (!camposSelecionados) {
      errors.push('Selecione pelo menos um campo para exportação')
    }

    // Validar faixa de faturamento
    if (config.filtros.faixa_faturamento.min !== null && 
        config.filtros.faixa_faturamento.max !== null) {
      if (config.filtros.faixa_faturamento.min > config.filtros.faixa_faturamento.max) {
        errors.push('Faturamento mínimo deve ser menor que o máximo')
      }
    }

    // Validar compliance score
    if (config.filtros.compliance_score.min !== null && 
        config.filtros.compliance_score.max !== null) {
      if (config.filtros.compliance_score.min > config.filtros.compliance_score.max) {
        errors.push('Score de compliance mínimo deve ser menor que o máximo')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }, [])

  // Função para estimar tamanho da exportação
  const estimateExportSize = useCallback(async (config: ExportConfig): Promise<{
    total_registros: number
    tamanho_estimado_kb: number
  }> => {
    try {
      const { data, error } = await supabase.functions.invoke('data-export-service', {
        body: {
          user_id: user?.id,
          config,
          operation: 'estimate'
        }
      })

      if (error) throw error

      return {
        total_registros: data.total_registros || 0,
        tamanho_estimado_kb: data.tamanho_estimado_kb || 0
      }
    } catch (error) {
      logger.error('Erro ao estimar tamanho da exportação:', error)
      return {
        total_registros: 0,
        tamanho_estimado_kb: 0
      }
    }
  }, [user?.id])

  // Função para obter templates de exportação
  const getExportTemplates = useCallback(() => {
    return [
      {
        id: 'empresas_completo',
        nome: 'Empresas - Dados Completos',
        descricao: 'Todos os dados das empresas com métricas e compliance',
        config: {
          tipo_dados: 'empresas' as const,
          campos: {
            dados_empresa: true,
            metricas_financeiras: true,
            dados_documentos: true,
            analise_compliance: true,
            insights_ia: true,
            dados_mensais: false,
            comparativos: false
          },
          agrupamento: {
            por_empresa: true,
            por_regime: false,
            por_mes: false,
            por_tipo_documento: false,
            por_status: false
          }
        }
      },
      {
        id: 'metricas_financeiras',
        nome: 'Métricas Financeiras',
        descricao: 'Foco em dados financeiros e projeções',
        config: {
          tipo_dados: 'metricas' as const,
          campos: {
            dados_empresa: true,
            metricas_financeiras: true,
            dados_documentos: false,
            analise_compliance: false,
            insights_ia: false,
            dados_mensais: true,
            comparativos: true
          },
          agrupamento: {
            por_empresa: true,
            por_regime: true,
            por_mes: true,
            por_tipo_documento: false,
            por_status: false
          }
        }
      },
      {
        id: 'compliance_report',
        nome: 'Relatório de Compliance',
        descricao: 'Análise de conformidade e riscos',
        config: {
          tipo_dados: 'compliance' as const,
          campos: {
            dados_empresa: true,
            metricas_financeiras: false,
            dados_documentos: true,
            analise_compliance: true,
            insights_ia: true,
            dados_mensais: false,
            comparativos: false
          },
          agrupamento: {
            por_empresa: true,
            por_regime: true,
            por_mes: false,
            por_tipo_documento: true,
            por_status: true
          }
        }
      }
    ]
  }, [])

  return {
    // Dados
    historicoExportacoes: historicoExportacoes || [],
    exportProgress: Array.from(exportProgress.entries()),
    templates: getExportTemplates(),

    // Estados
    isExporting: exportDataMutation.isPending,
    loadingHistorico,

    // Ações
    exportData: exportDataMutation.mutate,
    downloadExport,
    validateConfig,
    estimateExportSize,
    updateProgress,

    // Utilitários
    clearProgress: () => setExportProgress(new Map()),
    formatFileSize: (sizeKB: number) => {
      if (sizeKB < 1024) {
        return `${sizeKB} KB`
      }
      return `${(sizeKB / 1024).toFixed(1)} MB`
    }
  }
}

/**
 * Buscar histórico de exportações do usuário
 */
async function fetchExportHistory(userId: string): Promise<ExportHistory[]> {
  try {
    const { data, error } = await supabase
      .from('data_exports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return data?.map(item => ({
      id: item.id,
      nome_arquivo: item.nome_arquivo,
      formato: item.formato,
      tamanho_arquivo: item.tamanho_arquivo,
      total_registros: item.total_registros,
      config_utilizada: item.config || {},
      data_exportacao: item.created_at,
      status: item.status,
      arquivo_url: item.arquivo_url
    })) || []

  } catch (error) {
    logger.error('Erro ao buscar histórico de exportações:', error)
    return []
  }
}

/**
 * Exportar dados via Edge Function
 */
async function exportData(config: ExportConfig, userId: string): Promise<ExportResult> {
  try {
    const { data, error } = await supabase.functions.invoke('data-export-service', {
      body: {
        user_id: userId,
        config,
        operation: 'export'
      }
    })

    if (error) throw error

    return {
      arquivo_url: data.arquivo_url,
      nome_arquivo: data.nome_arquivo,
      tamanho_arquivo: data.tamanho_arquivo,
      total_registros: data.total_registros,
      formato: config.formato,
      data_exportacao: new Date().toISOString()
    }

  } catch (error) {
    logger.error('Erro ao exportar dados:', error)
    throw error
  }
}

/**
 * Hook para exportação rápida com templates
 */
export function useQuickExport() {
  const { exportData, templates } = useDataExport()

  const exportWithTemplate = useCallback(async (
    templateId: string, 
    empresaIds: string[], 
    formato: 'excel' | 'csv' | 'json' = 'excel'
  ) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) {
      toast.error('Template não encontrado')
      return
    }

    const config: ExportConfig = {
      formato,
      ...template.config,
      periodo: {
        inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        fim: new Date()
      },
      filtros: {
        empresas_selecionadas: empresaIds,
        regimes_tributarios: [],
        status_documentos: [],
        tipos_documento: [],
        faixa_faturamento: { min: null, max: null },
        compliance_score: { min: null, max: null }
      },
      opcoes: {
        incluir_cabecalhos: true,
        incluir_totalizadores: true,
        incluir_graficos: false,
        incluir_metadados: true,
        compactar_arquivo: false
      }
    }

    exportData(config)
  }, [exportData, templates])

  return {
    templates,
    exportWithTemplate
  }
}
