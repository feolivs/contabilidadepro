import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { fiscalCache } from '@/lib/simple-cache';
import { toast } from 'react-hot-toast';
import { logger } from '@/lib/simple-logger';
import type {
  CalculoFiscal,
  FiltroCalculos,
  EstatisticasCalculos,
  DadosCalculoDAS,
  DadosCalculoIRPJ,
  DadosCalculoMEI,
  ResultadoCalculo,
  TipoCalculo
} from '@/types/calculo';

// Hook para buscar cálculos com filtros
export function useCalculos(filtros?: FiltroCalculos) {
  return useQuery({
    queryKey: ['calculos', filtros],
    queryFn: async () => {
      let query = supabase
        .from('calculos_fiscais')
        .select('*')
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros?.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id);
      }
      if (filtros?.tipo_calculo) {
        query = query.eq('tipo_calculo', filtros.tipo_calculo);
      }
      if (filtros?.regime_tributario) {
        query = query.eq('regime_tributario', filtros.regime_tributario);
      }
      if (filtros?.status) {
        query = query.eq('status', filtros.status);
      }
      if (filtros?.competencia_inicio && filtros?.competencia_fim) {
        query = query.gte('competencia', filtros.competencia_inicio)
                   .lte('competencia', filtros.competencia_fim);
      }
      if (filtros?.data_vencimento_inicio && filtros?.data_vencimento_fim) {
        query = query.gte('data_vencimento', filtros.data_vencimento_inicio)
                   .lte('data_vencimento', filtros.data_vencimento_fim);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao carregar cálculos', { error, filtros });
        throw new Error('Erro ao carregar cálculos');
      }

      return data as CalculoFiscal[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Hook para buscar estatísticas de cálculos
export function useEstatisticasCalculos(filtros?: { empresa_id?: string; periodo?: string }) {
  return useQuery({
    queryKey: ['estatisticas-calculos', filtros],
    queryFn: async () => {
      let query = supabase
        .from('calculos_fiscais')
        .select('*');

      if (filtros?.empresa_id) {
        query = query.eq('empresa_id', filtros.empresa_id);
      }
      if (filtros?.periodo) {
        const [ano, mes] = filtros.periodo.split('-');
        query = query.like('competencia', `${ano}-${mes}%`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao carregar estatísticas', { error, filtros });
        throw new Error('Erro ao carregar estatísticas');
      }

      const calculos = data as CalculoFiscal[];

      // Calcular estatísticas
      const total_calculos = calculos.length;
      const calculos_pendentes = calculos.filter(c => c.status === 'calculado').length;
      const calculos_pagos = calculos.filter(c => c.status === 'pago').length;
      const calculos_vencidos = calculos.filter(c => 
        c.status !== 'pago' && new Date(c.data_vencimento) < new Date()
      ).length;

      const valor_total_periodo = calculos.reduce((sum, c) => sum + Number(c.valor_total), 0);
      const valor_pago_periodo = calculos
        .filter(c => c.status === 'pago')
        .reduce((sum, c) => sum + Number(c.valor_total), 0);
      const valor_pendente_periodo = valor_total_periodo - valor_pago_periodo;

      // Próximos vencimentos (próximos 30 dias)
      const hoje = new Date();
      const em30Dias = new Date();
      em30Dias.setDate(hoje.getDate() + 30);

      const proximos_vencimentos = calculos
        .filter(c => 
          c.status !== 'pago' && 
          new Date(c.data_vencimento) >= hoje && 
          new Date(c.data_vencimento) <= em30Dias
        )
        .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
        .slice(0, 5);

      return {
        total_calculos,
        calculos_pendentes,
        calculos_pagos,
        calculos_vencidos,
        valor_total_periodo,
        valor_pago_periodo,
        valor_pendente_periodo,
        proximos_vencimentos
      } as EstatisticasCalculos;
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

// Hook para calcular DAS
export function useCalcularDAS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: DadosCalculoDAS): Promise<ResultadoCalculo> => {
      // Simular cálculo DAS (em produção, seria uma Edge Function)
      const resultado = await calcularDAS(dados);
      
      // Salvar o cálculo no banco
      const { data, error } = await supabase
        .from('calculos_fiscais')
        .insert({
          empresa_id: dados.empresa_id,
          tipo_calculo: 'DAS',
          competencia: dados.competencia,
          regime_tributario: 'Simples Nacional',
          faturamento_bruto: dados.faturamento_bruto,
          faturamento_12_meses: dados.faturamento_12_meses,
          anexo_simples: dados.anexo_simples,
          deducoes: dados.deducoes || 0,
          base_calculo: resultado.base_calculo,
          aliquota_nominal: resultado.aliquota_nominal,
          aliquota_efetiva: resultado.aliquota_efetiva,
          valor_imposto: resultado.valor_imposto,
          valor_total: resultado.valor_total,
          data_vencimento: resultado.data_vencimento,
          status: 'calculado',
          calculado_automaticamente: true,
          // Detalhamento dos impostos
          irpj: resultado.detalhamento.irpj || 0,
          csll: resultado.detalhamento.csll || 0,
          pis: resultado.detalhamento.pis || 0,
          cofins: resultado.detalhamento.cofins || 0,
          cpp: resultado.detalhamento.cpp || 0,
          icms: resultado.detalhamento.icms || 0,
          iss: resultado.detalhamento.iss || 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao salvar cálculo DAS', { error, dados });
        throw new Error('Erro ao salvar cálculo');
      }

      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-calculos'] });
      toast.success('Cálculo DAS realizado com sucesso!');
    },
    onError: (error) => {
      logger.error('Erro ao calcular DAS', { error });
      toast.error('Erro ao calcular DAS. Tente novamente.');
    },
  });
}

// Hook para calcular IRPJ/CSLL
export function useCalcularIRPJ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: DadosCalculoIRPJ): Promise<ResultadoCalculo> => {
      // Simular cálculo IRPJ/CSLL (em produção, seria uma Edge Function)
      const resultado = await calcularIRPJ(dados);

      // Salvar o cálculo no banco
      const { data, error } = await supabase
        .from('calculos_fiscais')
        .insert({
          empresa_id: dados.empresa_id,
          tipo_calculo: 'IRPJ',
          competencia: dados.competencia,
          regime_tributario: 'Lucro Presumido',
          faturamento_bruto: dados.receita_bruta,
          deducoes: dados.deducoes || 0,
          base_calculo: resultado.base_calculo,
          aliquota_nominal: resultado.aliquota_nominal,
          aliquota_efetiva: resultado.aliquota_efetiva,
          valor_imposto: resultado.valor_imposto,
          valor_total: resultado.valor_total,
          data_vencimento: resultado.data_vencimento,
          status: 'calculado',
          calculado_automaticamente: true,
          irpj: resultado.detalhamento.irpj || 0,
          csll: resultado.detalhamento.csll || 0,
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao salvar cálculo IRPJ', { error, dados });
        throw new Error('Erro ao salvar cálculo');
      }

      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-calculos'] });
      toast.success('Cálculo IRPJ/CSLL realizado com sucesso!');
    },
    onError: (error) => {
      logger.error('Erro ao calcular IRPJ/CSLL', { error });
      toast.error('Erro ao calcular IRPJ/CSLL. Tente novamente.');
    },
  });
}

// Hook para calcular MEI
export function useCalcularMEI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: DadosCalculoMEI): Promise<ResultadoCalculo> => {
      // Calcular MEI com valores 2025
      const resultado = await calcularMEI(dados);

      // Salvar o cálculo no banco
      const { data, error } = await supabase
        .from('calculos_fiscais')
        .insert({
          empresa_id: dados.empresa_id,
          tipo_calculo: 'MEI',
          competencia: dados.competencia,
          regime_tributario: 'MEI',
          faturamento_bruto: dados.receita_bruta_mensal,
          base_calculo: resultado.base_calculo,
          aliquota_nominal: resultado.aliquota_nominal,
          aliquota_efetiva: resultado.aliquota_efetiva,
          valor_imposto: resultado.valor_imposto,
          valor_total: resultado.valor_total,
          data_vencimento: resultado.data_vencimento,
          status: 'calculado',
          calculado_automaticamente: true,
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao salvar cálculo MEI', { error, dados });
        throw new Error('Erro ao salvar cálculo');
      }

      return resultado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-calculos'] });
      toast.success('Cálculo MEI realizado com sucesso!');
    },
    onError: (error) => {
      logger.error('Erro ao calcular MEI', { error });
      toast.error('Erro ao calcular MEI. Tente novamente.');
    },
  });
}

// Hook para marcar cálculo como pago
export function useMarcarComoPago() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data_pagamento }: { id: string; data_pagamento: string }) => {
      const { data, error } = await supabase
        .from('calculos_fiscais')
        .update({
          status: 'pago',
          data_pagamento,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Erro ao marcar como pago', { error, id, data_pagamento });
        throw new Error('Erro ao marcar como pago');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-calculos'] });
      toast.success('Cálculo marcado como pago!');
    },
    onError: (error) => {
      logger.error('Erro ao marcar cálculo como pago', { error });
      toast.error('Erro ao marcar como pago. Tente novamente.');
    },
  });
}

// Hook para excluir cálculo
export function useExcluirCalculo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calculos_fiscais')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Erro ao excluir cálculo', { error, id });
        throw new Error('Erro ao excluir cálculo');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calculos'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-calculos'] });
      toast.success('Cálculo excluído com sucesso!');
    },
    onError: (error) => {
      logger.error('Erro ao excluir cálculo', { error });
      toast.error('Erro ao excluir cálculo. Tente novamente.');
    },
  });
}

// Funções auxiliares de cálculo (simuladas)
async function calcularDAS(dados: DadosCalculoDAS): Promise<ResultadoCalculo> {
  // Tabela simplificada do Simples Nacional (Anexo I como exemplo)
  const tabelaAnexoI = [
    { ate: 180000, aliquota: 4.0, deduzir: 0 },
    { ate: 360000, aliquota: 7.3, deduzir: 5940 },
    { ate: 720000, aliquota: 9.5, deduzir: 13860 },
    { ate: 1800000, aliquota: 10.7, deduzir: 22500 },
    { ate: 3600000, aliquota: 14.3, deduzir: 87300 },
    { ate: 4800000, aliquota: 19.0, deduzir: 378000 },
  ];

  const faixa = tabelaAnexoI.find(f => dados.faturamento_12_meses <= f.ate);
  if (!faixa) throw new Error('Faturamento acima do limite do Simples Nacional');

  const aliquota_efetiva = Math.max(0, 
    ((dados.faturamento_12_meses * faixa.aliquota / 100) - faixa.deduzir) / dados.faturamento_12_meses * 100
  );

  const valor_imposto = dados.faturamento_bruto * aliquota_efetiva / 100;
  const valor_total = valor_imposto;

  // Data de vencimento: dia 20 do mês seguinte
  const [ano, mes] = dados.competencia.split('-');
  const proximoMes = new Date(parseInt(ano || '2024'), parseInt(mes || '1'), 20);
  const data_vencimento = proximoMes.toISOString().split('T')[0]!;

  return {
    base_calculo: dados.faturamento_bruto,
    aliquota_nominal: faixa.aliquota,
    aliquota_efetiva,
    valor_imposto,
    valor_total,
    data_vencimento,
    detalhamento: {
      irpj: valor_imposto * 0.055, // 5.5% do DAS
      csll: valor_imposto * 0.034, // 3.4% do DAS
      pis: valor_imposto * 0.0065, // 0.65% do DAS
      cofins: valor_imposto * 0.03, // 3% do DAS
      cpp: valor_imposto * 0.415, // 41.5% do DAS
      icms: valor_imposto * 0.34, // 34% do DAS
    },
  };
}

async function calcularIRPJ(dados: DadosCalculoIRPJ): Promise<ResultadoCalculo> {
  // Percentuais de presunção simplificados
  const percentualPresuncao = 8.0; // 8% para atividades em geral
  const base_calculo = dados.receita_bruta * percentualPresuncao / 100;

  const irpj = base_calculo * 0.15; // 15% sobre a base
  const adicional_irpj = Math.max(0, (base_calculo - 20000) * 0.10); // 10% sobre o que exceder R$ 20.000
  const csll = base_calculo * 0.09; // 9% sobre a base

  const valor_total = irpj + adicional_irpj + csll;

  // Data de vencimento: último dia útil do mês seguinte ao trimestre
  const [ano, mes] = dados.competencia.split('-');
  const ultimoDia = new Date(parseInt(ano || '2024'), parseInt(mes || '1') + 1, 0);
  const data_vencimento = ultimoDia.toISOString().split('T')[0]!;

  return {
    base_calculo,
    aliquota_nominal: 24.0, // 15% IRPJ + 9% CSLL
    aliquota_efetiva: (valor_total / dados.receita_bruta) * 100,
    valor_imposto: valor_total,
    valor_total,
    data_vencimento,
    detalhamento: {
      irpj: irpj + adicional_irpj,
      csll,
    },
  };
}

async function calcularMEI(dados: DadosCalculoMEI): Promise<ResultadoCalculo> {
  // Valores MEI 2025
  const MEI_VALUES_2025 = {
    comercio: 66.60,        // INSS + ICMS
    servicos: 70.60,        // INSS + ISS
    comercio_servicos: 71.60 // INSS + ICMS + ISS
  };

  // Limite de receita anual MEI 2025: R$ 81.000,00
  const LIMITE_ANUAL_MEI = 81000;
  const LIMITE_MENSAL_MEI = LIMITE_ANUAL_MEI / 12; // R$ 6.750,00

  // Verificar se está dentro do limite
  if (dados.receita_bruta_mensal > LIMITE_MENSAL_MEI) {
    throw new Error(`Receita mensal acima do limite MEI (R$ ${LIMITE_MENSAL_MEI.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
  }

  // Valor fixo baseado na atividade
  const valor_total = MEI_VALUES_2025[dados.atividade_mei];

  // Data de vencimento: dia 20 do mês seguinte
  const [ano, mes] = dados.competencia.split('-');
  const proximoMes = new Date(parseInt(ano || '2025'), parseInt(mes || '1'), 20);
  const data_vencimento = proximoMes.toISOString().split('T')[0]!;

  return {
    base_calculo: valor_total,
    aliquota_nominal: 100, // Valor fixo
    aliquota_efetiva: (valor_total / dados.receita_bruta_mensal) * 100,
    valor_imposto: valor_total,
    valor_total,
    data_vencimento,
    detalhamento: {},
  };
}
