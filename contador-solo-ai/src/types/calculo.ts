// Tipos para cálculos fiscais brasileiros
export type TipoCalculo = 
  | 'DAS' // Documento de Arrecadação do Simples Nacional
  | 'IRPJ' // Imposto de Renda Pessoa Jurídica
  | 'CSLL' // Contribuição Social sobre o Lucro Líquido
  | 'PIS' // Programa de Integração Social
  | 'COFINS' // Contribuição para o Financiamento da Seguridade Social
  | 'ICMS' // Imposto sobre Circulação de Mercadorias e Serviços
  | 'ISS' // Imposto sobre Serviços
  | 'CPP' // Contribuição Previdenciária Patronal
  | 'IPI'; // Imposto sobre Produtos Industrializados

export type RegimeTributario = 
  | 'Simples Nacional'
  | 'Lucro Presumido'
  | 'Lucro Real'
  | 'MEI';

export type AnexoSimples = 'I' | 'II' | 'III' | 'IV' | 'V';

export type StatusCalculo = 
  | 'calculado'
  | 'aprovado'
  | 'pago'
  | 'vencido'
  | 'cancelado';

// Interface principal para cálculos fiscais
export interface CalculoFiscal {
  id: string;
  empresa_id: string;
  user_id: string;
  tipo_calculo: TipoCalculo;
  competencia: string; // YYYY-MM
  regime_tributario: RegimeTributario;
  faturamento_bruto: number;
  faturamento_12_meses: number;
  deducoes?: number;
  anexo_simples?: AnexoSimples;
  fator_r?: number;
  base_calculo: number;
  aliquota_nominal: number;
  aliquota_efetiva: number;
  valor_imposto: number;
  valor_multa?: number;
  valor_juros?: number;
  valor_total: number;
  
  // Detalhamento por imposto
  irpj?: number;
  csll?: number;
  pis?: number;
  cofins?: number;
  cpp?: number;
  icms?: number;
  iss?: number;
  
  status: StatusCalculo;
  data_vencimento: string;
  data_pagamento?: string;
  codigo_barras?: string;
  linha_digitavel?: string;
  calculado_automaticamente: boolean;
  calculado_por?: string;
  aprovado_por?: string;
  data_aprovacao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// Interface para entrada de dados do cálculo DAS
export interface DadosCalculoDAS {
  empresa_id: string;
  competencia: string;
  faturamento_bruto: number;
  faturamento_12_meses: number;
  anexo_simples: AnexoSimples;
  deducoes?: number;
}

// Interface para entrada de dados do cálculo IRPJ/CSLL
export interface DadosCalculoIRPJ {
  empresa_id: string;
  competencia: string;
  receita_bruta: number;
  atividade_principal: string;
  deducoes?: number;
  incentivos_fiscais?: number;
}

// Interface para resultado do cálculo
export interface ResultadoCalculo {
  base_calculo: number;
  aliquota_nominal: number;
  aliquota_efetiva: number;
  valor_imposto: number;
  valor_total: number;
  data_vencimento: string;
  detalhamento: {
    irpj?: number;
    csll?: number;
    pis?: number;
    cofins?: number;
    cpp?: number;
    icms?: number;
    iss?: number;
  };
  codigo_barras?: string;
  linha_digitavel?: string;
}

// Interface para filtros de cálculos
export interface FiltroCalculos {
  empresa_id?: string;
  tipo_calculo?: TipoCalculo;
  regime_tributario?: RegimeTributario;
  status?: StatusCalculo;
  competencia_inicio?: string;
  competencia_fim?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
}

// Interface para estatísticas de cálculos
export interface EstatisticasCalculos {
  total_calculos: number;
  calculos_pendentes: number;
  calculos_pagos: number;
  calculos_vencidos: number;
  valor_total_periodo: number;
  valor_pago_periodo: number;
  valor_pendente_periodo: number;
  proximos_vencimentos: CalculoFiscal[];
}

// Tabelas do Simples Nacional 2025
export interface TabelaSimples {
  anexo: AnexoSimples;
  faixa: number;
  receita_bruta_12_meses_ate: number;
  aliquota: number;
  valor_deduzir: number;
  irpj: number;
  csll: number;
  cofins: number;
  pis: number;
  cpp: number;
  icms?: number;
  iss?: number;
  ipi?: number;
}

// Percentuais de presunção para Lucro Presumido
export interface PercentualPresuncao {
  atividade: string;
  cnae?: string;
  percentual_irpj: number;
  percentual_csll: number;
  descricao: string;
}

// Interface para upload de dados
export interface UploadDadosCalculo {
  arquivo: File;
  tipo_calculo: TipoCalculo;
  competencia: string;
  empresa_id: string;
}

// Interface para validação de cálculo
export interface ValidacaoCalculo {
  valido: boolean;
  erros: string[];
  avisos: string[];
}

// Interface para histórico de cálculos
export interface HistoricoCalculo {
  id: string;
  calculo_id: string;
  acao: 'criado' | 'editado' | 'aprovado' | 'pago' | 'cancelado';
  usuario: string;
  data: string;
  observacoes?: string;
}

// Interface para comparação de períodos
export interface ComparacaoCalculos {
  periodo_atual: {
    competencia: string;
    valor_total: number;
    calculos: CalculoFiscal[];
  };
  periodo_anterior: {
    competencia: string;
    valor_total: number;
    calculos: CalculoFiscal[];
  };
  variacao_percentual: number;
  variacao_absoluta: number;
}
