/**
 * Type definitions for feedback system
 * Replacing 'any' types with proper TypeScript interfaces
 */

export interface SummaryStats {
  totalFeedback: number;
  averageRating: number;
  satisfactionScore: number;
  feedbackRate: number;
  totalInteractions: number;
}

export interface DocumentoDetailed {
  id: string;
  arquivo_nome: string;
  arquivo_tipo: string;
  arquivo_tamanho: number;
  status_processamento: StatusProcessamento;
  created_at: string;
  empresa: {
    id: string;
    nome: string;
    cnpj: string;
  };
}

export interface CalculoDetailed {
  id: string;
  tipo_calculo: string;
  valor_total: number;
  status: string;
  created_at: string;
  empresa: {
    id: string;
    nome: string;
  };
}

export interface PDFViewerData {
  numPages: number;
  currentPage: number;
  scale: number;
  loading: boolean;
  error: string | null;
}

export interface DebugInfo {
  pdfLoaded: boolean;
  pageCount: number;
  currentPage: number;
  loadTime: number;
  errors: string[];
  warnings: string[];
}

export type StatusProcessamento = 'pendente' | 'processando' | 'processado' | 'erro' | 'rejeitado';