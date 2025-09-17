import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SimulacaoInput {
  empresa_id: string;
  cenarios: {
    nome: string;
    faturamento_mensal: number;
    regime_tributario: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
    anexo_simples?: 'I' | 'II' | 'III' | 'IV' | 'V';
    atividade_principal?: string;
    periodo_simulacao: number; // meses
  }[];
}

interface SimulacaoResult {
  cenarios_comparados: CenarioResult[];
  melhor_opcao: {
    cenario: string;
    economia_anual: number;
    percentual_economia: number;
  };
  recomendacoes: string[];
  projecoes_anuais: {
    cenario: string;
    impostos_totais: number;
    carga_tributaria: number;
    economia_vs_atual: number;
  }[];
}

interface CenarioResult {
  nome: string;
  regime: string;
  impostos_mensais: number;
  impostos_anuais: number;
  carga_tributaria: number;
  breakdown: {
    das?: number;
    irpj?: number;
    csll?: number;
    pis?: number;
    cofins?: number;
    cpp?: number;
    icms?: number;
    iss?: number;
  };
}

export function useSimuladorTributario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SimulacaoInput): Promise<SimulacaoResult> => {
      const { data, error } = await supabase.functions.invoke('simulador-tributario', {
        body: input,
      });

      if (error) {
        throw new Error(error.message || 'Erro na simulação tributária');
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success('Simulação concluída com sucesso!', {
        description: `Melhor opção: ${data.melhor_opcao.cenario} (${data.melhor_opcao.percentual_economia.toFixed(1)}% de economia)`
      });

      // Cache do resultado
      queryClient.setQueryData(['simulacao-resultado'], data);
    },
    onError: (error: Error) => {

      toast.error('Erro na simulação', {
        description: error.message || 'Não foi possível realizar a simulação'
      });
    },
  });
}

export function useSimulacaoRapida() {
  return {
    simularRegimeAtual: async (empresa_id: string, faturamento_mensal: number) => {
      // Buscar dados da empresa
      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('regime_tributario, atividade_principal')
        .eq('id', empresa_id)
        .single();

      if (error || !empresa) {
        throw new Error('Empresa não encontrada');
      }

      const faturamentoAnual = faturamento_mensal * 12;
      let impostosMensais = 0;

      switch (empresa.regime_tributario) {
        case 'simples':
          // Simular DAS - usar anexo I como padrão
          if (faturamentoAnual <= 4800000) {
            const aliquota = calcularAliquotaSimples(faturamentoAnual, 'I');
            impostosMensais = faturamento_mensal * (aliquota / 100);
          }
          break;

        case 'lucro_presumido':
          // Simular Lucro Presumido
          const percentualPresuncao = empresa.atividade_principal?.includes('serviço') ? 0.32 : 0.08;
          const baseCalculo = faturamento_mensal * percentualPresuncao;
          const irpj = baseCalculo * 0.15;
          const csll = baseCalculo * 0.09;
          const pis = faturamento_mensal * 0.0065;
          const cofins = faturamento_mensal * 0.03;
          impostosMensais = irpj + csll + pis + cofins;
          break;

        case 'lucro_real':
          // Simular Lucro Real (estimativa)
          const margemLucro = 0.10; // 10% de margem estimada
          const lucroReal = faturamento_mensal * margemLucro;
          const irpjReal = lucroReal * 0.15;
          const csllReal = lucroReal * 0.09;
          const pisReal = faturamento_mensal * 0.0165;
          const cofinsReal = faturamento_mensal * 0.076;
          impostosMensais = irpjReal + csllReal + pisReal + cofinsReal;
          break;
      }

      const impostosAnuais = impostosMensais * 12;
      const cargaTributaria = faturamentoAnual > 0 ? (impostosAnuais / faturamentoAnual) * 100 : 0;

      return {
        regime: empresa.regime_tributario,
        impostos_mensais: impostosMensais,
        impostos_anuais: impostosAnuais,
        carga_tributaria: cargaTributaria,
        faturamento_anual: faturamentoAnual
      };
    },

    compararRegimes: (faturamento_mensal: number, atividade: string = '') => {
      const faturamentoAnual = faturamento_mensal * 12;
      const resultados = [];

      // Simples Nacional (Anexo I)
      if (faturamentoAnual <= 4800000) {
        const aliquotaSimples = calcularAliquotaSimples(faturamentoAnual, 'I');
        const impostoSimples = faturamento_mensal * (aliquotaSimples / 100);
        resultados.push({
          regime: 'Simples Nacional',
          impostos_mensais: impostoSimples,
          impostos_anuais: impostoSimples * 12,
          carga_tributaria: aliquotaSimples,
          viavel: true
        });
      }

      // Lucro Presumido
      const percentualPresuncao = atividade.toLowerCase().includes('serviço') ? 0.32 : 0.08;
      const baseCalculoLP = faturamento_mensal * percentualPresuncao;
      const irpjLP = baseCalculoLP * 0.15;
      const csllLP = baseCalculoLP * 0.09;
      const pisLP = faturamento_mensal * 0.0065;
      const cofinsLP = faturamento_mensal * 0.03;
      const totalLP = irpjLP + csllLP + pisLP + cofinsLP;
      
      resultados.push({
        regime: 'Lucro Presumido',
        impostos_mensais: totalLP,
        impostos_anuais: totalLP * 12,
        carga_tributaria: (totalLP * 12 / faturamentoAnual) * 100,
        viavel: faturamentoAnual <= 78000000
      });

      // Lucro Real
      const margemLucro = 0.10;
      const lucroReal = faturamento_mensal * margemLucro;
      const irpjLR = lucroReal * 0.15;
      const csllLR = lucroReal * 0.09;
      const pisLR = faturamento_mensal * 0.0165;
      const cofinsLR = faturamento_mensal * 0.076;
      const totalLR = irpjLR + csllLR + pisLR + cofinsLR;

      resultados.push({
        regime: 'Lucro Real',
        impostos_mensais: totalLR,
        impostos_anuais: totalLR * 12,
        carga_tributaria: (totalLR * 12 / faturamentoAnual) * 100,
        viavel: true
      });

      // Ordenar por menor carga tributária
      return resultados
        .filter(r => r.viavel)
        .sort((a, b) => a.carga_tributaria - b.carga_tributaria);
    }
  };
}

function calcularAliquotaSimples(faturamentoAnual: number, anexo: string): number {
  const tabelas = {
    'I': [
      { ate: 180000, aliquota: 4.0 },
      { ate: 360000, aliquota: 7.3 },
      { ate: 720000, aliquota: 9.5 },
      { ate: 1800000, aliquota: 10.7 },
      { ate: 3600000, aliquota: 14.3 },
      { ate: 4800000, aliquota: 19.0 },
    ],
    'II': [
      { ate: 180000, aliquota: 4.5 },
      { ate: 360000, aliquota: 7.8 },
      { ate: 720000, aliquota: 10.0 },
      { ate: 1800000, aliquota: 11.2 },
      { ate: 3600000, aliquota: 14.8 },
      { ate: 4800000, aliquota: 30.0 },
    ],
    'III': [
      { ate: 180000, aliquota: 6.0 },
      { ate: 360000, aliquota: 9.0 },
      { ate: 720000, aliquota: 10.2 },
      { ate: 1800000, aliquota: 14.0 },
      { ate: 3600000, aliquota: 22.0 },
      { ate: 4800000, aliquota: 33.0 },
    ]
  };

  const tabela = tabelas[anexo as keyof typeof tabelas] || tabelas['I'];
  const faixa = tabela.find(f => faturamentoAnual <= f.ate);
  return faixa?.aliquota || 19.0;
}

export function useHistoricoSimulacoes(empresa_id?: string) {
  return useQuery({
    queryKey: ['historico-simulacoes', empresa_id],
    queryFn: async () => {
      // Em produção, buscar do banco de dados
      // Por enquanto, retornar dados simulados
      return [
        {
          id: '1',
          data_simulacao: '2025-01-10',
          empresa_id: empresa_id,
          cenarios_testados: 3,
          melhor_opcao: 'Simples Nacional',
          economia_identificada: 15000,
          status: 'concluida'
        }
      ];
    },
    enabled: !!empresa_id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useRecomendacoesIA(empresa_id: string) {
  return useQuery({
    queryKey: ['recomendacoes-ia', empresa_id],
    queryFn: async () => {
      // Buscar dados da empresa e histórico de cálculos
      const { data: empresa } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', empresa_id)
        .single();

      const { data: calculos } = await supabase
        .from('calculos_fiscais')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('competencia', { ascending: false })
        .limit(12);

      if (!empresa || !calculos) {
        return [];
      }

      const recomendacoes = [];

      // Análise de carga tributária
      const cargaMedia = calculos.reduce((sum, calc) => {
        const carga = calc.faturamento_bruto > 0 ? (calc.valor_total / calc.faturamento_bruto) * 100 : 0;
        return sum + carga;
      }, 0) / calculos.length;

      if (cargaMedia > 15) {
        recomendacoes.push({
          tipo: 'otimizacao',
          prioridade: 'alta',
          titulo: 'Carga tributária elevada',
          descricao: `Sua carga tributária média é de ${cargaMedia.toFixed(1)}%. Considere uma simulação de mudança de regime.`,
          acao: 'Simular outros regimes tributários'
        });
      }

      // Análise de crescimento
      if (calculos.length >= 6) {
        const primeiros6 = calculos.slice(-6);
        const ultimos6 = calculos.slice(0, 6);
        const crescimento = ((ultimos6.reduce((s, c) => s + c.faturamento_bruto, 0) - 
                            primeiros6.reduce((s, c) => s + c.faturamento_bruto, 0)) / 
                            primeiros6.reduce((s, c) => s + c.faturamento_bruto, 0)) * 100;

        if (crescimento > 20) {
          recomendacoes.push({
            tipo: 'planejamento',
            prioridade: 'media',
            titulo: 'Crescimento acelerado detectado',
            descricao: `Seu faturamento cresceu ${crescimento.toFixed(1)}% nos últimos 6 meses. Planeje-se para possíveis mudanças de faixa tributária.`,
            acao: 'Revisar projeções fiscais'
          });
        }
      }

      // Análise de vencimentos
      const hoje = new Date();
      const vencimentosProximos = calculos.filter(calc => {
        const vencimento = new Date(calc.data_vencimento);
        const diasRestantes = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diasRestantes <= 30 && diasRestantes > 0 && calc.status !== 'pago';
      });

      if (vencimentosProximos.length > 0) {
        recomendacoes.push({
          tipo: 'alerta',
          prioridade: 'alta',
          titulo: 'Vencimentos próximos',
          descricao: `Você tem ${vencimentosProximos.length} impostos vencendo nos próximos 30 dias.`,
          acao: 'Verificar agenda fiscal'
        });
      }

      return recomendacoes;
    },
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
}

export function useSalvarSimulacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (simulacao: {
      empresa_id: string;
      nome: string;
      cenarios: any[];
      resultado: SimulacaoResult;
    }) => {
      // Em produção, salvar no banco de dados
      const simulacaoSalva = {
        id: Date.now().toString(),
        ...simulacao,
        data_criacao: new Date().toISOString(),
        status: 'salva'
      };

      return simulacaoSalva;
    },
    onSuccess: () => {
      toast.success('Simulação salva com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['historico-simulacoes'] });
    },
    onError: (error: Error) => {

      toast.error('Erro ao salvar simulação', {
        description: error.message
      });
    },
  });
}
