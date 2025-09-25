/**
 * 🧪 JEST SETUP - Edge Functions
 * Setup global para testes das Edge Functions
 */

// Mock do environment Deno para testes
global.Deno = {
  env: {
    get: jest.fn().mockImplementation((key) => {
      const env = {
        'OPENAI_API_KEY': 'sk-test-key-for-testing',
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-role-key',
        'LOG_LEVEL': 'DEBUG',
        'NODE_ENV': 'test'
      }
      return env[key]
    })
  },
  serve: jest.fn((handler) => {
    // Mock do Deno.serve para Edge Functions
    return {
      finished: Promise.resolve(),
      shutdown: jest.fn().mockResolvedValue(undefined)
    }
  })
}

// Mock do performance API
global.performance = {
  now: jest.fn().mockReturnValue(Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024 // 1MB
  }
}

// Mock do TextEncoder/TextDecoder para ambiente Node
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

// Mock do fetch para testes
global.fetch = jest.fn()

// Mock de timers para testes determinísticos
jest.useFakeTimers()

// Setup para cada teste
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks()

  // Reset timers
  jest.clearAllTimers()

  // Reset fetch mock
  if (global.fetch.mockClear) {
    global.fetch.mockClear()
  }
})

// Cleanup após cada teste
afterEach(() => {
  // Limpar timers pendentes
  jest.runOnlyPendingTimers()
})

// Cleanup global
afterAll(() => {
  jest.useRealTimers()
})

// Helper para mockear respostas HTTP
global.mockHttpResponse = (data, status = 200, headers = {}) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map(Object.entries(headers)),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  })
}

// Helper para mockear erro HTTP
global.mockHttpError = (status = 500, message = 'Internal Server Error') => {
  return Promise.resolve({
    ok: false,
    status,
    statusText: message,
    headers: new Map(),
    json: () => Promise.reject(new Error('Response not ok')),
    text: () => Promise.resolve(message)
  })
}

// Helper para aguardar operações assíncronas
global.waitFor = (ms) => {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

// Helper para debug em testes
global.debugLog = (message, ...args) => {
  if (process.env.DEBUG_TESTS) {
    console.log(`[TEST DEBUG] ${message}`, ...args)
  }
}

// Configurar timeout global para operações assíncronas
jest.setTimeout(30000)

console.log('🧪 Jest setup completed for Edge Functions')