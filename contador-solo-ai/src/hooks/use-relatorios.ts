import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { relatoriosService, type FiltrosRelatorio } from '@/services/simple-relatorios';

interface GuiaPDFInput {
  calculo_id: string;
  tipo_guia: 'DAS' | 'DARF' | 'GPS';
  template?: 'oficial' | 'personalizado';
}

interface GuiaPDFResult {
  pdf_url: string;
  codigo_barras: string;
  linha_digitavel: string;
  data_vencimento: string;
  valor_total: number;
}

export function useGerarGuiaPDF() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GuiaPDFInput): Promise<GuiaPDFResult> => {
      const { data, error } = await supabase.functions.invoke('gerar-guia-pdf', {
        body: input,
      });

      if (error) {
        throw new Error(error.message || 'Erro na geração do PDF');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('PDF gerado com sucesso!', {
        description: `Guia ${variables.tipo_guia} pronta para download`,
        action: {
          label: 'Baixar',
          onClick: () => window.open(data.pdf_url, '_blank')
        }
      });

      // Invalidar cache de relatórios
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
    },
    onError: (error: Error) => {
      toast.error('Erro na geração do PDF', {
        description: error.message || 'Não foi possível gerar o PDF da guia'
      });
    },
  });
}

export function useDownloadPDF() {
  return {
    downloadPDF: async (url: string, filename: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Erro ao baixar o arquivo');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(downloadUrl);

        toast.success('Download concluído!', {
          description: `Arquivo ${filename} baixado com sucesso`
        });
      } catch (error) {
        toast.error('Erro no download', {
          description: 'Não foi possível baixar o arquivo'
        });
      }
    },

    previewPDF: (url: string) => {
      window.open(url, '_blank');
    }
  };
}

export function useRelatoriosHistorico(user_id: string, empresa_id?: string) {
  return useQuery({
    queryKey: ['relatorios-historico', user_id, empresa_id],
    queryFn: async () => {
      if (empresa_id) {
        // Buscar histórico de cálculos específicos da empresa
        const filtros: FiltrosRelatorio = {
          empresa_id: empresa_id || '',
          data_inicio: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 dias atrás
          data_fim: new Date().toISOString().split('T')[0]
        };

        return await relatoriosService.getDadosConsolidado(filtros);
      } else {
        // Buscar histórico de relatórios gerados
        return await relatoriosService.getHistorico(user_id);
      }
    },
    enabled: !!user_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useGerarRelatorioConsolidado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      template_id?: string;
      empresa_id?: string;
      data_inicio: string;
      data_fim: string;
      tipos_calculo?: string[];
      formato: 'PDF' | 'EXCEL';
      user_id: string;
    }) => {
      const filtros: FiltrosRelatorio = {
        empresa_id: params.empresa_id,
        data_inicio: params.data_inicio,
        data_fim: params.data_fim,
        status: params.tipos_calculo
      };

      if (params.formato === 'EXCEL') {
        // Buscar dados e exportar
        const dados = await relatoriosService.getDadosConsolidado(filtros);
        const nomeArquivo = `relatorio-consolidado-${params.data_inicio}-${params.data_fim}`;
        const exportResult = relatoriosService.exportarCSV(dados, nomeArquivo);

        return {
          csv: exportResult.csv,
          filename: exportResult.filename,
          dados,
          total_registros: dados.length
        };
      } else {
        // Para PDF, usar dados consolidados básicos
        const dados = await relatoriosService.getDadosConsolidado(filtros);
        return {
          dados,
          total_registros: dados.length
        };
      }
    },
    onSuccess: (data, variables) => {
      const isExcel = variables.formato === 'EXCEL';
      toast.success('Relatório gerado com sucesso!', {
        description: isExcel ? 'Arquivo CSV gerado' : 'Dados consolidados prontos',
        action: isExcel ? {
          label: 'Baixar',
          onClick: () => {
            const blob = new Blob([(data as any).csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = (data as any).filename;
            link.click();
            window.URL.revokeObjectURL(url);
          }
        } : undefined
      });

      // Invalidar cache de relatórios
      queryClient.invalidateQueries({ queryKey: ['relatorios-historico'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar relatório', {
        description: error.message
      });
    },
  });
}

export function useExportarDados() {
  return {
    exportarCSV: (dados: any[], filename: string) => {
      try {
        if (!dados || dados.length === 0) {
          toast.error('Nenhum dado para exportar');
          return;
        }

        const result = relatoriosService.exportarCSV(dados, filename);

        // Criar e baixar arquivo
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', result.filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Dados exportados com sucesso!', {
          description: `Arquivo ${result.filename} baixado`
        });
      } catch (error) {
        toast.error('Erro na exportação', {
          description: 'Não foi possível exportar os dados'
        });
      }
    },

    exportarJSON: (dados: any[], filename: string) => {
      try {
        const jsonContent = JSON.stringify(dados, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.json`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Dados exportados com sucesso!', {
          description: `Arquivo ${filename}.json baixado`
        });
      } catch (error) {
        toast.error('Erro na exportação', {
          description: 'Não foi possível exportar os dados'
        });
      }
    }
  };
}

export function useTemplatesRelatorio() {
  return useQuery({
    queryKey: ['templates-relatorio'],
    queryFn: async () => {
      return relatoriosService.getTemplates();
    },
    staleTime: 60 * 60 * 1000, // 1 hora
  });
}

// Hook simplificado para dashboard stats
export function useDashboardStats(user_id: string) {
  return useQuery({
    queryKey: ['dashboard-stats', user_id],
    queryFn: () => relatoriosService.getDashboardStats(user_id),
    enabled: !!user_id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}