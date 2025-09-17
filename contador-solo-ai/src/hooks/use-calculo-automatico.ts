import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DadosCalculoIRPJ {
  empresa_id: string;
  competencia: string;
  receita_bruta: number;
  faturamento_trimestral: number;
  atividade_principal: string;
  percentual_presuncao: number;
  aliquota_irpj: number;
}

interface DASCalculationInput {
  empresa_id: string;
  competencia: string; // YYYY-MM format
  faturamento_bruto: number;
  faturamento_12_meses: number;
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V';
  deducoes?: number;
}

interface DASCalculationResult {
  valor_das: number;
  aliquota_nominal: number;
  aliquota_efetiva: number;
  base_calculo: number;
  valor_deducao: number;
  breakdown: {
    irpj: number;
    csll: number;
    pis: number;
    cofins: number;
    cpp: number;
    icms: number;
    iss: number;
  };
  data_vencimento: string;
  codigo_barras: string;
  linha_digitavel: string;
}

// Tabelas do Simples Nacional 2024
const TABELAS_SIMPLES_2024 = {
  'I': [
    { ate: 180000, aliquota: 4.0, deducao: 0 },
    { ate: 360000, aliquota: 7.3, deducao: 5940 },
    { ate: 720000, aliquota: 9.5, deducao: 13860 },
    { ate: 1800000, aliquota: 10.7, deducao: 22500 },
    { ate: 3600000, aliquota: 14.3, deducao: 87300 },
    { ate: 4800000, aliquota: 19.0, deducao: 378000 },
  ],
  'II': [
    { ate: 180000, aliquota: 4.5, deducao: 0 },
    { ate: 360000, aliquota: 7.8, deducao: 5940 },
    { ate: 720000, aliquota: 10.0, deducao: 13860 },
    { ate: 1800000, aliquota: 11.2, deducao: 22500 },
    { ate: 3600000, aliquota: 14.8, deducao: 85500 },
    { ate: 4800000, aliquota: 30.0, deducao: 720000 },
  ],
  'III': [
    { ate: 180000, aliquota: 6.0, deducao: 0 },
    { ate: 360000, aliquota: 9.0, deducao: 5400 },
    { ate: 720000, aliquota: 10.2, deducao: 9360 },
    { ate: 1800000, aliquota: 14.0, deducao: 17640 },
    { ate: 3600000, aliquota: 22.0, deducao: 35640 },
    { ate: 4800000, aliquota: 33.0, deducao: 125640 },
  ],
  'IV': [
    { ate: 180000, aliquota: 4.5, deducao: 0 },
    { ate: 360000, aliquota: 9.0, deducao: 8100 },
    { ate: 720000, aliquota: 10.2, deducao: 12420 },
    { ate: 1800000, aliquota: 14.0, deducao: 39780 },
    { ate: 3600000, aliquota: 22.0, deducao: 183780 },
    { ate: 4800000, aliquota: 33.0, deducao: 828000 },
  ],
  'V': [
    { ate: 180000, aliquota: 15.5, deducao: 0 },
    { ate: 360000, aliquota: 18.0, deducao: 4500 },
    { ate: 720000, aliquota: 19.5, deducao: 9900 },
    { ate: 1800000, aliquota: 20.5, deducao: 17100 },
    { ate: 3600000, aliquota: 23.0, deducao: 62100 },
    { ate: 4800000, aliquota: 30.5, deducao: 540000 },
  ],
};

// Função de cálculo local do DAS
async function calcularDASLocal(input: DASCalculationInput): Promise<DASCalculationResult> {
  try {
    // Validações básicas
    if (!input.empresa_id || !input.competencia || !input.faturamento_bruto || !input.faturamento_12_meses || !input.anexo) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    if (input.faturamento_12_meses > 4800000) {
      throw new Error('Faturamento excede limite do Simples Nacional (R$ 4.800.000)');
    }

    // Buscar tabela do anexo
    const tabela = TABELAS_SIMPLES_2024[input.anexo];
    if (!tabela) {
      throw new Error(`Anexo ${input.anexo} inválido`);
    }

    // Encontrar faixa baseada no faturamento dos últimos 12 meses
    const faixa = tabela.find(f => input.faturamento_12_meses <= f.ate);
    if (!faixa) {
      throw new Error('Faturamento excede limite do Simples Nacional');
    }

    // Calcular alíquota efetiva
    const aliquotaEfetiva = input.faturamento_12_meses > 0
      ? ((input.faturamento_12_meses * faixa.aliquota / 100) - faixa.deducao) / input.faturamento_12_meses * 100
      : faixa.aliquota;

    // Calcular base de cálculo (faturamento bruto menos deduções)
    const baseCalculo = input.faturamento_bruto - (input.deducoes || 0);

    // Calcular valor do DAS
    const valorDAS = Math.round(baseCalculo * (aliquotaEfetiva / 100) * 100) / 100;

    // Calcular data de vencimento (dia 20 do mês seguinte)
    const [ano, mes] = input.competencia.split('-').map(Number);
    const proximoMes = (mes || 1) === 12 ? 1 : (mes || 1) + 1;
    const proximoAno = (mes || 1) === 12 ? (ano || new Date().getFullYear()) + 1 : (ano || new Date().getFullYear());
    const dataVencimento = `${proximoAno}-${proximoMes.toString().padStart(2, '0')}-20`;

    // Gerar código de barras simulado
    const codigoBarras = `85800000000${Math.floor(valorDAS * 100).toString().padStart(11, '0')}${Date.now().toString().slice(-4)}`;

    // Gerar linha digitável simulada
    const linhaDigitavel = codigoBarras.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d{1})(\d{14})/,
      '$1.$2 $3.$4 $5.$6 $7 $8');

    // Calcular breakdown por tributo (percentuais aproximados)
    const breakdown = {
      irpj: Math.round(valorDAS * 0.05 * 100) / 100, // ~5%
      csll: Math.round(valorDAS * 0.03 * 100) / 100, // ~3%
      pis: Math.round(valorDAS * 0.02 * 100) / 100, // ~2%
      cofins: Math.round(valorDAS * 0.08 * 100) / 100, // ~8%
      cpp: Math.round(valorDAS * 0.42 * 100) / 100, // ~42%
      icms: input.anexo === 'I' ? Math.round(valorDAS * 0.34 * 100) / 100 : 0, // ~34% para Anexo I
      iss: input.anexo === 'III' ? Math.round(valorDAS * 0.06 * 100) / 100 : 0, // ~6% para Anexo III
    };

    return {
      valor_das: valorDAS,
      aliquota_nominal: faixa.aliquota,
      aliquota_efetiva: Math.round(aliquotaEfetiva * 100) / 100,
      base_calculo: baseCalculo,
      valor_deducao: faixa.deducao / 12, // Dedução mensal
      breakdown,
      data_vencimento: dataVencimento,
      codigo_barras: codigoBarras,
      linha_digitavel: linhaDigitavel,
    };
  } catch (error) {

    throw new Error(`Erro no cálculo local: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

export function useCalculoDASAutomatico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DASCalculationInput): Promise<DASCalculationResult> => {
      try {
        // Primeiro tenta usar a Edge Function
        const { data, error } = await supabase.functions.invoke('calculate-das-service', {
          body: input,
        });

        if (!error && data) {
          return data;
        }

        // Se a Edge Function falhar, usa cálculo local

        return await calcularDASLocal(input);
      } catch (error) {
        // Fallback para cálculo local

        return await calcularDASLocal(input);
      }
    },
    onSuccess: (data, variables) => {
      toast.success('Cálculo DAS realizado com sucesso!', {
        description: `Valor calculado: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(data.valor_das)}`
      });

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['calculos'] });
      queryClient.invalidateQueries({ queryKey: ['calculos-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calculos', variables.empresa_id] });
    },
    onError: (error: Error) => {

      toast.error('Erro no cálculo automático', {
        description: error.message || 'Não foi possível realizar o cálculo do DAS'
      });
    },
  });
}

export function useCalculoIRPJAutomatico() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      empresa_id: string;
      competencia: string;
      faturamento_trimestral: number;
      atividade_principal: string;
      percentual_presuncao?: number;
    }) => {
      // Implementar cálculo IRPJ automático
      const baseCalculo = input.faturamento_trimestral * (input.percentual_presuncao || 0.08);
      const irpj = baseCalculo * 0.15; // 15%
      const csll = baseCalculo * 0.09; // 9%
      const total = irpj + csll;

      // Calcular data de vencimento
      const [ano, mes] = input.competencia.split('-').map(Number);
      const ultimoDiaMes = new Date(ano || new Date().getFullYear(), mes || 1, 0).getDate();
      const dataVencimento = `${ano || new Date().getFullYear()}-${(mes || 1).toString().padStart(2, '0')}-${ultimoDiaMes}`;

      return {
        valor_total: total,
        irpj,
        csll,
        base_calculo: baseCalculo,
        data_vencimento: dataVencimento,
        percentual_presuncao: input.percentual_presuncao || 0.08,
      };
    },
    onSuccess: (data) => {
      toast.success('Cálculo IRPJ realizado com sucesso!', {
        description: `Valor calculado: ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(data.valor_total)}`
      });

      queryClient.invalidateQueries({ queryKey: ['calculos'] });
      queryClient.invalidateQueries({ queryKey: ['calculos-stats'] });
    },
    onError: (error: Error) => {

      toast.error('Erro no cálculo automático', {
        description: error.message || 'Não foi possível realizar o cálculo do IRPJ'
      });
    },
  });
}

export function useValidarParametrosCalculo() {
  return {
    validarDAS: (input: Partial<DASCalculationInput>) => {
      const erros: string[] = [];

      if (!input.empresa_id) {
        erros.push('Empresa é obrigatória');
      }

      if (!input.competencia) {
        erros.push('Competência é obrigatória');
      } else if (!/^\d{4}-\d{2}$/.test(input.competencia)) {
        erros.push('Competência deve estar no formato YYYY-MM');
      }

      if (!input.faturamento_bruto || input.faturamento_bruto <= 0) {
        erros.push('Faturamento bruto deve ser maior que zero');
      }

      if (!input.faturamento_12_meses || input.faturamento_12_meses <= 0) {
        erros.push('Faturamento dos últimos 12 meses deve ser maior que zero');
      }

      if (input.faturamento_12_meses && input.faturamento_12_meses > 4800000) {
        erros.push('Faturamento excede o limite do Simples Nacional (R$ 4.800.000)');
      }

      if (!input.anexo || !['I', 'II', 'III', 'IV', 'V'].includes(input.anexo)) {
        erros.push('Anexo do Simples Nacional é obrigatório');
      }

      if (input.deducoes && input.deducoes < 0) {
        erros.push('Deduções não podem ser negativas');
      }

      if (input.deducoes && input.faturamento_bruto && input.deducoes > input.faturamento_bruto) {
        erros.push('Deduções não podem ser maiores que o faturamento bruto');
      }

      return {
        valido: erros.length === 0,
        erros
      };
    },

    validarIRPJ: (input: DadosCalculoIRPJ) => {
      const erros: string[] = [];

      if (!input.empresa_id) {
        erros.push('Empresa é obrigatória');
      }

      if (!input.competencia) {
        erros.push('Competência é obrigatória');
      }

      if (!input.faturamento_trimestral || input.faturamento_trimestral <= 0) {
        erros.push('Faturamento trimestral deve ser maior que zero');
      }

      if (!input.atividade_principal) {
        erros.push('Atividade principal é obrigatória');
      }

      return {
        valido: erros.length === 0,
        erros
      };
    }
  };
}

export function useCalculoRapido() {
  return {
    calcularDASRapido: (faturamento: number, anexo: string, faturamento12Meses: number) => {
      // Tabela simplificada para cálculo rápido
      const tabelasSimplificadas = {
        'I': [
          { ate: 180000, aliquota: 4.0, deducao: 0 },
          { ate: 360000, aliquota: 7.3, deducao: 5940 },
          { ate: 720000, aliquota: 9.5, deducao: 13860 },
          { ate: 1800000, aliquota: 10.7, deducao: 22500 },
          { ate: 3600000, aliquota: 14.3, deducao: 87300 },
          { ate: 4800000, aliquota: 19.0, deducao: 378000 },
        ],
        'II': [
          { ate: 180000, aliquota: 4.5, deducao: 0 },
          { ate: 360000, aliquota: 7.8, deducao: 5940 },
          { ate: 720000, aliquota: 10.0, deducao: 13860 },
          { ate: 1800000, aliquota: 11.2, deducao: 22500 },
          { ate: 3600000, aliquota: 14.8, deducao: 85500 },
          { ate: 4800000, aliquota: 30.0, deducao: 720000 },
        ],
        'III': [
          { ate: 180000, aliquota: 6.0, deducao: 0 },
          { ate: 360000, aliquota: 9.0, deducao: 5400 },
          { ate: 720000, aliquota: 10.2, deducao: 9360 },
          { ate: 1800000, aliquota: 14.0, deducao: 17640 },
          { ate: 3600000, aliquota: 22.0, deducao: 35640 },
          { ate: 4800000, aliquota: 33.0, deducao: 125640 },
        ],
        'IV': [
          { ate: 180000, aliquota: 4.5, deducao: 0 },
          { ate: 360000, aliquota: 9.0, deducao: 8100 },
          { ate: 720000, aliquota: 10.2, deducao: 12420 },
          { ate: 1800000, aliquota: 14.0, deducao: 39780 },
          { ate: 3600000, aliquota: 22.0, deducao: 183780 },
          { ate: 4800000, aliquota: 33.0, deducao: 828000 },
        ],
        'V': [
          { ate: 180000, aliquota: 15.5, deducao: 0 },
          { ate: 360000, aliquota: 18.0, deducao: 4500 },
          { ate: 720000, aliquota: 19.5, deducao: 9900 },
          { ate: 1800000, aliquota: 20.5, deducao: 17100 },
          { ate: 3600000, aliquota: 23.0, deducao: 62100 },
          { ate: 4800000, aliquota: 30.5, deducao: 540000 },
        ],
      };

      const tabela = tabelasSimplificadas[anexo as keyof typeof tabelasSimplificadas];
      if (!tabela) return null;

      const faixa = tabela.find(f => faturamento12Meses <= f.ate);
      if (!faixa) return null;

      const valorNominal = faturamento * (faixa.aliquota / 100);
      const valorFinal = Math.max(0, valorNominal - (faixa.deducao / 12));
      const aliquotaEfetiva = faturamento > 0 ? (valorFinal / faturamento) * 100 : 0;

      return {
        valor: valorFinal,
        aliquota_nominal: faixa.aliquota,
        aliquota_efetiva: aliquotaEfetiva,
        valor_deducao: faixa.deducao / 12,
      };
    },

    calcularIRPJRapido: (faturamento: number, atividade: string) => {
      const percentualPresuncao = atividade.toLowerCase().includes('serviço') ? 0.32 : 0.08;
      const baseCalculo = faturamento * percentualPresuncao;
      const irpj = baseCalculo * 0.15;
      const csll = baseCalculo * 0.09;
      const total = irpj + csll;

      return {
        valor: total,
        irpj,
        csll,
        base_calculo: baseCalculo,
        percentual_presuncao: percentualPresuncao * 100,
      };
    }
  };
}
