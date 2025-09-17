/**
 * Schemas de Validação Zod para Edge Functions
 * ContábilPro ERP - Fase 2
 */ import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
// Schemas comuns reutilizáveis
export const CommonSchemas = {
  // IDs obrigatórios
  empresaId: z.string().uuid('empresa_id deve ser um UUID válido'),
  userId: z.string().uuid('user_id deve ser um UUID válido'),
  // Paginação
  paginacao: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }).optional(),
  // Filtros de data
  filtroData: z.object({
    data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
    data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  }).refine((data)=>new Date(data.data_inicio) <= new Date(data.data_fim), {
    message: 'data_inicio deve ser anterior ou igual a data_fim'
  }),
  // Metadados de request
  metadados: z.object({
    user_agent: z.string().optional(),
    ip_address: z.string().optional(),
    trace_id: z.string().optional()
  }).optional()
};
// Schema base para filtros de relatório
export const FiltrosRelatorioSchema = CommonSchemas.filtroData.extend({
  empresa_id: CommonSchemas.empresaId.optional(),
  cliente_id: z.string().uuid().optional(),
  categoria: z.enum([
    'receitas',
    'despesas',
    'impostos',
    'geral'
  ]).optional(),
  status: z.enum([
    'pendente',
    'processado',
    'aprovado',
    'rejeitado'
  ]).optional(),
  valor_min: z.number().min(0).optional(),
  valor_max: z.number().min(0).optional(),
  tags: z.array(z.string()).optional()
});
// Schema para geração de relatório PDF
export const GerarRelatorioPdfSchema = z.object({
  template_id: z.string().uuid('Template ID deve ser um UUID válido'),
  user_id: CommonSchemas.userId,
  filtros: FiltrosRelatorioSchema,
  enviar_email: z.boolean().default(false),
  destinatarios: z.array(z.string().email('Email deve ter formato válido')).optional(),
  opcoes: z.object({
    formato: z.enum([
      'pdf',
      'excel',
      'csv'
    ]).default('pdf'),
    orientacao: z.enum([
      'portrait',
      'landscape'
    ]).default('portrait'),
    incluir_graficos: z.boolean().default(true),
    incluir_detalhes: z.boolean().default(true),
    marca_dagua: z.string().optional(),
    senha_protecao: z.string().min(6).optional()
  }).optional(),
  metadados: CommonSchemas.metadados.extend({
    titulo_personalizado: z.string().max(100).optional(),
    observacoes: z.string().max(500).optional(),
    prioridade: z.enum([
      'baixa',
      'normal',
      'alta'
    ]).default('normal'),
    notificar_conclusao: z.boolean().default(true)
  }).optional()
});
// Schema para anexos de email
export const AnexoEmailSchema = z.object({
  nome: z.string().min(1, 'Nome do anexo é obrigatório'),
  url: z.string().url('URL do anexo deve ser válida'),
  tipo: z.string().regex(/^[a-zA-Z0-9]+\/[a-zA-Z0-9\-+.]+$/, 'Tipo MIME inválido'),
  tamanho: z.number().min(1).max(25 * 1024 * 1024, 'Anexo deve ter no máximo 25MB')
});
// Schema para envio de email
export const EnviarEmailSchema = z.object({
  destinatarios: z.array(z.string().email('Email deve ter formato válido')).min(1, 'Pelo menos um destinatário é obrigatório').max(50, 'Máximo 50 destinatários'),
  destinatarios_copia: z.array(z.string().email('Email deve ter formato válido')).max(20, 'Máximo 20 destinatários em cópia').optional(),
  destinatarios_copia_oculta: z.array(z.string().email('Email deve ter formato válido')).max(20, 'Máximo 20 destinatários em cópia oculta').optional(),
  assunto: z.string().min(1, 'Assunto é obrigatório').max(200, 'Assunto deve ter no máximo 200 caracteres'),
  corpo_html: z.string().min(1, 'Corpo do email é obrigatório').max(100000, 'Corpo do email muito longo'),
  corpo_texto: z.string().max(50000, 'Corpo de texto muito longo').optional(),
  remetente_nome: z.string().min(1, 'Nome do remetente é obrigatório').max(100, 'Nome do remetente muito longo'),
  remetente_email: z.string().email('Email do remetente deve ser válido'),
  anexos: z.array(AnexoEmailSchema).max(10, 'Máximo 10 anexos por email').optional(),
  prioridade: z.enum([
    'baixa',
    'normal',
    'alta'
  ]).default('normal'),
  agendar_para: z.string().datetime('Data de agendamento deve ser ISO 8601').optional(),
  template_id: z.string().uuid().optional(),
  variaveis_template: z.record(z.string(), z.unknown()).optional(),
  rastreamento: z.object({
    abrir_email: z.boolean().default(true),
    clicar_links: z.boolean().default(true),
    rejeicoes: z.boolean().default(true)
  }).optional(),
  metadados: CommonSchemas.metadados.extend({
    campanha_id: z.string().optional(),
    categoria: z.string().optional(),
    tags: z.array(z.string()).optional()
  }).optional()
}).refine((data)=>{
  if (data.agendar_para) {
    return new Date(data.agendar_para) > new Date();
  }
  return true;
}, {
  message: 'Data de agendamento deve ser no futuro',
  path: [
    'agendar_para'
  ]
});
// Schema para processamento de documento
export const ProcessarDocumentoSchema = z.object({
  documento_id: z.string().uuid('Documento ID deve ser um UUID válido'),
  user_id: CommonSchemas.userId,
  empresa_id: CommonSchemas.empresaId.optional(),
  tipo_processamento: z.enum([
    'ocr',
    'classificacao',
    'extracao_dados',
    'validacao'
  ]),
  opcoes: z.object({
    idioma: z.enum([
      'pt',
      'en',
      'es'
    ]).default('pt'),
    qualidade: z.enum([
      'baixa',
      'media',
      'alta'
    ]).default('media'),
    extrair_tabelas: z.boolean().default(false),
    detectar_assinaturas: z.boolean().default(false),
    validar_cpf_cnpj: z.boolean().default(true)
  }).optional(),
  metadados: CommonSchemas.metadados
});
// Schema para webhook de status de documento
export const WebhookDocumentoStatusSchema = z.object({
  documento_id: z.string().uuid(),
  status: z.enum([
    'processando',
    'concluido',
    'erro',
    'cancelado'
  ]),
  progresso: z.number().min(0).max(100),
  resultado: z.object({
    texto_extraido: z.string().optional(),
    dados_estruturados: z.record(z.string(), z.any()).optional(),
    confianca: z.number().min(0).max(1).optional(),
    erros: z.array(z.string()).optional()
  }).optional(),
  metadados: z.object({
    tempo_processamento: z.number().min(0).optional(),
    paginas_processadas: z.number().min(0).optional(),
    tamanho_arquivo: z.number().min(0).optional()
  }).optional()
});
// Schemas comuns reutilizáveis
export const CommonSchemas = {
  // IDs obrigatórios
  empresaId: z.string().uuid('empresa_id deve ser um UUID válido'),
  userId: z.string().uuid('user_id deve ser um UUID válido'),
  // Paginação
  paginacao: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  }).optional(),
  // Filtros de data
  filtroData: z.object({
    data_inicio: z.string().datetime('data_inicio deve estar no formato ISO'),
    data_fim: z.string().datetime('data_fim deve estar no formato ISO')
  }).refine((data)=>new Date(data.data_inicio) <= new Date(data.data_fim), {
    message: 'data_inicio deve ser anterior ou igual a data_fim'
  }),
  // Metadados de request
  metadados: z.object({
    user_agent: z.string().optional(),
    ip_address: z.string().optional(),
    trace_id: z.string().optional()
  }).optional()
};
// Função utilitária para validação com mensagens de erro amigáveis
export function validarSchema(schema, data, contexto = 'dados') {
  try {
    const resultado = schema.parse(data);
    return {
      sucesso: true,
      dados: resultado
    };
  } catch (_error) {
    if (error instanceof z.ZodError) {
      const erros = error.errors.map((err)=>{
        const caminho = err.path.join('.');
        return `${caminho}: ${err.message}`;
      });
      console.error(`[VALIDACAO_ERRO] ${contexto}:`, erros);
      return {
        sucesso: false,
        erros
      };
    }
    console.error(`[VALIDACAO_ERRO_INESPERADO] ${contexto}:`, error);
    return {
      sucesso: false,
      erros: [
        'Erro de validação inesperado'
      ]
    };
  }
}
// Função para sanitizar dados de entrada
export function sanitizarEntrada(data) {
  if (typeof data === 'string') {
    return data.trim();
  }
  if (Array.isArray(data)) {
    return data.map(sanitizarEntrada);
  }
  if (data && typeof data === 'object') {
    const sanitizado = {};
    for (const [key, value] of Object.entries(data)){
      sanitizado[key] = sanitizarEntrada(value);
    }
    return sanitizado;
  }
  return data;
}
