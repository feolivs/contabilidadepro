import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AnalyticsInput {
  periodo: 'mensal' | 'trimestral' | 'anual';
  empresa_id?: string;
  tipo_analise: 'evolucao_fiscal' | 'comparacao_impostos' | 'alertas_vencimento' | 'performance_tributaria';
  data_inicio?: string;
  data_fim?: string;
}

interface DadosAnalytics {
  receita: number;
  impostos: number;
  economia: number;
  mes: string;
}

interface GraficoItem {
  label: string;
  value: number;
  color?: string;
}

interface AnalyticsResult {
  tipo: string;
  periodo: string;
  dados: DadosAnalytics;
  metricas: {
    total_impostos: number;
    economia_potencial: number;
    alertas_pendentes: number;
    performance_score: number;
  };
  graficos: {
    evolucao_mensal: GraficoItem[];
    distribuicao_impostos: GraficoItem[];
    comparacao_regimes: GraficoItem[];
  };
}

export function useDashboardAnalytics(params: AnalyticsInput) {
  return useQuery({
    queryKey: ['dashboard-analytics', params],
    queryFn: async (): Promise<AnalyticsResult> => {
      const { data, error } = await supabase.functions.invoke('dashboard-analytics', {
        body: params,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar analytics');
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !!params.tipo_analise && !!params.periodo,
  });
}

export function useEvolucaoFiscal(empresa_id?: string, periodo: 'mensal' | 'trimestral' | 'anual' = 'mensal') {
  return useDashboardAnalytics({
    periodo,
    empresa_id,
    tipo_analise: 'evolucao_fiscal'
  });
}

export function useComparacaoImpostos(empresa_id?: string, periodo: 'mensal' | 'trimestral' | 'anual' = 'mensal') {
  return useDashboardAnalytics({
    periodo,
    empresa_id,
    tipo_analise: 'comparacao_impostos'
  });
}

export function useAlertasVencimento(empresa_id?: string) {
  return useDashboardAnalytics({
    periodo: 'mensal',
    empresa_id,
    tipo_analise: 'alertas_vencimento'
  });
}

export function usePerformanceTributaria(empresa_id?: string, periodo: 'mensal' | 'trimestral' | 'anual' = 'anual') {
  return useDashboardAnalytics({
    periodo,
    empresa_id,
    tipo_analise: 'performance_tributaria'
  });
}

export function useMetricasGerais(empresa_id?: string) {
  return useQuery({
    queryKey: ['metricas-gerais', empresa_id],
    queryFn: async () => {
      let query = supabase
        .from('calculos_fiscais')
        .select('*');

      if (empresa_id) {
        query = query.eq('empresa_id', empresa_id);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar métricas: ${error.message}`);
      }

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioAno = new Date(hoje.getFullYear(), 0, 1);

      const calculosMes = data?.filter(c => new Date(c.competencia) >= inicioMes) || [];
      const calculosAno = data?.filter(c => new Date(c.competencia) >= inicioAno) || [];

      const totalImpostosMes = calculosMes.reduce((sum, calc) => sum + (calc.valor_total || 0), 0);
      const totalImpostosAno = calculosAno.reduce((sum, calc) => sum + (calc.valor_total || 0), 0);

      const pendentes = data?.filter(c => c.status === 'calculado').length || 0;
      const vencidos = data?.filter(c => {
        const vencimento = new Date(c.data_vencimento);
        return vencimento < hoje && c.status !== 'pago';
      }).length || 0;

      return {
        total_calculos: data?.length || 0,
        total_impostos_mes: totalImpostosMes,
        total_impostos_ano: totalImpostosAno,
        pendentes,
        vencidos,
        pagos: data?.filter(c => c.status === 'pago').length || 0,
        economia_estimada: totalImpostosAno * 0.15, // 15% de economia estimada
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

export function useGraficosPersonalizados() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      tipo_grafico: 'linha' | 'barra' | 'pizza' | 'area';
      dados_fonte: 'calculos_fiscais' | 'empresas' | 'lancamentos_contabeis';
      filtros: Record<string, any>;
      agrupamento: 'mes' | 'trimestre' | 'ano' | 'empresa' | 'tipo_calculo';
      metricas: string[];
    }) => {
      // Buscar dados baseado na configuração
      let query = supabase.from(config.dados_fonte).select('*');

      // Aplicar filtros
      Object.entries(config.filtros).forEach(([campo, valor]) => {
        if (valor !== undefined && valor !== null && valor !== '') {
          query = query.eq(campo, valor);
        }
      });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar dados: ${error.message}`);
      }

      // Processar dados baseado no agrupamento
      const dadosProcessados = processarDadosGrafico(data || [], config);

      return {
        tipo: config.tipo_grafico,
        dados: dadosProcessados,
        config: config
      };
    },
    onSuccess: () => {
      toast.success('Gráfico personalizado gerado com sucesso!');
    },
    onError: (error: Error) => {

      toast.error('Erro ao gerar gráfico', {
        description: error.message
      });
    },
  });
}

function processarDadosGrafico(dados: any[], config: any) {
  const agrupados = dados.reduce((acc, item) => {
    let chave: string;

    switch (config.agrupamento) {
      case 'mes':
        const data = new Date(item.competencia || item.created_at);
        chave = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case 'trimestre':
        const dataT = new Date(item.competencia || item.created_at);
        chave = `${dataT.getFullYear()}-T${Math.ceil((dataT.getMonth() + 1) / 3)}`;
        break;
      case 'ano':
        const dataA = new Date(item.competencia || item.created_at);
        chave = dataA.getFullYear().toString();
        break;
      case 'empresa':
        chave = item.empresa_id || 'Sem empresa';
        break;
      case 'tipo_calculo':
        chave = item.tipo_calculo || 'Sem tipo';
        break;
      default:
        chave = 'Geral';
    }

    if (!acc[chave]) {
      acc[chave] = { chave, valores: {} };
      config.metricas.forEach((metrica: string) => {
        acc[chave].valores[metrica] = 0;
      });
    }

    config.metricas.forEach((metrica: string) => {
      const valor = item[metrica] || 0;
      acc[chave].valores[metrica] += typeof valor === 'number' ? valor : 0;
    });

    return acc;
  }, {});

  return Object.values(agrupados);
}

export function useComparacaoPerformance(empresas_ids: string[], periodo: string = 'anual') {
  return useQuery({
    queryKey: ['comparacao-performance', empresas_ids, periodo],
    queryFn: async () => {
      if (!empresas_ids || empresas_ids.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('calculos_fiscais')
        .select(`
          *,
          empresas!inner(nome, cnpj, regime_tributario)
        `)
        .in('empresa_id', empresas_ids);

      if (error) {
        throw new Error(`Erro ao buscar dados de comparação: ${error.message}`);
      }

      // Agrupar por empresa e calcular métricas
      const porEmpresa = data?.reduce((acc, calc) => {
        const empresaId = calc.empresa_id;
        if (!acc[empresaId]) {
          acc[empresaId] = {
            empresa: calc.empresas,
            total_impostos: 0,
            total_faturamento: 0,
            quantidade_calculos: 0,
            carga_tributaria: 0,
            calculos: []
          };
        }

        acc[empresaId].total_impostos += calc.valor_total || 0;
        acc[empresaId].total_faturamento += calc.faturamento_bruto || 0;
        acc[empresaId].quantidade_calculos += 1;
        acc[empresaId].calculos.push(calc);

        return acc;
      }, {} as Record<string, any>) || {};

      // Calcular carga tributária para cada empresa
      Object.values(porEmpresa).forEach((empresa: any) => {
        empresa.carga_tributaria = empresa.total_faturamento > 0 
          ? (empresa.total_impostos / empresa.total_faturamento) * 100 
          : 0;
      });

      return Object.values(porEmpresa);
    },
    enabled: empresas_ids && empresas_ids.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useTendenciasFiscais(periodo: number = 12) {
  return useQuery({
    queryKey: ['tendencias-fiscais', periodo],
    queryFn: async () => {
      const dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() - periodo);

      const { data, error } = await supabase
        .from('calculos_fiscais')
        .select('*')
        .gte('competencia', dataInicio.toISOString().split('T')[0])
        .order('competencia', { ascending: true });

      if (error) {
        throw new Error(`Erro ao buscar tendências: ${error.message}`);
      }

      // Agrupar por mês e calcular tendências
      const porMes = data?.reduce((acc, calc) => {
        const mes = calc.competencia.substring(0, 7); // YYYY-MM
        if (!acc[mes]) {
          acc[mes] = {
            mes,
            total_impostos: 0,
            total_faturamento: 0,
            quantidade: 0
          };
        }

        acc[mes].total_impostos += calc.valor_total || 0;
        acc[mes].total_faturamento += calc.faturamento_bruto || 0;
        acc[mes].quantidade += 1;

        return acc;
      }, {} as Record<string, any>) || {};

      const dadosOrdenados = Object.values(porMes).sort((a: any, b: any) => 
        a.mes.localeCompare(b.mes)
      );

      // Calcular tendências (crescimento mês a mês)
      const tendencias = dadosOrdenados.map((item: any, index) => {
        const anterior = dadosOrdenados[index - 1] as any;
        const crescimentoImpostos = anterior
          ? (((item.total_impostos || 0) - (anterior.total_impostos || 0)) / (anterior.total_impostos || 1)) * 100
          : 0;
        const crescimentoFaturamento = anterior
          ? (((item.total_faturamento || 0) - (anterior.total_faturamento || 0)) / (anterior.total_faturamento || 1)) * 100
          : 0;

        return {
          ...item,
          crescimento_impostos: crescimentoImpostos,
          crescimento_faturamento: crescimentoFaturamento,
          carga_tributaria: item.total_faturamento > 0 
            ? (item.total_impostos / item.total_faturamento) * 100 
            : 0
        };
      });

      return tendencias;
    },
    staleTime: 15 * 60 * 1000, // 15 minutos
  });
}
