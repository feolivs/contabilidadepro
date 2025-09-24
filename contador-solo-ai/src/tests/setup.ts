/**
 * 🧪 SETUP DE TESTES - ContabilidadePRO
 * Configuração global para todos os testes
 */

import '@testing-library/jest-dom'

// Mock do Supabase
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn()
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      download: jest.fn(),
      getPublicUrl: jest.fn()
    },
    functions: {
      invoke: jest.fn()
    }
  }))
}))

// Mock do Auth Store
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com'
    },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn()
  }))
}))

// Mock do Logger
jest.mock('@/lib/simple-logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock do Next.js Router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams())
}))

// Mock do React Query
import { QueryClient } from '@tanstack/react-query'

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0
    },
    mutations: {
      retry: false
    }
  }
})

// Mock de APIs externas
global.fetch = jest.fn()

// Mock do OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}))

// Configurações globais de teste
beforeEach(() => {
  jest.clearAllMocks()
  
  // Reset fetch mock
  ;(global.fetch as jest.Mock).mockClear()
  
  // Mock console para evitar logs desnecessários
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

// Configurações específicas para testes OCR
export const OCR_TEST_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  confidenceThreshold: 0.7,
  providers: {
    openai: {
      enabled: true,
      apiKey: 'test-openai-key'
    },
    google: {
      enabled: true,
      apiKey: 'test-google-key'
    }
  }
}

// Utilitários para testes
export const createMockFile = (
  name: string, 
  content: string = 'mock content', 
  type: string = 'application/pdf'
): File => {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

export const createMockBuffer = (size: number = 1024): Uint8Array => {
  return new Uint8Array(size).fill(1)
}

export const waitForAsync = (ms: number = 100): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Mock de dados de teste
export const MOCK_DOCUMENT_DATA = {
  nfe: {
    document_type: 'NFE',
    fiscal_data: {
      numero: '000000123',
      serie: '001',
      cnpj_emitente: '12.345.678/0001-95',
      valor_total: 1234.56,
      data_emissao: '2024-01-15'
    },
    entities: [
      {
        type: 'company',
        value: '12.345.678/0001-95',
        confidence: 0.95,
        context: 'CNPJ do emitente',
        position: { start: 50, end: 68 }
      }
    ],
    financial_data: [
      {
        type: 'total',
        value: 1234.56,
        currency: 'BRL',
        description: 'Valor Total',
        confidence: 0.90
      }
    ]
  },
  recibo: {
    document_type: 'RECIBO',
    receipt_data: {
      pagador: 'EMPRESA PAGADORA LTDA',
      recebedor: 'PRESTADOR DE SERVICOS ME',
      valor: 2500.00,
      descricao: 'Serviços de consultoria'
    },
    entities: [
      {
        type: 'company',
        value: 'EMPRESA PAGADORA LTDA',
        confidence: 0.90,
        context: 'Pagador do recibo',
        position: { start: 20, end: 45 }
      }
    ],
    financial_data: [
      {
        type: 'total',
        value: 2500.00,
        currency: 'BRL',
        description: 'Valor do Recibo',
        confidence: 0.85
      }
    ]
  }
}

// Configuração de timeouts para testes assíncronos
jest.setTimeout(30000)

// Configuração para testes de performance
export const PERFORMANCE_THRESHOLDS = {
  ocr_processing: 5000, // 5 segundos
  data_extraction: 3000, // 3 segundos
  classification: 1000, // 1 segundo
  validation: 500 // 500ms
}

console.log('🧪 Setup de testes carregado com sucesso')
