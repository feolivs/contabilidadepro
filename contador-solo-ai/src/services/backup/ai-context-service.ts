'use client'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { ocrService, type OCRResult, type TipoDocumentoFiscal } from '../ocr-service'
import type {
  Result,
  ResourceManager,
  ResourceUsage
} from '@/types/ai-context.types'
import { ERROR_CODES, ContextError as ContextErrorClass } from '@/types/ai-context.types'
import { logger, measureOperation, createOperationContext } from './structured-logger'
// import { unifiedCacheService } from './unified-cache-service'
import {
  DadosEstruturadosOCR
} from '@/types/structured-data.types'

// Tipos para o contexto rico (mantendo compatibilidade)
export interface EnhancedAIContext {
  empresaId?: string;
  userId: string;
  includeFinancialData?: boolean;
  includeObligations?: boolean;
  includeDocuments?: boolean;
  includeInsights?: boolean;
  timeRange?: 'current_month' | 'last_3_months' | 'last_year';
}

export interface EmpresaDB {
  id: string;
  nome: string | null;
  cnpj: string | null;
  regime_tributario: string | null;
  atividade_principal: string | null;
  anexo_simples?: string | null;
  ativa: boolean;
}

export interface EmpresaCompleta {
  id: string;
  nome: string;
  cnpj: string;
  regime_tributario: string;
  atividade_principal: string;
  anexo_simples?: string;
  status: string;
  calculos_recentes: CalculoRecente[];
  obrigacoes_pendentes: ObrigacaoPendente[];
  documentos_recentes: DocumentoRecente[];
  insights: EmpresaInsights;
}

export interface CalculoRecente {
  id: string;
  tipo_calculo: string;
  competencia: string;
  valor_total: number;
  status: string;
  data_vencimento?: string;
  aliquota_efetiva?: number;
}

export interface ObrigacaoPendente {
  id: string;
  nome: string;
  tipo_obrigacao: string;
  data_vencimento: string;
  valor?: number;
  status: string;
  prioridade: string;
  situacao: 'vencida' | 'proxima' | 'futura';
}

export interface DocumentoRecente {
  id: string;
  nome_arquivo: string;
  tipo_documento: TipoDocumentoFiscal;
  categoria_documento?: 'fiscal' | 'contabil' | 'societario' | 'bancario';
  data_emissao?: string;
  valor_total?: number;
  status_processamento: string;
  confianca_ocr?: number;
  dados_extraidos?: DadosEstruturadosOCR;
}

export interface DocumentoFiltros {
  periodo?: 'current_month' | 'last_3_months' | 'last_6_months' | 'current_year';
  tipos?: TipoDocumentoFiscal[];
  categorias?: ('fiscal' | 'contabil' | 'societario' | 'bancario')[];
  status?: string[];
  valorMinimo?: number;
  valorMaximo?: number;
  confiancaMinima?: number; // Filtro para confiança do OCR
  limit?: number;
  offset?: number;
}

export interface EmpresaInsights {
  carga_tributaria_media: number;
  tendencia_faturamento: 'crescimento' | 'estavel' | 'declinio';
  obrigacoes_criticas: number;
  economia_potencial: number;
  score_conformidade: number;
  alertas_importantes: string[];
  documentos_insights?: DocumentoInsights;
}

export interface DocumentoInsights {
  total_documentos: number;
  valor_total_documentos: number;
  tipos_mais_frequentes: Array<{ tipo: string; quantidade: number }>;
  documentos_pendentes: number;
  ultimo_processamento: string;
  tendencia_volume: 'crescimento' | 'estavel' | 'declinio';
}

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface QueryResult<T = unknown> {
  queryId: string;
  data: T;
  success: boolean;
  error?: string;
}

export interface BatchQueryResult {
  results: QueryResult[];
  totalQueries: number;
  successfulQueries: number;
  executionTime: number;
}

export interface EmpresaBasicData {
  id: string;
  nome: string;
  cnpj: string;
  regime_tributario: string;
  situacao_fiscal: string;
  atividade_principal?: string;
  anexo_simples?: string;
  ativa?: boolean;
}

export interface CalculoData {
  id: string;
  tipo_calculo: string;
  valor_total: number;
  aliquota_efetiva: number;
  competencia: string;
  data_calculo: Date;
  status: string;
}

export interface ObrigacaoData {
  id: string;
  nome: string;
  tipo_obrigacao: string;
  data_vencimento: string;
  situacao: 'vencida' | 'proxima' | 'futura';
  valor?: number;
  status: string;
  prioridade: string;
}

export interface ContextualData {
  empresa?: EmpresaCompleta;
  empresas?: EmpresaCompleta[];
  resumo_geral?: ResumoGeral;
  configuracoes_usuario?: UserAISettings;
}

export interface ResumoGeral {
  total_empresas: number;
  empresas_ativas: number;
  total_calculos_pendentes: number;
  total_obrigacoes_vencidas: number;
  valor_total_pendente: number;
  proximos_vencimentos: ObrigacaoPendente[];
}

export interface UserAISettings {
  communication_style: 'formal' | 'friendly' | 'concise';
  detail_level: number; // 1-5
  focus_areas: string[];
  custom_prompt?: string;
  preferred_language: 'pt-BR';
}

export class AIContextService implements ResourceManager {
  private static instance: AIContextService
  private supabase: ReturnType<typeof createClient<Database>>
  private cleanupInterval?: NodeJS.Timeout
  public isDestroyed = false
  private performanceMetrics: Array<{ operation: string; duration: number; timestamp: Date }> = []
  private readonly MAX_METRICS = 1000

  private constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    this.initializeCleanup()

    logger.info('AIContextService initialized', {
      operation: 'service_initialization',
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Obtém instância singleton do serviço
   */
  static getInstance(): AIContextService {
    if (!AIContextService.instance) {
      AIContextService.instance = new AIContextService()
    }
    return AIContextService.instance
  }

  /**
   * Inicializa limpeza automática de recursos
   */
  private initializeCleanup(): void {
    if (typeof window === 'undefined') return // Apenas no servidor

    this.cleanupInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.performMaintenance()
      }
    }, 5 * 60 * 1000) // 5 minutos
  }

  /**
   * Implementa cleanup do ResourceManager
   */
  async cleanup(): Promise<void> {
    this.isDestroyed = true

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    // Limpar métricas antigas
    this.performanceMetrics = []

    logger.info('AIContextService cleanup completed', {
      operation: 'service_cleanup'
    })
  }

  /**
   * Implementa getResourceUsage do ResourceManager
   */
  getResourceUsage(): ResourceUsage {
    // const cacheStats = unifiedCacheService.getMetrics()

    return {
      memoryUsage: process.memoryUsage?.()?.heapUsed || 0,
      cacheSize: 0, // cacheStats.cacheSize,
      activeConnections: 1, // Supabase connection
      uptime: Date.now() - (this.performanceMetrics[0]?.timestamp.getTime() || Date.now())
    }
  }

  /**
   * Realiza manutenção periódica
   */
  private performMaintenance(): void {
    // Limpar métricas antigas (manter apenas as últimas 1000)
    if (this.performanceMetrics.length > this.MAX_METRICS) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS)
    }

    // Log de status
    const resourceUsage = this.getResourceUsage()
    logger.debug('Maintenance completed', {
      operation: 'maintenance',
      resourceUsage
    })
  }

  /**
   * Gera chave de cache única (delegando para unifiedCacheService)
   */
  private generateCacheKey(prefix: string, ...params: (string | number | boolean)[]): string {
    return `${prefix}:${params.join(':')}`
  }

  /**
   * Busca dados do cache (usando unifiedCacheService)
   */
  private async getFromCache<T>(key: string, strategy?: string): Promise<T | null> {
    return null
  }

  /**
   * Salva dados no cache (usando unifiedCacheService)
   */
  private async setCache<T>(key: string, data: T, strategy: string = 'default'): Promise<void> {
    // Cache implementation disabled
  }

  /**
   * Invalida cache relacionado aos documentos de uma empresa
   */
  private invalidateDocumentCache(empresaId: string): void {
    // unifiedCacheService.invalidatePattern(`documentos:${empresaId}`)
  }

  /**
   * Limpa todo o cache
   */
  public clearCache(): void {
    // unifiedCacheService.clear()
  }

  /**
   * Processa documento com OCR para extração de dados
   */
  public async processDocumentWithOCR(
    fileBuffer: Buffer,
    filename: string,
    empresaId: string
  ): Promise<{
    success: boolean;
    ocrResult?: OCRResult;
    documentoId?: string;
    error?: string;
  }> {
    try {
      // Verificar se formato é suportado
      if (!ocrService.isFormatSupported(filename)) {
        return {
          success: false,
          error: 'Formato de arquivo não suportado para OCR'
        };
      }

      // Processar documento com OCR
      const ocrResult = await ocrService.processDocument(fileBuffer, filename);

      // Classificar tipo de documento automaticamente usando o novo sistema
      const tipoClassificado = await ocrService.classifyDocument(ocrResult.texto_extraido);
      const categoriaDocumento = this.categorizarDocumento(tipoClassificado);

      // Salvar resultado no banco com categorização
      const { data: documento, error } = await this.supabase
        .from('documentos_fiscais')
        .insert({
          empresa_id: empresaId,
          nome_arquivo: filename,
          tipo_documento: tipoClassificado,
          categoria: categoriaDocumento,
          status: 'processado_ocr',
          dados_ocr: ocrResult,
          confianca_ocr: ocrResult.confianca,
          valor_total: ocrResult.dados_estruturados?.valores_monetarios?.[0]?.valor,
          data_emissao: ocrResult.dados_estruturados?.datas_importantes?.find(d => d.tipo === 'emissao')?.data,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Erro ao salvar resultado OCR:', error);
        // Continuar mesmo com erro de salvamento
      }

      // Invalidar cache relacionado aos documentos da empresa
      this.invalidateDocumentCache(empresaId);

      return {
        success: true,
        ocrResult,
        documentoId: documento?.id
      };

    } catch (error) {
      console.error('Erro no processamento OCR:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no OCR'
      };
    }
  }



  /**
   * Categoriza documento baseado no tipo
   */
  private categorizarDocumento(tipoDocumento: string): 'fiscal' | 'contabil' | 'societario' | 'bancario' {
    const tipoLower = tipoDocumento.toLowerCase();

    // Documentos fiscais
    if (['nfe', 'nfce', 'nfse', 'cte', 'mdfe', 'das', 'darf', 'gare', 'dae', 'gnre',
         'esocial', 'efd_reinf', 'sped', 'ecf', 'dirf', 'defis', 'rais', 'caged',
         'extrato_vendas_cartao', 'resumo_vendas_tef', 'comprovante_pix'].some(tipo => tipoLower.includes(tipo))) {
      return 'fiscal';
    }

    // Documentos contábeis
    if (['extrato_bancario', 'recibo_despesa', 'contrato_emprestimo', 'apolice_seguro',
         'balanco', 'dre', 'balancete', 'razao', 'livro_diario', 'livro_caixa',
         'demonstracao_fluxo_caixa'].some(tipo => tipoLower.includes(tipo))) {
      return 'contabil';
    }

    // Documentos societários
    if (['contrato_social', 'ficha_cadastral', 'alvara', 'ata_assembleia',
         'procuracao', 'certidao'].some(tipo => tipoLower.includes(tipo))) {
      return 'societario';
    }

    // Documentos bancários
    if (['extrato_bancario', 'comprovante_pix'].some(tipo => tipoLower.includes(tipo))) {
      return 'bancario';
    }

    return 'fiscal'; // Default
  }

  /**
   * Busca documentos processados com OCR
   */
  public async getDocumentosComOCR(empresaId: string, filtros?: DocumentoFiltros): Promise<Array<{
    id: string;
    nome_arquivo: string;
    tipo_documento: TipoDocumentoFiscal;
    categoria_documento: 'fiscal' | 'contabil' | 'societario' | 'bancario';
    confianca_ocr: number;
    dados_extraidos?: any;
  }>> {
    let query = this.supabase
      .from('documentos_fiscais')
      .select('id, nome_arquivo, tipo_documento, dados_ocr, confianca_ocr, created_at')
      .eq('empresa_id', empresaId)
      .in('status', ['processado_ocr', 'processado', 'validado'])
      .order('created_at', { ascending: false });

    // Aplicar filtros se fornecidos
    if (filtros?.tipos && filtros.tipos.length > 0) {
      query = query.in('tipo_documento', filtros.tipos);
    }

    if (filtros?.confiancaMinima) {
      query = query.gte('confianca_ocr', filtros.confiancaMinima);
    }

    const limit = filtros?.limit || 100;
    query = query.limit(limit);

    const { data: documentos, error } = await query;

    if (error) {
      console.warn('Erro ao buscar documentos com OCR:', error);
      return [];
    }

    return documentos?.map((doc: any) => ({
      id: doc.id,
      nome_arquivo: doc.nome_arquivo,
      tipo_documento: doc.tipo_documento as TipoDocumentoFiscal,
      categoria_documento: this.categorizarDocumento(doc.tipo_documento),
      confianca_ocr: doc.confianca_ocr || 0,
      dados_extraidos: doc.dados_ocr
    })) || [];
  }

  /**
   * Coleta dados contextuais completos baseado nos parâmetros
   */
  async collectContextualData(context: EnhancedAIContext): Promise<Result<ContextualData, ContextErrorClass>> {
    const operationContext = createOperationContext('collect_contextual_data', context.userId, { context })

    return await measureOperation('collectContextualData', async () => {
      try {
        const contextData: ContextualData = {}

        if (context.empresaId) {
          // Buscar dados da empresa de forma simples
          const empresaResult = await this.getEmpresaCompleta(context.empresaId, context)
          if (!empresaResult.success) {
            return { success: false, error: empresaResult.error }
          }
          contextData.empresa = empresaResult.data
        } else {
          // Dados de todas as empresas do usuário (temporário - manter compatibilidade)
          try {
            contextData.empresas = await this.getEmpresasUsuario(context.userId, context)
            contextData.resumo_geral = await this.getResumoGeral(context.userId)
          } catch (error) {
            logger.warn('Failed to fetch user companies or summary', {
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }

        // Configurações do usuário (temporário - manter compatibilidade)
        try {
          contextData.configuracoes_usuario = await this.getUserAISettings(context.userId)
        } catch (error) {
          logger.warn('Failed to fetch user AI settings', {
            error: error instanceof Error ? error.message : String(error)
          })
        }

        return { success: true, data: contextData }

      } catch (error) {
        const contextError = new ContextErrorClass(
          'Falha ao coletar dados contextuais',
          ERROR_CODES.CONTEXT_COLLECTION_FAILED,
          { context, timestamp: new Date().toISOString() },
          error instanceof Error ? error : new Error(String(error)),
          operationContext.traceId
        )

        logger.error('Context collection failed', {
          error: contextError.toJSON(),
          context,
          traceId: operationContext.traceId
        })

        return { success: false, error: contextError }
      }
    }, operationContext)
  }

  /**
   * Busca dados completos de uma empresa específica
   */
  async getEmpresaCompleta(empresaId: string, context: EnhancedAIContext): Promise<Result<EmpresaCompleta, ContextErrorClass>> {
    const operationContext = createOperationContext('get_empresa_completa', context.userId, { empresaId })

    return await measureOperation('getEmpresaCompleta', async () => {
      try {
        // Buscar dados básicos da empresa
        const { data: empresa, error: empresaError } = await this.supabase
          .from('empresas')
          .select('*')
          .eq('id', empresaId)
          .single();

        if (empresaError || !empresa) {
          return {
            success: false,
            error: new ContextErrorClass(
              `Empresa não encontrada: ${empresaError?.message}`,
              ERROR_CODES.EMPRESA_FETCH_FAILED,
              { empresaId },
              empresaError,
              operationContext.traceId
            )
          }
        }

        const empresaDB = empresa as EmpresaDB;

        // Buscar dados em paralelo para melhor performance
        const [calculosResult, obrigacoesResult, documentosResult] = await Promise.allSettled([
          context.includeFinancialData !== false
            ? this.getCalculosRecentes(empresaId, context.timeRange)
            : Promise.resolve([]),

          context.includeObligations !== false
            ? this.getObrigacoesPendentes(empresaId)
            : Promise.resolve([]),

          context.includeDocuments !== false
            ? this.getDocumentosRecentes(empresaId, {
                periodo: (context.timeRange === 'last_year' ? 'current_year' : context.timeRange) || 'last_3_months',
                limit: 20, // Otimizado
                tipos: ['NFe', 'NFCe', 'CTe'], // Principais tipos
                status: ['processado', 'validado'] // Apenas relevantes
              })
            : Promise.resolve([])
        ]);

        const calculosRecentes = calculosResult.status === 'fulfilled' ? calculosResult.value : []
        const obrigacoesPendentes = obrigacoesResult.status === 'fulfilled' ? obrigacoesResult.value : []
        const documentosRecentes = documentosResult.status === 'fulfilled' ? documentosResult.value : []

        // Gerar insights apenas se solicitado
        const insights = context.includeInsights !== false
          ? await this.generateEmpresaInsights(empresaDB, calculosRecentes, obrigacoesPendentes, documentosRecentes)
          : await this.generateEmpresaInsights(empresaDB, [], [], [])

        const empresaCompleta: EmpresaCompleta = {
          id: empresaDB.id,
          nome: empresaDB.nome || 'Empresa sem nome',
          cnpj: empresaDB.cnpj || '',
          regime_tributario: empresaDB.regime_tributario || 'Não informado',
          atividade_principal: empresaDB.atividade_principal || 'Não informada',
          anexo_simples: empresaDB.anexo_simples || undefined,
          status: empresaDB.ativa ? 'ativa' : 'inativa',
          calculos_recentes: calculosRecentes,
          obrigacoes_pendentes: obrigacoesPendentes,
          documentos_recentes: documentosRecentes,
          insights
        }

        return { success: true, data: empresaCompleta }

      } catch (error) {
        return {
          success: false,
          error: new ContextErrorClass(
            'Falha ao buscar dados completos da empresa',
            ERROR_CODES.EMPRESA_FETCH_FAILED,
            { empresaId, context },
            error instanceof Error ? error : new Error(String(error)),
            operationContext.traceId
          )
        }
      }
    }, operationContext)
  }

  /**
   * Busca dados de todas as empresas do usuário
   */
  async getEmpresasUsuario(userId: string, context: EnhancedAIContext): Promise<EmpresaCompleta[]> {
    const { data: empresas, error } = await this.supabase
      .from('empresas')
      .select('id')
      .eq('user_id', userId)
      .eq('ativa', true)
      .limit(10); // Limitar para performance

    if (error || !empresas) {
      return [];
    }

    const empresasResults = await Promise.all(
      empresas.map(empresa => this.getEmpresaCompleta(empresa.id, context))
    );

    // Filtrar apenas os resultados bem-sucedidos
    return empresasResults
      .filter(result => result.success)
      .map(result => (result as { success: true; data: EmpresaCompleta }).data);
  }

  /**
   * Busca cálculos fiscais recentes
   */
  async getCalculosRecentes(empresaId: string, timeRange?: string): Promise<CalculoRecente[]> {
    const dateFilter = new Date();
    
    switch (timeRange) {
      case 'current_month':
        dateFilter.setMonth(dateFilter.getMonth() - 1);
        break;
      case 'last_3_months':
        dateFilter.setMonth(dateFilter.getMonth() - 3);
        break;
      case 'last_year':
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
      default:
        dateFilter.setMonth(dateFilter.getMonth() - 6); // 6 meses por padrão
    }

    const { data: calculos, error } = await this.supabase
      .from('calculos_fiscais')
      .select('id, tipo_calculo, competencia, valor_total, status, data_vencimento, aliquota_efetiva')
      .eq('empresa_id', empresaId)
      .gte('created_at', dateFilter.toISOString())
      .order('competencia', { ascending: false })
      .limit(12);

    if (error) {
      console.warn('Erro ao buscar cálculos recentes:', error)
      return [];
    }

    return calculos?.map(calc => ({
      id: calc.id,
      tipo_calculo: calc.tipo_calculo,
      competencia: calc.competencia,
      valor_total: Number(calc.valor_total),
      status: calc.status || 'pendente',
      data_vencimento: calc.data_vencimento,
      aliquota_efetiva: calc.aliquota_efetiva ? Number(calc.aliquota_efetiva) : undefined
    })) || [];
  }

  /**
   * Busca obrigações fiscais pendentes
   */
  async getObrigacoesPendentes(empresaId: string): Promise<ObrigacaoPendente[]> {
    const { data: obrigacoes, error } = await this.supabase
      .from('obrigacoes_fiscais')
      .select('*')
      .eq('empresa_id', empresaId)
      .in('status', ['pendente', 'pending'])
      .order('data_vencimento', { ascending: true })
      .limit(20);

    if (error) {
      console.warn('Erro ao buscar obrigações pendentes:', error)
      return [];
    }

    return obrigacoes?.map(obr => ({
      id: obr.id || '',
      nome: obr.nome || 'Obrigação sem nome',
      tipo_obrigacao: obr.tipo_obrigacao || 'Não especificado',
      data_vencimento: obr.data_vencimento || '',
      valor: obr.valor ? Number(obr.valor) : undefined,
      status: obr.status || 'pendente',
      prioridade: obr.prioridade || 'media',
      situacao: obr.situacao as 'vencida' | 'proxima' | 'futura' || 'futura'
    })) || [];
  }

  /**
   * Busca documentos recentes com filtros avançados e cache
   */
  async getDocumentosRecentes(empresaId: string, filtros?: DocumentoFiltros): Promise<DocumentoRecente[]> {
    // Gerar chave de cache
    const cacheKey = this.generateCacheKey('documentos', empresaId, JSON.stringify(filtros || {}));

    // Tentar buscar do cache primeiro
    const cachedData = await this.getFromCache<DocumentoRecente[]>(cacheKey, 'documentos-insights');
    if (cachedData) {
      return cachedData;
    }

    let query = this.supabase
      .from('documentos_fiscais')
      .select('id, nome_arquivo, tipo_documento, data_emissao, valor_total, status, created_at')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });

    // Aplicar filtro de período
    if (filtros?.periodo) {
      const dataLimite = this.calcularDataLimite(filtros.periodo);
      query = query.gte('created_at', dataLimite.toISOString());
    }

    // Aplicar filtro de tipos de documento
    if (filtros?.tipos && filtros.tipos.length > 0) {
      query = query.in('tipo_documento', filtros.tipos);
    }

    // Aplicar filtro de categorias
    if (filtros?.categorias && filtros.categorias.length > 0) {
      query = query.in('categoria', filtros.categorias);
    }

    // Aplicar filtro de confiança mínima do OCR
    if (filtros?.confiancaMinima) {
      query = query.gte('confianca_ocr', filtros.confiancaMinima);
    }

    // Aplicar filtro de status
    if (filtros?.status && filtros.status.length > 0) {
      query = query.in('status', filtros.status);
    }

    // Aplicar filtro de valor mínimo
    if (filtros?.valorMinimo) {
      query = query.gte('valor_total', filtros.valorMinimo);
    }

    // Aplicar filtro de valor máximo
    if (filtros?.valorMaximo) {
      query = query.lte('valor_total', filtros.valorMaximo);
    }

    // Aplicar paginação
    const limit = filtros?.limit || 20; // Aumentado para 20 por padrão
    const offset = filtros?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data: documentos, error } = await query;

    if (error) {
      console.warn('Erro ao buscar documentos recentes:', error);
      return [];
    }

    const result = documentos?.map(doc => ({
      id: doc.id,
      nome_arquivo: doc.nome_arquivo,
      tipo_documento: doc.tipo_documento as TipoDocumentoFiscal,
      categoria_documento: this.categorizarDocumento(doc.tipo_documento),
      data_emissao: doc.data_emissao || undefined,
      valor_total: doc.valor_total ? Number(doc.valor_total) : undefined,
      status_processamento: doc.status || 'pendente',
      confianca_ocr: (doc as any).confianca_ocr ? Number((doc as any).confianca_ocr) : undefined,
      dados_extraidos: (doc as any).dados_ocr || undefined
    })) || [];

    // Armazenar no cache (documentos ficam no cache por 15 minutos)
    await this.setCache(cacheKey, result, 'documentos-insights');

    return result;
  }

  /**
   * Calcula a data limite baseada no período
   */
  private calcularDataLimite(periodo: string): Date {
    const agora = new Date();

    switch (periodo) {
      case 'current_month':
        return new Date(agora.getFullYear(), agora.getMonth(), 1);

      case 'last_3_months':
        return new Date(agora.getFullYear(), agora.getMonth() - 3, 1);

      case 'last_6_months':
        return new Date(agora.getFullYear(), agora.getMonth() - 6, 1);

      case 'current_year':
        return new Date(agora.getFullYear(), 0, 1);

      default:
        // Últimos 30 dias por padrão
        return new Date(agora.getTime() - (30 * 24 * 60 * 60 * 1000));
    }
  }

  /**
   * Gera insights específicos sobre documentos
   */
  async generateDocumentosInsights(empresaId: string, documentos: DocumentoRecente[]): Promise<DocumentoInsights> {
    // Calcular estatísticas dos documentos
    const totalDocumentos = documentos.length;
    const valorTotalDocumentos = documentos.reduce((sum, doc) => sum + (doc.valor_total || 0), 0);
    const documentosPendentes = documentos.filter(doc => doc.status_processamento === 'pendente').length;

    // Análise de tipos mais frequentes
    const tiposCount = documentos.reduce((acc, doc) => {
      acc[doc.tipo_documento] = (acc[doc.tipo_documento] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tiposMaisFrequentes = Object.entries(tiposCount)
      .map(([tipo, quantidade]) => ({ tipo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    // Último processamento
    const ultimoProcessamento = documentos
      .filter(doc => doc.status_processamento === 'processado')
      .sort((a, b) => new Date(b.data_emissao || '').getTime() - new Date(a.data_emissao || '').getTime())[0]?.data_emissao || '';

    // Análise de tendência de volume
    const tendenciaVolume = this.analisarTendenciaVolumeDocumentos(documentos);

    return {
      total_documentos: totalDocumentos,
      valor_total_documentos: valorTotalDocumentos,
      tipos_mais_frequentes: tiposMaisFrequentes,
      documentos_pendentes: documentosPendentes,
      ultimo_processamento: ultimoProcessamento,
      tendencia_volume: tendenciaVolume
    };
  }

  /**
   * Analisa tendência de volume de documentos
   */
  private analisarTendenciaVolumeDocumentos(documentos: DocumentoRecente[]): 'crescimento' | 'estavel' | 'declinio' {
    if (documentos.length < 6) return 'estavel';

    // Dividir em duas metades para comparar
    const metade = Math.floor(documentos.length / 2);
    const primeiraMetade = documentos.slice(0, metade);
    const segundaMetade = documentos.slice(metade);

    const volumePrimeiro = primeiraMetade.length;
    const volumeSegundo = segundaMetade.length;

    const diferenca = (volumeSegundo - volumePrimeiro) / volumePrimeiro;

    if (diferenca > 0.1) return 'crescimento';
    if (diferenca < -0.1) return 'declinio';
    return 'estavel';
  }

  /**
   * Gera insights inteligentes sobre a empresa
   */
  async generateEmpresaInsights(
    empresa: EmpresaDB,
    calculos: CalculoRecente[],
    obrigacoes: ObrigacaoPendente[],
    documentos?: DocumentoRecente[]
  ): Promise<EmpresaInsights> {
    // Calcular carga tributária média
    const cargaTributaria = calculos.length > 0 
      ? calculos.reduce((sum, calc) => sum + (calc.aliquota_efetiva || 0), 0) / calculos.length
      : 0;

    // Analisar tendência de faturamento
    const tendencia = this.analisarTendenciaFaturamento(calculos);

    // Contar obrigações críticas (vencidas ou próximas)
    const obrigacoesCriticas = obrigacoes.filter(
      obr => obr.situacao === 'vencida' || obr.situacao === 'proxima'
    ).length;

    // Calcular economia potencial (estimativa)
    const economiaPotencial = calculos.reduce((sum, calc) => sum + calc.valor_total, 0) * 0.05; // 5%

    // Score de conformidade
    const scoreConformidade = this.calcularScoreConformidade(obrigacoes, calculos);

    // Alertas importantes
    const alertas = this.gerarAlertasImportantes(empresa, obrigacoes, calculos);

    // Gerar insights de documentos se disponíveis
    const documentosInsights = documentos && documentos.length > 0
      ? await this.generateDocumentosInsights(empresa.id, documentos)
      : undefined;

    return {
      carga_tributaria_media: cargaTributaria,
      tendencia_faturamento: tendencia,
      obrigacoes_criticas: obrigacoesCriticas,
      economia_potencial: economiaPotencial,
      score_conformidade: scoreConformidade,
      alertas_importantes: alertas,
      documentos_insights: documentosInsights
    };
  }

  /**
   * Analisa tendência de faturamento baseado nos cálculos
   */
  private analisarTendenciaFaturamento(calculos: CalculoRecente[]): 'crescimento' | 'estavel' | 'declinio' {
    if (calculos.length < 3) return 'estavel';

    const valores = calculos.slice(0, 6).map(c => c.valor_total);
    const primeiraTrimestre = valores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const segundaTrimestre = valores.slice(3, 6).reduce((a, b) => a + b, 0) / 3;

    const variacao = ((segundaTrimestre - primeiraTrimestre) / primeiraTrimestre) * 100;

    if (variacao > 10) return 'crescimento';
    if (variacao < -10) return 'declinio';
    return 'estavel';
  }

  /**
   * Calcula score de conformidade fiscal
   */
  private calcularScoreConformidade(obrigacoes: ObrigacaoPendente[], calculos: CalculoRecente[]): number {
    let score = 100;

    // Penalizar por obrigações vencidas
    const vencidas = obrigacoes.filter(o => o.situacao === 'vencida').length;
    score -= vencidas * 15;

    // Penalizar por cálculos em atraso
    const atrasados = calculos.filter(c => c.status === 'vencido').length;
    score -= atrasados * 10;

    // Bonificar por regularidade
    if (calculos.length >= 6 && vencidas === 0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Gera alertas importantes baseado nos dados
   */
  private gerarAlertasImportantes(
    empresa: EmpresaDB,
    obrigacoes: ObrigacaoPendente[],
    calculos: CalculoRecente[]
  ): string[] {
    const alertas: string[] = [];

    // Alertas de vencimento
    const vencidas = obrigacoes.filter(o => o.situacao === 'vencida');
    if (vencidas.length > 0) {
      alertas.push(`${vencidas.length} obrigação(ões) vencida(s) - ação urgente necessária`);
    }

    const proximas = obrigacoes.filter(o => o.situacao === 'proxima');
    if (proximas.length > 0) {
      alertas.push(`${proximas.length} obrigação(ões) vencendo em breve`);
    }

    // Alertas de regime tributário
    if (empresa.regime_tributario === 'Simples Nacional') {
      const faturamentoAnual = calculos.reduce((sum, calc) => sum + calc.valor_total, 0) * 12;
      if (faturamentoAnual > 4800000) {
        alertas.push('Faturamento próximo ao limite do Simples Nacional - considere planejamento');
      }
    }

    return alertas;
  }

  /**
   * Busca resumo geral de todas as empresas
   */
  async getResumoGeral(userId: string): Promise<ResumoGeral> {
    // Buscar estatísticas gerais
    const { data: empresas } = await this.supabase
      .from('empresas')
      .select('id, ativa')
      .eq('user_id', userId);

    const totalEmpresas = empresas?.length || 0;
    const empresasAtivas = empresas?.filter(e => e.ativa).length || 0;
    const empresaIds = empresas?.map(e => e.id) || [];

    // Buscar cálculos pendentes
    const { data: calculosPendentes } = await this.supabase
      .from('calculos_fiscais')
      .select('id, valor_total, status')
      .in('empresa_id', empresaIds)
      .in('status', ['pendente', 'pending']);

    const totalCalculosPendentes = calculosPendentes?.length || 0;
    const valorTotalPendente = calculosPendentes?.reduce((sum, calc) =>
      sum + (Number(calc.valor_total) || 0), 0) || 0;

    // Buscar obrigações vencidas
    const { data: obrigacoesVencidas } = await this.supabase
      .from('obrigacoes_fiscais')
      .select('id')
      .in('empresa_id', empresaIds)
      .eq('situacao', 'vencida');

    const totalObrigacoesVencidas = obrigacoesVencidas?.length || 0;

    // Buscar próximos vencimentos
    const { data: proximosVencimentos } = await this.supabase
      .from('obrigacoes_fiscais')
      .select('*')
      .in('empresa_id', empresaIds)
      .eq('situacao', 'proxima')
      .order('data_vencimento', { ascending: true })
      .limit(5);

    return {
      total_empresas: totalEmpresas,
      empresas_ativas: empresasAtivas,
      total_calculos_pendentes: totalCalculosPendentes,
      total_obrigacoes_vencidas: totalObrigacoesVencidas,
      valor_total_pendente: valorTotalPendente,
      proximos_vencimentos: proximosVencimentos?.map(obr => ({
        id: obr.id || '',
        nome: obr.nome || '',
        tipo_obrigacao: obr.tipo_obrigacao || '',
        data_vencimento: obr.data_vencimento || '',
        valor: obr.valor ? Number(obr.valor) : undefined,
        status: obr.status || 'pendente',
        prioridade: obr.prioridade || 'media',
        situacao: 'proxima' as const
      })) || []
    };
  }

  /**
   * Busca configurações de IA do usuário
   */
  async getUserAISettings(_userId: string): Promise<UserAISettings> {
    // TODO: Implementar tabela user_ai_settings no banco de dados
    // Por enquanto, retorna configurações padrão para evitar erros

    // Configurações padrão
    return {
      communication_style: 'friendly',
      detail_level: 3,
      focus_areas: ['calculo_fiscal', 'conformidade'],
      preferred_language: 'pt-BR'
    };
  }

  /**
   * ✅ FASE 2: Processa resultados de queries paralelas
   */
  private processParallelQueryResults(batchResult: BatchQueryResult, empresaId: string): EmpresaCompleta {
    const results = batchResult.results

    // Extrair dados dos resultados
    const empresaData = results.find((r) => r.queryId === `empresa-${empresaId}`)?.data as EmpresaBasicData
    const calculosData = (results.find((r) => r.queryId === `calculos-${empresaId}`)?.data || []) as CalculoData[]
    const obrigacoesData = (results.find((r) => r.queryId === `obrigacoes-${empresaId}`)?.data || []) as ObrigacaoData[]
    const documentosData = (results.find((r) => r.queryId === `documentos-${empresaId}`)?.data || []) as DocumentoRecente[]

    if (!empresaData) {
      throw new Error('Dados básicos da empresa não encontrados')
    }

    // Gerar insights básicos
    const trendAnalysis = this.analyzeTrends(calculosData)
    const insights: EmpresaInsights = {
      score_conformidade: this.calculateComplianceScore(calculosData, obrigacoesData),
      alertas_importantes: this.generateImportantAlerts(obrigacoesData),
      carga_tributaria_media: calculosData.length > 0 ?
        calculosData.reduce((sum: number, c: any) => sum + (c.aliquota_efetiva || 0), 0) / calculosData.length : 0,
      tendencia_faturamento: this.mapTrendToPortuguese(trendAnalysis.trend),
      obrigacoes_criticas: obrigacoesData.filter((o: any) => o.situacao === 'vencida').length,
      economia_potencial: 0 // Placeholder - seria calculado com base em análises mais complexas
    }

    return {
      id: empresaData.id,
      nome: empresaData.nome || 'Empresa sem nome',
      cnpj: empresaData.cnpj || '',
      regime_tributario: empresaData.regime_tributario || 'Não informado',
      atividade_principal: empresaData.atividade_principal || 'Não informada',
      anexo_simples: empresaData.anexo_simples || undefined,
      status: empresaData.ativa ? 'ativa' : 'inativa',
      calculos_recentes: calculosData,
      obrigacoes_pendentes: obrigacoesData,
      documentos_recentes: documentosData,
      insights
    }
  }





  /**
   * ✅ FASE 2: Métodos auxiliares para análise de dados
   */
  private calculateComplianceScore(calculos: CalculoData[], obrigacoes: ObrigacaoData[]): number {
    const totalObrigacoes = obrigacoes.length
    const obrigacoesVencidas = obrigacoes.filter(o => o.situacao === 'vencida').length
    const calculosAtrasados = calculos.filter(c => c.status === 'pendente').length

    if (totalObrigacoes === 0) return 100

    const penaltyScore = (obrigacoesVencidas * 20) + (calculosAtrasados * 10)
    return Math.max(0, 100 - penaltyScore)
  }

  private generateImportantAlerts(obrigacoes: ObrigacaoData[]): string[] {
    const alerts = []
    const vencidas = obrigacoes.filter(o => o.situacao === 'vencida')
    const proximas = obrigacoes.filter(o => o.situacao === 'proxima')

    if (vencidas.length > 0) {
      alerts.push(`${vencidas.length} obrigação(ões) vencida(s)`)
    }

    if (proximas.length > 3) {
      alerts.push(`${proximas.length} obrigações próximas do vencimento`)
    }

    return alerts
  }

  private analyzeTrends(calculos: CalculoData[]): { trend: string; variation: number } {
    if (calculos.length < 2) {
      return { trend: 'stable', variation: 0 }
    }

    const recent = calculos.slice(0, 3)
    const older = calculos.slice(3, 6)

    const recentAvg = recent.reduce((sum, c) => sum + (c.valor_total || 0), 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((sum, c) => sum + (c.valor_total || 0), 0) / older.length : recentAvg

    const variation = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

    return {
      trend: variation > 5 ? 'increasing' : variation < -5 ? 'decreasing' : 'stable',
      variation: Math.round(variation * 100) / 100
    }
  }

  private summarizeDocuments(documentos: DocumentoRecente[]): { total: number; types: Record<string, number> } {
    const types: Record<string, number> = {}

    documentos.forEach(doc => {
      const type = doc.tipo_documento || 'outros'
      types[type] = (types[type] || 0) + 1
    })

    return {
      total: documentos.length,
      types
    }
  }

  private mapTrendToPortuguese(trend: string): 'crescimento' | 'estavel' | 'declinio' {
    switch (trend) {
      case 'increasing':
        return 'crescimento'
      case 'decreasing':
        return 'declinio'
      default:
        return 'estavel'
    }
  }

  // =====================================================
  // ✅ FASE 3: MÉTODOS DE INTELIGÊNCIA AVANÇADA
  // =====================================================





















  /**
   * Cleanup de recursos
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }

    this.isDestroyed = true

    // Cleanup apenas do serviço de cache que ainda existe
    // unifiedCacheService.destroy()

    logger.info('AIContextService destroyed successfully')
  }
}
