/**
 * Setup do Jest para testes E2E
 */

import '@testing-library/jest-dom'
import 'jest-environment-jsdom'

// Mock do ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock do IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock do matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock do sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
})

// Mock do fetch
global.fetch = jest.fn()

// Mock do console para testes mais limpos
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

// Configuração de timeout para testes assíncronos
jest.setTimeout(30000)

// Mock do Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock do Next.js navigation (App Router)
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock do Supabase
jest.mock('@/lib/supabase', () => ({
  createBrowserSupabaseClient: () => require('../mocks/supabase-mock').createMockSupabaseClient()
}))

// Mock do cache manager
jest.mock('@/lib/cache/cache-manager', () => ({
  cacheManager: require('../mocks/cache-mock').mockCacheManager
}))

// Mock do logger
jest.mock('@/lib/simple-logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}))

// Mock de variáveis de ambiente para testes
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.NODE_ENV = 'test'

// Configuração global para React Testing Library
import { configure } from '@testing-library/react'

configure({
  testIdAttribute: 'data-testid',
})

// Cleanup automático após cada teste
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  jest.clearAllMocks()
})

// Mock de componentes pesados para performance
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => children,
  LineChart: () => ({ type: 'div', props: { 'data-testid': 'line-chart' } }),
  AreaChart: () => ({ type: 'div', props: { 'data-testid': 'area-chart' } }),
  BarChart: () => ({ type: 'div', props: { 'data-testid': 'bar-chart' } }),
  PieChart: () => ({ type: 'div', props: { 'data-testid': 'pie-chart' } }),
  XAxis: () => ({ type: 'div', props: { 'data-testid': 'x-axis' } }),
  YAxis: () => ({ type: 'div', props: { 'data-testid': 'y-axis' } }),
  CartesianGrid: () => ({ type: 'div', props: { 'data-testid': 'cartesian-grid' } }),
  Tooltip: () => ({ type: 'div', props: { 'data-testid': 'tooltip' } }),
  Legend: () => ({ type: 'div', props: { 'data-testid': 'legend' } }),
  Line: () => ({ type: 'div', props: { 'data-testid': 'line' } }),
  Area: () => ({ type: 'div', props: { 'data-testid': 'area' } }),
  Bar: () => ({ type: 'div', props: { 'data-testid': 'bar' } }),
  Cell: () => ({ type: 'div', props: { 'data-testid': 'cell' } }),
}))

// Mock do Lucide React icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => ({ type: 'div', props: { 'data-testid': 'chevron-down-icon' } }),
  ChevronUp: () => ({ type: 'div', props: { 'data-testid': 'chevron-up-icon' } }),
  ChevronLeft: () => ({ type: 'div', props: { 'data-testid': 'chevron-left-icon' } }),
  ChevronRight: () => ({ type: 'div', props: { 'data-testid': 'chevron-right-icon' } }),
  Check: () => ({ type: 'div', props: { 'data-testid': 'check-icon' } }),
  X: () => ({ type: 'div', props: { 'data-testid': 'x-icon' } }),
  Plus: () => ({ type: 'div', props: { 'data-testid': 'plus-icon' } }),
  Minus: () => ({ type: 'div', props: { 'data-testid': 'minus-icon' } }),
  Search: () => ({ type: 'div', props: { 'data-testid': 'search-icon' } }),
  Filter: () => ({ type: 'div', props: { 'data-testid': 'filter-icon' } }),
  Download: () => ({ type: 'div', props: { 'data-testid': 'download-icon' } }),
  Upload: () => ({ type: 'div', props: { 'data-testid': 'upload-icon' } }),
  Edit: () => ({ type: 'div', props: { 'data-testid': 'edit-icon' } }),
  Trash: () => ({ type: 'div', props: { 'data-testid': 'trash-icon' } }),
  Eye: () => ({ type: 'div', props: { 'data-testid': 'eye-icon' } }),
  EyeOff: () => ({ type: 'div', props: { 'data-testid': 'eye-off-icon' } }),
  Settings: () => ({ type: 'div', props: { 'data-testid': 'settings-icon' } }),
  User: () => ({ type: 'div', props: { 'data-testid': 'user-icon' } }),
  Users: () => ({ type: 'div', props: { 'data-testid': 'users-icon' } }),
  Building: () => ({ type: 'div', props: { 'data-testid': 'building-icon' } }),
  FileText: () => ({ type: 'div', props: { 'data-testid': 'file-text-icon' } }),
  Calendar: () => ({ type: 'div', props: { 'data-testid': 'calendar-icon' } }),
  Clock: () => ({ type: 'div', props: { 'data-testid': 'clock-icon' } }),
  AlertTriangle: () => ({ type: 'div', props: { 'data-testid': 'alert-triangle-icon' } }),
  AlertCircle: () => ({ type: 'div', props: { 'data-testid': 'alert-circle-icon' } }),
  Info: () => ({ type: 'div', props: { 'data-testid': 'info-icon' } }),
  CheckCircle: () => ({ type: 'div', props: { 'data-testid': 'check-circle-icon' } }),
  XCircle: () => ({ type: 'div', props: { 'data-testid': 'x-circle-icon' } }),
  TrendingUp: () => ({ type: 'div', props: { 'data-testid': 'trending-up-icon' } }),
  TrendingDown: () => ({ type: 'div', props: { 'data-testid': 'trending-down-icon' } }),
  DollarSign: () => ({ type: 'div', props: { 'data-testid': 'dollar-sign-icon' } }),
  BarChart3: () => ({ type: 'div', props: { 'data-testid': 'bar-chart-3-icon' } }),
  PieChart: () => ({ type: 'div', props: { 'data-testid': 'pie-chart-icon' } }),
  Activity: () => ({ type: 'div', props: { 'data-testid': 'activity-icon' } }),
  Zap: () => ({ type: 'div', props: { 'data-testid': 'zap-icon' } }),
  Database: () => ({ type: 'div', props: { 'data-testid': 'database-icon' } }),
  Server: () => ({ type: 'div', props: { 'data-testid': 'server-icon' } }),
  Cloud: () => ({ type: 'div', props: { 'data-testid': 'cloud-icon' } }),
  Wifi: () => ({ type: 'div', props: { 'data-testid': 'wifi-icon' } }),
  WifiOff: () => ({ type: 'div', props: { 'data-testid': 'wifi-off-icon' } }),
  Loader2: () => ({ type: 'div', props: { 'data-testid': 'loader-2-icon', className: 'animate-spin' } }),
  RefreshCw: () => ({ type: 'div', props: { 'data-testid': 'refresh-cw-icon' } }),
}))

// Configuração de matchers customizados
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },
})

// Declaração de tipos para matchers customizados
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R
    }
  }
}

// Configuração de timeouts específicos para diferentes tipos de teste
const originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL

beforeEach(() => {
  const testName = expect.getState().currentTestName || ''
  
  if (testName.includes('performance') || testName.includes('stress')) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000 // 1 minuto para testes de performance
  } else if (testName.includes('integration') || testName.includes('e2e')) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000 // 30 segundos para testes de integração
  } else {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000 // 10 segundos para testes unitários
  }
})

afterEach(() => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout
})

// Log de início dos testes
console.log('🧪 Jest setup completo para testes E2E do ContabilidadePRO')
console.log('📊 Sistema de Cache Inteligente')
console.log('⚡ Edge Functions + React Hooks + Cache Integration')
console.log('=' .repeat(60))
