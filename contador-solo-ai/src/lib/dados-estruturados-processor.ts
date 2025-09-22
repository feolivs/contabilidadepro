/**
 * Sistema de Processamento de Dados Estruturados por Tipo de Documento
 * 
 * Este módulo implementa a lógica para extrair e estruturar informações específicas
 * de diferentes tipos de documentos fiscais brasileiros (NFe, NFSe, Recibos, Boletos, etc.)
 */

import type { TipoDocumento } from '@/types/documento'

/**
 * Interface base para dados extraídos
 */
export interface DadosEstruturadosBase {
  tipo_documento: TipoDocumento
  documento_id: string
  data_processamento: string
  confianca_extracao: number
  campos_extraidos: string[]
  erros_validacao: string[]
}

/**
 * Dados estruturados específicos para NFe
 */
export interface DadosNFe extends DadosEstruturadosBase {
  tipo_documento: 'NFE'
  
  // Dados do emitente
  emitente: {
    cnpj: string
    razao_social: string
    inscricao_estadual?: string
    endereco?: {
      logradouro: string
      numero: string
      bairro: string
      municipio: string
      uf: string
      cep: string
    }
  }
  
  // Dados do destinatário
  destinatario: {
    cnpj_cpf: string
    nome_razao_social: string
    inscricao_estadual?: string
    endereco?: {
      logradouro: string
      numero: string
      bairro: string
      municipio: string
      uf: string
      cep: string
    }
  }
  
  // Dados da nota
  numero_nf: string
  serie: string
  data_emissao: string
  data_saida_entrada?: string
  natureza_operacao: string
  
  // Valores
  valor_total_produtos: number
  valor_total_servicos?: number
  base_calculo_icms?: number
  valor_icms?: number
  base_calculo_icms_st?: number
  valor_icms_st?: number
  valor_ipi?: number
  valor_pis?: number
  valor_cofins?: number
  valor_total_nota: number
  valor_desconto?: number
  valor_frete?: number
  valor_seguro?: number
  valor_outras_despesas?: number
  
  // Produtos/Serviços
  itens: Array<{
    codigo: string
    descricao: string
    ncm?: string
    cfop: string
    unidade: string
    quantidade: number
    valor_unitario: number
    valor_total: number
    aliquota_icms?: number
    valor_icms?: number
    aliquota_ipi?: number
    valor_ipi?: number
  }>
  
  // Informações fiscais
  regime_tributario?: string
  indicador_presenca?: string
  finalidade_emissao?: string
  
  // Chave de acesso
  chave_acesso?: string
  protocolo_autorizacao?: string
}

/**
 * Dados estruturados específicos para NFSe
 */
export interface DadosNFSe extends DadosEstruturadosBase {
  tipo_documento: 'NFSE'
  
  // Dados do prestador
  prestador: {
    cnpj: string
    razao_social: string
    inscricao_municipal?: string
    endereco?: {
      logradouro: string
      numero: string
      bairro: string
      municipio: string
      uf: string
      cep: string
    }
  }
  
  // Dados do tomador
  tomador: {
    cnpj_cpf: string
    nome_razao_social: string
    endereco?: {
      logradouro: string
      numero: string
      bairro: string
      municipio: string
      uf: string
      cep: string
    }
  }
  
  // Dados da nota
  numero_nfse: string
  codigo_verificacao?: string
  data_emissao: string
  competencia?: string
  
  // Serviços
  servicos: Array<{
    codigo_servico: string
    descricao: string
    quantidade: number
    valor_unitario: number
    valor_total: number
    aliquota_iss?: number
    valor_iss?: number
    codigo_cnae?: string
  }>
  
  // Valores
  valor_servicos: number
  valor_deducoes?: number
  valor_pis?: number
  valor_cofins?: number
  valor_inss?: number
  valor_ir?: number
  valor_csll?: number
  valor_iss?: number
  valor_liquido: number
  
  // Informações fiscais
  optante_simples_nacional?: boolean
  incentivador_cultural?: boolean
  regime_especial_tributacao?: string
}

/**
 * Dados estruturados específicos para Recibos
 */
export interface DadosRecibo extends DadosEstruturadosBase {
  tipo_documento: 'RECIBO'
  
  // Dados do emitente
  emitente: {
    nome: string
    cpf_cnpj: string
    endereco?: string
    telefone?: string
    email?: string
  }
  
  // Dados do pagador
  pagador: {
    nome: string
    cpf_cnpj?: string
    endereco?: string
  }
  
  // Dados do recibo
  numero_recibo?: string
  data_emissao: string
  data_pagamento?: string
  
  // Descrição e valores
  descricao_servico: string
  valor_total: number
  forma_pagamento?: string
  
  // Informações adicionais
  observacoes?: string
  categoria_servico?: string
}

/**
 * Dados estruturados específicos para Boletos
 */
export interface DadosBoleto extends DadosEstruturadosBase {
  tipo_documento: 'BOLETO'
  
  // Dados do cedente (quem recebe)
  cedente: {
    nome: string
    cnpj: string
    agencia?: string
    conta?: string
    banco?: string
  }
  
  // Dados do sacado (quem paga)
  sacado: {
    nome: string
    cpf_cnpj: string
    endereco?: string
  }
  
  // Dados do boleto
  nosso_numero?: string
  numero_documento?: string
  data_emissao: string
  data_vencimento: string
  data_pagamento?: string
  
  // Valores
  valor_nominal: number
  valor_pago?: number
  juros?: number
  multa?: number
  desconto?: number
  
  // Informações bancárias
  codigo_barras?: string
  linha_digitavel?: string
  banco_codigo?: string
  
  // Status
  status_pagamento?: 'pendente' | 'pago' | 'vencido' | 'cancelado'
}

/**
 * Dados estruturados específicos para Extratos Bancários
 */
export interface DadosExtrato extends DadosEstruturadosBase {
  tipo_documento: 'EXTRATO'
  
  // Dados da conta
  conta: {
    banco: string
    agencia: string
    numero_conta: string
    titular: string
    tipo_conta?: string
  }
  
  // Período do extrato
  data_inicio: string
  data_fim: string
  
  // Saldos
  saldo_inicial: number
  saldo_final: number
  
  // Movimentações
  movimentacoes: Array<{
    data: string
    descricao: string
    valor: number
    tipo: 'credito' | 'debito'
    categoria?: string
    documento?: string
  }>
  
  // Resumo
  total_creditos: number
  total_debitos: number
  quantidade_movimentacoes: number
}

/**
 * Union type para todos os tipos de dados estruturados
 */
export type DadosEstruturados = DadosNFe | DadosNFSe | DadosRecibo | DadosBoleto | DadosExtrato

/**
 * Resultado do processamento
 */
export interface ResultadoProcessamento {
  sucesso: boolean
  dados_estruturados?: DadosEstruturados
  erros: string[]
  avisos: string[]
  confianca_geral: number
  tempo_processamento: number
}

/**
 * Configurações de processamento por tipo
 */
interface ConfiguracaoProcessamento {
  campos_obrigatorios: string[]
  campos_opcionais: string[]
  validacoes_especificas: string[]
  confianca_minima: number
}

const CONFIGURACOES_POR_TIPO: Record<TipoDocumento, ConfiguracaoProcessamento> = {
  NFE: {
    campos_obrigatorios: ['emitente.cnpj', 'destinatario.cnpj_cpf', 'numero_nf', 'valor_total_nota'],
    campos_opcionais: ['chave_acesso', 'protocolo_autorizacao', 'itens'],
    validacoes_especificas: ['validar_cnpj', 'validar_valores', 'validar_chave_acesso'],
    confianca_minima: 0.85
  },
  NFCE: {
    campos_obrigatorios: ['emitente.cnpj', 'numero_nf', 'valor_total_nota'],
    campos_opcionais: ['chave_acesso', 'protocolo_autorizacao', 'itens'],
    validacoes_especificas: ['validar_cnpj', 'validar_valores'],
    confianca_minima: 0.80
  },
  NFSE: {
    campos_obrigatorios: ['prestador.cnpj', 'tomador.cnpj_cpf', 'numero_nfse', 'valor_servicos'],
    campos_opcionais: ['codigo_verificacao', 'servicos'],
    validacoes_especificas: ['validar_cnpj', 'validar_valores', 'validar_iss'],
    confianca_minima: 0.80
  },
  RECIBO: {
    campos_obrigatorios: ['emitente.nome', 'pagador.nome', 'descricao_servico', 'valor_total'],
    campos_opcionais: ['numero_recibo', 'forma_pagamento'],
    validacoes_especificas: ['validar_cpf_cnpj', 'validar_valores'],
    confianca_minima: 0.75
  },
  BOLETO: {
    campos_obrigatorios: ['cedente.nome', 'sacado.nome', 'valor_nominal', 'data_vencimento'],
    campos_opcionais: ['nosso_numero', 'codigo_barras', 'linha_digitavel'],
    validacoes_especificas: ['validar_cnpj', 'validar_valores', 'validar_datas'],
    confianca_minima: 0.80
  },
  EXTRATO: {
    campos_obrigatorios: ['conta.banco', 'conta.numero_conta', 'saldo_inicial', 'saldo_final'],
    campos_opcionais: ['movimentacoes'],
    validacoes_especificas: ['validar_saldos', 'validar_movimentacoes'],
    confianca_minima: 0.70
  },
  COMPROVANTE: {
    campos_obrigatorios: ['descricao', 'valor', 'data'],
    campos_opcionais: ['numero_documento'],
    validacoes_especificas: ['validar_valores'],
    confianca_minima: 0.70
  },
  CTE: {
    campos_obrigatorios: ['emitente.cnpj', 'destinatario.cnpj_cpf', 'numero_ct', 'valor_total'],
    campos_opcionais: ['chave_acesso', 'modal_transporte'],
    validacoes_especificas: ['validar_cnpj', 'validar_valores'],
    confianca_minima: 0.80
  },
  CONTRATO: {
    campos_obrigatorios: ['partes', 'objeto', 'valor'],
    campos_opcionais: ['prazo', 'clausulas'],
    validacoes_especificas: ['validar_partes', 'validar_valores'],
    confianca_minima: 0.75
  },
  OUTROS: {
    campos_obrigatorios: ['tipo', 'descricao'],
    campos_opcionais: ['valor', 'data'],
    validacoes_especificas: [],
    confianca_minima: 0.60
  }
}

/**
 * Função principal para processar dados estruturados por tipo
 */
export async function processarDadosEstruturados(
  dadosBrutos: any,
  tipoDocumento: TipoDocumento,
  documentoId: string
): Promise<ResultadoProcessamento> {
  const inicioProcessamento = Date.now()

  try {
    // Obter configuração para o tipo
    const config = CONFIGURACOES_POR_TIPO[tipoDocumento]

    // Processar baseado no tipo
    let dadosEstruturados: DadosEstruturados

    switch (tipoDocumento) {
      case 'NFE':
        dadosEstruturados = await processarNFe(dadosBrutos, documentoId)
        break
      case 'NFSE':
        dadosEstruturados = await processarNFSe(dadosBrutos, documentoId)
        break
      case 'RECIBO':
        dadosEstruturados = await processarRecibo(dadosBrutos, documentoId)
        break
      case 'BOLETO':
        dadosEstruturados = await processarBoleto(dadosBrutos, documentoId)
        break
      case 'EXTRATO':
        dadosEstruturados = await processarExtrato(dadosBrutos, documentoId)
        break
      default:
        throw new Error(`Tipo de documento não suportado: ${tipoDocumento}`)
    }

    // Validar dados estruturados
    const resultadoValidacao = validarDadosEstruturados(dadosEstruturados, config)

    const tempoProcessamento = Date.now() - inicioProcessamento

    return {
      sucesso: resultadoValidacao.valido,
      dados_estruturados: dadosEstruturados,
      erros: resultadoValidacao.erros,
      avisos: resultadoValidacao.avisos,
      confianca_geral: dadosEstruturados.confianca_extracao,
      tempo_processamento: tempoProcessamento
    }

  } catch (error) {
    const tempoProcessamento = Date.now() - inicioProcessamento

    return {
      sucesso: false,
      erros: [`Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
      avisos: [],
      confianca_geral: 0,
      tempo_processamento: tempoProcessamento
    }
  }
}

/**
 * Processar dados específicos de NFe
 */
async function processarNFe(dadosBrutos: any, documentoId: string): Promise<DadosNFe> {
  const camposExtraidos: string[] = []
  const errosValidacao: string[] = []

  // Extrair dados do emitente
  const emitente = {
    cnpj: extrairCampo(dadosBrutos, ['emitente.cnpj', 'emit.CNPJ', 'cnpj_emitente'], camposExtraidos),
    razao_social: extrairCampo(dadosBrutos, ['emitente.razao_social', 'emit.xNome', 'razao_social_emitente'], camposExtraidos),
    inscricao_estadual: extrairCampo(dadosBrutos, ['emitente.ie', 'emit.IE', 'ie_emitente'], camposExtraidos, false),
    endereco: extrairEndereco(dadosBrutos, 'emitente', camposExtraidos)
  }

  // Extrair dados do destinatário
  const destinatario = {
    cnpj_cpf: extrairCampo(dadosBrutos, ['destinatario.cnpj', 'dest.CNPJ', 'dest.CPF', 'cnpj_cpf_destinatario'], camposExtraidos),
    nome_razao_social: extrairCampo(dadosBrutos, ['destinatario.nome', 'dest.xNome', 'nome_destinatario'], camposExtraidos),
    inscricao_estadual: extrairCampo(dadosBrutos, ['destinatario.ie', 'dest.IE', 'ie_destinatario'], camposExtraidos, false),
    endereco: extrairEndereco(dadosBrutos, 'destinatario', camposExtraidos)
  }

  // Extrair dados da nota
  const numeroNf = extrairCampo(dadosBrutos, ['numero_nf', 'ide.nNF', 'numero_nota'], camposExtraidos)
  const serie = extrairCampo(dadosBrutos, ['serie', 'ide.serie', 'serie_nota'], camposExtraidos)
  const dataEmissao = extrairCampo(dadosBrutos, ['data_emissao', 'ide.dhEmi', 'data_emissao_nota'], camposExtraidos)
  const naturezaOperacao = extrairCampo(dadosBrutos, ['natureza_operacao', 'ide.natOp', 'natureza'], camposExtraidos)

  // Extrair valores
  const valorTotalNota = extrairValor(dadosBrutos, ['valor_total', 'total.ICMSTot.vNF', 'valor_total_nota'], camposExtraidos)
  const valorTotalProdutos = extrairValor(dadosBrutos, ['valor_produtos', 'total.ICMSTot.vProd', 'valor_total_produtos'], camposExtraidos)

  // Extrair itens
  const itens = extrairItensNFe(dadosBrutos, camposExtraidos)

  // Calcular confiança baseada nos campos extraídos
  const confiancaExtracao = calcularConfiancaExtracao(camposExtraidos, CONFIGURACOES_POR_TIPO.NFE.campos_obrigatorios)

  return {
    tipo_documento: 'NFE',
    documento_id: documentoId,
    data_processamento: new Date().toISOString(),
    confianca_extracao: confiancaExtracao,
    campos_extraidos: camposExtraidos,
    erros_validacao: errosValidacao,

    emitente,
    destinatario,
    numero_nf: numeroNf,
    serie,
    data_emissao: dataEmissao,
    natureza_operacao: naturezaOperacao,
    valor_total_produtos: valorTotalProdutos,
    valor_total_nota: valorTotalNota,
    itens,

    // Campos opcionais
    chave_acesso: extrairCampo(dadosBrutos, ['chave_acesso', 'infNFe.Id', 'chave'], camposExtraidos, false),
    protocolo_autorizacao: extrairCampo(dadosBrutos, ['protocolo', 'infProt.nProt'], camposExtraidos, false),
    valor_icms: extrairValor(dadosBrutos, ['valor_icms', 'total.ICMSTot.vICMS'], camposExtraidos, false),
    valor_ipi: extrairValor(dadosBrutos, ['valor_ipi', 'total.ICMSTot.vIPI'], camposExtraidos, false),
    valor_pis: extrairValor(dadosBrutos, ['valor_pis', 'total.ICMSTot.vPIS'], camposExtraidos, false),
    valor_cofins: extrairValor(dadosBrutos, ['valor_cofins', 'total.ICMSTot.vCOFINS'], camposExtraidos, false)
  }
}

/**
 * Processar dados específicos de NFSe
 */
async function processarNFSe(dadosBrutos: any, documentoId: string): Promise<DadosNFSe> {
  const camposExtraidos: string[] = []
  const errosValidacao: string[] = []

  // Extrair dados do prestador
  const prestador = {
    cnpj: extrairCampo(dadosBrutos, ['prestador.cnpj', 'PrestadorServico.Cnpj', 'cnpj_prestador'], camposExtraidos),
    razao_social: extrairCampo(dadosBrutos, ['prestador.razao_social', 'PrestadorServico.RazaoSocial', 'razao_social_prestador'], camposExtraidos),
    inscricao_municipal: extrairCampo(dadosBrutos, ['prestador.im', 'PrestadorServico.InscricaoMunicipal'], camposExtraidos, false)
  }

  // Extrair dados do tomador
  const tomador = {
    cnpj_cpf: extrairCampo(dadosBrutos, ['tomador.cnpj', 'tomador.cpf', 'TomadorServico.Cnpj', 'TomadorServico.Cpf'], camposExtraidos),
    nome_razao_social: extrairCampo(dadosBrutos, ['tomador.nome', 'TomadorServico.RazaoSocial', 'nome_tomador'], camposExtraidos)
  }

  // Extrair dados da nota
  const numeroNfse = extrairCampo(dadosBrutos, ['numero_nfse', 'Numero', 'numero_nota'], camposExtraidos)
  const dataEmissao = extrairCampo(dadosBrutos, ['data_emissao', 'DataEmissao', 'data_emissao_nota'], camposExtraidos)

  // Extrair valores
  const valorServicos = extrairValor(dadosBrutos, ['valor_servicos', 'Servico.Valores.ValorServicos', 'valor_total'], camposExtraidos)
  const valorLiquido = extrairValor(dadosBrutos, ['valor_liquido', 'Servico.Valores.ValorLiquidoNfse', 'valor_liquido_nota'], camposExtraidos)

  // Extrair serviços
  const servicos = extrairServicosNFSe(dadosBrutos, camposExtraidos)

  const confiancaExtracao = calcularConfiancaExtracao(camposExtraidos, CONFIGURACOES_POR_TIPO.NFSE.campos_obrigatorios)

  return {
    tipo_documento: 'NFSE',
    documento_id: documentoId,
    data_processamento: new Date().toISOString(),
    confianca_extracao: confiancaExtracao,
    campos_extraidos: camposExtraidos,
    erros_validacao: errosValidacao,

    prestador,
    tomador,
    numero_nfse: numeroNfse,
    data_emissao: dataEmissao,
    valor_servicos: valorServicos,
    valor_liquido: valorLiquido,
    servicos,

    // Campos opcionais
    codigo_verificacao: extrairCampo(dadosBrutos, ['codigo_verificacao', 'CodigoVerificacao'], camposExtraidos, false),
    competencia: extrairCampo(dadosBrutos, ['competencia', 'Competencia'], camposExtraidos, false),
    valor_iss: extrairValor(dadosBrutos, ['valor_iss', 'Servico.Valores.ValorIss'], camposExtraidos, false),
    optante_simples_nacional: extrairBoolean(dadosBrutos, ['optante_simples', 'OptanteSimplesNacional'], camposExtraidos, false)
  }
}

/**
 * Processar dados específicos de Recibo
 */
async function processarRecibo(dadosBrutos: any, documentoId: string): Promise<DadosRecibo> {
  const camposExtraidos: string[] = []
  const errosValidacao: string[] = []

  const emitente = {
    nome: extrairCampo(dadosBrutos, ['emitente.nome', 'emitente_nome', 'nome_emitente'], camposExtraidos),
    cpf_cnpj: extrairCampo(dadosBrutos, ['emitente.cpf', 'emitente.cnpj', 'cpf_cnpj_emitente'], camposExtraidos),
    endereco: extrairCampo(dadosBrutos, ['emitente.endereco', 'endereco_emitente'], camposExtraidos, false),
    telefone: extrairCampo(dadosBrutos, ['emitente.telefone', 'telefone_emitente'], camposExtraidos, false),
    email: extrairCampo(dadosBrutos, ['emitente.email', 'email_emitente'], camposExtraidos, false)
  }

  const pagador = {
    nome: extrairCampo(dadosBrutos, ['pagador.nome', 'pagador_nome', 'nome_pagador'], camposExtraidos),
    cpf_cnpj: extrairCampo(dadosBrutos, ['pagador.cpf', 'pagador.cnpj', 'cpf_cnpj_pagador'], camposExtraidos, false),
    endereco: extrairCampo(dadosBrutos, ['pagador.endereco', 'endereco_pagador'], camposExtraidos, false)
  }

  const descricaoServico = extrairCampo(dadosBrutos, ['descricao', 'descricao_servico', 'servico'], camposExtraidos)
  const valorTotal = extrairValor(dadosBrutos, ['valor', 'valor_total', 'valor_recibo'], camposExtraidos)
  const dataEmissao = extrairCampo(dadosBrutos, ['data', 'data_emissao', 'data_recibo'], camposExtraidos)

  const confiancaExtracao = calcularConfiancaExtracao(camposExtraidos, CONFIGURACOES_POR_TIPO.RECIBO.campos_obrigatorios)

  return {
    tipo_documento: 'RECIBO',
    documento_id: documentoId,
    data_processamento: new Date().toISOString(),
    confianca_extracao: confiancaExtracao,
    campos_extraidos: camposExtraidos,
    erros_validacao: errosValidacao,

    emitente,
    pagador,
    descricao_servico: descricaoServico,
    valor_total: valorTotal,
    data_emissao: dataEmissao,

    // Campos opcionais
    numero_recibo: extrairCampo(dadosBrutos, ['numero', 'numero_recibo'], camposExtraidos, false),
    data_pagamento: extrairCampo(dadosBrutos, ['data_pagamento', 'data_pago'], camposExtraidos, false),
    forma_pagamento: extrairCampo(dadosBrutos, ['forma_pagamento', 'pagamento'], camposExtraidos, false),
    observacoes: extrairCampo(dadosBrutos, ['observacoes', 'obs', 'observacao'], camposExtraidos, false),
    categoria_servico: extrairCampo(dadosBrutos, ['categoria', 'categoria_servico'], camposExtraidos, false)
  }
}

/**
 * Processar dados específicos de Boleto
 */
async function processarBoleto(dadosBrutos: any, documentoId: string): Promise<DadosBoleto> {
  const camposExtraidos: string[] = []
  const errosValidacao: string[] = []

  const cedente = {
    nome: extrairCampo(dadosBrutos, ['cedente.nome', 'cedente_nome', 'beneficiario'], camposExtraidos),
    cnpj: extrairCampo(dadosBrutos, ['cedente.cnpj', 'cnpj_cedente', 'cnpj_beneficiario'], camposExtraidos),
    agencia: extrairCampo(dadosBrutos, ['cedente.agencia', 'agencia'], camposExtraidos, false),
    conta: extrairCampo(dadosBrutos, ['cedente.conta', 'conta'], camposExtraidos, false),
    banco: extrairCampo(dadosBrutos, ['cedente.banco', 'banco'], camposExtraidos, false)
  }

  const sacado = {
    nome: extrairCampo(dadosBrutos, ['sacado.nome', 'sacado_nome', 'pagador_nome'], camposExtraidos),
    cpf_cnpj: extrairCampo(dadosBrutos, ['sacado.cpf', 'sacado.cnpj', 'cpf_cnpj_sacado'], camposExtraidos),
    endereco: extrairCampo(dadosBrutos, ['sacado.endereco', 'endereco_sacado'], camposExtraidos, false)
  }

  const valorNominal = extrairValor(dadosBrutos, ['valor', 'valor_nominal', 'valor_documento'], camposExtraidos)
  const dataVencimento = extrairCampo(dadosBrutos, ['vencimento', 'data_vencimento'], camposExtraidos)
  const dataEmissao = extrairCampo(dadosBrutos, ['data_emissao', 'data_documento'], camposExtraidos)

  const confiancaExtracao = calcularConfiancaExtracao(camposExtraidos, CONFIGURACOES_POR_TIPO.BOLETO.campos_obrigatorios)

  return {
    tipo_documento: 'BOLETO',
    documento_id: documentoId,
    data_processamento: new Date().toISOString(),
    confianca_extracao: confiancaExtracao,
    campos_extraidos: camposExtraidos,
    erros_validacao: errosValidacao,

    cedente,
    sacado,
    valor_nominal: valorNominal,
    data_vencimento: dataVencimento,
    data_emissao: dataEmissao,

    // Campos opcionais
    nosso_numero: extrairCampo(dadosBrutos, ['nosso_numero', 'numero_documento'], camposExtraidos, false),
    numero_documento: extrairCampo(dadosBrutos, ['numero_documento', 'documento'], camposExtraidos, false),
    data_pagamento: extrairCampo(dadosBrutos, ['data_pagamento', 'data_pago'], camposExtraidos, false),
    valor_pago: extrairValor(dadosBrutos, ['valor_pago', 'valor_pagamento'], camposExtraidos, false),
    codigo_barras: extrairCampo(dadosBrutos, ['codigo_barras', 'codigo_barra'], camposExtraidos, false),
    linha_digitavel: extrairCampo(dadosBrutos, ['linha_digitavel', 'linha_digitavel_boleto'], camposExtraidos, false),
    status_pagamento: extrairCampo(dadosBrutos, ['status', 'status_pagamento'], camposExtraidos, false) as any
  }
}

/**
 * Processar dados específicos de Extrato
 */
async function processarExtrato(dadosBrutos: any, documentoId: string): Promise<DadosExtrato> {
  const camposExtraidos: string[] = []
  const errosValidacao: string[] = []

  const conta = {
    banco: extrairCampo(dadosBrutos, ['banco', 'conta.banco', 'nome_banco'], camposExtraidos),
    agencia: extrairCampo(dadosBrutos, ['agencia', 'conta.agencia'], camposExtraidos),
    numero_conta: extrairCampo(dadosBrutos, ['conta', 'numero_conta', 'conta.numero'], camposExtraidos),
    titular: extrairCampo(dadosBrutos, ['titular', 'conta.titular', 'nome_titular'], camposExtraidos),
    tipo_conta: extrairCampo(dadosBrutos, ['tipo_conta', 'conta.tipo'], camposExtraidos, false)
  }

  const dataInicio = extrairCampo(dadosBrutos, ['data_inicio', 'periodo.inicio', 'data_inicial'], camposExtraidos)
  const dataFim = extrairCampo(dadosBrutos, ['data_fim', 'periodo.fim', 'data_final'], camposExtraidos)
  const saldoInicial = extrairValor(dadosBrutos, ['saldo_inicial', 'saldo.inicial'], camposExtraidos)
  const saldoFinal = extrairValor(dadosBrutos, ['saldo_final', 'saldo.final'], camposExtraidos)

  // Extrair movimentações
  const movimentacoes = extrairMovimentacoes(dadosBrutos, camposExtraidos)

  // Calcular totais
  const totalCreditos = movimentacoes
    .filter(mov => mov.tipo === 'credito')
    .reduce((sum, mov) => sum + mov.valor, 0)

  const totalDebitos = movimentacoes
    .filter(mov => mov.tipo === 'debito')
    .reduce((sum, mov) => sum + Math.abs(mov.valor), 0)

  const confiancaExtracao = calcularConfiancaExtracao(camposExtraidos, CONFIGURACOES_POR_TIPO.EXTRATO.campos_obrigatorios)

  return {
    tipo_documento: 'EXTRATO',
    documento_id: documentoId,
    data_processamento: new Date().toISOString(),
    confianca_extracao: confiancaExtracao,
    campos_extraidos: camposExtraidos,
    erros_validacao: errosValidacao,

    conta,
    data_inicio: dataInicio,
    data_fim: dataFim,
    saldo_inicial: saldoInicial,
    saldo_final: saldoFinal,
    movimentacoes,
    total_creditos: totalCreditos,
    total_debitos: totalDebitos,
    quantidade_movimentacoes: movimentacoes.length
  }
}

/**
 * Funções utilitárias de extração
 */

/**
 * Extrair campo de dados brutos usando múltiplos caminhos possíveis
 */
function extrairCampo(
  dadosBrutos: any,
  caminhos: string[],
  camposExtraidos: string[],
  obrigatorio: boolean = true
): string {
  for (const caminho of caminhos) {
    const valor = obterValorPorCaminho(dadosBrutos, caminho)
    if (valor !== null && valor !== undefined && valor !== '') {
      camposExtraidos.push(caminho)
      return String(valor).trim()
    }
  }

  if (obrigatorio) {
    console.warn(`Campo obrigatório não encontrado: ${caminhos.join(', ')}`)
  }

  return ''
}

/**
 * Extrair valor numérico
 */
function extrairValor(
  dadosBrutos: any,
  caminhos: string[],
  camposExtraidos: string[],
  obrigatorio: boolean = true
): number {
  for (const caminho of caminhos) {
    const valor = obterValorPorCaminho(dadosBrutos, caminho)
    if (valor !== null && valor !== undefined) {
      const valorNumerico = parseFloat(String(valor).replace(/[^\d.,]/g, '').replace(',', '.'))
      if (!isNaN(valorNumerico)) {
        camposExtraidos.push(caminho)
        return valorNumerico
      }
    }
  }

  if (obrigatorio) {
    console.warn(`Valor numérico obrigatório não encontrado: ${caminhos.join(', ')}`)
  }

  return 0
}

/**
 * Extrair valor booleano
 */
function extrairBoolean(
  dadosBrutos: any,
  caminhos: string[],
  camposExtraidos: string[],
  obrigatorio: boolean = true
): boolean {
  for (const caminho of caminhos) {
    const valor = obterValorPorCaminho(dadosBrutos, caminho)
    if (valor !== null && valor !== undefined) {
      camposExtraidos.push(caminho)
      const valorString = String(valor).toLowerCase()
      return valorString === 'true' || valorString === '1' || valorString === 'sim' || valorString === 's'
    }
  }

  return false
}

/**
 * Obter valor por caminho (suporte a notação de ponto)
 */
function obterValorPorCaminho(obj: any, caminho: string): any {
  return caminho.split('.').reduce((atual, chave) => {
    return atual && atual[chave] !== undefined ? atual[chave] : null
  }, obj)
}

/**
 * Extrair endereço
 */
function extrairEndereco(dadosBrutos: any, prefixo: string, camposExtraidos: string[]): any {
  const endereco = {
    logradouro: extrairCampo(dadosBrutos, [`${prefixo}.endereco.logradouro`, `${prefixo}.endereco.rua`], camposExtraidos, false),
    numero: extrairCampo(dadosBrutos, [`${prefixo}.endereco.numero`, `${prefixo}.endereco.num`], camposExtraidos, false),
    bairro: extrairCampo(dadosBrutos, [`${prefixo}.endereco.bairro`], camposExtraidos, false),
    municipio: extrairCampo(dadosBrutos, [`${prefixo}.endereco.municipio`, `${prefixo}.endereco.cidade`], camposExtraidos, false),
    uf: extrairCampo(dadosBrutos, [`${prefixo}.endereco.uf`, `${prefixo}.endereco.estado`], camposExtraidos, false),
    cep: extrairCampo(dadosBrutos, [`${prefixo}.endereco.cep`], camposExtraidos, false)
  }

  // Retornar apenas se pelo menos um campo foi preenchido
  const temDados = Object.values(endereco).some(valor => valor && valor.trim() !== '')
  return temDados ? endereco : undefined
}

/**
 * Extrair itens de NFe
 */
function extrairItensNFe(dadosBrutos: any, camposExtraidos: string[]): any[] {
  const itens: any[] = []

  // Tentar diferentes estruturas de itens
  const possiveisItens = [
    dadosBrutos.itens,
    dadosBrutos.det,
    dadosBrutos.produtos,
    dadosBrutos.items
  ].filter(Boolean)

  for (const listaItens of possiveisItens) {
    if (Array.isArray(listaItens)) {
      for (const item of listaItens) {
        const itemEstruturado = {
          codigo: extrairCampo(item, ['codigo', 'prod.cProd', 'cProd'], [], false),
          descricao: extrairCampo(item, ['descricao', 'prod.xProd', 'xProd'], [], false),
          ncm: extrairCampo(item, ['ncm', 'prod.NCM', 'NCM'], [], false),
          cfop: extrairCampo(item, ['cfop', 'prod.CFOP', 'CFOP'], [], false),
          unidade: extrairCampo(item, ['unidade', 'prod.uCom', 'uCom'], [], false),
          quantidade: extrairValor(item, ['quantidade', 'prod.qCom', 'qCom'], [], false),
          valor_unitario: extrairValor(item, ['valor_unitario', 'prod.vUnCom', 'vUnCom'], [], false),
          valor_total: extrairValor(item, ['valor_total', 'prod.vProd', 'vProd'], [], false)
        }

        if (itemEstruturado.descricao || itemEstruturado.codigo) {
          itens.push(itemEstruturado)
          camposExtraidos.push('itens')
        }
      }
      break // Usar apenas a primeira lista válida encontrada
    }
  }

  return itens
}

/**
 * Extrair serviços de NFSe
 */
function extrairServicosNFSe(dadosBrutos: any, camposExtraidos: string[]): any[] {
  const servicos: any[] = []

  const possiveisServicos = [
    dadosBrutos.servicos,
    dadosBrutos.Servico,
    dadosBrutos.ListaServicos
  ].filter(Boolean)

  for (const listaServicos of possiveisServicos) {
    const servicosArray = Array.isArray(listaServicos) ? listaServicos : [listaServicos]

    for (const servico of servicosArray) {
      const servicoEstruturado = {
        codigo_servico: extrairCampo(servico, ['codigo', 'CodigoTributacaoMunicipio', 'ItemListaServico'], [], false),
        descricao: extrairCampo(servico, ['descricao', 'Discriminacao', 'DescricaoServico'], [], false),
        quantidade: extrairValor(servico, ['quantidade', 'Quantidade'], [], false) || 1,
        valor_unitario: extrairValor(servico, ['valor_unitario', 'ValorUnitario'], [], false),
        valor_total: extrairValor(servico, ['valor_total', 'ValorServicos'], [], false),
        aliquota_iss: extrairValor(servico, ['aliquota_iss', 'Aliquota'], [], false),
        valor_iss: extrairValor(servico, ['valor_iss', 'ValorIss'], [], false)
      }

      if (servicoEstruturado.descricao || servicoEstruturado.codigo_servico) {
        servicos.push(servicoEstruturado)
        camposExtraidos.push('servicos')
      }
    }
    break
  }

  return servicos
}

/**
 * Extrair movimentações de extrato
 */
function extrairMovimentacoes(dadosBrutos: any, camposExtraidos: string[]): any[] {
  const movimentacoes: any[] = []

  const possiveisMovimentacoes = [
    dadosBrutos.movimentacoes,
    dadosBrutos.lancamentos,
    dadosBrutos.transacoes,
    dadosBrutos.extrato
  ].filter(Boolean)

  for (const listaMovimentacoes of possiveisMovimentacoes) {
    if (Array.isArray(listaMovimentacoes)) {
      for (const mov of listaMovimentacoes) {
        const valor = extrairValor(mov, ['valor', 'valor_movimento'], [], false)
        const movimentacao = {
          data: extrairCampo(mov, ['data', 'data_movimento'], [], false),
          descricao: extrairCampo(mov, ['descricao', 'historico', 'descricao_movimento'], [], false),
          valor: Math.abs(valor),
          tipo: valor >= 0 ? 'credito' : 'debito' as 'credito' | 'debito',
          categoria: extrairCampo(mov, ['categoria', 'tipo_movimento'], [], false),
          documento: extrairCampo(mov, ['documento', 'numero_documento'], [], false)
        }

        if (movimentacao.descricao && movimentacao.valor > 0) {
          movimentacoes.push(movimentacao)
          camposExtraidos.push('movimentacoes')
        }
      }
      break
    }
  }

  return movimentacoes
}

/**
 * Calcular confiança da extração baseada nos campos obrigatórios encontrados
 */
function calcularConfiancaExtracao(camposExtraidos: string[], camposObrigatorios: string[]): number {
  if (camposObrigatorios.length === 0) return 1.0

  let camposObrigatoriosEncontrados = 0

  for (const campoObrigatorio of camposObrigatorios) {
    // Verificar se algum campo extraído corresponde ao obrigatório
    const encontrado = camposExtraidos.some(campo => {
      // Suporte a caminhos aninhados (ex: emitente.cnpj)
      return campo.includes(campoObrigatorio.split('.').pop() || campoObrigatorio)
    })

    if (encontrado) {
      camposObrigatoriosEncontrados++
    }
  }

  // Calcular confiança base
  const confiancaBase = camposObrigatoriosEncontrados / camposObrigatorios.length

  // Bonus por campos extras encontrados
  const camposExtras = Math.max(0, camposExtraidos.length - camposObrigatorios.length)
  const bonusExtras = Math.min(0.1, camposExtras * 0.02) // Máximo 10% de bonus

  // Confiança final (máximo 1.0)
  return Math.min(1.0, confiancaBase + bonusExtras)
}

/**
 * Validar dados estruturados
 */
interface ResultadoValidacao {
  valido: boolean
  erros: string[]
  avisos: string[]
}

function validarDadosEstruturados(
  dados: DadosEstruturados,
  config: ConfiguracaoProcessamento
): ResultadoValidacao {
  const erros: string[] = []
  const avisos: string[] = []

  // Verificar confiança mínima
  if (dados.confianca_extracao < config.confianca_minima) {
    avisos.push(`Confiança da extração (${(dados.confianca_extracao * 100).toFixed(1)}%) abaixo do mínimo recomendado (${(config.confianca_minima * 100).toFixed(1)}%)`)
  }

  // Validações específicas por tipo
  switch (dados.tipo_documento) {
    case 'NFE':
      validarNFe(dados as DadosNFe, erros, avisos)
      break
    case 'NFSE':
      validarNFSe(dados as DadosNFSe, erros, avisos)
      break
    case 'RECIBO':
      validarRecibo(dados as DadosRecibo, erros, avisos)
      break
    case 'BOLETO':
      validarBoleto(dados as DadosBoleto, erros, avisos)
      break
    case 'EXTRATO':
      validarExtrato(dados as DadosExtrato, erros, avisos)
      break
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos
  }
}

/**
 * Validações específicas para NFe
 */
function validarNFe(dados: DadosNFe, erros: string[], avisos: string[]): void {
  // Validar CNPJ do emitente
  if (!validarCNPJ(dados.emitente.cnpj)) {
    erros.push('CNPJ do emitente inválido')
  }

  // Validar CNPJ/CPF do destinatário
  if (!validarCNPJouCPF(dados.destinatario.cnpj_cpf)) {
    erros.push('CNPJ/CPF do destinatário inválido')
  }

  // Validar valores
  if (dados.valor_total_nota <= 0) {
    erros.push('Valor total da nota deve ser maior que zero')
  }

  if (dados.valor_total_produtos > dados.valor_total_nota) {
    avisos.push('Valor dos produtos maior que valor total da nota')
  }

  // Validar chave de acesso se presente
  if (dados.chave_acesso && dados.chave_acesso.length !== 44) {
    avisos.push('Chave de acesso deve ter 44 dígitos')
  }

  // Validar itens
  if (dados.itens.length === 0) {
    avisos.push('Nenhum item encontrado na NFe')
  }
}

/**
 * Validações específicas para NFSe
 */
function validarNFSe(dados: DadosNFSe, erros: string[], avisos: string[]): void {
  // Validar CNPJ do prestador
  if (!validarCNPJ(dados.prestador.cnpj)) {
    erros.push('CNPJ do prestador inválido')
  }

  // Validar CNPJ/CPF do tomador
  if (!validarCNPJouCPF(dados.tomador.cnpj_cpf)) {
    erros.push('CNPJ/CPF do tomador inválido')
  }

  // Validar valores
  if (dados.valor_servicos <= 0) {
    erros.push('Valor dos serviços deve ser maior que zero')
  }

  if (dados.valor_liquido > dados.valor_servicos) {
    avisos.push('Valor líquido maior que valor dos serviços')
  }

  // Validar serviços
  if (dados.servicos.length === 0) {
    avisos.push('Nenhum serviço encontrado na NFSe')
  }
}

/**
 * Validações específicas para Recibo
 */
function validarRecibo(dados: DadosRecibo, erros: string[], avisos: string[]): void {
  // Validar CPF/CNPJ do emitente se presente
  if (dados.emitente.cpf_cnpj && !validarCNPJouCPF(dados.emitente.cpf_cnpj)) {
    erros.push('CPF/CNPJ do emitente inválido')
  }

  // Validar valor
  if (dados.valor_total <= 0) {
    erros.push('Valor do recibo deve ser maior que zero')
  }

  // Validar descrição
  if (dados.descricao_servico.length < 10) {
    avisos.push('Descrição do serviço muito curta')
  }
}

/**
 * Validações específicas para Boleto
 */
function validarBoleto(dados: DadosBoleto, erros: string[], avisos: string[]): void {
  // Validar CNPJ do cedente
  if (!validarCNPJ(dados.cedente.cnpj)) {
    erros.push('CNPJ do cedente inválido')
  }

  // Validar CPF/CNPJ do sacado
  if (!validarCNPJouCPF(dados.sacado.cpf_cnpj)) {
    erros.push('CPF/CNPJ do sacado inválido')
  }

  // Validar valor
  if (dados.valor_nominal <= 0) {
    erros.push('Valor nominal deve ser maior que zero')
  }

  // Validar datas
  const dataVenc = new Date(dados.data_vencimento)
  const dataEmis = new Date(dados.data_emissao)

  if (dataVenc < dataEmis) {
    erros.push('Data de vencimento não pode ser anterior à data de emissão')
  }

  // Validar linha digitável se presente
  if (dados.linha_digitavel && dados.linha_digitavel.replace(/\D/g, '').length !== 47) {
    avisos.push('Linha digitável deve ter 47 dígitos')
  }
}

/**
 * Validações específicas para Extrato
 */
function validarExtrato(dados: DadosExtrato, erros: string[], avisos: string[]): void {
  // Validar período
  const dataInicio = new Date(dados.data_inicio)
  const dataFim = new Date(dados.data_fim)

  if (dataFim < dataInicio) {
    erros.push('Data fim não pode ser anterior à data início')
  }

  // Validar saldos
  const totalMovimentacoes = dados.total_creditos - dados.total_debitos
  const diferencaSaldos = dados.saldo_final - dados.saldo_inicial

  if (Math.abs(totalMovimentacoes - diferencaSaldos) > 0.01) {
    avisos.push('Inconsistência entre saldos e movimentações')
  }

  // Validar movimentações
  if (dados.movimentacoes.length === 0) {
    avisos.push('Nenhuma movimentação encontrada no extrato')
  }
}

/**
 * Utilitários de validação
 */
function validarCNPJ(cnpj: string): boolean {
  if (!cnpj) return false

  const cnpjLimpo = cnpj.replace(/\D/g, '')
  if (cnpjLimpo.length !== 14) return false

  // Validação básica (implementação simplificada)
  return !(/^(\d)\1{13}$/.test(cnpjLimpo)) // Não pode ser todos iguais
}

function validarCPF(cpf: string): boolean {
  if (!cpf) return false

  const cpfLimpo = cpf.replace(/\D/g, '')
  if (cpfLimpo.length !== 11) return false

  // Validação básica (implementação simplificada)
  return !(/^(\d)\1{10}$/.test(cpfLimpo)) // Não pode ser todos iguais
}

function validarCNPJouCPF(documento: string): boolean {
  if (!documento) return false

  const docLimpo = documento.replace(/\D/g, '')

  if (docLimpo.length === 11) {
    return validarCPF(documento)
  } else if (docLimpo.length === 14) {
    return validarCNPJ(documento)
  }

  return false
}
